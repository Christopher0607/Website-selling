#!/usr/bin/env bash
# go-live.sh — 交付（2026-11-15）：把预览站变成店家的正式网站。
#   1. 先完整备份（backup-site.sh），出问题可以用 restore-site.sh 还原
#   2. 关掉示范模式、示范付款、测试订单开关、我们自己的访客计数
#   3. 删掉测试资料：电邮 @example.com 的订单（库存加回去）、测试帐号（tbttest 之类，用 --remove-user 指定）
#   4. 店家帐号改用店家自己的电邮（--owner-user / --owner-email），印出「自己设密码」连结（只能用一次）；新订单通知寄给店家
#   5. 换成店家的域名：Nginx、SSL、网站里所有旧网址；关掉网站密码（basic auth），开放给 Google（除非 --keep-noindex）
#   6. 清快取、跑 smoke-test
# 用法: sudo go-live.sh <代号> --domain <店家域名> [--owner-user thebakingtrip --owner-email x@y.com] [--remove-user tbttest]
#                         [--keep-noindex] [--no-ssl] [--skip-dns-check] [--yes]
#   不加 --yes 只会印出会做什么（不改任何东西）。
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"
usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift
NEWD=""; OWNER_USER=""; OWNER_EMAIL=""; RM_USERS=(); KEEP_NOI=0; NO_SSL=0; SKIP_DNS=0; YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) NEWD="$(echo "$2" | tr 'A-Z' 'a-z' | sed 's#^https\?://##; s#/.*$##')"; shift 2;;
    --owner-user) OWNER_USER="$2"; shift 2;;
    --owner-email) OWNER_EMAIL="$2"; shift 2;;
    --remove-user) RM_USERS+=("$2"); shift 2;;
    --keep-noindex) KEEP_NOI=1; shift;;
    --no-ssl) NO_SSL=1; shift;;
    --skip-dns-check) SKIP_DNS=1; shift;;
    --yes) YES=1; shift;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
load_site "$SLUG_ARG"
[[ "$NEWD" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]] || die "要用 --domain 写店家的域名，例如 thebakingtrip.com.my"
[[ -z "$OWNER_EMAIL" || "$OWNER_EMAIL" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || die "--owner-email 不是电邮地址"
OLDD="$DOMAIN"
SCHEME_NEW="https"; [[ $NO_SSL == 1 ]] && SCHEME_NEW="http"

echo "== $SLUG_ARG：$OLDD → $NEWD =="
echo "  备份 → 关示范模式 / 示范付款 → 删测试订单（@example.com）${RM_USERS[*]:+、测试帐号 ${RM_USERS[*]}}"
echo "  ${OWNER_USER:+店家帐号 $OWNER_USER${OWNER_EMAIL:+ 改用 $OWNER_EMAIL}（印出设密码连结）→ }换域名 + $([[ $NO_SSL == 1 ]] && echo '不申请 SSL' || echo 'SSL') → 关网站密码 → $([[ $KEEP_NOI == 1 ]] && echo '保留 noindex' || echo '开放给 Google')"
[[ $YES == 1 ]] || { echo "（只是预览。确认后加 --yes 再跑一次。）"; exit 0; }

# DNS: the shop's domain must point here first (otherwise SSL cannot be issued)
if [[ $SKIP_DNS == 0 ]]; then
  IP="$(curl -s --noproxy '*' --max-time 5 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address || true)"
  [[ "$IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] || IP="$(curl -s --max-time 8 https://api.ipify.org || true)"
  got="$(getent ahostsv4 "$NEWD" 2>/dev/null | awk '{print $1; exit}' || true)"
  [[ -n "$IP" && "$got" == "$IP" ]] || die "$NEWD 还没有指到这台服务器（现在是 ${got:-没有记录}，应该是 ${IP:-?}）。先在店家的域名设定加 A 记录。"
fi

info "1/6 备份"
bash "$(dirname "$0")/backup-site.sh" "$SLUG_ARG" >/dev/null || die "备份失败，先不要上线"
ok "备份好了（$AGENCY_BACKUP_DIR/$SLUG_ARG/）"

info "2/6 关掉示范模式"
wpx "$SLUG_ARG" agc demo off >/dev/null
wpx "$SLUG_ARG" eval '
$s = get_option( "agc_settings", array() ); $s = is_array( $s ) ? $s : array();
$s["demo_test_orders"] = 0; $s["studio_hits"] = "";
update_option( "agc_settings", AGC_Settings::sanitize( $s ) );
$d = get_option( "woocommerce_agc_demo_pay_settings", array() ); $d = is_array( $d ) ? $d : array(); $d["enabled"] = "no";
update_option( "woocommerce_agc_demo_pay_settings", $d );
echo "示范模式关了；示范付款关了；测试订单开关关了\n";'

info "3/6 删测试资料"
wpx "$SLUG_ARG" eval '
$n = 0;
foreach ( wc_get_orders( array( "limit" => -1, "type" => "shop_order", "status" => array_keys( wc_get_order_statuses() ) ) ) as $o ) {
	if ( "@example.com" === substr( (string) $o->get_billing_email(), -12 ) || "Test " === substr( (string) $o->get_billing_first_name(), 0, 5 ) ) {
		if ( $o->get_data_store()->get_stock_reduced( $o->get_id() ) ) { wc_increase_stock_levels( $o ); }
		$o->delete( true );
		++$n;
	}
}
if ( class_exists( "AGC_Festive" ) ) { AGC_Festive::forget_booked(); }
echo "测试订单：删除 $n 张（库存已加回）\n";'
for u in "${RM_USERS[@]}"; do
  if wpx "$SLUG_ARG" user get "$u" >/dev/null 2>&1; then wpx "$SLUG_ARG" user delete "$u" --reassign=1 --yes >/dev/null && echo "测试帐号 $u：已删除"; fi
done

info "4/6 店家帐号"
if [[ -n "$OWNER_USER" ]]; then
  wpx "$SLUG_ARG" user get "$OWNER_USER" >/dev/null 2>&1 || die "找不到帐号 $OWNER_USER"
  if [[ -n "$OWNER_EMAIL" ]]; then
    wpx "$SLUG_ARG" user update "$OWNER_USER" --user_email="$OWNER_EMAIL" --skip-email >/dev/null && echo "店家帐号 $OWNER_USER：电邮改成 $OWNER_EMAIL"
    wpx "$SLUG_ARG" eval '$s = get_option( "woocommerce_new_order_settings", array() ); $s = is_array( $s ) ? $s : array(); $s["recipient"] = "'"$OWNER_EMAIL"'"; update_option( "woocommerce_new_order_settings", $s ); echo "新订单通知：寄给店家\n";'
  fi
  # A random password nobody knows; the owner sets their own with the one-time link below.
  wpx "$SLUG_ARG" user update "$OWNER_USER" --user_pass="$(rand_pw 32)" --skip-email >/dev/null
  RESET_LOGIN="$OWNER_USER"
fi

info "5/6 换域名 $OLDD → $NEWD"
set_reg "$SLUG_ARG" DOMAIN "$NEWD"
set_reg "$SLUG_ARG" BASIC_AUTH 0
[[ $KEEP_NOI == 1 ]] || set_reg "$SLUG_ARG" NOINDEX 0
set_reg "$SLUG_ARG" MODE live
load_site "$SLUG_ARG"
render_nginx "$SLUG_ARG"; reload_web
if [[ $NO_SSL == 0 ]]; then
  obtain_ssl "$SLUG_ARG" || die "SSL 申请失败：确认 $NEWD 指到这台服务器、80 端口有开。网站资料还没改，修好 DNS 后再跑一次。"
  set_reg "$SLUG_ARG" SSL 1
  load_site "$SLUG_ARG"; render_nginx "$SLUG_ARG"; reload_web
fi
for old in "https://$OLDD" "http://$OLDD"; do
  wpq "$SLUG_ARG" search-replace "$old" "$SCHEME_NEW://$NEWD" --all-tables >/dev/null
done
wpq "$SLUG_ARG" search-replace "//$OLDD" "//$NEWD" --all-tables >/dev/null
wpq "$SLUG_ARG" option update blog_public "$([[ $KEEP_NOI == 1 ]] && echo 0 || echo 1)" >/dev/null
ok "网址：$SCHEME_NEW://$NEWD"

info "6/6 清快取、检查"
clear_cache "$SLUG_ARG"
if [[ -n "${RESET_LOGIN:-}" ]]; then
  LINK="$(wpx "$SLUG_ARG" eval '$u = get_user_by( "login", "'"$RESET_LOGIN"'" ); $k = get_password_reset_key( $u ); echo is_wp_error( $k ) ? "ERROR" : network_site_url( "wp-login.php?action=rp&key=" . $k . "&login=" . rawurlencode( $u->user_login ), "login" );')"
  echo "给店家的「自己设密码」连结（只能用一次，24 小时内有效；设好后在 $SCHEME_NEW://$NEWD/dian/ 登入）："
  echo "$LINK"
fi
wpx "$SLUG_ARG" eval '
$g = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
$on = array();
foreach ( $g as $id => $x ) { if ( "yes" === $x->enabled && $x->is_available() ) { $on[] = $x->get_title(); } }
$qr = isset( $g["agc_duitnow"] ) ? trim( (string) $g["agc_duitnow"]->get_option( "qr" ) ) : "";
echo "客人看得到的付款方式：" . ( $on ? implode( "、", $on ) : "没有（只能用 WhatsApp 发订单）" ) . "\n";
if ( "" === $qr ) { echo "提醒：DuitNow QR 还没上传。请店家在 /dian/ → 设定 → DuitNow QR 上传自己的 QR（银行 App 里的 DuitNow QR 截图），客人才看得到 DuitNow 付款。\n"; }'
SMOKE=(); [[ $KEEP_NOI == 1 ]] && SMOKE+=(--expect-noindex)
bash "$(dirname "$0")/smoke-test.sh" "$SCHEME_NEW://$NEWD" --site "$SLUG_ARG" "${SMOKE[@]}" | tail -3
