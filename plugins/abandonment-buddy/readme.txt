=== Abandonment Buddy for WooCommerce ===
Contributors: abandonmentbuddy
Tags: woocommerce, abandoned cart, cart recovery, email recovery, whatsapp
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.5.8
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

= 1.5.8 =
* Fix: cart total in email now always equals sum of item totals (was showing pre-tax subtotal vs tax-inclusive item totals)
* Fix: after each email step is sent, plugin notifies cloud API (POST /plugin/email-step) so web dashboard Recovery Timeline and Email Engagement panels show real timestamps instead of "Not yet"

= 1.5.7 =
* Follow-up email sequence: send up to 3 recovery emails per abandoned cart at configurable delays
* Email 1: fires X minutes after abandonment; Email 2: X minutes after email 1; Email 3: X minutes after email 2
* Each email has its own delay (minutes) and optional custom promo message
* Email 2 & 3 disabled by default (set delay > 0 to enable); never re-sends a step already sent
* DB schema v1.3: adds email_2_sent_at and email_3_sent_at columns

= 1.5.6 =
* Follow-up email: Settings UI added to Settings tab (enable toggle, delay, subject, from name/email, custom message)
* Follow-up email: wp_mail() sends one HTML recovery email per abandoned cart after the configured delay
* DB schema v1.2: email_sent_at column tracks which carts have already been emailed (prevents duplicates)
* Connection settings form now preserves follow-up settings when saving credentials

= 1.5.5 =
* Dashboard stats now fetched live from Abandonment Buddy API (total carts, abandoned, messages sent by channel, recovered, revenue, recovery rate)
* Falls back to local WordPress DB stats if API is unreachable
* Green/amber source indicator shows whether stats are live or local

= 1.5.4 =
* Complete admin page redesign: tabbed Dashboard + Settings layout
* Dashboard tab: 4 stat cards (Total Captured, Abandoned, Synced, Recovered) with revenue values and recovery rate
* Dashboard tab: recent carts table with customer name, email, phone, cart total, last activity, status
* Settings tab: clean connection form, connection status panel, tools (check updates, cleanup duplicates)

= 1.5.3 =
* Fix: remove plugin from no_update list when injecting update so WordPress doesn't suppress the badge
* Fix: add hourly admin_init check that clears update transient the moment a new version is detected — no deactivate/reactivate needed

= 1.5.2 =
* Fix: update notification now shows immediately on the Plugins page without waiting for WordPress 12-hour cache to expire

= 1.5.1 =
* Only capture on the checkout page — removed cart-level tracking hooks
* Require all billing fields (email, first name, last name, phone) before saving or pushing to API
* Read all field values directly from checkout form POST data instead of WC customer session

= 1.5.0 =
* Auto-write must-use plugin on activation to set FS_METHOD=direct without needing wp-config.php access
* Detect duplicate plugin installs in WP Admin and show one-click cleanup button
* Dashboard download buttons now serve zip dynamically from API (always latest version)

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
