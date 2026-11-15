<?php
/**
 * The Baking Trip: shop settings after the products are in (2026-11-14). Run by build-demo.sh when a site has its own
 * setup.php (instead of the festive demo's festive-setup.php): wp eval-file setup.php
 *
 * - Collection only (no delivery yet): one zone for Malaysia with "Pick up at the bakery".
 * - Payment: DuitNow QR with a receipt upload (works on a real shop straight away); in preview mode also a demo
 *   online payment that charges nothing. The owner's own payment gateway goes in at handover.
 * - Items without a price stay as drafts: the owner types the price in the shop dashboard (/dian/) and
 *   switches them on.
 * - Products in CSV order; English titles for the shop pages.
 *
 * @package AgencyScripts
 */

// Shipping: collection only.
foreach ( WC_Shipping_Zones::get_zones() as $z ) {
	( new WC_Shipping_Zone( $z['id'] ) )->delete();
}
$zone = new WC_Shipping_Zone();
$zone->set_zone_name( 'Malaysia' );
$zone->set_zone_order( 0 );
$zone->add_location( 'MY', 'country' );
$zone->save();
$iid = $zone->add_shipping_method( 'local_pickup' );
update_option( 'woocommerce_local_pickup_' . $iid . '_settings', array( 'title' => 'Pick up at the bakery (free)', 'tax_status' => 'none', 'cost' => '' ) );
update_option( 'woocommerce_ship_to_countries', 'specific' );
update_option( 'woocommerce_specific_ship_to_countries', array( 'MY' ) );
update_option( 'woocommerce_ship_to_destination', 'billing_only' ); // no "ship to a different address" box
WP_CLI::log( 'Shipping: collection only (Pick up at the bakery)' );

// Payment.
$duit = get_option( 'woocommerce_agc_duitnow_settings', array() );
update_option(
	'woocommerce_agc_duitnow_settings',
	array_merge(
		is_array( $duit ) ? $duit : array(),
		array(
			'enabled'     => 'yes',
			'title'       => 'DuitNow QR (any bank or e-wallet app)',
			'description' => 'After you place the order you will see our DuitNow QR and the amount. Pay with any banking or e-wallet app, then upload the receipt.',
			'account'     => get_bloginfo( 'name' ),
			'instructions' => 'We check payments the same day, Wednesday to Sunday 9am–6pm. Orders paid on Monday or Tuesday are confirmed on Wednesday morning.',
		)
	)
);
$demo = (bool) agc_get( 'demo_mode' );
update_option(
	'woocommerce_agc_demo_pay_settings',
	array(
		'enabled'     => $demo ? 'yes' : 'no',
		'title'       => 'Online banking (FPX), cards, e-wallets',
		'description' => 'Preview: the order is marked as paid and nothing is charged. The real shop connects the bakery’s own payment gateway.',
	)
);
update_option( 'woocommerce_gateway_order', array( 'agc_demo_pay' => 0, 'agc_duitnow' => 1, 'bacs' => 2 ) );
update_option( 'woocommerce_email_from_name', get_bloginfo( 'name' ) );
WP_CLI::log( 'Payment: DuitNow QR + receipt' . ( $demo ? '; preview online payment (charges nothing)' : '' ) );

// Products: CSV order; no price yet → draft.
$ids = wc_get_products( array( 'limit' => -1, 'orderby' => 'ID', 'order' => 'ASC', 'return' => 'ids', 'status' => array( 'publish', 'draft', 'private' ) ) );
$n   = 0;
$off = 0;
foreach ( $ids as $i => $id ) {
	$p = wc_get_product( $id );
	if ( ! $p ) {
		continue;
	}
	wp_update_post( array( 'ID' => $id, 'menu_order' => $i ) );
	$priced = '' !== (string) $p->get_regular_price();
	if ( ! $priced ) {
		$p->set_status( 'draft' );
		$p->save();
		$off++;
	}
	$n++;
}
update_option( 'woocommerce_default_catalog_orderby', 'menu_order' );
WP_CLI::log( "Products: $n in CSV order; $off waiting for a price (drafts the owner switches on in /dian/)" );

// Shop pages in English.
foreach ( array( 'shop' => 'Breads & cakes', 'cart' => 'Your order', 'checkout' => 'Checkout', 'myaccount' => 'My account' ) as $page => $title ) {
	$pid = wc_get_page_id( $page );
	if ( $pid > 0 ) {
		wp_update_post( array( 'ID' => $pid, 'post_title' => $title ) );
	}
}
// First build only: the site was copied from master, so drop master's test orders, customers and coupons. A later
// rebuild keeps everything (real test orders from the owner stay).
if ( ! get_option( 'agc_preview_clean' ) ) {
	$gone = 0;
	foreach ( wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'status' => array_keys( wc_get_order_statuses() ) ) ) as $oid ) {
		$o = wc_get_order( $oid );
		if ( $o ) {
			$o->delete( true );
			$gone++;
		}
	}
	foreach ( get_posts( array( 'post_type' => 'shop_coupon', 'numberposts' => -1, 'post_status' => 'any', 'fields' => 'ids' ) ) as $cid ) {
		wp_delete_post( $cid, true );
	}
	require_once ABSPATH . 'wp-admin/includes/user.php';
	foreach ( get_users( array( 'role__in' => array( 'customer', 'subscriber' ), 'fields' => 'ID' ) ) as $uid ) {
		wp_delete_user( (int) $uid );
	}
	update_option( 'agc_preview_clean', gmdate( 'c' ), false );
	WP_CLI::log( "Clean start: removed $gone orders copied from master" );
}
WP_CLI::success( 'The Baking Trip shop settings done' );
