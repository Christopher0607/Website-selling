<?php
/**
 * GA4 + Meta Pixel. Nothing is printed when the IDs are empty.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Tracking.
 */
class AGC_Tracking {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'wp_head', array( __CLASS__, 'head' ), 5 );
	}

	/**
	 * Don't track admins/shop managers, previews or the customizer.
	 *
	 * @return bool
	 */
	private static function skip() {
		return is_admin() || is_customize_preview() || current_user_can( 'edit_posts' ) || (bool) apply_filters( 'agc_skip_tracking', false );
	}

	/**
	 * Print the snippets.
	 */
	public static function head() {
		$ga4   = agc_get( 'ga4_id' );
		$pixel = agc_get( 'meta_pixel_id' );
		if ( ( ! $ga4 && ! $pixel ) || self::skip() ) {
			return;
		}
		if ( $ga4 ) {
			printf( '<script async src="%s"></script>' . "\n", esc_url( 'https://www.googletagmanager.com/gtag/js?id=' . rawurlencode( $ga4 ) ) );
			printf(
				"<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',%s);</script>\n",
				wp_json_encode( $ga4 )
			);
		}
		if ( $pixel ) {
			printf(
				"<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',%s);fbq('track','PageView');</script>\n",
				wp_json_encode( $pixel )
			);
			printf(
				'<noscript><img height="1" width="1" style="display:none" alt="" src="%s"/></noscript>' . "\n",
				esc_url( 'https://www.facebook.com/tr?id=' . rawurlencode( $pixel ) . '&ev=PageView&noscript=1' )
			);
		}
	}
}
