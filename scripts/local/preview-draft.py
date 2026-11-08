#!/usr/bin/env python3
"""免费样板发布到 Netlify「草稿」（draft deploy，不扣点数）。

为什么：Netlify 免费方案每次正式部署扣 15 点（每月 300 点）；草稿 / 预览部署不扣点
（2026-11-09 查：https://www.netlify.com/knowledge-base/publish-and-update-sites-with-the-netlify-cli/ ）。
所以样板放在同一个 Netlify 帐号下一个专门的「样板」网站，只发草稿，永远不发正式版。

用法（先 python3 site/build.py --preview clients/<代号>/preview/preview.json 做好样板）：
  python3 scripts/local/preview-draft.py setup                       # 第一次：建「样板」网站（不扣点）
  python3 scripts/local/preview-draft.py publish clients/p012/preview/site --code p012
  python3 scripts/local/preview-draft.py list                        # 列出所有样板草稿和日期
  python3 scripts/local/preview-draft.py delete --code p012          # 删除（样板 14 天内一定要删）

金钥：环境变量 NETLIFY_AUTH_TOKEN（Netlify → User settings → Applications → Personal access tokens）。
在 Claude Code 云端，金钥存在环境的 Network secrets，由代理自动加上，不用设环境变量。
金钥不写进 git、docs、聊天。
"""
import argparse
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.netlify.com/api/v1"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CONFIG = os.path.join(HERE, "netlify-previews.json")  # site id / name only (not secret)


def token():
    t = os.environ.get("NETLIFY_AUTH_TOKEN", "").strip()
    if t:
        return t
    if os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"):
        return "proxy-injected"  # Claude Code cloud: the network proxy replaces this with the saved secret
    sys.exit("没有金钥：请先设定环境变量 NETLIFY_AUTH_TOKEN（见档案开头的说明）。")


def call(method, path, body=None, raw=None, ctype="application/json"):
    url = path if path.startswith("http") else API + path
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token())
    req.add_header("User-Agent", "cartsmith-previews/1.0")
    if data is not None:
        req.add_header("Content-Type", ctype)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode() or "null"
            return r.status, json.loads(txt) if txt.strip().startswith(("{", "[")) else txt
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:300]
        if e.code in (401, 403):
            sys.exit(f"Netlify 拒绝了（{e.code}）：金钥不对、过期，或还没生效。{msg}")
        return e.code, msg


def load_config():
    if not os.path.exists(CONFIG):
        sys.exit("还没有「样板」网站：先跑 python3 scripts/local/preview-draft.py setup")
    return json.load(open(CONFIG, encoding="utf-8"))


def cmd_setup(a):
    if os.path.exists(CONFIG):
        print("已经设定好了：", json.load(open(CONFIG, encoding="utf-8")))
        return
    name = a.name or "cartsmith-previews-" + hashlib.sha1(os.urandom(8)).hexdigest()[:6]
    st, site = call("POST", "/sites", {"name": name})
    if st not in (200, 201):
        sys.exit(f"建网站失败（{st}）：{site}")
    cfg = {"site_id": site["id"], "site_name": site["name"], "created": datetime.date.today().isoformat(),
           "note": "只发草稿（draft），不要在这个网站发正式版；样板 14 天内删除。"}
    json.dump(cfg, open(CONFIG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("建好了「样板」网站：", cfg["site_name"], "（没有正式版，所以不扣点）")


def files_of(folder):
    out = {}
    for base, _, names in os.walk(folder):
        for n in names:
            full = os.path.join(base, n)
            rel = "/" + os.path.relpath(full, folder).replace(os.sep, "/")
            out[rel] = full
    return out


def cmd_publish(a):
    cfg = load_config()
    folder = os.path.abspath(a.folder)
    if not os.path.exists(os.path.join(folder, "index.html")):
        sys.exit(f"{folder} 里没有 index.html：先跑 python3 site/build.py --preview …")
    files = files_of(folder)
    digests = {}
    for rel, full in files.items():
        digests[rel] = hashlib.sha1(open(full, "rb").read()).hexdigest()
    title = f"{a.code} {datetime.date.today().isoformat()}"
    st, dep = call("POST", f"/sites/{cfg['site_id']}/deploys", {"files": digests, "draft": True, "title": title})
    if st not in (200, 201):
        sys.exit(f"建草稿失败（{st}）：{dep}")
    need = set(dep.get("required", []))
    sent = 0
    for rel, full in files.items():
        if digests[rel] not in need:
            continue
        path = urllib.parse.quote(rel.lstrip("/"))
        st, res = call("PUT", f"/deploys/{dep['id']}/files/{path}", raw=open(full, "rb").read(), ctype="application/octet-stream")
        if st not in (200, 201):
            sys.exit(f"上传 {rel} 失败（{st}）：{res}")
        sent += 1
        need.discard(digests[rel])
    for _ in range(60):
        st, d = call("GET", f"/deploys/{dep['id']}")
        if isinstance(d, dict) and d.get("state") == "ready":
            break
        if isinstance(d, dict) and d.get("state") == "error":
            sys.exit(f"Netlify 处理失败：{d.get('error_message')}")
        time.sleep(2)
    else:
        sys.exit("等了 2 分钟还没好，晚一点用 list 看看。")
    url = d.get("deploy_ssl_url") or d.get("deploy_url")
    if d.get("context") == "production" or d.get("published_at"):
        print("⚠ 注意：这次看起来变成正式部署了，请告诉 Claude Code。")
    rec = {"code": a.code, "deploy_id": dep["id"], "url": url, "date": datetime.date.today().isoformat()}
    log_dir = os.path.join(ROOT, "clients", a.code, "preview")
    if os.path.isdir(log_dir):
        json.dump(rec, open(os.path.join(log_dir, "deploy.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"草稿发好了（上传 {sent} 个档案，共 {len(files)} 个）：{url}")
    print(f"deploy id：{dep['id']}（删除时用；也记在 clients/{a.code}/preview/deploy.json）")


def cmd_list(a):
    cfg = load_config()
    st, deps = call("GET", f"/sites/{cfg['site_id']}/deploys?per_page=100")
    if st != 200:
        sys.exit(f"读取失败（{st}）：{deps}")
    today = datetime.date.today()
    for d in deps:
        made = (d.get("created_at") or "")[:10]
        age = (today - datetime.date.fromisoformat(made)).days if made else 0
        flag = "  ← 超过 14 天，要删除" if age > 14 else ""
        print(f"{made}  {d.get('title') or '-':<24} {d.get('context', ''):<12} {d.get('deploy_ssl_url') or ''}  id={d['id']}{flag}")
    if not deps:
        print("没有样板草稿。")


def cmd_delete(a):
    cfg = load_config()
    dep_id = a.deploy_id
    if not dep_id and a.code:
        rec = os.path.join(ROOT, "clients", a.code, "preview", "deploy.json")
        if os.path.exists(rec):
            dep_id = json.load(open(rec, encoding="utf-8"))["deploy_id"]
        else:
            st, deps = call("GET", f"/sites/{cfg['site_id']}/deploys?per_page=100")
            hits = [d["id"] for d in (deps if st == 200 else []) if (d.get("title") or "").startswith(a.code + " ")]
            if len(hits) != 1:
                sys.exit(f"找到 {len(hits)} 个 {a.code} 的草稿，请用 list 看 id，再 delete --id <id>")
            dep_id = hits[0]
    if not dep_id:
        sys.exit("要给 --code 或 --id")
    st, res = call("DELETE", f"/sites/{cfg['site_id']}/deploys/{dep_id}")
    if st in (404, 405):
        st, res = call("DELETE", f"/deploys/{dep_id}")
    if st not in (200, 204):
        sys.exit(f"删除失败（{st}）：{res}")
    print("已删除样板草稿：", dep_id)


def main():
    ap = argparse.ArgumentParser(description="免费样板 → Netlify 草稿（不扣点）")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("setup"); s.add_argument("--name")
    s = sub.add_parser("publish"); s.add_argument("folder"); s.add_argument("--code", required=True)
    sub.add_parser("list")
    s = sub.add_parser("delete"); s.add_argument("--code"); s.add_argument("--id", dest="deploy_id")
    a = ap.parse_args()
    {"setup": cmd_setup, "publish": cmd_publish, "list": cmd_list, "delete": cmd_delete}[a.cmd](a)


if __name__ == "__main__":
    main()
