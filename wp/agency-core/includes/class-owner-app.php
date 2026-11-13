<?php
/**
 * Owner dashboard page (2026-11-13): a modern, phone-first shop dashboard at /dian/ (and /owner/).
 *
 * - Its own page (no theme, no WordPress admin bar), its own login screen.
 * - Shop managers land here after logging in; administrators keep wp-admin and get a link in the admin bar.
 * - Can be added to the phone's home screen (web app manifest).
 * - All data goes through AGC_Owner_API (REST, cookie login + nonce).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owner app.
 */
class AGC_Owner_App {

	const SLUG    = 'dian';
	const REWRITE = '2';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'rewrite' ) );
		add_filter( 'query_vars', static fn( $v ) => array_merge( $v, array( 'agc_owner' ) ) );
		add_action( 'template_redirect', array( __CLASS__, 'serve' ), 0 );
		add_action( 'admin_post_nopriv_agc_owner_login', array( __CLASS__, 'login' ) );
		add_action( 'admin_post_agc_owner_login', array( __CLASS__, 'login' ) );
		add_filter( 'login_redirect', array( __CLASS__, 'login_redirect' ), 20, 3 );
		add_action( 'admin_bar_menu', array( __CLASS__, 'admin_bar' ), 80 );
	}

	/**
	 * Dashboard URL.
	 *
	 * @param string $hash Optional #/screen.
	 * @return string
	 */
	public static function url( $hash = '' ) {
		return home_url( '/' . self::SLUG . '/' ) . $hash;
	}

	/**
	 * /dian/, /owner/ and the manifest.
	 */
	public static function rewrite() {
		add_rewrite_rule( '^(?:' . self::SLUG . '|owner)/?$', 'index.php?agc_owner=app', 'top' );
		add_rewrite_rule( '^(?:' . self::SLUG . '|owner)/manifest\.webmanifest$', 'index.php?agc_owner=manifest', 'top' );
		if ( get_option( 'agc_owner_rewrite' ) !== self::REWRITE ) {
			flush_rewrite_rules( false );
			update_option( 'agc_owner_rewrite', self::REWRITE, false );
		}
	}

	/**
	 * Can this user use the dashboard?
	 *
	 * @return bool
	 */
	public static function allowed() {
		return is_user_logged_in() && current_user_can( 'edit_shop_orders' );
	}

	/**
	 * Shop managers go to the new dashboard after logging in.
	 *
	 * @param string           $to        Redirect.
	 * @param string           $requested Requested redirect.
	 * @param WP_User|WP_Error $user      User.
	 * @return string
	 */
	public static function login_redirect( $to, $requested, $user ) {
		if ( $user instanceof WP_User && $user->has_cap( 'edit_shop_orders' ) && ! $user->has_cap( 'manage_options' ) && ( ! $requested || false !== strpos( $requested, 'wp-admin' ) ) ) {
			return self::url();
		}
		return $to;
	}

	/**
	 * "店家后台" in the admin bar for administrators.
	 *
	 * @param WP_Admin_Bar $bar Bar.
	 */
	public static function admin_bar( $bar ) {
		if ( current_user_can( 'edit_shop_orders' ) ) {
			$bar->add_node(
				array(
					'id'    => 'agc-owner',
					'title' => esc_html__( 'Shop dashboard', 'agency-core' ),
					'href'  => self::url(),
				)
			);
		}
	}

	/**
	 * Our own login (so errors come back to our screen, not to wp-login.php).
	 */
	public static function login() {
		$back = self::url();
		if ( ! isset( $_POST['_agcl'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_agcl'] ) ), 'agc_owner_login' ) ) {
			wp_safe_redirect( add_query_arg( 'login', 'expired', $back ) );
			exit;
		}
		$user = wp_signon(
			array(
				'user_login'    => sanitize_user( wp_unslash( $_POST['log'] ?? '' ) ),
				'user_password' => (string) wp_unslash( $_POST['pwd'] ?? '' ), // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- passwords are not sanitized.
				'remember'      => ! empty( $_POST['remember'] ),
			),
			is_ssl()
		);
		if ( is_wp_error( $user ) ) {
			wp_safe_redirect( add_query_arg( 'login', 'failed', $back ) );
			exit;
		}
		wp_safe_redirect( $back );
		exit;
	}

	/**
	 * Serve the page or the manifest.
	 */
	public static function serve() {
		$what = get_query_var( 'agc_owner' );
		if ( ! $what ) {
			return;
		}
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow', true );
		if ( 'manifest' === $what ) {
			self::manifest();
		}
		if ( ! self::allowed() ) {
			self::login_page();
		}
		self::app_page();
	}

	/**
	 * Shop name as plain text (WordPress stores & as &amp;).
	 *
	 * @return string
	 */
	private static function site_name() {
		return html_entity_decode( get_bloginfo( 'name' ), ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Accent colour for the dashboard.
	 *
	 * @return string
	 */
	private static function accent() {
		$a = (string) agc_get( 'accent_color' );
		return preg_match( '/^#[0-9a-fA-F]{6}$/', $a ) ? $a : '#8F1418';
	}

	/**
	 * Web app manifest (add to home screen).
	 */
	private static function manifest() {
		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		$icon = get_site_icon_url( 512 );
		$name = self::site_name();
		$data = array(
			'name'             => $name . ' · ' . __( 'Shop dashboard', 'agency-core' ),
			'short_name'       => mb_substr( $name, 0, 12 ),
			'start_url'        => self::url(),
			'scope'            => self::url(),
			'display'          => 'standalone',
			'background_color' => '#fbf7f2',
			'theme_color'      => self::accent(),
			'icons'            => $icon ? array( array( 'src' => $icon, 'sizes' => '512x512', 'type' => 'image/png' ) ) : array( array( 'src' => AGC_URL . 'assets/owner/icon.svg', 'sizes' => 'any', 'type' => 'image/svg+xml' ) ),
		);
		echo wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
		exit;
	}

	/**
	 * Common <head>.
	 *
	 * @param string $title Title.
	 */
	private static function head( $title ) {
		$v = AGC_VERSION . '.' . filemtime( AGC_DIR . 'assets/owner/app.css' );
		?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="<?php echo esc_attr( self::accent() ); ?>">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="<?php echo esc_attr( mb_substr( self::site_name(), 0, 12 ) ); ?>">
<link rel="manifest" href="<?php echo esc_url( self::url( 'manifest.webmanifest' ) ); ?>">
<link rel="apple-touch-icon" href="<?php echo esc_url( get_site_icon_url( 180 ) ? get_site_icon_url( 180 ) : AGC_URL . 'assets/owner/icon.svg' ); ?>">
<title><?php echo esc_html( $title ); ?></title>
<link rel="stylesheet" href="<?php echo esc_url( AGC_URL . 'assets/owner/app.css?v=' . $v ); ?>">
<style>:root{--accent:<?php echo esc_html( self::accent() ); ?>}</style>
</head>
		<?php
	}

	/**
	 * Login screen.
	 */
	private static function login_page() {
		status_header( 200 );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		$msg = isset( $_GET['login'] ) ? sanitize_key( wp_unslash( $_GET['login'] ) ) : '';
		self::head( self::site_name() . ' · ' . __( 'Shop dashboard', 'agency-core' ) );
		?>
<body class="ow-login">
<main class="ow-login__card">
	<p class="ow-login__brand"><?php echo esc_html( self::site_name() ); ?></p>
	<h1><?php esc_html_e( 'Shop dashboard', 'agency-core' ); ?></h1>
	<?php if ( is_user_logged_in() ) : ?>
		<p class="ow-note"><?php esc_html_e( 'This account cannot open the shop dashboard.', 'agency-core' ); ?></p>
		<p><a class="btn btn--ghost btn--block" href="<?php echo esc_url( wp_logout_url( self::url() ) ); ?>"><?php esc_html_e( 'Log out', 'agency-core' ); ?></a></p>
	<?php else : ?>
		<?php if ( 'failed' === $msg ) : ?>
			<p class="ow-alert" role="alert"><?php esc_html_e( 'Wrong username or password. Please try again.', 'agency-core' ); ?></p>
		<?php elseif ( 'expired' === $msg ) : ?>
			<p class="ow-alert" role="alert"><?php esc_html_e( 'The page was open too long. Please log in again.', 'agency-core' ); ?></p>
		<?php endif; ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="ow-form">
			<label><?php esc_html_e( 'Username or email', 'agency-core' ); ?><input name="log" type="text" autocomplete="username" autocapitalize="off" required></label>
			<label><?php esc_html_e( 'Password', 'agency-core' ); ?><input name="pwd" type="password" autocomplete="current-password" required></label>
			<label class="ow-check"><input name="remember" type="checkbox" value="1" checked> <?php esc_html_e( 'Keep me logged in on this phone', 'agency-core' ); ?></label>
			<input type="hidden" name="action" value="agc_owner_login">
			<?php wp_nonce_field( 'agc_owner_login', '_agcl' ); ?>
			<button class="btn btn--block" type="submit"><?php esc_html_e( 'Log in', 'agency-core' ); ?></button>
		</form>
		<p class="ow-login__small"><a href="<?php echo esc_url( wp_lostpassword_url( self::url() ) ); ?>"><?php esc_html_e( 'Forgot password?', 'agency-core' ); ?></a></p>
	<?php endif; ?>
</main>
</body>
</html>
		<?php
		exit;
	}

	/**
	 * The app shell (everything else is drawn by app.js).
	 */
	private static function app_page() {
		status_header( 200 );
		$user = wp_get_current_user();
		$cfg  = array(
			'rest'     => esc_url_raw( rest_url( AGC_Owner_API::NS . '/owner/' ) ),
			'nonce'    => wp_create_nonce( 'wp_rest' ),
			'lang'     => 0 === strpos( get_locale(), 'zh' ) ? 'zh' : 'en',
			'tz'       => wp_timezone_string(),
			'site'     => self::site_name(),
			'shop'     => home_url( '/' ),
			'admin'    => admin_url(),
			'orders'   => admin_url( 'edit.php?post_type=shop_order' ),
			'logout'   => wp_logout_url( self::url() ),
			'user'     => $user->display_name,
			'currency' => html_entity_decode( get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8' ),
			'can'      => array(
				'products' => current_user_can( 'edit_products' ),
				'settings' => current_user_can( 'manage_woocommerce' ),
				'admin'    => current_user_can( 'manage_options' ),
			),
			'demo'     => (bool) agc_get( 'demo_mode' ),
			'manual'   => (bool) agc_get( 'owner_manual_orders' ),
		);
		$v = AGC_VERSION . '.' . filemtime( AGC_DIR . 'assets/owner/app.js' );
		self::head( self::site_name() . ' · ' . __( 'Shop dashboard', 'agency-core' ) );
		?>
<body class="ow">
<div id="app" class="ow-app" aria-live="polite"><p class="ow-boot"><?php esc_html_e( 'Loading…', 'agency-core' ); ?></p></div>
<noscript><p class="ow-note"><?php esc_html_e( 'Please turn on JavaScript to use the shop dashboard.', 'agency-core' ); ?></p></noscript>
<script>window.AGC_OWNER = <?php echo wp_json_encode( $cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ); ?>;</script>
<script src="<?php echo esc_url( AGC_URL . 'assets/owner/app.js?v=' . $v ); ?>"></script>
</body>
</html>
		<?php
		exit;
	}
}
