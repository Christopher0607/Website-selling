// Website visitors for the desk's 流量 tab (2026-11-13, Junyu: "我也要一个可以看别人看我们网站的监控面板").
//
// /api/hit — beacons from site/assets/js/hit.js (every studio page and demo on cartsmithstudio.com, and the real
// festive shop on demo-festive.cartsmithstudio.com through agency-core). Not on the desk or the customers' mockups
// (those have their own tracker, /api/track). What one row holds:
//   t time · e event (pv = page shown, t = seconds the page was on screen, act = WhatsApp / email / Instagram / phone
//   link or a form) · h site (blank = cartsmithstudio.com) · p path · r the site the visitor came from (host only) ·
//   s utm_source / ?ref= · v a random id kept in that browser (to count visitors) · n 1 = first visit from that browser ·
//   k device kind · app in-app browser (Instagram, Facebook, TikTok…) · c country and g region (Cloudflare's guess) ·
//   a which action · sec seconds.
// Never stored: IP address, the full user agent, cookies, names or anything typed. Not counted: Junyu's own browsers
// (cookie cs_staff, set when he opens the desk), automated browsers and link-preview bots.
// Rows older than 120 days are deleted when the desk opens the tab.

export const BOT_UA = /Headless|bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|WhatsApp|Telegram|Slack|Discord|Twitterbot|LinkedIn|curl|wget|python|node-fetch|undici|axios|Playwright|Puppeteer|Lighthouse|PageSpeed/i;
export const deviceKind = (ua) => (/iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop');
export const isStaff = (req) => /(?:^|;\s*)cs_staff=1(?:;|$)/.test(req.headers.get('cookie') || '');

const SITE = 'cartsmithstudio.com';
const KEEP_DAYS = 120;
const ACTS = /^(whatsapp|email|instagram|phone|chat|form:[\w-]{1,40})$/;
const appOf = (ua) => (/Instagram/i.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'facebook' : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? 'tiktok'
  : /MicroMessenger/i.test(ua) ? 'wechat' : /\bLine\//i.test(ua) ? 'line' : '');
const hits = new Map(); // ip → recent times (per Worker instance; a light brake, not a wall)

export async function handleHit(req, plat) {
  const done = new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  if (req.method !== 'POST' && req.method !== 'GET') return new Response(null, { status: 405 });
  const ua = req.headers.get('user-agent') || '';
  if (!ua || BOT_UA.test(ua) || isStaff(req)) return done;
  const url = new URL(req.url);
  // only from our own pages: same host, or one of our subdomains (the WordPress demo shop)
  const origin = req.headers.get('origin');
  let from = '';
  if (origin && origin !== 'null') {
    let oh = '';
    try { oh = new URL(origin).host; } catch (e) { return done; }
    if (oh !== url.host && !oh.endsWith('.' + SITE)) return done;
    if (oh !== url.host) from = oh;
  }
  const site = req.headers.get('sec-fetch-site');
  if (site && !['same-origin', 'same-site'].includes(site)) return done;
  const now = Date.now();
  const ip = plat.ip || 'local';
  const recent = (hits.get(ip) || []).filter((x) => now - x < 600e3);
  if (recent.length >= 300) return done;
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  const q = url.searchParams;
  const e = String(q.get('e') || '');
  if (!['pv', 't', 'act'].includes(e)) return done;
  let p = String(q.get('p') || '/').split('?')[0].split('#')[0].slice(0, 160);
  if (!p.startsWith('/') || /^\/(desk|api|wp-admin|wp-login|dian|owner)\b/.test(p)) return done;
  p = p.replace(/[^\w./%~-]/g, '').replace(/\/index\.html$/, '/').replace(/\.html$/, '') || '/';
  const row = {
    t: now, e, h: from.replace('.' + SITE, '').slice(0, 40), p,
    r: '', s: '', v: String(q.get('v') || '').replace(/[^a-z0-9]/gi, '').slice(0, 12),
    n: q.get('n') === '1' ? 1 : 0, k: deviceKind(ua), app: appOf(ua),
    c: String(plat.country || '').replace(/[^A-Z]/g, '').slice(0, 2), g: String(plat.region || '').replace(/[^\p{L}\p{N} .'-]/gu, '').slice(0, 40),
    a: '', sec: 0,
  };
  if (e === 'pv') {
    const r = String(q.get('r') || '').toLowerCase().replace(/^www\./, '');
    row.r = r === '-' || r === url.host || r === SITE || (from && r === from) ? '-' : /^[a-z0-9.-]{3,80}$/.test(r) ? r : ''; // '-' = from another page of the same site
    row.s = String(q.get('s') || '').toLowerCase().replace(/[^\w.-]/g, '').slice(0, 30);
  } else if (e === 't') {
    row.sec = Math.max(0, Math.min(1800, parseInt(q.get('sec'), 10) || 0));
    if (!row.sec) return done;
  } else {
    row.a = String(q.get('a') || '');
    if (!ACTS.test(row.a)) return done;
  }
  try { await plat.store.hitAdd(row); } catch (err) { console.error('hit', err.message); }
  return done;
}

// ------------------------------------------------------------------ the desk's summary
const MY = 8 * 3600e3; // Malaysia time
const myDay = (t) => new Date(t + MY).toISOString().slice(0, 10);
const myHour = (t) => new Date(t + MY).getUTCHours();
const DEMOS = { 'maison-cendre': 'Maison Cendre（精品餐厅）', 'sireh-salt': 'Sireh & Salt（一般餐厅）', 'dulang-daun': 'Dulang & Daun（食品礼盒网店）', 'butter-lantern': 'Butter & Lantern（节日预购 RM399）' };
const PAGES = { '/': '首页', '/pricing': '价钱', '/templates': '6 个商店模板', '/start': '免费样板申请', '/faq': '常见问题', '/process': '合作流程', '/why-us': '为什么选我们', '/privacy': '隐私通知', '/thanks': '申请送出（谢谢页）', '/shopee-fee-calculator': 'Shopee 费用计算器', '/404': '找不到页面' };
export function pageName(h, p) {
  if (h === 'demo-festive') return '真网店示范 demo-festive' + (p === '/' ? '：首页' : '：' + decodeURIComponentSafe(p));
  if (h) return h + p;
  const m = p.match(/^\/demo\/([\w-]+)\/?(.*)$/);
  if (m) {
    const sub = m[2].replace(/\/$/, '');
    return '示范：' + (DEMOS[m[1]] || m[1]) + (sub && sub !== 'index' ? ' · ' + sub : '');
  }
  return PAGES[p.replace(/\/$/, '') || '/'] || p;
}
function decodeURIComponentSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }
const demoOf = (h, p) => (h === 'demo-festive' ? 'demo-festive' : ((p.match(/^\/demo\/([\w-]+)/) || [])[1] || ''));
export function sourceOf(row) {
  const s = row.s;
  if (s) return /^(ig|insta)/.test(s) ? 'Instagram' : /^(wa|whatsapp)/.test(s) ? 'WhatsApp' : /^(fb|facebook)/.test(s) ? 'Facebook' : /^(tt|tiktok)/.test(s) ? 'TikTok' : s;
  const r = row.r;
  if (r === '-') return '站内点进来';
  if (r) {
    if (/(^|\.)instagram\.com$/.test(r)) return 'Instagram';
    if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(r)) return 'Facebook';
    if (/(^|\.)google\.[a-z.]+$/.test(r)) return 'Google';
    if (/(^|\.)bing\.com$/.test(r)) return 'Bing';
    if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(r)) return 'WhatsApp';
    if (/(^|\.)(tiktok\.com)$/.test(r)) return 'TikTok';
    if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(r)) return 'X';
    if (/^previews\.cartsmithstudio\.com$/.test(r)) return '客户样板';
    if (/\.cartsmithstudio\.com$/.test(r)) return '真网店示范';
    return r;
  }
  if (row.app) return { instagram: 'Instagram（App 里打开）', facebook: 'Facebook（App 里打开）', tiktok: 'TikTok（App 里打开）', wechat: '微信（App 里打开）', line: 'LINE（App 里打开）' }[row.app] || row.app;
  return '直接打开 / 聊天软件的连结';
}
const top = (m, n = 10) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);
const inc = (m, k, by = 1) => { m[k] = (m[k] || 0) + by; };

export async function trafficSummary(store, days, nowMs = Date.now()) {
  days = [1, 7, 30].includes(days) ? days : 7;
  const todayStart = Date.parse(myDay(nowMs) + 'T00:00:00Z') - MY;
  const since = todayStart - (days - 1) * 86400e3;
  try { await store.hitsPrune(nowMs - KEEP_DAYS * 86400e3); } catch (e) { console.error('hits prune', e.message); }
  const rows = await store.hitsSince(Math.min(since, nowMs - 15 * 60e3), 60000);
  const inRange = rows.filter((r) => r.t >= since);
  const pvs = inRange.filter((r) => r.e === 'pv');
  const vid = (r) => r.v || 'x' + r.t;
  const visitors = new Set(pvs.map(vid));
  const newVisitors = new Set(pvs.filter((r) => r.n).map(vid));
  const secs = inRange.filter((r) => r.e === 't').reduce((a, r) => a + (r.sec || 0), 0);
  // bars: hours for "today", days otherwise
  const buckets = [];
  if (days === 1) for (let h = 0; h < 24; h++) buckets.push({ key: h, label: String(h).padStart(2, '0') + ':00', v: new Set(), pv: 0 });
  else for (let i = days - 1; i >= 0; i--) { const d = myDay(nowMs - i * 86400e3); buckets.push({ key: d, label: d.slice(5), v: new Set(), pv: 0 }); }
  const bIdx = new Map(buckets.map((b, i) => [b.key, i]));
  const pages = {}; const pageV = {}; const sources = {}; const devices = {}; const places = {}; const acts = {}; const demos = {}; const demoV = {};
  const pageSecs = {};
  for (const r of pvs) {
    const b = buckets[bIdx.get(days === 1 ? myHour(r.t) : myDay(r.t))];
    if (b) { b.pv++; b.v.add(vid(r)); }
    const name = pageName(r.h, r.p);
    inc(pages, name); (pageV[name] = pageV[name] || new Set()).add(vid(r));
    const d = demoOf(r.h, r.p);
    if (d) { inc(demos, d); (demoV[d] = demoV[d] || new Set()).add(vid(r)); }
  }
  // per visitor (first page view in range): where from, device, place
  const firstOf = new Map();
  for (const r of pvs) if (!firstOf.has(vid(r))) firstOf.set(vid(r), r);
  for (const r of firstOf.values()) {
    inc(sources, sourceOf(r)); inc(devices, r.k || 'desktop');
    inc(places, r.c ? (r.c === 'MY' && r.g ? 'MY · ' + r.g : r.c) : '不明');
  }
  for (const r of inRange) {
    if (r.e === 'act') inc(acts, (r.h ? 'demo-festive ' : /^\/demo\//.test(r.p) ? 'demo ' : '') + r.a);
    if (r.e === 't') inc(pageSecs, pageName(r.h, r.p), r.sec || 0);
  }
  const online = new Set(rows.filter((r) => r.t >= nowMs - 5 * 60e3).map(vid));
  const recent = rows.filter((r) => r.e === 'pv').slice(-40).reverse().map((r) => ({
    t: r.t, page: pageName(r.h, r.p), src: sourceOf(r), k: r.k, place: r.c ? (r.c === 'MY' && r.g ? r.g : r.c) : '', v: (r.v || '').slice(0, 4), first: !!r.n,
  }));
  return {
    days, since, now: nowMs,
    visitors: visitors.size, new_visitors: newVisitors.size, returning: [...visitors].filter((v) => !newVisitors.has(v)).length,
    views: pvs.length, secs, avg_secs: pvs.length ? Math.round(secs / pvs.length) : 0, online: online.size,
    bars: buckets.map((b) => ({ label: b.label, visitors: b.v.size, views: b.pv })),
    pages: top(pages, 12).map(([name, n]) => ({ name, views: n, visitors: pageV[name].size, avg_secs: Math.round((pageSecs[name] || 0) / n) })),
    sources: top(sources, 10), devices: top(devices, 3), places: top(places, 10), acts: top(acts, 12),
    demos: top(demos, 10).map(([d, n]) => ({ name: d === 'demo-festive' ? '真网店示范 demo-festive（WordPress）' : (DEMOS[d] || d), views: n, visitors: demoV[d].size })),
    recent,
  };
}
