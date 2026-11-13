// 测试「流量」：网站的访客计数（site/assets/js/hit.js → /api/hit → site/server/traffic.mjs）和工作台的「流量」分页
// 需要：dev-server（新的资料档）+ DEV_COUNTRY=MY DEV_REGION=Selangor；密码在 DESK_TEST_KEY
// 用法：node site/tools/check-traffic.js http://localhost:8769 [截图资料夹]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8769';
const SHOTS = process.argv[3];
const KEY = process.env.DESK_TEST_KEY || 'testpass123';
const PHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

(async () => {
  // Visitors' browser: its own user agent is a normal phone's, because Chromium sends the "time on page" beacon (when a
  // page is left) with the browser's user agent, not the tab's — a headless one would be filtered as a bot.
  const b = await chromium.launch({ args: ['--user-agent=' + PHONE_UA] });
  const bh = await chromium.launch(); // as it comes: headless user agent (our own checks)
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; };
  const desk = (action, extra) => fetch(BASE + '/api/desk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-desk-key': KEY }, body: JSON.stringify({ action, ...extra }) }).then((r) => r.json());
  // a real visitor: a normal browser (automation flag hidden), outside links blocked
  const visitor = async (ua, viewport) => {
    const c = await b.newContext({ userAgent: ua, viewport });
    await c.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
    await c.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
    return c;
  };
  const settle = (ms = 700) => new Promise((r) => setTimeout(r, ms));

  console.log('Visitors');
  const before = (await desk('traffic', { days: 1 })).traffic;
  ok(before && before.visitors === 0 && before.views === 0, 'empty at the start');

  // visitor 1: phone, from Instagram, home → pricing → a demo, taps WhatsApp
  const c1 = await visitor(PHONE_UA, { width: 390, height: 844 });
  const p1 = await c1.newPage();
  await p1.goto(BASE + '/', { referer: 'https://l.instagram.com/' });
  await settle(1500);
  await p1.goto(BASE + '/pricing.html');
  await settle();
  const wa = await p1.$('a[href*="wa.me"], a[href*="instagram.com"]');
  if (wa) { await wa.evaluate((a) => { a.target = ''; }); await wa.click().catch(() => {}); await settle(); }
  await p1.goto(BASE + '/demo/maison-cendre/');
  await settle(1200);
  await p1.goto(BASE + '/start.html');
  await settle();
  await c1.close();
  // visitor 2: computer, came with ?utm_source=wa
  const c2 = await visitor(DESKTOP_UA, { width: 1280, height: 800 });
  const p2 = await c2.newPage();
  await p2.goto(BASE + '/demo/butter-lantern/?utm_source=wa');
  await settle(1200);
  await c2.close();

  console.log('Not counted');
  // automated browser as it is (navigator.webdriver = true)
  const c3 = await bh.newContext({ userAgent: PHONE_UA });
  await (await c3.newPage()).goto(BASE + '/');
  await settle();
  await c3.close();
  // headless user agent (our own checks)
  const c4 = await bh.newContext();
  await c4.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
  await (await c4.newPage()).goto(BASE + '/');
  await settle();
  await c4.close();
  // Junyu (cookie set by the desk)
  const c5 = await visitor(PHONE_UA, { width: 390, height: 844 });
  await c5.addCookies([{ name: 'cs_staff', value: '1', url: BASE }]);
  await (await c5.newPage()).goto(BASE + '/');
  await settle();
  await c5.close();
  // the desk is never counted; another site cannot send hits; bad events are ignored
  const raw = (q, h) => fetch(BASE + '/api/hit?' + q, { method: 'POST', headers: { 'User-Agent': PHONE_UA, ...(h || {}) } }).then((r) => r.status);
  const st = [await raw('e=pv&p=/desk/&v=zzz'), await raw('e=pv&p=/&v=evil', { Origin: 'https://evil.example' }), await raw('e=nope&p=/&v=zzz'), await raw('e=act&a=<script>&p=/&v=zzz')];
  ok(st.every((x) => x === 204), 'the endpoint always answers 204 (' + st.join(',') + ')');
  const staffDesk = await raw('e=pv&p=/&v=staff', { Cookie: 'cs_staff=1' });
  ok(staffDesk === 204, 'staff hit answered quietly');

  console.log('Summary');
  const t = (await desk('traffic', { days: 1 })).traffic;
  const src = Object.fromEntries(t.sources);
  const acts = Object.fromEntries(t.acts);
  ok(t.visitors === 2 && t.new_visitors === 2, `2 visitors counted, both new (${t.visitors}, ${t.new_visitors}); the automated, headless, staff, desk and other-site hits are not`);
  ok(t.views === 5, `5 page views (${t.views})`);
  ok(src.Instagram === 1 && src.WhatsApp === 1, 'sources: Instagram (referrer) and WhatsApp (?utm_source=wa): ' + JSON.stringify(t.sources));
  ok(t.demos.some((d) => /Maison Cendre/.test(d.name)) && t.demos.some((d) => /Butter & Lantern/.test(d.name)), 'demo websites listed by name');
  ok(t.pages.some((r) => r.name === '首页') && t.pages.some((r) => r.name === '价钱') && t.pages.some((r) => r.name === '免费样板申请'), 'studio pages have readable names');
  ok(!wa || acts.whatsapp === 1 || acts.instagram === 1, 'a tap on WhatsApp / Instagram is counted: ' + JSON.stringify(t.acts));
  ok(t.secs > 0 && t.avg_secs >= 0, `time on page recorded (${t.secs} s)`);
  ok(t.places.some(([k]) => k === 'MY · Selangor'), 'region shown (from Cloudflare): ' + JSON.stringify(t.places));
  ok(Object.fromEntries(t.devices).mobile === 1 && Object.fromEntries(t.devices).desktop === 1, 'devices: 1 phone, 1 computer');
  ok(t.bars.length === 24 && t.bars.reduce((a, x) => a + x.views, 0) === 5, '24 hourly bars for today');
  ok(t.recent.length === 5 && t.recent.every((r) => !('ip' in r)), 'latest page views listed (no IP)');
  const w = (await desk('traffic', { days: 7 })).traffic;
  ok(w.bars.length === 7 && w.visitors === 2, '7 days: 7 daily bars');
  const m = (await desk('traffic', { days: 30 })).traffic;
  ok(m.bars.length === 30, '30 days: 30 daily bars');
  const noKey = await fetch(BASE + '/api/desk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'traffic' }) });
  ok(noKey.status === 401, 'the numbers need the desk password (' + noKey.status + ')');

  console.log('Desk tab');
  for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
    const p = await c.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(BASE + '/desk/');
    await p.fill('#pw', KEY);
    await p.click('[data-login] button');
    await p.waitForSelector('#app:not([hidden])');
    await p.click('[data-tab="traffic"]');
    await p.waitForSelector('.tr-bars button');
    const stats = await p.$$eval('[data-traffic] .stat b', (els) => els.map((e) => e.textContent.trim()));
    ok(stats[0] === '2' && stats[1] === '5', `${name}: tiles show 2 visitors, 5 page views (${stats.join(' | ')})`);
    ok((await p.$$('.tr-bars button')).length === 24, `${name}: 24 bars for today`);
    await p.click('.tr-bars button:not([data-zero])');
    ok(/访客 2 · 浏览 5 页/.test(await p.textContent('[data-tr-read]')), `${name}: tapping a bar shows that hour`);
    ok(/Instagram/.test(await p.textContent('[data-traffic]')) && /Maison Cendre/.test(await p.textContent('[data-traffic]')), `${name}: sources and demos shown`);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(over <= 0, `${name}: nothing wider than the screen (${over}px)`);
    if (SHOTS) await p.screenshot({ path: `${SHOTS}/traffic-${name}.png`, fullPage: true });
    await p.click('[data-act="tr-days"][data-days="7"]');
    await p.waitForFunction(() => document.querySelectorAll('.tr-bars button').length === 7);
    ok(true, `${name}: 7 天 shows 7 bars`);
    ok(!errs.length, `${name}: no script errors ${errs.join(' ')}`);
    await c.close();
  }
  const after = (await desk('traffic', { days: 1 })).traffic;
  ok(after.visitors === 2, 'opening the desk adds no visitors');

  console.log('The WordPress demo shop (demo-festive, loads hit.js from our site)');
  const wpHit = (q) => fetch(BASE + '/api/hit?' + q, { method: 'POST', headers: { 'User-Agent': PHONE_UA, Origin: 'https://demo-festive.cartsmithstudio.com', 'Sec-Fetch-Site': 'same-site' } });
  await wpHit('e=pv&p=%2F&v=wpvisitor01&n=1&r=l.instagram.com');
  await wpHit('e=pv&p=%2Fproduct%2Fpineapple-tarts%2F&v=wpvisitor01&r=demo-festive.cartsmithstudio.com');
  await wpHit('e=pv&p=%2Fdian%2F&v=wpvisitor01');
  const wp = (await desk('traffic', { days: 1 })).traffic;
  ok(wp.visitors === 3 && wp.views === 7, `counted as our site too: 3 visitors, 7 page views (${wp.visitors}, ${wp.views}); the shop dashboard /dian/ is not`);
  ok(wp.demos.some((d) => /demo-festive/.test(d.name) && d.views === 2) && wp.pages.some((r) => r.name === '真网店示范 demo-festive：首页'), 'listed as the real demo shop');
  ok(wp.recent[0].src === '站内点进来' && wp.recent[1].src === 'Instagram', 'a click inside the shop shows as 站内, the first view keeps where they came from');

  await b.close();
  await bh.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
