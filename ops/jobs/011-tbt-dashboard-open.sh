#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-15 晚）：18:30 basic auth 自动开回来以后，俊宇的手机一直卡在浏览器的「登录」框，看不到店家后台的登录页。
# 网店本身照样要看网站的密码（basic auth，帐号密码不变），但店家后台 /dian/ 和桌上扫码点单 /table/ 不用先过浏览器的密码框：
# 它们有自己的登录（店家帐号）和每张桌子的钥匙。另外要 agency-core 1.8.1（修好店家后台的「登出」）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
V="$(wpx "$S" plugin get agency-core --field=version 2>/dev/null)"
[[ "$V" == "1.8.1" ]] || { echo "agency-core 还是 ${V:-?}，等小帮手先更新插件"; exit 75; }
grep -q -- '--open-app' "$R/scripts/server/site-config.sh" || { echo "site-config.sh 还是旧的，等 git pull"; exit 75; }
bash "$R/scripts/server/site-config.sh" "$S" --basic-auth on --open-app on >/dev/null || exit 1
echo "basic auth：开着（看网站的帐号密码不变）；店家后台和桌上点单不用先过浏览器的密码框"
for o in limit_login_lockouts limit_login_retries limit_login_retries_valid; do wpx "$S" option update "$o" '[]' --format=json >/dev/null 2>&1; done
echo "店家后台登录：清掉输错密码的锁定"
clear_cache "$S"
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
echo "首页（没密码）HTTP $(code "https://$H/")（要 401 = 还是要看网站的密码）"
echo "菜单页（没密码）HTTP $(code "https://$H/menu/")（要 401）"
echo "店家后台 /dian/（没密码）HTTP $(code "https://$H/dian/")（要 200 = 店家后台的登录页）"
echo "登录页是店家后台的：$(curl -s "https://$H/dian/" | grep -c 'name="log"') 个登录框（要 1）"
echo "后台资料（没登录）：$(curl -s "https://$H/wp-json/agc/v1/owner/summary" | grep -o 'rest_forbidden' | head -1)（要 rest_forbidden = WordPress 自己挡，不是浏览器的框）"
echo "桌上点单错的 QR：HTTP $(code "https://$H/table/?t=1&k=0000000000")（要 404）"
L="$(wpx "$S" eval 'echo AGC_Table::link("1");' 2>/dev/null | tail -1)"
echo "1 号桌的菜单（没密码）：HTTP $(code "$L")（要 200）"
echo "noindex 标头：$(curl -sI "https://$H/dian/" | grep -i '^x-robots-tag' | tr -d '\r')"
