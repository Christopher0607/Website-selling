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
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    chat: '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V16.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/>',
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
    if (i >= 0 && item.preview_views === undefined) item.preview_views = S.items[i].preview_views;
    if (i >= 0 && item.demo === undefined) { item.demo = S.items[i].demo; item.fest_demo = S.items[i].fest_demo; }
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
  const waNo = (p) => p.whatsapp || (/^601\d{7,9}$/.test(p.phone || '') ? p.phone : '');
  const fmtPhone = (n) => !n ? '' : /^601/.test(n) ? fmtWa(n) : '+' + n.replace(/^(60)([2-9])(\d{3,4})(\d{4})$/, '$1 $2-$3 $4');
  const callBtn = (p) => `<button class="btn btn--sm ch ch--call" data-act="call" data-id="${p.id}">${svg('phone', 16)}打电话</button>`;
  const callDue = (p) => !!p.next_call_date && p.next_call_date <= S.today && ['new', 'contacted'].includes(p.status) && !!callNo(p);
  // second call (2026-11-12): the mockup was sent, and the follow-up or call date has come
  const secondDue = (p) => p.status === 'preview_sent' && !!callNo(p) && ((!!p.next_call_date && p.next_call_date <= S.today) || (!!p.next_followup_date && p.next_followup_date <= S.today));
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
  function callBlock(p) {
    if (S.calling === p.id && p.status === 'preview_sent') {
      return `<div class="callout" data-callout="${p.id}"><b>第二通电话打得怎么样？</b>
        <div class="btnrow">
          <button class="btn btn--sm" data-act="call-out" data-out="warm" data-id="${p.id}">${svg('check', 16)}有兴趣</button>
          <button class="btn btn--ghost btn--sm" data-act="call-out" data-out="no_answer" data-id="${p.id}">没接</button>
          <button class="btn btn--ghost btn--sm" data-act="call-out" data-out="no" data-id="${p.id}">不需要</button>
        </div>
        <div class="callout__later"><label>还没看样板 / 改天再打<input type="date" data-call-date value="${esc(nextDay(2))}" min="${esc(S.today)}"></label><button class="btn btn--ghost btn--sm" data-act="call-out" data-out="notyet" data-id="${p.id}">还没看：重发</button><button class="btn btn--ghost btn--sm" data-act="call-out" data-out="callback" data-id="${p.id}">改天再打</button><button class="linkbtn" data-act="call-cancel" data-id="${p.id}">还没打</button></div></div>`;
    }
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
    if (secondDue(p)) {
      h += `<div class="send"><span class="send__label">第二通电话</span><div class="send__btns">${callBtn(p)}</div></div>`;
      h += `<details class="cue"><summary>${svg('phone', 14)}第二通电话台词（发样板后 1–2 天）</summary>${secondHTML(p)}<p><a href="call-script.html#second" target="_blank" rel="noopener">完整电话脚本 →</a></p></details>`;
      return h;
    }
    if (callDue(p) && p.status !== 'new') h += `<div class="send"><span class="send__label">今天再打</span><div class="send__btns">${callBtn(p)}</div></div>`;
    if (callNo(p) && (p.status === 'new' || callDue(p))) {
      const tries = p.call_misses ? `（已经打过 ${p.call_misses} 次没接）` : '';
      h += `<details class="cue"><summary>${svg('phone', 14)}电话台词（照着念）${tries}</summary>${scriptHTML(p, false)}${p.observation ? `<p class="hint">可以提的一点：${esc(p.observation)}</p>` : ''}<p><a href="call-script.html" target="_blank" rel="noopener">完整电话脚本 →</a></p></details>`;
    }
    return h;
  }
  const nextDay = (n = 1) => { const d = new Date(S.today + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  function visitList(q) {
    const open = ['new', 'contacted', 'replied', 'preview_sent'];
    const items = S.items.filter((p) => p.address && open.includes(p.status) && !/^在家做/.test(p.address) && (!q || [p.business_name, p.area, p.address].join(' ').toLowerCase().includes(q)));
    if (!items.length) return '<div class="empty">还没有带地址的商家。每天新找的商家会附上地区和地址；以前的也可以在「编辑」补上。</div>';
    const groups = {};
    items.forEach((p) => { (groups[p.area || '其他'] = groups[p.area || '其他'] || []).push(p); });
    return Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b)).map((area) => `<section class="visit"><h3>${esc(area)} <small>${groups[area].length} 家</small></h3>${groups[area].map((p) => `<div class="visit__row"><div><b>${esc(p.business_name)}</b><small>${esc(STATUS[p.status] || p.status)}${callNo(p) ? ' · ' + esc(fmtPhone(callNo(p))) : ''}</small><small>${esc(p.address)}</small></div><a class="btn btn--ghost btn--sm" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.business_name + ' ' + p.address)}" target="_blank" rel="noopener">${svg('pin', 14)}地图</a></div>`).join('')}</section>`).join('') + '<p class="hint">建议平日 14:30–17:00 去；买一样东西，用手机给老板看他们的样板。</p>';
  }


  // ------------------------------------------------------------ call script (2026-11-10): 4 short steps in their language, the Chinese meaning under each line,
  // and what to say back to the usual answers — each answer has the button to press
  const STUDIO_PRICE = 'RM800'; // Starter package in site/studio.json: change both together (2026-11-12)
  const PV_ACT = {
    pickup: { en: 'order and choose a pick-up date', zh: '下单、选日期自取', ms: 'membuat tempahan dan pilih tarikh ambil' },
    booking: { en: 'book a table', zh: '订位', ms: 'tempah meja' },
    shop: { en: 'order', zh: '下单', ms: 'membuat pesanan' },
  };
  function scriptOf(p) {
    const L = ['en', 'zh', 'ms'].includes(p.language) ? p.language : 'en';
    const n = p.business_name;
    const has = !!(p.preview_url && p.preview_password);
    const pt = p.preview_pitch || {};
    const items = (pt.items || []).filter(Boolean).slice(0, 3);
    const act = (PV_ACT[pt.mode] || PV_ACT.shop);
    const li = (x) => items.length ? x : '';
    const T = {
      owner: { en: 'Hi, good afternoon! May I speak to the owner, please?', zh: '你好，请问老板在吗？', ms: 'Hai, selamat petang! Boleh saya bercakap dengan pemilik?' },
      intro: has ? {
        en: `Hi, I'm (your name) from Cartsmith Studio. We build websites for local food businesses. We've already made a free sample website for ${n}${li(', with your ' + items.join(', '))}, where customers can ${act.en} online.`,
        zh: `你好，我是 Cartsmith Studio 的（你的名字）。我们帮本地餐饮做网站。我们已经帮 ${n} 做好了一个免费的样板网站${li('，放了你们的 ' + items.join('、'))}，客人可以直接在网上${act.zh}。`,
        ms: `Saya (nama anda) dari Cartsmith Studio. Kami buat laman web untuk perniagaan makanan tempatan. Kami sudah siapkan contoh laman web percuma untuk ${n}${li(', dengan ' + items.join(', '))}, di mana pelanggan boleh ${act.ms} secara online.`,
      } : {
        en: `Hi, I'm (your name) from Cartsmith Studio. We build websites for local food businesses. We'd like to make a free sample website for ${n}, with your name and menu.`,
        zh: `你好，我是 Cartsmith Studio 的（你的名字）。我们帮本地餐饮做网站。我们想用 ${n} 的店名和菜单，免费帮你们做一个样板网站。`,
        ms: `Saya (nama anda) dari Cartsmith Studio. Kami buat laman web untuk perniagaan makanan tempatan. Kami nak buatkan contoh laman web percuma untuk ${n}, dengan nama dan menu anda.`,
      },
      ask: has ? {
        en: "It's free, and there's no obligation. I'll WhatsApp you the link right after this call, so you can have a look when you're free.",
        zh: '不用钱，也不用马上决定。我挂了电话就用 WhatsApp 发给你，你有空再看。',
        ms: 'Percuma, tiada komitmen. Saya WhatsApp pautannya sebaik habis panggilan ini, anda tengok bila senang.',
      } : {
        en: "It's free, and there's no obligation. We'll make it and WhatsApp it to you in one or two working days.",
        zh: '不用钱，也不用马上决定。我们做好了（一两个工作天）就用 WhatsApp 发给你。',
        ms: 'Percuma, tiada komitmen. Kami siapkan dan WhatsApp kepada anda dalam satu atau dua hari bekerja.',
      },
      close: has ? {
        en: "Great, thank you! Is this number on WhatsApp? And may I know your name? I'll send it right after this call.",
        zh: '好，谢谢！这个号码有 WhatsApp 吗？请问怎么称呼？我挂了电话马上发给你。',
        ms: 'Baik, terima kasih! Nombor ini ada WhatsApp? Boleh saya tahu nama? Saya hantar sebaik sahaja habis panggilan ini.',
      } : {
        en: "Great, thank you! Is this number on WhatsApp? And may I know your name? We'll send it in one or two working days.",
        zh: '好，谢谢！这个号码有 WhatsApp 吗？请问怎么称呼？我们一两个工作天内发给你。',
        ms: 'Baik, terima kasih! Nombor ini ada WhatsApp? Boleh saya tahu nama? Kami hantar dalam satu atau dua hari bekerja.',
      },
    };
    const steps = [['1 找老板', T.owner], ['2 介绍（15 秒）', T.intro], ['3 说下一步（不用问「可以吗」）', T.ask], ['4 对方没反对，收尾', T.close]];
    const objs = [
      ['老板不在 / 员工接的', { en: 'No problem. What time is the owner usually in? I\'ll call back then.', zh: '没关系。老板通常几点比较方便？我那个时候再打。', ms: 'Tak apa. Pukul berapa pemilik biasanya ada? Saya telefon semula nanti.' }, 'callback'],
      ['现在很忙', { en: "Sorry to catch you at a busy time. I'll WhatsApp you the link, so you can look later.", zh: '不好意思打扰。我先 WhatsApp 发给你，你有空再看。', ms: 'Maaf ganggu waktu sibuk. Saya WhatsApp pautannya, anda tengok bila senang.' }, 'ok'],
      ['多少钱？', { en: `The sample is free. If you'd like your own website, it starts from ${STUDIO_PRICE}, one-off, fixed and written down. For the festive season there's also a festive pre-order shop from RM399. I'll send the details together with the link.`, zh: `样板是免费的。如果要做正式的网站，一次性 ${STUDIO_PRICE} 起，价钱固定、写清楚。节日季也可以先做一个节日预购网店，RM399。我把详细资料跟样板一起发给你。`, ms: `Contoh ini percuma. Kalau nak laman web sendiri, harga bermula ${STUDIO_PRICE} sekali bayar, harga tetap dan bertulis. Untuk musim perayaan ada juga kedai pre-order perayaan dari RM399. Saya hantar butiran bersama pautan.` }, ''],
      ['我们已经有 Shopee / Instagram / foodpanda', { en: "That's fine, keep them. This gives your regulars one link to order from you directly, without paying commission on every order.", zh: '没关系，那些照样用。这个是让熟客有一个链接直接跟你订，不用每一单都给平台抽佣。', ms: 'Tak apa, teruskan. Ini beri pelanggan tetap satu pautan untuk tempah terus dengan anda, tanpa komisen setiap pesanan.' }, ''],
      ['我们已经有网站', { en: "Oh, that's great. Sorry to bother you, and have a good day!", zh: '哦，那很好。不好意思打扰了，祝生意兴隆！', ms: 'Oh, bagus. Maaf mengganggu, selamat maju jaya!' }, 'has_site'],
      ['不需要', { en: 'No problem at all. Thank you for your time, and have a good day!', zh: '没问题，谢谢你的时间，祝生意兴隆！', ms: 'Tak apa. Terima kasih atas masa anda, selamat maju jaya!' }, 'no'],
      ['你们怎么有我的电话？', { en: `We found ${n} in an article online, with this number. Sorry for calling out of the blue.`, zh: `我们在网上的报道看到 ${n}，上面有这个号码。不好意思突然打来。`, ms: `Kami jumpa ${n} dalam artikel online, dengan nombor ini. Maaf telefon tiba-tiba.` }, ''],
      ['先发 Email 给我', { en: "Sure. What's your email address? I'll send the link there.", zh: '可以。你的 Email 是什么？我发到那里。', ms: 'Boleh. Apa alamat email anda? Saya hantar ke situ.' }, 'email'],
    ];
    return { L, steps, objs };
  }
  const OUT_BTN = { callback: '改天再打', ok: '说可以', has_site: '已经有网站', no: '不需要', email: '记下 Email' };
  function sayHTML(L, t) {
    return `<p class="say">${esc(t[L] || t.en)}</p>${L !== 'zh' ? `<p class="say__zh">意思：${esc(t.zh)}</p>` : ''}`;
  }
  function scriptHTML(p, withButtons) {
    const sc = scriptOf(p);
    const steps = sc.steps.map(([h, t]) => `<li><b>${esc(h)}</b>${sayHTML(sc.L, t)}</li>`).join('');
    const objs = sc.objs.map(([h, t, out]) => `<details class="obj2"><summary>${esc(h)}</summary>${sayHTML(sc.L, t)}${withButtons && out ? `<button class="btn btn--ghost btn--sm" data-act="cs-out" data-out="${out}" data-id="${p.id}">按：${OUT_BTN[out]}</button>` : ''}</details>`).join('');
    return `<ol class="steps2">${steps}</ol><div class="objs2"><div class="objs2__h">对方可能会说</div>${objs}</div>`;
  }
  // second call (2026-11-12): most owners said "send it, I'll look" on the first call; this call is where the sale happens
  const FESTIVE_PRICE = 'RM399'; // festive pre-order shop in site/studio.json "starts"
  function festiveNow() {
    const t = S.today || '';
    if (t < '2026-12-20') return { en: 'Christmas and Chinese New Year', zh: '圣诞和农历新年', ms: 'Krismas dan Tahun Baru Cina' };
    if (t < '2027-02-01') return { en: 'Chinese New Year', zh: '农历新年', ms: 'Tahun Baru Cina' };
    if (t < '2027-03-05') return { en: 'Hari Raya', zh: '开斋节', ms: 'Hari Raya' };
    return { en: 'the next festive season', zh: '下一个节日', ms: 'musim perayaan seterusnya' };
  }
  function secondOf(p) {
    const L = ['en', 'zh', 'ms'].includes(p.language) ? p.language : 'en';
    const n = p.business_name;
    const f = festiveNow();
    const T = {
      open: { en: `Hi, this is Cartsmith Studio. We sent you the free sample website for ${n} on WhatsApp the other day. Did you get a chance to look?`, zh: `你好，我是 Cartsmith Studio。前两天用 WhatsApp 发了 ${n} 的免费样板网站给你，你有空看了吗？`, ms: `Hai, ini Cartsmith Studio. Kami ada WhatsApp contoh laman web percuma untuk ${n} beberapa hari lepas. Sempat tengok?` },
      price: { en: `Thanks for looking. Everything on it can change: your own photos, today's prices. To make it your own website, it's from ${STUDIO_PRICE}, one-off, fixed and written down; or nothing upfront and RM199 a month. As one of our first clients you pay the second half only when you're happy, and it's live in 7 working days.`, zh: `谢谢你看。上面的东西都可以换：你们自己的照片、现在的价钱。做成你们自己的网站，一次性 ${STUDIO_PRICE} 起，价钱固定、写清楚；不想一次付也可以，一开始不用钱，每个月 RM199。你是我们最早的几位客户之一，满意了才付另一半，7 个工作天上线。`, ms: `Terima kasih sudi tengok. Semua boleh ditukar: gambar sendiri, harga terkini. Untuk jadikan laman web anda sendiri, dari ${STUDIO_PRICE} sekali bayar, harga tetap dan bertulis; atau tiada bayaran awal, RM199 sebulan. Sebagai antara pelanggan terawal kami, baki dibayar hanya bila anda puas hati, dan siap dalam 7 hari bekerja.` },
      festive: { en: `With ${f.en} coming, customers start asking about festive orders weeks before. If you'd like to start small, we can do just a festive pre-order shop for ${FESTIVE_PRICE}: customers pay online and you get the orders by email, live in 3 working days, and the ${FESTIVE_PRICE} comes off the full website later.`, zh: `${f.zh}快到了，客人通常提早几个星期就开始问节日的订单。想先试小一点，可以只做一个节日预购网店，${FESTIVE_PRICE}，顾客网上付款、订单自动寄到你的电邮，3 个工作天上线；之后做正式网站，这 ${FESTIVE_PRICE} 全额扣掉。`, ms: `Dengan ${f.ms} semakin dekat, pelanggan mula bertanya tentang tempahan perayaan beberapa minggu lebih awal. Kalau nak mula kecil, kami boleh buat kedai pre-order perayaan sahaja, ${FESTIVE_PRICE}, siap dalam 3 hari bekerja, dan ${FESTIVE_PRICE} itu ditolak bila buat laman web penuh nanti.` },
      close: { en: "I'll WhatsApp you a short written quotation today, so you have all the details in one place. I can also drop by for 15 minutes to show you on the phone. Which day suits you?", zh: '我今天用 WhatsApp 发一份简单的报价给你，细节都写清楚。方便的话我也可以过去 15 分钟，用手机给你看。你哪一天比较方便？', ms: 'Saya WhatsApp sebut harga ringkas hari ini, semua butiran di satu tempat. Saya juga boleh singgah 15 minit untuk tunjuk di telefon. Hari apa yang sesuai?' },
      notyet: { en: "No problem, it only takes two minutes on your phone. I'll WhatsApp you the link and password again now, and give you a quick call in two days.", zh: '没关系，用手机看两分钟就好。我现在再发一次网址和密码给你，两天后再打给你。', ms: 'Tak apa, dua minit sahaja di telefon. Saya WhatsApp pautan dan kata laluan sekali lagi sekarang, dan telefon semula dalam dua hari.' },
    };
    const d = p.demo;
    if (d) T.demo = { en: `We've also just finished a complete demo website for ${d.kind.en}, with everything working. I'll WhatsApp you the link, so you can see what yours could do.`, zh: `我们也刚做好一个${d.kind.zh}的完整示范网站，每个功能都能用。我用 WhatsApp 把网址发给你，你可以看看你们的网站能做到什么。`, ms: `Kami juga baru siapkan laman web demo lengkap untuk ${d.kind.ms}, semua fungsi boleh digunakan. Saya WhatsApp pautannya, supaya anda boleh lihat apa yang laman web anda boleh buat.` };
    const steps = [['1 开场', T.open], ['2 看过了：先听他说，再讲价钱', T.price], ...(d ? [['2b 完整示范：' + d.name + '（跟进信息里已附网址）', T.demo]] : []), ['3 节日：更小的第一步', T.festive], ['4 约下一步，然后按「有兴趣」', T.close], ['还没看：重发，然后按「还没看：重发」', T.notyet]];
    const objs = [
      ['要问老板 / 合伙人', { en: "Of course. I'll WhatsApp a short summary with the price so you can forward it. When's a good time to call you back?", zh: '当然。我用 WhatsApp 发一份有价钱的简介，你可以直接转给他。什么时候方便再打给你？', ms: 'Sudah tentu. Saya WhatsApp ringkasan dengan harga supaya boleh dihantar terus. Bila sesuai saya telefon semula?' }],
      ['现在不急 / 节日后再说', { en: `Understood. If you want this season's pre-orders, the festive shop is the small step. Otherwise no problem, the sample stays up until ${p.preview_delete_by || 'its delete date'}.`, zh: `明白。想接这个节日的预购，节日预购网店是最小的一步；不然也没关系，样板会留到 ${p.preview_delete_by || '删除日'}。`, ms: `Faham. Kalau nak pre-order musim ini, kedai perayaan ialah langkah kecil. Kalau tidak, tak apa, contoh ini kekal sehingga ${p.preview_delete_by || 'tarikh dipadam'}.` }],
      ['太贵', { en: `There's nothing upfront and RM199 a month, or the ${FESTIVE_PRICE} festive shop to start. Both are fixed and written down; I'll put them in the quotation.`, zh: `也可以一开始不用钱，每个月 RM199；或者先做 ${FESTIVE_PRICE} 的节日预购网店。两个都是固定价钱，我写进报价里。`, ms: `Ada pilihan tiada bayaran awal, RM199 sebulan, atau kedai perayaan ${FESTIVE_PRICE} dahulu. Kedua-dua harga tetap; saya masukkan dalam sebut harga.` }],
      ['我们用 WhatsApp / 电话接单就够了', { en: 'That works, and orders can still come to your WhatsApp. The difference is they arrive already filled in, with the items, the date and the name, so there is less back and forth.', zh: '可以的，订单照样到你的 WhatsApp。不同的是，订单来的时候已经填好：要什么、哪一天、叫什么名字，不用来回问。', ms: 'Boleh, tempahan masih masuk ke WhatsApp anda. Bezanya, ia sampai sudah lengkap: barang, tarikh dan nama, jadi kurang berbalas-balas.' }],
      ['菜单每天换', { en: "That's fine. The website can show today's menu, changed from your phone in a minute, or only the fixed items and the festive sets.", zh: '没关系。网站可以放「今日菜单」，你用手机一分钟就改好；或者只放固定的和节日套餐。', ms: 'Tak apa. Laman web boleh tunjuk menu hari ini, ditukar dari telefon dalam seminit, atau hanya menu tetap dan set perayaan.' }],
      ['不需要', { en: 'No problem, thank you for taking a look. Have a good day!', zh: '没问题，谢谢你花时间看。祝生意兴隆！', ms: 'Tak apa, terima kasih kerana sudi tengok. Selamat maju jaya!' }],
    ];
    return { L, steps, objs };
  }
  // the complete demo website that fits this shop (picked by the server from its niche) + the festive shop demo
  function demoRow(p) {
    if (!p.demo && !p.fest_demo) return '';
    return `<div class="pvbox__row pvbox__demo"><b>适合他的示范</b>${p.demo ? `<a href="${esc(p.demo.url)}" target="_blank" rel="noopener">${esc(p.demo.name)}</a><span>${esc(p.demo.zh)}</span>` : '<span>没有（不是餐饮：用 6 个商店模板）</span>'}${p.fest_demo ? `<a href="${esc(p.fest_demo)}" target="_blank" rel="noopener">节日预购网店 RM399</a>` : ''}</div>`;
  }
  function secondHTML(p) {
    const sc = secondOf(p);
    const steps = sc.steps.map(([h, t]) => `<li><b>${esc(h)}</b>${sayHTML(sc.L, t)}</li>`).join('');
    const objs = sc.objs.map(([h, t]) => `<details class="obj2"><summary>${esc(h)}</summary>${sayHTML(sc.L, t)}</details>`).join('');
    const seen = p.preview_views && p.preview_views.visits ? '<p class="hint">他打开过样板：可以直接从第 2 步开始。不要说你看得到。</p>' : (p.preview_views ? '' : '<p class="hint">没有看到他打开样板的记录：多半要用「还没看」那一句。不要说你看得到。</p>');
    return `${seen}<ol class="steps2">${steps}</ol><div class="objs2"><div class="objs2__h">对方可能会说</div>${objs}</div>`;
  }
  const pvChecked = (p) => p.preview_checked ? `<span class="okbadge">${svg('check', 12)}样板已检查 ${esc(p.preview_checked)}</span>` : '<span class="warnbadge">样板还没检查：发之前先打开看一遍</span>';

  // ------------------------------------------------------------ 连续打电话 (2026-11-10): dial → say → outcome → (yes) send the mockup on WhatsApp → next
  const callRank = (p) => (p.next_call_date ? 0 : p.status === 'contacted' ? 1 : p.preview_url ? 2 : 3);
  function callQueue() {
    return S.items.filter((p) => callNo(p) && ['new', 'contacted'].includes(p.status) && p.last_call_date !== S.today && (p.call_misses || 0) < 3
      && (!p.next_call_date || p.next_call_date <= S.today) && !p.duplicate_of && p.fit !== 'skip' && (p.status !== 'new' || p.score >= 3))
      .sort((a, b) => callRank(a) - callRank(b) || b.score - a.score || (a.id < b.id ? -1 : 1)).map((p) => p.id);
  }
  function startCalls(firstId) {
    const ids = callQueue();
    if (firstId && !ids.includes(firstId)) ids.unshift(firstId);
    else if (firstId) { ids.splice(ids.indexOf(firstId), 1); ids.unshift(firstId); }
    if (!ids.length) { toast('今天没有要打的电话了。'); return; }
    S.cq = { ids, i: 0, stage: 'script', calls: 0, ok: 0, sent: 0 };
    renderCalls();
  }
  function nextCall() { S.cq.i++; S.cq.stage = 'script'; renderCalls(); }
  function renderCalls() {
    const q = S.cq;
    const p = q && S.items.find((x) => x.id === q.ids[q.i]);
    if (!p) { const d = q || {}; S.cq = null; closeSheet(); render(); toast(`连续打电话结束：打了 ${d.calls || 0} 通，${d.ok || 0} 家说可以，发了 ${d.sent || 0} 个样板。`); return; }
    const sub = [p.area, LANG[p.language], STATUS[p.status], p.calls ? `打过 ${p.calls} 次` : ''].filter(Boolean).map(esc).join('<span class="dot">·</span>');
    const pv = p.preview_url ? `<div class="pvbox"><div class="pvbox__row"><b>样板</b><a href="${esc(p.preview_url)}" target="_blank" rel="noopener">打开看看</a><span>密码 <code>${esc(p.preview_password || '')}</code></span></div>${pvChecked(p)}</div>` : '<p class="warnbadge">还没有样板：对方说可以的话，跟 Claude Code 说「帮我做 ' + esc(p.business_name) + ' 的样板」。</p>';
    let body;
    if (q.stage === 'send') {
      const field = p.draft_reply ? 'draft_reply' : 'preview_msg';
      body = `<div class="cs-yes">${svg('check', 18)}<b>说可以了！现在发样板</b></div>
        ${msgBox(p, field, '发给对方的信息（网址和密码已经填好）')}
        <div class="send"><span class="send__label">发送</span><div class="send__btns">${waNo(p) ? `<button class="btn btn--sm ch ch--wa" data-act="cs-wa" data-field="${field}" data-id="${p.id}">${svg('wa', 16)}WhatsApp ${esc(fmtPhone(waNo(p)))}</button>` : ''}${p.email ? `<button class="btn btn--sm ch ch--mail" data-act="email" data-field="${field}" data-id="${p.id}">${svg('mail', 16)}Email</button>` : ''}</div></div>
        <div class="btnrow"><button class="btn" data-act="cs-sent" data-id="${p.id}">${svg('check', 16)}已发样板，下一家</button><button class="btn btn--ghost" data-act="cs-next">先不发，下一家</button></div>
        <p class="hint">按 WhatsApp 会打开对方的对话，信息已经填好；看一遍按发送，回来按「已发样板，下一家」。${waNo(p) ? '' : '这个号码是座机：问对方的 WhatsApp，在卡片「编辑」补上，或者用 Email。'}</p>`;
    } else {
      body = `<button class="btn btn--block cs-dial" data-act="cs-dial" data-id="${p.id}">${svg('phone', 18)}拨打 ${esc(fmtPhone(callNo(p)))}</button>
        ${pv}
        ${p.observation ? `<p class="hint">可以提的一点：${esc(p.observation)}</p>` : ''}
        ${scriptHTML(p, true)}
        <div class="callout"><b>电话打得怎么样？</b>
          <div class="btnrow">
            <button class="btn btn--sm" data-act="cs-out" data-out="ok" data-id="${p.id}">${svg('check', 16)}说可以</button>
            <button class="btn btn--ghost btn--sm" data-act="cs-out" data-out="no_answer" data-id="${p.id}">没接</button>
            <button class="btn btn--ghost btn--sm" data-act="cs-out" data-out="no" data-id="${p.id}">不需要</button>
          </div>
          <div class="callout__later"><label>改天再打<input type="date" data-call-date value="${esc(nextDay())}" min="${esc(S.today)}"></label><button class="btn btn--ghost btn--sm" data-act="cs-out" data-out="callback" data-id="${p.id}">记下</button><button class="linkbtn" data-act="cs-next">跳过这家</button></div></div>`;
    }
    sheet(`<div class="sheet__head"><h3>连续打电话 · ${q.i + 1} / ${q.ids.length}</h3>${closeBtn}</div>
      <div class="q cs" data-cs="${p.id}"><div class="card__name">${esc(p.business_name)}</div><div class="card__sub">${sub}</div>${body}</div>`);
  }

  // ------------------------------------------------------------ today's plan (2026-11-10): what to do now, how much is left, what's done
  function timeHint() {
    const t = nowMY();
    if (t < 600) return ['早上', '电话时间还没到。先回复信息、看看样板。10:00 后可以打给卖产品的店。'];
    if (t < 690) return ['适合打给卖产品的店', '10:00–11:30：卖产品、做蛋糕和 kuih 的店比较有空。餐厅这时候在准备午餐。'];
    if (t < 840) return ['午餐时间', '11:30–14:00 餐厅最忙：先不要打给餐厅，先回复信息、发样板。'];
    if (t < 870) return ['快到打电话时间', '14:30 开始最适合打给餐厅和咖啡馆。'];
    if (t < 1020) return ['现在最适合打电话', '14:30–17:00：餐厅、咖啡馆和店家都比较有空，一口气打完。'];
    if (t < 1080) return ['可以再打几通', '17:00–18:00 还可以，18:00 后餐厅开始忙晚餐。'];
    if (t < 1260) return ['晚餐时间', '餐厅在忙：先不要打电话，可以回复信息、准备明天的名单。'];
    return ['太晚了', '今天的电话时间过了。明天 10:00 后再打。'];
  }
  function doneToday() {
    let calls = 0, sent = 0, pv = 0;
    S.items.forEach((p) => (p.history || []).forEach((h) => { if (h.d !== S.today) return; if (h.e === 'call') calls++; else if (h.e === 'sent') sent++; else if (h.e === 'preview_sent') pv++; }));
    return { calls, sent, pv };
  }
  function planHTML(c) {
    const [h, tip] = timeHint();
    const d = doneToday();
    const chip = (id, label, n) => n ? `<a class="plan__chip" href="#${id}">${esc(label)} <b>${n}</b></a>` : '';
    return `<section class="plan" data-plan><div class="plan__top"><div><b>${esc(h)}</b><small>${esc(tip)}</small></div></div>
      <div class="plan__chips">${chip('s-send', '要发样板', c.send)}${chip('s-replied', '有回复', c.replied)}${chip('s-viewed', '刚看过样板', c.viewed)}${chip('s-follow', '要跟进', c.follow)}${chip('s-fresh', '新联系', c.fresh)}</div>
      ${c.calls ? `<button class="btn btn--block plan__go" data-act="cs-start">${svg('phone', 18)}开始连续打电话（${c.calls} 家）</button>` : ''}
      <p class="plan__done">今天已经：打了 ${d.calls} 通电话 · 发了 ${d.pv} 个样板 · 发了 ${d.sent} 条信息</p></section>`;
  }

  // ------------------------------------------------------------ mockup views (2026-11-11): did they open it?
  // From /api/track (the mockup's password page). Junyu's own opens on this device are not counted (cookie cs_staff below).
  const nowMs = () => (window.DESK_NOW ? Date.parse(window.DESK_NOW) : Date.now());
  const myClock = (iso) => { const m = new Date(Date.parse(iso) + 8 * 3600e3); return { d: m.toISOString().slice(0, 10), t: m.toISOString().slice(11, 16) }; };
  function whenTxt(iso) {
    if (!iso) return '';
    const c = myClock(iso), today = myClock(new Date(nowMs()).toISOString()).d, yest = myClock(new Date(nowMs() - 86400e3).toISOString()).d;
    return (c.d === today ? '今天 ' : c.d === yest ? '昨天 ' : c.d.slice(5) + ' ') + c.t;
  }
  const KIND = { mobile: '手机', desktop: '电脑', tablet: '平板' };
  function pageName(pg) {
    const m = { 'index.html': '首页', 'shop.html': '全部产品', 'about.html': '关于', 'help.html': '帮助', 'cart.html': '购物车', 'checkout.html': '结账', 'order.html': '下单完成', 'contact.html': '联络' }[pg];
    if (m) return m;
    const pm = pg.match(/^p\/(.+)\.html$/);
    return pm ? pm[1].split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : pg.replace(/\.html$/, '');
  }
  const viewedRecently = (p, hours) => { const v = p.preview_views; return !!(v && v.last && nowMs() - Date.parse(v.last) < hours * 3600e3); };
  function viewsLine(p) {
    const v = p.preview_views;
    if (!p.preview_url) return '';
    const self = v && v.staff ? `<small class="views__self">你自己看过 ${v.staff} 次（不算）</small>` : '';
    if (!v || (!v.views && !v.gates)) return p.status === 'preview_sent' ? `<p class="views views--none">${svg('eye', 14)}对方还没打开过样板${self}</p>` : (self ? `<p class="views views--none">${svg('eye', 14)}还没有人打开过${self}</p>` : '');
    if (!v.views) return `<p class="views views--stuck">${svg('eye', 14)}打开了链接，但还没输入密码 · 最后 ${esc(whenTxt(v.last))}<small>可能找不到密码：可以再发一次网址和密码。</small>${self}</p>`;
    const mins = Math.max(1, Math.round(v.secs / 60));
    const tried = v.pages.some(([pg]) => /^(cart|checkout|order)\.html$/.test(pg));
    const pages = v.pages.map(([pg]) => esc(pageName(pg))).join('、');
    return `<p class="views views--yes">${svg('eye', 14)}<b>看过样板 ${v.visits} 次</b> · ${v.devices} 部${esc(v.kinds.map((k) => KIND[k] || k).join(' / '))} · ${v.views} 页 · 约 ${mins} 分钟 · 最后 ${esc(whenTxt(v.last))}<small>看了：${pages}${tried ? ' · 还试了下单流程' : ''}</small>${self}</p>`;
  }
  // short row for the Today list (the full card is in its own section / the list, so it is not shown twice)
  const viewedRow = (p) => `<div class="card card--mini" data-viewed="${p.id}"><div class="mini__head"><b>${esc(p.business_name)}</b><span class="tag tag--status s-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span></div>${viewsLine(p)}<div class="btnrow">${callNo(p) ? `<a class="btn btn--sm" href="tel:+${esc(callNo(p))}">${svg('phone', 16)}打电话</a>` : ''}<button class="btn btn--ghost btn--sm" data-act="open-card" data-id="${p.id}">打开卡片</button></div></div>`;
  // this device is Junyu's: his own opens of a mockup are not counted (same site: cartsmithstudio.com and previews.cartsmithstudio.com)
  function markStaff() { try { document.cookie = 'cs_staff=1; Max-Age=31536000; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------ finished mockup on the card (2026-11-09)
  const hasPv = (p) => !!(p.preview_url && p.preview_password && p.preview_msg && p.status !== 'preview_sent');
  function pvBlock(p) {
    if (!p.preview_url || !p.preview_password || ['do_not_contact', 'won', 'lost'].includes(p.status)) return '';
    let h = `<div class="pvbox" data-pvbox><div class="pvbox__row"><b>样板</b><a href="${esc(p.preview_url)}" target="_blank" rel="noopener">打开看看</a><span>密码 <code>${esc(p.preview_password)}</code></span><button class="linkbtn" data-act="copy-pv" data-id="${p.id}">复制网址和密码</button></div>${p.status === 'preview_sent' ? '' : pvChecked(p)}<small>${esc(p.preview_delete_by)} 删除${p.status === 'preview_sent' ? ' · 已经发给对方' : ''}</small>${viewsLine(p)}${demoRow(p)}</div>`;
    if (p.status !== 'preview_sent' && p.preview_msg && !(p.status === 'replied' && p.draft_reply)) {
      h += msgBox(p, 'preview_msg', '发给对方的信息（已附上样板网址和密码，可以直接改）') + sendRow(p, 'preview_msg');
      h += `<div class="btnrow btnrow--end"><button class="btn btn--ghost btn--sm" data-act="pv-sent" data-id="${p.id}">${svg('check', 16)}已发样板</button></div>`;
    }
    return h;
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
    const moreBtn = `<button class="btn btn--ghost btn--sm" data-act="ai" data-id="${p.id}">${svg('chat', 16)}AI${p.ai_count ? ' · ' + p.ai_count : ''}</button><button class="btn btn--ghost btn--sm btn--icon" data-act="more" data-id="${p.id}" aria-label="更多">${svg('more', 18)}</button>`;
    const sentBtn = `<button class="btn btn--ghost btn--sm" data-act="sent" data-id="${p.id}">${svg('check', 16)}已发送</button>`;
    if (mode === 'analysis') {
      body += `<ul class="crit">${Object.keys(CRIT).map((k) => `<li class="${p[k] ? 'on' : ''}">${svg(p[k] ? 'check' : 'x', 14)}<span>${CRIT[k]}</span></li>`).join('')}</ul>`;
      if (p.criteria_note) body += `<p class="note">${esc(p.criteria_note)}</p>`;
      if (p.fit_reason) body += `<p class="note"><b>${p.fit === 'skip' ? '建议跳过' : p.fit === 'maybe' ? '可以试试' : '值得联系'}：</b>${esc(p.fit_reason)}</p>`;
    }
    if (p.observation) body += `<p class="obs">${esc(p.observation)}</p>`;
    if (p.verify && p.status === 'new') body += `<p class="verify">${svg('pin', 14)}<span>发之前看一眼：${esc(p.verify)}</span></p>`;
    body += contacts(p);
    body += pvBlock(p);
    body += callBlock(p);

    if (p.status === 'new' && hasPv(p)) {
      body += `<div class="btnrow btnrow--end">${moreBtn}</div>`;
    } else if (p.status === 'new') {
      body += msgBox(p, 'message', '开场白（可以直接改）') + sendRow(p, 'message');
      body += `<div class="btnrow btnrow--end">${sentBtn}${moreBtn}</div>`;
    } else if (p.status === 'replied') {
      if (p.draft_reply && p.call_ok) {
        body += `<div class="cs-yes">${svg('check', 18)}<b>电话说可以：现在发样板</b></div>`;
        body += msgBox(p, 'draft_reply', '发给对方的信息（网址和密码已经填好）') + sendRow(p, 'draft_reply');
        body += `<div class="btnrow btnrow--end"><button class="btn btn--ghost btn--sm" data-act="pv-sent" data-id="${p.id}">${svg('check', 16)}已发样板</button>${moreBtn}</div>`;
      } else if (p.draft_reply) {
        body += `<div class="draft"><b>对方意思：</b>${esc(p.reply_summary || '')}<br><b>下一步：</b>${esc(p.reply_next || '')}</div>`;
        body += msgBox(p, 'draft_reply', 'AI 起草的回信（看过再发）') + sendRow(p, 'draft_reply');
        body += `<div class="btnrow btnrow--end"><button class="btn btn--ghost btn--sm" data-act="replied-more" data-id="${p.id}">记录进度</button>${moreBtn}</div>`;
      } else {
        if (p.reply_summary) body += `<div class="draft"><b>对方意思：</b>${esc(p.reply_summary)}<br><b>下一步：</b>${esc(p.reply_next || '')}${p.reply_intent === 'closed' ? '<br><b>不用再回。</b>' : ''}</div>`;
        body += `<div class="btnrow">${p.reply_summary ? `<button class="btn btn--sm" data-act="replied-more" data-id="${p.id}">记录进度</button>` : ''}<button class="btn ${p.reply_summary ? 'btn--ghost ' : ''}btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}贴上对方的回复，起草回信</button>${moreBtn}</div>`;
      }
    } else if (['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && (due || mode === 'full')) {
      if (p.followup) {
        body += msgBox(p, 'followup', p.status === 'contacted' ? (p.touches <= 1 ? '第 2 条：给一个有用的资讯' : '最后一条') : p.status === 'preview_sent' ? ['跟进信息（第 1 条：网址密码、适合他的示范网站、三种开始方式：RM800 起 / 每月 RM199 / 节日预购网店 RM399）', '跟进信息（第 2 条：换一个有用的角度）', '最后一条（礼貌收尾）'][Math.min(2, p.pv_followups || 0)] : '跟进信息') + sendRow(p, 'followup');
        body += `<div class="btnrow btnrow--end">${sentBtn}${moreBtn}</div>`;
      } else {
        body += `<div class="btnrow"><button class="btn btn--sm" data-act="followup" data-id="${p.id}">${svg('pen', 16)}写跟进信息${p.status === 'preview_sent' ? `（第 ${Math.min(3, (p.pv_followups || 0) + 1)} 条）` : ''}</button><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}对方有回复</button>${moreBtn}</div>`;
      }
    } else if (secondDue(p)) {
      body += `<div class="btnrow"><button class="btn btn--ghost btn--sm" data-act="reply" data-id="${p.id}">${svg('reply', 16)}对方有回复</button>${moreBtn}</div>`;
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
    if (callNo(p) && (field === 'message' || (field === 'followup' && !secondDue(p)) || (field === 'preview_msg' && ['new', 'contacted'].includes(p.status)))) b.push(['call', callBtn(p)]);
    if (waNo(p)) b.push(['wa', `<button class="btn btn--sm ch ch--wa" data-act="wa" data-field="${field}" data-id="${p.id}">${svg('wa', 16)}WhatsApp ${esc(fmtPhone(waNo(p)))}</button>`]);
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
    const follow = S.items.filter((p) => (['contacted', 'preview_sent', 'proposal_sent', 'call_booked'].includes(p.status) && p.next_followup_date && p.next_followup_date <= S.today) || secondDue(p));
    const sendNow = S.items.filter((p) => p.status === 'replied' && p.call_ok);
    const replied = S.items.filter((p) => p.status === 'replied' && !p.call_ok);
    const calls = S.items.filter((p) => callDue(p));
    const purge = S.items.filter((p) => p.preview_delete_by && p.preview_delete_by <= S.today && p.status !== 'won');
    const viewed = S.items.filter((p) => viewedRecently(p, 48) && !['won', 'lost', 'do_not_contact'].includes(p.status)).sort((a, b) => Date.parse(b.preview_views.last) - Date.parse(a.preview_views.last));
    let h = planHTML({ calls: callQueue().length, send: sendNow.length, replied: replied.length, follow: follow.length, fresh: fresh.length, viewed: viewed.length });
    const newForms = (S.forms || []).filter((f) => !f.seen);
    if (newForms.length) h += sect('网站上的新申请', newForms.length, newForms.map(formRow).join(''), '', 's-forms');
    if (S.inbox.length) h += inboxSect();
    if (sendNow.length) h += sect('电话说可以，现在发样板', sendNow.length, sendNow.map((p) => card(p)).join(''), '', 's-send');
    if (replied.length) h += sect('有回复，等你回', replied.length, replied.map((p) => card(p)).join(''), '', 's-replied');
    if (viewed.length) h += sect('刚看过样板（48 小时内）：趁现在跟进', viewed.length, viewed.map(viewedRow).join(''), '', 's-viewed');
    if (calls.length) h += sect('今天要再打的电话', calls.length, calls.map((p) => card(p)).join(''), '');
    if (follow.length) h += sect('今天要跟进', follow.length, follow.map((p) => card(p)).join(''), '', 's-follow');
    if (left && fresh.length) h += `<div class="queuebar"><div><b>连续发送</b><small>一家一家打开已经填好的 WhatsApp / Email / Instagram，你按发送，再按「下一家」。有 WhatsApp / Email 的排前面。</small></div><button class="btn btn--sm" data-act="queue-start">开始（${Math.min(left, fresh.length)} 家）</button></div>`;
    h += sect(`新联系 · 今天还可以发 ${left} 个`, fresh.length, left ? fresh.slice(0, Math.max(left, 1) + 2).map((p) => card(p)).join('') : '<div class="empty">今天的新联系已经发满了，明天继续。</div>', '名单里没有待联系的商家。', 's-fresh');
    if (purge.length) h += sect('样板到期，要删除', purge.length, purge.map((p) => `<div class="card"><p>${esc(p.business_name)} 的样板 ${esc(p.preview_url || '')} 已到期（${esc(p.preview_delete_by)}）。跟 Claude Code 说「删除 ${esc(p.business_name)} 的样板」，删好后按：</p><div class="btnrow"><button class="btn btn--sm" data-act="purged" data-id="${p.id}">已删除样板</button></div></div>`).join(''), '');
    $('[data-today-list]').innerHTML = h;
  }
  // ------------------------------------------------------------ website forms (2026-11-12): free mockup requests and AI chat leads from /api/form
  const FORM_NAME = { 'mockup-request': '网站上申请免费样板', 'ai-chat-lead': 'AI 客服留下的资料' };
  const FORM_FIELD = { name: '名字', brand: '品牌', whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'Email', contact: '联系方式', shop_url: '店铺链接', template: '喜欢的模板', package: '套餐', products: '产品数量', message: '留言', interest: '想要什么', language: '语言', transcript: '对话' };
  function formRow(f) {
    const rows = Object.entries(f.fields || {}).filter(([k, v]) => v && k !== 'consent').map(([k, v]) => `<li><b>${esc(FORM_FIELD[k] || k)}</b> ${esc(String(v).slice(0, k === 'transcript' ? 600 : 300))}</li>`).join('');
    return `<div class="card card--mini" data-form-row="${esc(f.id)}"><div class="mini__head"><b>${esc(FORM_NAME[f.form] || f.form)}</b><small>${esc(whenTxt(f.at))}</small></div><ul class="formlist">${rows}</ul>
      <div class="btnrow"><button class="btn btn--ghost btn--sm" data-act="form-seen" data-form="${esc(f.id)}">${svg('check', 16)}已看过（加进名单请到「加商家」）</button></div></div>`;
  }
  function inboxSect() {
    const rows = S.inbox.map((l) => `<li><div class="inbox__main"><div class="inbox__name"><b>${esc(l.name)}</b>${l.priority ? `<span class="tag">${esc(l.priority)} 级</span>` : ''}<span class="inbox__ch" title="已知的联系方式">${svg('ig', 14)}${l.wa ? svg('wa', 14) : ''}${l.email ? svg('mail', 14) : ''}</span></div><small>${esc(l.why)}</small></div><button class="linkbtn" data-act="skip-lead" data-lead="${esc(l.id)}">跳过</button></li>`).join('');
    return `<section class="sect inbox" data-inbox><div class="sect__head"><h2>新商家</h2><small>Claude Code 找的 · ${S.inbox.length} 家</small></div>
      <div class="card"><p class="hint">资料已经整理好。不合适的先按「跳过」，再按下面的按钮：AI 会逐家打分、写好开场白，放进「新联系」。</p>
      <ul class="inbox__list">${rows}</ul>
      <button class="btn btn--block" data-act="import-all">全部加入（${S.inbox.length} 家，约 ${Math.max(1, Math.round(S.inbox.length * 8 / 60))} 分钟）</button></div></section>`;
  }
  function sect(title, n, inner, emptyMsg, id) {
    return `<section class="sect"${id ? ` id="${id}"` : ''}><div class="sect__head"><h2>${esc(title)}</h2><small>${n}</small></div>${inner || (emptyMsg ? `<div class="empty">${esc(emptyMsg)}</div>` : '')}</section>`;
  }
  const FILTERS = [['all', '全部'], ['table', '样板表'], ['visit', '拜访清单'], ['new', '未联系'], ['contacted', '已联系'], ['replied', '有回复'], ['preview_sent', '样板'], ['won', '成交'], ['low', '低分'], ['do_not_contact', '不再联系']];
  // ------------------------------------------------------------ mockup table (2026-11-09): every merchant's mockup, password and details in one place
  const ST_ORDER = ['new', 'contacted', 'replied', 'preview_sent', 'call_booked', 'proposal_sent', 'won', 'no_response', 'lost', 'do_not_contact'];
  function tableRows(q) {
    return S.items
      .filter((p) => (S.tableAll || p.preview_url) && (!q || [p.business_name, p.instagram, p.area, p.whatsapp, p.phone, p.preview_url].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => ST_ORDER.indexOf(a.status) - ST_ORDER.indexOf(b.status) || String(a.business_name).localeCompare(String(b.business_name)));
  }
  const nextStep = (p) => p.next_call_date ? '打电话 ' + p.next_call_date : (p.next_followup_date ? '跟进 ' + p.next_followup_date : (p.status === 'new' ? (callNo(p) ? '打电话' : '发开场白') : ''));
  function pvTable(q) {
    const rows = tableRows(q);
    const withPv = S.items.filter((p) => p.preview_url).length;
    const head = `<div class="tbl-bar"><span>${S.tableAll ? `全部商家 ${rows.length} 家` : `有样板的 ${rows.length} 家`}</span><button class="chip" data-act="tbl-all">${S.tableAll ? '只看有样板的' : '显示全部商家'}</button><button class="chip" data-act="tbl-copy">复制整张表</button></div>`;
    if (!rows.length) return head + `<div class="empty">${withPv ? '没有符合的商家' : '还没有样板。每天早上的任务做好样板后会出现在这里。'}</div>`;
    const tr = rows.map((p) => {
      const no = callNo(p);
      const tel = no ? `<a href="tel:+${esc(no)}">${esc(fmtPhone(no))}</a>${p.whatsapp ? ` <a class="tbl-wa" href="https://wa.me/${esc(p.whatsapp)}" target="_blank" rel="noopener" aria-label="WhatsApp">${svg('wa', 14)}</a>` : ''}` : '<span class="muted">—</span>';
      const pv = p.preview_url ? `<a href="${esc(p.preview_url)}" target="_blank" rel="noopener">打开</a>` : '<span class="muted">还没做</span>';
      const pw = p.preview_password ? `<code>${esc(p.preview_password)}</code> <button class="linkbtn" data-act="copy-pv" data-id="${p.id}">复制</button>` : '<span class="muted">—</span>';
      const late = p.preview_delete_by && p.preview_delete_by <= S.today && p.status !== 'won';
      const vv = p.preview_views;
      const seen = !p.preview_url ? '<span class="muted">—</span>' : vv && vv.views ? `<span class="seen">${svg('eye', 13)}${vv.visits} 次 · ${esc(whenTxt(vv.last))}</span>` : vv && vv.gates ? '<span class="seen seen--stuck">没输入密码</span>' : '<span class="muted">没打开</span>';
      return `<tr data-row="${p.id}"><th scope="row"><b>${esc(p.business_name)}</b>${p.instagram ? `<small>@${esc(p.instagram)}</small>` : ''}</th>
        <td><span class="tag tag--status s-${esc(p.status)}">${esc(STATUS[p.status] || p.status)}</span></td><td class="nowrap">${tel}</td><td>${pv}</td><td class="nowrap">${seen}</td><td class="nowrap">${pw}</td>
        <td class="nowrap${late ? ' late' : ''}">${esc(p.preview_delete_by || '—')}</td><td>${esc(p.area || '—')}</td><td class="nowrap">${esc(p.last_contact_date || '—')}</td><td class="nowrap">${esc(nextStep(p) || '—')}</td>
        <td><button class="linkbtn" data-act="open-card" data-id="${p.id}">卡片</button></td></tr>`;
    }).join('');
    return head + `<div class="tbl-wrap"><table class="pvtbl"><thead><tr><th>店名</th><th>状态</th><th>电话</th><th>样板</th><th>打开过</th><th>密码</th><th>删除日期</th><th>地区</th><th>最后联系</th><th>下一步</th><th></th></tr></thead><tbody>${tr}</tbody></table></div>`
      + '<p class="hint">表格可以左右滑。删除日期变红 = 已到期，跟 Claude Code 说删除那个样板。</p>';
  }
  function tableText() {
    const rows = tableRows(S.q.trim().toLowerCase());
    const cols = ['店名', '状态', '电话', 'WhatsApp', '样板网址', '密码', '删除日期', '地区', '地址', '最后联系', '下一步', 'Instagram'];
    const line = (p) => [p.business_name, STATUS[p.status] || p.status, fmtPhone(callNo(p)), p.whatsapp ? fmtWa(p.whatsapp) : '', p.preview_url || '', p.preview_password || '', p.preview_delete_by || '', p.area || '', p.address || '', p.last_contact_date || '', nextStep(p), p.instagram ? '@' + p.instagram : ''].map((x) => String(x || '').replace(/[\t\n]/g, ' ')).join('\t');
    return [cols.join('\t'), ...rows.map(line)].join('\n');
  }

  function renderList() {
    $('[data-filters]').innerHTML = FILTERS.map(([k, l]) => `<button class="chip${S.filter === k ? ' is-on' : ''}" data-filter="${k}">${l}</button>`).join('');
    const q = S.q.trim().toLowerCase();
    if (S.filter === 'visit') { $('[data-all-list]').innerHTML = visitList(q); return; }
    if (S.filter === 'table') { $('[data-all-list]').innerHTML = pvTable(q); return; }
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
      else if (reached('won') === 0 && reached('proposal_sent') >= 3) weakest = '有报价没成交：想想信任感（前 3 位客户满意才付尾款、7 天上线保证）和更小的第一步（节日预购网店 RM399、月付 RM199）。';
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
  const hasDirect = (p) => (waNo(p) || p.email ? 1 : 0);
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
        ${hasPv(p) ? msgBox(p, 'preview_msg', '发给对方的信息（已附上样板网址和密码）') : msgBox(p, 'message', '开场白（可以直接改）')}
        ${sendRow(p, hasPv(p) ? 'preview_msg' : 'message')}
        <div class="btnrow"><button class="btn" data-act="q-sent" data-id="${p.id}">${svg('check', 16)}已发送，下一家</button><button class="btn btn--ghost" data-act="q-skip">跳过</button></div>
        <p class="hint">先按上面其中一个发送方式，在 App 里看一遍再按发送，回来按「已发送，下一家」。按「跳过」不会记录，这家之后还会出现。</p>
      </div>`);
  }

  // ------------------------------------------------------------ sheet (more actions)
  function sheet(html) { $('[data-sheet-panel]').innerHTML = html; $('[data-sheet]').hidden = false; }
  function closeSheet() { $('[data-sheet]').hidden = true; S.queueOn = false; S.cq = null; }
  const closeBtn = `<button class="btn btn--ghost btn--sm btn--icon" data-sheet-close aria-label="关闭">${svg('x', 18)}</button>`;
  const row = (act, icon, label, id, extra) => `<button class="row" data-act="${act}" data-id="${id}"${extra || ''}>${svg(icon, 18)}<span>${label}</span></button>`;
  // ------------------------------------------------------------ per-customer AI assistant (2026-11-09)
  const AI_QUICK = [
    ['对方回了这个，帮我回：\n', '贴上对方的回复'],
    ['下一步我应该怎么做？', '下一步'],
    ['帮我写一条跟进信息。', '写跟进'],
    ['对方问价钱，我应该怎么回？', '问价钱'],
    ['对方说要考虑一下，我应该怎么回？', '说要考虑'],
  ];
  async function aiSheet(p) {
    sheet(`<div class="sheet__head"><h3>${esc(p.business_name)} · AI 助手</h3>${closeBtn}</div><div class="empty">读取中…</div>`);
    const j = await api('chat-get', { id: p.id });
    S.ai = { id: p.id, chat: j.chat || [], summary: j.summary || '' };
    renderAi(p);
  }
  function aiText(t) {
    // turn 【可以直接发的信息】…【结束】 blocks into a ready-to-send box
    const parts = String(t).split(/【可以直接发的信息】|【结束】/);
    return parts.map((seg, i) => {
      if (i % 2 === 1) {
        const k = S.aiDrafts.push(seg.trim()) - 1;
        const p = S.items.find((x) => x.id === S.ai.id) || {};
        return `<div class="ai__draft"><div class="ai__draftlabel">可以直接发的信息</div><div class="ai__drafttext">${esc(seg.trim())}</div><div class="btnrow"><button class="btn btn--sm" data-act="ai-copy" data-k="${k}" data-id="${S.ai.id}">复制</button>${waNo(p) ? `<button class="btn btn--sm ch ch--wa" data-act="ai-wa" data-k="${k}" data-id="${S.ai.id}">${svg('wa', 16)}WhatsApp</button>` : ''}${p.email ? `<button class="btn btn--sm ch ch--mail" data-act="ai-email" data-k="${k}" data-id="${S.ai.id}">${svg('mail', 16)}Email</button>` : ''}</div></div>`;
      }
      return seg.trim() ? `<p>${esc(seg.trim()).replace(/\n/g, '<br>')}</p>` : '';
    }).join('');
  }
  function renderAi(p) {
    S.aiDrafts = [];
    const msgs = S.ai.chat.map((m) => `<div class="ai__msg ai__msg--${m.r === 'u' ? 'me' : 'ai'}"><small>${m.r === 'u' ? '你' : 'AI'} · ${esc(m.d || '')}</small>${m.r === 'u' ? `<p>${esc(m.t).replace(/\n/g, '<br>')}</p>` : aiText(m.t)}</div>`).join('');
    sheet(`<div class="sheet__head"><h3>${esc(p.business_name)} · AI 助手</h3>${closeBtn}</div>
      <p class="hint">只看得到这一家的资料和对话；对话会一直保存，不会忘记，也不会混到别家。贴上对方的 WhatsApp，或直接问问题。</p>
      ${S.ai.summary ? `<details class="ai__sum"><summary>AI 记住的重点</summary><p>${esc(S.ai.summary).replace(/\n/g, '<br>')}</p></details>` : ''}
      <div class="ai__log" data-ai-log>${msgs || '<div class="empty">还没有对话。可以先按下面的按钮试试看。</div>'}</div>
      <div class="ai__quick">${AI_QUICK.map(([q, l]) => `<button class="chip" data-act="ai-quick" data-id="${p.id}" data-q="${esc(q)}">${esc(l)}</button>`).join('')}</div>
      <textarea rows="4" data-ai-text maxlength="4000" placeholder="例：对方说「多少钱？可以先看看吗」，帮我回"></textarea>
      <div class="btnrow"><button class="btn" data-act="ai-send" data-id="${p.id}">${svg('chat', 16)}问 AI</button></div>`);
    const log = $('[data-ai-log]'); if (log) log.scrollTop = log.scrollHeight;
  }

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
        ${row('has-site', 'file', '对方已经有网站（结束）', p.id)}
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
        ${row('has-site', 'file', '对方已经有网站（结束，不再提醒）', p.id)}
        ${row('mark', 'x', '没成交（对方没兴趣）', p.id, ' data-ev="lost"')}
        ${row('dnc', 'ban', '对方说不要再联系', p.id)}
      </div>`);
  }
  function replySheet(p) {
    sheet(`<div class="sheet__head"><h3>${esc(p.business_name)} 回了什么？</h3>${closeBtn}</div><p class="hint">AI 会看整段对话（工作台记录的 + 你在这里贴的）再判断，所以中间的话都贴上来会比较准。</p>
      <label class="sheet__label">对方说了什么（可以贴好几条，旧的在上面）</label>
      <textarea rows="5" data-reply-text maxlength="2000" placeholder="例：目前我们已有网店喔"></textarea>
      <label class="sheet__label">你自己在 IG / WhatsApp 已经回过的话（不是用工作台发的才要贴，选填）</label>
      <textarea rows="4" data-reply-ours maxlength="2000" placeholder="例：谢谢你这么快回复……祝生意兴隆。"></textarea>
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
      if (['wa', 'email', 'copyopen'].includes(act)) S.pendingField = t.dataset.field || '';
      if (act === 'copy-pv') { copy(`${p.preview_url}\n密码：${p.preview_password}`); toast('网址和密码已复制。'); return; }
      if (act === 'wa') {
        if (!okNow('发 WhatsApp')) return;
        window.open(waLink(waNo(p), textOf(t, p)), '_blank', 'noopener');
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
        toast({ no_answer: j.item.next_call_date ? `已记录没接，${j.item.next_call_date} 再打。` : '3 次都没接：改用 WhatsApp / Email 发开场白。', ok: j.item.preview_url ? '已记录。信息已经填好网址和密码，在「电话说可以，现在发样板」按 WhatsApp 发给他。' : '已记录。样板还没做：跟 Claude Code 说「帮我做 ' + p.business_name + ' 的样板」。', callback: `已记录，${j.item.next_call_date} 会提醒你再打。`, no: '已标记不再联系。', warm: '已记录有兴趣：今天把报价发给他。卡片上的 AI 助手可以帮你写报价信息。', notyet: `已记录。网址和密码已经填进跟进信息，现在用 WhatsApp 发给他；${j.item.next_call_date} 再打。` }[outcome]);
        return;
      }
      if (act === 'queue-start') { startQueue(); return; }
      if (act === 'cs-start') { startCalls(); return; }
      if (act === 'cs-from') { startCalls(p.id); return; }
      if (act === 'cs-next') { nextCall(); return; }
      if (act === 'cs-dial') {
        if (!okNow('打电话')) return;
        const a = document.createElement('a'); a.href = 'tel:+' + callNo(p); document.body.appendChild(a); a.click(); a.remove();
        S.cq.dialed = p.id; toast('打完回来按结果。');
        return;
      }
      if (act === 'cs-out') {
        const outcome = t.dataset.out;
        if (outcome === 'email') { editSheet(p); S.cqFromEdit = true; return; }
        if (outcome === 'no' && !confirm(`${p.business_name} 说不需要？之后不会再出现在联系清单。`)) return;
        busy(t, true, '记录中…');
        let j;
        if (outcome === 'has_site') j = await api('mark', { id: p.id, event: 'has_site', url: '' });
        else {
          const dateEl = $('[data-cs] [data-call-date]');
          j = await api('call', { id: p.id, outcome, date: dateEl ? dateEl.value : '' });
        }
        upsert(j.item);
        S.cq.calls++;
        if (outcome === 'ok') { S.cq.ok++; if (j.item.preview_url) { S.cq.stage = 'send'; renderCalls(); return; } toast('记下了。样板还没做：跟 Claude Code 说「帮我做 ' + p.business_name + ' 的样板」。'); }
        nextCall();
        return;
      }
      if (act === 'cs-wa') {
        window.open(waLink(waNo(p), textOf(t, p)), '_blank', 'noopener');
        S.cq.ch = 'wa'; toast('WhatsApp 已打开，信息已经填好，看一遍再发送，回来按「已发样板，下一家」。');
        return;
      }
      if (act === 'cs-sent') {
        busy(t, true, '记录中…');
        const j = await api('mark', { id: p.id, event: 'preview_sent', url: p.preview_url, channel: S.cq.ch || 'wa' });
        upsert(j.item); S.cq.sent++; S.cq.ch = ''; nextCall();
        return;
      }
      if (act === 'q-skip') { S.qi++; renderQueue(); return; }
      if (act === 'q-sent') {
        busy(t, true, '记录中…');
        const j = hasPv(p) ? await api('mark', { id: p.id, event: 'preview_sent', url: p.preview_url, channel: S.qch }) : await api('mark', { id: p.id, event: 'sent', channel: S.qch });
        upsert(j.item); S.qsent++; S.qi++; renderQueue();
        return;
      }
      if (act === 'sentbar-no') { hideSentbar(); return; }
      if (act === 'form-seen') {
        const id = t.dataset.form;
        busy(t, true, '…');
        await api('form-seen', { form_id: id });
        (S.forms || []).forEach((f) => { if (f.id === id) f.seen = true; }); render(); toast('已标记看过。'); return;
      }
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
      if (act === 'tbl-all') { S.tableAll = !S.tableAll; renderList(); return; }
      if (act === 'tbl-copy') { copy(tableText()); toast('整张表已复制（可以贴到 Notes 或 Google Sheets）。'); return; }
      if (act === 'open-card') { if (S.tab !== 'list') { S.tab = 'list'; $$('[data-tab]').forEach((b) => b.classList.toggle('is-on', b.dataset.tab === 'list')); $$('[data-view]').forEach((v) => { v.hidden = v.dataset.view !== 'list'; }); } S.filter = 'all'; S.open[p.id] = true; renderList(); const el = document.getElementById('l-' + p.id); if (el) el.scrollIntoView({ block: 'start' }); return; }
      if (act === 'has-site') {
        const url = prompt(`${p.business_name} 的网站网址（知道的话填，不知道就直接按确定）：`, 'https://');
        if (url === null) return;
        const j = await api('mark', { id: p.id, event: 'has_site', url: /^https?:\/\/\S+\.\S+/.test(url) ? url : '' });
        upsert(j.item); closeSheet(); render(); toast('已记录：对方已有网站，这一家结束，不会再提醒跟进。'); return;
      }
      if (act === 'more') { moreSheet(p); return; }
      if (act === 'ai') { await aiSheet(p); return; }
      if (act === 'ai-quick') { const ta = $('[data-ai-text]'); ta.value = t.dataset.q; ta.focus(); return; }
      if (act === 'ai-send') {
        const ta = $('[data-ai-text]'); const text = ta.value.trim();
        if (!text) { toast('先输入问题，或贴上对方的信息。'); return; }
        busy(t, true, 'AI 在想…');
        const j = await api('chat', { id: p.id, text });
        upsert(j.item); S.ai = { id: p.id, chat: j.item.ai_chat || [], summary: j.item.ai_summary || '' };
        renderAi(p); return;
      }
      if (act === 'ai-copy' || act === 'ai-wa' || act === 'ai-email') {
        const text = (S.aiDrafts || [])[+t.dataset.k] || '';
        if (act === 'ai-copy') { copy(text); toast('已复制，可以贴到 WhatsApp / IG / Email。'); return; }
        if (act === 'ai-wa') { if (!okNow('发 WhatsApp')) return; window.open(waLink(waNo(p), text), '_blank', 'noopener'); toast('WhatsApp 已打开，信息已经填好，看一遍再发送。'); return; }
        const a = document.createElement('a'); a.href = mailLink(p, text); a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); toast('邮件已经填好，看一遍再发送。'); return;
      }
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
      if (act === 'pv-sent') { busy(t, true, '记录中…'); const j2 = await api('mark', { id: p.id, event: 'preview_sent', url: p.preview_url }); upsert(j2.item); render(); toast(`已记录发了样板，${j2.item.next_followup_date} 提醒你跟进。`); return; }
      if (act === 'sent' && S.pending === p.id && (S.pendingField === 'preview_msg' || (S.pendingField === 'draft_reply' && p.preview_url && String(p.draft_reply || '').includes(p.preview_url)))) { j = await api('mark', { id: p.id, event: 'preview_sent', url: p.preview_url, channel: t.dataset.ch || '' }); hideSentbar(); toast(`已记录发了样板，${j.item.next_followup_date} 提醒你跟进；${j.item.preview_delete_by} 要删除样板。`); }
      else if (act === 'sent') { j = await api('mark', { id: p.id, event: 'sent', channel: t.dataset.ch || '' }); if (S.pending === p.id) hideSentbar(); toast(j.item.next_followup_date ? `已记录，${j.item.next_followup_date} 会提醒你跟进。` : '已记录。'); }
      else if (act === 'mark') { j = await api('mark', { id: p.id, event: t.dataset.ev }); toast('已记录。'); }
      else if (act === 'followup') j = await api('followup', { id: p.id });
      else if (act === 'rewrite') j = await api('rewrite', { id: p.id, language: t.dataset.lang || '', hint: t.dataset.hint || '' });
      else if (act === 'reply-go') { const text = $('[data-reply-text]').value; const oursEl = $('[data-reply-ours]'); j = await api('reply', { id: p.id, text, ours: oursEl ? oursEl.value : '' }); }
      else if (act === 'edit-save') {
        const fields = {};
        $$('[data-e]').forEach((el) => { fields[el.dataset.e] = el.type === 'checkbox' ? el.checked : el.value; });
        j = await api('update', { id: p.id, fields });
      }
      if (j && j.item) upsert(j.item);
      if (act === 'edit-save' && S.cqFromEdit && S.cq) { S.cqFromEdit = false; renderCalls(); render(); return; }
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
  const bk = $('[data-backup]');
  if (bk) bk.addEventListener('click', async () => {
    try {
      const j = await api('backup');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(j.backup, null, 1)], { type: 'application/json' }));
      a.download = `cartsmith-desk-backup-${S.today}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      toast('完整备份已下载（名单、记录、AI 对话都在里面），请存在安全的地方。');
    } catch (e) { toast(e.message); }
  });
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
    if (!f) { toast('先选一个备份档案（完整备份 JSON，或名单 CSV）。'); return; }
    const btn = ev.currentTarget;
    busy(btn, true, '还原中…');
    try {
      const txt = await f.text();
      let payload = { csv: txt };
      if (/\.json$/i.test(f.name) || /^\s*\{/.test(txt)) { try { payload = { backup: JSON.parse(txt) }; } catch (e) { throw new Error('这个 JSON 档案读不了：请选工作台「下载完整备份」的档案。'); } }
      const j = await api('restore', payload);
      const l = await api('list');
      S.items = l.items || []; S.inbox = l.inbox || []; S.forms = l.forms || [];
      render();
      toast(`还原了 ${j.added} 家${j.skipped ? `，跳过 ${j.skipped} 家（已经有了）` : ''}${j.full ? `；${j.chats} 家的 AI 对话也回来了` : ''}。`);
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
      S.items = j.items || []; S.inbox = j.inbox || []; S.forms = j.forms || []; S.settings = j.settings || S.settings; S.today = j.today;
      $('#login').hidden = true; $('#app').hidden = false;
      markStaff();
      $$('[data-icon]').forEach((el) => { el.innerHTML = svg(el.dataset.icon, 22); });
      render();
    } catch (e) {
      if (e.message !== 'unauthorised') showLogin(e.message.includes('SALES_DESK_KEY') ? e.message : '连不上工作台：' + e.message);
    }
  }
  if (store.get()) load(); else showLogin('');
})();
