// 示范网站在不同时间、不同日子会不会出错（2026-11-12）：
//   把浏览器的时钟调到深夜、休息日、节日截止日前后，打开订位、点餐、节日页，检查：
//   没有程式错误、页面上没有 NaN / undefined / Invalid Date / 负数倒数、订位页一定有可以按的时段、点餐页一定有日子和时段。
// 用法：python3 -m http.server 8790 -d site/dist &   node site/tools/check-times.js http://localhost:8790
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '') + '/demo/';

// Malaysia times (UTC+8)
const TIMES = ['2026-11-12T00:20', '2026-11-12T08:00', '2026-11-12T14:45', '2026-11-12T21:50', '2026-11-12T23:58', '2026-11-15T22:40',
  '2026-11-16T12:00', '2026-12-19T23:30', '2026-12-21T10:00', '2026-12-31T23:30', '2027-01-31T20:00', '2027-02-07T11:00',
  '2027-03-04T09:00', '2027-03-12T15:00', '2027-06-01T12:00', '2027-10-25T12:00'];

const BAD_TEXT = /\bNaN\b|\bundefined\b|Invalid Date|\bnull\b|-\d+\s*(days|hours|min)/i;

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  const fail = (t, msg) => { bad++; console.log(`  ✗ ${t} ${msg}`); };
  for (const t of TIMES) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date(t + ':00+08:00'));
    let errs = [];
    p.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
    const check = async (label) => {
      const txt = await p.evaluate(() => document.body.innerText);
      const m = txt.match(BAD_TEXT);
      if (m) fail(t, `${label}: shows "${m[0]}"`);
      if (errs.length) { fail(t, `${label}: JS error ${errs[0]}`); errs = []; }
    };
    const open = async (path) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(150); };

    // Sireh & Salt: home, booking, ordering, festive
    await open('sireh-salt/index.html'); await check('sireh-salt home');
    await open('sireh-salt/book.html'); await check('sireh-salt book');
    if (!(await p.$('.slot:not([disabled])'))) fail(t, 'sireh-salt book: no time can be chosen');
    await open('sireh-salt/menu.html'); await p.click('#i-mango-snow [data-add]');
    await open('sireh-salt/order.html'); await check('sireh-salt order');
    if (!(await p.$('.day')) || !(await p.$('.slot'))) fail(t, 'sireh-salt order: no day or time to choose');
    await open('sireh-salt/festive.html'); await check('sireh-salt festive');

    // Maison Cendre
    await open('maison-cendre/index.html'); await check('maison-cendre home');
    await open('maison-cendre/book.html'); await check('maison-cendre book');
    if (!(await p.$('.slot'))) fail(t, 'maison-cendre book: no time shown');
    await open('maison-cendre/order.html'); await check('maison-cendre order');
    await open('maison-cendre/festive.html'); await check('maison-cendre festive');
    await open('maison-cendre/owner.html'); await check('maison-cendre owner');

    // Dulang & Daun
    await open('dulang-daun/index.html'); await check('dulang-daun home');
    await open('dulang-daun/shop.html'); await check('dulang-daun shop');
    await open('dulang-daun/owner.html'); await check('dulang-daun owner');

    // Butter & Lantern: the nearest festival and each one by name
    for (const f of ['', '?fest=cny', '?fest=raya', '?fest=xmas', '?fest=val']) {
      await open('butter-lantern/index.html' + f); await check('butter-lantern ' + (f || '(nearest)'));
      await open('butter-lantern/owner.html' + f); await check('butter-lantern owner ' + (f || '(nearest)'));
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${TIMES.length} times: ${bad ? bad + ' problem(s)' : 'no problems'}`);
  process.exit(bad ? 1 : 0);
})();
