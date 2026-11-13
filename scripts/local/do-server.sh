#!/usr/bin/env bash
# do-server.sh — 用 DigitalOcean API 开服务器、看状态（2026-11-13）
#
# 给「连不上 SSH」的情况用（网页版 / 手机版 Claude Code）：服务器开机时自己跑 scripts/server/cloud-init.sh，
# 装好系统和自动更新小帮手，DNS 指过来后自己建母版 + 节日网店示范。
#
# 用法：
#   bash scripts/local/do-server.sh check      # 看 API 能不能用、规格和价钱（不花钱）
#   bash scripts/local/do-server.sh create     # 开服务器（会花钱：s-1vcpu-2gb，见 check 显示的价钱）
#   bash scripts/local/do-server.sh status     # 服务器状态、IP、进度报告
#
# API Token：
#   - Claude Code 云端：Token 存在环境的 Network secrets（api.digitalocean.com），由网络代理自动加上，这里不用设
#   - 自己的电脑：先 export DO_TOKEN=...（不要写进任何文件或 git）
# 进度报告的代号放在服务器的 tag「agency-ops-<代号>」，有 API 权限就查得到；报告网址：http://<IP>/agency-ops-<代号>/status.txt
set -euo pipefail
cd "$(dirname "$0")/../.."
API=https://api.digitalocean.com/v2
NAME="${DO_NAME:-agency-dev}"
REGION="${DO_REGION:-sgp1}"
SIZE="${DO_SIZE:-s-1vcpu-2gb}"
IMAGE="${DO_IMAGE:-ubuntu-24-04-x64}"
DOMAIN="${DO_DOMAIN:-cartsmithstudio.com}"
EMAIL="${DO_EMAIL:-cartsmith.studio@gmail.com}"
BRANCH="${DO_BRANCH:-$(git rev-parse --abbrev-ref HEAD)}"

api() { # api METHOD PATH [JSON]
  local auth=()
  [[ -n "${DO_TOKEN:-}" ]] && auth=(-H "Authorization: Bearer $DO_TOKEN")
  if [[ $# -ge 3 ]]; then
    curl -sS -X "$1" "${auth[@]}" -H "Content-Type: application/json" --data-binary "$3" "$API$2"
  else
    curl -sS -X "$1" "${auth[@]}" "$API$2"
  fi
}
py() { python3 -c "$1"; }

droplet_json() { api GET "/droplets?tag_name=cartsmith&per_page=50"; }

case "${1:-}" in
  check)
    acct="$(api GET /account)"
    echo "$acct" | py 'import json,sys; d=json.load(sys.stdin)
if "account" not in d: print("API 不能用：", d.get("message", d)); sys.exit(1)
a=d["account"]; print("API 可以用。帐号状态:", a.get("status"), "· 可开服务器上限:", a.get("droplet_limit"))'
    api GET "/sizes?per_page=200" | SIZE="$SIZE" REGION="$REGION" py 'import json,sys,os
d=json.load(sys.stdin); s=[x for x in d.get("sizes",[]) if x["slug"]==os.environ["SIZE"]]
if not s: print("找不到规格", os.environ["SIZE"]); sys.exit(1)
s=s[0]; print("规格 %s：%s MB 内存 / %s CPU / %s GB，USD %s 一个月（USD %s 一小时），%s 有货：%s" % (s["slug"], s["memory"], s["vcpus"], s["disk"], s["price_monthly"], s["price_hourly"], os.environ["REGION"], os.environ["REGION"] in s["regions"]))'
    droplet_json | py 'import json,sys; d=json.load(sys.stdin).get("droplets",[]); print("已经有的 cartsmith 服务器：", ", ".join(x["name"]+" ("+x["status"]+")" for x in d) or "没有")'
    ;;

  create)
    existing="$(droplet_json | py 'import json,sys; print(len(json.load(sys.stdin).get("droplets",[])))')"
    [[ "$existing" == "0" ]] || { echo "已经有 cartsmith 服务器了，不再开新的（用 status 看）。"; exit 1; }
    git diff --quiet HEAD -- scripts ops wp sites || { echo "scripts/ ops/ wp/ sites/ 有还没 commit 的改动，先 commit + push"; exit 1; }
    git fetch -q origin "$BRANCH" && [[ "$(git rev-parse HEAD)" == "$(git rev-parse "origin/$BRANCH")" ]] || { echo "本地和 GitHub 的 $BRANCH 不一样，先 push"; exit 1; }
    TOKEN="$(tr -dc 'a-f0-9' < /dev/urandom | head -c 32 || true)"
    # A throwaway SSH key: with a key DigitalOcean turns off root password login; the private key is deleted right away.
    # Log in from the DigitalOcean website (Droplet → Console), or add your own key later.
    T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
    ssh-keygen -q -t ed25519 -N "" -C "cartsmith-setup-no-private-key" -f "$T/k"
    KEYID="$(api POST /account/keys "$(python3 -c 'import json,sys; print(json.dumps({"name":"cartsmith-setup (private key deleted)","public_key":open(sys.argv[1]).read().strip()}))' "$T/k.pub")" | py 'import json,sys; d=json.load(sys.stdin); print(d.get("ssh_key",{}).get("id","") or "ERR "+str(d.get("message",d)))')"
    rm -f "$T/k"
    [[ "$KEYID" =~ ^[0-9]+$ ]] || { echo "加 SSH key 失败：$KEYID"; exit 1; }
    sed -e "s|__BRANCH__|$BRANCH|" -e "s|__EMAIL__|$EMAIL|" -e "s|__OPS_TOKEN__|$TOKEN|" -e "s|__DOMAIN__|$DOMAIN|" scripts/server/cloud-init.sh > "$T/user-data.sh"
    grep -q "__" "$T/user-data.sh" && grep -n "__[A-Z_]*__" "$T/user-data.sh" && { echo "开机设定还有没填的值"; exit 1; }
    BODY="$(NAME="$NAME" REGION="$REGION" SIZE="$SIZE" IMAGE="$IMAGE" KEYID="$KEYID" TOKEN="$TOKEN" UD="$T/user-data.sh" python3 -c 'import json,os
e=os.environ; print(json.dumps({"name":e["NAME"],"region":e["REGION"],"size":e["SIZE"],"image":e["IMAGE"],"ssh_keys":[int(e["KEYID"])],
"backups":False,"ipv6":True,"monitoring":True,"tags":["cartsmith","agency-ops-"+e["TOKEN"]],"user_data":open(e["UD"]).read()}))')"
    api POST /droplets "$BODY" | py 'import json,sys; d=json.load(sys.stdin)
if "droplet" not in d: print("开服务器失败：", d.get("message", d)); sys.exit(1)
x=d["droplet"]; print("服务器已建立：%s（id %s），状态 %s。约 1 分钟后有 IP，用 status 看。" % (x["name"], x["id"], x["status"]))'
    ;;

  status)
    droplet_json | py 'import json,sys
d=json.load(sys.stdin).get("droplets",[])
if not d: print("还没有 cartsmith 服务器"); sys.exit(0)
for x in d:
    ip=[n["ip_address"] for n in x["networks"].get("v4",[]) if n["type"]=="public"]
    tok=[t[len("agency-ops-"):] for t in x.get("tags",[]) if t.startswith("agency-ops-")]
    print("%s（id %s）状态 %s · IP %s · 建立于 %s" % (x["name"], x["id"], x["status"], ip[0] if ip else "还没有", x["created_at"]))
    if ip and tok: print("REPORT=http://%s/agency-ops-%s/" % (ip[0], tok[0]))' | sed 's#\(REPORT=http://[^/]*/agency-ops-\)[a-f0-9]*#\1<代号>#'
    ;;

  report)  # print the report URL (for Claude Code; contains the private code)
    droplet_json | py 'import json,sys
for x in json.load(sys.stdin).get("droplets",[]):
    ip=[n["ip_address"] for n in x["networks"].get("v4",[]) if n["type"]=="public"]
    tok=[t[len("agency-ops-"):] for t in x.get("tags",[]) if t.startswith("agency-ops-")]
    if ip and tok: print("http://%s/agency-ops-%s/" % (ip[0], tok[0]))'
    ;;

  *)
    echo "用法: bash scripts/local/do-server.sh check | create | status | report"; exit 1;;
esac
