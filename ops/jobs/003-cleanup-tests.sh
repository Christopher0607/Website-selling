#!/usr/bin/env bash
# 清理真网址测试留下的东西（2026-11-13）：
#   - 删除测试帐号 festtest（cartsmith-admin 是俊宇的，保留）
#   - 删除 check-festive-wp.js 下的测试订单（姓 Test、电邮 @example.com），先把它们扣掉的库存加回去；示范订单（名字有「示范」）不动
#   - 「下次开放通知我」名单删掉测试号码 0128887777
#   - 清空 002 的记录（里面有设定密码连结）
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
S=demo-festive
wpx "$S" user get festtest >/dev/null 2>&1 && wpx "$S" user delete festtest --yes >/dev/null && echo "测试帐号 festtest：已删除"
wpx "$S" eval '
$n = 0;
foreach ( wc_get_orders( array( "limit" => -1, "type" => "shop_order", "status" => array_keys( wc_get_order_statuses() ) ) ) as $o ) {
	if ( "Test" === $o->get_billing_last_name() && "@example.com" === substr( $o->get_billing_email(), -12 ) && "1" !== (string) $o->get_meta( "_agc_demo_seed" ) ) {
		if ( $o->get_data_store()->get_stock_reduced( $o->get_id() ) ) { wc_increase_stock_levels( $o ); }
		$o->delete( true );
		++$n;
	}
}
$list = array_values( array_filter( (array) get_option( "agc_fest_notify", array() ), function ( $x ) { return "0128887777" !== ( $x["p"] ?? "" ); } ) );
update_option( "agc_fest_notify", $list, false );
AGC_Festive::forget_booked();
echo "测试订单：删除 $n 张（库存已加回）；通知名单剩 " . count( $list ) . " 个号码\n";
'
clear_cache "$S"
: > /var/lib/agency-ops/public/jobs/002-temp-admins.log
echo "002 的记录已清空"
