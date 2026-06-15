<?php
/**
 * Plugin Name: Abandonment Buddy for WooCommerce
 * Plugin URI:  https://abandonmentbuddy.com
 * Description: Tracks WooCommerce cart sessions, stores them locally, and syncs to Abandonment Buddy for recovery.
 * Version:     1.4.9
 * Author:      Abandonment Buddy
 * License:     GPL v2 or later
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 6.0
 * WC tested up to: 8.5
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Force direct filesystem access so WordPress can install updates without
// prompting for FTP credentials. Both the constant and the filter are set
// so it works regardless of which mechanism WordPress checks first.
if ( ! defined( 'FS_METHOD' ) ) {
    define( 'FS_METHOD', 'direct' );
}
add_filter( 'filesystem_method', function() { return 'direct'; } );

define( 'AB_VERSION',    '1.4.9' );
define( 'AB_OPTION_KEY', 'abandonment_buddy_settings' );
define( 'AB_CRON_HOOK',  'abandonment_buddy_sync' );
define( 'AB_DB_VERSION', '1.1' );

// ── Custom cron interval ─────────────────────────────────────────────────────

add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['ab_every_5_min'] = [
        'interval' => 300,
        'display'  => __( 'Every 5 Minutes' ),
    ];
    return $schedules;
} );

// ── Activation: create DB table ──────────────────────────────────────────────

register_activation_hook( __FILE__, function () {
    AB_DB::create_table();
    if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) {
        wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
    }
    // Force WordPress to re-check for plugin updates on next load.
    delete_site_transient( 'update_plugins' );
} );

register_deactivation_hook( __FILE__, function () {
    $ts = wp_next_scheduled( AB_CRON_HOOK );
    if ( $ts ) {
        wp_unschedule_event( $ts, AB_CRON_HOOK );
    }
} );

// ── Database helper ──────────────────────────────────────────────────────────

class AB_DB {

    public static function table() {
        global $wpdb;
        return $wpdb->prefix . 'ab_carts';
    }

    public static function create_table() {
        global $wpdb;
        $table      = self::table();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table} (
            id          BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id  VARCHAR(255)        NOT NULL,
            email       VARCHAR(255)        DEFAULT NULL,
            name        VARCHAR(255)        DEFAULT NULL,
            phone       VARCHAR(255)        DEFAULT NULL,
            cart_items  LONGTEXT            DEFAULT NULL,
            cart_total  DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
            status      VARCHAR(50)         NOT NULL DEFAULT 'pending',
            last_activity DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            synced_at   DATETIME            DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY session_id (session_id),
            KEY status (status),
            KEY last_activity (last_activity)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        update_option( 'ab_db_version', AB_DB_VERSION );
    }

    public static function upsert( $data ) {
        global $wpdb;
        $table = self::table();

        $existing = $wpdb->get_var(
            $wpdb->prepare( "SELECT id FROM {$table} WHERE session_id = %s", $data['session_id'] )
        );

        if ( $existing ) {
            $wpdb->update(
                $table,
                [
                    'email'         => $data['email']         ?? null,
                    'name'          => $data['name']          ?? null,
                    'phone'         => $data['phone']         ?? null,
                    'cart_items'    => $data['cart_items']    ?? null,
                    'cart_total'    => $data['cart_total']    ?? 0,
                    'last_activity' => current_time( 'mysql' ),
                ],
                [ 'session_id' => $data['session_id'] ]
            );
        } else {
            $wpdb->insert(
                $table,
                [
                    'session_id'    => $data['session_id'],
                    'email'         => $data['email']         ?? null,
                    'name'          => $data['name']          ?? null,
                    'phone'         => $data['phone']         ?? null,
                    'cart_items'    => $data['cart_items']    ?? null,
                    'cart_total'    => $data['cart_total']    ?? 0,
                    'status'        => 'pending',
                    'last_activity' => current_time( 'mysql' ),
                ]
            );
        }
    }

    public static function mark_recovered( $session_id ) {
        global $wpdb;
        $wpdb->update(
            self::table(),
            [ 'status' => 'recovered', 'synced_at' => current_time( 'mysql' ) ],
            [ 'session_id' => $session_id ]
        );
    }

    public static function mark_synced( $session_id ) {
        global $wpdb;
        $wpdb->update(
            self::table(),
            [ 'status' => 'synced', 'synced_at' => current_time( 'mysql' ) ],
            [ 'session_id' => $session_id ]
        );
    }

    public static function get_unsynced( $limit = 50 ) {
        global $wpdb;
        $table = self::table();
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE status = 'pending'
                   AND email IS NOT NULL
                   AND cart_total > 0
                   AND last_activity < DATE_SUB( NOW(), INTERVAL 5 MINUTE )
                 ORDER BY last_activity ASC
                 LIMIT %d",
                $limit
            ),
            ARRAY_A
        );
    }

    public static function get_all_recent( $limit = 100 ) {
        global $wpdb;
        $table = self::table();
        return $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$table} ORDER BY last_activity DESC LIMIT %d",
                $limit
            ),
            ARRAY_A
        );
    }
}

// ── Main plugin class ────────────────────────────────────────────────────────

class Abandonment_Buddy {

    private static $instance = null;
    private $settings        = [];

    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->settings = (array) get_option( AB_OPTION_KEY, [] );

        // Ensure DB table exists (handles manual plugin installs without activation hook)
        if ( get_option( 'ab_db_version' ) !== AB_DB_VERSION ) {
            AB_DB::create_table();
        }

        $this->init();
    }

    private function init() {
        add_action( 'admin_menu',                   [ $this, 'add_admin_page' ] );
        add_action( 'admin_post_ab_save',           [ $this, 'handle_save' ] );
        add_action( 'admin_post_ab_connect',        [ $this, 'handle_connect' ] );
        add_action( 'admin_post_ab_check_updates',  [ $this, 'handle_check_updates' ] );

        if ( empty( $this->settings['store_id'] ) || empty( $this->settings['webhook_secret'] ) ) {
            return;
        }

        // Cart events
        add_action( 'woocommerce_add_to_cart',            [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_updated',           [ $this, 'on_cart_change' ] );
        add_action( 'woocommerce_remove_cart_item',       [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_item_set_quantity', [ $this, 'on_cart_change' ], 10, 0 );

        // Capture email at checkout
        add_action( 'woocommerce_checkout_update_order_review', [ $this, 'on_checkout_review' ] );

        // Order completed
        add_action( 'woocommerce_checkout_order_created', [ $this, 'on_order_created' ], 10, 1 );
        add_action( 'woocommerce_payment_complete',       [ $this, 'on_payment_complete' ], 10, 1 );

        // JS email capture
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_checkout_script' ] );

        // Cron
        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) {
            wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        }
        add_action( AB_CRON_HOOK, [ $this, 'sync_pending_carts' ] );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function api_url( $path ) {
        return rtrim( $this->settings['api_url'] ?? '', '/' ) . $path;
    }

    private function sign( $body ) {
        return hash_hmac( 'sha256', $body, $this->settings['webhook_secret'] ?? '' );
    }

    private function session_key() {
        if ( ! function_exists( 'WC' ) || ! WC()->session ) {
            return '';
        }
        return (string) WC()->session->get_customer_id();
    }

    private function build_cart_data( $session_id, $email = '' ) {
        $cart  = WC()->cart;
        $items = [];

        foreach ( $cart->get_cart() as $item ) {
            $product = $item['data'];
            $items[] = [
                'id'       => $item['product_id'],
                'name'     => $product->get_name(),
                'quantity' => $item['quantity'],
                'price'    => (float) $product->get_price(),
                'total'    => (float) wc_get_price_including_tax( $product ) * $item['quantity'],
                'image'    => wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) ?: '',
            ];
        }

        $billing_email = $email ?: ( WC()->customer ? WC()->customer->get_billing_email() : '' );
        $first         = WC()->customer ? WC()->customer->get_billing_first_name() : '';
        $last          = WC()->customer ? WC()->customer->get_billing_last_name() : '';
        $phone         = WC()->customer ? WC()->customer->get_billing_phone() : '';

        return [
            'sessionId'     => $session_id,
            'customerEmail' => $billing_email ?: null,
            'customerName'  => trim( $first . ' ' . $last ) ?: null,
            'customerPhone' => $phone ?: null,
            'cartItems'     => $items,
            'cartTotal'     => (float) $cart->get_cart_contents_total(),
        ];
    }

    private function push_to_api( $payload ) {
        $store_id = $this->settings['store_id'] ?? '';
        if ( ! $store_id ) {
            return false;
        }

        $body = wp_json_encode( $payload );
        $sig  = $this->sign( $body );

        $response = wp_remote_post(
            $this->api_url( '/webhooks/cart-session/' . $store_id ),
            [
                'timeout'     => 10,
                'blocking'    => true,
                'headers'     => [
                    'Content-Type'   => 'application/json',
                    'X-AB-Signature' => $sig,
                ],
                'body'        => $body,
            ]
        );

        return ! is_wp_error( $response );
    }

    // ── Cart event handlers ───────────────────────────────────────────────────

    public function on_cart_change() {
        if ( ! function_exists( 'WC' ) || ! WC()->session || ! WC()->cart ) {
            return;
        }

        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }

        $data = $this->build_cart_data( $session_id );

        // 1. Save to local WordPress DB
        AB_DB::upsert( [
            'session_id' => $session_id,
            'email'      => $data['customerEmail'],
            'name'       => $data['customerName'],
            'phone'      => $data['customerPhone'],
            'cart_items' => wp_json_encode( $data['cartItems'] ),
            'cart_total' => $data['cartTotal'],
        ] );

        // 2. Push to API immediately (non-blocking)
        if ( ! empty( $data['cartItems'] ) ) {
            $body = wp_json_encode( $data );
            $sig  = $this->sign( $body );
            wp_remote_post(
                $this->api_url( '/webhooks/cart-session/' . ( $this->settings['store_id'] ?? '' ) ),
                [
                    'timeout'     => 5,
                    'blocking'    => false,
                    'headers'     => [
                        'Content-Type'   => 'application/json',
                        'X-AB-Signature' => $sig,
                    ],
                    'body'        => $body,
                ]
            );
        }
    }

    public function on_checkout_review( $post_data ) {
        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }

        $parsed = [];
        parse_str( $post_data, $parsed );
        $email = sanitize_email( $parsed['billing_email'] ?? '' );

        if ( $email && is_email( $email ) ) {
            $data = $this->build_cart_data( $session_id, $email );

            // Update local DB with email
            AB_DB::upsert( [
                'session_id' => $session_id,
                'email'      => $email,
                'name'       => $data['customerName'],
                'phone'      => $data['customerPhone'],
                'cart_items' => wp_json_encode( $data['cartItems'] ),
                'cart_total' => $data['cartTotal'],
            ] );

            // Push to API with email now captured
            $this->push_to_api( $data );
        }
    }

    // ── Order handlers ────────────────────────────────────────────────────────

    public function on_order_created( $order ) {
        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }
        $order->update_meta_data( '_ab_session_id', $session_id );
        $order->save();

        AB_DB::mark_recovered( $session_id );
        $this->send_order_completed( $session_id, $order->get_id(), (float) $order->get_total() );
    }

    public function on_payment_complete( $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }
        $session_id = $order->get_meta( '_ab_session_id' ) ?: '';
        if ( $session_id ) {
            AB_DB::mark_recovered( $session_id );
            $this->send_order_completed( $session_id, $order_id, (float) $order->get_total() );
        }
    }

    private function send_order_completed( $session_id, $order_id, $total ) {
        $store_id = $this->settings['store_id'] ?? '';
        if ( ! $store_id ) {
            return;
        }

        $payload = wp_json_encode( [
            'sessionId' => $session_id,
            'orderId'   => (string) $order_id,
            'cartTotal' => $total,
        ] );

        wp_remote_post(
            $this->api_url( '/webhooks/order-completed/' . $store_id ),
            [
                'timeout'     => 5,
                'blocking'    => false,
                'headers'     => [
                    'Content-Type'   => 'application/json',
                    'X-AB-Signature' => $this->sign( $payload ),
                ],
                'body'        => $payload,
            ]
        );
    }

    // ── Cron: push unsynced carts ─────────────────────────────────────────────

    public function sync_pending_carts() {
        $rows = AB_DB::get_unsynced( 50 );

        foreach ( $rows as $row ) {
            $cart_items = json_decode( $row['cart_items'] ?? '[]', true );
            if ( empty( $cart_items ) ) {
                continue;
            }

            $payload = [
                'sessionId'     => $row['session_id'],
                'customerEmail' => $row['email'],
                'customerName'  => $row['name'],
                'customerPhone' => $row['phone'],
                'cartItems'     => $cart_items,
                'cartTotal'     => (float) $row['cart_total'],
            ];

            $ok = $this->push_to_api( $payload );
            if ( $ok ) {
                AB_DB::mark_synced( $row['session_id'] );
            }
        }
    }

    // ── Checkout JS ───────────────────────────────────────────────────────────

    public function enqueue_checkout_script() {
        if ( ! is_checkout() ) {
            return;
        }
        wp_add_inline_script(
            'jquery',
            'jQuery(document).on("change blur", "#billing_email", function() {
                jQuery("body").trigger("update_checkout");
            });'
        );
    }

    // ── Admin page ────────────────────────────────────────────────────────────

    public function add_admin_page() {
        add_submenu_page(
            'woocommerce',
            'Abandonment Buddy',
            'Abandonment Buddy',
            'manage_options',
            'abandonment-buddy',
            [ $this, 'render_admin_page' ]
        );
    }

    public function handle_check_updates() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_check_updates' );
        delete_site_transient( 'update_plugins' );
        wp_update_plugins();
        wp_redirect( admin_url( 'update-core.php' ) );
        exit;
    }

    public function handle_save() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_save_settings' );

        $settings = (array) get_option( AB_OPTION_KEY, [] );
        $settings['api_url']    = esc_url_raw( trim( $_POST['api_url']    ?? '' ) );
        $settings['store_id']   = sanitize_text_field( trim( $_POST['store_id']   ?? '' ) );
        $settings['api_key']    = sanitize_text_field( trim( $_POST['api_key']    ?? '' ) );
        $settings['api_secret'] = sanitize_text_field( trim( $_POST['api_secret'] ?? '' ) );

        update_option( AB_OPTION_KEY, $settings );
        delete_site_transient( 'update_plugins' );
        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&saved=1' ) );
        exit;
    }

    public function handle_connect() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_connect' );

        $api_url    = esc_url_raw( trim( $_POST['api_url']    ?? '' ) );
        $store_id   = sanitize_text_field( trim( $_POST['store_id']   ?? '' ) );
        $api_key    = sanitize_text_field( trim( $_POST['api_key']    ?? '' ) );
        $api_secret = sanitize_text_field( trim( $_POST['api_secret'] ?? '' ) );

        $response = wp_remote_post(
            rtrim( $api_url, '/' ) . '/stores/connect',
            [
                'timeout' => 15,
                'headers' => [ 'Content-Type' => 'application/json' ],
                'body'    => wp_json_encode( [
                    'apiKey'    => $api_key,
                    'apiSecret' => $api_secret,
                ] ),
            ]
        );

        if ( is_wp_error( $response ) ) {
            $error = urlencode( $response->get_error_message() );
            wp_redirect( admin_url( "admin.php?page=abandonment-buddy&error={$error}" ) );
            exit;
        }

        $code = (int) wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        // Accept 200 or 201 (NestJS returns 201 for POST by default)
        if ( ( $code !== 200 && $code !== 201 ) || empty( $body['webhookSecret'] ) ) {
            $error = urlencode( $body['message'] ?? 'Connection failed. Check your credentials.' );
            wp_redirect( admin_url( "admin.php?page=abandonment-buddy&error={$error}" ) );
            exit;
        }

        $settings = (array) get_option( AB_OPTION_KEY, [] );
        $settings['api_url']        = $api_url;
        $settings['store_id']       = $body['storeId'] ?? $store_id;
        $settings['api_key']        = $api_key;
        $settings['api_secret']     = $api_secret;
        $settings['webhook_secret'] = $body['webhookSecret'];
        $settings['connected']      = true;
        $settings['connected_at']   = current_time( 'mysql' );

        update_option( AB_OPTION_KEY, $settings );

        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) {
            wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        }

        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&connected=1' ) );
        exit;
    }

    public function render_admin_page() {
        $s              = $this->settings;
        $connected      = ! empty( $s['connected'] );
        $saved          = isset( $_GET['saved'] );
        $just_connected = isset( $_GET['connected'] );
        $error          = isset( $_GET['error'] ) ? urldecode( $_GET['error'] ) : '';

        // Show local cart stats
        $recent_carts = AB_DB::get_all_recent( 10 );
        $cart_count   = count( AB_DB::get_all_recent( 1000 ) );
        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:10px;">
                <span style="background:#0f172a;color:#fff;padding:6px 10px;border-radius:8px;font-size:14px;font-weight:700;">AB</span>
                Abandonment Buddy
            </h1>

            <?php if ( $saved ) : ?>
                <div class="notice notice-success is-dismissible"><p>✅ Settings saved.</p></div>
            <?php endif; ?>

            <?php if ( $just_connected ) : ?>
                <div class="notice notice-success is-dismissible"><p>✅ Store connected successfully! Cart tracking is now active.</p></div>
            <?php endif; ?>

            <?php if ( $error ) : ?>
                <div class="notice notice-error is-dismissible"><p>❌ <?php echo esc_html( $error ); ?></p></div>
            <?php endif; ?>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:960px;margin-top:20px;">

                <!-- Left column -->
                <div>
                    <!-- Status banner -->
                    <?php $is_connected = $connected || $just_connected; ?>
                    <div style="background:<?php echo $is_connected ? '#f0fdf4' : '#fef9ec'; ?>;border:1px solid <?php echo $is_connected ? '#bbf7d0' : '#fde68a'; ?>;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
                        <span style="font-size:22px;"><?php echo $is_connected ? '🟢' : '🟡'; ?></span>
                        <div>
                            <strong style="font-size:15px;"><?php echo $is_connected ? 'Connected &amp; Tracking' : 'Not Connected'; ?></strong><br>
                            <span style="color:#64748b;font-size:12px;">
                                <?php if ( $is_connected ) {
                                    echo 'Store ID: <code>' . esc_html( $s['store_id'] ?? '' ) . '</code>';
                                    if ( ! empty( $s['connected_at'] ) ) {
                                        echo ' &nbsp;·&nbsp; Since: ' . esc_html( $s['connected_at'] );
                                    }
                                } else {
                                    echo 'Enter your credentials below and click Save &amp; Connect.';
                                } ?>
                            </span>
                        </div>
                    </div>

                    <!-- Settings form -->
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px;">
                        <h3 style="margin:0 0 14px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">Connection Settings</h3>
                        <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                            <?php wp_nonce_field( 'ab_save_settings' ); ?>
                            <input type="hidden" name="action" value="ab_save">
                            <table style="width:100%;border-collapse:collapse;">
                                <?php
                                $fields = [
                                    'api_url'    => [ 'API URL',    'url',      'https://your-api.up.railway.app' ],
                                    'store_id'   => [ 'Store ID',   'text',     'cmq3bxx...' ],
                                    'api_key'    => [ 'API Key',    'text',     'ck_...' ],
                                    'api_secret' => [ 'API Secret', 'password', 'cs_...' ],
                                ];
                                foreach ( $fields as $name => [ $label, $type, $placeholder ] ) :
                                ?>
                                <tr>
                                    <td style="padding:8px 0;width:100px;color:#374151;font-size:13px;font-weight:600;"><?php echo esc_html( $label ); ?></td>
                                    <td style="padding:8px 0;">
                                        <input type="<?php echo esc_attr( $type ); ?>"
                                               name="<?php echo esc_attr( $name ); ?>"
                                               value="<?php echo esc_attr( $s[ $name ] ?? '' ); ?>"
                                               placeholder="<?php echo esc_attr( $placeholder ); ?>"
                                               style="width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;">
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </table>
                            <div style="display:flex;gap:10px;margin-top:14px;">
                                <button type="submit" class="button button-secondary">Save Settings</button>
                            </div>
                        </form>
                    </div>

                    <!-- Connect form -->
                    <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                        <?php wp_nonce_field( 'ab_connect' ); ?>
                        <input type="hidden" name="action"     value="ab_connect">
                        <input type="hidden" name="api_url"    value="<?php echo esc_attr( $s['api_url']    ?? '' ); ?>">
                        <input type="hidden" name="store_id"   value="<?php echo esc_attr( $s['store_id']   ?? '' ); ?>">
                        <input type="hidden" name="api_key"    value="<?php echo esc_attr( $s['api_key']    ?? '' ); ?>">
                        <input type="hidden" name="api_secret" value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>">
                        <button type="submit" style="width:100%;background:#0f172a;color:#fff;border:none;padding:10px 0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
                            🔌 Save &amp; Connect to Abandonment Buddy
                        </button>
                        <p style="margin:6px 0 0;color:#94a3b8;font-size:12px;text-align:center;">Verifies credentials and activates live cart tracking</p>
                    </form>

                    <!-- Check for updates -->
                    <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:10px;">
                        <?php wp_nonce_field( 'ab_check_updates' ); ?>
                        <input type="hidden" name="action" value="ab_check_updates">
                        <button type="submit" style="width:100%;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:8px 0;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;">
                            🔄 Check for plugin updates
                        </button>
                    </form>
                </div>

                <!-- Right column: local cart DB -->
                <div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
                        <h3 style="margin:0 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;">
                            Local Cart Storage
                            <span style="float:right;background:#f1f5f9;color:#0f172a;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;"><?php echo (int) $cart_count; ?> total</span>
                        </h3>
                        <p style="color:#94a3b8;font-size:12px;margin:0 0 14px;">Carts saved in WordPress DB before syncing to your app.</p>

                        <?php if ( empty( $recent_carts ) ) : ?>
                            <p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px 0;">No carts tracked yet. Add a product to cart to test.</p>
                        <?php else : ?>
                            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                                <thead>
                                    <tr style="border-bottom:2px solid #e2e8f0;">
                                        <th style="text-align:left;padding:6px 4px;color:#64748b;">Customer</th>
                                        <th style="text-align:right;padding:6px 4px;color:#64748b;">Total</th>
                                        <th style="text-align:center;padding:6px 4px;color:#64748b;">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                <?php foreach ( $recent_carts as $cart ) :
                                    if ( $cart['status'] === 'recovered' ) {
                                        $status_color = '#10b981';
                                    } elseif ( $cart['status'] === 'synced' ) {
                                        $status_color = '#3b82f6';
                                    } else {
                                        $status_color = '#f59e0b';
                                    }
                                    $display_name = $cart['email'] ?: substr( $cart['session_id'], 0, 12 ) . '...';
                                ?>
                                    <tr style="border-bottom:1px solid #f1f5f9;">
                                        <td style="padding:7px 4px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="<?php echo esc_attr( $cart['email'] ?? '' ); ?>">
                                            <?php echo esc_html( $display_name ); ?>
                                        </td>
                                        <td style="padding:7px 4px;text-align:right;font-weight:600;">
                                            <?php echo wc_price( $cart['cart_total'] ); ?>
                                        </td>
                                        <td style="padding:7px 4px;text-align:center;">
                                            <span style="background:<?php echo esc_attr( $status_color ); ?>22;color:<?php echo esc_attr( $status_color ); ?>;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">
                                                <?php echo esc_html( ucfirst( $cart['status'] ) ); ?>
                                            </span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                                </tbody>
                            </table>
                        <?php endif; ?>
                    </div>

                    <!-- How it works -->
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;">
                        <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;">How it works</h3>
                        <ol style="margin:0;padding-left:16px;color:#475569;font-size:12px;line-height:2.2;">
                            <li>Cart changes → saved to WordPress DB instantly</li>
                            <li>Also pushed to your app API in real-time</li>
                            <li>Cron runs every 5 min → syncs any unsynced carts</li>
                            <li>Email captured when shopper reaches checkout</li>
                            <li>Order placed → cart marked as recovered</li>
                        </ol>
                    </div>
                </div>

            </div>
        </div>
        <?php
    }
}

// ── Auto-updater ─────────────────────────────────────────────────────────────
// Hooks into WordPress's native update mechanism so "Update available" appears
// in WP Admin whenever a new version is pushed to the Abandonment Buddy API.

class AB_Updater {

    private $slug;        // abandonment-buddy/abandonment-buddy.php
    private $folder;      // abandonment-buddy
    private $version;     // currently installed version
    private $update_url;  // API base URL for version checks

    public function __construct( $slug, $version, $update_url ) {
        $this->slug       = $slug;
        $this->folder     = dirname( $slug );
        $this->version    = $version;
        $this->update_url = rtrim( $update_url, '/' );

        add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'inject_update' ] );
        add_filter( 'plugins_api',                           [ $this, 'plugin_info' ], 10, 3 );
    }

    /** Called by WordPress during its update check — inject our version if newer. */
    public function inject_update( $transient ) {
        if ( empty( $transient->checked ) ) {
            return $transient;
        }

        $remote = $this->fetch_remote();
        if ( ! $remote || ! version_compare( $remote->version, $this->version, '>' ) ) {
            return $transient;
        }

        $transient->response[ $this->slug ] = (object) [
            'id'          => $this->slug,
            'slug'        => $this->folder,
            'plugin'      => $this->slug,
            'new_version' => $remote->version,
            'url'         => $remote->homepage ?? 'https://abandonmentbuddy.com',
            'package'     => $remote->download_url,
            'icons'       => [],
            'banners'     => [],
            'requires'    => $remote->requires     ?? '5.8',
            'tested'      => $remote->tested_up_to ?? '6.7',
            'requires_php'=> $remote->requires_php ?? '7.4',
        ];

        return $transient;
    }

    /** Provides plugin details for the "View version X.X details" lightbox. */
    public function plugin_info( $result, $action, $args ) {
        if ( 'plugin_information' !== $action || $args->slug !== $this->folder ) {
            return $result;
        }

        $remote = $this->fetch_remote();
        if ( ! $remote ) {
            return $result;
        }

        return (object) [
            'name'          => $remote->name          ?? 'Abandonment Buddy for WooCommerce',
            'slug'          => $this->folder,
            'version'       => $remote->version,
            'author'        => $remote->author        ?? 'Abandonment Buddy',
            'homepage'      => $remote->homepage      ?? 'https://abandonmentbuddy.com',
            'download_link' => $remote->download_url,
            'last_updated'  => $remote->last_updated  ?? '',
            'requires'      => $remote->requires      ?? '5.8',
            'requires_php'  => $remote->requires_php  ?? '7.4',
            'tested'        => $remote->tested_up_to  ?? '6.7',
            'sections'      => [
                'description' => 'Automatically track and recover abandoned WooCommerce carts via email, WhatsApp, and SMS.',
                'changelog'   => nl2br( $remote->changelog ?? '' ),
            ],
        ];
    }

    /** Fetch remote version info from the API (cached per request). */
    private function fetch_remote() {
        static $cache = null;
        if ( $cache !== null ) {
            return $cache === false ? null : $cache;
        }

        $url = $this->update_url . '/plugin/info';

        $response = wp_remote_get( $url, [
            'timeout'    => 8,
            'user-agent' => 'WordPress/' . get_bloginfo( 'version' ) . '; ' . get_bloginfo( 'url' ),
        ] );

        if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
            $cache = false;
            return null;
        }

        $body = json_decode( wp_remote_retrieve_body( $response ) );
        $cache = ( $body && ! empty( $body->version ) ) ? $body : false;
        return $cache === false ? null : $cache;
    }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

add_action( 'plugins_loaded', function () {
    $instance = Abandonment_Buddy::get_instance();

    // Boot auto-updater using the stored API URL (falls back to official URL).
    $settings   = (array) get_option( AB_OPTION_KEY, [] );
    $update_url = ! empty( $settings['api_url'] )
        ? $settings['api_url']
        : 'https://api.abandonmentbuddy.com';

    new AB_Updater( plugin_basename( __FILE__ ), AB_VERSION, $update_url );
} );
