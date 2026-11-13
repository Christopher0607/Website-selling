<?php
/**
 * "Your order is ready" email (order status Ready: ready for collection / on its way).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ready email.
 */
class AGC_Email_Ready extends WC_Email {

	/**
	 * Set up.
	 */
	public function __construct() {
		$this->id             = 'customer_agc_ready';
		$this->customer_email = true;
		$this->title          = __( 'Order ready', 'agency-core' );
		$this->description    = __( 'Sent to the customer when you mark an order "Ready" (ready for collection, or out for delivery).', 'agency-core' );
		$this->template_html  = 'emails/customer-agc-ready.php';
		$this->template_plain = 'emails/plain/customer-agc-ready.php';
		$this->template_base  = AGC_DIR . 'templates/';
		$this->placeholders   = array(
			'{order_date}'   => '',
			'{order_number}' => '',
		);
		add_action( 'woocommerce_order_status_' . AGC_Festive::STATUS . '_notification', array( $this, 'trigger' ), 10, 2 );
		parent::__construct();
	}

	/**
	 * Subject.
	 *
	 * @return string
	 */
	public function get_default_subject() {
		return __( 'Your {site_title} order #{order_number} is ready', 'agency-core' );
	}

	/**
	 * Heading.
	 *
	 * @return string
	 */
	public function get_default_heading() {
		return __( 'Your order is ready', 'agency-core' );
	}

	/**
	 * Extra text under the order.
	 *
	 * @return string
	 */
	public function get_default_additional_content() {
		return __( 'Thank you, and happy celebrating!', 'agency-core' );
	}

	/**
	 * Send.
	 *
	 * @param int           $order_id Order ID.
	 * @param WC_Order|bool $order    Order.
	 */
	public function trigger( $order_id, $order = false ) {
		$this->setup_locale();
		if ( $order_id && ! is_a( $order, 'WC_Order' ) ) {
			$order = wc_get_order( $order_id );
		}
		if ( is_a( $order, 'WC_Order' ) ) {
			$this->object                         = $order;
			$this->recipient                      = $order->get_billing_email();
			$this->placeholders['{order_date}']   = wc_format_datetime( $order->get_date_created() );
			$this->placeholders['{order_number}'] = $order->get_order_number();
		}
		if ( $this->is_enabled() && $this->get_recipient() ) {
			$this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );
		}
		$this->restore_locale();
	}

	/**
	 * HTML body.
	 *
	 * @return string
	 */
	public function get_content_html() {
		return wc_get_template_html(
			$this->template_html,
			array(
				'order'              => $this->object,
				'email_heading'      => $this->get_heading(),
				'additional_content' => $this->get_additional_content(),
				'sent_to_admin'      => false,
				'plain_text'         => false,
				'email'              => $this,
			),
			'',
			$this->template_base
		);
	}

	/**
	 * Plain body.
	 *
	 * @return string
	 */
	public function get_content_plain() {
		return wc_get_template_html(
			$this->template_plain,
			array(
				'order'              => $this->object,
				'email_heading'      => $this->get_heading(),
				'additional_content' => $this->get_additional_content(),
				'sent_to_admin'      => false,
				'plain_text'         => true,
				'email'              => $this,
			),
			'',
			$this->template_base
		);
	}
}
