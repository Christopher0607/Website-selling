#!/usr/bin/env bash
# smoke-test.sh — 快速检查一个网站是不是正常（任何电脑都可以跑，只需要 curl）
# 有 FAIL 就返回 1
set -uo pipefail

usage() {
  cat <<EOF
用法: $0 <网址> [--shop] [--expect-noindex] [--auth 用户:密码] [--site <代号>]

  --shop             也检查 商店 / 购物车 / 结账 页
  --expect-noindex   网页必须有 noindex（样板、测试站）；没有这个参数时，有 noindex 算 FAIL
  --auth             basic auth 帐号密码
  --site <代号>      在服务器上：自动读取这个站点的 basic auth 和 noindex 设定
EOF
}
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
URL="${1%/}"; shift
SHOP=0; EXPECT_NOINDEX=0; AUTH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --shop) SHOP=1; shift;;
    --expect-noindex) EXPECT_NOINDEX=1; shift;;
    --auth) AUTH="$2"; shift 2;;
    --site)
      # shellcheck disable=SC1090
      [[ -f "/etc/agency/sites/$2.conf" ]] && source "/etc/agency/sites/$2.conf"
      # shellcheck disable=SC1090
      [[ -r "/etc/agency/secrets/$2.env" ]] && source "/etc/agency/secrets/$2.env"
      [[ "${BASIC_AUTH:-0}" == 1 && -n "${BASIC_AUTH_USER:-}" ]] && AUTH="$BASIC_AUTH_USER:$BASIC_AUTH_PASS"
      [[ "${NOINDEX:-0}" == 1 ]] && EXPECT_NOINDEX=1
      [[ -d "/var/www/$2/public/wp-content/plugins/woocommerce" ]] && SHOP=1
      shift 2;;
    *) usage; echo "不认识的参数 $1"; exit 2;;
  esac
done

CURL=(curl -sS -A "agency-smoke-test/1.0" --max-time 20)
[[ -n "$AUTH" ]] && CURL+=(-u "$AUTH")
PASS=0; FAILS=0; WARNS=0
row() { printf "%-6s %-34s %s\n" "$1" "$2" "$3"; }
pass() { row "PASS" "$1" "${2:-}"; PASS=$((PASS+1)); }
fail() { row "FAIL" "$1" "${2:-}"; FAILS=$((FAILS+1)); }
warnr() { row "WARN" "$1" "${2:-}"; WARNS=$((WARNS+1)); }

check_200() {
  # check_200 <路径> <名称> [也接受的代码，例如 302]
  local path="$1" label="$2" also="${3:-}" code
  code=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$URL$path" 2>/dev/null || echo 000)
  if [[ "$code" == 200 || ( -n "$also" && "$code" == "$also" ) ]]; then pass "$label" "$path (HTTP $code)"; else fail "$label" "$path → HTTP $code"; fi
}

echo "检查 $URL"
echo "------------------------------------------------------------"
# 1. 首页
TMP=$(mktemp); HDR=$(mktemp); trap 'rm -f "$TMP" "$HDR"' EXIT
read -r CODE TIME < <("${CURL[@]}" -D "$HDR" -o "$TMP" -w '%{http_code} %{time_total}\n' "$URL/" 2>/dev/null || echo "000 0")
if [[ "$CODE" == 200 ]]; then pass "首页 Homepage" "HTTP 200"; else fail "首页 Homepage" "HTTP $CODE"; fi
if awk "BEGIN{exit !($TIME < 2)}"; then pass "首页速度 Load time" "${TIME}s"; else warnr "首页速度 Load time" "${TIME}s（超过 2 秒）"; fi

# 2. https / http 跳转
if [[ "$URL" == https://* ]]; then
  HOST="${URL#https://}"; HOST="${HOST%%/*}"
  LOC=$("${CURL[@]}" -o /dev/null -w '%{http_code} %{redirect_url}' "http://$HOST/" 2>/dev/null || echo "000")
  if [[ "$LOC" =~ ^30[18]\ https:// ]]; then pass "http → https" "${LOC#* }"; else fail "http → https" "$LOC"; fi
  pass "HTTPS" "SSL OK"
else
  warnr "HTTPS" "网址不是 https（本地测试或还没有 SSL）"
fi

# 3. 页面内容错误
if grep -qiE "critical error|There has been a critical error|Fatal error|Parse error|Error establishing a database connection" "$TMP"; then
  fail "页面错误 PHP errors" "发现 critical / fatal error"
else
  pass "页面错误 PHP errors" "没有"
fi
if grep -qiE "<b>(Warning|Notice|Deprecated)</b>:" "$TMP"; then fail "PHP warning 显示在页面上" ""; fi

# 4. noindex
HAS_NOINDEX=0
grep -qiE '<meta[^>]+name=.robots.[^>]+noindex' "$TMP" && HAS_NOINDEX=1
grep -qi '^x-robots-tag:.*noindex' "$HDR" && HAS_NOINDEX=1
if [[ $EXPECT_NOINDEX == 1 ]]; then
  [[ $HAS_NOINDEX == 1 ]] && pass "noindex（应该有）" "有" || fail "noindex（应该有）" "没有 noindex！"
else
  [[ $HAS_NOINDEX == 0 ]] && pass "可被搜索引擎收录" "没有 noindex" || fail "可被搜索引擎收录" "有 noindex（正式站不应该有）"
fi

# 5. 其他页面
check_200 "/wp-login.php" "登录页 Login"
SM=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$URL/sitemap_index.xml" 2>/dev/null || echo 000)
[[ "$SM" == 200 ]] && pass "Sitemap" "/sitemap_index.xml" || {
  SM=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -L "$URL/wp-sitemap.xml" 2>/dev/null || echo 000)
  [[ "$SM" == 200 ]] && pass "Sitemap" "/wp-sitemap.xml" || fail "Sitemap" "HTTP $SM"; }
if [[ $SHOP == 1 ]]; then
  check_200 "/shop/" "商店 Shop"
  check_200 "/cart/" "购物车 Cart"
  check_200 "/checkout/" "结账 Checkout" 302   # 购物车是空的时候会跳回购物车
fi
# 6. 不该被打开的文件
XC=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$URL/xmlrpc.php" 2>/dev/null || echo 000)
[[ "$XC" == 403 || "$XC" == 404 || "$XC" == 444 ]] && pass "xmlrpc.php 已封锁" "HTTP $XC" || warnr "xmlrpc.php 已封锁" "HTTP $XC"

echo "------------------------------------------------------------"
echo "结果：PASS $PASS · WARN $WARNS · FAIL $FAILS"
[[ $FAILS -eq 0 ]] && { echo "✅ PASS"; exit 0; } || { echo "❌ FAIL"; exit 1; }
