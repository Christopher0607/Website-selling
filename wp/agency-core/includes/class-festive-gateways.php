<?php
/**
 * Payment methods added by agency-core (2026-11-13). Loaded only when WooCommerce is active.
 *
 * - DuitNow QR (manual): shows the shop's own DuitNow QR and the amount; the order waits "on hold"
 *   until the customer uploads a receipt and the shop presses "Payment received". Works from day one,
 *   before the shop's payment gateway account is approved.
 * - Demo online payment: ONLY in demo mode with test orders allowed. Marks the order paid without
 *   charging anything, so a prospect can see the whole flow (emails, statuses, the owner's page).
 *
 * Real online payment (FPX, cards, e-wallets) = the gateway plugin of the shop's own account
 * (installed when the client opens it).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * DuitNow QR (manual).
 */
class AGC_Gateway_DuitNow extends WC_Payment_Gateway {

	/**
	 * Set up.
	 */
	public function __construct() {
		$this->id                 = 'agc_duitnow';
		$this->has_fields         = false;
		$this->method_title       = __( 'DuitNow QR (manual)', 'agency-core' );
		$this->method_description = __( 'Shows your DuitNow QR and the amount. The order waits on hold until the customer uploads the receipt and you press "Payment received".', 'agency-core' );
		$this->supports           = array( 'products' );
		$this->init_form_fields();
		$this->init_settings();
		$this->title        = $this->get_option( 'title' );
		$this->description  = $this->get_option( 'description' );
		$this->instructions = $this->get_option( 'instructions' );
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		add_action( 'woocommerce_thankyou_' . $this->id, array( $this, 'thankyou_page' ) );
		add_action( 'woocommerce_email_before_order_table', array( $this, 'email_instructions' ), 10, 3 );
	}

	/**
	 * Settings.
	 */
	public function init_form_fields() {
		$this->form_fields = array(
			'enabled'      => array(
				'title'   => __( 'Enable', 'agency-core' ),
				'type'    => 'checkbox',
				'label'   => __( 'Accept DuitNow QR payments', 'agency-core' ),
				'default' => 'no',
			),
			'title'        => array(
				'title'   => __( 'Title', 'agency-core' ),
				'type'    => 'text',
				'default' => __( 'DuitNow QR (any banking or e-wallet app)', 'agency-core' ),
			),
			'description'  => array(
				'title'   => __( 'Description', 'agency-core' ),
				'type'    => 'textarea',
				'default' => __( 'After you place the order you will see our DuitNow QR and the amount. Pay with any banking or e-wallet app, then upload the receipt.', 'agency-core' ),
			),
			'qr'           => array(
				'title'       => __( 'DuitNow QR image (URL)', 'agency-core' ),
				'type'        => 'text',
				'description' => __( 'Upload your shop\'s DuitNow QR to Media, copy its URL here.', 'agency-core' ),
				'default'     => '',
			),
			'account'      => array(
				'title'   => __( 'Account name shown under the QR', 'agency-core' ),
				'type'    => 'text',
				'default' => '',
			),
			'instructions' => array(
				'title'   => __( 'Extra note', 'agency-core' ),
				'type'    => 'textarea',
				'default' => __( 'We confirm payments within the same day (9am–9pm).', 'agency-core' ),
			),
		);
	}

	/**
	 * QR image URL (a clearly marked sample in demo mode).
	 *
	 * @return string
	 */
	public function qr_url() {
		$qr = trim( (string) $this->get_option( 'qr' ) );
		if ( ! $qr && agc_get( 'demo_mode' ) ) {
			$qr = AGC_URL . 'assets/img/duitnow-demo.svg';
		}
		return $qr;
	}

	/**
	 * Only offered when there is a QR to show.
	 *
	 * @return bool
	 */
	public function is_available() {
		return parent::is_available() && '' !== $this->qr_url();
	}

	/**
	 * Place the order: on hold until the payment is checked.
	 *
	 * @param int $order_id Order ID.
	 * @return array
	 */
	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		$order->update_status( 'on-hold', __( 'Waiting for the DuitNow payment and receipt.', 'agency-core' ) );
		WC()->cart->empty_cart();
		return array(
			'result'   => 'success',
			'redirect' => $this->get_return_url( $order ),
		);
	}

	/**
	 * QR, amount, reference and the receipt upload.
	 *
	 * @param WC_Order $order Order.
	 * @return string
	 */
	public function pay_box( $order ) {
		$h  = '<section class="agc-pay" aria-labelledby="agc-pay-h">';
		$h .= '<h2 id="agc-pay-h">' . esc_html__( 'Pay by DuitNow QR', 'agency-core' ) . '</h2>';
		$h .= '<div class="agc-pay__in"><figure class="agc-pay__qr"><img src="' . esc_url( $this->qr_url() ) . '" alt="' . esc_attr__( 'DuitNow QR', 'agency-core' ) . '" width="220" height="220">';
		if ( $this->get_option( 'account' ) ) {
			$h .= '<figcaption>' . esc_html( $this->get_option( 'account' ) ) . '</figcaption>';
		}
		$h .= '</figure><ol class="agc-pay__steps">';
		$h .= '<li>' . esc_html__( 'Scan the QR with your banking or e-wallet app (or save it and choose it from your photos).', 'agency-core' ) . '</li>';
		/* translators: 1: amount, 2: order number */
		$h .= '<li>' . wp_kses_post( sprintf( __( 'Pay <strong>%1$s</strong>, reference <strong>%2$s</strong>.', 'agency-core' ), wc_price( $order->get_total() ), esc_html( $order->get_order_number() ) ) ) . '</li>';
		$h .= '<li>' . esc_html__( 'Upload the receipt below. We will email you when the payment is confirmed.', 'agency-core' ) . '</li></ol></div>';
		if ( $this->instructions ) {
			$h .= '<p class="agc-pay__note">' . esc_html( $this->instructions ) . '</p>';
		}
		return $h . AGC_Receipts::form( $order ) . '</section>';
	}

	/**
	 * Thank-you page.
	 *
	 * @param int $order_id Order ID.
	 */
	public function thankyou_page( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( $order && $order->has_status( array( 'on-hold', 'pending' ) ) ) {
			echo $this->pay_box( $order ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside.
		}
	}

	/**
	 * "How to pay" in the on-hold email.
	 *
	 * @param WC_Order $order         Order.
	 * @param bool     $sent_to_admin To admin.
	 * @param bool     $plain_text    Plain text.
	 */
	public function email_instructions( $order, $sent_to_admin, $plain_text = false ) {
		if ( $sent_to_admin || ! $order instanceof WC_Order || $this->id !== $order->get_payment_method() || ! $order->has_status( 'on-hold' ) ) {
			return;
		}
		$link = $order->get_checkout_order_received_url() . '#agc-receipt';
		/* translators: 1: amount, 2: order number */
		$line = sprintf( __( 'Pay %1$s by DuitNow QR, reference %2$s, then upload the receipt here:', 'agency-core' ), html_entity_decode( wp_strip_all_tags( wc_price( $order->get_total() ) ) ), $order->get_order_number() );
		if ( $plain_text ) {
			echo esc_html( $line ) . "\n" . esc_url_raw( $link ) . "\n\n";
			return;
		}
		echo '<p style="margin:0 0 8px">' . esc_html( $line ) . '</p>';
		echo '<p style="margin:0 0 16px"><a href="' . esc_url( $link ) . '">' . esc_html__( 'Upload my receipt', 'agency-core' ) . '</a></p>';
		echo '<p style="margin:0 0 16px"><img src="' . esc_url( $this->qr_url() ) . '" alt="' . esc_attr__( 'DuitNow QR', 'agency-core' ) . '" width="180" height="180"></p>';
	}
}

/**
 * Demo online payment (demo mode with test orders only; nothing is charged).
 */
class AGC_Gateway_Demo_Pay extends WC_Payment_Gateway {

	/**
	 * Set up.
	 */
	public function __construct() {
		$this->id                 = 'agc_demo_pay';
		$this->has_fields         = false;
		$this->method_title       = __( 'Demo online payment (nothing is charged)', 'agency-core' );
		$this->method_description = __( 'Only appears in demo mode with test orders allowed. The order is marked paid without charging anything.', 'agency-core' );
		$this->supports           = array( 'products' );
		$this->init_form_fields();
		$this->init_settings();
		$this->title       = $this->get_option( 'title' );
		$this->description = $this->get_option( 'description' );
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	/**
	 * Settings.
	 */
	public function init_form_fields() {
		$this->form_fields = array(
			'enabled'     => array(
				'title'   => __( 'Enable', 'agency-core' ),
				'type'    => 'checkbox',
				'label'   => __( 'Offer in demo mode', 'agency-core' ),
				'default' => 'yes',
			),
			'title'       => array(
				'title'   => __( 'Title', 'agency-core' ),
				'type'    => 'text',
				'default' => __( 'Online banking (FPX), card or e-wallet', 'agency-core' ),
			),
			'description' => array(
				'title'   => __( 'Description', 'agency-core' ),
				'type'    => 'textarea',
				'default' => __( 'Demo store: the order is marked paid and nothing is charged. A real shop connects its own payment gateway here.', 'agency-core' ),
			),
		);
	}

	/**
	 * Demo mode with test orders only.
	 *
	 * @return bool
	 */
	public function is_available() {
		return agc_get( 'demo_mode' ) && agc_get( 'demo_test_orders' ) && parent::is_available();
	}

	/**
	 * Mark paid, charge nothing.
	 *
	 * @param int $order_id Order ID.
	 * @return array
	 */
	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		$order->add_order_note( __( 'Demo payment: nothing was charged.', 'agency-core' ) );
		$order->payment_complete();
		WC()->cart->empty_cart();
		return array(
			'result'   => 'success',
			'redirect' => $this->get_return_url( $order ),
		);
	}
}
