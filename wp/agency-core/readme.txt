=== Agency Core ===
Requires at least: 6.4
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPLv2 or later

Studio toolkit for WooCommerce stores in Malaysia.

== Features ==
* WhatsApp floating button (hidden on cart/checkout, hidden on mobile product pages), product-page button with prefilled message, [agc_whatsapp] shortcode
* Demo mode: banner, payment methods hidden, orders blocked server-side (classic checkout, Store API, order-pay), noindex, no customer emails
* GA4 and Meta Pixel (only printed when IDs are set; not printed for logged-in staff). Events: whatsapp_click, generate_lead
* Business details & social shortcodes: [agc_business], [agc_business field="ssm_no"], [agc_social], [agc_concept_label], [agc_year]
* Malaysian checkout tweaks: phone required, company and address line 2 hidden
* WP-CLI: wp agc get | set <key> <value> | import <file.json> | demo on|off

No external connections except the tracking scripts you configure. No data collection.
