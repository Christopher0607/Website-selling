<?php
/**
 * Site design (2026-11-16, docs/14-wordpress-demos.md): a whole hand-made website (one of the studio's demos, or a client's
 * design made from one) running on WordPress + WooCommerce, page for page the same as the original.
 *
 * The built pages, styles, scripts and photos are in wp-content/uploads/agc-skin/ with a site.json beside them (made by
 * site/build.py --wp and site/tools/export-demo-data.js). Pages keep their addresses (/, /menu.html, /p/x.html); the web
 * server finds the styles, scripts and photos in the same folder (nginx: try_files … /wp-content/uploads/agc-skin$uri).
 * Every page gets window.AGC_LIVE: the demo's own lists (menu, festive sets…) with names, prices, descriptions, stock and
 * photos from WooCommerce, plus what is sold out, booked tables and the addresses of the real endpoints. The page script
 * then places real orders, bookings, gift vouchers and enquiries here instead of keeping them in the browser.
 *
 * The older skin (class-skin.php, The Baking Trip) is a different format (data.json) and is not touched.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Site design.
 */
class AGC_Site {

	const NS      = 'agc/v1';
	const BOOKING = 'agc_booking';
	const ENQUIRY = 'agc_enquiry';
	const SEEDIMG = '_agc_seed_img';
	const PAY     = '_agc_site_pay';
	const REF     = '_agc_site_ref';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'types' ) );
		if ( ! self::on() ) {
			return;
		}
		add_action( 'template_redirect', array( __CLASS__, 'route' ), 0 );
		add_action( 'rest_api_init', array( __CLASS__, 'rest' ) );
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'issue_vouchers' ) );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'issue_vouchers' ) );
		add_filter( 'manage_' . self::BOOKING . '_posts_columns', array( __CLASS__, 'cols' ) );
		add_filter( 'manage_' . self::ENQUIRY . '_posts_columns', array( __CLASS__, 'cols' ) );
		add_action( 'manage_' . self::BOOKING . '_posts_custom_column', array( __CLASS__, 'col' ), 10, 2 );
		add_action( 'manage_' . self::ENQUIRY . '_posts_custom_column', array( __CLASS__, 'col' ), 10, 2 );
		add_action( 'add_meta_boxes', array( __CLASS__, 'boxes' ) );
		add_action( 'save_post_' . self::BOOKING, array( __CLASS__, 'save_box' ) );
		add_action( 'save_post_' . self::ENQUIRY, array( __CLASS__, 'save_box' ) );
		add_action( 'admin_head', array( __CLASS__, 'no_add_new_button' ) );
	}

	/**
	 * Bookings and enquiries come from the website: hide "Add New" (button and menu entry). Removing the menu entry
	 * instead makes WordPress refuse the whole list for a role like the shop manager's.
	 */
	public static function no_add_new_button() {
		$css = array();
		foreach ( array( self::BOOKING, self::ENQUIRY ) as $t ) {
			$css[] = '.post-type-' . $t . ' .page-title-action';
			$css[] = '#adminmenu a[href="post-new.php?post_type=' . $t . '"]';
		}
		echo '<style>' . esc_html( implode( ',', $css ) ) . '{display:none}</style>';
	}

	/* ------------------------------------------------------------------ files and settings */

	/**
	 * Folder of the design.
	 *
	 * @return string
	 */
	public static function dir() {
		$u = wp_upload_dir( null, false );
		return trailingslashit( $u['basedir'] ) . 'agc-skin';
	}

	/**
	 * Switched on and the files are there.
	 *
	 * @return bool
	 */
	public static function on() {
		static $on = null;
		if ( null === $on ) {
			$on = (bool) agc_get( 'skin' ) && file_exists( self::dir() . '/site.json' ) && file_exists( self::dir() . '/index.html' );
		}
		return $on;
	}

	/**
	 * site.json.
	 *
	 * @return array
	 */
	public static function cfg() {
		static $c = null;
		if ( null === $c ) {
			$c = json_decode( (string) @file_get_contents( self::dir() . '/site.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions, WordPress.PHP.NoSilencedErrors
			$c = is_array( $c ) ? $c : array();
			$c += array(
				'spec' => array(),
				'data' => array(),
			);
		}
		return $c;
	}

	/**
	 * A part of the spec.
	 *
	 * @param string $k   Key.
	 * @param mixed  $def Default.
	 * @return mixed
	 */
	public static function spec( $k, $def = array() ) {
		$s = self::cfg()['spec'];
		return $s[ $k ] ?? $def;
	}

	/**
	 * One of the page script's own values (MENU, HOURS…).
	 *
	 * @param string $k   Name.
	 * @param mixed  $def Default.
	 * @return mixed
	 */
	public static function val( $k, $def = null ) {
		$d = self::cfg()['data'];
		return $d[ $k ] ?? $def;
	}

	/**
	 * Order / booking reference prefix.
	 *
	 * @return string
	 */
	private static function prefix() {
		return (string) self::spec( 'ref', self::val( 'REF', strtoupper( substr( (string) get_bloginfo( 'name' ), 0, 2 ) ) ) );
	}

	/**
	 * A number in the spec, or a reference to one of the page's values ("BOOK.depositFrom").
	 *
	 * @param mixed $v   Number or "VAR.key".
	 * @param mixed $def Default.
	 * @return mixed
	 */
	private static function ref( $v, $def = null ) {
		if ( is_string( $v ) && preg_match( '/^([A-Z_]+)\.([A-Za-z_]+)$/', $v, $m ) ) {
			$o = (array) self::val( $m[1], array() );
			return $o[ $m[2] ] ?? $def;
		}
		return null === $v ? $def : $v;
	}

	/* ------------------------------------------------------------------ pages */

	/**
	 * Which page this address is.
	 */
	public static function route() {
		if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		$path = trim( (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '/', PHP_URL_PATH ), '/' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$home = trim( (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ), '/' );
		if ( '' !== $home && 0 === strpos( $path, $home ) ) {
			$path = trim( substr( $path, strlen( $home ) ), '/' );
		}
		$path = rawurldecode( $path );
		// The demo's own pages that are something real here (the shop dashboard, the table QR page…).
		$go = self::spec( 'redirects' );
		foreach ( array( $path, preg_replace( '/\.html$/', '', $path ) ) as $p ) {
			if ( isset( $go[ $p ] ) ) {
				wp_safe_redirect( self::target( (string) $go[ $p ] ), 302 );
				exit;
			}
		}
		$file = '' === $path ? 'index.html' : $path;
		if ( ! preg_match( '/\.html$/', $file ) ) {
			$file .= '.html'; // Cloudflare-style address without .html (old links are redirected without it).
		}
		if ( preg_match( '#^[a-z0-9][a-z0-9_/-]*\.html$#', $file ) && false === strpos( $file, '..' ) && is_file( self::dir() . '/' . $file ) ) {
			self::send( $file );
			exit;
		}
		if ( function_exists( 'is_shop' ) && ( is_shop() || is_product() || is_product_category() || is_cart() || ( is_checkout() && ! is_wc_endpoint_url() ) ) ) {
			wp_safe_redirect( self::target( (string) self::spec( 'shop', '/' ) ), 302 );
			exit;
		}
		if ( function_exists( 'is_checkout' ) && is_checkout() ) {
			return; // order-received / order-pay: WooCommerce's own pages.
		}
		if ( is_404() || is_front_page() || is_home() ) {
			status_header( 404 );
			self::send( 'index.html', 404, true );
			exit;
		}
	}

	/**
	 * Address for a redirect in the spec ("@table:5" = that table's QR page).
	 *
	 * @param string $t Target.
	 * @return string
	 */
	private static function target( $t ) {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- only reads which table.
		if ( '@table' === $t && class_exists( 'AGC_Table' ) ) {
			$n = isset( $_GET['t'] ) ? sanitize_text_field( wp_unslash( $_GET['t'] ) ) : '1';
			return AGC_Table::link( $n );
		}
		// phpcs:enable
		return 0 === strpos( $t, 'http' ) ? $t : home_url( $t );
	}

	/**
	 * Print a page of the design.
	 *
	 * @param string $file   File in the design folder.
	 * @param int    $code   HTTP status.
	 * @param bool   $is_404 Page not found (the home page with a note).
	 */
	private static function send( $file, $code = 200, $is_404 = false ) {
		$html = (string) file_get_contents( self::dir() . '/' . $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$demo = (bool) agc_get( 'demo_mode' );
		$html = preg_replace( $demo ? '#<!--live-->.*?<!--/live-->#s' : '#<!--demo-->.*?<!--/demo-->#s', '', $html );
		$html = str_replace( array( '<!--demo-->', '<!--/demo-->', '<!--live-->', '<!--/live-->' ), '', $html );
		if ( ! get_option( 'blog_public' ) && false === strpos( $html, 'name="robots"' ) ) {
			$html = preg_replace( '#</title>#', "</title>\n<meta name=\"robots\" content=\"noindex, nofollow\">", $html, 1 );
		}
		$live = self::live();
		if ( $is_404 ) {
			$live['notFound'] = true;
		}
		$js   = '<script>window.AGC_LIVE=' . wp_json_encode( $live, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . ';</script>';
		$html = preg_replace( '#</head>#', str_replace( '$', '\\$', $js ) . "\n</head>", $html, 1 );
		$hits = (string) agc_get( 'studio_hits' );
		if ( $hits ) {
			$html = preg_replace( '#</body>#', '<script src="' . esc_url( $hits ) . '" defer></script></body>', $html, 1 );
		}
		nocache_headers(); // prices, stock and booked tables change: no page cache.
		status_header( $code );
		header( 'Content-Type: text/html; charset=utf-8' );
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput -- the design's own files; the data is JSON-encoded.
	}

	/* ------------------------------------------------------------------ live data */

	/**
	 * What the page script gets.
	 *
	 * @return array
	 */
	public static function live() {
		list( $data, $owner ) = self::lists();
		$out                  = array(
			'rest'   => esc_url_raw( rest_url( self::NS . '/' ) ),
			'site'   => home_url( '/' ),
			'demo'   => (bool) agc_get( 'demo_mode' ),
			'data'   => $data,
			'owner'  => $owner,
			'booked' => self::booked(),
			'tables' => (int) ( self::spec( 'book', array() )['seats']['*']['cap'] ?? 6 ),
			'bookedBy' => self::booked_by(),
			'slotsUsed' => self::slots_used(),
			'seatCap'  => array_map( static fn( $x ) => (int) ( $x['cap'] ?? 6 ), (array) ( self::spec( 'book', array() )['seats'] ?? array() ) ),
			'dian'   => home_url( '/dian/' ),
			'admin'  => admin_url( 'edit.php?post_type=shop_order' ),
			'wa'     => preg_replace( '/\D/', '', (string) agc_get( 'whatsapp_number' ) ),
		);
		if ( class_exists( 'AGC_Demo_Access' ) && AGC_Demo_Access::on() ) {
			$out['demoLogin'] = array(
				'dian'  => AGC_Demo_Access::login_url( 'dian' ),
				'admin' => AGC_Demo_Access::login_url( 'admin' ),
			);
		}
		return apply_filters( 'agc_site_live', $out ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals
	}

	/**
	 * The product lists of the page script, from WooCommerce.
	 *
	 * Spec "lists": [{ "var": "MENU", "cats": "CATS" }, { "var": "SEASONS", "items": "items", "stock": "left" }]
	 * Item fields: id (= product SKU), n (name), p (price), d (short description), img (photo file name in img/).
	 *
	 * @return array [ data, owner ] (owner: sold, price, left, status, like the demo's owner view)
	 */
	public static function lists() {
		static $memo = null;
		if ( null !== $memo ) {
			return $memo;
		}
		$data  = array();
		$owner = array(
			'sold'   => new stdClass(),
			'price'  => new stdClass(),
			'left'   => new stdClass(),
			'status' => agc_get( 'shop_paused' ) ? 'closed' : ( agc_get( 'kitchen_busy' ) ? 'busy' : 'auto' ),
		);
		foreach ( (array) self::spec( 'lists' ) as $l ) {
			$var = (string) ( $l['var'] ?? '' );
			$src = self::val( $var );
			if ( ! is_array( $src ) ) {
				continue;
			}
			$f   = (array) ( $l['fields'] ?? array() ) + array(
				'id'    => 'id',
				'name'  => 'n',
				'price' => 'p',
				'desc'  => 'd',
				'img'   => 'img',
				'cat'   => 'cat',
				'stock' => (string) ( $l['stock'] ?? '' ),
				'sale'  => '',
			);
			$tpl = (string) ( $l['sku'] ?? '' ); // "{g}-{id}": the same item code in two festivals (Butter & Lantern)
			$fix = static function ( $it, $gk = '' ) use ( $f, $tpl, &$owner ) {
				$id = (string) ( $it[ $f['id'] ] ?? '' );
				$p  = self::product( $tpl ? str_replace( array( '{g}', '{id}' ), array( (string) $gk, $id ), $tpl ) : $id );
				if ( ! $p ) {
					return null; // deleted or hidden in WooCommerce: not on the website either.
				}
				if ( $f['name'] ) { // "" = the page keeps its own wording (several languages)
					$it[ $f['name'] ] = html_entity_decode( $p->get_name(), ENT_QUOTES );
				}
				if ( $f['sale'] && '' !== (string) $p->get_regular_price() ) { // the shop templates: regular price + sale price (or none)
					$it[ $f['price'] ] = (float) $p->get_regular_price();
					$it[ $f['sale'] ]  = $p->is_on_sale() ? (float) $p->get_sale_price() : null;
				} elseif ( '' !== (string) $p->get_price() && $f['price'] && ( array_key_exists( $f['price'], $it ) || empty( $it['opts'] ) ) ) {
					$it[ $f['price'] ] = (float) $p->get_price();
				}
				$sd = trim( wp_strip_all_tags( $p->get_short_description() ) );
				if ( $f['desc'] && '' !== $sd && array_key_exists( $f['desc'], $it ) ) {
					$it[ $f['desc'] ] = html_entity_decode( $sd, ENT_QUOTES );
				}
				$img = (int) $p->get_image_id();
				if ( $img && (int) $p->get_meta( self::SEEDIMG ) !== $img ) {
					$it['imgUrl'] = (string) wp_get_attachment_image_url( $img, 'large' ); // the owner changed the photo.
				}
				if ( ! $p->is_in_stock() ) {
					$owner['sold']->{$id} = true;
					$it['soldOut']        = true;
				}
				if ( $f['stock'] && $p->managing_stock() && null !== $p->get_stock_quantity() ) {
					$it[ $f['stock'] ]    = max( 0, (int) $p->get_stock_quantity() );
					$owner['left']->{$id} = $it[ $f['stock'] ];
				}
				return $it;
			};
			if ( ! empty( $l['items'] ) ) { // groups with their own items (festive seasons).
				foreach ( $src as $gi => $g ) {
					$gk                        = (string) ( $g['id'] ?? $gi );
					$src[ $gi ][ $l['items'] ] = array_values( array_filter( array_map( static fn( $it ) => $fix( $it, $gk ), (array) ( $g[ $l['items'] ] ?? array() ) ) ) );
				}
			} else {
				$known = array_column( $src, $f['id'] );
				$src   = array_values( array_filter( array_map( $fix, $src ) ) );
				$cats  = ! empty( $l['cats'] ) ? (array) self::val( (string) $l['cats'], array() ) : array();
				foreach ( self::new_products( $known, $cats, $f ) as $it ) {
					$src[] = $it; // added in WooCommerce: on the website too.
				}
			}
			$data[ $var ] = $src;
		}
		$memo = array( $data, $owner );
		return $memo;
	}

	/**
	 * Products added in WooCommerce (not in the demo's list) in one of the list's categories.
	 *
	 * @param array $known Item ids already in the list.
	 * @param array $cats  [[slug, label], …] of the list.
	 * @param array $f     Field names.
	 * @return array
	 */
	private static function new_products( $known, $cats, $f ) {
		if ( ! $cats || ! function_exists( 'wc_get_products' ) ) {
			return array();
		}
		$slugs = array_map( static fn( $c ) => (string) ( is_array( $c ) ? $c[0] : $c ), $cats );
		$out   = array();
		foreach ( wc_get_products(
			array(
				'status'   => 'publish',
				'limit'    => 60,
				'category' => $slugs,
				'orderby'  => 'date',
				'order'    => 'ASC',
			)
		) as $p ) {
			$sku = (string) $p->get_sku();
			$id  = '' !== $sku ? $sku : 'p' . $p->get_id();
			if ( in_array( $id, $known, true ) || '' === (string) $p->get_price() ) {
				continue;
			}
			$cat = '';
			foreach ( $p->get_category_ids() as $tid ) {
				$t = get_term( $tid, 'product_cat' );
				if ( $t && ! is_wp_error( $t ) && in_array( $t->slug, $slugs, true ) ) {
					$cat = $t->slug;
				}
			}
			$img  = (int) $p->get_image_id();
			$it   = array(
				$f['id']    => $id,
				$f['cat']   => $cat,
				$f['name']  => html_entity_decode( $p->get_name(), ENT_QUOTES ),
				$f['desc']  => html_entity_decode( trim( wp_strip_all_tags( $p->get_short_description() ) ), ENT_QUOTES ),
				$f['price'] => (float) $p->get_price(),
				'tags'      => array(),
			);
			$it[ $f['img'] ] = null;
			$it['imgUrl']    = $img ? (string) wp_get_attachment_image_url( $img, 'large' ) : (string) wc_placeholder_img_src( 'large' );
			$out[] = $it;
		}
		return $out;
	}

	/**
	 * Product for an item id (its SKU; "p123" = product 123 without a SKU).
	 *
	 * @param string $id Item id.
	 * @return WC_Product|null
	 */
	public static function product( $id ) {
		if ( '' === $id || ! function_exists( 'wc_get_product_id_by_sku' ) ) {
			return null;
		}
		$pid = wc_get_product_id_by_sku( $id );
		if ( ! $pid && preg_match( '/^p(\d+)$/', $id, $m ) ) {
			$pid = (int) $m[1];
		}
		$p = $pid ? wc_get_product( $pid ) : null;
		return $p && 'publish' === $p->get_status() ? $p : null;
	}

	/**
	 * An item of a list by id, with the WooCommerce product.
	 *
	 * @param string $id Item id.
	 * @return array|null [ item, product, group ]
	 */
	public static function item( $id ) {
		list( $data ) = self::lists();
		foreach ( (array) self::spec( 'lists' ) as $l ) {
			$src = (array) ( $data[ $l['var'] ] ?? array() );
			if ( ! empty( $l['items'] ) ) {
				foreach ( $src as $g ) {
					foreach ( (array) ( $g[ $l['items'] ] ?? array() ) as $it ) {
						if ( (string) ( $it['id'] ?? '' ) === $id ) {
							return array( $it, self::product( $id ), $g );
						}
					}
				}
			} else {
				foreach ( $src as $it ) {
					if ( (string) ( $it['id'] ?? '' ) === $id ) {
						return array( $it, self::product( $id ), null );
					}
				}
			}
		}
		return null;
	}

	/* ------------------------------------------------------------------ endpoints */

	/**
	 * Routes.
	 */
	public static function rest() {
		$pub  = static fn() => true;
		$same = array( 'AGC_Skin', 'same_site' );
		register_rest_route( self::NS, '/site/data', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'live' ), 'permission_callback' => $pub ) );
		register_rest_route( self::NS, '/site/coupon', array( 'methods' => 'POST', 'callback' => array( 'AGC_Skin', 'rest_coupon' ), 'permission_callback' => $same ) );
		register_rest_route( self::NS, '/site/receipt', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_receipt' ), 'permission_callback' => $same ) );
		foreach ( array( 'order', 'book', 'voucher', 'enquiry', 'track', 'notify' ) as $r ) {
			register_rest_route( self::NS, '/site/' . $r, array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_' . $r ), 'permission_callback' => $same ) );
		}
	}

	/**
	 * Error.
	 *
	 * @param string $m Message.
	 * @param int    $s Status.
	 * @return WP_Error
	 */
	private static function err( $m, $s = 400 ) {
		return new WP_Error( 'agc_site', $m, array( 'status' => $s ) );
	}

	/**
	 * The customer's details (shared by all forms).
	 *
	 * @param array $b Body.
	 * @return array|WP_Error
	 */
	private static function who( $b ) {
		$name  = sanitize_text_field( (string) ( $b['name'] ?? '' ) );
		$phone = sanitize_text_field( (string) ( $b['phone'] ?? '' ) );
		$email = sanitize_email( (string) ( $b['email'] ?? '' ) );
		if ( '' === $name ) {
			return self::err( __( 'Add your name, so we know whose order it is.', 'agency-core' ) );
		}
		if ( ! preg_match( '/^\+?[\d\s-]{9,16}$/', $phone ) ) {
			return self::err( __( 'Add a mobile number we can reach you on.', 'agency-core' ) );
		}
		return array( $name, $phone, $email );
	}

	/**
	 * Orders can't be taken right now?
	 *
	 * @return WP_Error|null
	 */
	private static function closed() {
		if ( agc_get( 'shop_paused' ) ) {
			return self::err( (string) ( agc_get( 'shop_paused_msg' ) ? agc_get( 'shop_paused_msg' ) : __( 'Online orders are paused for now.', 'agency-core' ) ), 409 );
		}
		if ( agc_get( 'demo_mode' ) && ! agc_get( 'demo_test_orders' ) ) {
			return self::err( (string) agc_get( 'demo_checkout_notice' ), 403 );
		}
		return null;
	}

	/**
	 * Today and the time now (minutes) in the shop's time zone.
	 *
	 * @return array [ 'Y-m-d', minutes ]
	 */
	private static function now() {
		$d = new DateTimeImmutable( 'now', wp_timezone() );
		return array( $d->format( 'Y-m-d' ), (int) $d->format( 'G' ) * 60 + (int) $d->format( 'i' ) );
	}

	/**
	 * Day of the week (0 = Sunday) of a date.
	 *
	 * @param string $ymd Date.
	 * @return int
	 */
	private static function dow( $ymd ) {
		return (int) gmdate( 'w', (int) strtotime( $ymd . ' 12:00:00 UTC' ) );
	}

	/**
	 * 1140 → 7:00pm.
	 *
	 * @param int $m Minutes.
	 * @return string
	 */
	private static function hm( $m ) {
		return gmdate( 'g:ia', $m * 60 );
	}

	/**
	 * A time slot the website offered: inside the opening hours, on the step, not too soon.
	 *
	 * @param string $date Date.
	 * @param int    $time Minutes.
	 * @param array  $r    Rules: hours (var), first, last, step, prep, days.
	 * @return bool
	 */
	private static function slot_ok( $date, $time, $r ) {
		list( $today, $now ) = self::now();
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) || $date < $today || $date > gmdate( 'Y-m-d', strtotime( $today . ' +' . (int) ( $r['days'] ?? 40 ) . ' days' ) ) ) {
			return false;
		}
		$hours = (array) self::val( (string) ( $r['hours'] ?? 'HOURS' ), array() );
		$prep  = (int) ( $r['prep'] ?? 0 ) + ( agc_get( 'kitchen_busy' ) ? (int) ( $r['busy'] ?? 0 ) : 0 );
		$min   = $date === $today ? $now + $prep - 10 : 0; // the page and the server can be a few minutes apart.
		$step  = max( 5, (int) ( $r['step'] ?? 15 ) );
		if ( ! empty( $r['times'] ) ) { // fixed sittings on some days (e.g. a chef's counter at 6:00pm and 8:45pm).
			return in_array( self::dow( $date ), array_map( 'intval', (array) ( $r['dows'] ?? range( 0, 6 ) ) ), true ) && in_array( $time, array_map( 'intval', (array) $r['times'] ), true ) && $time >= $min;
		}
		foreach ( (array) ( $hours[ self::dow( $date ) ] ?? $hours[ (string) self::dow( $date ) ] ?? array() ) as $h ) {
			$a = (int) $h[0] + (int) ( $r['first'] ?? 0 );
			$z = (int) $h[1] - (int) ( isset( $r['last_lunch'] ) && (int) $h[0] < (int) ( $r['lunch_before'] ?? 900 ) ? $r['last_lunch'] : ( $r['last'] ?? 0 ) );
			if ( $time >= $a && $time <= $z && 0 === ( $time - $a ) % $step && $time >= $min ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Lines of the bag: products, quantities and options, priced here (never by the browser).
	 *
	 * @param array $rows [{id, qty, sel, note}].
	 * @return array|WP_Error [[product, qty, unit, options, note, item]]
	 */
	private static function lines( $rows ) {
		$out = array();
		$box = (array) self::spec( 'hamper', array() );
		foreach ( array_slice( (array) $rows, 0, 40 ) as $row ) {
			$id  = sanitize_text_field( (string) ( $row['id'] ?? '' ) );
			$qty = max( 1, min( 99, (int) ( $row['qty'] ?? 1 ) ) );
			if ( $box && (string) ( $box['product'] ?? '' ) === $id ) {
				$h = self::hamper_line( (array) ( $row['hamper'] ?? array() ), $box );
				if ( is_wp_error( $h ) ) {
					return $h;
				}
				$out[] = array( $h[0], $qty, $h[1], $h[2], '', array( 'id' => $id ) );
				continue;
			}
			$hit = self::item( $id );
			if ( ! $hit || ! $hit[1] ) {
				return self::err( __( 'Something in your order is no longer available. Please check your order again.', 'agency-core' ), 409 );
			}
			list( $it, $p ) = $hit;
			if ( ! $p->is_in_stock() || ( $p->managing_stock() && null !== $p->get_stock_quantity() && $p->get_stock_quantity() < $qty && ! $p->backorders_allowed() ) ) {
				/* translators: %s: product */
				return self::err( sprintf( __( 'Sorry, %s just sold out.', 'agency-core' ), $p->get_name() ), 409 );
			}
			if ( '' === (string) $p->get_price() ) {
				return self::err( __( 'Ask the restaurant for this price.', 'agency-core' ), 409 );
			}
			$unit = (float) $p->get_price();
			$opts = array();
			$sel  = (array) ( $row['sel'] ?? array() );
			if ( isset( $it['v'] ) && is_array( $it['v'] ) ) { // shop variants, chosen by label ("200 g · Extra pedas")
				$want = array_map( 'trim', explode( '·', (string) ( $row['opts'] ?? '' ) ) );
				foreach ( array_values( $it['v'] ) as $gi => $g ) {
					$pick = null;
					foreach ( (array) ( $g['o'] ?? array() ) as $o ) {
						if ( (string) $o[0] === (string) ( $want[ $gi ] ?? '' ) ) {
							$pick = $o;
						}
					}
					$pick = $pick ? $pick : ( $g['o'][0] ?? null );
					if ( ! $pick ) {
						continue;
					}
					if ( in_array( (string) $pick[0], array_map( 'strval', (array) ( $g['out'] ?? array() ) ), true ) ) {
						/* translators: 1: product, 2: option */
						return self::err( sprintf( __( 'Sorry, %1$s (%2$s) is sold out.', 'agency-core' ), $p->get_name(), $pick[0] ), 409 );
					}
					$unit  += (float) $pick[1];
					$opts[] = (string) $pick[0];
				}
				$out[] = array( $p, $qty, $unit, implode( ' · ', $opts ), sanitize_text_field( (string) ( $row['note'] ?? '' ) ), $it );
				continue;
			}
			if ( isset( $row['pick'] ) ) { // the shop templates: one choice per option, by its label ("Graphite", "M · 800 ml")
				$want = array_map( 'strval', (array) $row['pick'] );
				foreach ( array_values( (array) ( $it['o'] ?? array() ) ) as $gi => $g ) {
					$vals = array_values( (array) ( $g['v'] ?? array() ) );
					$pick = $vals[0] ?? null;
					foreach ( $vals as $v ) {
						if ( (string) $v[0] === ( $want[ $gi ] ?? '' ) ) {
							$pick = $v;
						}
					}
					if ( is_array( $pick ) ) {
						$unit  += (float) $pick[1];
						$opts[] = trim( (string) ( $g['n'] ?? '' ) . ': ' . (string) $pick[0], ': ' );
					}
				}
				$out[] = array( $p, $qty, $unit, implode( ' · ', $opts ), sanitize_text_field( (string) ( $row['note'] ?? '' ) ), $it );
				continue;
			}
			foreach ( array_values( (array) ( $it['o'] ?? array() ) ) as $gi => $g ) {
				$picked = array_map( 'intval', (array) ( $sel[ $gi ] ?? array() ) );
				if ( ! $picked && ! empty( $g['one'] ) ) {
					$picked = array( (int) ( $g['def'] ?? 0 ) );
				}
				if ( ! empty( $g['one'] ) ) {
					$picked = array_slice( $picked, 0, 1 );
				}
				foreach ( array_unique( $picked ) as $vi ) {
					$v = $g['v'][ $vi ] ?? null;
					if ( is_array( $v ) ) {
						$unit  += (float) $v[1];
						$opts[] = (string) $v[0];
					}
				}
			}
			$out[] = array( $p, $qty, $unit, implode( ', ', $opts ), sanitize_text_field( (string) ( $row['note'] ?? '' ) ), $it );
		}
		return $out ? $out : self::err( __( 'Your order is empty.', 'agency-core' ) );
	}

	/**
	 * New order with these lines.
	 *
	 * @param array $lines Lines from lines().
	 * @return WC_Order
	 */
	private static function new_order( $lines ) {
		$o = wc_create_order(
			array(
				'status'      => 'pending',
				'created_via' => 'website',
			)
		);
		foreach ( $lines as $x ) {
			$item_id = $o->add_product(
				$x[0],
				$x[1],
				array(
					'subtotal' => $x[2] * $x[1],
					'total'    => $x[2] * $x[1],
				)
			);
			$item    = $o->get_item( $item_id );
			if ( $item ) {
				if ( $x[3] ) {
					$item->add_meta_data( __( 'Options', 'agency-core' ), $x[3], true );
				}
				if ( $x[4] ) {
					$item->add_meta_data( __( 'Note', 'agency-core' ), $x[4], true );
				}
				$item->save();
			}
		}
		return $o;
	}

	/**
	 * Customer on the order.
	 *
	 * @param WC_Order $o   Order.
	 * @param array    $who [name, phone, email].
	 */
	private static function set_who( $o, $who ) {
		$o->set_billing_first_name( $who[0] );
		$o->set_billing_phone( $who[1] );
		if ( $who[2] ) {
			$o->set_billing_email( $who[2] );
		}
		$o->set_billing_country( 'MY' );
	}

	/**
	 * Take the payment (demo: marked paid, nothing charged) or leave it for later.
	 *
	 * @param WC_Order $o   Order.
	 * @param string   $pay online|duitnow|wa|later.
	 * @param string   $why Note when unpaid.
	 * @return string The pay page when the shop's own gateway takes the money, else ''.
	 */
	private static function pay( $o, $pay, $why = '', $wa_title = '' ) {
		$gws = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
		$o->update_meta_data( self::PAY, $pay );
		if ( 'online' === $pay ) {
			if ( isset( $gws['agc_demo_pay'] ) && $gws['agc_demo_pay']->is_available() ) {
				$o->set_payment_method( $gws['agc_demo_pay'] );
				$o->save();
				$o->add_order_note( __( 'Demo payment: nothing was charged.', 'agency-core' ) );
				$o->payment_complete();
				return '';
			}
			$o->save();
			return $o->get_checkout_payment_url();
		}
		if ( 'duitnow' === $pay && isset( $gws['agc_duitnow'] ) ) {
			$o->set_payment_method( $gws['agc_duitnow'] );
			$o->save();
			$o->update_status( 'on-hold', __( 'Waiting for the DuitNow payment and receipt.', 'agency-core' ) );
		} else {
			$o->set_payment_method( '' );
			$o->set_payment_method_title( 'wa' === $pay ? ( $wa_title ? $wa_title : __( 'Sent on WhatsApp, pay at pick-up or by transfer', 'agency-core' ) ) : __( 'Pay later', 'agency-core' ) );
			$o->save();
			$o->update_status( 'on-hold', $why ? $why : __( 'Not paid yet.', 'agency-core' ) );
		}
		wc_maybe_reduce_stock_levels( $o->get_id() );
		return '';
	}

	/**
	 * What the confirmation screen shows.
	 *
	 * @param WC_Order $o Order.
	 * @return array
	 */
	private static function summary( $o ) {
		$fee = 0.0;
		foreach ( $o->get_items( 'shipping' ) as $s ) {
			$fee += (float) $s->get_total();
		}
		foreach ( $o->get_fees() as $f ) {
			$fee += (float) $f->get_total();
		}
		return array(
			'id'     => $o->get_id(),
			'no'     => self::prefix() . '-' . $o->get_order_number(),
			'number' => $o->get_order_number(),
			'key'    => $o->get_order_key(),
			'sub'    => (float) $o->get_subtotal(),
			'disc'   => (float) $o->get_discount_total(),
			'fee'    => $fee,
			'total'  => (float) $o->get_total(),
			'paid'   => $o->is_paid(),
			'status' => $o->get_status(),
		);
	}

	/**
	 * Apply a promo / voucher code (WooCommerce coupon) and check the total the customer saw.
	 *
	 * @param WC_Order $o    Order.
	 * @param string   $code Code.
	 * @param mixed    $seen Total the page showed (null = don't check).
	 * @return WP_Error|null
	 */
	private static function finish( $o, $code, $seen ) {
		$code = wc_format_coupon_code( (string) $code );
		if ( '' !== $code ) {
			$r = $o->apply_coupon( $code );
			if ( is_wp_error( $r ) ) {
				$o->delete( true );
				return self::err( wp_strip_all_tags( $r->get_error_message() ), 409 );
			}
		}
		$o->calculate_totals( false );
		if ( null !== $seen && abs( (float) $seen - (float) $o->get_total() ) > 0.05 ) { // the page rounds a % discount on the whole order
			$o->delete( true );
			return self::err( __( 'Some prices have just changed. Please check your order again.', 'agency-core' ), 409 );
		}
		return null;
	}

	/**
	 * Pick-up or delivery order from the menu (restaurants).
	 *
	 * Body: { lines, mode: pickup|delivery, date, time, pc, addr, name, phone, email, notes, code, pay: online|wa, total }
	 * or { kind: festive, season, date, lines, pay: deposit|full, … } for a festive pre-order.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_order( $req ) {
		$stop = self::closed();
		if ( $stop ) {
			return $stop;
		}
		$b   = (array) $req->get_json_params();
		$who = self::who( $b );
		if ( is_wp_error( $who ) ) {
			return $who;
		}
		if ( 'preorder' === ( $b['kind'] ?? '' ) ) {
			return self::preorder( $b, $who );
		}
		$lines = self::lines( $b['lines'] ?? array() );
		if ( is_wp_error( $lines ) ) {
			return $lines;
		}
		if ( 'festive' === ( $b['kind'] ?? '' ) ) {
			return self::festive_order( $b, $who, $lines );
		}
		if ( 'ship' === ( $b['kind'] ?? '' ) ) {
			return self::ship_order( $b, $who, $lines );
		}
		$r    = (array) self::spec( 'order' );
		$mode = 'delivery' === ( $b['mode'] ?? '' ) && ! empty( $r['zones'] ) ? 'delivery' : 'pickup';
		$date = (string) ( $b['date'] ?? '' );
		$time = (int) ( $b['time'] ?? 0 );
		if ( ! self::slot_ok( $date, $time, $r ) ) {
			return self::err( __( 'That time is no longer available. Please choose another time.', 'agency-core' ), 409 );
		}
		$sub = 0.0;
		foreach ( $lines as $x ) {
			$sub += $x[2] * $x[1];
		}
		$o    = self::new_order( $lines );
		$zone = null;
		$pc   = preg_replace( '/\D/', '', (string) ( $b['pc'] ?? '' ) );
		$addr = sanitize_text_field( (string) ( $b['addr'] ?? '' ) );
		if ( 'delivery' === $mode ) {
			foreach ( (array) self::val( (string) $r['zones'], array() ) as $z ) {
				if ( isset( $z['re'] ) && @preg_match( '#' . str_replace( '#', '\\#', (string) $z['re'] ) . '#', $pc ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
					$zone = $z;
					break;
				}
			}
			$min = (float) self::val( (string) ( $r['min'] ?? '' ), 0 );
			if ( ! $zone || '' === $addr || $sub < $min ) {
				$o->delete( true );
				return self::err( ! $zone ? __( 'Enter a postcode inside our delivery area, or choose pick-up.', 'agency-core' ) : ( '' === $addr ? __( 'Add your delivery address.', 'agency-core' ) : __( 'Delivery needs a higher minimum order.', 'agency-core' ) ), 409 );
			}
			$o->set_shipping_first_name( $who[0] );
			$o->set_shipping_address_1( $addr );
			$o->set_shipping_postcode( $pc );
			$o->set_shipping_country( 'MY' );
			$o->set_shipping_phone( $who[1] );
		}
		self::set_who( $o, $who );
		$code = (string) ( $b['code'] ?? '' );
		$disc = 0.0;
		if ( '' !== $code ) {
			$c = new WC_Coupon( wc_format_coupon_code( $code ) );
			if ( $c->get_id() ) {
				$disc = 'percent' === $c->get_discount_type() ? round( $sub * (float) $c->get_amount() / 100, 2 ) : min( $sub, (float) $c->get_amount() );
			}
		}
		$ship = new WC_Order_Item_Shipping();
		if ( 'delivery' === $mode ) {
			$free = (float) self::val( (string) ( $r['free'] ?? '' ), 0 );
			$fee  = $free && $sub - $disc >= $free ? 0.0 : (float) ( $zone['fee'] ?? 0 );
			/* translators: %s: delivery area */
			$ship->set_method_title( sprintf( __( 'Delivery: %s', 'agency-core' ), (string) ( $zone['area'] ?? $pc ) ) );
			$ship->set_method_id( 'flat_rate' );
			$ship->set_total( $fee );
		} else {
			$ship->set_method_title( __( 'Pick-up', 'agency-core' ) );
			$ship->set_method_id( 'local_pickup' );
			$ship->set_total( 0 );
		}
		$o->add_item( $ship );
		$o->update_meta_data( AGC_Festive::MODE, 'delivery' === $mode ? 'delivery' : 'collect' );
		$o->update_meta_data( AGC_Festive::DATE, $date );
		$o->update_meta_data( AGC_Festive::SLOT, self::hm( $time ) );
		$note = sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) );
		/* translators: 1: pick-up or delivery, 2: time */
		$o->set_customer_note( trim( sprintf( __( '%1$s at %2$s', 'agency-core' ), 'delivery' === $mode ? __( 'Delivery', 'agency-core' ) : __( 'Pick-up', 'agency-core' ), self::hm( $time ) ) . ( $note ? "\n" . $note : '' ) ) );
		$stop = self::finish( $o, $code, $b['total'] ?? null );
		if ( $stop ) {
			return $stop;
		}
		$pay = 'wa' === ( $b['pay'] ?? '' ) ? 'wa' : ( 'duitnow' === ( $b['pay'] ?? '' ) ? 'duitnow' : 'online' );
		$go  = self::pay( $o, $pay, __( 'Order also sent on WhatsApp; payment at pick-up or by transfer.', 'agency-core' ) );
		return self::summary( $o ) + array( 'payUrl' => $go );
	}

	/**
	 * Festive pre-order: sets for one season, a pick-up day inside the season, deposit or full payment.
	 *
	 * @param array $b     Body.
	 * @param array $who   Customer.
	 * @param array $lines Lines.
	 * @return array|WP_Error
	 */
	private static function festive_order( $b, $who, $lines ) {
		$season = null;
		foreach ( $lines as $x ) {
			$hit = self::item( (string) $x[5]['id'] );
			if ( ! $hit || ! $hit[2] || ( $season && $season['id'] !== $hit[2]['id'] ) ) {
				return self::err( __( 'Please order the sets of one festival at a time.', 'agency-core' ), 409 );
			}
			$season = $hit[2];
		}
		list( $today ) = self::now();
		$date          = (string) ( $b['date'] ?? '' );
		if ( ( $season['cutoff'] ?? '' ) < $today ) {
			return self::err( __( 'Pre-orders for this festival have closed.', 'agency-core' ), 409 );
		}
		if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) || $date < (string) ( $season['from'] ?? '' ) || $date > (string) ( $season['to'] ?? '' ) ) {
			return self::err( __( 'Choose a pick-up day for this festival.', 'agency-core' ), 409 );
		}
		$o = self::new_order( $lines );
		self::set_who( $o, $who );
		$ship = new WC_Order_Item_Shipping();
		$ship->set_method_title( __( 'Festive pick-up', 'agency-core' ) );
		$ship->set_method_id( 'local_pickup' );
		$ship->set_total( 0 );
		$o->add_item( $ship );
		$o->update_meta_data( AGC_Festive::MODE, 'collect' );
		$o->update_meta_data( AGC_Festive::DATE, $date );
		$ftime = (int) ( $b['time'] ?? 0 );
		$o->update_meta_data( AGC_Festive::SLOT, (string) ( $season['name'] ?? __( 'Festive pick-up', 'agency-core' ) ) . ( $ftime ? ' · ' . self::hm( $ftime ) : '' ) );
		$o->update_meta_data( '_agc_skin_season', (string) ( $season['name'] ?? '' ) );
		$o->calculate_totals( false );
		$dep = 0.0;
		foreach ( $lines as $x ) {
			$dep += $x[2] * $x[1] * min( 1, max( 0.1, (float) ( $x[5]['dep'] ?? 1 ) ) );
		}
		$dep  = round( $dep, 2 );
		$full = 'full' === ( $b['pay'] ?? '' ) || $dep >= (float) $o->get_total();
		if ( isset( $b['total'] ) && abs( (float) $b['total'] - (float) $o->get_total() ) > 0.01 ) {
			$o->delete( true );
			return self::err( __( 'Some prices have just changed. Please check your order again.', 'agency-core' ), 409 );
		}
		$note = sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) );
		/* translators: 1: amount paid now, 2: balance */
		$o->set_customer_note( trim( ( $full ? __( 'Paid in full.', 'agency-core' ) : sprintf( __( 'Deposit %1$s paid; balance %2$s at pick-up.', 'agency-core' ), wp_strip_all_tags( wc_price( $dep ) ), wp_strip_all_tags( wc_price( (float) $o->get_total() - $dep ) ) ) ) . ( $note ? "\n" . $note : '' ) ) );
		$o->update_meta_data( '_agc_deposit', $full ? (float) $o->get_total() : $dep );
		$go = self::pay( $o, 'online' );
		return self::summary( $o ) + array(
			'deposit' => $full ? (float) $o->get_total() : $dep,
			'payUrl'  => $go,
		);
	}

	/**
	 * A build-your-own gift box: the box, the items (only those allowed in a box), a ribbon and a card.
	 * Spec "hamper": { "product": "custom-hamper", "boxes": "BOXES", "list": "P", "flag": "hamper" }
	 *
	 * @param array $h   { box, items: { id: qty }, ribbon, msg }.
	 * @param array $box Spec.
	 * @return array|WP_Error [ product, unit price, description ]
	 */
	private static function hamper_line( $h, $box ) {
		$p = self::product( (string) $box['product'] );
		$b = null;
		foreach ( (array) self::val( (string) ( $box['boxes'] ?? 'BOXES' ), array() ) as $x ) {
			if ( (string) ( $x['id'] ?? '' ) === (string) ( $h['box'] ?? '' ) ) {
				$b = $x;
			}
		}
		if ( ! $p || ! $b ) {
			return self::err( __( 'Choose a box for your hamper.', 'agency-core' ) );
		}
		$unit  = (float) ( $b['p'] ?? 0 );
		$count = 0;
		$list  = array();
		foreach ( (array) ( $h['items'] ?? array() ) as $id => $q ) {
			$q   = max( 0, (int) $q );
			$hit = self::item( (string) $id );
			if ( ! $q ) {
				continue;
			}
			if ( ! $hit || ! $hit[1] || empty( $hit[0][ $box['flag'] ?? 'hamper' ] ) || ! $hit[1]->is_in_stock() ) {
				return self::err( __( 'Something in your hamper is no longer available. Please check it again.', 'agency-core' ), 409 );
			}
			$unit  += (float) $hit[1]->get_price() * $q;
			$count += $q;
			$list[] = $q . ' × ' . $hit[1]->get_name();
		}
		if ( ! $count || $count > (int) ( $b['slots'] ?? 0 ) ) {
			return self::err( __( 'Fill your hamper (it holds a set number of items).', 'agency-core' ) );
		}
		$ribbon = sanitize_text_field( (string) ( $h['ribbon'] ?? '' ) );
		$msg    = sanitize_text_field( (string) ( $h['msg'] ?? '' ) );
		/* translators: 1: box size, 2: items, 3: ribbon */
		$desc = sprintf( __( '%1$s box: %2$s · %3$s ribbon', 'agency-core' ), (string) ( $b['n'] ?? '' ), implode( ', ', $list ), $ribbon ) . ( $msg ? ' · card: “' . $msg . '”' : '' );
		return array( $p, round( $unit, 2 ), $desc );
	}

	/**
	 * Online shop order, shipped by courier (Dulang & Daun).
	 *
	 * Body: { kind: ship, lines, state, method: std|express, addr, pc, city, code, gift: { to, msg }, name, phone, email, pay, total }
	 * Spec "ship": { "states_east": "EAST", "rates": "SHIP", "deal": "multi" }   rates: { west: { std, express, free }, east: { std, free } }
	 *
	 * @param array $b     Body.
	 * @param array $who   Customer.
	 * @param array $lines Lines.
	 * @return array|WP_Error
	 */
	private static function ship_order( $b, $who, $lines ) {
		$r      = (array) self::spec( 'ship', array() );
		$state  = sanitize_text_field( (string) ( $b['state'] ?? '' ) );
		$east   = in_array( $state, array_map( 'strval', (array) self::val( (string) ( $r['states_east'] ?? 'EAST' ), array() ) ), true );
		$region = $east ? 'east' : 'west';
		$addr   = sanitize_text_field( (string) ( $b['addr'] ?? '' ) );
		$pc     = preg_replace( '/\D/', '', (string) ( $b['pc'] ?? '' ) );
		$city   = sanitize_text_field( (string) ( $b['city'] ?? '' ) );
		if ( '' === $addr || 5 !== strlen( $pc ) || '' === $city || '' === $state ) {
			return self::err( __( 'Add the full delivery address with a 5-digit postcode.', 'agency-core' ) );
		}
		foreach ( $lines as $x ) {
			if ( $east && 'west' === ( $x[5]['ship'] ?? '' ) ) {
				/* translators: %s: product */
				return self::err( sprintf( __( '%s ships to West Malaysia only.', 'agency-core' ), $x[0]->get_name() ), 409 );
			}
		}
		// "3 for RM27": the deal goes into the line price, so a % code works on what the customer actually pays.
		$deal = (string) ( $r['deal'] ?? 'multi' );
		foreach ( $lines as $i => $x ) {
			$m = (array) ( $x[5][ $deal ] ?? array() );
			if ( empty( $m['n'] ) ) {
				continue;
			}
			$n     = 0;
			foreach ( $lines as $y ) {
				$n += (string) ( $y[5]['id'] ?? '' ) === (string) ( $x[5]['id'] ?? '' ) ? $y[1] : 0;
			}
			$off   = floor( $n / (int) $m['n'] ) * ( (int) $m['n'] * (float) $x[0]->get_price() - (float) $m['price'] );
			$share = $n ? $off * $x[1] / $n : 0;
			if ( $share > 0 ) {
				$lines[ $i ][2] = round( ( $x[2] * $x[1] - $share ) / $x[1], 4 );
				/* translators: 1: how many, 2: price */
				$lines[ $i ][3] = trim( $x[3] . ' · ' . sprintf( __( '%1$d for RM%2$s', 'agency-core' ), (int) $m['n'], (string) $m['price'] ), ' ·' );
			}
		}
		$o = self::new_order( $lines );
		self::set_who( $o, $who );
		$o->set_shipping_first_name( $who[0] );
		$o->set_shipping_address_1( $addr );
		$o->set_shipping_postcode( $pc );
		$o->set_shipping_city( $city );
		$o->set_shipping_state( $state );
		$o->set_shipping_country( 'MY' );
		$o->set_shipping_phone( $who[1] );
		$o->set_billing_address_1( $addr );
		$o->set_billing_postcode( $pc );
		$o->set_billing_city( $city );
		$code = (string) ( $b['code'] ?? '' );
		if ( '' !== $code ) {
			$res = $o->apply_coupon( wc_format_coupon_code( $code ) );
			if ( is_wp_error( $res ) ) {
				$o->delete( true );
				return self::err( wp_strip_all_tags( $res->get_error_message() ), 409 );
			}
		}
		$o->calculate_totals( false );
		$rates  = (array) self::val( (string) ( $r['rates'] ?? 'SHIP' ), array() );
		$rr     = (array) ( $rates[ $region ] ?? array() );
		$after  = (float) $o->get_subtotal() - ( 'sub' === ( $r['free_on'] ?? '' ) ? 0 : (float) $o->get_discount_total() ); // "sub": free shipping counts before the code (the shop templates)
		$method = 'express' === ( $b['method'] ?? '' ) && ! $east && isset( $rates['west']['express'] ) ? 'express' : 'std';
		$fee    = 'express' === $method ? (float) $rates['west']['express'] : ( $after >= (float) ( $rr['free'] ?? PHP_INT_MAX ) ? 0.0 : (float) ( $rr['std'] ?? 0 ) );
		$ship   = new WC_Order_Item_Shipping();
		/* translators: 1: West / East Malaysia, 2: standard / express */
		$ship->set_method_title( sprintf( __( '%1$s, %2$s', 'agency-core' ), $east ? __( 'East Malaysia', 'agency-core' ) : __( 'West Malaysia', 'agency-core' ), 'express' === $method ? __( 'express', 'agency-core' ) : __( 'standard', 'agency-core' ) ) );
		$ship->set_method_id( 'flat_rate' );
		$ship->set_total( $fee );
		$o->add_item( $ship );
		$gift = (array) ( $b['gift'] ?? array() );
		$note = sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) );
		if ( ! empty( $gift['to'] ) ) {
			/* translators: 1: who it's for, 2: card message */
			$note = trim( sprintf( __( 'Gift for %1$s. Card: %2$s. No prices in the box.', 'agency-core' ), sanitize_text_field( (string) $gift['to'] ), sanitize_text_field( (string) ( $gift['msg'] ?? '-' ) ) ) . ( $note ? "\n" . $note : '' ) );
			$o->update_meta_data( '_agc_gift_to', sanitize_text_field( (string) $gift['to'] ) );
		}
		if ( $note ) {
			$o->set_customer_note( $note );
		}
		if ( ! empty( $b['payWith'] ) ) {
			$o->update_meta_data( '_agc_pay_with', sanitize_text_field( mb_substr( (string) $b['payWith'], 0, 40 ) ) ); // "FPX online banking", "E-wallet"…
		}
		$o->update_meta_data( AGC_Festive::MODE, 'delivery' );
		$o->calculate_totals( false );
		if ( isset( $b['total'] ) && abs( (float) $b['total'] - (float) $o->get_total() ) > 0.05 ) {
			$o->delete( true );
			return self::err( __( 'Some prices have just changed. Please check your order again.', 'agency-core' ), 409 );
		}
		$pay = 'wa' === ( $b['pay'] ?? '' ) ? 'wa' : 'online';
		$go  = self::pay( $o, $pay, __( 'Order also sent on WhatsApp; waiting for payment.', 'agency-core' ), __( 'Sent on WhatsApp, pay by bank transfer or DuitNow', 'agency-core' ) );
		return self::summary( $o ) + array( 'payUrl' => $go );
	}

	/**
	 * "Tell me when it's back": the shop's notify list (the shop dashboard shows it).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_notify( $req ) {
		$b     = (array) $req->get_json_params();
		$c     = trim( (string) ( $b['contact'] ?? '' ) );
		$phone = preg_replace( '/\D+/', '', $c );
		if ( strlen( $phone ) < 9 || strlen( $phone ) > 15 ) {
			return self::err( __( 'Add a mobile number we can WhatsApp.', 'agency-core' ) );
		}
		$list = (array) get_option( AGC_Festive::NOTIFY, array() );
		if ( count( $list ) < 5000 ) {
			$list[] = array(
				'p'    => $phone,
				't'    => time(),
				'item' => sanitize_text_field( trim( (string) ( $b['name'] ?? '' ) . ' ' . (string) ( $b['opt'] ?? '' ) ) ),
			);
			update_option( AGC_Festive::NOTIFY, $list, false );
		}
		return array( 'ok' => true );
	}

	/**
	 * Festival pre-order shop (Butter & Lantern): the items of one festival, a day inside its window, collection / local
	 * delivery / courier with their own fees and time slots, early-bird discount, online payment or DuitNow + receipt.
	 *
	 * Spec "preorder": { "fests": "FESTS", "items": "items", "sku": "{g}-{id}", "early": 10, "cap": { "collect": 6, "kv": 10 },
	 *   "slots": "SLOTS", "modes": { "kv": { "fee": 15, "free": 200, "pc": [[40000,48300],…] }, "courier": { "fee": 12,
	 *   "free": 250, "east": 25, "east_pc": [[87000,91399],…], "days": 3 } } }
	 *
	 * @param array $b   Body: { fest, lines: [{ id, opt, pers, qty }], mode, date, slot, addr, pc, gift, pay, total }.
	 * @param array $who Customer.
	 * @return array|WP_Error
	 */
	private static function preorder( $b, $who ) {
		$r     = (array) self::spec( 'preorder', array() );
		$fests = (array) self::val( (string) ( $r['fests'] ?? 'FESTS' ), array() );
		$fk    = sanitize_key( (string) ( $b['fest'] ?? '' ) );
		$fest  = (array) ( $fests[ $fk ] ?? array() );
		if ( ! $fest ) {
			return self::err( __( 'Choose a festival.', 'agency-core' ) );
		}
		list( $today ) = self::now();
		if ( $today > (string) ( $fest['cutoff'] ?? '' ) ) {
			return self::err( __( 'Pre-orders for this festival have closed.', 'agency-core' ), 409 );
		}
		$mode  = in_array( $b['mode'] ?? '', array( 'collect', 'kv', 'courier' ), true ) ? (string) $b['mode'] : 'collect';
		$date  = (string) ( $b['date'] ?? '' );
		$slot  = sanitize_text_field( (string) ( $b['slot'] ?? '' ) );
		$win   = array();
		for ( $d = max( $today, (string) ( $fest['from'] ?? '' ) ); $d <= (string) ( $fest['to'] ?? '' ) && count( $win ) < 60; $d = gmdate( 'Y-m-d', strtotime( $d . ' +1 day' ) ) ) {
			$win[] = $d;
		}
		$m    = (array) ( $r['modes'][ $mode ] ?? array() );
		$days = 'courier' === $mode ? array_slice( $win, 0, (int) ( $m['days'] ?? 3 ) ) : $win;
		if ( ! in_array( $date, $days, true ) ) {
			return self::err( __( 'Choose a day.', 'agency-core' ), 409 );
		}
		if ( 'courier' !== $mode ) {
			$sl    = (array) self::val( (string) ( $r['slots'] ?? 'SLOTS' ), array() );
			$slots = (array) ( $sl[ $mode ] ?? array() );
			if ( ! in_array( $slot, $slots, true ) ) {
				return self::err( __( 'Choose a time.', 'agency-core' ), 409 );
			}
			$used = (array) self::slots_used();
			if ( (int) ( $used[ $fk . '|' . $date . '|' . $mode . '|' . $slot ] ?? 0 ) >= (int) ( $r['cap'][ $mode ] ?? 6 ) ) {
				return self::err( __( 'That time is full. Please choose another time.', 'agency-core' ), 409 );
			}
		} else {
			$slot = '';
		}
		$pc   = preg_replace( '/\D/', '', (string) ( $b['pc'] ?? '' ) );
		$addr = sanitize_text_field( (string) ( $b['addr'] ?? '' ) );
		$in   = static function ( $n, $ranges ) {
			foreach ( (array) $ranges as $x ) {
				if ( $n >= (int) $x[0] && $n <= (int) $x[1] ) {
					return true;
				}
			}
			return false;
		};
		if ( 'collect' !== $mode && ( '' === $addr || 5 !== strlen( $pc ) ) ) {
			return self::err( __( 'Add the delivery address with a 5-digit postcode.', 'agency-core' ) );
		}
		if ( 'kv' === $mode && ! $in( (int) $pc, $m['pc'] ?? array() ) ) {
			return self::err( __( 'That postcode is outside our delivery area. Choose courier or collection.', 'agency-core' ), 409 );
		}
		// The items: this festival's, priced here (option prices from the page, the rest from WooCommerce), stock checked.
		$tpl   = (string) ( $r['sku'] ?? '{g}-{id}' );
		$list  = array();
		foreach ( (array) ( $fest[ $r['items'] ?? 'items' ] ?? array() ) as $it ) {
			$list[ (string) $it['id'] ] = $it;
		}
		$lines = array();
		$want  = array();
		foreach ( array_slice( (array) ( $b['lines'] ?? array() ), 0, 30 ) as $row ) {
			$id  = sanitize_key( (string) ( $row['id'] ?? '' ) );
			$it  = $list[ $id ] ?? null;
			$p   = $it ? self::product( str_replace( array( '{g}', '{id}' ), array( $fk, $id ), $tpl ) ) : null;
			$qty = max( 1, min( 50, (int) ( $row['qty'] ?? 1 ) ) );
			if ( ! $p ) {
				return self::err( __( 'Something in your cart is no longer available. Please check your cart again.', 'agency-core' ), 409 );
			}
			$want[ $p->get_id() ] = ( $want[ $p->get_id() ] ?? 0 ) + $qty;
			if ( ! $p->is_in_stock() || ( $p->managing_stock() && $p->get_stock_quantity() < $want[ $p->get_id() ] ) ) {
				/* translators: %s: product */
				return self::err( sprintf( __( 'Sorry, %s just sold out.', 'agency-core' ), $p->get_name() ), 409 );
			}
			if ( 'courier' === $mode && ! empty( $it['noCourier'] ) ) {
				/* translators: %s: product */
				return self::err( sprintf( __( '%s can’t go by courier. Choose collection or local delivery.', 'agency-core' ), $p->get_name() ), 409 );
			}
			$unit  = (float) $p->get_price();
			$label = '';
			foreach ( (array) ( $it['opts'] ?? array() ) as $o ) {
				if ( (string) $o['id'] === (string) ( $row['opt'] ?? '' ) ) {
					$unit  = (float) $o['p'];
					$label = is_array( $o['l'] ) ? (string) end( $o['l'] ) : (string) $o['l'];
				}
			}
			if ( ! empty( $it['opts'] ) && '' === $label ) {
				return self::err( __( 'Choose an option for each item.', 'agency-core' ) );
			}
			$lines[] = array( $p, $qty, $unit, $label, sanitize_text_field( (string) ( $row['pers'] ?? '' ) ), $it + array( 'opt' => (string) ( $row['opt'] ?? '' ) ) );
		}
		if ( ! $lines ) {
			return self::err( __( 'Your cart is empty.', 'agency-core' ) );
		}
		$o = self::new_order( $lines );
		foreach ( array_values( $o->get_items() ) as $i => $item ) {
			$item->add_meta_data( '_agc_item', (string) $lines[ $i ][5]['id'], true );
			$item->add_meta_data( '_agc_opt', (string) $lines[ $i ][5]['opt'], true );
			$item->save();
		}
		self::set_who( $o, $who );
		$sub = 0.0;
		foreach ( $lines as $x ) {
			$sub += $x[2] * $x[1];
		}
		$early = (string) ( $fest['early'] ?? '' );
		$disc  = $early && $today <= $early ? round( $sub * (float) ( $r['early'] ?? 10 ) / 100, 2 ) : 0.0;
		if ( $disc > 0 ) {
			$fee = new WC_Order_Item_Fee();
			$fee->set_name( __( 'Early-bird discount', 'agency-core' ) );
			$fee->set_amount( -$disc );
			$fee->set_total( -$disc );
			$fee->set_tax_status( 'none' );
			$o->add_item( $fee );
		}
		$after = $sub - $disc;
		$cost  = 0.0;
		if ( 'kv' === $mode ) {
			$cost = $after >= (float) ( $m['free'] ?? PHP_INT_MAX ) ? 0.0 : (float) ( $m['fee'] ?? 0 );
		} elseif ( 'courier' === $mode ) {
			$cost = $in( (int) $pc, $m['east_pc'] ?? array() ) ? (float) ( $m['east'] ?? 0 ) : ( $after >= (float) ( $m['free'] ?? PHP_INT_MAX ) ? 0.0 : (float) ( $m['fee'] ?? 0 ) );
		}
		$ship = new WC_Order_Item_Shipping();
		$ship->set_method_title( 'collect' === $mode ? __( 'Collection', 'agency-core' ) : ( 'kv' === $mode ? __( 'Local delivery', 'agency-core' ) : __( 'Courier', 'agency-core' ) ) );
		$ship->set_method_id( 'collect' === $mode ? 'local_pickup' : 'flat_rate' );
		$ship->set_total( $cost );
		$o->add_item( $ship );
		if ( 'collect' !== $mode ) {
			$o->set_shipping_first_name( $who[0] );
			$o->set_shipping_address_1( $addr );
			$o->set_shipping_postcode( $pc );
			$o->set_shipping_country( 'MY' );
			$o->set_shipping_phone( $who[1] );
		}
		$gift  = (array) ( $b['gift'] ?? array() );
		$notes = sanitize_textarea_field( mb_substr( (string) ( $b['notes'] ?? '' ), 0, 500 ) );
		$note  = array();
		if ( ! empty( $gift['name'] ) ) {
			$o->update_meta_data( '_agc_gift', array_map( 'sanitize_text_field', array_map( 'strval', $gift ) ) );
			/* translators: 1: who, 2: card message */
			$note[] = sprintf( __( 'Gift for %1$s. Card: %2$s', 'agency-core' ), sanitize_text_field( (string) $gift['name'] ), sanitize_text_field( (string) ( $gift['msg'] ?? '-' ) ) );
		}
		if ( '' !== $notes ) {
			$o->update_meta_data( '_agc_notes', $notes );
			$note[] = $notes;
		}
		if ( $note ) {
			$o->set_customer_note( implode( "\n", $note ) );
		}
		// how the customer chose to pay on the page (FPX + bank, e-wallet, card, DuitNow)
		$pm = in_array( $b['pm'] ?? '', array( 'fpx', 'ewallet', 'card', 'duitnow' ), true ) ? (string) $b['pm'] : ( 'duitnow' === ( $b['pay'] ?? '' ) ? 'duitnow' : 'fpx' );
		$o->update_meta_data( '_agc_pm', $pm );
		if ( 'fpx' === $pm ) {
			$o->update_meta_data( '_agc_bank', sanitize_text_field( mb_substr( (string) ( $b['bank'] ?? '' ), 0, 40 ) ) );
		}
		$o->update_meta_data( '_agc_fest', $fk );
		$o->update_meta_data( '_agc_pmode', $mode );
		$o->update_meta_data( AGC_Festive::MODE, 'collect' === $mode ? 'collect' : 'delivery' );
		$o->update_meta_data( AGC_Festive::DATE, $date );
		$o->update_meta_data( AGC_Festive::SLOT, '' !== $slot ? $slot : __( 'Courier', 'agency-core' ) );
		$o->calculate_totals( false );
		if ( isset( $b['total'] ) && abs( (float) $b['total'] - (float) $o->get_total() ) > 0.05 ) {
			$o->delete( true );
			return self::err( __( 'Some prices have just changed. Please check your cart again.', 'agency-core' ), 409 );
		}
		$go = self::pay( $o, 'duitnow' === ( $b['pay'] ?? '' ) ? 'duitnow' : 'online' );
		$o  = wc_get_order( $o->get_id() );
		return array_merge(
			self::summary( $o ),
			array(
				'payUrl' => $go,
				'disc'   => $disc, // the early-bird discount (a negative fee line in WooCommerce)
				'fee'    => $cost,
			)
		);
	}

	/**
	 * Pre-orders per festival, day, delivery mode and time slot ("cny|2027-02-01|collect|10:00–12:00" => 3).
	 *
	 * @return object
	 */
	public static function slots_used() {
		if ( ! self::spec( 'preorder', null ) || ! function_exists( 'wc_get_orders' ) ) {
			return new stdClass();
		}
		$out = array();
		foreach ( wc_get_orders(
			array(
				'limit'      => 1000,
				'status'     => array( 'pending', 'on-hold', 'processing', 'agc-ready', 'completed' ),
				'meta_key'   => '_agc_fest', // phpcs:ignore WordPress.DB.SlowDBQuery
				'meta_compare' => 'EXISTS',
			)
		) as $o ) {
			$k         = $o->get_meta( '_agc_fest' ) . '|' . $o->get_meta( AGC_Festive::DATE ) . '|' . $o->get_meta( '_agc_pmode' ) . '|' . $o->get_meta( AGC_Festive::SLOT );
			$out[ $k ] = ( $out[ $k ] ?? 0 ) + 1;
		}
		return (object) $out;
	}

	/**
	 * DuitNow receipt from the website's own checkout (multipart: order, key, receipt).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_receipt( $req ) {
		$o    = wc_get_order( absint( $req->get_param( 'order' ) ) );
		$file = $req->get_file_params()['receipt'] ?? null;
		if ( ! $o || ! hash_equals( $o->get_order_key(), (string) $req->get_param( 'key' ) ) || ! class_exists( 'AGC_Receipts' ) || ! AGC_Receipts::wants_receipt( $o ) ) {
			return self::err( __( 'This order does not need a receipt.', 'agency-core' ), 403 );
		}
		if ( ! is_array( $file ) || UPLOAD_ERR_OK !== (int) $file['error'] || (int) $file['size'] <= 0 || (int) $file['size'] > AGC_Receipts::MAX_SIZE ) {
			return self::err( __( 'Choose a photo or PDF of your receipt (up to 5 MB).', 'agency-core' ) );
		}
		$check = wp_check_filetype_and_ext( $file['tmp_name'], sanitize_file_name( $file['name'] ), AGC_Receipts::mimes() );
		if ( empty( $check['ext'] ) || empty( $check['type'] ) ) {
			return self::err( __( 'Choose a photo or PDF of your receipt (up to 5 MB).', 'agency-core' ) );
		}
		$name = bin2hex( random_bytes( 16 ) ) . '.' . $check['ext'];
		if ( ! @move_uploaded_file( $file['tmp_name'], AGC_Receipts::dir() . '/' . $name ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors, Generic.PHP.ForbiddenFunctions
			return self::err( __( 'Sorry, the receipt could not be saved. Please try again.', 'agency-core' ), 500 );
		}
		chmod( AGC_Receipts::dir() . '/' . $name, 0640 ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$o->update_meta_data( AGC_Receipts::META, $name );
		$o->update_meta_data( '_agc_receipt_name', sanitize_file_name( mb_substr( (string) $file['name'], 0, 60 ) ) );
		$o->add_order_note( __( 'The customer uploaded a payment receipt. Check it, then mark the order "Processing" (payment received).', 'agency-core' ) );
		$o->save();
		AGC_Receipts::tell_shop( $o );
		return array( 'ok' => true );
	}

	/* ------------------------------------------------------------------ bookings */

	/**
	 * Booked tables per day and time for the next weeks ("2026-11-20|1140" => 2).
	 *
	 * @return object
	 */
	public static function booked() {
		if ( ! self::spec( 'book', null ) ) {
			return new stdClass();
		}
		list( $today ) = self::now();
		$out           = array();
		$q             = new WP_Query(
			array(
				'post_type'      => self::BOOKING,
				'post_status'    => 'publish',
				'posts_per_page' => 500,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery
					array(
						'key'     => '_date',
						'value'   => $today,
						'compare' => '>=',
					),
				),
			)
		);
		foreach ( $q->posts as $id ) {
			if ( in_array( get_post_meta( $id, '_st', true ), array( 'cancelled', 'no-show', 'waitlist' ), true ) ) {
				continue;
			}
			$k         = get_post_meta( $id, '_date', true ) . '|' . (int) get_post_meta( $id, '_time', true );
			$out[ $k ] = ( $out[ $k ] ?? 0 ) + 1;
		}
		return (object) $out;
	}

	/**
	 * Booked per seating, day and time: [bookings, guests] ("counter|2026-11-20|1080" => [2, 5]). Waitlist not counted.
	 *
	 * @return object
	 */
	public static function booked_by() {
		if ( ! self::spec( 'book', null ) ) {
			return new stdClass();
		}
		list( $today ) = self::now();
		$out           = array();
		$q             = new WP_Query(
			array(
				'post_type'      => self::BOOKING,
				'post_status'    => 'publish',
				'posts_per_page' => 500,
				'fields'         => 'ids',
				'no_found_rows'  => true,
				'meta_query'     => array( array( 'key' => '_date', 'value' => $today, 'compare' => '>=' ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		foreach ( $q->posts as $id ) {
			if ( in_array( get_post_meta( $id, '_st', true ), array( 'cancelled', 'no-show', 'waitlist' ), true ) ) {
				continue;
			}
			$k         = get_post_meta( $id, '_seatkey', true ) . '|' . get_post_meta( $id, '_date', true ) . '|' . (int) get_post_meta( $id, '_time', true );
			$v         = $out[ $k ] ?? array( 0, 0 );
			$out[ $k ] = array( $v[0] + 1, $v[1] + (int) get_post_meta( $id, '_pax', true ) );
		}
		return (object) $out;
	}

	/**
	 * Rules for a seating ("room", "counter"), or the one rule for every seating ("*").
	 *
	 * @param string $seat Seating.
	 * @return array [ key, rules ] (rules empty = no such seating)
	 */
	private static function seat_rules( $seat ) {
		$r     = (array) self::spec( 'book', array() );
		$seats = (array) ( $r['seats'] ?? array() );
		$key   = isset( $seats[ $seat ] ) ? $seat : ( isset( $seats['*'] ) ? '*' : '' );
		if ( '' === $key ) {
			return array( '', array() );
		}
		unset( $r['seats'] );
		return array( $key, array_merge( $r, (array) $seats[ $key ] ) );
	}

	/**
	 * Book a table.
	 *
	 * Body: { date, time, pax, seat, occ, notes, name, phone, email, extra: {…} }
	 * Spec "book": { "rules": "BOOK", "hours": "HOURS", "tables": 6, "first": 0, "last": 90, "step": 15, "days": 60,
	 *                "deposit": { "from": "depositFrom", "amount": "deposit", "per": "booking"|"guest" } }
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_book( $req ) {
		$stop = self::closed();
		if ( $stop ) {
			return $stop;
		}
		$r = (array) self::spec( 'book', array() );
		if ( ! $r ) {
			return self::err( __( 'This website does not take bookings.', 'agency-core' ), 404 );
		}
		$b   = (array) $req->get_json_params();
		$who = self::who( $b );
		if ( is_wp_error( $who ) ) {
			return $who;
		}
		// Spec "book": general rules + "seats": { "*": {…} } (one rule for every seating, Sireh & Salt) or one per seating
		// (Maison Cendre: "room" by tables, "counter" by seats at two fixed sittings). Values may point at the page's own
		// ("BOOK.max", "BOOK.depositFrom").
		$seat              = sanitize_text_field( (string) ( $b['seat'] ?? '' ) );
		list( $skey, $sr ) = self::seat_rules( $seat );
		if ( ! $sr ) {
			return self::err( __( 'Choose where you would like to sit.', 'agency-core' ) );
		}
		$pax = (int) ( $b['pax'] ?? 0 );
		$min = (int) self::ref( $sr['min'] ?? 1, 1 );
		$max = (int) self::ref( $sr['max'] ?? 12, 12 );
		if ( $pax < $min || $pax > $max ) {
			/* translators: 1: fewest guests, 2: most guests */
			return self::err( sprintf( __( 'Online bookings here are for %1$d to %2$d guests.', 'agency-core' ), $min, $max ) );
		}
		$date = (string) ( $b['date'] ?? '' );
		$time = (int) ( $b['time'] ?? 0 );
		if ( ! self::slot_ok( $date, $time, $sr ) ) {
			return self::err( __( 'That time is no longer available. Please choose another time.', 'agency-core' ), 409 );
		}
		$by   = self::booked_by();
		$have = (array) ( $by->{$skey . '|' . $date . '|' . $time} ?? array( 0, 0 ) );
		$used = 'guest' === ( $sr['count'] ?? 'booking' ) ? (int) $have[1] + $pax : (int) $have[0] + 1;
		$wait = $used > (int) ( $sr['cap'] ?? 6 );
		if ( $wait && empty( $sr['waitlist'] ) ) {
			return self::err( __( 'Sorry, that time is fully booked. Please choose another time.', 'agency-core' ), 409 );
		}
		// Deposit: per booking or per guest, from a group size, paid now or sent later with the confirmation.
		$dep = 0.0;
		$d   = (array) ( $sr['deposit'] ?? array() );
		if ( ! $wait && $d && $pax >= (int) self::ref( $d['from'] ?? 1, 1 ) ) {
			$dep = (float) self::ref( $d['amount'] ?? 0, 0 ) * ( 'guest' === ( $d['per'] ?? 'booking' ) ? $pax : 1 );
		}
		$extra = array();
		foreach ( (array) ( $b['extra'] ?? array() ) as $ek => $ev ) {
			$extra[ sanitize_key( (string) $ek ) ] = is_array( $ev ) ? implode( ', ', array_map( 'sanitize_text_field', array_map( 'strval', $ev ) ) ) : sanitize_text_field( (string) $ev );
		}
		$id = wp_insert_post(
			array(
				'post_type'   => self::BOOKING,
				'post_status' => 'publish',
				/* translators: 1: guests, 2: day, 3: time, 4: name */
				'post_title'  => sprintf( __( 'Table for %1$d · %2$s %3$s · %4$s', 'agency-core' ), $pax, wp_date( 'D j M', strtotime( $date . ' 12:00' ) ), self::hm( $time ), $who[0] ),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return self::err( __( 'Sorry, the booking could not be saved. Please try again.', 'agency-core' ), 500 );
		}
		$ref = self::prefix() . '-B' . $id;
		$meta = array(
			'_ref'   => $ref,
			'_date'  => $date,
			'_time'  => $time,
			'_pax'   => $pax,
			'_seat'  => $seat,
			'_seatkey' => $skey,
			'_occ'   => sanitize_text_field( (string) ( $b['occ'] ?? '' ) ),
			'_notes' => sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) ),
			'_name'  => $who[0],
			'_phone' => $who[1],
			'_email' => $who[2],
			'_extra' => $extra,
			'_st'    => $wait ? 'waitlist' : ( $dep > 0 ? 'deposit' : 'new' ),
		);
		foreach ( $meta as $mk => $mv ) {
			update_post_meta( $id, $mk, $mv );
		}
		$out = array(
			'ref'     => $ref,
			'id'      => $id,
			'deposit' => $dep,
			'wait'    => $wait,
		);
		if ( $dep > 0 ) {
			$o   = wc_create_order(
				array(
					'status'      => 'pending',
					'created_via' => 'website',
				)
			);
			$fee = new WC_Order_Item_Fee();
			/* translators: %s: booking reference */
			$fee->set_name( sprintf( __( 'Booking deposit (%s)', 'agency-core' ), $ref ) );
			$fee->set_amount( $dep );
			$fee->set_total( $dep );
			$fee->set_tax_status( 'none' );
			$o->add_item( $fee );
			self::set_who( $o, $who );
			$o->update_meta_data( '_agc_booking', $id );
			/* translators: 1: guests, 2: day and time */
			$o->set_customer_note( sprintf( __( 'Deposit for a table for %1$d on %2$s. Taken off the bill.', 'agency-core' ), $pax, wp_date( 'D j M', strtotime( $date . ' 12:00' ) ) . ' ' . self::hm( $time ) ) );
			$o->calculate_totals( false );
			$later = 'later' === ( $d['pay'] ?? 'now' ); // "a deposit link comes with the confirmation"
			if ( $later ) {
				$o->save();
				$o->add_order_note( __( 'Deposit link to send with the booking confirmation.', 'agency-core' ) );
				$go = '';
			} else {
				$go = self::pay( $o, 'online' );
			}
			update_post_meta( $id, '_order', $o->get_id() );
			if ( $o->is_paid() ) {
				update_post_meta( $id, '_st', 'confirmed' );
			}
			$out['order']   = $o->get_order_number();
			$out['payUrl']  = $go;
			$out['payLink'] = $later ? $o->get_checkout_payment_url() : '';
		}
		return $out;
	}

	/* ------------------------------------------------------------------ gift vouchers */

	/**
	 * Buy a gift voucher: an order for the amount; when it's paid, a one-time code worth that amount.
	 *
	 * Body: { amt, to, from, msg, name, phone, email }
	 * Spec "voucher": { "product": "gift-voucher", "amounts": [50,100,150,200], "min": 30, "max": 1000, "months": 12, "prefix": "GIFT-" }
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_voucher( $req ) {
		$stop = self::closed();
		if ( $stop ) {
			return $stop;
		}
		$r = (array) self::spec( 'voucher', array() );
		$p = self::product( (string) ( $r['product'] ?? 'gift-voucher' ) );
		if ( ! $r || ! $p ) {
			return self::err( __( 'Gift vouchers are not sold online right now.', 'agency-core' ), 404 );
		}
		$b    = (array) $req->get_json_params();
		$name = sanitize_text_field( (string) ( ! empty( $b['name'] ) ? $b['name'] : ( ! empty( $b['from'] ) ? $b['from'] : __( 'Voucher buyer', 'agency-core' ) ) ) );
		$who  = array( $name, sanitize_text_field( (string) ( $b['phone'] ?? '' ) ), sanitize_email( (string) ( $b['email'] ?? '' ) ) ); // the page asks only who it's from and for
		if ( '' === sanitize_text_field( (string) ( $b['to'] ?? '' ) ) ) {
			return self::err( __( 'Add who the voucher is for.', 'agency-core' ) );
		}
		$amt = round( (float) ( $b['amt'] ?? 0 ), 2 );
		if ( $amt < (float) ( $r['min'] ?? 20 ) || $amt > (float) ( $r['max'] ?? 1000 ) ) {
			return self::err( __( 'Choose a voucher amount.', 'agency-core' ) );
		}
		$o       = wc_create_order(
			array(
				'status'      => 'pending',
				'created_via' => 'website',
			)
		);
		$item_id = $o->add_product(
			$p,
			1,
			array(
				'subtotal' => $amt,
				'total'    => $amt,
			)
		);
		$item    = $o->get_item( $item_id );
		$to      = sanitize_text_field( (string) ( $b['to'] ?? '' ) );
		$from    = sanitize_text_field( (string) ( $b['from'] ?? $who[0] ) );
		if ( $item ) {
			$item->add_meta_data( __( 'For', 'agency-core' ), $to, true );
			$item->add_meta_data( __( 'From', 'agency-core' ), $from, true );
			$msg = sanitize_textarea_field( (string) ( $b['msg'] ?? '' ) );
			if ( $msg ) {
				$item->add_meta_data( __( 'Message', 'agency-core' ), $msg, true );
			}
			$label = sanitize_text_field( (string) ( $b['label'] ?? '' ) );
			if ( $label ) {
				$item->add_meta_data( __( 'Experience', 'agency-core' ), $label, true );
			}
			$item->add_meta_data( '_agc_voucher', $amt, true );
			$item->save();
		}
		self::set_who( $o, $who );
		$o->calculate_totals( false );
		$go = self::pay( $o, 'online' );
		$o  = wc_get_order( $o->get_id() );
		return array(
			'order'  => $o->get_order_number(),
			'code'   => (string) $o->get_meta( '_agc_voucher_code' ),
			'amt'    => $amt,
			'expiry' => (string) $o->get_meta( '_agc_voucher_expiry' ),
			'payUrl' => $go,
		);
	}

	/**
	 * A paid voucher order gets its code (a WooCommerce coupon for that amount, one use, 12 months).
	 *
	 * @param int $order_id Order.
	 */
	public static function issue_vouchers( $order_id ) {
		$o = wc_get_order( $order_id );
		if ( ! $o || $o->get_meta( '_agc_voucher_code' ) ) {
			return;
		}
		$amt = 0.0;
		foreach ( $o->get_items() as $it ) {
			$amt += (float) $it->get_meta( '_agc_voucher' ) * max( 1, (int) $it->get_quantity() );
		}
		if ( $amt <= 0 ) {
			return;
		}
		$r      = (array) self::spec( 'voucher', array() );
		$months = max( 1, (int) ( $r['months'] ?? 12 ) );
		do {
			$code = strtoupper( (string) ( $r['prefix'] ?? 'GIFT-' ) . wp_generate_password( 6, false, false ) );
		} while ( wc_get_coupon_id_by_code( $code ) );
		$c   = new WC_Coupon();
		$exp = ( new DateTimeImmutable( 'now', wp_timezone() ) )->modify( '+' . $months . ' months' );
		$c->set_code( $code );
		$c->set_discount_type( 'fixed_cart' );
		$c->set_amount( $amt );
		$c->set_usage_limit( 1 );
		$c->set_date_expires( $exp->getTimestamp() );
		/* translators: %s: order number */
		$c->set_description( sprintf( __( 'Gift voucher bought with order #%s', 'agency-core' ), $o->get_order_number() ) );
		$c->save();
		$o->update_meta_data( '_agc_voucher_code', $code );
		$o->update_meta_data( '_agc_voucher_expiry', $exp->format( 'Y-m-d' ) );
		/* translators: %s: code */
		$o->add_order_note( sprintf( __( 'Gift voucher code: %s', 'agency-core' ), $code ) );
		$o->save();
	}

	/* ------------------------------------------------------------------ enquiries and order lookup */

	/**
	 * An enquiry (catering, private dining, corporate gifts…).
	 *
	 * Body: { type, name, phone, email, fields: { label: value } }
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_enquiry( $req ) {
		$b   = (array) $req->get_json_params();
		$who = self::who( $b );
		if ( is_wp_error( $who ) ) {
			return $who;
		}
		$type   = sanitize_text_field( (string) ( $b['type'] ?? __( 'Enquiry', 'agency-core' ) ) );
		$fields = array();
		foreach ( array_slice( (array) ( $b['fields'] ?? array() ), 0, 30, true ) as $k => $v ) {
			$fields[ sanitize_text_field( (string) $k ) ] = sanitize_textarea_field( is_array( $v ) ? implode( ', ', array_map( 'strval', $v ) ) : (string) $v );
		}
		$id = wp_insert_post(
			array(
				'post_type'   => self::ENQUIRY,
				'post_status' => 'publish',
				'post_title'  => $type . ' · ' . $who[0],
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return self::err( __( 'Sorry, your message could not be sent. Please try again.', 'agency-core' ), 500 );
		}
		$ref = self::prefix() . '-E' . $id;
		foreach (
			array(
				'_ref'    => $ref,
				'_type'   => $type,
				'_name'   => $who[0],
				'_phone'  => $who[1],
				'_email'  => $who[2],
				'_fields' => $fields,
				'_st'     => 'new',
			) as $mk => $mv
		) {
			update_post_meta( $id, $mk, $mv );
		}
		return array(
			'ref' => $ref,
			'id'  => $id,
		);
	}

	/**
	 * Track an order: order number + the phone number on it.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_track( $req ) {
		$b     = (array) $req->get_json_params();
		$ref   = strtoupper( sanitize_text_field( (string) ( $b['no'] ?? '' ) ) );
		$no    = (int) preg_replace( '/\D/', '', $ref );
		$phone = substr( preg_replace( '/\D/', '', (string) ( $b['phone'] ?? '' ) ), -7 );
		$o     = null;
		$hits  = wc_get_orders( array( 'limit' => 1, 'meta_key' => self::REF, 'meta_value' => $ref ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
		if ( $hits ) {
			$o = $hits[0]; // a reference of its own (the demo's sample order DD-2041)
		} elseif ( $no ) {
			$o = wc_get_order( $no );
		}
		if ( ! $o || strlen( $phone ) < 7 || substr( preg_replace( '/\D/', '', (string) $o->get_billing_phone() ), -7 ) !== $phone ) {
			return self::err( __( 'We couldn’t find that order. Check the order number and the phone number you used.', 'agency-core' ), 404 );
		}
		$items = array();
		foreach ( $o->get_items() as $it ) {
			$items[] = array(
				'n'   => $it->get_name(),
				'qty' => (int) $it->get_quantity(),
			);
		}
		$st   = $o->get_status();
		$trk  = (string) $o->get_meta( '_agc_tracking' );
		$step = in_array( $st, array( 'pending', 'on-hold', 'failed' ), true ) ? 'New' : ( 'processing' === $st ? 'Paid' : ( 'agc-ready' === $st ? 'Packed' : ( 'completed' === $st ? ( $o->get_meta( '_agc_delivered' ) || ! $trk ? 'Delivered' : 'Shipped' ) : 'Paid' ) ) );
		return array(
			'st'      => $step,
			'phone'   => (string) $o->get_billing_phone(),
			'when'    => $o->get_date_created() ? $o->get_date_created()->date( 'Y-m-d' ) : '',
			'no'      => $o->get_meta( self::REF ) ? (string) $o->get_meta( self::REF ) : self::prefix() . '-' . $o->get_order_number(),
			'status'  => $st,
			'label'   => wc_get_order_status_name( $st ),
			'date'    => $o->get_date_created() ? $o->get_date_created()->date_i18n( 'j M Y' ) : '',
			'items'   => $items,
			'total'   => (float) $o->get_total(),
			'tracking' => (string) $o->get_meta( '_agc_tracking' ),
			'courier'  => (string) $o->get_meta( '_agc_courier' ),
			'pre'      => $o->get_meta( '_agc_fest' ) ? self::pre_detail( $o ) : null,
		);
	}

	/**
	 * A festival pre-order as the shop's order page shows it.
	 *
	 * @param WC_Order $o Order.
	 * @return array
	 */
	private static function pre_detail( $o ) {
		$items = array();
		foreach ( $o->get_items() as $it ) {
			$items[] = array(
				'id'   => (string) $it->get_meta( '_agc_item' ),
				'opt'  => (string) $it->get_meta( '_agc_opt' ),
				'pers' => (string) $it->get_meta( __( 'Note', 'agency-core' ) ),
				'qty'  => (int) $it->get_quantity(),
				'unit' => $it->get_quantity() ? (float) $it->get_subtotal() / (int) $it->get_quantity() : 0,
			);
		}
		$disc = 0.0;
		foreach ( $o->get_fees() as $fe ) {
			$disc -= (float) $fe->get_total();
		}
		$st   = $o->get_status();
		$gift = (array) $o->get_meta( '_agc_gift' );
		return array(
			'fest'   => (string) $o->get_meta( '_agc_fest' ),
			'status' => in_array( $st, array( 'on-hold', 'pending' ), true ) ? 'verify' : ( 'agc-ready' === $st ? 'ready' : ( 'completed' === $st ? 'done' : 'paid' ) ),
			'mode'   => (string) $o->get_meta( '_agc_pmode' ),
			'date'   => (string) $o->get_meta( AGC_Festive::DATE ),
			'slot'   => 'courier' === $o->get_meta( '_agc_pmode' ) ? '' : (string) $o->get_meta( AGC_Festive::SLOT ),
			'addr'   => (string) $o->get_shipping_address_1(),
			'pc'     => (string) $o->get_shipping_postcode(),
			'name'   => (string) $o->get_billing_first_name(),
			'phone'  => (string) $o->get_billing_phone(),
			'email'  => (string) $o->get_billing_email(),
			'gift'   => ! empty( $gift['name'] ) ? $gift : null,
			'notes'  => (string) $o->get_meta( '_agc_notes' ),
			'pm'     => $o->get_meta( '_agc_pm' ) ? (string) $o->get_meta( '_agc_pm' ) : ( 'agc_duitnow' === $o->get_payment_method() ? 'duitnow' : 'fpx' ),
			'bank'   => (string) $o->get_meta( '_agc_bank' ),
			'receipt' => (string) $o->get_meta( '_agc_receipt_name' ),
			'items'  => $items,
			'sub'    => (float) $o->get_subtotal(),
			'disc'   => $disc,
			'fee'    => (float) $o->get_shipping_total(),
			'total'  => (float) $o->get_total(),
			'at'     => $o->get_date_created() ? $o->get_date_created()->getTimestamp() * 1000 : 0,
		);
	}

	/* ------------------------------------------------------------------ WordPress admin: bookings and enquiries */

	/**
	 * Post types (always registered, so old records stay readable; shown only on sites with a design).
	 */
	public static function types() {
		$caps = array(
			'edit_post'          => 'edit_shop_orders',
			'read_post'          => 'edit_shop_orders',
			'delete_post'        => 'delete_shop_orders',
			'edit_posts'         => 'edit_shop_orders',
			'edit_others_posts'  => 'edit_shop_orders',
			'publish_posts'      => 'edit_shop_orders',
			'read_private_posts' => 'edit_shop_orders',
			'delete_posts'       => 'delete_shop_orders',
			'create_posts'       => 'edit_shop_orders', // "do_not_allow" makes WordPress refuse the whole list; Add New is hidden below.
		);
		$show = self::on();
		register_post_type(
			self::BOOKING,
			array(
				'labels'        => array(
					'name'          => __( 'Bookings', 'agency-core' ),
					'singular_name' => __( 'Booking', 'agency-core' ),
					'edit_item'     => __( 'Booking', 'agency-core' ),
				),
				'public'        => false,
				'show_ui'       => $show,
				'show_in_menu'  => $show,
				'menu_icon'     => 'dashicons-calendar-alt',
				'menu_position' => 56,
				'supports'      => array( 'title' ),
				'capabilities'  => $caps,
				'map_meta_cap'  => false,
			)
		);
		register_post_type(
			self::ENQUIRY,
			array(
				'labels'        => array(
					'name'          => __( 'Enquiries', 'agency-core' ),
					'singular_name' => __( 'Enquiry', 'agency-core' ),
					'edit_item'     => __( 'Enquiry', 'agency-core' ),
				),
				'public'        => false,
				'show_ui'       => $show,
				'show_in_menu'  => $show,
				'menu_icon'     => 'dashicons-email-alt',
				'menu_position' => 57,
				'supports'      => array( 'title' ),
				'capabilities'  => $caps,
				'map_meta_cap'  => false,
			)
		);
	}

	/**
	 * Status choices.
	 *
	 * @param string $type Post type.
	 * @return array
	 */
	public static function states( $type ) {
		return self::BOOKING === $type ? array(
			'new'       => __( 'New', 'agency-core' ),
			'deposit'   => __( 'Waiting for deposit', 'agency-core' ),
			'waitlist'  => __( 'Waitlist', 'agency-core' ),
			'confirmed' => __( 'Confirmed', 'agency-core' ),
			'seated'    => __( 'Seated', 'agency-core' ),
			'no-show'   => __( 'No-show', 'agency-core' ),
			'cancelled' => __( 'Cancelled', 'agency-core' ),
		) : array(
			'new'     => __( 'New', 'agency-core' ),
			'replied' => __( 'Replied', 'agency-core' ),
			'won'     => __( 'Booked / ordered', 'agency-core' ),
			'closed'  => __( 'Closed', 'agency-core' ),
		);
	}

	/**
	 * List columns.
	 *
	 * @param array $c Columns.
	 * @return array
	 */
	public static function cols( $c ) {
		$is_booking = isset( $_GET['post_type'] ) && self::BOOKING === $_GET['post_type']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return array(
			'cb'        => $c['cb'] ?? '',
			'title'     => $is_booking ? __( 'Booking', 'agency-core' ) : __( 'Enquiry', 'agency-core' ),
			'agc_ref'   => __( 'Ref', 'agency-core' ),
			'agc_when'  => $is_booking ? __( 'When', 'agency-core' ) : __( 'Details', 'agency-core' ),
			'agc_phone' => __( 'Phone', 'agency-core' ),
			'agc_st'    => __( 'Status', 'agency-core' ),
			'date'      => __( 'Received', 'agency-core' ),
		);
	}

	/**
	 * A column.
	 *
	 * @param string $col Column.
	 * @param int    $id  Post.
	 */
	public static function col( $col, $id ) {
		$type = get_post_type( $id );
		switch ( $col ) {
			case 'agc_ref':
				echo esc_html( (string) get_post_meta( $id, '_ref', true ) );
				break;
			case 'agc_when':
				if ( self::BOOKING === $type ) {
					$seat = (string) get_post_meta( $id, '_seat', true );
					echo esc_html( wp_date( 'D j M', strtotime( get_post_meta( $id, '_date', true ) . ' 12:00' ) ) . ' · ' . self::hm( (int) get_post_meta( $id, '_time', true ) ) . ' · ' . (int) get_post_meta( $id, '_pax', true ) . ' ' . __( 'guests', 'agency-core' ) . ( $seat ? ' · ' . $seat : '' ) );
				} else {
					$f = (array) get_post_meta( $id, '_fields', true );
					echo esc_html( implode( ' · ', array_slice( array_filter( array_map( 'strval', $f ) ), 0, 4 ) ) );
				}
				break;
			case 'agc_phone':
				echo esc_html( (string) get_post_meta( $id, '_phone', true ) );
				break;
			case 'agc_st':
				$s = self::states( $type );
				echo esc_html( $s[ (string) get_post_meta( $id, '_st', true ) ] ?? '' );
				break;
		}
	}

	/**
	 * Details box.
	 */
	public static function boxes() {
		foreach ( array( self::BOOKING, self::ENQUIRY ) as $t ) {
			add_meta_box(
				'agc_site_details',
				__( 'Details', 'agency-core' ),
				static function ( $post ) {
					$type = $post->post_type;
					$rows = array( __( 'Ref', 'agency-core' ) => get_post_meta( $post->ID, '_ref', true ) );
					if ( self::BOOKING === $type ) {
						$rows += array(
							__( 'Day', 'agency-core' )      => wp_date( 'l j F Y', strtotime( get_post_meta( $post->ID, '_date', true ) . ' 12:00' ) ),
							__( 'Time', 'agency-core' )     => self::hm( (int) get_post_meta( $post->ID, '_time', true ) ),
							__( 'Guests', 'agency-core' )   => get_post_meta( $post->ID, '_pax', true ),
							__( 'Seating', 'agency-core' )  => get_post_meta( $post->ID, '_seat', true ),
							__( 'Occasion', 'agency-core' ) => get_post_meta( $post->ID, '_occ', true ),
							__( 'Notes', 'agency-core' )    => get_post_meta( $post->ID, '_notes', true ),
						);
						foreach ( (array) get_post_meta( $post->ID, '_extra', true ) as $k => $v ) {
							$rows[ ucfirst( str_replace( '_', ' ', (string) $k ) ) ] = $v;
						}
						$oid = (int) get_post_meta( $post->ID, '_order', true );
						if ( $oid ) {
							$rows[ __( 'Deposit order', 'agency-core' ) ] = '#' . $oid;
						}
					} else {
						$rows[ __( 'Type', 'agency-core' ) ] = get_post_meta( $post->ID, '_type', true );
						foreach ( (array) get_post_meta( $post->ID, '_fields', true ) as $k => $v ) {
							$rows[ $k ] = $v;
						}
					}
					$rows += array(
						__( 'Name', 'agency-core' )  => get_post_meta( $post->ID, '_name', true ),
						__( 'Phone', 'agency-core' ) => get_post_meta( $post->ID, '_phone', true ),
						__( 'Email', 'agency-core' ) => get_post_meta( $post->ID, '_email', true ),
					);
					echo '<table class="widefat striped" style="max-width:640px"><tbody>';
					foreach ( $rows as $k => $v ) {
						if ( '' !== (string) $v ) {
							echo '<tr><th style="width:160px">' . esc_html( (string) $k ) . '</th><td>' . nl2br( esc_html( (string) $v ) ) . '</td></tr>';
						}
					}
					echo '</tbody></table>';
					wp_nonce_field( 'agc_site_st', 'agc_site_st_nonce' );
					echo '<p><label><b>' . esc_html__( 'Status', 'agency-core' ) . '</b> <select name="agc_site_st">';
					foreach ( self::states( $type ) as $k => $v ) {
						echo '<option value="' . esc_attr( $k ) . '"' . selected( get_post_meta( $post->ID, '_st', true ), $k, false ) . '>' . esc_html( $v ) . '</option>';
					}
					echo '</select></label></p>';
				},
				$t,
				'normal',
				'high'
			);
		}
	}

	/**
	 * Save the status.
	 *
	 * @param int $id Post.
	 */
	public static function save_box( $id ) {
		if ( ! isset( $_POST['agc_site_st_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['agc_site_st_nonce'] ) ), 'agc_site_st' ) || ! current_user_can( 'edit_shop_orders' ) ) {
			return;
		}
		$st = sanitize_key( wp_unslash( $_POST['agc_site_st'] ?? '' ) );
		if ( isset( self::states( get_post_type( $id ) )[ $st ] ) ) {
			update_post_meta( $id, '_st', $st );
		}
	}
}
