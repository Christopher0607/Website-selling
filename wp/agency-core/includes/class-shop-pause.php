<?php
/**
 * Pause online orders (2026-11-13): one switch in the shop dashboard. People can still look at the shop;
 * nothing can be added to the cart and every page shows the message.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Shop pause.
 */
class AGC_Shop_Pause {

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! agc_get( 'shop_paused' ) ) {
			return;
		}
		add_filter( 'woocommerce_is_purchasable', array( __CLASS__, 'purchasable' ), 30 );
		add_filter( 'woocommerce_variation_is_purchasable', array( __CLASS__, 'purchasable' ), 30 );
		add_action( 'woocommerce_checkout_process', array( __CLASS__, 'stop_checkout' ), 1 );
		add_action( 'after_setup_theme', static function () {
			add_action( 'kadence' === get_template() ? 'kadence_before_header' : 'wp_body_open', array( __CLASS__, 'banner' ), 4 );
		} );
	}

	/**
	 * The message shown to customers.
	 *
	 * @return string
	 */
	public static function message() {
		$m = trim( (string) agc_get( 'shop_paused_msg' ) );
		return $m ? $m : __( 'We are not taking online orders right now. Please check back soon.', 'agency-core' );
	}

	/**
	 * Nothing can be bought on the website (the dashboard can still add orders).
	 *
	 * @param bool $ok Purchasable.
	 * @return bool
	 */
	public static function purchasable( $ok ) {
		if ( ( is_admin() && ! wp_doing_ajax() ) || ( defined( 'REST_REQUEST' ) && REST_REQUEST && current_user_can( 'edit_shop_orders' ) ) ) {
			return $ok;
		}
		return false;
	}

	/**
	 * Stop a checkout that was already open.
	 */
	public static function stop_checkout() {
		wc_add_notice( esc_html( self::message() ), 'error' );
	}

	/**
	 * Bar at the top of every page.
	 */
	public static function banner() {
		printf( '<div class="agc-paused" role="status">%s</div>', esc_html( self::message() ) );
	}
}
