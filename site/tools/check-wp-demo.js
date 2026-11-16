// End-to-end check of a studio demo running on real WordPress + WooCommerce (2026-11-16, docs/14-wordpress-demos.md).
//   node site/tools/check-wp-demo.js <site address> <demo>        e.g. http://sireh-salt.demo.kedailab.test sireh-salt
// What a visitor does (pages, live prices, orders, bookings, festive, catering, vouchers, table QR) and what the owner
// sees: the order / booking / enquiry in the shop dashboard (/dian/) and in WordPress admin (demo account, one tap), a
// price changed in WordPress admin showing on the website, and what the demo account must NOT be able to open.
// Leaves test orders behind (the demo is put back every night; locally: scripts/server/demo-reset.sh <site>).
const { chromium } = require('playwright');

const BASE = (process.argv[2] || '').replace(/\/$/, '');
const DEMO = process.argv[3] || '';
if (!BASE || !DEMO) { console.log('用法: node site/tools/check-wp-demo.js <网址> <示范代号>'); process.exit(2); }

let fail = 0, pass = 0;
const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (c) pass++; else fail++; };

async function newPage(b, vp) {
  const ctx = await b.newContext({ viewport: vp || { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|favicon|hit\.js|status of 40[13]/.test(m.text())) p.errors.push(m.text()); });
  p.on('dialog', (d) => d.accept());
  return p;
}

// Save a product in WordPress admin (the SEO plugin holds the Update button until its own script is ready).
async function saveProduct(a) {
  await a.waitForLoadState('networkidle');
  for (let i = 0; i < 4; i++) {
    await a.waitForTimeout(2500); // like a person: the editor's scripts (SEO plugin) take a moment to take over the button
    const saved = a.waitForURL(/message=1|post\.php\?post=\d+&action=edit/, { timeout: 15000, waitUntil: 'load' }).then(() => true).catch(() => false);
    const posted = a.waitForRequest((r) => r.method() === 'POST' && /wp-admin\/post\.php/.test(r.url()), { timeout: 12000 }).then(() => true).catch(() => false);
    await a.click('#publish');
    if (await posted && await saved) break;
  }
  await a.waitForFunction(() => /Product (updated|published)/.test(document.body.textContent), null, { timeout: 30000 });
  await a.waitForLoadState('networkidle');
}

// Open a product's edit page in WordPress admin (search the product list, follow the title's link).
async function editProduct(a, name) {
  await a.goto(BASE + '/wp-admin/edit.php?post_type=product&s=' + encodeURIComponent(name));
  const href = await a.getAttribute(`a.row-title:has-text("${name}")`, 'href');
  await a.goto(href);
  await a.waitForSelector('#_regular_price', { state: 'attached' });
  await a.waitForLoadState('networkidle');
}

// Stock status: radio buttons in recent WooCommerce, a dropdown in older ones.
async function stockStatus(a, v) {
  await a.click('a[href="#inventory_product_data"]');
  if (await a.$('select#_stock_status')) await a.selectOption('select#_stock_status', v);
  else await a.check(`input[name="_stock_status"][value="${v}"]`);
}

// The demo account (one tap) into WordPress admin; returns the page.
async function admin(b) {
  const a = await newPage(b, { width: 1366, height: 900 });
  await a.goto(BASE + '/?agc_demo=admin');
  await a.waitForLoadState('domcontentloaded');
  return a;
}

async function adminText(a, path) {
  await a.goto(BASE + path);
  return (await a.textContent('body')) || '';
}

async function common(b, pages) {
  console.log('Pages');
  const p = await newPage(b);
  for (const pg of pages) {
    const r = await p.goto(`${BASE}/${pg}.html`);
    const live = await p.evaluate(() => !!(window.AGC_LIVE && window.AGC_LIVE.rest));
    ok(r.status() === 200 && live && /Demo website|Concept demo/i.test((await p.textContent('body')) || ''), `${pg}.html: 200, the demo banner, live data from WordPress`);
  }
  ok(/noindex/.test((await p.getAttribute('meta[name=robots]', 'content')) || ''), 'pages are noindex');
  ok(p.errors.length === 0, 'no JavaScript errors on the pages' + (p.errors.length ? ': ' + p.errors.slice(0, 2).join(' | ') : ''));
  await p.context().close();
}

async function restrictions(b) {
  console.log('Demo account limits (WordPress admin)');
  const a = await admin(b);
  ok(/wc-orders|shop_order/.test(a.url()), 'one tap: logged in to WordPress admin, on the orders page');
  for (const [path, what] of [['/wp-admin/options-general.php', 'settings'], ['/wp-admin/plugins.php', 'plugins'], ['/wp-admin/users.php', 'users'], ['/wp-admin/admin.php?page=wc-settings', 'WooCommerce settings'], ['/wp-admin/theme-editor.php', 'theme editor']]) {
    const t = await adminText(a, path);
    ok(/not allowed|Sorry, you are not allowed|do not have sufficient permissions/i.test(t), `cannot open ${what}`);
  }
  await a.context().close();
}

async function sirehSalt(b) {
  await common(b, ['index', 'menu', 'order', 'book', 'festive', 'catering', 'vouchers', 'owner']);
  const p = await newPage(b);
  const live = async () => p.evaluate(() => window.AGC_LIVE);

  console.log('Menu: the dishes and prices come from WooCommerce');
  await p.goto(BASE + '/menu.html');
  ok((await p.$$('.mitem')).length === 15, 'menu: 15 dishes (the WooCommerce products)');
  const L = await live();
  const kopi = L.data.MENU.find((x) => x.id === 'kopi');
  ok(kopi && kopi.p === 6.5 && /RM6\.50/.test(await p.textContent('#i-kopi')), 'Kopi Ais: RM6.50 from WooCommerce');

  console.log('A price and a sold-out switch changed in WordPress admin show on the website');
  const a = await admin(b);
  await editProduct(a, 'Kopi Ais');
  await a.fill('#_regular_price', '7.20');
  await saveProduct(a);
  await p.goto(BASE + '/menu.html');
  ok(/RM7\.20/.test(await p.textContent('#i-kopi')), 'new price RM7.20 is on the menu straight away');
  await a.fill('#_regular_price', '6.50');
  await saveProduct(a);
  await editProduct(a, 'Mango Sago Snow');
  await stockStatus(a, 'outofstock');
  await saveProduct(a);
  await p.goto(BASE + '/menu.html');
  ok(/Sold out/.test(await p.textContent('#i-mango-snow')), 'out of stock in WooCommerce → "Sold out" on the menu');
  await stockStatus(a, 'instock');
  await saveProduct(a);

  console.log('Pick-up order with options and a promo code → a real WooCommerce order');
  await p.goto(BASE + '/menu.html');
  await p.click('#i-laksa [data-add]');
  await p.waitForSelector('[data-sheet]:not([hidden])');
  await p.click('.sheet__panel label.opt:has-text("Bihun")');
  await p.click('.sheet__panel label.opt:has-text("Cockles")');
  ok(/RM22\.90/.test(await p.textContent('[data-sheet-add]')), 'options change the price (laksa + cockles = RM22.90)');
  await p.click('[data-sheet-add]');
  await p.click('#i-kopi [data-add]');
  await p.waitForSelector('[data-sheet]:not([hidden])');
  await p.click('[data-sheet-add]');
  await p.goto(BASE + '/order.html');
  await p.click('.day >> nth=0');
  await p.click('.slot >> nth=0');
  await p.fill('#o-name', 'Test Customer');
  await p.fill('#o-phone', '012-345 6789');
  await p.fill('#o-code', 'SIREH10');
  await p.click('[data-apply]');
  await p.waitForFunction(() => /10% off/i.test(document.querySelector('.summary').textContent), null, { timeout: 15000 });
  ok(/−RM2\.94/.test(await p.textContent('.summary')), 'SIREH10 (a WooCommerce coupon) takes 10% off: −RM2.94');
  ok(/made-up name/.test(await p.textContent('[data-order]')), 'the page asks for made-up details (other visitors see the demo back office)');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const ref = (await p.textContent('.done .ref')).trim();
  ok(/^SS-\d+$/.test(ref) && /RM26\.46/.test(await p.textContent('.done')), 'order placed: ' + ref + ', paid RM26.46 (demo payment)');
  const orderNo = ref.replace('SS-', '');

  console.log('Gift voucher → a real one-time code → used on a delivery order');
  await p.goto(BASE + '/vouchers.html');
  await p.fill('#v-to', 'Mum');
  await p.fill('#v-from', 'Test');
  await p.click('[data-vbuy]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const vcode = (await p.textContent('.done .ref')).trim();
  ok(/^GIFT-[A-Z0-9]{6}$/.test(vcode), 'voucher bought: ' + vcode + ' (a WooCommerce coupon)');
  await p.goto(BASE + '/menu.html');
  await p.click('#i-prawns [data-add]');
  await p.goto(BASE + '/order.html');
  await p.click('[data-mode="delivery"]');
  await p.fill('#o-pc', '46100');
  await p.waitForSelector('.note--ok');
  await p.fill('#o-addr', '12 Jalan Test, SS2');
  await p.fill('#o-code', vcode);
  await p.click('[data-apply]');
  await p.waitForFunction(() => /Gift voucher|RM100/.test(document.querySelector('.summary').textContent) && !/Checking/.test(document.querySelector('.summary').textContent), null, { timeout: 15000 });
  ok(/−RM42\.00/.test(await p.textContent('.summary')), 'voucher takes RM100 off, capped at the subtotal (RM42)');
  await p.click('.slot >> nth=-1');
  await p.fill('#o-name', 'Test Customer');
  await p.fill('#o-phone', '012-345 6789');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  ok(/^SS-\d+$/.test((await p.textContent('.done .ref')).trim()) && /RM6\.00/.test(await p.textContent('.done')), 'delivery order with the voucher: only the RM6 delivery fee to pay');
  await p.goto(BASE + '/menu.html');
  await p.click('#i-roti [data-add]');
  await p.goto(BASE + '/order.html');
  await p.fill('#o-code', vcode);
  await p.click('[data-apply]');
  await p.waitForFunction(() => !/Checking/.test(document.querySelector('[data-order]').textContent), null, { timeout: 15000 });
  ok(/used|doesn’t work|expired/i.test(await p.textContent('[data-order]')), 'the voucher works only once');
  await p.fill('#o-code', '');
  await p.click('[data-apply]');

  console.log('Booking → a real booking; the time shows one table fewer');
  await p.goto(BASE + '/book.html');
  await p.click('[data-pax="4"]');
  const slotTxt = await p.textContent('.slot:not([disabled]) >> nth=0');
  await p.click('.slot:not([disabled]) >> nth=0');
  await p.fill('#b-name', 'Test Guest');
  await p.fill('#b-phone', '012-345 6789');
  await p.click('[data-confirm]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const bref = (await p.textContent('.done .ref')).trim();
  ok(/^SS-B\d+$/.test(bref) && /Table for 4/.test(await p.textContent('.done')), 'booking saved: ' + bref);
  await p.goto(BASE + '/book.html');
  const after = await p.textContent('.slot >> nth=0');
  const nT = (x) => +((x.match(/(\d+) tables?/) || [])[1] || (/1 table left/.test(x) ? 1 : 0));
  ok(nT(after) === nT(slotTxt) - 1, `that time now shows one table fewer ("${slotTxt.trim()}" → "${after.trim()}")`);

  console.log('Festive pre-order → stock goes down in WooCommerce');
  await p.goto(BASE + '/festive.html');
  await p.click('[data-season="cny"]');
  const fb = await p.textContent('.fset >> nth=0');
  await p.click('[data-fq="reunion6:1"]');
  await p.click('[data-fday] >> nth=0');
  await p.fill('#f-name', 'Test Family');
  await p.fill('#f-phone', '012-345 6789');
  await p.click('[data-forder]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  ok(/^SS-\d+$/.test((await p.textContent('.done .ref')).trim()), 'festive pre-order placed: ' + (await p.textContent('.done .ref')).trim());
  await p.goto(BASE + '/festive.html');
  await p.click('[data-season="cny"]');
  const fa = await p.textContent('.fset >> nth=0');
  const nL = (x) => +((x.match(/Only (\d+) left/) || [])[1] || -1);
  ok(nL(fb) > 0 && nL(fa) === nL(fb) - 1, `"only X left" comes from WooCommerce stock (${nL(fb)} → ${nL(fa)})`);

  console.log('Catering enquiry → saved for the restaurant');
  await p.goto(BASE + '/catering.html');
  await p.click('[data-pick="Buffet"]');
  await p.fill('#c-pax', '40');
  await p.fill('#c-date', '2026-12-12');
  await p.fill('#c-name', 'Test Office');
  await p.fill('#c-phone', '012-345 6789');
  await p.click('form[data-catering] button[type=submit]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const eref = (await p.textContent('.done .ref')).trim();
  ok(/^SS-E\d+$/.test(eref), 'catering enquiry saved: ' + eref);

  console.log('Owner page → the real back office');
  await p.goto(BASE + '/owner.html');
  ok(await p.isVisible('[data-live-dian]') && await p.isVisible('[data-live-admin]'), 'owner page: buttons to the shop dashboard and WordPress admin');
  await p.click('[data-live-dian]');
  await p.waitForURL(/\/dian\//);
  await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
  await p.goto(BASE + '/dian/#/orders');
  await p.waitForTimeout(2500);
  ok(((await p.textContent('.main')) || '').includes(orderNo), 'shop dashboard (demo account): the order is there #' + orderNo);

  console.log('WordPress admin shows the same order, booking and enquiry');
  ok((await adminText(a, '/wp-admin/admin.php?page=wc-orders')).includes(orderNo) || (await adminText(a, '/wp-admin/edit.php?post_type=shop_order')).includes(orderNo), 'WooCommerce orders: #' + orderNo);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_booking')).includes(bref), 'Bookings: ' + bref);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_enquiry')).includes(eref), 'Enquiries: ' + eref);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=shop_coupon')).toLowerCase().includes(vcode.toLowerCase()), 'Coupons: the voucher code ' + vcode + ' (WooCommerce keeps codes in lower case)');

  console.log('Table QR → the real table page → the kitchen');
  const t = await newPage(b);
  await t.goto(BASE + '/table.html?t=5');
  ok(/\/table\/\?t=5&k=/.test(t.url()), 'table.html?t=5 opens the real table page (with the table key)');
  await t.waitForSelector('.tq-item');
  await t.locator('.tq-item:has-text("Kopi Ais") .tq-add').click();
  await t.click('.tq-sheet--item .tq-btn');
  await t.click('.tq-bar__btn');
  await t.click('.tq-sheet--cart .tq-btn');
  await t.waitForSelector('.tq-sheet--sent .tq-sent [data-order]', { timeout: 20000 });
  const tno = await t.getAttribute('.tq-sheet--sent .tq-sent [data-order]', 'data-order');
  const link = await t.getAttribute('.tq-demo a', 'href');
  ok(!!link && /agc_demo=dian/.test(link), '"See the restaurant’s side" goes to the real kitchen screen');
  await t.goto(link);
  await t.waitForSelector('.kt', { timeout: 20000 });
  ok((await t.textContent('.main')).includes(tno) && /Table 5/.test(await t.textContent('.main')), 'kitchen screen: table 5’s order ' + tno);
  await t.context().close();

  ok(p.errors.length === 0, 'no JavaScript errors' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' | ') : ''));
  await a.context().close();
  await p.context().close();
  await restrictions(b);
}

async function maisonCendre(b) {
  await common(b, ['index', 'menu', 'book', 'private', 'festive', 'order', 'gift', 'owner']);
  const p = await newPage(b);

  console.log('Menus: dishes and prices from WooCommerce');
  await p.goto(BASE + '/menu.html');
  await p.click('[data-mtab="carte"]');
  ok((await p.$$('[data-menu] .mrow')).length === 14 && /RM58/.test(await p.textContent('#m-scallop')), 'à la carte: 14 dishes, scallop crudo RM58 (WooCommerce)');

  console.log('Chef’s counter: RM100 deposit per guest, paid at booking');
  await p.goto(BASE + '/book.html');
  await p.click('[data-seat="counter"]');
  ok((await p.$$('[data-pax]')).length === 4, 'counter: up to 4 guests');
  await p.click('[data-pax="2"]');
  await p.click('.slot:not(.is-full) >> nth=0');
  const cDate = await p.getAttribute('.day.is-on', 'data-day');
  const cTime = await p.getAttribute('.slot.is-on', 'data-time');
  await p.fill('#b-name', 'Test Guest');
  await p.fill('#b-phone', '012-345 6789');
  await p.check('[data-diet][value="Nut allergy"]');
  ok(/RM200/.test(await p.textContent('.summary')), 'deposit RM200 for two');
  await p.click('[data-confirm]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const bref = (await p.textContent('.done .ref')).trim();
  ok(/^MC-B\d+$/.test(bref) && /Chef’s counter for 2/.test(await p.textContent('.done')) && /RM200/.test(await p.textContent('.done')), 'counter reservation saved, deposit paid: ' + bref);
  await p.goto(BASE + '/book.html');
  const seen = await p.evaluate((k) => (window.AGC_LIVE.bookedBy || {})[k], `counter|${cDate}|${cTime}`);
  ok(Array.isArray(seen) && seen[1] === 2, 'the counter now has 2 of its 8 seats taken at that sitting');

  console.log('A full sitting offers the waitlist');
  for (const n of ['A', 'B']) {
    await p.goto(BASE + '/book.html');
    await p.click('[data-seat="counter"]');
    await p.click(`[data-day="${cDate}"]`);
    await p.click(`[data-time="${cTime}"]`);
    await p.click('[data-pax="3"]');
    await p.fill('#b-name', 'Guest ' + n);
    await p.fill('#b-phone', '012-345 6789');
    await p.click('[data-confirm]');
    await p.waitForSelector('.done .ref', { timeout: 20000 });
  }
  await p.goto(BASE + '/book.html');
  await p.click('[data-seat="counter"]');
  await p.click(`[data-day="${cDate}"]`);
  await p.click(`[data-time="${cTime}"]`);
  await p.click('[data-pax="1"]');
  ok(/Join the waitlist/.test(await p.textContent('[data-confirm]')), '8 of 8 seats taken: the button says "Join the waitlist"');
  await p.fill('#b-name', 'Waiting Guest');
  await p.fill('#b-phone', '012-345 6789');
  await p.click('[data-confirm]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const wref = (await p.textContent('.done .ref')).trim();
  ok(/on the waitlist/.test(await p.textContent('.done')), 'waitlist request saved: ' + wref);

  console.log('Seasonal menu: 50% deposit, places from WooCommerce stock');
  await p.goto(BASE + '/festive.html');
  await p.click('[data-season="cny"]');
  const fb = await p.textContent('.fset >> nth=0');
  await p.click('[data-fq="cny-dinner:1"]');
  await p.click('[data-fq="cny-dinner:1"]');
  await p.fill('#f-name', 'Test Family');
  await p.fill('#f-phone', '012-345 6789');
  ok(/RM916/.test(await p.textContent('.summary')), 'two reunion dinners: RM916');
  await p.click('[data-forder]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  ok(/^MC-\d+$/.test((await p.textContent('.done .ref')).trim()), 'seasonal booking saved: ' + (await p.textContent('.done .ref')).trim());
  await p.goto(BASE + '/festive.html');
  await p.click('[data-season="cny"]');
  const nL = (x) => +((x.match(/Only (\d+) left/) || [])[1] || -1);
  const fa = await p.textContent('.fset >> nth=0');
  ok(nL(fb) > 0 && nL(fa) === nL(fb) - 2, `places left go down by two (${nL(fb)} → ${nL(fa)})`);

  console.log('Gift card (an experience) → a real code → takeaway with options');
  await p.goto(BASE + '/gift.html');
  await p.check('input[name=exp][value="0"]');
  await p.fill('#g-to', 'Mum and Dad');
  await p.click('[data-gbuy]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const gcode = (await p.textContent('.done .ref')).trim();
  ok(/^GIFT-[A-Z0-9]{6}$/.test(gcode), 'gift card (Cendre tasting menu for two) bought: ' + gcode);
  await p.goto(BASE + '/order.html');
  await p.click('#t-wagyu [data-add]');
  await p.waitForSelector('[data-sheet]:not([hidden])');
  await p.click('.sheet__panel label.opt:has-text("Medium rare")');
  await p.click('.sheet__panel label.opt:has-text("Truffle butter")');
  ok(/RM248/.test(await p.textContent('[data-sheet-add]')), 'wagyu + truffle butter = RM248');
  await p.click('[data-sheet-add]');
  await p.click('#t-bread [data-add]');
  await p.waitForSelector('.summary');
  await p.click('.day >> nth=0');
  await p.click('[data-order] .slot >> nth=0');
  await p.fill('#o-name', 'Test Diner');
  await p.fill('#o-phone', '012-345 6789');
  await p.fill('#o-code', gcode);
  await p.click('[data-apply]');
  await p.waitForFunction(() => !/Checking/.test(document.querySelector('.summary').textContent), null, { timeout: 15000 });
  ok(/Gift|−RM266/.test(await p.textContent('.summary')), 'the gift card covers the takeaway (RM266)');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const tref = (await p.textContent('.done .ref')).trim();
  ok(/^MC-\d+$/.test(tref), 'takeaway order placed: ' + tref);

  console.log('Private dining enquiry');
  await p.goto(BASE + '/private.html');
  await p.click('[data-space="The salon"]');
  await p.fill('#p-guests', '12');
  await p.fill('#p-name', 'Test Host');
  await p.fill('#p-phone', '012-345 6789');
  await p.click('[data-private] button[type=submit]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const eref = (await p.textContent('.done .ref')).trim();
  ok(/^MC-E\d+$/.test(eref), 'private dining enquiry saved: ' + eref);

  console.log('The back office');
  await p.goto(BASE + '/owner.html');
  await p.click('[data-live-dian]');
  await p.waitForURL(/\/dian\//);
  await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
  await p.goto(BASE + '/dian/#/orders');
  await p.waitForTimeout(2500);
  ok(((await p.textContent('.main')) || '').includes(tref.replace('MC-', '')), 'shop dashboard: the takeaway order');
  const a = await admin(b);
  const bk = await adminText(a, '/wp-admin/edit.php?post_type=agc_booking');
  ok(bk.includes(bref) && bk.includes(wref) && /Waitlist/.test(bk), 'WordPress admin → Bookings: the counter booking and the waitlist request');
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_enquiry')).includes(eref), 'WordPress admin → Enquiries: ' + eref);
  const ord = (await adminText(a, '/wp-admin/admin.php?page=wc-orders')) + (await adminText(a, '/wp-admin/edit.php?post_type=shop_order'));
  ok(ord.includes(tref.replace('MC-', '')), 'WordPress admin → Orders: the takeaway order');
  ok(p.errors.length === 0, 'no JavaScript errors' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' | ') : ''));
  await a.context().close();
  await p.context().close();
  await restrictions(b);
}

(async () => {
  const b = await chromium.launch();
  const run = { 'sireh-salt': sirehSalt, 'maison-cendre': maisonCendre }[DEMO];
  if (!run) { console.log('还没有这个示范的测试：' + DEMO); process.exit(2); }
  try { await run(b); } catch (e) { ok(false, 'stopped: ' + e.message.split('\n')[0] + ' @ ' + ((e.stack || '').match(/check-wp-demo\.js:(\d+)/) || [])[1]); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
