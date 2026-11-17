<?php
/**
 * Public demo account (2026-11-16, docs/14-wordpress-demos.md): on the studio's demo websites anyone can look at the
 * real back office — WordPress / WooCommerce (/wp-admin/) and the shop dashboard (/dian/) — with one tap, no password.
 *
 * - Only when demo mode and "public demo login" are both on (Settings → Agency → Demo).
 * - The account's role can see and change orders, products, stock, coupons, bookings, enquiries and reports, and upload
 *   product photos; it cannot change settings, plugins, themes or users, delete anything, post raw HTML, or change its
 *   own password or email.
 * - The whole website is put back every night (scripts/server/demo-reset.sh); visitors' names, phone numbers, emails and
 *   addresses are hidden after an hour, so the next visitor doesn't see them.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Demo access.
 */
class AGC_Demo_Access {

	const ROLE  = 'agc_demo_viewer';
	const USER  = 'demo';
	const HOOK  = 'agc_demo_scrub';
	const DONE  = '_agc_scrubbed';
	const AFTER = HOUR_IN_SECONDS;

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! self::on() ) {
			wp_clear_scheduled_hook( self::HOOK );
			return;
		}
		add_action( 'init', array( __CLASS__, 'maybe_login' ), 1 );
		add_action( self::HOOK, array( __CLASS__, 'scrub' ) );
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + 300, 'hourly', self::HOOK );
		}
		add_action( 'personal_options_update', array( __CLASS__, 'no_profile_change' ), 0 );
		add_filter( 'allow_password_reset', array( __CLASS__, 'no_reset' ), 10, 2 );
		add_filter( 'user_has_cap', array( __CLASS__, 'never' ), 99, 4 );
		add_action( 'admin_notices', array( __CLASS__, 'notice' ) );
	}

	/**
	 * Switched on.
	 *
	 * @return bool
	 */
	public static function on() {
		return (bool) agc_get( 'demo_mode' ) && (bool) agc_get( 'demo_public_login' );
	}

	/**
	 * One-tap address.
	 *
	 * @param string $where admin|dian.
	 * @return string
	 */
	public static function login_url( $where ) {
		return add_query_arg( 'agc_demo', 'dian' === $where ? 'dian' : 'admin', home_url( '/' ) );
	}

	/**
	 * What the role may do.
	 *
	 * @return array
	 */
	public static function caps() {
		$caps = array( 'read', 'view_admin_dashboard', 'upload_files', 'view_woocommerce_reports', 'assign_product_terms' );
		foreach ( array( 'shop_order', 'product', 'shop_coupon' ) as $t ) {
			foreach ( array( 'edit_%ss', 'edit_others_%ss', 'edit_published_%ss', 'edit_private_%ss', 'publish_%ss', 'read_private_%ss', 'read_%s', 'edit_%s' ) as $c ) {
				$caps[] = sprintf( $c, $t );
			}
		}
		return array_fill_keys( $caps, true );
	}

	/**
	 * The role and the account (made when first needed).
	 *
	 * @return int User ID.
	 */
	public static function user() {
		$role = get_role( self::ROLE );
		if ( ! $role || array_diff_key( self::caps(), $role->capabilities ) ) {
			remove_role( self::ROLE );
			add_role( self::ROLE, __( 'Demo visitor', 'agency-core' ), self::caps() );
		}
		$u = get_user_by( 'login', self::USER );
		if ( ! $u ) {
			$id = wp_insert_user(
				array(
					'user_login'   => self::USER,
					'user_pass'    => wp_generate_password( 32, true, true ),
					'user_email'   => 'demo@' . wp_parse_url( home_url(), PHP_URL_HOST ),
					'display_name' => __( 'Demo visitor', 'agency-core' ),
					'first_name'   => __( 'Demo', 'agency-core' ),
					'role'         => self::ROLE,
				)
			);
			return is_wp_error( $id ) ? 0 : (int) $id;
		}
		if ( ! in_array( self::ROLE, (array) $u->roles, true ) ) {
			$u->set_role( self::ROLE );
		}
		return (int) $u->ID;
	}

	/**
	 * ?agc_demo=admin|dian → logged in as the demo account, then to WordPress admin or the shop dashboard.
	 */
	public static function maybe_login() {
		if ( ! isset( $_GET['agc_demo'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- logs into the shared demo account only.
			return;
		}
		$where = 'dian' === sanitize_key( wp_unslash( $_GET['agc_demo'] ) ) ? 'dian' : 'admin'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$cur   = wp_get_current_user();
		if ( ! $cur->exists() || in_array( self::ROLE, (array) $cur->roles, true ) ) { // never swaps a real person's login.
			$id = self::user();
			if ( $id ) {
				wp_set_current_user( $id );
				wp_set_auth_cookie( $id, false, is_ssl() );
			}
		}
		nocache_headers();
		$hash = isset( $_GET['hash'] ) && preg_match( '#^/[a-z0-9/-]*$#', (string) wp_unslash( $_GET['hash'] ) ) ? '#' . wp_unslash( $_GET['hash'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput
		wp_safe_redirect( 'dian' === $where ? home_url( '/dian/' ) . $hash : admin_url( class_exists( 'Automattic\WooCommerce\Utilities\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled() ? 'admin.php?page=wc-orders' : 'edit.php?post_type=shop_order' ) );
		exit;
	}

	/**
	 * The demo account is shared: no password or email change.
	 *
	 * @param int $user_id User.
	 */
	public static function no_profile_change( $user_id ) {
		$u = get_userdata( $user_id );
		if ( $u && self::USER === $u->user_login ) {
			wp_safe_redirect( admin_url( 'profile.php' ) );
			exit;
		}
	}

	/**
	 * No password reset for the demo account.
	 *
	 * @param bool $allow   Allow.
	 * @param int  $user_id User.
	 * @return bool
	 */
	public static function no_reset( $allow, $user_id ) {
		$u = get_userdata( $user_id );
		return $u && self::USER === $u->user_login ? false : $allow;
	}

	/**
	 * Whatever another plugin hands out, the demo account never gets these.
	 *
	 * @param array   $all  Caps the user has.
	 * @param array   $caps Required primitive caps.
	 * @param array   $args Request.
	 * @param WP_User $user User.
	 * @return array
	 */
	public static function never( $all, $caps, $args, $user ) {
		if ( ! $user || ! in_array( self::ROLE, (array) $user->roles, true ) ) {
			return $all;
		}
		foreach ( array( 'manage_options', 'manage_woocommerce', 'unfiltered_html', 'edit_users', 'create_users', 'delete_users', 'promote_users', 'list_users', 'install_plugins', 'activate_plugins', 'edit_plugins', 'edit_themes', 'switch_themes', 'edit_theme_options', 'export', 'import', 'delete_posts', 'delete_products', 'delete_shop_orders', 'delete_shop_coupons', 'delete_others_products', 'delete_published_products', 'delete_others_shop_orders', 'delete_published_shop_coupons' ) as $c ) {
			$all[ $c ] = false;
		}
		return $all;
	}

	/**
	 * A line at the top of WordPress admin.
	 */
	public static function notice() {
		$u = wp_get_current_user();
		if ( ! $u->exists() || ! in_array( self::ROLE, (array) $u->roles, true ) ) {
			return;
		}
		echo '<div class="notice notice-info"><p>' . esc_html__( 'Demo back office: this is the real WordPress + WooCommerce behind the demo website. Look around and change things; settings, plugins and users are locked, and everything is put back every night.', 'agency-core' ) . ' <a href="' . esc_url( home_url( '/' ) ) . '">' . esc_html__( 'Back to the website', 'agency-core' ) . '</a> · <a href="' . esc_url( home_url( '/dian/' ) ) . '">' . esc_html__( 'Shop dashboard (phone)', 'agency-core' ) . '</a></p></div>';
	}

	/**
	 * Hide visitors' personal details after an hour.
	 */
	public static function scrub() {
		$before = time() - self::AFTER;
		$hide   = static function ( $s, $keep = 1 ) {
			$s = trim( (string) $s );
			return '' === $s ? '' : mb_substr( $s, 0, $keep ) . '•••';
		};
		$phone  = static fn( $p ) => '' === trim( (string) $p ) ? '' : '•••• ' . substr( preg_replace( '/\D/', '', (string) $p ), -3 );
		foreach ( wc_get_orders(
			array(
				'limit'        => 200,
				'date_created' => '<' . $before,
				'meta_query'   => array( // phpcs:ignore WordPress.DB.SlowDBQuery
					'relation' => 'AND',
					array(
						'key'     => self::DONE,
						'compare' => 'NOT EXISTS',
					),
					array( // the demo's own made-up sample order (DD-2041): customers track it, nobody's real details
						'key'     => AGC_Site::REF,
						'compare' => 'NOT EXISTS',
					),
				),
			)
		) as $o ) {
			if ( $o->get_meta( self::DONE ) || $o->get_meta( AGC_Site::REF ) ) {
				continue; // classic order storage ignores the meta query above: check here too
			}
			$o->set_billing_first_name( $hide( $o->get_billing_first_name() ) );
			$o->set_billing_last_name( '' );
			$o->set_billing_phone( $phone( $o->get_billing_phone() ) );
			$o->set_billing_email( '' );
			$o->set_billing_address_1( $o->get_billing_address_1() ? '•••' : '' );
			$o->set_billing_address_2( '' );
			$o->set_shipping_first_name( $hide( $o->get_shipping_first_name() ) );
			$o->set_shipping_last_name( '' );
			$o->set_shipping_phone( $phone( $o->get_shipping_phone() ) );
			$o->set_shipping_address_1( $o->get_shipping_address_1() ? '•••' : '' );
			$o->set_shipping_address_2( '' );
			$o->update_meta_data( self::DONE, time() );
			$o->save();
		}
		foreach ( array( AGC_Site::BOOKING, AGC_Site::ENQUIRY ) as $t ) {
			$q = new WP_Query(
				array(
					'post_type'      => $t,
					'post_status'    => 'any',
					'posts_per_page' => 200,
					'fields'         => 'ids',
					'no_found_rows'  => true,
					'date_query'     => array( array( 'before' => gmdate( 'Y-m-d H:i:s', $before ), 'column' => 'post_date_gmt' ) ),
					'meta_query'     => array( array( 'key' => self::DONE, 'compare' => 'NOT EXISTS' ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
				)
			);
			foreach ( $q->posts as $id ) {
				$name = (string) get_post_meta( $id, '_name', true );
				update_post_meta( $id, '_name', $hide( $name ) );
				update_post_meta( $id, '_phone', $phone( get_post_meta( $id, '_phone', true ) ) );
				update_post_meta( $id, '_email', '' );
				update_post_meta( $id, self::DONE, time() );
				$title = (string) get_the_title( $id );
				if ( '' !== $name && false !== strpos( $title, $name ) ) {
					wp_update_post(
						array(
							'ID'         => $id,
							'post_title' => str_replace( $name, $hide( $name ), $title ),
						)
					);
				}
			}
		}
	}
}
