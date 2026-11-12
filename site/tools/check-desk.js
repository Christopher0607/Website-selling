// 测试销售工作台：登录 → 加商家（AI 分析）→ 复制并打开 IG → 已发送 → 跟进 → 对方回复 → 样板 → 不再联系 → 名单 / 数字 / 导出
// → Claude Code 新商家收件箱（跳过 / 全部加入，只放有 IG 的）→ WhatsApp（wa.me 预先填好）/ Email（mailto）/ IG 发送 + 「已发送」提示条
// → 介面没有表情符号；AI 提示词不署个人名字、不用表情符号
// 需要：一个跑着 dist + /api/desk 的服务（本地用模拟的 DeepSeek），密码在环境变量 DESK_TEST_KEY
// 用法：node tools/check-desk.js http://localhost:8769 /path/to/desk-store.json [截图资料夹]
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8769';
const STORE = process.argv[3];
const SHOTS = process.argv[4];
const KEY = process.env.DESK_TEST_KEY || 'testpass123';

(async () => {
  const b = await chromium.launch();
  let fail = 0;
  const ok = (c, m) => { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => { window.DESK_NOW = '2026-11-10T07:00:00Z'; }); // 15:00 in Malaysia: inside good calling hours
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => { errors.push(e.message); if (process.env.DESK_DEBUG) console.log('PAGEERROR', e.message); });
  p.on('dialog', async (d) => { if (d.type() === 'prompt') await d.accept('https://p001-glowlab-x7.netlify.app'); else await d.accept(); });
  const shot = async (name) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/desk-${name}.png`, fullPage: true }); };

  await p.goto(BASE + '/desk/');
  ok(await p.isVisible('#login'), 'login screen first');
  await p.fill('#pw', 'wrong-password');
  await p.click('[data-login] button');
  await p.waitForSelector('[data-login-err]:not([hidden])');
  ok(/密码不对/.test(await p.textContent('[data-login-err]')), 'wrong password rejected');
  await p.fill('#pw', KEY);
  await p.click('[data-login] button');
  await p.waitForSelector('#app:not([hidden])');
  ok(true, 'correct password opens the desk');

  // add a merchant
  await p.click('[data-tab="add"]');
  await p.fill('#add-in', 'Glow Lab · https://shopee.com.my/glowlab\nIG @glowlab.my 8k followers, posts daily\nSkincare, Vitamin C serum 1,200 reviews\nNo website, bio only links Shopee');
  await p.click('[data-add] button[type=submit]');
  await p.waitForSelector('[data-add-result] .card', { timeout: 15000 });
  const res = await p.textContent('[data-add-result]');
  ok(/p001/.test(res) && /4\/5/.test(res), 'AI analysis saved as p001 with score 4/5');
  ok((await p.$$('[data-add-result] .crit li.on')).length === 4, 'criteria checklist shows 4 ✓');
  ok((await p.inputValue('[data-add-result] textarea[data-field="message"]')).length > 20, 'opening message drafted');
  await shot('add');

  // today: copy & open IG, then sent
  await p.click('[data-tab="today"]');
  await p.waitForSelector('#c-p001');
  const [popup] = await Promise.all([p.waitForEvent('popup'), p.click('#c-p001 [data-act="copyopen"]')]);
  ok(popup.url().includes('ig.me/m/glowlab.my') || (await popup.evaluate(() => location.href)).includes('instagram'), 'copy & open goes to ig.me/m/glowlab.my');
  await popup.close();
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  ok(/Glow Lab/.test(clip), 'message copied to clipboard');
  await shot('today-new');
  await p.click('#c-p001 [data-act="sent"]');
  await p.waitForFunction(() => /新联系 1\//.test(document.querySelector('[data-sent-count]').textContent));
  ok(true, 'counter shows 1 new contact today');
  ok(!(await p.$('#c-p001')), 'p001 leaves the new-contact list');

  // make follow-up due (simulate 3 days later) and write follow-up
  const doc = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  const it = doc.items.find((x) => x.id === 'p001');
  ok(it.status === 'contacted' && it.touches === 1 && !!it.next_followup_date, `stored: contacted, touches 1, follow-up ${it.next_followup_date}`);
  it.next_followup_date = '2000-01-01';
  it.last_channel = 'ig'; it.channels = ['ig']; it.whatsapp = it.whatsapp || '60123456789';
  fs.writeFileSync(STORE, JSON.stringify(doc));
  await p.reload();
  await p.waitForSelector('#c-p001 [data-act="followup"]');
  ok(true, 'p001 appears under follow-ups when due');
  await p.click('#c-p001 [data-act="followup"]');
  await p.waitForSelector('#c-p001 textarea[data-field="followup"]');
  ok(true, 'AI follow-up drafted');
  const order = await p.$$eval('#c-p001 .send__btns button', (bs) => bs.map((x) => x.dataset.act));
  const hint = await p.textContent('#c-p001 [data-send-hint]');
  ok(order[0] === 'call' && order.indexOf('wa') < order.indexOf('copyopen') && /上次用 Instagram/.test(hint) && /换 电话/.test(hint), 'follow-up after an IG message: call first, then WhatsApp, Instagram last');
  await p.click('#c-p001 [data-act="sent"]');
  await p.waitForTimeout(500);

  // their reply → AI draft → back to waiting
  await p.click('[data-tab="list"]');
  await p.click('[data-expand="p001"]');
  await p.click('#l-p001 [data-act="reply"]');
  await p.fill('[data-reply-text]', '多少钱？可以先看看吗');
  await p.click('[data-act="reply-go"]');
  await p.click('[data-tab="today"]');
  await p.waitForSelector('#c-p001 textarea[data-field="draft_reply"]', { timeout: 15000 });
  ok(/对方有兴趣/.test(await p.textContent('#c-p001 .draft')), 'reply classified + draft shown under 有回复');
  await shot('today-reply');
  await p.click('#c-p001 [data-act="replied-more"]');
  await p.click('[data-sheet] [data-act="preview"]');
  await p.waitForTimeout(600);
  let d2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p001');
  ok(d2.status === 'preview_sent' && !!d2.preview_delete_by && d2.preview_url.includes('netlify.app'), `preview recorded, delete by ${d2.preview_delete_by}`);

  // second merchant → do not contact
  await p.click('[data-tab="add"]');
  await p.fill('#add-in', 'Paw Co pet shop, IG @pawco.my, Shopee 600 reviews, no website. Observation: many ask about East Malaysia shipping');
  await p.click('[data-add] button[type=submit]');
  await p.waitForSelector('[data-add-result] .card', { timeout: 15000 });
  await p.click('[data-add-result] [data-act="more"]');
  await p.click('[data-sheet] [data-act="dnc"]');
  await p.waitForTimeout(600);
  d2 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  ok(d2.items.find((x) => x.id === 'p002').status === 'do_not_contact', 'p002 marked do-not-contact');

  // list filters, stats, export
  await p.click('[data-tab="list"]');
  await p.click('[data-filter="do_not_contact"]');
  ok((await p.$$('[data-all-list] .mini')).length === 1, 'filter 不再联系 shows 1');
  await p.fill('[data-search]', 'glow');
  await p.click('[data-filter="all"]');
  ok((await p.$$('[data-all-list] .mini')).length === 1, 'search finds Glow Lab');
  await p.click('[data-tab="stats"]');
  ok(/联系过/.test(await p.textContent('[data-stats]')), 'stats page renders');
  await shot('stats');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-export]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  ok(/^﻿?id,business_name/.test(csv) && csv.includes('Glow Lab') && csv.includes('do_not_contact'), 'CSV export has both merchants');

  // Claude Code's new-lead inbox (sales/leads/*.json → inbox.mjs)
  const leadsTotal = (await import('../server/inbox.mjs')).INBOX.length;
  await p.click('[data-tab="today"]');
  await p.waitForSelector('[data-inbox]');
  ok((await p.$$('[data-inbox] .inbox__list li')).length === leadsTotal, `inbox shows ${leadsTotal} new leads`);
  await shot('inbox');
  const skipId = 'b3-over-time-leathercraft';
  await p.click(`[data-act="skip-lead"][data-lead="${skipId}"]`);
  await p.waitForFunction((n) => document.querySelectorAll('[data-inbox] .inbox__list li').length === n, leadsTotal - 1);
  ok(true, 'skip removes one lead');
  await p.click('[data-act="import-all"]');
  await p.waitForSelector('[data-inbox]', { state: 'detached', timeout: 90000 });
  const d3 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
  const imported = d3.items.filter((x) => x.lead_id);
  ok(imported.length === leadsTotal - 1 && (d3.inbox_done || []).length === leadsTotal, `imported ${imported.length} leads, ${(d3.inbox_done || []).length} marked done`);
  const gb = imported.find((x) => x.lead_id === 'b3-ginger-batiks');
  ok(gb && gb.business_name === 'Ginger Batiks' && gb.instagram === 'gingerbatiks' && gb.template === 'plainfold' && !!gb.verify && !gb.duplicate_of && gb.status === 'new', 'lead facts (name, IG, template, verify) kept over AI output');
  ok(!imported.some((x) => x.lead_id === skipId), 'skipped lead not imported');
  ok(/b3-ginger-batiks/.test(JSON.stringify(gb.history)), 'history notes the inbox source');
  const gCard = '#c-' + gb.id;
  await p.waitForSelector(gCard);
  ok(/Claude Code 找的/.test(await p.textContent(gCard)) && /发之前看一眼/.test(await p.textContent(gCard)), 'card shows source tag + verify note');
  const [pop2] = await Promise.all([p.waitForEvent('popup'), p.click(gCard + ' [data-act="copyopen"]')]);
  await pop2.close();
  await p.waitForSelector('[data-sentbar]:not([hidden])');
  ok(/Ginger Batiks/.test(await p.textContent('[data-sentbar]')), '"sent?" bar appears after copy & open');
  await shot('sentbar');
  await p.click('[data-sentbar-yes]');
  await p.waitForSelector('[data-sentbar]', { state: 'hidden' });
  await p.waitForFunction(() => document.querySelector('[data-sent-count]').textContent.includes('新联系 2/'));
  ok(JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === gb.id).status === 'contacted', 'bar ✓ marks the lead as contacted');
  ok(imported.every((x) => x.instagram), 'every lead from the inbox has an Instagram handle');

  // WhatsApp: a lead with a public number gets a wa.me link with the message pre-filled
  const gbm = imported.find((x) => x.lead_id === 'r20261108-good-blue-men');
  ok(gbm && gbm.whatsapp === '60122385212', 'lead WhatsApp number normalised to 60122385212');
  if (gbm) {
    await p.click('[data-tab="list"]');
    await p.fill('[data-search]', 'Good Blue Men');
    await p.click(`[data-expand="${gbm.id}"]`);
    await p.waitForSelector(`#l-${gbm.id} [data-act="wa"]`);
    const msgText = await p.inputValue(`#l-${gbm.id} textarea[data-field="message"]`);
    const [waPop] = await Promise.all([p.waitForEvent('popup'), p.click(`#l-${gbm.id} [data-act="wa"]`)]);
    const waUrl = waPop.url();
    await waPop.close();
    ok(waUrl.startsWith('https://wa.me/60122385212') || waUrl.includes('whatsapp.com'), 'WhatsApp button opens wa.me for the right number');
    ok(decodeURIComponent(waUrl).includes(msgText.slice(0, 30)) || waUrl.includes('whatsapp.com'), 'WhatsApp message is pre-filled');
    await p.waitForSelector('[data-sentbar]:not([hidden])');
    ok(/WhatsApp/.test(await p.textContent('[data-sentbar]')), 'sent bar names the channel');
    await p.click('[data-sentbar-yes]');
    await p.waitForSelector('[data-sentbar]', { state: 'hidden' });
    const g2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === gbm.id);
    ok(g2.status === 'contacted' && (g2.channels || []).includes('wa') && g2.last_channel === 'wa', 'WhatsApp send recorded with channel');
    await p.fill('[data-search]', '');
  }

  // Email + WhatsApp added by hand in the edit sheet (Glow Lab p001 is past "new", so use a fresh lead)
  const em = imported.find((x) => x.status === 'new' && x.lead_id && !x.whatsapp && x.lead_id !== 'b3-ginger-batiks');
  await p.click('[data-tab="list"]');
  await p.fill('[data-search]', em.business_name);
  await p.click(`[data-expand="${em.id}"]`);
  await p.click(`#l-${em.id} [data-act="edit"]`);
  await p.fill('[data-e="whatsapp"]', '12345');
  await p.click('[data-act="edit-save"]');
  await p.waitForFunction(() => document.querySelector('[data-toast]').textContent.includes('格式不对'), null, { timeout: 5000 }).catch(() => {});
  ok(/格式不对/.test(await p.textContent('[data-toast]')), 'bad WhatsApp number rejected');
  await p.fill('[data-e="whatsapp"]', '012-345 6789');
  await p.fill('[data-e="email"]', 'Hello@Brand.com');
  await p.click('[data-act="edit-save"]');
  await p.waitForSelector('[data-sheet]', { state: 'hidden' });
  const e2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === em.id);
  ok(e2.whatsapp === '60123456789' && e2.email === 'hello@brand.com', 'edited contacts saved and normalised');
  await p.evaluate(() => { window.__mail = ''; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.href.startsWith('mailto:')) { window.__mail = this.href; return; } return orig.call(this); }; });
  await p.waitForSelector(`#l-${em.id} [data-act="email"]`);
  await p.click(`#l-${em.id} [data-act="email"]`);
  const mail = await p.evaluate(() => window.__mail);
  ok(mail.startsWith('mailto:hello@brand.com?subject=') && mail.includes('&body='), 'Email button builds mailto with subject and body');
  await p.waitForSelector('[data-sentbar]:not([hidden])');
  await p.click('[data-act="sentbar-no"]');
  await shot('channels');

  // rapid manual sending: one lead at a time, leads with WhatsApp / email first
  await p.fill('[data-search]', '');
  await p.click('[data-tab="today"]');
  await p.waitForSelector('[data-act="queue-start"]');
  await p.click('[data-act="queue-start"]');
  await p.waitForSelector('[data-q-card]');
  ok(/连续发送 · 1 \//.test(await p.textContent('[data-sheet]')), 'send queue opens at 1 / N');
  const q1 = await p.getAttribute('[data-q-card]', 'data-q-card');
  const q1item = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === q1);
  ok(q1item && (q1item.whatsapp || q1item.email), 'lead with WhatsApp / email comes first in the queue');
  const [qPop] = await Promise.all([p.waitForEvent('popup'), p.click('[data-q-card] [data-act="wa"]')]);
  ok(qPop.url().startsWith('https://wa.me/' + q1item.whatsapp) || qPop.url().includes('whatsapp.com'), 'queue WhatsApp button opens the pre-filled chat');
  await qPop.close();
  ok(await p.isHidden('[data-sentbar]'), 'no separate sent bar inside the queue');
  await p.click('[data-act="q-sent"]');
  await p.waitForFunction(() => /连续发送 · 2 \//.test(document.querySelector('[data-sheet]').textContent));
  const q1s = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === q1);
  ok(q1s.status === 'contacted' && q1s.last_channel === 'wa', 'queue "sent, next" records the send with its channel');
  const q2 = await p.getAttribute('[data-q-card]', 'data-q-card');
  await p.click('[data-act="q-skip"]');
  await p.waitForFunction(() => /连续发送 · 3 \//.test(document.querySelector('[data-sheet]').textContent));
  ok(JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === q2).status === 'new', 'skip leaves the lead untouched');
  await shot('queue');
  await p.click('[data-sheet-panel] [data-sheet-close]');
  await p.waitForSelector('[data-sheet]', { state: 'hidden' });
  ok(!(await p.$(`#c-${q1}`)), 'sent lead leaves today after closing the queue');

  // daily limit can go up to 100 (2026-11-08: 100 new contacts a day)
  await p.click('[data-tab="stats"]');
  await p.fill('[data-limit]', '100');
  await p.click('[data-save-limit]');
  await p.waitForTimeout(500);
  ok(JSON.parse(fs.readFileSync(STORE, 'utf8')).settings.dailyLimit === 100, 'daily limit saves 100');
  await p.fill('[data-limit]', '101');
  await p.click('[data-save-limit]');
  await p.waitForTimeout(500);
  ok(JSON.parse(fs.readFileSync(STORE, 'utf8')).settings.dailyLimit === 100, 'daily limit above 100 is not saved');
  ok(/1 到 100/.test(await p.textContent('[data-toast], .toast')) && (await p.inputValue('[data-limit]')) === '100', 'above 100: clear error, box goes back to 100 (no fake "saved")');

  // phone calls (2026-11-09): call button, bad-hour warning, outcomes, post-call draft, visit list
  {
    const d0 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const base = { created: '2026-11-09', platform: 'other', store_url: '', instagram: '', whatsapp: '', email: '', niche: 'cafe', input: 'x', observation: 'Festive roast boxes every December', notes: '', brand_clear: true, sales_signal: true, active_social: true, no_or_weak_website: true, budget_signal: true, score: 5, fit: 'good', template: 'chili-pantry', status: 'new', touches: 0, history: [] };
    d0.items.unshift({ ...base, id: 'p901', business_name: 'Roost Test', language: 'zh', phone: '60322011710', area: 'Bangsar', address: '69-1 Jalan Telawi 3, Bangsar Baru', message: '你好' });
    d0.items.unshift({ ...base, id: 'p902', business_name: 'Callback Cafe', language: 'en', whatsapp: '60123334444', area: 'PJ SS2', address: '12 Jalan SS2/24, PJ', message: 'Hi' });
    fs.writeFileSync(STORE, JSON.stringify(d0));
    await p.reload();
    await p.click('[data-tab="today"]');
    await p.waitForSelector('#c-p901 [data-act="call"]');
    ok((await p.getAttribute('#c-p901 .send__btns button:first-child', 'data-act')) === 'call', 'lead with a phone number: call is the first button');
    ok(/Cartsmith Studio/.test(await p.textContent('#c-p901 .cue')), 'card shows the phone opener to read out');
    const dialogs = [];
    p.on('dialog', (dg) => dialogs.push(dg.message()));
    await p.evaluate(() => { window.DESK_NOW = '2026-11-10T04:30:00Z'; }); // 12:30 in Malaysia
    await p.click('#c-p901 [data-act="call"]');
    await p.waitForSelector('#c-p901 [data-callout]');
    ok(dialogs.some((m) => /午餐时间/.test(m)), 'calling at lunchtime asks first (bad-hour warning)');
    await shot('callout');
    await p.evaluate(() => { window.DESK_NOW = '2026-11-10T07:00:00Z'; }); // 15:00
    await p.click('#c-p901 [data-act="call-out"][data-out="no_answer"]');
    await p.waitForFunction(() => !document.querySelector('#c-p901'));
    let s1 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p901');
    ok(s1.call_misses === 1 && s1.next_call_date > s1.created && s1.status === 'new', 'no answer: logged, comes back tomorrow, not counted as contacted');
    // next day: it shows under "今天要打电话"; they say yes
    const d1 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    d1.items.find((x) => x.id === 'p901').next_call_date = '2000-01-01';
    fs.writeFileSync(STORE, JSON.stringify(d1));
    await p.reload();
    await p.waitForSelector('#c-p901 [data-act="call"]');
    ok(/今天要再打的电话/.test(await p.textContent('[data-today-list]')), 'due call appears under 今天要再打的电话');
    await p.click('#c-p901 [data-act="call"]');
    await p.waitForSelector('#c-p901 [data-callout]');
    await p.click('#c-p901 [data-act="call-out"][data-out="ok"]');
    await p.waitForSelector('#c-p901 textarea[data-field="draft_reply"]');
    s1 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p901');
    ok(s1.status === 'replied' && /刚刚跟你通过电话/.test(s1.draft_reply) && s1.touches === 1 && s1.last_channel === 'call', 'yes on the phone: post-call message drafted (no AI), counted as first contact');
    // another one asks to call back on a date
    await p.click('#c-p902 [data-act="call"]');
    await p.waitForSelector('#c-p902 [data-callout]');
    await p.fill('#c-p902 [data-call-date]', '2099-01-01');
    await p.click('#c-p902 [data-act="call-out"][data-out="callback"]');
    await p.waitForFunction(() => !document.querySelector('#c-p902 [data-callout]'));
    const s2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p902');
    ok(s2.next_call_date === '2099-01-01' && s2.status === 'contacted', 'call back later: date saved');
    // visit list groups shops with an address by area, with a map link
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="visit"]');
    await p.waitForSelector('.visit');
    const vt = await p.textContent('[data-all-list]');
    ok(/Bangsar/.test(vt) && /PJ SS2/.test(vt) && (await p.$('.visit a[href*="google.com/maps"]')) !== null, 'visit list: grouped by area with map links');
    ok(/\+60 12-333 4444/.test(vt) && /\+60 3-2201 1710/.test(vt), 'mobile and landline numbers are formatted correctly');
    await shot('visit');
    await p.click('[data-filter="all"]');
    await p.click('[data-tab="today"]');
  }

  // per-customer AI assistant (2026-11-09): separate memory per customer, ready-to-send drafts, backup
  {
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="all"]');
    await p.click('[data-expand="p001"]');
    await p.click('#l-p001 [data-act="ai"]');
    await p.waitForSelector('[data-ai-text]');
    ok(/还没有对话/.test(await p.textContent('[data-ai-log]')), 'AI sheet opens with an empty conversation');
    await p.click('[data-act="ai-quick"][data-q^="对方问价钱"]');
    ok(/对方问价钱/.test(await p.inputValue('[data-ai-text]')), 'quick question fills the box');
    await p.click('[data-act="ai-send"]');
    await p.waitForSelector('.ai__msg--ai .ai__draft');
    ok(/Glow Lab/.test(await p.textContent('.ai__msg--ai')) && (await p.$('.ai__draft [data-act="ai-copy"]')) !== null, 'AI answers about this customer with a ready-to-send draft and a copy button');
    await p.fill('[data-ai-text]', '对方说要考虑一下');
    await p.click('[data-act="ai-send"]');
    await p.waitForFunction(() => document.querySelectorAll('.ai__msg--ai').length === 2);
    let calls = await (await fetch('http://localhost:9920/__calls')).json();
    let chatCalls = calls.filter((c) => c.assistant);
    ok(chatCalls.length === 2 && chatCalls[1].assistant.turns === 3 && chatCalls.every((c) => c.assistant.brand === 'Glow Lab' && c.assistant.otherBrands === 1), 'second question includes the earlier conversation, and only this customer\'s file');
    let st = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    ok((st.items.find((x) => x.id === 'p001').ai_chat || []).length === 4, 'conversation saved on this customer (4 messages)');
    await p.click('[data-sheet-panel] [data-sheet-close]');
    // another customer: its own, empty conversation
    await p.click('[data-expand="p901"]');
    await p.click('#l-p901 [data-act="ai"]');
    await p.waitForSelector('[data-ai-text]');
    ok(/还没有对话/.test(await p.textContent('[data-ai-log]')), 'another customer starts empty (no mixing)');
    await p.fill('[data-ai-text]', '下一步我应该怎么做？');
    await p.click('[data-act="ai-send"]');
    await p.waitForSelector('.ai__msg--ai');
    calls = await (await fetch('http://localhost:9920/__calls')).json();
    chatCalls = calls.filter((c) => c.assistant);
    ok(chatCalls[2].assistant.brand === 'Roost Test' && chatCalls[2].assistant.turns === 1, 'that customer\'s AI only sees its own file and conversation');
    await p.click('[data-sheet-panel] [data-sheet-close]');
    // reload: memory is still there
    await p.reload();
    await p.click('[data-tab="list"]');
    await p.click('[data-expand="p001"]');
    ok(/AI · 4/.test(await p.textContent('#l-p001 [data-act="ai"]')), 'card shows how many AI messages this customer has');
    await p.click('#l-p001 [data-act="ai"]');
    await p.waitForSelector('.ai__msg--ai');
    ok((await p.$$('.ai__msg')).length === 4, 'after reload the conversation is still there (no forgetting)');
    await shot('ai');
    await p.click('[data-sheet-panel] [data-sheet-close]');
    const listJson = await p.evaluate(async () => { const r = await fetch('/api/desk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-desk-key': localStorage.getItem('cs_desk_key') || '' }, body: JSON.stringify({ action: 'list' }) }); return r.ok ? r.json() : null; });
    ok(!!listJson && listJson.items.every((x) => !x.ai_chat), 'the list stays light (conversations load only when opened)');
    // full backup includes the conversations
    await p.click('[data-tab="stats"]');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-backup]')]);
    const bk = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
    ok(bk.doc && (bk.doc.items.find((x) => x.id === 'p001').ai_chat || []).length === 4, 'full backup (JSON) includes the AI conversations');
    await p.click('[data-tab="today"]');
  }

  // mockup table (2026-11-09): mockups, passwords and details in one table
  {
    const d3 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const cc = d3.items.find((x) => x.id === 'p902');
    Object.assign(cc, { preview_url: 'https://previews.cartsmithstudio.com/m-callback-cafe-1234abcd/', preview_password: 'cafe1234', preview_delete_by: '2000-01-01', preview_slug: 'm-callback-cafe-1234abcd' });
    fs.writeFileSync(STORE, JSON.stringify(d3));
    await p.reload();
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="table"]');
    await p.waitForSelector('.pvtbl');
    const rows = await p.$$eval('.pvtbl tbody tr', (rs) => rs.map((r) => r.getAttribute('data-row')));
    const total = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.filter((x) => x.preview_url).length;
    ok(rows.length === total && rows.includes('p902'), `table lists every merchant with a mockup (${rows.length})`);
    const rowText = await p.textContent('.pvtbl tr[data-row="p902"]');
    ok(/cafe1234/.test(rowText) && /打开/.test(rowText) && /PJ SS2/.test(rowText), 'row shows mockup link, password and area');
    ok((await p.$('.pvtbl tr[data-row="p902"] td.late')) !== null, 'expired delete date is shown in red');
    await shot('table');
    await p.click('[data-act="tbl-all"]');
    const allRows = await p.$$eval('.pvtbl tbody tr', (rs) => rs.length);
    ok(allRows === JSON.parse(fs.readFileSync(STORE, 'utf8')).items.length, 'toggle shows all merchants');
    await p.click('[data-act="tbl-all"]');
    await p.click('[data-act="tbl-copy"]');
    const tsv = await p.evaluate(() => navigator.clipboard.readText());
    ok(/样板网址\t密码/.test(tsv) && /cafe1234/.test(tsv) && tsv.split('\n').length === total + 1, 'copy table: header + one line per merchant, with passwords');
    await p.click('.pvtbl tr[data-row="p902"] [data-act="open-card"]');
    await p.waitForSelector('#l-p902');
    ok(await p.isVisible('#l-p902'), '卡片 button opens that merchant\'s card');
    await p.click('[data-tab="today"]');
  }

  // mockup ready before the first contact (2026-11-10): one short message with link + password + our site, straight to their WhatsApp
  {
    const d5 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const pv = { preview_url: 'https://previews--cartsmith.netlify.app/m-kopi-test-1234abcd/', preview_password: 'kopi5678', preview_delete_by: '2099-01-01', preview_slug: 'm-kopi-test-1234abcd' };
    const base5 = { created: '2026-11-10', platform: 'other', store_url: '', instagram: '', whatsapp: '', email: '', niche: 'cafe', input: 'x', notes: '', brand_clear: true, sales_signal: true, active_social: true, no_or_weak_website: true, budget_signal: true, score: 5, fit: 'good', template: 'chili-pantry', status: 'new', touches: 0, history: [], language: 'en' };
    d5.items.unshift({ ...base5, ...pv, id: 'p904', business_name: 'Kopi Test', phone: '60178704324', observation: 'Their kuih sells out every single afternoon', message: 'Hi Kopi Test, we saw that your kuih sells out every single afternoon and your regulars love the pandan ones... may we send you a free mockup?', preview_msg: 'Hi, old long message with shipping placeholders' });
    d5.items.unshift({ ...base5, ...pv, id: 'p905', business_name: 'Roti Test', phone: '60191234567', preview_url: 'https://previews--cartsmith.netlify.app/m-roti-test-1234abcd/', preview_password: 'roti4321', preview_slug: 'm-roti-test-1234abcd', preview_msg: 'old' });
    fs.writeFileSync(STORE, JSON.stringify(d5));
    await p.reload();
    await p.evaluate(() => { window.DESK_NOW = '2026-11-10T07:00:00Z'; }); // 15:00 in Malaysia
    await p.click('[data-tab="today"]');
    await p.waitForSelector('#c-p904 textarea[data-field="preview_msg"]');
    const k = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p904');
    ok(k.preview_msg_v >= 2 && k.preview_msg.includes('https://previews.cartsmithstudio.com/m-kopi-test-1234abcd/') && k.preview_msg.includes('kopi5678') && k.preview_msg.includes('https://cartsmithstudio.com/') && !/sells out|shipping/.test(k.preview_msg), 'old mockup messages are replaced: short, with link, password and our own site, no shop description');
    ok(k.preview_url === 'https://previews.cartsmithstudio.com/m-kopi-test-1234abcd/' && !/netlify\.app/.test(k.preview_msg + k.preview_url), 'cards saved with the old Netlify address move to our own domain (cartsmithstudio.com)');
    ok(/we've made a free sample website for Kopi Test/.test(k.preview_msg) && k.preview_msg.split(/\s+/).length < 80, 'message says the website is already made, under 80 words');
    ok(!(await p.$('#c-p904 textarea[data-field="message"]')), 'card with a mockup shows only the mockup message (no long opener next to it)');
    ok(/We've already made a free sample website/.test(await p.textContent('#c-p904 .cue')), 'phone opener says the website is already made');
    const waBtn = await p.textContent('#c-p904 [data-act="wa"]');
    ok(/\+60 17-870 4324/.test(waBtn), 'WhatsApp button shows the number it will open (taken from the phone number)');
    const [waPop5] = await Promise.all([p.waitForEvent('popup'), p.click('#c-p904 [data-act="wa"]')]);
    const waUrl5 = decodeURIComponent(waPop5.url());
    ok(waUrl5.startsWith('https://wa.me/60178704324') && waUrl5.includes('kopi5678') || /whatsapp\.com/.test(waUrl5), 'WhatsApp opens that number with the mockup message filled in');
    await waPop5.close();
    await p.click('[data-sentbar] [data-act="sentbar-no"]').catch(() => {});
    await p.click('#c-p904 [data-act="pv-sent"]');
    await p.waitForFunction(() => !document.querySelector('#c-p904 textarea[data-field="preview_msg"]'));
    const k2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p904');
    ok(k2.status === 'preview_sent' && !!k2.next_followup_date, '已发样板 records the mockup as sent and sets a follow-up');
    // yes on the phone when the mockup is ready: the message already has the link and password
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="all"]');
    if (!(await p.$('#l-p905'))) await p.click('[data-expand="p905"]');
    ok((await p.getAttribute('#l-p905 .send__btns button:first-child', 'data-act')) === 'call', 'card with a mockup still has the call button first');
    await p.click('#l-p905 [data-act="call"]');
    await p.waitForSelector('#l-p905 [data-callout]');
    await p.click('#l-p905 [data-act="call-out"][data-out="ok"]');
    await p.waitForSelector('#l-p905 textarea[data-field="draft_reply"]');
    const r5 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p905');
    ok(r5.draft_reply.includes('m-roti-test-1234abcd') && r5.draft_reply.includes('roti4321') && r5.draft_reply.includes('cartsmithstudio.com') && !r5.draft_reply.includes('netlify.app') && !/\[mockup link\]/.test(r5.draft_reply), 'after a good call the message has the link and password filled in');
    await shot('pv-first');
    await p.click('[data-tab="today"]');
  }

  // website forms (2026-11-12, was Netlify Forms): /api/form stores them, Today shows them until marked as seen
  {
    const post = (body, h) => fetch(`${BASE}/api/form`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json', ...(h || {}) }, body: new URLSearchParams(body).toString() });
    const r1 = await post({ 'form-name': 'mockup-request', 'bot-field': '', name: 'Aina', brand: 'Kedai Aina', instagram: '@kedai.aina', shop_url: 'https://shopee.com.my/kedaiaina', package: 'starter', message: 'We sell kuih raya', consent: 'yes' });
    const bot = await post({ 'form-name': 'mockup-request', 'bot-field': 'spam', name: 'Bot' });
    const bad = await post({ 'form-name': 'something-else', name: 'X' });
    const page = await fetch(`${BASE}/api/form`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'text/html' }, body: 'form-name=ai-chat-lead&name=Ben&contact=0123456789&interest=website' });
    const ff = JSON.parse(fs.readFileSync(STORE + '.forms.json', 'utf8'));
    const vals = Object.values(ff);
    ok(r1.ok && (await r1.json()).ok && bot.ok && bad.status === 400 && page.status === 303 && page.headers.get('location') === '/thanks.html', 'form endpoint: saves, ignores the honeypot quietly, refuses unknown forms, sends a normal page post to thanks.html');
    ok(vals.length === 2 && vals.some((f) => f.fields.brand === 'Kedai Aina') && !vals.some((f) => f.fields.name === 'Bot'), 'two real submissions stored, the bot one is not');
    await p.reload();
    await p.waitForSelector('#s-forms');
    const ft = await p.textContent('#s-forms');
    ok(/网站上申请免费样板/.test(ft) && /Kedai Aina/.test(ft) && /@kedai\.aina/.test(ft) && /AI 客服留下的资料/.test(ft) && /0123456789/.test(ft), 'Today shows the new website requests with their details');
    await p.click('#s-forms [data-act="form-seen"]');
    await p.waitForFunction(() => document.querySelectorAll('#s-forms [data-form-row]').length === 1 || !document.querySelector('#s-forms'));
    await p.reload();
    await p.waitForSelector('[data-today-list] [data-plan]');
    ok((await p.$$('#s-forms [data-form-row]')).length === 1, '"seen" is saved: only the other request is still shown');
    const studioJs = fs.readFileSync(require('path').join(__dirname, '..', 'dist', 'assets', 'js', 'studio.js'), 'utf8');
    const start = fs.readFileSync(require('path').join(__dirname, '..', 'dist', 'start.html'), 'utf8');
    ok(/fetch\('\/api\/form'/.test(studioJs) && /action="\/api\/form"/.test(start) && !/data-netlify/.test(start), 'website forms post to our own /api/form (no Netlify Forms)');
    // the real form on the website: fill it in like a visitor, land on the thank-you page, see it on the desk
    const v = await ctx.newPage();
    await v.goto(BASE + '/start.html');
    await v.fill('form[name="mockup-request"] [name="name"]', 'Mei');
    await v.fill('form[name="mockup-request"] [name="brand"]', 'Kopi Mei');
    await v.fill('form[name="mockup-request"] [name="instagram"]', '@kopi.mei');
    await v.fill('form[name="mockup-request"] [name="shop_url"]', 'https://instagram.com/kopi.mei');
    await v.check('form[name="mockup-request"] [name="consent"]');
    await Promise.all([v.waitForURL(/thanks/, { timeout: 15000 }), v.click('form[name="mockup-request"] button[type="submit"]')]);
    await v.close();
    ok(Object.values(JSON.parse(fs.readFileSync(STORE + '.forms.json', 'utf8'))).some((f) => f.fields.brand === 'Kopi Mei' && f.form === 'mockup-request'), 'filling in the website form lands on the thank-you page and the request reaches the desk');
  }

  // mockup views (2026-11-11): the mockup's password page reports opens to /api/track; the desk shows them
  {
    const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    const t = (q, h) => fetch(`${BASE}/api/track?${q}`, { method: 'POST', headers: { 'user-agent': UA_PHONE, ...(h || {}) } });
    const first = await t('s=m-kopi-test-1234abcd&e=gate&v=dev1&p=index.html');
    await t('s=m-kopi-test-1234abcd&e=view&v=dev1&p=index.html&h=pw');
    await t('s=m-kopi-test-1234abcd&e=view&v=dev1&p=shop.html&h=saved');
    await t('s=m-kopi-test-1234abcd&e=view&v=dev1&p=p%2Fkaya-toast.html&h=saved');
    await t('s=m-kopi-test-1234abcd&e=time&v=dev1&p=shop.html&sec=95');
    await t('s=m-kopi-test-1234abcd&e=view&v=me&p=index.html', { cookie: 'cs_staff=1' }); // Junyu himself
    await t('s=m-kopi-test-1234abcd&e=view&v=bot&p=index.html', { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0 Safari/537.36' }); // our checks
    await t('s=m-kopi-test-1234abcd&e=view&v=wa&p=index.html', { 'user-agent': 'WhatsApp/2.23.20.0 A' }); // link preview
    await t('s=..%2F..%2Fetc&e=view&v=x'); // not a mockup name
    await t('s=m-roti-test-1234abcd&e=gate&v=dev2&p=index.html'); // opened the link, no password yet
    ok(first.status === 204, 'tracking beacon answers 204 (no content)');
    const vf = JSON.parse(fs.readFileSync(STORE + '.views.json', 'utf8'));
    const kv = vf['m-kopi-test-1234abcd'] || {};
    ok(kv.views === 3 && kv.gates === 1 && kv.visits === 1 && kv.secs === 95 && kv.staff === 1 && Object.keys(kv.devices || {}).length === 1 && kv.devices.dev1.kind === 'mobile',
      'opens recorded per mockup (1 visit, 3 pages, 95 s, phone); the owner, our automated checks and WhatsApp link previews are not counted');
    ok(!Object.keys(vf).some((k) => /[/.]/.test(k)) && !JSON.stringify(vf).includes('127.0.0.1') && !/iPhone OS/.test(JSON.stringify(vf)), 'no IP address or full browser string stored; bad names ignored');
    await p.reload();
    await p.waitForSelector('[data-today-list] [data-plan]');
    ok(/cs_staff=1/.test(await p.evaluate(() => document.cookie)), 'opening the desk marks this device as ours (its own mockup opens are not counted)');
    ok(/刚看过样板/.test(await p.textContent('[data-plan]')), 'plan shows a "just viewed the mockup" chip');
    const kopi = await p.textContent('#s-viewed [data-viewed="p904"]');
    ok(/看过样板 1 次/.test(kopi) && /1 部手机/.test(kopi) && /3 页/.test(kopi) && /约 2 分钟/.test(kopi) && /首页、全部产品、Kaya Toast/.test(kopi) && /你自己看过 1 次（不算）/.test(kopi),
      'Today, "just viewed": visits, device, pages, minutes, which pages (owner\'s own opens shown separately)');
    const roti = await p.textContent('#s-viewed [data-viewed="p905"]');
    ok(/打开了链接，但还没输入密码/.test(roti) && /再发一次网址和密码/.test(roti), 'opened the link but no password yet: says so, suggests resending the password');
    await p.click('#s-viewed [data-viewed="p904"] [data-act="open-card"]');
    await p.waitForSelector('#l-p904');
    ok(!(await p.isHidden('[data-view="list"]')) && /看过样板 1 次/.test(await p.textContent('#l-p904')), '"Open card" goes to the full card, which shows the views too');
    await p.click('[data-filter="table"]');
    await p.waitForSelector('.pvtbl');
    ok(/打开过/.test(await p.textContent('.pvtbl thead')) && /1 次/.test(await p.textContent('.pvtbl [data-row="p904"]')) && /没输入密码/.test(await p.textContent('.pvtbl [data-row="p905"]')), 'mockup table has an "opened" column');
    await p.click('[data-filter="all"]');
    const r = await fetch(`${BASE}/api/desk`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-desk-key': KEY }, body: JSON.stringify({ action: 'chat', id: 'p904', text: '他们看了样板吗' }) });
    const callsV = await (await fetch('http://localhost:9920/__calls')).json();
    ok(r.ok && callsV[callsV.length - 1].views === true, 'the card\'s AI assistant knows whether they opened the mockup (and is told never to mention it to them)');
    await shot('views');
    await p.click('[data-tab="today"]');
  }

  // today's plan + 连续打电话 (2026-11-10): dial, read the script in their language, outcome, send the mockup on WhatsApp, next
  {
    const d6 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const base6 = { created: '2026-11-10', platform: 'other', store_url: '', instagram: '', whatsapp: '', email: '', niche: 'gelato', input: 'x', notes: '', brand_clear: true, sales_signal: true, active_social: true, no_or_weak_website: true, budget_signal: true, score: 5, fit: 'good', template: 'chili-pantry', touches: 0, history: [], language: 'en', observation: 'Opened late 2024' };
    d6.items.unshift({ ...base6, id: 'p907', business_name: 'Gelato Test', status: 'contacted', touches: 1, last_channel: 'ig', channels: ['ig'], first_contact_date: '2026-11-08', last_contact_date: '2026-11-08', next_followup_date: '2099-01-01', next_call_date: '2000-01-01', phone: '60172022162',
      preview_url: 'https://previews.cartsmithstudio.com/m-gelato-test-1234abcd/', preview_password: 'gelato5523', preview_delete_by: '2099-01-01', preview_slug: 'm-gelato-test-1234abcd', preview_msg: 'old', preview_checked: '2026-11-10', preview_pitch: { mode: 'pickup', items: ['Salted Pistachio', 'Affogato'] },
      preview_facts: { mode: 'pickup', place: '37, Jalan 20/16, Taman Paramount', hours: 'Tue-Sun from 12pm', delivery: '', products: [{ n: 'Medium Cup · Two Flavours', p: 20, per: '', cat: 'Cups', ex: false, set: '', src: 'From a Chiefeater review (2026)' }, { n: 'Take-Home Tub (example)', p: null, per: '', cat: 'Cups', ex: true, set: '', src: '' }], faq: [['Is it pork-free?', 'Yes.']], contact: '', sources: 'Malaysian Foodie (Mar 2025)' } });
    d6.items.unshift({ ...base6, id: 'p908', business_name: 'Nyonya Test', status: 'preview_sent', touches: 1, phone: '60122887449', next_followup_date: '2000-01-01',
      preview_url: 'https://previews.cartsmithstudio.com/m-nyonya-test-1234abcd/', preview_password: 'beng6840', preview_delete_by: '2099-01-01', preview_slug: 'm-nyonya-test-1234abcd', followup: '' });
    fs.writeFileSync(STORE, JSON.stringify(d6));
    await p.reload();
    await p.evaluate(() => { window.DESK_NOW = '2026-11-10T07:00:00Z'; }); // 15:00
    await p.click('[data-tab="list"]'); await p.click('[data-tab="today"]');
    await p.waitForSelector('[data-plan]');
    const plan = await p.textContent('[data-plan]');
    ok(/现在最适合打电话/.test(plan) && /开始连续打电话（\d+ 家）/.test(plan) && /今天已经：打了 \d+ 通电话/.test(plan), "today's plan: time advice, how many calls, what's done today");
    const s6 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items;
    const g = s6.find((x) => x.id === 'p907'), ny = s6.find((x) => x.id === 'p908');
    ok(/We messaged you on Instagram/.test(g.preview_msg) && g.preview_msg.includes('gelato5523'), 'shop already written to on Instagram: the mockup message says so');
    ok(ny.followup.includes('m-nyonya-test-1234abcd') && ny.followup.includes('beng6840') && /easy to find/.test(ny.followup) && !/[?？]/.test(ny.followup.replace(/https?:\/\/\S+/g, '')), 'mockup sent: the follow-up nudge is ready with the link (no AI needed)');
    await p.click('[data-act="cs-start"]');
    await p.waitForSelector('[data-cs="p907"]');
    const cs = await p.textContent('[data-cs="p907"]');
    ok(/连续打电话 · 1 \//.test(await p.textContent('[data-sheet-panel]')), 'call session starts with the callback that is due');
    ok(/May I speak to the owner/.test(cs) && /with your Salted Pistachio, Affogato, where customers can order and choose a pick-up date online/.test(cs) && /意思：你好，请问老板在吗/.test(cs), 'script in their language, with what is in their mockup, and the Chinese meaning under each line');
    ok(/多少钱/.test(cs) && /RM2,800/.test(cs) && /已经有网站/.test(cs) && /样板已检查 2026-11-10/.test(cs), 'usual answers (price, already have a website...) and the mockup-checked badge are on screen');
    ok(/拨打 \+60 17-202 2162/.test(cs), 'big dial button with the number');
    await p.click('[data-cs="p907"] .callout [data-act="cs-out"][data-out="ok"]');
    await p.waitForSelector('[data-cs="p907"] [data-act="cs-wa"]');
    const msg = await p.inputValue('[data-cs="p907"] textarea');
    ok(msg.includes('m-gelato-test-1234abcd') && msg.includes('gelato5523') && msg.includes('https://cartsmithstudio.com/') && !msg.includes('netlify.app'), 'yes on the phone: the message to send has the link and password already');
    const [csPop] = await Promise.all([p.waitForEvent('popup'), p.click('[data-cs="p907"] [data-act="cs-wa"]')]);
    ok(decodeURIComponent(csPop.url()).startsWith('https://wa.me/60172022162') || /whatsapp\.com/.test(csPop.url()), 'WhatsApp opens their number from the call session');
    await csPop.close();
    await p.click('[data-cs="p907"] [data-act="cs-sent"]');
    await p.waitForFunction(() => !document.querySelector('[data-cs="p907"]'));
    const g2 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p907');
    ok(g2.status === 'preview_sent' && g2.followup.includes('m-gelato-test-1234abcd') && !g2.call_ok, 'sent from the session: mockup recorded as sent, follow-up ready, then the next shop');
    const nextId = await p.getAttribute('[data-cs]', 'data-cs').catch(() => null);
    if (nextId) {
      await p.click(`[data-cs="${nextId}"] .callout [data-act="cs-out"][data-out="no_answer"]`);
      await p.waitForFunction((id) => !document.querySelector(`[data-cs="${id}"]`), nextId);
      const nx = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === nextId);
      ok(nx.call_misses >= 1 && nx.last_call_date, 'no answer in the session: recorded, moves on');
    }
    await shot('call-session');
    await p.click('.sheet__head [data-sheet-close]');
    await p.waitForFunction(() => document.querySelector('[data-sheet]').hidden);
    // the desk AI sees how our system works and what is on this customer's mockup
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="all"]');
    if (!(await p.$('#l-p907'))) await p.click('[data-expand="p907"]');
    await p.click('#l-p907 [data-act="ai"]');
    await p.waitForSelector('[data-ai-text]');
    await p.fill('[data-ai-text]', '对方问杯装多少钱，有没有外带一桶的？');
    await p.click('[data-act="ai-send"]');
    await p.waitForSelector('.ai__msg--ai');
    const calls7 = await (await fetch('http://localhost:9920/__calls')).json();
    const last7 = calls7[calls7.length - 1];
    ok(last7.brief && last7.facts, "AI gets 'how our system works' and the products / prices / Example items on this customer's mockup");
    ok(calls7.length > 0 && calls7.every((c) => c.brief), 'every AI task (analyse, follow-up, reply, assistant) gets the system brief');
    // no questions in customer messages (2026-11-10): the mock writes "…有没有想过…？", the desk rewrites / cleans it
    const st8 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items;
    const aiMsgs = st8.filter((x) => x.lead_id || x.id === 'p001').map((x) => x.message).filter(Boolean);
    ok(aiMsgs.length > 0 && aiMsgs.every((m) => !/[?？]/.test(m.replace(/https?:\/\/\S+/g, ''))), `AI-written messages have no questions (${aiMsgs.length} checked)`);
    ok(calls7.some((c) => /^Rewrite this customer message so it contains NO questions/.test(c.task)), 'a message that still had a question was sent back to the AI to rewrite');
    await p.click('[data-sheet-panel] [data-sheet-close]');
    await p.click('[data-tab="today"]');
  }

  // whole conversation (2026-11-09): what we sent, what they said, what the owner replied himself; "already has a website"
  {
    const sentP001 = (JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p001').history || []).filter((h) => h.e === 'sent');
    ok(sentP001.length > 0 && sentP001.some((h) => (h.n || '').length > 20), 'sent messages are recorded with their text, not just "sent"');
    const d4 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    d4.items.unshift({ id: 'p903', created: '2026-11-08', business_name: 'Yi Test Pastry', platform: 'shopee', store_url: '', instagram: 'yitest', whatsapp: '', email: '', niche: 'mooncakes', input: 'Mooncakes and CNY cookies', observation: 'Shopee mooncake picks 2026', notes: '', brand_clear: true, sales_signal: true, active_social: true, no_or_weak_website: true, budget_signal: false, score: 4, fit: 'good', template: 'chili-pantry', language: 'zh', status: 'contacted', touches: 1, first_contact_date: '2026-11-08', last_contact_date: '2026-11-08', next_followup_date: '2099-01-01', message: '你好 Yi Test', history: [{ d: '2026-11-08', e: 'sent', n: 'ig: 你好 Yi Test Pastry，我们是 Cartsmith Studio，想免费帮你们做一个首页样板' }] });
    fs.writeFileSync(STORE, JSON.stringify(d4));
    await p.reload();
    await p.click('[data-tab="list"]');
    await p.click('[data-filter="all"]');
    await p.click('[data-expand="p903"]');
    await p.click('#l-p903 [data-act="reply"]');
    await p.waitForSelector('[data-reply-ours]');
    await p.fill('[data-reply-text]', '目前我们已有网店喔\n好的👌');
    await p.fill('[data-reply-ours]', '谢谢你这么快回复，也恭喜你们已经有自己的网站了。那我们就不打扰了。祝生意兴隆。');
    await p.click('[data-act="reply-go"]');
    await p.waitForSelector('[data-sheet]', { state: 'hidden' });
    const hist = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p903').history.map((h) => h.e);
    ok(hist.indexOf('we_replied') > hist.indexOf('sent') && hist.indexOf('their_reply') > hist.indexOf('we_replied'), 'desk records both sides in order: our message, my own reply, their reply');
    const calls = await (await fetch('http://localhost:9920/__calls')).json();
    const full = (calls.filter((c) => c.full).pop() || {}).full || '';
    ok(/工作台发的）：ig: 你好 Yi Test Pastry/.test(full) && /自己在 IG \/ WhatsApp 回的）：谢谢你这么快回复/.test(full) && /目前我们已有网店喔/.test(full), 'AI gets the whole conversation, not only the last line');
    ok(/already have a website/.test(full) && /only acknowledges it/.test(full), 'AI is told not to pitch when they have a website, and that an "ok" after our close needs no reply');
    // close it: they already have a website
    await p.click('[data-tab="list"]');
    if (!(await p.$('#l-p903'))) await p.click('[data-expand="p903"]');
    await p.click('#l-p903 [data-act="more"]');
    await p.click('[data-sheet-panel] [data-act="has-site"]');
    await p.waitForTimeout(600);
    const y = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p903');
    ok(y.status === 'lost' && y.lost_reason === '已有网站' && !y.next_followup_date && y.no_or_weak_website === false, '"对方已经有网站" closes the lead: no more follow-ups, score updated');
    await p.click('[data-tab="today"]');
  }

  // no emoji anywhere in the interface (message boxes excluded: their text comes from the AI)
  const uiText = await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('textarea').forEach((t) => t.remove()); return c.innerText; });
  ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(uiText), 'no emoji in the desk interface');
  const fnSrc = fs.readFileSync(require('path').join(__dirname, '..', 'server', 'desk.mjs'), 'utf8');
  ok(/NEVER use a personal name/.test(fnSrc) && /No emojis/.test(fnSrc) && /sign off as "Cartsmith Studio"/.test(fnSrc), 'AI prompt: studio sign-off, no personal name, no emojis');
  await p.reload();
  await p.waitForSelector('#app:not([hidden])');
  ok(!(await p.$('[data-inbox]')), 'inbox stays empty after reload');

  // restore from the FULL backup (2026-11-12): AI conversations must survive a move to a new Netlify account
  {
    const api2 = (body) => fetch(`${BASE}/api/desk`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-desk-key': KEY }, body: JSON.stringify(body) }).then((r) => r.json());
    const bk = (await api2({ action: 'backup' })).backup;
    const withChat = bk.doc.items.filter((x) => (x.ai_chat || []).length);
    ok(withChat.length >= 1, `full backup has the AI conversations (${withChat.length} cards)`);
    const before = fs.readFileSync(STORE, 'utf8');
    // a) the new account's desk is empty
    fs.writeFileSync(STORE, JSON.stringify({ next: 1, items: [], settings: { dailyLimit: 10 } }));
    await p.reload();
    await p.click('[data-tab="stats"]');
    await p.setInputFiles('[data-restore-file]', { name: 'cartsmith-desk-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(bk, null, 1)) });
    await p.click('[data-restore]');
    await p.waitForFunction(() => /AI 对话也回来了/.test(document.body.textContent), null, { timeout: 15000 });
    const a = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    if (process.env.DESK_DEBUG) console.log('    restore:', a.items.length, bk.doc.items.length, a.next, bk.doc.next, JSON.stringify(a.settings), JSON.stringify(bk.doc.settings));
    ok(a.items.length === bk.doc.items.length && withChat.every((w) => same((a.items.find((x) => x.id === w.id) || {}).ai_chat, w.ai_chat)) && a.next >= bk.doc.next && same(a.settings, bk.doc.settings),
      'empty desk + full backup: every card, every AI conversation, settings and the next id are back');
    const w0 = withChat[0], a0 = a.items.find((x) => x.id === w0.id);
    ok(same(a0.history, w0.history) && a0.status === w0.status && (a0.preview_password || '') === (w0.preview_password || '') && (a0.ai_summary || '') === (w0.ai_summary || ''), 'history, status, mockup password and the AI summary are the same as before');
    // b) the desk already has the cards (e.g. restored from CSV earlier) but the conversations are gone
    const stripped = JSON.parse(before);
    stripped.items.forEach((x) => { delete x.ai_chat; delete x.ai_summary; });
    stripped.items = stripped.items.filter((x) => x.id !== bk.doc.items[bk.doc.items.length - 1].id);
    fs.writeFileSync(STORE, JSON.stringify(stripped));
    const r2 = await api2({ action: 'restore', backup: bk });
    const b2 = JSON.parse(fs.readFileSync(STORE, 'utf8'));
    ok(r2.added === 1 && r2.chats >= withChat.length - 1 && b2.items.length === bk.doc.items.length && withChat.every((w) => same((b2.items.find((x) => x.id === w.id) || {}).ai_chat, w.ai_chat)),
      'desk that already has the cards: conversations are put back, the missing card is added, nothing is duplicated');
    const bad = await api2({ action: 'restore', backup: { hello: 1 } });
    ok(bad.error === 'bad_input', 'a JSON file that is not a desk backup is refused');
    fs.writeFileSync(STORE, before);
    await p.reload();
    await p.click('[data-tab="stats"]');
  }

  // restore from a CSV backup (moving to a new Netlify account)
  await p.click('[data-tab="stats"]');
  await p.setInputFiles('[data-restore-file]', { name: 'backup.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await p.click('[data-restore]');
  await p.waitForFunction(() => /还原了 0 家/.test(document.querySelector('[data-toast]').textContent), null, { timeout: 10000 });
  ok(true, 'restoring the same backup skips everyone already in the list');
  const newRow = 'id,business_name,niche,platform,store_url,social_url,contact_channel,contact_handle,whatsapp,email,language,brand_clear,sales_signal,active_social,no_or_weak_website,budget_signal,score,observation,opening_line,status,first_contact_date,last_contact_date,next_followup_date,preview_url,preview_delete_by,notes,touches\n'
    + 'p950,"Restored Shop, KL",cafe,instagram,,https://instagram.com/restored.shop,instagram,@restored.shop,012-345 6789,,en,1,1,0,1,1,4,"Seen in ""Time Out""",Hi there,contacted,2026-11-01,2026-11-01,2026-11-11,,,,1\n';
  await p.setInputFiles('[data-restore-file]', { name: 'old-desk.csv', mimeType: 'text/csv', buffer: Buffer.from('﻿' + newRow) });
  await p.click('[data-restore]');
  await p.waitForFunction(() => /还原了 1 家/.test(document.querySelector('[data-toast]').textContent), null, { timeout: 10000 });
  const r1 = JSON.parse(fs.readFileSync(STORE, 'utf8')).items.find((x) => x.id === 'p950');
  ok(r1 && r1.business_name === 'Restored Shop, KL' && r1.instagram === 'restored.shop' && r1.status === 'contacted' && r1.touches === 1 && r1.whatsapp === '60123456789' && r1.next_followup_date === '2026-11-11' && r1.observation === 'Seen in "Time Out"', 'restored row keeps status, dates, contacts and quoted text');
  ok(JSON.parse(fs.readFileSync(STORE, 'utf8')).next > 950, 'next id moves past restored ids');

  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await b.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
