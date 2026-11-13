<?php
/**
 * Demo mode: banner, no payment methods, orders blocked server-side, noindex, no customer emails.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Demo mode.
 */
class AGC_Demo_Mode {

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! agc_get( 'demo_mode' ) ) {
			return;
		}
		add_action( 'kadence' === get_template() ? 'kadence_before_header' : 'wp_body_open', array( __CLASS__, 'banner' ), 1 );
		add_filter( 'body_class', array( __CLASS__, 'body_class' ) );
		add_filter( 'wp_robots', 'wp_robots_no_robots' );

		// Test orders allowed (festive demo, 2026-11-13): orders go through, but only with the
		// demo-safe payment methods (DuitNow sample QR + demo online payment). Nothing is charged.
		if ( agc_get( 'demo_test_orders' ) ) {
			add_filter( 'woocommerce_available_payment_gateways', array( __CLASS__, 'demo_gateways_only' ), 999 );
			return;
		}

		// WooCommerce: hide payment methods, swap the button, block orders.
		add_filter( 'woocommerce_available_payment_gateways', array( __CLASS__, 'no_gateways' ), 999 );
		add_filter( 'woocommerce_order_button_html', array( __CLASS__, 'order_button' ), 999 );
		add_action( 'woocommerce_review_order_before_submit', array( __CLASS__, 'checkout_notice' ) );
		add_action( 'woocommerce_checkout_process', array( __CLASS__, 'block_classic_checkout' ), 1 );
		add_action( 'woocommerce_after_checkout_validation', array( __CLASS__, 'block_validation' ), 999, 2 );
		add_filter( 'rest_pre_dispatch', array( __CLASS__, 'block_store_api' ), 10, 3 );
		add_action( 'woocommerce_before_pay_action', array( __CLASS__, 'block_pay' ), 1 );
		add_action( 'woocommerce_init', array( __CLASS__, 'disable_customer_emails' ) );
	}

	/**
	 * Top banner.
	 */
	public static function banner() {
		printf( '<div class="agc-demo-banner" role="note">%s</div>', esc_html( agc_get( 'demo_banner' ) ) );
	}

	/**
	 * Body class.
	 *
	 * @param array $classes Classes.
	 * @return array
	 */
	public static function body_class( $classes ) {
		$classes[] = 'agc-demo';
		return $classes;
	}

	/**
	 * No payment gateways in demo mode (admin screens untouched).
	 *
	 * @param array $gateways Gateways.
	 * @return array
	 */
	public static function no_gateways( $gateways ) {
		return is_admin() && ! wp_doing_ajax() ? $gateways : array();
	}

	/**
	 * Test orders: only the payment methods that cannot take real money.
	 *
	 * @param array $gateways Gateways.
	 * @return array
	 */
	public static function demo_gateways_only( $gateways ) {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return $gateways;
		}
		return array_intersect_key( $gateways, array_flip( array( 'agc_demo_pay', 'agc_duitnow' ) ) );
	}

	/**
	 * Replace "Place order" with a notice.
	 *
	 * @return string
	 */
	public static function order_button() {
		return '<button type="button" class="button alt agc-demo-order" disabled>' . esc_html( agc_get( 'demo_checkout_notice' ) ) . '</button>';
	}

	/**
	 * Notice above the button.
	 */
	public static function checkout_notice() {
		printf( '<p class="agc-demo-checkout-notice">%s</p>', esc_html( agc_get( 'demo_checkout_notice' ) ) );
	}

	/**
	 * Classic checkout: stop before the order is created.
	 */
	public static function block_classic_checkout() {
		wc_add_notice( esc_html( agc_get( 'demo_checkout_notice' ) ), 'error' );
	}

	/**
	 * Belt and braces: add a validation error too.
	 *
	 * @param array    $data   Posted data.
	 * @param WP_Error $errors Errors.
	 */
	public static function block_validation( $data, $errors ) {
		$errors->add( 'agc_demo', esc_html( agc_get( 'demo_checkout_notice' ) ) );
	}

	/**
	 * Block checkout (Store API) and order-pay requests.
	 *
	 * @param mixed           $result  Result.
	 * @param WP_REST_Server  $server  Server.
	 * @param WP_REST_Request $request Request.
	 * @return mixed
	 */
	public static function block_store_api( $result, $server, $request ) {
		$route = $request->get_route();
		if ( 'GET' !== $request->get_method() && preg_match( '#^/wc/store(/v\d+)?/checkout#', $route ) ) {
			return new WP_Error( 'agc_demo_mode', agc_get( 'demo_checkout_notice' ), array( 'status' => 403 ) );
		}
		return $result;
	}

	/**
	 * "Pay for order" page.
	 */
	public static function block_pay() {
		wc_add_notice( esc_html( agc_get( 'demo_checkout_notice' ) ), 'error' );
		wp_safe_redirect( wc_get_cart_url() );
		exit;
	}

	/**
	 * No customer-facing emails in demo mode.
	 */
	public static function disable_customer_emails() {
		$ids = array(
			'customer_on_hold_order',
			'customer_processing_order',
			'customer_completed_order',
			'customer_refunded_order',
			'customer_partially_refunded_order',
			'customer_invoice',
			'customer_note',
			'customer_new_account',
			'customer_failed_order',
			'customer_cancelled_order',
		);
		foreach ( $ids as $id ) {
			add_filter( 'woocommerce_email_enabled_' . $id, '__return_false', 999 );
		}
	}
}
