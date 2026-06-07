import { NextResponse } from 'next/server';
import JSZip from 'jszip';

const PHP = `<?php
/**
 * Plugin Name: Abandonment Buddy for WooCommerce
 * Plugin URI:  https://abandonmentbuddy.com
 * Description: Tracks WooCommerce cart sessions, stores them locally, and syncs to Abandonment Buddy for recovery.
 * Version:     1.1.0
 * Author:      Abandonment Buddy
 * License:     GPL v2 or later
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * WC requires at least: 6.0
 * WC tested up to: 8.5
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'AB_VERSION',    '1.1.0' );
define( 'AB_OPTION_KEY', 'abandonment_buddy_settings' );
define( 'AB_CRON_HOOK',  'abandonment_buddy_sync' );
define( 'AB_DB_VERSION', '1.1' );

add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['ab_every_5_min'] = [ 'interval' => 300, 'display' => __( 'Every 5 Minutes' ) ];
    return $schedules;
} );

register_activation_hook( __FILE__, function () {
    AB_DB::create_table();
    if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
} );

register_deactivation_hook( __FILE__, function () {
    $ts = wp_next_scheduled( AB_CRON_HOOK );
    if ( $ts ) wp_unschedule_event( $ts, AB_CRON_HOOK );
} );

class AB_DB {
    public static function table(): string { global $wpdb; return $wpdb->prefix . 'ab_carts'; }

    public static function create_table(): void {
        global $wpdb;
        $sql = "CREATE TABLE IF NOT EXISTS " . self::table() . " (
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
            PRIMARY KEY (id), UNIQUE KEY session_id (session_id), KEY status (status)
        ) " . $wpdb->get_charset_collate() . ";";
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );
        update_option( 'ab_db_version', AB_DB_VERSION );
    }

    public static function upsert( array $data ): void {
        global $wpdb; $table = self::table();
        $existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE session_id = %s", $data['session_id'] ) );
        if ( $existing ) {
            $wpdb->update( $table, [ 'email' => $data['email'] ?? null, 'name' => $data['name'] ?? null, 'phone' => $data['phone'] ?? null, 'cart_items' => $data['cart_items'] ?? null, 'cart_total' => $data['cart_total'] ?? 0, 'last_activity' => current_time( 'mysql' ) ], [ 'session_id' => $data['session_id'] ] );
        } else {
            $wpdb->insert( $table, [ 'session_id' => $data['session_id'], 'email' => $data['email'] ?? null, 'name' => $data['name'] ?? null, 'phone' => $data['phone'] ?? null, 'cart_items' => $data['cart_items'] ?? null, 'cart_total' => $data['cart_total'] ?? 0, 'status' => 'pending', 'last_activity' => current_time( 'mysql' ) ] );
        }
    }

    public static function mark_recovered( string $session_id ): void { global $wpdb; $wpdb->update( self::table(), [ 'status' => 'recovered', 'synced_at' => current_time( 'mysql' ) ], [ 'session_id' => $session_id ] ); }
    public static function mark_synced( string $session_id ): void { global $wpdb; $wpdb->update( self::table(), [ 'status' => 'synced', 'synced_at' => current_time( 'mysql' ) ], [ 'session_id' => $session_id ] ); }

    public static function get_unsynced( int $limit = 50 ): array {
        global $wpdb; $table = self::table();
        return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE status = 'pending' AND email IS NOT NULL AND cart_total > 0 AND last_activity < DATE_SUB( NOW(), INTERVAL 5 MINUTE ) ORDER BY last_activity ASC LIMIT %d", $limit ), ARRAY_A );
    }

    public static function get_all_recent( int $limit = 100 ): array {
        global $wpdb; $table = self::table();
        return $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} ORDER BY last_activity DESC LIMIT %d", $limit ), ARRAY_A );
    }
}

class Abandonment_Buddy {
    private static $instance = null;
    private $settings = [];

    public static function get_instance() { if ( null === self::$instance ) self::$instance = new self(); return self::$instance; }

    private function __construct() {
        $this->settings = (array) get_option( AB_OPTION_KEY, [] );
        if ( get_option( 'ab_db_version' ) !== AB_DB_VERSION ) AB_DB::create_table();
        $this->init();
    }

    private function init() {
        add_action( 'admin_menu', [ $this, 'add_admin_page' ] );
        add_action( 'admin_post_ab_save', [ $this, 'handle_save' ] );
        add_action( 'admin_post_ab_connect', [ $this, 'handle_connect' ] );
        if ( empty( $this->settings['store_id'] ) || empty( $this->settings['webhook_secret'] ) ) return;
        add_action( 'woocommerce_add_to_cart', [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_updated', [ $this, 'on_cart_change' ] );
        add_action( 'woocommerce_remove_cart_item', [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_cart_item_set_quantity', [ $this, 'on_cart_change' ], 10, 0 );
        add_action( 'woocommerce_checkout_update_order_review', [ $this, 'on_checkout_review' ] );
        add_action( 'woocommerce_checkout_order_created', [ $this, 'on_order_created' ], 10, 1 );
        add_action( 'woocommerce_payment_complete', [ $this, 'on_payment_complete' ], 10, 1 );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_checkout_script' ] );
        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        add_action( AB_CRON_HOOK, [ $this, 'sync_pending_carts' ] );
    }

    private function api_url( string $path ): string { return rtrim( $this->settings['api_url'] ?? '', '/' ) . $path; }
    private function sign( string $body ): string { return hash_hmac( 'sha256', $body, $this->settings['webhook_secret'] ?? '' ); }
    private function session_key(): string { if ( ! function_exists( 'WC' ) || ! WC()->session ) return ''; return (string) WC()->session->get_customer_id(); }

    private function build_cart_data( string $session_id, string $email = '' ): array {
        $cart = WC()->cart; $items = [];
        foreach ( $cart->get_cart() as $item ) {
            $product = $item['data'];
            $items[] = [ 'id' => $item['product_id'], 'name' => $product->get_name(), 'quantity' => $item['quantity'], 'price' => (float) $product->get_price(), 'total' => (float) wc_get_price_including_tax( $product ) * $item['quantity'], 'image' => wp_get_attachment_image_url( $product->get_image_id(), 'thumbnail' ) ?: '' ];
        }
        $billing_email = $email ?: ( WC()->customer ? WC()->customer->get_billing_email() : '' );
        return [ 'sessionId' => $session_id, 'customerEmail' => $billing_email ?: null, 'customerName' => trim( ( WC()->customer ? WC()->customer->get_billing_first_name() : '' ) . ' ' . ( WC()->customer ? WC()->customer->get_billing_last_name() : '' ) ) ?: null, 'customerPhone' => WC()->customer ? WC()->customer->get_billing_phone() : null, 'cartItems' => $items, 'cartTotal' => (float) $cart->get_cart_contents_total() ];
    }

    private function push_to_api( array $payload ): bool {
        $store_id = $this->settings['store_id'] ?? ''; if ( ! $store_id ) return false;
        $body = wp_json_encode( $payload ); $sig = $this->sign( $body );
        $response = wp_remote_post( $this->api_url( '/webhooks/cart-session/' . $store_id ), [ 'timeout' => 10, 'blocking' => true, 'headers' => [ 'Content-Type' => 'application/json', 'X-AB-Signature' => $sig ], 'body' => $body ] );
        return ! is_wp_error( $response );
    }

    public function on_cart_change() {
        if ( ! function_exists( 'WC' ) || ! WC()->session || ! WC()->cart ) return;
        $session_id = $this->session_key(); if ( ! $session_id ) return;
        $data = $this->build_cart_data( $session_id );
        AB_DB::upsert( [ 'session_id' => $session_id, 'email' => $data['customerEmail'], 'name' => $data['customerName'], 'phone' => $data['customerPhone'], 'cart_items' => wp_json_encode( $data['cartItems'] ), 'cart_total' => $data['cartTotal'] ] );
        if ( ! empty( $data['cartItems'] ) ) {
            $body = wp_json_encode( $data ); $sig = $this->sign( $body );
            wp_remote_post( $this->api_url( '/webhooks/cart-session/' . ( $this->settings['store_id'] ?? '' ) ), [ 'timeout' => 5, 'blocking' => false, 'headers' => [ 'Content-Type' => 'application/json', 'X-AB-Signature' => $sig ], 'body' => $body ] );
        }
    }

    public function on_checkout_review( string $post_data ) {
        $session_id = $this->session_key(); if ( ! $session_id ) return;
        $parsed = []; parse_str( $post_data, $parsed );
        $email = sanitize_email( $parsed['billing_email'] ?? '' );
        if ( $email && is_email( $email ) ) {
            $data = $this->build_cart_data( $session_id, $email );
            AB_DB::upsert( [ 'session_id' => $session_id, 'email' => $email, 'name' => $data['customerName'], 'phone' => $data['customerPhone'], 'cart_items' => wp_json_encode( $data['cartItems'] ), 'cart_total' => $data['cartTotal'] ] );
            $this->push_to_api( $data );
        }
    }

    public function on_order_created( \\WC_Order $order ) {
        $session_id = $this->session_key(); if ( ! $session_id ) return;
        $order->update_meta_data( '_ab_session_id', $session_id ); $order->save();
        AB_DB::mark_recovered( $session_id );
        $this->send_order_completed( $session_id, $order->get_id(), (float) $order->get_total() );
    }

    public function on_payment_complete( int $order_id ) {
        $order = wc_get_order( $order_id ); if ( ! $order ) return;
        $session_id = $order->get_meta( '_ab_session_id' ) ?: '';
        if ( $session_id ) { AB_DB::mark_recovered( $session_id ); $this->send_order_completed( $session_id, $order_id, (float) $order->get_total() ); }
    }

    private function send_order_completed( string $session_id, int $order_id, float $total ): void {
        $store_id = $this->settings['store_id'] ?? ''; if ( ! $store_id ) return;
        $payload = wp_json_encode( [ 'sessionId' => $session_id, 'orderId' => (string) $order_id, 'cartTotal' => $total ] );
        wp_remote_post( $this->api_url( '/webhooks/order-completed/' . $store_id ), [ 'timeout' => 5, 'blocking' => false, 'headers' => [ 'Content-Type' => 'application/json', 'X-AB-Signature' => $this->sign( $payload ) ], 'body' => $payload ] );
    }

    public function sync_pending_carts() {
        $rows = AB_DB::get_unsynced( 50 );
        foreach ( $rows as $row ) {
            $cart_items = json_decode( $row['cart_items'] ?? '[]', true );
            if ( empty( $cart_items ) ) continue;
            $ok = $this->push_to_api( [ 'sessionId' => $row['session_id'], 'customerEmail' => $row['email'], 'customerName' => $row['name'], 'customerPhone' => $row['phone'], 'cartItems' => $cart_items, 'cartTotal' => (float) $row['cart_total'] ] );
            if ( $ok ) AB_DB::mark_synced( $row['session_id'] );
        }
    }

    public function enqueue_checkout_script() {
        if ( ! is_checkout() ) return;
        wp_add_inline_script( 'jquery', 'jQuery(document).on("change blur","#billing_email",function(){jQuery("body").trigger("update_checkout");});' );
    }

    public function add_admin_page() {
        add_submenu_page( 'woocommerce', 'Abandonment Buddy', 'Abandonment Buddy', 'manage_options', 'abandonment-buddy', [ $this, 'render_admin_page' ] );
    }

    public function handle_save() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Unauthorized' );
        check_admin_referer( 'ab_save_settings' );
        $s = (array) get_option( AB_OPTION_KEY, [] );
        $s['api_url'] = esc_url_raw( trim( $_POST['api_url'] ?? '' ) );
        $s['store_id'] = sanitize_text_field( trim( $_POST['store_id'] ?? '' ) );
        $s['api_key'] = sanitize_text_field( trim( $_POST['api_key'] ?? '' ) );
        $s['api_secret'] = sanitize_text_field( trim( $_POST['api_secret'] ?? '' ) );
        update_option( AB_OPTION_KEY, $s );
        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&saved=1' ) ); exit;
    }

    public function handle_connect() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( 'Unauthorized' );
        check_admin_referer( 'ab_connect' );
        $api_url = esc_url_raw( trim( $_POST['api_url'] ?? '' ) );
        $api_key = sanitize_text_field( trim( $_POST['api_key'] ?? '' ) );
        $api_secret = sanitize_text_field( trim( $_POST['api_secret'] ?? '' ) );
        $response = wp_remote_post( rtrim( $api_url, '/' ) . '/stores/connect', [ 'timeout' => 15, 'headers' => [ 'Content-Type' => 'application/json' ], 'body' => wp_json_encode( [ 'apiKey' => $api_key, 'apiSecret' => $api_secret ] ) ] );
        if ( is_wp_error( $response ) ) { wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&error=' . urlencode( $response->get_error_message() ) ) ); exit; }
        $code = (int) wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( ( $code !== 200 && $code !== 201 ) || empty( $body['webhookSecret'] ) ) { wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&error=' . urlencode( $body['message'] ?? 'Connection failed.' ) ) ); exit; }
        $s = (array) get_option( AB_OPTION_KEY, [] );
        $s['api_url'] = $api_url; $s['store_id'] = $body['storeId']; $s['api_key'] = $api_key; $s['api_secret'] = $api_secret; $s['webhook_secret'] = $body['webhookSecret']; $s['connected'] = true; $s['connected_at'] = current_time( 'mysql' );
        update_option( AB_OPTION_KEY, $s );
        if ( ! wp_next_scheduled( AB_CRON_HOOK ) ) wp_schedule_event( time(), 'ab_every_5_min', AB_CRON_HOOK );
        wp_redirect( admin_url( 'admin.php?page=abandonment-buddy&connected=1' ) ); exit;
    }

    public function render_admin_page() {
        $s = $this->settings; $connected = ! empty( $s['connected'] ); $just_connected = isset( $_GET['connected'] ); $error = isset( $_GET['error'] ) ? urldecode( $_GET['error'] ) : '';
        $recent_carts = AB_DB::get_all_recent( 10 ); $cart_count = count( AB_DB::get_all_recent( 1000 ) );
        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:10px;"><span style="background:#0f172a;color:#fff;padding:6px 10px;border-radius:8px;font-size:14px;font-weight:700;">AB</span>Abandonment Buddy</h1>
            <?php if ( isset($_GET['saved']) ): ?><div class="notice notice-success is-dismissible"><p>✅ Settings saved.</p></div><?php endif; ?>
            <?php if ( $just_connected ): ?><div class="notice notice-success is-dismissible"><p>✅ Store connected! Cart tracking is now active.</p></div><?php endif; ?>
            <?php if ( $error ): ?><div class="notice notice-error is-dismissible"><p>❌ <?php echo esc_html($error); ?></p></div><?php endif; ?>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:960px;margin-top:20px;">
                <div>
                    <?php $is_connected = $connected || $just_connected; ?>
                    <div style="background:<?php echo $is_connected?'#f0fdf4':'#fef9ec';?>;border:1px solid <?php echo $is_connected?'#bbf7d0':'#fde68a';?>;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
                        <span style="font-size:22px;"><?php echo $is_connected?'🟢':'🟡';?></span>
                        <div><strong><?php echo $is_connected?'Connected &amp; Tracking':'Not Connected';?></strong><br><span style="color:#64748b;font-size:12px;"><?php echo $is_connected?'Store ID: <code>'.esc_html($s['store_id']??'').'</code>':'Enter credentials below.';?></span></div>
                    </div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px;">
                        <h3 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;color:#64748b;">Connection Settings</h3>
                        <form method="POST" action="<?php echo esc_url(admin_url('admin-post.php'));?>">
                            <?php wp_nonce_field('ab_save_settings');?>
                            <input type="hidden" name="action" value="ab_save">
                            <table style="width:100%;border-collapse:collapse;">
                                <?php foreach(['api_url'=>['API URL','url','https://your-api.up.railway.app'],'store_id'=>['Store ID','text','cmq3bxx...'],'api_key'=>['API Key','text','ck_...'],'api_secret'=>['API Secret','password','cs_...']] as $name=>[$label,$type,$ph]):?>
                                <tr><td style="padding:8px 0;width:90px;font-size:13px;font-weight:600;color:#374151;"><?php echo esc_html($label);?></td><td style="padding:8px 0;"><input type="<?php echo esc_attr($type);?>" name="<?php echo esc_attr($name);?>" value="<?php echo esc_attr($s[$name]??'');?>" placeholder="<?php echo esc_attr($ph);?>" style="width:100%;padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;"></td></tr>
                                <?php endforeach;?>
                            </table>
                            <button type="submit" class="button" style="margin-top:12px;">Save Settings</button>
                        </form>
                    </div>
                    <form method="POST" action="<?php echo esc_url(admin_url('admin-post.php'));?>">
                        <?php wp_nonce_field('ab_connect');?>
                        <input type="hidden" name="action" value="ab_connect">
                        <input type="hidden" name="api_url" value="<?php echo esc_attr($s['api_url']??'');?>">
                        <input type="hidden" name="store_id" value="<?php echo esc_attr($s['store_id']??'');?>">
                        <input type="hidden" name="api_key" value="<?php echo esc_attr($s['api_key']??'');?>">
                        <input type="hidden" name="api_secret" value="<?php echo esc_attr($s['api_secret']??'');?>">
                        <button type="submit" style="width:100%;background:#0f172a;color:#fff;border:none;padding:10px 0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">🔌 Save &amp; Connect to Abandonment Buddy</button>
                    </form>
                </div>
                <div>
                    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
                        <h3 style="margin:0 0 4px;font-size:13px;text-transform:uppercase;color:#64748b;">Local Cart Storage <span style="float:right;background:#f1f5f9;color:#0f172a;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:700;"><?php echo (int)$cart_count;?> total</span></h3>
                        <p style="color:#94a3b8;font-size:12px;margin:0 0 14px;">Carts saved locally before syncing to your app.</p>
                        <?php if(empty($recent_carts)):?><p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px 0;">No carts yet. Add a product to cart to test.</p>
                        <?php else:?>
                        <table style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:6px 4px;color:#64748b;">Customer</th><th style="text-align:right;padding:6px 4px;color:#64748b;">Total</th><th style="text-align:center;padding:6px 4px;color:#64748b;">Status</th></tr></thead>
                            <tbody><?php foreach($recent_carts as $cart):$sc=match($cart['status']){'recovered'=>'#10b981','synced'=>'#3b82f6',default=>'#f59e0b'};?>
                                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:7px 4px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><?php echo esc_html($cart['email']?:substr($cart['session_id'],0,12).'…');?></td><td style="padding:7px 4px;text-align:right;font-weight:600;"><?php echo wc_price($cart['cart_total']);?></td><td style="padding:7px 4px;text-align:center;"><span style="background:<?php echo esc_attr($sc);?>22;color:<?php echo esc_attr($sc);?>;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;"><?php echo esc_html(ucfirst($cart['status']));?></span></td></tr>
                            <?php endforeach;?></tbody>
                        </table>
                        <?php endif;?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}

add_action( 'plugins_loaded', function () { Abandonment_Buddy::get_instance(); } );
`;

const README = `=== Abandonment Buddy for WooCommerce ===
Contributors: abandonmentbuddy
Tags: woocommerce, abandoned cart, cart recovery, email, whatsapp
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later

Automatically track and recover abandoned WooCommerce carts.

== Installation ==
1. Upload the abandonment-buddy folder to /wp-content/plugins/
2. Activate the plugin
3. Go to WooCommerce → Abandonment Buddy
4. Enter your API URL, Store ID, API Key and Secret
5. Click Save & Connect
`;

export async function GET() {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('abandonment-buddy')!;
  folder.file('abandonment-buddy.php', PHP);
  folder.file('readme.txt', README);

  const zipBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const binary = Buffer.from(zipBase64, 'base64');

  return new Response(binary, {
    status: 200,
    headers: {
      'Content-Type':        'application/zip',
      'Content-Disposition': 'attachment; filename="abandonment-buddy.zip"',
      'Content-Length':      String(binary.length),
      'Cache-Control':       'no-store',
    },
  });
}
