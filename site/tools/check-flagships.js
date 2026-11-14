// Checks the hand-made flagship demos (site/flagships/) in a phone-sized browser: every page loads without errors,
// and the restaurant demo's flows work end to end (order, WhatsApp order, delivery area, voucher, booking, festive
// pre-order, catering enquiry, owner view changes reaching the menu).
// Usage: node site/tools/check-flagships.js [base-url] [screenshot-dir]
//   base-url: where dist/ is served, e.g. http://localhost:8790 (python3 -m http.server 8790 -d site/dist)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const SHOTS = process.argv[3] || '';
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' }); // no smooth scrolling while clicking
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  const R = BASE + '/demo/sireh-salt/';
  // opening hours show once per page: home has them in "Visit us", other pages in the footer (2026-11-14)
  const hoursOnce = async (base, pages) => {
    const q = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    for (const pg of pages) {
      await q.goto(base + pg + '.html');
      const n = await q.$$eval('table.hours', (t) => t.filter((x) => x.offsetParent !== null).length);
      ok(n === 1, `${pg}: opening hours shown once (${n} on the page)`);
    }
    await q.context().close();
  };
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true }); } };

  console.log('Sireh & Salt (restaurant)');
  for (const pg of ['index', 'menu', 'order', 'book', 'festive', 'catering', 'vouchers', 'owner']) {
    const r = await p.goto(R + pg + '.html');
    ok(r.ok() && /Demo website/.test(await p.textContent('.demobar')), `${pg}.html loads with the demo banner`);
    const robots = await p.getAttribute('meta[name=robots]', 'content');
    if (pg === 'index') ok(/noindex/.test(robots || ''), 'pages are noindex');
    await shot('ss-' + pg);
  }
  await p.goto(R + 'index.html');
  ok((await p.$$('[data-signature] .dish')).length === 6, 'home: six signature dishes');
  ok(((await p.textContent('.status')) || '').length > 3, 'home: open / closed status shown: ' + (await p.textContent('.status')));
  ok(/pre-orders are open/.test(await p.textContent('[data-festive-strip]')), 'home: festive strip with the next season');
  ok((await p.$$('.review .sample')).length === 4 && /made up for this demo/.test(await p.textContent('.disclaim')), 'home: every review is labelled as a sample');
  await hoursOnce(R, ['index', 'menu', 'book']);
  {
    // two dishes with options in a row: the second must not add the first again (fixed 2026-11-14)
    const q = await (await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
    await q.goto(R + 'menu.html');
    for (const id of ['nasi-lemak', 'laksa']) {
      await q.click(`#i-${id} [data-add]`);
      await q.waitForSelector('[data-sheet]:not([hidden])');
      await q.click('[data-sheet-add]');
    }
    ok((await q.textContent('[data-bag-count]')) === '2', 'two dishes with options in a row: two in the bag, not three');
    await q.context().close();
  }

  // menu → options sheet → bag
  await p.goto(R + 'menu.html');
  ok((await p.$$('.mitem')).length === 15, 'menu: 15 dishes in 6 sections');
  await p.click('#i-laksa [data-add]');
  await p.waitForSelector('[data-sheet]:not([hidden])');
  await p.click('.sheet__panel label.opt:has-text("Bihun")');
  await p.click('.sheet__panel label.opt:has-text("Cockles")');
  const btn = await p.textContent('[data-sheet-add]');
  ok(/RM22\.90/.test(btn), 'options change the price (laksa + cockles = RM22.90): ' + btn.trim());
  await p.click('[data-sheet-add]');
  ok((await p.textContent('[data-bag-count]')) === '1' && await p.isVisible('[data-bagbar]'), 'added to the bag: count and bottom bar');
  await p.click('#i-mango-snow [data-add]'); // no options: straight in
  await p.click('[data-filter="mild"]');
  ok(!(await p.$('#i-laksa')) && !!(await p.$('#i-cendol')), 'filter "Not spicy" hides spicy dishes');

  // order: pick-up, pay online
  await p.goto(R + 'order.html');
  ok((await p.$$('.summary .line')).length === 2, 'order: both items in the summary');
  await p.click('.day >> nth=0');
  await p.click('.slot >> nth=0');
  await p.fill('#o-name', 'Test Customer');
  await p.fill('#o-phone', '012-345 6789');
  await p.click('#o-notes');
  await p.click('[data-place]');
  await p.waitForSelector('.done');
  const ref = (await p.textContent('.ref')).trim();
  ok(/^SS-\d+$/.test(ref) && /Order received/.test(await p.textContent('.done')), 'order placed (online payment, demo): ' + ref);
  ok((await p.textContent('[data-bag-count]')) === '0' || !(await p.isVisible('[data-bag-count]')), 'bag is empty after the order');

  // WhatsApp order + voucher + delivery area
  await p.goto(R + 'vouchers.html');
  await p.fill('#v-to', 'Mum');
  await p.fill('#v-msg', 'Dinner is on me');
  await p.click('[data-vbuy]');
  await p.waitForSelector('.done .ref');
  const vcode = (await p.textContent('.done .ref')).trim();
  ok(/^GIFT-[A-Z0-9]{4}$/.test(vcode), 'voucher bought (demo): ' + vcode);
  await p.goto(R + 'menu.html');
  await p.click('#i-prawns [data-add]');
  await p.click('#i-roti [data-add]');
  await p.goto(R + 'order.html');
  await p.click('[data-mode="delivery"]');
  await p.fill('#o-pc', '81300');
  await p.waitForSelector('.note--bad');
  ok(/outside our delivery area/.test(await p.textContent('[data-order]')), 'delivery: a postcode outside the area is refused (81300)');
  await p.fill('#o-pc', '46100');
  await p.waitForSelector('.note--ok');
  ok(/Petaling Jaya and Subang: delivery RM6\.00/.test(await p.textContent('[data-order]')), 'delivery: 46100 is inside, fee RM6');
  await p.fill('#o-addr', '12 Jalan Test, SS2');
  await p.fill('#o-code', vcode);
  await p.click('[data-apply]');
  ok(/Gift voucher .* applied/.test(await p.textContent('.summary')) && /−RM56\.90/.test(await p.textContent('.summary')), 'the voucher code takes RM100 off (capped at the subtotal)');
  await p.click('.slot >> nth=-1'); // the last time offered (late in the evening only one may be left)
  await p.fill('#o-name', 'Test Customer');
  await p.fill('#o-phone', '012-345 6789');
  await p.click('label.payopt:has-text("WhatsApp")');
  await p.click('[data-place]');
  await p.waitForSelector('.waprev');
  const wa = await p.textContent('.waprev');
  ok(/Grilled Tiger Prawns/.test(wa) && /Delivery/.test(wa) && /46100/.test(wa) && /Name: Test Customer/.test(wa), 'WhatsApp order: the message is filled in (items, delivery, address, name)');
  ok(/^https:\/\/wa\.me\/\?text=/.test(await p.getAttribute('.done a.btn--wa', 'href')), 'WhatsApp button opens wa.me with the message and no fixed number');

  // booking
  await p.goto(R + 'book.html');
  await p.click('[data-pax="4"]');
  await p.click('.slot:not([disabled]) >> nth=0');
  await p.fill('#b-name', 'Test Guest');
  await p.fill('#b-phone', '012-345 6789');
  await p.click('[data-confirm]');
  await p.waitForSelector('.done .ref');
  ok(/^SS-B\d+$/.test((await p.textContent('.done .ref')).trim()) && /Table for 4/.test(await p.textContent('.done')), 'booking confirmed (demo), with add-to-calendar');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-ics]')]);
  ok(/\.ics$/.test(dl.suggestedFilename()), 'calendar file downloads: ' + dl.suggestedFilename());

  // festive
  await p.goto(R + 'festive.html');
  ok((await p.$$('[data-season]')).length === 3 && /Order by/.test(await p.textContent('[data-fhero]')), 'festive: three seasons, cut-off and countdown');
  await p.click('[data-season="cny"]');
  const before = await p.textContent('.fset >> nth=0');
  await p.click('[data-fq="reunion6:1"]');
  await p.fill('#f-name', 'Test Family');
  await p.fill('#f-phone', '012-345 6789');
  ok(/RM194\.00/.test(await p.textContent('.summary')), 'festive: a 50% deposit is worked out (Reunion Set RM388 → RM194)');
  await p.click('[data-forder]');
  await p.waitForSelector('.done .ref');
  await p.goto(R + 'festive.html');
  await p.click('[data-season="cny"]');
  const after = await p.textContent('.fset >> nth=0');
  ok(/Only 9 left/.test(before) && /Only 8 left/.test(after), 'festive: "only X left" goes down after a pre-order');

  // catering
  await p.goto(R + 'catering.html');
  await p.click('[data-pick="Buffet"]');
  await p.fill('#c-pax', '40');
  await p.fill('#c-date', '2026-12-12');
  await p.fill('#c-name', 'Test Office');
  await p.fill('#c-phone', '012-345 6789');
  await p.click('form[data-catering] button[type=submit]');
  await p.waitForSelector('.done .ref');
  ok(/Buffet · 40 guests/.test(await p.textContent('.done .waprev')), 'catering enquiry sent (demo) with what the restaurant receives');

  // owner view
  await p.goto(R + 'owner.html');
  ok(/You placed this one/.test(await p.textContent('[data-owner]')), 'owner view: the test orders show up');
  await p.click('[data-tab="bookings"]');
  ok(/Test Guest/.test(await p.textContent('[data-owner]')), 'owner view: the test booking shows up');
  await p.click('[data-tab="menu"]');
  await p.check('[data-sold="laksa"]');
  await p.fill('[data-price="cendol"]', '10.9');
  await p.press('[data-price="cendol"]', 'Tab');
  await p.click('[data-tab="status"]');
  await p.click('[data-status-set="closed"]');
  ok(/Closed today/.test(await p.textContent('.status')), 'owner view: "Closed today" changes the status on the website');
  await shot('ss-owner-after');
  await p.goto(R + 'menu.html');
  ok(/Sold out/.test(await p.textContent('#i-laksa')) && await p.isDisabled('#i-laksa [data-add]'), 'menu: laksa is sold out after the owner switched it');
  ok(/RM10\.90/.test(await p.textContent('#i-cendol')), 'menu: the owner\'s new price shows (cendol RM10.90)');
  await p.goto(R + 'owner.html');
  await p.click('[data-reset]');
  await p.goto(R + 'menu.html');
  ok(!/Sold out/.test(await p.textContent('#i-laksa')), 'reset the demo: everything back to normal');

  // ---------------------------------------------------------------- Dulang & Daun (online shop for a food gift brand)
  console.log('Dulang & Daun (food gift shop)');
  const S = BASE + '/demo/dulang-daun/';
  for (const pg of ['index', 'shop', 'product', 'hamper', 'checkout', 'track', 'corporate', 'owner']) {
    const r = await p.goto(S + pg + '.html' + (pg === 'product' ? '?p=sambal-bilis' : ''));
    ok(r.ok() && /Demo website/.test(await p.textContent('.demobar')), `${pg}.html loads with the demo banner`);
    await shot('dd-' + pg);
  }
  await p.goto(S + 'index.html');
  ok((await p.$$('[data-best] .pcard')).length === 4 && (await p.$$('[data-hampers] .pcard')).length === 4, 'home: bestsellers and gift boxes');
  ok(/order by/.test(await p.textContent('[data-cutoff]')), 'home: festive delivery cut-off shown');
  ok((await p.$$('.review .sample')).length === 4, 'home: every review is labelled as a sample');
  await p.goto(S + 'shop.html');
  ok((await p.$$('[data-grid] .pcard')).length === 14, 'shop: 14 products');
  await p.click('[data-cat="hampers"]');
  ok((await p.$$('[data-grid] .pcard')).length === 4, 'shop: the hampers filter shows 4 gift boxes');
  await p.goto(S + 'product.html?p=sambal-bilis');
  await p.click('[data-v="0:1"]');
  ok(/RM28\.00/.test(await p.textContent('.pdp__price')), 'product: choosing 380 g changes the price to RM28');
  await p.click('.buyrow [data-add]');
  await p.waitForSelector('[data-drawer]:not([hidden])');
  ok(/Sambal Ikan Bilis/.test(await p.textContent('[data-cart-body]')) && /Add RM122\.00 more for free shipping/.test(await p.textContent('[data-cart-body]')), 'cart drawer opens with the free-shipping bar (RM122 to go)');
  await p.click('[data-cart-close] >> nth=1');
  await p.goto(S + 'product.html?p=pineapple-tarts');
  await p.click('[data-v="0:1"]');
  await p.fill('[data-notify] input', '012-345 6789');
  await p.click('[data-notify] button');
  ok(/on the list/.test(await p.textContent('[data-notify-box]')), 'sold-out option (40 pcs): notify me works');
  await p.goto(S + 'product.html?p=teh');
  ok(!!(await p.$('[data-notify]')) && !(await p.$('.buyrow')), 'sold-out product: notify me instead of add to cart');
  await p.goto(S + 'product.html?p=kerepek');
  await p.click('.buyrow [data-q="1"]');
  await p.click('.buyrow [data-q="1"]');
  await p.click('.buyrow [data-add]');
  await p.waitForSelector('[data-drawer]:not([hidden])');
  ok(/any 3 for RM27/.test(await p.textContent('[data-cart-body]')) && /−RM2\.70/.test(await p.textContent('[data-cart-body]')), 'kerepek: any 3 for RM27 is applied in the cart');
  await p.goto(S + 'hamper.html');
  await p.click('[data-box="S"]');
  for (const id of ['butter-cookies', 'pandan-cookies', 'kopi', 'sambal-udang']) await p.click(`[data-hi="${id}:1"]`);
  ok(/Add hamper to cart/.test(await p.textContent('[data-hadd]')) && /RM113\.00/.test(await p.textContent('.summary')), 'hamper builder: a full small box (RM18 + 4 items = RM113)');
  await p.click('[data-hadd]');
  await p.waitForSelector('[data-drawer]:not([hidden])');
  ok(/Your own hamper \(Small\)/.test(await p.textContent('[data-cart-body]')), 'the hamper goes into the cart with its contents');
  // checkout: fresh kaya can't go to East Malaysia; voucher; gift; pay online
  await p.goto(S + 'product.html?p=kaya');
  await p.click('.buyrow [data-add]');
  await p.goto(S + 'checkout.html');
  await p.fill('#c-name', 'Test Buyer');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-addr', '8 Jalan Test');
  await p.fill('#c-pc', '88000');
  await p.fill('#c-city', 'Kota Kinabalu');
  await p.selectOption('#c-state', 'Sabah');
  ok(/ships to West Malaysia only/.test(await p.textContent('[data-checkout]')), 'checkout: fresh kaya is refused for East Malaysia');
  await p.click('.summary .cline:has-text("Pandan Kaya") [data-cq$=":-1"]');
  ok(!/ships to West Malaysia only/.test(await p.textContent('[data-checkout]')) && /East Malaysia: 4–6 working days/.test(await p.textContent('[data-checkout]')), 'checkout: without the kaya, East Malaysia shipping is offered');
  await p.fill('#c-code', 'WELCOME10');
  await p.click('[data-apply]');
  ok(/10% off \(WELCOME10\) applied/.test(await p.textContent('.summary')), 'voucher WELCOME10 applied');
  await p.check('[data-gift]');
  await p.fill('#c-to', 'Auntie Mei');
  await p.fill('#c-msg', 'Happy new year');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref');
  const dno = (await p.textContent('.done .ref')).trim();
  ok(/^DD-\d+$/.test(dno) && /A gift for Auntie Mei/.test(await p.textContent('.done')), 'order paid (demo) as a gift: ' + dno);
  await p.click('.done a[href^="track.html"]');
  await p.waitForSelector('.timeline');
  ok(/Order received/.test(await p.textContent('[data-track-out]')), 'tracking page shows the new order');
  // WhatsApp order
  await p.goto(S + 'product.html?p=butter-cookies');
  await p.click('.buyrow [data-add]');
  await p.goto(S + 'checkout.html');
  await p.selectOption('#c-state', 'Selangor');
  await p.fill('#c-pc', '47400');
  await p.fill('#c-city', 'Petaling Jaya');
  await p.click('label.payopt:has-text("Order on WhatsApp")');
  await p.click('[data-place]');
  await p.waitForSelector('.waprev');
  ok(/Butter Cookies/.test(await p.textContent('.waprev')) && /Selangor/.test(await p.textContent('.waprev')) && /^https:\/\/wa\.me\/\?text=/.test(await p.getAttribute('.done a.btn--wa', 'href')), 'WhatsApp order: message filled in, wa.me with no fixed number');
  // owner: pack and ship → tracking follows; stock; waiting list
  await p.goto(S + 'owner.html');
  ok(new RegExp(dno).test(await p.textContent('[data-owner]')), 'owner view: the new order is there');
  await p.click(`[data-next="${dno}"]`); // Paid → Packed
  await p.click(`[data-next="${dno}"]`); // Packed → Shipped
  await p.goto(S + 'track.html?o=' + dno);
  await p.waitForSelector('.timeline');
  ok(/With the courier/.test(await p.textContent('[data-track-out]')) && /DEMO-TRK-\d+/.test(await p.textContent('[data-track-out]')), 'after "Ship" in the owner view, tracking shows the courier and a tracking number');
  await p.goto(S + 'track.html');
  await p.fill('#t-no', 'DD-2041');
  await p.fill('#t-phone', '012-345 6789');
  await p.click('[data-track] button');
  ok(/With the courier/.test(await p.textContent('[data-track-out]')), 'tracking: the demo order DD-2041 works');
  await p.goto(S + 'owner.html');
  await p.click('[data-tab="stock"]');
  await p.check('[data-out="sambal-bilis"]');
  await p.click('[data-tab="waitlist"]');
  ok(/Pineapple Tarts \(40 pcs\)/.test(await p.textContent('[data-owner]')) && /you, just now/.test(await p.textContent('[data-owner]')), 'waiting list shows the notify-me request');
  await p.click('[data-back="teh"]');
  await p.waitForSelector('[data-sheet]:not([hidden]) .waprev');
  ok(/Teh Tarik Premix is back in stock/.test(await p.textContent('.waprev')), '"back in stock": one message for everyone on the list');
  await p.goto(S + 'shop.html');
  ok(/Notify me/.test(await p.textContent('.pcard:has-text("Sambal Ikan Bilis")')) && /Add/.test(await p.textContent('.pcard:has-text("Teh Tarik Premix")')), 'shop follows the owner: sambal sold out, teh back on sale');
  // corporate
  await p.goto(S + 'corporate.html');
  await p.fill('#k-qty', '60');
  ok(/Volume discount \(10%\)/.test(await p.textContent('[data-corp]')) && /RM4,212\.00|RM4212\.00/.test(await p.textContent('[data-corp]')), 'corporate: 60 boxes get 10% off (estimate RM4,212)');
  await p.fill('#q-company', 'Test Sdn Bhd');
  await p.fill('#q-name', 'Test Buyer');
  await p.fill('#q-phone', '012-345 6789');
  await p.click('[data-corp-form] button[type=submit]');
  await p.waitForSelector('.done .ref');
  ok(/60 × Terima Kasih Box/.test(await p.textContent('.done .waprev')), 'corporate enquiry sent (demo)');
  await p.goto(S + 'owner.html');
  await p.click('[data-reset]');

  // ---------------------------------------------------------------- Maison Cendre (boutique restaurant)
  console.log('Maison Cendre (boutique restaurant)');
  const M = BASE + '/demo/maison-cendre/';
  await hoursOnce(M, ['index', 'menu', 'book']);
  for (const pg of ['index', 'menu', 'book', 'private', 'festive', 'order', 'gift', 'owner']) {
    const r = await p.goto(M + pg + '.html');
    ok(r.ok() && /Demo website/.test(await p.textContent('.demobar')), `${pg}.html loads with the demo banner`);
    await shot('mc-' + pg);
  }
  await p.goto(M + 'index.html');
  ok((await p.$$('[data-tasting] .courses li')).length === 8 && /Cendre/.test(await p.textContent('[data-tasting]')), 'home: the eight-course tasting menu');
  ok((await p.$$('.quote .sample')).length === 3 && /made up for this demo/.test(await p.textContent('.disclaim')), 'home: every guest note is labelled as a sample');
  ok(/at Maison Cendre/.test(await p.textContent('[data-festive-strip]')), 'home: the next seasonal menu with places left');
  await p.goto(M + 'menu.html');
  ok((await p.$$('[data-menu] .courses')).length === 2, 'menus: two tasting menus');
  await p.click('[data-mtab="carte"]');
  ok((await p.$$('[data-menu] .mrow')).length === 14 && /Gluten-free/.test(await p.textContent('[data-menu]')), 'menus: à la carte with dietary tags');
  // reservation at the chef's counter with a deposit
  await p.goto(M + 'book.html');
  await p.click('[data-seat="counter"]');
  ok((await p.$$('[data-pax]')).length === 4, 'counter: up to 4 guests');
  await p.click('[data-pax="2"]');
  await p.click('.slot:not(.is-full) >> nth=0');
  await p.fill('#b-name', 'Test Guest');
  await p.fill('#b-phone', '012-345 6789');
  await p.check('[data-diet][value="Nut allergy"]');
  ok(/Deposit, taken off the bill\s*RM200/.test(await p.textContent('.summary')), 'counter: RM100 deposit per guest (RM200 for two)');
  await p.click('[data-confirm]');
  await p.waitForSelector('.done .ref');
  ok(/^MC-\d+$/.test((await p.textContent('.done .ref')).trim()) && /Chef’s counter for 2/.test(await p.textContent('.done')), 'counter reservation received (demo)');
  ok(/Dietary: Nut allergy/.test(await p.textContent('.done .waprev')), 'the restaurant gets the dietary needs');
  const [mcIcs] = await Promise.all([p.waitForEvent('download'), p.click('[data-ics]')]);
  ok(/\.ics$/.test(mcIcs.suggestedFilename()), 'calendar file downloads');
  // a full time: waitlist
  await p.goto(M + 'book.html');
  let foundFull = false;
  for (let i = 0; i < 14 && !foundFull; i++) {
    const days = await p.$$('[data-day]');
    if (!days[i]) break;
    await days[i].click();
    if (await p.$('.slot.is-full')) { await p.click('.slot.is-full >> nth=0'); foundFull = true; }
  }
  if (foundFull) {
    ok(/Join the waitlist/.test(await p.textContent('[data-confirm]')), 'a full time offers the waitlist');
    await p.fill('#b-name', 'Waiting Guest');
    await p.fill('#b-phone', '012-345 6789');
    await p.click('[data-confirm]');
    await p.waitForSelector('.done .ref');
    ok(/on the waitlist/.test(await p.textContent('.done')), 'waitlist request received (demo)');
  } else ok(true, 'no full time in the next two weeks (waitlist not exercised this run)');
  // seasonal
  await p.goto(M + 'festive.html');
  await p.click('[data-season="cny"]');
  const mcBefore = await p.textContent('.fset >> nth=0');
  await p.click('[data-fq="cny-dinner:1"]');
  await p.click('[data-fq="cny-dinner:1"]');
  ok(!!(await p.$('[data-fseat]')), 'seasonal: a dine-in menu asks for the seating');
  await p.fill('#f-name', 'Test Family');
  await p.fill('#f-phone', '012-345 6789');
  ok(/RM458/.test(await p.textContent('.summary')) && /RM916/.test(await p.textContent('.summary')), 'seasonal: 2 × reunion dinner, 50% deposit');
  await p.click('[data-forder]');
  await p.waitForSelector('.done .ref');
  await p.goto(M + 'festive.html');
  await p.click('[data-season="cny"]');
  ok(/Only 23 left/.test(mcBefore) && /Only 21 left/.test(await p.textContent('.fset >> nth=0')), 'seasonal: places left go down after a booking');
  // gift card → takeaway with options → owner
  await p.goto(M + 'gift.html');
  await p.check('input[name=exp][value="0"]');
  await p.fill('#g-to', 'Mum and Dad');
  await p.click('[data-gbuy]');
  await p.waitForSelector('.done .ref');
  const mcCode = (await p.textContent('.done .ref')).trim();
  ok(/^GIFT-[A-Z0-9]{4}$/.test(mcCode), 'gift card (tasting menu for two) bought: ' + mcCode);
  await p.goto(M + 'order.html');
  await p.click('#t-wagyu [data-add]');
  await p.waitForSelector('[data-sheet]:not([hidden])');
  await p.click('.sheet__panel label.opt:has-text("Medium rare")');
  await p.click('.sheet__panel label.opt:has-text("Truffle butter")');
  ok(/RM248/.test(await p.textContent('[data-sheet-add]')), 'takeaway: wagyu + truffle butter = RM248');
  await p.click('[data-sheet-add]');
  await p.click('#t-bread [data-add]');
  await p.waitForSelector('.summary');
  await p.click('.day >> nth=0');
  await p.click('[data-order] .slot >> nth=0');
  await p.fill('#o-name', 'Test Diner');
  await p.fill('#o-phone', '012-345 6789');
  await p.fill('#o-code', mcCode);
  await p.click('[data-apply]');
  ok(/Gift card .* applied/.test(await p.textContent('.summary')), 'the gift card code works at the takeaway checkout');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref');
  ok(/^MC-T\d+$/.test((await p.textContent('.done .ref')).trim()), 'takeaway order placed (demo)');
  // private dining
  await p.goto(M + 'private.html');
  await p.click('[data-space="The salon"]');
  await p.fill('#p-guests', '12');
  await p.fill('#p-name', 'Test Host');
  await p.fill('#p-phone', '012-345 6789');
  await p.click('[data-private] button[type=submit]');
  await p.waitForSelector('.done .ref');
  ok(/The salon · 12 guests/.test(await p.textContent('.done .waprev')), 'private dining enquiry sent (demo)');
  // owner view
  await p.goto(M + 'owner.html');
  ok(/You booked this one/.test(await p.textContent('[data-owner]')) && /covers tonight/.test(await p.textContent('.phone__top')), 'owner view: tonight with covers and the test reservation');
  await p.click('[data-tab="takeaway"]');
  ok(/MC-T\d+/.test(await p.textContent('[data-owner]')), 'owner view: the takeaway order');
  await p.click('[data-tab="menu"]');
  await p.check('[data-out="duck"]');
  await p.click('[data-tab="status"]');
  await p.click('[data-status-set="closed"]');
  await p.goto(M + 'menu.html');
  await p.click('[data-mtab="carte"]');
  ok(/Not available tonight/.test(await p.textContent('#m-duck')), 'menus follow the owner: the duck is off tonight');
  ok(/private event/.test(await p.textContent('[data-status]')), 'status follows the owner: closed for a private event');
  await p.goto(M + 'owner.html');
  await p.click('[data-reset]');

  // ---------------------------------------------------------------- Butter & Lantern (RM399 festive shop, v2 2026-11-13)
  console.log('Butter & Lantern (festive pre-order shop)');
  const FB = BASE + '/demo/butter-lantern/';
  const myToday = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const fr = await p.goto(FB + 'index.html?fest=cny');
  ok(fr.ok() && /Demo website/.test(await p.textContent('.demobar')) && /up to 10 items/.test(await p.textContent('.demobar')) && (await p.$$('[data-fests] button')).length === 4, 'loads with the demo banner (RM399, up to 10 items) and four festivals');
  const blHero = await p.textContent('[data-hero]');
  ok((await p.getAttribute('body', 'data-lang')) === 'zh' && /团圆的味道/.test(blHero) && /黄梨球/.test(blHero) && /天/.test(blHero), 'Chinese New Year: Chinese first, countdown, and this season’s cookies in the opening');
  ok((await p.$$('a[href*="wa.me"]')).length === 0 && /FPX/.test(await p.textContent('#how')), 'ordering is an online checkout (no WhatsApp ordering); payment methods listed');
  ok(/已售完/.test(await p.textContent('#i-ng')) && await p.$eval('#i-ng .card__foot button', (x) => x.disabled), 'a sold-out item says so and cannot be added');
  ok(/最多可以放 10 样/.test(await p.textContent('[data-cap]')), 'the page says a RM399 shop holds up to 10 items');
  await shot('bl-cny');
  await p.click('#i-pb .card__foot [data-item]');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-opt="l"]');
  await p.click('[data-sq="1"]');
  ok(/RM156\.00/.test(await p.textContent('[data-sheet-add]')), 'options: big jar × 2 = RM156');
  await p.click('[data-sheet-add]');
  await p.waitForSelector('[data-drawer].is-on');
  const cnyEarly = myToday <= '2026-12-31';
  const cartTxt = await p.textContent('[data-drawer]');
  ok(/RM156\.00/.test(cartTxt) && (cnyEarly ? /−RM15\.60/.test(cartTxt) && /RM140\.40/.test(cartTxt) : true), 'cart: subtotal' + (cnyEarly ? ', early-bird 10% off, total RM140.40' : ''));
  await p.goto(FB + 'checkout.html?fest=cny');
  ok(/结账/.test(await p.textContent('h1')) && (await p.$$('.slot:not([disabled])')).length > 0, 'checkout: collection days and time slots with places left');
  await p.click('[data-next]');
  await p.click('[data-next]');
  ok(/请填写名字/.test(await p.textContent('[data-err]')), 'details are checked before payment');
  await p.fill('#c-name', 'Test Auntie');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-email', 'auntie@example.com');
  await p.check('[data-k="gift"]');
  await p.fill('#c-gname', 'Uncle Lim');
  await p.fill('#c-gphone', '012-777 8888');
  await p.fill('#c-gmsg', '新年快乐');
  await p.click('[data-next]');
  await p.click('[data-pay-go]');
  ok(/请选银行/.test(await p.textContent('[data-err]')), 'FPX asks for a bank first');
  await p.click('[data-bank="Maybank2u"]');
  await p.click('[data-pay-go]');
  await p.waitForSelector('[data-pay].is-on');
  ok(/Secure payment/.test(await p.textContent('[data-pay]')) && /Maybank2u/.test(await p.textContent('[data-pay]')), 'the payment page shows the amount and the bank (demo, nothing charged)');
  await Promise.all([p.waitForURL(/\/order(\.html)?\?/), p.click('[data-approve]')]);
  const ord1 = await p.textContent('main');
  const no1 = (ord1.match(/BL-\d+/) || [''])[0];
  ok(/订单已确认/.test(ord1) && !!no1 && /auntie@example\.com/.test(ord1) && /订单确认 BL-/.test(ord1) && /Uncle Lim/.test(ord1), 'order confirmed: order number, the confirmation email, gift recipient');
  await p.goto(FB + 'index.html?fest=cny');
  ok(/只剩 35 份/.test(await p.textContent('#i-pb')), 'stock goes down after the order (37 → 35)');
  await p.goto(FB + 'owner.html?fest=cny');
  const ownTxt = await p.textContent('[data-owner]');
  ok(ownTxt.includes(no1) && /Test Auntie/.test(ownTxt) && /待确认付款/.test(ownTxt), 'owner: the new order is on the list, with payments to check');
  await p.click('[data-adv="' + no1 + '"]');
  ok(/制作中/.test(await p.textContent('[data-row="' + no1 + '"]')), 'owner: one tap moves the order to baking');
  await p.click('[data-tab="bake"]');
  ok(/黄梨球/.test(await p.textContent('.prod')), 'owner: what to bake that day');
  await p.click('[data-tab="stock"]');
  ok((await p.$$('.stk__row')).length === 8, 'owner: stock for every item');
  await p.goto(FB + 'order.html?fest=cny');
  await p.fill('#t-no', no1);
  await p.fill('#t-ph', '0123456789');
  await Promise.all([p.waitForURL(/no=BL-/), p.click('[data-track] button[type=submit]')]);
  ok(/制作中/.test(await p.textContent('.tl')), 'track order: number + mobile shows the status the owner set');
  // Christmas, in English: Klang Valley delivery + DuitNow QR with a receipt
  await p.goto(FB + 'index.html?fest=xmas');
  ok((await p.getAttribute('body', 'data-lang')) === 'en' && /Christmas bakes/.test(await p.textContent('[data-hero]')), 'one link re-dresses the shop for Christmas, in English');
  await p.click('#i-gb .card__foot [data-item]');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-sheet-add]');
  await p.goto(FB + 'checkout.html?fest=xmas');
  await p.click('[data-mode="kv"]');
  await p.fill('#c-addr', '12 Jalan SS2/24, Petaling Jaya');
  await p.fill('#c-pc', '81300');
  ok(/outside the Klang Valley/.test(await p.textContent('[data-pcnote]')), 'delivery: a postcode outside the Klang Valley is caught');
  await p.fill('#c-pc', '47300');
  ok(/inside our Klang Valley area/.test(await p.textContent('[data-pcnote]')) && /RM15\.00/.test(await p.textContent('.summ')), 'delivery: Klang Valley postcode, RM15 under RM200');
  await p.click('[data-next]');
  await p.fill('#c-name', 'Sarah Test');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-email', 'sarah@example.com');
  await p.click('[data-next]');
  await p.click('[data-pm="duitnow"]');
  ok(!!(await p.$('.qr svg')) && !!(await p.$('[data-receipt]')), 'DuitNow QR with a receipt upload');
  await p.click('[data-pay-go]');
  ok(/upload your receipt/i.test(await p.textContent('[data-err]')), 'DuitNow needs the receipt');
  await p.click('[data-skip-receipt]');
  await Promise.all([p.waitForURL(/\/order(\.html)?\?/), p.click('[data-pay-go]')]);
  const no2 = ((await p.textContent('main')).match(/BL-\d+/) || [''])[0];
  ok(/checking your payment/i.test(await p.textContent('main')), 'DuitNow order: received, payment being checked');
  await p.goto(FB + 'owner.html?fest=xmas');
  await p.click('[data-adv="' + no2 + '"]');
  ok(/Paid/.test(await p.textContent('[data-row="' + no2 + '"]')), 'owner: "Payment received" confirms a DuitNow order');
  // Valentine's: roses never go by courier
  await p.goto(FB + 'index.html?fest=val#i-cr');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-sheet-add]');
  await p.goto(FB + 'checkout.html?fest=val');
  ok(await p.$eval('[data-mode="courier"]', (x) => x.disabled), "Valentine's: roses and cupcakes can't go by courier");
  await p.goto(FB + 'index.html?fest=raya');
  ok((await p.getAttribute('body', 'data-lang')) === 'ms' && /Kuih raya/.test(await p.textContent('[data-hero]')) && /Tart Nenas/.test(await p.textContent('#sets')), 'Hari Raya: Malay first, with Raya cookies');
  await shot('bl-raya');
  await p.goto(FB + 'index.html');
  ok(['cny', 'raya', 'xmas', 'val'].includes(await p.getAttribute('body', 'data-fest')), 'without ?fest the shop shows the next festival');

  // desktop layout
  const d = await b.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const dp = await d.newPage();
  dp.on('pageerror', (e) => errors.push(e.message));
  for (const u of ['sireh-salt/index', 'sireh-salt/menu', 'sireh-salt/order', 'sireh-salt/festive', 'sireh-salt/owner', 'dulang-daun/index', 'dulang-daun/shop', 'dulang-daun/product', 'dulang-daun/hamper', 'dulang-daun/checkout', 'dulang-daun/owner', 'maison-cendre/index', 'maison-cendre/menu', 'maison-cendre/book', 'maison-cendre/festive', 'maison-cendre/owner', 'butter-lantern/index', 'butter-lantern/checkout', 'butter-lantern/order', 'butter-lantern/owner']) {
    await dp.goto(BASE + '/demo/' + u + '.html' + (u.endsWith('product') ? '?p=hamper-ong' : ''));
    const over = await dp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, `desktop ${u}.html: no sideways scrolling`);
    if (SHOTS) await dp.screenshot({ path: `${SHOTS}/desktop-${u.replace('/', '-')}.png`, fullPage: false });
  }
  const phoneW = devices['iPhone 13'].viewport.width;
  await p.goto(R + 'menu.html');
  await p.click('#i-satay [data-add]');
  await p.click('[data-sheet-add]');
  await p.goto(S + 'product.html?p=kopi');
  await p.click('.buyrow [data-add]');
  for (const u of ['sireh-salt/index', 'sireh-salt/menu', 'sireh-salt/order', 'sireh-salt/book', 'sireh-salt/festive', 'sireh-salt/catering', 'sireh-salt/vouchers', 'sireh-salt/owner',
    'dulang-daun/index', 'dulang-daun/shop', 'dulang-daun/product', 'dulang-daun/hamper', 'dulang-daun/checkout', 'dulang-daun/track', 'dulang-daun/corporate', 'dulang-daun/owner',
    'maison-cendre/index', 'maison-cendre/menu', 'maison-cendre/book', 'maison-cendre/private', 'maison-cendre/festive', 'maison-cendre/order', 'maison-cendre/gift', 'maison-cendre/owner', 'butter-lantern/index', 'butter-lantern/checkout', 'butter-lantern/order', 'butter-lantern/owner']) {
    await p.goto(BASE + '/demo/' + u + '.html' + (u.endsWith('product') ? '?p=sambal-bilis' : ''));
    const w = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth));
    ok(w <= phoneW + 1, `phone ${u}.html: fits the phone width (${w}px)`);
  }
  ok(!errors.length, 'no JavaScript errors' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));
  await b.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
