<?php
/**
 * Plugin Name:       Agency Core
 * Description:       WhatsApp buttons, demo mode, tracking codes, business details and Malaysian checkout tweaks for studio-built stores.
 * Version:           1.0.0
 * Requires at least: 6.4
 * Requires PHP:      8.1
 * Author:            KedaiLab
 * License:           GPL-2.0-or-later
 * Text Domain:       agency-core
 * Domain Path:       /languages
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

define( 'AGC_VERSION', '1.0.0' );
define( 'AGC_FILE', __FILE__ );
define( 'AGC_DIR', plugin_dir_path( __FILE__ ) );
define( 'AGC_URL', plugin_dir_url( __FILE__ ) );

require_once AGC_DIR . 'includes/class-settings.php';
require_once AGC_DIR . 'includes/class-whatsapp.php';
require_once AGC_DIR . 'includes/class-demo-mode.php';
require_once AGC_DIR . 'includes/class-tracking.php';
require_once AGC_DIR . 'includes/class-business.php';
require_once AGC_DIR . 'includes/class-checkout.php';

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once AGC_DIR . 'includes/class-cli.php';
}

/**
 * Get one setting (or all settings when $key is null).
 *
 * @param string|null $key Setting key.
 * @return mixed
 */
function agc_get( $key = null ) {
	return AGC_Settings::get( $key );
}

add_action(
	'plugins_loaded',
	static function () {
		load_plugin_textdomain( 'agency-core', false, dirname( plugin_basename( AGC_FILE ) ) . '/languages' );
		AGC_Settings::init();
		AGC_WhatsApp::init();
		AGC_Demo_Mode::init();
		AGC_Tracking::init();
		AGC_Business::init();
		AGC_Checkout::init();
	}
);

add_action(
	'wp_enqueue_scripts',
	static function () {
		wp_enqueue_style( 'agency-core', AGC_URL . 'assets/css/agency-core.css', array(), AGC_VERSION );
		wp_enqueue_script( 'agency-core', AGC_URL . 'assets/js/agency-core.js', array(), AGC_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );
		$accent = agc_get( 'accent_color' );
		if ( $accent && preg_match( '/^#[0-9a-fA-F]{3,8}$/', $accent ) ) {
			wp_add_inline_style( 'agency-core', ':root{--agc-accent:' . $accent . ';}' );
		}
	}
);

register_activation_hook(
	__FILE__,
	static function () {
		if ( false === get_option( AGC_Settings::OPTION ) ) {
			add_option( AGC_Settings::OPTION, AGC_Settings::defaults() );
		}
	}
);
