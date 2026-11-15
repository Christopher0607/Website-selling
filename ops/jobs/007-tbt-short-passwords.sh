#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-15 14:2x）：俊宇在店里用手机，32 个字的密码贴不进去，卡在 basic auth 的框。
# 换成手机好打的短密码：英文字 + 4 个数字。照样不写进任何记录：数字 = sha256(报告代号 + 后缀) 里的前 4 个数字，两边各自算。
#   tbt / trip + 4 个数字：打开网站（basic auth）
#   thebakingtrip / bake + 4 个数字：店家后台 /dian/
# 交付时店家自己设密码（README 的交付步骤）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
T="$(tr -dc 'a-f0-9' < /var/lib/agency-ops/token)"
d4() { printf '%s' "$T-$1" | sha256sum | cut -c1-64 | tr -dc '0-9' | cut -c1-4; }
VIEW="trip$(d4 tbt-view-short)"
OWNER="bake$(d4 tbt-owner-short)"

site_vars "$S"
touch "$SITE_SECRETS"; chmod 600 "$SITE_SECRETS"
sed -i '/^BASIC_AUTH_USER=/d;/^BASIC_AUTH_PASS=/d' "$SITE_SECRETS"
{ echo 'BASIC_AUTH_USER="tbt"'; echo "BASIC_AUTH_PASS=\"$VIEW\""; } >> "$SITE_SECRETS"
bash "$R/scripts/server/site-config.sh" "$S" --basic-auth on >/dev/null || exit 1
echo "basic auth：换成短密码（帐号 tbt）"

wpx "$S" user update thebakingtrip --user_pass="$OWNER" --skip-email >/dev/null && echo "店家帐号 thebakingtrip：换成短密码"
for o in limit_login_lockouts limit_login_retries limit_login_retries_valid; do wpx "$S" option update "$o" '[]' --format=json >/dev/null 2>&1; done
echo "登录锁定：已清空"
clear_cache "$S"

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
echo "首页（没密码）HTTP $(code "https://$H/")（应该是 401）"
echo "首页（新密码）HTTP $(code -u "tbt:$VIEW" "https://$H/")"
echo "店家后台 /dian/ HTTP $(code -u "tbt:$VIEW" "https://$H/dian/")"
