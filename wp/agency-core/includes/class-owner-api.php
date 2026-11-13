<?php
/**
 * Owner dashboard API (2026-11-13): the data behind the modern shop dashboard at /dian/.
 *
 * REST namespace agc/v1/owner/*. Cookie login + the wp_rest nonce (X-WP-Nonce).
 * Orders: edit_shop_orders · Products: edit_products · Settings: manage_woocommerce.
 *
 * Small shops (hundreds of orders): orders of the last 400 days are read and filtered in PHP,
 * so it works the same on the old and the new WooCommerce order storage.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owner API.
 */
class AGC_Owner_API {

	const NS = 'agc/v1';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	/**
	 * Routes.
	 */
	public static function routes() {
		$orders   = static function () {
			return current_user_can( 'edit_shop_orders' );
		};
		$products = static function () {
			return current_user_can( 'edit_products' );
		};
		$settings = static function () {
			return current_user_can( 'manage_woocommerce' );
		};
		$coupons  = static function () {
			return current_user_can( 'edit_shop_coupons' );
		};
		$team     = static function () {
			return current_user_can( 'create_users' ) && current_user_can( 'promote_users' );
		};
		$r = array(
			array( '/owner/summary', 'GET', 'summary', $orders ),
			array( '/owner/orders', 'GET', 'orders', $orders ),
			array( '/owner/orders/(?P<id>\d+)', 'GET', 'order', $orders ),
			array( '/owner/orders/(?P<id>\d+)/status', 'POST', 'order_status', $orders ),
			array( '/owner/orders/(?P<id>\d+)/note', 'POST', 'order_note', $orders ),
			array( '/owner/orders/(?P<id>\d+)/slot', 'POST', 'order_slot', $orders ),
			array( '/owner/production', 'GET', 'production', $orders ),
			array( '/owner/customers', 'GET', 'customers', $orders ),
			array( '/owner/reports', 'GET', 'reports', $orders ),
			array( '/owner/products', 'GET', 'products', $products ),
			array( '/owner/products', 'POST', 'product_create', $products ),
			array( '/owner/products/(?P<id>\d+)', 'POST', 'product_update', $products ),
			array( '/owner/products/(?P<id>\d+)', 'DELETE', 'product_delete', $products ),
			array( '/owner/media', 'POST', 'media', $products ),
			array( '/owner/settings', 'GET', 'settings', $settings ),
			array( '/owner/settings', 'POST', 'settings_save', $settings ),
			array( '/owner/orders', 'POST', 'order_create', $orders ),
			array( '/owner/orders/bulk', 'POST', 'orders_bulk', $orders ),
			array( '/owner/slots', 'GET', 'slots', $orders ),
			array( '/owner/coupons', 'GET', 'coupons', $coupons ),
			array( '/owner/coupons', 'POST', 'coupon_save', $coupons ),
			array( '/owner/coupons/(?P<id>\d+)', 'DELETE', 'coupon_delete', $coupons ),
			array( '/owner/team', 'GET', 'team', $team ),
			array( '/owner/team', 'POST', 'team_add', $team ),
			array( '/owner/team/(?P<id>\d+)', 'DELETE', 'team_remove', $team ),
		);
		foreach ( $r as $x ) {
			register_rest_route(
				self::NS,
				$x[0],
				array(
					'methods'             => $x[1],
					'callback'            => array( __CLASS__, $x[2] ),
					'permission_callback' => $x[3],
				)
			);
		}
	}

	/* ------------------------------------------------------------------ helpers */

	/**
	 * Money as plain text ("RM118.00").
	 *
	 * @param float $v Amount.
	 * @return string
	 */
	private static function money( $v ) {
		return html_entity_decode( wp_strip_all_tags( wc_price( (float) $v ) ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Recent orders (newest first), every status except drafts.
	 *
	 * @param int $days Days back.
	 * @return WC_Order[]
	 */
	public static function recent_orders( $days = 400 ) {
		$statuses = array_diff( array_map( static fn( $s ) => substr( $s, 3 ), array_keys( wc_get_order_statuses() ) ), array( 'checkout-draft' ) );
		return wc_get_orders(
			array(
				'limit'        => 2000,
				'type'         => 'shop_order',
				'status'       => array_values( $statuses ),
				'orderby'      => 'date',
				'order'        => 'DESC',
				'date_created' => '>=' . ( time() - $days * DAY_IN_SECONDS ),
			)
		);
	}

	/**
	 * Which list an order belongs to.
	 *
	 * @param WC_Order $o Order.
	 * @return string check|make|ready|done|cancelled|pending
	 */
	private static function bucket( $o ) {
		$s = $o->get_status();
		if ( 'on-hold' === $s ) {
			return 'check';
		}
		if ( 'processing' === $s ) {
			return 'make';
		}
		if ( AGC_Festive::STATUS === $s ) {
			return 'ready';
		}
		if ( 'completed' === $s ) {
			return 'done';
		}
		if ( 'pending' === $s ) {
			return 'pending';
		}
		return 'cancelled';
	}

	/**
	 * Phone for wa.me (Malaysian 01x → 601x).
	 *
	 * @param string $p Phone.
	 * @return string
	 */
	private static function wa( $p ) {
		$d = preg_replace( '/\D+/', '', (string) $p );
		if ( '' === $d ) {
			return '';
		}
		if ( 0 === strpos( $d, '0' ) ) {
			$d = '6' . $d;
		}
		return $d;
	}

	/**
	 * Order as the list needs it.
	 *
	 * @param WC_Order $o Order.
	 * @return array
	 */
	private static function order_row( $o ) {
		$items = array();
		foreach ( $o->get_items() as $it ) {
			$items[] = $it->get_quantity() . '× ' . $it->get_name();
		}
		$day = (string) $o->get_meta( AGC_Festive::DATE );
		return array(
			'id'       => $o->get_id(),
			'number'   => $o->get_order_number(),
			'status'   => $o->get_status(),
			'label'    => wc_get_order_status_name( $o->get_status() ),
			'bucket'   => self::bucket( $o ),
			'created'  => $o->get_date_created() ? $o->get_date_created()->getTimestamp() : 0,
			'name'     => trim( $o->get_formatted_billing_full_name() ),
			'phone'    => $o->get_billing_phone(),
			'total'    => (float) $o->get_total(),
			'total_f'  => self::money( $o->get_total() ),
			'items'    => implode( ', ', $items ),
			'mode'     => (string) $o->get_meta( AGC_Festive::MODE ),
			'day'      => $day,
			'day_l'    => $day ? AGC_Festive::day_label( $day ) : '',
			'slot'     => (string) $o->get_meta( AGC_Festive::SLOT ),
			'pay'      => $o->get_payment_method_title(),
			'receipt'  => (bool) $o->get_meta( AGC_Receipts::META ),
			'paid'     => $o->is_paid(),
			'email'    => $o->get_billing_email(),
			'addr'     => wp_strip_all_tags( str_replace( '<br/>', ', ', $o->has_shipping_address() ? $o->get_formatted_shipping_address() : $o->get_formatted_billing_address() ) ),
		);
	}

	/* ------------------------------------------------------------------ summary */

	/**
	 * Home screen numbers.
	 *
	 * @return array
	 */
	public static function summary() {
		$orders = self::recent_orders();
		$tz     = wp_timezone();
		$today  = AGC_Festive::now()->format( 'Y-m-d' );
		$counts = array_fill_keys( array( 'check', 'make', 'ready', 'done', 'cancelled', 'pending' ), 0 );
		$t_rev  = 0.0;
		$t_n    = 0;
		$s_rev  = 0.0;
		$s_n    = 0;
		$next   = array();
		foreach ( $orders as $o ) {
			$b = self::bucket( $o );
			++$counts[ $b ];
			$created = $o->get_date_created();
			if ( $created && $created->setTimezone( $tz )->format( 'Y-m-d' ) === $today ) {
				++$t_n;
				if ( $o->is_paid() ) {
					$t_rev += (float) $o->get_total();
				}
			}
			if ( 'cancelled' !== $b && 'pending' !== $b ) {
				++$s_n;
				if ( $o->is_paid() ) {
					$s_rev += (float) $o->get_total();
				}
			}
			$d = (string) $o->get_meta( AGC_Festive::DATE );
			if ( $d && $d >= $today && in_array( $b, array( 'check', 'make', 'ready' ), true ) ) {
				$next[ $d ] = ( $next[ $d ] ?? 0 ) + 1;
			}
		}
		ksort( $next );
		$low   = array();
		$out   = array();
		$limit = max( 1, (int) agc_get( 'fest_low_stock' ) );
		foreach ( wc_get_products( array( 'limit' => 200, 'status' => 'publish', 'type' => array( 'simple', 'variable' ) ) ) as $p ) {
			$left = self::stock_of( $p );
			if ( ! $p->is_in_stock() || 0 === $left ) {
				$out[] = $p->get_name();
			} elseif ( null !== $left && $left <= $limit ) {
				$low[] = array(
					'name' => $p->get_name(),
					'left' => $left,
				);
			}
		}
		$cut = AGC_Festive::cutoff();
		return array(
			'counts'  => $counts,
			'today'   => array( 'orders' => $t_n, 'revenue' => self::money( $t_rev ) ),
			'season'  => array( 'orders' => $s_n, 'revenue' => self::money( $s_rev ) ),
			'next'    => array_slice( array_map( static fn( $d, $n ) => array( 'day' => $d, 'label' => AGC_Festive::day_label( $d ), 'orders' => $n ), array_keys( $next ), $next ), 0, 5 ),
			'low'     => $low,
			'soldout' => $out,
			'fest'    => array(
				'on'       => AGC_Festive::on(),
				'name'     => (string) agc_get( 'fest_name' ),
				'cutoff'   => $cut ? $cut->getTimestamp() : 0,
				'cutoff_l' => $cut ? wp_date( _x( 'j M, g:i a', 'festive cut-off', 'agency-core' ), $cut->getTimestamp() ) : '',
				'closed'   => AGC_Festive::closed(),
				'early'    => AGC_Festive::early_pct(),
			),
			'notify'  => count( (array) get_option( AGC_Festive::NOTIFY, array() ) ),
			'paused'  => (bool) agc_get( 'shop_paused' ),
		);
	}

	/* ------------------------------------------------------------------ orders */

	/**
	 * Order list: ?f=check|make|ready|done|cancelled|all &day= &q= &page=
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function orders( $req ) {
		$f    = sanitize_key( (string) $req->get_param( 'f' ) );
		$day  = sanitize_text_field( (string) $req->get_param( 'day' ) );
		$q    = mb_strtolower( trim( sanitize_text_field( (string) $req->get_param( 'q' ) ) ) );
		$page = max( 1, (int) $req->get_param( 'page' ) );
		$all  = (bool) $req->get_param( 'all' );
		$days = (int) $req->get_param( 'days' );
		$from = $days > 0 ? time() - $days * DAY_IN_SECONDS : 0;
		$rows = array();
		foreach ( self::recent_orders() as $o ) {
			$b = self::bucket( $o );
			if ( $f && 'all' !== $f && $b !== $f ) {
				continue;
			}
			if ( ( ! $f || 'all' === $f ) && 'pending' === $b ) {
				continue;
			}
			if ( $from && ( ! $o->get_date_created() || $o->get_date_created()->getTimestamp() < $from ) ) {
				continue;
			}
			if ( $day ) {
				$od = (string) $o->get_meta( AGC_Festive::DATE );
				if ( ( 'courier' === $day && $od ) || ( 'courier' !== $day && $od !== $day ) ) {
					continue;
				}
			}
			if ( $q ) {
				$hay = mb_strtolower( $o->get_order_number() . ' ' . $o->get_formatted_billing_full_name() . ' ' . $o->get_billing_phone() . ' ' . preg_replace( '/\D+/', '', $o->get_billing_phone() ) . ' ' . $o->get_billing_email() );
				if ( false === mb_strpos( $hay, $q ) ) {
					continue;
				}
			}
			$rows[] = self::order_row( $o );
		}
		if ( $all ) {
			return array( 'orders' => $rows, 'total' => count( $rows ) );
		}
		$per = 30;
		return array(
			'orders' => array_slice( $rows, ( $page - 1 ) * $per, $per ),
			'total'  => count( $rows ),
			'pages'  => max( 1, (int) ceil( count( $rows ) / $per ) ),
			'page'   => $page,
		);
	}

	/**
	 * Load an order or a 404.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WC_Order|WP_Error
	 */
	private static function get_order( $req ) {
		$o = wc_get_order( (int) $req['id'] );
		if ( ! $o || 'shop_order' !== $o->get_type() ) {
			return new WP_Error( 'agc_no_order', 'Order not found', array( 'status' => 404 ) );
		}
		return $o;
	}

	/**
	 * One order with everything the detail screen shows.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function order( $req ) {
		$o = self::get_order( $req );
		if ( is_wp_error( $o ) ) {
			return $o;
		}
		$items = array();
		foreach ( $o->get_items() as $it ) {
			$meta = array();
			foreach ( $it->get_formatted_meta_data( '_', true ) as $m ) {
				$meta[] = wp_strip_all_tags( $m->display_key ) . ': ' . wp_strip_all_tags( $m->display_value );
			}
			$items[] = array(
				'name'  => $it->get_name(),
				'qty'   => (int) $it->get_quantity(),
				'total' => self::money( (float) $it->get_total() ),
				'meta'  => implode( ' · ', $meta ),
			);
		}
		$fees = array();
		foreach ( $o->get_fees() as $fee ) {
			$fees[] = array( 'name' => $fee->get_name(), 'total' => self::money( (float) $fee->get_total() ) );
		}
		$notes = array();
		foreach ( wc_get_order_notes( array( 'order_id' => $o->get_id() ) ) as $n ) {
			$notes[] = array(
				'text'     => wp_strip_all_tags( $n->content ),
				'date'     => $n->date_created ? $n->date_created->getTimestamp() : 0,
				'customer' => (bool) $n->customer_note,
				'by'       => $n->added_by,
			);
		}
		$ship_to = $o->has_shipping_address() ? $o->get_formatted_shipping_address() : '';
		$mode    = (string) $o->get_meta( AGC_Festive::MODE );
		$row     = self::order_row( $o );
		return $row + array(
			'email'     => $o->get_billing_email(),
			'wa'        => self::wa( $o->get_billing_phone() ),
			'address'   => wp_strip_all_tags( str_replace( '<br/>', ', ', $o->get_formatted_billing_address() ) ),
			'ship_to'   => wp_strip_all_tags( str_replace( '<br/>', ', ', $ship_to ) ),
			'ship_name' => trim( $o->get_shipping_first_name() . ' ' . $o->get_shipping_last_name() ),
			'ship_phone' => $o->get_shipping_phone(),
			'mode_l'    => $mode ? AGC_Festive::mode_label( $mode ) : $o->get_shipping_method(),
			'shipping'  => $o->get_shipping_method() . ( $o->get_shipping_total() > 0 ? ' · ' . self::money( $o->get_shipping_total() ) : '' ),
			'subtotal'  => self::money( $o->get_subtotal() ),
			'fees'      => $fees,
			'line'      => $items,
			'note'      => $o->get_customer_note(),
			'notes'     => $notes,
			'receipt_url' => $o->get_meta( AGC_Receipts::META ) ? AGC_Receipts::url( $o ) : '',
			'edit_url'  => $o->get_edit_order_url(),
			'track_url' => $o->get_checkout_order_received_url(),
			'collect_at' => 'collect' === $mode ? (string) agc_get( 'business_address' ) : '',
			'slots'     => 'courier' === $mode || ! $mode ? array() : AGC_Festive::availability( $mode ),
		);
	}

	/**
	 * Change status: processing (payment received), agc-ready, completed, cancelled, on-hold.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function order_status( $req ) {
		$o = self::get_order( $req );
		if ( is_wp_error( $o ) ) {
			return $o;
		}
		$to = sanitize_key( (string) $req->get_param( 'status' ) );
		if ( ! in_array( $to, array( 'processing', AGC_Festive::STATUS, 'completed', 'cancelled', 'on-hold' ), true ) ) {
			return new WP_Error( 'agc_bad_status', 'Bad status', array( 'status' => 400 ) );
		}
		$who = wp_get_current_user()->display_name;
		/* translators: %s: user name */
		$o->update_status( $to, sprintf( __( 'Changed in the shop dashboard by %s.', 'agency-core' ), $who ), true );
		AGC_Festive::forget_booked();
		return self::order( $req );
	}

	/**
	 * Add a note (private, or to the customer: WooCommerce emails it).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function order_note( $req ) {
		$o = self::get_order( $req );
		if ( is_wp_error( $o ) ) {
			return $o;
		}
		$text = sanitize_textarea_field( (string) $req->get_param( 'note' ) );
		if ( '' === trim( $text ) ) {
			return new WP_Error( 'agc_empty', 'Empty note', array( 'status' => 400 ) );
		}
		$o->add_order_note( $text, $req->get_param( 'customer' ) ? 1 : 0, true );
		return self::order( $req );
	}

	/**
	 * Move the collection / delivery day and time.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function order_slot( $req ) {
		$o = self::get_order( $req );
		if ( is_wp_error( $o ) ) {
			return $o;
		}
		$p = explode( '|', sanitize_text_field( (string) $req->get_param( 'when' ) ), 2 );
		if ( 2 !== count( $p ) || ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $p[0] ) || '' === $p[1] ) {
			return new WP_Error( 'agc_bad_slot', 'Bad day or time', array( 'status' => 400 ) );
		}
		$old = AGC_Festive::order_line( $o );
		$o->update_meta_data( AGC_Festive::DATE, $p[0] );
		$o->update_meta_data( AGC_Festive::SLOT, $p[1] );
		$o->save();
		/* translators: 1: old, 2: new */
		$o->add_order_note( sprintf( __( 'Collection / delivery moved: %1$s → %2$s', 'agency-core' ), $old, AGC_Festive::order_line( $o ) ), 0, true );
		AGC_Festive::forget_booked();
		return self::order( $req );
	}

	/* ------------------------------------------------------------------ production */

	/**
	 * What to make per day, and the orders per time slot.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function production( $req ) {
		$orders = array_filter(
			self::recent_orders(),
			static fn( $o ) => in_array( self::bucket( $o ), array( 'check', 'make', 'ready', 'done' ), true ) && $o->get_meta( AGC_Festive::MODE )
		);
		$days = array();
		foreach ( $orders as $o ) {
			$d                = (string) $o->get_meta( AGC_Festive::DATE );
			$k                = $d ? $d : 'courier';
			$days[ $k ]       = ( $days[ $k ] ?? 0 ) + 1;
		}
		foreach ( AGC_Festive::days() as $d ) {
			$days[ $d ] = $days[ $d ] ?? 0;
		}
		ksort( $days );
		$sel = sanitize_text_field( (string) $req->get_param( 'day' ) );
		if ( ! isset( $days[ $sel ] ) ) {
			$today = AGC_Festive::now()->format( 'Y-m-d' );
			$sel   = '';
			foreach ( array_keys( $days ) as $d ) {
				if ( 'courier' !== $d && $d >= $today ) {
					$sel = $d;
					break;
				}
			}
			if ( ! $sel && $days ) {
				$sel = array_key_first( $days );
			}
		}
		$make  = array();
		$slots = array();
		foreach ( $orders as $o ) {
			$d = (string) $o->get_meta( AGC_Festive::DATE );
			if ( ( $d ? $d : 'courier' ) !== $sel ) {
				continue;
			}
			$paid = $o->is_paid();
			foreach ( $o->get_items() as $it ) {
				$n = $it->get_name();
				if ( ! isset( $make[ $n ] ) ) {
					$make[ $n ] = array( 'name' => $n, 'paid' => 0, 'check' => 0 );
				}
				$make[ $n ][ $paid ? 'paid' : 'check' ] += (int) $it->get_quantity();
			}
			$slot             = (string) $o->get_meta( AGC_Festive::SLOT );
			$slots[ $slot ][] = self::order_row( $o );
		}
		ksort( $make );
		ksort( $slots );
		$out = array();
		foreach ( $slots as $label => $rows ) {
			$out[] = array( 'slot' => $label ? $label : '—', 'orders' => $rows );
		}
		return array(
			'days'  => array_map( static fn( $d, $n ) => array( 'day' => $d, 'label' => 'courier' === $d ? '' : AGC_Festive::day_label( $d ), 'orders' => $n ), array_keys( $days ), $days ),
			'day'   => $sel,
			'make'  => array_values( $make ),
			'slots' => $out,
		);
	}

	/* ------------------------------------------------------------------ customers and reports */

	/**
	 * Customers from the orders + the "tell me next season" list.
	 *
	 * @return array
	 */
	public static function customers() {
		$c = array();
		foreach ( self::recent_orders() as $o ) {
			if ( in_array( self::bucket( $o ), array( 'cancelled', 'pending' ), true ) ) {
				continue;
			}
			$phone = preg_replace( '/\D+/', '', $o->get_billing_phone() );
			$key   = $phone ? $phone : strtolower( $o->get_billing_email() );
			if ( ! $key ) {
				continue;
			}
			if ( ! isset( $c[ $key ] ) ) {
				$c[ $key ] = array(
					'name'   => trim( $o->get_formatted_billing_full_name() ),
					'phone'  => $o->get_billing_phone(),
					'wa'     => self::wa( $o->get_billing_phone() ),
					'email'  => $o->get_billing_email(),
					'orders' => 0,
					'spent'  => 0.0,
					'last'   => $o->get_date_created() ? $o->get_date_created()->getTimestamp() : 0,
				);
			}
			++$c[ $key ]['orders'];
			$c[ $key ]['spent'] += $o->is_paid() ? (float) $o->get_total() : 0;
		}
		$list = array_values( $c );
		usort( $list, static fn( $a, $b ) => $b['spent'] <=> $a['spent'] );
		foreach ( $list as &$x ) {
			$x['spent_f'] = self::money( $x['spent'] );
		}
		unset( $x );
		$notify = array();
		foreach ( (array) get_option( AGC_Festive::NOTIFY, array() ) as $n ) {
			$notify[] = array( 'phone' => $n['p'], 'wa' => self::wa( $n['p'] ), 'date' => (int) ( $n['t'] ?? 0 ) );
		}
		return array( 'customers' => $list, 'notify' => $notify );
	}

	/**
	 * Sales per day, best sellers, payment methods.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function reports( $req ) {
		$days  = min( 120, max( 7, (int) $req->get_param( 'days' ) ? (int) $req->get_param( 'days' ) : 30 ) );
		$tz    = wp_timezone();
		$start = AGC_Festive::now()->setTime( 0, 0 )->modify( '-' . ( $days - 1 ) . ' days' );
		$by    = array();
		for ( $d = $start, $i = 0; $i < $days; $d = $d->modify( '+1 day' ), $i++ ) {
			$by[ $d->format( 'Y-m-d' ) ] = array( 'day' => $d->format( 'Y-m-d' ), 'label' => wp_date( 'j/n', $d->getTimestamp() ), 'revenue' => 0.0, 'orders' => 0 );
		}
		$top  = array();
		$pay  = array();
		$mode = array();
		$sum  = 0.0;
		$n    = 0;
		foreach ( self::recent_orders( $days + 1 ) as $o ) {
			if ( ! $o->is_paid() ) {
				continue;
			}
			$k = $o->get_date_created() ? $o->get_date_created()->setTimezone( $tz )->format( 'Y-m-d' ) : '';
			if ( ! isset( $by[ $k ] ) ) {
				continue;
			}
			$by[ $k ]['revenue'] += (float) $o->get_total();
			++$by[ $k ]['orders'];
			$sum += (float) $o->get_total();
			++$n;
			foreach ( $o->get_items() as $it ) {
				$name = $it->get_name();
				if ( ! isset( $top[ $name ] ) ) {
					$top[ $name ] = array( 'name' => $name, 'qty' => 0, 'revenue' => 0.0 );
				}
				$top[ $name ]['qty']     += (int) $it->get_quantity();
				$top[ $name ]['revenue'] += (float) $it->get_total();
			}
			$pm          = $o->get_payment_method_title() ? $o->get_payment_method_title() : '—';
			$pay[ $pm ]  = ( $pay[ $pm ] ?? 0 ) + 1;
			$m           = (string) $o->get_meta( AGC_Festive::MODE );
			$ml          = $m ? AGC_Festive::mode_label( $m ) : '—';
			$mode[ $ml ] = ( $mode[ $ml ] ?? 0 ) + 1;
		}
		usort( $top, static fn( $a, $b ) => $b['revenue'] <=> $a['revenue'] );
		foreach ( $top as &$t ) {
			$t['revenue_f'] = self::money( $t['revenue'] );
		}
		unset( $t );
		foreach ( $by as &$b ) {
			$b['revenue_f'] = self::money( $b['revenue'] );
		}
		unset( $b );
		arsort( $pay );
		arsort( $mode );
		return array(
			'days'    => array_values( $by ),
			'total'   => self::money( $sum ),
			'orders'  => $n,
			'average' => self::money( $n ? $sum / $n : 0 ),
			'top'     => array_slice( $top, 0, 10 ),
			'pay'     => array_map( static fn( $k, $v ) => array( 'name' => $k, 'orders' => $v ), array_keys( $pay ), $pay ),
			'mode'    => array_map( static fn( $k, $v ) => array( 'name' => $k, 'orders' => $v ), array_keys( $mode ), $mode ),
		);
	}

	/* ------------------------------------------------------------------ products */

	/**
	 * Stock left (variations added up), null = not counted.
	 *
	 * @param WC_Product $p Product.
	 * @return int|null
	 */
	private static function stock_of( $p ) {
		if ( $p->managing_stock() && null !== $p->get_stock_quantity() ) {
			return (int) $p->get_stock_quantity();
		}
		if ( ! $p->is_type( 'variable' ) ) {
			return null;
		}
		$sum = 0;
		foreach ( $p->get_children() as $cid ) {
			$v = wc_get_product( $cid );
			if ( ! $v || ! $v->managing_stock() ) {
				return null;
			}
			$sum += max( 0, (int) $v->get_stock_quantity() );
		}
		return $sum;
	}

	/**
	 * "RM42.00 – RM78.00" / "RM48.00" (no screen-reader extras).
	 *
	 * @param WC_Product $p Product.
	 * @return string
	 */
	private static function price_text( $p ) {
		if ( $p->is_type( 'variable' ) ) {
			$min = (float) $p->get_variation_price( 'min' );
			$max = (float) $p->get_variation_price( 'max' );
			return $min === $max ? self::money( $min ) : self::money( $min ) . ' – ' . self::money( $max );
		}
		return '' === $p->get_price() ? '—' : self::money( $p->get_price() );
	}

	/**
	 * Product for the dashboard.
	 *
	 * @param WC_Product $p Product.
	 * @return array
	 */
	private static function product_row( $p ) {
		$img  = $p->get_image_id();
		$vars = array();
		if ( $p->is_type( 'variable' ) ) {
			foreach ( $p->get_children() as $cid ) {
				$v = wc_get_product( $cid );
				if ( ! $v ) {
					continue;
				}
				$vars[] = array(
					'id'            => $v->get_id(),
					'label'         => implode( ' · ', array_values( array_map( 'strval', $v->get_variation_attributes( false ) ) ) ),
					'regular_price' => $v->get_regular_price(),
					'sale_price'    => $v->get_sale_price(),
					'stock'         => $v->managing_stock() ? (int) $v->get_stock_quantity() : null,
					'in_stock'      => $v->is_in_stock(),
				);
			}
		}
		$cats = wp_get_post_terms( $p->get_id(), 'product_cat', array( 'fields' => 'names' ) );
		return array(
			'id'            => $p->get_id(),
			'name'          => $p->get_name(),
			'type'          => $p->get_type(),
			'status'        => $p->get_status(),
			'price_f'       => self::price_text( $p ),
			'regular_price' => $p->is_type( 'variable' ) ? '' : $p->get_regular_price(),
			'sale_price'    => $p->is_type( 'variable' ) ? '' : $p->get_sale_price(),
			'stock'         => self::stock_of( $p ),
			'manage_stock'  => $p->managing_stock(),
			'in_stock'      => $p->is_in_stock(),
			'image'         => $img ? array( 'id' => (int) $img, 'url' => wp_get_attachment_image_url( $img, 'medium' ) ) : null,
			'gallery'       => array_values( array_filter( array_map( static fn( $id ) => array( 'id' => (int) $id, 'url' => wp_get_attachment_image_url( $id, 'thumbnail' ) ), $p->get_gallery_image_ids() ), static fn( $g ) => (bool) $g['url'] ) ),
			'short'         => wp_strip_all_tags( $p->get_short_description() ),
			'description'   => $p->get_description(),
			'categories'    => is_wp_error( $cats ) ? array() : $cats,
			'url'           => get_permalink( $p->get_id() ),
			'variations'    => $vars,
		);
	}

	/**
	 * All products (published, hidden, drafts).
	 *
	 * @return array
	 */
	public static function products() {
		$ps   = wc_get_products(
			array(
				'limit'   => 300,
				'status'  => array( 'publish', 'private', 'draft' ),
				'type'    => array( 'simple', 'variable' ),
				'orderby' => array( 'menu_order' => 'ASC', 'ID' => 'ASC' ),
			)
		);
		$cats = get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => false, 'fields' => 'names' ) );
		return array(
			'products'   => array_map( array( __CLASS__, 'product_row' ), $ps ),
			'categories' => is_wp_error( $cats ) ? array() : array_values( array_diff( $cats, array( 'Uncategorized', '未分类' ) ) ),
			'limit'      => (int) agc_get( 'fest_item_limit' ),
		);
	}

	/**
	 * Apply the posted fields to a product (and its options).
	 *
	 * @param WC_Product      $p   Product.
	 * @param WP_REST_Request $req Request.
	 */
	private static function apply_product( $p, $req ) {
		$b = (array) $req->get_json_params();
		if ( isset( $b['name'] ) && '' !== trim( (string) $b['name'] ) ) {
			$p->set_name( sanitize_text_field( (string) $b['name'] ) );
		}
		if ( isset( $b['short'] ) ) {
			$p->set_short_description( sanitize_textarea_field( (string) $b['short'] ) );
		}
		if ( isset( $b['description'] ) ) {
			$p->set_description( wp_kses_post( (string) $b['description'] ) );
		}
		if ( isset( $b['status'] ) && in_array( $b['status'], array( 'publish', 'private', 'draft' ), true ) ) {
			$p->set_status( $b['status'] );
		}
		if ( ! $p->is_type( 'variable' ) ) {
			if ( isset( $b['regular_price'] ) ) {
				$p->set_regular_price( wc_format_decimal( (string) $b['regular_price'] ) );
			}
			if ( isset( $b['sale_price'] ) ) {
				$p->set_sale_price( '' === (string) $b['sale_price'] ? '' : wc_format_decimal( (string) $b['sale_price'] ) );
			}
			self::apply_stock( $p, $b );
		}
		if ( isset( $b['image_id'] ) ) {
			$p->set_image_id( absint( $b['image_id'] ) );
		}
		if ( isset( $b['gallery_ids'] ) && is_array( $b['gallery_ids'] ) ) {
			$p->set_gallery_image_ids( array_map( 'absint', $b['gallery_ids'] ) );
		}
		if ( isset( $b['category'] ) && '' !== (string) $b['category'] ) {
			$term = get_term_by( 'name', sanitize_text_field( (string) $b['category'] ), 'product_cat' );
			if ( ! $term ) {
				$made = wp_insert_term( sanitize_text_field( (string) $b['category'] ), 'product_cat' );
				$tid  = is_wp_error( $made ) ? 0 : (int) $made['term_id'];
			} else {
				$tid = (int) $term->term_id;
			}
			if ( $tid ) {
				$p->set_category_ids( array( $tid ) );
			}
		}
		$p->save();
		if ( $p->is_type( 'variable' ) && isset( $b['variations'] ) && is_array( $b['variations'] ) ) {
			$children = $p->get_children();
			foreach ( $b['variations'] as $vb ) {
				$vid = absint( $vb['id'] ?? 0 );
				if ( ! in_array( $vid, $children, true ) ) {
					continue;
				}
				$v = wc_get_product( $vid );
				if ( isset( $vb['regular_price'] ) ) {
					$v->set_regular_price( wc_format_decimal( (string) $vb['regular_price'] ) );
				}
				if ( isset( $vb['sale_price'] ) ) {
					$v->set_sale_price( '' === (string) $vb['sale_price'] ? '' : wc_format_decimal( (string) $vb['sale_price'] ) );
				}
				self::apply_stock( $v, $vb );
				$v->save();
			}
			WC_Product_Variable::sync( $p->get_id() );
		}
	}

	/**
	 * Stock fields: stock (number, '' = not counted), sold_out (true / false).
	 *
	 * @param WC_Product $p Product or variation.
	 * @param array      $b Fields.
	 */
	private static function apply_stock( $p, $b ) {
		if ( array_key_exists( 'stock', $b ) ) {
			if ( null === $b['stock'] || '' === (string) $b['stock'] ) {
				$p->set_manage_stock( false );
				$p->set_stock_status( 'instock' );
			} else {
				$p->set_manage_stock( true );
				$p->set_stock_quantity( max( 0, (int) $b['stock'] ) );
			}
		}
		if ( ! empty( $b['sold_out'] ) ) {
			if ( $p->managing_stock() ) {
				$p->set_stock_quantity( 0 );
			} else {
				$p->set_stock_status( 'outofstock' );
			}
		} elseif ( isset( $b['sold_out'] ) && ! $p->managing_stock() ) {
			$p->set_stock_status( 'instock' );
		}
	}

	/**
	 * New product (simple).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function product_create( $req ) {
		$b = (array) $req->get_json_params();
		if ( '' === trim( (string) ( $b['name'] ?? '' ) ) ) {
			return new WP_Error( 'agc_name', 'Name is required', array( 'status' => 400 ) );
		}
		$p = new WC_Product_Simple();
		$p->set_status( 'publish' );
		$p->set_catalog_visibility( 'visible' );
		$p->set_menu_order( 999 );
		self::apply_product( $p, $req );
		return self::product_row( wc_get_product( $p->get_id() ) );
	}

	/**
	 * Load a product or a 404.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return WC_Product|WP_Error
	 */
	private static function get_product( $req ) {
		$p = wc_get_product( (int) $req['id'] );
		if ( ! $p || ! in_array( $p->get_type(), array( 'simple', 'variable' ), true ) ) {
			return new WP_Error( 'agc_no_product', 'Product not found', array( 'status' => 404 ) );
		}
		return $p;
	}

	/**
	 * Save a product.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function product_update( $req ) {
		$p = self::get_product( $req );
		if ( is_wp_error( $p ) ) {
			return $p;
		}
		self::apply_product( $p, $req );
		return self::product_row( wc_get_product( $p->get_id() ) );
	}

	/**
	 * Move a product to the bin (it can be restored in WordPress → Products → Bin).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function product_delete( $req ) {
		$p = self::get_product( $req );
		if ( is_wp_error( $p ) ) {
			return $p;
		}
		if ( ! current_user_can( 'delete_post', $p->get_id() ) ) {
			return new WP_Error( 'agc_forbidden', 'Not allowed', array( 'status' => 403 ) );
		}
		$p->delete( false );
		return array( 'deleted' => true );
	}

	/**
	 * Upload a photo (JPG / PNG / WebP, up to 8 MB) to the media library.
	 *
	 * @return array|WP_Error
	 */
	public static function media() {
		if ( ! current_user_can( 'upload_files' ) ) {
			return new WP_Error( 'agc_forbidden', 'Not allowed', array( 'status' => 403 ) );
		}
		$f = $_FILES['file'] ?? null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput,WordPress.Security.NonceVerification -- REST nonce checked by WordPress.
		if ( ! is_array( $f ) || UPLOAD_ERR_OK !== (int) $f['error'] || (int) $f['size'] > 8 * MB_IN_BYTES ) {
			return new WP_Error( 'agc_upload', 'Upload failed (JPG, PNG or WebP up to 8 MB)', array( 'status' => 400 ) );
		}
		$check = wp_check_filetype_and_ext( $f['tmp_name'], $f['name'], array( 'jpg|jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp' ) );
		if ( empty( $check['type'] ) ) {
			return new WP_Error( 'agc_upload', 'Only JPG, PNG or WebP photos', array( 'status' => 400 ) );
		}
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$id = media_handle_sideload(
			array(
				'name'     => sanitize_file_name( $f['name'] ),
				'tmp_name' => $f['tmp_name'],
				'type'     => $check['type'],
				'error'    => 0,
				'size'     => (int) $f['size'],
			),
			0
		);
		if ( is_wp_error( $id ) ) {
			return new WP_Error( 'agc_upload', $id->get_error_message(), array( 'status' => 400 ) );
		}
		return array( 'id' => $id, 'url' => wp_get_attachment_image_url( $id, 'medium' ), 'full' => wp_get_attachment_url( $id ) );
	}

	/* ------------------------------------------------------------------ settings */

	/**
	 * Keys the dashboard may change.
	 *
	 * @return string[]
	 */
	private static function setting_keys() {
		return array(
			'fest_on', 'fest_name', 'fest_cutoff', 'fest_from', 'fest_to', 'fest_closed', 'fest_collect_slots', 'fest_delivery_slots',
			'fest_courier_note', 'fest_early_end', 'fest_early_pct', 'fest_show_left', 'fest_low_stock', 'fest_notify',
			'legal_name', 'business_email', 'business_phone', 'business_address', 'business_hours', 'announcement', 'shop_paused', 'shop_paused_msg',
		);
	}

	/**
	 * Shipping zones and their methods.
	 *
	 * @return array
	 */
	private static function zones() {
		$out = array();
		foreach ( WC_Shipping_Zones::get_zones() as $z ) {
			$zone = new WC_Shipping_Zone( $z['id'] );
			$ms   = array();
			foreach ( $zone->get_shipping_methods( false ) as $m ) {
				$ms[] = array(
					'instance' => (int) $m->get_instance_id(),
					'type'     => $m->id,
					'title'    => $m->get_title(),
					'enabled'  => 'yes' === $m->enabled,
					'cost'     => 'free_shipping' === $m->id ? null : (string) $m->get_option( 'cost' ),
					'min'      => 'free_shipping' === $m->id ? (string) $m->get_option( 'min_amount' ) : null,
				);
			}
			$out[] = array( 'id' => (int) $z['id'], 'name' => $z['zone_name'], 'methods' => $ms );
		}
		return $out;
	}

	/**
	 * Settings screen data.
	 *
	 * @return array
	 */
	public static function settings() {
		$s = array();
		foreach ( self::setting_keys() as $k ) {
			$s[ $k ] = agc_get( $k );
		}
		$d = get_option( 'woocommerce_agc_duitnow_settings', array() );
		$d = is_array( $d ) ? $d : array();
		return array(
			'settings' => $s,
			'duitnow'  => array(
				'enabled' => 'yes' === ( $d['enabled'] ?? 'no' ),
				'qr'      => (string) ( $d['qr'] ?? '' ),
				'account' => (string) ( $d['account'] ?? '' ),
				'note'    => (string) ( $d['instructions'] ?? '' ),
			),
			'zones'    => self::zones(),
			'demo'     => (bool) agc_get( 'demo_mode' ),
		);
	}

	/**
	 * Save settings.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function settings_save( $req ) {
		$b = (array) $req->get_json_params();
		if ( isset( $b['settings'] ) && is_array( $b['settings'] ) ) {
			$cur = AGC_Settings::get();
			foreach ( self::setting_keys() as $k ) {
				if ( array_key_exists( $k, $b['settings'] ) ) {
					$v         = $b['settings'][ $k ];
					$cur[ $k ] = is_bool( $v ) ? (int) $v : (string) $v;
				}
			}
			update_option( AGC_Settings::OPTION, AGC_Settings::sanitize( $cur ) );
			AGC_Settings::flush();
			AGC_Festive::forget_booked();
		}
		if ( isset( $b['duitnow'] ) && is_array( $b['duitnow'] ) ) {
			$d = get_option( 'woocommerce_agc_duitnow_settings', array() );
			$d = is_array( $d ) ? $d : array();
			if ( isset( $b['duitnow']['enabled'] ) ) {
				$d['enabled'] = $b['duitnow']['enabled'] ? 'yes' : 'no';
			}
			if ( isset( $b['duitnow']['qr'] ) ) {
				$d['qr'] = esc_url_raw( (string) $b['duitnow']['qr'] );
			}
			if ( isset( $b['duitnow']['account'] ) ) {
				$d['account'] = sanitize_text_field( (string) $b['duitnow']['account'] );
			}
			if ( isset( $b['duitnow']['note'] ) ) {
				$d['instructions'] = sanitize_textarea_field( (string) $b['duitnow']['note'] );
			}
			update_option( 'woocommerce_agc_duitnow_settings', $d );
		}
		if ( isset( $b['zones'] ) && is_array( $b['zones'] ) ) {
			global $wpdb;
			foreach ( $b['zones'] as $m ) {
				$iid = absint( $m['instance'] ?? 0 );
				$row = $iid ? $wpdb->get_row( $wpdb->prepare( "SELECT method_id FROM {$wpdb->prefix}woocommerce_shipping_zone_methods WHERE instance_id = %d", $iid ) ) : null; // phpcs:ignore WordPress.DB.DirectDatabaseQuery
				if ( ! $row ) {
					continue;
				}
				$key = 'woocommerce_' . $row->method_id . '_' . $iid . '_settings';
				$opt = get_option( $key, array() );
				$opt = is_array( $opt ) ? $opt : array();
				if ( isset( $m['title'] ) && '' !== trim( (string) $m['title'] ) ) {
					$opt['title'] = sanitize_text_field( (string) $m['title'] );
				}
				if ( isset( $m['cost'] ) && 'free_shipping' !== $row->method_id ) {
					$opt['cost'] = wc_format_decimal( (string) $m['cost'] );
				}
				if ( isset( $m['min'] ) && 'free_shipping' === $row->method_id ) {
					$opt['min_amount'] = wc_format_decimal( (string) $m['min'] );
					$opt['requires']   = 'min_amount';
				}
				update_option( $key, $opt );
				if ( isset( $m['enabled'] ) ) {
					$wpdb->update( "{$wpdb->prefix}woocommerce_shipping_zone_methods", array( 'is_enabled' => $m['enabled'] ? 1 : 0 ), array( 'instance_id' => $iid ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery
				}
			}
			WC_Cache_Helper::get_transient_version( 'shipping', true );
		}
		return self::settings();
	}

	/* ------------------------------------------------------------------ manual orders, bulk, slots */

	/**
	 * Days and times with places left for a mode (for the manual order form).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array
	 */
	public static function slots( $req ) {
		$mode = 'delivery' === $req->get_param( 'mode' ) ? 'delivery' : 'collect';
		$out  = array();
		foreach ( AGC_Festive::availability( $mode ) as $day => $slots ) {
			$out[] = array( 'day' => $day, 'label' => AGC_Festive::day_label( $day ), 'slots' => $slots );
		}
		return array( 'mode' => $mode, 'days' => $out );
	}

	/**
	 * An order taken by phone, WhatsApp or at the counter.
	 * Paid → processing (stock goes down, customer email if there is an address); not paid yet → on hold.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function order_create( $req ) {
		$b     = (array) $req->get_json_params();
		$items = array();
		foreach ( (array) ( $b['items'] ?? array() ) as $it ) {
			$p   = wc_get_product( absint( $it['id'] ?? 0 ) );
			$qty = max( 1, (int) ( $it['qty'] ?? 1 ) );
			if ( ! $p || ! in_array( $p->get_type(), array( 'simple', 'variation' ), true ) ) {
				return new WP_Error( 'agc_item', __( 'Choose a product (and its option).', 'agency-core' ), array( 'status' => 400 ) );
			}
			if ( $p->managing_stock() && null !== $p->get_stock_quantity() && $p->get_stock_quantity() < $qty && empty( $b['force'] ) ) {
				/* translators: 1: product, 2: left */
				return new WP_Error( 'agc_stock', sprintf( __( 'Only %2$d left of %1$s.', 'agency-core' ), $p->get_name(), (int) $p->get_stock_quantity() ), array( 'status' => 409 ) );
			}
			$items[] = array( $p, $qty );
		}
		$name = sanitize_text_field( (string) ( $b['name'] ?? '' ) );
		if ( ! $items || '' === $name ) {
			return new WP_Error( 'agc_order', __( 'A name and at least one item are needed.', 'agency-core' ), array( 'status' => 400 ) );
		}
		$mode = in_array( $b['mode'] ?? '', array( 'collect', 'delivery', 'courier' ), true ) ? $b['mode'] : 'collect';
		$o    = wc_create_order(
			array(
				'status'      => 'pending',
				'created_via' => 'shop-dashboard',
			)
		);
		foreach ( $items as $x ) {
			$o->add_product( $x[0], $x[1] );
		}
		$o->set_billing_first_name( $name );
		$o->set_billing_phone( sanitize_text_field( (string) ( $b['phone'] ?? '' ) ) );
		$email = sanitize_email( (string) ( $b['email'] ?? '' ) );
		if ( $email ) {
			$o->set_billing_email( $email );
		}
		$o->set_billing_country( 'MY' );
		$addr = sanitize_textarea_field( (string) ( $b['address'] ?? '' ) );
		if ( $addr && 'collect' !== $mode ) {
			$o->set_billing_address_1( $addr );
			$o->set_shipping_first_name( $name );
			$o->set_shipping_address_1( $addr );
			$o->set_shipping_country( 'MY' );
		}
		$fee  = max( 0, (float) ( $b['shipping'] ?? 0 ) );
		$ship = new WC_Order_Item_Shipping();
		$ship->set_method_title( AGC_Festive::mode_label( $mode ) );
		$ship->set_method_id( 'collect' === $mode ? 'local_pickup' : 'flat_rate' );
		$ship->set_total( $fee );
		$o->add_item( $ship );
		$o->update_meta_data( AGC_Festive::MODE, $mode );
		$when = explode( '|', sanitize_text_field( (string) ( $b['when'] ?? '' ) ), 2 );
		if ( 'courier' !== $mode && 2 === count( $when ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $when[0] ) ) {
			$o->update_meta_data( AGC_Festive::DATE, $when[0] );
			$o->update_meta_data( AGC_Festive::SLOT, $when[1] );
		}
		if ( ! empty( $b['note'] ) ) {
			$o->set_customer_note( sanitize_textarea_field( (string) $b['note'] ) );
		}
		$methods = array(
			'cash'     => __( 'Cash', 'agency-core' ),
			'transfer' => __( 'Bank transfer', 'agency-core' ),
			'duitnow'  => 'DuitNow QR',
			'other'    => __( 'Other', 'agency-core' ),
		);
		$m = $methods[ $b['method'] ?? 'cash' ] ?? $methods['cash'];
		$o->set_payment_method( 'duitnow' === ( $b['method'] ?? '' ) ? 'agc_duitnow' : '' );
		$o->set_payment_method_title( $m );
		$o->calculate_totals( false );
		$o->save();
		/* translators: %s: user name */
		$o->add_order_note( sprintf( __( 'Order added in the shop dashboard by %s.', 'agency-core' ), wp_get_current_user()->display_name ) );
		$o->update_status( ! empty( $b['paid'] ) ? 'processing' : 'on-hold' );
		AGC_Festive::forget_booked();
		return self::order( array( 'id' => $o->get_id() ) );
	}

	/**
	 * Change many orders at once (e.g. everyone in the 10am slot is ready).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function orders_bulk( $req ) {
		$to  = sanitize_key( (string) $req->get_param( 'status' ) );
		$ids = array_slice( array_map( 'absint', (array) $req->get_param( 'ids' ) ), 0, 200 );
		if ( ! in_array( $to, array( 'processing', AGC_Festive::STATUS, 'completed' ), true ) || ! $ids ) {
			return new WP_Error( 'agc_bad', 'Bad request', array( 'status' => 400 ) );
		}
		$n = 0;
		/* translators: %s: user name */
		$note = sprintf( __( 'Changed in the shop dashboard by %s.', 'agency-core' ), wp_get_current_user()->display_name );
		foreach ( $ids as $id ) {
			$o = wc_get_order( $id );
			if ( $o && 'shop_order' === $o->get_type() && ! $o->has_status( $to ) && ! $o->has_status( array( 'cancelled', 'refunded', 'failed' ) ) ) {
				$o->update_status( $to, $note, true );
				++$n;
			}
		}
		AGC_Festive::forget_booked();
		return array( 'changed' => $n );
	}

	/* ------------------------------------------------------------------ coupons */

	/**
	 * Coupon as the dashboard needs it.
	 *
	 * @param int $id Post ID.
	 * @return array
	 */
	private static function coupon_row( $id ) {
		$c   = new WC_Coupon( $id );
		$exp = $c->get_date_expires();
		return array(
			'id'       => $c->get_id(),
			'code'     => $c->get_code(),
			'type'     => 'percent' === $c->get_discount_type() ? 'percent' : 'fixed_cart',
			'amount'   => (string) $c->get_amount(),
			'min'      => (string) $c->get_minimum_amount(),
			'limit'    => $c->get_usage_limit() ? (int) $c->get_usage_limit() : null,
			'used'     => (int) $c->get_usage_count(),
			'expires'  => $exp ? $exp->date( 'Y-m-d' ) : '',
			'expired'  => $exp && $exp->getTimestamp() < time(),
			'free_ship' => $c->get_free_shipping(),
			'on'       => 'publish' === get_post_status( $c->get_id() ),
		);
	}

	/**
	 * All coupons.
	 *
	 * @return array
	 */
	public static function coupons() {
		$ids = get_posts(
			array(
				'post_type'      => 'shop_coupon',
				'post_status'    => array( 'publish', 'draft' ),
				'posts_per_page' => 200,
				'fields'         => 'ids',
				'orderby'        => 'date',
				'order'          => 'DESC',
			)
		);
		return array( 'coupons' => array_map( array( __CLASS__, 'coupon_row' ), $ids ) );
	}

	/**
	 * Create or update a coupon.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function coupon_save( $req ) {
		$b    = (array) $req->get_json_params();
		$id   = absint( $b['id'] ?? 0 );
		$code = wc_format_coupon_code( sanitize_text_field( (string) ( $b['code'] ?? '' ) ) );
		if ( '' === $code ) {
			return new WP_Error( 'agc_code', __( 'Enter a code.', 'agency-core' ), array( 'status' => 400 ) );
		}
		$other = wc_get_coupon_id_by_code( $code );
		if ( $other && $other !== $id ) {
			return new WP_Error( 'agc_code', __( 'That code is already used.', 'agency-core' ), array( 'status' => 409 ) );
		}
		$c = $id ? new WC_Coupon( $id ) : new WC_Coupon();
		$c->set_code( $code );
		$c->set_discount_type( 'percent' === ( $b['type'] ?? '' ) ? 'percent' : 'fixed_cart' );
		$c->set_amount( wc_format_decimal( (string) ( $b['amount'] ?? '0' ) ) );
		$c->set_minimum_amount( '' === (string) ( $b['min'] ?? '' ) ? '' : wc_format_decimal( (string) $b['min'] ) );
		$c->set_usage_limit( ! empty( $b['limit'] ) ? absint( $b['limit'] ) : 0 );
		$c->set_free_shipping( ! empty( $b['free_ship'] ) );
		$exp = (string) ( $b['expires'] ?? '' );
		$c->set_date_expires( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $exp ) ? ( new DateTimeImmutable( $exp . ' 23:59:59', wp_timezone() ) )->getTimestamp() : null );
		$c->save();
		wp_update_post(
			array(
				'ID'          => $c->get_id(),
				'post_status' => ( ! isset( $b['on'] ) || $b['on'] ) ? 'publish' : 'draft',
			)
		);
		return self::coupon_row( $c->get_id() );
	}

	/**
	 * Delete a coupon (to the bin).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function coupon_delete( $req ) {
		$id = absint( $req['id'] );
		if ( 'shop_coupon' !== get_post_type( $id ) || ! current_user_can( 'delete_post', $id ) ) {
			return new WP_Error( 'agc_forbidden', 'Not allowed', array( 'status' => 403 ) );
		}
		wp_trash_post( $id );
		return array( 'deleted' => true );
	}

	/* ------------------------------------------------------------------ team */

	/**
	 * Staff accounts (shop managers) and the owners (administrators).
	 *
	 * @return array
	 */
	public static function team() {
		$out = array();
		foreach ( get_users( array( 'role__in' => array( 'administrator', 'shop_manager' ), 'orderby' => 'registered' ) ) as $u ) {
			$out[] = array(
				'id'    => $u->ID,
				'name'  => $u->display_name,
				'login' => $u->user_login,
				'email' => $u->user_email,
				'role'  => in_array( 'administrator', (array) $u->roles, true ) ? 'admin' : 'staff',
				'me'    => get_current_user_id() === $u->ID,
			);
		}
		return array( 'team' => $out );
	}

	/**
	 * Add a staff account; returns a one-time "set your password" link to send to them.
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function team_add( $req ) {
		$b     = (array) $req->get_json_params();
		$name  = sanitize_text_field( (string) ( $b['name'] ?? '' ) );
		$email = sanitize_email( (string) ( $b['email'] ?? '' ) );
		if ( '' === $name || ! is_email( $email ) ) {
			return new WP_Error( 'agc_team', __( 'Enter a name and a valid email.', 'agency-core' ), array( 'status' => 400 ) );
		}
		if ( email_exists( $email ) ) {
			return new WP_Error( 'agc_team', __( 'That email already has an account.', 'agency-core' ), array( 'status' => 409 ) );
		}
		$base  = sanitize_user( strtolower( strtok( $email, '@' ) ), true );
		$base  = $base ? $base : 'staff';
		$login = $base;
		for ( $i = 2; username_exists( $login ); $i++ ) {
			$login = $base . $i;
		}
		$id = wp_insert_user(
			array(
				'user_login'   => $login,
				'user_email'   => $email,
				'display_name' => $name,
				'first_name'   => $name,
				'user_pass'    => wp_generate_password( 32, true, true ),
				'role'         => 'shop_manager',
			)
		);
		if ( is_wp_error( $id ) ) {
			return new WP_Error( 'agc_team', $id->get_error_message(), array( 'status' => 400 ) );
		}
		$u   = get_user_by( 'id', $id );
		$key = get_password_reset_key( $u );
		return array(
			'login' => $login,
			'link'  => is_wp_error( $key ) ? '' : network_site_url( 'wp-login.php?action=rp&key=' . $key . '&login=' . rawurlencode( $login ), 'login' ),
			'team'  => self::team()['team'],
		);
	}

	/**
	 * Remove a staff account (only shop managers; never yourself or an owner).
	 *
	 * @param WP_REST_Request $req Request.
	 * @return array|WP_Error
	 */
	public static function team_remove( $req ) {
		$id = absint( $req['id'] );
		$u  = get_user_by( 'id', $id );
		if ( ! $u || get_current_user_id() === $id || ! in_array( 'shop_manager', (array) $u->roles, true ) || in_array( 'administrator', (array) $u->roles, true ) || ! current_user_can( 'delete_users' ) ) {
			return new WP_Error( 'agc_forbidden', 'Not allowed', array( 'status' => 403 ) );
		}
		require_once ABSPATH . 'wp-admin/includes/user.php';
		wp_delete_user( $id, get_current_user_id() );
		return self::team();
	}
}
