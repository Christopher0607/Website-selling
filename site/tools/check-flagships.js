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
  await p.click('.slot >> nth=1');
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

  // desktop layout
  const d = await b.newContext({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
  const dp = await d.newPage();
  dp.on('pageerror', (e) => errors.push(e.message));
  for (const pg of ['index', 'menu', 'order', 'festive', 'owner']) {
    await dp.goto(R + pg + '.html');
    const over = await dp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, `desktop ${pg}.html: no sideways scrolling`);
    if (SHOTS) await dp.screenshot({ path: `${SHOTS}/ss-desktop-${pg}.png`, fullPage: false });
  }
  const phoneW = devices['iPhone 13'].viewport.width;
  await p.goto(R + 'menu.html');
  await p.click('#i-satay [data-add]');
  await p.click('[data-sheet-add]');
  for (const pg of ['index', 'menu', 'order', 'book', 'festive', 'catering', 'vouchers', 'owner']) {
    await p.goto(R + pg + '.html');
    const w = await p.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth));
    ok(w <= phoneW + 1, `phone ${pg}.html: fits the phone width (${w}px)`);
  }
  ok(!errors.length, 'no JavaScript errors' + (errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''));
  await b.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
