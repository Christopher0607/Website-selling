#!/usr/bin/env node
// 找客户机器人 find-leads.mjs (2026-11-24, Junyu: "every day new shops in the desk, also after my Claude quota is used up")
//
// Runs every morning in GitHub Actions (.github/workflows/find-leads.yml), no Claude needed:
//   1. web search (Exa, Tavily, Serper or Brave: whichever key is set) for public articles that list small Malaysian
//      bakers / festive cookie, kuih, cake and gift sellers ("CNY cookies Penang order WhatsApp" ...), by season
//   2. reads each new article (public page, no login; Instagram / Facebook / Shopee pages are never opened)
//   3. DeepSeek pulls out the shops; a shop is kept only if its mobile number is written on that page
//      (so an AI mistake cannot invent a number), it is not a hotel or a chain, not already in the inbox,
//      and it has no website of its own (.com / .com.my / .my tried, like scripts/local/check-domains.sh)
//   4. writes sales/leads/<date>-robot.json in the inbox format (sales/leads/README.md); the workflow then rebuilds
//      inbox.json and pushes the leads branch, so the shops are in the desk inbox within 5 minutes
// It never sends anything: Junyu still adds the shops and sends every message himself.
//
// usage: node scripts/robot/find-leads.mjs [--leads-dir sales/leads] [--date YYYY-MM-DD] [--dry]
// env:   DEEPSEEK_API_KEY (required), one of EXA_API_KEY / TAVILY_API_KEY / SERPER_API_KEY / BRAVE_API_KEY,
//        ROBOT_MAX_LEADS (100), ROBOT_MAX_QUERIES (40), ROBOT_MAX_PAGES (60), DEEPSEEK_MODEL, DEEPSEEK_BASE_URL;
//        for tests: EXA_BASE / TAVILY_BASE / SERPER_BASE / BRAVE_BASE, ROBOT_DOMAIN_BASE (fetch <base><domain> instead of https://<domain>)
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const E = process.env;
const LEADS = arg('--leads-dir', 'sales/leads');
const TODAY = arg('--date', new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10));
const DRY = argv.includes('--dry');
const MAX_LEADS = +E.ROBOT_MAX_LEADS || 100;
const MAX_QUERIES = +E.ROBOT_MAX_QUERIES || 40;
const MAX_PAGES = +E.ROBOT_MAX_PAGES || 60;
const UA = 'Mozilla/5.0 (compatible; CartsmithLeadBot/1.0; +https://cartsmithstudio.com/)';
const log = (...a) => console.log(...a);

// ---------------------------------------------------------------- what to search for, by season (Malaysia)
const PLACES = ['Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya', 'Shah Alam', 'Cheras', 'Puchong', 'Klang', 'Kajang', 'Seremban', 'Melaka',
  'Ipoh', 'Penang', 'Johor Bahru', 'Kuching', 'Kota Kinabalu', 'Kuantan', 'Alor Setar', 'Miri', 'Sibu', 'Batu Pahat', 'Bangsar', 'Setapak'];
function topics(month) {
  const t = ['home baker', 'custom cakes home baker', 'burnt cheesecake home baker', 'brownies cookies home baker', 'bakery small business', 'kek lapis'];
  if (month >= 10 || month <= 2) t.push('CNY cookies', 'pineapple tarts', 'kuih kapit love letters', 'kuih bangkit', 'Chinese New Year cookies gift box', 'CNY goodies home baker');
  if (month <= 4) t.push('kuih raya', 'biskut raya', 'tart nenas', 'Hari Raya cookies');
  if (month >= 6 && month <= 9) t.push('mooncake home baker', 'snowskin mooncake');
  if (month >= 8 && month <= 10) t.push('Deepavali cookies murukku');
  if (month >= 9 && month <= 12) t.push('Christmas cookies', 'log cake Christmas');
  return t;
}
function allQueries(date) {
  const [y, m] = date.split('-').map(Number);
  const years = m >= 10 ? [y, y + 1] : [y, y - 1];
  const q = [];
  for (const t of topics(m)) {
    q.push(`best ${t} Malaysia ${years[0]}`, `${t} Malaysia ${years[1]} order WhatsApp`, `${t} small business Malaysia list`);
    for (const p of PLACES) q.push(`${t} ${p} order WhatsApp`);
  }
  return [...new Set(q)];
}
// same order every day for the same date, different every day
function shuffle(list, seed) {
  let s = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------- search providers (whichever key is set)
const PROVIDERS = [
  ['exa', 'EXA_API_KEY', async (q, key) => {
    const r = await post((E.EXA_BASE || 'https://api.exa.ai') + '/search', { query: q, numResults: 10, type: 'auto' }, { 'x-api-key': key });
    return (r.results || []).map((x) => ({ url: x.url, title: x.title || '' }));
  }],
  ['tavily', 'TAVILY_API_KEY', async (q, key) => {
    const r = await post((E.TAVILY_BASE || 'https://api.tavily.com') + '/search', { query: q, max_results: 10, search_depth: 'basic', country: 'malaysia' }, { Authorization: 'Bearer ' + key });
    return (r.results || []).map((x) => ({ url: x.url, title: x.title || '' }));
  }],
  ['serper', 'SERPER_API_KEY', async (q, key) => {
    const r = await post((E.SERPER_BASE || 'https://google.serper.dev') + '/search', { q, gl: 'my', num: 10 }, { 'X-API-KEY': key });
    return (r.organic || []).map((x) => ({ url: x.link, title: x.title || '' }));
  }],
  ['brave', 'BRAVE_API_KEY', async (q, key) => {
    const u = (E.BRAVE_BASE || 'https://api.search.brave.com') + '/res/v1/web/search?count=10&country=MY&q=' + encodeURIComponent(q);
    const res = await fetch(u, { headers: { 'X-Subscription-Token': key, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error('brave ' + res.status);
    const r = await res.json();
    return ((r.web && r.web.results) || []).map((x) => ({ url: x.url, title: x.title || '' }));
  }],
];
async function post(url, body, headers) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(url.split('/')[2] + ' ' + res.status + ' ' + (await res.text()).slice(0, 160));
  return res.json();
}
// pages we never open: social networks and marketplaces (their terms), delivery apps, video, and Singapore-only guides
const SKIP_HOST = /(^|\.)(instagram|facebook|fb|tiktok|youtube|twitter|x|threads|shopee|lazada|grab|foodpanda|carousell|mudah|pinterest|lemon8-app|reddit|wikipedia|linkedin)\.|\.sg$|honeycombers|eatbook|sethlui\.com\/.*singapore|timeout\.com\/singapore|hungrygowhere/i;

// ---------------------------------------------------------------- page text
function pageText(html) {
  let h = html.replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, ' ');
  // keep the numbers and handles that only live in links (wa.me/60123..., instagram.com/handle)
  h = h.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, inner) => {
    const keep = /wa\.me|whatsapp|instagram\.com|tel:/i.test(href) ? ` [${href}] ` : '';
    return inner + keep;
  });
  return h.replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#8217;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ' ')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
async function getPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  if (!/html/i.test(res.headers.get('content-type') || 'text/html')) throw new Error('not a web page');
  const html = (await res.text()).slice(0, 1_500_000);
  const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  const date = (html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/) || html.match(/article:published_time"\s+content="(\d{4}-\d{2}-\d{2})/) || [])[1] || '';
  return { title, date, text: pageText(html) };
}

// ---------------------------------------------------------------- DeepSeek: pull the shops out of one article
const SYSTEM = `You read a web article and list the small Malaysian food businesses it recommends that sell baked goods, festive cookies, kuih, cakes, desserts or food gift boxes.
Rules: copy names, Instagram handles and phone numbers EXACTLY as written in the article (a number may also appear inside a [https://wa.me/60...] link); never guess or complete a number; leave a field empty when the article does not say it.
Skip businesses in Singapore or outside Malaysia, hotels, restaurant groups, supermarkets, big brands and chains with 5 or more outlets.
Answer with ONE json object only: {"article_title":"","article_year":"","malaysia":true,"businesses":[{"name":"","instagram":"","whatsapp":"","phone":"","email":"","website":"","area":"","address":"","sells":"","price":"","notes":"","language":"zh | en | ms","hotel_or_chain":false}]}
"language": zh for Chinese-run shops (Chinese names, CNY bakers), ms for Malay-run shops (Malay names, kuih raya, kek lapis), otherwise en. "notes": years in business, awards, outlets, anything that shows they do well (short). "website": a website or online shop the article gives for this business (own domain, Shopify, EasyStore, StoreHub, Beepit, Oddle and the like), else empty.`;
async function extract(url, page) {
  const key = E.DEEPSEEK_API_KEY;
  const base = (E.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  const task = `URL: ${url}\nTitle: ${page.title}\nPublished: ${page.date || 'unknown'}\n\nArticle text:\n${page.text.slice(0, 18000)}`;
  for (let i = 0; i < 2; i++) {
    const res = await fetch(base + '/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(90000),
      body: JSON.stringify({ model: E.DEEPSEEK_MODEL || 'deepseek-flash', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: task }],
        response_format: { type: 'json_object' }, thinking: { type: 'disabled' }, temperature: 0.1, max_tokens: 6000 }),
    });
    if (res.status === 401 || res.status === 402) throw Object.assign(new Error(res.status === 402 ? 'DeepSeek balance is empty' : 'DeepSeek key is wrong'), { fatal: true });
    if (!res.ok) continue;
    const data = await res.json();
    const m = (((data.choices || [])[0] || {}).message || {}).content || '';
    try { return JSON.parse(m.match(/\{[\s\S]*\}/)[0]); } catch { /* try again */ }
  }
  return null;
}

// ---------------------------------------------------------------- checks
const digits = (s) => String(s || '').replace(/\D/g, '');
function mobile(s) { // Malaysian mobile in 01x form, or ''
  let d = digits(s);
  if (d.startsWith('60')) d = '0' + d.slice(2);
  return /^01\d{8,9}$/.test(d) ? d : '';
}
const fmtMobile = (d) => d.slice(0, 3) + '-' + d.slice(3, d.length - 4) + ' ' + d.slice(-4);
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const handle = (s) => String(s || '').trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').toLowerCase();
const OWN_SITE_OK = /facebook|instagram|linktr|wa\.me|whatsapp|carrd|heylink|blogspot|wixsite|shopee|lazada|tiktok|google\.com\/forms|forms\.gle|jotform/i;
function slugsOf(b) {
  const n = b.name.toLowerCase().replace(/\(.*?\)/g, '').replace(/&/g, 'and');
  const s = new Set([n.replace(/[^a-z0-9]/g, ''), n.replace(/\b(and|the)\b/g, '').replace(/[^a-z0-9]/g, ''), handle(b.instagram).replace(/[^a-z0-9]/g, '')]);
  return [...s].filter((x) => x.length >= 4).slice(0, 3);
}
async function probe(domain) {
  const url = E.ROBOT_DOMAIN_BASE ? E.ROBOT_DOMAIN_BASE + domain : 'https://' + domain;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const body = (await res.text()).slice(0, 60000); const low = body.toLowerCase();
    if (/\/lander|for sale|parked|domain is for sale|coming soon|under construction|website expired|site not found|just a moment/.test(res.url + ' ' + low)) return null;
    return { domain, title: ((body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim().slice(0, 80) };
  } catch { return null; }
}
async function websiteOf(b) { // {own: true} when a domain clearly belongs to them; {maybe} when a same-name domain is up
  // theirs = the page title has their whole name (or their Instagram handle); one shared word ("Beta Engineering") is not enough
  const marks = [norm(b.name.replace(/\(.*?\)/g, '')), norm(handle(b.instagram))].filter((x) => x.length >= 5);
  const found = (await Promise.all(slugsOf(b).flatMap((s) => ['com', 'com.my', 'my'].map((t) => probe(s + '.' + t))))).filter(Boolean);
  const own = found.find((f) => marks.some((m) => norm(f.title).includes(m)));
  return own ? { own } : found.length ? { maybe: found[0] } : {};
}

// ---------------------------------------------------------------- what we already know
function known(dir) {
  const k = { names: new Set(), igs: new Set(), was: new Set(), ids: new Set() };
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!f.endsWith('.json') || f === 'robot-state.json') continue;
    let d; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    for (const l of d.leads || []) {
      k.ids.add(l.id); k.names.add(norm(l.name));
      if (l.instagram) k.igs.add(handle(l.instagram));
      for (const n of [l.whatsapp, l.phone]) if (digits(n).length >= 9) k.was.add(digits(n).slice(-9));
    }
  }
  return k;
}
const isKnown = (k, b) => k.names.has(norm(b.name)) || (b.instagram && k.igs.has(handle(b.instagram))) || k.was.has(digits(b.whatsapp).slice(-9));

// ---------------------------------------------------------------- main
async function main() {
  const provider = PROVIDERS.find(([, k]) => E[k]);
  if (!E.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not set (GitHub: Settings → Secrets and variables → Actions)');
  if (!provider) throw new Error('No search key: set one of EXA_API_KEY, TAVILY_API_KEY, SERPER_API_KEY, BRAVE_API_KEY');
  const [pname, pkey, search] = provider;
  const statePath = path.join(LEADS, 'robot-state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { queries: {}, urls: {} };
  const ago = (d, days) => d && (Date.parse(TODAY) - Date.parse(d)) / 86400e3 < days;
  const kn = known(LEADS);
  const outPath = path.join(LEADS, `${TODAY}-robot.json`);
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : null;
  const leads = prev ? prev.leads : [];
  const sources = new Set(prev ? (prev.sources || []) : []);
  const stats = { queries: 0, results: 0, pages: 0, pageErrors: 0, found: 0, noMobile: 0, notOnPage: 0, chain: 0, known: 0, ownSite: 0, kept: 0 };

  const queries = shuffle(allQueries(TODAY), TODAY).filter((q) => !ago(state.queries[q], 45)).slice(0, MAX_QUERIES);
  const urls = [];
  for (const q of queries) {
    if (urls.length >= MAX_PAGES * 2) break;
    stats.queries++; state.queries[q] = TODAY;
    let res = [];
    try { res = await search(q, E[pkey]); } catch (e) { log('search failed:', q, '-', e.message); if (/401|403|429/.test(e.message)) break; continue; }
    for (const r of res) {
      stats.results++;
      let host = ''; try { host = new URL(r.url).hostname; } catch { continue; }
      if (SKIP_HOST.test(host + new URL(r.url).pathname) || state.urls[r.url] || urls.includes(r.url)) continue;
      urls.push(r.url);
    }
  }
  log(`${pname}: ${stats.queries} searches, ${urls.length} new pages`);

  // three pages at a time (each page: read it, ask DeepSeek, check the shops' websites)
  let next = 0, fatal = null;
  async function worker() {
    while (!fatal && next < urls.length && stats.pages < MAX_PAGES && leads.length < MAX_LEADS) {
      const url = urls[next++];
      try { await handlePage(url); } catch (e) { if (e.fatal) fatal = e; }
    }
  }
  async function handlePage(url) {
    state.urls[url] = TODAY;
    let page;
    try { page = await getPage(url); } catch (e) { stats.pageErrors++; return; }
    if (page.text.length < 400) return;
    stats.pages++;
    const out = await extract(url, page);
    if (!out || out.malaysia === false || !Array.isArray(out.businesses)) return;
    const pageDigits = digits(page.text);
    const pageLow = page.text.toLowerCase();
    const year = String(out.article_year || page.date || '').slice(0, 4);
    const srcName = `${(out.article_title || page.title || new URL(url).hostname).slice(0, 90)}${year ? `（${year}）` : ''}`;
    for (const b0 of out.businesses) {
      if (leads.length >= MAX_LEADS) break;
      const b = { ...b0, name: String(b0.name || '').trim().slice(0, 80) };
      if (!b.name) continue;
      stats.found++;
      const m = mobile(b.whatsapp) || mobile(b.phone);
      if (!m) { stats.noMobile++; continue; }
      // the number has to be on the page (local or +60 form); an Instagram handle we keep only if it is on the page too
      if (!pageDigits.includes(m) && !pageDigits.includes('6' + m)) { stats.notOnPage++; continue; }
      b.whatsapp = fmtMobile(m);
      b.instagram = handle(b.instagram);
      if (b.instagram && !pageLow.includes(b.instagram)) b.instagram = '';
      if (b.hotel_or_chain) { stats.chain++; continue; }
      if (isKnown(kn, b) || leads.some((l) => digits(l.whatsapp).slice(-9) === m.slice(-9))) { stats.known++; continue; }
      if (b.website && !OWN_SITE_OK.test(b.website)) { stats.ownSite++; continue; }
      const site = await websiteOf(b);
      if (site.own) { stats.ownSite++; continue; }
      const id = `r${TODAY.replace(/-/g, '')}-${norm(b.name).slice(0, 30) || m.slice(-6)}`;
      // checked again after the wait: another page may have added the same shop meanwhile
      if (kn.ids.has(id) || leads.some((l) => l.id === id || digits(l.whatsapp).slice(-9) === m.slice(-9))) { stats.known++; continue; }
      if (leads.length >= MAX_LEADS) break;
      const lang = ['zh', 'en', 'ms'].includes(b.language) ? b.language : 'en';
      const old = year && +year <= TODAY.slice(0, 4) - 3;
      const verify = [
        year ? `资料来自 ${year} 年的文章${old ? '（比较旧）' : ''}：发之前先看 IG / Facebook 最近半年还有没有在卖、号码有没有换` : '文章日期不明：发之前先看 IG / Facebook 最近有没有在卖',
        site.maybe ? `同名网域 ${site.maybe.domain} 打得开（标题「${site.maybe.title}」），看一下是不是他们的；是的话就不要发` : '',
        '机器人自动找的：名字、号码、卖什么都是从文章抄来的，发之前看一眼文章',
      ].filter(Boolean).join('；');
      leads.push({
        id, name: b.name, instagram: b.instagram, whatsapp: b.whatsapp, phone: '', area: String(b.area || '').slice(0, 60) || '马来西亚',
        address: String(b.address || '').slice(0, 200) || `网上接单 / 在家做 · ${String(b.area || '马来西亚').slice(0, 40)}`, email: String(b.email || '').slice(0, 80),
        contact_source: `${srcName} ${url}`.slice(0, 300), store_url: '', language: lang, template: 'chili-pantry', priority: 'B',
        why: `${String(b.sells || '饼家 / 甜点').slice(0, 90)}；${srcName} 列出订购号码，没有找到自己的网站（机器人 ${TODAY}）`,
        verify,
        input: [`${b.name}. Sells: ${b.sells || 'not stated'}.`, b.price ? `Price: ${b.price}.` : '', `Area: ${b.area || 'not stated'}.`, b.address ? `Address: ${b.address}.` : '',
          b.notes ? `Notes: ${b.notes}.` : '', `Source: ${srcName} ${url} lists the number ${b.whatsapp}${b.instagram ? `; Instagram @${b.instagram}` : ''}.`,
          `Website check ${TODAY} (${slugsOf(b).join(' ')} .com/.com.my/.my): ${site.maybe ? `a same-name domain ${site.maybe.domain} is up (title "${site.maybe.title}"), maybe not theirs` : 'no own website found'}.`,
          old ? 'The article is a few years old: they may have changed the number or stopped.' : '',
          'Found automatically by the lead robot; check the article before sending.',
          'Angle: festive pre-order shop (RM399, live in 3 working days; first 3 shops pay only after their first online order), or the RM800 starter website. Demo: Butter & Lantern ?fest=cny (?fest=raya for Malay bakers).'].filter(Boolean).join(' ').slice(0, 2900),
      });
      sources.add(url);
      stats.kept++;
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  if (fatal) throw fatal;

  // forget pages and searches after a year so the state file stays small
  for (const k of ['queries', 'urls']) for (const [x, d] of Object.entries(state[k])) if (!ago(d, 365)) delete state[k][x];
  const doc = { batch: `${TODAY} 找客户机器人 · ${leads.length} 家（自动找的，发之前看一眼来源）`, source: `机器人：${pname} 搜索公开文章 + DeepSeek 整理；号码一定出现在文章里；查过 .com / .com.my / .my 没有自己的网站`, sources: [...sources], leads };
  if (!DRY) {
    if (leads.length) fs.writeFileSync(outPath, JSON.stringify(doc, null, 1) + '\n');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
  }
  const line = `${TODAY}: ${stats.kept} new shops (${leads.length} in today's file) · ${stats.queries} searches · ${stats.pages} pages read (${stats.pageErrors} could not open) · ${stats.found} shops in the articles: ${stats.noMobile} no mobile, ${stats.notOnPage} number not on the page, ${stats.chain} hotel/chain, ${stats.known} already known, ${stats.ownSite} own website`;
  log(line);
  if (E.GITHUB_STEP_SUMMARY) fs.appendFileSync(E.GITHUB_STEP_SUMMARY, `### 找客户机器人\n\n${line}\n`);
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `kept=${stats.kept}\n`);
  return stats;
}

main().catch((e) => { console.error('robot stopped:', e.message); process.exit(1); });
