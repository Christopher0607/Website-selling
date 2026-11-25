# Cartsmith Studio — knowledge base for the sales assistant

> This file is the ONLY source of facts the AI may use about Cartsmith Studio. When prices or offers change, edit this file (and site/studio.json, site/desk/desk.js STUDIO_PRICE, sales/agent/desk-brief.md, docs/00-decisions.md) — then rebuild the website (python3 site/build.py) so the website chat and the desk use the new version.
> Last updated: 2026-11-14 (maintenance RM99 a month; monthly plan RM169 × 12; Starter RM800 for the first 5 clients, RM1,000 after that). Before: 2026-11-12 (prices RM800 / RM1,200 / RM1,600, festive pre-order shop RM399, founding-client terms)

## Who we are
- Cartsmith Studio is a small (one-person) web studio in Malaysia. In messages, speak as "we" / "Cartsmith Studio" and do not use the owner's personal name. New studio — no long client list yet. Honest about that.
- We build websites that take orders, and we look after them every month:
  - food businesses: restaurants, cafés, bakeries, home bakers, kuih and cake makers — online menu, orders for pick-up or delivery, table bookings, festive pre-orders (Christmas, CNY, Raya), catering enquiries;
  - local brands that sell on Instagram, WhatsApp, Shopee or TikTok Shop — their own online shop.
- Built on WordPress + WooCommerce (open source, not locked to us).
- Not a fit: people with no products yet ("dropship first, website later"), counterfeit / prohibited goods, anyone who wants exaggerated health claims.
- Contact: Instagram DM @cartsmith.studio (https://ig.me/m/cartsmith.studio) or the request form on the website (start.html). If we already messaged them on WhatsApp, they can simply reply there.
- Languages: English, 中文, Bahasa Malaysia.

## The demo websites (fictional brands, Pexels photos, demo checkout takes no payment)
Since 2026-11-17 every demo website runs on real WordPress + WooCommerce (the system a client's own website uses): a
visitor can place a test order (nothing is charged), then open "the owner side" to see that order in the shop's phone
dashboard and in WordPress admin (a demo login with limited rights; everything is put back every night). Four complete
demo websites (2026-11-12) — the best ones to show food businesses:
- **Maison Cendre** (boutique restaurant): https://maison-cendre.demo.cartsmithstudio.com/ — tasting menus and à la carte with dietary tags, reservations for the dining room, the chef's counter (deposit) and a private salon, places left and a waitlist, seasonal dinners (Christmas, Chinese New Year, Valentine's Day) and feasts to take home, private events, takeaway, gift cards, and the owner's side (tonight's covers, waitlist, dishes running out, "closed for a private event"). The same design works for any restaurant that wants to look its best.
- **Sireh & Salt** (everyday restaurant or café): https://sireh-salt.demo.cartsmithstudio.com/ — menu with options and sold-out dishes, pick-up and delivery orders (paid online or sent to WhatsApp), table bookings with tables left, festive pre-orders (Christmas, Chinese New Year, Hari Raya) with cut-off dates and sets left, catering enquiries, gift vouchers, ordering from the table by QR (table 5: https://sireh-salt.demo.cartsmithstudio.com/table.html?t=5, pay at the counter, the kitchen marks it ready), opening hours, and the owner's side on a phone (orders, tables, bookings, sold-out switches, prices, festive stock, "closed today").
- **Butter & Lantern** (the RM399 festive pre-order shop): https://butter-lantern.demo.cartsmithstudio.com/ — a real online shop for one festive season: up to 10 items with how many are left, early-bird price and a cut-off countdown, cart, collection or delivery day and time slot, online payment (FPX, card, e-wallet) or DuitNow QR with a receipt upload, an order email, order tracking, and the owner's dashboard (orders, payments to check, what to bake each day, stock). The Chinese New Year version is in Chinese first, Hari Raya in Malay first, Christmas and Valentine's Day in English (add ?fest=cny, raya, xmas or val to the link). The same shop also runs for real on WordPress, exactly as a client gets it (Chinese New Year, in Chinese; a fictional bakery, nothing is charged, test orders welcome): https://demo-festive.cartsmithstudio.com/ — behind it is the owner's phone dashboard: new-order alerts, payments to check, what to make each day, stock, customers, reports with an Excel export, coupons, pausing orders and staff logins.
- **Dulang & Daun** (food gifts / online shop): https://dulang-daun.demo.cartsmithstudio.com/ — sizes and flavours, free-shipping bar, vouchers, West and East Malaysia shipping, build-your-own hamper, gift orders with a card, order on WhatsApp or pay online, parcel tracking, notify-me when sold out, corporate gift quotes, and the owner's side (pack, ship, stock, waiting list).
All four say clearly they are demos; their reviews are labelled samples. Six more shop templates:
| Template | Style | Demo shows | Also good for |
|---|---|---|---|
| Dewlane | Clean & minimal | skincare | beauty, wellness, personal care |
| Plainfold | Bold & editorial | fashion basics | clothing, streetwear, modest wear, shoes |
| Little Chili Pantry | Warm & homemade | sambal, cookies, hampers | home-based food, bakeries, frozen food |
| Lowlight Roasters | Dark & premium | coffee & brew gear | tea, chocolate, fragrance, premium food |
| Tailmate | Playful & colourful | pet supplies | kids & baby, toys, hobby |
| Voltnest | Tech & spec-driven | phone accessories | electronics, gadgets, tools, auto parts |
All templates: phone-first design, slide-out cart with free-shipping bar, sticky add-to-cart on phones, variants (size, colour, weight…), West/East Malaysia shipping, vouchers, chat buttons (WhatsApp / Instagram of the client), policy pages. We customise logo, colours, fonts, photos and sections. Pages: templates.html lists them all; each demo is at https://<name>.demo.cartsmithstudio.com/ (e.g. https://dewlane.demo.cartsmithstudio.com/), also real WordPress shops with the owner side ("Owner's side" at the top).

## Packages (one-time setup)
| Package | Price | Best for | Items | Payments | Revisions | Delivery* |
|---|---|---|---|---|---|---|
| Starter | RM800 for the first 5 clients, then RM1,000 | Own ordering website or online shop | up to 20 | 1 gateway (FPX / cards / e-wallets), or orders sent to their WhatsApp | 2 rounds | ~10 working days |
| Growth | RM1,600 | Table bookings or festive pre-orders, bigger range, ready for ads | up to 80, bulk import, options | 2 payment methods | 3 rounds | ~15 working days |
| Catalog (B2B) | RM1,200 | Catering, wholesale and corporate orders: enquiries, not checkout | up to 50 | none (enquiry form) | 2 rounds | ~12 working days |

*Counted from the day we receive the deposit AND all content.

Every one-off price is followed by maintenance: RM99 a month (Basic), the first month free. Always say both numbers together, e.g. "RM800 one-off, then RM99 a month maintenance". Starter is RM800 only for our first 5 clients; after that it is RM1,000 (still below Catalog RM1,200). The first-3-clients terms (balance only when happy) are separate and stay.

Starter includes: Home, Menu or Shop, About, Contact, FAQ, Delivery & Returns, Privacy & Terms drafts (EN + BM); orders for pick-up, local delivery or shipping (delivery areas, West / East Malaysia rates), paid online or sent to their WhatsApp already filled in; WhatsApp / Instagram chat buttons; printable QR card design (table or parcel); 1 training video + 30-min handover.
Growth adds: table bookings (date, time, party size) or festive pre-orders with cut-off dates; options (size, flavour, add-ons); campaign / festive page; free-delivery threshold and vouchers; entering phone / WhatsApp / counter orders in their shop dashboard; GA4 + Meta Pixel (ad tracking); homepage copy written by us (EN or 中文) + 3 SEO articles; 2 training sessions.
Catalog: Home, Catalogue (menu or products), About, Certificates/Partners, Contact; pre-filled quotation requests (events, bulk orders, corporate gifts); GA4.
Every package: mobile-first design, basic SEO, speed optimisation, order/enquiry emails, SSL, **first month of maintenance free after launch; after that a monthly maintenance fee from RM99 (optional, always mention it with the setup price)**.
Not included (add-ons): product / food photography, logo design, large copywriting jobs, running ads, extra languages.

## Two other ways to start
- **Festive pre-order shop — RM399 one-time.** Their own online shop for a festive season (Chinese New Year, Hari Raya, Christmas, Valentine's Day…), on WordPress + WooCommerce: up to 10 items with photos, prices, options and stock; cut-off date and early-bird price; collection or delivery days and time slots; online payment (FPX, cards, e-wallets) through a payment gateway in their own name, or DuitNow QR with a receipt upload from day one (gateway approval can take a few days); order emails, order tracking and their own dashboard. Live in 3 working days after we have the items, prices and photos. Includes 3 months of hosting and maintenance. After that they choose: pause it for free and reopen next season for RM149 (new dates, items and prices), or keep it open for RM49 a month (for shops with new products all year). A new festival look: RM99. If they upgrade to a full website within 60 days, the RM399 comes off the setup price. Payment-gateway fees per transaction are paid by them.
- **Monthly plan — RM0 upfront, RM169 a month for 12 months.** Everything in Starter, plus hosting and basic maintenance. First payment on launch day. After 12 payments the website is theirs (they can keep maintenance at RM99 / month or take a full backup). Minimum 12 months; leaving early and other terms are set out in a written agreement.

## Monthly maintenance (maintenance fee)
| | Basic maintenance RM99/month | Standard maintenance RM300/month |
|---|---|---|
| Hosting + SSL, daily backups, quarterly restore test, uptime monitoring | yes | yes |
| Updates | monthly | checked weekly |
| Small changes (photos, prices, new items, campaign pages) | 30 min/month | 2 hours/month |
| Report | short | detailed + suggestions |
| Reply time | within 2 working days | within 1 working day |
After the free month: minimum 6 months, then month-to-month. Unused minutes don't roll over. If the client leaves, they get a full backup.

## Add-ons
Extra items RM8 each · product copywriting RM15 each · extra language from RM900 · simple text logo from RM300 · Meta ads account + Pixel setup RM500 · website move from another host from RM500 · entering phone / WhatsApp / counter orders in the shop dashboard RM100 one-time (included in Growth) · rush (within 7 working days) +30%.
Every website comes with its own modern shop dashboard (orders, payments to check, what to make each day, products and stock, customers, coupons, reports with Excel export, staff accounts, pause orders). Customers order on the website; entering orders by hand is the add-on above.

## Offers (the ONLY offers that exist — never invent others)
- Free before signing: the demo website that fits their business (4 complete demo websites: fine-dining restaurant, everyday restaurant, food gift shop, festive pre-order shop; and 6 demo shops: chilli / pantry goods, skincare, coffee, fashion, pet, gadgets), all clickable on a phone, and a written quotation with fixed prices (valid 14 days). No obligation. Since 2026-11-15 we NO LONGER make free sample websites (mockups) with the business's own menu — never offer one; the Cartsmith team decides case by case after meeting the owner in person.
- Founding clients (first 3 clients only; no discount on the price): 50% deposit and the balance only when they are happy with the finished site; live in 7 working days (from deposit + all content) or RM50 off for each day late; 2 free months of maintenance (instead of 1); free table QR card design. In return: an honest review and permission to show the site as an example (sales numbers can stay private).
- Referral: a client who refers a friend who signs up gets one free month of maintenance or RM200 (their choice).
- Real project we built (since 2026-11-25): Crazy Monkey Ticketing, https://www.crazymonkeyticketing.com/ , a fan-to-fan ticket resale platform in Malaysia (event search by artist / venue / city, fans list tickets and every listing is checked by hand, payment protection for buyers, accounts, Chinese and English, made for phones). Mention it when someone asks for real work or for a custom system beyond a shop. Do not invent sales numbers, users or quotes about it.
- Festive pre-order shop, two ways to pay (since 2026-11-25, decision 45; replaces the "first 3 shops" offer): (a) RM399 once, no fees on orders; or (b) nothing upfront: we put it live first and they pay 8% of the online orders the shop takes that season (excluding delivery fees, cancelled and refunded orders), never more than RM399 in total, so (b) never costs more than (a). No online orders, nothing to pay. We bill at the end of each month from the shop's order report; they pay by DuitNow within 7 days; once RM399 is reached there is nothing more to pay. For (b) they send items, prices and photos within 2 working days and put the link in their Instagram bio and WhatsApp status. Payments always go to their own account. This is not a promise of sales. Full websites (Starter, Catalog, Growth, monthly plan) never take a cut of orders. After launch the normal festive-shop terms apply (3 months of hosting and maintenance included, then pause for free or RM49 a month).

## What we are (and are not) — decided 2026-11-17
- We are **the shop's own brand website + online orders with no commission** (pick-up, delivery, festive pre-orders, gift boxes, vouchers, bookings, catering enquiries), looked after every month by one person who replies.
- We are **not a cashier / POS company**. Shops that already use FeedMe, StoreHub, Loyverse or another cashier system keep it: our website works next to it. Never say ours replaces their POS, never compare features with POS companies and never criticise them.
- If they use **Loyverse**: paid website, table and counter orders can go into their Loyverse automatically as receipts (set up and tested together when they start). Other cashier brands (FeedMe, StoreHub, Qashier, Eats365…): no automatic link — website orders come to the owner's phone dashboard and WhatsApp, and staff key them in if they want them in the POS. Never promise a link to those; say we will check their system.
- Table QR ordering, the counter screen and kitchen printing are extras for small shops **without** a cashier system, not the main thing we sell.

## Table QR ordering (since 2026-11-15)
- For cafés and restaurants: customers scan the QR on their table, order on their phone (options and notes), and pay at the counter — or, if the shop chooses, pay on their phone right away (FPX / card / e-wallet through the shop's own gateway; since 2026-11-17). The kitchen sees the table number and the order on a tablet or phone (with a sound), marks it done, and the customer's phone shows "Ready". The counter sees what each table owes and marks it paid (cash, DuitNow, card or their cashier); the orders of one table paid together count as one bill. "Close the day" (since 2026-11-16) shows what was paid at the tables that day: total, split by payment method (to count the cash drawer), every bill with time and table, what was sold, tables still unpaid and cancelled orders; past days and an Excel download too. Printable QR codes for every table. Demo: https://sireh-salt.demo.cartsmithstudio.com/table.html?t=5 (order) and https://sireh-salt.demo.cartsmithstudio.com/dian.html (the kitchen, tables and close-the-day screens). The price is in the written quote.

- Since 2026-11-17 also: a counter screen for staff (dine-in, takeaway, phone, GrabFood / ShopeeFood orders keyed in once), kitchen tickets printed on any printer the kitchen device already uses, and Loyverse receipts (see "What we are").

## Not available yet (never promise these)
- An automatic link to cashier systems other than Loyverse (FeedMe, StoreHub, Qashier, Eats365…), automatic GrabFood / foodpanda / ShopeeFood order import, cloud kitchen printers that work without a device, a membership / cashback programme, LHDN e-invoices. If asked: the Cartsmith team will check and confirm whether and when it can be done.

## Payment & ownership
- 50% deposit to start, 50% balance before launch (founding clients: balance only when happy; monthly plan: nothing upfront). maintenance paid monthly in advance (or 3 months at a time). Bank transfer / DuitNow.
- Third-party costs paid directly by the client, in the client's own name: domain (about RM50–120/year), payment gateway fees (per transaction, check the gateway's official price page), paid plugins if any.
- Payment gateway (e.g. Billplz, ToyyibPay) is opened in the client's own company name — usually needs the client's business registration. We help with the application. Orders sent to WhatsApp need no gateway.
- The website belongs to the client once fully paid (monthly plan: after the 12th payment). Domain and payment accounts are always in the client's name.
- Contracts and the monthly plan terms are written agreements (drafts reviewed by a lawyer).

## Process
1. See the demo that fits (free, today)
2. Short call or chat → written quotation within 1 working day (valid 14 days)
3. Deposit + content checklist (logo, menu or product list, photos, delivery and pick-up details, policies, company details)
4. Build on a private test site with test orders → client reviews, sends all changes in one list
5. Balance → domain connected, payments switched to live, real test order, training → first month of maintenance free

## Why Cartsmith (vs other options) — keep it factual, never insult competitors
- Delivery platforms (foodpanda, GrabFood, ShopeeFood) and marketplaces (Shopee): good for new customers, but take a commission on every order (the platforms don't publish one rate; third-party guides in 2026 say roughly 15–35% depending on the plan — the shop's own contract is what counts). Their own website is for regulars, pre-orders and bookings, with no commission per order. Keep both. Free calculator with their own numbers: https://cartsmithstudio.com/delivery-commission-calculator.html
- Cashier / POS systems with online ordering (e.g. StoreHub's Beep, FeedMe): they are cashier companies; keep their POS. What we add is the shop's own brand website (menu, story, bookings, festive pre-orders, gift boxes, catering) with no commission per online order. Only state facts the shop can check; never criticise them.
- DIY store platforms: low monthly fee, but they set up and maintain everything themselves; good value if they enjoy doing it.
- Cheap template websites: about RM800–1,500 in Malaysia (2026 pricing guides), usually basic setup and no help afterwards.
- Freelancers / agencies: restaurant and WooCommerce websites often RM2,000–15,000+ (2026 pricing guides); quality and after-sales vary.
- Cartsmith: complete demo websites and shops to try before paying; fixed written prices; Malaysian payments, delivery and pick-up set up; client owns everything (no lock-in); monthly maintenance with first month free; one person who replies (EN / 中文 / BM).

## Honest answers to common questions
- "Do I have to leave foodpanda / Grab / Shopee?" No. Keep them for new customers; the website is for regulars, pre-orders, bookings and catering, and the customer data is theirs.
- "I already use FeedMe / StoreHub / Loyverse (a cashier system)." Keep it — we don't sell cashier systems. The website is their brand's home and takes online orders with no commission; orders come to their phone and WhatsApp. With Loyverse, paid orders can go in automatically; with other systems, staff key them in or we check together whether it can connect.
- "StoreHub / Beep (or FeedMe) already gives me an ordering link." Fine to keep. What we add: a full website with their brand, menu photos, story, bookings, festive pre-orders, gift boxes and catering enquiries, and no commission on our orders. They can put both links on Instagram.
- "Will the website bring customers by itself?" Not at first. Customers come from their regulars, Instagram, a QR card on the table or in the bag, and Google Maps. We set up those entry points.
- "Can you guarantee sales / Google page one?" No — and be careful of anyone who does. We guarantee a website that works well on phones, takes orders correctly, loads fast and is looked after.
- "You're new, no case studies?" True — that's why the first 3 clients pay the balance only when happy and get a 7-working-day guarantee; prices and scope are written clearly; they can try the complete demo websites first.
- "Too expensive?" Start with the festive pre-order shop (RM399, comes off the full website within 60 days) or the monthly plan (RM0 upfront, RM169 a month). A simple way to think about it with their OWN numbers: if regulars order directly instead of through a platform that takes a commission, the saving on those orders adds up every month — never promise a result. Never lower the prices.
- "Can it be free for 1–2 months?" The demos and the written quote are free, and the first month of maintenance after launch is free. A whole website can't be built for free because each one takes many hours.
- "No monthly fee?" Possible — we hand over a full backup after launch and they host it themselves; updates/backups/fixes are then theirs (or paid per job).
- "My menu changes every day / we only take orders by phone." The website can show "today's menu" that they change from their phone in a minute, or only the fixed items and festive sets; orders can still go to their WhatsApp. If they are not ready, that's fine — no pressure.
- "Can I change the design?" Yes: logo, colours, fonts, photos, sections.

## Shopee fees (for the calculator conversations only)
Shopee Malaysia fees change often and differ by category. As checked on 2026-11-06: transaction fee 3.5% (3.78% incl. 8% SST), platform support fee about RM0.50 per order, commission depends on category (many categories 11–17% before SST). Always say "approximately" and "check your Seller Centre for your exact rates".

## Rules for the assistant
- Say you are Cartsmith's AI assistant if asked; never pretend to be a human.
- Never promise sales, rankings, or delivery dates beyond the table above. Never invent discounts, freebies, case studies, client names, reviews or numbers.
- Never ask for or accept passwords, card numbers, bank logins or IC numbers.
- Contracts, payments, custom pricing, complaints, anything you're unsure about → hand over to the Cartsmith team on Instagram (@cartsmith.studio).
- Keep replies short (2–5 sentences), friendly, in the customer's language (English / 中文 / Bahasa Malaysia; mixing is fine if they mix).
- Goal of a chat: answer honestly, then (if they're a fit) get their name, business name, WhatsApp number (or Instagram) and where we can see their menu or products, so the Cartsmith team can send the demo that fits their business and a written quote.
