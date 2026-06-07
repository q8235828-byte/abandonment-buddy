import { NextResponse } from 'next/server';

const PLUGIN_PHP = `<?php
/**
 * Plugin Name: Abandonment Buddy for WooCommerce
 * Plugin URI:  https://abandonmentbuddy.com
 * Description: Tracks WooCommerce cart sessions and syncs abandoned carts to Abandonment Buddy for email/SMS/WhatsApp recovery.
 * Version:     1.0.0
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

// ── Constants ────────────────────────────────────────────────────────────────

define( 'AB_VERSION',    '1.0.0' );
define( 'AB_OPTION_KEY', 'abandonment_buddy_settings' );
define( 'AB_CRON_HOOK',  'abandonment_buddy_sync' );

// ── Custom cron interval ─────────────────────────────────────────────────────

add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['ab_every_5_min'] = [
        'interval' => 300,
        'display'  => __( 'Every 5 Minutes' ),
    ];
    return $schedules;
} );

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
        $this->init();
    }

    // ── Initialise ────────────────────────────────────────────────────────────

    private function init() {
        // Admin
        add_action( 'admin_menu',            [ $this, 'add_admin_page' ] );
        add_action( 'admin_post_ab_save',    [ $this, 'handle_save' ] );
        add_action( 'admin_post_ab_connect', [ $this, 'handle_connect' ] );

        // Only hook WooCommerce events when the plugin is properly configured
        if ( empty( $this->settings['store_id'] ) || empty( $this->settings['webhook_secret'] ) ) {
            return;
        }

        // Cart events
        add_action( 'woocommerce_add_to_cart',    [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_updated',   [ $this, 'on_cart_change' ] );
        add_action( 'woocommerce_remove_cart_item',[ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_item_set_quantity', [ $this, 'on_cart_change' ], 10, 0 );

        // Capture email when checkout review refreshes
        add_action( 'woocommerce_checkout_update_order_review', [ $this, 'on_checkout_review' ] );

        // Order placed
        add_action( 'woocommerce_checkout_order_created', [ $this, 'on_order_created' ], 10, 1 );
        add_action( 'woocommerce_payment_complete',       [ $this, 'on_payment_complete' ], 10, 1 );

        // JS email capture on checkout page
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_checkout_script' ] );

        // WP-Cron
        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) {
            wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        }
        add_action( AB_CRON_HOOK, [ $this, 'flush_pending_sessions' ] );
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function api_url( string $path ): string {
        return rtrim( $this->settings['api_url'] ?? '', '/' ) . $path;
    }

    private function sign( string $body ): string {
        return hash_hmac( 'sha256', $body, $this->settings['webhook_secret'] ?? '' );
    }

    private function session_key(): string {
        if ( ! function_exists( 'WC' ) || ! WC()->session ) {
            return '';
        }
        return (string) WC()->session->get_customer_id();
    }

    private function build_cart_payload( string $session_id, string $email = '' ): array {
        $cart  = WC()->cart;
        $items = [];

        foreach ( $cart->get_cart() as $item_key => $item ) {
            $product  = $item['data'];
            $items[]  = [
                'id'       => $item['product_id'],
                'name'     => $product->get_name(),
                'quantity' => $item['quantity'],
                'price'    => (float) $product->get_price(),
                'total'    => (float) wc_get_price_including_tax( $product ) * $item['quantity'],
                'image'    => wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) ?: '',
            ];
        }

        // Try to get customer info from WC session / current user
        $billing_email = $email ?: WC()->customer->get_billing_email();
        $first         = WC()->customer->get_billing_first_name();
        $last          = WC()->customer->get_billing_last_name();
        $phone         = WC()->customer->get_billing_phone();

        return [
            'sessionId'     => $session_id,
            'customerEmail' => $billing_email ?: null,
            'customerName'  => trim( $first . ' ' . $last ) ?: null,
            'customerPhone' => $phone ?: null,
            'cartItems'     => $items,
            'cartTotal'     => (float) $cart->get_cart_total_without_tags(),
        ];
    }

    private function send_cart_session( array $payload ): bool {
        $store_id = $this->settings['store_id'] ?? '';
        if ( ! $store_id ) {
            return false;
        }

        $body = wp_json_encode( $payload );
        $sig  = $this->sign( $body );

        $response = wp_remote_post(
            $this->api_url( '/webhooks/cart-session/' . $store_id ),
            [
                'timeout' => 10,
                'headers' => [
                    'Content-Type'   => 'application/json',
                    'X-AB-Signature' => $sig,
                ],
                'body'    => $body,
            ]
        );

        return ! is_wp_error( $response );
    }

    private function send_order_completed( string $session_id, int $order_id, float $cart_total ): void {
        $store_id = $this->settings['store_id'] ?? '';
        if ( ! $store_id ) {
            return;
        }

        $payload = wp_json_encode( [
            'sessionId' => $session_id,
            'orderId'   => (string) $order_id,
            'cartTotal' => $cart_total,
        ] );

        $sig = $this->sign( $payload );

        wp_remote_post(
            $this->api_url( '/webhooks/order-completed/' . $store_id ),
            [
                'timeout'     => 10,
                'blocking'    => false,
                'headers'     => [
                    'Content-Type'   => 'application/json',
                    'X-AB-Signature' => $sig,
                ],
                'body'        => $payload,
            ]
        );
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

        // Debounce: store pending data, flush will send it
        $pending   = (array) get_transient( 'ab_pending_' . $session_id ) ?: [];
        $pending[] = $session_id;
        set_transient( 'ab_pending_' . $session_id, $pending, HOUR_IN_SECONDS );

        // Also try sending immediately (non-blocking)
        $payload = $this->build_cart_payload( $session_id );
        if ( ! empty( $payload['cartItems'] ) ) {
            $this->send_cart_session( $payload );
        }
    }

    // Checkout review fires when user types their email
    public function on_checkout_review( string $post_data ) {
        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }

        // Parse email from the POST data string sent by WooCommerce AJAX
        $parsed = [];
        parse_str( $post_data, $parsed );
        $email = sanitize_email( $parsed['billing_email'] ?? '' );

        if ( $email && is_email( $email ) ) {
            $payload = $this->build_cart_payload( $session_id, $email );
            $this->send_cart_session( $payload );
        }
    }

    // ── Order handlers ────────────────────────────────────────────────────────

    public function on_order_created( \\WC_Order $order ) {
        $session_id = $this->session_key();
        if ( ! $session_id ) {
            return;
        }
        $this->send_order_completed( $session_id, $order->get_id(), (float) $order->get_total() );
    }

    public function on_payment_complete( int $order_id ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }
        $session_id = $order->get_meta( '_ab_session_id' ) ?: '';
        if ( $session_id ) {
            $this->send_order_completed( $session_id, $order_id, (float) $order->get_total() );
        }
    }

    // ── Cron flush ────────────────────────────────────────────────────────────

    public function flush_pending_sessions() {
        if ( ! function_exists( 'WC' ) ) {
            return;
        }

        global $wpdb;

        // Find all ab_pending_* transients
        $rows = $wpdb->get_results(
            "SELECT option_name FROM {$wpdb->options}
             WHERE option_name LIKE '_transient_ab_pending_%'
             LIMIT 50"
        );

        foreach ( $rows as $row ) {
            $session_id = str_replace( '_transient_ab_pending_', '', $row->option_name );
            $data = get_transient( 'ab_pending_' . $session_id );

            if ( $data ) {
                // Session is still alive — we have a WC session object to work with
                // In cron context WC session may not be available, so we skip non-email sessions
                delete_transient( 'ab_pending_' . $session_id );
            }
        }
    }

    // ── Checkout JS ───────────────────────────────────────────────────────────

    public function enqueue_checkout_script() {
        if ( ! is_checkout() ) {
            return;
        }
        // Inline JS: capture billing_email changes and trigger WC update
        wp_add_inline_script(
            'jquery',
            'jQuery(document).on("change", "#billing_email", function() {
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

        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&saved=1' ) );
        exit;
    }

    public function handle_connect() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'Unauthorized' );
        }
        check_admin_referer( 'ab_connect' );

        $settings = (array) get_option( AB_OPTION_KEY, [] );

        $api_url    = esc_url_raw( trim( $_POST['api_url']    ?? '' ) );
        $store_id   = sanitize_text_field( trim( $_POST['store_id']   ?? '' ) );
        $api_key    = sanitize_text_field( trim( $_POST['api_key']    ?? '' ) );
        $api_secret = sanitize_text_field( trim( $_POST['api_secret'] ?? '' ) );

        // Call /stores/connect to verify credentials and get webhookSecret
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

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        $code = wp_remote_retrieve_response_code( $response );

        if ( $code !== 200 || empty( $body['webhookSecret'] ) ) {
            $error = urlencode( $body['message'] ?? 'Connection failed. Check your credentials.' );
            wp_redirect( admin_url( "admin.php?page=abandonment-buddy&error={$error}" ) );
            exit;
        }

        $settings['api_url']        = $api_url;
        $settings['store_id']       = $body['storeId'];
        $settings['api_key']        = $api_key;
        $settings['api_secret']     = $api_secret;
        $settings['webhook_secret'] = $body['webhookSecret'];
        $settings['connected']      = true;
        $settings['connected_at']   = current_time( 'mysql' );

        update_option( AB_OPTION_KEY, $settings );

        // Schedule cron
        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) {
            wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        }

        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&connected=1' ) );
        exit;
    }

    public function render_admin_page() {
        $s           = $this->settings;
        $connected   = ! empty( $s['connected'] );
        $saved       = isset( $_GET['saved'] );
        $just_connected = isset( $_GET['connected'] );
        $error       = isset( $_GET['error'] ) ? urldecode( $_GET['error'] ) : '';
        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:10px;">
                <span style="background:#0f172a;color:#fff;padding:6px 10px;border-radius:8px;font-size:14px;">AB</span>
                Abandonment Buddy
            </h1>

            <?php if ( $saved || $just_connected ) : ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php echo $just_connected ? '✅ Store connected successfully! Cart tracking is now active.' : '✅ Settings saved.'; ?></p>
                </div>
            <?php endif; ?>

            <?php if ( $error ) : ?>
                <div class="notice notice-error is-dismissible">
                    <p>❌ <?php echo esc_html( $error ); ?></p>
                </div>
            <?php endif; ?>

            <div style="max-width:680px;margin-top:20px;">

                <!-- Status banner -->
                <div style="background:<?php echo $connected ? '#f0fdf4' : '#fef9ec'; ?>;border:1px solid <?php echo $connected ? '#bbf7d0' : '#fde68a'; ?>;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;"><?php echo $connected ? '🟢' : '🟡'; ?></span>
                    <div>
                        <strong><?php echo $connected ? 'Connected' : 'Not connected'; ?></strong><br>
                        <span style="color:#64748b;font-size:13px;">
                            <?php if ( $connected ) {
                                echo 'Last connected: ' . esc_html( $s['connected_at'] ?? '' ) . ' &nbsp;·&nbsp; Store ID: ' . esc_html( $s['store_id'] ?? '' );
                            } else {
                                echo 'Enter your credentials below and click Connect.';
                            } ?>
                        </span>
                    </div>
                </div>

                <!-- Save settings form -->
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                    <?php wp_nonce_field( 'ab_save_settings' ); ?>
                    <input type="hidden" name="action" value="ab_save">

                    <table class="form-table" style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;">
                        <tr>
                            <th style="padding:12px 16px;width:160px;"><label for="api_url">API URL</label></th>
                            <td style="padding:12px 16px;">
                                <input type="url" id="api_url" name="api_url" class="regular-text"
                                    value="<?php echo esc_attr( $s['api_url'] ?? '' ); ?>"
                                    placeholder="https://your-api.com" required>
                                <p class="description">The base URL of your Abandonment Buddy API (no trailing slash).</p>
                            </td>
                        </tr>
                        <tr>
                            <th style="padding:12px 16px;"><label for="store_id">Store ID</label></th>
                            <td style="padding:12px 16px;">
                                <input type="text" id="store_id" name="store_id" class="regular-text code"
                                    value="<?php echo esc_attr( $s['store_id'] ?? '' ); ?>"
                                    placeholder="clxxxxxxxxxxxxxxx">
                                <p class="description">Found in Abandonment Buddy → Stores → Manage.</p>
                            </td>
                        </tr>
                        <tr>
                            <th style="padding:12px 16px;"><label for="api_key">API Key</label></th>
                            <td style="padding:12px 16px;">
                                <input type="text" id="api_key" name="api_key" class="regular-text code"
                                    value="<?php echo esc_attr( $s['api_key'] ?? '' ); ?>"
                                    placeholder="ck_...">
                            </td>
                        </tr>
                        <tr>
                            <th style="padding:12px 16px;"><label for="api_secret">API Secret</label></th>
                            <td style="padding:12px 16px;">
                                <input type="password" id="api_secret" name="api_secret" class="regular-text code"
                                    value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>"
                                    placeholder="cs_...">
                            </td>
                        </tr>
                    </table>

                    <p class="submit" style="display:flex;gap:10px;align-items:center;">
                        <?php submit_button( 'Save settings', 'secondary', 'submit', false ); ?>
                    </p>
                </form>

                <!-- Connect form -->
                <form method="POST" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
                    <?php wp_nonce_field( 'ab_connect' ); ?>
                    <input type="hidden" name="action"     value="ab_connect">
                    <input type="hidden" name="api_url"    value="<?php echo esc_attr( $s['api_url'] ?? '' ); ?>">
                    <input type="hidden" name="store_id"   value="<?php echo esc_attr( $s['store_id'] ?? '' ); ?>">
                    <input type="hidden" name="api_key"    value="<?php echo esc_attr( $s['api_key'] ?? '' ); ?>">
                    <input type="hidden" name="api_secret" value="<?php echo esc_attr( $s['api_secret'] ?? '' ); ?>">
                    <p>
                        <button type="submit" class="button button-primary" style="background:#0f172a;border-color:#0f172a;padding:6px 20px;">
                            🔌 Save &amp; Connect to Abandonment Buddy
                        </button>
                    </p>
                    <p style="color:#64748b;font-size:13px;">This verifies your credentials and activates live cart tracking.</p>
                </form>

                <!-- Help -->
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin-top:20px;">
                    <h3 style="margin:0 0 10px;">How it works</h3>
                    <ol style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:2;">
                        <li>Enter the API URL and credentials from your Abandonment Buddy store page.</li>
                        <li>Click <strong>Save &amp; Connect</strong> — the plugin verifies and activates tracking.</li>
                        <li>The plugin tracks cart sessions every time items are added or updated.</li>
                        <li>Email is captured when shoppers reach the checkout page.</li>
                        <li>When a cart goes cold for the configured timeout, Abandonment Buddy sends recovery messages.</li>
                        <li>When an order is completed, the cart is automatically marked as recovered.</li>
                    </ol>
                </div>

            </div>
        </div>
        <?php
    }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

add_action( 'plugins_loaded', function () {
    Abandonment_Buddy::get_instance();
} );

// ── Deactivation: clear cron ──────────────────────────────────────────────────

register_deactivation_hook( __FILE__, function () {
    $timestamp = wp_next_scheduled( AB_CRON_HOOK );
    if ( $timestamp ) {
        wp_unschedule_event( $timestamp, AB_CRON_HOOK );
    }
} );
`;

export async function GET() {
  return new NextResponse(PLUGIN_PHP, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="abandonment-buddy.php"',
      'Cache-Control': 'no-store',
    },
  });
}
