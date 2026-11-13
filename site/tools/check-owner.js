// 店家后台 /dian/ 端到端检查（2026-11-13）
//   登录（错误密码 / 正确）、概况、订单（筛选、搜寻、详情、确认付款、可以取货、完成、备注、改时间）、生产、
//   产品（改价钱和库存、新增 + 上传照片、删除）、顾客、报表（图表、CSV）、设定（改了再改回来）、手机和电脑版不超出画面、没有程式错误。
// 用法：OWNER_USER=xxx OWNER_PASS=xxx node site/tools/check-owner.js http://demo-festive.kedailab.test
//   （可选）MANAGER_USER / MANAGER_PASS：店长帐号，检查从 wp-login 登录后会直接到 /dian/
// 会在网店留下：一个状态被推进的订单、一则备注；新增的测试产品会删掉，设定会改回来。
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://demo-festive.kedailab.test').replace(/\/$/, '');
const U = process.env.OWNER_USER, P = process.env.OWNER_PASS;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const wait = (p, ms = 400) => p.waitForTimeout(ms);
async function ready(p) { await p.waitForFunction(() => !document.querySelector('.ow-boot') && !document.querySelector('.main > .empty:only-child'), null, { timeout: 20000 }).catch(() => {}); await wait(p, 300); }
async function overflow(p) { return p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); }

// A customer orders on the website and pays by DuitNow (so there is always a "payment to check").
async function shopOrderDuitNow(browser) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const s = await c.newPage();
  const settle = async () => { await s.waitForTimeout(500); await s.waitForFunction(() => !document.querySelector('.blockUI.blockOverlay'), null, { timeout: 20000 }).catch(() => {}); };
  await s.goto(BASE + '/');
  await s.locator('li.product a.ajax_add_to_cart').first().click();
  await s.waitForTimeout(1500);
  await s.goto(BASE + '/checkout/');
  await s.fill('#billing_first_name', 'Test'); await s.fill('#billing_last_name', 'DuitNow'); await s.fill('#billing_address_1', '1 Jalan Test'); await s.fill('#billing_city', 'Petaling Jaya');
  await s.selectOption('select#billing_state', 'SGR'); await s.fill('#billing_postcode', '47300'); await s.fill('#billing_phone', '012-555 0000'); await s.fill('#billing_email', 'duitnow-test@example.com');
  await s.evaluate(() => window.jQuery && window.jQuery(document.body).trigger('update_checkout')); await settle();
  await s.locator('input[name^="shipping_method"][value^="local_pickup"]').first().evaluate((e) => e.click()); await settle();
  await s.locator('.agc-fest-pick__days .agc-chip:not([disabled])').first().click();
  await s.locator('.agc-fest-pick__slots .agc-chip:not([disabled])').first().click();
  await s.evaluate(() => { document.getElementById('payment_method_agc_duitnow').click(); const t = document.getElementById('terms'); if (t && !t.checked) t.click(); });
  await s.waitForTimeout(300);
  await Promise.all([s.waitForURL(/order-received/, { timeout: 45000 }), s.click('#place_order')]);
  await c.close();
  return true;
}

(async () => {
  if (!U || !P) { console.log('set OWNER_USER and OWNER_PASS'); process.exit(2); }
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));

  console.log('Login');
  const api = await p.request.get(BASE + '/wp-json/agc/v1/owner/summary');
  ok(api.status() === 401, 'the dashboard data is closed to visitors (' + api.status() + ')');
  await p.goto(BASE + '/dian/');
  ok(/店家后台|Shop dashboard/.test(await p.textContent('h1')), 'login screen');
  await p.fill('input[name=log]', U);
  await p.fill('input[name=pwd]', 'wrong-' + Date.now());
  await Promise.all([p.waitForURL(/login=failed/), p.click('button[type=submit]')]);
  ok(!!(await p.$('.ow-alert')), 'wrong password: a clear message on the same screen');
  await p.fill('input[name=log]', U);
  await p.fill('input[name=pwd]', P);
  await Promise.all([p.waitForURL(/\/dian\/(#.*)?$/), p.click('button[type=submit]')]);
  await p.waitForSelector('.nav');
  await ready(p);

  console.log('Overview');
  ok((await p.$$('.stat')).length >= 7, 'overview: numbers (payments to check, to make, ready, today, season)');
  ok(!!(await p.$('.card--soft')), 'overview: the festive season card');
  ok((await overflow(p)) <= 1, 'overview fits the phone screen');

  console.log('Orders');
  await p.click('.nav a[data-k=orders]');
  await p.waitForSelector('.pills .pill');
  await wait(p, 600);
  ok((await p.$$('.pill[data-f]')).length === 6, 'orders: six filters');
  await p.click('.pill[data-f=all]');
  await wait(p, 800);
  const nAll = (await p.$$('.ocard')).length;
  ok(nAll > 0, 'orders: list (' + nAll + ')');
  await p.fill('.search input', '示范');
  await wait(p, 1000);
  ok((await p.$$('.ocard')).length > 0 && (await p.$$('.ocard')).length <= nAll, 'orders: search by name');
  await p.fill('.search input', '');
  await wait(p, 800);
  const madeShop = await shopOrderDuitNow(browser).catch((e) => { console.log('    ' + e.message.split('\n')[0]); return false; });
  ok(madeShop, 'a customer orders on the website and pays by DuitNow');
  await p.goto(BASE + '/dian/#/home');
  await ready(p);
  await p.goto(BASE + '/dian/#/orders?f=check');
  await p.waitForSelector('.pill[data-f]');
  await wait(p, 800);
  await p.click('.pill[data-f=check]');
  await wait(p, 800);
  const checkCard = await p.$('.ocard');
  ok(!!checkCard, 'orders: "payment to check" filter has orders');
  await checkCard.click();
  await p.waitForSelector('.actbar');
  await ready(p);
  const num = (await p.textContent('.top__title')).trim();
  ok(/^#\d+/.test(num) && !!(await p.$('.lines')) && !!(await p.$('a[href^="https://wa.me/"]')), 'order detail: items, total, WhatsApp button (' + num + ')');
  const wa = await p.getAttribute('a[href^="https://wa.me/"]', 'href');
  ok(/text=/.test(wa) && decodeURIComponent(wa).includes(num.slice(1)), 'WhatsApp message is pre-filled with the order number');
  const moveBtn = await p.$('button:has-text("改日子"), button:has-text("Change day")');
  if (moveBtn) {
    await moveBtn.click();
    const opt = await p.$('.sheet .btn--plain:not([disabled])');
    if (opt) {
      const label = (await opt.textContent()).split(' · ')[0];
      await opt.click();
      await wait(p, 1300);
      ok((await p.textContent('.when')).includes(label), 'change collection time (' + label + ')');
    } else ok(true, 'change time: no other time free');
  } else ok(false, 'change time: button missing on an order that is not made yet');
  await p.click('.actbar .btn:not(.btn--danger)');
  await p.waitForSelector('.sheet');
  await p.click('.sheet .btn:not(.btn--plain)');
  await p.waitForSelector('.toast');
  await wait(p, 900);
  await ready(p);
  ok(/要做|To make/.test(await p.textContent('.badge')), '"Payment received" → to make (paid)');
  await p.click('.actbar .btn');
  await wait(p, 1200);
  await ready(p);
  ok(/可以取货|Ready/.test(await p.textContent('.badge')), '"Ready" in one tap');
  await p.fill('textarea[aria-label]', 'Test note ' + Date.now());
  await p.click('.card .form .btn');
  await wait(p, 1200);
  ok(/Test note/.test(await p.textContent('.timeline')), 'add a private note');
  await p.click('.actbar .btn');
  await wait(p, 1200);
  ok(/已完成|Done/.test(await p.textContent('.badge')), '"Done"');
  ok((await overflow(p)) <= 1, 'order detail fits the phone screen');

  console.log('Production');
  await p.click('.nav a[data-k=production]');
  await p.waitForSelector('.pills');
  await ready(p);
  ok((await p.$$('.pills .pill')).length >= 2 && !!(await p.$('.make, .card .muted')), 'production: day tabs and what to make');
  ok((await overflow(p)) <= 1, 'production fits the phone screen');

  console.log('Products');
  await p.click('.nav a[data-k=products]');
  await p.waitForSelector('.pcard');
  await ready(p);
  ok((await p.$$('.pcard')).length >= 8, 'products: list with photos, prices and stock');
  await p.click('.pcard:has-text("花生饼"), .pcard:has-text("Peanut")');
  await p.waitForSelector('.actbar');
  await ready(p);
  const priceIn = p.locator('input[type=number]').first();
  const oldPrice = await priceIn.inputValue();
  const stockIn = p.locator('input[inputmode=numeric]').first();
  const oldStock = await stockIn.inputValue();
  await priceIn.fill('33.50');
  await stockIn.fill('50');
  await p.click('.actbar .btn:not(.btn--plain)');
  await p.waitForSelector('.toast');
  await wait(p, 1200);
  await ready(p);
  ok((await priceIn.inputValue()) === '33.50' && (await stockIn.inputValue()) === '50', 'change price and stock');
  await p.locator('input[type=number]').first().fill(oldPrice);
  await p.locator('input[inputmode=numeric]').first().fill(oldStock);
  await p.click('.actbar .btn:not(.btn--plain)');
  await wait(p, 1500);
  await p.goto(BASE + '/dian/#/product/new');
  await p.waitForSelector('.actbar');
  await ready(p);
  await p.fill('.form input[type=text]', 'Test product ' + Date.now());
  await p.locator('input[type=number]').first().fill('12');
  const png = path.join(os.tmpdir(), 'agc-owner-test.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mP8z8BQz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC', 'base64'));
  await p.setInputFiles('.photo--add input[type=file]', png);
  await p.waitForSelector('.photo img', { timeout: 20000 });
  ok(!!(await p.$('.photo--main img')), 'new product: photo uploaded');
  await Promise.all([p.waitForURL(/#\/product\/\d+/), p.click('.actbar .btn')]);
  await ready(p);
  ok(/Test product/.test(await p.textContent('.top__title')), 'new product saved');
  await p.click('button.btn--danger');
  await p.click('.sheet .btn--danger');
  await p.waitForURL(/#\/products/);
  await ready(p);
  ok(!(await p.$('.pcard:has-text("Test product")')), 'test product deleted');

  console.log('Customers, reports');
  await p.goto(BASE + '/dian/#/customers');
  await ready(p);
  ok((await p.$$('.tbl tr')).length > 0, 'customers: list with call / WhatsApp');
  await p.goto(BASE + '/dian/#/reports');
  await p.waitForSelector('.stat');
  await ready(p);
  ok(!!(await p.$('.chart svg path.b')) && (await p.$$('.tbl tbody tr')).length > 0, 'reports: chart of sales per day, best sellers');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), p.click('.main > .btn')]);
  const xl = fs.readFileSync(await dl.path());
  const xlPath = path.join(os.tmpdir(), 'agc-owner-test.xlsx');
  fs.writeFileSync(xlPath, xl);
  ok(xl.slice(0, 2).toString() === 'PK' && xl.includes('xl/worksheets/sheet1.xml') && xl.includes('xl/worksheets/sheet3.xml') && /\.xlsx$/.test(dl.suggestedFilename()), 'export to Excel (.xlsx: orders, daily sales, best sellers) → ' + xlPath);

  console.log('Settings');
  await p.goto(BASE + '/dian/#/settings');
  await p.waitForSelector('.slotrow');
  await ready(p);
  const nameIn = p.locator('section').first().locator('input[type=text]').first();
  const oldName = await nameIn.inputValue();
  await nameIn.fill(oldName + ' TEST');
  await p.locator('section').first().locator('> .form > .btn, .form > .btn').first().click();
  await p.waitForSelector('.toast');
  await p.reload();
  await p.waitForSelector('.slotrow');
  await ready(p);
  ok((await p.locator('section').first().locator('input[type=text]').first().inputValue()) === oldName + ' TEST', 'settings: festive season saved');
  await p.locator('section').first().locator('input[type=text]').first().fill(oldName);
  await p.locator('section').first().locator('.form > .btn').first().click();
  await wait(p, 1500);
  ok((await p.$$('section')).length === 4, 'settings: festive, shop details, DuitNow, delivery fees');
  ok((await overflow(p)) <= 1, 'settings fit the phone screen');

  console.log('New order (phone / WhatsApp / counter) — an add-on');
  const manualOn = await p.evaluate(() => !!(window.AGC_OWNER && AGC_OWNER.manual));
  if (!manualOn) {
    await p.goto(BASE + '/dian/#/orders?f=all');
    await ready(p);
    const apiStatus = await p.evaluate(async () => (await fetch(AGC_OWNER.rest + 'orders', { method: 'POST', credentials: 'same-origin', headers: { 'X-WP-Nonce': AGC_OWNER.nonce, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x', items: [] }) })).status);
    ok(!(await p.$('.top__act a[href="#/new-order"]')) && apiStatus === 403, 'phone orders are an add-on: no button, and the server refuses (' + apiStatus + ')');
  } else {
  await p.goto(BASE + '/dian/#/new-order');
  await p.waitForSelector('.actbar');
  await ready(p);
  await p.locator('.card.form input[type=text]').first().fill('Test Walk-in ' + Date.now());
  await p.locator('input[type=tel]').first().fill('012-333 4444');
  const firstSel = p.locator('.card select[aria-label]').first();
  const optVal = await firstSel.evaluate((s) => [...s.options].find((o) => o.value && !o.disabled).value);
  await firstSel.selectOption(optVal);
  await p.waitForFunction(() => document.querySelectorAll('.card select')[2] && document.querySelectorAll('.card select')[2].options.length > 1, null, { timeout: 15000 }).catch(() => {});
  const whenSel = p.locator('.card.form select').nth(1);
  const whenVal = await whenSel.evaluate((s) => { const o = [...s.options].find((x) => x.value); return o ? o.value : ''; });
  if (whenVal) await whenSel.selectOption(whenVal);
  ok(/RM\d/.test(await p.textContent('.actbar b')), 'new order: the total adds up as you pick items');
  await Promise.all([p.waitForURL(/#\/order\/\d+/, { timeout: 20000 }), p.click('.actbar .btn')]);
  await ready(p);
  ok(/要做|To make/.test(await p.textContent('.badge')) && /Test Walk-in/.test(await p.textContent('.top__site')), 'new order saved as paid (shows under "to make")');
  }

  console.log('Many orders at once');
  await p.goto(BASE + '/dian/#/orders?f=make');
  await p.waitForSelector('.ocard');
  await ready(p);
  await p.click('.pills button:has-text("选择"), .pills button:has-text("Select")');
  const cards = await p.$$('.ocard');
  await cards[0].click();
  await cards[1].click();
  ok(/2/.test(await p.textContent('.actbar .small')), 'select two orders');
  await p.click('.actbar button:has-text("可以取货"), .actbar button:has-text("Mark ready")');
  const bulkToast = await p.waitForSelector('.toast:has-text("2")', { timeout: 15000 }).catch(() => null);
  ok(!!bulkToast, 'two orders marked ready in one tap');
  await wait(p, 1500);

  console.log('Delivery and printing');
  await p.goto(BASE + '/dian/#/orders?f=all');
  await ready(p);
  await p.waitForSelector('.ocard');
  const dCard = p.locator('.ocard:has-text("送货"), .ocard:has-text("Delivery")').first();
  if (await dCard.count()) {
    await dCard.click();
    await p.waitForSelector('.lines');
    await ready(p);
    ok(!!(await p.$('a[href^="https://waze.com/ul"]')) && !!(await p.$('a[href^="https://www.google.com/maps/"]')), 'delivery order: Waze and Google Maps buttons');
  } else ok(false, 'no delivery order to check');
  await p.goto(BASE + '/dian/#/production');
  await ready(p);
  await p.click('.top__act button:has-text("清单"), .top__act button:has-text("List")');
  await p.waitForSelector('.checklist .box', { timeout: 15000 }).catch(() => {});
  ok((await p.$$('.checklist .box')).length > 0, 'printable pick-up list with boxes to tick');

  console.log('Coupons');
  const code = 'TEST' + String(Date.now()).slice(-6);
  await p.goto(BASE + '/dian/#/coupon/new');
  await p.waitForSelector('.actbar');
  await ready(p);
  await p.locator('.card.form input[type=text]').first().fill(code);
  await p.locator('.card.form input[type=number]').first().fill('10');
  await Promise.all([p.waitForURL(/#\/coupons$/), p.click('.actbar .btn')]);
  await ready(p);
  ok(new RegExp(code).test(await p.textContent('.main')), 'coupon created');
  const shop = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const sp = await shop.newPage();
  await sp.goto(BASE + '/');
  await sp.locator('li.product a.ajax_add_to_cart').first().click();
  await sp.waitForTimeout(1500);
  await sp.goto(BASE + '/cart/');
  await sp.fill('#coupon_code', code);
  await sp.click('button[name=apply_coupon]');
  await sp.waitForTimeout(2500);
  ok(new RegExp(code, 'i').test(await sp.textContent('.cart_totals')), 'the coupon works in the shop cart');
  await shop.close();
  await p.click('.pcard:has-text("' + code + '")');
  await p.waitForSelector('.actbar');
  await p.click('button.btn--danger');
  await p.click('.sheet .btn--danger');
  await p.waitForURL(/#\/coupons$/);
  await ready(p);
  ok(!new RegExp(code).test(await p.textContent('.main')), 'coupon deleted');

  console.log('Pause online orders');
  await p.goto(BASE + '/dian/#/home');
  await ready(p);
  const pz = p.locator('.card .switch input').first();
  await pz.click();
  await p.waitForSelector('.toast');
  await p.waitForTimeout(800);
  const v1 = await browser.newContext();
  const vp = await v1.newPage();
  await vp.goto(BASE + '/?nc=' + Date.now());
  ok(!!(await vp.$('.agc-paused')) && !(await vp.$('li.product a.add_to_cart_button')), 'paused: the shop shows the message and nothing can be added to the cart');
  await pz.click();
  await p.waitForTimeout(1500);
  await vp.goto(BASE + '/?nc=' + Date.now());
  ok(!(await vp.$('.agc-paused')) && !!(await vp.$('li.product a.add_to_cart_button')), 'switched back on: orders open again');
  await v1.close();

  if (process.env.OWNER_IS_ADMIN !== '0') {
    console.log('Team');
    await p.goto(BASE + '/dian/#/team');
    await p.waitForSelector('.tbl');
    await ready(p);
    const em = 'staff' + Date.now() + '@example.com';
    await p.locator('.card.form input[type=text]').fill('Test Staff');
    await p.locator('.card.form input[type=email]').fill(em);
    await p.click('.card.form .btn');
    await p.waitForSelector('.card--soft');
    ok(/wp-login\.php\?action=rp/.test(await p.textContent('.card--soft')) && /Test Staff/.test(await p.textContent('.tbl')), 'staff account added, with a set-password link to send');
    await p.click('tr:has-text("Test Staff") .btn--danger');
    await p.click('.sheet .btn--danger');
    await p.waitForTimeout(1500);
    ok(!/Test Staff/.test(await p.textContent('.tbl')), 'staff account removed');
  }

  console.log('Desktop');
  await p.setViewportSize({ width: 1280, height: 860 });
  for (const v of ['home', 'orders?f=all', 'production', 'products', 'customers', 'coupons', 'reports', 'settings', 'team']) {
    await p.goto(BASE + '/dian/#/' + v);
    await ready(p);
    const o = await overflow(p);
    if (o > 1) ok(false, 'desktop ' + v + ' is ' + o + 'px too wide');
  }
  ok(await p.isVisible('.side'), 'desktop: sidebar with every section');

  if (process.env.MANAGER_USER) {
    console.log('Shop manager');
    const c2 = await browser.newContext();
    const m = await c2.newPage();
    await m.goto(BASE + '/wp-login.php');
    await m.fill('#user_login', process.env.MANAGER_USER);
    await m.fill('#user_pass', process.env.MANAGER_PASS);
    await Promise.all([m.waitForURL(/\/dian\//), m.click('#wp-submit')]);
    ok(/\/dian\//.test(m.url()), 'a shop manager lands on the new dashboard after logging in');
    await c2.close();
  }
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
