<?php
/**
 * Malaysian checkout tweaks (classic checkout): phone required, company and address line 2 hidden.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Checkout.
 */
class AGC_Checkout {

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! agc_get( 'my_checkout' ) ) {
			return;
		}
		add_filter( 'woocommerce_checkout_fields', array( __CLASS__, 'fields' ), 20 );
		add_filter( 'woocommerce_default_address_fields', array( __CLASS__, 'address_fields' ), 20 );
	}

	/**
	 * Billing phone required (shops contact customers on WhatsApp).
	 *
	 * @param array $fields Fields.
	 * @return array
	 */
	public static function fields( $fields ) {
		if ( isset( $fields['billing']['billing_phone'] ) ) {
			$fields['billing']['billing_phone']['required'] = true;
			$fields['billing']['billing_phone']['label']    = __( 'Phone (WhatsApp)', 'agency-core' );
		}
		return $fields;
	}

	/**
	 * Hide company and address line 2; keep postcode (needed for shipping).
	 *
	 * @param array $fields Fields.
	 * @return array
	 */
	public static function address_fields( $fields ) {
		unset( $fields['company'], $fields['address_2'] );
		if ( isset( $fields['postcode'] ) ) {
			$fields['postcode']['required'] = true;
		}
		return $fields;
	}
}
