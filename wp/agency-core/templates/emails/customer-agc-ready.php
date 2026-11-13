<?php
/**
 * "Your order is ready" (HTML). Variables: $order, $email_heading, $additional_content, $sent_to_admin, $plain_text, $email.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

do_action( 'woocommerce_email_header', $email_heading, $email );

$agc_collect = 'collect' === $order->get_meta( AGC_Festive::MODE );
?>
<?php /* translators: %s: customer first name */ ?>
<p><?php printf( esc_html__( 'Hi %s,', 'agency-core' ), esc_html( $order->get_billing_first_name() ) ); ?></p>
<p><?php echo $agc_collect ? esc_html__( 'Your order is ready for collection. Please show this email or your order number when you come.', 'agency-core' ) : esc_html__( 'Your order is on its way to you.', 'agency-core' ); ?></p>
<?php
do_action( 'woocommerce_email_order_details', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_order_meta', $order, $sent_to_admin, $plain_text, $email );
do_action( 'woocommerce_email_customer_details', $order, $sent_to_admin, $plain_text, $email );
if ( $additional_content ) {
	echo wp_kses_post( wpautop( wptexturize( $additional_content ) ) );
}
do_action( 'woocommerce_email_footer', $email );
