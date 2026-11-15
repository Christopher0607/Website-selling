<?php
/**
 * Malaysian checkout tweaks (classic checkout): phone required, company and address line 2 hidden; no address at all
 * when the shop only offers pickup.
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
		add_filter( 'gettext_woocommerce', array( __CLASS__, 'pickup_words' ), 20, 2 );
	}

	/**
	 * Collection-only shop: "Your details" instead of "Billing & Shipping" / "Billing address".
	 *
	 * @param string $t    Translation.
	 * @param string $text Original.
	 * @return string
	 */
	public static function pickup_words( $t, $text ) {
		if ( 'Billing &amp; Shipping' !== $text && 'Billing address' !== $text && 'Notes about your order, e.g. special notes for delivery.' !== $text ) {
			return $t;
		}
		if ( ! did_action( 'woocommerce_init' ) || ! self::pickup_only() ) {
			return $t;
		}
		if ( 'Notes about your order, e.g. special notes for delivery.' === $text ) {
			return __( 'Anything we should know? e.g. a message on the cake', 'agency-core' );
		}
		return __( 'Your details', 'agency-core' );
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
		// Collection-only shop (2026-11-14): no address to type, just name, phone and email.
		if ( self::pickup_only() && isset( $fields['billing'] ) ) {
			unset( $fields['billing']['billing_address_1'], $fields['billing']['billing_address_2'], $fields['billing']['billing_city'], $fields['billing']['billing_state'], $fields['billing']['billing_postcode'], $fields['billing']['billing_company'] );
			if ( isset( $fields['billing']['billing_country'] ) ) {
				$fields['billing']['billing_country']['type']    = 'hidden';
				$fields['billing']['billing_country']['default'] = WC()->countries->get_base_country();
				$fields['billing']['billing_country']['label']   = '';
			}
		}
		return $fields;
	}

	/**
	 * True when every enabled shipping method in every zone is a pickup (the shop does not deliver).
	 *
	 * @return bool
	 */
	public static function pickup_only() {
		static $r = null;
		if ( null !== $r ) {
			return $r;
		}
		$r = false;
		if ( ! class_exists( 'WC_Shipping_Zones' ) ) {
			return $r;
		}
		$zones   = WC_Shipping_Zones::get_zones();
		$zones[] = array( 'shipping_methods' => ( new WC_Shipping_Zone( 0 ) )->get_shipping_methods( true ) );
		$n       = 0;
		foreach ( $zones as $z ) {
			foreach ( (array) $z['shipping_methods'] as $m ) {
				if ( 'yes' !== $m->enabled ) {
					continue;
				}
				if ( ! in_array( $m->id, array( 'local_pickup', 'pickup_location' ), true ) ) {
					return $r;
				}
				$n++;
			}
		}
		$r = $n > 0;
		return $r;
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
