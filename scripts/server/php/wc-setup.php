<?php
/**
 * WooCommerce 马来西亚设定（由 setup-master.sh 用 `wp eval-file` 执行，可以重复执行）
 * - 货币 RM、只卖马来西亚、访客结账、库存管理、税关闭
 * - 运费区：西马 / 东马（Flat rate + 免运费门槛 + 自取可选）
 * - 购物车 / 结账用经典短代码（agency-core 的 Demo 模式和结账调整针对经典结账）
 * - 关闭 WooCommerce 的推广、追踪和 coming soon 模式
 *
 * @package AgencyScripts
 */

if ( ! class_exists( 'WooCommerce' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}

$opts = array(
	'woocommerce_currency'                      => 'MYR',
	'woocommerce_currency_pos'                  => 'left',
	'woocommerce_price_thousand_sep'            => ',',
	'woocommerce_price_decimal_sep'             => '.',
	'woocommerce_price_num_decimals'            => '2',
	'woocommerce_default_country'               => get_option( 'woocommerce_default_country' ) && 0 === strpos( get_option( 'woocommerce_default_country' ), 'MY' ) ? get_option( 'woocommerce_default_country' ) : 'MY:SGR',
	'woocommerce_allowed_countries'             => 'specific',
	'woocommerce_specific_allowed_countries'    => array( 'MY' ),
	'woocommerce_ship_to_countries'             => '',
	'woocommerce_default_customer_address'      => 'base',
	'woocommerce_calc_taxes'                    => 'no',
	'woocommerce_enable_coupons'                => 'yes',
	'woocommerce_enable_guest_checkout'         => 'yes',
	'woocommerce_enable_checkout_login_reminder' => 'yes',
	'woocommerce_enable_signup_and_login_from_checkout' => 'yes',
	'woocommerce_enable_myaccount_registration' => 'no',
	'woocommerce_registration_generate_password' => 'yes',
	'woocommerce_manage_stock'                  => 'yes',
	'woocommerce_notify_low_stock_amount'       => '3',
	'woocommerce_notify_no_stock_amount'        => '0',
	'woocommerce_stock_format'                  => '',
	'woocommerce_weight_unit'                   => 'kg',
	'woocommerce_dimension_unit'                => 'cm',
	'woocommerce_enable_reviews'                => 'yes',
	'woocommerce_review_rating_verification_required' => 'yes',
	'woocommerce_enable_shipping_calc'          => 'yes',
	'woocommerce_shipping_cost_requires_address' => 'no',
	'woocommerce_ship_to_destination'           => 'billing',
	'woocommerce_checkout_phone_field'          => 'required',
	'woocommerce_checkout_company_field'        => 'hidden',
	'woocommerce_checkout_address_2_field'      => 'hidden',
	'woocommerce_allow_tracking'                => 'no',
	'woocommerce_show_marketplace_suggestions'  => 'no',
	'woocommerce_task_list_hidden'              => 'yes',
	'woocommerce_task_list_complete'            => 'yes',
	'woocommerce_extended_task_list_hidden'     => 'yes',
	'woocommerce_coming_soon'                   => 'no',
	'woocommerce_store_pages_only'              => 'no',
	'woocommerce_analytics_enabled'             => 'yes',
	'woocommerce_feature_order_attribution_enabled' => 'yes',
);
foreach ( $opts as $k => $v ) {
	update_option( $k, $v );
}
update_option(
	'woocommerce_onboarding_profile',
	array(
		'skipped'   => true,
		'completed' => true,
	)
);

// Pages (shop / cart / checkout / my account).
WC_Install::create_pages();
$cart_id     = wc_get_page_id( 'cart' );
$checkout_id = wc_get_page_id( 'checkout' );
if ( $cart_id > 0 ) {
	wp_update_post(
		array(
			'ID'           => $cart_id,
			'post_content' => '<!-- wp:shortcode -->[woocommerce_cart]<!-- /wp:shortcode -->',
		)
	);
}
if ( $checkout_id > 0 ) {
	wp_update_post(
		array(
			'ID'           => $checkout_id,
			'post_content' => '<!-- wp:shortcode -->[woocommerce_checkout]<!-- /wp:shortcode -->',
		)
	);
}

// Shipping zones.
$east  = array( 'SBH', 'SWK', 'LBN' );
$west  = array( 'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PNG', 'PRK', 'PLS', 'SGR', 'TRG', 'KUL', 'PJY' );
$zones = array(
	'West Malaysia (Semenanjung)' => array( $west, 8.00 ),
	'East Malaysia (Sabah, Sarawak, Labuan)' => array( $east, 15.00 ),
);

/**
 * Find a zone by name.
 *
 * @param string $name Name.
 * @return WC_Shipping_Zone|null
 */
function agc_find_zone( $name ) {
	foreach ( WC_Shipping_Zones::get_zones() as $z ) {
		if ( $z['zone_name'] === $name ) {
			return new WC_Shipping_Zone( $z['id'] );
		}
	}
	return null;
}

$order = 0;
foreach ( $zones as $name => $conf ) {
	$zone = agc_find_zone( $name );
	if ( ! $zone ) {
		$zone = new WC_Shipping_Zone();
		$zone->set_zone_name( $name );
	}
	$zone->set_zone_order( $order++ );
	$zone->clear_locations( array( 'state', 'country', 'continent', 'postcode' ) );
	foreach ( $conf[0] as $state ) {
		$zone->add_location( 'MY:' . $state, 'state' );
	}
	$zone->save();

	$have = array();
	foreach ( $zone->get_shipping_methods() as $m ) {
		$have[ $m->id ] = $m;
	}
	if ( ! isset( $have['flat_rate'] ) ) {
		$iid = $zone->add_shipping_method( 'flat_rate' );
		update_option(
			'woocommerce_flat_rate_' . $iid . '_settings',
			array(
				'title'      => 'Standard delivery',
				'tax_status' => 'none',
				'cost'       => number_format( $conf[1], 2, '.', '' ),
			)
		);
	}
	if ( ! isset( $have['free_shipping'] ) ) {
		$iid = $zone->add_shipping_method( 'free_shipping' );
		update_option(
			'woocommerce_free_shipping_' . $iid . '_settings',
			array(
				'title'                => 'Free shipping',
				'requires'             => 'min_amount',
				'min_amount'           => '150',
				'ignore_discounts'     => 'no',
			)
		);
	}
}

// Fallback: no shipping outside Malaysia (selling is restricted to MY anyway).

// Payment: bank transfer on (as a backup method / for testing). Real gateway is added per client.
$bacs                 = get_option( 'woocommerce_bacs_settings', array() );
$bacs['enabled']      = 'yes';
$bacs['title']        = 'Bank transfer / DuitNow';
$bacs['description']  = 'Transfer to our bank account or DuitNow, then WhatsApp us your receipt. Your order ships after payment is confirmed.';
$bacs['instructions'] = 'Please transfer the total and send your receipt on WhatsApp with your order number.';
update_option( 'woocommerce_bacs_settings', $bacs );
foreach ( array( 'cheque', 'cod', 'paypal' ) as $g ) {
	$s            = get_option( 'woocommerce_' . $g . '_settings', array() );
	$s['enabled'] = 'no';
	update_option( 'woocommerce_' . $g . '_settings', $s );
}

WP_CLI::success( 'WooCommerce Malaysia setup done.' );
