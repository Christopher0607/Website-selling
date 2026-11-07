<?php
/**
 * AI chat assistant (inbound only — the visitor starts the chat).
 *
 * The browser talks to WordPress (admin-ajax); WordPress forwards the conversation to the
 * sales-agent service on the same server (sales/agent/sales_agent.py serve, DeepSeek),
 * which calls Claude. The Anthropic API key never touches WordPress.
 *
 * Turned on only when wp-config.php defines:
 *   define( 'AGC_AI_CHAT_URL', 'http://127.0.0.1:8787/chat' );
 *   define( 'AGC_AI_CHAT_TOKEN', '...' );   // same as AGENCY_CHAT_TOKEN
 * and Settings → Agency → "AI chat" is ticked.
 *
 * @package AgencyCore
 */

defined( 'ABSPATH' ) || exit;

/**
 * AI chat.
 */
class AGC_AI_Chat {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'wp_ajax_agc_ai_chat', array( __CLASS__, 'ajax' ) );
		add_action( 'wp_ajax_nopriv_agc_ai_chat', array( __CLASS__, 'ajax' ) );
		if ( self::enabled() ) {
			add_action( 'wp_enqueue_scripts', array( __CLASS__, 'assets' ) );
			add_action( 'wp_footer', array( __CLASS__, 'widget' ), 25 );
		}
	}

	/**
	 * Is the chat configured and switched on?
	 *
	 * @return bool
	 */
	public static function enabled() {
		return agc_get( 'ai_chat' ) && defined( 'AGC_AI_CHAT_URL' ) && defined( 'AGC_AI_CHAT_TOKEN' ) && AGC_AI_CHAT_URL && AGC_AI_CHAT_TOKEN;
	}

	/**
	 * Script + config.
	 */
	public static function assets() {
		if ( function_exists( 'is_checkout' ) && is_checkout() ) {
			return;
		}
		wp_enqueue_script( 'agc-ai-chat', AGC_URL . 'assets/js/ai-chat.js', array(), AGC_VERSION, array( 'in_footer' => true, 'strategy' => 'defer' ) );
		wp_localize_script(
			'agc-ai-chat',
			'agcAiChat',
			array(
				'url'      => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'agc_ai_chat' ),
				'greeting' => agc_get( 'ai_chat_greeting' ),
				'title'    => agc_get( 'ai_chat_title' ),
				'note'     => __( 'AI assistant · a real person follows up on WhatsApp', 'agency-core' ),
				'error'    => __( 'Sorry, the assistant is not available right now. Please WhatsApp us.', 'agency-core' ),
				'wa'       => AGC_WhatsApp::link( AGC_WhatsApp::fill( agc_get( 'whatsapp_general' ) ) ),
			)
		);
	}

	/**
	 * Markup (filled by JS).
	 */
	public static function widget() {
		if ( function_exists( 'is_checkout' ) && is_checkout() ) {
			return;
		}
		echo '<div id="agc-ai-chat" class="agc-ai-chat" data-agc-ai-chat></div>';
	}

	/**
	 * Visitor IP (only used for rate limiting; not stored).
	 *
	 * @return string
	 */
	private static function ip() {
		return isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0';
	}

	/**
	 * AJAX: forward the conversation to the sales-agent service.
	 */
	public static function ajax() {
		if ( ! self::enabled() ) {
			wp_send_json_error( array( 'message' => 'disabled' ), 404 );
		}
		check_ajax_referer( 'agc_ai_chat', 'nonce' );

		// Rate limit: 30 messages per hour per IP (the service has its own limit too).
		$key   = 'agc_ai_' . md5( self::ip() );
		$count = (int) get_transient( $key );
		if ( $count >= 30 ) {
			wp_send_json_error( array( 'message' => 'rate' ), 429 );
		}
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );

		$raw      = isset( $_POST['messages'] ) ? json_decode( wp_unslash( $_POST['messages'] ), true ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- decoded then sanitized below.
		$messages = array();
		foreach ( array_slice( is_array( $raw ) ? $raw : array(), -20 ) as $m ) {
			if ( ! is_array( $m ) ) {
				continue;
			}
			$role       = ( $m['role'] ?? '' ) === 'assistant' ? 'assistant' : 'user';
			$content    = mb_substr( sanitize_textarea_field( (string) ( $m['content'] ?? '' ) ), 0, 1500 );
			$messages[] = array( 'role' => $role, 'content' => $content );
		}
		if ( ! $messages || 'user' !== end( $messages )['role'] ) {
			wp_send_json_error( array( 'message' => 'empty' ), 400 );
		}

		$res = wp_remote_post(
			AGC_AI_CHAT_URL,
			array(
				'timeout' => 60,
				'headers' => array(
					'Content-Type'    => 'application/json',
					'X-Agency-Token'  => AGC_AI_CHAT_TOKEN,
					'X-Visitor-Ip'    => self::ip(),
				),
				'body'    => wp_json_encode( array( 'messages' => $messages ) ),
			)
		);
		$code = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		$data = $code ? json_decode( wp_remote_retrieve_body( $res ), true ) : null;
		if ( 200 !== $code || ! is_array( $data ) || empty( $data['reply'] ) ) {
			wp_send_json_error( array( 'message' => 'unavailable' ), 502 );
		}

		// Save the lead once per chat session.
		$session = isset( $_POST['session'] ) ? sanitize_key( wp_unslash( $_POST['session'] ) ) : '';
		if ( ! empty( $data['lead_ready'] ) && is_array( $data['lead'] ?? null ) && $session && ! get_transient( 'agc_ai_lead_' . $session ) ) {
			$lead = array_intersect_key( $data['lead'], array_flip( array( 'name', 'brand', 'shop_url', 'instagram', 'contact', 'whatsapp', 'language', 'interest' ) ) );
			$lead['conversation'] = implode(
				"\n",
				array_map( static fn( $m ) => ( 'assistant' === $m['role'] ? 'AI: ' : 'Visitor: ' ) . $m['content'], array_merge( $messages, array( array( 'role' => 'assistant', 'content' => (string) $data['reply'] ) ) ) )
			);
			AGC_Lead_Form::save( $lead, 'AI chat' );
			set_transient( 'agc_ai_lead_' . $session, 1, DAY_IN_SECONDS );
		}

		wp_send_json_success(
			array(
				'reply'   => wp_strip_all_tags( (string) $data['reply'] ),
				'handoff' => ! empty( $data['handoff_to_human'] ),
				'lead'    => ! empty( $data['lead_ready'] ),
			)
		);
	}
}
