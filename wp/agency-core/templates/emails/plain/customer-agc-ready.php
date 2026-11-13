<?php
/**
 * "Your order is ready" (plain text).
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

echo '= ' . esc_html( wp_strip_all_tags( $email_heading ) ) . " =\n\n";
/* translators: %s: customer first name */
echo esc_html( sprintf( __( 'Hi %s,', 'agency-core' ), $order->get_billing_first_name() ) ) . "\n\n";
echo 'collect' === $order->get_meta( AGC_Festive::MODE ) ? esc_html__( 'Your order is ready for collection. Please show this email or your order number when you come.', 'agency-core' ) : esc_html__( 'Your order is on its way to you.', 'agency-core' );
echo "\n\n";
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );
if ( $additional_content ) {
	echo esc_html( wp_strip_all_tags( wptexturize( $additional_content ) ) ) . "\n\n";
}
echo wp_kses_post( apply_filters( 'woocommerce_email_footer_text', get_option( 'woocommerce_email_footer_text' ) ) );
