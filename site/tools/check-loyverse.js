// Loyverse POS sync, end to end (2026-11-17) — LOCAL ONLY: needs the stand-in Loyverse (site/tools/mock-loyverse.mjs)
// and a test site that points at it (wp-config / mu-plugin: define( 'AGC_LOYVERSE_BASE', 'http://127.0.0.1:9930/v1.0' );
// on a demo site also add_filter( 'agc_loyverse_demo_allowed', '__return_true' );). The site needs table QR ordering and
// the counter on (e.g. the Sireh & Salt demo), and a shop manager account (the demo login cannot open settings).
//
//   node site/tools/mock-loyverse.mjs &
//   OWNER_USER=... OWNER_PASS=... node site/tools/check-loyverse.js http://sireh-salt.demo.kedailab.test [http://127.0.0.1:9930]
//
// Checks: connect (wrong token refused, the token never comes back to the browser), store and payment types guessed,
// which products Loyverse knows (SKU, then name), paid orders become receipts in the background (counter cash, GrabFood,
// table paid on the phone), Loyverse down → "Not sent" → send again, disconnect.
const { chromium } = require('playwright');

const BASE = (process.argv[2] || '').replace(/\/$/, '');
const MOCK = (process.argv[3] || 'http://127.0.0.1:9930').replace(/\/$/, '');
const U = process.env.OWNER_USER, P = process.env.OWNER_PASS;
if (!BASE || !U || !P) { console.log('OWNER_USER=... OWNER_PASS=... node site/tools/check-loyverse.js <site> [mock]'); process.exit(2); }
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const mock = (p, method) => fetch(MOCK + p, { method: method || 'GET' }).then((r) => r.json());

(async () => {
  await mock('/__reset', 'POST');
  const b = await chromium.launch();
  const k = await (await b.newContext({ viewport: { width: 1180, height: 860 } })).newPage();
  const errs = [];
  k.on('pageerror', (e) => errs.push(e.message));
  await k.goto(BASE + '/dian/');
  await k.fill('input[name="log"]', U);
  await k.fill('input[name="pwd"]', P);
  await Promise.all([k.waitForNavigation(), k.click('button[type="submit"], input[type="submit"]')]);
  await k.waitForFunction(() => window.AGC_OWNER && document.querySelector('.main'), null, { timeout: 20000 });
  const api = (path, body) => k.evaluate(([p, bd]) => fetch(window.AGC_OWNER.rest.replace(/\/?$/, '/') + p, {
    method: bd ? 'POST' : 'GET', credentials: 'same-origin', headers: Object.assign({ 'X-WP-Nonce': window.AGC_OWNER.nonce }, bd ? { 'Content-Type': 'application/json' } : {}), body: bd ? JSON.stringify(bd) : undefined,
  }).then((r) => r.json()), [path, body]);
  // start clean: disconnected
  await api('loyverse', { token: '' });

  console.log('Connect');
  await k.goto(BASE + '/dian/#/loyverse');
  await k.waitForSelector('.lvcard input[type=password]', { timeout: 20000 });
  ok(/Not connected/.test(await k.textContent('.lvcard')), 'the Loyverse screen: not connected yet, with how to make a token');
  await k.fill('.lvcard input[type=password]', 'wrong_token_123456');
  await k.click('.lvcard .btn:has-text("Connect")');
  await k.waitForSelector('.toast--err', { timeout: 15000 });
  ok(/not accepted/.test(await k.textContent('.toast--err')), 'a wrong token is refused: ' + (await k.textContent('.toast--err')).slice(0, 80));
  await k.fill('.lvcard input[type=password]', 'lv_test_token_123456');
  await k.click('.lvcard .btn:has-text("Connect")');
  await k.waitForSelector('.lv__tok', { timeout: 20000 });
  const g = await api('loyverse');
  ok(g.connected && g.hint === '…3456' && !JSON.stringify(g).includes('lv_test_token_123456'), 'connected; the browser only ever sees the last 4 characters of the token');
  ok(g.store === 'st-1', 'the only open Loyverse store is chosen by itself');
  ok(g.pay.cash === 'pt-cash' && g.pay.card === 'pt-card', 'payment types guessed by name: cash → Cash, card → Card');
  ok(g.match && g.match.total > 10 && g.match.missing.includes('Gift voucher') && !g.match.missing.includes('Kopi Ais') && !g.match.missing.includes('Beef Rendang Rice') && !g.match.missing.includes('Teh Tarik Ais'),
    `products: ${g.match && g.match.found} of ${g.match && g.match.total} found (Beef Rendang Rice by SKU, "teh tarik  ais" by name); Gift voucher missing`);

  console.log('Sending settings');
  const sel = async (row, label) => { await k.selectOption(`.lv__pay tr:has(td:text-is("${row}")) select`, { label }); };
  await sel('Paid online', 'Online');
  await sel('DuitNow', 'DuitNow QR');
  await sel('GrabFood', 'GrabFood');
  await k.selectOption('label.field:has-text("anything not in Loyverse") select', { label: 'Website extras' });
  await k.click('.switch:has-text("Send paid orders to Loyverse") input');
  await k.click('.card .btn:has-text("Save")');
  await k.waitForFunction(() => /Sending/.test(document.querySelector('.lvcard .badge').textContent), null, { timeout: 15000 });
  const g2 = await api('loyverse');
  ok(g2.on && g2.pay.online === 'pt-web' && g2.pay.duitnow === 'pt-qr' && g2.pay.grab === 'pt-grab' && g2.other, 'saved: sending on, payment types, an item for everything else');

  console.log('Paid orders → Loyverse receipts (in the background)');
  // counter: takeaway, 2 × Kopi Ais, cash
  await k.goto(BASE + '/dian/#/counter');
  await k.waitForSelector('.cgrid .citem', { timeout: 20000 });
  const addDish = async (name) => { await k.click(`.citem:has-text("${name}")`); await k.waitForTimeout(200); if (await k.$('.sheet')) await k.click('.sheet .btn:not(.btn--plain)'); };
  await k.click('.counter__menu .pills .pill:has-text("Takeaway")');
  await addDish('Kopi Ais'); await addDish('Kopi Ais');
  await k.click('.counter__acts .btn:has-text("Pay now")');
  await k.click('.sheet .btn:has-text("Cash")');
  await k.fill('.sheet input[type=number]', '20');
  await k.click('.sheet .btn:has-text("Done")');
  await k.waitForFunction(() => /#\d+ sent/.test(document.body.textContent), null, { timeout: 15000 });
  const tk = (await k.textContent('body')).match(/#(\d+) sent/)[1];
  // GrabFood with its number
  await k.click('.counter__menu .pills .pill:has-text("GrabFood")');
  await k.fill('.counter__cart input[maxlength="30"]', 'GF-LV-1');
  await addDish('Nasi Lemak');
  await k.click('.counter__acts .btn:has-text("paid by GrabFood")');
  await k.waitForFunction((n) => { const m = document.body.textContent.match(/#(\d+) sent to the kitchen/); return m && m[1] !== n; }, tk, { timeout: 15000 });
  // a guest at table 4 pays on the phone (demo payment)
  const gp = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await gp.goto(BASE + '/table.html?t=4');
  await gp.waitForSelector('.tq-item', { timeout: 20000 });
  await gp.locator('.tq-item:has-text("Curry Laksa") .tq-add').click();
  await gp.click('.tq-sheet--item .tq-btn');
  await gp.click('.tq-bar__btn');
  const phoneBtn = await gp.$('.tq-sheet--cart .tq-btn:has-text("now")');
  await (phoneBtn ? phoneBtn.click() : gp.click('.tq-sheet--cart .tq-btn >> nth=-1'));
  await gp.waitForSelector('.tq-sheet--sent .tq-sent [data-order]', { timeout: 20000 });
  const tno = await gp.getAttribute('.tq-sheet--sent .tq-sent [data-order]', 'data-order');
  // the background job runs on the site's own cron (any visit); keep visiting until the receipts arrive
  let rc = [];
  for (let i = 0; i < 40; i++) {
    await fetch(BASE + '/wp-cron.php?doing_wp_cron=' + Date.now()).catch(() => {});
    rc = await mock('/__receipts');
    if (rc.length >= (phoneBtn ? 3 : 2)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  const byOrder = (n) => rc.find((r) => r.order === '#' + n);
  const cash = byOrder(tk);
  ok(!!cash && cash.line_items.length === 1 && cash.line_items[0].quantity === 2 && cash.payments[0].payment_type_id === 'pt-cash' && /Takeaway/.test(cash.note) && cash.store_id === 'st-1',
    'counter takeaway (cash) → Loyverse receipt ' + (cash ? cash.receipt_number + ': 2 × RM' + cash.line_items[0].price + ', Cash, "' + cash.note + '"' : 'missing'));
  const grab = rc.find((r) => /GrabFood/.test(r.note || ''));
  ok(!!grab && grab.payments[0].payment_type_id === 'pt-grab' && /GF-LV-1/.test(grab.note), 'GrabFood order → receipt paid by "GrabFood", note has the GrabFood number');
  if (phoneBtn) {
    const tb = byOrder(tno);
    ok(!!tb && tb.payments[0].payment_type_id === 'pt-web' && /Table 4/.test(tb.note), 'table 4 paid on the phone → receipt paid "Online", note "Table 4"');
  }
  ok(rc.every((r) => Math.abs(r.payments[0].money_amount - r.total_money) < 0.001 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(r.receipt_date)), 'every receipt: payment = total of the lines; receipt date is when it was paid');

  console.log('Loyverse down → "Not sent" → send again');
  await mock('/__down?on=1', 'POST');
  await k.goto(BASE + '/dian/#/counter');
  await k.waitForSelector('.cgrid .citem', { timeout: 20000 });
  await k.click('.counter__menu .pills .pill:has-text("Takeaway")');
  await addDish('Teh Tarik');
  await k.click('.counter__acts .btn:has-text("Pay now")');
  await k.click('.sheet .btn:has-text("Card")'); // card: sent straight away
  await k.waitForFunction((n) => { const m = document.body.textContent.match(/#(\d+) sent/); return m && +m[1] > +n; }, tk, { timeout: 15000 });
  const tk2 = (await k.textContent('body')).match(/#(\d+) sent/)[1];
  for (let i = 0; i < 30; i++) {
    await fetch(BASE + '/wp-cron.php?doing_wp_cron=' + Date.now()).catch(() => {});
    const x = await api('loyverse');
    const row = (x.recent || []).find((r) => String(r.number) === String(tk2));
    if (row && row.error) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  await k.goto(BASE + '/dian/#/loyverse');
  await k.waitForSelector('.lv__recent', { timeout: 20000 });
  const rowT = await k.textContent(`.lv__recent tr:has(b:text-is("#${tk2}"))`);
  ok(/Not sent/.test(rowT) && /503/.test(rowT), `#${tk2}: "Not sent" with the reason (Loyverse down)`);
  await mock('/__down?on=0', 'POST');
  await k.click('.btn:has-text("Send the ones not sent")');
  await k.waitForFunction((n) => { const r = [...document.querySelectorAll('.lv__recent tr')].find((x) => x.textContent.includes('#' + n)); return r && /Receipt/.test(r.textContent); }, tk2, { timeout: 20000 }).catch(() => {});
  rc = await mock('/__receipts');
  const card = byOrder(tk2);
  ok(!!card && card.payments[0].payment_type_id === 'pt-card', `sent again → receipt ${card ? card.receipt_number : '?'} (Card)`);
  ok(rc.filter((r) => r.order === '#' + tk).length === 1, 'nothing was sent twice');
  await k.screenshot({ path: process.env.SHOT || '/dev/null', fullPage: true }).catch(() => {});

  console.log('Disconnect');
  await k.click('.lv__tok .btn');
  await k.click('.sheet .btn--danger');
  await k.waitForSelector('.lvcard input[type=password]', { timeout: 15000 });
  const g3 = await api('loyverse');
  ok(!g3.connected && !g3.on, 'disconnected: the token is gone and sending is off');
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
