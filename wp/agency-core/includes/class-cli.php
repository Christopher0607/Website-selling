<?php
/**
 * WP-CLI: wp agc ...
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Manage Agency Core settings.
 */
class AGC_CLI {

	/**
	 * Show settings.
	 *
	 * ## OPTIONS
	 *
	 * [<key>]
	 * : One key only.
	 *
	 * [--format=<format>]
	 * : table or json. Default table.
	 *
	 * @param array $args  Args.
	 * @param array $assoc Assoc args.
	 */
	public function get( $args, $assoc ) {
		$all = AGC_Settings::get();
		if ( ! empty( $args[0] ) ) {
			if ( ! array_key_exists( $args[0], $all ) ) {
				WP_CLI::error( "Unknown key: {$args[0]}" );
			}
			WP_CLI::line( (string) $all[ $args[0] ] );
			return;
		}
		if ( 'json' === ( $assoc['format'] ?? 'table' ) ) {
			WP_CLI::line( wp_json_encode( $all, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
			return;
		}
		$rows = array();
		foreach ( $all as $k => $v ) {
			$rows[] = array(
				'key'   => $k,
				'value' => $v,
			);
		}
		WP_CLI\Utils\format_items( 'table', $rows, array( 'key', 'value' ) );
	}

	/**
	 * Set one setting.
	 *
	 * ## OPTIONS
	 *
	 * <key>
	 * : Setting key.
	 *
	 * <value>
	 * : New value.
	 *
	 * @param array $args Args.
	 */
	public function set( $args ) {
		$this->merge( array( $args[0] => $args[1] ) );
		WP_CLI::success( "{$args[0]} updated." );
	}

	/**
	 * Merge settings from a JSON file (only known keys are used).
	 *
	 * ## OPTIONS
	 *
	 * <file>
	 * : JSON file with {"key": "value"}.
	 *
	 * @param array $args Args.
	 */
	public function import( $args ) {
		if ( ! is_readable( $args[0] ) ) {
			WP_CLI::error( "Cannot read {$args[0]}" );
		}
		$data = json_decode( (string) file_get_contents( $args[0] ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		if ( ! is_array( $data ) ) {
			WP_CLI::error( 'Invalid JSON.' );
		}
		$this->merge( $data );
		WP_CLI::success( count( $data ) . ' settings processed.' );
	}

	/**
	 * Turn demo mode on or off.
	 *
	 * ## OPTIONS
	 *
	 * <state>
	 * : on or off
	 *
	 * @param array $args Args.
	 */
	public function demo( $args ) {
		$on = in_array( strtolower( $args[0] ), array( 'on', '1', 'true', 'yes' ), true );
		$this->merge( array( 'demo_mode' => $on ? 1 : 0 ) );
		WP_CLI::success( 'Demo mode ' . ( $on ? 'ON' : 'OFF' ) );
	}

	/**
	 * Merge known keys into the option (runs the normal sanitizer).
	 *
	 * @param array $data Data.
	 */
	private function merge( array $data ) {
		$current = AGC_Settings::get();
		foreach ( $data as $key => $value ) {
			if ( ! array_key_exists( $key, AGC_Settings::defaults() ) ) {
				WP_CLI::warning( "Skipping unknown key: $key" );
				continue;
			}
			$current[ $key ] = is_bool( $value ) ? (int) $value : $value;
		}
		update_option( AGC_Settings::OPTION, AGC_Settings::sanitize( $current ) );
		AGC_Settings::flush();
	}
}

WP_CLI::add_command( 'agc', 'AGC_CLI' );
