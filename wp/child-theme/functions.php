<?php
/**
 * Agency Child functions.
 *
 * @package AgencyChild
 */

defined( 'ABSPATH' ) || exit;

define( 'AGENCY_CHILD_VERSION', '1.0.0' );

/**
 * Child styles (Kadence loads its own CSS; we only add small tweaks on top).
 */
add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_enqueue_style( 'agency-child', get_stylesheet_directory_uri() . '/assets/css/custom.css', array( 'kadence-global' ), AGENCY_CHILD_VERSION );
	},
	20
);

/**
 * Block pattern category for our reusable sections (patterns live in /patterns and are auto-registered).
 */
add_action(
	'init',
	static function () {
		register_block_pattern_category( 'agency', array( 'label' => __( 'Agency sections', 'agency-child' ) ) );
	}
);

/**
 * Remove the "WordPress Theme by Kadence WP" credit if a site still uses the default footer text.
 */
add_filter(
	'theme_mod_footer_html_content',
	static function ( $value ) {
		return is_string( $value ) ? str_replace( '{theme-credit}', '', $value ) : $value;
	}
);
