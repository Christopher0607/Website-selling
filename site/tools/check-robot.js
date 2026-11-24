// Test the lead robot (scripts/robot/find-leads.mjs) with a fake search API, fake articles, fake DeepSeek and fake domains.
// usage: node site/tools/check-robot.js     (no keys, no network)
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PORT = 9940, B = `http://localhost:${PORT}`;
let fail = 0;
const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; };
const hits = [];

const PAGE_A = `<html><head><title>10 home bakers for CNY cookies</title><script type="application/ld+json">{"datePublished":"2025-01-10T08:00:00"}</script></head><body>
<h2>1. Alpha Bakes</h2><p>Pineapple tarts and peanut cookies. WhatsApp 012-345 6789 or DM <a href="https://instagram.com/alphabakes">@alphabakes</a>. Based in Cheras.</p>
<h2>2. Beta Kuih</h2><p>Kuih kapit and kuih bangkit. <a href="https://wa.me/60198765432">Order here</a></p>
<h2>3. Gamma Hotel</h2><p>Hotel cookie hampers. Call 012-555 0000.</p>
<h2>4. Delta Cakes</h2><p>Custom cakes. WhatsApp 016-222 3333.</p>
<h2>5. Known Shop</h2><p>Butter cookies. WhatsApp 017-444 5555.</p>
${'<p>More words about cookies and the new year so the page is long enough.</p>'.repeat(10)}</body></html>`;
const PAGE_B = `<html><head><title>Kuih raya sellers</title></head><body><h2>Epsilon Tarts</h2><p>Tart nenas, WhatsApp +6017-111 2222, Shah Alam.</p>
${'<p>Raya cookies and more text for length.</p>'.repeat(15)}</body></html>`;

const AI = {
  [`${B}/page/a`]: { article_title: '10 home bakers for CNY cookies', article_year: '2025', malaysia: true, businesses: [
    { name: 'Alpha Bakes', instagram: '@alphabakes', whatsapp: '012-345 6789', area: 'Cheras', sells: 'Pineapple tarts, peanut cookies', language: 'zh', hotel_or_chain: false },
    { name: 'Beta Kuih', whatsapp: '60198765432', sells: 'Kuih kapit, kuih bangkit', language: 'zh', hotel_or_chain: false },
    { name: 'Gamma Hotel', phone: '012-555 0000', sells: 'Cookie hampers', hotel_or_chain: true },
    { name: 'Delta Cakes', whatsapp: '016-222 3333', sells: 'Custom cakes', language: 'en', hotel_or_chain: false },
    { name: 'Known Shop', whatsapp: '017-444 5555', sells: 'Butter cookies', hotel_or_chain: false },
    { name: 'No Number Bakery', instagram: 'nonumber', sells: 'Cakes', hotel_or_chain: false }] },
  [`${B}/page/b`]: { article_title: 'Kuih raya sellers', article_year: '', malaysia: true, businesses: [
    { name: 'Epsilon Tarts', whatsapp: '+6017-111 2222', area: 'Shah Alam', sells: 'Tart nenas', language: 'ms', instagram: 'epsilon.made.up' },
    { name: 'Zeta Fake', whatsapp: '013-999 8888', sells: 'Invented by the AI', language: 'en' }] },
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    hits.push(req.url);
    const json = (o, code = 200) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (req.url === '/search') {
      if (req.headers['x-api-key'] !== 'exa-test') return json({ error: 'bad key' }, 401);
      return json({ results: [{ url: `${B}/page/a`, title: 'a' }, { url: `${B}/page/b`, title: 'b' }, { url: 'https://www.instagram.com/someone/', title: 'ig' },
        { url: 'https://thehoneycombers.com/singapore/cookies', title: 'sg' }, { url: `${B}/page/missing`, title: 'gone' }] });
    }
    if (req.url === '/chat/completions') {
      const user = JSON.parse(body).messages[1].content;
      const url = (user.match(/^URL: (\S+)/) || [])[1];
      return json({ choices: [{ message: { content: JSON.stringify(AI[url] || { malaysia: true, businesses: [] }) } }] });
    }
    if (req.url === '/page/a' || req.url === '/page/b') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(req.url === '/page/a' ? PAGE_A : PAGE_B); }
    if (req.url === '/dom/deltacakes.com') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<title>Delta Cakes | Order online</title>'); }
    if (req.url === '/dom/alphabakes.com') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<title>alphabakes.com is for sale</title> domain is for sale'); }
    if (req.url === '/dom/betakuih.my') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end('<title>Beta Engineering Sdn Bhd</title>'); }
    res.writeHead(404); res.end('no');
  });
});

server.listen(PORT, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'robot-'));
  fs.writeFileSync(path.join(dir, '2026-11-01-old.json'), JSON.stringify({ batch: 'old', leads: [{ id: 'old-known', name: 'Known Shop', whatsapp: '017-444 5555', input: 'x' }] }));
  const env = { ...process.env, DEEPSEEK_API_KEY: 'sk-test', DEEPSEEK_BASE_URL: B, EXA_API_KEY: 'exa-test', EXA_BASE: B, ROBOT_DOMAIN_BASE: `${B}/dom/`,
    ROBOT_MAX_QUERIES: '3', ROBOT_MAX_PAGES: '10', TAVILY_API_KEY: '', SERPER_API_KEY: '', BRAVE_API_KEY: '' };
  const script = path.join(__dirname, '..', '..', 'scripts', 'robot', 'find-leads.mjs');
  const run = (extra = {}) => new Promise((resolve) => {
    const child = require('child_process').spawn(process.execPath, [script, '--leads-dir', dir, '--date', '2026-11-25'], { env: { ...env, ...extra } });
    let out = ''; child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
  (async () => {
    console.log('Lead robot');
    const r1 = await run();
    const file = path.join(dir, '2026-11-25-robot.json');
    ok(r1.code === 0 && fs.existsSync(file), 'runs and writes today\'s file: ' + r1.out.trim().split('\n').pop());
    const doc = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { leads: [] };
    const by = Object.fromEntries(doc.leads.map((l) => [l.name, l]));
    ok(by['Alpha Bakes'] && by['Alpha Bakes'].whatsapp === '012-345 6789' && by['Alpha Bakes'].instagram === 'alphabakes' && by['Alpha Bakes'].language === 'zh', 'keeps a baker with the number and Instagram from the page');
    ok(by['Beta Kuih'] && by['Beta Kuih'].whatsapp === '019-876 5432', 'a number that is only in a wa.me link counts, written as 019-876 5432');
    ok(by['Epsilon Tarts'] && by['Epsilon Tarts'].whatsapp === '017-111 2222' && by['Epsilon Tarts'].instagram === '', '+60 numbers count; an Instagram handle that is not on the page is dropped');
    ok(!by['Zeta Fake'], 'a shop whose number is not on the page is left out (AI mistake)');
    ok(!by['Gamma Hotel'], 'hotels and chains are left out');
    ok(!by['Delta Cakes'], 'a shop with its own website (deltacakes.com, title has the name) is left out');
    ok(!by['Known Shop'] && !by['No Number Bakery'], 'shops already in the inbox and shops without a mobile number are left out');
    ok(by['Beta Kuih'] && /betakuih\.my/.test(by['Beta Kuih'].verify) && by['Alpha Bakes'] && !/alphabakes\.com/.test(by['Alpha Bakes'].verify),
      'a same-name domain with another title is only a note to check; a parked domain is ignored');
    ok(doc.leads.every((l) => /^r20261125-[a-z0-9]+$/.test(l.id) && l.name && l.input && l.why && l.verify && l.area && l.address && ['zh', 'en', 'ms'].includes(l.language) && l.template && l.priority),
      'every lead has the inbox fields (id, name, input, why, verify, area, address, language, template, priority)');
    ok(by['Alpha Bakes'] && /2025/.test(by['Alpha Bakes'].verify) && /localhost:9940\/page\/a/.test(by['Alpha Bakes'].contact_source), 'the card says where the number came from and how old the article is');
    ok(!hits.some((h) => /instagram|honeycombers/.test(h)), 'Instagram and Singapore pages are never opened');
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'robot-state.json'), 'utf8'));
    ok(state.urls[`${B}/page/a`] === '2026-11-25' && Object.keys(state.queries).length === 3, 'remembers the pages it read and the searches it made');

    hits.length = 0;
    const r2 = await run();
    const doc2 = JSON.parse(fs.readFileSync(file, 'utf8'));
    ok(r2.code === 0 && doc2.leads.length === doc.leads.length && !hits.some((h) => h.startsWith('/page/')), 'a second run the same day reads no page twice and adds no duplicate');

    const r3 = await run({ DEEPSEEK_API_KEY: '' });
    ok(r3.code === 1 && /DEEPSEEK_API_KEY/.test(r3.out), 'without a DeepSeek key it stops with a clear message');
    const r4 = await run({ EXA_API_KEY: '' });
    ok(r4.code === 1 && /No search key/.test(r4.out), 'without a search key it stops with a clear message');

    // the build accepts the robot's file (inbox.json is made from sales/leads/*.json)
    const py = spawnSync('python3', ['-c', `
import json,sys,re
sys.path.insert(0, ${JSON.stringify(path.join(__dirname, '..'))})
import importlib.util
spec = importlib.util.spec_from_file_location('b', ${JSON.stringify(path.join(__dirname, '..', 'build.py'))}); b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
b.HERE = ${JSON.stringify(path.join(dir, 'site'))}
import os; os.makedirs(os.path.join(${JSON.stringify(dir)}, 'site'), exist_ok=True); os.makedirs(os.path.join(${JSON.stringify(dir)}, 'sales'), exist_ok=True)
os.symlink(${JSON.stringify(dir)}, os.path.join(${JSON.stringify(dir)}, 'sales', 'leads'))
print(len([l for l in b.load_leads() if l['id'].startswith('r2026')]))
`], { encoding: 'utf8' });
    ok(py.status === 0 && +py.stdout.trim().split('\n').pop() === doc.leads.length, 'the site build reads the robot\'s leads into the inbox (' + (py.stdout.trim() || py.stderr.trim().split('\n').pop()) + ')');

    fs.rmSync(dir, { recursive: true, force: true });
    server.close();
    console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
    process.exit(fail ? 1 : 0);
  })();
});
