<?php
/**
 * Settings page: Settings → Agency.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * All settings live in one option array: agc_settings.
 */
class AGC_Settings {

	const OPTION = 'agc_settings';

	/**
	 * Cached settings.
	 *
	 * @var array|null
	 */
	private static $cache = null;

	/**
	 * Default values.
	 *
	 * @return array
	 */
	public static function defaults() {
		return array(
			// WhatsApp.
			'whatsapp_number'      => '',
			'whatsapp_float'       => 1,
			'whatsapp_position'    => 'right',
			'whatsapp_product_btn' => 1,
			'whatsapp_button_text' => 'Ask on WhatsApp',
			'whatsapp_float_label' => 'WhatsApp us',
			'whatsapp_prefill'     => "Hi, I'd like to ask about {product}: {url}",
			'whatsapp_general'     => "Hi {site}, I'd like to ask about your products.",
			// Demo mode.
			'demo_mode'            => 0,
			'demo_banner'          => 'Demo site – not a real store · 这是展示用网站，不是真的商店',
			'demo_checkout_notice' => 'This is a demo store. Orders cannot be placed. · 这是展示站，不会真的下单。',
			// Tracking.
			'ga4_id'               => '',
			'meta_pixel_id'        => '',
			// Business details (footer, legal pages).
			'legal_name'           => '',
			'ssm_no'               => '',
			'business_email'       => '',
			'business_phone'       => '',
			'business_address'     => '',
			'business_hours'       => '',
			// Social.
			'social_instagram'     => '',
			'social_facebook'      => '',
			'social_tiktok'        => '',
			'social_shopee'        => '',
			'social_xiaohongshu'   => '',
			'social_youtube'       => '',
			// Design.
			'accent_color'         => '',
			'concept_label'        => '',
			// Checkout.
			'my_checkout'          => 1,
			// Store UX.
			'announcement'         => '',
			'announcement_link'    => '',
			'trust_badges'         => "truck|Free shipping over RM150|West & East Malaysia\ncard|FPX & e-wallets|Secure checkout\nreturn|Easy exchange|See our policy\nchat|Real people on WhatsApp|We reply within 1 working day",
			'free_shipping_min'    => '',
			'sticky_atc'           => 1,
			'image_ratio'          => '1/1',
			'button_radius'        => '8px',
			// AI chat (needs AGC_AI_CHAT_URL + AGC_AI_CHAT_TOKEN in wp-config.php).
			'ai_chat'              => 0,
			'ai_chat_title'        => 'Ask us anything',
			'ai_chat_greeting'     => "Hi! I'm KedaiLab's AI assistant 👋 Ask me about packages, prices or how it works. 有问题可以用中文问我。",
		);
	}

	/**
	 * Field definitions for the settings screen.
	 *
	 * @return array
	 */
	private static function fields() {
		return array(
			'whatsapp' => array(
				'title'  => __( 'WhatsApp', 'agency-core' ),
				'fields' => array(
					'whatsapp_number'      => array( 'text', __( 'WhatsApp number (international format, no +, e.g. 60123456789)', 'agency-core' ) ),
					'whatsapp_float'       => array( 'checkbox', __( 'Show floating button', 'agency-core' ) ),
					'whatsapp_position'    => array( 'select', __( 'Floating button position', 'agency-core' ), array( 'right' => 'Bottom right', 'left' => 'Bottom left' ) ),
					'whatsapp_float_label' => array( 'text', __( 'Floating button label (screen readers)', 'agency-core' ) ),
					'whatsapp_product_btn' => array( 'checkbox', __( 'Show button on product pages', 'agency-core' ) ),
					'whatsapp_button_text' => array( 'text', __( 'Product button text', 'agency-core' ) ),
					'whatsapp_prefill'     => array( 'textarea', __( 'Product message template — variables: {product} {url} {site}', 'agency-core' ) ),
					'whatsapp_general'     => array( 'textarea', __( 'General message (floating button) — variables: {site} {url}', 'agency-core' ) ),
				),
			),
			'demo'     => array(
				'title'  => __( 'Demo mode', 'agency-core' ),
				'fields' => array(
					'demo_mode'            => array( 'checkbox', __( 'Demo mode on (banner, no payments, orders blocked, noindex, no customer emails)', 'agency-core' ) ),
					'demo_banner'          => array( 'text', __( 'Banner text', 'agency-core' ) ),
					'demo_checkout_notice' => array( 'text', __( 'Checkout notice', 'agency-core' ) ),
					'concept_label'        => array( 'text', __( 'Footer label (e.g. "Concept Project")', 'agency-core' ) ),
				),
			),
			'tracking' => array(
				'title'  => __( 'Tracking', 'agency-core' ),
				'fields' => array(
					'ga4_id'        => array( 'text', __( 'GA4 Measurement ID (G-XXXXXXX) — leave empty to disable', 'agency-core' ) ),
					'meta_pixel_id' => array( 'text', __( 'Meta Pixel ID — leave empty to disable', 'agency-core' ) ),
				),
			),
			'business' => array(
				'title'  => __( 'Business details', 'agency-core' ),
				'fields' => array(
					'legal_name'       => array( 'text', __( 'Registered business name', 'agency-core' ) ),
					'ssm_no'           => array( 'text', __( 'SSM registration no.', 'agency-core' ) ),
					'business_email'   => array( 'text', __( 'Email', 'agency-core' ) ),
					'business_phone'   => array( 'text', __( 'Phone', 'agency-core' ) ),
					'business_address' => array( 'textarea', __( 'Address', 'agency-core' ) ),
					'business_hours'   => array( 'text', __( 'Business hours', 'agency-core' ) ),
				),
			),
			'social'   => array(
				'title'  => __( 'Social links', 'agency-core' ),
				'fields' => array(
					'social_instagram'   => array( 'url', 'Instagram' ),
					'social_facebook'    => array( 'url', 'Facebook' ),
					'social_tiktok'      => array( 'url', 'TikTok' ),
					'social_shopee'      => array( 'url', 'Shopee' ),
					'social_xiaohongshu' => array( 'url', '小红书 Xiaohongshu' ),
					'social_youtube'     => array( 'url', 'YouTube' ),
				),
			),
			'store'    => array(
				'title'  => __( 'Store UX', 'agency-core' ),
				'fields' => array(
					'announcement'      => array( 'text', __( 'Announcement bar text (empty = hidden)', 'agency-core' ) ),
					'announcement_link' => array( 'url', __( 'Announcement link (optional)', 'agency-core' ) ),
					'trust_badges'      => array( 'textarea', __( 'Trust badges, one per line: icon|Title|Subtitle (icons: truck, card, return, leaf, shield, chat, heart, gift, clock, star)', 'agency-core' ) ),
					'free_shipping_min' => array( 'text', __( 'Free-shipping amount for the progress bar (RM, empty = hidden)', 'agency-core' ) ),
					'sticky_atc'        => array( 'checkbox', __( 'Sticky add-to-cart bar on mobile product pages', 'agency-core' ) ),
					'button_radius'     => array( 'text', __( 'Button & card corner radius (e.g. 0px, 8px, 999px)', 'agency-core' ) ),
					'image_ratio'       => array( 'select', __( 'Product image shape', 'agency-core' ), array( '1/1' => 'Square 1:1', '4/5' => 'Portrait 4:5', '3/4' => 'Portrait 3:4' ) ),
				),
			),
			'aichat'   => array(
				'title'  => __( 'AI chat assistant', 'agency-core' ),
				'fields' => array(
					'ai_chat'          => array( 'checkbox', __( 'Show the AI chat (also needs AGC_AI_CHAT_URL and AGC_AI_CHAT_TOKEN in wp-config.php and the sales-agent service running)', 'agency-core' ) ),
					'ai_chat_title'    => array( 'text', __( 'Chat window title', 'agency-core' ) ),
					'ai_chat_greeting' => array( 'textarea', __( 'First message shown to visitors', 'agency-core' ) ),
				),
			),
			'other'    => array(
				'title'  => __( 'Other', 'agency-core' ),
				'fields' => array(
					'accent_color' => array( 'text', __( 'Accent colour (HEX)', 'agency-core' ) ),
					'my_checkout'  => array( 'checkbox', __( 'Malaysian checkout tweaks (phone required, hide company & address line 2)', 'agency-core' ) ),
				),
			),
		);
	}

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'update_option_' . self::OPTION, array( __CLASS__, 'flush' ) );
		add_action( 'add_option_' . self::OPTION, array( __CLASS__, 'flush' ) );
	}

	/**
	 * Clear the in-memory cache.
	 */
	public static function flush() {
		self::$cache = null;
	}

	/**
	 * Read settings.
	 *
	 * @param string|null $key Key.
	 * @return mixed
	 */
	public static function get( $key = null ) {
		if ( null === self::$cache ) {
			$saved       = get_option( self::OPTION, array() );
			self::$cache = wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
		}
		if ( null === $key ) {
			return self::$cache;
		}
		return self::$cache[ $key ] ?? null;
	}

	/**
	 * Menu item.
	 */
	public static function menu() {
		add_options_page( __( 'Agency', 'agency-core' ), __( 'Agency', 'agency-core' ), 'manage_options', 'agency-core', array( __CLASS__, 'render' ) );
	}

	/**
	 * Register with the Settings API.
	 */
	public static function register() {
		register_setting(
			'agency_core',
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => self::defaults(),
			)
		);
		foreach ( self::fields() as $section_id => $section ) {
			add_settings_section( 'agc_' . $section_id, $section['title'], '__return_false', 'agency-core' );
			foreach ( $section['fields'] as $key => $field ) {
				add_settings_field(
					$key,
					esc_html( $field[1] ),
					array( __CLASS__, 'field' ),
					'agency-core',
					'agc_' . $section_id,
					array(
						'key'       => $key,
						'type'      => $field[0],
						'choices'   => $field[2] ?? array(),
						'label_for' => 'agc_' . $key,
					)
				);
			}
		}
	}

	/**
	 * Sanitize everything coming from the form (or WP-CLI).
	 *
	 * @param array $input Raw input.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$input    = is_array( $input ) ? $input : array();
		$out      = self::get();
		$defaults = self::defaults();
		$types    = array();
		$choices  = array();
		foreach ( self::fields() as $section ) {
			foreach ( $section['fields'] as $key => $field ) {
				$types[ $key ]   = $field[0];
				$choices[ $key ] = $field[2] ?? array();
			}
		}
		foreach ( $defaults as $key => $default ) {
			$type = $types[ $key ] ?? 'text';
			if ( 'checkbox' === $type ) {
				// Unchecked boxes are not submitted by the form.
				$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
				continue;
			}
			if ( ! array_key_exists( $key, $input ) ) {
				continue;
			}
			$value = $input[ $key ];
			switch ( $type ) {
				case 'textarea':
					$out[ $key ] = sanitize_textarea_field( $value );
					break;
				case 'url':
					$out[ $key ] = esc_url_raw( trim( $value ) );
					break;
				case 'select':
					$out[ $key ] = array_key_exists( (string) $value, $choices[ $key ] ?? array() ) ? (string) $value : $default;
					break;
				default:
					$out[ $key ] = sanitize_text_field( $value );
			}
		}
		$out['whatsapp_number'] = preg_replace( '/\D+/', '', (string) $out['whatsapp_number'] );
		$out['ga4_id']          = preg_match( '/^G-[A-Z0-9]+$/i', $out['ga4_id'] ) ? strtoupper( $out['ga4_id'] ) : '';
		$out['meta_pixel_id']   = preg_replace( '/\D+/', '', (string) $out['meta_pixel_id'] );
		$out['button_radius'] = preg_match( '/^\d{1,3}px$/', (string) $out['button_radius'] ) ? $out['button_radius'] : '8px';
		$out['free_shipping_min'] = is_numeric( $out['free_shipping_min'] ) ? (string) (float) $out['free_shipping_min'] : '';
		if ( $out['accent_color'] && ! preg_match( '/^#[0-9a-fA-F]{3,8}$/', $out['accent_color'] ) ) {
			$out['accent_color'] = '';
		}
		return $out;
	}

	/**
	 * Render one field.
	 *
	 * @param array $args Args.
	 */
	public static function field( $args ) {
		$key   = $args['key'];
		$value = self::get( $key );
		$name  = self::OPTION . '[' . $key . ']';
		$id    = 'agc_' . $key;
		switch ( $args['type'] ) {
			case 'checkbox':
				printf( '<input type="checkbox" id="%s" name="%s" value="1" %s />', esc_attr( $id ), esc_attr( $name ), checked( 1, (int) $value, false ) );
				break;
			case 'textarea':
				printf( '<textarea id="%s" name="%s" rows="3" class="large-text">%s</textarea>', esc_attr( $id ), esc_attr( $name ), esc_textarea( (string) $value ) );
				break;
			case 'select':
				printf( '<select id="%s" name="%s">', esc_attr( $id ), esc_attr( $name ) );
				foreach ( $args['choices'] as $k => $label ) {
					printf( '<option value="%s" %s>%s</option>', esc_attr( $k ), selected( $value, $k, false ), esc_html( $label ) );
				}
				echo '</select>';
				break;
			default:
				printf( '<input type="%s" id="%s" name="%s" value="%s" class="regular-text" />', 'url' === $args['type'] ? 'url' : 'text', esc_attr( $id ), esc_attr( $name ), esc_attr( (string) $value ) );
		}
	}

	/**
	 * Settings screen.
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div class="wrap"><h1>' . esc_html__( 'Agency settings', 'agency-core' ) . '</h1>';
		if ( self::get( 'demo_mode' ) ) {
			echo '<div class="notice notice-warning"><p>' . esc_html__( 'Demo mode is ON: payments are hidden and orders are blocked.', 'agency-core' ) . '</p></div>';
		}
		echo '<form method="post" action="options.php">';
		settings_fields( 'agency_core' );
		do_settings_sections( 'agency-core' );
		submit_button();
		echo '</form></div>';
	}
}
