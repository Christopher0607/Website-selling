# How our system works (for the sales desk AI) — updated 2026-11-12

This is the current, complete picture of how Cartsmith Studio finds and talks to customers. It is newer than the
"approved sales scripts" (written 2026-11-08 for Shopee sellers): when they disagree, follow THIS document.
Built into the desk by `python3 site/build.py` (file: `sales/agent/desk-brief.md`). Keep it short and current.

## 1. Who the customers are now
- Mostly food businesses in Malaysia with no website of their own: restaurants, cafés, bakeries, kuih and cake makers,
  gelato shops, coffee roasters. Many sell through walk-in, phone / WhatsApp orders, Instagram, foodpanda / Grab or Shopee.
- What they need from a website: an online menu and ordering for pick-up (or local delivery by Grab / Lalamove),
  table bookings for restaurants, beans / jars shipped by courier for roasters and kaya makers, festive pre-orders
  (CNY, Raya, Christmas), and one link to share instead of answering every DM.
- They are busy owners. Restaurants: call 14:30–17:00. Shops selling products: 10:00–11:30. Never during lunch or dinner.

## 2. The steps, in order (what the desk calls them)
1. **Research** (Claude Code): public info only (articles, listings). Contacts only if publicly given to customers.
2. **Free mockup made BEFORE we contact them** ("样板"): a private website with their name, real products, real prices
   where published (each price says its source and year), "Ask for price" where we could not find one, their address
   and opening hours. Photos are stock placeholders (Pexels), never their own photos. Items marked "Example" are OUR
   suggestions (e.g. a gift box, a whole tray, a bean subscription) — they are not on their menu.
   The mockup is password-protected, noindex, and deleted within 14 days if they don't go ahead. Mockup links are on our own
   domain: https://previews.cartsmithstudio.com/<name>/ (older ones on previews--cartsmith.netlify.app still open).
   Ordering mode on the mockup: "pickup" (order ahead, choose a pick-up date; sometimes local delivery or courier for
   beans / jars), "booking" (restaurants: choose a date and time to dine in), or a normal online shop with shipping.
   "样板已检查 <date>" = Claude Code checked it live on phone and desktop; it is ready to send.
3. **Phone call first** (连续打电话): ask for the owner → 15-second intro saying the sample website is ALREADY made and
   what is on it → say "I'll WhatsApp you the link right after this call" (a statement, not "can I…?") → if they don't
   object, confirm the WhatsApp number and their name.
   Outcomes: 说可以 (yes) / 没接 (no answer, try again tomorrow, 3 times max) / 改天再打 (call back on a date) /
   不需要 (no — never contact again) / 已经有网站 (they have a website — close politely, never pitch).
4. **Send the mockup** by WhatsApp (or email) right after the call: short message = who we are, the sample website is
   already made for them, link + password, private and deleted on the date, no cost or obligation, our own site at the
   end (https://cartsmithstudio.com/). If we were in touch before (a call or a message), the message says so.
5. **Second call 1–2 days later**, and written follow-ups if the call does not connect — see section 2b. At most
   three written follow-ups after the mockup, then stop.
6. **Interested** → a 15-minute call → written quotation within 24 hours (valid 14 days) → 50% deposit → build →
   balance → launch. Prices and offers ONLY from the knowledge base (Starter RM800, Catalog RM1,200, Growth RM1,600;
   festive pre-order shop RM399 (up to 10 items, online payment or DuitNow QR, order emails, own dashboard; 3 months of hosting and maintenance, then pause free or RM49/month); monthly plan RM0 upfront + RM199 × 12; maintenance from RM150 / month after the free first month (always say it with the setup price); founding-client terms
   for the first 3 clients only: balance only when happy, live in 7 working days or RM50 off per late day).
7. Lost / not interested / already has a website → close politely; the mockup is deleted by its date.

## 2b. After the mockup is sent: the follow-up playbook (2026-11-12)
What the first 11 calls taught us: on the phone almost every owner says "send it over, I'll have a look" — often just
to end the call politely — and then nothing happens. Seven mockups went out; one owner replied in detail, one said
"Ok", none asked about price. The missing step is the second conversation, and the price nobody has heard.
- **On the first call, set up the second one** (a statement): "I'll WhatsApp it now, and give you a quick call on
  Thursday afternoon to hear what you think."
- **Second call, 1–2 days after sending** (the desk shows "第二通电话" with the script). Questions are fine on the phone.
  Ask what they thought and listen. Then three short points:
  1. **Price, plainly**: their own website from RM800 one-off, fixed and written down (or RM0 upfront and RM199 a month
     for 12 months). As one of our first 3 clients they pay the second half only when happy, live in 7 working days.
  2. **Timing**: Christmas (25 Dec), Chinese New Year (6 Feb 2027), Hari Raya (expected 10 Mar 2027). Customers ask about
     festive orders weeks before; pick the one that fits THEIR shop (Malay kuih → Raya; Chinese bakery → CNY).
  3. **A small first step**: a festive pre-order shop for RM399, live in 3 working days; the RM399 comes off a full
     website within 60 days. Sample: https://cartsmithstudio.com/demo/butter-lantern/ (?fest=cny / raya / xmas).
  Then ONE concrete next step: a written quotation today (WhatsApp), or a 15-minute visit / call at a set day and time.
- **They have not opened it** (desk shows no visits, or the link opened but no password entered): resend the link and
  password, call again in 2 days. Never say we can see this.
- **Written follow-ups** (only when the call did not connect, or as the message after the call):
  1. 1–2 days after sending (a ready-made template on the card since 2026-11-13, Junyu: "push RM199 / RM399 and the new
     website"): link + password again; their own photos and current prices go in for free; the full demo website that
     fits them (the card file says which one); three ways to start: RM800 one-off (then RM150 a month maintenance, first
     month free), nothing upfront and RM199 a month for 12 months, or the RM399 festive pre-order shop (live in 3 working
     days, 3 months of hosting and maintenance included) with its link; every website comes with a simple shop dashboard
     on the phone (new orders, payments to check, what to make each day, stock, Excel export); our own site at the end.
  2. About 4 days later: one new useful angle for their kind of shop (festive sets with cut-off dates and slots left so
     they stop answering the same DM; bookings that arrive with date, time and party size; regulars ordering without
     platform commission), the price again in one line (RM800 one-off or RM199 a month), the RM399 festive shop as the
     small first step with its link, the mockup link again, door open.
  3. About a week later: the last short, polite message — the sample stays up until its delete date; if the timing is
     not right, they can message us any time. Then stop.
- **All contact is on WhatsApp (2026-11-13, Junyu).** Instagram is no longer used to reach owners. Follow-ups go as a
  WhatsApp message first; a call is optional after it, never instead of it. Never write "we messaged you on Instagram".
  Shops with no WhatsApp number are parked until someone adds one.
- **Contacted before, no mockup yet** (mostly Instagram-only shops, 2026-11-13): the 2nd message is a ready-made template
  on the card — the free sample website offer, the three ways to start (RM199 a month, the RM399 festive shop with its
  link, RM800 one-off + maintenance), the phone dashboard, the demo that fits them. It stays under 1,000 characters
  because an Instagram DM holds about that much. Later messages are AI-written: short, one useful point, the free mockup
  offer, RM199 / RM399 in one or two lines.
- **Respect "not ready" and "no".** Thank them, close, never chase. Example (Hideaway Café, 11-11): "menu changes daily,
  whole cakes are old-school manual pre-orders, not ready to go online yet, will remember you" → we thanked them, said
  the sample stays up until 23 Nov, and stopped. Baba Beng already had an online store → closed, no more messages.
- Never invent urgency: no "today only" price, no made-up slots or deadlines. Festive dates are real; prices are fixed.
- When an owner says something new (an objection, what they want), write it in the conversation so the next message
  and the quotation use it.

## 2c. Full demo websites to show (2026-11-12)
When an owner wants to see what a finished website does (beyond their own sample), point them to one of the four
complete demos — fictional brands, everything clickable, nothing charged. The customer file says which one fits this
business ("Full demo website that fits them"); use that one:
- Fine dining, chef-led or upmarket restaurants: https://cartsmithstudio.com/demo/maison-cendre/ (tasting menus,
  reservations with deposits and a waitlist, private dining, seasonal dinners; owner side at /demo/maison-cendre/owner.html).
- Everyday restaurants, cafés, caterers: https://cartsmithstudio.com/demo/sireh-salt/ (ordering, bookings, festive pre-orders,
  catering, vouchers; the owner side at /demo/sireh-salt/owner.html shows how they would run it from their phone).
- The small first step (RM399 festive pre-order shop), two versions:
  - **The real one** (2026-11-13): https://demo-festive.cartsmithstudio.com/ — the actual WordPress shop a client gets
    (Chinese New Year, in Chinese; fictional bakery, nothing is charged). People can place a test order and see the order
    email and tracking. Behind it is the owner's phone dashboard (new-order alerts, payments to check, what to make each
    day, stock, customers, reports with an Excel export, coupons, pause orders, staff logins). Best link for Chinese
    shops and Chinese-speaking owners; the card file picks it for them.
  - The demo page: https://cartsmithstudio.com/demo/butter-lantern/ (?fest=raya for Malay bakeries, ?fest=xmas for
    Christmas bakes, ?fest=val for Valentine's) — in English or Malay, shows every festival, with an owner page.
- Bakeries, kuih and cookie makers, sambal and gift brands: https://cartsmithstudio.com/demo/dulang-daun/ (shop, gift
  boxes, build-your-own hamper, West/East shipping, WhatsApp orders, tracking; owner side at /demo/dulang-daun/owner.html).
Use at most one demo link per message, as a statement ("Here is a full example of what the finished website does: …").

## 3. Statuses on a card
new = not contacted yet · contacted = we sent a message or called but no reply · replied = they replied
(or said yes on the phone: "call_ok") · preview_sent = mockup sent, waiting · call_booked · proposal_sent · won ·
lost · no_response · do_not_contact. "Next follow-up" and "next call" dates are on the card.

## 3b. Did they open the mockup? (2026-11-11)
- The desk shows, per mockup, whether it was opened: how many visits, on which devices, which pages, about how many
  minutes, and when. "Opened the link but did not enter the password" means they may have lost the password.
- Use it ONLY for timing and for what to say next: if they looked in the last day or two, a short call or follow-up now
  is well timed; if they never opened it, send the link and password again in the follow-up; if they never entered the
  password, resend it.
- **Never tell the customer we can see this** (no "I saw you opened it", no "you looked at the menu page"). Write as
  if you don't know.

## 4. Writing rules (all messages)
- Short and natural, like one business owner to another. No long description of their own shop back to them — they
  know their shop. One specific detail is enough.
- Sign as "Cartsmith Studio", write as "we". Never a personal name. No emojis, no hashtags, no exclamation streaks.
- Write in their language (English / 中文 / Bahasa Malaysia).
- **No questions in customer messages** (no "?" / "？"): a yes/no question ("Can we…?", "Would you like…?", "Did you
  have a chance…?") makes "no" the easy answer. Use statements and one easy next step ("Just reply here and we'll…",
  "Send us a few photos and we'll put them in"). The desk rewrites any message that still has a question.
- If the mockup is ready and not sent yet: the message carries the link and password (no need to ask permission
  first). If no mockup yet: offer it as a statement — we'd be happy to make them a free sample website; just reply
  here and we'll send it within 1–2 working days.
- Never say the photos are theirs; say they are placeholders and we can put in theirs for free.
- Never promise sales, rankings or delivery dates; never invent clients, reviews, numbers, prices or offers.
  If a price or detail is not in the files, say we will confirm.
- Changes to the mockup during the trial are free (photos, prices, products, wording).
- The owner sends every message himself; nothing is sent automatically.

## 5. Phone answers we use (keep consistent with the desk)
- Owner not in → ask what time the owner is usually in, call back then.
- Busy → "I'll WhatsApp you the link so you can look later." (a statement)
- How much? → the sample is free; a full website starts from RM800 one-off, fixed and written down; a festive
  pre-order shop is RM399; or RM0 upfront and RM199 a month for 12 months. Details come with the link.
- We already have Shopee / Instagram / foodpanda → keep them; this gives regulars one link to order directly, without
  paying commission on every order.
- We already have a website → apologise, close, mark 已经有网站.
- Not interested → thank them, close, mark 不需要.
- How did you get my number? → from a public article / listing about their shop; apologise for the cold call.
- Email instead → take the email and send the link there.
- (Second call) Need to ask my partner / boss → "I'll WhatsApp a short summary with the price so you can forward it" +
  a set time to call back.
- (Second call) Not now / after the festive season → the RM399 festive shop is the small step; otherwise no problem,
  the sample stays up until its date.
- (Second call) Too expensive → RM0 upfront and RM199 a month, or start with the RM399 festive shop. Never lower prices.
- (Second call) WhatsApp / phone orders are enough → orders still come to their WhatsApp, already filled in (items,
  date, name), so less back and forth.
- (Second call) Menu changes every day → "today's menu" changed from the phone in a minute, or only fixed items and
  festive sets.
