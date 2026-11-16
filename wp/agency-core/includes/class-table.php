<?php
/**
 * Table QR ordering (2026-11-15, agency-core 1.8.0).
 *
 * - Every table has its own QR: /table/?t=<table>&k=<key>. The key is an HMAC of the table name with a secret kept in
 *   the database, so tables cannot be guessed and printed QR codes keep working (until the shop's domain changes).
 * - Customers see the menu on their phone, order, and pay at the counter. Each order is a WooCommerce order
 *   (on-hold = not paid yet) with the table in _agc_table, so stock, reports and Excel keep working.
 * - Kitchen screen and tables / bill screen are in the shop dashboard (/dian/#/kitchen, #/tables), REST below.
 * - Menu: the shop's own design (skin) data.json when the skin is on (same items, options and photos), otherwise the
 *   published simple products. Prices always come from WooCommerce, never from the browser.
 *
 * Not included (on purpose): paying at the table, connecting to the shop's cashier system, kitchen printers.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Table ordering.
 */
class AGC_Table {

	const NS      = 'agc/v1';
	const META    = '_agc_table';
	const KITCHEN = '_agc_kitchen';
	const DONE_AT = '_agc_kitchen_at';
	const PAID_BY = '_agc_paid_by';
	const SECRET  = 'agc_table_secret';

	/**
	 * Hooks.
	 */
	public static function init() {
		// Table orders never email the shop (the kitchen screen shows them) nor the customer (no email address).
		foreach ( array( 'new_order', 'customer_on_hold_order', 'customer_processing_order', 'customer_completed_order', 'cancelled_order' ) as $e ) {
			add_filter( 'woocommerce_email_enabled_' . $e, array( __CLASS__, 'no_email' ), 20, 2 );
		}
		if ( ! self::on() ) {
			return;
		}
		add_action( 'template_redirect', array( __CLASS__, 'route' ), 0 );
		add_action( 'rest_api_init', array( __CLASS__, 'rest' ) );
	}

	/**
	 * Switched on?
	 *
	 * @return bool
	 */
	public static function on() {
		return (bool) agc_get( 'table_on' );
	}

	/**
	 * Is this a table order?
	 *
	 * @param WC_Order|mixed $o Order.
	 * @return bool
	 */
	public static function is_table( $o ) {
		return $o instanceof WC_Order && '' !== (string) $o->get_meta( self::META );
	}

	/**
	 * Still open at the table (not paid, not cancelled)?
	 *
	 * @param WC_Order $o Order.
	 * @return bool
	 */
	public static function is_open( $o ) {
		return self::is_table( $o ) && in_array( $o->get_status(), array( 'on-hold', 'pending', 'processing' ), true ) && ! $o->get_date_paid();
	}

	/**
	 * Skip WooCommerce emails for table orders.
	 *
	 * @param bool  $enabled Enabled.
	 * @param mixed $order   Order (or other object).
	 * @return bool
	 */
	public static function no_email( $enabled, $order = null ) {
		return self::is_table( $order ) ? false : $enabled;
	}

	/* ------------------------------------------------------------------ tables and keys */

	/**
	 * Table names from the setting: "1-12", "1,2,3,Patio" or a mix ("1-8, Bar 1, Bar 2").
	 *
	 * @return string[]
	 */
	public static function tables() {
		$out = array();
		foreach ( preg_split( '/[,\n]+/', (string) agc_get( 'table_list' ) ) as $part ) {
			$part = trim( $part );
			if ( preg_match( '/^(\d{1,3})\s*-\s*(\d{1,3})$/', $part, $m ) ) {
				$a = (int) $m[1];
				$b = (int) $m[2];
				for ( $i = min( $a, $b ); $i <= max( $a, $b ) && count( $out ) < 200; $i++ ) {
					$out[] = (string) $i;
				}
			} elseif ( '' !== $part ) {
				$out[] = self::clean( $part );
			}
		}
		return array_values( array_unique( array_filter( array_slice( $out, 0, 200 ), 'strlen' ) ) );
	}

	/**
	 * A table name as it may appear in a link: letters, digits, spaces, dashes; at most 16 characters.
	 *
	 * @param string $t Name.
	 * @return string
	 */
	public static function clean( $t ) {
		return mb_substr( trim( preg_replace( '/[^\p{L}\p{N} \-]+/u', '', (string) $t ) ), 0, 16 );
	}

	/**
	 * Secret for the table keys (made once, kept in the database).
	 *
	 * @return string
	 */
	private static function secret() {
		$s = (string) get_option( self::SECRET, '' );
		if ( strlen( $s ) < 20 ) {
			$s = wp_generate_password( 40, false, false );
			update_option( self::SECRET, $s, false );
		}
		return $s;
	}

	/**
	 * Key for one table.
	 *
	 * @param string $t Table.
	 * @return string
	 */
	public static function key( $t ) {
		return substr( hash_hmac( 'sha256', 'table|' . $t, self::secret() ), 0, 10 );
	}

	/**
	 * QR link for one table.
	 *
	 * @param string $t Table.
	 * @return string
	 */
	public static function link( $t ) {
		return add_query_arg(
			array(
				't' => rawurlencode( $t ),
				'k' => self::key( $t ),
			),
			home_url( '/table/' )
		);
	}

	/**
	 * Table name if the table and key are right, else ''.
	 *
	 * @param string $t Table.
	 * @param string $k Key.
	 * @return string
	 */
	public static function check( $t, $k ) {
		$t = self::clean( rawurldecode( (string) $t ) );
		if ( '' === $t || ! in_array( $t, self::tables(), true ) ) {
			return '';
		}
		return hash_equals( self::key( $t ), (string) $k ) ? $t : '';
	}

	/* ------------------------------------------------------------------ menu */

	/**
	 * What the table menu shows: categories and items with live prices.
	 *
	 * @return array{cats: array, items: array}
	 */
	public static function menu() {
		$only  = array_filter( array_map( 'sanitize_title', explode( ',', (string) agc_get( 'table_cats' ) ) ) );
		$cats  = array();
		$items = array();
		if ( class_exists( 'AGC_Skin' ) && AGC_Skin::on() ) {
			$d     = AGC_Skin::data();
			$named = array();
			foreach ( (array) ( $d['cats'] ?? array() ) as $c ) {
				if ( is_array( $c ) && isset( $c[0], $c[1] ) ) {
					$named[ (string) $c[0] ] = (string) $c[1];
				}
			}
			foreach ( $d['menu'] as $it ) {
				$id  = (string) ( $it['id'] ?? '' );
				$cat = (string) ( $it['cat'] ?? '' );
				if ( '' === $id || ( $only && ! in_array( $cat, $only, true ) ) ) {
					continue;
				}
				$p = self::product( $id );
				if ( ! $p || 'publish' !== $p->get_status() || '' === (string) $p->get_price() ) {
					continue; // no price yet: not on the table menu.
				}
				$cats[ $cat ] = $named[ $cat ] ?? ucwords( str_replace( array( '-', '_' ), ' ', $cat ) );
				$img          = array_key_exists( 'img', $it ) && false === $it['img'] ? '' : AGC_Skin::url() . '/img/' . ( ! empty( $it['img'] ) ? $it['img'] : $id ) . '.webp';
				$items[]      = array(
					'id'   => $id,
					'cat'  => $cat,
					'n'    => (string) ( $it['n'] ?? $p->get_name() ),
					'd'    => (string) ( $it['d'] ?? '' ),
					'p'    => (float) $p->get_price(),
					'img'  => $img,
					'o'    => array_values( (array) ( $it['o'] ?? array() ) ),
					'tags' => array_values( array_intersect( (array) ( $it['tags'] ?? array() ), array( 'pop', 'new', 'chef', 'hot' ) ) ),
					'sold' => ! $p->is_in_stock(),
					'left' => $p->managing_stock() && null !== $p->get_stock_quantity() ? max( 0, (int) $p->get_stock_quantity() ) : null,
				);
			}
		} else {
			foreach ( wc_get_products( array( 'limit' => 300, 'status' => 'publish', 'type' => 'simple', 'orderby' => 'menu_order', 'order' => 'ASC' ) ) as $p ) {
				if ( '' === (string) $p->get_price() ) {
					continue;
				}
				$terms = get_the_terms( $p->get_id(), 'product_cat' );
				$term  = is_array( $terms ) && $terms ? $terms[0] : null;
				$cat   = $term ? $term->slug : 'menu';
				if ( $only && ! in_array( $cat, $only, true ) ) {
					continue;
				}
				$cats[ $cat ] = $term ? html_entity_decode( $term->name, ENT_QUOTES, 'UTF-8' ) : __( 'Menu', 'agency-core' );
				$img          = $p->get_image_id() ? wp_get_attachment_image_url( $p->get_image_id(), 'woocommerce_thumbnail' ) : '';
				$items[]      = array(
					'id'   => 'p' . $p->get_id(),
					'cat'  => $cat,
					'n'    => html_entity_decode( $p->get_name(), ENT_QUOTES, 'UTF-8' ),
					'd'    => wp_strip_all_tags( $p->get_short_description() ),
					'p'    => (float) $p->get_price(),
					'img'  => $img ? $img : '',
					'o'    => array(),
					'tags' => $p->is_featured() ? array( 'pop' ) : array(),
					'sold' => ! $p->is_in_stock(),
					'left' => $p->managing_stock() && null !== $p->get_stock_quantity() ? max( 0, (int) $p->get_stock_quantity() ) : null,
				);
			}
		}
		return array(
			'cats'  => array_map( static fn( $k, $v ) => array( $k, $v ), array_keys( $cats ), $cats ),
			'items' => $items,
		);
	}

	/**
	 * Product for a menu id: the skin item's SKU, or p<product id>.
	 *
	 * @param string $id Menu id.
	 * @return WC_Product|null
	 */
	private static function product( $id ) {
		if ( preg_match( '/^p(\d+)$/', $id, $m ) && ! ( class_exists( 'AGC_Skin' ) && AGC_Skin::on() ) ) {
			$p = wc_get_product( (int) $m[1] );
		} else {
			$pid = wc_get_product_id_by_sku( $id );
			$p   = $pid ? wc_get_product( $pid ) : null;
		}
		return $p && 'trash' !== $p->get_status() ? $p : null;
	}

	/**
	 * Why ordering is not possible right now ('' = it is).
	 *
	 * @return string
	 */
	public static function stopped() {
		if ( agc_get( 'shop_paused' ) ) {
			return __( 'Ordering here is paused right now. Please order at the counter.', 'agency-core' );
		}
		if ( agc_get( 'demo_mode' ) && ! agc_get( 'demo_test_orders' ) ) {
			return (string) agc_get( 'demo_checkout_notice' );
		}
		return '';
	}

	/* ------------------------------------------------------------------ the customer's page */

	/**
	 * /table/ page.
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
		if ( 'table' !== $path ) {
			return;
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow', true );
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- the table key is the check.
		$t = self::check( isset( $_GET['t'] ) ? sanitize_text_field( wp_unslash( $_GET['t'] ) ) : '', isset( $_GET['k'] ) ? sanitize_text_field( wp_unslash( $_GET['k'] ) ) : '' );
		// phpcs:enable
		self::page( $t );
		exit;
	}

	/**
	 * Print the page.
	 *
	 * @param string $t Table ('' = bad QR).
	 */
	private static function page( $t ) {
		$site  = html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' );
		$zh    = 0 === strpos( get_locale(), 'zh' );
		$skin  = class_exists( 'AGC_Skin' ) && AGC_Skin::on();
		$fonts = '';
		$css   = '';
		if ( $skin ) {
			$idx = (string) file_get_contents( AGC_Skin::dir() . '/index.html' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			if ( preg_match_all( '#<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>#', $idx, $m ) ) {
				$fonts = implode( "\n", $m[0] );
			}
			$css = AGC_Skin::url() . '/style.css?v=' . substr( md5( (string) @filemtime( AGC_Skin::dir() . '/style.css' ) ), 0, 8 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
		$accent = (string) agc_get( 'accent_color' );
		$accent = preg_match( '/^#[0-9a-fA-F]{6}$/', $accent ) ? $accent : '';
		$hero   = '';
		$logo   = '';
		if ( $skin ) {
			$d = AGC_Skin::data();
			foreach ( array( (string) ( $d['table_hero'] ?? '' ), 'hero' ) as $h ) {
				if ( '' !== $h && preg_match( '/^[a-z0-9-]+$/', $h ) && file_exists( AGC_Skin::dir() . '/img/' . $h . '.webp' ) ) {
					$hero = AGC_Skin::url() . '/img/' . $h . '.webp';
					break;
				}
			}
			if ( preg_match( '#<a class="logo"[^>]*>\s*(<svg[^>]*>.*?</svg>)#s', $idx, $m ) ) {
				$logo = $m[1]; // the shop's own logo mark from its design files.
			}
		} elseif ( get_site_icon_url( 96 ) ) {
			$logo = '<img src="' . esc_url( get_site_icon_url( 96 ) ) . '" alt="">';
		}
		$ver    = AGC_VERSION . '.' . (int) @filemtime( AGC_DIR . 'assets/table/table.js' ) . '.' . (int) @filemtime( AGC_DIR . 'assets/table/table.css' ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		$cfg    = array(
			'table'   => $t,
			'key'     => $t ? self::key( $t ) : '',
			'rest'    => esc_url_raw( rest_url( self::NS . '/table/' ) ),
			'site'    => $site,
			'shop'    => home_url( '/' ),
			'zh'      => $zh,
			'cur'     => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'menu'    => $t ? self::menu() : array( 'cats' => array(), 'items' => array() ),
			'note'    => (string) agc_get( 'table_note' ),
			'stopped' => $t ? self::stopped() : '',
			'demo'    => (bool) agc_get( 'demo_mode' ),
			'hero'    => $hero,
			'logo'    => $logo,
			'address' => (string) agc_get( 'business_address' ),
			'hours'   => (string) agc_get( 'business_hours' ),
		);
		/* translators: 1: table, 2: shop */
		$title = $t ? sprintf( __( 'Table %1$s · %2$s', 'agency-core' ), $t, $site ) : $site;
		status_header( $t ? 200 : 404 );
		header( 'Content-Type: text/html; charset=utf-8' );
		?>
<!doctype html>
<html lang="<?php echo esc_attr( $zh ? 'zh-Hans' : 'en' ); ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#fbf8f2">
<title><?php echo esc_html( $title ); ?></title>
		<?php echo $fonts; // phpcs:ignore WordPress.Security.EscapeOutput -- the skin's own font links. ?>
		<?php if ( $css ) : ?>
<link rel="stylesheet" href="<?php echo esc_url( $css ); ?>">
		<?php endif; ?>
<link rel="stylesheet" href="<?php echo esc_url( AGC_URL . 'assets/table/table.css?v=' . $ver ); ?>">
		<?php if ( $accent ) : ?>
<style>:root{--tq-accent:<?php echo esc_html( $accent ); ?>}</style>
		<?php endif; ?>
</head>
<body class="tq<?php echo $skin ? ' tq--skin' : ''; ?>">
<div id="tq" class="tq-app"><p class="tq-boot"><?php echo esc_html( $zh ? '载入中…' : 'Loading…' ); ?></p></div>
<noscript><p class="tq-boot"><?php esc_html_e( 'Please turn on JavaScript to order.', 'agency-core' ); ?></p></noscript>
<script>window.AGC_TABLE = <?php echo wp_json_encode( $cfg, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?>;</script>
<script src="<?php echo esc_url( AGC_URL . 'assets/table/table.js?v=' . $ver ); ?>"></script>
</body>
</html>
		<?php
	}

	/* ------------------------------------------------------------------ REST: customer */

	/**
	 * Routes.
	 */
	public static function rest() {
		register_rest_route( self::NS, '/table/order', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_order' ), 'permission_callback' => array( __CLASS__, 'same_site' ) ) );
		register_rest_route( self::NS, '/table/status', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'rest_status' ), 'permission_callback' => '__return_true' ) );
		$staff = static fn() => current_user_can( 'edit_shop_orders' );
		register_rest_route( self::NS, '/owner/kitchen', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'kitchen' ), 'permission_callback' => $staff ) );
		register_rest_route( self::NS, '/owner/kitchen/(?P<id>\d+)', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'kitchen_mark' ), 'permission_callback' => $staff ) );
		register_rest_route( self::NS, '/owner/tables', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'tables_screen' ), 'permission_callback' => $staff ) );
		register_rest_route( self::NS, '/owner/tables/pay', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'pay' ), 'permission_callback' => $staff ) );
		register_rest_route( self::NS, '/owner/tables/cancel/(?P<id>\d+)', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'cancel' ), 'permission_callback' => $staff ) );
	}

	/**
	 * Only from this website's own pages.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return bool|WP_Error
	 */
	public static function same_site( $req ) {
		$host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		foreach ( array( 'origin', 'referer' ) as $h ) {
			$v = (string) $req->get_header( $h );
			if ( '' !== $v ) {
				return (string) wp_parse_url( $v, PHP_URL_HOST ) === $host ? true : new WP_Error( 'agc_table_site', __( 'Please order from the table QR code.', 'agency-core' ), array( 'status' => 403 ) );
			}
		}
		return new WP_Error( 'agc_table_site', __( 'Please order from the table QR code.', 'agency-core' ), array( 'status' => 403 ) );
	}

	/**
	 * Place a table order.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_order( $req ) {
		$err = static fn( $m, $s = 400 ) => new WP_Error( 'agc_table_order', $m, array( 'status' => $s ) );
		$b   = (array) $req->get_json_params();
		$t   = self::check( (string) ( $b['t'] ?? '' ), (string) ( $b['k'] ?? '' ) );
		if ( '' === $t ) {
			return $err( __( 'This QR code is not valid any more. Please ask our staff.', 'agency-core' ), 403 );
		}
		$stop = self::stopped();
		if ( '' !== $stop ) {
			return $err( $stop, 409 );
		}
		// A table sends a few orders an hour at most; stop floods.
		$flood = 'agc_tq_' . md5( $t );
		$n     = (int) get_transient( $flood );
		if ( $n >= 20 ) {
			return $err( __( 'Too many orders from this table. Please ask our staff.', 'agency-core' ), 429 );
		}
		$menu  = array_column( self::menu()['items'], null, 'id' );
		$lines = array();
		foreach ( array_slice( (array) ( $b['items'] ?? array() ), 0, 40 ) as $row ) {
			$id  = sanitize_title( (string) ( $row['id'] ?? '' ) );
			$qty = max( 1, min( 30, (int) ( $row['qty'] ?? 1 ) ) );
			$it  = $menu[ $id ] ?? null;
			$p   = $it ? self::product( $id ) : null;
			if ( ! $p ) {
				return $err( __( 'Something in your order is no longer on the menu. Please check your order again.', 'agency-core' ), 409 );
			}
			if ( ! $p->is_in_stock() ) {
				/* translators: %s: product */
				return $err( sprintf( __( '%s has just sold out. Please check your order again.', 'agency-core' ), $p->get_name() ), 409 );
			}
			if ( $p->managing_stock() && null !== $p->get_stock_quantity() && $p->get_stock_quantity() < $qty ) {
				/* translators: 1: product, 2: left */
				return $err( sprintf( __( 'Only %2$d left of %1$s.', 'agency-core' ), $p->get_name(), max( 0, (int) $p->get_stock_quantity() ) ), 409 );
			}
			$unit = (float) $p->get_price();
			$opts = array();
			$sel  = (array) ( $row['sel'] ?? array() );
			foreach ( $it['o'] as $gi => $g ) {
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
						$unit  += (float) ( $v[1] ?? 0 );
						$opts[] = (string) $v[0];
					}
				}
			}
			$lines[] = array( $p, $qty, $unit, implode( ', ', $opts ), mb_substr( sanitize_text_field( (string) ( $row['note'] ?? '' ) ), 0, 120 ) );
		}
		if ( ! $lines ) {
			return $err( __( 'Your order is empty.', 'agency-core' ) );
		}

		$o = wc_create_order(
			array(
				'status'      => 'pending',
				'created_via' => 'table',
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
			if ( $item && $x[3] ) {
				$item->add_meta_data( __( 'Options', 'agency-core' ), $x[3], true );
			}
			if ( $item && $x[4] ) {
				$item->add_meta_data( __( 'Note', 'agency-core' ), $x[4], true );
			}
			if ( $item ) {
				$item->save();
			}
		}
		/* translators: %s: table */
		$o->set_billing_first_name( sprintf( __( 'Table %s', 'agency-core' ), $t ) );
		$o->set_billing_country( 'MY' );
		$o->update_meta_data( self::META, $t );
		$o->update_meta_data( self::KITCHEN, 'new' );
		$note = mb_substr( sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) ), 0, 300 );
		if ( $note ) {
			$o->set_customer_note( $note );
		}
		$o->set_payment_method( '' );
		$o->set_payment_method_title( __( 'Pay at the counter', 'agency-core' ) );
		$o->calculate_totals( false );
		if ( isset( $b['total'] ) && abs( (float) $b['total'] - (float) $o->get_total() ) > 0.01 ) {
			$o->delete( true );
			return $err( __( 'Some prices have just changed. Please check your order again.', 'agency-core' ), 409 );
		}
		$o->save();
		/* translators: %s: table */
		$o->update_status( 'on-hold', sprintf( __( 'Table order (table %s): pay at the counter.', 'agency-core' ), $t ) );
		wc_maybe_reduce_stock_levels( $o->get_id() );
		set_transient( $flood, $n + 1, HOUR_IN_SECONDS );
		return array(
			'id'     => $o->get_id(),
			'number' => $o->get_order_number(),
			'key'    => $o->get_order_key(),
			'total'  => (float) $o->get_total(),
		);
	}

	/**
	 * Where an order is (for the customer's phone): ?o=<id>&k=<order key>, several as o=1,2&k=a,b.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function rest_status( $req ) {
		$ids  = array_slice( array_map( 'absint', explode( ',', (string) $req->get_param( 'o' ) ) ), 0, 20 );
		$keys = array_slice( explode( ',', sanitize_text_field( (string) $req->get_param( 'k' ) ) ), 0, 20 );
		$out  = array();
		foreach ( $ids as $i => $id ) {
			$o = $id ? wc_get_order( $id ) : null;
			if ( ! $o || ! self::is_table( $o ) || ! hash_equals( $o->get_order_key(), (string) ( $keys[ $i ] ?? '' ) ) ) {
				continue;
			}
			$st = $o->get_status();
			$out[] = array(
				'id'      => $o->get_id(),
				'number'  => $o->get_order_number(),
				'state'   => 'cancelled' === $st ? 'cancelled' : ( $o->get_date_paid() ? 'paid' : ( 'done' === $o->get_meta( self::KITCHEN ) ? 'ready' : 'kitchen' ) ),
				'total'   => (float) $o->get_total(),
			);
		}
		nocache_headers();
		return array( 'orders' => $out );
	}

	/* ------------------------------------------------------------------ REST: shop dashboard */

	/**
	 * Table orders of the last two days (newest first).
	 *
	 * @return WC_Order[]
	 */
	private static function recent() {
		return array_filter(
			wc_get_orders(
				array(
					'limit'        => 500,
					'type'         => 'shop_order',
					'status'       => array( 'on-hold', 'pending', 'processing', 'completed', 'cancelled' ),
					'orderby'      => 'date',
					'order'        => 'DESC',
					'date_created' => '>=' . ( time() - 2 * DAY_IN_SECONDS ),
				)
			),
			array( __CLASS__, 'is_table' )
		);
	}

	/**
	 * Money as plain text.
	 *
	 * @param float $v Amount.
	 * @return string
	 */
	private static function money( $v ) {
		return html_entity_decode( wp_strip_all_tags( wc_price( (float) $v ) ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * An order as the kitchen and the bill need it.
	 *
	 * @param WC_Order $o Order.
	 * @return array
	 */
	private static function row( $o ) {
		$items = array();
		// The item meta keys were written in the shop's language when the customer ordered; staff may use another.
		$get = static function ( $it, $keys ) {
			foreach ( array_unique( $keys ) as $k ) {
				$v = (string) $it->get_meta( $k );
				if ( '' !== $v ) {
					return $v;
				}
			}
			return '';
		};
		foreach ( $o->get_items() as $it ) {
			$opts = $get( $it, array( __( 'Options', 'agency-core' ), 'Options', '选项' ) );
			$note = $get( $it, array( __( 'Note', 'agency-core' ), 'Note', '备注' ) );
			$items[] = array(
				'qty'   => (int) $it->get_quantity(),
				'name'  => $it->get_name(),
				'opts'  => $opts,
				'note'  => $note,
				'total' => self::money( (float) $it->get_total() ),
			);
		}
		$done = 'done' === $o->get_meta( self::KITCHEN );
		return array(
			'id'      => $o->get_id(),
			'number'  => $o->get_order_number(),
			'table'   => (string) $o->get_meta( self::META ),
			'created' => $o->get_date_created() ? $o->get_date_created()->getTimestamp() : 0,
			'done'    => $done,
			'done_at' => (int) $o->get_meta( self::DONE_AT ),
			'items'   => $items,
			'note'    => $o->get_customer_note(),
			'total'   => (float) $o->get_total(),
			'total_f' => self::money( (float) $o->get_total() ),
			'status'  => $o->get_status(),
		);
	}

	/**
	 * Kitchen screen: open orders not made yet (oldest first) and the ones done in the last 30 minutes.
	 *
	 * @return array
	 */
	public static function kitchen() {
		$todo = array();
		$done = array();
		foreach ( self::recent() as $o ) {
			if ( 'cancelled' === $o->get_status() ) {
				continue;
			}
			$r = self::row( $o );
			if ( ! $r['done'] && self::is_open( $o ) ) {
				$todo[] = $r;
			} elseif ( $r['done'] && $r['done_at'] > time() - 30 * MINUTE_IN_SECONDS ) {
				$done[] = $r;
			}
		}
		usort( $todo, static fn( $a, $b ) => $a['created'] <=> $b['created'] );
		usort( $done, static fn( $a, $b ) => $b['done_at'] <=> $a['done_at'] );
		nocache_headers();
		return array(
			'todo' => $todo,
			'done' => array_slice( $done, 0, 12 ),
			'now'  => time(),
			'on'   => self::on(),
		);
	}

	/**
	 * Kitchen: done (or back to "to make").
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function kitchen_mark( $req ) {
		$o = wc_get_order( (int) $req['id'] );
		if ( ! $o || ! self::is_table( $o ) ) {
			return new WP_Error( 'agc_no_order', 'Order not found', array( 'status' => 404 ) );
		}
		$done = (bool) $req->get_param( 'done' );
		$o->update_meta_data( self::KITCHEN, $done ? 'done' : 'new' );
		$o->update_meta_data( self::DONE_AT, $done ? time() : 0 );
		$o->save();
		/* translators: %s: user */
		$o->add_order_note( sprintf( $done ? __( 'Kitchen: done (%s).', 'agency-core' ) : __( 'Kitchen: back to "to make" (%s).', 'agency-core' ), wp_get_current_user()->display_name ) );
		return self::kitchen();
	}

	/**
	 * Tables screen: every table with what it has ordered and not paid yet, plus the QR links.
	 *
	 * @return array
	 */
	public static function tables_screen() {
		$open = array();
		foreach ( self::recent() as $o ) {
			if ( self::is_open( $o ) ) {
				$open[ (string) $o->get_meta( self::META ) ][] = $o;
			}
		}
		$rows = array();
		$all  = self::tables();
		foreach ( array_keys( $open ) as $t ) {
			if ( ! in_array( (string) $t, $all, true ) ) { // PHP turns the key "3" into the number 3.
				$all[] = (string) $t; // a table removed from the list while it still has an open bill.
			}
		}
		foreach ( $all as $t ) {
			$orders = array_reverse( $open[ $t ] ?? array() );
			$sum    = 0.0;
			$since  = 0;
			$ready  = true;
			$list   = array();
			foreach ( $orders as $o ) {
				$r      = self::row( $o );
				$sum   += $r['total'];
				$since  = $since ? min( $since, $r['created'] ) : $r['created'];
				$ready  = $ready && $r['done'];
				$list[] = $r;
			}
			$rows[] = array(
				'table'   => $t,
				'orders'  => $list,
				'total'   => $sum,
				'total_f' => self::money( $sum ),
				'since'   => $since,
				'ready'   => $list ? $ready : false,
				'link'    => self::link( $t ),
			);
		}
		nocache_headers();
		return array(
			'tables' => $rows,
			'now'    => time(),
			'site'   => html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' ),
		);
	}

	/**
	 * The table has paid at the counter: every open order of that table is marked paid (completed).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function pay( $req ) {
		$t       = self::clean( (string) $req->get_param( 'table' ) );
		$methods = array(
			'cash'    => __( 'Cash', 'agency-core' ),
			'duitnow' => __( 'DuitNow QR', 'agency-core' ),
			'card'    => __( 'Card', 'agency-core' ),
			'pos'     => __( 'Shop cashier', 'agency-core' ),
			'other'   => __( 'Other', 'agency-core' ),
		);
		$m       = sanitize_key( (string) $req->get_param( 'method' ) );
		$m       = isset( $methods[ $m ] ) ? $m : 'other';
		$ids     = array_map( 'absint', (array) $req->get_param( 'ids' ) );
		$n       = 0;
		foreach ( self::recent() as $o ) {
			if ( ! self::is_open( $o ) || (string) $o->get_meta( self::META ) !== $t ) {
				continue;
			}
			if ( $ids && ! in_array( $o->get_id(), $ids, true ) ) {
				continue; // only what the staff saw on the bill (a new order sent meanwhile stays open).
			}
			$o->set_payment_method_title( $methods[ $m ] );
			$o->update_meta_data( self::PAID_BY, $m );
			$o->set_date_paid( time() );
			if ( 'done' !== $o->get_meta( self::KITCHEN ) ) {
				$o->update_meta_data( self::KITCHEN, 'done' );
				$o->update_meta_data( self::DONE_AT, time() );
			}
			$o->save();
			/* translators: 1: method, 2: user */
			$o->update_status( 'completed', sprintf( __( 'Paid at the counter (%1$s), marked by %2$s.', 'agency-core' ), $methods[ $m ], wp_get_current_user()->display_name ) );
			++$n;
		}
		if ( ! $n ) {
			return new WP_Error( 'agc_table_none', __( 'Nothing to pay for this table.', 'agency-core' ), array( 'status' => 404 ) );
		}
		return array( 'paid' => $n ) + self::tables_screen();
	}

	/**
	 * Cancel one table order (wrong order, customer changed their mind): stock goes back.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function cancel( $req ) {
		$o = wc_get_order( (int) $req['id'] );
		if ( ! $o || ! self::is_open( $o ) ) {
			return new WP_Error( 'agc_no_order', 'Order not found', array( 'status' => 404 ) );
		}
		/* translators: %s: user */
		$o->update_status( 'cancelled', sprintf( __( 'Table order cancelled in the shop dashboard by %s.', 'agency-core' ), wp_get_current_user()->display_name ) );
		return self::tables_screen();
	}
}
