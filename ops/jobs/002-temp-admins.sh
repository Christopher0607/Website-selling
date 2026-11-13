#!/usr/bin/env bash
# 临时后台帐号（2026-11-13，俊宇要求：他只有手机，要直接登录 demo-festive 后台；也让 Claude Code 在真网址跑店家后台测试）
#   cartsmith-admin：给俊宇。印出「设定密码」连结（只能用一次、24 小时失效），他自己设密码；这里不产生、不印出任何密码。
#   festtest：给 Claude Code 跑 check-festive-wp.js。密码 = sha256(报告代号 + "-festtest") 前 32 个字，两边各自算，不写进任何记录。
#   之后的 003 脚本会删掉 festtest 和这份记录。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
S=demo-festive

PW="$(printf '%s' "$(tr -dc 'a-f0-9' < /var/lib/agency-ops/token)-festtest" | sha256sum | cut -c1-32)"
if wpx "$S" user get festtest >/dev/null 2>&1; then
  wpx "$S" user update festtest --user_pass="$PW" >/dev/null && echo "测试帐号 festtest：已更新"
else
  wpx "$S" user create festtest festtest@example.com --role=administrator --user_pass="$PW" >/dev/null && echo "测试帐号 festtest：已建立"
fi

if ! wpx "$S" user get cartsmith-admin >/dev/null 2>&1; then
  RAND="$(rand_pw 40)"
  wpx "$S" user create cartsmith-admin cartsmith.studio+demo@gmail.com --role=administrator --display_name="Cartsmith" --user_pass="$RAND" >/dev/null && echo "俊宇的帐号 cartsmith-admin：已建立"
fi
LINK="$(wpx "$S" eval '$u = get_user_by( "login", "cartsmith-admin" ); $k = get_password_reset_key( $u ); echo is_wp_error( $k ) ? "ERROR" : network_site_url( "wp-login.php?action=rp&key=" . $k . "&login=" . rawurlencode( $u->user_login ), "login" );')"
echo "设定密码连结（只能用一次，24 小时内有效）："
echo "$LINK"
