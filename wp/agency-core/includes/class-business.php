<?php
/**
 * Business details and social links as shortcodes (used in the footer and legal pages).
 *
 * [agc_business]                 Company block (name, SSM no., address, email, phone)
 * [agc_business field="ssm_no"]  One value
 * [agc_social]                   Social links list
 * [agc_concept_label]            "Concept Project" label (only when set)
 * [agc_year]                     Current year
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Business.
 */
class AGC_Business {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_shortcode( 'agc_business', array( __CLASS__, 'business' ) );
		add_shortcode( 'agc_social', array( __CLASS__, 'social' ) );
		add_shortcode( 'agc_concept_label', array( __CLASS__, 'concept_label' ) );
		add_shortcode( 'agc_year', static fn() => esc_html( wp_date( 'Y' ) ) );
		// Shortcodes inside block widgets / footer HTML.
		add_filter( 'widget_text', 'do_shortcode' );
		add_filter( 'widget_block_content', 'do_shortcode' );
	}

	/**
	 * Company block or a single field.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function business( $atts ) {
		$atts   = shortcode_atts( array( 'field' => '' ), $atts, 'agc_business' );
		$fields = array( 'legal_name', 'ssm_no', 'business_email', 'business_phone', 'business_address', 'business_hours' );
		if ( $atts['field'] ) {
			$key = in_array( $atts['field'], $fields, true ) ? $atts['field'] : ( in_array( 'business_' . $atts['field'], $fields, true ) ? 'business_' . $atts['field'] : '' );
			return $key ? esc_html( (string) agc_get( $key ) ) : '';
		}
		$name  = agc_get( 'legal_name' );
		$ssm   = agc_get( 'ssm_no' );
		$email = agc_get( 'business_email' );
		$phone = agc_get( 'business_phone' );
		$addr  = agc_get( 'business_address' );
		$hours = agc_get( 'business_hours' );
		$out   = '<div class="agc-business">';
		if ( $name ) {
			$out .= '<p class="agc-business-name"><strong>' . esc_html( $name ) . '</strong>' . ( $ssm ? ' <span class="agc-ssm">(' . esc_html( $ssm ) . ')</span>' : '' ) . '</p>';
		}
		if ( $addr ) {
			$out .= '<p class="agc-business-address">' . nl2br( esc_html( $addr ) ) . '</p>';
		}
		$lines = array();
		if ( $email ) {
			$lines[] = '<a href="' . esc_url( 'mailto:' . $email ) . '">' . esc_html( $email ) . '</a>';
		}
		if ( $phone ) {
			$lines[] = '<a href="' . esc_url( 'tel:' . preg_replace( '/[^0-9+]/', '', $phone ) ) . '">' . esc_html( $phone ) . '</a>';
		}
		if ( $hours ) {
			$lines[] = esc_html( $hours );
		}
		if ( $lines ) {
			$out .= '<p class="agc-business-contact">' . implode( '<br>', $lines ) . '</p>';
		}
		return $out . '</div>';
	}

	/**
	 * Social links.
	 *
	 * @return string
	 */
	public static function social() {
		$map   = array(
			'social_instagram'   => 'Instagram',
			'social_facebook'    => 'Facebook',
			'social_tiktok'      => 'TikTok',
			'social_shopee'      => 'Shopee',
			'social_xiaohongshu' => '小红书',
			'social_youtube'     => 'YouTube',
		);
		$items = '';
		foreach ( $map as $key => $label ) {
			$url = agc_get( $key );
			if ( $url ) {
				$items .= '<li><a href="' . esc_url( $url ) . '" target="_blank" rel="noopener">' . esc_html( $label ) . '</a></li>';
			}
		}
		return $items ? '<ul class="agc-social">' . $items . '</ul>' : '';
	}

	/**
	 * Concept label.
	 *
	 * @return string
	 */
	public static function concept_label() {
		$label = agc_get( 'concept_label' );
		return $label ? '<span class="agc-concept-label">' . esc_html( $label ) . '</span>' : '';
	}
}
