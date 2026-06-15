=== Abandonment Buddy for WooCommerce ===
Contributors: abandonmentbuddy
Tags: woocommerce, abandoned cart, cart recovery, email recovery, whatsapp
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.4.9
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Automatically track and recover abandoned WooCommerce carts via email, WhatsApp, and SMS.

== Description ==

Abandonment Buddy connects your WooCommerce store to the Abandonment Buddy SaaS platform.

= Features =
* Real-time cart tracking stored in local WordPress database
* Automatic sync to Abandonment Buddy cloud every 5 minutes
* Email, WhatsApp, and SMS recovery campaigns
* Captures customer email, name, phone, and full cart contents
* Marks carts as recovered when order is placed

== Installation ==

1. Upload the `abandonment-buddy` folder to `/wp-content/plugins/`
2. Activate the plugin in WordPress admin
3. Go to WooCommerce → Abandonment Buddy
4. Enter your API URL, Store ID, API Key, and API Secret from your Abandonment Buddy dashboard
5. Click "Save & Connect"

== Changelog ==

= 1.4.9 =
* Test update flow: verify clean in-place upgrade with no duplicate plugin directories

= 1.4.8 =
* Serve plugin zip directly from API instead of GitHub CDN
* Define FS_METHOD constant and filter for reliable direct filesystem writes

= 1.4.7 =
* Fix auto-update: add filesystem_method filter (more reliable than constant alone)

= 1.4.6 =
* Fix auto-update: define FS_METHOD=direct so WordPress skips FTP credentials prompt

= 1.4.5 =
* Fix auto-update filesystem error: removed fix_folder filter (zip now has correct structure)

= 1.4.4 =
* Add "Check for plugin updates" button in admin page
* Force-clear update_plugins transient on activation and settings save

= 1.4.3 =
* Test auto-update delivery via Vercel CDN

= 1.4.2 =
* Fix fatal error on activation: replaced PHP 8.0 match expression and removed all typed hints for PHP 7.0+ compatibility

= 1.4.1 =
* Fix fatal error on activation: removed typed class properties for PHP 7.0+ compatibility

= 1.4.0 =
* Minor UI and stability improvements; plugin now served via Vercel CDN for faster downloads

= 1.3.0 =
* Minor stability improvement and update system test

= 1.2.0 =
* Auto-update support: plugin now checks the Abandonment Buddy API for new versions and shows update notices directly in WP Admin
* No more manual zip uploads needed — click "Update" in WordPress just like any other plugin

= 1.1.0 =
* Local WordPress DB storage for cart sessions
* Non-blocking API sync
* Email capture at checkout

= 1.0.0 =
* Initial release
