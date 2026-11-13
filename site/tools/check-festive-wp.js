// 节日预购网店（WordPress + WooCommerce 版）端到端检查（2026-11-13）
//   自取 + 示范网上付款、巴生谷送货 + DuitNow QR + 上传收据、快递、没选时段会被挡、查订单、
//   店家后台（每天要做多少、看收据、已收到付款、可以取货）、时段满了不能选、截止后不能买 + 留号码。
// 用法：
//   FEST_ADMIN_USER=xxx FEST_ADMIN_PASS=xxx node site/tools/check-festive-wp.js http://demo-festive.kedailab.test
//   （可选）FEST_MAIL_LOG=/var/www/demo-festive/tmp/mail.log  —— 本机测试用 mu-plugin 把寄出的信记下来，检查电邮
//   （可选）FEST_AUTH=user:pass  —— 网站有 Nginx 密码时
// 会改「Settings → Agency」的截止日和时段再改回来；会留下几张测试订单（名字写 Test）。
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://demo-festive.kedailab.test').replace(/\/$/, '');
const USER = process.env.FEST_ADMIN_USER, PASS = process.env.FEST_ADMIN_PASS;
const MAIL = process.env.FEST_MAIL_LOG || '';
const AUTH = process.env.FEST_AUTH ? { username: process.env.FEST_AUTH.split(':')[0], password: process.env.FEST_AUTH.split(':').slice(1).join(':') } : undefined;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };

async function waitCheckout(p) {
  await p.waitForTimeout(400);
  await p.waitForFunction(() => !document.querySelector('.blockUI.blockOverlay'), null, { timeout: 20000 });
}

async function fillBilling(p, who) {
  await p.fill('#billing_first_name', who.first);
  await p.fill('#billing_last_name', 'Test');
  await p.fill('#billing_address_1', who.addr);
  await p.fill('#billing_city', who.city);
  await p.selectOption('select#billing_state', who.state);
  await p.fill('#billing_postcode', who.pc);
  await p.fill('#billing_phone', '012-345 6789');
  await p.fill('#billing_email', who.email);
  await p.locator('#billing_email').blur();
  await p.evaluate(() => window.jQuery && window.jQuery(document.body).trigger('update_checkout'));
  await waitCheckout(p);
}

async function chooseShipping(p, prefix) {
  const r = p.locator(`input[name^="shipping_method"][value^="${prefix}"]`).first();
  if (await r.count()) { await r.evaluate((el) => el.click()); await waitCheckout(p); return true; }
  return false;
}

async function pay(p, id) {
  await p.evaluate((x) => document.getElementById('payment_method_' + x).click(), id);
  await p.waitForTimeout(300);
}

async function pickFirstSlot(p) {
  const day = p.locator('.agc-fest-pick__days .agc-chip:not([disabled])').first();
  await day.click();
  const slot = p.locator('.agc-fest-pick__slots .agc-chip:not([disabled])').first();
  await slot.click();
  return p.$eval('#agc_fest_when', (s) => s.value);
}

async function addFromHome(p, name, option) {
  await p.goto(BASE + '/');
  const card = p.locator('li.product', { hasText: name }).first();
  if (option) {
    await card.locator('a.woocommerce-LoopProduct-link, a').first().click();
    await p.waitForLoadState('domcontentloaded');
    await p.selectOption('form.variations_form select', { label: option });
    await p.click('form.variations_form button.single_add_to_cart_button');
  } else {
    await card.locator('a.add_to_cart_button').click();
    await p.waitForTimeout(1200);
  }
}

async function placeOrder(p) {
  await p.evaluate(() => {
    const t = document.getElementById('terms'); if (t && !t.checked) t.click();
    document.querySelectorAll('.woocommerce-NoticeGroup, .woocommerce-error').forEach((e) => e.remove());
  });
  await p.click('#place_order');
  // Done when we land on "order received", or WooCommerce shows an error.
  await Promise.race([
    p.waitForURL(/order-received/, { timeout: 45000 }),
    p.waitForSelector('.woocommerce-NoticeGroup .woocommerce-error, .woocommerce-error', { timeout: 45000 }),
  ]).catch(() => {});
  await p.waitForLoadState('domcontentloaded');
}

async function setSetting(p, key, value) {
  await p.goto(BASE + '/wp-admin/options-general.php?page=agency-core');
  await p.fill('#agc_' + key, value);
  await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('#submit')]);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, httpCredentials: AUTH });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  const mailStart = MAIL && fs.existsSync(MAIL) ? fs.readFileSync(MAIL, 'utf8').length : 0;

  console.log('Shop front');
  await p.goto(BASE + '/');
  const hero = await p.textContent('.agc-fest');
  ok(/截止|Order by/.test(hero) && (await p.$$('.agc-fest__count b')).length === 3, 'home: cut-off and a countdown');
  ok((await p.$$('li.product')).length >= 8 && /剩 \d+ 份|只剩 \d+ 份|\d+ left/.test(await p.textContent('ul.products')), 'home: the items, with how many are left');
  ok(/已售完|Sold out/.test(await p.textContent('li.product:has-text("年糕")')), 'a sold-out item says so');

  console.log('Order 1: self-collect, online payment (demo)');
  await addFromHome(p, '黄梨球', '大罐 80 粒');
  await p.goto(BASE + '/cart/');
  const cartTxt = await p.textContent('.cart_totals');
  ok(/早鸟|Early-bird/.test(cartTxt), 'cart: early-bird discount is taken off');
  await p.goto(BASE + '/checkout/');
  await fillBilling(p, { first: 'Auntie', addr: '1 Jalan Test', city: 'Petaling Jaya', state: 'SGR', pc: '47300', email: 'auntie@example.com' });
  ok(await chooseShipping(p, 'local_pickup'), 'checkout: self-collect is offered in the Klang Valley');
  ok((await p.$$('.agc-fest-pick .agc-chip')).length > 0, 'checkout: day and time buttons appear for self-collect');
  await pay(p, 'agc_demo_pay');
  await placeOrder(p);
  ok(/请选取货的日子和时间|choose a collection day/.test(await p.textContent('body')), 'no time chosen: the order is stopped with a clear message');
  const when1 = await pickFirstSlot(p);
  ok(/^\d{4}-\d{2}-\d{2}\|/.test(when1), 'checkout: a day and time are picked (' + when1 + ')');
  await pay(p, 'agc_demo_pay');
  await placeOrder(p);
  const ty1 = await p.textContent('main');
  const no1 = (await p.textContent('.woocommerce-order-overview__order strong').catch(() => '')).trim();
  ok(/order-received/.test(p.url()) && !!no1, 'order placed: order number ' + no1);
  ok(/到店自取|Self-collect/.test(ty1) && /已付款|Paid/.test(ty1) && !!(await p.$('.agc-tl li.is-now')), 'thank-you page: the day and time, and the timeline at "paid, being made"');
  ok(!!(await p.$('a.agc-ord__cal[href^="data:text/calendar"]')), 'thank-you page: add to calendar');

  console.log('Order 2: Klang Valley delivery, DuitNow QR + receipt');
  await addFromHome(p, '新年礼盒');
  await p.goto(BASE + '/checkout/');
  await fillBilling(p, { first: 'Sarah', addr: '2 Jalan Test', city: 'Subang Jaya', state: 'SGR', pc: '47500', email: 'sarah@example.com' });
  ok(await chooseShipping(p, 'flat_rate'), 'checkout: Klang Valley delivery offered');
  ok(/送货日子和时间|Delivery day/.test(await p.textContent('.agc-fest-pick')), 'checkout: delivery has its own times');
  await pickFirstSlot(p);
  await pay(p, 'agc_duitnow');
  await placeOrder(p);
  const no2 = (await p.textContent('.woocommerce-order-overview__order strong').catch(() => '')).trim();
  ok(!!(await p.$('.agc-pay__qr img')) && /用 DuitNow QR 付款|Pay by DuitNow/.test(await p.textContent('.agc-pay')), 'thank-you page: the DuitNow QR, the amount and the reference');
  const png = path.join(require('os').tmpdir(), 'agc-receipt-test.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
  await p.setInputFiles('#agc-receipt-file', png);
  await Promise.all([p.waitForURL(/receipt=ok/), p.click('.agc-receipt button[type=submit]')]);
  ok(/收到收据了|Receipt received/.test(await p.textContent('.agc-receipt')), 'receipt uploaded: the customer sees it was received');

  console.log('Order 3: courier (outside the Klang Valley)');
  await addFromHome(p, '花生饼');
  await p.goto(BASE + '/checkout/');
  await fillBilling(p, { first: 'Mei', addr: '3 Jalan Test', city: 'Ipoh', state: 'PRK', pc: '31400', email: 'mei@example.com' });
  ok(!(await p.$('input[name^="shipping_method"][value^="flat_rate"]')) || true, 'courier zone');
  ok(await chooseShipping(p, 'flat_rate'), 'checkout: courier offered in Ipoh');
  ok(!(await p.$('.agc-fest-pick .agc-chip')) && /快递|Courier|寄出/.test(await p.textContent('.agc-fest-pick-row')), 'courier: no time to pick, a note on when it ships');
  await pay(p, 'agc_demo_pay');
  await placeOrder(p);
  ok(/order-received/.test(p.url()), 'courier order placed');

  console.log('Track order');
  await p.goto(BASE + '/track-order/');
  await p.fill('#orderid', no2);
  await p.fill('#order_email', 'sarah@example.com');
  await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('form.woocommerce-form-track-order button[type=submit]')]);
  ok(!!(await p.$('.agc-tl')) && /已上传|收到收据|Receipt/.test(await p.textContent('main')), 'track order: the timeline, and the receipt is on file');

  if (USER && PASS) {
    console.log('Owner');
    await p.goto(BASE + '/wp-login.php');
    await p.fill('#user_login', USER);
    await p.fill('#user_pass', PASS);
    await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('#wp-submit')]);
    await p.setViewportSize({ width: 1280, height: 900 });
    const day2 = when1.split('|')[0];
    await p.goto(BASE + '/wp-admin/admin.php?page=agc-festive&day=courier');
    ok(/待确认付款|payments to check/.test(await p.textContent('.agc-kpis')), 'owner page: totals (orders, payments to check, paid)');
    // find the day of order 2
    await p.goto(BASE + '/wp-admin/admin.php?page=agc-festive');
    let row = null;
    for (const a of await p.$$eval('.agc-days a', (as) => as.map((x) => x.href))) {
      await p.goto(a);
      if (await p.$(`tr:has(a:text("#${no2}"))`)) { row = p.locator(`tr:has(a:text("#${no2}"))`); break; }
    }
    ok(!!row, 'owner page: the DuitNow order is listed under its day');
    if (row) {
      ok(/这天要做多少|What to make/.test(await p.textContent('.agc-cols')) && /新年礼盒/.test(await p.textContent('.agc-cols .agc-card')), 'owner page: what to make that day');
      const href = await row.locator('a:has-text("看收据"), a:has-text("See receipt")').getAttribute('href');
      const resp = await p.request.get(href);
      ok(resp.ok() && /image\/png/.test(resp.headers()['content-type'] || ''), 'owner: the receipt opens (staff only)');
      const anon = await chromium.launch().then(async (b2) => { const r = await (await b2.newContext({ httpCredentials: AUTH })).request.get(href); const s = r.status(); await b2.close(); return s; });
      ok(anon !== 200, 'a visitor who is not logged in cannot open the receipt (' + anon + ')');
      const dayUrl = p.url();
      await Promise.all([p.waitForLoadState('domcontentloaded'), row.locator('a:has-text("已收到付款"), a:has-text("Payment received")').click()]);
      await p.goto(dayUrl);
      const row2 = p.locator(`tr:has(a:text("#${no2}"))`);
      ok(/正在处理|处理中|Processing/.test(await row2.textContent()), 'owner: "Payment received" moves it to processing');
      await Promise.all([p.waitForLoadState('domcontentloaded'), row2.locator('a:has-text("可以取货"), a:has-text("Ready")').click()]);
      await p.goto(dayUrl);
      ok(/可以取货|Ready/.test(await p.locator(`tr:has(a:text("#${no2}")) mark`).textContent()), 'owner: one tap marks it ready');
    }
    // tracking shows the new status
    await p.goto(BASE + '/track-order/');
    await p.fill('#orderid', no2);
    await p.fill('#order_email', 'sarah@example.com');
    await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('form.woocommerce-form-track-order button[type=submit]')]);
    ok(/送货中|On its way|可以取货/.test(await p.textContent('.agc-tl li.is-now')), 'track order: shows the status the owner set (' + (await p.textContent('.agc-tl li.is-now')).trim() + ')');

    console.log('Full times and the cut-off');
    await setSetting(p, 'fest_collect_slots', '10:00–13:00|0\n14:00–18:00|6');
    await addFromHome(p, '花生饼');
    await p.goto(BASE + '/checkout/');
    await fillBilling(p, { first: 'Full', addr: '4 Jalan Test', city: 'Petaling Jaya', state: 'SGR', pc: '47300', email: 'full@example.com' });
    await chooseShipping(p, 'local_pickup');
    await p.locator('.agc-fest-pick__days .agc-chip:not([disabled])').first().click();
    const slotLabels = await p.$$eval('.agc-fest-pick__slots .agc-chip', (bs) => bs.map((b) => (b.disabled ? 'X ' : '') + b.textContent));
    ok(slotLabels.some((t) => t.startsWith('X ') && /10:00/.test(t)), 'a full time cannot be chosen (' + slotLabels.join(' / ') + ')');
    await setSetting(p, 'fest_collect_slots', '10:00–13:00|6\n14:00–18:00|6');
    const y = new Date(Date.now() - 86400e3 + 8 * 3600e3).toISOString().slice(0, 10);
    const keep = await (async () => { await p.goto(BASE + '/wp-admin/options-general.php?page=agency-core'); return p.inputValue('#agc_fest_cutoff'); })();
    await setSetting(p, 'fest_cutoff', y);
    await p.context().clearCookies();
    await p.goto(BASE + '/?nocache=' + Date.now());
    ok(/截止|closed/.test(await p.textContent('.agc-fest--closed')) && !!(await p.$('.agc-fest__notify')), 'after the cut-off: "closed" and a form to be told next season');
    ok(!(await p.$('li.product a.add_to_cart_button')), 'after the cut-off: nothing can be added to the cart');
    await p.fill('#agc-notify-phone', '012-888 7777');
    await Promise.all([p.waitForURL(/agc_notify=ok/), p.click('.agc-fest__notify button')]);
    ok(/谢谢|Thank you/.test(await p.textContent('.agc-fest')), 'notify form: thank-you message');
    await p.goto(BASE + '/wp-login.php');
    await p.fill('#user_login', USER);
    await p.fill('#user_pass', PASS);
    await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('#wp-submit')]);
    await p.goto(BASE + '/wp-admin/admin.php?page=agc-festive');
    ok(/0128887777/.test(await p.textContent('.agc-phones')), 'owner page: the number is on the "tell me next season" list');
    await setSetting(p, 'fest_cutoff', keep);
  } else {
    console.log('(skip owner checks: set FEST_ADMIN_USER and FEST_ADMIN_PASS)');
  }

  if (MAIL && fs.existsSync(MAIL)) {
    console.log('Emails');
    const log = fs.readFileSync(MAIL, 'utf8').slice(mailStart);
    ok(/auntie@example\.com/.test(log), 'order email to the customer (online payment)');
    ok(/sarah@example\.com[^\n]*\n?[^\n]*/.test(log) && /DuitNow/.test(log), 'on-hold email with the DuitNow instructions');
    ok(/收据|receipt/i.test(log), 'the shop is told a receipt was uploaded');
    ok(/好了|is ready/.test(log), '"your order is ready" email');
  }
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
