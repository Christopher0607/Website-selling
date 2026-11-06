<?php
/**
 * WhatsApp floating button, product button and [agc_whatsapp] shortcode.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * WhatsApp.
 */
class AGC_WhatsApp {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'wp_footer', array( __CLASS__, 'floating_button' ), 20 );
		add_action( 'woocommerce_after_add_to_cart_form', array( __CLASS__, 'product_button' ) );
		add_shortcode( 'agc_whatsapp', array( __CLASS__, 'shortcode' ) );
	}

	/**
	 * Build a wa.me link.
	 *
	 * @param string $message Message (plain text).
	 * @return string
	 */
	public static function link( $message = '' ) {
		$number = agc_get( 'whatsapp_number' );
		if ( ! $number ) {
			return '';
		}
		$url = 'https://wa.me/' . rawurlencode( $number );
		if ( '' !== $message ) {
			$url .= '?text=' . rawurlencode( $message );
		}
		return $url;
	}

	/**
	 * Replace {product} {url} {site} in a template.
	 *
	 * @param string $template Template.
	 * @param array  $vars     Variables.
	 * @return string
	 */
	public static function fill( $template, $vars = array() ) {
		$vars = wp_parse_args(
			$vars,
			array(
				'product' => '',
				'url'     => is_singular() ? get_permalink() : home_url( '/' ),
				'site'    => wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ),
			)
		);
		return strtr(
			(string) $template,
			array(
				'{product}' => $vars['product'],
				'{url}'     => $vars['url'],
				'{site}'    => $vars['site'],
			)
		);
	}

	/**
	 * SVG icon.
	 *
	 * @return string
	 */
	private static function icon() {
		return '<svg aria-hidden="true" focusable="false" width="26" height="26" viewBox="0 0 32 32"><path fill="currentColor" d="M16.04 3C9.08 3 3.43 8.64 3.43 15.6c0 2.22.58 4.39 1.69 6.3L3.33 28.5l6.78-1.78a12.6 12.6 0 0 0 5.93 1.5h.01c6.95 0 12.61-5.65 12.61-12.6 0-3.37-1.31-6.53-3.69-8.91A12.52 12.52 0 0 0 16.04 3zm0 23.09h-.01a10.5 10.5 0 0 1-5.35-1.47l-.38-.23-4.02 1.06 1.07-3.92-.25-.4a10.43 10.43 0 0 1-1.6-5.53c0-5.79 4.71-10.5 10.51-10.5 2.8 0 5.44 1.1 7.42 3.08a10.43 10.43 0 0 1 3.07 7.43c0 5.79-4.72 10.48-10.46 10.48zm5.76-7.86c-.32-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.32-.82 1.03-1 1.24-.18.21-.37.24-.69.08-.32-.16-1.33-.49-2.54-1.57-.94-.84-1.57-1.87-1.75-2.19-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.22 3.39 5.38 4.75.75.32 1.34.52 1.8.66.75.24 1.44.21 1.98.13.6-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37z"/></svg>';
	}

	/**
	 * Should the floating button be hidden on this request?
	 *
	 * @return bool
	 */
	private static function hide_floating() {
		if ( ! agc_get( 'whatsapp_float' ) || ! agc_get( 'whatsapp_number' ) ) {
			return true;
		}
		// Cart and checkout: never cover "Proceed to checkout" / "Place order".
		if ( function_exists( 'is_checkout' ) && ( is_checkout() || is_cart() ) ) {
			return true;
		}
		return (bool) apply_filters( 'agc_hide_whatsapp_float', false );
	}

	/**
	 * Floating button.
	 */
	public static function floating_button() {
		if ( is_admin() || self::hide_floating() ) {
			return;
		}
		$message = self::fill( agc_get( 'whatsapp_general' ) );
		$classes = 'agc-wa-float agc-wa-' . ( 'left' === agc_get( 'whatsapp_position' ) ? 'left' : 'right' );
		// On product pages the inline button exists, so hide the floating one on small screens.
		if ( function_exists( 'is_product' ) && is_product() && agc_get( 'whatsapp_product_btn' ) ) {
			$classes .= ' agc-wa-hide-mobile';
		}
		printf(
			'<a class="%1$s" href="%2$s" target="_blank" rel="noopener" data-agc-event="whatsapp_click" data-agc-location="float" aria-label="%3$s">%4$s</a>',
			esc_attr( $classes ),
			esc_url( self::link( $message ) ),
			esc_attr( agc_get( 'whatsapp_float_label' ) ),
			self::icon() // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG.
		);
	}

	/**
	 * Button under the add-to-cart form.
	 */
	public static function product_button() {
		if ( ! agc_get( 'whatsapp_product_btn' ) || ! agc_get( 'whatsapp_number' ) ) {
			return;
		}
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}
		$message = self::fill(
			agc_get( 'whatsapp_prefill' ),
			array(
				'product' => wp_strip_all_tags( $product->get_name() ),
				'url'     => get_permalink( $product->get_id() ),
			)
		);
		printf(
			'<p class="agc-wa-product-wrap"><a class="agc-wa-product button" href="%1$s" target="_blank" rel="noopener" data-agc-event="whatsapp_click" data-agc-location="product">%2$s<span>%3$s</span></a></p>',
			esc_url( self::link( $message ) ),
			self::icon(), // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG.
			esc_html( agc_get( 'whatsapp_button_text' ) )
		);
	}

	/**
	 * [agc_whatsapp text="WhatsApp us" message="Hi..." class="" style="button|link"]
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'text'    => agc_get( 'whatsapp_float_label' ),
				'message' => agc_get( 'whatsapp_general' ),
				'class'   => '',
				'style'   => 'button',
			),
			$atts,
			'agc_whatsapp'
		);
		$link = self::link( self::fill( $atts['message'] ) );
		if ( ! $link ) {
			return '';
		}
		$class = 'agc-wa-cta' . ( 'button' === $atts['style'] ? ' button agc-wa-cta-button' : '' ) . ( $atts['class'] ? ' ' . $atts['class'] : '' );
		return sprintf(
			'<a class="%1$s" href="%2$s" target="_blank" rel="noopener" data-agc-event="whatsapp_click" data-agc-location="cta">%3$s<span>%4$s</span></a>',
			esc_attr( $class ),
			esc_url( $link ),
			self::icon(), // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG.
			esc_html( $atts['text'] )
		);
	}
}
