<?php
/**
 * 套用 brand-config.json（由 apply-brand.sh 用 `wp eval-file apply-brand.php <config.json>` 执行，可以重复执行）
 *
 * @package AgencyScripts
 */

$config_file = $args[0] ?? '';
if ( ! $config_file || ! is_readable( $config_file ) ) {
	WP_CLI::error( "Cannot read config: $config_file" );
}
$c = json_decode( (string) file_get_contents( $config_file ), true );
if ( ! is_array( $c ) ) {
	WP_CLI::error( 'brand-config.json is not valid JSON: ' . json_last_error_msg() );
}
$base_dir = dirname( $config_file );
$mode     = $c['mode'] ?? 'demo';
if ( ! in_array( $mode, array( 'demo', 'preview', 'staging', 'live' ), true ) ) {
	WP_CLI::error( "mode must be demo / preview / staging / live (got: $mode)" );
}

/** Small helpers. */
function agc_v( $arr, $path, $default = '' ) {
	foreach ( explode( '.', $path ) as $p ) {
		if ( ! is_array( $arr ) || ! array_key_exists( $p, $arr ) ) {
			return $default;
		}
		$arr = $arr[ $p ];
	}
	return $arr;
}
function agc_hex( $hex, $fallback ) {
	$hex = trim( (string) $hex );
	if ( preg_match( '/^#([0-9a-f]{3})$/i', $hex, $m ) ) {
		$hex = '#' . $m[1][0] . $m[1][0] . $m[1][1] . $m[1][1] . $m[1][2] . $m[1][2];
	}
	return preg_match( '/^#[0-9a-f]{6}$/i', $hex ) ? strtoupper( $hex ) : $fallback;
}
function agc_rgb( $hex ) {
	return array( hexdec( substr( $hex, 1, 2 ) ), hexdec( substr( $hex, 3, 2 ) ), hexdec( substr( $hex, 5, 2 ) ) );
}
function agc_mix( $a, $b, $t ) { // $t = 0 → a, 1 → b
	$x = agc_rgb( $a );
	$y = agc_rgb( $b );
	$o = '#';
	for ( $i = 0; $i < 3; $i++ ) {
		$o .= sprintf( '%02X', (int) round( $x[ $i ] + ( $y[ $i ] - $x[ $i ] ) * $t ) );
	}
	return $o;
}

$done = array();

// 1. 网站名称、标语.
$name = agc_v( $c, 'site.name' );
if ( $name ) {
	update_option( 'blogname', $name );
	$done[] = "name: $name";
}
update_option( 'blogdescription', agc_v( $c, 'site.tagline' ) );

// 2. Kadence 全局颜色.
$primary   = agc_hex( agc_v( $c, 'colors.primary' ), '#2F5D50' );
$secondary = agc_hex( agc_v( $c, 'colors.secondary' ), '#E8DCCB' );
$accent    = agc_hex( agc_v( $c, 'colors.accent' ), $primary );
$text      = agc_hex( agc_v( $c, 'colors.text' ), '#1F1F1F' );
$bg        = agc_hex( agc_v( $c, 'colors.background' ), '#FFFFFF' );
$colors    = array(
	1 => $primary,                          // 按钮、链接
	2 => agc_mix( $primary, '#000000', 0.2 ), // 按钮 hover
	3 => $text,                             // 标题
	4 => agc_mix( $text, $bg, 0.12 ),       // 内文
	5 => agc_mix( $text, $bg, 0.35 ),       // 次要文字
	6 => agc_mix( $text, $bg, 0.55 ),       // 更淡的文字
	7 => $secondary,                        // 区块背景 / 边线
	8 => agc_mix( $secondary, $bg, 0.6 ),   // 浅色背景
	9 => $bg,                               // 网站背景
);
$palette   = array();
foreach ( $colors as $i => $hex ) {
	$palette[] = array(
		'color' => $hex,
		'slug'  => 'palette' . $i,
		'name'  => 'Palette Color ' . $i,
	);
}
$extra = array(
	array( '#FFFFFF', 'palette10', 'Palette Color Complement' ),
	array( '#13612E', 'palette11', 'Palette Color Success' ),
	array( '#1159AF', 'palette12', 'Palette Color Info' ),
	array( '#B82105', 'palette13', 'Palette Color Alert' ),
	array( '#F7630C', 'palette14', 'Palette Color Warning' ),
	array( '#F5A524', 'palette15', 'Palette Color Rating' ),
);
foreach ( $extra as $e ) {
	$palette[] = array(
		'color' => $e[0],
		'slug'  => $e[1],
		'name'  => $e[2],
	);
}
update_option(
	'kadence_global_palette',
	wp_json_encode(
		array(
			'palette'        => $palette,
			'second-palette' => $palette,
			'third-palette'  => $palette,
			'active'         => 'palette',
		)
	)
);
set_theme_mod( 'site_background', array( 'desktop' => array( 'color' => 'palette9' ) ) );
set_theme_mod( 'content_background', array( 'desktop' => array( 'color' => 'palette9' ) ) );
$done[] = "colors: $primary / $secondary / $accent";

// 3. 字体（Google Fonts，由 Kadence 下载到本机，不连 Google 服务器）.
$hfont = trim( (string) agc_v( $c, 'fonts.heading' ) );
$bfont = trim( (string) agc_v( $c, 'fonts.body' ) );
if ( $bfont ) {
	$base             = get_theme_mod( 'base_font', array() );
	$base             = is_array( $base ) ? $base : array();
	$base['family']   = $bfont;
	$base['google']   = true;
	$base['weight']   = '400';
	$base['variant']  = 'regular';
	$base['size']     = $base['size'] ?? array( 'desktop' => 17 );
	$base['lineHeight'] = $base['lineHeight'] ?? array( 'desktop' => 1.6 );
	$base['color']    = 'palette4';
	set_theme_mod( 'base_font', $base );
}
if ( $hfont ) {
	set_theme_mod(
		'heading_font',
		array(
			'family'  => $hfont,
			'google'  => true,
			'weight'  => '600',
			'variant' => '600',
		)
	);
}
set_theme_mod( 'load_fonts_local', true );
set_theme_mod( 'preload_fonts_local', true );
$done[] = "fonts: $hfont / $bfont";

// 4. Logo 和网站图标（同一个文件不会重复上传）.
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$hashes = get_option( 'agc_brand_assets', array() );
foreach ( array( 'logo' => 'custom_logo', 'site_icon' => 'site_icon' ) as $key => $target ) {
	$rel = agc_v( $c, "assets.$key" );
	if ( ! $rel ) {
		continue;
	}
	$path = '/' === $rel[0] ? $rel : $base_dir . '/' . $rel;
	if ( ! is_readable( $path ) ) {
		WP_CLI::warning( "$key file not found: $rel (skipped)" );
		continue;
	}
	$hash = sha1_file( $path );
	if ( ( $hashes[ $key ]['hash'] ?? '' ) === $hash && get_post( (int) ( $hashes[ $key ]['id'] ?? 0 ) ) ) {
		$id = (int) $hashes[ $key ]['id'];
	} else {
		$tmp = wp_tempnam( basename( $path ) );
		copy( $path, $tmp );
		$id = media_handle_sideload(
			array(
				'name'     => basename( $path ),
				'tmp_name' => $tmp,
			),
			0,
			( $name ? $name : 'Site' ) . ( 'logo' === $key ? ' logo' : ' icon' )
		);
		if ( is_wp_error( $id ) ) {
			WP_CLI::warning( "$key upload failed: " . $id->get_error_message() );
			continue;
		}
		update_post_meta( $id, '_wp_attachment_image_alt', ( $name ? $name : 'Site' ) . ( 'logo' === $key ? ' logo' : ' icon' ) );
		$hashes[ $key ] = array(
			'hash' => $hash,
			'id'   => $id,
		);
	}
	if ( 'custom_logo' === $target ) {
		set_theme_mod( 'custom_logo', $id );
		set_theme_mod( 'logo_layout', array( 'include' => array( 'mobile' => 'logo', 'tablet' => 'logo', 'desktop' => 'logo' ), 'layout' => array( 'mobile' => 'standard', 'tablet' => 'standard', 'desktop' => 'standard' ) ) );
	} else {
		update_option( 'site_icon', $id );
	}
	$done[] = "$key: #$id";
}
update_option( 'agc_brand_assets', $hashes );

// 5. agency-core 设定.
$addr = agc_v( $c, 'store.address', array() );
$addr = is_array( $addr ) ? $addr : array();
if ( class_exists( 'AGC_Settings' ) ) {
	$s           = AGC_Settings::get();
	$map         = array(
		'whatsapp_number'      => 'whatsapp.number',
		'whatsapp_button_text' => 'whatsapp.button_text',
		'whatsapp_prefill'     => 'whatsapp.prefill',
		'whatsapp_general'     => 'whatsapp.general',
		'whatsapp_position'    => 'whatsapp.position',
		'legal_name'           => 'business.legal_name',
		'ssm_no'               => 'business.ssm_no',
		'business_email'       => 'business.email',
		'business_phone'       => 'business.phone',
		'business_hours'       => 'business.hours',
		'social_instagram'     => 'social.instagram',
		'social_facebook'      => 'social.facebook',
		'social_tiktok'        => 'social.tiktok',
		'social_shopee'        => 'social.shopee',
		'social_xiaohongshu'   => 'social.xiaohongshu',
		'social_youtube'       => 'social.youtube',
		'ga4_id'               => 'tracking.ga4_id',
		'meta_pixel_id'        => 'tracking.meta_pixel_id',
	);
	foreach ( $map as $key => $path ) {
		$val = agc_v( $c, $path, null );
		if ( null !== $val ) {
			$s[ $key ] = $val;
		}
	}
	if ( null !== agc_v( $c, 'whatsapp.floating_button', null ) ) {
		$s['whatsapp_float'] = agc_v( $c, 'whatsapp.floating_button' ) ? 1 : 0;
	}
	$s['business_address'] = trim( implode( ', ', array_filter( array( $addr['line1'] ?? '', trim( ( $addr['postcode'] ?? '' ) . ' ' . ( $addr['city'] ?? '' ) ), $addr['state'] ?? '' ) ) ) );
	$s['accent_color']     = $accent;
	$s['demo_mode']        = in_array( $mode, array( 'demo', 'preview' ), true ) ? 1 : 0;
	$s['concept_label']    = 'demo' === $mode ? 'Concept Project · 概念作品' : ( 'preview' === $mode ? 'Preview · 样板' : '' );
	update_option( AGC_Settings::OPTION, AGC_Settings::sanitize( $s ) );
	AGC_Settings::flush();
	$done[] = 'agency-core: demo_mode=' . $s['demo_mode'] . ', whatsapp=' . ( $s['whatsapp_number'] ? $s['whatsapp_number'] : '(none)' );
} else {
	WP_CLI::warning( 'agency-core is not active — WhatsApp / business settings skipped' );
}

// 6. Kadence 社交链接（页头 / 页脚社交图标用）.
foreach ( array( 'instagram', 'facebook', 'tiktok', 'youtube' ) as $net ) {
	set_theme_mod( $net . '_link', (string) agc_v( $c, "social.$net" ) );
}
if ( agc_v( $c, 'whatsapp.number' ) ) {
	set_theme_mod( 'whatsapp_link', 'https://wa.me/' . preg_replace( '/\D+/', '', agc_v( $c, 'whatsapp.number' ) ) );
}

// 7. WooCommerce：店铺地址、运费、邮件.
if ( class_exists( 'WooCommerce' ) ) {
	$states = array(
		'johor' => 'JHR', 'kedah' => 'KDH', 'kelantan' => 'KTN', 'labuan' => 'LBN', 'melaka' => 'MLK', 'malacca' => 'MLK',
		'negeri sembilan' => 'NSN', 'pahang' => 'PHG', 'penang' => 'PNG', 'pulau pinang' => 'PNG', 'perak' => 'PRK',
		'perlis' => 'PLS', 'sabah' => 'SBH', 'sarawak' => 'SWK', 'selangor' => 'SGR', 'terengganu' => 'TRG',
		'kuala lumpur' => 'KUL', 'putrajaya' => 'PJY',
	);
	$state_in = strtolower( trim( (string) ( $addr['state'] ?? '' ) ) );
	$state    = $states[ $state_in ] ?? ( in_array( strtoupper( $state_in ), $states, true ) ? strtoupper( $state_in ) : 'SGR' );
	update_option( 'woocommerce_store_address', (string) ( $addr['line1'] ?? '' ) );
	update_option( 'woocommerce_store_address_2', '' );
	update_option( 'woocommerce_store_city', (string) ( $addr['city'] ?? '' ) );
	update_option( 'woocommerce_store_postcode', (string) ( $addr['postcode'] ?? '' ) );
	update_option( 'woocommerce_default_country', 'MY:' . $state );

	$ship = agc_v( $c, 'store.shipping', array() );
	foreach ( WC_Shipping_Zones::get_zones() as $z ) {
		$is_east = false !== stripos( $z['zone_name'], 'East' );
		$is_west = false !== stripos( $z['zone_name'], 'West' );
		if ( ! $is_east && ! $is_west ) {
			continue;
		}
		$zone = new WC_Shipping_Zone( $z['id'] );
		$has_pickup = false;
		foreach ( $zone->get_shipping_methods() as $iid => $m ) {
			$opt = 'woocommerce_' . $m->id . '_' . $iid . '_settings';
			$set = get_option( $opt, array() );
			if ( 'flat_rate' === $m->id ) {
				$rate = $is_east ? ( $ship['east_malaysia_flat_rate'] ?? null ) : ( $ship['west_malaysia_flat_rate'] ?? null );
				if ( null !== $rate ) {
					$set['cost'] = number_format( (float) $rate, 2, '.', '' );
				}
			} elseif ( 'free_shipping' === $m->id ) {
				$min = $ship['free_shipping_min'] ?? null;
				if ( null === $min || '' === $min || (float) $min <= 0 ) {
					$zone->delete_shipping_method( $iid );
					continue;
				}
				$set['requires']   = 'min_amount';
				$set['min_amount'] = (string) (float) $min;
			} elseif ( 'local_pickup' === $m->id ) {
				$has_pickup = true;
				if ( empty( $ship['local_pickup'] ) ) {
					$zone->delete_shipping_method( $iid );
					continue;
				}
			}
			update_option( $opt, $set );
		}
		$has_free = in_array( 'free_shipping', wp_list_pluck( $zone->get_shipping_methods(), 'id' ), true );
		if ( ! $has_free && ! empty( $ship['free_shipping_min'] ) && (float) $ship['free_shipping_min'] > 0 ) {
			$iid = $zone->add_shipping_method( 'free_shipping' );
			update_option( 'woocommerce_free_shipping_' . $iid . '_settings', array( 'title' => 'Free shipping', 'requires' => 'min_amount', 'min_amount' => (string) (float) $ship['free_shipping_min'] ) );
		}
		if ( ! $has_pickup && ! empty( $ship['local_pickup'] ) && $is_west ) {
			$iid = $zone->add_shipping_method( 'local_pickup' );
			update_option( 'woocommerce_local_pickup_' . $iid . '_settings', array( 'title' => 'Self pickup', 'cost' => '0' ) );
		}
	}
	update_option( 'woocommerce_email_from_name', $name ? $name : get_option( 'blogname' ) );
	$from = agc_v( $c, 'email.from_address' );
	if ( $from && is_email( $from ) ) {
		update_option( 'woocommerce_email_from_address', $from );
	}
	update_option( 'woocommerce_email_base_color', $primary );
	update_option( 'woocommerce_email_text_color', $text );
	update_option( 'woocommerce_email_footer_text', '{site_title}' . ( agc_v( $c, 'business.legal_name' ) ? ' · ' . agc_v( $c, 'business.legal_name' ) : '' ) );
	$done[] = 'store: MY:' . $state . ', shipping W/E ' . ( $ship['west_malaysia_flat_rate'] ?? '-' ) . '/' . ( $ship['east_malaysia_flat_rate'] ?? '-' ) . ', free ≥ ' . ( $ship['free_shipping_min'] ?? '-' );
}

// 8. 搜索引擎：只有 live 允许收录.
update_option( 'blog_public', 'live' === $mode ? 1 : 0 );
update_option( 'agc_site_mode', $mode );
$done[] = "mode: $mode (" . ( 'live' === $mode ? 'indexable' : 'noindex' ) . ')';

foreach ( $done as $line ) {
	WP_CLI::log( '  - ' . $line );
}
WP_CLI::success( 'Brand applied.' );
