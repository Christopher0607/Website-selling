// 桌上扫码点单（agency-core 1.8.0）的测试：客人扫码点单 → 厨房画面 → 做好了 → 桌子 / 结帐 → 收到钱了。
// 用法：OWNER_USER=... OWNER_PASS=... node site/tools/check-table.js https://<网店网址>
//   帐号要能用店家后台（店长或员工），网店要打开「桌上扫码点单」（设定 → 桌上扫码点单）。
//   会下 3 张测试单（桌子是最后一张桌子），最后都会结帐或取消；示范网站不会收钱。
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://preview-tbt.kedailab.test').replace(/\/$/, '');
const U = process.env.OWNER_USER, P = process.env.OWNER_PASS;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function login(browser) {
  const c = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const p = await c.newPage();
  await p.goto(BASE + '/dian/');
  await p.fill('input[name="log"]', U);
  await p.fill('input[name="pwd"]', P);
  await Promise.all([p.waitForNavigation(), p.click('button[type="submit"], input[type="submit"]')]);
  await p.waitForFunction(() => window.AGC_OWNER && document.querySelector('.main'), null, { timeout: 20000 });
  return p;
}
const api = (p, path, body) => p.evaluate(async ([path, body]) => {
  const C = window.AGC_OWNER;
  const base = C.rest.indexOf('rest_route=') !== -1 ? C.rest.replace(/\/?$/, '') + '/' : C.rest.replace(/\/?$/, '/');
  const r = await fetch(base + path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: Object.assign({ 'X-WP-Nonce': C.nonce }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
}, [path, body || null]);

async function customerOrder(browser, link, note) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(link);
  await p.waitForSelector('.tq-item');
  const simple = p.locator('.tq-item:not(.is-sold) .tq-add').first();
  await simple.click();
  await p.waitForTimeout(250);
  if (await p.locator('.tq-sheet .tq-btn').count()) await p.locator('.tq-sheet .tq-btn').click(); // the first item had options
  await p.waitForSelector('.tq-bar__btn');
  await p.click('.tq-bar__btn');
  if (note) await p.fill('.tq-sheet textarea', note);
  await p.click('.tq-sheet .tq-btn');
  await p.waitForSelector('.tq-sent', { timeout: 15000 });
  const number = (await p.textContent('.tq-sent span')).replace(/\D/g, '');
  return { c, p, number, errs };
}

(async () => {
  if (!U || !P) { console.log('设 OWNER_USER 和 OWNER_PASS'); process.exit(2); }
  const browser = await chromium.launch();
  const staff = await login(browser);
  const tb = await api(staff, 'tables');
  ok(tb.status === 200 && tb.data.tables.length > 0, `tables screen lists the tables (${tb.data && tb.data.tables ? tb.data.tables.length : 0})`);
  const T = tb.data.tables[tb.data.tables.length - 1];
  ok(/\/table\/\?t=.+&k=[0-9a-f]{10}$/.test(T.link), 'each table has its own QR link with a key');

  // a wrong key gets the "not valid" page
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    const r = await p.goto(T.link.replace(/k=[0-9a-f]+/, 'k=0000000000'));
    await p.waitForSelector('.tq-bad');
    ok(r.status() === 404 && /not valid|不能用/.test(await p.textContent('.tq-bad')), 'a QR with a wrong key does not open the menu');
    await c.close();
  }

  // the customer's page on a phone
  const first = await customerOrder(browser, T.link, 'Test order: please ignore');
  const cp = first.p;
  ok(/Table|号桌/.test(await cp.textContent('.tq-pill')) && (await cp.textContent('.tq-pill')).includes(T.table), 'the menu shows the table number');
  ok(!!first.number && first.errs.length === 0, `order sent to the kitchen (#${first.number}), no script errors`);
  ok((await overflow(cp)) <= 1, 'customer page fits the phone screen');

  // kitchen screen: the ticket arrives with the table and the items
  await staff.goto(BASE + '/dian/#/kitchen');
  const ticket = staff.locator('.kt', { hasText: '#' + first.number });
  await ticket.waitFor({ timeout: 15000 });
  ok((await ticket.textContent()).includes(T.table), 'kitchen screen shows the new order with its table');
  ok(/Test order/.test(await ticket.textContent()), 'kitchen sees the customer\'s note');
  const k = await api(staff, 'kitchen');
  const kt = k.data.todo.find((o) => String(o.number) === first.number);
  ok(!!kt && kt.items.length > 0 && !kt.done, 'kitchen API: order to make, with items');
  // the open order is not mixed into the normal order lists
  const all = await api(staff, 'orders?f=all');
  ok(!all.data.orders.some((o) => String(o.number) === first.number), 'open table orders stay out of the normal order list');
  // done
  await ticket.locator('.kt__done').click();
  await staff.waitForFunction((n) => ![...document.querySelectorAll('.kgrid .kt')].some((e) => e.textContent.includes('#' + n)), first.number, { timeout: 10000 });
  ok(await staff.locator('.tbl', { hasText: '#' + first.number }).count() > 0, 'after "Done" the order moves to "done in the last 30 minutes"');

  // the customer's phone shows "Ready" (it checks every 15 seconds)
  await cp.waitForSelector('.tq-state--ready', { timeout: 25000 }).catch(() => {});
  ok(await cp.locator('.tq-state--ready').count() > 0, 'customer sees "Ready" on their phone');

  // a second round at the same table
  await cp.click('.tq-sheet .tq-btn'); // Order more
  await cp.locator('.tq-item:not(.is-sold) .tq-add').first().click();
  await cp.waitForTimeout(250);
  if (await cp.locator('.tq-sheet .tq-btn').count()) await cp.locator('.tq-sheet .tq-btn').click();
  await cp.click('.tq-bar__btn');
  await cp.click('.tq-sheet .tq-btn');
  await cp.waitForSelector('.tq-sent');
  const second = (await cp.textContent('.tq-sent span')).replace(/\D/g, '');
  ok(await cp.locator('.tq-orders > li').count() >= 2, 'customer sees both orders of the table and what is left to pay');

  // a third order from another phone, which the staff cancels
  const third = await customerOrder(browser, T.link, '');

  // tables screen: the table has an open bill
  await staff.goto(BASE + '/dian/#/tables');
  const card = staff.locator('.tcard', { hasText: T.table }).first();
  await card.waitFor();
  const tb2 = (await api(staff, 'tables')).data.tables.find((x) => x.table === T.table);
  ok(tb2.orders.length === 3 && tb2.total > 0, `the table has 3 open orders, ${tb2.total_f} to pay`);
  ok(/tcard--busy|tcard--ready/.test(await card.getAttribute('class')), 'the table card is marked as having an open bill');
  await staff.goto(BASE + '/dian/#/table/' + encodeURIComponent(T.table));
  await staff.waitForSelector('.actbar .btn');
  // cancel the third order
  const thirdCard = staff.locator('.card', { hasText: '#' + third.number });
  await thirdCard.locator('button', { hasText: /Cancel this order|取消这一单/ }).click();
  await staff.locator('.sheet .btn--danger').click();
  await staff.waitForFunction((n) => !document.querySelector('.main').textContent.includes('#' + n + ' '), third.number, { timeout: 10000 }).catch(() => {});
  const tb3 = (await api(staff, 'tables')).data.tables.find((x) => x.table === T.table);
  ok(tb3.orders.length === 2, 'a cancelled order leaves the bill');
  // payment received (cash)
  await staff.click('.actbar .btn');
  await staff.locator('.sheet .btn', { hasText: /^(Cash|现金)$/ }).click();
  await staff.waitForFunction(() => location.hash === '#/tables', null, { timeout: 10000 });
  const tb4 = (await api(staff, 'tables')).data.tables.find((x) => x.table === T.table);
  ok(tb4.orders.length === 0, '"Payment received" closes the bill; the table is free again');
  const done = await api(staff, 'orders?f=done');
  const paid = done.data.orders.filter((o) => [first.number, second].includes(String(o.number)));
  ok(paid.length === 2 && paid.every((o) => o.paid && o.table === T.table && /Cash|现金/.test(o.pay)), 'both orders are now paid (cash) and in the "done" list with their table');

  // the customer's phone shows "Paid"
  await cp.waitForSelector('.tq-state--paid', { timeout: 25000 }).catch(() => {});
  ok(await cp.locator('.tq-state--paid').count() >= 2, 'customer sees "Paid"');
  await third.p.click('.tq-sheet .tq-x');
  await third.p.click('.tq-mine');
  await third.p.waitForSelector('.tq-state--cancelled', { timeout: 25000 }).catch(() => {});
  ok(await third.p.locator('.tq-state--cancelled').count() === 1, 'the other phone sees its order cancelled');

  // paused shop: the menu says so and nothing can be sent
  const before = (await api(staff, 'settings')).data.settings.shop_paused;
  await api(staff, 'settings', { settings: { shop_paused: true } });
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await c.newPage();
    await p.goto(T.link);
    await p.waitForSelector('.tq-item');
    ok(await p.locator('.tq-stop').count() === 1 && await p.locator('.tq-add').count() === 0, 'while orders are paused the table menu says so and has no Add buttons');
    const r = await p.evaluate(async (link) => {
      const u = new URL(link);
      const res = await fetch(window.AGC_TABLE.rest.replace(/\/?$/, '/') + 'order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: u.searchParams.get('t'), k: u.searchParams.get('k'), items: [{ id: window.AGC_TABLE.menu.items[0].id, qty: 1 }] }) });
      return res.status;
    }, T.link);
    ok(r === 409, 'the server refuses table orders while paused');
    await c.close();
  }
  await api(staff, 'settings', { settings: { shop_paused: !!+before } });

  // print the QR codes
  await staff.goto(BASE + '/dian/#/table-qr');
  await staff.waitForSelector('.qrcard svg', { timeout: 15000 });
  ok(await staff.locator('.qrcard').count() === tb.data.tables.length, 'QR sheet has one QR per table');
  // kitchen screen on a phone fits
  await staff.setViewportSize({ width: 390, height: 844 });
  await staff.goto(BASE + '/dian/#/kitchen');
  await staff.waitForSelector('.main .card, .main .kgrid');
  ok((await overflow(staff)) <= 1, 'kitchen screen fits a phone');
  await staff.goto(BASE + '/dian/#/tables');
  await staff.waitForSelector('.tgrid');
  ok((await overflow(staff)) <= 1, 'tables screen fits a phone');

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
