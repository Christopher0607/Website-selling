<?php
/**
 * Skin (2026-11-15): a shop whose look is a hand-made design (the private mockup the owner said yes to) instead of the
 * theme. The pages, stylesheet and script live in wp-content/uploads/agc-skin/ (copied there by build-demo.sh from
 * sites/<site>/skin/); everything behind them is the real shop: WooCommerce products and stock, the pick-up days and
 * times of the pre-order module, coupons, DuitNow receipts, order emails and the owner's dashboard (/dian/).
 *
 * Addresses: / (index), /menu/, /order/ (and the thank-you page /order/?o=ID&k=KEY), /festive/, /catering/. Other
 * WordPress pages (privacy, terms, collection & refunds, track my order) are shown inside the same design. The shop
 * and cart pages lead to the skin's menu and order pages.
 *
 * Products are matched by SKU = the item id in data.json (menu items and festive items).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Skin.
 */
class AGC_Skin {

	const NS   = 'agc/v1';
	const PAY  = '_agc_skin_pay';
	const TIME = '_agc_pickup_time';

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! self::on() ) {
			return;
		}
		add_action( 'template_redirect', array( __CLASS__, 'route' ), 1 );
		add_action( 'rest_api_init', array( __CLASS__, 'rest' ) );
	}

	/**
	 * Skin folder.
	 *
	 * @return string
	 */
	public static function dir() {
		$u = wp_upload_dir( null, false );
		return trailingslashit( $u['basedir'] ) . 'agc-skin';
	}

	/**
	 * Skin URL.
	 *
	 * @return string
	 */
	public static function url() {
		$u = wp_upload_dir( null, false );
		return set_url_scheme( trailingslashit( $u['baseurl'] ) . 'agc-skin' );
	}

	/**
	 * Switched on and the files are there.
	 *
	 * @return bool
	 */
	public static function on() {
		return (bool) agc_get( 'skin' ) && file_exists( self::dir() . '/index.html' ) && file_exists( self::dir() . '/data.json' );
	}

	/**
	 * Menu items and festive seasons.
	 *
	 * @return array
	 */
	public static function data() {
		static $d = null;
		if ( null === $d ) {
			$d = json_decode( (string) file_get_contents( self::dir() . '/data.json' ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			$d = is_array( $d ) ? $d : array();
			$d += array(
				'menu'    => array(),
				'seasons' => array(),
			);
		}
		return $d;
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
		$pages = array(
			''         => 'index',
			'menu'     => 'menu',
			'order'    => 'order',
			'festive'  => 'festive',
			'catering' => 'catering',
		);
		if ( preg_match( '/^(index|menu|order|festive|catering)\.html$/', $path, $m ) ) {
			wp_safe_redirect( home_url( 'index' === $m[1] ? '/' : '/' . $m[1] . '/' ), 301 );
			exit;
		}
		if ( 'owner.html' === $path ) {
			wp_safe_redirect( home_url( '/dian/' ), 301 );
			exit;
		}
		if ( isset( $pages[ $path ] ) ) {
			$extra = array();
			// phpcs:disable WordPress.Security.NonceVerification.Recommended -- the order key is the check.
			if ( 'order' === $path && isset( $_GET['o'], $_GET['k'] ) ) {
				$o = wc_get_order( absint( $_GET['o'] ) );
				if ( $o && hash_equals( $o->get_order_key(), sanitize_text_field( wp_unslash( $_GET['k'] ) ) ) ) {
					$extra['thanks'] = self::thanks( $o );
					nocache_headers();
				}
			}
			// phpcs:enable
			self::send( $pages[ $path ], $extra );
			exit;
		}
		if ( function_exists( 'is_shop' ) && ( is_shop() || is_product() || is_product_category() || is_product_tag() ) ) {
			wp_safe_redirect( home_url( '/menu/' ), 302 );
			exit;
		}
		if ( function_exists( 'is_cart' ) && ( is_cart() || ( is_checkout() && ! is_wc_endpoint_url() ) ) ) {
			wp_safe_redirect( home_url( '/order/' ), 302 );
			exit;
		}
		if ( function_exists( 'is_checkout' ) && is_checkout() ) {
			return; // order-received / order-pay: WooCommerce's own pages (a real payment gateway comes back here).
		}
		if ( is_page() ) {
			$post = get_queried_object();
			if ( $post instanceof WP_Post ) {
				self::send_page( $post->post_title, apply_filters( 'the_content', $post->post_content ) ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals
				exit;
			}
		}
		if ( is_404() ) {
			status_header( 404 );
			self::send_page( __( 'Page not found', 'agency-core' ), '<h1>' . esc_html__( 'Page not found', 'agency-core' ) . '</h1><p><a class="btn" href="' . esc_url( home_url( '/menu/' ) ) . '">' . esc_html__( 'See breads & cakes', 'agency-core' ) . '</a></p>', 404 );
			exit;
		}
	}

	/**
	 * A skin page.
	 *
	 * @param string $page  index|menu|order|festive|catering.
	 * @param array  $extra More data for the script.
	 */
	private static function send( $page, $extra = array() ) {
		$html = (string) file_get_contents( self::dir() . '/' . $page . '.html' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		self::out( $html, $extra );
	}

	/**
	 * A WordPress page (privacy, terms, track my order…) inside the design.
	 *
	 * @param string $title   Title.
	 * @param string $content HTML.
	 * @param int    $code    HTTP status.
	 */
	private static function send_page( $title, $content, $code = 200 ) {
		$html = (string) file_get_contents( self::dir() . '/index.html' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$html = preg_replace( '#<main id="main">.*</main>#s', '<main id="main"><section class="wrap skin-page"><div class="prose">' . str_replace( '$', '&#36;', $content ) . '</div></section></main>', $html, 1 );
		$html = preg_replace( '#<title>.*?</title>#s', '<title>' . esc_html( wp_strip_all_tags( $title ) . ' — ' . get_bloginfo( 'name' ) ) . '</title>', $html, 1 );
		$html = str_replace( '<body data-page="home">', '<body data-page="page">', $html );
		self::out( $html, array(), $code );
	}

	/**
	 * Fill in and print.
	 *
	 * @param string $html  Page.
	 * @param array  $extra More data for the script.
	 * @param int    $code  HTTP status.
	 */
	private static function out( $html, $extra = array(), $code = 200 ) {
		$demo = (bool) agc_get( 'demo_mode' );
		// Preview / demo-only parts and live-only parts.
		$html = preg_replace( $demo ? '#<!--live-->.*?<!--/live-->#s' : '#<!--demo-->.*?<!--/demo-->#s', '', $html );
		$html = str_replace( array( '<!--demo-->', '<!--/demo-->', '<!--live-->', '<!--/live-->' ), '', $html );
		$base = self::url();
		$ver  = static fn( $f ) => $base . '/' . $f . '?v=' . substr( md5( (string) @filemtime( self::dir() . '/' . $f ) . AGC_VERSION ), 0, 8 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		$html = str_replace( array( 'href="style.css"', 'src="app.js"', 'src="img/' ), array( 'href="' . esc_url( $ver( 'style.css' ) ) . '"', 'src="' . esc_url( $ver( 'app.js' ) ) . '"', 'src="' . esc_url( $base . '/img/' ) ), $html );
		$home = untrailingslashit( (string) wp_parse_url( home_url( '/' ), PHP_URL_PATH ) );
		if ( '' !== $home ) {
			$html = preg_replace( '#(href|action)="/(?!/)#', '$1="' . $home . '/', $html );
		}
		if ( ! get_option( 'blog_public' ) ) {
			$html = str_replace( '</title>', "</title>\n<meta name=\"robots\" content=\"noindex, nofollow\">", $html );
		}
		$data = array_merge( self::page_data(), $extra );
		$html = str_replace( '<!--AGC_SKIN-->', '<script>window.AGC_SKIN=' . wp_json_encode( $data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE ) . ';</script>', $html );
		$hits = (string) agc_get( 'studio_hits' );
		if ( $hits ) {
			$html = str_replace( '</body>', '<script src="' . esc_url( $hits ) . '" defer></script></body>', $html );
		}
		status_header( $code );
		header( 'Content-Type: text/html; charset=utf-8' );
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput -- the skin's own files, data JSON-encoded.
	}

	/**
	 * What the script needs.
	 *
	 * @return array
	 */
	private static function page_data() {
		$d = self::data();
		return array(
			'menu'      => $d['menu'],
			'seasons'   => $d['seasons'],
			'img'       => self::url() . '/img',
			'rest'      => esc_url_raw( rest_url( self::NS . '/' ) ),
			'live'      => self::live(),
			'avail'     => self::avail(),
			'pay'       => self::pays(),
			'wa'        => preg_replace( '/\D/', '', (string) agc_get( 'whatsapp_number' ) ),
			'demo'      => (bool) agc_get( 'demo_mode' ),
			'pausedMsg' => (string) agc_get( 'shop_paused_msg' ),
		);
	}

	/**
	 * Prices, sold out, how many left, paused — straight from the shop.
	 *
	 * @return array
	 */
	public static function live() {
		$d   = self::data();
		$ids = array_column( $d['menu'], 'id' );
		foreach ( $d['seasons'] as $s ) {
			$ids = array_merge( $ids, array_column( (array) ( $s['items'] ?? array() ), 'id' ) );
		}
		$out = array(
			'price'  => new stdClass(),
			'sold'   => new stdClass(),
			'left'   => new stdClass(),
			'status' => agc_get( 'shop_paused' ) ? 'paused' : 'auto',
		);
		foreach ( $ids as $id ) {
			$p = self::product( $id );
			if ( ! $p ) {
				continue;
			}
			if ( 'publish' === $p->get_status() && '' !== (string) $p->get_price() ) {
				$out['price']->{$id} = (float) $p->get_price();
				if ( ! $p->is_in_stock() ) {
					$out['sold']->{$id} = true;
				}
			}
			if ( $p->managing_stock() && null !== $p->get_stock_quantity() ) {
				$out['left']->{$id} = max( 0, (int) $p->get_stock_quantity() );
			}
		}
		return $out;
	}

	/**
	 * Free pick-up days and times (only when pre-orders are on).
	 *
	 * @return array|object
	 */
	private static function avail() {
		if ( ! class_exists( 'AGC_Festive' ) || ! AGC_Festive::on() || agc_get( 'shop_paused' ) ) {
			return new stdClass();
		}
		$a = AGC_Festive::availability( 'collect' );
		return $a ? $a : new stdClass();
	}

	/**
	 * Payment choices this shop offers.
	 *
	 * @return array
	 */
	private static function pays() {
		$online  = false;
		$duitnow = false;
		if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
			foreach ( WC()->payment_gateways()->payment_gateways() as $id => $g ) {
				if ( 'yes' !== $g->enabled ) {
					continue;
				}
				if ( 'agc_duitnow' === $id ) {
					$duitnow = $g->is_available();
				} elseif ( 'agc_demo_pay' === $id ) {
					$online = $online || $g->is_available();
				} elseif ( ! in_array( $id, array( 'bacs', 'cheque', 'cod' ), true ) ) {
					$online = true; // the shop's own payment gateway (FPX, cards, e-wallets).
				}
			}
		}
		return array(
			'online'  => $online,
			'duitnow' => $duitnow,
		);
	}

	/**
	 * Product for an item id (its SKU).
	 *
	 * @param string $id Item id.
	 * @return WC_Product|null
	 */
	private static function product( $id ) {
		$pid = wc_get_product_id_by_sku( (string) $id );
		$p   = $pid ? wc_get_product( $pid ) : null;
		return $p && 'trash' !== $p->get_status() ? $p : null;
	}

	/* ------------------------------------------------------------------ thank-you page */

	/**
	 * What the thank-you panel shows.
	 *
	 * @param WC_Order $o Order.
	 * @return array
	 */
	public static function thanks( $o ) {
		$pay   = (string) $o->get_meta( self::PAY );
		$state = $o->get_status();
		$step  = in_array( $state, array( 'processing' ), true ) ? 1 : ( 'agc-ready' === $state ? 2 : ( 'completed' === $state ? 3 : 0 ) );
		if ( 'duitnow' === $pay && $step > 0 ) {
			$pay = 'paid';
		}
		if ( 'online' === $pay ) {
			$pay = $o->is_paid() ? 'paid' : 'duitnow';
		}
		$lines = array();
		foreach ( $o->get_items() as $it ) {
			$lines[] = $it->get_quantity() . ' × ' . $it->get_name();
		}
		$season = (string) $o->get_meta( '_agc_skin_season' );
		$out    = array(
			'number' => $o->get_order_number(),
			'kicker' => 'ask' === $pay ? __( 'Pre-order request sent', 'agency-core' ) : __( 'Order received', 'agency-core' ),
			'title'  => $season ? $season . ' · ' . __( 'pick up', 'agency-core' ) : __( 'Pick-up', 'agency-core' ),
			'date'   => (string) $o->get_meta( AGC_Festive::DATE ),
			'time'   => (string) ( $o->get_meta( self::TIME ) ? $o->get_meta( self::TIME ) : $o->get_meta( AGC_Festive::SLOT ) ),
			'pay'    => $pay,
			'total'  => (float) $o->get_total(),
			'lines'  => implode( ', ', $lines ),
			'step'   => $step,
			'steps'  => array( __( 'Order received', 'agency-core' ), __( 'Paid · being made', 'agency-core' ), __( 'Ready for collection', 'agency-core' ), __( 'Done', 'agency-core' ) ),
			'text'   => 'wa' === $pay ? self::wa_text( $o ) : '',
		);
		if ( 'duitnow' === $pay ) {
			$gws = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
			if ( isset( $gws['agc_duitnow'] ) && method_exists( $gws['agc_duitnow'], 'pay_box' ) ) {
				$out['payhtml'] = $gws['agc_duitnow']->pay_box( $o );
			}
		}
		return $out;
	}

	/**
	 * The order as a WhatsApp message to the shop.
	 *
	 * @param WC_Order $o Order.
	 * @return string
	 */
	private static function wa_text( $o ) {
		$date = (string) $o->get_meta( AGC_Festive::DATE );
		$l    = array(
			/* translators: %s: shop name */
			sprintf( __( 'New order: %s', 'agency-core' ), get_bloginfo( 'name' ) ),
			'#' . $o->get_order_number() . ' · ' . __( 'Pick-up', 'agency-core' ) . ( $date ? ' · ' . AGC_Festive::day_label( $date ) : '' ) . ( $o->get_meta( self::TIME ) ? ', ' . $o->get_meta( self::TIME ) : '' ),
			'',
		);
		foreach ( $o->get_items() as $it ) {
			$opt = $it->get_meta( __( 'Options', 'agency-core' ) );
			$l[] = $it->get_quantity() . ' × ' . $it->get_name() . ( $opt ? ' (' . $opt . ')' : '' ) . ' — ' . html_entity_decode( wp_strip_all_tags( wc_price( $it->get_total() ) ) );
		}
		$l[] = '';
		if ( (float) $o->get_discount_total() > 0 ) {
			$l[] = __( 'Discount', 'agency-core' ) . ': −' . html_entity_decode( wp_strip_all_tags( wc_price( $o->get_discount_total() ) ) );
		}
		$l[] = __( 'Total', 'agency-core' ) . ': ' . html_entity_decode( wp_strip_all_tags( wc_price( $o->get_total() ) ) );
		$l[] = '';
		$l[] = __( 'Name', 'agency-core' ) . ': ' . $o->get_billing_first_name();
		$l[] = __( 'Phone', 'agency-core' ) . ': ' . $o->get_billing_phone();
		if ( $o->get_customer_note() ) {
			$l[] = __( 'Notes', 'agency-core' ) . ': ' . $o->get_customer_note();
		}
		return implode( "\n", $l );
	}

	/* ------------------------------------------------------------------ REST */

	/**
	 * Routes (public: customers are not logged in; the page cache keeps nonces out).
	 */
	public static function rest() {
		$pub = static fn() => true;
		register_rest_route( self::NS, '/skin/live', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'rest_live' ), 'permission_callback' => $pub ) );
		register_rest_route( self::NS, '/skin/coupon', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_coupon' ), 'permission_callback' => array( __CLASS__, 'same_site' ) ) );
		register_rest_route( self::NS, '/skin/order', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_order' ), 'permission_callback' => array( __CLASS__, 'same_site' ) ) );
		register_rest_route( self::NS, '/skin/enquiry', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_enquiry' ), 'permission_callback' => array( __CLASS__, 'same_site' ) ) );
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
				return (string) wp_parse_url( $v, PHP_URL_HOST ) === $host ? true : new WP_Error( 'agc_skin_site', __( 'Please order on the website.', 'agency-core' ), array( 'status' => 403 ) );
			}
		}
		return new WP_Error( 'agc_skin_site', __( 'Please order on the website.', 'agency-core' ), array( 'status' => 403 ) );
	}

	/**
	 * Live data.
	 *
	 * @return array
	 */
	public static function rest_live() {
		return array(
			'live'  => self::live(),
			'avail' => self::avail(),
		);
	}

	/**
	 * Check a promo code.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_coupon( $req ) {
		$code = wc_format_coupon_code( (string) $req->get_param( 'code' ) );
		$sub  = (float) $req->get_param( 'sub' );
		$bad  = static fn( $m ) => array(
			'code' => strtoupper( $code ),
			'ok'   => false,
			'msg'  => $m,
		);
		$c    = new WC_Coupon( $code );
		if ( '' === $code || ! $c->get_id() || 'publish' !== get_post_status( $c->get_id() ) ) {
			return $bad( __( 'That code doesn’t work.', 'agency-core' ) );
		}
		if ( $c->get_date_expires() && $c->get_date_expires()->getTimestamp() < time() ) {
			return $bad( __( 'This code has expired.', 'agency-core' ) );
		}
		if ( $c->get_usage_limit() && $c->get_usage_count() >= $c->get_usage_limit() ) {
			return $bad( __( 'This code has been used up.', 'agency-core' ) );
		}
		if ( (float) $c->get_minimum_amount() > 0 && $sub < (float) $c->get_minimum_amount() ) {
			/* translators: %s: amount */
			return $bad( sprintf( __( 'This code needs an order of at least %s.', 'agency-core' ), html_entity_decode( wp_strip_all_tags( wc_price( $c->get_minimum_amount() ) ) ) ) );
		}
		$pct = 'percent' === $c->get_discount_type();
		$amt = (float) $c->get_amount();
		return array(
			'code'   => strtoupper( $code ),
			'ok'     => true,
			'type'   => $pct ? 'percent' : 'fixed',
			'amount' => $amt,
			/* translators: 1: amount, 2: code */
			'label'  => sprintf( __( '%1$s off (%2$s)', 'agency-core' ), $pct ? rtrim( rtrim( number_format( $amt, 2 ), '0' ), '.' ) . '%' : html_entity_decode( wp_strip_all_tags( wc_price( $amt ) ) ), strtoupper( $code ) ),
		);
	}

	/**
	 * Place an order (or a festive pre-order request).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_order( $req ) {
		$err = static fn( $m, $s = 400 ) => new WP_Error( 'agc_skin_order', $m, array( 'status' => $s ) );
		if ( agc_get( 'shop_paused' ) ) {
			return $err( (string) ( agc_get( 'shop_paused_msg' ) ? agc_get( 'shop_paused_msg' ) : __( 'Online orders are paused for now.', 'agency-core' ) ), 409 );
		}
		if ( agc_get( 'demo_mode' ) && ! agc_get( 'demo_test_orders' ) ) {
			return $err( (string) agc_get( 'demo_checkout_notice' ), 403 );
		}
		$b     = (array) $req->get_json_params();
		$kind  = 'festive' === ( $b['kind'] ?? '' ) ? 'festive' : 'order';
		$name  = sanitize_text_field( (string) ( $b['name'] ?? '' ) );
		$phone = sanitize_text_field( (string) ( $b['phone'] ?? '' ) );
		$email = sanitize_email( (string) ( $b['email'] ?? '' ) );
		if ( '' === $name ) {
			return $err( __( 'Add your name, so we know whose order it is.', 'agency-core' ) );
		}
		if ( ! preg_match( '/^\+?[\d\s-]{9,16}$/', $phone ) ) {
			return $err( __( 'Add a mobile number we can reach you on.', 'agency-core' ) );
		}
		$d      = self::data();
		$lines  = array();
		$season = null;
		$ask    = false;
		if ( 'festive' === $kind ) {
			foreach ( $d['seasons'] as $s ) {
				if ( ( $s['id'] ?? '' ) === ( $b['season'] ?? '' ) ) {
					$season = $s;
				}
			}
			if ( ! $season ) {
				return $err( __( 'This pre-order season is not open.', 'agency-core' ) );
			}
			$today = AGC_Festive::now()->format( 'Y-m-d' );
			if ( (string) $season['cutoff'] < $today ) {
				/* translators: %s: season */
				return $err( sprintf( __( 'Orders for %s have closed.', 'agency-core' ), $season['name'] ), 409 );
			}
			$date = sanitize_text_field( (string) ( $b['date'] ?? '' ) );
			if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) || $date < $season['from'] || $date > $season['to'] ) {
				return $err( __( 'Choose a pick-up day.', 'agency-core' ) );
			}
			$known = array_column( (array) $season['items'], null, 'id' );
		} else {
			$known = array_column( $d['menu'], null, 'id' );
			$date  = sanitize_text_field( (string) ( $b['date'] ?? '' ) );
			$slot  = sanitize_text_field( (string) ( $b['slot'] ?? '' ) );
			$time  = absint( $b['time'] ?? 0 );
			AGC_Festive::forget_booked();
			$avail = AGC_Festive::availability( 'collect' );
			if ( ! isset( $avail[ $date ][ $slot ] ) ) {
				return $err( __( 'That day or time can no longer be chosen. Please choose another.', 'agency-core' ), 409 );
			}
			if ( $avail[ $date ][ $slot ] < 1 ) {
				return $err( __( 'That time has just filled up. Please choose another.', 'agency-core' ), 409 );
			}
		}
		foreach ( array_slice( (array) ( $b['items'] ?? array() ), 0, 40 ) as $row ) {
			$id  = sanitize_title( (string) ( $row['id'] ?? '' ) );
			$qty = max( 1, min( 50, (int) ( $row['qty'] ?? 1 ) ) );
			$it  = $known[ $id ] ?? null;
			$p   = $it ? self::product( $id ) : null;
			if ( ! $p ) {
				return $err( __( 'Something in your order is no longer on the menu. Please check your order again.', 'agency-core' ), 409 );
			}
			$priced = 'publish' === $p->get_status() && '' !== (string) $p->get_price();
			if ( 'order' === $kind && ( ! $priced || ! $p->is_in_stock() ) ) {
				/* translators: %s: product */
				return $err( sprintf( __( '%s is not available right now. Please check your order again.', 'agency-core' ), $p->get_name() ), 409 );
			}
			if ( $p->managing_stock() && null !== $p->get_stock_quantity() && $p->get_stock_quantity() < $qty ) {
				/* translators: 1: product, 2: left */
				return $err( sprintf( __( 'Only %2$d left of %1$s.', 'agency-core' ), $p->get_name(), max( 0, (int) $p->get_stock_quantity() ) ), 409 );
			}
			$unit  = $priced ? (float) $p->get_price() : 0.0;
			$ask   = $ask || ! $priced;
			// Options: the chosen index in each group (prices come from data.json, never from the browser).
			$opts = array();
			$sel  = (array) ( $row['sel'] ?? array() );
			foreach ( array_values( (array) ( $it['o'] ?? array() ) ) as $gi => $g ) {
				$picked = array_map( 'intval', (array) ( $sel[ $gi ] ?? array() ) );
				if ( ! $picked && ! empty( $g['one'] ) ) {
					$picked = array( (int) ( $g['def'] ?? 0 ) );
				}
				foreach ( array_unique( $picked ) as $vi ) {
					$v = $g['v'][ $vi ] ?? null;
					if ( is_array( $v ) ) {
						$unit  += (float) $v[1];
						$opts[] = (string) $v[0];
					}
				}
			}
			$lines[] = array( $p, $qty, $unit, implode( ', ', $opts ), sanitize_text_field( (string) ( $row['note'] ?? '' ) ) );
		}
		if ( ! $lines ) {
			return $err( __( 'Your order is empty.', 'agency-core' ) );
		}

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
		$o->set_billing_first_name( $name );
		$o->set_billing_phone( $phone );
		if ( $email ) {
			$o->set_billing_email( $email );
		}
		$o->set_billing_country( 'MY' );
		$ship = new WC_Order_Item_Shipping();
		$ship->set_method_title( __( 'Pick up at the bakery', 'agency-core' ) );
		$ship->set_method_id( 'local_pickup' );
		$ship->set_total( 0 );
		$o->add_item( $ship );
		$o->update_meta_data( AGC_Festive::MODE, 'collect' );
		$o->update_meta_data( AGC_Festive::DATE, $date );
		$note = sanitize_textarea_field( (string) ( $b['notes'] ?? '' ) );
		if ( 'festive' === $kind ) {
			$o->update_meta_data( AGC_Festive::SLOT, __( 'Festive pick-up', 'agency-core' ) );
			$o->update_meta_data( '_agc_skin_season', (string) $season['name'] );
		} else {
			$o->update_meta_data( AGC_Festive::SLOT, $slot );
			$label = gmdate( 'g:ia', $time * 60 );
			$o->update_meta_data( self::TIME, $label );
			/* translators: %s: time */
			$note = trim( sprintf( __( 'Pick-up time: %s', 'agency-core' ), $label ) . ( $note ? "\n" . $note : '' ) );
		}
		if ( $note ) {
			$o->set_customer_note( $note );
		}
		$code = wc_format_coupon_code( (string) ( $b['code'] ?? '' ) );
		if ( 'order' === $kind && '' !== $code ) {
			$r = $o->apply_coupon( $code );
			if ( is_wp_error( $r ) ) {
				$o->delete( true );
				return $err( wp_strip_all_tags( $r->get_error_message() ), 409 );
			}
		}
		$o->calculate_totals( false );
		if ( 'order' === $kind && isset( $b['total'] ) && abs( (float) $b['total'] - (float) $o->get_total() ) > 0.01 ) {
			$o->delete( true );
			return $err( __( 'Some prices have just changed. Please check your order again.', 'agency-core' ), 409 );
		}

		$pay = 'festive' === $kind ? ( $ask ? 'ask' : 'duitnow' ) : (string) ( $b['pay'] ?? 'wa' );
		$pay = in_array( $pay, array( 'online', 'duitnow', 'wa', 'ask' ), true ) ? $pay : 'wa';
		$gws = WC()->payment_gateways() ? WC()->payment_gateways()->payment_gateways() : array();
		$o->update_meta_data( self::PAY, $pay );
		$thanks = add_query_arg(
			array(
				'o' => $o->get_id(),
				'k' => $o->get_order_key(),
			),
			home_url( '/order/' )
		);
		if ( 'online' === $pay ) {
			if ( isset( $gws['agc_demo_pay'] ) && $gws['agc_demo_pay']->is_available() ) {
				$o->set_payment_method( $gws['agc_demo_pay'] );
				$o->save();
				$o->add_order_note( __( 'Demo payment: nothing was charged.', 'agency-core' ) );
				$o->payment_complete();
			} else {
				$o->save(); // the shop's own gateway: WooCommerce's pay page, then back to the thank-you page.
				$thanks = $o->get_checkout_payment_url();
			}
		} elseif ( 'duitnow' === $pay && isset( $gws['agc_duitnow'] ) ) {
			$o->set_payment_method( $gws['agc_duitnow'] );
			$o->save();
			$o->update_status( 'on-hold', __( 'Waiting for the DuitNow payment and receipt.', 'agency-core' ) );
			wc_maybe_reduce_stock_levels( $o->get_id() );
		} else {
			$o->set_payment_method( '' );
			$o->set_payment_method_title( 'ask' === $pay ? __( 'Price to confirm on WhatsApp', 'agency-core' ) : __( 'Pay at pick-up (order sent on WhatsApp)', 'agency-core' ) );
			$o->save();
			$o->update_status( 'on-hold', 'ask' === $pay ? __( 'Pre-order request: WhatsApp the customer the price to confirm.', 'agency-core' ) : __( 'Order also sent on WhatsApp; payment at pick-up.', 'agency-core' ) );
			wc_maybe_reduce_stock_levels( $o->get_id() );
		}
		AGC_Festive::forget_booked();
		return array(
			'id'     => $o->get_id(),
			'number' => $o->get_order_number(),
			'thanks' => $thanks,
		);
	}

	/**
	 * Whole-cake request: email to the shop; the customer can also send it on WhatsApp.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_enquiry( $req ) {
		$b = array_map( 'sanitize_text_field', array_map( 'strval', (array) $req->get_json_params() ) );
		if ( empty( $b['name'] ) || empty( $b['phone'] ) || ! preg_match( '/^\+?[\d\s-]{9,16}$/', $b['phone'] ) ) {
			return new WP_Error( 'agc_skin_enquiry', __( 'Add your name and a mobile number we can reach you on.', 'agency-core' ), array( 'status' => 400 ) );
		}
		$ref  = 'E' . strtoupper( wp_generate_password( 5, false ) );
		$text = sprintf( 'Whole cake request: %s', get_bloginfo( 'name' ) ) . "\n" . $ref . "\n"
			. ( $b['type'] ?? '' ) . ' · ' . ( $b['pax'] ?? '1' ) . ' cake(s) · ' . ( ! empty( $b['date'] ) ? AGC_Festive::day_label( $b['date'] ) : 'date to confirm' ) . ( ! empty( $b['time'] ) ? ', ' . $b['time'] : '' )
			. "\nOccasion: " . ( ! empty( $b['where'] ) ? $b['where'] : '-' ) . ( ! empty( $b['notes'] ) ? "\nNotes: " . $b['notes'] : '' )
			. "\nName: " . $b['name'] . ' · ' . $b['phone'] . ( ! empty( $b['email'] ) ? ' · ' . sanitize_email( $b['email'] ) : '' );
		$to = get_option( 'woocommerce_new_order_settings' );
		$to = is_array( $to ) && ! empty( $to['recipient'] ) ? $to['recipient'] : get_option( 'admin_email' );
		/* translators: 1: reference, 2: shop */
		wp_mail( $to, sprintf( __( 'Whole cake request %1$s – %2$s', 'agency-core' ), $ref, get_bloginfo( 'name' ) ), $text );
		return array(
			'ref'  => $ref,
			'text' => $text,
		);
	}
}
