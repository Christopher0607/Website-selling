<?php
/**
 * 用 CSV 导入 / 更新产品（以 SKU 判断，可以重复执行）
 * 用法：wp eval-file import-products.php <products.csv> [图片文件夹]
 *
 * CSV 栏位（第一行是标题）：
 *   sku, type (simple|variable|variation), parent_sku, name, category, price, sale_price,
 *   stock, weight_kg, featured (1/0), short_description, description, image, attributes
 *
 *   - variable：attributes 写所有选项，例如  Size:30ml|50ml
 *   - variation：parent_sku 填母产品的 SKU，attributes 写这一款的值，例如  Size:30ml
 *   - category 可以用 > 表示子分类，例如  Skincare > Serum
 *   - image 是图片文件名（在图片文件夹里），多张用 | 分开，第一张是主图
 *
 * Shopee 卖家中心导出的资料可以先转成这个格式（见 docs/06-delivery-sop.md）。
 *
 * @package AgencyScripts
 */

if ( ! class_exists( 'WooCommerce' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}
$csv     = $args[0] ?? '';
$img_dir = rtrim( $args[1] ?? dirname( $csv ) . '/images', '/' );
if ( ! is_readable( $csv ) ) {
	WP_CLI::error( "Cannot read $csv" );
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

$fh     = fopen( $csv, 'r' ); // phpcs:ignore WordPress.WP.AlternativeFunctions
$header = array_map( 'trim', fgetcsv( $fh, 0, ',', '"', '' ) );
$rows   = array();
while ( ( $r = fgetcsv( $fh, 0, ',', '"', '' ) ) !== false ) {
	if ( count( array_filter( $r, 'strlen' ) ) === 0 ) {
		continue;
	}
	$rows[] = array_combine( $header, array_pad( $r, count( $header ), '' ) );
}
fclose( $fh ); // phpcs:ignore WordPress.WP.AlternativeFunctions

/** Category path → term IDs. */
function agc_cat_ids( $path ) {
	$ids    = array();
	foreach ( array_filter( array_map( 'trim', explode( ',', $path ) ) ) as $one ) {
		$parent = 0;
		foreach ( array_map( 'trim', explode( '>', $one ) ) as $name ) {
			$term = term_exists( $name, 'product_cat', $parent );
			if ( ! $term ) {
				$term = wp_insert_term( $name, 'product_cat', array( 'parent' => $parent ) );
			}
			$parent = (int) ( is_array( $term ) ? $term['term_id'] : $term );
		}
		$ids[] = $parent;
	}
	return $ids;
}

/** Image file → attachment ID (re-uses an existing attachment with the same file key). */
function agc_image_id( $file, $dir, $alt ) {
	$file = trim( $file );
	if ( '' === $file ) {
		return 0;
	}
	$key   = 'product:' . $file;
	$found = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'meta_key' => '_agc_key', 'meta_value' => $key, 'numberposts' => 1, 'fields' => 'ids' ) ); // phpcs:ignore WordPress.DB.SlowDBQuery
	if ( $found ) {
		return (int) $found[0];
	}
	$path = "$dir/$file";
	if ( ! is_readable( $path ) ) {
		WP_CLI::warning( "Image not found: $path" );
		return 0;
	}
	$tmp = wp_tempnam( $file );
	copy( $path, $tmp );
	$id = media_handle_sideload( array( 'name' => $file, 'tmp_name' => $tmp ), 0 );
	if ( is_wp_error( $id ) ) {
		WP_CLI::warning( "$file: " . $id->get_error_message() );
		return 0;
	}
	update_post_meta( $id, '_agc_key', $key );
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	return (int) $id;
}

/** "Size:30ml|50ml; Colour:Red" → [ 'Size' => ['30ml','50ml'], ... ] */
function agc_parse_attrs( $s ) {
	$out = array();
	foreach ( array_filter( array_map( 'trim', explode( ';', $s ) ) ) as $part ) {
		if ( false === strpos( $part, ':' ) ) {
			continue;
		}
		list( $k, $v ) = array_map( 'trim', explode( ':', $part, 2 ) );
		$out[ $k ]     = array_values( array_filter( array_map( 'trim', explode( '|', $v ) ), 'strlen' ) );
	}
	return $out;
}

$created = 0;
$updated = 0;
// Parents first, then variations.
usort( $rows, static fn( $a, $b ) => ( 'variation' === $a['type'] ) <=> ( 'variation' === $b['type'] ) );

foreach ( $rows as $row ) {
	$sku  = trim( $row['sku'] );
	$type = trim( $row['type'] ? $row['type'] : 'simple' );
	if ( '' === $sku ) {
		WP_CLI::warning( 'Row without SKU skipped: ' . $row['name'] );
		continue;
	}
	$id = wc_get_product_id_by_sku( $sku );

	if ( 'variation' === $type ) {
		$parent_id = wc_get_product_id_by_sku( trim( $row['parent_sku'] ) );
		if ( ! $parent_id ) {
			WP_CLI::warning( "Variation $sku: parent {$row['parent_sku']} not found" );
			continue;
		}
		$p = $id ? wc_get_product( $id ) : new WC_Product_Variation();
		$p->set_parent_id( $parent_id );
		$attrs = array();
		foreach ( agc_parse_attrs( $row['attributes'] ) as $k => $vals ) {
			$attrs[ sanitize_title( $k ) ] = $vals[0] ?? '';
		}
		$p->set_attributes( $attrs );
	} else {
		$p = $id ? wc_get_product( $id ) : ( 'variable' === $type ? new WC_Product_Variable() : new WC_Product_Simple() );
		$p->set_name( $row['name'] );
		$p->set_status( 'publish' );
		$p->set_catalog_visibility( 'visible' );
		$p->set_featured( ! empty( $row['featured'] ) && '0' !== $row['featured'] );
		$p->set_short_description( wp_kses_post( $row['short_description'] ) );
		$p->set_description( wp_kses_post( $row['description'] ) );
		if ( $row['category'] ) {
			$p->set_category_ids( agc_cat_ids( $row['category'] ) );
		}
		if ( 'variable' === $type ) {
			$objs = array();
			foreach ( agc_parse_attrs( $row['attributes'] ) as $k => $vals ) {
				$a = new WC_Product_Attribute();
				$a->set_name( $k );
				$a->set_options( $vals );
				$a->set_visible( true );
				$a->set_variation( true );
				$objs[] = $a;
			}
			$p->set_attributes( $objs );
		}
	}
	$p->set_sku( $sku );
	if ( 'variable' !== $type ) {
		$p->set_regular_price( (string) $row['price'] );
		$p->set_sale_price( (string) $row['sale_price'] );
		if ( '' !== trim( $row['stock'] ) ) {
			$p->set_manage_stock( true );
			$p->set_stock_quantity( (int) $row['stock'] );
		}
	}
	if ( '' !== trim( $row['weight_kg'] ) ) {
		$p->set_weight( (string) $row['weight_kg'] );
	}
	$images = array_values( array_filter( array_map( 'trim', explode( '|', $row['image'] ) ) ) );
	if ( $images ) {
		$alt  = 'variation' === $type ? $row['name'] : $row['name'];
		$main = agc_image_id( $images[0], $img_dir, $alt );
		if ( $main ) {
			$p->set_image_id( $main );
		}
		if ( 'variation' !== $type && count( $images ) > 1 ) {
			$gallery = array();
			foreach ( array_slice( $images, 1 ) as $g ) {
				$gid = agc_image_id( $g, $img_dir, $alt );
				if ( $gid ) {
					$gallery[] = $gid;
				}
			}
			$p->set_gallery_image_ids( $gallery );
		}
	}
	$p->save();
	if ( $id ) {
		++$updated;
	} else {
		++$created;
	}
	if ( 'variation' === $type ) {
		WC_Product_Variable::sync( $p->get_parent_id() );
	}
}

// 没有图片的分类：用分类里第一件产品的图片.
foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => true ) ) as $term ) {
	if ( get_term_meta( $term->term_id, 'thumbnail_id', true ) ) {
		continue;
	}
	$first = wc_get_products( array( 'category' => array( $term->slug ), 'limit' => 1, 'orderby' => 'date', 'order' => 'ASC', 'return' => 'objects' ) );
	if ( $first && $first[0]->get_image_id() ) {
		update_term_meta( $term->term_id, 'thumbnail_id', $first[0]->get_image_id() );
	}
}

// 删掉 WooCommerce 默认的 "Uncategorized" 以外没有产品的空分类不处理；只确保默认分类名称好看.
$uncat = get_term_by( 'slug', 'uncategorized', 'product_cat' );
if ( $uncat ) {
	wp_update_term( $uncat->term_id, 'product_cat', array( 'name' => 'Others' ) );
}
WP_CLI::success( "Products: $created created, $updated updated." );
