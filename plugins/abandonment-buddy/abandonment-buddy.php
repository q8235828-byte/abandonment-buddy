<?php
/**
 * Plugin Name: Abandonment Buddy for WooCommerce
 * Plugin URI:  https://abandonmentbuddy.com
 * Description: Tracks WooCommerce cart sessions, stores them locally, and syncs to Abandonment Buddy for recovery.
 * Version:     1.6.0
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

define( 'AB_VERSION',    '1.6.0' );
define( 'AB_OPTION_KEY', 'abandonment_buddy_settings' );
define( 'AB_CRON_HOOK',  'abandonment_buddy_sync' );
define( 'AB_DB_VERSION', '1.3' );

require_once __DIR__ . '/rest-api.php';

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
    delete_site_transient( 'update_plugins' );

    // Write a must-use plugin so FS_METHOD=direct is set before regular plugins
    // load — this lets WordPress delete/replace plugin files without FTP prompts.
    $mu_dir  = WP_CONTENT_DIR . '/mu-plugins';
    $mu_file = $mu_dir . '/ab-fs-method.php';
    if ( ! file_exists( $mu_file ) ) {
        if ( ! is_dir( $mu_dir ) ) {
            @mkdir( $mu_dir, 0755, true );
        }
        @file_put_contents( $mu_file, "<?php\n// Written by Abandonment Buddy — ensures WordPress can install/delete plugins without FTP.\nif ( ! defined( 'FS_METHOD' ) ) { define( 'FS_METHOD', 'direct' ); }\n" );
    }
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

        $sql = "CREATE TABLE {$table} (
            id            BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            session_id    VARCHAR(255)        NOT NULL,
            email         VARCHAR(255)        DEFAULT NULL,
            name          VARCHAR(255)        DEFAULT NULL,
            phone         VARCHAR(255)        DEFAULT NULL,
            cart_items    LONGTEXT            DEFAULT NULL,
            cart_total    DECIMAL(10,2)       NOT NULL DEFAULT 0.00,
            status        VARCHAR(50)         NOT NULL DEFAULT 'pending',
            last_activity DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            synced_at      DATETIME            DEFAULT NULL,
            email_sent_at  DATETIME            DEFAULT NULL,
            email_2_sent_at DATETIME           DEFAULT NULL,
            email_3_sent_at DATETIME           DEFAULT NULL,
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

    /**
     * Get carts ready for follow-up email N (1, 2, or 3).
     *
     * Email 1: sent after $delay minutes of no activity.
     * Email 2: sent $delay minutes after email 1 was sent.
     * Email 3: sent $delay minutes after email 2 was sent.
     */
    public static function get_carts_for_followup( $step = 1, $delay_minutes = 60 ) {
        global $wpdb;
        $table = self::table();

        $base = "email IS NOT NULL AND email != '' AND cart_total > 0 AND status IN ('pending','synced')";

        if ( $step === 1 ) {
            $sql = $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE {$base}
                   AND email_sent_at IS NULL
                   AND last_activity < DATE_SUB( NOW(), INTERVAL %d MINUTE )
                 ORDER BY last_activity ASC LIMIT 20",
                $delay_minutes
            );
        } elseif ( $step === 2 ) {
            $sql = $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE {$base}
                   AND email_sent_at IS NOT NULL
                   AND email_2_sent_at IS NULL
                   AND email_sent_at < DATE_SUB( NOW(), INTERVAL %d MINUTE )
                 ORDER BY email_sent_at ASC LIMIT 20",
                $delay_minutes
            );
        } else {
            $sql = $wpdb->prepare(
                "SELECT * FROM {$table}
                 WHERE {$base}
                   AND email_2_sent_at IS NOT NULL
                   AND email_3_sent_at IS NULL
                   AND email_2_sent_at < DATE_SUB( NOW(), INTERVAL %d MINUTE )
                 ORDER BY email_2_sent_at ASC LIMIT 20",
                $delay_minutes
            );
        }

        return $wpdb->get_results( $sql, ARRAY_A );
    }

    public static function mark_email_sent( $step, $session_id ) {
        global $wpdb;
        $col = $step === 1 ? 'email_sent_at' : ( $step === 2 ? 'email_2_sent_at' : 'email_3_sent_at' );
        $wpdb->update(
            self::table(),
            [ $col => current_time( 'mysql' ) ],
            [ 'session_id' => $session_id ]
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
        add_action( 'admin_post_ab_cleanup',        [ $this, 'handle_cleanup' ] );
        add_action( 'admin_post_ab_test_email',     [ $this, 'handle_test_email' ] );

        if ( empty( $this->settings['store_id'] ) || empty( $this->settings['webhook_secret'] ) ) {
            return;
        }

        // Only capture at checkout when all billing fields are filled
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

    private function build_cart_data( $session_id, $email = '', $name = null, $phone = null ) {
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

        // Sum item totals (tax-inclusive) so cartTotal is always consistent with displayed item rows.
        $cart_total = array_sum( array_column( $items, 'total' ) );

        return [
            'sessionId'     => $session_id,
            'customerEmail' => $email ?: null,
            'customerName'  => $name,
            'customerPhone' => $phone,
            'cartItems'     => $items,
            'cartTotal'     => $cart_total,
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

    // ── Checkout capture ─────────────────────────────────────────────────────
    // Only fires when the user is on the checkout page and updates a field.
    // We require email + first name + last name + phone to all be present
    // before saving or pushing — no partial/anonymous captures.

    public function on_checkout_review( $post_data ) {
        if ( ! function_exists( 'WC' ) || ! WC()->session || ! WC()->cart ) {
            return;
        }

        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }

        $parsed = [];
        parse_str( $post_data, $parsed );

        $email      = sanitize_email( $parsed['billing_email']      ?? '' );
        $first_name = sanitize_text_field( $parsed['billing_first_name'] ?? '' );
        $last_name  = sanitize_text_field( $parsed['billing_last_name']  ?? '' );
        $phone      = sanitize_text_field( $parsed['billing_phone']      ?? '' );

        // All four fields must be filled before we capture anything
        if ( ! is_email( $email ) || ! $first_name || ! $last_name || ! $phone ) {
            return;
        }

        $name = trim( $first_name . ' ' . $last_name );
        $data = $this->build_cart_data( $session_id, $email, $name, $phone );

        if ( empty( $data['cartItems'] ) ) {
            return;
        }

        AB_DB::upsert( [
            'session_id' => $session_id,
            'email'      => $email,
            'name'       => $name,
            'phone'      => $phone,
            'cart_items' => wp_json_encode( $data['cartItems'] ),
            'cart_total' => $data['cartTotal'],
        ] );

        $this->push_to_api( $data );
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

    // ── Cron: push unsynced carts + send follow-up emails ────────────────────

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

        // Send follow-up emails for abandoned carts
        $this->send_followup_emails();
    }

    private function send_followup_emails() {
        // Enabled by default when connected; only skip when explicitly set to false in settings.
        if ( array_key_exists( 'followup_enabled', $this->settings ) && empty( $this->settings['followup_enabled'] ) ) {
            return;
        }
        // Nothing to do without a connected store.
        if ( empty( $this->settings['store_id'] ) || empty( $this->settings['webhook_secret'] ) ) {
            return;
        }

        // Email 1
        $delay1 = max( 1, (int) ( $this->settings['followup_delay'] ?? 60 ) );
        foreach ( AB_DB::get_carts_for_followup( 1, $delay1 ) as $row ) {
            $items = json_decode( $row['cart_items'] ?? '[]', true );
            if ( ! empty( $items ) && ! empty( $row['email'] ) ) {
                if ( $this->send_followup_email( 1, $row, $items ) ) {
                    AB_DB::mark_email_sent( 1, $row['session_id'] );
                    $this->notify_api_email_step( 1, $row['session_id'] );
                }
            }
        }

        // Email 2 (optional)
        $delay2 = (int) ( $this->settings['followup_delay_2'] ?? 0 );
        if ( $delay2 > 0 ) {
            foreach ( AB_DB::get_carts_for_followup( 2, $delay2 ) as $row ) {
                $items = json_decode( $row['cart_items'] ?? '[]', true );
                if ( ! empty( $items ) && ! empty( $row['email'] ) ) {
                    if ( $this->send_followup_email( 2, $row, $items ) ) {
                        AB_DB::mark_email_sent( 2, $row['session_id'] );
                        $this->notify_api_email_step( 2, $row['session_id'] );
                    }
                }
            }
        }

        // Email 3 (optional)
        $delay3 = (int) ( $this->settings['followup_delay_3'] ?? 0 );
        if ( $delay3 > 0 ) {
            foreach ( AB_DB::get_carts_for_followup( 3, $delay3 ) as $row ) {
                $items = json_decode( $row['cart_items'] ?? '[]', true );
                if ( ! empty( $items ) && ! empty( $row['email'] ) ) {
                    if ( $this->send_followup_email( 3, $row, $items ) ) {
                        AB_DB::mark_email_sent( 3, $row['session_id'] );
                        $this->notify_api_email_step( 3, $row['session_id'] );
                    }
                }
            }
        }
    }

    private function notify_api_email_step( $step, $session_id ) {
        $api_url  = rtrim( $this->settings['api_url']  ?? '', '/' );
        $api_key  = $this->settings['api_key']  ?? '';
        $store_id = $this->settings['store_id'] ?? '';
        if ( ! $api_url || ! $api_key || ! $store_id ) {
            return;
        }
        wp_remote_post( "{$api_url}/plugin/email-step", [
            'timeout'     => 10,
            'blocking'    => false,
            'headers'     => [
                'Content-Type'    => 'application/json',
                'x-ab-api-key'   => $api_key,
                'x-ab-store-id'  => $store_id,
            ],
            'body' => wp_json_encode( [ 'session_id' => $session_id, 'step' => $step ] ),
        ] );
    }

    /**
     * Hook PHPMailer to send via the configured SMTP credentials.
     * Returns true if SMTP is fully configured, false if wp_mail() default is used.
     */
    private function configure_smtp() {
        $host   = $this->settings['smtp_host']   ?? '';
        $port   = (int) ( $this->settings['smtp_port']   ?? 587 );
        $user   = $this->settings['smtp_user']   ?? '';
        $pass   = $this->settings['smtp_pass']   ?? '';
        $secure = $this->settings['smtp_secure'] ?? 'tls';

        if ( ! $host || ! $user || ! $pass ) {
            return false;
        }

        add_action( 'phpmailer_init', function ( $phpmailer ) use ( $host, $port, $user, $pass, $secure ) {
            $phpmailer->isSMTP();
            $phpmailer->Host       = $host;
            $phpmailer->SMTPAuth   = true;
            $phpmailer->Username   = $user;
            $phpmailer->Password   = $pass;
            $phpmailer->SMTPSecure = $secure;
            $phpmailer->Port       = $port;
        } );

        return true;
    }

    private function send_followup_email( $step, $cart, $cart_items ) {
        $to = $cart['email'];

        $base_subject = ! empty( $this->settings['followup_subject'] )
            ? $this->settings['followup_subject']
            : sprintf( __( 'You left something behind at %s', 'abandonment-buddy' ), get_bloginfo( 'name' ) );

        $subject = $step === 1 ? $base_subject : "Reminder #{$step}: {$base_subject}";

        $from_name  = ! empty( $this->settings['followup_from_name'] )
            ? $this->settings['followup_from_name']
            : get_bloginfo( 'name' );
        $from_email = ! empty( $this->settings['followup_from_email'] )
            ? $this->settings['followup_from_email']
            : get_option( 'admin_email' );

        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            "From: {$from_name} <{$from_email}>",
        ];

        $html = $this->build_followup_html( $step, $cart, $cart_items );

        $this->configure_smtp();
        return wp_mail( $to, $subject, $html, $headers );
    }

    public function handle_test_email() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_test_email' );

        $to = sanitize_email( $_POST['test_email_to'] ?? '' );
        if ( ! is_email( $to ) ) {
            $to = get_option( 'admin_email' );
        }

        $site = get_bloginfo( 'name' );
        $this->configure_smtp();

        $sent = wp_mail(
            $to,
            "Test email from {$site} (Abandonment Buddy)",
            '<html><body style="font-family:sans-serif;padding:32px;">
                <h2 style="color:#0f172a;">SMTP is working! ✓</h2>
                <p style="color:#475569;">This test email was sent by the Abandonment Buddy plugin on <strong>' . esc_html( $site ) . '</strong>.</p>
                <p style="color:#475569;">Your recovery emails will be delivered using these same SMTP settings.</p>
            </body></html>',
            [ 'Content-Type: text/html; charset=UTF-8' ]
        );

        $param = $sent ? 'test_sent=1' : 'test_failed=1';
        wp_redirect( admin_url( "admin.php?page=abandonment-buddy&tab=settings&{$param}" ) );
        exit;
    }

    private function build_followup_html( $step, $cart, $cart_items ) {
        $site_name    = get_bloginfo( 'name' );
        $checkout_url = function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : home_url( '/checkout/' );
        $first_name   = $cart['name'] ? explode( ' ', trim( $cart['name'] ) )[0] : 'there';
        $currency     = get_woocommerce_currency_symbol();
        $msg_key      = $step === 1 ? 'followup_message' : "followup_message_{$step}";
        $custom_msg   = ! empty( $this->settings[ $msg_key ] ) ? wpautop( esc_html( $this->settings[ $msg_key ] ) ) : '';
        $site_logo    = function_exists( 'get_custom_logo' ) ? get_custom_logo() : '';

        // Build items rows
        $items_html = '';
        foreach ( $cart_items as $item ) {
            $img = ! empty( $item['image'] )
                ? '<img src="' . esc_url( $item['image'] ) . '" width="48" height="48" style="border-radius:6px;object-fit:cover;vertical-align:middle;" alt="">'
                : '<div style="width:48px;height:48px;background:#f1f5f9;border-radius:6px;display:inline-block;"></div>';

            $total = number_format( (float) $item['total'], 2 );

            $items_html .= '
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
                    ' . $img . '
                </td>
                <td style="padding:12px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle;">
                    <strong style="color:#0f172a;font-size:14px;">' . esc_html( $item['name'] ) . '</strong><br>
                    <span style="color:#94a3b8;font-size:13px;">Qty: ' . (int) $item['quantity'] . '</span>
                </td>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9;vertical-align:middle;text-align:right;font-weight:700;color:#0f172a;white-space:nowrap;">
                    ' . $currency . $total . '
                </td>
            </tr>';
        }

        // Recalculate from items so legacy carts with mismatched cart_total are handled correctly.
        $items_sum       = array_sum( array_column( $cart_items, 'total' ) );
        $display_total   = $items_sum > 0 ? $items_sum : (float) $cart['cart_total'];
        $total_formatted = $currency . number_format( $display_total, 2 );

        return '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . esc_html( $site_name ) . '</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

    <!-- Header -->
    <tr><td style="background:#0f172a;padding:24px 32px;">
        <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">' . esc_html( $site_name ) . '</p>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:32px;">

        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
            Hi ' . esc_html( $first_name ) . ', you left something behind!
        </h1>
        <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
            You added items to your cart but didn\'t complete your purchase. Your cart is saved — pick up right where you left off.
        </p>

        ' . ( $custom_msg ? '<div style="margin-bottom:24px;color:#475569;font-size:14px;line-height:1.7;">' . $custom_msg . '</div>' : '' ) . '

        <!-- Cart items -->
        <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">Your Cart</p>
            <table width="100%" cellpadding="0" cellspacing="0">
                ' . $items_html . '
                <tr>
                    <td colspan="2" style="padding:14px 0 0;font-size:14px;font-weight:700;color:#64748b;">Total</td>
                    <td style="padding:14px 0 0;text-align:right;font-size:18px;font-weight:800;color:#0f172a;">' . $total_formatted . '</td>
                </tr>
            </table>
        </div>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
                <td style="background:#0f172a;border-radius:10px;padding:14px 32px;">
                    <a href="' . esc_url( $checkout_url ) . '" style="color:#fff;font-size:15px;font-weight:700;text-decoration:none;display:block;">Complete Your Purchase &rarr;</a>
                </td>
            </tr>
        </table>

        <p style="color:#94a3b8;font-size:13px;margin:0;">
            Or copy this link: <a href="' . esc_url( $checkout_url ) . '" style="color:#6366f1;">' . esc_url( $checkout_url ) . '</a>
        </p>

    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            You received this email because you started a checkout at <strong>' . esc_html( $site_name ) . '</strong>.<br>
            If you completed your purchase, please ignore this email.
        </p>
    </td></tr>

</table>
</td></tr>
</table>

</body>
</html>';
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
        delete_transient( 'ab_update_check' );      // allow fresh API fetch regardless of 1h cache
        delete_site_transient( 'update_plugins' );
        wp_update_plugins();
        wp_redirect( admin_url( 'update-core.php' ) );
        exit;
    }

    public function handle_cleanup() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_cleanup' );

        $current_dir = dirname( __FILE__ );
        $plugins_dir = WP_PLUGIN_DIR;
        $deleted     = 0;
        $failed      = 0;

        foreach ( glob( $plugins_dir . '/*/abandonment-buddy.php' ) as $file ) {
            $dir = dirname( $file );
            if ( $dir === $current_dir ) {
                continue; // skip the currently active plugin
            }
            if ( self::delete_dir( $dir ) ) {
                $deleted++;
            } else {
                $failed++;
            }
        }

        $msg = $deleted > 0 ? "cleanup_ok={$deleted}" : 'cleanup_none';
        if ( $failed > 0 ) {
            $msg .= "&cleanup_failed={$failed}";
        }
        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&' . $msg ) );
        exit;
    }

    private static function delete_dir( $dir ) {
        if ( ! is_dir( $dir ) ) {
            return true;
        }
        $files = array_diff( scandir( $dir ), [ '.', '..' ] );
        foreach ( $files as $file ) {
            $path = $dir . '/' . $file;
            is_dir( $path ) ? self::delete_dir( $path ) : @unlink( $path );
        }
        return @rmdir( $dir );
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

        // Follow-up email settings
        $settings['followup_enabled']    = ! empty( $_POST['followup_enabled'] );
        $settings['followup_delay']      = max( 1, (int) ( $_POST['followup_delay']   ?? 60 ) );
        $settings['followup_delay_2']    = max( 0, (int) ( $_POST['followup_delay_2'] ?? 0  ) );
        $settings['followup_delay_3']    = max( 0, (int) ( $_POST['followup_delay_3'] ?? 0  ) );
        $settings['followup_subject']    = sanitize_text_field( $_POST['followup_subject']     ?? '' );
        $settings['followup_from_name']  = sanitize_text_field( $_POST['followup_from_name']   ?? '' );
        $settings['followup_from_email'] = sanitize_email(      $_POST['followup_from_email']  ?? '' );
        $settings['followup_message']    = sanitize_textarea_field( $_POST['followup_message']   ?? '' );
        $settings['followup_message_2']  = sanitize_textarea_field( $_POST['followup_message_2'] ?? '' );
        $settings['followup_message_3']  = sanitize_textarea_field( $_POST['followup_message_3'] ?? '' );

        // SMTP settings
        $settings['smtp_host']   = sanitize_text_field( $_POST['smtp_host']   ?? '' );
        $settings['smtp_port']   = max( 1, (int) ( $_POST['smtp_port'] ?? 587 ) );
        $settings['smtp_user']   = sanitize_text_field( $_POST['smtp_user']   ?? '' );
        $settings['smtp_secure'] = in_array( $_POST['smtp_secure'] ?? '', [ 'tls', 'ssl', '' ], true )
            ? sanitize_text_field( $_POST['smtp_secure'] )
            : 'tls';
        if ( ! empty( $_POST['smtp_pass'] ) ) {
            $settings['smtp_pass'] = wp_unslash( $_POST['smtp_pass'] );
        }

        update_option( AB_OPTION_KEY, $settings );
        delete_site_transient( 'update_plugins' );
        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&saved=1&tab=settings' ) );
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

        // Set email defaults on first connect so wp_mail() recovery emails work out of the box.
        if ( ! isset( $settings['followup_delay'] ) )   $settings['followup_delay']   = 60;  // 1h after abandonment
        if ( ! isset( $settings['followup_delay_2'] ) ) $settings['followup_delay_2'] = 1440; // 24h (disabled until saved)
        if ( ! isset( $settings['followup_delay_3'] ) ) $settings['followup_delay_3'] = 0;    // off

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
        $cleanup_ok     = isset( $_GET['cleanup_ok'] )     ? (int) $_GET['cleanup_ok']     : 0;
        $cleanup_failed = isset( $_GET['cleanup_failed'] ) ? (int) $_GET['cleanup_failed'] : 0;
        $cleanup_none   = isset( $_GET['cleanup_none'] );
        $test_sent      = isset( $_GET['test_sent'] );
        $test_failed    = isset( $_GET['test_failed'] );
        $active_tab     = isset( $_GET['tab'] ) && $_GET['tab'] === 'settings' ? 'settings' : 'dashboard';

        // Detect duplicate installs
        $duplicates = [];
        foreach ( glob( WP_PLUGIN_DIR . '/*/abandonment-buddy.php' ) as $file ) {
            if ( dirname( $file ) !== dirname( __FILE__ ) ) {
                $duplicates[] = basename( dirname( $file ) );
            }
        }

        // Fetch live stats from API (authenticated by API key + store ID)
        $api_stats    = null;
        $stats_source = 'local';
        if ( ! empty( $s['api_url'] ) && ! empty( $s['api_key'] ) && ! empty( $s['store_id'] ) ) {
            $resp = wp_remote_get(
                rtrim( $s['api_url'], '/' ) . '/plugin/stats',
                [
                    'timeout' => 8,
                    'headers' => [
                        'X-AB-API-Key'  => $s['api_key'],
                        'X-AB-Store-ID' => $s['store_id'],
                    ],
                ]
            );
            if ( ! is_wp_error( $resp ) && 200 === (int) wp_remote_retrieve_response_code( $resp ) ) {
                $body = json_decode( wp_remote_retrieve_body( $resp ), true );
                if ( ! empty( $body ) && empty( $body['error'] ) ) {
                    $api_stats    = $body;
                    $stats_source = 'api';
                }
            }
        }

        // Fall back to local DB stats if API unreachable
        $all_carts = AB_DB::get_all_recent( 5000 );
        if ( $api_stats ) {
            $stat_total      = $api_stats['totalCarts']       ?? 0;
            $stat_abandoned  = $api_stats['abandonedCarts']   ?? 0;
            $stat_synced     = $api_stats['messagesSent']     ?? 0;
            $stat_recovered  = $api_stats['recoveredCarts']   ?? 0;
            $val_abandoned   = 0;
            $val_recovered   = $api_stats['revenueRecovered'] ?? 0;
            $recovery_rate   = $api_stats['recoveryRate']     ?? 0;
            $email_sent      = $api_stats['emailSent']        ?? 0;
            $whatsapp_sent   = $api_stats['whatsappSent']     ?? 0;
            $sms_sent        = $api_stats['smsSent']          ?? 0;
        } else {
            $stat_total = count( $all_carts );
            $stat_abandoned = 0; $stat_synced = 0; $stat_recovered = 0;
            $val_abandoned = 0; $val_recovered = 0;
            foreach ( $all_carts as $c ) {
                if ( $c['status'] === 'pending'   ) { $stat_abandoned++; $val_abandoned += (float) $c['cart_total']; }
                if ( $c['status'] === 'synced'    ) { $stat_synced++;                                                }
                if ( $c['status'] === 'recovered' ) { $stat_recovered++; $val_recovered += (float) $c['cart_total']; }
            }
            $recovery_rate = $stat_total > 0 ? round( ( $stat_recovered / $stat_total ) * 100 ) : 0;
            $email_sent = 0; $whatsapp_sent = 0; $sms_sent = 0;
        }

        $recent_carts = array_slice( $all_carts, 0, 20 );
        $is_connected = $connected || $just_connected;
        ?>

        <style>
        .ab-wrap { max-width: 1100px; }
        .ab-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #e2e8f0; }
        .ab-header-left { display:flex; align-items:center; gap:12px; }
        .ab-logo-badge { background:#0f172a; color:#fff; padding:6px 10px; border-radius:8px; font-size:14px; font-weight:700; }
        .ab-logo-name { font-size:20px; font-weight:700; color:#0f172a; }
        .ab-version-tag { background:#f1f5f9; color:#64748b; font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; }
        .ab-conn-badge { display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; padding:5px 12px; border-radius:20px; }
        .ab-conn-badge.connected { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
        .ab-conn-badge.disconnected { background:#fef9ec; color:#92400e; border:1px solid #fde68a; }
        .ab-conn-dot { width:7px; height:7px; border-radius:50%; }
        .ab-conn-badge.connected .ab-conn-dot { background:#22c55e; }
        .ab-conn-badge.disconnected .ab-conn-dot { background:#f59e0b; }

        .ab-tabs { display:flex; gap:2px; margin-bottom:24px; border-bottom:2px solid #e2e8f0; }
        .ab-tab { display:inline-block; padding:10px 20px; font-size:14px; font-weight:600; color:#64748b; text-decoration:none; border-bottom:2px solid transparent; margin-bottom:-2px; transition:color .15s; }
        .ab-tab:hover { color:#0f172a; }
        .ab-tab.active { color:#0f172a; border-bottom-color:#0f172a; }

        .ab-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
        .ab-stat-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; }
        .ab-stat-label { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; margin-bottom:8px; }
        .ab-stat-value { font-size:28px; font-weight:700; color:#0f172a; line-height:1; margin-bottom:4px; }
        .ab-stat-sub { font-size:12px; color:#64748b; }
        .ab-stat-card.amber .ab-stat-value { color:#d97706; }
        .ab-stat-card.blue  .ab-stat-value { color:#2563eb; }
        .ab-stat-card.green .ab-stat-value { color:#16a34a; }

        .ab-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:24px; margin-bottom:20px; }
        .ab-card-title { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748b; margin:0 0 16px; }
        .ab-carts-table { width:100%; border-collapse:collapse; font-size:13px; }
        .ab-carts-table th { text-align:left; padding:8px 10px; color:#94a3b8; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid #f1f5f9; }
        .ab-carts-table th:not(:first-child) { text-align:right; }
        .ab-carts-table td { padding:10px 10px; border-bottom:1px solid #f8fafc; vertical-align:middle; }
        .ab-carts-table td:not(:first-child) { text-align:right; }
        .ab-carts-table tr:last-child td { border-bottom:none; }
        .ab-badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .ab-badge-pending   { background:#fef3c7; color:#92400e; }
        .ab-badge-synced    { background:#dbeafe; color:#1d4ed8; }
        .ab-badge-recovered { background:#dcfce7; color:#15803d; }
        .ab-empty { text-align:center; padding:40px 0; color:#94a3b8; font-size:13px; }

        .ab-settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
        .ab-field { margin-bottom:16px; }
        .ab-label { display:block; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#64748b; margin-bottom:6px; }
        .ab-input { width:100%; padding:9px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:13px; box-sizing:border-box; color:#0f172a; }
        .ab-input:focus { outline:none; border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
        .ab-btn-primary { background:#0f172a; color:#fff; border:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:background .15s; }
        .ab-btn-primary:hover { background:#1e293b; }
        .ab-btn-secondary { background:#fff; color:#374151; border:1px solid #d1d5db; padding:9px 18px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background .15s; }
        .ab-btn-secondary:hover { background:#f9fafb; }
        .ab-btn-ghost { background:#f8fafc; color:#475569; border:1px solid #e2e8f0; padding:9px 18px; border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; width:100%; transition:background .15s; }
        .ab-btn-ghost:hover { background:#f1f5f9; }
        .ab-divider { border:none; border-top:1px solid #f1f5f9; margin:20px 0; }
        .ab-hint { font-size:12px; color:#94a3b8; margin-top:4px; }
        .ab-row { display:flex; gap:10px; align-items:center; }
        </style>

        <div class="wrap ab-wrap">

            <!-- Header -->
            <div class="ab-header">
                <div class="ab-header-left">
                    <span class="ab-logo-badge">AB</span>
                    <span class="ab-logo-name">Abandonment Buddy</span>
                    <span class="ab-version-tag">v<?php echo AB_VERSION; ?></span>
                </div>
                <span class="ab-conn-badge <?php echo $is_connected ? 'connected' : 'disconnected'; ?>">
                    <span class="ab-conn-dot"></span>
                    <?php echo $is_connected ? 'Connected &amp; Tracking' : 'Not Connected'; ?>
                </span>
            </div>

            <!-- Notices -->
            <?php if ( $saved ) : ?><div class="notice notice-success is-dismissible"><p>Settings saved.</p></div><?php endif; ?>
            <?php if ( $just_connected ) : ?><div class="notice notice-success is-dismissible"><p>Store connected successfully! Cart tracking is now active.</p></div><?php endif; ?>
            <?php if ( $cleanup_ok > 0 ) : ?><div class="notice notice-success is-dismissible"><p>Removed <?php echo $cleanup_ok; ?> duplicate plugin folder(s).</p></div><?php endif; ?>
            <?php if ( $cleanup_none ) : ?><div class="notice notice-info is-dismissible"><p>No duplicate plugin installations found.</p></div><?php endif; ?>
            <?php if ( $cleanup_failed > 0 ) : ?><div class="notice notice-error is-dismissible"><p>Could not delete <?php echo $cleanup_failed; ?> folder(s) — contact your host to remove old <code>abandonment-buddy</code> folders from <code>/wp-content/plugins/</code>.</p></div><?php endif; ?>
            <?php if ( ! empty( $duplicates ) ) : ?>
            <div class="notice notice-warning" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:12px 16px;">
                <p style="margin:0;"><strong><?php echo count( $duplicates ); ?> duplicate plugin folder(s) detected:</strong> <?php echo esc_html( implode( ', ', $duplicates ) ); ?></p>
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin:0;">
                    <?php wp_nonce_field( 'ab_cleanup' ); ?>
                    <input type="hidden" name="action" value="ab_cleanup">
                    <button type="submit" class="button button-primary" onclick="return confirm('Delete these old plugin folders?\n\n<?php echo esc_js( implode( '\n', $duplicates ) ); ?>')">Delete duplicate installs</button>
                </form>
            </div>
            <?php endif; ?>
            <?php if ( $error ) : ?><div class="notice notice-error is-dismissible"><p><?php echo esc_html( $error ); ?></p></div><?php endif; ?>
            <?php if ( $test_sent ) : ?><div class="notice notice-success is-dismissible"><p><strong>Test email sent!</strong> Check your inbox to confirm delivery.</p></div><?php endif; ?>
            <?php if ( $test_failed ) : ?><div class="notice notice-error is-dismissible"><p><strong>Test email failed.</strong> Check your SMTP credentials and that your host allows outbound SMTP on the configured port.</p></div><?php endif; ?>

            <!-- Tabs -->
            <div class="ab-tabs">
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=abandonment-buddy&tab=dashboard' ) ); ?>" class="ab-tab <?php echo $active_tab === 'dashboard' ? 'active' : ''; ?>">Dashboard</a>
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=abandonment-buddy&tab=settings' ) ); ?>"  class="ab-tab <?php echo $active_tab === 'settings'  ? 'active' : ''; ?>">Settings</a>
            </div>

            <?php if ( $active_tab === 'dashboard' ) : ?>

                <!-- Stats source badge -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <span style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">
                        <?php if ( $stats_source === 'api' ) : ?>
                            <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span> Live data from Abandonment Buddy</span>
                        <?php else : ?>
                            <span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;background:#f59e0b;border-radius:50%;display:inline-block;"></span> Local data (connect to see live stats)</span>
                        <?php endif; ?>
                    </span>
                </div>

                <!-- Stat cards -->
                <div class="ab-stat-grid">
                    <div class="ab-stat-card">
                        <div class="ab-stat-label">Total Carts</div>
                        <div class="ab-stat-value"><?php echo number_format( $stat_total ); ?></div>
                        <div class="ab-stat-sub">captured at checkout</div>
                    </div>
                    <div class="ab-stat-card amber">
                        <div class="ab-stat-label">Abandoned</div>
                        <div class="ab-stat-value"><?php echo number_format( $stat_abandoned ); ?></div>
                        <div class="ab-stat-sub"><?php echo $val_abandoned > 0 ? wc_price( $val_abandoned ) . ' at risk' : 'awaiting recovery'; ?></div>
                    </div>
                    <div class="ab-stat-card blue">
                        <div class="ab-stat-label">Messages Sent</div>
                        <div class="ab-stat-value"><?php echo number_format( $stat_synced ); ?></div>
                        <div class="ab-stat-sub">
                            <?php if ( $stats_source === 'api' ) : ?>
                                <?php echo $email_sent; ?> email &middot; <?php echo $whatsapp_sent; ?> WhatsApp &middot; <?php echo $sms_sent; ?> SMS
                            <?php else : ?>
                                synced to campaigns
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="ab-stat-card green">
                        <div class="ab-stat-label">Recovered</div>
                        <div class="ab-stat-value"><?php echo number_format( $stat_recovered ); ?></div>
                        <div class="ab-stat-sub"><?php echo wc_price( $val_recovered ); ?> &middot; <?php echo $recovery_rate; ?>% rate</div>
                    </div>
                </div>

                <!-- Recent carts table -->
                <div class="ab-card">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
                        <h3 class="ab-card-title" style="margin:0;">Recent Carts</h3>
                        <?php if ( ! empty( $s['api_url'] ) ) : ?>
                        <a href="<?php echo esc_url( rtrim( $s['api_url'], '/' ) ); ?>" target="_blank" style="font-size:12px;color:#6366f1;text-decoration:none;font-weight:600;">View full dashboard &rarr;</a>
                        <?php endif; ?>
                    </div>

                    <?php if ( empty( $recent_carts ) ) : ?>
                        <div class="ab-empty">No carts captured yet.<br>A cart is captured when a customer fills all checkout fields.</div>
                    <?php else : ?>
                        <table class="ab-carts-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Phone</th>
                                    <th>Cart Total</th>
                                    <th>Last Activity</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                            <?php foreach ( $recent_carts as $cart ) :
                                $badge_class = 'ab-badge-' . ( in_array( $cart['status'], ['pending','synced','recovered'] ) ? $cart['status'] : 'pending' );
                                $name = $cart['name'] ?: $cart['email'];
                                $name = $name ?: ( substr( $cart['session_id'], 0, 10 ) . '…' );
                            ?>
                                <tr>
                                    <td>
                                        <div style="font-weight:600;color:#0f172a;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><?php echo esc_html( $name ); ?></div>
                                        <?php if ( $cart['email'] ) : ?><div style="font-size:11px;color:#94a3b8;"><?php echo esc_html( $cart['email'] ); ?></div><?php endif; ?>
                                    </td>
                                    <td style="color:#475569;"><?php echo esc_html( $cart['phone'] ?? '—' ); ?></td>
                                    <td style="font-weight:700;"><?php echo wc_price( $cart['cart_total'] ); ?></td>
                                    <td style="color:#94a3b8;font-size:12px;"><?php echo esc_html( $cart['last_activity'] ?? '—' ); ?></td>
                                    <td><span class="ab-badge <?php echo $badge_class; ?>"><?php echo esc_html( ucfirst( $cart['status'] ) ); ?></span></td>
                                </tr>
                            <?php endforeach; ?>
                            </tbody>
                        </table>
                    <?php endif; ?>
                </div>

            <?php else : ?>

                <!-- Settings tab -->
                <div class="ab-settings-grid">

                    <!-- Left: connection form -->
                    <div>
                        <div class="ab-card">
                            <h3 class="ab-card-title">Connection Settings</h3>
                            <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                                <?php wp_nonce_field( 'ab_save_settings' ); ?>
                                <input type="hidden" name="action" value="ab_save">
                                <!-- carry over followup settings so they aren't wiped on connection save -->
                                <input type="hidden" name="followup_enabled"    value="<?php echo ! empty( $s['followup_enabled'] ) ? '1' : ''; ?>">
                                <input type="hidden" name="followup_delay"      value="<?php echo esc_attr( $s['followup_delay']      ?? 60 ); ?>">
                                <input type="hidden" name="followup_delay_2"    value="<?php echo esc_attr( $s['followup_delay_2']    ?? 0  ); ?>">
                                <input type="hidden" name="followup_delay_3"    value="<?php echo esc_attr( $s['followup_delay_3']    ?? 0  ); ?>">
                                <input type="hidden" name="followup_subject"    value="<?php echo esc_attr( $s['followup_subject']    ?? '' ); ?>">
                                <input type="hidden" name="followup_from_name"  value="<?php echo esc_attr( $s['followup_from_name']  ?? '' ); ?>">
                                <input type="hidden" name="followup_from_email" value="<?php echo esc_attr( $s['followup_from_email'] ?? '' ); ?>">
                                <input type="hidden" name="followup_message"    value="<?php echo esc_attr( $s['followup_message']    ?? '' ); ?>">
                                <input type="hidden" name="followup_message_2"  value="<?php echo esc_attr( $s['followup_message_2']  ?? '' ); ?>">
                                <input type="hidden" name="followup_message_3"  value="<?php echo esc_attr( $s['followup_message_3']  ?? '' ); ?>">

                                <?php
                                $fields = [
                                    'api_url'    => [ 'API URL',    'url',      'https://your-api.up.railway.app',  'Your Abandonment Buddy API base URL' ],
                                    'store_id'   => [ 'Store ID',   'text',     'cmq3bxx...',                       'Found in your dashboard under store settings' ],
                                    'api_key'    => [ 'API Key',    'text',     'ck_...',                           '' ],
                                    'api_secret' => [ 'API Secret', 'password', 'cs_...',                           '' ],
                                ];
                                foreach ( $fields as $name => [ $label, $type, $placeholder, $hint ] ) : ?>
                                <div class="ab-field">
                                    <label class="ab-label" for="ab_<?php echo esc_attr( $name ); ?>"><?php echo esc_html( $label ); ?></label>
                                    <input class="ab-input" type="<?php echo esc_attr( $type ); ?>"
                                           id="ab_<?php echo esc_attr( $name ); ?>"
                                           name="<?php echo esc_attr( $name ); ?>"
                                           value="<?php echo esc_attr( $s[ $name ] ?? '' ); ?>"
                                           placeholder="<?php echo esc_attr( $placeholder ); ?>">
                                    <?php if ( $hint ) : ?><p class="ab-hint"><?php echo esc_html( $hint ); ?></p><?php endif; ?>
                                </div>
                                <?php endforeach; ?>

                                <div class="ab-row" style="margin-top:20px;">
                                    <button type="submit" class="ab-btn-secondary">Save Settings</button>
                                </div>
                            </form>

                            <hr class="ab-divider">

                            <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                                <?php wp_nonce_field( 'ab_connect' ); ?>
                                <input type="hidden" name="action"     value="ab_connect">
                                <input type="hidden" name="api_url"    value="<?php echo esc_attr( $s['api_url']    ?? '' ); ?>">
                                <input type="hidden" name="store_id"   value="<?php echo esc_attr( $s['store_id']   ?? '' ); ?>">
                                <input type="hidden" name="api_key"    value="<?php echo esc_attr( $s['api_key']    ?? '' ); ?>">
                                <input type="hidden" name="api_secret" value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>">
                                <button type="submit" class="ab-btn-primary" style="width:100%;">Save &amp; Connect to Abandonment Buddy</button>
                                <p class="ab-hint" style="text-align:center;margin-top:8px;">Verifies credentials and activates live cart tracking</p>
                            </form>
                        </div>
                    </div>

                    <!-- Right: info + tools -->
                    <div>
                        <!-- Connection status -->
                        <div class="ab-card">
                            <h3 class="ab-card-title">Connection Status</h3>
                            <?php if ( $is_connected ) : ?>
                                <div style="display:flex;flex-direction:column;gap:10px;">
                                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                                        <span style="color:#64748b;font-weight:600;">Store ID</span>
                                        <code style="font-size:12px;"><?php echo esc_html( $s['store_id'] ?? '' ); ?></code>
                                    </div>
                                    <?php if ( ! empty( $s['connected_at'] ) ) : ?>
                                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                                        <span style="color:#64748b;font-weight:600;">Connected since</span>
                                        <span><?php echo esc_html( $s['connected_at'] ); ?></span>
                                    </div>
                                    <?php endif; ?>
                                    <div style="display:flex;justify-content:space-between;font-size:13px;">
                                        <span style="color:#64748b;font-weight:600;">Plugin version</span>
                                        <span>v<?php echo AB_VERSION; ?></span>
                                    </div>
                                </div>
                            <?php else : ?>
                                <p style="color:#94a3b8;font-size:13px;margin:0;">Not connected. Fill in your credentials on the left and click <strong>Save &amp; Connect</strong>.</p>
                            <?php endif; ?>
                        </div>

                        <!-- Tools -->
                        <div class="ab-card">
                            <h3 class="ab-card-title">Tools</h3>

                            <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-bottom:10px;">
                                <?php wp_nonce_field( 'ab_check_updates' ); ?>
                                <input type="hidden" name="action" value="ab_check_updates">
                                <button type="submit" class="ab-btn-ghost">Check for plugin updates</button>
                            </form>

                            <?php if ( ! empty( $duplicates ) ) : ?>
                            <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                                <?php wp_nonce_field( 'ab_cleanup' ); ?>
                                <input type="hidden" name="action" value="ab_cleanup">
                                <button type="submit" class="ab-btn-ghost" style="color:#dc2626;border-color:#fecaca;" onclick="return confirm('Delete old plugin folders?\n\n<?php echo esc_js( implode( '\n', $duplicates ) ); ?>')">Delete <?php echo count( $duplicates ); ?> duplicate install(s)</button>
                            </form>
                            <?php endif; ?>
                        </div>
                    </div>

                </div>

                <!-- Follow-up Email Settings -->
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:24px;">
                    <?php wp_nonce_field( 'ab_save_settings' ); ?>
                    <input type="hidden" name="action"     value="ab_save">
                    <input type="hidden" name="api_url"    value="<?php echo esc_attr( $s['api_url']    ?? '' ); ?>">
                    <input type="hidden" name="store_id"   value="<?php echo esc_attr( $s['store_id']   ?? '' ); ?>">
                    <input type="hidden" name="api_key"    value="<?php echo esc_attr( $s['api_key']    ?? '' ); ?>">
                    <input type="hidden" name="api_secret" value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>">

                    <div class="ab-card">
                        <h3 class="ab-card-title">Follow-up Email Sequence</h3>
                        <p class="ab-hint" style="margin-top:-4px;margin-bottom:16px;">Send up to 3 recovery emails per abandoned cart at different intervals. All emails use WordPress <code>wp_mail()</code>.</p>

                        <!-- Enable toggle -->
                        <div class="ab-field" style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:20px;">
                            <label class="ab-toggle" style="position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;">
                                <input type="checkbox" name="followup_enabled" value="1" <?php checked( ! array_key_exists( 'followup_enabled', $s ) || ! empty( $s['followup_enabled'] ) ); ?> style="opacity:0;width:0;height:0;position:absolute;">
                                <span class="ab-toggle-slider" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#cbd5e1;border-radius:24px;transition:.3s;"></span>
                            </label>
                            <div>
                                <div style="font-size:13px;font-weight:600;color:#0f172a;">Enable follow-up email sequence</div>
                                <div style="font-size:12px;color:#64748b;">Enabled emails send automatically every 5 minutes via WP cron</div>
                            </div>
                        </div>
                        <style>
                            .ab-toggle input:checked + .ab-toggle-slider { background: #14b8a6; }
                            .ab-toggle-slider::before { content:''; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:white; border-radius:50%; transition:.3s; }
                            .ab-toggle input:checked + .ab-toggle-slider::before { transform: translateX(20px); }
                        </style>

                        <!-- From / Subject (shared) -->
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px;">
                            <div class="ab-field">
                                <label class="ab-label" for="ab_followup_from_name">From name</label>
                                <input class="ab-input" type="text" id="ab_followup_from_name" name="followup_from_name"
                                       value="<?php echo esc_attr( $s['followup_from_name'] ?? '' ); ?>"
                                       placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_followup_from_email">From email</label>
                                <input class="ab-input" type="email" id="ab_followup_from_email" name="followup_from_email"
                                       value="<?php echo esc_attr( $s['followup_from_email'] ?? '' ); ?>"
                                       placeholder="<?php echo esc_attr( get_option( 'admin_email' ) ); ?>">
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_followup_subject">Subject line</label>
                                <input class="ab-input" type="text" id="ab_followup_subject" name="followup_subject"
                                       value="<?php echo esc_attr( $s['followup_subject'] ?? '' ); ?>"
                                       placeholder="You left something behind">
                                <p class="ab-hint">Email 2 &amp; 3 auto-prefix "Reminder #2:" etc.</p>
                            </div>
                        </div>

                        <!-- 3-step sequence rows -->
                        <?php
                        $steps = [
                            1 => [ 'label' => 'Email 1', 'color' => '#14b8a6', 'delay_key' => 'followup_delay',   'msg_key' => 'followup_message',   'delay_default' => 60, 'delay_hint' => 'Minutes after cart abandonment' ],
                            2 => [ 'label' => 'Email 2', 'color' => '#f59e0b', 'delay_key' => 'followup_delay_2', 'msg_key' => 'followup_message_2', 'delay_default' => 0,  'delay_hint' => 'Minutes after Email 1 (0 = disabled)' ],
                            3 => [ 'label' => 'Email 3', 'color' => '#6366f1', 'delay_key' => 'followup_delay_3', 'msg_key' => 'followup_message_3', 'delay_default' => 0,  'delay_hint' => 'Minutes after Email 2 (0 = disabled)' ],
                        ];
                        foreach ( $steps as $n => $step ) :
                            $delay_val = (int) ( $s[ $step['delay_key'] ] ?? $step['delay_default'] );
                            $msg_val   = $s[ $step['msg_key'] ] ?? '';
                        ?>
                        <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:12px;">
                            <div style="background:<?php echo esc_attr( $step['color'] ); ?>18;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:10px;">
                                <span style="background:<?php echo esc_attr( $step['color'] ); ?>;color:#fff;border-radius:50%;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;"><?php echo $n; ?></span>
                                <strong style="font-size:13px;color:#0f172a;"><?php echo esc_html( $step['label'] ); ?></strong>
                                <?php if ( $n > 1 && $delay_val === 0 ) : ?>
                                    <span style="margin-left:auto;font-size:11px;color:#94a3b8;font-weight:600;">DISABLED (delay = 0)</span>
                                <?php endif; ?>
                            </div>
                            <div style="padding:14px 16px;display:grid;grid-template-columns:180px 1fr;gap:14px;align-items:start;">
                                <div class="ab-field" style="margin:0;">
                                    <label class="ab-label" for="ab_<?php echo esc_attr( $step['delay_key'] ); ?>">Delay (minutes)</label>
                                    <input class="ab-input" type="number" id="ab_<?php echo esc_attr( $step['delay_key'] ); ?>"
                                           name="<?php echo esc_attr( $step['delay_key'] ); ?>"
                                           value="<?php echo esc_attr( $delay_val ); ?>"
                                           min="<?php echo $n === 1 ? 1 : 0; ?>" max="100080">
                                    <p class="ab-hint" style="margin-top:4px;"><?php echo esc_html( $step['delay_hint'] ); ?></p>
                                </div>
                                <div class="ab-field" style="margin:0;">
                                    <label class="ab-label" for="ab_<?php echo esc_attr( $step['msg_key'] ); ?>">Custom message (optional)</label>
                                    <textarea class="ab-input" id="ab_<?php echo esc_attr( $step['msg_key'] ); ?>"
                                              name="<?php echo esc_attr( $step['msg_key'] ); ?>"
                                              rows="2" style="resize:vertical;"
                                              placeholder="e.g. Use code COMEBACK10 for 10% off."><?php echo esc_textarea( $msg_val ); ?></textarea>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>

                        <div class="ab-row" style="margin-top:8px;">
                            <button type="submit" class="ab-btn-primary">Save Follow-up Settings</button>
                        </div>
                    </div>
                </form>

                <!-- SMTP Settings -->
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:24px;">
                    <?php wp_nonce_field( 'ab_save_settings' ); ?>
                    <input type="hidden" name="action"     value="ab_save">
                    <input type="hidden" name="api_url"    value="<?php echo esc_attr( $s['api_url']    ?? '' ); ?>">
                    <input type="hidden" name="store_id"   value="<?php echo esc_attr( $s['store_id']   ?? '' ); ?>">
                    <input type="hidden" name="api_key"    value="<?php echo esc_attr( $s['api_key']    ?? '' ); ?>">
                    <input type="hidden" name="api_secret" value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>">
                    <!-- carry follow-up settings so they aren't wiped -->
                    <input type="hidden" name="followup_enabled"    value="<?php echo ! empty( $s['followup_enabled'] ) ? '1' : ''; ?>">
                    <input type="hidden" name="followup_delay"      value="<?php echo esc_attr( $s['followup_delay']      ?? 60 ); ?>">
                    <input type="hidden" name="followup_delay_2"    value="<?php echo esc_attr( $s['followup_delay_2']    ?? 0  ); ?>">
                    <input type="hidden" name="followup_delay_3"    value="<?php echo esc_attr( $s['followup_delay_3']    ?? 0  ); ?>">
                    <input type="hidden" name="followup_subject"    value="<?php echo esc_attr( $s['followup_subject']    ?? '' ); ?>">
                    <input type="hidden" name="followup_from_name"  value="<?php echo esc_attr( $s['followup_from_name']  ?? '' ); ?>">
                    <input type="hidden" name="followup_from_email" value="<?php echo esc_attr( $s['followup_from_email'] ?? '' ); ?>">
                    <input type="hidden" name="followup_message"    value="<?php echo esc_attr( $s['followup_message']    ?? '' ); ?>">
                    <input type="hidden" name="followup_message_2"  value="<?php echo esc_attr( $s['followup_message_2']  ?? '' ); ?>">
                    <input type="hidden" name="followup_message_3"  value="<?php echo esc_attr( $s['followup_message_3']  ?? '' ); ?>">

                    <div class="ab-card">
                        <h3 class="ab-card-title">SMTP Email Delivery</h3>
                        <p class="ab-hint" style="margin-top:-4px;margin-bottom:20px;">
                            Configure SMTP so recovery emails are delivered reliably and avoid spam folders.
                            Leave blank to use WordPress default mail (not recommended).
                        </p>

                        <?php
                        $smtp_configured = ! empty( $s['smtp_host'] ) && ! empty( $s['smtp_user'] ) && ! empty( $s['smtp_pass'] );
                        if ( $smtp_configured ) :
                        ?>
                        <div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin-bottom:16px;">
                            <span style="width:6px;height:6px;background:#22c55e;border-radius:50%;display:inline-block;"></span>
                            SMTP configured — <?php echo esc_html( $s['smtp_host'] ); ?>:<?php echo (int) ( $s['smtp_port'] ?? 587 ); ?>
                        </div>
                        <?php else : ?>
                        <div style="display:inline-flex;align-items:center;gap:6px;background:#fef9ec;color:#92400e;border:1px solid #fde68a;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin-bottom:16px;">
                            <span style="width:6px;height:6px;background:#f59e0b;border-radius:50%;display:inline-block;"></span>
                            Not configured — using WordPress default mail
                        </div>
                        <?php endif; ?>

                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                            <div class="ab-field">
                                <label class="ab-label" for="ab_smtp_host">SMTP Host</label>
                                <input class="ab-input" type="text" id="ab_smtp_host" name="smtp_host"
                                       value="<?php echo esc_attr( $s['smtp_host'] ?? '' ); ?>"
                                       placeholder="smtp.gmail.com">
                                <p class="ab-hint">Gmail: smtp.gmail.com &middot; Outlook: smtp.office365.com</p>
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_smtp_port">Port</label>
                                <input class="ab-input" type="number" id="ab_smtp_port" name="smtp_port"
                                       value="<?php echo esc_attr( $s['smtp_port'] ?? 587 ); ?>"
                                       placeholder="587">
                                <p class="ab-hint">587 (TLS) &middot; 465 (SSL) &middot; 25 (plain)</p>
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_smtp_user">Username / Email</label>
                                <input class="ab-input" type="text" id="ab_smtp_user" name="smtp_user"
                                       value="<?php echo esc_attr( $s['smtp_user'] ?? '' ); ?>"
                                       placeholder="you@gmail.com">
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_smtp_pass">Password / App Password</label>
                                <input class="ab-input" type="password" id="ab_smtp_pass" name="smtp_pass"
                                       value="" placeholder="<?php echo ! empty( $s['smtp_pass'] ) ? '••••••••••••' : 'Enter password'; ?>">
                                <p class="ab-hint">Gmail: use a 16-char App Password (not your real password)</p>
                            </div>
                            <div class="ab-field">
                                <label class="ab-label" for="ab_smtp_secure">Encryption</label>
                                <select class="ab-input" id="ab_smtp_secure" name="smtp_secure">
                                    <option value="tls" <?php selected( ( $s['smtp_secure'] ?? 'tls' ), 'tls' ); ?>>TLS (recommended, port 587)</option>
                                    <option value="ssl" <?php selected( ( $s['smtp_secure'] ?? 'tls' ), 'ssl' ); ?>>SSL (port 465)</option>
                                    <option value=""    <?php selected( ( $s['smtp_secure'] ?? 'tls' ), ''    ); ?>>None (port 25)</option>
                                </select>
                            </div>
                        </div>

                        <div class="ab-row" style="margin-top:16px;flex-wrap:wrap;gap:10px;">
                            <button type="submit" class="ab-btn-primary">Save SMTP Settings</button>
                        </div>
                    </div>
                </form>

                <!-- Test Email -->
                <?php if ( ! empty( $s['smtp_host'] ) && ! empty( $s['smtp_user'] ) && ! empty( $s['smtp_pass'] ) ) : ?>
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:16px;">
                    <?php wp_nonce_field( 'ab_test_email' ); ?>
                    <input type="hidden" name="action" value="ab_test_email">
                    <div class="ab-card" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:200px;">
                            <label class="ab-label" for="ab_test_email_to">Send test email to</label>
                            <input class="ab-input" type="email" id="ab_test_email_to" name="test_email_to"
                                   value="<?php echo esc_attr( get_option( 'admin_email' ) ); ?>">
                        </div>
                        <div style="padding-top:20px;">
                            <button type="submit" class="ab-btn-secondary">Send Test Email</button>
                        </div>
                        <p class="ab-hint" style="width:100%;margin:0;">Sends a test message using your saved SMTP settings to confirm delivery works.</p>
                    </div>
                </form>
                <?php endif; ?>

            <?php endif; ?>

        </div>
        <?php
    }
}

// ── Auto-updater ─────────────────────────────────────────────────────────────
// Hooks into WordPress's native update mechanism so "Update available" appears
// in WP Admin whenever a new GitHub Release is published.

define( 'AB_GITHUB_REPO', 'q8235828-byte/abandonment-buddy' );

class AB_Updater {

    private $slug;    // abandonment-buddy/abandonment-buddy.php
    private $folder;  // abandonment-buddy
    private $version; // currently installed version

    public function __construct( $slug, $version ) {
        $this->slug    = $slug;
        $this->folder  = dirname( $slug );
        $this->version = $version;

        add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'inject_update' ] );
        add_filter( 'site_transient_update_plugins',         [ $this, 'inject_update' ] );
        add_filter( 'plugins_api',                           [ $this, 'plugin_info' ], 10, 3 );
        add_action( 'admin_init',                            [ $this, 'maybe_force_update_check' ] );
    }

    /**
     * Once per hour, check if a newer version exists and if so clear the
     * WordPress update transient so the badge appears on the very next
     * page load without needing a deactivate/reactivate cycle.
     */
    public function maybe_force_update_check() {
        if ( get_transient( 'ab_update_check' ) ) {
            return;
        }
        set_transient( 'ab_update_check', 1, HOUR_IN_SECONDS );

        $remote = $this->fetch_remote();
        if ( $remote && version_compare( $remote->version, $this->version, '>' ) ) {
            delete_site_transient( 'update_plugins' );
        }
    }

    /** Called by WordPress during its update check — inject our version if newer. */
    public function inject_update( $transient ) {
        if ( ! is_object( $transient ) || empty( $transient->checked ) ) {
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

        // Remove from no_update so WordPress doesn't suppress the badge
        unset( $transient->no_update[ $this->slug ] );

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

    /** Fetch latest release info from GitHub Releases (cached per request). */
    private function fetch_remote() {
        static $cache = null;
        if ( $cache !== null ) {
            return $cache === false ? null : $cache;
        }

        $response = wp_remote_get(
            'https://api.github.com/repos/' . AB_GITHUB_REPO . '/releases/latest',
            [
                'timeout'    => 8,
                'user-agent' => 'WordPress/' . get_bloginfo( 'version' ) . '; ' . get_bloginfo( 'url' ),
                'headers'    => [ 'Accept' => 'application/vnd.github+json' ],
            ]
        );

        if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
            $cache = false;
            return null;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ) );
        if ( ! $data || empty( $data->tag_name ) ) {
            $cache = false;
            return null;
        }

        // Find the plugin ZIP asset; fall back to GitHub's auto-generated zipball.
        $download_url = '';
        if ( ! empty( $data->assets ) ) {
            foreach ( $data->assets as $asset ) {
                if ( substr( $asset->name, -4 ) === '.zip' ) {
                    $download_url = $asset->browser_download_url;
                    break;
                }
            }
        }
        if ( ! $download_url && ! empty( $data->zipball_url ) ) {
            $download_url = $data->zipball_url;
        }

        $cache = (object) [
            'version'      => ltrim( $data->tag_name, 'v' ),
            'download_url' => $download_url,
            'requires'     => '5.8',
            'requires_php' => '7.4',
            'last_updated' => ! empty( $data->published_at ) ? gmdate( 'Y-m-d', strtotime( $data->published_at ) ) : '',
            'homepage'     => 'https://abandonmentbuddy.com',
            'changelog'    => ! empty( $data->body ) ? $data->body : '',
        ];

        return $cache;
    }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

add_action( 'plugins_loaded', function () {
    $instance = Abandonment_Buddy::get_instance();

    new AB_Updater( plugin_basename( __FILE__ ), AB_VERSION );
} );
