<?php
/**
 * 删除所有产品、变体、产品分类（换成另一个品牌的产品之前用）。只在样板站 / preview 用！
 *
 * @package AgencyScripts
 */
if ( ! class_exists( 'WooCommerce' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}
$n = 0;
foreach ( get_posts( array( 'post_type' => array( 'product', 'product_variation' ), 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) ) as $id ) {
	$thumb = get_post_thumbnail_id( $id );
	wp_delete_post( $id, true );
	if ( $thumb && get_post_meta( $thumb, '_agc_key', true ) ) {
		wp_delete_attachment( $thumb, true );
	}
	++$n;
}
foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => false ) ) as $t ) {
	if ( (int) get_option( 'default_product_cat' ) !== (int) $t->term_id ) {
		wp_delete_term( $t->term_id, 'product_cat' );
	}
}
// 也删掉旧的首页主图（新品牌会上传自己的）.
foreach ( get_posts( array( 'post_type' => 'attachment', 'meta_key' => '_agc_key', 'numberposts' => -1, 'fields' => 'ids' ) ) as $a ) { // phpcs:ignore WordPress.DB.SlowDBQuery
	wp_delete_attachment( $a, true );
}
wc_delete_product_transients();
WP_CLI::success( "Deleted $n products/variations and old categories." );
