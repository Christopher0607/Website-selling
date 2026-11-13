<?php
/**
 * 节日预购网店的 WooCommerce 设定（2026-11-13）。由 build-demo.sh 在有 festive.json 的站点执行，
 * 交付客户时也可以用：wp eval-file festive-setup.php [seed]
 *
 * - 运送区域：巴生谷（邮区）自取 + 送货 RM15（满 RM200 免运）→ 西马快递 RM12（满 RM250 免运）+ 自取 → 东马快递 RM25
 *   区域名字有 "Klang Valley"，agency-core 靠这个认出「本地送货」（设定 fest_delivery_zone）。
 * - 付款：DuitNow QR（手动 + 上传收据）；示范站另外有「示范网上付款」（不收钱）。真正的网关等客户开户再装。
 * - 产品按 CSV 顺序排。
 * - 加 seed：示范站放 12 张示范订单（客户名字后面写「示范」），让店家后台有东西看。寄信全部关掉。
 *
 * @package AgencyScripts
 */

$seed = in_array( 'seed', $args, true );

/**
 * Find or create a zone.
 *
 * @param string $name  Zone name.
 * @param int    $order Order.
 * @return WC_Shipping_Zone
 */
function agc_fz( $name, $order ) {
	foreach ( WC_Shipping_Zones::get_zones() as $z ) {
		if ( $z['zone_name'] === $name ) {
			$zone = new WC_Shipping_Zone( $z['id'] );
			$zone->set_zone_order( $order );
			return $zone;
		}
	}
	$zone = new WC_Shipping_Zone();
	$zone->set_zone_name( $name );
	$zone->set_zone_order( $order );
	return $zone;
}

/**
 * Make a zone have exactly these methods.
 *
 * @param WC_Shipping_Zone $zone    Zone.
 * @param array            $methods [ [ type, settings ], ... ].
 */
function agc_fz_methods( $zone, $methods ) {
	foreach ( $zone->get_shipping_methods() as $iid => $m ) {
		$zone->delete_shipping_method( $iid );
	}
	foreach ( $methods as $m ) {
		$iid = $zone->add_shipping_method( $m[0] );
		update_option( 'woocommerce_' . $m[0] . '_' . $iid . '_settings', $m[1] );
	}
}

$west = array( 'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PNG', 'PRK', 'PLS', 'SGR', 'TRG', 'KUL', 'PJY' );
$east = array( 'SBH', 'SWK', 'LBN' );

// Klang Valley by postcode (Shah Alam, Klang, PJ, Subang, Puchong, Cheras, Kajang, Gombak, KL, Putrajaya, Cyberjaya, Ampang).
$kv = agc_fz( 'Klang Valley 巴生谷', 0 );
$kv->clear_locations( array( 'state', 'country', 'continent', 'postcode' ) );
$kv->add_location( 'MY', 'country' );
foreach ( array( '40000...48999', '50000...60000', '62000...63999', '68000...68199' ) as $range ) {
	$kv->add_location( $range, 'postcode' );
}
$kv->save();
agc_fz_methods(
	$kv,
	array(
		array( 'local_pickup', array( 'title' => '到店自取（免费）', 'tax_status' => 'none', 'cost' => '' ) ),
		array( 'flat_rate', array( 'title' => '巴生谷送货', 'tax_status' => 'none', 'cost' => '15.00' ) ),
		array( 'free_shipping', array( 'title' => '巴生谷送货（满 RM200 免运）', 'requires' => 'min_amount', 'min_amount' => '200', 'ignore_discounts' => 'no' ) ),
	)
);

$wz = agc_fz( 'West Malaysia (Semenanjung)', 1 );
$wz->clear_locations( array( 'state', 'country', 'continent', 'postcode' ) );
foreach ( $west as $st ) {
	$wz->add_location( 'MY:' . $st, 'state' );
}
$wz->save();
agc_fz_methods(
	$wz,
	array(
		array( 'flat_rate', array( 'title' => '快递（西马）', 'tax_status' => 'none', 'cost' => '12.00' ) ),
		array( 'free_shipping', array( 'title' => '快递（西马，满 RM250 免运）', 'requires' => 'min_amount', 'min_amount' => '250', 'ignore_discounts' => 'no' ) ),
		array( 'local_pickup', array( 'title' => '到店自取（免费）', 'tax_status' => 'none', 'cost' => '' ) ),
	)
);

$ez = agc_fz( 'East Malaysia (Sabah, Sarawak, Labuan)', 2 );
$ez->clear_locations( array( 'state', 'country', 'continent', 'postcode' ) );
foreach ( $east as $st ) {
	$ez->add_location( 'MY:' . $st, 'state' );
}
$ez->save();
agc_fz_methods( $ez, array( array( 'flat_rate', array( 'title' => '快递（东马）', 'tax_status' => 'none', 'cost' => '25.00' ) ) ) );
WP_CLI::log( '运送区域：巴生谷（自取 / 送货）、西马快递、东马快递' );

// Payment methods.
$duit = get_option( 'woocommerce_agc_duitnow_settings', array() );
$duit = array_merge(
	is_array( $duit ) ? $duit : array(),
	array(
		'enabled'     => 'yes',
		'title'       => 'DuitNow QR（任何银行或电子钱包 App）',
		'description' => '下单后会看到我们的 DuitNow QR 和金额。用任何银行或电子钱包 App 付款，再上传收据。',
		'account'     => get_bloginfo( 'name' ),
	)
);
update_option( 'woocommerce_agc_duitnow_settings', $duit );
update_option(
	'woocommerce_agc_demo_pay_settings',
	array(
		'enabled'     => 'yes',
		'title'       => '网上银行 FPX、信用卡、电子钱包',
		'description' => '示范网站：下单后直接当作已付款，不会收钱。真正的网店会接上店家自己的付款网关。',
	)
);
update_option( 'woocommerce_gateway_order', array( 'agc_demo_pay' => 0, 'agc_duitnow' => 1, 'bacs' => 2 ) );
update_option( 'woocommerce_email_from_name', get_bloginfo( 'name' ) );
WP_CLI::log( '付款：DuitNow QR + 上传收据' . ( agc_get( 'demo_mode' ) ? '；示范网上付款（不收钱）' : '' ) );

// Products in CSV order (the import keeps the SKU order).
$ids = wc_get_products(
	array(
		'limit'   => -1,
		'orderby' => 'ID',
		'order'   => 'ASC',
		'return'  => 'ids',
		'type'    => array( 'simple', 'variable' ),
	)
);
foreach ( array_values( $ids ) as $i => $id ) {
	wp_update_post(
		array(
			'ID'         => $id,
			'menu_order' => $i,
		)
	);
}
update_option( 'woocommerce_default_catalog_orderby', 'menu_order' );

// Chinese store: WooCommerce's own pages get Chinese titles too (the menu follows the page titles).
if ( 0 === strpos( get_locale(), 'zh' ) ) {
	$titles = array(
		'shop'      => '年饼 Shop',
		'cart'      => '购物车',
		'checkout'  => '结账',
		'myaccount' => '我的账户',
	);
	foreach ( $titles as $page => $title ) {
		$pid = wc_get_page_id( $page );
		if ( $pid > 0 ) {
			wp_update_post(
				array(
					'ID'         => $pid,
					'post_title' => $title,
				)
			);
		}
	}
	WP_CLI::log( '商店、购物车、结账页换成中文标题' );
}
WP_CLI::log( '产品排序：' . count( $ids ) . ' 样' );

if ( ! $seed ) {
	WP_CLI::success( '节日网店设定完成' );
	return;
}

// Sample orders for the demo owner page (no emails).
foreach ( wc_get_orders( array( 'limit' => -1, 'type' => 'shop_order', 'status' => array_keys( wc_get_order_statuses() ) ) ) as $o ) {
	if ( '1' === (string) $o->get_meta( '_agc_demo_seed' ) ) {
		$o->delete( true );
	}
}
add_filter( 'pre_wp_mail', '__return_true' );
$by_sku = static function ( $sku ) {
	$id = wc_get_product_id_by_sku( $sku );
	return $id ? wc_get_product( $id ) : null;
};
$people = array( '陈', '林', '黄', '李', '张', '王', 'Tan', 'Lim', 'Wong', 'Ong', 'Lee', 'Chong' );
$plan   = array(
	// day offset from fest_from, slot index, mode, status, items.
	array( 0, 0, 'collect', 'processing', array( 'BL-PB-L' => 1, 'BL-LL-O' => 1 ) ),
	array( 0, 0, 'collect', 'on-hold', array( 'BL-PB-S' => 2 ) ),
	array( 0, 1, 'collect', 'processing', array( 'BL-GB' => 1 ) ),
	array( 0, 1, 'delivery', 'processing', array( 'BL-PB-L' => 2, 'BL-PN' => 1 ) ),
	array( 1, 0, 'collect', 'processing', array( 'BL-BC' => 1, 'BL-AC' => 1 ) ),
	array( 1, 0, 'delivery', 'on-hold', array( 'BL-GB' => 2 ) ),
	array( 1, 1, 'collect', 'processing', array( 'BL-PT' => 1, 'BL-LL-P' => 1 ) ),
	array( 2, 0, 'collect', 'processing', array( 'BL-PB-S' => 1, 'BL-PN' => 2 ) ),
	array( 2, 1, 'delivery', 'processing', array( 'BL-PB-L' => 1, 'BL-GB' => 1 ) ),
	array( 3, 0, 'collect', 'processing', array( 'BL-LL-O' => 2 ) ),
	array( -1, -1, 'courier', 'processing', array( 'BL-PB-S' => 1, 'BL-LL-O' => 1 ) ),
	array( -1, -1, 'courier', 'on-hold', array( 'BL-GB' => 1 ) ),
);
$from  = DateTimeImmutable::createFromFormat( 'Y-m-d', (string) agc_get( 'fest_from' ), wp_timezone() );
$made  = 0;
$rates = array();
foreach ( array( $kv, $wz ) as $z ) {
	foreach ( $z->get_shipping_methods() as $m ) {
		$rates[ $z->get_id() ][ $m->id ] = $m;
	}
}
foreach ( $plan as $i => $p ) {
	$order = wc_create_order( array( 'status' => 'pending' ) );
	foreach ( $p[4] as $sku => $qty ) {
		$prod = $by_sku( $sku );
		if ( $prod ) {
			$order->add_product( $prod, $qty );
		}
	}
	$name = $people[ $i % count( $people ) ];
	$order->set_billing_first_name( '' );
	$order->set_billing_last_name( ( preg_match( '/^[A-Za-z]/', $name ) ? 'Ms ' . $name : $name . '小姐' ) . '（示范）' );
	$order->set_billing_phone( '012-000 ' . str_pad( (string) ( 1000 + $i * 37 ), 4, '0', STR_PAD_LEFT ) );
	$order->set_billing_email( 'demo-' . ( $i + 1 ) . '@example.com' );
	$order->set_billing_city( 'Petaling Jaya' );
	$order->set_billing_state( 'SGR' );
	$order->set_billing_postcode( 'courier' === $p[2] ? '31400' : '47300' );
	$order->set_billing_country( 'MY' );
	$order->set_billing_address_1( '（示范地址）' );
	$order->set_payment_method( 'on-hold' === $p[3] ? 'agc_duitnow' : 'agc_demo_pay' );
	$order->set_payment_method_title( 'on-hold' === $p[3] ? 'DuitNow QR' : '网上银行 FPX（示范）' );
	$ship = new WC_Order_Item_Shipping();
	$ship->set_method_title( 'collect' === $p[2] ? '到店自取（免费）' : ( 'delivery' === $p[2] ? '巴生谷送货' : '快递（西马）' ) );
	$ship->set_method_id( 'collect' === $p[2] ? 'local_pickup' : 'flat_rate' );
	$ship->set_total( 'collect' === $p[2] ? 0 : ( 'delivery' === $p[2] ? 15 : 12 ) );
	$order->add_item( $ship );
	$order->update_meta_data( AGC_Festive::MODE, $p[2] );
	if ( 'courier' !== $p[2] && $from ) {
		$slots = array_keys( AGC_Festive::slots( $p[2] ) );
		$order->update_meta_data( AGC_Festive::DATE, $from->modify( '+' . $p[0] . ' day' )->format( 'Y-m-d' ) );
		$order->update_meta_data( AGC_Festive::SLOT, $slots[ $p[1] ] ?? $slots[0] );
	}
	$order->update_meta_data( '_agc_demo_seed', '1' );
	$order->calculate_totals( false );
	$order->set_date_created( time() - ( count( $plan ) - $i ) * 5400 );
	$order->save();
	$order->update_status( $p[3], '示范订单 Sample order' );
	++$made;
}
AGC_Festive::forget_booked();
WP_CLI::success( "节日网店设定完成，放了 $made 张示范订单（不寄信）" );
