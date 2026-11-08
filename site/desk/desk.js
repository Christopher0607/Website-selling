/* Cartsmith 销售工作台 — 前端。资料都在 /api/desk（Netlify Function + Netlify Blobs）。
   Claude Code 找的商家会出现在「今天」最上面（新商家收件箱），按一下就加入名单。
   发送：Instagram（复制并打开私信）、WhatsApp（wa.me 预先填好信息）、Email（mailto 预先填好主旨和内容）。
   AI 只分析和起草；每条信息都由俊宇自己按发送。 */
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
  const S = { items: [], inbox: [], settings: { dailyLimit: 10 }, today: '', tab: 'today', filter: 'all', q: '', open: {}, lastAdded: '', pending: '', queue: [], qi: 0, qch: '', qsent: 0, queueOn: false };

  const STATUS = { new: '未联系', contacted: '已联系', replied: '有回复', preview_sent: '样板已发', call_booked: '约了通话', proposal_sent: '报价已发', won: '成交', lost: '没成交', no_response: '没回应', do_not_contact: '不再联系' };
  const CRIT = { brand_clear: '有自己的品牌', sales_signal: '卖得不错 / 有报道', active_social: '最近有在发文', no_or_weak_website: '没有网站或网站很旧', budget_signal: '看得出有预算' };
  const TPL = { dewlane: 'Dewlane', plainfold: 'Plainfold', 'chili-pantry': 'Little Chili Pantry', lowlight: 'Lowlight', tailmate: 'Tailmate', voltnest: 'Voltnest' };
  const LANG = { zh: '中文', en: 'English', ms: 'BM' };
  const PLATFORM = { shopee: 'Shopee', tiktok: 'TikTok Shop', instagram: 'Instagram', website: '网站', other: '其他' };
  const CH = { ig: 'Instagram', wa: 'WhatsApp', email: 'Email', call: '电话' };

  // ------------------------------------------------------------ icons (inline SVG, stroke = currentColor)
  const I = {
    today: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.6.7 2.6 2.3 3 4.7"/>',
    chart: '<path d="M5 20V11M12 20V5M19 20v-6M3 20h18"/>',
    ig: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/>',
    wa: '<path d="M4.5 19.5l1.3-3.7A8 8 0 1 1 8.4 18.4z"/><path d="M9.3 8.6c.3-.4.6-.5 1-.5h.4c.2 0 .4.1.5.4l.6 1.4c.1.3 0 .5-.2.7l-.4.5a5.6 5.6 0 0 0 2.3 2.3l.5-.4c.2-.2.5-.3.7-.2l1.4.6c.3.1.4.3.4.5v.4c0 .4-.2.8-.6 1-.7.3-1.7.3-3-.4a7.6 7.6 0 0 1-3.3-3.3c-.6-1.3-.7-2.3-.3-3z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    reply: '<path d="M10 8L5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    file: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M9.5 12h6M9.5 16h6"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 16l5-5 4 4 3-3 5 5"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    star: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    pen: '<path d="M4 20h16"/><path d="M14.5 5.5l3 3L9 17H6v-3z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'
  };
  const svg = (n, size) => `<svg class="ic" viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

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
  const waLink = (n, text) => 'https://wa.me/' + encodeURIComponent(n) + '?text=' + encodeURIComponent(text);
  const SUBJECT = { en: (n) => `A quick idea for ${n}`, zh: (n) => `关于 ${n} 网上接单的一个想法`, ms: (n) => `Satu idea untuk ${n}` };
  const mailLink = (p, text) => 'mailto:' + p.email + '?subject=' + encodeURIComponent((SUBJECT[p.language] || SUBJECT.en)(p.business_name)) + '&body=' + encodeURIComponent(text);
  const fmtWa = (n) => n ? '+' + n.replace(/^(60)(1\d)(\d{3,4})(\d{4})$/, '$1 $2-$3 $4') : '';
  function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.label = btn.innerHTML; btn.textContent = label || '处理中…'; btn.disabled = true; } else { if (btn.dataset.label) btn.innerHTML = btn.dataset.label; btn.disabled = false; } }
  function sentToday() { return S.items.filter((p) => p.first_contact_date === S.today).length; }
  function scoreClass(n) { return n >= 4 ? 'score--hi' : n >= 3 ? 'score--mid' : 'score--lo'; }
  function textOf(t, p) { const box = (t.closest('.card, .q') || document).querySelector(`textarea[data-field="${t.dataset.field}"]`); return box ? box.value : p[t.dataset.field]; }

  // ------------------------------------------------------------ phone calls + good hours (2026-11-09)
  const callNo = (p) => p.phone || p.whatsapp || '';
  const fmtPhone = (n) => !n ? '' : /^601/.test(n) ? fmtWa(n) : '+' + n.replace(/^(60)([2-9])(\d{3,4})(\d{4})$/, '$1 $2-$3 $4');
  const callBtn = (p) => `<button class="btn btn--sm ch ch--call" data-act="call" data-id="${p.id}">${svg('phone', 16)}打电话</button>`;
  const callDue = (p) => !!p.next_call_date && p.next_call_date <= S.today && ['new', 'contacted'].includes(p.status) && !!callNo(p);
  const nowMY = () => { const d = window.DESK_NOW ? new Date(window.DESK_NOW) : new Date(); const m = new Date(d.getTime() + 8 * 3600e3); return m.getUTCHours() * 60 + m.getUTCMinutes(); };
  function badHour() {
    const t = nowMY();
    if (t < 600 || t >= 1260) return '太早或太晚';
    if (t >= 690 && t < 840) return '午餐时间';
    if (t >= 1080) return '晚餐时间';
    return '';
  }
  function okNow(what) {
    const why = badHour();
    if (!why) return true;
    const t = nowMY();
    return confirm(`现在是 ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}（${why}），餐厅和店家多数在忙，常常不会理。建议：餐厅 14:30–17:00、卖产品的 10:00–12:00。\n\n还是要现在${what}吗？`);
  }
  const OPENER = {
    zh: (n) => `你好，我是 Cartsmith Studio 的，我们帮本地的餐厅和品牌做网上接单的网站。想跟老板讲 30 秒，方便吗？……我们在网上看到 ${n}，想帮你们做一个免费的网上订购首页样板，用你们的店名和产品，不用钱，也不用马上决定。我 WhatsApp 发给你看看，可以吗？`,
    en: (n) => `Hi, this is Cartsmith Studio — we build online-ordering websites for local food businesses and brands. Could I have 30 seconds with the owner? … We came across ${n} and would like to make you a free sample homepage with your name and menu — no cost, no commitment. Can I WhatsApp it to you to have a look?`,
    ms: (n) => `Hai, saya dari Cartsmith Studio — kami buat laman web tempahan online untuk perniagaan tempatan. Boleh saya cakap dengan pemilik sekejap? … Kami nampak ${n} dan nak buatkan contoh laman utama percuma dengan nama dan menu anda — tiada bayaran, tiada komitmen. Boleh saya WhatsApp untuk anda tengok?`,
  };
  function callBlock(p) {
    if (S.calling === p.id) {
      return `<div class="callout" data-callout="${p.id}"><b>电话打得怎么样？</b>
        <div class="btnrow">
          <button class="btn btn--sm" data-act="call-out" data-out="ok" data-id="${p.id}">${svg('check', 16)}可以发样板</button>
          <button class="btn btn--ghost btn--sm" data-act="call-out" data-out="no_answer" data-id="${p.id}">没接</button>
          <button class="btn btn--ghost btn--sm" data-act="call-out" data-out="no" data-id="${p.id}">不需要</button>
        </div>
        <div class="callout__later"><label>改天再打<input type="date" data-call-date value="${esc(nextDay())}" min="${esc(S.today)}"></label><button class="btn btn--ghost btn--sm" data-act="call-out" data-out="callback" data-id="${p.id}">记下</button><button class="linkbtn" data-act="call-cancel" data-id="${p.id}">还没打</button></div></div>`;
    }
    let h = '';
    if (callDue(p) && p.status !== 'new') h += `<div class="send"><span class="send__label">今天再打</span><div class="send__btns">${callBtn(p)}</div></div>`;
    if (callNo(p) && (p.status === 'new' || callDue(p))) {
      const tries = p.call_misses ? `（已经打过 ${p.call_misses} 次没接）` : '';
      h += `<details class="cue"><summary>${svg('phone', 14)}电话开场（照着念）${tries}</summary><p>${esc((OPENER[p.language] || OPENER.en)(p.business_name))}</p>${p.observation ? `<p class="hint">可以提的一点：${esc(p.observation)}</p>` : ''}<p><a href="call-script.html" target="_blank" rel="noopener">完整电话脚本和各种回话 →</a></p></details>`;
    }
    return h;
  }
  const nextDay = () => { const d = new Date(S.today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
  function visitList(q) {
    const open = ['new', 'contacted', 'replied', 'preview_sent'];
    const items = S.items.filter((p) => p.address && open.includes(p.status) && !/^在家做/.test(p.address) && (!q || [p.business_name, p.area, p.address].join(' ').toLowerCase().includes(q)));
    if (!items.length) return '<div class="empty">还没有带地址的商家。每天新找的商家会附上地区和地址；以前的也可以在「编辑」补上。</div>';
    const groups = {};
    items.forEach((p) => { (groups[p.area || '其他'] = groups[p.area || '其他'] || []).push(p); });
    return Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b)).map((area) => `<section class="visit"><h3>${esc(area)} <small>${groups[area].length} 家</small></h3>${groups[area].map((p) => `<div class="visit__row"><div><b>${esc(p.business_name)}</b><small>${esc(STATUS[p.status] || p.status)}${callNo(p) ? ' · ' + esc(fmtPhone(callNo(p))) : ''}</small><small>${esc(p.address)}</small></div><a class="btn btn--ghost btn--sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.business_name + ' ' + p.address)}" target="_blank" rel="noopener">${svg('pin', 14)}地图</a></div>`).join('')}</section>`).join('') + '<p class="hint">建议平日 14:30–17:00 去；买一样东西，用手机给老板看他们的样板。</p>';
  }

  // ------------------------------------------------------------ card
  function card(p, mode) {
    const sub = [p.instagram ? '@' + esc(p.instagram) : '', esc(PLATFORM[p.platform] || ''), esc(p.niche || ''), p.store_url ? `<a href="${esc(p.store_url)}" target="_blank" rel="noopener">店铺</a>` : ''].filter(Boolean).join('<span class="dot">·</span>');
    const tags = [`<span class="tag tag--status s-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span>`];
    if (p.lead_id) tags.push(`<span class="tag tag--lead">Claude Code 找的${p.priority ? ' · ' + esc(p.priority) + ' 级' : ''}</span>`);
    if (p.template) tags.push(`<span class="tag">${esc(TPL[p.template] || p.template)}</span>`);
    if (p.language) tags.push(`<span class="tag">${esc(LANG[p.language] || p.language)}</span>`);
    if (p.next_followup_date) tags.push(`<span class="tag">${svg('clock', 12)} ${esc(p.next_followup_date)}</span>`);
    if (p.duplicate_of) tags.push(`<span class="tag tag--warn">可能重复（${esc(p.duplicate_of)}）</span>`);
    if (p.preview_delete_by && p.status !== 'won') tags.push(`<span class="tag tag--warn">样板删除：${esc(p.preview_delete_by)}</span>`);

    let body = '';
    const due = p.next_followup_date && p.next_followup_date <= S.today;
    const moreBtn = `<button class="btn btn--ghost btn--sm btn--icon" data-act="more" data-id="${p.id}" aria-label="更多">${svg('more', 18)}</button>`;
    const sentBtn = `<button class="btn btn--ghost btn--sm" data-act="sent" data-id="${p.id}">${svg('check', 16)}已发送</button>`;
    if (mode === 'analysis') {
      body += `<ul class="crit">${Object.keys(CRIT).map((k) => `<li class="${p[k] ? 'on' : ''}">${svg(p[k] ? 'check' : 'x', 14)}<span>${CRIT[k]}</span></li>`).join('')}</ul>`;
      if (p.criteria_note) body += `<p class="note">${esc(p.criteria_note)}</p>`;
      if (p.fit_reason) body += `<p class="note"><b>${p.fit === 'skip' ? '建议跳过' : p.fit === 'maybe' ? '可以试试' : '值得联系'}：</b>${esc(p.fit_reason)}</p>`;
    }
    if (p.observation) body += `<p class="obs">${esc(p.observation)}</p>`;
    if (p.verify && p.status === 'new') body += `<p class="verify">${svg('pin', 14)}<span>发之前看一眼：${esc(p.verify)}</span></p>`;
    body += contacts(p);
    body += callBlock(p);

    if (p.status === 'new') {
      body += msgBox(p, 'message', '开场白（可以直接改）') + sendRow(p, 'message');
      body += `<div class="btnrow btnrow--end">${sentBtn}${moreBtn}</div>`;
    } else if (p.status === 'replied') {
      if (p.draft_reply) {
        body += `<div class="draft"><b>对方意思：</b>${esc(p.reply_summary || '')}<br><b>下一步：</b>${esc(p.reply_next || '')}</div>`;
        body += msgBox(p, 'draft_reply', 'AI 起草的回信（看过再发）') + sendRow(p, 'draft_reply');
        body += `<div class="btnrow btnrow--end"><button class="btn btn--ghost btn--sm" data-act="replied-more" data-id="${p.id}">记录进度</button>${moreBtn}</div>`;
      } else {
        body += `<div class="btnrow"><button class="btn btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}贴上对方的回复，起草回信</button>${moreBtn}</div>`;
      }
    } else if (['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && (due || mode === 'full')) {
      if (p.followup) {
        body += msgBox(p, 'followup', p.status === 'contacted' ? (p.touches <= 1 ? '第 2 条：给一个有用的资讯' : '最后一条') : '跟进信息') + sendRow(p, 'followup');
        body += `<div class="btnrow btnrow--end">${sentBtn}${moreBtn}</div>`;
      } else {
        body += `<div class="btnrow"><button class="btn btn--sm" data-act="followup" data-id="${p.id}">${svg('pen', 16)}写跟进信息</button><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}对方有回复</button>${moreBtn}</div>`;
      }
    } else {
      body += `<div class="btnrow"><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}对方有回复</button>${moreBtn}</div>`;
    }
    return `<article class="card" id="${mode === 'analysis' ? 'a' : mode === 'full' ? 'l' : 'c'}-${p.id}" data-card="${p.id}"><div class="card__top"><div class="card__head"><div class="card__name">${esc(p.business_name)}<small>${esc(p.id)}</small></div><div class="card__sub">${sub}</div></div><div class="score ${scoreClass(p.score)}" title="符合几项条件（满分 5）">${p.score}/5</div></div><div class="tags">${tags.join('')}</div>${body}</article>`;
  }
  function contacts(p) {
    const items = [];
    if (p.instagram) items.push(`<span>${svg('ig', 14)}@${esc(p.instagram)}</span>`);
    if (p.whatsapp) items.push(`<span>${svg('wa', 14)}${esc(fmtWa(p.whatsapp))}</span>`);
    if (p.email) items.push(`<span>${svg('mail', 14)}${esc(p.email)}</span>`);
    if (p.phone) items.push(`<span>${svg('phone', 14)}${esc(fmtPhone(p.phone))}</span>`);
    if (p.address) items.push(`<span>${svg('pin', 14)}${esc(p.address)}</span>`);
    const missing = !p.whatsapp && !p.email && !p.phone;
    return `<div class="contacts">${items.join('')}${missing ? `<button class="linkbtn" data-act="edit" data-id="${p.id}">${svg('plus', 14)}补上电话 / WhatsApp / Email</button>` : ''}</div>`;
  }
  function msgBox(p, field, label) { return `<div class="msg"><label>${esc(label)}</label><textarea data-field="${field}" data-id="${p.id}">${esc(p[field] || '')}</textarea></div>`; }
  function sendRow(p, field) {
    const b = [];
    if (callNo(p) && (field === 'message' || field === 'followup')) b.push(['call', callBtn(p)]);
    if (p.whatsapp) b.push(['wa', `<button class="btn btn--sm ch ch--wa" data-act="wa" data-field="${field}" data-id="${p.id}">${svg('wa', 16)}WhatsApp</button>`]);
    if (p.email) b.push(['email', `<button class="btn btn--sm ch ch--mail" data-act="email" data-field="${field}" data-id="${p.id}">${svg('mail', 16)}Email</button>`]);
    if (p.instagram) b.push(['ig', `<button class="btn btn--sm ch ch--ig" data-act="copyopen" data-field="${field}" data-id="${p.id}">${svg('ig', 16)}Instagram</button>`]);
    if (!b.length) b.push(['', `<button class="btn btn--sm" data-act="copyonly" data-field="${field}" data-id="${p.id}">复制信息</button>`]);
    // follow-ups: try a channel they have not seen yet (one channel per message, never all at once)
    let hint = '';
    if (field === 'followup' && p.last_channel) {
      const used = p.channels && p.channels.length ? p.channels : [p.last_channel];
      b.sort((x, y) => used.includes(x[0]) - used.includes(y[0]));
      const fresh = b.find((x) => x[0] && !used.includes(x[0]));
      hint = `<p class="send__hint" data-send-hint>上次用 ${esc(CH[p.last_channel] || p.last_channel)}。${fresh ? `这次可以换 ${CH[fresh[0]]}，对方可能比较常看。` : '没有别的联系方式，可以先在卡片补上 WhatsApp / Email。'}同一条信息只用一个渠道发。</p>`;
    }
    return `<div class="send"><span class="send__label">发送</span><div class="send__btns">${b.map((x) => x[1]).join('')}</div></div>${hint}`;
  }
  function mini(p) {
    return `<div class="mini" data-expand="${p.id}"><div class="mini__l"><b>${esc(p.business_name)}</b><small>${esc([p.instagram ? '@' + p.instagram : '', STATUS[p.status], p.next_followup_date ? '跟进 ' + p.next_followup_date : ''].filter(Boolean).join(' · '))}</small></div><div class="score ${scoreClass(p.score)}">${p.score}</div></div>${S.open[p.id] ? card(p, 'full') : ''}`;
  }

  // ------------------------------------------------------------ views
  function renderToday() {
    const limit = S.settings.dailyLimit || 10;
    const left = Math.max(0, limit - sentToday());
    const fresh = S.items.filter((p) => p.status === 'new' && p.score >= 3 && p.fit !== 'skip' && !p.duplicate_of && !p.next_call_date).sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
    const follow = S.items.filter((p) => ['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && p.next_followup_date && p.next_followup_date <= S.today);
    const replied = S.items.filter((p) => p.status === 'replied');
    const calls = S.items.filter((p) => callDue(p));
    const purge = S.items.filter((p) => p.preview_delete_by && p.preview_delete_by <= S.today && p.status !== 'won');
    let h = '';
    if (S.inbox.length) h += inboxSect();
    if (replied.length) h += sect('有回复，等你回', replied.length, replied.map((p) => card(p)).join(''), '');
    if (calls.length) h += sect('今天要打电话', calls.length, calls.map((p) => card(p)).join(''), '');
    if (follow.length) h += sect('今天要跟进', follow.length, follow.map((p) => card(p)).join(''), '');
    if (left && fresh.length) h += `<div class="queuebar"><div><b>连续发送</b><small>一家一家打开已经填好的 WhatsApp / Email / Instagram，你按发送，再按「下一家」。有 WhatsApp / Email 的排前面。</small></div><button class="btn btn--sm" data-act="queue-start">开始（${Math.min(left, fresh.length)} 家）</button></div>`;
    h += sect(`新联系 · 今天还可以发 ${left} 个`, fresh.length, left ? fresh.slice(0, Math.max(left, 1) + 2).map((p) => card(p)).join('') : '<div class="empty">今天的新联系已经发满了，明天继续。</div>', '名单里没有待联系的商家。');
    if (purge.length) h += sect('样板到期，要删除', purge.length, purge.map((p) => `<div class="card"><p>${esc(p.business_name)} 的样板 ${esc(p.preview_url || '')} 已到期（${esc(p.preview_delete_by)}）。跟 Claude Code 说「删除 ${esc(p.business_name)} 的样板」，删好后按：</p><div class="btnrow"><button class="btn btn--sm" data-act="purged" data-id="${p.id}">已删除样板</button></div></div>`).join(''), '');
    $('[data-today-list]').innerHTML = h;
  }
  function inboxSect() {
    const rows = S.inbox.map((l) => `<li><div class="inbox__main"><div class="inbox__name"><b>${esc(l.name)}</b>${l.priority ? `<span class="tag">${esc(l.priority)} 级</span>` : ''}<span class="inbox__ch" title="已知的联系方式">${svg('ig', 14)}${l.wa ? svg('wa', 14) : ''}${l.email ? svg('mail', 14) : ''}</span></div><small>${esc(l.why)}</small></div><button class="linkbtn" data-act="skip-lead" data-lead="${esc(l.id)}">跳过</button></li>`).join('');
    return `<section class="sect inbox" data-inbox><div class="sect__head"><h2>新商家</h2><small>Claude Code 找的 · ${S.inbox.length} 家</small></div>
      <div class="card"><p class="hint">资料已经整理好。不合适的先按「跳过」，再按下面的按钮：AI 会逐家打分、写好开场白，放进「新联系」。</p>
      <ul class="inbox__list">${rows}</ul>
      <button class="btn btn--block" data-act="import-all">全部加入（${S.inbox.length} 家，约 ${Math.max(1, Math.round(S.inbox.length * 8 / 60))} 分钟）</button></div></section>`;
  }
  function sect(title, n, inner, emptyMsg) {
    return `<section class="sect"><div class="sect__head"><h2>${esc(title)}</h2><small>${n}</small></div>${inner || (emptyMsg ? `<div class="empty">${esc(emptyMsg)}</div>` : '')}</section>`;
  }
  const FILTERS = [['all', '全部'], ['visit', '拜访清单'], ['new', '未联系'], ['contacted', '已联系'], ['replied', '有回复'], ['preview_sent', '样板'], ['won', '成交'], ['low', '低分'], ['do_not_contact', '不再联系']];
  function renderList() {
    $('[data-filters]').innerHTML = FILTERS.map(([k, l]) => `<button class="chip${S.filter === k ? ' is-on' : ''}" data-filter="${k}">${l}</button>`).join('');
    const q = S.q.trim().toLowerCase();
    if (S.filter === 'visit') { $('[data-all-list]').innerHTML = visitList(q); return; }
    const items = S.items.filter((p) => {
      if (S.filter === 'low') { if (!(p.score < 3 || p.fit === 'skip')) return false; } else if (S.filter !== 'all' && p.status !== S.filter) return false;
      return !q || [p.business_name, p.instagram, p.niche, p.id, p.email, p.whatsapp].join(' ').toLowerCase().includes(q);
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
    const byCh = Object.keys(CH).map((c) => [CH[c], it.filter((p) => (p.channels || []).includes(c)).length]);
    let weakest = '';
    if (contacted >= 20) {
      if (replied / contacted < 0.1) weakest = '回复率偏低：开场白的观察要更具体，或者多用 WhatsApp / Email。';
      else if (reached('preview_sent') < replied * 0.4) weakest = '有回复但很少要样板：回信时先用费用计算器算给对方看，再提免费样板。';
      else if (reached('won') === 0 && reached('proposal_sent') >= 3) weakest = '有报价没成交：想想价格和信任感（首批优惠、分两期付款）。';
    }
    $('[data-stats]').innerHTML = `<h2>数字</h2>
      <div class="statgrid"><div class="stat"><b>${it.length}</b><small>名单总数</small></div><div class="stat"><b>${it.filter((p) => p.first_contact_date && p.first_contact_date >= week).length}</b><small>过去 7 天新联系</small></div><div class="stat"><b>${pct(replied, contacted)}</b><small>回复率</small></div><div class="stat"><b>${it.filter((p) => p.status === 'do_not_contact').length}</b><small>不再联系</small></div></div>
      <div class="funnel">${rows.map(([l, n], i) => `<div><span>${l}</span><b>${n}${i ? ' · ' + pct(n, rows[i - 1][1]) : ''}</b></div>`).join('')}</div>
      <div class="funnel">${byCh.map(([l, n]) => `<div><span>用 ${l} 联系过</span><b>${n}</b></div>`).join('')}</div>
      ${weakest ? `<p class="draft"><b>最弱的一步：</b>${esc(weakest)}</p>` : '<p class="hint">联系满 20 个之后，这里会提示哪一步最需要改进。</p>'}`;
    $('[data-limit]').value = S.settings.dailyLimit || 10;
  }
  function render() {
    $('[data-today]').textContent = S.today;
    const n = sentToday();
    const limit = S.settings.dailyLimit || 10;
    const pill = $('[data-sent-count]');
    pill.textContent = `今天新联系 ${n}/${limit}`;
    pill.classList.toggle('is-full', n >= limit);
    const bar = $('[data-sent-bar]');
    if (bar) bar.style.width = Math.min(100, Math.round((n / limit) * 100)) + '%';
    const added = S.items.find((x) => x.id === S.lastAdded);
    const ar = $('[data-add-result] .card');
    if (added && ar) ar.outerHTML = card(added, 'analysis');
    if (S.tab === 'today') renderToday();
    if (S.tab === 'list') renderList();
    if (S.tab === 'stats') renderStats();
  }

  // ------------------------------------------------------------ "sent?" bar after opening a channel
  function showSentbar(p, ch) {
    S.pending = p.id;
    const bar = $('[data-sentbar]');
    $('[data-sentbar-text]', bar).textContent = `用 ${CH[ch] || '信息'} 发给 ${p.business_name} 了吗？`;
    const y = $('[data-sentbar-yes]', bar);
    y.dataset.id = p.id; y.dataset.ch = ch || ''; y.disabled = false; y.innerHTML = svg('check', 16) + '已发送';
    bar.hidden = false;
  }
  function hideSentbar() { S.pending = ''; $('[data-sentbar]').hidden = true; const y = $('[data-sentbar-yes]'); y.disabled = false; y.innerHTML = svg('check', 16) + '已发送'; delete y.dataset.label; }

  // ------------------------------------------------------------ rapid manual sending (one lead at a time; a person presses send in each app)
  const hasDirect = (p) => (p.whatsapp || p.email ? 1 : 0);
  function queueList() {
    const left = Math.max(0, (S.settings.dailyLimit || 10) - sentToday());
    return S.items.filter((p) => p.status === 'new' && p.score >= 3 && p.fit !== 'skip' && !p.duplicate_of && !p.next_call_date)
      .sort((a, b) => hasDirect(b) - hasDirect(a) || b.score - a.score || (a.id < b.id ? -1 : 1))
      .slice(0, left).map((p) => p.id);
  }
  function startQueue() {
    S.queue = queueList(); S.qi = 0; S.qch = ''; S.qsent = 0;
    if (!S.queue.length) { toast('今天没有要发的了。'); return; }
    S.queueOn = true; renderQueue();
  }
  function renderQueue() {
    const p = S.items.find((x) => x.id === S.queue[S.qi]);
    if (!p) { S.queueOn = false; closeSheet(); render(); toast(`连续发送结束：这次发了 ${S.qsent} 家。`); return; }
    S.qch = '';
    const sub = [p.instagram ? '@' + esc(p.instagram) : '', esc(p.niche || ''), esc(LANG[p.language] || '')].filter(Boolean).join('<span class="dot">·</span>');
    sheet(`<div class="sheet__head"><h3>连续发送 · ${S.qi + 1} / ${S.queue.length}</h3>${closeBtn}</div>
      <div class="q" data-q-card="${p.id}">
        <div class="card__name">${esc(p.business_name)}</div><div class="card__sub">${sub}</div>
        ${p.observation ? `<p class="obs">${esc(p.observation)}</p>` : ''}
        ${p.verify ? `<p class="verify">${svg('pin', 14)}<span>发之前看一眼：${esc(p.verify)}</span></p>` : ''}
        ${contacts(p)}
        ${msgBox(p, 'message', '开场白（可以直接改）')}
        ${sendRow(p, 'message')}
        <div class="btnrow"><button class="btn" data-act="q-sent" data-id="${p.id}">${svg('check', 16)}已发送，下一家</button><button class="btn btn--ghost" data-act="q-skip">跳过</button></div>
        <p class="hint">先按上面其中一个发送方式，在 App 里看一遍再按发送，回来按「已发送，下一家」。按「跳过」不会记录，这家之后还会出现。</p>
      </div>`);
  }

  // ------------------------------------------------------------ sheet (more actions)
  function sheet(html) { $('[data-sheet-panel]').innerHTML = html; $('[data-sheet]').hidden = false; }
  function closeSheet() { $('[data-sheet]').hidden = true; S.queueOn = false; }
  const closeBtn = `<button class="btn btn--ghost btn--sm btn--icon" data-sheet-close aria-label="关闭">${svg('x', 18)}</button>`;
  const row = (act, icon, label, id, extra) => `<button class="row" data-act="${act}" data-id="${id}"${extra || ''}>${svg(icon, 18)}<span>${label}</span></button>`;
  function moreSheet(p) {
    sheet(`<div class="sheet__head"><h3>${esc(p.business_name)}</h3>${closeBtn}</div>
      <div class="sheet__label">重写开场白</div>
      <div class="sheet__grid">
        <button class="btn btn--ghost btn--sm" data-act="rewrite" data-lang="en" data-id="${p.id}">英文</button>
        <button class="btn btn--ghost btn--sm" data-act="rewrite" data-lang="zh" data-id="${p.id}">中文</button>
        <button class="btn btn--ghost btn--sm" data-act="rewrite" data-lang="ms" data-id="${p.id}">马来文</button>
        <button class="btn btn--ghost btn--sm" data-act="rewrite" data-hint="更短、更口语" data-id="${p.id}">更短</button>
      </div>
      <div class="sheet__label">记录进度</div>
      <div class="rows">
        ${row('reply', 'reply', '对方回复了（贴上回复）', p.id)}
        ${row('preview', 'image', '样板已发（填网址）', p.id)}
        ${row('mark', 'phone', '约了通话', p.id, ' data-ev="call_booked"')}
        ${row('mark', 'file', '报价已发', p.id, ' data-ev="proposal_sent"')}
        ${row('mark', 'star', '成交', p.id, ' data-ev="won"')}
        ${row('mark', 'x', '没成交', p.id, ' data-ev="lost"')}
        ${row('dnc', 'ban', '对方说不要（永远不再联系）', p.id)}
      </div>
      <div class="sheet__label">资料</div>
      <div class="rows">
        ${row('edit', 'edit', '编辑资料（IG / WhatsApp / Email）', p.id)}
        ${['do_not_contact', 'lost', 'no_response'].includes(p.status) ? row('mark', 'refresh', '重新打开', p.id, ' data-ev="reopen"') : ''}
        ${row('delete', 'trash', '删除（加错了才用）', p.id)}
      </div>`);
  }
  function repliedSheet(p) {
    sheet(`<div class="sheet__head"><h3>回信发出后，现在进度是？</h3>${closeBtn}</div>
      <div class="rows">
        ${row('mark', 'check', '已回复，等对方', p.id, ' data-ev="sent"')}
        ${row('preview', 'image', '样板已发', p.id)}
        ${row('mark', 'phone', '约了通话', p.id, ' data-ev="call_booked"')}
        ${row('mark', 'file', '报价已发', p.id, ' data-ev="proposal_sent"')}
        ${row('dnc', 'ban', '对方说不要', p.id)}
      </div>`);
  }
  function replySheet(p) {
    sheet(`<div class="sheet__head"><h3>${esc(p.business_name)} 回了什么？</h3>${closeBtn}</div><p class="hint">把对方在 Instagram / WhatsApp / Email 的回复复制贴上。AI 会判断对方的意思，写好回信给你看。</p>
      <textarea rows="6" data-reply-text maxlength="2000" placeholder="贴上对方的回复"></textarea>
      <div class="btnrow"><button class="btn" data-act="reply-go" data-id="${p.id}">起草回信</button><button class="btn btn--ghost" data-sheet-close>取消</button></div>`);
  }
  function editSheet(p) {
    sheet(`<div class="sheet__head"><h3>编辑 ${esc(p.business_name)}</h3>${closeBtn}</div>
      <label>店名<input type="text" data-e="business_name" value="${esc(p.business_name)}"></label>
      <label>Instagram（不用 @）<input type="text" data-e="instagram" value="${esc(p.instagram)}"></label>
      <label>WhatsApp 号码<input type="tel" data-e="whatsapp" value="${esc(p.whatsapp ? '+' + p.whatsapp : '')}" placeholder="例：012-345 6789"></label>
      <label>Email<input type="email" data-e="email" value="${esc(p.email || '')}" placeholder="例：hello@brand.com"></label>
      <label>电话（座机也可以）<input type="tel" data-e="phone" value="${esc(p.phone ? '+' + p.phone : '')}" placeholder="例：03-2201 1710"></label>
      <label>地区（拜访清单用）<input type="text" data-e="area" value="${esc(p.area || '')}" placeholder="例：PJ SS2、Bangsar"></label>
      <label>地址<input type="text" data-e="address" value="${esc(p.address || '')}"></label>
      <p class="hint">只用对方公开给客人的联系方式（IG 简介、Linktree、Google 商家资料、报道）。</p>
      <label>店铺链接<input type="url" data-e="store_url" value="${esc(p.store_url)}"></label>
      <label>卖什么<input type="text" data-e="niche" value="${esc(p.niche)}"></label>
      <label>具体观察<textarea rows="3" data-e="observation">${esc(p.observation)}</textarea></label>
      <label>备注<textarea rows="2" data-e="notes">${esc(p.notes || '')}</textarea></label>
      <div class="sheet__label">分数条件</div>
      ${Object.keys(CRIT).map((k) => `<label class="check"><input type="checkbox" data-e="${k}" ${p[k] ? 'checked' : ''}> ${CRIT[k]}</label>`).join('')}
      <div class="btnrow"><button class="btn" data-act="edit-save" data-id="${p.id}">保存</button><button class="btn btn--ghost" data-sheet-close>取消</button></div>`);
  }

  // ------------------------------------------------------------ events
  document.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-act],[data-tab],[data-filter],[data-expand],[data-sheet-close]');
    if (!t) return;
    if (t.hasAttribute('data-sheet-close')) { const wasQueue = S.queueOn; closeSheet(); if (wasQueue) render(); return; }
    if (t.dataset.tab) { S.tab = t.dataset.tab; $$('[data-tab]').forEach((b) => b.classList.toggle('is-on', b === t)); $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== S.tab; }); render(); window.scrollTo(0, 0); return; }
    if (t.dataset.filter) { S.filter = t.dataset.filter; renderList(); return; }
    if (t.dataset.expand) { S.open[t.dataset.expand] = !S.open[t.dataset.expand]; renderList(); return; }
    const p = S.items.find((x) => x.id === t.dataset.id);
    const act = t.dataset.act;
    try {
      if (act === 'copyopen' || act === 'copyonly') {
        copy(textOf(t, p));
        if (act === 'copyopen') window.open(igLink(p.instagram), '_blank', 'noopener');
        toast(act === 'copyopen' ? '信息已复制。在 Instagram 长按输入框贴上，看一遍再发送。' : '信息已复制。');
        if (act === 'copyopen' && S.queueOn) S.qch = 'ig';
        else if (act === 'copyopen' && ['message', 'followup', 'draft_reply'].includes(t.dataset.field)) showSentbar(p, 'ig');
        return;
      }
      if (act === 'wa') {
        if (!okNow('发 WhatsApp')) return;
        window.open(waLink(p.whatsapp, textOf(t, p)), '_blank', 'noopener');
        toast('WhatsApp 已打开，信息已经填好，看一遍再发送。');
        if (S.queueOn) S.qch = 'wa'; else showSentbar(p, 'wa');
        return;
      }
      if (act === 'email') {
        const a = document.createElement('a'); a.href = mailLink(p, textOf(t, p)); a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
        toast('邮件已经填好主旨和内容，看一遍再发送。');
        if (S.queueOn) S.qch = 'email'; else showSentbar(p, 'email');
        return;
      }
      if (act === 'call') {
        ev.preventDefault();
        if (!okNow('打电话')) return;
        const a = document.createElement('a'); a.href = 'tel:+' + callNo(p); document.body.appendChild(a); a.click(); a.remove();
        S.calling = p.id; render();
        return;
      }
      if (act === 'call-cancel') { S.calling = null; render(); return; }
      if (act === 'call-out') {
        const outcome = t.dataset.out;
        if (outcome === 'no' && !confirm(`${p.business_name} 说不需要？之后不会再出现在联系清单。`)) return;
        const dateEl = t.closest('.callout') && t.closest('.callout').querySelector('[data-call-date]');
        busy(t, true, '记录中…');
        const j = await api('call', { id: p.id, outcome, date: dateEl ? dateEl.value : '' });
        upsert(j.item); S.calling = null; render();
        toast({ no_answer: j.item.next_call_date ? `已记录没接，${j.item.next_call_date} 再打。` : '3 次都没接：改用 WhatsApp / Email 发开场白。', ok: '已记录。样板做好后，在「有回复，等你回」把网址贴进信息再发。', callback: `已记录，${j.item.next_call_date} 会提醒你再打。`, no: '已标记不再联系。' }[outcome]);
        return;
      }
      if (act === 'queue-start') { startQueue(); return; }
      if (act === 'q-skip') { S.qi++; renderQueue(); return; }
      if (act === 'q-sent') {
        busy(t, true, '记录中…');
        const j = await api('mark', { id: p.id, event: 'sent', channel: S.qch });
        upsert(j.item); S.qsent++; S.qi++; renderQueue();
        return;
      }
      if (act === 'sentbar-no') { hideSentbar(); return; }
      if (act === 'skip-lead') {
        const id = t.dataset.lead;
        busy(t, true, '…');
        await api('skip', { lead_id: id });
        S.inbox = S.inbox.filter((l) => l.id !== id); render(); toast('已跳过。'); return;
      }
      if (act === 'import-all') {
        const todo = S.inbox.slice();
        let done = 0; const failed = [];
        t.disabled = true;
        for (const l of todo) {
          t.textContent = `正在处理 ${done + failed.length + 1}/${todo.length}：${l.name}…`;
          try { const j = await api('import', { lead_id: l.id }); upsert(j.item); done++; } catch (e) { if (e.message === 'unauthorised') throw e; failed.push(l); }
        }
        S.inbox = failed;
        render();
        toast(failed.length ? `加入了 ${done} 家；${failed.length} 家失败，可以再按一次。` : `加入了 ${done} 家，开场白都写好了。`);
        return;
      }
      if (act === 'more') { moreSheet(p); return; }
      if (act === 'replied-more') { repliedSheet(p); return; }
      if (act === 'reply') { replySheet(p); return; }
      if (act === 'edit') { S.queueFromEdit = S.queueOn; editSheet(p); S.queueOn = false; return; }
      if (act === 'preview') {
        const url = prompt('样板网址（Claude Code 发布后给你的网址）：', p.preview_url || 'https://');
        if (url === null) return;
        const j = await api('mark', { id: p.id, event: 'preview_sent', url });
        upsert(j.item); closeSheet(); render(); toast('已记录：14 天后提醒你删除样板。'); return;
      }
      if (act === 'dnc') {
        if (!confirm(`确定 ${p.business_name} 说不要？之后永远不会再出现在联系清单。`)) return;
        const j = await api('mark', { id: p.id, event: 'dnc' }); upsert(j.item); closeSheet(); render(); toast('已标记不再联系。'); return;
      }
      if (act === 'delete') {
        if (!confirm(`删除 ${p.business_name}？（只有加错了才删除；对方说不要请用「不再联系」）`)) return;
        await api('delete', { id: p.id }); S.items = S.items.filter((x) => x.id !== p.id); closeSheet(); render(); toast('已删除。'); return;
      }
      if (act === 'purged') { const j = await api('mark', { id: p.id, event: 'preview_deleted' }); upsert(j.item); render(); toast('已记录：样板删除了。'); return; }
      busy(t, true, act === 'reply-go' || act === 'followup' || act === 'rewrite' ? 'AI 写作中…' : '保存中…');
      let j;
      if (act === 'sent') { j = await api('mark', { id: p.id, event: 'sent', channel: t.dataset.ch || '' }); if (S.pending === p.id) hideSentbar(); toast(j.item.next_followup_date ? `已记录，${j.item.next_followup_date} 会提醒你跟进。` : '已记录。'); }
      else if (act === 'mark') { j = await api('mark', { id: p.id, event: t.dataset.ev }); toast('已记录。'); }
      else if (act === 'followup') j = await api('followup', { id: p.id });
      else if (act === 'rewrite') j = await api('rewrite', { id: p.id, language: t.dataset.lang || '', hint: t.dataset.hint || '' });
      else if (act === 'reply-go') { const text = $('[data-reply-text]').value; j = await api('reply', { id: p.id, text }); }
      else if (act === 'edit-save') {
        const fields = {};
        $$('[data-e]').forEach((el) => { fields[el.dataset.e] = el.type === 'checkbox' ? el.checked : el.value; });
        j = await api('update', { id: p.id, fields });
      }
      if (j && j.item) upsert(j.item);
      const backToQueue = act === 'edit-save' && S.queue.length && S.qi < S.queue.length && S.queueFromEdit;
      S.queueFromEdit = false;
      if (backToQueue) { S.queueOn = true; renderQueue(); render(); return; }
      closeSheet(); render();
      if (act === 'rewrite' || act === 'followup' || act === 'reply-go') { const c = document.getElementById('c-' + p.id); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } catch (e) { busy(t, false); if (e.message !== 'unauthorised') toast(e.message); }
  });

  // save edited messages when leaving the textarea
  document.addEventListener('change', async (ev) => {
    const ta = ev.target.closest('textarea[data-field]');
    if (!ta) return;
    const p = S.items.find((x) => x.id === ta.dataset.id);
    if (!p || p[ta.dataset.field] === ta.value) return;
    try { const j = await api('update', { id: p.id, fields: { [ta.dataset.field]: ta.value } }); upsert(j.item); toast('已保存修改。'); } catch (e) { toast(e.message); }
  });

  $('[data-add]').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = $('#add-in').value.trim();
    const btn = ev.target.querySelector('button[type=submit]');
    const out = $('[data-add-result]');
    busy(btn, true, '分析中…（约 5–10 秒）');
    out.innerHTML = '<div class="loading">正在看资料、打分、写开场白…</div>';
    try {
      const j = await api('analyze', { input, language: $('[data-add-lang]').value });
      upsert(j.item);
      S.lastAdded = j.item.id;
      out.innerHTML = `<p class="hint">已加入名单（${esc(j.item.id)}）。${j.item.score >= 3 && j.item.fit !== 'skip' ? '它会出现在「今天」的新联系里。' : '分数偏低，建议先跳过（在「名单 → 低分」找得到）。'}</p>` + card(j.item, 'analysis');
      $('#add-in').value = '';
      render();
    } catch (e) { out.innerHTML = ''; if (e.message !== 'unauthorised') toast(e.message); }
    busy(btn, false);
  });

  $('[data-search]').addEventListener('input', (e) => { S.q = e.target.value; renderList(); });
  $('[data-save-limit]').addEventListener('click', async () => { try { const j = await api('settings', { dailyLimit: $('[data-limit]').value }); S.settings = j.settings; render(); toast('已保存：每天最多 ' + j.settings.dailyLimit + ' 个。'); } catch (e) { $('[data-limit]').value = S.settings.dailyLimit || 10; toast(e.message); } });
  $('[data-export]').addEventListener('click', async () => {
    try {
      const j = await api('export');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + j.csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `prospects-${S.today}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { toast(e.message); }
  });
  $('[data-logout]').addEventListener('click', () => { store.clear(); location.reload(); });
  $('[data-restore]').addEventListener('click', async (ev) => {
    const f = $('[data-restore-file]').files[0];
    if (!f) { toast('先选一个名单档案（CSV）。'); return; }
    const btn = ev.currentTarget;
    busy(btn, true, '还原中…');
    try {
      const j = await api('restore', { csv: await f.text() });
      const l = await api('list');
      S.items = l.items || []; S.inbox = l.inbox || [];
      render();
      toast(`还原了 ${j.added} 家${j.skipped ? `，跳过 ${j.skipped} 家（已经有了）` : ''}。`);
    } catch (e) { if (e.message !== 'unauthorised') toast(e.message); }
    busy(btn, false);
  });

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
      $$('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon, 22); });
      render();
    } catch (e) {
      if (e.message !== 'unauthorised') showLogin(e.message.includes('SALES_DESK_KEY') ? e.message : '连不上工作台：' + e.message);
    }
  }
  if (store.get()) load(); else showLogin('');
})();
