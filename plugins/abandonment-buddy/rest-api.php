<?php
/**
 * Abandonment Buddy REST API
 *
 * Replaces the Railway/NestJS backend entirely.
 * Runs on WordPress (Hostinger) at /wp-json/ab/v1/...
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AB_API {

    const NS         = 'ab/v1';
    const JWT_OPTION = 'ab_jwt_secret';
    const DB_VERSION = '1.1';

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    public static function init() {
        add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
        add_action( 'rest_api_init', [ __CLASS__, 'add_cors_headers' ] );
        add_action( 'init',          [ __CLASS__, 'maybe_create_tables' ] );
    }

    public static function add_cors_headers() {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        // Allow any HTTPS origin (Vercel, custom domain) — tighten per your needs
        if ( $origin ) {
            header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
            header( 'Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-AB-API-Key, X-AB-Store-ID, X-AB-Signature' );
            header( 'Access-Control-Allow-Credentials: true' );
        }

        if ( $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
            status_header( 204 );
            exit;
        }
    }

    // ── JWT ───────────────────────────────────────────────────────────────────

    private static function jwt_secret(): string {
        $s = get_option( self::JWT_OPTION );
        if ( ! $s ) {
            $s = wp_generate_password( 64, true, true );
            update_option( self::JWT_OPTION, $s );
        }
        return $s;
    }

    private static function b64url( string $data ): string {
        return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
    }

    public static function jwt_encode( array $payload ): string {
        $h = self::b64url( json_encode( [ 'typ' => 'JWT', 'alg' => 'HS256' ] ) );
        $p = self::b64url( json_encode( $payload ) );
        $s = self::b64url( hash_hmac( 'sha256', "{$h}.{$p}", self::jwt_secret(), true ) );
        return "{$h}.{$p}.{$s}";
    }

    public static function jwt_decode( string $token ): ?array {
        $parts = explode( '.', $token );
        if ( count( $parts ) !== 3 ) {
            return null;
        }
        [ $h, $p, $sig ] = $parts;
        $expected = self::b64url( hash_hmac( 'sha256', "{$h}.{$p}", self::jwt_secret(), true ) );
        if ( ! hash_equals( $expected, $sig ) ) {
            return null;
        }
        $data = json_decode( base64_decode( strtr( $p, '-_', '+/' ) ), true );
        if ( isset( $data['exp'] ) && $data['exp'] < time() ) {
            return null;
        }
        return $data;
    }

    private static function auth_required( WP_REST_Request $req ) {
        $auth = $req->get_header( 'authorization' );
        if ( ! $auth || strpos( $auth, 'Bearer ' ) !== 0 ) {
            return new WP_Error( 'unauthorized', 'Unauthorized', [ 'status' => 401 ] );
        }
        $payload = self::jwt_decode( substr( $auth, 7 ) );
        if ( ! $payload ) {
            return new WP_Error( 'unauthorized', 'Invalid or expired token', [ 'status' => 401 ] );
        }
        return $payload;
    }

    // ── Database ──────────────────────────────────────────────────────────────

    public static function maybe_create_tables() {
        if ( get_option( 'ab_api_db_version' ) !== self::DB_VERSION ) {
            self::create_tables();
        }
    }

    public static function create_tables() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();

        $stores = self::stores_table();
        $wpdb->query( "CREATE TABLE IF NOT EXISTS {$stores} (
            id             VARCHAR(36)   NOT NULL,
            user_id        BIGINT(20)    NOT NULL,
            name           VARCHAR(255)  NOT NULL DEFAULT '',
            url            VARCHAR(500)  DEFAULT NULL,
            api_key        VARCHAR(100)  NOT NULL,
            api_secret     VARCHAR(100)  NOT NULL,
            webhook_secret VARCHAR(100)  NOT NULL,
            created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY api_key (api_key)
        ) {$charset};" );

        $carts = self::carts_table();
        $wpdb->query( "CREATE TABLE IF NOT EXISTS {$carts} (
            id              BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            store_id        VARCHAR(36)         NOT NULL,
            session_id      VARCHAR(255)        NOT NULL,
            email           VARCHAR(255)        DEFAULT NULL,
            name            VARCHAR(255)        DEFAULT NULL,
            phone           VARCHAR(255)        DEFAULT NULL,
            cart_items      LONGTEXT            DEFAULT NULL,
            cart_total      DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
            status          VARCHAR(50)         NOT NULL DEFAULT 'abandoned',
            email_sent_at   DATETIME            DEFAULT NULL,
            email_2_sent_at DATETIME            DEFAULT NULL,
            email_3_sent_at DATETIME            DEFAULT NULL,
            recovered_at    DATETIME            DEFAULT NULL,
            last_activity   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY store_session (store_id, session_id),
            KEY store_id (store_id),
            KEY status (status)
        ) {$charset};" );

        update_option( 'ab_api_db_version', self::DB_VERSION );
    }

    private static function stores_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'ab_stores';
    }

    private static function carts_table(): string {
        global $wpdb;
        return $wpdb->prefix . 'ab_central_carts';
    }

    // ── Routes ────────────────────────────────────────────────────────────────

    public static function register_routes() {
        $ns = self::NS;

        // Auth
        register_rest_route( $ns, '/auth/login',      [ 'methods' => 'POST',        'callback' => [ __CLASS__, 'route_login' ],          'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/register',   [ 'methods' => 'POST',        'callback' => [ __CLASS__, 'route_register' ],       'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/profile',    [ 'methods' => 'GET',         'callback' => [ __CLASS__, 'route_profile' ],        'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/profile',    [ 'methods' => 'PATCH',       'callback' => [ __CLASS__, 'route_update_profile' ], 'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/settings',   [ 'methods' => 'GET',         'callback' => [ __CLASS__, 'route_get_settings' ],   'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/settings',   [ 'methods' => 'PATCH',       'callback' => [ __CLASS__, 'route_update_settings' ],'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/auth/test-email', [ 'methods' => 'POST',        'callback' => [ __CLASS__, 'route_test_email' ],     'permission_callback' => '__return_true' ] );

        // Stores
        register_rest_route( $ns, '/stores',          [ 'methods' => 'GET',         'callback' => [ __CLASS__, 'route_list_stores' ],    'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/stores',          [ 'methods' => 'POST',        'callback' => [ __CLASS__, 'route_create_store' ],   'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/stores/connect',  [ 'methods' => 'POST',        'callback' => [ __CLASS__, 'route_connect_store' ],  'permission_callback' => '__return_true' ] );

        register_rest_route( $ns, '/stores/(?P<id>[a-zA-Z0-9_-]+)', [
            [ 'methods' => 'GET',    'callback' => [ __CLASS__, 'route_get_store' ],    'permission_callback' => '__return_true' ],
            [ 'methods' => 'PATCH',  'callback' => [ __CLASS__, 'route_update_store' ], 'permission_callback' => '__return_true' ],
            [ 'methods' => 'DELETE', 'callback' => [ __CLASS__, 'route_delete_store' ], 'permission_callback' => '__return_true' ],
        ] );

        register_rest_route( $ns, '/stores/(?P<id>[a-zA-Z0-9_-]+)/carts', [ 'methods' => 'GET', 'callback' => [ __CLASS__, 'route_store_carts' ], 'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/stores/(?P<id>[a-zA-Z0-9_-]+)/stats', [ 'methods' => 'GET', 'callback' => [ __CLASS__, 'route_store_stats' ], 'permission_callback' => '__return_true' ] );

        // Webhooks (sent from WP plugin on customer stores)
        register_rest_route( $ns, '/webhooks/cart-session/(?P<storeId>[a-zA-Z0-9_-]+)',   [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'route_webhook_cart' ],  'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/webhooks/order-completed/(?P<storeId>[a-zA-Z0-9_-]+)', [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'route_webhook_order' ], 'permission_callback' => '__return_true' ] );

        // Plugin
        register_rest_route( $ns, '/plugin/info',       [ 'methods' => 'GET',  'callback' => [ __CLASS__, 'route_plugin_info' ],  'permission_callback' => '__return_true' ] );
        register_rest_route( $ns, '/plugin/email-step', [ 'methods' => 'POST', 'callback' => [ __CLASS__, 'route_email_step' ],   'permission_callback' => '__return_true' ] );
    }

    // ── Auth handlers ─────────────────────────────────────────────────────────

    public static function route_login( WP_REST_Request $req ) {
        $email    = sanitize_email( $req->get_param( 'email' ) ?? '' );
        $password = $req->get_param( 'password' ) ?? '';

        if ( ! $email || ! $password ) {
            return new WP_Error( 'invalid', 'Email and password are required', [ 'status' => 400 ] );
        }

        $user = get_user_by( 'email', $email );
        if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
            return new WP_Error( 'invalid_credentials', 'Invalid email or password', [ 'status' => 401 ] );
        }

        $token = self::jwt_encode( [
            'sub'   => (string) $user->ID,
            'email' => $user->user_email,
            'name'  => $user->display_name,
            'iat'   => time(),
            'exp'   => time() + 30 * DAY_IN_SECONDS,
        ] );

        return [
            'token' => $token,
            'user'  => [
                'id'       => (string) $user->ID,
                'email'    => $user->user_email,
                'fullName' => $user->display_name,
            ],
        ];
    }

    public static function route_register( WP_REST_Request $req ) {
        $email    = sanitize_email( $req->get_param( 'email' ) ?? '' );
        $password = $req->get_param( 'password' ) ?? '';
        $name     = sanitize_text_field( $req->get_param( 'name' ) ?? $req->get_param( 'fullName' ) ?? '' );

        if ( ! $email || ! $password ) {
            return new WP_Error( 'invalid', 'Email and password are required', [ 'status' => 400 ] );
        }
        if ( email_exists( $email ) ) {
            return new WP_Error( 'email_exists', 'An account with that email already exists', [ 'status' => 409 ] );
        }

        $user_id = wp_create_user( $email, $password, $email );
        if ( is_wp_error( $user_id ) ) {
            return new WP_Error( 'registration_failed', $user_id->get_error_message(), [ 'status' => 500 ] );
        }

        wp_update_user( [ 'ID' => $user_id, 'display_name' => $name ?: $email ] );

        $token = self::jwt_encode( [
            'sub'   => (string) $user_id,
            'email' => $email,
            'name'  => $name ?: $email,
            'iat'   => time(),
            'exp'   => time() + 30 * DAY_IN_SECONDS,
        ] );

        return new WP_REST_Response( [
            'token' => $token,
            'user'  => [
                'id'       => (string) $user_id,
                'email'    => $email,
                'fullName' => $name ?: $email,
            ],
        ], 201 );
    }

    public static function route_profile( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $user = get_userdata( (int) $payload['sub'] );
        if ( ! $user ) {
            return new WP_Error( 'not_found', 'User not found', [ 'status' => 404 ] );
        }
        return [
            'id'       => (string) $user->ID,
            'email'    => $user->user_email,
            'fullName' => $user->display_name,
        ];
    }

    public static function route_update_profile( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $body = $req->get_json_params() ?? [];
        $data = [ 'ID' => (int) $payload['sub'] ];
        if ( ! empty( $body['fullName'] ) ) {
            $data['display_name'] = sanitize_text_field( $body['fullName'] );
        }
        wp_update_user( $data );
        return self::route_profile( $req );
    }

    public static function route_get_settings( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $meta = get_user_meta( (int) $payload['sub'], 'ab_settings', true ) ?: [];

        return [
            'smtpHost'          => $meta['smtp_host']    ?? null,
            'smtpPort'          => isset( $meta['smtp_port'] ) ? (int) $meta['smtp_port'] : null,
            'smtpUser'          => $meta['smtp_user']    ?? null,
            'smtpFrom'          => $meta['smtp_from']    ?? null,
            'smtpSecure'        => $meta['smtp_secure']  ?? null,
            'smtpVerified'      => ! empty( $meta['smtp_verified'] ),
            'twilioAccountSid'  => $meta['twilio_sid']   ?? null,
            'twilioFromPhone'   => $meta['twilio_from']  ?? null,
            'twilioWhatsappNum' => $meta['twilio_wa']    ?? null,
        ];
    }

    public static function route_update_settings( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $user_id = (int) $payload['sub'];
        $meta    = get_user_meta( $user_id, 'ab_settings', true ) ?: [];
        $body    = $req->get_json_params() ?? [];

        if ( array_key_exists( 'smtpHost',   $body ) ) $meta['smtp_host']    = sanitize_text_field( $body['smtpHost'] );
        if ( array_key_exists( 'smtpPort',   $body ) ) $meta['smtp_port']    = (int) $body['smtpPort'];
        if ( array_key_exists( 'smtpUser',   $body ) ) $meta['smtp_user']    = sanitize_text_field( $body['smtpUser'] );
        if ( array_key_exists( 'smtpFrom',   $body ) ) $meta['smtp_from']    = sanitize_text_field( $body['smtpFrom'] );
        if ( array_key_exists( 'smtpSecure', $body ) ) $meta['smtp_secure']  = (bool) $body['smtpSecure'];
        if ( ! empty( $body['smtpPass'] ) )             $meta['smtp_pass']    = $body['smtpPass'];
        if ( array_key_exists( 'smtpHost',   $body ) ) $meta['smtp_verified'] = false;

        if ( array_key_exists( 'twilioAccountSid',  $body ) ) $meta['twilio_sid']  = sanitize_text_field( $body['twilioAccountSid'] );
        if ( ! empty( $body['twilioAuthToken'] ) )             $meta['twilio_auth'] = $body['twilioAuthToken'];
        if ( array_key_exists( 'twilioFromPhone',   $body ) ) $meta['twilio_from'] = sanitize_text_field( $body['twilioFromPhone'] );
        if ( array_key_exists( 'twilioWhatsappNum', $body ) ) $meta['twilio_wa']   = sanitize_text_field( $body['twilioWhatsappNum'] );

        update_user_meta( $user_id, 'ab_settings', $meta );
        return [ 'ok' => true ];
    }

    public static function route_test_email( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $user_id = (int) $payload['sub'];
        $meta    = get_user_meta( $user_id, 'ab_settings', true ) ?: [];
        $to      = sanitize_email( $req->get_param( 'to' ) ?? '' );

        $host   = $meta['smtp_host']   ?? '';
        $port   = (int) ( $meta['smtp_port']   ?? 587 );
        $user   = $meta['smtp_user']   ?? '';
        $pass   = $meta['smtp_pass']   ?? '';
        $secure = $meta['smtp_secure'] ?? false;
        $from   = $meta['smtp_from']   ?? $user;

        if ( ! $host || ! $user || ! $pass ) {
            return new WP_Error( 'smtp_not_configured', 'SMTP not configured. Save your credentials in Settings → Email first.', [ 'status' => 400 ] );
        }
        if ( ! $to ) {
            $wp_user = get_userdata( $user_id );
            $to = $wp_user->user_email;
        }

        $configure = function ( $phpmailer ) use ( $host, $port, $user, $pass, $secure, $from ) {
            $phpmailer->isSMTP();
            $phpmailer->Host       = $host;
            $phpmailer->SMTPAuth   = true;
            $phpmailer->Username   = $user;
            $phpmailer->Password   = $pass;
            $phpmailer->SMTPSecure = $secure ? 'tls' : '';
            $phpmailer->Port       = $port;
            $phpmailer->From       = $from;
        };
        add_action( 'phpmailer_init', $configure );

        $sent = wp_mail(
            $to,
            'SMTP test — Abandonment Buddy',
            '<html><body style="font-family:sans-serif;padding:32px;max-width:480px;">'
            . '<h2 style="color:#0f172a;">SMTP is working ✓</h2>'
            . '<p style="color:#475569;">This test email was sent from your Abandonment Buddy dashboard. Your cart recovery emails will be delivered using these same SMTP settings.</p>'
            . '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">'
            . '<p style="color:#94a3b8;font-size:12px;">Sent via ' . esc_html( $host ) . ':' . (int) $port . '</p>'
            . '</body></html>',
            [ 'Content-Type: text/html; charset=UTF-8' ]
        );

        remove_action( 'phpmailer_init', $configure );

        if ( ! $sent ) {
            return new WP_Error( 'send_failed', 'Failed to send test email. Check your SMTP credentials.', [ 'status' => 500 ] );
        }

        return [ 'success' => true, 'sentTo' => $to ];
    }

    // ── Store handlers ────────────────────────────────────────────────────────

    public static function route_list_stores( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        global $wpdb;
        $rows = $wpdb->get_results( $wpdb->prepare(
            'SELECT * FROM ' . self::stores_table() . ' WHERE user_id = %d ORDER BY created_at DESC',
            (int) $payload['sub']
        ), ARRAY_A );

        return array_map( [ __CLASS__, 'format_store' ], $rows ?: [] );
    }

    public static function route_create_store( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $body = $req->get_json_params() ?? [];
        global $wpdb;

        $id     = wp_generate_uuid4();
        $apiKey = 'ck_' . wp_generate_password( 32, false );
        $secret = 'cs_' . wp_generate_password( 32, false );
        $whsec  = wp_generate_password( 40, false );

        $wpdb->insert( self::stores_table(), [
            'id'             => $id,
            'user_id'        => (int) $payload['sub'],
            'name'           => sanitize_text_field( $body['name'] ?? 'My Store' ),
            'url'            => esc_url_raw( $body['url'] ?? '' ),
            'api_key'        => $apiKey,
            'api_secret'     => $secret,
            'webhook_secret' => $whsec,
            'created_at'     => current_time( 'mysql' ),
        ] );

        $store = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::stores_table() . ' WHERE id = %s', $id ), ARRAY_A );
        return new WP_REST_Response( self::format_store( $store ), 201 );
    }

    public static function route_connect_store( WP_REST_Request $req ) {
        $body       = $req->get_json_params() ?? [];
        $api_key    = sanitize_text_field( $body['apiKey']    ?? '' );
        $api_secret = sanitize_text_field( $body['apiSecret'] ?? '' );

        if ( ! $api_key || ! $api_secret ) {
            return new WP_Error( 'invalid', 'apiKey and apiSecret are required', [ 'status' => 400 ] );
        }

        global $wpdb;
        $store = $wpdb->get_row( $wpdb->prepare(
            'SELECT * FROM ' . self::stores_table() . ' WHERE api_key = %s AND api_secret = %s',
            $api_key, $api_secret
        ), ARRAY_A );

        if ( ! $store ) {
            return new WP_Error( 'invalid_credentials', 'Invalid API key or secret', [ 'status' => 401 ] );
        }

        return new WP_REST_Response( [
            'storeId'       => $store['id'],
            'webhookSecret' => $store['webhook_secret'],
        ], 201 );
    }

    public static function route_get_store( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $store = self::get_store_for_user( $req->get_param( 'id' ), (int) $payload['sub'] );
        if ( is_wp_error( $store ) ) {
            return $store;
        }
        return self::format_store( $store );
    }

    public static function route_update_store( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $store = self::get_store_for_user( $req->get_param( 'id' ), (int) $payload['sub'] );
        if ( is_wp_error( $store ) ) {
            return $store;
        }

        $body = $req->get_json_params() ?? [];
        $data = [];
        if ( isset( $body['name'] ) ) $data['name'] = sanitize_text_field( $body['name'] );
        if ( isset( $body['url'] )  ) $data['url']  = esc_url_raw( $body['url'] );

        if ( $data ) {
            global $wpdb;
            $wpdb->update( self::stores_table(), $data, [ 'id' => $store['id'] ] );
        }

        global $wpdb;
        $updated = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::stores_table() . ' WHERE id = %s', $store['id'] ), ARRAY_A );
        return self::format_store( $updated );
    }

    public static function route_delete_store( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $store = self::get_store_for_user( $req->get_param( 'id' ), (int) $payload['sub'] );
        if ( is_wp_error( $store ) ) {
            return $store;
        }
        global $wpdb;
        $wpdb->delete( self::stores_table(), [ 'id' => $store['id'] ] );
        $wpdb->delete( self::carts_table(),  [ 'store_id' => $store['id'] ] );
        return [ 'ok' => true ];
    }

    public static function route_store_carts( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $store = self::get_store_for_user( $req->get_param( 'id' ), (int) $payload['sub'] );
        if ( is_wp_error( $store ) ) {
            return $store;
        }
        global $wpdb;
        $carts = $wpdb->get_results( $wpdb->prepare(
            'SELECT * FROM ' . self::carts_table() . ' WHERE store_id = %s ORDER BY last_activity DESC LIMIT 100',
            $store['id']
        ), ARRAY_A );
        return $carts ?: [];
    }

    public static function route_store_stats( WP_REST_Request $req ) {
        $payload = self::auth_required( $req );
        if ( is_wp_error( $payload ) ) {
            return $payload;
        }
        $store = self::get_store_for_user( $req->get_param( 'id' ), (int) $payload['sub'] );
        if ( is_wp_error( $store ) ) {
            return $store;
        }

        global $wpdb;
        $t   = self::carts_table();
        $sid = $store['id'];

        $total     = (int)   $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*)                               FROM {$t} WHERE store_id = %s", $sid ) );
        $recovered = (int)   $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*)                               FROM {$t} WHERE store_id = %s AND status = 'recovered'", $sid ) );
        $revenue   = (float) $wpdb->get_var( $wpdb->prepare( "SELECT COALESCE(SUM(cart_total), 0)           FROM {$t} WHERE store_id = %s AND status = 'recovered'", $sid ) );
        $emailed   = (int)   $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*)                               FROM {$t} WHERE store_id = %s AND email_sent_at IS NOT NULL", $sid ) );

        return [
            'totalCarts'       => $total,
            'abandonedCarts'   => $total - $recovered,
            'recoveredCarts'   => $recovered,
            'revenueRecovered' => $revenue,
            'recoveryRate'     => $total ? round( $recovered / $total * 100 ) : 0,
            'emailSent'        => $emailed,
            'whatsappSent'     => 0,
            'smsSent'          => 0,
            'messagesSent'     => $emailed,
        ];
    }

    // ── Webhook handlers ──────────────────────────────────────────────────────

    public static function route_webhook_cart( WP_REST_Request $req ) {
        $store_id = $req->get_param( 'storeId' );
        $store    = self::get_store_by_id( $store_id );

        if ( ! $store ) {
            return new WP_Error( 'not_found', 'Store not found', [ 'status' => 404 ] );
        }

        $sig      = $req->get_header( 'x-ab-signature' );
        $raw_body = $req->get_body();
        if ( $sig && ! hash_equals( hash_hmac( 'sha256', $raw_body, $store['webhook_secret'] ), $sig ) ) {
            return new WP_Error( 'invalid_signature', 'Invalid signature', [ 'status' => 401 ] );
        }

        $data       = $req->get_json_params() ?? [];
        $session_id = sanitize_text_field( $data['sessionId'] ?? '' );
        if ( ! $session_id ) {
            return new WP_Error( 'invalid', 'sessionId is required', [ 'status' => 400 ] );
        }

        global $wpdb;
        $table    = self::carts_table();
        $existing = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM {$table} WHERE store_id = %s AND session_id = %s",
            $store_id, $session_id
        ) );

        $row = [
            'store_id'      => $store_id,
            'session_id'    => $session_id,
            'email'         => sanitize_email( $data['customerEmail'] ?? '' ) ?: null,
            'name'          => sanitize_text_field( $data['customerName']  ?? '' ) ?: null,
            'phone'         => sanitize_text_field( $data['customerPhone'] ?? '' ) ?: null,
            'cart_items'    => wp_json_encode( $data['cartItems'] ?? [] ),
            'cart_total'    => (float) ( $data['cartTotal'] ?? 0 ),
            'last_activity' => current_time( 'mysql' ),
        ];

        if ( $existing ) {
            $wpdb->update( $table, $row, [ 'store_id' => $store_id, 'session_id' => $session_id ] );
        } else {
            $row['status'] = 'abandoned';
            $wpdb->insert( $table, $row );
        }

        return [ 'ok' => true ];
    }

    public static function route_webhook_order( WP_REST_Request $req ) {
        $store_id = $req->get_param( 'storeId' );
        $store    = self::get_store_by_id( $store_id );

        if ( ! $store ) {
            return new WP_Error( 'not_found', 'Store not found', [ 'status' => 404 ] );
        }

        $data       = $req->get_json_params() ?? [];
        $session_id = sanitize_text_field( $data['sessionId'] ?? '' );

        if ( $session_id ) {
            global $wpdb;
            $wpdb->update(
                self::carts_table(),
                [ 'status' => 'recovered', 'recovered_at' => current_time( 'mysql' ) ],
                [ 'store_id' => $store_id, 'session_id' => $session_id ]
            );
        }

        return [ 'ok' => true ];
    }

    // ── Plugin handlers ───────────────────────────────────────────────────────

    public static function route_plugin_info() {
        $version = defined( 'AB_VERSION' ) ? AB_VERSION : '1.0.0';
        return [
            'name'         => 'Abandonment Buddy for WooCommerce',
            'slug'         => 'abandonment-buddy',
            'version'      => $version,
            'download_url' => "https://github.com/q8235828-byte/abandonment-buddy/releases/download/v{$version}/abandonment-buddy.zip",
            'requires'     => '5.8',
            'requires_php' => '7.0',
            'tested_up_to' => '6.7',
            'last_updated' => gmdate( 'Y-m-d' ),
            'author'       => 'Abandonment Buddy',
            'homepage'     => 'https://knowlity.org',
        ];
    }

    public static function route_email_step( WP_REST_Request $req ) {
        $api_key  = $req->get_header( 'x-ab-api-key' );
        $store_id = $req->get_header( 'x-ab-store-id' );
        $data     = $req->get_json_params() ?? [];

        if ( ! $api_key || ! $store_id ) {
            return new WP_Error( 'invalid', 'Missing x-ab-api-key or x-ab-store-id header', [ 'status' => 400 ] );
        }

        $store = self::get_store_by_id( $store_id );
        if ( ! $store || $store['api_key'] !== $api_key ) {
            return new WP_Error( 'invalid_credentials', 'Invalid credentials', [ 'status' => 401 ] );
        }

        $session_id = sanitize_text_field( $data['session_id'] ?? '' );
        $step       = (int) ( $data['step'] ?? 0 );

        if ( ! $session_id || $step < 1 || $step > 3 ) {
            return new WP_Error( 'invalid', 'session_id and step (1-3) are required', [ 'status' => 400 ] );
        }

        $fields = [ 1 => 'email_sent_at', 2 => 'email_2_sent_at', 3 => 'email_3_sent_at' ];
        $field  = $fields[ $step ];

        global $wpdb;
        $wpdb->update(
            self::carts_table(),
            [ $field => current_time( 'mysql' ) ],
            [ 'store_id' => $store_id, 'session_id' => $session_id ]
        );

        return [ 'ok' => true, 'field' => $field ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static function get_store_by_id( string $id ): ?array {
        global $wpdb;
        $row = $wpdb->get_row( $wpdb->prepare(
            'SELECT * FROM ' . self::stores_table() . ' WHERE id = %s',
            $id
        ), ARRAY_A );
        return $row ?: null;
    }

    private static function get_store_for_user( string $id, int $user_id ) {
        global $wpdb;
        $store = $wpdb->get_row( $wpdb->prepare(
            'SELECT * FROM ' . self::stores_table() . ' WHERE id = %s AND user_id = %d',
            $id, $user_id
        ), ARRAY_A );
        if ( ! $store ) {
            return new WP_Error( 'not_found', 'Store not found', [ 'status' => 404 ] );
        }
        return $store;
    }

    private static function format_store( array $store ): array {
        return [
            'id'            => $store['id'],
            'name'          => $store['name'],
            'url'           => $store['url'],
            'apiKey'        => $store['api_key'],
            'apiSecret'     => $store['api_secret'],
            'webhookSecret' => $store['webhook_secret'],
            'createdAt'     => $store['created_at'],
        ];
    }
}

AB_API::init();
