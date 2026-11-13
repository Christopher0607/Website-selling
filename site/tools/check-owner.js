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
  ok((await p.$$('.pill')).length === 6, 'orders: six filters');
  await p.click('.pill[data-f=all]');
  await wait(p, 800);
  const nAll = (await p.$$('.ocard')).length;
  ok(nAll > 0, 'orders: list (' + nAll + ')');
  await p.fill('.search input', '示范');
  await wait(p, 1000);
  ok((await p.$$('.ocard')).length > 0 && (await p.$$('.ocard')).length <= nAll, 'orders: search by name');
  await p.fill('.search input', '');
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
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(/Order,Status/.test(csv) && csv.split('\n').length > 2, 'export orders as CSV');

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

  console.log('Desktop');
  await p.setViewportSize({ width: 1280, height: 860 });
  for (const v of ['home', 'orders?f=all', 'production', 'products', 'customers', 'reports', 'settings']) {
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
