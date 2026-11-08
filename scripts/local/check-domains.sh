#!/bin/bash
# 检查商家有没有自己的网站：每个名字试 .com / .com.my / .my / .co
# 用法：bash scripts/local/check-domains.sh gingerbatiks ministryofcakes forestfloor
#   名字用品牌名去掉空格和符号（也可以多试几种写法：brand、brandmy、brandkl）
# 判断：
#   NONE      = 4 个都打不开 → 算「没有网站」
#   PARKED    = 停放 / 出售中的域名（lander、for sale）→ 通常不是他们的，算没有
#   EXPIRED   = 网站过期 / 建设中 / 找不到 → 算没有（开场白可以友善提醒）
#   CHECK     = 有防护页（Just a moment / Cloudflare）→ 可能有网站，要人工看
#   SITE      = 有正常网页 → 先看标题是不是同一家；是的话就「已经有网站」，不放进 A 级
# 只用公开的 HTTP 请求看首页标题，不登录、不抓内容。
set -u
TMP="$(mktemp -d)"
trap 'rm -rf -- "$TMP"' EXIT
for slug in "$@"; do
  verdict="NONE"
  for tld in com com.my my co; do
    d="$slug.$tld"
    f="$TMP/page.html"
    : > "$f"
    code=$(curl -s -L --max-time 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" \
      -H "Accept: text/html" -o "$f" -w '%{http_code}' "https://$d" 2>/dev/null)
    [ -s "$f" ] || continue
    info=$(python3 - "$f" <<'PY'
import re, sys, html
h = open(sys.argv[1], errors="ignore").read()
low = h.lower()
t = re.search(r"<title[^>]*>(.*?)</title>", h, re.S | re.I)
title = html.unescape(re.sub(r"\s+", " ", t.group(1)).strip())[:80] if t else "-"
kind = "SITE"
if "/lander" in h or "for sale" in low or "parked" in low or "domain is for sale" in low:
    kind = "PARKED"
elif any(k in low for k in ["website expired", "under construction", "coming soon", "site not found", "temporarily unavailable", "this site is under development"]):
    kind = "EXPIRED"
elif "just a moment" in low or "attention required" in low:
    kind = "CHECK"
plat = [k for k in ["shopify", "woocommerce", "wix", "easystore", "sitegiant", "storehub", "squarespace", "beepit", "oddle", "take.app"] if k in low]
print(kind + "\t" + title + "\t" + ",".join(plat))
PY
)
    kind="${info%%$'\t'*}"
    echo "  $d -> HTTP $code  $info"
    case "$kind" in
      SITE) verdict="SITE" ;;
      CHECK) [ "$verdict" != "SITE" ] && verdict="CHECK" ;;
      EXPIRED) [ "$verdict" = "NONE" ] || [ "$verdict" = "PARKED" ] && verdict="EXPIRED" ;;
      PARKED) [ "$verdict" = "NONE" ] && verdict="PARKED" ;;
    esac
  done
  echo "$slug: $verdict"
done
