<?php
/**
 * Store UX patterns used by high-converting online stores — honest versions only
 * (no fake reviews, fake stock counters or fake countdowns):
 *
 * - Announcement bar (top of every page)
 * - Trust badges under "Add to cart" + [agc_trust_bar] shortcode for the homepage
 * - Free-shipping progress bar in cart, mini-cart and checkout (real cart total)
 * - Sticky add-to-cart bar on mobile product pages
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Store UX.
 */
class AGC_Store_UX {

	/**
	 * Hooks.
	 */
	public static function init() {
		// Kadence：放在 #wrapper 里面（放在外面会让黏住的页首往下偏移）.
		add_action( 'after_setup_theme', static function () {
			add_action( 'kadence' === get_template() ? 'kadence_before_header' : 'wp_body_open', array( __CLASS__, 'announcement' ), 5 );
		} );
		add_shortcode( 'agc_trust_bar', array( __CLASS__, 'trust_bar' ) );
		add_shortcode( 'agc_free_shipping_bar', array( __CLASS__, 'free_shipping_bar' ) );
		add_action( 'woocommerce_after_add_to_cart_form', array( __CLASS__, 'product_trust' ), 20 );
		add_action( 'woocommerce_before_cart', array( __CLASS__, 'print_free_shipping_bar' ) );
		add_action( 'woocommerce_before_mini_cart_contents', array( __CLASS__, 'print_free_shipping_bar' ) );
		add_action( 'woocommerce_review_order_before_cart_contents', array( __CLASS__, 'checkout_free_shipping_row' ) );
		add_filter( 'woocommerce_add_to_cart_fragments', array( __CLASS__, 'fragments' ) );
		add_action( 'wp_footer', array( __CLASS__, 'sticky_atc' ), 15 );
	}

	/**
	 * Small inline SVG icons.
	 *
	 * @param string $name Icon.
	 * @return string
	 */
	public static function icon( $name ) {
		$p = array(
			'truck'  => '<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
			'card'   => '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
			'return' => '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>',
			'leaf'   => '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19c4-4 7-6 10-8"/>',
			'shield' => '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
			'chat'   => '<path d="M4 5h16v11H8l-4 4z"/>',
			'heart'  => '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
			'gift'   => '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>',
			'clock'  => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
			'star'   => '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
		);
		$path = $p[ $name ] ?? $p['shield'];
		return '<svg class="agc-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $path . '</svg>';
	}

	/**
	 * Parse "icon|Title|Subtitle" lines from settings.
	 *
	 * @return array
	 */
	public static function badges() {
		$out = array();
		foreach ( preg_split( '/\r?\n/', (string) agc_get( 'trust_badges' ) ) as $line ) {
			$parts = array_map( 'trim', explode( '|', $line ) );
			if ( count( $parts ) >= 2 && '' !== $parts[1] ) {
				$out[] = array(
					'icon'  => sanitize_key( $parts[0] ),
					'title' => $parts[1],
					'sub'   => $parts[2] ?? '',
				);
			}
		}
		return $out;
	}

	/**
	 * Announcement bar.
	 */
	public static function announcement() {
		$text = agc_get( 'announcement' );
		if ( ! $text ) {
			return;
		}
		$link = agc_get( 'announcement_link' );
		$inner = esc_html( $text );
		if ( $link ) {
			$inner = '<a href="' . esc_url( $link ) . '">' . $inner . '</a>';
		}
		echo '<div class="agc-announcement" role="region" aria-label="' . esc_attr__( 'Announcement', 'agency-core' ) . '">' . $inner . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above.
	}

	/**
	 * [agc_trust_bar] — horizontal strip of badges.
	 *
	 * @return string
	 */
	public static function trust_bar() {
		$badges = self::badges();
		if ( ! $badges ) {
			return '';
		}
		$out = '<ul class="agc-trust-bar">';
		foreach ( $badges as $b ) {
			$out .= '<li>' . self::icon( $b['icon'] ) . '<span><strong>' . esc_html( $b['title'] ) . '</strong>' . ( $b['sub'] ? '<small>' . esc_html( $b['sub'] ) . '</small>' : '' ) . '</span></li>';
		}
		return $out . '</ul>';
	}

	/**
	 * Trust badges on the product page.
	 */
	public static function product_trust() {
		$badges = array_slice( self::badges(), 0, 4 );
		if ( ! $badges ) {
			return;
		}
		echo '<ul class="agc-product-trust">';
		foreach ( $badges as $b ) {
			echo '<li>' . self::icon( $b['icon'] ) . '<span>' . esc_html( $b['title'] ) . '</span></li>'; // phpcs:ignore WordPress.Security.EscapeOutput -- static SVG.
		}
		echo '</ul>';
	}

	/**
	 * Free-shipping progress (real numbers from the cart).
	 *
	 * @return string
	 */
	public static function free_shipping_bar() {
		$min = (float) agc_get( 'free_shipping_min' );
		if ( $min <= 0 || ! function_exists( 'WC' ) || ! WC()->cart ) {
			return '<div class="agc-fs-bar agc-fs-empty"></div>';
		}
		$total = (float) WC()->cart->get_displayed_subtotal() - (float) WC()->cart->get_discount_total();
		if ( $total <= 0 ) {
			return '<div class="agc-fs-bar agc-fs-empty"></div>';
		}
		$left = max( 0, $min - $total );
		$pct  = min( 100, round( $total / $min * 100 ) );
		$msg  = $left > 0
			/* translators: %s: amount */
			? sprintf( __( 'You are %s away from free shipping', 'agency-core' ), '<strong>' . wc_price( $left ) . '</strong>' )
			: '<strong>' . esc_html__( 'You get free shipping!', 'agency-core' ) . '</strong>';
		return '<div class="agc-fs-bar' . ( $left > 0 ? '' : ' agc-fs-done' ) . '"><p>' . wp_kses_post( $msg ) . '</p><div class="agc-fs-track"><span style="width:' . esc_attr( (string) $pct ) . '%"></span></div></div>';
	}

	/**
	 * Echo the bar.
	 */
	public static function print_free_shipping_bar() {
		echo self::free_shipping_bar(); // phpcs:ignore WordPress.Security.EscapeOutput -- built with escaping.
	}

	/**
	 * Checkout: show the bar as a table row.
	 */
	public static function checkout_free_shipping_row() {
		$bar = self::free_shipping_bar();
		if ( false === strpos( $bar, 'agc-fs-empty' ) ) {
			echo '<tr class="agc-fs-row"><td colspan="2">' . $bar . '</td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built with escaping.
		}
	}

	/**
	 * Keep the bar in sync when items are added with AJAX.
	 *
	 * @param array $fragments Fragments.
	 * @return array
	 */
	public static function fragments( $fragments ) {
		$fragments['div.agc-fs-bar'] = self::free_shipping_bar();
		return $fragments;
	}

	/**
	 * Sticky add-to-cart bar (mobile, product pages). The button scrolls to / submits the real form,
	 * so variations, quantity and validation all keep working.
	 */
	public static function sticky_atc() {
		if ( ! agc_get( 'sticky_atc' ) || ! function_exists( 'is_product' ) || ! is_product() ) {
			return;
		}
		$product = wc_get_product( get_queried_object_id() );
		if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
			return;
		}
		$label = $product->is_type( 'variable' ) ? __( 'Choose options', 'agency-core' ) : __( 'Add to cart', 'agency-core' );
		printf(
			'<div class="agc-sticky-atc" aria-hidden="true" data-agc-sticky-atc><div class="agc-sticky-atc-info"><span class="agc-sticky-atc-title">%1$s</span><span class="agc-sticky-atc-price">%2$s</span></div><button type="button" class="button alt" data-variable="%3$s">%4$s</button></div>',
			esc_html( $product->get_name() ),
			wp_kses_post( $product->get_price_html() ),
			$product->is_type( 'variable' ) ? '1' : '0',
			esc_html( $label )
		);
	}
}
