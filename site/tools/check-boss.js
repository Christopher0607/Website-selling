// 总助理 (the desk-wide assistant, 2026-11-17) — local end-to-end check, self-contained:
// starts a stand-in DeepSeek that calls the tools like the real one would, and the local desk (site/tools/dev-server.mjs)
// on a throw-away data file, then drives /desk/ in a browser.
//   python3 site/build.py && node site/tools/check-boss.js
// Checks: it looks things up with tools (overview, a card, search, traffic), the tools see the real desk data,
// "记住…" goes into long-term memory and comes back in every later request and after a reload, a follow-up date it was
// asked to change lands on the card, long conversations get a summary that is sent along, memory lines can be deleted,
// the phone layout fits, no JavaScript errors.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium, devices } = require('playwright');

const AI_PORT = 9931, DESK_PORT = 8771, KEY = 'bosstest-123456';
const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'boss-')), 'desk.json');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✅ ' + m); } else { fail++; console.log('  ❌ ' + m); } };
const today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const plus = (n) => new Date(Date.now() + 8 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);

// ---- stand-in DeepSeek: picks a tool from the question, then answers from what the tool returned
const calls = [];
const ai = http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => { b += c; });
  req.on('end', () => {
    const body = JSON.parse(b);
    const msgs = body.messages;
    const sys = msgs[0].content;
    const last = msgs[msgs.length - 1];
    calls.push({ tools: (body.tools || []).map((t) => t.function.name), sys, last: last.role });
    let message;
    if (body.tools && last.role === 'user') {
      const q = last.content;
      const pick = (name, args) => ({ role: 'assistant', content: '', tool_calls: [{ id: 'call_' + calls.length, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
      const id = (q.match(/\bc\d+\b/) || [])[0];
      const date = (q.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
      if (/^记住[:：]/.test(q)) message = pick('remember', { fact: q.replace(/^记住[:：]\s*/, '') });
      else if (id && date) message = pick('set_followup', { id, date });
      else if (/流量/.test(q)) message = pick('traffic', { days: 7 });
      else if (/搜「(.+?)」/.test(q)) message = pick('search', { text: q.match(/搜「(.+?)」/)[1] });
      else if (id) message = pick('card', { id });
      else if (/你记得/.test(q)) message = { role: 'assistant', content: '我记得：' + ((sys.match(/=== LONG-TERM MEMORY[^\n]*\n([\s\S]*?)\n\n===/) || [])[1] || '') };
      else message = pick('overview', {});
    } else if (last.role === 'tool') {
      const outs = msgs.filter((m) => m.role === 'tool').slice(-3).map((m) => m.content.slice(0, 2500));
      message = { role: 'assistant', content: '根据资料：\n' + outs.join('\n---\n') + '\n【可以直接发的信息】\nHi, this is Cartsmith Studio. Here is the demo that fits your shop.\n【结束】' };
    } else if (/^Summarise for the owner/.test(sys)) message = { role: 'assistant', content: '重点：俊宇要先跟进 Kopi Corner；Bangsar 的店下午 3 点后打电话。' };
    else message = { role: 'assistant', content: '（卡片助理）好的。' };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message, finish_reason: message.tool_calls ? 'tool_calls' : 'stop' }] }));
  });
});

const seed = {
  exported: today, version: 1,
  doc: {
    next: 4, settings: { dailyLimit: 10 },
    items: [
      { id: 'c1', business_name: 'Kopi Corner', status: 'replied', niche: 'cafe', area: 'Bangsar', language: 'zh', touches: 2, last_contact_date: plus(-2), next_followup_date: today, history: [{ d: plus(-2), e: 'their_reply', n: '价钱多少？可以先看示范吗' }] },
      { id: 'c2', business_name: 'Roti Lane', status: 'contacted', niche: 'bakery', area: 'PJ SS2', language: 'en', touches: 1, last_contact_date: plus(-5), next_followup_date: plus(-1), history: [{ d: plus(-5), e: 'sent', n: 'first message' }] },
      { id: 'c3', business_name: 'Gula Studio', status: 'lost', niche: 'dessert', area: 'Cheras', language: 'en', touches: 3, lost_reason: 'not now', history: [] },
    ],
  },
};

async function deskApi(action, payload) {
  const r = await fetch(`http://localhost:${DESK_PORT}/api/desk`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-desk-key': KEY }, body: JSON.stringify(Object.assign({ action }, payload || {})) });
  return r.json();
}
async function mausApi(body) {
  const r = await fetch(`http://localhost:${DESK_PORT}/api/maus`, { method: 'POST', headers: { Authorization: 'Bearer maus-research-test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
}

(async () => {
  await new Promise((r) => ai.listen(AI_PORT, r));
  const dev = spawn(process.execPath, [path.join(ROOT, 'site/tools/dev-server.mjs'), String(DESK_PORT)], {
    cwd: ROOT, env: Object.assign({}, process.env, { DESK_LOCAL_FILE: FILE, SALES_DESK_KEY: KEY, DEEPSEEK_API_KEY: 'sk-test', DEEPSEEK_BASE_URL: 'http://localhost:' + AI_PORT, LEADS_URL: 'off', MAUS_RESEARCH_KEY: 'maus-research-test' }), stdio: 'ignore',
  });
  let b;
  try {
    for (let i = 0; i < 50; i++) { try { await fetch(`http://localhost:${DESK_PORT}/desk/`); break; } catch (e) { await new Promise((r) => setTimeout(r, 200)); } }
    const rs = await deskApi('restore', { backup: seed });
    ok(rs.added === 3, 'test desk: 3 shop cards');

    console.log('The 总助理 tab');
    b = await chromium.launch();
    const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(`http://localhost:${DESK_PORT}/desk/`);
    await p.fill('#pw', KEY);
    await p.click('[data-login] button[type=submit], [data-login] .btn');
    await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
    await p.click('[data-tab="boss"]');
    await p.waitForSelector('[data-boss-text]', { timeout: 15000 });
    ok(/看得到全部商家/.test(await p.textContent('[data-boss]')), 'tab opens: what it can see, and that it never sends anything');
    const ask = async (q) => {
      const n = await p.$$eval('.boss__log .ai__msg', (x) => x.length);
      await p.fill('[data-boss-text]', q);
      await p.click('[data-act="boss-send"]');
      await p.waitForFunction((k) => document.querySelectorAll('.boss__log .ai__msg').length >= k + 2, n, { timeout: 30000 });
      return p.$$eval('.boss__log .ai__msg--ai', (x) => x[x.length - 1].textContent);
    };
    await p.click('[data-act="boss-quick"]:has-text("今天要跟进的")');
    ok(/今天要跟进/.test(await p.inputValue('[data-boss-text]')), 'quick button fills the question');
    let a = await ask(await p.inputValue('[data-boss-text]'));
    ok(/查了：今天概况/.test(a) && /Follow-ups due today or overdue \(2\)/.test(a) && /Kopi Corner/.test(a) && /Roti Lane/.test(a) && !/Gula Studio \|/.test(a.split('Follow-ups')[1] || ''),
      'today\'s overview: Kopi Corner (today) and Roti Lane (overdue) to follow up; the lost shop is left out');
    ok(await p.isVisible('.boss__log .ai__draft [data-act="boss-copy"]'), 'a draft message comes with a copy button (nothing is sent)');
    a = await ask('看一下 c1 现在怎样');
    ok(/查了：看卡片 c1/.test(a) && /Kopi Corner/.test(a) && /价钱多少/.test(a), 'one card on demand: Kopi Corner with their reply ("价钱多少")');
    a = await ask('搜「示范」');
    ok(/搜对话/.test(a) && /c1 Kopi Corner/.test(a), 'search across every conversation finds c1');
    a = await ask('网站这几天的流量怎样');
    ok(/看流量 7 天/.test(a), 'website traffic (7 days)');

    console.log('Memory that does not forget');
    await ask('记住：Bangsar 的店都在下午 3 点后打电话');
    ok(/长期记忆（1）/.test(await p.textContent('[data-boss]')), '"记住…" goes into long-term memory (1)');
    const lastSys = calls.filter((c) => c.tools.length).slice(-1)[0].sys;
    await ask('你记得什么？');
    const sysNow = calls.filter((c) => c.tools.length).slice(-1)[0].sys;
    ok(/LONG-TERM MEMORY[\s\S]*Bangsar 的店都在下午 3 点后打电话/.test(sysNow) && !/Bangsar 的店都在下午 3 点后打电话/.test(lastSys.split('LONG-TERM MEMORY')[1].split('===')[0]), 'every later request carries the memory');
    await p.reload();
    await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
    await p.click('[data-tab="boss"]');
    await p.waitForSelector('[data-boss-text]', { timeout: 15000 });
    const after = await p.textContent('[data-boss]');
    ok(/长期记忆（1）/.test(after) && /看一下 c1 现在怎样/.test(after), 'after a reload (or on another phone): the conversation and the memory are still there');

    console.log('Changes only when asked');
    const d3 = plus(3);
    a = await ask(`把 c2 的跟进日期改到 ${d3}`);
    const l = await deskApi('list');
    const c2 = l.items.find((x) => x.id === 'c2');
    ok(c2 && c2.next_followup_date === d3 && /总助理：下次跟进改到/.test(JSON.stringify(c2.history)), `c2's next follow-up is now ${d3} (with a note in its history)`);

    console.log('Long conversations get a summary');
    for (let i = 0; i < 6; i++) await deskApi('boss', { text: '看一下 c3 第 ' + (i + 1) + ' 次' });
    const g = await deskApi('boss-get');
    ok(/重点：/.test(g.summary || ''), 'after 20 messages: a summary of the earlier conversation');
    await deskApi('boss', { text: '你记得什么？' });
    ok(/SUMMARY OF EARLIER CONVERSATION ===\n重点：/.test(calls.filter((c) => c.tools.length).slice(-1)[0].sys), 'the summary is sent along with every later request');

    console.log('Memory can be edited');
    await p.reload();
    await p.waitForSelector('#app:not([hidden])', { timeout: 15000 });
    await p.click('[data-tab="boss"]');
    await p.waitForSelector('.boss__mem');
    await p.click('.boss__mem summary');
    await p.fill('[data-boss-mem]', 'Roti Lane 老板只看 Email');
    await p.click('[data-act="boss-remember"]');
    await p.waitForFunction(() => /长期记忆（2）/.test(document.querySelector('[data-boss]').textContent));
    p.once('dialog', (dlg) => dlg.accept());
    await p.click('.boss__mem [data-act="boss-forget"] >> nth=0');
    await p.waitForFunction(() => /长期记忆（1）/.test(document.querySelector('[data-boss]').textContent));
    ok(/Roti Lane 老板只看 Email/.test(await p.textContent('.boss__mem')) && !/Bangsar 的店都在/.test(await p.textContent('.boss__mem')), 'add a memory line by hand, delete another');
    ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));

    console.log('Project MAUS owner review');
    const mr = await mausApi({ action: 'submit_review', kind: 'lead_research', lead_id: 'c1', title: 'Public source check', summary: 'A test recommendation; no message was sent.' });
    ok(mr.status === 201 && mr.body.review.status === 'pending_owner_review', 'department can submit an internal recommendation only');
    await p.click('[data-tab="maus"]');
    await p.waitForSelector('[data-maus] [data-act="maus-decide"]');
    ok(/机器人自动外联[\s\S]*0/.test(await p.textContent('[data-maus]')), 'MAUS tab states that it has no automatic external outreach');
    await p.click('[data-maus] [data-act="maus-decide"][data-decision="approved"]');
    await p.waitForFunction(() => /已采纳/.test(document.querySelector('[data-maus]').textContent));
    ok(/已采纳/.test(await p.textContent('[data-maus]')), 'owner can approve a recommendation without triggering an external action');

    console.log('Phone');
    const m = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
    await m.goto(`http://localhost:${DESK_PORT}/desk/`);
    await m.fill('#pw', KEY);
    await m.click('[data-login] button[type=submit], [data-login] .btn');
    await m.waitForSelector('#app:not([hidden])', { timeout: 15000 });
    await m.click('[data-tab="maus"]');
    await m.waitForSelector('[data-maus]');
    ok(await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0 && (await m.$$('.tabs button')).length === 7, 'phone: seven tabs fit, nothing sticks out');
    if (process.argv[2]) await m.screenshot({ path: process.argv[2], fullPage: false });
  } catch (e) {
    fail++; console.log('  ❌ stopped: ' + e.message.split('\n')[0]);
  } finally {
    if (b) await b.close();
    dev.kill(); ai.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
