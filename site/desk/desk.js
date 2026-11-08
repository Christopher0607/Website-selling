/* Cartsmith 销售工作台 — 前端。资料都在 /api/desk（Netlify Function + Netlify Blobs）。
   Claude Code 找的商家会出现在「今天」最上面（新商家收件箱），按一下就加入名单。
   AI 只分析和起草；每条信息都由俊宇自己在 Instagram 按发送。 */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'cs_desk_key';
  const store = {
    get() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return this._k || ''; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch (e) { this._k = v; } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { this._k = ''; } }
  };
  const S = { items: [], inbox: [], settings: { dailyLimit: 10 }, today: '', tab: 'today', filter: 'all', q: '', open: {}, lastAdded: '', pending: '' };

  const STATUS = { new: '未联系', contacted: '已联系', replied: '有回复', preview_sent: '样板已发', call_booked: '约了通话', proposal_sent: '报价已发', won: '成交 🎉', lost: '没成交', no_response: '没回应', do_not_contact: '不再联系' };
  const CRIT = { brand_clear: '有自己的品牌和 logo', sales_signal: '卖得不错（评价多 / 常开直播）', active_social: '最近 7 天有发文', no_or_weak_website: '没有网站或网站很旧', budget_signal: '看得出有预算' };
  const TPL = { dewlane: 'Dewlane 护肤', plainfold: 'Plainfold 服装', 'chili-pantry': 'Little Chili Pantry 食品', lowlight: 'Lowlight Roasters 咖啡', tailmate: 'Tailmate 宠物', voltnest: 'Voltnest 3C' };
  const LANG = { zh: '中文', en: 'English', ms: 'BM' };
  const PLATFORM = { shopee: 'Shopee', tiktok: 'TikTok Shop', instagram: 'Instagram', website: '网站', other: '其他' };

  // ------------------------------------------------------------ api
  async function api(action, payload) {
    const r = await fetch('/api/desk', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-desk-key': store.get() }, body: JSON.stringify(Object.assign({ action }, payload || {})) });
    let j = {};
    try { j = await r.json(); } catch (e) { /* not json */ }
    if (r.status === 401 || r.status === 429) { showLogin(j.message || '请重新登录'); throw new Error(j.message || 'unauthorised'); }
    if (!r.ok) throw new Error(j.message || ('出错了（' + r.status + '）'));
    return j;
  }
  function upsert(item) {
    const i = S.items.findIndex((x) => x.id === item.id);
    if (i >= 0) S.items[i] = item; else S.items.unshift(item);
  }

  // ------------------------------------------------------------ ui helpers
  let toastT;
  function toast(msg) { const t = $('[data-toast]'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).catch(() => fallbackCopy(text)); } else fallbackCopy(text);
  }
  function fallbackCopy(text) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); }
  const igLink = (h) => h ? 'https://ig.me/m/' + encodeURIComponent(h) : '';
  function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || '处理中…'; btn.disabled = true; } else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; } }
  function sentToday() { return S.items.filter((p) => p.first_contact_date === S.today).length; }
  function scoreClass(n) { return n >= 4 ? 'score--hi' : n >= 3 ? 'score--mid' : 'score--lo'; }

  // ------------------------------------------------------------ card
  function card(p, mode) {
    const handle = p.instagram ? '@' + p.instagram : '';
    const sub = [handle, PLATFORM[p.platform], p.niche, p.store_url ? `<a href="${esc(p.store_url)}" target="_blank" rel="noopener">店铺</a>` : ''].filter(Boolean).map((x) => (x.startsWith('<a') ? x : esc(x))).join(' · ');
    const tags = [`<span class="tag tag--status">${esc(STATUS[p.status] || p.status)}</span>`];
    if (p.template) tags.push(`<span class="tag">建议模板：${esc(TPL[p.template] || p.template)}</span>`);
    if (p.language) tags.push(`<span class="tag">${esc(LANG[p.language] || p.language)}</span>`);
    if (p.lead_id) tags.push(`<span class="tag tag--lead">Claude Code 找的${p.priority ? ' · ' + esc(p.priority) + ' 级' : ''}</span>`);
    if (p.duplicate_of) tags.push(`<span class="tag tag--warn">可能重复（${esc(p.duplicate_of)}）</span>`);
    if (p.next_followup_date) tags.push(`<span class="tag">跟进：${esc(p.next_followup_date)}</span>`);
    if (p.preview_delete_by && p.status !== 'won') tags.push(`<span class="tag tag--warn">样板删除：${esc(p.preview_delete_by)}</span>`);
    if (!p.instagram) tags.push('<span class="tag tag--warn">没有 IG（点「编辑资料」补上）</span>');

    let body = '';
    const due = p.next_followup_date && p.next_followup_date <= S.today;
    if (mode === 'analysis') {
      body += `<ul class="crit">${Object.keys(CRIT).map((k) => `<li class="${p[k] ? 'on' : ''}">${CRIT[k]}</li>`).join('')}</ul>`;
      if (p.criteria_note) body += `<p class="note">${esc(p.criteria_note)}</p>`;
      if (p.fit_reason) body += `<p class="note"><b>${p.fit === 'skip' ? '建议跳过' : p.fit === 'maybe' ? '可以试试' : '值得联系'}：</b>${esc(p.fit_reason)}</p>`;
    }
    if (p.observation) body += `<p class="obs">${esc(p.observation)}</p>`;
    if (p.verify && p.status === 'new') body += `<p class="verify">📌 发之前看一眼：${esc(p.verify)}</p>`;

    if (p.status === 'new') {
      body += msgBox(p, 'message', '开场白（可以直接改）');
      body += `<div class="btnrow">${sendBtn(p, 'message')}<button class="btn btn--ok btn--sm" data-act="sent" data-id="${p.id}">✓ 已发送</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
    } else if (p.status === 'replied') {
      if (p.draft_reply) {
        body += `<div class="draft"><b>对方意思：</b>${esc(p.reply_summary || '')}<br><b>下一步：</b>${esc(p.reply_next || '')}</div>`;
        body += msgBox(p, 'draft_reply', 'AI 起草的回信（看过再发）');
        body += `<div class="btnrow">${sendBtn(p, 'draft_reply')}<button class="btn btn--ghost btn--sm" data-act="replied-more" data-id="${p.id}">记录进度</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
      } else {
        body += `<div class="btnrow"><button class="btn btn--sm" data-act="reply" data-id="${p.id}">贴上对方的回复 → AI 起草回信</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
      }
    } else if (['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && (due || mode === 'full')) {
      if (p.followup) {
        body += msgBox(p, 'followup', p.status === 'contacted' ? (p.touches <= 1 ? '第 2 条：给一个有用的资讯' : '最后一条') : '跟进信息');
        body += `<div class="btnrow">${sendBtn(p, 'followup')}<button class="btn btn--ok btn--sm" data-act="sent" data-id="${p.id}">✓ 已发送</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
      } else {
        body += `<div class="btnrow"><button class="btn btn--sm" data-act="followup" data-id="${p.id}">AI 写跟进信息</button><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">对方有回复</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
      }
    } else {
      body += `<div class="btnrow"><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">对方有回复</button><button class="btn btn--ghost btn--sm" data-act="more" data-id="${p.id}">⋯ 更多</button></div>`;
    }
    return `<article class="card" id="${mode === 'analysis' ? 'a' : 'c'}-${p.id}" data-card="${p.id}"><div class="card__top"><div><div class="card__name">${esc(p.business_name)} <small class="card__sub">${esc(p.id)}</small></div><div class="card__sub">${sub}</div></div><div class="score ${scoreClass(p.score)}" title="分数（5 分满分）">${p.score}/5</div></div><div class="tags">${tags.join('')}</div>${body}</article>`;
  }
  function msgBox(p, field, label) { return `<div class="msg"><label>${esc(label)}</label><textarea data-field="${field}" data-id="${p.id}">${esc(p[field] || '')}</textarea></div>`; }
  function sendBtn(p, field) {
    return p.instagram ? `<button class="btn btn--ember btn--sm" data-act="copyopen" data-field="${field}" data-id="${p.id}">复制并打开 IG 私信</button>` : `<button class="btn btn--ember btn--sm" data-act="copyonly" data-field="${field}" data-id="${p.id}">复制信息</button>`;
  }
  function mini(p) {
    return `<div class="mini" data-expand="${p.id}"><div class="mini__l"><b>${esc(p.business_name)}</b><small>${esc([p.instagram ? '@' + p.instagram : '', STATUS[p.status], p.next_followup_date ? '跟进 ' + p.next_followup_date : ''].filter(Boolean).join(' · '))}</small></div><div class="score ${scoreClass(p.score)}">${p.score}</div></div>${S.open[p.id] ? card(p, 'full') : ''}`;
  }

  // ------------------------------------------------------------ views
  function renderToday() {
    const limit = S.settings.dailyLimit || 10;
    const left = Math.max(0, limit - sentToday());
    const fresh = S.items.filter((p) => p.status === 'new' && p.score >= 3 && p.fit !== 'skip' && !p.duplicate_of).sort((a, b) => b.score - a.score);
    const follow = S.items.filter((p) => ['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && p.next_followup_date && p.next_followup_date <= S.today);
    const replied = S.items.filter((p) => p.status === 'replied');
    const purge = S.items.filter((p) => p.preview_delete_by && p.preview_delete_by <= S.today && p.status !== 'won');
    let h = '';
    if (S.inbox.length) h += inboxSect();
    if (replied.length) h += sect('有回复，等你回', replied.length, replied.map((p) => card(p)).join(''), '');
    if (follow.length) h += sect('今天要跟进', follow.length, follow.map((p) => card(p)).join(''), '');
    h += sect(`新联系 · 今天还可以发 ${left} 个`, fresh.length, left ? fresh.slice(0, Math.max(left, 1) + 2).map((p) => card(p)).join('') : '<div class="empty">今天的新联系已经发满了 👍 明天继续。</div>', '名单里没有待联系的商家 → 去「加商家」加几个');
    if (purge.length) h += sect('样板到期，要删除', purge.length, purge.map((p) => `<div class="card"><b>${esc(p.business_name)}</b> 的样板 ${esc(p.preview_url || '')} 已到期（${esc(p.preview_delete_by)}）。到 Netlify 删除那个网站，然后按：<div class="btnrow"><button class="btn btn--sm" data-act="purged" data-id="${p.id}">已删除样板</button></div></div>`).join(''), '');
    $('[data-today-list]').innerHTML = h;
  }
  function inboxSect() {
    const rows = S.inbox.map((l) => `<li><div><b>${esc(l.name)}</b>${l.priority ? ` <span class="tag">${esc(l.priority)} 级</span>` : ''}${l.instagram ? ` <small>@${esc(l.instagram)}</small>` : ' <small class="warnt">还没找到 IG</small>'}<br><small>${esc(l.why)}</small></div><button class="btn btn--ghost btn--sm" data-act="skip-lead" data-lead="${esc(l.id)}">跳过</button></li>`).join('');
    return `<section class="sect inbox" data-inbox><div class="sect__head"><h2>新商家 · Claude Code 找的</h2><small>${S.inbox.length}</small></div>
      <div class="card"><p class="hint">资料已经整理好。按下面的按钮，AI 会逐家打分、写好开场白，放进「新联系」。不合适的先按「跳过」。</p>
      <ul class="inbox__list">${rows}</ul>
      <button class="btn btn--block" data-act="import-all">全部加入（${S.inbox.length} 家，约 ${Math.max(1, Math.round(S.inbox.length * 8 / 60))} 分钟）</button></div></section>`;
  }
  function sect(title, n, inner, emptyMsg) {
    return `<section class="sect"><div class="sect__head"><h2>${esc(title)}</h2><small>${n}</small></div>${inner || (emptyMsg ? `<div class="empty">${esc(emptyMsg)}</div>` : '')}</section>`;
  }
  const FILTERS = [['all', '全部'], ['new', '未联系'], ['contacted', '已联系'], ['replied', '有回复'], ['preview_sent', '样板'], ['won', '成交'], ['low', '低分'], ['do_not_contact', '不再联系']];
  function renderList() {
    $('[data-filters]').innerHTML = FILTERS.map(([k, l]) => `<button class="chip${S.filter === k ? ' is-on' : ''}" data-filter="${k}">${l}</button>`).join('');
    const q = S.q.trim().toLowerCase();
    const items = S.items.filter((p) => {
      if (S.filter === 'low') { if (!(p.score < 3 || p.fit === 'skip')) return false; } else if (S.filter !== 'all' && p.status !== S.filter) return false;
      return !q || [p.business_name, p.instagram, p.niche, p.id].join(' ').toLowerCase().includes(q);
    });
    $('[data-all-list]').innerHTML = items.length ? items.map(mini).join('') : '<div class="empty">没有符合的商家</div>';
  }
  function renderStats() {
    const it = S.items;
    const week = new Date(Date.now() + 8 * 3600e3 - 7 * 86400e3).toISOString().slice(0, 10);
    const reached = (st) => it.filter((p) => (p.history || []).some((h) => h.e === st) || p.status === st).length;
    const contacted = it.filter((p) => p.touches > 0).length;
    const replied = it.filter((p) => (p.history || []).some((h) => h.e === 'their_reply' || h.e === 'replied')).length;
    const rows = [['联系过', contacted], ['有回复', replied], ['发了样板', reached('preview_sent')], ['约了通话', reached('call_booked')], ['发了报价', reached('proposal_sent')], ['成交', reached('won')]];
    const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
    let weakest = '';
    if (contacted >= 20) {
      if (replied / contacted < 0.1) weakest = '回复率偏低 → 开场白的「具体观察」要更具体，或换一类商家试试';
      else if (reached('preview_sent') < replied * 0.4) weakest = '有回复但很少要样板 → 回信时先用费用计算器算给对方看，再提免费样板';
      else if (reached('won') === 0 && reached('proposal_sent') >= 3) weakest = '有报价没成交 → 想想价格、信任感（首批优惠、分两期付款）';
    }
    $('[data-stats]').innerHTML = `<h2>数字</h2>
      <div class="statgrid"><div class="stat"><b>${it.length}</b><small>名单总数</small></div><div class="stat"><b>${it.filter((p) => p.first_contact_date && p.first_contact_date >= week).length}</b><small>过去 7 天新联系</small></div><div class="stat"><b>${pct(replied, contacted)}</b><small>回复率</small></div><div class="stat"><b>${it.filter((p) => p.status === 'do_not_contact').length}</b><small>不再联系（正常，尊重对方）</small></div></div>
      <div class="funnel">${rows.map(([l, n], i) => `<div><span>${l}</span><b>${n}${i ? ' · ' + pct(n, rows[i - 1][1]) : ''}</b></div>`).join('')}</div>
      ${weakest ? `<p class="draft"><b>最弱的一步：</b>${esc(weakest)}</p>` : '<p class="hint">联系满 20 个之后，这里会提示你哪一步最需要改进。</p>'}`;
    $('[data-limit]').value = S.settings.dailyLimit || 10;
  }
  function render() {
    $('[data-today]').textContent = S.today;
    const n = sentToday();
    const pill = $('[data-sent-count]');
    pill.textContent = `今天新联系 ${n}/${S.settings.dailyLimit || 10}`;
    pill.classList.toggle('is-full', n >= (S.settings.dailyLimit || 10));
    const added = S.items.find((x) => x.id === S.lastAdded);
    const ar = $('[data-add-result] .card');
    if (added && ar) ar.outerHTML = card(added, 'analysis');
    if (S.tab === 'today') renderToday();
    if (S.tab === 'list') renderList();
    if (S.tab === 'stats') renderStats();
  }

  // ------------------------------------------------------------ "sent?" bar after copy & open
  function showSentbar(p) {
    S.pending = p.id;
    const bar = $('[data-sentbar]');
    $('[data-sentbar-text]', bar).textContent = `发给 ${p.business_name} 了吗？`;
    $('[data-sentbar-yes]', bar).dataset.id = p.id;
    bar.hidden = false;
  }
  function hideSentbar() { S.pending = ''; $('[data-sentbar]').hidden = true; const y = $('[data-sentbar-yes]'); y.disabled = false; y.textContent = '✓ 已发送'; delete y.dataset.label; }

  // ------------------------------------------------------------ sheet (more actions)
  function sheet(html) { $('[data-sheet-panel]').innerHTML = html; $('[data-sheet]').hidden = false; }
  function closeSheet() { $('[data-sheet]').hidden = true; }
  function moreSheet(p) {
    sheet(`<h3>${esc(p.business_name)}</h3>
      <div class="sheet__grid">
        <button class="btn btn--ghost" data-act="rewrite" data-lang="zh" data-id="${p.id}">用中文重写</button>
        <button class="btn btn--ghost" data-act="rewrite" data-lang="en" data-id="${p.id}">用英文重写</button>
        <button class="btn btn--ghost" data-act="rewrite" data-lang="ms" data-id="${p.id}">用马来文重写</button>
        <button class="btn btn--ghost" data-act="rewrite" data-hint="更短、更口语" data-id="${p.id}">写得更短</button>
      </div>
      <button class="btn btn--ghost" data-act="reply" data-id="${p.id}">💬 对方回复了（贴上回复）</button>
      <button class="btn btn--ghost" data-act="preview" data-id="${p.id}">🖼️ 样板已发（填网址）</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="call_booked" data-id="${p.id}">📞 约了通话</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="proposal_sent" data-id="${p.id}">📄 报价已发</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="won" data-id="${p.id}">🎉 成交</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="lost" data-id="${p.id}">没成交</button>
      <button class="btn btn--ghost" data-act="dnc" data-id="${p.id}">🚫 对方说不要（永远不再联系）</button>
      <button class="btn btn--ghost" data-act="edit" data-id="${p.id}">✏️ 编辑资料</button>
      ${['do_not_contact', 'lost', 'no_response'].includes(p.status) ? `<button class="btn btn--ghost" data-act="mark" data-ev="reopen" data-id="${p.id}">重新打开</button>` : ''}
      <button class="btn btn--ghost" data-act="delete" data-id="${p.id}">🗑️ 删除（加错了才用）</button>
      <button class="btn" data-sheet-close>关闭</button>`);
  }
  function repliedSheet(p) {
    sheet(`<h3>回信发出后，现在进度是？</h3>
      <button class="btn btn--ghost" data-act="mark" data-ev="sent" data-id="${p.id}">已回复，等对方</button>
      <button class="btn btn--ghost" data-act="preview" data-id="${p.id}">🖼️ 样板已发</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="call_booked" data-id="${p.id}">📞 约了通话</button>
      <button class="btn btn--ghost" data-act="mark" data-ev="proposal_sent" data-id="${p.id}">📄 报价已发</button>
      <button class="btn btn--ghost" data-act="dnc" data-id="${p.id}">🚫 对方说不要</button>
      <button class="btn" data-sheet-close>关闭</button>`);
  }
  function replySheet(p) {
    sheet(`<h3>${esc(p.business_name)} 回了什么？</h3><p class="hint">把对方在 Instagram 的回复复制贴上。AI 会判断对方的意思，写好回信给你看。</p>
      <textarea rows="6" data-reply-text maxlength="2000" placeholder="贴上对方的回复"></textarea>
      <button class="btn" data-act="reply-go" data-id="${p.id}">AI 起草回信</button><button class="btn btn--ghost" data-sheet-close>取消</button>`);
  }
  function editSheet(p) {
    sheet(`<h3>编辑 ${esc(p.business_name)}</h3>
      <label>店名<input type="text" data-e="business_name" value="${esc(p.business_name)}"></label>
      <label>Instagram（不用 @）<input type="text" data-e="instagram" value="${esc(p.instagram)}"></label>
      <label>店铺链接<input type="url" data-e="store_url" value="${esc(p.store_url)}"></label>
      <label>卖什么<input type="text" data-e="niche" value="${esc(p.niche)}"></label>
      <label>具体观察<textarea rows="3" data-e="observation">${esc(p.observation)}</textarea></label>
      <label>备注<textarea rows="2" data-e="notes">${esc(p.notes || '')}</textarea></label>
      <div class="hint">分数条件：</div>
      ${Object.keys(CRIT).map((k) => `<label style="display:flex;gap:8px;align-items:center;font-weight:500"><input type="checkbox" data-e="${k}" ${p[k] ? 'checked' : ''}> ${CRIT[k]}</label>`).join('')}
      <button class="btn" data-act="edit-save" data-id="${p.id}">保存</button><button class="btn btn--ghost" data-sheet-close>取消</button>`);
  }

  // ------------------------------------------------------------ events
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-act],[data-tab],[data-filter],[data-expand],[data-sheet-close]');
    if (!t) return;
    if (t.hasAttribute('data-sheet-close')) { closeSheet(); return; }
    if (t.dataset.tab) { S.tab = t.dataset.tab; $$('[data-tab]').forEach((b) => b.classList.toggle('is-on', b === t)); $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== S.tab; }); render(); window.scrollTo(0, 0); return; }
    if (t.dataset.filter) { S.filter = t.dataset.filter; renderList(); return; }
    if (t.dataset.expand) { S.open[t.dataset.expand] = !S.open[t.dataset.expand]; renderList(); return; }
    const p = S.items.find((x) => x.id === t.dataset.id);
    const act = t.dataset.act;
    try {
      if (act === 'copyopen' || act === 'copyonly') {
        const box = (t.closest('.card') || document).querySelector(`textarea[data-field="${t.dataset.field}"]`);
        const text = box ? box.value : p[t.dataset.field];
        copy(text);
        if (act === 'copyopen') window.open(igLink(p.instagram), '_blank', 'noopener');
        toast('已复制 ✓ 在 Instagram 长按 → 贴上 → 看一遍再按发送。');
        if (['message', 'followup', 'draft_reply'].includes(t.dataset.field)) showSentbar(p);
        return;
      }
      if (act === 'sentbar-no') { hideSentbar(); return; }
      if (act === 'skip-lead') {
        const id = t.dataset.lead;
        busy(t, true, '…');
        await api('skip', { lead_id: id });
        S.inbox = S.inbox.filter((l) => l.id !== id); render(); toast('已跳过'); return;
      }
      if (act === 'import-all') {
        const todo = S.inbox.slice();
        let done = 0; const failed = [];
        t.disabled = true;
        for (const l of todo) {
          t.textContent = `AI 正在处理 ${done + failed.length + 1}/${todo.length}：${l.name}…`;
          try { const j = await api('import', { lead_id: l.id }); upsert(j.item); done++; } catch (e) { if (e.message === 'unauthorised') throw e; failed.push(l); }
        }
        S.inbox = failed;
        render();
        toast(failed.length ? `加入了 ${done} 家；${failed.length} 家失败，可以再按一次` : `✓ 加入了 ${done} 家，开场白都写好了`);
        return;
      }
      if (act === 'more') { moreSheet(p); return; }
      if (act === 'replied-more') { repliedSheet(p); return; }
      if (act === 'reply') { replySheet(p); return; }
      if (act === 'edit') { editSheet(p); return; }
      if (act === 'preview') {
        const url = prompt('样板网址（Netlify Drop 的网址）：', p.preview_url || 'https://');
        if (url === null) return;
        const j = await api('mark', { id: p.id, event: 'preview_sent', url });
        upsert(j.item); closeSheet(); render(); toast('已记录：14 天后提醒你删除样板'); return;
      }
      if (act === 'dnc') {
        if (!confirm(`确定 ${p.business_name} 说不要？之后永远不会再出现在联系清单。`)) return;
        const j = await api('mark', { id: p.id, event: 'dnc' }); upsert(j.item); closeSheet(); render(); toast('已标记不再联系'); return;
      }
      if (act === 'delete') {
        if (!confirm(`删除 ${p.business_name}？（只有加错了才删除；对方说不要请用「不再联系」）`)) return;
        await api('delete', { id: p.id }); S.items = S.items.filter((x) => x.id !== p.id); closeSheet(); render(); toast('已删除'); return;
      }
      if (act === 'purged') { const j = await api('mark', { id: p.id, event: 'preview_deleted' }); upsert(j.item); render(); toast('已记录：样板删除了'); return; }
      busy(t, true, act === 'reply-go' || act === 'followup' || act === 'rewrite' ? 'AI 写作中…' : '保存中…');
      let j;
      if (act === 'sent') { j = await api('mark', { id: p.id, event: 'sent' }); if (S.pending === p.id) hideSentbar(); toast(j.item.next_followup_date ? `已记录 ✓ ${j.item.next_followup_date} 会提醒你跟进` : '已记录 ✓'); }
      else if (act === 'mark') { j = await api('mark', { id: p.id, event: t.dataset.ev }); toast('已记录 ✓'); }
      else if (act === 'followup') j = await api('followup', { id: p.id });
      else if (act === 'rewrite') j = await api('rewrite', { id: p.id, language: t.dataset.lang || '', hint: t.dataset.hint || '' });
      else if (act === 'reply-go') { const text = $('[data-reply-text]').value; j = await api('reply', { id: p.id, text }); }
      else if (act === 'edit-save') {
        const fields = {};
        $$('[data-e]').forEach((el) => { fields[el.dataset.e] = el.type === 'checkbox' ? el.checked : el.value; });
        j = await api('update', { id: p.id, fields });
      }
      if (j && j.item) upsert(j.item);
      closeSheet(); render();
      if (act === 'rewrite' || act === 'followup' || act === 'reply-go') { const c = document.getElementById('c-' + p.id); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch (e) { busy(t, false); if (e.message !== 'unauthorised') toast('⚠ ' + e.message); }
  });

  // save edited messages when leaving the textarea
  document.addEventListener('change', async (ev) => {
    const ta = ev.target.closest('textarea[data-field]');
    if (!ta) return;
    const p = S.items.find((x) => x.id === ta.dataset.id);
    if (!p || p[ta.dataset.field] === ta.value) return;
    try { const j = await api('update', { id: p.id, fields: { [ta.dataset.field]: ta.value } }); upsert(j.item); toast('已保存修改'); } catch (e) { toast('⚠ ' + e.message); }
  });

  $('[data-add]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = $('#add-in').value.trim();
    const btn = ev.target.querySelector('button[type=submit]');
    const out = $('[data-add-result]');
    busy(btn, true, 'AI 分析中…（约 5–10 秒）');
    out.innerHTML = '<div class="loading">AI 正在看资料、打分、写开场白…</div>';
    try {
      const j = await api('analyze', { input, language: $('[data-add-lang]').value });
      upsert(j.item);
      S.lastAdded = j.item.id;
      out.innerHTML = `<p class="hint">✓ 已加入名单（${esc(j.item.id)}）。${j.item.score >= 3 && j.item.fit !== 'skip' ? '它会出现在「今天」的新联系里。' : '分数偏低，建议先跳过（在「名单 → 低分」找得到）。'}</p>` + card(j.item, 'analysis');
      $('#add-in').value = '';
      render();
    } catch (e) { out.innerHTML = ''; if (e.message !== 'unauthorised') toast('⚠ ' + e.message); }
    busy(btn, false);
  });

  $('[data-search]').addEventListener('input', (e) => { S.q = e.target.value; renderList(); });
  $('[data-save-limit]').addEventListener('click', async () => { try { const j = await api('settings', { dailyLimit: $('[data-limit]').value }); S.settings = j.settings; render(); toast('已保存'); } catch (e) { toast('⚠ ' + e.message); } });
  $('[data-export]').addEventListener('click', async () => {
    try {
      const j = await api('export');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + j.csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `prospects-${S.today}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast('⚠ ' + e.message); }
  });
  $('[data-logout]').addEventListener('click', () => { store.clear(); location.reload(); });

  // ------------------------------------------------------------ login + load
  function showLogin(msg) {
    $('#app').hidden = true; $('#login').hidden = false;
    const err = $('[data-login-err]'); err.hidden = !msg; err.textContent = msg || '';
    setTimeout(() => $('#pw').focus(), 50);
  }
  $('[data-login]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    store.set($('#pw').value.trim());
    await load();
  });
  async function load() {
    try {
      const j = await api('list');
      S.items = j.items || []; S.inbox = j.inbox || []; S.settings = j.settings || S.settings; S.today = j.today;
      $('#login').hidden = true; $('#app').hidden = false;
      render();
    } catch (e) {
      if (e.message !== 'unauthorised') showLogin(e.message.includes('SALES_DESK_KEY') ? e.message : '连不上工作台：' + e.message);
    }
  }
  if (store.get()) load(); else showLogin('');
})();
