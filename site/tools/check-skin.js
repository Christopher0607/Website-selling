// A shop with its own design (agency-core class-skin.php, e.g. The Baking Trip): the customer side, end to end.
// Places real (test) orders: run on a local or preview site in demo mode with test orders allowed, never on a live shop.
// Usage: node site/tools/check-skin.js <url> [--basic user:pass]
//   OWNER_USER / OWNER_PASS (optional): also checks that the orders show up in the shop dashboard (/dian/).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://preview-tbt.kedailab.test').replace(/\/$/, '');
const bi = process.argv.indexOf('--basic');
const AUTH = bi > 0 ? { username: process.argv[bi + 1].split(':')[0], password: process.argv[bi + 1].split(':').slice(1).join(':') } : undefined;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const png = path.join(os.tmpdir(), 'agc-skin-receipt.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mP8z8BQz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC', 'base64'));

async function ctx(b, w = 390) { return b.newContext({ viewport: { width: w, height: w > 500 ? 860 : 844 }, httpCredentials: AUTH }); }

// Menu → bag → order page → day, time, details → pay → thank-you page. Returns { url, number, page }.
async function order(b, pay, opts = {}) {
  const c = await ctx(b);
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  await p.goto(BASE + '/menu/');
  await p.waitForSelector('[data-add]:not([disabled])');
  await p.locator('[data-add]:not([disabled])').first().click();
  await p.waitForTimeout(300);
  if (opts.coffee) {
    await p.click('#i-coffee [data-add]');
    await p.waitForSelector('[data-sheet-add]');
    await p.locator('.sheet__panel input[name=g0]').nth(1).check();
    await p.click('[data-sheet-add]');
    await p.waitForTimeout(300);
  }
  await p.goto(BASE + '/order/');
  await p.waitForSelector('[data-day]');
  await p.locator('[data-day]').first().click();
  await p.waitForSelector('[data-time]');
  await p.locator('[data-time]').nth(opts.timeIndex || 0).click();
  await p.fill('#o-name', 'Test ' + pay);
  await p.fill('#o-phone', '012-555 0000');
  await p.fill('#o-email', pay + '-skin@example.com');
  await p.fill('#o-notes', 'Skin test');
  if (opts.code) {
    await p.fill('#o-code', opts.code);
    await p.click('[data-apply]');
    await p.waitForTimeout(1200);
  }
  await p.locator('input[name=pay][value=' + pay + ']').check();
  await p.waitForTimeout(300);
  const total = await p.textContent('.totals .grand');
  await Promise.all([p.waitForURL(/\/order\/\?o=\d+&k=/, { timeout: 30000 }), p.click('[data-place]')]);
  await p.waitForSelector('.done');
  const number = ((await p.textContent('.done .ref')) || '').replace('#', '').trim();
  return { c, p, url: p.url(), number, total, errs };
}

(async () => {
  const b = await chromium.launch();

  console.log('Pages look like the design');
  {
    const c = await ctx(b);
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
    for (const u of ['/', '/menu/', '/order/', '/festive/', '/catering/', '/privacy/', '/terms/', '/shipping-returns/', '/track-order/']) {
      const r = await p.goto(BASE + u, { waitUntil: 'networkidle' });
      const i = await p.evaluate(() => ({ hdr: !!document.querySelector('header.hdr'), ftr: !!document.querySelector('footer.ftr'), ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, broken: [...document.images].filter((x) => x.complete && x.naturalWidth === 0).length, ready: document.documentElement.getAttribute('data-store') }));
      ok(r.status() === 200 && i.hdr && i.ftr && i.ov <= 1 && !i.broken && i.ready === 'ready', u + ': the design, nothing too wide, no broken photos');
    }
    const shop = await p.goto(BASE + '/shop/');
    ok(/\/menu\/$/.test(p.url()) && shop.status() === 200, 'the old shop page leads to the menu');
    await p.goto(BASE + '/menu/');
    const asks = await p.locator('.addbtn--ask').count();
    const adds = await p.locator('[data-add]').count();
    ok(adds >= 7 && asks >= 10, 'menu: priced items can be added (' + adds + '), items without a price say "Ask" (' + asks + ')');
    ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await c.close();
  }

  console.log('Order and pay online (preview payment)');
  {
    const r = await order(b, 'online', { coffee: true });
    const t = await r.p.textContent('.done');
    ok(/Paid RM/.test(t) && /Order received/.test(t) && /Pick-up/.test(t), 'thank-you page: paid, order number #' + r.number + ', pick-up day and time');
    ok((await r.p.locator('.steps-line .is-on').count()) === 2, 'progress: "Paid · being made"');
    await r.p.goto(BASE + '/order/');
    ok(/empty/i.test(await r.p.textContent('[data-order]')), 'the bag is empty after ordering');
    ok(r.errs.length === 0, 'no JavaScript errors');
    await r.c.close();
  }

  console.log('Order and pay by DuitNow (receipt upload)');
  let duitnowNo = '';
  {
    const r = await order(b, 'duitnow');
    duitnowNo = r.number;
    ok(!!(await r.p.$('.done .agc-pay img')) && /reference/i.test(await r.p.textContent('.done .agc-pay')), 'thank-you page: DuitNow QR, amount and reference #' + r.number);
    await r.p.setInputFiles('#agc-receipt-file', png);
    await Promise.all([r.p.waitForURL(/receipt=ok/, { timeout: 30000 }), r.p.click('.agc-receipt .button')]);
    await r.p.waitForSelector('.done');
    ok(/Receipt received/.test(await r.p.textContent('.done')), 'receipt uploaded, back on the same thank-you page');
    await r.c.close();
  }

  console.log('Send the order on WhatsApp');
  {
    const r = await order(b, 'wa', { timeIndex: 3 });
    const href = await r.p.getAttribute('.done a.btn--wa', 'href');
    ok(/^https:\/\/wa\.me\/60\d+\?text=/.test(href || '') && decodeURIComponent(href).includes('#' + r.number), 'thank-you page: WhatsApp to the shop with the order filled in');
    await r.c.close();
  }

  console.log('Promo code');
  {
    const r = await order(b, 'online', { code: process.env.SKIN_CODE || 'SKINTEST10' });
    ok(/Paid RM/.test(await r.p.textContent('.done')), 'order with a promo code goes through (' + (r.total || '').replace(/\s+/g, ' ').trim() + ')');
    await r.c.close();
    const c = await ctx(b);
    const p = await c.newPage();
    await p.goto(BASE + '/menu/');
    await p.locator('[data-add]:not([disabled])').first().click();
    await p.goto(BASE + '/order/');
    await p.waitForSelector('#o-code');
    await p.fill('#o-code', 'NOSUCHCODE');
    await p.click('[data-apply]');
    await p.waitForTimeout(1200);
    ok(/doesn.t work/i.test(await p.textContent('.summary')), 'a wrong code says so');
    await c.close();
  }

  console.log('Christmas pre-order request');
  {
    const c = await ctx(b);
    const p = await c.newPage();
    await p.goto(BASE + '/festive/');
    await p.waitForSelector('[data-fq]');
    await p.locator('[data-fq$=":1"]').first().click();
    await p.fill('#f-name', 'Test Festive');
    await p.fill('#f-phone', '012-555 0000');
    await Promise.all([p.waitForURL(/\/order\/\?o=\d+&k=/, { timeout: 30000 }), p.click('[data-forder]')]);
    await p.waitForSelector('.done');
    ok(/Pre-order request sent/.test(await p.textContent('.done')) && /price/i.test(await p.textContent('.done')), 'request sent; we WhatsApp the price before they pay');
    await c.close();
  }

  console.log('Whole-cake request');
  {
    const c = await ctx(b);
    const p = await c.newPage();
    await p.goto(BASE + '/catering/');
    await p.waitForSelector('[data-catering]');
    const f = p.locator('[data-catering]');
    for (const [sel, v] of [['input[name=name]', 'Test Cake'], ['input[name=phone]', '012-555 0000']]) if (await f.locator(sel).count()) await f.locator(sel).fill(v);
    const date = f.locator('input[type=date]');
    if (await date.count()) await date.first().fill(new Date(Date.now() + 9 * 864e5).toISOString().slice(0, 10));
    for (const req of await f.locator('[required]').all()) { if (!(await req.inputValue().catch(() => 'x'))) await req.fill('Test').catch(() => {}); }
    await f.locator('button[type=submit]').click();
    await p.waitForSelector('.done', { timeout: 20000 }).catch(() => {});
    ok(/Request sent/.test((await p.textContent('main')) || ''), 'request goes to the shop, with a WhatsApp button too');
    await c.close();
  }

  console.log('Track my order');
  {
    const c = await ctx(b);
    const p = await c.newPage();
    await p.goto(BASE + '/track-order/');
    ok(!!(await p.$('form input[name=orderid]')), 'track-order form inside the design');
    await c.close();
  }

  if (process.env.OWNER_USER) {
    console.log('The shop dashboard sees the orders');
    const c = await ctx(b);
    const p = await c.newPage();
    await p.goto(BASE + '/dian/');
    await p.fill('input[name=log]', process.env.OWNER_USER);
    await p.fill('input[name=pwd]', process.env.OWNER_PASS);
    await Promise.all([p.waitForURL(/\/dian\/(#.*)?$/), p.click('button[type=submit]')]);
    await p.waitForSelector('.nav');
    await p.goto(BASE + '/dian/#/orders?f=check');
    await p.waitForTimeout(2000);
    await p.click('.pill[data-f=check]').catch(() => {});
    await p.waitForTimeout(1500);
    const txt = await p.textContent('.main');
    ok(txt.includes('#' + duitnowNo) && /Test duitnow/i.test(txt), 'DuitNow order #' + duitnowNo + ' is under "payment to check"');
    await p.click('.ocard:has-text("#' + duitnowNo + '")');
    await p.waitForSelector('.lines');
    await p.waitForTimeout(800);
    const d = await p.textContent('.main');
    ok(/Pick-up time: \d/.test(d) && /\d{1,2}:\d{2}–\d{1,2}:\d{2}/.test(await p.textContent('.when')), 'order detail: collection day, time slot and the exact pick-up time');
    await c.close();
  }

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
