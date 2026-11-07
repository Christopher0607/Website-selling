<?php
/**
 * Simple lead form: [agc_lead_form]
 * - Saves each enquiry as a private "Lead" post (Dashboard → Leads) and emails the site admin.
 * - Nonce + honeypot + simple rate limit; no external services.
 * - After a successful submit, the page shows a thank-you message and fires the generate_lead event.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * Lead form.
 */
class AGC_Lead_Form {

	const CPT = 'agc_lead';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_shortcode( 'agc_lead_form', array( __CLASS__, 'render' ) );
		add_action( 'admin_post_nopriv_agc_lead', array( __CLASS__, 'handle' ) );
		add_action( 'admin_post_agc_lead', array( __CLASS__, 'handle' ) );
		add_filter( 'manage_' . self::CPT . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::CPT . '_posts_custom_column', array( __CLASS__, 'column' ), 10, 2 );
	}

	/**
	 * Fields: key => [label, type, required, options].
	 *
	 * @return array
	 */
	public static function fields() {
		return apply_filters(
			'agc_lead_fields',
			array(
				'name'     => array( __( 'Your name', 'agency-core' ), 'text', true ),
				'brand'    => array( __( 'Brand / shop name', 'agency-core' ), 'text', true ),
				'shop_url' => array( __( 'Shop link (Shopee / TikTok / Instagram)', 'agency-core' ), 'url', false ),
				'whatsapp' => array( __( 'WhatsApp number', 'agency-core' ), 'tel', true ),
				'budget'   => array(
					__( 'Budget', 'agency-core' ),
					'select',
					false,
					array( '', 'Below RM2,000', 'RM2,000 – RM3,500', 'RM3,500 – RM5,000', 'Above RM5,000', 'Not sure yet' ),
				),
				'message'  => array( __( 'What would you like the website to do for you?', 'agency-core' ), 'textarea', false ),
			)
		);
	}

	/**
	 * Private post type for leads.
	 */
	public static function register() {
		register_post_type(
			self::CPT,
			array(
				'label'           => __( 'Leads', 'agency-core' ),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'menu_icon'       => 'dashicons-email-alt',
				'supports'        => array( 'title', 'editor' ),
				'capability_type' => 'post',
				'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
				'map_meta_cap'    => true,
			)
		);
	}

	/**
	 * Render the form.
	 *
	 * @return string
	 */
	public static function render() {
		$out = '';
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- display only.
		$status = isset( $_GET['agc_lead'] ) ? sanitize_key( wp_unslash( $_GET['agc_lead'] ) ) : '';
		if ( 'sent' === $status ) {
			return '<div class="agc-lead-ok" role="status" data-agc-lead-sent="1"><strong>' . esc_html__( 'Thank you! We received your message.', 'agency-core' ) . '</strong><br>' . esc_html__( 'We will WhatsApp you within one working day.', 'agency-core' ) . ' · 谢谢！我们会在 1 个工作天内 WhatsApp 你。</div>';
		}
		if ( 'error' === $status ) {
			$out .= '<div class="agc-lead-error" role="alert">' . esc_html__( 'Please fill in the required fields and try again.', 'agency-core' ) . '</div>';
		}
		if ( 'wait' === $status ) {
			$out .= '<div class="agc-lead-error" role="alert">' . esc_html__( 'Too many messages — please wait a few minutes or WhatsApp us.', 'agency-core' ) . '</div>';
		}
		$out .= '<form class="agc-lead-form" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		$out .= '<input type="hidden" name="action" value="agc_lead">';
		$out .= wp_nonce_field( 'agc_lead', '_agc_nonce', true, false );
		$out .= '<input type="hidden" name="agc_return" value="' . esc_url( get_permalink() ) . '">';
		// Honeypot (hidden from people, bots fill it in).
		$out .= '<p class="agc-hp" aria-hidden="true"><label>Website <input type="text" name="agc_website" tabindex="-1" autocomplete="off"></label></p>';
		foreach ( self::fields() as $key => $f ) {
			$id   = 'agc_f_' . $key;
			$req  = $f[2] ? ' required' : '';
			$star = $f[2] ? ' <span aria-hidden="true">*</span>' : '';
			$out .= '<p class="agc-field agc-field-' . esc_attr( $key ) . '"><label for="' . esc_attr( $id ) . '">' . esc_html( $f[0] ) . $star . '</label>';
			if ( 'textarea' === $f[1] ) {
				$out .= '<textarea id="' . esc_attr( $id ) . '" name="agc[' . esc_attr( $key ) . ']" rows="4"' . $req . '></textarea>';
			} elseif ( 'select' === $f[1] ) {
				$out .= '<select id="' . esc_attr( $id ) . '" name="agc[' . esc_attr( $key ) . ']"' . $req . '>';
				foreach ( $f[3] as $opt ) {
					$out .= '<option value="' . esc_attr( $opt ) . '">' . esc_html( '' === $opt ? '—' : $opt ) . '</option>';
				}
				$out .= '</select>';
			} else {
				$out .= '<input id="' . esc_attr( $id ) . '" type="' . esc_attr( $f[1] ) . '" name="agc[' . esc_attr( $key ) . ']"' . $req . '>';
			}
			$out .= '</p>';
		}
		$privacy = get_privacy_policy_url();
		$out    .= '<p class="agc-consent"><label><input type="checkbox" name="agc_consent" value="1" required> ' . esc_html__( 'I agree that you may contact me about my enquiry', 'agency-core' ) . ( $privacy ? ' (<a href="' . esc_url( $privacy ) . '">' . esc_html__( 'Privacy Notice', 'agency-core' ) . '</a>)' : '' ) . '.</label></p>';
		$out    .= '<p><button type="submit" class="button">' . esc_html__( 'Send', 'agency-core' ) . '</button></p>';
		$out    .= '</form>';
		return $out;
	}

	/**
	 * Handle a submission.
	 */
	public static function handle() {
		$return = isset( $_POST['agc_return'] ) ? esc_url_raw( wp_unslash( $_POST['agc_return'] ) ) : home_url( '/' );
		$return = wp_validate_redirect( $return, home_url( '/' ) );
		$back   = static function ( $status ) use ( $return ) {
			wp_safe_redirect( add_query_arg( 'agc_lead', $status, $return ) . '#contact-form' );
			exit;
		};
		if ( ! isset( $_POST['_agc_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_agc_nonce'] ) ), 'agc_lead' ) ) {
			$back( 'error' );
		}
		// Honeypot: pretend success.
		if ( ! empty( $_POST['agc_website'] ) ) {
			$back( 'sent' );
		}
		// Rate limit: 3 per 10 minutes per IP.
		$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0';
		$key   = 'agc_lead_' . md5( $ip );
		$count = (int) get_transient( $key );
		if ( $count >= 3 ) {
			$back( 'wait' );
		}
		$raw  = isset( $_POST['agc'] ) && is_array( $_POST['agc'] ) ? wp_unslash( $_POST['agc'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized per field below.
		$data = array();
		foreach ( self::fields() as $k => $f ) {
			$v = isset( $raw[ $k ] ) ? (string) $raw[ $k ] : '';
			if ( 'textarea' === $f[1] ) {
				$v = sanitize_textarea_field( $v );
			} elseif ( 'url' === $f[1] ) {
				$v = esc_url_raw( $v );
			} elseif ( 'select' === $f[1] ) {
				$v = in_array( $v, $f[3], true ) ? $v : '';
			} else {
				$v = sanitize_text_field( $v );
			}
			$v = mb_substr( $v, 0, 2000 );
			if ( $f[2] && '' === trim( $v ) ) {
				$back( 'error' );
			}
			$data[ $k ] = $v;
		}
		if ( empty( $_POST['agc_consent'] ) ) {
			$back( 'error' );
		}
		set_transient( $key, $count + 1, 10 * MINUTE_IN_SECONDS );

		self::save( $data, 'contact form' );
		$back( 'sent' );
	}

	/**
	 * Save a lead (also used by the AI chat) and email the admin.
	 *
	 * @param array  $data   Field => value (keys from fields(); unknown keys are added as extra lines).
	 * @param string $source Where it came from.
	 * @return int Post ID or 0.
	 */
	public static function save( array $data, $source = 'contact form' ) {
		$lines = array( 'Source: ' . $source );
		foreach ( $data as $k => $v ) {
			$label   = self::fields()[ $k ][0] ?? ucfirst( str_replace( '_', ' ', (string) $k ) );
			$lines[] = $label . ': ' . sanitize_textarea_field( (string) $v );
		}
		$data    = array_map( static fn( $v ) => sanitize_text_field( (string) $v ), $data );
		$body    = implode( "\n", $lines );
		$title   = trim( ( $data['brand'] ?? '' ) . ' — ' . ( $data['name'] ?? '' ), ' —' );
		$post_id = wp_insert_post(
			array(
				'post_type'    => self::CPT,
				'post_status'  => 'private',
				'post_title'   => $title ? $title : 'Enquiry',
				'post_content' => $body,
			)
		);
		if ( ! $post_id || is_wp_error( $post_id ) ) {
			return 0;
		}
		foreach ( $data as $k => $v ) {
			update_post_meta( $post_id, '_agc_' . sanitize_key( $k ), $v );
		}
		update_post_meta( $post_id, '_agc_source', $source );
		$to = agc_get( 'business_email' ) ? agc_get( 'business_email' ) : get_option( 'admin_email' );
		wp_mail( $to, '[' . wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) . '] New enquiry (' . $source . '): ' . $title, $body . "\n\n" . admin_url( 'edit.php?post_type=' . self::CPT ) );
		return (int) $post_id;
	}

	/**
	 * Admin list columns.
	 *
	 * @param array $cols Columns.
	 * @return array
	 */
	public static function columns( $cols ) {
		return array(
			'cb'       => $cols['cb'] ?? '',
			'title'    => __( 'Lead', 'agency-core' ),
			'whatsapp' => 'WhatsApp',
			'budget'   => __( 'Budget', 'agency-core' ),
			'date'     => $cols['date'] ?? __( 'Date', 'agency-core' ),
		);
	}

	/**
	 * Admin list column content.
	 *
	 * @param string $col Column.
	 * @param int    $id  Post ID.
	 */
	public static function column( $col, $id ) {
		if ( 'whatsapp' === $col ) {
			$n = preg_replace( '/\D+/', '', (string) get_post_meta( $id, '_agc_whatsapp', true ) );
			if ( $n ) {
				if ( 0 === strpos( $n, '0' ) ) {
					$n = '6' . $n;
				}
				printf( '<a href="%s" target="_blank" rel="noopener">%s</a>', esc_url( 'https://wa.me/' . $n ), esc_html( get_post_meta( $id, '_agc_whatsapp', true ) ) );
			}
		} elseif ( 'budget' === $col ) {
			echo esc_html( (string) get_post_meta( $id, '_agc_budget', true ) );
		}
	}
}
