<?php
/**
 * Payment receipts for DuitNow QR / bank transfer orders (2026-11-13).
 *
 * The customer uploads a screenshot or PDF on the "order received" page (or the order tracking page).
 * Files are kept OUTSIDE the public web folder (/var/www/<site>/private/receipts by default), with a
 * random name; only shop staff can open them, through a nonce-protected admin link.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Receipts.
 */
class AGC_Receipts {

	const META     = '_agc_receipt';
	const MAX_SIZE = 5242880; // 5 MB.

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_post_agc_receipt', array( __CLASS__, 'upload' ) );
		add_action( 'admin_post_nopriv_agc_receipt', array( __CLASS__, 'upload' ) );
		add_action( 'admin_post_agc_receipt_view', array( __CLASS__, 'view' ) );
	}

	/**
	 * Allowed file types.
	 *
	 * @return array
	 */
	private static function mimes() {
		return array(
			'jpg|jpeg' => 'image/jpeg',
			'png'      => 'image/png',
			'webp'     => 'image/webp',
			'pdf'      => 'application/pdf',
		);
	}

	/**
	 * Folder for receipts (created on first use).
	 *
	 * @return string
	 */
	public static function dir() {
		$base = defined( 'AGC_PRIVATE_DIR' ) ? AGC_PRIVATE_DIR : dirname( untrailingslashit( ABSPATH ) ) . '/private';
		if ( ! is_dir( $base ) ) {
			wp_mkdir_p( $base );
		}
		if ( ! is_dir( $base ) || ! wp_is_writable( $base ) ) {
			// Fallback inside uploads: random file names + deny rules.
			$up   = wp_upload_dir();
			$base = $up['basedir'] . '/agc-private';
			wp_mkdir_p( $base );
			if ( ! file_exists( $base . '/index.php' ) ) {
				file_put_contents( $base . '/index.php', "<?php\n// Silence.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
				file_put_contents( $base . '/.htaccess', "Deny from all\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			}
		}
		$dir = $base . '/receipts';
		wp_mkdir_p( $dir );
		return $dir;
	}

	/**
	 * Can this order still take a receipt?
	 *
	 * @param WC_Order $order Order.
	 * @return bool
	 */
	public static function wants_receipt( $order ) {
		return $order instanceof WC_Order && 'agc_duitnow' === $order->get_payment_method() && $order->has_status( array( 'on-hold', 'pending' ) );
	}

	/**
	 * Upload form (or "received" message).
	 *
	 * @param WC_Order $order Order.
	 * @return string
	 */
	public static function form( $order ) {
		if ( ! $order instanceof WC_Order ) {
			return '';
		}
		$h = '<div class="agc-receipt" id="agc-receipt">';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		$msg = isset( $_GET['receipt'] ) ? sanitize_key( wp_unslash( $_GET['receipt'] ) ) : '';
		if ( 'bad' === $msg ) {
			$h .= '<p class="agc-receipt__err" role="alert">' . esc_html__( 'That file could not be used. Please upload a JPG, PNG, WebP or PDF under 5 MB.', 'agency-core' ) . '</p>';
		}
		if ( $order->get_meta( self::META ) ) {
			$h .= '<p class="agc-receipt__ok" role="status">' . esc_html__( 'Receipt received. We will check it and email you when your payment is confirmed.', 'agency-core' ) . '</p>';
			if ( ! self::wants_receipt( $order ) ) {
				return $h . '</div>';
			}
			$h .= '<details><summary>' . esc_html__( 'Upload a different receipt', 'agency-core' ) . '</summary>';
		}
		$h .= '<form method="post" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		$h .= '<label for="agc-receipt-file"><strong>' . esc_html__( 'Upload your payment receipt', 'agency-core' ) . '</strong> <small>' . esc_html__( '(screenshot or PDF, up to 5 MB)', 'agency-core' ) . '</small></label>';
		$h .= '<input id="agc-receipt-file" type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" required>';
		$h .= '<input type="hidden" name="action" value="agc_receipt"><input type="hidden" name="order_id" value="' . esc_attr( (string) $order->get_id() ) . '">';
		$h .= '<input type="hidden" name="key" value="' . esc_attr( $order->get_order_key() ) . '">';
		$h .= wp_nonce_field( 'agc_receipt_' . $order->get_id(), '_agcr', true, false );
		$h .= '<button type="submit" class="button">' . esc_html__( 'Send receipt', 'agency-core' ) . '</button></form>';
		if ( $order->get_meta( self::META ) ) {
			$h .= '</details>';
		}
		return $h . '</div>';
	}

	/**
	 * Save an uploaded receipt.
	 */
	public static function upload() {
		$id    = absint( $_POST['order_id'] ?? 0 );
		$order = $id ? wc_get_order( $id ) : false;
		$key   = sanitize_text_field( wp_unslash( $_POST['key'] ?? '' ) );
		if ( ! $order || ! isset( $_POST['_agcr'] ) || ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_agcr'] ) ), 'agc_receipt_' . $id ) || ! hash_equals( $order->get_order_key(), $key ) ) {
			wp_die( esc_html__( 'This link has expired. Please open your order again.', 'agency-core' ), '', array( 'response' => 403 ) );
		}
		$back = $order->get_checkout_order_received_url();
		$ref  = wp_get_referer();
		if ( $ref && false !== strpos( $ref, (string) wp_parse_url( home_url(), PHP_URL_HOST ) ) ) {
			$back = remove_query_arg( 'receipt', $ref );
		}
		$file = $_FILES['receipt'] ?? null; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$ok   = self::wants_receipt( $order ) && is_array( $file ) && UPLOAD_ERR_OK === (int) $file['error'] && (int) $file['size'] > 0 && (int) $file['size'] <= self::MAX_SIZE && is_uploaded_file( $file['tmp_name'] );
		if ( $ok ) {
			$check = wp_check_filetype_and_ext( $file['tmp_name'], sanitize_file_name( $file['name'] ), self::mimes() );
			$ok    = ! empty( $check['ext'] ) && ! empty( $check['type'] );
		}
		if ( ! $ok ) {
			wp_safe_redirect( add_query_arg( 'receipt', 'bad', $back ) . '#agc-receipt' );
			exit;
		}
		$name = bin2hex( random_bytes( 16 ) ) . '.' . $check['ext'];
		$dest = self::dir() . '/' . $name;
		if ( ! move_uploaded_file( $file['tmp_name'], $dest ) ) { // phpcs:ignore Generic.PHP.ForbiddenFunctions
			wp_safe_redirect( add_query_arg( 'receipt', 'bad', $back ) . '#agc-receipt' );
			exit;
		}
		chmod( $dest, 0640 ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$old = (string) $order->get_meta( self::META );
		if ( $old && file_exists( self::dir() . '/' . basename( $old ) ) ) {
			wp_delete_file( self::dir() . '/' . basename( $old ) );
		}
		$order->update_meta_data( self::META, $name );
		$order->add_order_note( __( 'The customer uploaded a payment receipt. Check it, then mark the order "Processing" (payment received).', 'agency-core' ) );
		$order->save();
		self::tell_shop( $order );
		wp_safe_redirect( add_query_arg( 'receipt', 'ok', $back ) . '#agc-receipt' );
		exit;
	}

	/**
	 * Short email to the shop.
	 *
	 * @param WC_Order $order Order.
	 */
	private static function tell_shop( $order ) {
		$to = get_option( 'woocommerce_new_order_settings' );
		$to = is_array( $to ) && ! empty( $to['recipient'] ) ? $to['recipient'] : get_option( 'admin_email' );
		/* translators: 1: order number, 2: shop name */
		$subject = sprintf( __( 'Payment receipt for order #%1$s – %2$s', 'agency-core' ), $order->get_order_number(), get_bloginfo( 'name' ) );
		/* translators: 1: customer name, 2: amount */
		$body = sprintf( __( '%1$s uploaded a payment receipt for %2$s.', 'agency-core' ), $order->get_formatted_billing_full_name(), html_entity_decode( wp_strip_all_tags( wc_price( $order->get_total() ) ) ) ) . "\n\n"
			. __( 'Check it in your bank app, then press "Payment received":', 'agency-core' ) . "\n" . admin_url( 'admin.php?page=agc-festive' ) . "\n";
		wp_mail( $to, $subject, $body );
	}

	/**
	 * Staff link to open a receipt.
	 *
	 * @param WC_Order $order Order.
	 * @return string
	 */
	public static function url( $order ) {
		return wp_nonce_url( admin_url( 'admin-post.php?action=agc_receipt_view&order_id=' . $order->get_id() ), 'agc_receipt_view_' . $order->get_id() );
	}

	/**
	 * Stream a receipt to shop staff.
	 */
	public static function view() {
		$id = absint( $_GET['order_id'] ?? 0 );
		if ( ! current_user_can( 'edit_shop_orders' ) || ! check_admin_referer( 'agc_receipt_view_' . $id ) ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		$order = wc_get_order( $id );
		$name  = $order ? basename( (string) $order->get_meta( self::META ) ) : '';
		$path  = $name ? self::dir() . '/' . $name : '';
		if ( ! $path || ! is_file( $path ) ) {
			wp_die( esc_html__( 'Receipt not found.', 'agency-core' ), '', array( 'response' => 404 ) );
		}
		$type = wp_check_filetype( $name, self::mimes() );
		nocache_headers();
		header( 'Content-Type: ' . ( $type['type'] ? $type['type'] : 'application/octet-stream' ) );
		header( 'Content-Disposition: inline; filename="receipt-' . $order->get_order_number() . '.' . $type['ext'] . '"' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Content-Length: ' . filesize( $path ) );
		readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		exit;
	}
}
