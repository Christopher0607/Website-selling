<?php
/**
 * site-setup.php (2026-11-16, docs/14-wordpress-demos.md) — run with `wp eval-file` by build-wp-demo.sh after the design is
 * in wp-content/uploads/agc-skin/. Turns the design's site.json into the real shop:
 *   - settings: the design on, demo mode with test orders, the public demo login, table QR ordering when the demo has it
 *   - product categories and products (SKU = the item id in the page's lists; name, price, description, photo, stock)
 *   - the gift voucher product, promo codes (WooCommerce coupons), the demo online payment
 *   - a clean start: orders, customers, bookings and enquiries copied from the master site are removed
 * Running it again updates the same products (by SKU) and puts back anything the demo needs.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'AGC_Site' ) ) {
	WP_CLI::error( 'agency-core 1.9+ is needed (class AGC_Site).' );
}
$cfg  = AGC_Site::cfg();
$spec = $cfg['spec'];
$data = $cfg['data'];
if ( ! $data ) {
	WP_CLI::error( 'site.json not found in uploads/agc-skin/' );
}

// ------------------------------------------------------------------ settings
$s = get_option( AGC_Settings::OPTION, array() );
$s = is_array( $s ) ? $s : array();
$s = array_merge(
	$s,
	array(
		'skin'              => 1,
		'demo_mode'         => 1,
		'demo_test_orders'  => 1,
		'demo_public_login' => 1,
		'shop_paused'       => 0,
	)
);
if ( ! empty( $spec['tables'] ) ) {
	$s['table_on']   = 1;
	$s['table_list'] = (string) $spec['tables'];
	$s['table_note'] = (string) ( $spec['table']['note'] ?? '' );
	$s['table_pay']  = 'table' === ( $spec['table']['pay'] ?? '' ) ? 'table' : 'counter';
}
update_option( AGC_Settings::OPTION, $s );
if ( ! empty( $data['BRAND'] ) ) {
	update_option( 'blogname', (string) $data['BRAND'] );
}
update_option( 'blog_public', 0 );
update_option( 'woocommerce_currency', 'MYR' );
update_option( 'woocommerce_default_country', 'MY:SGR' );
update_option( 'timezone_string', 'Asia/Kuala_Lumpur' );
WP_CLI::log( 'Settings: design on, demo mode with test orders, public demo login' . ( ! empty( $spec['tables'] ) ? ', table QR ordering (' . $spec['tables'] . ')' : '' ) );

// ------------------------------------------------------------------ clean start (first run only)
if ( ! get_option( 'agc_site_clean' ) ) {
	$n = 0;
	foreach ( wc_get_orders( array( 'limit' => -1, 'return' => 'ids', 'status' => array_keys( wc_get_order_statuses() ) ) ) as $oid ) {
		$o = wc_get_order( $oid );
		if ( $o ) {
			$o->delete( true );
			++$n;
		}
	}
	foreach ( get_users( array( 'role' => 'customer', 'fields' => 'ID' ) ) as $uid ) {
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user( (int) $uid );
	}
	foreach ( get_posts( array( 'post_type' => array( 'shop_coupon', AGC_Site::BOOKING, AGC_Site::ENQUIRY ), 'numberposts' => -1, 'post_status' => 'any', 'fields' => 'ids' ) ) as $cid ) {
		wp_delete_post( $cid, true ); // coupons copied from master; bookings and enquiries of earlier tests
	}
	update_option( 'agc_site_clean', time() );
	WP_CLI::log( "Clean start: removed $n orders, the customers and coupons copied from master" );
}

// ------------------------------------------------------------------ photos
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
$skin = AGC_Site::dir();
$img  = static function ( $file ) use ( $skin ) {
	$file = preg_replace( '/[^a-z0-9._-]/i', '', (string) $file );
	if ( '' === $file ) {
		return 0;
	}
	$path = $skin . '/img/' . ( preg_match( '/\.(webp|jpe?g|png)$/', $file ) ? $file : $file . '.webp' );
	if ( ! file_exists( $path ) ) {
		return 0;
	}
	$have = get_posts( array( 'post_type' => 'attachment', 'meta_key' => '_agc_skin_file', 'meta_value' => basename( $path ), 'fields' => 'ids', 'numberposts' => 1 ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
	if ( $have ) {
		return (int) $have[0];
	}
	$tmp = wp_tempnam( basename( $path ) );
	copy( $path, $tmp );
	$id = media_handle_sideload( array( 'name' => basename( $path ), 'tmp_name' => $tmp ), 0 );
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( 'Photo ' . basename( $path ) . ': ' . $id->get_error_message() );
		return 0;
	}
	update_post_meta( $id, '_agc_skin_file', basename( $path ) );
	return (int) $id;
};

// ------------------------------------------------------------------ categories and products
$term = static function ( $slug, $name, $parent = 0 ) {
	$t = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $t ) {
		if ( $t->name !== $name || (int) $t->parent !== (int) $parent ) {
			wp_update_term( $t->term_id, 'product_cat', array( 'name' => $name, 'parent' => $parent ) );
		}
		return (int) $t->term_id;
	}
	$r = wp_insert_term( $name, 'product_cat', array( 'slug' => $slug, 'parent' => $parent ) );
	return is_wp_error( $r ) ? 0 : (int) $r['term_id'];
};
$featured = array_map( 'strval', (array) ( $data[ $spec['featured'] ?? '' ] ?? array() ) );
$keep     = array();
$save     = static function ( $it, $cat_ids, $stock_field, $fl = array() ) use ( $img, $featured, &$keep ) {
	$fl  = array_filter( $fl, static fn( $v ) => '' !== $v ) + array( 'desc' => 'd', 'long' => '' );
	$sku = (string) ( $it['id'] ?? '' );
	if ( '' === $sku ) {
		return;
	}
	$pid = wc_get_product_id_by_sku( $sku );
	$p   = $pid ? wc_get_product( $pid ) : new WC_Product_Simple();
	$p->set_sku( $sku );
	$txt = static fn( $v ) => is_array( $v ) ? implode( ' / ', array_map( 'strval', $v ) ) : (string) $v; // several languages: "黄梨球 / Pineapple Balls"
	$p->set_name( $txt( $it['n'] ?? $sku ) );
	$p->set_status( 'publish' );
	$p->set_catalog_visibility( 'visible' );
	$price = isset( $it['p'] ) && is_numeric( $it['p'] ) ? (string) $it['p'] : ( ! empty( $it['opts'] ) ? (string) min( array_map( static fn( $o ) => (float) $o['p'], (array) $it['opts'] ) ) : '' ); // options: the lowest ("from")
	$p->set_regular_price( $price );
	$sale = $fl['sale'] ?? '';
	$p->set_sale_price( $sale && isset( $it[ $sale ] ) && is_numeric( $it[ $sale ] ) ? (string) $it[ $sale ] : '' ); // the shop templates' sale prices
	$p->set_short_description( $txt( $it[ $fl['desc'] ] ?? ( isset( $it['has'] ) ? implode( ', ', array_map( $txt, (array) $it['has'] ) ) : '' ) ) );
	if ( $fl['long'] && isset( $it[ $fl['long'] ] ) ) {
		$long = $it[ $fl['long'] ];
		$p->set_description( is_array( $long ) ? implode( "\n\n", array_map( 'strval', $long ) ) : (string) $long ); // paragraphs
	}
	$p->set_category_ids( $cat_ids );
	$p->set_featured( in_array( $sku, $featured, true ) || in_array( 'pop', (array) ( $it['tags'] ?? array() ), true ) );
	if ( $stock_field && isset( $it[ $stock_field ] ) && is_numeric( $it[ $stock_field ] ) ) {
		$p->set_manage_stock( true );
		$p->set_stock_quantity( (int) $it[ $stock_field ] );
		$p->set_backorders( 'no' );
	} else {
		$p->set_manage_stock( false );
		$p->set_stock_status( empty( $it['out'] ) ? 'instock' : 'outofstock' );
	}
	$pic = $it['img'] ?? null;
	$a   = false === $pic ? 0 : $img( is_array( $pic ) ? ( $pic[0] ?? $sku ) : ( ! empty( $pic ) ? $pic : $sku ) );
	if ( $a ) {
		$p->set_image_id( $a );
		$p->update_meta_data( AGC_Site::SEEDIMG, $a );
	}
	$p->save();
	$keep[] = $p->get_id();
};
$count = 0;
foreach ( (array) ( $spec['lists'] ?? array() ) as $l ) {
	$list = (array) ( $data[ $l['var'] ] ?? array() );
	if ( ! empty( $l['items'] ) ) { // groups (festive seasons): a parent category and one per group.
		$parent = $term( strtolower( $l['var'] ), ucfirst( strtolower( (string) ( $l['label'] ?? 'Festive' ) ) ) );
		foreach ( $list as $gk => $g ) {
			$gid   = (string) ( $g['id'] ?? $gk );
			$gname = is_array( $g['name'] ?? null ) ? implode( ' / ', array_unique( array_map( 'strval', $g['name'] ) ) ) : (string) ( $g['name'] ?? $gid );
			$cid   = $term( 'festive-' . sanitize_title( $gid ), $gname, $parent );
			foreach ( (array) ( $g[ $l['items'] ] ?? array() ) as $it ) {
				if ( ! empty( $l['sku'] ) ) { // the same item code in two festivals: "{g}-{id}" (cny-gb, val-gb)
					$it['id'] = str_replace( array( '{g}', '{id}' ), array( $gid, (string) $it['id'] ), (string) $l['sku'] );
				}
				$save( $it, array_filter( array( $parent, $cid ) ), (string) ( $l['stock'] ?? '' ) );
				++$count;
			}
		}
	} else {
		$names = array();
		foreach ( (array) ( $data[ $l['cats'] ?? '' ] ?? array() ) as $c ) {
			$names[ (string) $c[0] ] = (string) $c[1];
		}
		foreach ( $names as $slug => $name ) {
			$term( $slug, $name );
		}
		foreach ( $list as $it ) {
			$cat = (string) ( $it['cat'] ?? '' );
			$save( $it, $cat ? array( $term( $cat, $names[ $cat ] ?? ucfirst( $cat ) ) ) : array(), (string) ( $l['stock'] ?? '' ), (array) ( $l['fields'] ?? array() ) );
			++$count;
		}
	}
}
if ( ! empty( $spec['voucher']['product'] ) ) {
	$sku = (string) $spec['voucher']['product'];
	$pid = wc_get_product_id_by_sku( $sku );
	$p   = $pid ? wc_get_product( $pid ) : new WC_Product_Simple();
	$p->set_sku( $sku );
	$p->set_name( (string) ( $spec['voucher']['name'] ?? 'Gift voucher' ) );
	$p->set_status( 'publish' );
	$p->set_virtual( true );
	$p->set_catalog_visibility( 'hidden' );
	$p->set_regular_price( '' );
	$p->set_short_description( 'Bought on the vouchers page; the amount is chosen by the customer. The code is made when the order is paid.' );
	$p->save();
	$keep[] = $p->get_id();
}
// The build-your-own gift box (priced on the website from the box and what goes in).
if ( ! empty( $spec['hamper']['product'] ) ) {
	$sku = (string) $spec['hamper']['product'];
	$pid = wc_get_product_id_by_sku( $sku );
	$p   = $pid ? wc_get_product( $pid ) : new WC_Product_Simple();
	$p->set_sku( $sku );
	$p->set_name( (string) ( $spec['hamper']['name'] ?? 'Your own hamper' ) );
	$p->set_status( 'publish' );
	$p->set_catalog_visibility( 'hidden' );
	$p->set_regular_price( '' );
	$p->set_short_description( 'Built on the website: a box, the items chosen, a ribbon and a card. The price is the box plus the items.' );
	$a = $img( (string) ( $spec['hamper']['img'] ?? '' ) );
	if ( $a ) {
		$p->set_image_id( $a );
	}
	$p->save();
	$keep[] = $p->get_id();
}
// Products copied from the master site that the demo doesn't have.
$gone = 0;
foreach ( wc_get_products( array( 'limit' => -1, 'status' => array( 'publish', 'draft', 'private', 'pending' ), 'return' => 'ids' ) ) as $pid ) {
	if ( ! in_array( (int) $pid, $keep, true ) ) {
		$p = wc_get_product( $pid );
		if ( $p ) {
			$p->delete( true );
			++$gone;
		}
	}
}
WP_CLI::log( "Products: $count from the design" . ( ! empty( $spec['voucher']['product'] ) ? ' + gift voucher' : '' ) . ( $gone ? ", removed $gone from master" : '' ) );

// ------------------------------------------------------------------ the sample order the website mentions (tracking)
if ( ! empty( $spec['seed_order'] ) && ! empty( $data[ $spec['seed_order'] ] ) ) {
	$so  = (array) $data[ $spec['seed_order'] ];
	$ref = strtoupper( (string) ( $so['no'] ?? '' ) );
	if ( $ref && ! wc_get_orders( array( 'limit' => 1, 'meta_key' => AGC_Site::REF, 'meta_value' => $ref ) ) ) { // phpcs:ignore WordPress.DB.SlowDBQuery
		$o = wc_create_order( array( 'status' => 'pending', 'created_via' => 'website' ) );
		foreach ( (array) ( $so['items'] ?? array() ) as $l ) {
			$pid = 0;
			foreach ( wc_get_products( array( 'limit' => 1, 'name' => (string) ( $l['n'] ?? '' ) ) ) as $pp ) {
				$pid = $pp->get_id();
			}
			if ( $pid ) {
				$o->add_product( wc_get_product( $pid ), (int) ( $l['qty'] ?? 1 ), array( 'subtotal' => (float) ( $l['unit'] ?? 0 ) * (int) ( $l['qty'] ?? 1 ), 'total' => (float) ( $l['unit'] ?? 0 ) * (int) ( $l['qty'] ?? 1 ) ) );
			}
		}
		$o->set_billing_first_name( (string) ( $so['name'] ?? 'Demo customer' ) );
		$o->set_billing_phone( (string) ( $so['phone'] ?? '' ) );
		$o->set_billing_country( 'MY' );
		$o->set_shipping_state( (string) ( $so['state'] ?? '' ) );
		$o->set_date_created( time() - 2 * DAY_IN_SECONDS );
		$o->update_meta_data( AGC_Site::REF, $ref );
		$o->update_meta_data( '_agc_tracking', (string) ( $so['trk'] ?? '' ) );
		$o->update_meta_data( AGC_Demo_Access::DONE, time() ); // a made-up customer: nothing to hide
		$o->calculate_totals( false );
		$o->save();
		$o->update_status( 'completed', 'Sample order for the tracking page.' );
		WP_CLI::log( "Sample order for tracking: $ref" );
	}
}

// ------------------------------------------------------------------ promo codes
foreach ( (array) ( $spec['coupons'] ?? array() ) as $c ) {
	$src  = (array) ( $data[ $c['from'] ?? '' ] ?? array() );
	$code = strtoupper( (string) ( $src[ $c['code'] ?? 'code' ] ?? ( $c['code'] ?? '' ) ) );
	if ( '' === $code ) {
		continue;
	}
	$cid = wc_get_coupon_id_by_code( $code );
	$cp  = new WC_Coupon( $cid ? $cid : 0 );
	$cp->set_code( $code );
	if ( isset( $c['percent'] ) ) {
		$cp->set_discount_type( 'percent' );
		$cp->set_amount( (float) ( $src[ $c['percent'] ] ?? $c['percent'] ) );
	} else {
		$cp->set_discount_type( 'fixed_cart' );
		$cp->set_amount( (float) ( $src[ $c['amount'] ?? 'amt' ] ?? 0 ) );
	}
	if ( isset( $c['min'] ) ) {
		$cp->set_minimum_amount( (float) ( is_string( $c['min'] ) ? ( $src[ $c['min'] ] ?? 0 ) : $c['min'] ) );
	}
	$cp->set_description( 'Demo promo code (shown on the website).' );
	$cp->save();
	WP_CLI::log( "Promo code: $code" );
}

// ------------------------------------------------------------------ payments: the demo online payment only
update_option(
	'woocommerce_agc_demo_pay_settings',
	array(
		'enabled'     => 'yes',
		'title'       => 'Online banking (FPX), cards, e-wallets',
		'description' => 'Demo website: the order is marked as paid and nothing is charged. A real shop uses its own payment gateway.',
	)
);
$duit            = get_option( 'woocommerce_agc_duitnow_settings', array() );
$duit            = is_array( $duit ) ? $duit : array();
$duit['enabled'] = ! empty( $spec['duitnow'] ) ? 'yes' : 'no';
if ( ! empty( $spec['duitnow'] ) ) {
	$duit['title']       = 'DuitNow QR';
	$duit['description'] = 'Scan the QR with any banking or e-wallet app, then upload your receipt. Demo website: do not pay.';
	$duit['account']     = get_bloginfo( 'name' );
}
update_option( 'woocommerce_agc_duitnow_settings', $duit );
foreach ( array( 'bacs', 'cheque', 'cod' ) as $g ) {
	$o            = get_option( "woocommerce_{$g}_settings", array() );
	$o            = is_array( $o ) ? $o : array();
	$o['enabled'] = 'no';
	update_option( "woocommerce_{$g}_settings", $o );
}

// ------------------------------------------------------------------ the demo account
if ( class_exists( 'AGC_Demo_Access' ) ) {
	AGC_Demo_Access::user();
	WP_CLI::log( 'Demo account: one tap from the website into WordPress admin and the shop dashboard' );
}
flush_rewrite_rules( false );
WP_CLI::success( 'Site design set up: ' . get_bloginfo( 'name' ) );
