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
  await p.click('[data-pax="4"]');
  const hm = (slotTxt.match(/\d{1,2}:\d{2}\s*[ap]m/i) || [''])[0]; // the same time again (an earlier time may have passed meanwhile)
  const after = await p.textContent(`.slot:has-text("${hm}") >> nth=0`);
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
  ok(await p.isVisible('[data-live-dian]') && await p.isVisible('[data-live-admin]') && await p.isVisible('[data-live-kitchen]'), 'owner page: buttons to the shop dashboard, WordPress admin and the kitchen screen');
  await p.click('[data-live-dian]');
  await p.waitForURL(/\/dian\//);
  await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
  await p.goto(BASE + '/dian/#/orders');
  await p.waitForFunction((no) => ((document.querySelector('.main') || {}).textContent || '').includes(no), orderNo, { timeout: 20000 }).catch(() => {});
  ok(((await p.textContent('.main')) || '').includes(orderNo), 'shop dashboard (demo account): the order is there #' + orderNo);

  console.log('WordPress admin shows the same order, booking and enquiry');
  ok((await adminText(a, '/wp-admin/admin.php?page=wc-orders')).includes(orderNo) || (await adminText(a, '/wp-admin/edit.php?post_type=shop_order')).includes(orderNo), 'WooCommerce orders: #' + orderNo);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_booking')).includes(bref), 'Bookings: ' + bref);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_enquiry')).includes(eref), 'Enquiries: ' + eref);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=shop_coupon')).toLowerCase().includes(vcode.toLowerCase()), 'Coupons: the voucher code ' + vcode + ' (WooCommerce keeps codes in lower case)');

  // 2026-11-17: guests choose — pay on the phone now (demo: nothing is charged), or send it and pay at the counter
  console.log('Table QR → pay on the phone or at the counter → the kitchen');
  const t = await newPage(b);
  await t.goto(BASE + '/table.html?t=5');
  ok(/\/table\/\?t=5&k=/.test(t.url()), 'table.html?t=5 opens the real table page (with the table key)');
  await t.waitForSelector('.tq-item');
  const tqAdd = async () => {
    await t.locator('.tq-item:has-text("Kopi Ais") .tq-add').click();
    await t.click('.tq-sheet--item .tq-btn');
    await t.click('.tq-bar__btn');
  };
  await tqAdd();
  const cartT = await t.textContent('.tq-sheet--cart');
  ok(/Pay RM6\.50 now/.test(cartT) && /pay at the counter/.test(cartT), 'cart: "Pay RM6.50 now" or "Send · pay at the counter"');
  await t.click('.tq-sheet--cart .tq-btn:has-text("now")');
  await t.waitForSelector('.tq-sheet--sent .tq-sent [data-order]', { timeout: 20000 });
  const tno = await t.getAttribute('.tq-sheet--sent .tq-sent [data-order]', 'data-order');
  ok(/Paid on your phone/.test(await t.textContent('.tq-sheet--sent')), 'paid on the phone and sent to the kitchen: #' + tno);
  await t.click('.tq-sheet--sent .tq-btn:has-text("Order more")');
  await t.waitForTimeout(400);
  await tqAdd();
  await t.click('.tq-sheet--cart .tq-btn:has-text("counter")');
  await t.waitForFunction((n) => { const x = document.querySelector('.tq-sheet--sent .tq-sent [data-order]'); return x && x.getAttribute('data-order') !== n; }, tno, { timeout: 20000 });
  const tno2 = await t.getAttribute('.tq-sheet--sent .tq-sent [data-order]', 'data-order');
  ok(!/Paid on your phone/.test(await t.textContent('.tq-sheet--sent')), 'second round sent, to pay at the counter: #' + tno2);
  await t.click('.tq-sheet--sent .tq-btn:has-text("My bill")');
  await t.waitForSelector('.tq-sheet--bill .tq-billcard', { timeout: 10000 });
  ok(/To pay at the counter\s*RM6\.50/.test(await t.textContent('.tq-sheet--bill')), 'my bill: only the round not paid yet (RM6.50)');
  const link = await t.getAttribute('.tq-demo a', 'href');
  ok(!!link && /agc_demo=dian/.test(link), '"See the restaurant’s side" goes to the real kitchen screen');
  await t.goto(link);
  await t.waitForSelector('.kt', { timeout: 20000 });
  ok((await t.textContent('.main')).includes(tno2) && /Table 5/.test(await t.textContent('.main')), 'kitchen screen: table 5’s orders ' + tno + ' and ' + tno2);
  const paidTag = await t.$$eval('.kt', (ks, n) => ks.filter((k) => (k.querySelector('.kt__no') || {}).textContent === '#' + n).map((k) => !!k.querySelector('.kt__paid')), tno);
  ok(paidTag.length === 1 && paidTag[0], 'kitchen: the order paid on the phone says "Paid"');
  await t.context().close();

  // 2026-11-17: the counter (轻量收银): takeaway paid in cash, GrabFood with its order number → kitchen → close of day
  console.log('Counter → kitchen → close of day');
  const k = await newPage(b, { width: 1180, height: 820 });
  await k.goto(BASE + '/?agc_demo=dian');
  await k.waitForURL(/\/dian\//);
  await k.goto(BASE + '/dian/#/counter');
  await k.waitForSelector('.cgrid .citem', { timeout: 20000 });
  ok(/Takeaway/.test(await k.textContent('.counter__menu')) && /GrabFood/.test(await k.textContent('.counter__menu')) && (await k.$$('.cgrid .citem')).length >= 10, 'counter: order types and the menu');
  const addDish = async (name) => { await k.click(`.citem:has-text("${name}")`); await k.waitForTimeout(200); if (await k.$('.sheet')) await k.click('.sheet .btn:not(.btn--plain)'); };
  await k.click('.counter__menu .pills .pill:has-text("Takeaway")');
  await addDish('Kopi Ais');
  await addDish('Kopi Ais');
  ok(/RM13\.00/.test(await k.textContent('.counter__cart')), 'counter: 2 × Kopi Ais = RM13.00');
  await k.click('.counter__acts .btn:has-text("Pay now")');
  await k.click('.sheet .btn:has-text("Cash")');
  await k.fill('.sheet input[type=number]', '20');
  ok(/Change RM7\.00/.test(await k.textContent('.sheet')), 'cash: RM20 received, change RM7.00');
  await k.click('.sheet .btn:has-text("Done")');
  await k.waitForFunction(() => /sent · give RM7/.test(document.body.textContent), null, { timeout: 15000 });
  const tk = (await k.textContent('body')).match(/#(\d+) sent · give/)[1];
  await k.click('.counter__menu .pills .pill:has-text("GrabFood")');
  await k.fill('.counter__cart input[maxlength="30"]', 'GF-TEST-1');
  await addDish('Nasi Lemak');
  await k.click('.counter__acts .btn:has-text("paid by GrabFood")');
  await k.waitForFunction(() => /#\d+ sent to the kitchen/.test(document.body.textContent), null, { timeout: 15000 });
  await k.goto(BASE + '/dian/#/kitchen');
  await k.waitForSelector('.kt', { timeout: 20000 });
  const kt = await k.textContent('.kgrid');
  ok(kt.includes('Takeaway #' + tk) && /GrabFood #\d+ · GF-TEST-1/.test(kt), `kitchen: "Takeaway #${tk}" and the GrabFood order with its number`);
  await k.goto(BASE + '/dian/#/close');
  await k.waitForSelector('.closecard', { timeout: 20000 });
  const cl = await k.textContent('.main');
  ok(/By order type/.test(cl) && /Takeaway/.test(cl) && /GrabFood/.test(cl), 'close of day: totals by order type (takeaway, GrabFood)');
  ok(/Paid online/.test(cl), 'close of day: the table order paid on the phone is under "Paid online"');
  ok(k.errors.length === 0, 'counter: no JavaScript errors' + (k.errors.length ? ': ' + k.errors.slice(0, 2).join(' | ') : ''));
  await k.context().close();

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
  await p.click('.slot:not(.is-full):not([disabled]) >> nth=0');
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
  await p.waitForFunction((no) => ((document.querySelector('.main') || {}).textContent || '').includes(no), tref.replace('MC-', ''), { timeout: 20000 }).catch(() => {});
  ok(((await p.textContent('.main')) || '').includes(tref.replace('MC-', '')), 'shop dashboard: the takeaway order');
  const a = await admin(b);
  const bk = await adminText(a, '/wp-admin/edit.php?post_type=agc_booking');
  ok(bk.includes(bref) && bk.includes(wref) && /Waitlist/.test(bk), 'WordPress admin → Bookings: the counter booking and the waitlist request');
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_enquiry')).includes(eref), 'WordPress admin → Enquiries: ' + eref);
  const ord = (await adminText(a, '/wp-admin/admin.php?page=wc-orders')) + (await adminText(a, '/wp-admin/edit.php?post_type=shop_order'));
  ok(ord.includes(tref.replace('MC-', '')), 'WordPress admin → Orders: the takeaway order');

  // 2026-11-17: order at the table (Junyu: guests in the restaurant couldn't order to the back office)
  console.log('Table QR → the real table page → the kitchen');
  await p.goto(BASE + '/owner.html');
  ok(await p.isVisible('[data-live-kitchen]'), 'owner page: a button straight to the kitchen screen');
  const t = await newPage(b);
  await t.goto(BASE + '/index.html');
  await t.click('.expcard[href^="table.html"]');
  await t.waitForURL(/\/table\/\?t=3&k=/, { timeout: 20000 });
  ok(true, '"Order at your table" on the home page opens the real table page for table 3');
  await t.waitForSelector('.tq-item', { timeout: 20000 });
  ok(/Bill at your table/.test(await t.textContent('body')) && /kitchen paces your courses/.test(await t.textContent('body')), 'the bill comes to the table; the restaurant’s note is shown');
  await t.locator('.tq-item:has-text("Aged duck breast") .tq-add').click();
  await t.click('.tq-sheet--item .tq-btn');
  await t.click('.tq-bar__btn');
  await t.click('.tq-sheet--cart .tq-btn');
  await t.waitForSelector('.tq-sheet--sent .tq-sent [data-order]', { timeout: 20000 });
  const tno = await t.getAttribute('.tq-sheet--sent .tq-sent [data-order]', 'data-order');
  const link = await t.getAttribute('.tq-demo a', 'href');
  await t.goto(link);
  await t.waitForSelector('.kt', { timeout: 20000 });
  ok((await t.textContent('.main')).includes(tno) && /Table 3/.test(await t.textContent('.main')) && /Aged duck breast/.test(await t.textContent('.main')), 'kitchen screen: table 3’s order ' + tno + ' (duck, as cooked)');
  ok(t.errors.length === 0, 'table page and kitchen: no JavaScript errors' + (t.errors.length ? ': ' + t.errors.slice(0, 2).join(' | ') : ''));
  await t.context().close();
  ok(p.errors.length === 0, 'no JavaScript errors' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' | ') : ''));
  await a.context().close();
  await p.context().close();
  await restrictions(b);
}

async function dulangDaun(b) {
  await common(b, ['index', 'shop', 'product', 'hamper', 'checkout', 'track', 'corporate', 'owner']);
  const p = await newPage(b);

  console.log('Products and prices from WooCommerce');
  await p.goto(BASE + '/shop.html');
  ok((await p.$$('[data-grid] .pcard')).length === 14, 'shop: 14 products (WooCommerce)');
  await p.goto(BASE + '/product.html?p=sambal-bilis');
  await p.click('[data-v="0:1"]');
  ok(/RM28\.00/.test(await p.textContent('.pdp__price')), '380 g: RM16 (WooCommerce) + RM12 = RM28');
  await p.click('.buyrow [data-add]');
  await p.waitForSelector('[data-drawer]:not([hidden])');
  await p.click('[data-cart-close] >> nth=1');

  console.log('Back in stock: the request goes to the shop’s list');
  await p.goto(BASE + '/product.html?p=pineapple-tarts');
  await p.click('[data-v="0:1"]');
  await p.fill('[data-notify] input', '012-345 6789');
  await p.click('[data-notify] button');
  await p.waitForFunction(() => /on the list/.test(document.querySelector('[data-notify-box]').textContent), null, { timeout: 15000 });
  ok(true, 'sold-out option (40 pcs): "notify me" saved');

  console.log('Multi-buy deal and the build-your-own hamper');
  await p.goto(BASE + '/product.html?p=kerepek');
  await p.click('.buyrow [data-q="1"]');
  await p.click('.buyrow [data-q="1"]');
  await p.click('.buyrow [data-add]');
  await p.waitForSelector('[data-drawer]:not([hidden])');
  ok(/any 3 for RM27/.test(await p.textContent('[data-cart-body]')), 'kerepek: any 3 for RM27');
  await p.goto(BASE + '/hamper.html');
  await p.click('[data-box="S"]');
  for (const id of ['butter-cookies', 'pandan-cookies', 'kopi', 'sambal-udang']) await p.click(`[data-hi="${id}:1"]`);
  ok(/RM113\.00/.test(await p.textContent('.summary')), 'a full small box: RM18 + 4 items = RM113');
  await p.click('[data-hadd]');
  await p.waitForSelector('[data-drawer]:not([hidden])');

  console.log('Checkout: East Malaysia, a code, a gift → a real WooCommerce order');
  await p.goto(BASE + '/product.html?p=kaya');
  await p.click('.buyrow [data-add]');
  await p.goto(BASE + '/checkout.html');
  await p.fill('#c-name', 'Test Buyer');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-addr', '8 Jalan Test');
  await p.fill('#c-pc', '88000');
  await p.fill('#c-city', 'Kota Kinabalu');
  await p.selectOption('#c-state', 'Sabah');
  ok(/ships to West Malaysia only/.test(await p.textContent('[data-checkout]')), 'fresh kaya is refused for East Malaysia');
  await p.click('.summary .cline:has-text("Pandan Kaya") [data-cq$=":-1"]');
  await p.fill('#c-code', 'WELCOME10');
  await p.click('[data-apply]');
  await p.waitForFunction(() => /10% off/.test(document.querySelector('.summary').textContent), null, { timeout: 15000 });
  await p.check('[data-gift]');
  await p.fill('#c-to', 'Auntie Mei');
  await p.fill('#c-msg', 'Happy new year');
  ok(/RM166\.20/.test(await p.textContent('.summary')), 'total RM166.20 (RM168 after the deal, −10%, RM15 to Sabah)');
  await p.click('[data-place]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const dno = (await p.textContent('.done .ref')).trim();
  ok(/^DD-\d+$/.test(dno) && /A gift for Auntie Mei/.test(await p.textContent('.done')) && /RM166\.20/.test(await p.textContent('.done')), 'order placed and paid (demo payment): ' + dno);
  await p.click('.done a[href^="track.html"]');
  await p.fill('#t-phone', '012-345 6789');
  await p.click('[data-track] button');
  await p.waitForSelector('.timeline', { timeout: 15000 });
  ok(/Order received/.test(await p.textContent('[data-track-out]')), 'tracking the new order (number + phone): "Order received"');

  console.log('WhatsApp order');
  await p.goto(BASE + '/product.html?p=butter-cookies');
  await p.click('.buyrow [data-add]');
  await p.goto(BASE + '/checkout.html');
  await p.selectOption('#c-state', 'Selangor');
  await p.fill('#c-pc', '47400');
  await p.fill('#c-city', 'Petaling Jaya');
  await p.click('label.payopt:has-text("Order on WhatsApp")');
  await p.click('[data-place]');
  await p.waitForSelector('.waprev', { timeout: 20000 });
  ok(/Butter Cookies/.test(await p.textContent('.waprev')), 'WhatsApp order: saved, and the message is filled in');

  console.log('Tracking the sample order');
  await p.goto(BASE + '/track.html');
  await p.fill('#t-no', 'DD-2041');
  await p.fill('#t-phone', '012-345 6789');
  await p.click('[data-track] button');
  await p.waitForSelector('.timeline', { timeout: 15000 });
  ok(/With the courier/.test(await p.textContent('[data-track-out]')) && /DEMO-TRK-77314/.test(await p.textContent('[data-track-out]')), 'DD-2041: with the courier, tracking number shown');

  console.log('Corporate gifts enquiry');
  await p.goto(BASE + '/corporate.html');
  await p.fill('#k-qty', '60');
  await p.fill('#q-company', 'Test Sdn Bhd');
  await p.fill('#q-name', 'Test Buyer');
  await p.fill('#q-phone', '012-345 6789');
  await p.click('[data-corp-form] button[type=submit]');
  await p.waitForSelector('.done .ref', { timeout: 20000 });
  const eref = (await p.textContent('.done .ref')).trim();
  ok(/^DD-E\d+$/.test(eref) && /60 × Terima Kasih Box/.test(await p.textContent('.done .waprev')), 'corporate enquiry saved: ' + eref);

  console.log('The back office');
  await p.goto(BASE + '/owner.html');
  await p.click('[data-live-dian]');
  await p.waitForURL(/\/dian\//);
  await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
  const sum = await p.evaluate(async () => (await fetch(window.AGC_OWNER.rest + 'summary', { headers: { 'X-WP-Nonce': window.AGC_OWNER.nonce }, credentials: 'same-origin' })).json());
  ok(sum && sum.notify >= 1, 'shop dashboard: the back-in-stock list has the request (' + (sum && sum.notify) + ')');
  const all = await p.evaluate(async () => (await fetch(window.AGC_OWNER.rest + 'orders?bucket=all', { headers: { 'X-WP-Nonce': window.AGC_OWNER.nonce }, credentials: 'same-origin' })).json());
  const mine = ((all && all.orders) || []).find((o) => o.number === dno.replace('DD-', ''));
  ok(!!mine && mine.bucket === 'make' && /Auntie Mei|Sabah/.test(JSON.stringify(mine)), 'shop dashboard: the order ' + dno + ' is under "To make" (paid), with the Sabah address');
  const a = await admin(b);
  const ord = (await adminText(a, '/wp-admin/admin.php?page=wc-orders')) + (await adminText(a, '/wp-admin/edit.php?post_type=shop_order'));
  ok(ord.includes(dno.replace('DD-', '')), 'WordPress admin → Orders: ' + dno);
  ok((await adminText(a, '/wp-admin/edit.php?post_type=agc_enquiry')).includes(eref), 'WordPress admin → Enquiries: ' + eref);
  ok(p.errors.length === 0, 'no JavaScript errors' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' | ') : ''));
  await a.context().close();
  await p.context().close();
  await restrictions(b);
}

async function butterLantern(b) {
  await common(b, ['index', 'checkout', 'order', 'owner']);
  const p = await newPage(b);
  const myToday = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const txt = async (sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ');
  const left = async (id) => +(((await txt('#i-' + id)).match(/只剩 (\d+) 份/) || [])[1] || NaN);
  const owner = (path, method, body) => p.evaluate(async ([path, method, body]) => (await fetch(window.AGC_OWNER.rest + path, { method: method || 'GET', headers: { 'X-WP-Nonce': window.AGC_OWNER.nonce, 'Content-Type': 'application/json' }, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined })).json(), [path, method, body]);
  const mineOrder = (no) => p.evaluate((no) => { for (const k of Object.keys(localStorage)) if (/orders_/.test(k)) { const o = (JSON.parse(localStorage[k]) || []).find((x) => x.no === no); if (o) return o; } return null; }, no);

  console.log('Prices, stock and sold-out from WooCommerce');
  await p.goto(BASE + '/index.html?fest=cny');
  ok((await p.$$('.card[id^="i-"]')).length === 8, 'Chinese New Year: 8 items (WooCommerce)');
  ok(/已售完/.test(await txt('#i-ng')) && await p.$eval('#i-ng .card__foot button', (x) => x.disabled), 'Nian Gao: sold out in WooCommerce (stock 0), cannot be added');
  const pb0 = await left('pb');
  ok(pb0 > 2, 'Pineapple Balls: stock left from WooCommerce (' + pb0 + ')');
  const a = await admin(b);
  await editProduct(a, 'Peanut Cookies');
  await a.fill('#_regular_price', '34');
  await saveProduct(a);
  await p.goto(BASE + '/index.html?fest=cny');
  ok(/RM34\.00/.test(await txt('#i-pn')), 'price changed in WordPress admin (RM32 → RM34) shows on the website');
  await a.fill('#_regular_price', '32');
  await saveProduct(a);
  await editProduct(a, 'Butter Cookies');
  await a.click('a[href="#inventory_product_data"]');
  const bc0 = await a.inputValue('#_stock');
  await a.fill('#_stock', '0');
  await saveProduct(a);
  await p.goto(BASE + '/index.html?fest=cny');
  ok(/已售完/.test(await txt('#i-bc')) && await p.$eval('#i-bc .card__foot button', (x) => x.disabled), 'stock set to 0 in WordPress admin: Butter Cookies sold out on the website');
  await a.click('a[href="#inventory_product_data"]');
  await a.fill('#_stock', bc0);
  await saveProduct(a);

  console.log('Order 1: Chinese New Year, collection, FPX, a gift');
  await p.goto(BASE + '/index.html?fest=cny');
  await p.click('#i-pb .card__foot [data-item]');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-opt="l"]');
  await p.click('[data-sq="1"]');
  ok(/RM156\.00/.test(await txt('[data-sheet-add]')), 'options: big jar × 2 = RM156');
  await p.click('[data-sheet-add]');
  await p.waitForSelector('[data-drawer].is-on');
  const cnyEarly = myToday <= '2026-12-31';
  ok(cnyEarly ? /−RM15\.60/.test(await txt('[data-drawer]')) && /RM140\.40/.test(await txt('[data-drawer]')) : true, 'cart: early-bird 10% off, RM140.40');
  await p.goto(BASE + '/checkout.html?fest=cny');
  ok((await p.$$('.slot:not([disabled])')).length > 0, 'checkout: days and time slots with places left');
  await p.click('[data-next]');
  await p.fill('#c-name', 'Test Auntie');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-email', 'auntie@example.com');
  await p.check('[data-k="gift"]');
  await p.fill('#c-gname', 'Uncle Lim');
  await p.fill('#c-gphone', '012-777 8888');
  await p.fill('#c-gmsg', '新年快乐');
  await p.click('[data-next]');
  await p.click('[data-bank="Maybank2u"]');
  await p.click('[data-pay-go]');
  await p.waitForSelector('[data-pay].is-on');
  await Promise.all([p.waitForURL(/\/order(\.html)?\?.*no=BL-/, { timeout: 20000 }), p.click('[data-approve]')]);
  await p.waitForSelector('.tl');
  const no1 = ((await txt('main')).match(/BL-\d+/) || [''])[0];
  ok(/订单已确认/.test(await txt('main')) && !!no1 && /Uncle Lim/.test(await txt('main')) && /Maybank2u/.test(await txt('main')) && (!cnyEarly || /RM140\.40/.test(await txt('main'))), 'a real WooCommerce order, paid (demo payment): ' + no1);
  const o1 = await mineOrder(no1);
  await p.goto(BASE + '/index.html?fest=cny');
  ok(await left('pb') === pb0 - 2, 'stock goes down in WooCommerce (' + pb0 + ' → ' + (pb0 - 2) + ')');
  ok(((await p.evaluate(() => window.AGC_LIVE.slotsUsed)) || {})[`cny|${o1.date}|collect|${o1.slot}`] >= 1, 'the time slot counts the order (' + o1.date + ' ' + o1.slot + ')');

  console.log('Order lookup from another phone');
  const q = await newPage(b);
  await q.goto(BASE + '/order.html?fest=cny');
  await q.fill('#t-no', no1);
  await q.fill('#t-ph', '0123456789');
  await Promise.all([q.waitForURL(/no=BL-/, { timeout: 15000 }), q.click('[data-track] button[type=submit]')]);
  await q.waitForSelector('.tl');
  ok(/已付款/.test((await q.textContent('.tl .is-now')) || '') && /Uncle Lim/.test(await q.textContent('main')), 'number + mobile finds the order on a phone that never saw it: paid, gift for Uncle Lim');

  console.log('Order 2: Christmas, Klang Valley delivery, DuitNow + receipt');
  await p.goto(BASE + '/index.html?fest=xmas');
  await p.click('#i-gb .card__foot [data-item]');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-sheet-add]');
  await p.goto(BASE + '/checkout.html?fest=xmas');
  await p.click('[data-mode="kv"]');
  await p.fill('#c-addr', '12 Jalan SS2/24, Petaling Jaya');
  await p.fill('#c-pc', '81300');
  ok(/outside the Klang Valley/.test(await txt('[data-pcnote]')), 'delivery: a postcode outside the Klang Valley is caught');
  await p.fill('#c-pc', '47300');
  ok(/RM15\.00/.test(await txt('.summ')), 'delivery: RM15 under RM200');
  await p.click('[data-next]');
  await p.fill('#c-name', 'Sarah Test');
  await p.fill('#c-phone', '012-345 6789');
  await p.fill('#c-email', 'sarah@example.com');
  await p.click('[data-next]');
  await p.click('[data-pm="duitnow"]');
  await p.setInputFiles('[data-receipt]', { name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
  await Promise.all([p.waitForURL(/\/order(\.html)?\?.*no=BL-/, { timeout: 20000 }), p.click('[data-pay-go]')]);
  await p.waitForSelector('.tl');
  const no2 = ((await txt('main')).match(/BL-\d+/) || [''])[0];
  ok(/checking your payment/i.test(await txt('main')) && /receipt\.png/.test(await txt('main')), 'DuitNow order received, payment being checked, receipt attached: ' + no2);

  console.log('Order 3: Hari Raya, courier to Sabah');
  await p.goto(BASE + '/index.html?fest=raya');
  await p.click('#i-bs .card__foot [data-item]');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-sheet-add]');
  await p.goto(BASE + '/checkout.html?fest=raya');
  await p.click('[data-mode="courier"]');
  await p.fill('#c-addr', '8 Jalan Test, Kota Kinabalu');
  await p.fill('#c-pc', '88000');
  ok(/RM25\.00/.test(await txt('.summ')), 'courier to East Malaysia: RM25');
  await p.click('[data-next]');
  await p.fill('#c-name', 'Aminah Test');
  await p.fill('#c-phone', '013-222 3333');
  await p.fill('#c-email', 'aminah@example.com');
  await p.click('[data-next]');
  await p.click('[data-pm="ewallet"]');
  await p.click('[data-pay-go]');
  await p.waitForSelector('[data-pay].is-on');
  await Promise.all([p.waitForURL(/\/order(\.html)?\?.*no=BL-/, { timeout: 20000 }), p.click('[data-approve]')]);
  await p.waitForSelector('.tl');
  const no3 = ((await txt('main')).match(/BL-\d+/) || [''])[0];
  ok(!!no3 && /88000/.test(await txt('main')), 'courier order placed (the shop agreed on the RM25 East Malaysia fee): ' + no3);

  console.log('What the shop refuses');
  const bad = await p.evaluate(async () => { const r = await fetch(window.AGC_LIVE.rest + 'site/order', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'preorder', fest: 'val', lines: [{ id: 'rv', qty: 1 }], mode: 'courier', date: '2027-02-12', addr: '1 Jalan A', pc: '47300', name: 'X', phone: '0123456789', pay: 'online' }) }); return r.status + ' ' + ((await r.json()).message || ''); });
  p.errors = p.errors.filter((e) => !/status of 409/.test(e)); // the refusal above is expected
  ok(/^409 .*courier/.test(bad), "Valentine's: red velvet cupcakes by courier refused by the shop (" + bad.slice(0, 60) + ')');
  await p.goto(BASE + '/index.html?fest=val#i-cr');
  await p.waitForSelector('[data-sheet].is-on');
  await p.click('[data-sheet-add]');
  await p.goto(BASE + '/checkout.html?fest=val');
  ok(await p.$eval('[data-mode="courier"]', (x) => x.disabled), "Valentine's: the page doesn't offer courier for roses");
  const nf = await p.evaluate(async () => (await fetch(window.AGC_LIVE.rest + 'site/notify', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact: '012-345 6789', name: 'Valentine’s' }) })).status);
  ok(nf === 200, '"tell me when the next ones open" goes to the shop’s list');

  console.log('The shop dashboard (/dian/)');
  await p.goto(BASE + '/owner.html?fest=cny');
  ok(!!(await p.$('[data-live-dian]')) && !!(await p.$('[data-live-admin]')), 'owner page: buttons into the real back office');
  await p.click('[data-live-dian]');
  await p.waitForURL(/\/dian\//);
  await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
  const all = ((await owner('orders?bucket=all')) || {}).orders || [];
  const find = (no) => all.find((o) => 'BL-' + o.number === no);
  const d1 = find(no1), d2 = find(no2), d3 = find(no3);
  ok(d1 && d1.bucket === 'make' && d2 && d2.bucket === 'check' && d3 && d3.bucket === 'make', 'orders in the right lists: ' + no1 + ' and ' + no3 + ' to make, ' + no2 + ' payment to check');
  const prod = await owner('production?day=' + o1.date);
  ok(/Pineapple Balls/.test(JSON.stringify(prod)), 'what to bake on ' + o1.date + ': Pineapple Balls');
  const one = await owner('orders/' + d1.id);
  await p.goto(BASE + '/dian/#/order/' + d2.id);
  await p.waitForSelector('button:has-text("Payment received")', { timeout: 20000 });
  const det2 = (await p.textContent('.main')) || '';
  ok(/Sarah Test/.test(det2) && !!(await p.$('a[href*="receipt"]')), 'order ' + no2 + ': the DuitNow receipt to look at');
  await p.click('button:has-text("Payment received")');
  await p.click('.sheet button:has-text("Yes")');
  await p.waitForFunction(() => !/Payment received/.test([...document.querySelectorAll('.main button')].map((x) => x.textContent).join('|')), null, { timeout: 15000 });
  await p.goto(BASE + '/dian/#/order/' + d1.id);
  await p.waitForSelector('button:has-text("Ready for collection")', { timeout: 20000 });
  ok(/Uncle Lim/.test((await p.textContent('.main')) || '') && new RegExp(o1.slot).test((await p.textContent('.main')) || ''), 'order ' + no1 + ': collection day and slot, gift note');
  await p.click('button:has-text("Ready for collection")');
  await p.waitForSelector('button:has-text("Done")', { timeout: 15000 });
  ok(true, 'one tap: ' + no1 + ' ready for collection, ' + no2 + ' payment received');

  console.log('The customer sees what the shop did');
  await p.goto(BASE + `/order.html?fest=cny&no=${no1}`);
  await p.waitForFunction(() => /可以取货/.test((document.querySelector('.tl .is-now') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok(/可以取货/.test((await p.textContent('.tl .is-now')) || ''), no1 + ': "ready to collect"');
  await p.goto(BASE + `/order.html?fest=xmas&no=${no2}`);
  await p.waitForFunction(() => /Paid/.test((document.querySelector('.tl .is-now') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  ok(/Paid/.test((await p.textContent('.tl .is-now')) || ''), no2 + ': payment confirmed');

  console.log('WordPress admin');
  const ord = (await adminText(a, '/wp-admin/admin.php?page=wc-orders')) + (await adminText(a, '/wp-admin/edit.php?post_type=shop_order'));
  ok([no1, no2, no3].every((n) => ord.includes(n.replace('BL-', ''))), 'Orders: ' + [no1, no2, no3].join(', '));
  const ed = await adminText(a, one.edit_url.replace(/^https?:\/\/[^/]+/, ''));
  ok(/Uncle Lim/.test(ed) && /Early-bird discount|Collection/.test(ed) && new RegExp(o1.slot).test(ed), 'order ' + no1 + ' in WordPress admin: gift note, collection slot, early-bird line');
  ok(p.errors.length === 0 && q.errors.length === 0, 'no JavaScript errors' + (p.errors.length + q.errors.length ? ': ' + p.errors.concat(q.errors).slice(0, 3).join(' | ') : ''));
  await a.context().close();
  await q.context().close();
  await p.context().close();
  await restrictions(b);
}

// The 6 shop templates (one test, driven by each template's own product list).
const TEMPLATES = ['voltnest', 'chili-pantry', 'dewlane', 'lowlight', 'plainfold', 'tailmate'];
function shopTemplate(slug) {
  return async function (b) {
    const T = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'templates', slug, 'template.json'), 'utf8'));
    const money = (n) => 'RM' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const rx = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const opts = (p) => (p.options || []).map((o) => o.values.map((v) => (typeof v === 'object' ? v : { v })));
    // a product whose option costs extra (else any product with a choice, e.g. another size)
    const withAdd = T.products.find((p) => opts(p).some((g) => g.some((v) => v.add)) && p.price != null) || T.products.find((p) => opts(p).some((g) => g.length > 1) && p.price != null);
    const noAdds = (p) => !opts(p).some((g) => g.some((v) => v.add)); // options that don't change the price are fine (sizes)
    const plain = T.products.filter((p) => noAdds(p) && p.price != null && !p.sale && !p.per && p.id !== (withAdd || {}).id);
    const simple = plain[0], cheap = plain.slice().sort((x, y) => x.price - y.price)[0];
    const ship = T.shipping || { west: 8, east: 15, free_min: 150 };
    const prefix = T.order_prefix;
    const pages = ['index', 'shop', 'cart', 'checkout', 'order', 'about', 'help', 'p/' + simple.id];
    await common(b, pages);
    const p = await newPage(b);
    const txt = async (sel) => ((await p.textContent(sel)) || '').replace(/\s+/g, ' ');
    const card = (id) => `[data-grid] .card:has(a.card__media[href="p/${id}.html"])`;

    console.log('Products and prices from WooCommerce');
    await p.goto(BASE + '/shop.html');
    ok((await p.$$('[data-grid] .card:not([hidden])')).length === T.products.length, `shop: ${T.products.length} products (WooCommerce)`);
    const a = await admin(b);
    await editProduct(a, simple.name);
    await a.fill('#_regular_price', String(simple.price + 5));
    await saveProduct(a);
    await p.goto(BASE + '/shop.html');
    ok(rx(money(simple.price + 5)).test(await txt(card(simple.id))), `price changed in WordPress admin (${money(simple.price)} → ${money(simple.price + 5)}) shows on the shop page`);
    await a.click('a[href="#general_product_data"]').catch(() => {});
    await a.fill('#_sale_price', String(simple.price - 2));
    await saveProduct(a);
    await p.goto(BASE + '/shop.html');
    const onSale = await txt(card(simple.id));
    ok(rx(money(simple.price - 2)).test(onSale) && rx(money(simple.price + 5)).test(onSale) && (simple.badge || /Save RM7/.test(onSale)), `a sale price set in WordPress admin: ${money(simple.price - 2)}, was ${money(simple.price + 5)}` + (simple.badge ? '' : ', "Save RM7"'));
    await p.goto(BASE + '/p/' + simple.id + '.html');
    ok(rx(money(simple.price - 2)).test(await txt('[data-pdp-price]')), 'product page: the sale price');
    await a.fill('#_sale_price', '');
    await a.fill('#_regular_price', String(simple.price));
    await stockStatus(a, 'outofstock');
    await saveProduct(a);
    await p.goto(BASE + '/shop.html');
    ok(/Sold out/.test(await txt(card(simple.id))) && rx(money(simple.price)).test(await txt(card(simple.id))), 'out of stock in WordPress admin: "Sold out" on the shop page, price back to ' + money(simple.price));
    await p.goto(BASE + '/p/' + simple.id + '.html');
    ok(await p.$eval('[data-atc]', (x) => x.disabled), 'product page: cannot add a sold-out product');
    await stockStatus(a, 'instock');
    await saveProduct(a);

    console.log('Order 1: options, the welcome code, East Malaysia');
    let gi = opts(withAdd).findIndex((g) => g.some((v) => v.add));
    if (gi < 0) gi = opts(withAdd).findIndex((g) => g.length > 1);
    const pickV = opts(withAdd)[gi].find((v) => v.add) || opts(withAdd)[gi][1];
    const unitA = (withAdd.sale || withAdd.price) + (pickV.add || 0);
    await p.goto(BASE + '/p/' + withAdd.id + '.html');
    await p.click(`input[name="o${gi}"][value="${pickV.v}"] + span`);
    ok(rx(money(unitA)).test(await txt('[data-pdp-price]')), `${withAdd.name}, ${pickV.v}: ${money(unitA)} (WooCommerce price + the option)`);
    await p.click('[data-atc]');
    await p.goto(BASE + '/p/' + simple.id + '.html');
    await p.click('[data-atc]');
    await p.goto(BASE + '/cart.html');
    await p.fill('[data-coupon] input', 'NOPE');
    await p.click('[data-coupon] button');
    await p.waitForFunction(() => /isn.t valid/.test(document.querySelector('[data-toast]').textContent), null, { timeout: 15000 });
    ok(true, 'a wrong code is refused by the shop');
    await p.fill('[data-coupon] input', 'welcome10');
    await p.click('[data-coupon] button');
    await p.waitForFunction(() => /applied/.test(document.querySelector('[data-toast]').textContent), null, { timeout: 15000 });
    const sub = unitA + simple.price, disc = Math.round(sub * 10) / 100, fee1 = sub >= ship.free_min ? 0 : ship.east, total1 = sub - disc + fee1;
    ok(rx('−' + money(disc)).test(await txt('[data-cart-summary]')), `WELCOME10 (a WooCommerce coupon): −${money(disc)}`);
    await p.goto(BASE + '/checkout.html');
    ok(/order is real/.test(await txt('.demo-note')), 'checkout says the order is real and nothing is charged');
    await p.fill('input[name=email]', 'buyer@example.com');
    await p.fill('input[name=phone]', '012-345 6789');
    await p.fill('input[name=name]', 'Test Buyer');
    await p.fill('input[name=addr1]', '8 Jalan Test');
    await p.fill('input[name=postcode]', '88000');
    await p.fill('input[name=city]', 'Kota Kinabalu');
    await p.selectOption('select[name=state]', 'Sabah');
    ok(rx(money(total1)).test(await txt('[data-co-total]')), `total ${money(total1)} (shipping to Sabah ${fee1 ? money(fee1) : 'free over ' + money(ship.free_min)})`);
    await p.click('label.pay:has-text("E-wallet")');
    await Promise.all([p.waitForURL(/order\.html/, { timeout: 20000 }), p.click('[data-checkout] button[type=submit]')]);
    const no1 = ((await txt('[data-order-no]')).match(new RegExp(prefix + '-\\d+')) || [''])[0];
    ok(!!no1 && rx(money(total1)).test(await txt('[data-order-box]')) && /E-wallet/.test(await txt('[data-order-box]')), `a real WooCommerce order, the shop agreed on ${money(total1)}: ${no1}`);

    console.log('Order 2: West Malaysia, under the free-shipping amount');
    await p.goto(BASE + '/p/' + cheap.id + '.html');
    await p.click('[data-atc]');
    await p.goto(BASE + '/checkout.html');
    await p.fill('input[name=email]', 'buyer2@example.com');
    await p.fill('input[name=phone]', '013-222 3333');
    await p.fill('input[name=name]', 'Second Buyer');
    await p.fill('input[name=addr1]', '1 Jalan SS2');
    await p.fill('input[name=postcode]', '47300');
    await p.fill('input[name=city]', 'Petaling Jaya');
    await p.selectOption('select[name=state]', 'Selangor');
    const fee2 = cheap.price >= ship.free_min ? 0 : ship.west;
    ok(rx(fee2 ? money(fee2) : 'Free').test(await txt('[data-co-ship]')), `West Malaysia shipping: ${fee2 ? money(fee2) : 'free'}`);
    await Promise.all([p.waitForURL(/order\.html/, { timeout: 20000 }), p.click('[data-checkout] button[type=submit]')]);
    const no2 = ((await txt('[data-order-no]')).match(new RegExp(prefix + '-\\d+')) || [''])[0];
    ok(!!no2 && rx(money(cheap.price + fee2)).test(await txt('[data-order-box]')), `second order ${no2}: ${money(cheap.price + fee2)}`);

    console.log('The shop dashboard and WordPress admin');
    await p.click('a[data-owner-side]');
    await p.waitForURL(/\/dian\//);
    await p.waitForFunction(() => /Overview/.test(document.body.textContent), null, { timeout: 20000 });
    const all = await p.evaluate(async () => (await fetch(window.AGC_OWNER.rest + 'orders?bucket=all', { headers: { 'X-WP-Nonce': window.AGC_OWNER.nonce }, credentials: 'same-origin' })).json());
    const d1 = ((all && all.orders) || []).find((o) => prefix + '-' + o.number === no1);
    const d2 = ((all && all.orders) || []).find((o) => prefix + '-' + o.number === no2);
    ok(d1 && d1.bucket === 'make' && d2 && d2.bucket === 'make', '"Owner’s side" opens the shop dashboard: both orders paid, to pack');
    const one = await p.evaluate(async (id) => (await fetch(window.AGC_OWNER.rest + 'orders/' + id, { headers: { 'X-WP-Nonce': window.AGC_OWNER.nonce }, credentials: 'same-origin' })).json(), d1 && d1.id);
    ok(/Sabah/.test(JSON.stringify(one)) && rx(pickV.v).test(JSON.stringify(one)), `order ${no1} in the dashboard: Sabah address, the option (${pickV.v})`);
    const ord = (await adminText(a, '/wp-admin/admin.php?page=wc-orders')) + (await adminText(a, '/wp-admin/edit.php?post_type=shop_order'));
    ok([no1, no2].every((n) => ord.includes('#' + n.replace(prefix + '-', '')) || ord.includes(n.replace(prefix + '-', ''))), 'WordPress admin → Orders: ' + no1 + ', ' + no2);
    const ed = await adminText(a, String(one.edit_url || '').replace(/^https?:\/\/[^/]+/, ''));
    ok(rx(pickV.v).test(ed) && /WELCOME10|welcome10/i.test(ed) && /Kota Kinabalu/.test(ed), `order ${no1} in WordPress admin: the option, the code, the address`);
    ok(p.errors.length === 0, 'no JavaScript errors' + (p.errors.length ? ': ' + p.errors.slice(0, 3).join(' | ') : ''));
    await a.context().close();
    await p.context().close();
    await restrictions(b);
  };
}

(async () => {
  const b = await chromium.launch();
  const run = { 'sireh-salt': sirehSalt, 'maison-cendre': maisonCendre, 'dulang-daun': dulangDaun, 'butter-lantern': butterLantern }[DEMO] || (TEMPLATES.includes(DEMO) ? shopTemplate(DEMO) : null);
  if (!run) { console.log('还没有这个示范的测试：' + DEMO); process.exit(2); }
  try { await run(b); } catch (e) { ok(false, 'stopped: ' + e.message.split('\n')[0] + ' @ ' + ((e.stack || '').match(/check-wp-demo\.js:(\d+)/) || [])[1]); }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
