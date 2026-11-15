#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-15）：俊宇要网站跟给店家看的样板一模一样 → 用样板的页面重建（agency-core 1.7.0 class-skin.php，sites/preview-tbt/skin/）。
# 产品换成照样板菜单产生的清单（SKU = 样板的 id）。另外换一组店家后台密码（旧的那组在聊天里出现过），一样两边各自算、不写进记录。
# basic auth 不在这里动：008 设了 18:30 自动开回来。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
bash "$R/scripts/server/build-demo.sh" "$S" || exit 1

T="$(tr -dc 'a-f0-9' < /var/lib/agency-ops/token)"
d4() { printf '%s' "$T-$1" | sha256sum | cut -c1-64 | tr -dc '0-9' | cut -c1-4; }
wpx "$S" user update thebakingtrip --user_pass="bake$(d4 tbt-owner-short-2)" --skip-email >/dev/null && echo "店家帐号 thebakingtrip：换了新密码（旧的那组在聊天里出现过）"
for o in limit_login_lockouts limit_login_retries limit_login_retries_valid; do wpx "$S" option update "$o" '[]' --format=json >/dev/null 2>&1; done
clear_cache "$S"

A=()
grep -q '^BASIC_AUTH="1"' "/etc/agency/sites/$S.conf" 2>/dev/null && { source "/etc/agency/secrets/$S.env"; A=(-u "$BASIC_AUTH_USER:$BASIC_AUTH_PASS"); }
for u in / /menu/ /order/ /festive/ /catering/ /privacy/ /track-order/ /dian/; do
  printf '%-14s HTTP %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" "https://$H$u")"
done
echo "/shop/ 跳到：$(curl -s -o /dev/null -w '%{redirect_url}' "${A[@]}" "https://$H/shop/")"
echo "首页是样板的外观：$(curl -s "${A[@]}" "https://$H/" | grep -c 'class="hdr"') 个页首"
echo "上架产品：$(wpx "$S" post list --post_type=product --post_status=publish --format=count) 样；等价钱的草稿：$(wpx "$S" post list --post_type=product --post_status=draft --format=count) 样"
