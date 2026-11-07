import os, re, sys, shutil, posixpath, urllib.parse
SC = sys.argv[1]
SITES = {"studio": r"(?:www\.)?kedailab\.test", "rimbun": r"demo-rimbun\.kedailab\.test", "teduh": r"demo-teduh\.kedailab\.test", "kenanga": r"demo-kenanga\.kedailab\.test"}
STORES = {"rimbun", "teduh", "kenanga"}
NAMES = {"studio": "KedaiLab 工作室网站", "rimbun": "Rimbun Skin", "teduh": "Teduh Studio", "kenanga": "Dapur Seri Kenanga"}

def rel(from_file, target):  # both relative to SC
    return posixpath.relpath(target, posixpath.dirname(from_file)) if posixpath.dirname(from_file) else target

# 1. rename ?ver= files
for root, _, files in os.walk(SC):
    for f in files:
        if "?" in f:
            new = re.sub(r"\?ver=[^/]*$", "", f)
            new = re.sub(r"\?.*$", "", new)
            src, dst = os.path.join(root, f), os.path.join(root, new)
            if os.path.exists(dst): os.remove(src)
            else: os.rename(src, dst)

BAR = ('<div style="position:sticky;top:0;z-index:100000;background:#14202E;color:#fff;font:600 13px/1.4 system-ui,sans-serif;'
       'padding:9px 16px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:space-between">'
       '<a href="{home}" style="color:#F2A541;text-decoration:none">← 返回成品展示</a>'
       '<span style="font-weight:400;opacity:.85">{name} · 静态预览：可以浏览所有页面；购物车、结账、表单要部署后才能真正使用</span></div>')

def fix_html(path):
    relpath = os.path.relpath(path, SC).replace(os.sep, "/")
    site = relpath.split("/")[0]
    s = open(path, encoding="utf-8", errors="replace").read()
    s = re.sub(r"%3Fver=[^\"'\s)>]*", "", s)
    s = re.sub(r"\?ver=[^\"'\s)>&]*", "", s)
    s = re.sub(r'\s(?:data-)?srcset="[^"]*"', "", s)
    s = re.sub(r'\ssizes="[^"]*"', "", s)
    # absolute links to our sites
    def absrep(m):
        host, path_q = m.group(1), m.group(2) or "/"
        for name, rx in SITES.items():
            if re.fullmatch(rx, host):
                p = urllib.parse.urlsplit(path_q)
                path_only = p.path or "/"
                if name in STORES and (re.search(r"add-to-cart", p.query) or path_only.startswith(("/cart", "/checkout", "/my-account"))):
                    tgt = f"{name}/checkout/index.html" if path_only.startswith("/checkout") else f"{name}/cart/index.html"
                else:
                    tgt = f"{name}{path_only}"
                    if tgt.endswith("/"): tgt += "index.html"
                    if not os.path.exists(os.path.join(SC, tgt)):
                        tgt = f"{name}/index.html"
                return rel(relpath, tgt) + (("#" + p.fragment) if p.fragment else "")
        return m.group(0)
    s = re.sub(r"https?://([a-z0-9.-]+\.kedailab\.test|kedailab\.test|www\.kedailab\.test)(/[^\"'\s<>]*)?", absrep, s)
    # relative add-to-cart / query links left by wget conversion
    if site in STORES:
        s = re.sub(r'href="[^"]*\?add-to-cart=[^"]*"', 'href="' + rel(relpath, f"{site}/cart/index.html") + '"', s)
    s = re.sub(r'href="([^"?#]*index\.html)\?[^"]*"', r'href="\1"', s)
    s = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + BAR.format(home=rel(relpath, "index.html"), name=NAMES[site]), s, count=1)
    open(path, "w", encoding="utf-8").write(s)

def fix_css(path):
    s = open(path, encoding="utf-8", errors="replace").read()
    s2 = re.sub(r"%3Fver=[^\"'\s)>]*", "", s); s2 = re.sub(r"\?ver=[^\"'\s)>&]*", "", s2)
    if s2 != s: open(path, "w", encoding="utf-8").write(s2)

for root, _, files in os.walk(SC):
    for f in files:
        p = os.path.join(root, f)
        if f.endswith(".html"): fix_html(p)
        elif f.endswith(".css"): fix_css(p)

# prune unreferenced assets
refs = set()
for root, _, files in os.walk(SC):
    for f in files:
        if not f.endswith((".html", ".css")): continue
        p = os.path.join(root, f); s = open(p, encoding="utf-8", errors="replace").read()
        for u in re.findall(r'(?:src|href)="([^"#?]+)', s) + re.findall(r"url\(['\"]?([^'\")?#]+)", s) + re.findall(r'"(?:src|url)":"([^"]+)"', s):
            if u.startswith(("http:", "https:", "data:", "mailto:", "tel:", "//")): continue
            refs.add(os.path.normpath(os.path.join(root, urllib.parse.unquote(u.replace("\\/", "/")))))
removed = 0
for root, _, files in os.walk(SC):
    for f in files:
        p = os.path.normpath(os.path.join(root, f))
        if f.endswith((".html", ".css", ".js")) or "/_preview/" in p: continue
        if p not in refs:
            os.remove(p); removed += 1
print("pruned", removed)
