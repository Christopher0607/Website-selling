<?php
/**
 * Festive pre-order shop (the RM399 product, 2026-11-13).
 *
 * One festive season on a normal WooCommerce store:
 * - a cut-off date (after it nothing can be bought; a "tell me when you open" form instead)
 * - collection / delivery days with a number of places per time slot (the customer picks one at checkout)
 * - an early-bird discount until a date
 * - "12 left" from the real WooCommerce stock
 * - an order status "Ready" (ready for collection / out for delivery) with its own customer email
 * - the order page and the order tracking page show the day, the time and a timeline
 * - the owner's page "Festive orders": what to make each day, orders per time slot, payments to check
 *
 * Settings: Settings → Agency → "Festive pre-orders" (keys fest_*). Payment: DuitNow QR + receipt
 * upload (class-festive-gateways.php) next to the shop's own payment gateway plugin.
 *
 * Order meta: _agc_fest_mode (collect|delivery|courier), _agc_fest_date (Y-m-d), _agc_fest_slot (label).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Festive pre-orders.
 */
class AGC_Festive {

	const MODE   = '_agc_fest_mode';
	const DATE   = '_agc_fest_date';
	const SLOT   = '_agc_fest_slot';
	const STATUS = 'agc-ready';
	const NOTIFY = 'agc_fest_notify';

	/**
	 * Booked places cache for this request.
	 *
	 * @var array|null
	 */
	private static $booked = null;

	/**
	 * Hooks.
	 */
	public static function init() {
		// Always on (so orders keep their status and email even if the season is switched off).
		add_action( 'init', array( __CLASS__, 'register_status' ) );
		add_filter( 'wc_order_statuses', array( __CLASS__, 'order_statuses' ) );
		add_filter( 'woocommerce_order_is_paid_statuses', array( __CLASS__, 'paid_statuses' ) );
		add_filter( 'woocommerce_reports_order_statuses', array( __CLASS__, 'paid_statuses' ) );
		add_filter( 'woocommerce_email_classes', array( __CLASS__, 'email_classes' ) );
		add_filter( 'woocommerce_email_actions', array( __CLASS__, 'email_actions' ) );
		add_filter( 'woocommerce_admin_order_actions', array( __CLASS__, 'admin_order_actions' ), 10, 2 );
		add_filter( 'bulk_actions-edit-shop_order', array( __CLASS__, 'bulk_actions' ), 20 );
		add_filter( 'bulk_actions-woocommerce_page_wc-orders', array( __CLASS__, 'bulk_actions' ), 20 );
		add_action( 'woocommerce_email_order_meta', array( __CLASS__, 'email_meta' ), 5, 3 );
		add_action( 'woocommerce_order_details_before_order_table', array( __CLASS__, 'order_timeline' ), 5 );
		add_action( 'woocommerce_admin_order_data_after_shipping_address', array( __CLASS__, 'admin_order_box' ) );
		add_filter( 'manage_edit-shop_order_columns', array( __CLASS__, 'columns' ), 20 );
		add_filter( 'manage_woocommerce_page_wc-orders_columns', array( __CLASS__, 'columns' ), 20 );
		add_action( 'manage_shop_order_posts_custom_column', array( __CLASS__, 'column_legacy' ), 10, 2 );
		add_action( 'manage_woocommerce_page_wc-orders_custom_column', array( __CLASS__, 'column' ), 10, 2 );
		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ), 60 );
		foreach ( array( 'woocommerce_new_order', 'woocommerce_order_status_changed', 'woocommerce_update_order', 'woocommerce_delete_order', 'woocommerce_trash_order' ) as $hook ) {
			add_action( $hook, array( __CLASS__, 'forget_booked' ) );
		}

		if ( ! self::on() ) {
			return;
		}
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_shortcode( 'agc_festive', array( __CLASS__, 'shortcode' ) );
		add_action( 'admin_post_agc_fest_notify', array( __CLASS__, 'save_notify' ) );
		add_action( 'admin_post_nopriv_agc_fest_notify', array( __CLASS__, 'save_notify' ) );

		// Shop pages.
		add_filter( 'woocommerce_is_purchasable', array( __CLASS__, 'purchasable' ), 20 );
		add_filter( 'woocommerce_variation_is_purchasable', array( __CLASS__, 'purchasable' ), 20 );
		add_action( 'woocommerce_after_shop_loop_item_title', array( __CLASS__, 'loop_left' ), 15 );
		add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'single_left' ), 15 );
		add_action( 'woocommerce_before_shop_loop', array( __CLASS__, 'bar' ), 5 );
		add_action( 'woocommerce_before_single_product', array( __CLASS__, 'bar' ), 5 );
		add_action( 'woocommerce_before_cart', array( __CLASS__, 'bar' ), 5 );
		add_action( 'woocommerce_before_checkout_form', array( __CLASS__, 'bar' ), 1 );

		// Cart and checkout.
		add_action( 'woocommerce_cart_calculate_fees', array( __CLASS__, 'early_bird' ) );
		add_action( 'woocommerce_review_order_after_shipping', array( __CLASS__, 'picker' ) );
		add_action( 'woocommerce_checkout_process', array( __CLASS__, 'checkout_closed' ), 5 );
		add_action( 'woocommerce_after_checkout_validation', array( __CLASS__, 'validate' ), 20, 2 );
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'save_order' ), 20, 2 );

		add_action( 'admin_notices', array( __CLASS__, 'item_limit_notice' ) );
	}

	/* ------------------------------------------------------------------ settings and time */

	/**
	 * Is the festive season switched on?
	 *
	 * @return bool
	 */
	public static function on() {
		return (bool) agc_get( 'fest_on' );
	}

	/**
	 * Now, in the shop's time zone (filterable for tests).
	 *
	 * @return DateTimeImmutable
	 */
	public static function now() {
		$now = new DateTimeImmutable( 'now', wp_timezone() );
		return apply_filters( 'agc_festive_now', $now );
	}

	/**
	 * A setting as a date (shop time zone) or null.
	 *
	 * @param string $key  Setting key.
	 * @param string $time Default time of day.
	 * @return DateTimeImmutable|null
	 */
	private static function date_setting( $key, $time = '00:00' ) {
		$v = trim( (string) agc_get( $key ) );
		if ( ! $v ) {
			return null;
		}
		if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $v ) ) {
			$v .= ' ' . $time;
		}
		$d = DateTimeImmutable::createFromFormat( 'Y-m-d H:i', $v, wp_timezone() );
		return $d ? $d : null;
	}

	/**
	 * The cut-off moment.
	 *
	 * @return DateTimeImmutable|null
	 */
	public static function cutoff() {
		return self::date_setting( 'fest_cutoff', '23:59' );
	}

	/**
	 * Pre-orders closed?
	 *
	 * @return bool
	 */
	public static function closed() {
		$c = self::cutoff();
		return $c && self::now() > $c;
	}

	/**
	 * Early-bird percentage that applies now (0 = none).
	 *
	 * @return float
	 */
	public static function early_pct() {
		$end = self::date_setting( 'fest_early_end', '23:59' );
		$pct = (float) agc_get( 'fest_early_pct' );
		return ( $end && $pct > 0 && self::now() <= $end ) ? min( 90, $pct ) : 0;
	}

	/**
	 * Time slots for a mode.
	 *
	 * @param string $mode collect|delivery.
	 * @return array label => places per day
	 */
	public static function slots( $mode ) {
		$raw = (string) agc_get( 'delivery' === $mode ? 'fest_delivery_slots' : 'fest_collect_slots' );
		$out = array();
		foreach ( preg_split( '/\r\n|\r|\n/', $raw ) as $line ) {
			$parts = array_map( 'trim', explode( '|', $line ) );
			if ( '' === $parts[0] ) {
				continue;
			}
			$out[ $parts[0] ] = isset( $parts[1] ) && is_numeric( $parts[1] ) ? max( 0, (int) $parts[1] ) : 999;
		}
		return $out;
	}

	/**
	 * Days a customer can still choose (Y-m-d list).
	 *
	 * @return string[]
	 */
	public static function days() {
		$from = self::date_setting( 'fest_from' );
		$to   = self::date_setting( 'fest_to' );
		if ( ! $from || ! $to || $to < $from ) {
			return array();
		}
		$closed   = array_filter( array_map( 'trim', explode( ',', (string) agc_get( 'fest_closed' ) ) ) );
		$earliest = self::now()->setTime( 0, 0 )->modify( '+1 day' ); // no same-day orders.
		$out      = array();
		for ( $d = $from; $d <= $to && count( $out ) < 62; $d = $d->modify( '+1 day' ) ) {
			if ( $d >= $earliest && ! in_array( $d->format( 'Y-m-d' ), $closed, true ) ) {
				$out[] = $d->format( 'Y-m-d' );
			}
		}
		return $out;
	}

	/* ------------------------------------------------------------------ places left */

	/**
	 * Order statuses that hold a place.
	 *
	 * @return string[]
	 */
	private static function holding_statuses() {
		return array( 'pending', 'on-hold', 'processing', self::STATUS, 'completed' );
	}

	/**
	 * Booked places: [mode][date][slot] => count.
	 *
	 * @return array
	 */
	public static function booked() {
		if ( null !== self::$booked ) {
			return self::$booked;
		}
		$cached = get_transient( 'agc_fest_booked' );
		if ( is_array( $cached ) ) {
			self::$booked = $cached;
			return $cached;
		}
		$out    = array();
		$orders = wc_get_orders(
			array(
				'limit'      => -1,
				'status'     => self::holding_statuses(),
				'type'       => 'shop_order',
				'meta_query' => array( array( 'key' => self::DATE, 'compare' => 'EXISTS' ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
		foreach ( $orders as $o ) {
			$m = (string) $o->get_meta( self::MODE );
			$d = (string) $o->get_meta( self::DATE );
			$s = (string) $o->get_meta( self::SLOT );
			if ( $m && $d && $s ) {
				$out[ $m ][ $d ][ $s ] = ( $out[ $m ][ $d ][ $s ] ?? 0 ) + 1;
			}
		}
		set_transient( 'agc_fest_booked', $out, HOUR_IN_SECONDS );
		self::$booked = $out;
		return $out;
	}

	/**
	 * Clear the booked-places cache.
	 */
	public static function forget_booked() {
		self::$booked = null;
		delete_transient( 'agc_fest_booked' );
	}

	/**
	 * Days and time slots with places left for a mode.
	 *
	 * @param string $mode collect|delivery.
	 * @return array date => [ slot => left ]
	 */
	public static function availability( $mode ) {
		$booked = self::booked();
		$out    = array();
		foreach ( self::days() as $d ) {
			foreach ( self::slots( $mode ) as $label => $cap ) {
				$out[ $d ][ $label ] = max( 0, $cap - (int) ( $booked[ $mode ][ $d ][ $label ] ?? 0 ) );
			}
		}
		return $out;
	}

	/* ------------------------------------------------------------------ delivery mode */

	/**
	 * Which kind of hand-over a shipping rate means.
	 *
	 * @param string $rate_id e.g. local_pickup:3, flat_rate:5.
	 * @return string collect|delivery|courier
	 */
	public static function mode_of( $rate_id ) {
		$rate_id = (string) $rate_id;
		$parts   = explode( ':', $rate_id );
		if ( in_array( $parts[0], array( 'local_pickup', 'pickup_location' ), true ) ) {
			return 'collect';
		}
		$zone_word = strtolower( trim( (string) agc_get( 'fest_delivery_zone' ) ) );
		if ( $zone_word && ! empty( $parts[1] ) && class_exists( 'WC_Shipping_Zones' ) ) {
			$zone = WC_Shipping_Zones::get_zone_by( 'instance_id', (int) $parts[1] );
			if ( $zone && false !== strpos( strtolower( $zone->get_zone_name() ), $zone_word ) ) {
				return 'delivery';
			}
		}
		return 'courier';
	}

	/**
	 * Mode of the shipping method chosen in the cart.
	 *
	 * @return string
	 */
	public static function cart_mode() {
		$chosen = WC()->session ? (array) WC()->session->get( 'chosen_shipping_methods', array() ) : array();
		return self::mode_of( $chosen[0] ?? '' );
	}

	/* ------------------------------------------------------------------ labels */

	/**
	 * "Mon 1 Feb".
	 *
	 * @param string $ymd Date.
	 * @return string
	 */
	public static function day_label( $ymd ) {
		$d = DateTimeImmutable::createFromFormat( 'Y-m-d H:i', $ymd . ' 12:00', wp_timezone() );
		return $d ? wp_date( _x( 'D j M', 'festive day label', 'agency-core' ), $d->getTimestamp() ) : $ymd;
	}

	/**
	 * Mode names.
	 *
	 * @param string $mode Mode.
	 * @return string
	 */
	public static function mode_label( $mode ) {
		$labels = array(
			'collect'  => __( 'Self-collect', 'agency-core' ),
			'delivery' => __( 'Delivery', 'agency-core' ),
			'courier'  => __( 'Courier', 'agency-core' ),
		);
		return $labels[ $mode ] ?? $mode;
	}

	/**
	 * One line: "Self-collect · Mon 1 Feb · 10:00–13:00".
	 *
	 * @param WC_Order $order Order.
	 * @return string
	 */
	public static function order_line( $order ) {
		$mode = (string) $order->get_meta( self::MODE );
		if ( ! $mode ) {
			return '';
		}
		$bits = array( self::mode_label( $mode ) );
		if ( $order->get_meta( self::DATE ) ) {
			$bits[] = self::day_label( (string) $order->get_meta( self::DATE ) );
		}
		if ( $order->get_meta( self::SLOT ) ) {
			$bits[] = (string) $order->get_meta( self::SLOT );
		}
		return implode( ' · ', $bits );
	}

	/* ------------------------------------------------------------------ front end */

	/**
	 * Styles and script.
	 */
	public static function assets() {
		wp_enqueue_style( 'agc-festive', AGC_URL . 'assets/css/festive.css', array(), AGC_VERSION );
		wp_enqueue_script( 'agc-festive', AGC_URL . 'assets/js/festive.js', array(), AGC_VERSION, array( 'in_footer' => true ) );
		wp_localize_script(
			'agc-festive',
			'agcFestive',
			array(
				'days'  => __( 'days', 'agency-core' ),
				'hours' => __( 'hrs', 'agency-core' ),
				'mins'  => __( 'min', 'agency-core' ),
				'left'  => __( '%d left', 'agency-core' ),
				'full'  => __( 'Full', 'agency-core' ),
			)
		);
	}

	/**
	 * After the cut-off nothing can be bought on the website.
	 *
	 * @param bool $ok Purchasable.
	 * @return bool
	 */
	public static function purchasable( $ok ) {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return $ok;
		}
		return self::closed() ? false : $ok;
	}

	/**
	 * "12 left" from the real stock.
	 *
	 * @param WC_Product $product Product.
	 * @return string
	 */
	private static function left_html( $product ) {
		if ( ! $product || ! agc_get( 'fest_show_left' ) || self::closed() ) {
			return '';
		}
		if ( ! $product->is_in_stock() ) {
			return '<p class="agc-left agc-left--out">' . esc_html__( 'Sold out', 'agency-core' ) . '</p>';
		}
		$n = self::stock_left( $product );
		if ( null === $n ) {
			return '';
		}
		$low = (int) agc_get( 'fest_low_stock' );
		/* translators: %d: how many are left */
		$txt = $low && $n <= $low ? sprintf( __( 'Only %d left', 'agency-core' ), $n ) : sprintf( __( '%d left', 'agency-core' ), $n );
		return '<p class="agc-left' . ( $low && $n <= $low ? ' agc-left--low' : '' ) . '">' . esc_html( $txt ) . '</p>';
	}

	/**
	 * Stock left; for products with options, the options added up (null = not counted).
	 *
	 * @param WC_Product $product Product.
	 * @return int|null
	 */
	private static function stock_left( $product ) {
		if ( $product->managing_stock() && null !== $product->get_stock_quantity() ) {
			return (int) $product->get_stock_quantity();
		}
		if ( ! $product->is_type( 'variable' ) ) {
			return null;
		}
		$sum = 0;
		foreach ( $product->get_children() as $child_id ) {
			$v = wc_get_product( $child_id );
			if ( ! $v || ! $v->managing_stock() || null === $v->get_stock_quantity() ) {
				return null;
			}
			$sum += max( 0, (int) $v->get_stock_quantity() );
		}
		return $sum;
	}

	/**
	 * Product cards.
	 */
	public static function loop_left() {
		global $product;
		echo self::left_html( $product ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
	}

	/**
	 * Product page.
	 */
	public static function single_left() {
		global $product;
		echo self::left_html( $product ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
	}

	/**
	 * Slim line above the shop, product, cart and checkout.
	 */
	public static function bar() {
		static $done = false;
		if ( $done ) {
			return;
		}
		$done = true;
		echo self::render( 'bar' ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside.
	}

	/**
	 * [agc_festive style="hero|bar"].
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'style' => 'hero',
				'title' => '1',
			),
			$atts,
			'agc_festive'
		);
		return self::render( 'bar' === $atts['style'] ? 'bar' : 'hero', '0' !== (string) $atts['title'] );
	}

	/**
	 * Season box: cut-off, countdown, early-bird, days; or "closed" + notify form.
	 *
	 * @param string $style hero|bar.
	 * @param bool   $title Show the season name.
	 * @return string
	 */
	public static function render( $style, $title = true ) {
		$name   = (string) agc_get( 'fest_name' );
		$cutoff = self::cutoff();
		$from   = self::date_setting( 'fest_from' );
		$to     = self::date_setting( 'fest_to' );
		$range  = ( $from && $to ) ? self::day_label( $from->format( 'Y-m-d' ) ) . ' – ' . self::day_label( $to->format( 'Y-m-d' ) ) : '';
		$cls    = 'agc-fest agc-fest--' . $style;

		if ( self::closed() ) {
			$h  = '<div class="' . esc_attr( $cls ) . ' agc-fest--closed">';
			/* translators: %s: season name */
			$h .= '<p class="agc-fest__title">' . esc_html( sprintf( __( 'Pre-orders for %s have closed. Thank you!', 'agency-core' ), $name ) ) . '</p>';
			if ( 'hero' === $style && agc_get( 'fest_notify' ) ) {
				$h .= self::notify_form();
			}
			return $h . '</div>';
		}

		$h = '<div class="' . esc_attr( $cls ) . '">';
		if ( 'hero' === $style && $name && $title ) {
			$h .= '<p class="agc-fest__kicker">' . esc_html( $name ) . '</p>';
		}
		$h .= '<div class="agc-fest__row">';
		if ( $cutoff ) {
			/* translators: %s: date */
			$h .= '<p class="agc-fest__cut">' . esc_html( sprintf( __( 'Order by %s', 'agency-core' ), wp_date( _x( 'j M, g:i a', 'festive cut-off', 'agency-core' ), $cutoff->getTimestamp() ) ) ) . '</p>';
			$secs = max( 0, $cutoff->getTimestamp() - self::now()->getTimestamp() );
			$h   .= '<p class="agc-fest__count" data-agc-count="' . esc_attr( (string) $cutoff->getTimestamp() ) . '" aria-label="' . esc_attr__( 'Time left to order', 'agency-core' ) . '">'
				. '<span><b>' . (int) floor( $secs / 86400 ) . '</b> ' . esc_html__( 'days', 'agency-core' ) . '</span>'
				. '<span><b>' . (int) floor( ( $secs % 86400 ) / 3600 ) . '</b> ' . esc_html__( 'hrs', 'agency-core' ) . '</span>'
				. '<span><b>' . (int) floor( ( $secs % 3600 ) / 60 ) . '</b> ' . esc_html__( 'min', 'agency-core' ) . '</span></p>';
		}
		if ( $range ) {
			/* translators: %s: date range */
			$h .= '<p class="agc-fest__days">' . esc_html( sprintf( __( 'Collection & delivery: %s', 'agency-core' ), $range ) ) . '</p>';
		}
		$pct = self::early_pct();
		if ( $pct ) {
			$end = self::date_setting( 'fest_early_end' );
			/* translators: 1: percent, 2: date */
			$h .= '<p class="agc-fest__early">' . esc_html( sprintf( __( 'Early-bird %1$s%% off until %2$s', 'agency-core' ), wc_format_localized_decimal( $pct ), self::day_label( $end->format( 'Y-m-d' ) ) ) ) . '</p>';
		}
		return $h . '</div></div>';
	}

	/**
	 * "Tell me when you open" form (closed season).
	 *
	 * @return string
	 */
	private static function notify_form() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		if ( isset( $_GET['agc_notify'] ) && 'ok' === $_GET['agc_notify'] ) {
			return '<p class="agc-fest__ok" role="status">' . esc_html__( 'Thank you. We will message you when the next season opens.', 'agency-core' ) . '</p>';
		}
		$h  = '<form class="agc-fest__notify" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		$h .= '<label for="agc-notify-phone">' . esc_html__( 'Leave your WhatsApp number and we will tell you when we open again.', 'agency-core' ) . '</label>';
		$h .= '<span class="agc-fest__notify-row"><input id="agc-notify-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="012-345 6789">';
		$h .= '<button type="submit" class="button">' . esc_html__( 'Notify me', 'agency-core' ) . '</button></span>';
		$h .= '<input type="text" name="website" value="" tabindex="-1" autocomplete="off" class="agc-hp" aria-hidden="true">';
		$h .= '<input type="hidden" name="action" value="agc_fest_notify">' . wp_nonce_field( 'agc_fest_notify', '_agcn', true, false ) . '</form>';
		return $h;
	}

	/**
	 * Save a "notify me" number (no other data is kept).
	 */
	public static function save_notify() {
		$back = wp_get_referer() ? wp_get_referer() : home_url( '/' );
		if ( ! isset( $_POST['_agcn'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_agcn'] ) ), 'agc_fest_notify' ) || ! empty( $_POST['website'] ) ) {
			wp_safe_redirect( $back );
			exit;
		}
		$phone = preg_replace( '/\D+/', '', (string) wp_unslash( $_POST['phone'] ?? '' ) );
		if ( strlen( $phone ) >= 9 && strlen( $phone ) <= 15 ) {
			$list = (array) get_option( self::NOTIFY, array() );
			$seen = wp_list_pluck( $list, 'p' );
			if ( ! in_array( $phone, $seen, true ) && count( $list ) < 5000 ) {
				$list[] = array(
					'p' => $phone,
					't' => time(),
				);
				update_option( self::NOTIFY, $list, false );
			}
		}
		wp_safe_redirect( add_query_arg( 'agc_notify', 'ok', remove_query_arg( 'agc_notify', $back ) ) );
		exit;
	}

	/* ------------------------------------------------------------------ cart and checkout */

	/**
	 * Early-bird discount as a negative fee.
	 *
	 * @param WC_Cart $cart Cart.
	 */
	public static function early_bird( $cart ) {
		$pct = self::early_pct();
		if ( ! $pct || $cart->is_empty() ) {
			return;
		}
		$amount = round( (float) $cart->get_subtotal() * $pct / 100, wc_get_price_decimals() );
		if ( $amount > 0 ) {
			/* translators: %s: percent */
			$cart->add_fee( sprintf( __( 'Early-bird %s%% off', 'agency-core' ), wc_format_localized_decimal( $pct ) ), -$amount, false );
		}
	}

	/**
	 * What the customer picked (checkout POST, or the serialized form during the order-review refresh).
	 *
	 * @return string "Y-m-d|slot" or ''.
	 */
	private static function posted_when() {
		// phpcs:disable WordPress.Security.NonceVerification -- WooCommerce checks the checkout nonce.
		if ( isset( $_POST['agc_fest_when'] ) ) {
			return sanitize_text_field( wp_unslash( $_POST['agc_fest_when'] ) );
		}
		if ( isset( $_POST['post_data'] ) ) {
			parse_str( wp_unslash( $_POST['post_data'] ), $data ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
			return isset( $data['agc_fest_when'] ) ? sanitize_text_field( $data['agc_fest_when'] ) : '';
		}
		// phpcs:enable
		return '';
	}

	/**
	 * Day and time picker under the shipping choice (re-rendered when the shipping choice changes).
	 */
	public static function picker() {
		$mode = self::cart_mode();
		echo '<tr class="agc-fest-pick-row"><td colspan="2">';
		if ( 'courier' === $mode ) {
			$note = (string) agc_get( 'fest_courier_note' );
			if ( $note ) {
				echo '<p class="agc-fest-pick__note">' . esc_html( $note ) . '</p>';
			}
			echo '</td></tr>';
			return;
		}
		$avail   = self::availability( $mode );
		$current = self::posted_when();
		$title   = 'delivery' === $mode ? __( 'Delivery day and time', 'agency-core' ) : __( 'Collection day and time', 'agency-core' );
		echo '<div class="agc-fest-pick" data-mode="' . esc_attr( $mode ) . '">';
		echo '<label class="agc-fest-pick__title" for="agc_fest_when">' . esc_html( $title ) . ' <abbr class="required" title="' . esc_attr__( 'required', 'agency-core' ) . '">*</abbr></label>';
		if ( ! $avail ) {
			echo '<p class="agc-fest-pick__none">' . esc_html__( 'No days left to choose. Please contact the shop.', 'agency-core' ) . '</p></div></td></tr>';
			return;
		}
		echo '<select id="agc_fest_when" name="agc_fest_when" class="agc-fest-pick__select"><option value="">' . esc_html__( 'Choose a day and time', 'agency-core' ) . '</option>';
		foreach ( $avail as $day => $slots ) {
			echo '<optgroup label="' . esc_attr( self::day_label( $day ) ) . '">';
			foreach ( $slots as $slot => $left ) {
				$val = $day . '|' . $slot;
				/* translators: %d: places left */
				$txt = $left ? sprintf( __( '%d left', 'agency-core' ), $left ) : __( 'Full', 'agency-core' );
				printf(
					'<option value="%1$s" data-day="%2$s" data-daylabel="%3$s" data-slot="%4$s" data-left="%5$d" %6$s %7$s>%3$s · %4$s · %8$s</option>',
					esc_attr( $val ),
					esc_attr( $day ),
					esc_attr( self::day_label( $day ) ),
					esc_attr( $slot ),
					(int) $left,
					selected( $current, $val, false ),
					disabled( 0, $left, false ),
					esc_html( $txt )
				);
			}
			echo '</optgroup>';
		}
		echo '</select>';
		if ( 'collect' === $mode && agc_get( 'business_address' ) ) {
			/* translators: %s: address */
			echo '<p class="agc-fest-pick__note">' . esc_html( sprintf( __( 'Collect from: %s', 'agency-core' ), agc_get( 'business_address' ) ) ) . '</p>';
		}
		echo '</div></td></tr>';
	}

	/**
	 * Closed season: no new orders.
	 */
	public static function checkout_closed() {
		if ( self::closed() ) {
			wc_add_notice( esc_html__( 'Pre-orders for this season have closed.', 'agency-core' ), 'error' );
		}
	}

	/**
	 * A day and time with a place left is required for collection and delivery.
	 *
	 * @param array    $data   Checkout data.
	 * @param WP_Error $errors Errors.
	 */
	public static function validate( $data, $errors ) {
		$mode = self::mode_of( $data['shipping_method'][0] ?? '' );
		if ( 'courier' === $mode ) {
			return;
		}
		$when = self::posted_when();
		$p    = explode( '|', $when, 2 );
		if ( 2 !== count( $p ) ) {
			$errors->add( 'agc_fest_when', 'delivery' === $mode ? __( 'Please choose a delivery day and time.', 'agency-core' ) : __( 'Please choose a collection day and time.', 'agency-core' ) );
			return;
		}
		self::forget_booked();
		$avail = self::availability( $mode );
		if ( ! isset( $avail[ $p[0] ][ $p[1] ] ) ) {
			$errors->add( 'agc_fest_when', __( 'That day or time can no longer be chosen. Please choose another.', 'agency-core' ) );
		} elseif ( $avail[ $p[0] ][ $p[1] ] < 1 ) {
			$errors->add( 'agc_fest_when', __( 'That time has just filled up. Please choose another.', 'agency-core' ) );
		}
	}

	/**
	 * Keep the choice on the order.
	 *
	 * @param WC_Order $order Order.
	 * @param array    $data  Checkout data.
	 */
	public static function save_order( $order, $data ) {
		$mode = self::mode_of( $data['shipping_method'][0] ?? '' );
		$order->update_meta_data( self::MODE, $mode );
		if ( 'courier' !== $mode ) {
			$p = explode( '|', self::posted_when(), 2 );
			if ( 2 === count( $p ) ) {
				$order->update_meta_data( self::DATE, $p[0] );
				$order->update_meta_data( self::SLOT, $p[1] );
			}
		}
	}

	/* ------------------------------------------------------------------ order page, emails, tracking */

	/**
	 * Timeline + day and time on the thank-you page, "view order" and order tracking.
	 *
	 * @param WC_Order $order Order.
	 */
	public static function order_timeline( $order ) {
		if ( ! $order instanceof WC_Order || ! $order->get_meta( self::MODE ) ) {
			return;
		}
		$status = $order->get_status();
		$steps  = array(
			array( __( 'Order received', 'agency-core' ), array( 'pending', 'on-hold' ) ),
			array( __( 'Paid · being made', 'agency-core' ), array( 'processing' ) ),
			array( 'collect' === $order->get_meta( self::MODE ) ? __( 'Ready for collection', 'agency-core' ) : __( 'On its way', 'agency-core' ), array( self::STATUS ) ),
			array( __( 'Done', 'agency-core' ), array( 'completed' ) ),
		);
		$at = -1;
		foreach ( $steps as $i => $s ) {
			if ( in_array( $status, $s[1], true ) ) {
				$at = $i;
			}
		}
		echo '<section class="agc-ord">';
		echo '<p class="agc-ord__when"><strong>' . esc_html( self::order_line( $order ) ) . '</strong></p>';
		if ( $at >= 0 ) {
			echo '<ol class="agc-tl">';
			foreach ( $steps as $i => $s ) {
				$cls = $i < $at ? 'is-done' : ( $i === $at ? 'is-now' : '' );
				echo '<li class="' . esc_attr( $cls ) . '"' . ( $i === $at ? ' aria-current="step"' : '' ) . '>' . esc_html( $s[0] ) . '</li>';
			}
			echo '</ol>';
		} else {
			/* translators: %s: order status */
			echo '<p>' . esc_html( sprintf( __( 'Order status: %s', 'agency-core' ), wc_get_order_status_name( $status ) ) ) . '</p>';
		}
		if ( AGC_Receipts::wants_receipt( $order ) && ! is_wc_endpoint_url( 'order-received' ) ) {
			echo AGC_Receipts::form( $order ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside.
		}
		$ics = self::ics( $order );
		if ( $ics && $at >= 0 && $at < 3 ) {
			echo '<p><a class="button agc-ord__cal" download="order-' . esc_attr( $order->get_order_number() ) . '.ics" href="' . esc_attr( $ics ) . '">' . esc_html__( 'Add to my calendar', 'agency-core' ) . '</a></p>';
		}
		echo '</section>';
	}

	/**
	 * Calendar file (data: link).
	 *
	 * @param WC_Order $order Order.
	 * @return string
	 */
	private static function ics( $order ) {
		$day  = (string) $order->get_meta( self::DATE );
		$slot = (string) $order->get_meta( self::SLOT );
		if ( ! $day || ! preg_match( '/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/', $slot, $m ) ) {
			return '';
		}
		$tz    = wp_timezone();
		$start = DateTimeImmutable::createFromFormat( 'Y-m-d H:i', sprintf( '%s %02d:%s', $day, $m[1], $m[2] ), $tz );
		$end   = DateTimeImmutable::createFromFormat( 'Y-m-d H:i', sprintf( '%s %02d:%s', $day, $m[3], $m[4] ), $tz );
		if ( ! $start || ! $end ) {
			return '';
		}
		$utc  = new DateTimeZone( 'UTC' );
		$what = 'collect' === $order->get_meta( self::MODE ) ? __( 'Collect order', 'agency-core' ) : __( 'Delivery of order', 'agency-core' );
		$esc  = static function ( $s ) {
			return str_replace( array( '\\', ',', ';', "\n" ), array( '\\\\', '\\,', '\\;', '\\n' ), $s );
		};
		$lines = array(
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//agency-core//festive//EN',
			'BEGIN:VEVENT',
			'UID:order-' . $order->get_id() . '@' . wp_parse_url( home_url(), PHP_URL_HOST ),
			'DTSTAMP:' . gmdate( 'Ymd\THis\Z' ),
			'DTSTART:' . $start->setTimezone( $utc )->format( 'Ymd\THis\Z' ),
			'DTEND:' . $end->setTimezone( $utc )->format( 'Ymd\THis\Z' ),
			'SUMMARY:' . $esc( $what . ' #' . $order->get_order_number() . ' – ' . get_bloginfo( 'name' ) ),
			'LOCATION:' . $esc( 'collect' === $order->get_meta( self::MODE ) ? (string) agc_get( 'business_address' ) : $order->get_formatted_shipping_address() ),
			'END:VEVENT',
			'END:VCALENDAR',
		);
		return 'data:text/calendar;charset=utf-8,' . rawurlencode( implode( "\r\n", $lines ) );
	}

	/**
	 * Day and time in every order email.
	 *
	 * @param WC_Order $order         Order.
	 * @param bool     $sent_to_admin To admin.
	 * @param bool     $plain_text    Plain text.
	 */
	public static function email_meta( $order, $sent_to_admin = false, $plain_text = false ) {
		$line = $order instanceof WC_Order ? self::order_line( $order ) : '';
		if ( ! $line ) {
			return;
		}
		if ( $plain_text ) {
			echo "\n" . esc_html( $line ) . "\n";
			if ( 'collect' === $order->get_meta( self::MODE ) && agc_get( 'business_address' ) ) {
				/* translators: %s: address */
				echo esc_html( sprintf( __( 'Collect from: %s', 'agency-core' ), agc_get( 'business_address' ) ) ) . "\n";
			}
			return;
		}
		echo '<p style="font-size:16px;margin:0 0 16px"><strong>' . esc_html( $line ) . '</strong>';
		if ( 'collect' === $order->get_meta( self::MODE ) && agc_get( 'business_address' ) ) {
			/* translators: %s: address */
			echo '<br>' . esc_html( sprintf( __( 'Collect from: %s', 'agency-core' ), agc_get( 'business_address' ) ) );
		}
		echo '</p>';
	}

	/* ------------------------------------------------------------------ "Ready" status and email */

	/**
	 * Register the status.
	 */
	public static function register_status() {
		register_post_status(
			'wc-' . self::STATUS,
			array(
				'label'                     => _x( 'Ready', 'order status', 'agency-core' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				/* translators: %s: number of orders */
				'label_count'               => _n_noop( 'Ready <span class="count">(%s)</span>', 'Ready <span class="count">(%s)</span>', 'agency-core' ),
			)
		);
	}

	/**
	 * Add "Ready" after "Processing".
	 *
	 * @param array $statuses Statuses.
	 * @return array
	 */
	public static function order_statuses( $statuses ) {
		$out = array();
		foreach ( $statuses as $k => $v ) {
			$out[ $k ] = $v;
			if ( 'wc-processing' === $k ) {
				$out[ 'wc-' . self::STATUS ] = _x( 'Ready', 'order status', 'agency-core' );
			}
		}
		return $out;
	}

	/**
	 * "Ready" orders are paid.
	 *
	 * @param array $statuses Statuses.
	 * @return array
	 */
	public static function paid_statuses( $statuses ) {
		$statuses[] = self::STATUS;
		return array_values( array_unique( $statuses ) );
	}

	/**
	 * The "Your order is ready" email.
	 *
	 * @param array $emails Emails.
	 * @return array
	 */
	public static function email_classes( $emails ) {
		require_once AGC_DIR . 'includes/class-festive-email.php';
		$emails['AGC_Email_Ready'] = new AGC_Email_Ready();
		return $emails;
	}

	/**
	 * Let WooCommerce fire emails on the new status.
	 *
	 * @param array $actions Actions.
	 * @return array
	 */
	public static function email_actions( $actions ) {
		$actions[] = 'woocommerce_order_status_' . self::STATUS;
		return $actions;
	}

	/**
	 * One-click "Ready" in the order list.
	 *
	 * @param array    $actions Actions.
	 * @param WC_Order $order   Order.
	 * @return array
	 */
	public static function admin_order_actions( $actions, $order ) {
		if ( $order->has_status( 'processing' ) ) {
			$actions = array(
				self::STATUS => array(
					'url'    => self::status_url( $order, self::STATUS ),
					'name'   => _x( 'Ready', 'order status', 'agency-core' ),
					'action' => self::STATUS,
				),
			) + $actions;
		}
		return $actions;
	}

	/**
	 * WooCommerce's own "change status" link (nonce-protected).
	 *
	 * @param WC_Order $order  Order.
	 * @param string   $status Status without wc-.
	 * @return string
	 */
	public static function status_url( $order, $status ) {
		return wp_nonce_url( admin_url( 'admin-ajax.php?action=woocommerce_mark_order_status&status=' . $status . '&order_id=' . $order->get_id() ), 'woocommerce-mark-order-status' );
	}

	/**
	 * Bulk "Change status to Ready".
	 *
	 * @param array $actions Actions.
	 * @return array
	 */
	public static function bulk_actions( $actions ) {
		$actions[ 'mark_' . self::STATUS ] = __( 'Change status to Ready', 'agency-core' );
		return $actions;
	}

	/* ------------------------------------------------------------------ admin */

	/**
	 * Order list column.
	 *
	 * @param array $cols Columns.
	 * @return array
	 */
	public static function columns( $cols ) {
		$out = array();
		foreach ( $cols as $k => $v ) {
			$out[ $k ] = $v;
			if ( 'order_status' === $k ) {
				$out['agc_fest'] = __( 'Collect / deliver', 'agency-core' );
			}
		}
		return $out;
	}

	/**
	 * Column (orders table).
	 *
	 * @param string   $col   Column.
	 * @param WC_Order $order Order.
	 */
	public static function column( $col, $order ) {
		if ( 'agc_fest' === $col && $order instanceof WC_Order ) {
			echo esc_html( self::order_line( $order ) );
			if ( $order->get_meta( AGC_Receipts::META ) ) {
				echo '<br><small>' . esc_html__( 'Receipt uploaded', 'agency-core' ) . '</small>';
			}
		}
	}

	/**
	 * Column (posts table).
	 *
	 * @param string $col     Column.
	 * @param int    $post_id Order ID.
	 */
	public static function column_legacy( $col, $post_id ) {
		if ( 'agc_fest' === $col ) {
			self::column( $col, wc_get_order( $post_id ) );
		}
	}

	/**
	 * Order screen: the day and time.
	 *
	 * @param WC_Order $order Order.
	 */
	public static function admin_order_box( $order ) {
		$line = self::order_line( $order );
		if ( $line ) {
			echo '<p><strong>' . esc_html__( 'Collect / deliver', 'agency-core' ) . ':</strong><br>' . esc_html( $line ) . '</p>';
		}
	}

	/**
	 * Products beyond the plan's item limit.
	 */
	public static function item_limit_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$limit  = (int) agc_get( 'fest_item_limit' );
		if ( ! $limit || ! $screen || 'edit-product' !== $screen->id ) {
			return;
		}
		$count = (int) wp_count_posts( 'product' )->publish;
		if ( $count > $limit ) {
			/* translators: 1: limit, 2: count */
			printf( '<div class="notice notice-warning"><p>%s</p></div>', esc_html( sprintf( __( 'Your festive shop plan includes up to %1$d items; %2$d are published. Ask your web studio before adding more.', 'agency-core' ), $limit, $count ) ) );
		}
	}

	/**
	 * WooCommerce → Festive orders.
	 */
	public static function admin_menu() {
		if ( ! self::on() && ! get_option( self::NOTIFY ) ) {
			return;
		}
		add_submenu_page( 'woocommerce', __( 'Festive orders', 'agency-core' ), __( 'Festive orders', 'agency-core' ), 'edit_shop_orders', 'agc-festive', array( __CLASS__, 'admin_page' ) );
	}

	/**
	 * Orders that matter this season.
	 *
	 * @return WC_Order[]
	 */
	private static function season_orders() {
		return wc_get_orders(
			array(
				'limit'      => -1,
				'type'       => 'shop_order',
				'status'     => self::holding_statuses(),
				'orderby'    => 'date',
				'order'      => 'ASC',
				'meta_query' => array( array( 'key' => self::MODE, 'compare' => 'EXISTS' ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
			)
		);
	}

	/**
	 * The owner's page: what to make each day, orders per time slot, payments to check.
	 */
	public static function admin_page() {
		if ( ! current_user_can( 'edit_shop_orders' ) ) {
			return;
		}
		$orders = self::season_orders();
		$days   = array();
		foreach ( $orders as $o ) {
			$d = (string) $o->get_meta( self::DATE );
			$days[ $d ? $d : 'courier' ] = true;
		}
		$from = self::date_setting( 'fest_from' );
		$to   = self::date_setting( 'fest_to' );
		for ( $d = $from; $from && $to && $d <= $to; $d = $d->modify( '+1 day' ) ) {
			$days[ $d->format( 'Y-m-d' ) ] = true;
		}
		$days = array_keys( $days );
		sort( $days );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- a view filter.
		$sel = isset( $_GET['day'] ) ? sanitize_text_field( wp_unslash( $_GET['day'] ) ) : '';
		if ( ! in_array( $sel, $days, true ) ) {
			$today = self::now()->format( 'Y-m-d' );
			$sel   = $days ? $days[0] : '';
			foreach ( $days as $d ) {
				if ( 'courier' !== $d && $d >= $today ) {
					$sel = $d;
					break;
				}
			}
		}

		$check = 0;
		$make  = 0;
		$total = 0.0;
		foreach ( $orders as $o ) {
			if ( $o->has_status( 'on-hold' ) ) {
				++$check;
			}
			if ( $o->has_status( 'processing' ) ) {
				++$make;
			}
			if ( $o->is_paid() ) {
				$total += (float) $o->get_total();
			}
		}

		echo '<div class="wrap agc-fadm"><h1>' . esc_html__( 'Festive orders', 'agency-core' ) . ' <small>' . esc_html( (string) agc_get( 'fest_name' ) ) . '</small></h1>';
		self::admin_css();
		$cut = self::cutoff();
		if ( $cut ) {
			echo '<p>' . ( self::closed() ? esc_html__( 'Pre-orders are closed.', 'agency-core' ) : esc_html( sprintf( /* translators: %s: date */ __( 'Pre-orders close %s.', 'agency-core' ), wp_date( 'j M Y, g:i a', $cut->getTimestamp() ) ) ) ) . ' <a href="' . esc_url( admin_url( 'options-general.php?page=agency-core#agc_festive' ) ) . '">' . esc_html__( 'Change dates and times', 'agency-core' ) . '</a></p>';
		}
		echo '<div class="agc-kpis">';
		printf( '<div><b>%d</b>%s</div>', count( $orders ), esc_html__( 'orders this season', 'agency-core' ) );
		printf( '<div class="%s"><b>%d</b>%s</div>', $check ? 'is-warn' : '', (int) $check, esc_html__( 'payments to check', 'agency-core' ) );
		printf( '<div><b>%d</b>%s</div>', (int) $make, esc_html__( 'paid, to make', 'agency-core' ) );
		printf( '<div><b>%s</b>%s</div>', wp_kses_post( wc_price( $total ) ), esc_html__( 'paid so far', 'agency-core' ) );
		echo '</div>';

		if ( ! $days ) {
			echo '<p>' . esc_html__( 'No orders yet.', 'agency-core' ) . '</p></div>';
			return;
		}
		echo '<nav class="agc-days" aria-label="' . esc_attr__( 'Days', 'agency-core' ) . '">';
		foreach ( $days as $d ) {
			$n = 0;
			foreach ( $orders as $o ) {
				$od = (string) $o->get_meta( self::DATE );
				$n += ( $od ? $od : 'courier' ) === $d ? 1 : 0;
			}
			printf(
				'<a href="%s" class="%s">%s <span>%d</span></a>',
				esc_url( add_query_arg( array( 'page' => 'agc-festive', 'day' => $d ), admin_url( 'admin.php' ) ) ),
				$d === $sel ? 'is-on' : '',
				esc_html( 'courier' === $d ? __( 'Courier', 'agency-core' ) : self::day_label( $d ) ),
				(int) $n
			);
		}
		echo '</nav>';

		$todays = array_filter(
			$orders,
			static function ( $o ) use ( $sel ) {
				$od = (string) $o->get_meta( self::DATE );
				return ( $od ? $od : 'courier' ) === $sel;
			}
		);
		$make_list = array();
		foreach ( $todays as $o ) {
			$paid = $o->is_paid();
			foreach ( $o->get_items() as $item ) {
				$name = $item->get_name();
				if ( ! isset( $make_list[ $name ] ) ) {
					$make_list[ $name ] = array( 0, 0 );
				}
				$make_list[ $name ][ $paid ? 0 : 1 ] += (int) $item->get_quantity();
			}
		}
		ksort( $make_list );
		echo '<div class="agc-cols"><section class="agc-card"><h2>' . esc_html__( 'What to make', 'agency-core' ) . '</h2>';
		if ( $make_list ) {
			echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'Item', 'agency-core' ) . '</th><th class="num">' . esc_html__( 'Paid', 'agency-core' ) . '</th><th class="num">' . esc_html__( 'Payment to check', 'agency-core' ) . '</th></tr></thead><tbody>';
			foreach ( $make_list as $name => $q ) {
				printf( '<tr><td>%s</td><td class="num"><b>%d</b></td><td class="num">%s</td></tr>', esc_html( $name ), (int) $q[0], $q[1] ? (int) $q[1] : '–' );
			}
			echo '</tbody></table>';
		} else {
			echo '<p>' . esc_html__( 'Nothing for this day yet.', 'agency-core' ) . '</p>';
		}
		echo '<p><button type="button" class="button" onclick="window.print()">' . esc_html__( 'Print', 'agency-core' ) . '</button></p></section>';

		echo '<section class="agc-card agc-card--wide"><h2>' . esc_html__( 'Orders', 'agency-core' ) . '</h2>';
		if ( $todays ) {
			echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'Time', 'agency-core' ) . '</th><th>' . esc_html__( 'Order', 'agency-core' ) . '</th><th>' . esc_html__( 'Customer', 'agency-core' ) . '</th><th>' . esc_html__( 'Items', 'agency-core' ) . '</th><th>' . esc_html__( 'Status', 'agency-core' ) . '</th><th></th></tr></thead><tbody>';
			usort(
				$todays,
				static function ( $a, $b ) {
					return strcmp( (string) $a->get_meta( self::SLOT ), (string) $b->get_meta( self::SLOT ) );
				}
			);
			foreach ( $todays as $o ) {
				$items = array();
				foreach ( $o->get_items() as $item ) {
					$items[] = $item->get_quantity() . ' × ' . $item->get_name();
				}
				$btns = array();
				if ( $o->has_status( 'on-hold' ) ) {
					if ( $o->get_meta( AGC_Receipts::META ) ) {
						$btns[] = '<a class="button" target="_blank" rel="noopener" href="' . esc_url( AGC_Receipts::url( $o ) ) . '">' . esc_html__( 'See receipt', 'agency-core' ) . '</a>';
					}
					$btns[] = '<a class="button button-primary" href="' . esc_url( self::status_url( $o, 'processing' ) ) . '">' . esc_html__( 'Payment received', 'agency-core' ) . '</a>';
				} elseif ( $o->has_status( 'processing' ) ) {
					$btns[] = '<a class="button button-primary" href="' . esc_url( self::status_url( $o, self::STATUS ) ) . '">' . esc_html__( 'Ready', 'agency-core' ) . '</a>';
				} elseif ( $o->has_status( self::STATUS ) ) {
					$btns[] = '<a class="button" href="' . esc_url( self::status_url( $o, 'completed' ) ) . '">' . esc_html__( 'Done', 'agency-core' ) . '</a>';
				}
				printf(
					'<tr><td>%s<br><small>%s</small></td><td><a href="%s">#%s</a></td><td>%s<br><small>%s</small></td><td>%s</td><td><mark class="order-status status-%s"><span>%s</span></mark></td><td class="agc-btns">%s</td></tr>',
					esc_html( (string) $o->get_meta( self::SLOT ) ),
					esc_html( self::mode_label( (string) $o->get_meta( self::MODE ) ) ),
					esc_url( $o->get_edit_order_url() ),
					esc_html( $o->get_order_number() ),
					esc_html( $o->get_formatted_billing_full_name() ),
					esc_html( $o->get_billing_phone() ),
					esc_html( implode( ', ', $items ) ),
					esc_attr( $o->get_status() ),
					esc_html( wc_get_order_status_name( $o->get_status() ) ),
					implode( ' ', $btns ) // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts above.
				);
			}
			echo '</tbody></table>';
		} else {
			echo '<p>' . esc_html__( 'No orders for this day yet.', 'agency-core' ) . '</p>';
		}
		echo '</section></div>';

		$notify = (array) get_option( self::NOTIFY, array() );
		if ( $notify ) {
			/* translators: %d: count */
			echo '<section class="agc-card"><h2>' . esc_html( sprintf( __( 'Asked to be told when you open again (%d)', 'agency-core' ), count( $notify ) ) ) . '</h2><p class="agc-phones">';
			foreach ( $notify as $n ) {
				echo '<span>' . esc_html( $n['p'] ) . '</span> ';
			}
			echo '</p></section>';
		}
		echo '</div>';
	}

	/**
	 * Small admin styles (this page only).
	 */
	private static function admin_css() {
		echo '<style>
.agc-fadm h1 small{font-size:14px;color:#646970;font-weight:400;margin-left:6px}
.agc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.agc-kpis div{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:12px 14px;color:#50575e}
.agc-kpis b{display:block;font-size:24px;line-height:1.2;color:#1d2327}.agc-kpis .is-warn{border-color:#dba617;background:#fcf9e8}
.agc-days{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px}
.agc-days a{background:#fff;border:1px solid #c3c4c7;border-radius:999px;padding:6px 12px;text-decoration:none;color:#1d2327}
.agc-days a span{color:#646970;margin-left:4px}.agc-days a.is-on{background:#1d2327;border-color:#1d2327;color:#fff}.agc-days a.is-on span{color:#c3c4c7}
.agc-cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:16px;align-items:start}
.agc-card{background:#fff;border:1px solid #dcdcde;border-radius:8px;padding:4px 16px 12px;margin-bottom:16px}
.agc-card .num{text-align:right}.agc-btns{white-space:nowrap}.agc-btns .button{margin:2px 0}
.agc-phones span{display:inline-block;background:#f0f0f1;border-radius:4px;padding:2px 8px;margin:2px}
@media (max-width:960px){.agc-cols{grid-template-columns:minmax(0,1fr)}}
@media print{#adminmenumain,#wpadminbar,.agc-days,.agc-kpis,.button,.notice,#wpfooter{display:none!important}#wpcontent{margin:0!important}}
</style>';
	}
}
