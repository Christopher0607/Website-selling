<?php
/**
 * 建立 / 更新页面、菜单、页脚（由 build-pages.sh 执行）
 * 用法：wp eval-file build-pages.php <内容文件夹1> [内容文件夹2 ...] [force]
 *   后面的文件夹里同名的 .html 会覆盖前面的（例如：母版内容 + 样板站自己的内容）
 *   没有 force：页面已经存在就不覆盖（保护客户自己改过的内容）
 *
 * @package AgencyScripts
 */

$force = in_array( 'force', $args, true );
$dirs  = array_values( array_filter( $args, static fn( $a ) => 'force' !== $a ) );
if ( ! $dirs ) {
	WP_CLI::error( 'Give at least one content folder.' );
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

/**
 * Find (or import) an image by key. Files: <dir>/images/<key>.(webp|jpg|png|svg).
 *
 * @param string $key  Key.
 * @param array  $dirs Content dirs.
 * @return string URL or ''.
 */
function agc_img_url( $key, $dirs ) {
	$found = get_posts(
		array(
			'post_type'   => 'attachment',
			'post_status' => 'inherit',
			'meta_key'    => '_agc_key', // phpcs:ignore WordPress.DB.SlowDBQuery
			'meta_value'  => $key, // phpcs:ignore WordPress.DB.SlowDBQuery
			'numberposts' => 1,
			'fields'      => 'ids',
		)
	);
	if ( $found ) {
		return (string) wp_get_attachment_image_url( $found[0], 'large' );
	}
	foreach ( array_reverse( $dirs ) as $d ) {
		foreach ( array( 'webp', 'jpg', 'png' ) as $ext ) {
			$f = "$d/images/$key.$ext";
			if ( is_readable( $f ) ) {
				$tmp = wp_tempnam( basename( $f ) );
				copy( $f, $tmp );
				$id = media_handle_sideload( array( 'name' => basename( $f ), 'tmp_name' => $tmp ), 0 );
				if ( is_wp_error( $id ) ) {
					WP_CLI::warning( "Image $key: " . $id->get_error_message() );
					return '';
				}
				update_post_meta( $id, '_agc_key', $key );
				update_post_meta( $id, '_wp_attachment_image_alt', get_bloginfo( 'name' ) );
				return (string) wp_get_attachment_image_url( $id, 'large' );
			}
		}
	}
	WP_CLI::warning( "Image not found: $key" );
	return '';
}

// 收集页面文件（后面的文件夹覆盖前面的）.
$files = array();
foreach ( $dirs as $d ) {
	foreach ( glob( rtrim( $d, '/' ) . '/*.html' ) as $f ) {
		$files[ basename( $f ) ] = $f;
	}
}
if ( ! $files ) {
	WP_CLI::error( 'No .html files found.' );
}

$shop_url = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : home_url( '/shop/' );
$menus    = array(
	'primary' => array(),
	'footer'  => array(),
);
$pages    = array();

foreach ( $files as $f ) {
	$raw = (string) file_get_contents( $f );
	if ( ! preg_match( '/^<!--\s*page:(.*?)-->\s*/s', $raw, $m ) ) {
		WP_CLI::warning( basename( $f ) . ': missing <!-- page: ... --> header, skipped' );
		continue;
	}
	preg_match_all( '/(\w+)="([^"]*)"/', $m[1], $kv, PREG_SET_ORDER );
	$meta = array();
	foreach ( $kv as $pair ) {
		$meta[ $pair[1] ] = $pair[2];
	}
	$body = substr( $raw, strlen( $m[0] ) );
	$body = strtr(
		$body,
		array(
			'{{SITE_NAME}}' => esc_html( get_bloginfo( 'name' ) ),
			'{{TAGLINE}}'   => esc_html( get_bloginfo( 'description' ) ? get_bloginfo( 'description' ) : get_bloginfo( 'name' ) ),
			'{{SHOP_URL}}'  => esc_url( $shop_url ),
		)
	);
	$body = preg_replace_callback( '/\{\{IMG:([a-z0-9_-]+)\}\}/i', static fn( $mm ) => esc_url( agc_img_url( $mm[1], $dirs ) ), $body );

	$slug     = $meta['slug'] ?? sanitize_title( $meta['title'] ?? basename( $f, '.html' ) );
	$existing = get_page_by_path( $slug, OBJECT, 'page' );
	$postarr  = array(
		'post_type'    => 'page',
		'post_status'  => 'publish',
		'post_title'   => $meta['title'] ?? ucfirst( $slug ),
		'post_name'    => $slug,
		'post_content' => $body,
		'menu_order'   => (int) ( $meta['order'] ?? 0 ),
		'comment_status' => 'closed',
	);
	if ( $existing ) {
		if ( $force ) {
			$postarr['ID'] = $existing->ID;
			wp_update_post( wp_slash( $postarr ) );
			$id = $existing->ID;
			WP_CLI::log( "  updated: $slug" );
		} else {
			$id = $existing->ID;
			WP_CLI::log( "  kept (exists): $slug" );
		}
	} else {
		$id = wp_insert_post( wp_slash( $postarr ), true );
		if ( is_wp_error( $id ) ) {
			WP_CLI::warning( "$slug: " . $id->get_error_message() );
			continue;
		}
		WP_CLI::log( "  created: $slug" );
	}
	$pages[ $slug ] = $id;
	// Kadence 版面：隐藏页面标题横幅（内容里已经有 H1）、全宽、不加框.
	update_post_meta( $id, '_kad_post_title', 'hide' );
	update_post_meta( $id, '_kad_post_layout', 'fullwidth' );
	update_post_meta( $id, '_kad_post_content_style', 'unboxed' );
	update_post_meta( $id, '_kad_post_vertical_padding', 'hide' );
	if ( ! empty( $meta['front'] ) ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $id );
	}
	if ( ! empty( $meta['privacy'] ) ) {
		update_option( 'wp_page_for_privacy_policy', $id );
	}
	if ( ! empty( $meta['terms'] ) ) {
		update_option( 'woocommerce_terms_page_id', $id );
	}
	foreach ( array_filter( array_map( 'trim', explode( ',', $meta['menu'] ?? '' ) ) ) as $menu ) {
		if ( isset( $menus[ $menu ] ) ) {
			$menus[ $menu ][ (int) ( $meta['order'] ?? 0 ) * 100 + count( $menus[ $menu ] ) ] = $id;
		}
	}
}

// 隐藏 WooCommerce 自动建的不需要的页面（例如 Refund policy 草稿）.
foreach ( get_posts( array( 'post_type' => 'page', 'post_status' => 'draft', 'numberposts' => 20 ) ) as $p ) {
	if ( in_array( $p->post_name, array( 'refund_returns', 'refund-returns', 'privacy-policy' ), true ) ) {
		wp_delete_post( $p->ID, true );
	}
}

// 菜单.
$shop_id = function_exists( 'wc_get_page_id' ) ? wc_get_page_id( 'shop' ) : 0;
if ( $shop_id > 0 ) {
	$menus['primary'][1000] = $shop_id; // 商店放在 Home 后面（下面排序会调整）
}
$locations = get_theme_mod( 'nav_menu_locations', array() );
foreach ( array( 'primary' => 'Main menu', 'footer' => 'Footer menu' ) as $key => $label ) {
	$menu = wp_get_nav_menu_object( $label );
	$mid  = $menu ? $menu->term_id : wp_create_nav_menu( $label );
	foreach ( wp_get_nav_menu_items( $mid ) ? wp_get_nav_menu_items( $mid ) : array() as $item ) {
		wp_delete_post( $item->ID, true );
	}
	$items = $menus[ $key ];
	ksort( $items );
	if ( 'primary' === $key && isset( $items[1000] ) ) {
		// Home, Shop, then the rest.
		$shop = $items[1000];
		unset( $items[1000] );
		$items = array_values( $items );
		array_splice( $items, 1, 0, array( $shop ) );
	}
	$pos = 1;
	foreach ( $items as $pid ) {
		wp_update_nav_menu_item(
			$mid,
			0,
			array(
				'menu-item-object-id' => $pid,
				'menu-item-object'    => 'page',
				'menu-item-type'      => 'post_type',
				'menu-item-status'    => 'publish',
				'menu-item-position'  => $pos++,
			)
		);
	}
	if ( 'primary' === $key ) {
		$locations['primary'] = $mid;
		$locations['mobile']  = $mid;
	} else {
		$locations['footer'] = $mid;
	}
}
set_theme_mod( 'nav_menu_locations', $locations );

// 页脚：公司资料 / 页脚菜单 / 社交 + 付款方式；底部版权.
if ( 'kadence' === get_template() ) {
	$footer_items = get_theme_mod( 'footer_items', array() );
	$footer_items = is_array( $footer_items ) ? $footer_items : array();
	$footer_items['middle'] = array(
		'middle_1' => array( 'footer-widget1' ),
		'middle_2' => array( 'footer-navigation' ),
		'middle_3' => array( 'footer-widget2' ),
		'middle_4' => array(),
		'middle_5' => array(),
	);
	$footer_items['bottom'] = array(
		'bottom_1' => array( 'footer-html' ),
		'bottom_2' => array(),
		'bottom_3' => array(),
		'bottom_4' => array(),
		'bottom_5' => array(),
	);
	$footer_items['top'] = $footer_items['top'] ?? array( 'top_1' => array(), 'top_2' => array(), 'top_3' => array(), 'top_4' => array(), 'top_5' => array() );
	set_theme_mod( 'footer_items', $footer_items );
	set_theme_mod( 'footer_middle_columns', '3' );
	set_theme_mod( 'footer_html_content', '{copyright} {year} {site-title}. [agc_concept_label]' );
	set_theme_mod( 'footer_navigation_stretch', false );

	$widgets = array(
		'footer1' => '<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">' . esc_html( get_bloginfo( 'name' ) ) . '</h4><!-- /wp:heading --><!-- wp:shortcode -->[agc_business]<!-- /wp:shortcode -->',
		'footer2' => '<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Follow us</h4><!-- /wp:heading --><!-- wp:shortcode -->[agc_social]<!-- /wp:shortcode --><!-- wp:paragraph {"className":"agc-payments"} --><p class="agc-payments">We accept: FPX online banking · Cards · E-wallets · Bank transfer / DuitNow</p><!-- /wp:paragraph -->',
	);
	$sidebars = get_option( 'sidebars_widgets', array() );
	$blocks   = get_option( 'widget_block', array() );
	$blocks   = is_array( $blocks ) ? $blocks : array();
	$next     = $blocks ? max( array_filter( array_keys( $blocks ), 'is_int' ) ?: array( 1 ) ) + 1 : 2;
	foreach ( $widgets as $sidebar => $content ) {
		// 清掉旧的 block widget，换成新的.
		foreach ( $sidebars[ $sidebar ] ?? array() as $wid ) {
			if ( preg_match( '/^block-(\d+)$/', $wid, $mm ) ) {
				unset( $blocks[ (int) $mm[1] ] );
			}
		}
		$blocks[ $next ]      = array( 'content' => $content );
		$sidebars[ $sidebar ] = array( 'block-' . $next );
		++$next;
	}
	$blocks['_multiwidget'] = 1;
	update_option( 'widget_block', $blocks );
	update_option( 'sidebars_widgets', $sidebars );
}

WP_CLI::success( count( $pages ) . ' pages processed; menus and footer set.' );
