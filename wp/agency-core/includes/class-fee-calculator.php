<?php
/**
 * [agc_fee_calculator] — Shopee fee vs own-website calculator.
 * Runs entirely in the browser: nothing typed is stored or sent anywhere.
 *
 * Attributes (defaults = rates checked on the date below; always editable by the visitor):
 *   commission="14" transaction="3.5" support="0.50" sst="8" gateway="2" gateway_fixed="0"
 *   checked="2026-11-06" sources="url1|url2"
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Fee calculator.
 */
class AGC_Fee_Calculator {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_shortcode( 'agc_fee_calculator', array( __CLASS__, 'render' ) );
	}

	/**
	 * Render.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function render( $atts ) {
		$a = shortcode_atts(
			array(
				'commission'    => '14',
				'transaction'   => '3.5',
				'support'       => '0.50',
				'sst'           => '8',
				'gateway'       => '2',
				'gateway_fixed' => '0',
				'checked'       => '2026-11-06',
				'sources'       => 'https://seller.shopee.com.my/edu/article/16038',
			),
			$atts,
			'agc_fee_calculator'
		);
		wp_enqueue_script( 'agc-fee-calculator', AGC_URL . 'assets/js/fee-calculator.js', array(), AGC_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );

		$num = static function ( $id, $label, $value, $step = '0.01', $suffix = '' ) {
			return sprintf(
				'<p class="agc-calc-field"><label for="%1$s">%2$s</label><span class="agc-calc-input"><input type="number" inputmode="decimal" min="0" step="%4$s" id="%1$s" data-calc="%1$s" value="%3$s">%5$s</span></p>',
				esc_attr( $id ),
				esc_html( $label ),
				esc_attr( $value ),
				esc_attr( $step ),
				$suffix ? '<span class="agc-calc-suffix">' . esc_html( $suffix ) . '</span>' : ''
			);
		};

		$links = array();
		foreach ( array_filter( explode( '|', $a['sources'] ) ) as $i => $url ) {
			$links[] = '<a href="' . esc_url( trim( $url ) ) . '" target="_blank" rel="noopener">' . esc_html( sprintf( 'Source %d', $i + 1 ) ) . '</a>';
		}

		$out  = '<div class="agc-calc" data-agc-calc>';
		$out .= '<form class="agc-calc-form" onsubmit="return false" autocomplete="off">';
		$out .= '<fieldset><legend>1. Your order · 你的订单</legend>';
		$out .= $num( 'price', 'Selling price · 售价 (RM)', '100' );
		$out .= $num( 'discount', 'Your discount / voucher · 卖家折扣 (RM)', '0' );
		$out .= $num( 'cost', 'Product cost · 商品成本 (RM)', '40' );
		$out .= $num( 'shipping', 'Shipping you pay · 卖家负担运费 (RM)', '0' );
		$out .= $num( 'orders', 'Repeat orders per month that could move to your website · 每月可以转到官网的回头客订单', '50', '1' );
		$out .= '</fieldset>';
		$out .= '<fieldset><legend>2. Shopee fees · Shopee 费用 <small>(edit to match your Seller Centre)</small></legend>';
		$out .= $num( 'commission', 'Commission · 佣金 (% before SST)', $a['commission'], '0.01', '%' );
		$out .= $num( 'transaction', 'Transaction fee · 交易费 (% before SST)', $a['transaction'], '0.01', '%' );
		$out .= $num( 'other', 'Other % fees (e.g. Cashback / Free Shipping programme) · 其他 %', '0', '0.01', '%' );
		$out .= $num( 'support', 'Platform support fee per order · 平台支持费 (RM, before SST)', $a['support'] );
		$out .= $num( 'sst', 'SST charged on fees · 费用的 SST', $a['sst'], '0.01', '%' );
		$out .= '</fieldset>';
		$out .= '<fieldset><legend>3. Your own website · 自己的网站</legend>';
		$out .= $num( 'gateway', 'Payment gateway fee · 付款网关手续费', $a['gateway'], '0.01', '%' );
		$out .= $num( 'gateway_fixed', 'Fixed fee per payment · 每笔固定费用 (RM)', $a['gateway_fixed'] );
		$out .= '</fieldset>';
		$out .= '</form>';

		$out .= '<div class="agc-calc-result" aria-live="polite">';
		$out .= '<table><thead><tr><th></th><th>Shopee</th><th>' . esc_html__( 'Own website', 'agency-core' ) . '</th></tr></thead><tbody>';
		$rows = array(
			'fees'     => 'Fees per order · 每单费用',
			'received' => 'You receive · 实际收到',
			'profit'   => 'Profit · 利润',
			'margin'   => 'Margin · 利润率',
		);
		foreach ( $rows as $k => $label ) {
			$out .= '<tr><th scope="row">' . esc_html( $label ) . '</th><td data-out="shopee_' . esc_attr( $k ) . '">–</td><td data-out="site_' . esc_attr( $k ) . '">–</td></tr>';
		}
		$out .= '</tbody></table>';
		$out .= '<p class="agc-calc-big">Keep about <strong data-out="diff">–</strong> more per order · 每单多留约 <strong data-out="diff2">–</strong><br>';
		$out .= '≈ <strong data-out="yearly">–</strong> a year on those repeat orders · 一年约多留 <strong data-out="yearly2">–</strong></p>';
		$out .= '<details class="agc-calc-breakdown"><summary>Shopee fee breakdown · 费用明细</summary><ul>';
		foreach ( array( 'c_commission' => 'Commission', 'c_transaction' => 'Transaction fee', 'c_other' => 'Other % fees', 'c_support' => 'Platform support fee', 'c_sst' => 'SST on fees' ) as $k => $label ) {
			$out .= '<li>' . esc_html( $label ) . ': <span data-out="' . esc_attr( $k ) . '">–</span></li>';
		}
		$out .= '</ul></details>';
		$out .= '</div>';

		$out .= '<p class="agc-calc-note">Default rates last checked: ' . esc_html( $a['checked'] ) . ' (' . implode( ', ', $links ) . '). Rates differ by category and seller programme and change often — <strong>always follow the latest rates in your Shopee Seller Centre</strong>. This is an estimate, not financial advice. Nothing you type here is saved or sent. · 默认费率查于 ' . esc_html( $a['checked'] ) . '，以 Shopee 卖家中心最新公布为准。你输入的资料不会被储存或传送。</p>';
		$out .= '</div>';
		return $out;
	}
}
