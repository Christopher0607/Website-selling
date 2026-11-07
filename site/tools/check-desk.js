// 测试销售工作台：登录 → 加商家（AI 分析）→ 复制并打开 IG → 已发送 → 跟进 → 对方回复 → 样板 → 不再联系 → 名单 / 数字 / 导出
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
  ok(/Junyu/.test(await p.inputValue('[data-add-result] textarea[data-field="message"]')), 'opening message drafted');
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
  fs.writeFileSync(STORE, JSON.stringify(doc));
  await p.reload();
  await p.waitForSelector('#c-p001 [data-act="followup"]');
  ok(true, 'p001 appears under follow-ups when due');
  await p.click('#c-p001 [data-act="followup"]');
  await p.waitForSelector('#c-p001 textarea[data-field="followup"]');
  ok(true, 'AI follow-up drafted');
  await p.click('#c-p001 [data-act="sent"]');
  await p.waitForTimeout(500);

  // their reply → AI draft → back to waiting
  await p.click('[data-tab="list"]');
  await p.click('[data-expand="p001"]');
  await p.click('#c-p001 [data-act="reply"]');
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

  ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await b.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
