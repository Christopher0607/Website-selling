<?php
/**
 * Loyverse POS (2026-11-17, decision 42): paid orders from the website, table QR and the counter become receipts
 * in the shop's own Loyverse, so its reports and stock include them.
 *
 * The shop makes an access token in Loyverse (Back Office → Settings → Access tokens) and pastes it into the shop
 * dashboard (#/loyverse). Products are matched by SKU (best: the same SKU in both), otherwise by the same name.
 * Loyverse API: https://developer.loyverse.com/docs/ (POST /v1.0/receipts, GET /stores, /payment_types, /items).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Loyverse sync.
 */
class AGC_Loyverse {

	const OPT   = 'agc_loyverse';        // settings (no secrets): on, store, pay map, other, since.
	const TOKEN = 'agc_loyverse_token';  // the access token, on its own (not autoloaded, never sent to the browser).
	const CACHE = 'agc_loyverse_cache';  // stores, payment types and items from Loyverse (refreshed on "Check again").
	const META  = '_agc_loyverse';       // receipt number once sent.
	const ERR   = '_agc_loyverse_err';   // last error.
	const TRIES = '_agc_loyverse_tries';
	const QUEUED = '_agc_loyverse_q';
	const HOOK  = 'agc_loyverse_send';
	const NS    = 'agc/v1';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'changed' ), 30, 4 );
		add_action( 'woocommerce_payment_complete', array( __CLASS__, 'paid' ), 30 );
		add_action( self::HOOK, array( __CLASS__, 'send' ), 10, 1 );
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/* ------------------------------------------------------------------ settings */

	/**
	 * Settings with defaults.
	 *
	 * @return array
	 */
	public static function cfg() {
		$c = get_option( self::OPT, array() );
		return array_merge(
			array(
				'on'    => 0,
				'store' => '',
				'pay'   => array(),
				'other' => '',
				'since' => 0,
			),
			is_array( $c ) ? $c : array()
		);
	}

	/**
	 * Save settings.
	 *
	 * @param array $c Settings.
	 */
	private static function save_cfg( $c ) {
		update_option( self::OPT, $c, false );
	}

	/**
	 * The access token.
	 *
	 * @return string
	 */
	private static function token() {
		return (string) get_option( self::TOKEN, '' );
	}

	/**
	 * Sending is on and connected.
	 *
	 * @return bool
	 */
	public static function on() {
		$c = self::cfg();
		return ! empty( $c['on'] ) && '' !== self::token() && '' !== (string) $c['store'];
	}

	/**
	 * Our payment methods (table / counter ones, plus the website's).
	 *
	 * @return array key => label
	 */
	public static function methods() {
		$m = class_exists( 'AGC_Table' ) ? AGC_Table::methods() : array();
		$m = array_merge(
			array( 'cash' => __( 'Cash', 'agency-core' ) ),
			$m,
			array(
				'online'  => __( 'Paid online', 'agency-core' ),
				'duitnow' => __( 'DuitNow', 'agency-core' ),
			)
		);
		return $m;
	}

	/* ------------------------------------------------------------------ Loyverse API */

	/**
	 * API base (a test server can stand in with AGC_LOYVERSE_BASE).
	 *
	 * @return string
	 */
	private static function base() {
		return rtrim( (string) apply_filters( 'agc_loyverse_base', defined( 'AGC_LOYVERSE_BASE' ) ? AGC_LOYVERSE_BASE : 'https://api.loyverse.com/v1.0' ), '/' );
	}

	/**
	 * Call the Loyverse API.
	 *
	 * @param string     $method GET / POST.
	 * @param string     $path   Path, e.g. /stores.
	 * @param array|null $body   JSON body.
	 * @param string     $token  Token (default: the saved one).
	 * @return array|WP_Error Decoded JSON.
	 */
	private static function call( $method, $path, $body = null, $token = '' ) {
		$token = '' !== $token ? $token : self::token();
		if ( '' === $token ) {
			return new WP_Error( 'agc_lv_token', __( 'Not connected to Loyverse yet.', 'agency-core' ) );
		}
		$args = array(
			'method'  => $method,
			'timeout' => 20,
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Accept'        => 'application/json',
				'Content-Type'  => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}
		$r = wp_remote_request( self::base() . $path, $args );
		if ( is_wp_error( $r ) ) {
			/* translators: %s: error */
			return new WP_Error( 'agc_lv_net', sprintf( __( 'Could not reach Loyverse (%s).', 'agency-core' ), $r->get_error_message() ) );
		}
		$code = (int) wp_remote_retrieve_response_code( $r );
		$json = json_decode( (string) wp_remote_retrieve_body( $r ), true );
		if ( $code < 200 || $code >= 300 ) {
			$why = '';
			if ( is_array( $json ) && ! empty( $json['errors'][0] ) ) {
				$e   = $json['errors'][0];
				$why = trim( ( $e['code'] ?? '' ) . ' ' . ( $e['details'] ?? '' ) );
			}
			if ( 401 === $code ) {
				$why = __( 'The access token was not accepted. Make a new one in Loyverse and paste it again.', 'agency-core' );
			} elseif ( 402 === $code ) {
				$why = __( 'Loyverse says this needs a paid add-on or the subscription has lapsed.', 'agency-core' );
			}
			/* translators: 1: HTTP code, 2: details */
			return new WP_Error( 'agc_lv_http', sprintf( __( 'Loyverse said no (%1$d): %2$s', 'agency-core' ), $code, $why ? $why : 'error' ) );
		}
		return is_array( $json ) ? $json : array();
	}

	/**
	 * Stores, payment types and items from Loyverse (cached; $fresh to fetch again).
	 *
	 * @param bool   $fresh Fetch again.
	 * @param string $token Token to try (before saving it).
	 * @return array|WP_Error
	 */
	public static function catalog( $fresh = false, $token = '' ) {
		$c = get_option( self::CACHE, array() );
		if ( ! $fresh && is_array( $c ) && ! empty( $c['at'] ) ) {
			return $c;
		}
		$stores = self::call( 'GET', '/stores', null, $token );
		if ( is_wp_error( $stores ) ) {
			return $stores;
		}
		$types = self::call( 'GET', '/payment_types', null, $token );
		if ( is_wp_error( $types ) ) {
			return $types;
		}
		$variants = array();
		$cursor   = '';
		for ( $page = 0; $page < 20; $page++ ) { // up to 5,000 items
			$items = self::call( 'GET', '/items?limit=250' . ( $cursor ? '&cursor=' . rawurlencode( $cursor ) : '' ), null, $token );
			if ( is_wp_error( $items ) ) {
				return $items;
			}
			foreach ( (array) ( $items['items'] ?? array() ) as $it ) {
				if ( ! empty( $it['deleted_at'] ) ) {
					continue;
				}
				foreach ( (array) ( $it['variants'] ?? array() ) as $v ) {
					if ( empty( $v['variant_id'] ) || ! empty( $v['deleted_at'] ) ) {
						continue;
					}
					$opts       = array_filter( array( $v['option1_value'] ?? '', $v['option2_value'] ?? '', $v['option3_value'] ?? '' ) );
					$variants[] = array(
						'id'   => (string) $v['variant_id'],
						'name' => trim( (string) ( $it['item_name'] ?? '' ) . ( $opts ? ' (' . implode( ', ', $opts ) . ')' : '' ) ),
						'item' => (string) ( $it['item_name'] ?? '' ),
						'sku'  => (string) ( $v['sku'] ?? '' ),
					);
				}
			}
			$cursor = (string) ( $items['cursor'] ?? '' );
			if ( '' === $cursor ) {
				break;
			}
		}
		$c = array(
			'at'       => time(),
			'stores'   => array_values( array_map( static fn( $s ) => array( 'id' => (string) ( $s['id'] ?? '' ), 'name' => (string) ( $s['name'] ?? '' ) ), array_filter( (array) ( $stores['stores'] ?? array() ), static fn( $s ) => empty( $s['deleted_at'] ) ) ) ),
			'types'    => array_values( array_map( static fn( $p ) => array( 'id' => (string) ( $p['id'] ?? '' ), 'name' => (string) ( $p['name'] ?? '' ), 'type' => (string) ( $p['type'] ?? '' ) ), array_filter( (array) ( $types['payment_types'] ?? array() ), static fn( $p ) => empty( $p['deleted_at'] ) ) ) ),
			'variants' => $variants,
		);
		if ( '' === $token ) {
			update_option( self::CACHE, $c, false );
		}
		return $c;
	}

	/**
	 * The Loyverse variant for one of our products: same SKU, else the same name.
	 *
	 * @param WC_Product|false $p    Product.
	 * @param string           $name Name on the order line.
	 * @param array            $cat  Catalog.
	 * @return string Variant ID or ''.
	 */
	private static function variant_for( $p, $name, $cat ) {
		static $by = null;
		if ( null === $by ) {
			$by = array( 'sku' => array(), 'name' => array() );
			foreach ( (array) ( $cat['variants'] ?? array() ) as $v ) {
				if ( '' !== $v['sku'] ) {
					$by['sku'][ strtolower( $v['sku'] ) ] = $v['id'];
				}
				$by['name'][ self::key( $v['name'] ) ] = $by['name'][ self::key( $v['name'] ) ] ?? $v['id'];
				$by['name'][ self::key( $v['item'] ) ] = $by['name'][ self::key( $v['item'] ) ] ?? $v['id'];
			}
		}
		$skus = array();
		if ( $p ) {
			$skus[] = $p->get_sku();
			if ( $p->get_parent_id() ) {
				$par = wc_get_product( $p->get_parent_id() );
				$skus[] = $par ? $par->get_sku() : '';
			}
		}
		foreach ( array_filter( $skus ) as $s ) {
			if ( isset( $by['sku'][ strtolower( $s ) ] ) ) {
				return $by['sku'][ strtolower( $s ) ];
			}
		}
		foreach ( array_filter( array( $name, $p ? $p->get_name() : '' ) ) as $n ) {
			if ( isset( $by['name'][ self::key( $n ) ] ) ) {
				return $by['name'][ self::key( $n ) ];
			}
		}
		return '';
	}

	/**
	 * Name for matching: lower case, single spaces.
	 *
	 * @param string $s Name.
	 * @return string
	 */
	private static function key( $s ) {
		return trim( preg_replace( '/\s+/u', ' ', function_exists( 'mb_strtolower' ) ? mb_strtolower( (string) $s ) : strtolower( (string) $s ) ) );
	}

	/* ------------------------------------------------------------------ sending */

	/**
	 * Status changed: paid → send.
	 *
	 * @param int      $id   Order.
	 * @param string   $from From.
	 * @param string   $to   To.
	 * @param WC_Order $o    Order.
	 */
	public static function changed( $id, $from, $to, $o = null ) {
		if ( in_array( $to, array( 'processing', 'completed' ), true ) ) {
			self::queue( $o instanceof WC_Order ? $o : wc_get_order( $id ) );
		}
	}

	/**
	 * Payment complete → send.
	 *
	 * @param int $id Order.
	 */
	public static function paid( $id ) {
		self::queue( wc_get_order( $id ) );
	}

	/**
	 * Queue an order to be sent (in the background, so paying never waits for Loyverse).
	 *
	 * @param WC_Order|false $o     Order.
	 * @param int            $delay Seconds.
	 */
	public static function queue( $o, $delay = 0 ) {
		if ( ! $o || ! self::on() || $o->get_meta( self::META ) || ! $o->is_paid() || 'shop_order' !== $o->get_type() ) {
			return;
		}
		$c       = self::cfg();
		$created = $o->get_date_created() ? $o->get_date_created()->getTimestamp() : 0;
		if ( $created && $created < (int) $c['since'] ) {
			return; // orders from before the shop connected Loyverse are not sent
		}
		if ( ! $delay && (int) $o->get_meta( self::QUEUED ) > time() - 300 ) {
			return; // already on its way
		}
		$o->update_meta_data( self::QUEUED, time() );
		$o->save_meta_data();
		if ( function_exists( 'as_schedule_single_action' ) ) {
			as_schedule_single_action( time() + $delay, self::HOOK, array( $o->get_id() ), 'agency-core' );
		} else {
			wp_schedule_single_event( time() + $delay, self::HOOK, array( $o->get_id() ) );
		}
	}

	/**
	 * Build the Loyverse receipt for an order.
	 *
	 * @param WC_Order $o Order.
	 * @return array|WP_Error
	 */
	public static function receipt( $o ) {
		$c   = self::cfg();
		$cat = self::catalog();
		if ( is_wp_error( $cat ) ) {
			return $cat;
		}
		$lines   = array();
		$missing = array();
		foreach ( $o->get_items() as $it ) {
			$qty = max( 1, (int) $it->get_quantity() );
			$p   = $it->get_product();
			$vid = self::variant_for( $p, $it->get_name(), $cat );
			if ( '' === $vid ) {
				$vid = (string) $c['other'];
			}
			if ( '' === $vid ) {
				$missing[] = $it->get_name();
				continue;
			}
			$note = array();
			foreach ( $it->get_formatted_meta_data( '_', true ) as $m ) {
				$note[] = wp_strip_all_tags( $m->display_key . ': ' . $m->display_value );
			}
			$line = array(
				'variant_id' => $vid,
				'quantity'   => $qty,
				'price'      => round( ( (float) $it->get_total() + (float) $it->get_total_tax() ) / $qty, 2 ),
			);
			if ( $vid === (string) $c['other'] ) {
				$note[] = $it->get_name();
			}
			if ( $note ) {
				$line['line_note'] = mb_substr( implode( ' · ', $note ), 0, 250 );
			}
			$lines[] = $line;
		}
		$extra = (float) $o->get_shipping_total() + (float) $o->get_shipping_tax();
		foreach ( $o->get_fees() as $f ) {
			$extra += (float) $f->get_total() + (float) $f->get_total_tax();
		}
		if ( abs( $extra ) >= 0.01 ) {
			if ( '' === (string) $c['other'] ) {
				$missing[] = __( 'Delivery / fees', 'agency-core' );
			} else {
				$lines[] = array(
					'variant_id' => (string) $c['other'],
					'quantity'   => 1,
					'price'      => round( $extra, 2 ),
					'line_note'  => __( 'Delivery / fees', 'agency-core' ),
				);
			}
		}
		if ( $missing ) {
			/* translators: %s: names */
			return new WP_Error( 'agc_lv_missing', sprintf( __( 'Not found in Loyverse: %s. Give them the same SKU (or name) in Loyverse, or choose an item for everything else.', 'agency-core' ), implode( ', ', array_unique( $missing ) ) ) );
		}
		$key  = self::method_key( $o );
		$type = (string) ( $c['pay'][ $key ] ?? '' );
		if ( '' === $type ) {
			$type = (string) ( $c['pay']['other'] ?? '' );
		}
		if ( '' === $type ) {
			$names = self::methods();
			/* translators: %s: payment method */
			return new WP_Error( 'agc_lv_pay', sprintf( __( 'Choose the Loyverse payment type for "%s".', 'agency-core' ), $names[ $key ] ?? $key ) );
		}
		$sum  = array_sum( array_map( static fn( $l ) => $l['price'] * $l['quantity'], $lines ) );
		$paid = $o->get_date_paid() ? $o->get_date_paid() : $o->get_date_created();
		$r    = array(
			'store_id'     => (string) $c['store'],
			'order'        => '#' . $o->get_order_number(),
			'source'       => 'Website',
			'receipt_date' => gmdate( 'Y-m-d\TH:i:s.000\Z', $paid ? $paid->getTimestamp() : time() ),
			'note'         => mb_substr( self::label( $o ), 0, 250 ),
			'line_items'   => $lines,
			'payments'     => array(
				array(
					'payment_type_id' => $type,
					'money_amount'    => round( $sum, 2 ),
				),
			),
		);
		return $r;
	}

	/**
	 * How the order was paid, as one of our method keys.
	 *
	 * @param WC_Order $o Order.
	 * @return string
	 */
	private static function method_key( $o ) {
		$m = (string) $o->get_meta( '_agc_paid_by' );
		if ( '' !== $m ) {
			return $m;
		}
		$pm = $o->get_payment_method();
		if ( 'agc_duitnow' === $pm ) {
			return 'duitnow';
		}
		if ( 'cod' === $pm ) {
			return 'cash';
		}
		return 'online';
	}

	/**
	 * Where the order came from, for the receipt note.
	 *
	 * @param WC_Order $o Order.
	 * @return string
	 */
	private static function label( $o ) {
		$t = (string) $o->get_meta( '_agc_table' );
		$c = (string) $o->get_meta( '_agc_channel' );
		$r = (string) $o->get_meta( '_agc_platform_ref' );
		if ( '' !== $c && class_exists( 'AGC_Table' ) ) {
			$ch = AGC_Table::channels();
			return trim( ( $ch[ $c ][0] ?? $c ) . ( $r ? ' · ' . $r : '' ) );
		}
		if ( '' !== $t ) {
			/* translators: %s: table */
			return sprintf( __( 'Table %s', 'agency-core' ), $t );
		}
		return __( 'Website order', 'agency-core' );
	}

	/**
	 * Send one order (background job, or "send now" from the dashboard).
	 *
	 * @param int $id Order.
	 * @return true|WP_Error
	 */
	public static function send( $id ) {
		$o = wc_get_order( $id );
		if ( ! $o ) {
			return new WP_Error( 'agc_lv_order', 'Order not found' );
		}
		if ( $o->get_meta( self::META ) ) {
			return true;
		}
		if ( ! self::on() ) {
			return new WP_Error( 'agc_lv_off', __( 'Sending to Loyverse is off.', 'agency-core' ) );
		}
		$body = self::receipt( $o );
		$r    = is_wp_error( $body ) ? $body : self::call( 'POST', '/receipts', $body );
		if ( is_wp_error( $r ) ) {
			$tries = (int) $o->get_meta( self::TRIES ) + 1;
			$o->update_meta_data( self::TRIES, $tries );
			$o->update_meta_data( self::ERR, $r->get_error_message() );
			$o->delete_meta_data( self::QUEUED );
			$o->save_meta_data();
			// network or Loyverse hiccups: try again later (5, 10, 20, 40 min); a missing item or payment type waits for the shop
			if ( in_array( $r->get_error_code(), array( 'agc_lv_net', 'agc_lv_http' ), true ) && $tries < 5 ) {
				self::queue( $o, 300 * ( 2 ** ( $tries - 1 ) ) );
			}
			return $r;
		}
		$no = (string) ( $r['receipt_number'] ?? ( $r['receipt']['receipt_number'] ?? 'OK' ) );
		$o->update_meta_data( self::META, $no );
		$o->delete_meta_data( self::ERR );
		$o->delete_meta_data( self::QUEUED );
		$o->save_meta_data();
		/* translators: %s: receipt number */
		$o->add_order_note( sprintf( __( 'Sent to Loyverse: receipt %s.', 'agency-core' ), $no ) );
		return true;
	}

	/* ------------------------------------------------------------------ REST: shop dashboard */

	/**
	 * Routes.
	 */
	public static function routes() {
		$can = static function () {
			return current_user_can( 'manage_woocommerce' );
		};
		register_rest_route( self::NS, '/owner/loyverse', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'rest_get' ), 'permission_callback' => $can ) );
		register_rest_route( self::NS, '/owner/loyverse', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_save' ), 'permission_callback' => $can ) );
		register_rest_route( self::NS, '/owner/loyverse/send', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'rest_send' ), 'permission_callback' => $can ) );
	}

	/**
	 * Everything the Loyverse screen shows.
	 *
	 * @param bool $fresh Fetch from Loyverse again.
	 * @return array
	 */
	public static function rest_get( $fresh = false ) {
		$fresh = true === $fresh || ( $fresh instanceof WP_REST_Request && $fresh->get_param( 'fresh' ) );
		$c     = self::cfg();
		$tok   = self::token();
		$out   = array(
			'connected' => '' !== $tok,
			'hint'      => '' !== $tok ? '…' . substr( $tok, -4 ) : '',
			'on'        => (bool) $c['on'],
			'store'     => (string) $c['store'],
			'pay'       => (object) $c['pay'],
			'other'     => (string) $c['other'],
			'methods'   => self::methods(),
			'demo'      => (bool) agc_get( 'demo_mode' ),
			'error'     => '',
			'stores'    => array(),
			'types'     => array(),
			'variants'  => array(),
			'match'     => null,
			'recent'    => self::recent(),
		);
		if ( '' === $tok ) {
			return $out;
		}
		$cat = self::catalog( $fresh );
		if ( is_wp_error( $cat ) ) {
			$out['error'] = $cat->get_error_message();
			return $out;
		}
		$out['stores']   = $cat['stores'];
		$out['types']    = $cat['types'];
		$out['variants'] = array_map( static fn( $v ) => array( 'id' => $v['id'], 'name' => $v['name'] ), $cat['variants'] );
		$out['checked']  = (int) $cat['at'];
		// which of our products Loyverse knows
		$ids     = wc_get_products( array( 'status' => 'publish', 'limit' => 1000, 'return' => 'ids', 'type' => array( 'simple', 'variable' ) ) );
		$missing = array();
		foreach ( $ids as $pid ) {
			$p = wc_get_product( $pid );
			if ( $p && '' === self::variant_for( $p, $p->get_name(), $cat ) ) {
				$missing[] = $p->get_name();
			}
		}
		$out['match'] = array(
			'total'   => count( $ids ),
			'found'   => count( $ids ) - count( $missing ),
			'missing' => array_slice( $missing, 0, 40 ),
		);
		return $out;
	}

	/**
	 * Last 25 paid orders since connecting: sent (receipt), waiting, or the error.
	 *
	 * @return array
	 */
	private static function recent() {
		$c = self::cfg();
		if ( empty( $c['since'] ) ) {
			return array();
		}
		$orders = wc_get_orders(
			array(
				'limit'        => 25,
				'type'         => 'shop_order',
				'status'       => array( 'processing', 'completed' ),
				'date_created' => '>=' . (int) $c['since'],
				'orderby'      => 'date',
				'order'        => 'DESC',
			)
		);
		return array_map(
			static fn( $o ) => array(
				'id'      => $o->get_id(),
				'number'  => $o->get_order_number(),
				'label'   => self::label( $o ),
				'total'   => html_entity_decode( wp_strip_all_tags( wc_price( (float) $o->get_total() ) ), ENT_QUOTES, 'UTF-8' ),
				'at'      => $o->get_date_created() ? $o->get_date_created()->getTimestamp() : 0,
				'receipt' => (string) $o->get_meta( self::META ),
				'error'   => (string) $o->get_meta( self::ERR ),
			),
			$orders
		);
	}

	/**
	 * Save: token (connect / remove), store, on/off, payment types, the item for everything else.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function rest_save( $req ) {
		$b = (array) $req->get_json_params();
		$c = self::cfg();
		if ( isset( $b['token'] ) ) {
			$tok = trim( (string) $b['token'] );
			if ( '' === $tok ) {
				delete_option( self::TOKEN );
				delete_option( self::CACHE );
				$c['on']    = 0;
				$c['store'] = '';
				self::save_cfg( $c );
				return self::rest_get();
			}
			if ( agc_get( 'demo_mode' ) && ! apply_filters( 'agc_loyverse_demo_allowed', false ) ) {
				return new WP_Error( 'agc_lv_demo', __( 'This is a demo website: connecting a real Loyverse account is turned off here.', 'agency-core' ), array( 'status' => 400 ) );
			}
			if ( ! preg_match( '/^[A-Za-z0-9._\-]{8,200}$/', $tok ) ) {
				return new WP_Error( 'agc_lv_token', __( 'That does not look like a Loyverse access token.', 'agency-core' ), array( 'status' => 400 ) );
			}
			$cat = self::catalog( true, $tok ); // check it before saving
			if ( is_wp_error( $cat ) ) {
				return new WP_Error( 'agc_lv_token', $cat->get_error_message(), array( 'status' => 400 ) );
			}
			update_option( self::TOKEN, $tok, false );
			update_option( self::CACHE, $cat, false );
			if ( '' === (string) $c['store'] && 1 === count( $cat['stores'] ) ) {
				$c['store'] = $cat['stores'][0]['id'];
			}
			if ( ! $c['pay'] ) { // a first guess by name: Cash → cash, Card → card…
				foreach ( self::methods() as $k => $label ) {
					foreach ( $cat['types'] as $t ) {
						if ( self::key( $t['name'] ) === self::key( $label ) || ( 'cash' === $k && 'CASH' === $t['type'] ) || ( 'card' === $k && 'CARD' === $t['type'] && ! isset( $c['pay']['card'] ) ) ) {
							$c['pay'][ $k ] = $t['id'];
							break;
						}
					}
				}
			}
		}
		if ( isset( $b['store'] ) ) {
			$c['store'] = sanitize_text_field( (string) $b['store'] );
		}
		if ( isset( $b['other'] ) ) {
			$c['other'] = sanitize_text_field( (string) $b['other'] );
		}
		if ( isset( $b['pay'] ) && is_array( $b['pay'] ) ) {
			$pay = array();
			foreach ( self::methods() as $k => $label ) {
				if ( ! empty( $b['pay'][ $k ] ) ) {
					$pay[ $k ] = sanitize_text_field( (string) $b['pay'][ $k ] );
				}
			}
			$c['pay'] = $pay;
		}
		if ( isset( $b['on'] ) ) {
			$was     = ! empty( $c['on'] );
			$c['on'] = $b['on'] ? 1 : 0;
			if ( $c['on'] && ! $was ) {
				$c['since'] = time(); // only orders from now on
			}
		}
		self::save_cfg( $c );
		return self::rest_get( ! empty( $b['fresh'] ) );
	}

	/**
	 * Send now: one order, or every one that failed.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function rest_send( $req ) {
		$b   = (array) $req->get_json_params();
		$ids = ! empty( $b['id'] ) ? array( absint( $b['id'] ) ) : array_map( static fn( $x ) => $x['id'], array_filter( self::recent(), static fn( $x ) => '' === $x['receipt'] ) );
		delete_option( self::CACHE ); // the shop may just have fixed something in Loyverse
		$ok = 0;
		foreach ( $ids as $id ) {
			$o = wc_get_order( $id );
			if ( $o ) {
				$o->delete_meta_data( self::TRIES );
				$o->save_meta_data();
			}
			if ( true === self::send( $id ) ) {
				++$ok;
			}
		}
		$out         = self::rest_get();
		$out['sent'] = $ok;
		$out['of']   = count( $ids );
		return $out;
	}
}
