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
  p.on('pageerror', (e) => errors.push(e.message));
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
  const leadsTotal = (await import('../netlify/functions/desk/inbox.mjs')).INBOX.length;
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
    ok(/今天要打电话/.test(await p.textContent('[data-today-list]')), 'due call appears under 今天要打电话');
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

  // no emoji anywhere in the interface (message boxes excluded: their text comes from the AI)
  const uiText = await p.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('textarea').forEach((t) => t.remove()); return c.innerText; });
  ok(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(uiText), 'no emoji in the desk interface');
  const fnSrc = fs.readFileSync(require('path').join(__dirname, '..', 'netlify', 'functions', 'desk', 'index.mjs'), 'utf8');
  ok(/NEVER use a personal name/.test(fnSrc) && /No emojis/.test(fnSrc) && /sign off as "Cartsmith Studio"/.test(fnSrc), 'AI prompt: studio sign-off, no personal name, no emojis');
  await p.reload();
  await p.waitForSelector('#app:not([hidden])');
  ok(!(await p.$('[data-inbox]')), 'inbox stays empty after reload');

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
