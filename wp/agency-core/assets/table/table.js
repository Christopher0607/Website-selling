/* 桌上扫码点单 Table QR ordering, the customer's page (Cartsmith agency-core, 2nd design 2026-11-16).
   /table/?t=<table>&k=<key>. Menu and prices come from the shop (class-table.php); the order is checked again on the
   server. Uses the shop's own colours and fonts when its skin is on. No build step; text is always inserted as text,
   never as HTML (the only HTML is the shop's own logo mark from its design files). */
(function () {
  'use strict';
  var C = window.AGC_TABLE || {};

  /* ------------------------------------------------------------------ words (English / 中文 / Bahasa Malaysia) */
  var W = {
    table: ['Table {0}', '{0} 号桌', 'Meja {0}'],
    table_w: ['Table', '桌号', 'Meja'],
    dine_in: ['Dine in', '堂食', 'Makan di sini'],
    hero_title: ['Order from your table', '在桌上点单', 'Pesan dari meja anda'],
    hero_sub: ['Choose what you like and send it to the kitchen. Pay at the counter when you leave.', '选好想吃的，送到厨房。离开时到柜台付款。', 'Pilih apa yang anda suka dan hantar ke dapur. Bayar di kaunter bila hendak pulang.'],
    step1: ['Choose', '选好', 'Pilih'],
    step2: ['Send to the kitchen', '送到厨房', 'Hantar ke dapur'],
    step3: ['Pay at the counter', '柜台付款', 'Bayar di kaunter'],
    fav: ['Favourites', '人气推荐', 'Kegemaran'],
    items_n: ['{0} items', '{0} 样', '{0} item'],
    item_1: ['1 item', '1 样', '1 item'],
    add: ['Add', '加入', 'Tambah'],
    sold: ['Sold out today', '今天卖完了', 'Habis hari ini'],
    left: ['Only {0} left', '只剩 {0} 个', 'Tinggal {0}'],
    pop: ['Popular', '人气', 'Popular'],
    new: ['New', '新品', 'Baru'],
    chef: ["Chef's pick", '主厨推荐', 'Pilihan chef'],
    hot: ['Spicy', '辣', 'Pedas'],
    view: ['View order', '查看我的单', 'Lihat pesanan'],
    yours: ['Your order', '你的单', 'Pesanan anda'],
    note: ['Note for the kitchen', '给厨房的备注', 'Nota untuk dapur'],
    item_note: ['Note for this item', '这样东西的备注', 'Nota untuk item ini'],
    optional: ['optional', '可以不填', 'tidak wajib'],
    note_ph: ['e.g. less sugar, cut in half', '例如：少糖、切一半', 'cth. kurang manis, potong dua'],
    total: ['Total', '总数', 'Jumlah'],
    send: ['Send to the kitchen', '送到厨房', 'Hantar ke dapur'],
    sending: ['Sending…', '送出中…', 'Menghantar…'],
    pay_now: ['Nothing to pay now', '现在不用付钱', 'Tiada bayaran sekarang'],
    pay_info: ['When you are done, pay at the counter and tell them Table {0}.', '吃完到柜台付款，说「{0} 号桌」就可以。', 'Bila selesai, bayar di kaunter dan sebut Meja {0}.'],
    sent: ['Sent to the kitchen', '已经送到厨房', 'Sudah dihantar ke dapur'],
    sent_sub: ['This page shows when it is ready. You can keep ordering.', '做好了这里会显示，你可以继续点。', 'Halaman ini akan tunjuk bila siap. Anda boleh terus memesan.'],
    order_no: ['Order #{0}', '单号 #{0}', 'Pesanan #{0}'],
    st_sent: ['Sent', '已送出', 'Dihantar'],
    st_kitchen: ['Preparing', '准备中', 'Sedang disediakan'],
    st_ready: ['Ready', '做好了', 'Siap'],
    st_paid: ['Paid', '已付款', 'Dibayar'],
    st_cancelled: ['Cancelled', '已取消', 'Dibatalkan'],
    more: ['Order more', '再加点', 'Pesan lagi'],
    bill: ['My bill', '我的账单', 'Bil saya'],
    to_pay: ['To pay at the counter', '要到柜台付', 'Perlu dibayar di kaunter'],
    paid_all: ['All paid. Thank you!', '都付好了，谢谢！', 'Semua sudah dibayar. Terima kasih!'],
    show_cashier: ['Show this screen at the counter', '到柜台给店员看这个画面', 'Tunjuk skrin ini di kaunter'],
    rounds: ['Your orders at this table', '这张桌子的单', 'Pesanan anda di meja ini'],
    close: ['Close', '关闭', 'Tutup'],
    error: ['Something went wrong. Please try again, or order at the counter.', '出错了。请再试一次，或者到柜台点。', 'Ada masalah. Sila cuba lagi, atau pesan di kaunter.'],
    bad_qr: ['This QR code is not valid any more. Please ask our staff.', '这个 QR 不能用了，请问店员。', 'Kod QR ini tidak sah lagi. Sila tanya kakitangan kami.'],
    bad_h: ['Please ask our staff', '请问店员', 'Sila tanya kakitangan kami'],
    one: ['Choose 1', '选 1 个', 'Pilih 1'],
    any: ['Optional', '可选', 'Pilihan'],
    add_to: ['Add to order · {0}', '加入 · {0}', 'Tambah · {0}'],
    added: ['Added to your order', '已加入你的单', 'Ditambah ke pesanan'],
    qty: ['Quantity', '数量', 'Kuantiti'],
    empty: ['Nothing on the table menu yet. Please order at the counter.', '桌上菜单还没有东西，请到柜台点。', 'Belum ada menu meja. Sila pesan di kaunter.'],
    demo: ['Preview by Cartsmith Studio: orders are tests and nothing is charged.', 'Cartsmith Studio 的预览：只是测试，不会收钱。', 'Pratonton oleh Cartsmith Studio: pesanan hanya ujian, tiada bayaran.'],
    lang: ['Language', '语言', 'Bahasa'],
    remove: ['Remove', '删除', 'Buang'],
    menu: ['Menu', '菜单', 'Menu'],
    at: ['at {0}', '{0}', 'pada {0}'],
    owner_side: ['See the restaurant’s side →', '看店家那边 →', 'Lihat sebelah kedai →']
  };
  var LANGS = [['en', 'EN'], ['zh', '中文'], ['ms', 'BM']];
  var LI = { en: 0, zh: 1, ms: 2 };
  function store(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
    return null;
  }
  var lang = store('agc_tq_lang') || (C.zh ? 'zh' : 'en');
  if (!(lang in LI)) lang = 'en';
  function t(k) {
    var s = (W[k] || [k, k, k])[LI[lang]];
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(String(arguments[i]));
    return s;
  }

  /* ------------------------------------------------------------------ helpers */
  function h(tag, a) {
    var el = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) put(el, arguments[i]);
    return el;
  }
  function put(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { put(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  var ICONS = {
    bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    pot: '<path d="M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z"/><path d="M8 7.5c0-1.5 1-1.8 1-3.5M12 7.5c0-1.5 1-1.8 1-3.5M16 7.5c0-1.5 1-1.8 1-3.5"/>',
    hand: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11"/><path d="M10 10V5a1.5 1.5 0 0 1 3 0v5"/><path d="M13 10V6a1.5 1.5 0 0 1 3 0v6"/><path d="M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5A6.5 6.5 0 0 1 5 14.5L4 11a1.5 1.5 0 0 1 3 0"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    chev: '<path d="M9 6l6 6-6 6"/>'
  };
  function icon(n, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    s.innerHTML = ICONS[n] || '';
    return s;
  }
  function money(v) { return (C.cur || 'RM') + Number(v || 0).toFixed(2); }
  function url(path, q) {
    var base = C.rest || '';
    if (base.indexOf('rest_route=') !== -1) return base.replace(/\/?$/, '') + '/' + path + (q ? '&' + q : '');
    return base.replace(/\/?$/, '/') + path + (q ? '?' + q : '');
  }
  function hhmm(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* no vibration */ } }

  var app = document.getElementById('tq');
  if (!C.table) {
    app.innerHTML = '';
    put(app, h('div', { class: 'tq-bad' }, h('div', { class: 'tq-bad__icon' }, icon('info')), h('h1', null, t('bad_h')), h('p', null, t('bad_qr')), h('p', { class: 'tq-bad__site' }, C.site || '')));
    return;
  }

  /* ------------------------------------------------------------------ state */
  var MENU = C.menu || { cats: [], items: [] };
  var BY = {};
  MENU.items.forEach(function (it) { BY[it.id] = it; });
  var CART_K = 'agc_tq_cart_' + C.table + '_' + C.key;
  var ORD_K = 'agc_tq_orders_' + C.table + '_' + C.key;
  var cart = (store(CART_K) || []).filter(function (l) { return BY[l.id] && !BY[l.id].sold; });
  var orders = (store(ORD_K) || []).filter(function (o) { return o.at > Date.now() - 12 * 3600 * 1000; });
  var states = {};
  orders.forEach(function (o) { if (o.state) states[o.id] = o.state; });

  function unit(l) {
    var it = BY[l.id]; if (!it) return 0;
    var p = Number(it.p || 0);
    (it.o || []).forEach(function (g, gi) { (l.sel && l.sel[gi] || []).forEach(function (vi) { var v = g.v && g.v[vi]; if (v) p += Number(v[1] || 0); }); });
    return p;
  }
  function optText(l) {
    var it = BY[l.id]; var out = [];
    (it && it.o || []).forEach(function (g, gi) { (l.sel && l.sel[gi] || []).forEach(function (vi) { var v = g.v && g.v[vi]; if (v) out.push(v[0]); }); });
    return out.join(', ');
  }
  function count() { return cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function sum() { return cart.reduce(function (s, l) { return s + unit(l) * l.qty; }, 0); }
  function save() { store(CART_K, cart.length ? cart : null); }
  function same(a, b) { return a.id === b.id && JSON.stringify(a.sel || []) === JSON.stringify(b.sel || []) && (a.note || '') === (b.note || ''); }
  function qtyOf(id) { return cart.reduce(function (n, l) { return n + (l.id === id ? l.qty : 0); }, 0); }
  function addLine(l) {
    var hit = cart.filter(function (x) { return same(x, l); })[0];
    if (hit) hit.qty = Math.min(30, hit.qty + l.qty); else cart.push(l);
    save(); refresh(); buzz(); toast(t('added'));
    if (bar.firstChild) { bar.classList.remove('is-pop'); void bar.offsetWidth; bar.classList.add('is-pop'); }
  }
  function due() { return orders.reduce(function (s, o) { var st = states[o.id] || 'kitchen'; return s + (st === 'paid' || st === 'cancelled' ? 0 : Number(o.total || 0)); }, 0); }

  /* ------------------------------------------------------------------ page */
  var billBtn, bar, toastEl;
  function draw() {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : (lang === 'ms' ? 'ms' : 'en');
    app.innerHTML = '';
    if (C.demo) put(app, h('div', { class: 'tq-demo' }, t('demo'), C.ownerLink ? [' ', h('a', { href: C.ownerLink }, t('owner_side'))] : null));

    // header: the shop's logo and name, language, my bill
    billBtn = h('button', { class: 'tq-iconbtn tq-billbtn', type: 'button', 'aria-label': t('bill'), onclick: function () { openBill(); }, hidden: !orders.length }, icon('receipt'), h('span', null, t('bill')), h('b', { hidden: true }));
    var langSel = h('div', { class: 'tq-lang', role: 'group', 'aria-label': t('lang') }, LANGS.map(function (L) {
      return h('button', { type: 'button', class: L[0] === lang ? 'is-on' : null, 'aria-pressed': L[0] === lang ? 'true' : 'false', onclick: function () { if (L[0] !== lang) { lang = L[0]; store('agc_tq_lang', lang); draw(); } } }, L[1]);
    }));
    var logo = h('span', { class: 'tq-logo__mark' });
    if (C.logo) logo.innerHTML = C.logo; // the shop's own logo mark (its design files), not customer text
    else put(logo, (C.site || '?').trim().charAt(0));
    put(app, h('header', { class: 'tq-hdr' }, h('div', { class: 'tq-wrap tq-hdr__in' },
      h('a', { class: 'tq-logo', href: C.shop || '/', 'aria-label': C.site }, logo, h('span', null, C.site || '')),
      h('div', { class: 'tq-hdr__right' }, langSel, billBtn))));

    // hero: photo, table ticket, how it works
    var ticket = h('div', { class: 'tq-ticket', 'aria-label': t('table', C.table) }, h('span', null, t('table_w')), h('b', null, C.table));
    var hero = h('section', { class: 'tq-hero' + (C.hero ? '' : ' tq-hero--plain') },
      C.hero ? h('img', { class: 'tq-hero__img', src: C.hero, alt: '', onerror: function () { this.parentNode.classList.add('tq-hero--plain'); this.remove(); } }) : null,
      h('div', { class: 'tq-hero__body' }, h('p', { class: 'tq-kicker' }, t('dine_in')), h('h1', null, t('hero_title')), h('p', { class: 'tq-hero__sub' }, t('hero_sub'))),
      ticket);
    put(app, h('div', { class: 'tq-wrap' }, hero,
      h('ol', { class: 'tq-steps' }, [['hand', 'step1'], ['pot', 'step2'], ['card', 'step3']].map(function (s, i) {
        return h('li', null, h('span', { class: 'tq-steps__n' }, i + 1), icon(s[0]), h('span', null, t(s[1])));
      })),
      C.stopped ? h('p', { class: 'tq-callout tq-callout--stop', role: 'alert' }, icon('info'), h('span', null, C.stopped)) : null,
      C.note ? h('p', { class: 'tq-callout' }, icon('info'), h('span', null, C.note)) : null));

    // categories
    var cats = MENU.cats.filter(function (c) { return MENU.items.some(function (it) { return it.cat === c[0]; }); });
    var favs = MENU.items.filter(function (it) { return (it.tags || []).indexOf('pop') !== -1 && !it.sold; });
    var nav = null;
    if (cats.length > 1 || favs.length) {
      var links = (favs.length >= 2 ? [['fav', t('fav')]] : []).concat(cats);
      nav = h('nav', { class: 'tq-cats', 'aria-label': t('menu') }, h('div', { class: 'tq-wrap tq-cats__in' }, links.map(function (c, i) {
        return h('a', { href: '#tq-' + c[0], class: i === 0 ? 'is-on' : null, onclick: function (e) {
          e.preventDefault();
          var s = document.getElementById('tq-' + c[0]);
          if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - (document.querySelector('.tq-hdr').offsetHeight + nav.offsetHeight + 8), behavior: 'smooth' });
        } }, c[1]);
      })));
      put(app, nav);
    }
    var main = h('main', { class: 'tq-wrap tq-menu', id: 'tq-main' });
    if (!MENU.items.length) put(main, h('p', { class: 'tq-empty' }, t('empty')));
    if (favs.length >= 2) {
      put(main, h('section', { class: 'tq-sec', id: 'tq-fav' }, h('div', { class: 'tq-sec__h' }, h('h2', null, t('fav'))),
        h('div', { class: 'tq-favs' }, favs.map(favCard))));
    }
    cats.forEach(function (c) {
      var list = MENU.items.filter(function (it) { return it.cat === c[0]; });
      put(main, h('section', { class: 'tq-sec', id: 'tq-' + c[0] },
        h('div', { class: 'tq-sec__h' }, h('h2', null, c[1]), h('span', null, list.length === 1 ? t('item_1') : t('items_n', list.length))),
        h('div', { class: 'tq-grid' }, list.map(itemCard))));
    });
    put(app, main);
    put(app, h('footer', { class: 'tq-ftr' }, h('div', { class: 'tq-wrap' },
      h('p', { class: 'tq-ftr__pay' }, icon('card'), h('span', null, t('pay_now') + '. ' + t('pay_info', C.table))),
      C.address ? h('p', null, icon('pin'), h('span', null, C.address)) : null,
      C.hours ? h('p', null, icon('clock'), h('span', null, C.hours)) : null,
      h('p', { class: 'tq-ftr__site' }, C.site || ''))));

    bar = h('div', { class: 'tq-bar' });
    put(app, bar);
    toastEl = h('div', { class: 'tq-toast', role: 'status', 'aria-live': 'polite' });
    put(app, toastEl);
    refresh();
    watchCats();
  }

  function tags(it) {
    return (it.tags || []).filter(function (x) { return W[x]; }).map(function (x) { return h('span', { class: 'tq-tag tq-tag--' + x }, t(x)); });
  }
  function stepper(it, big) {
    var wrap = h('div', { class: 'tq-act', 'data-step': it.id });
    drawStep(wrap, it, big);
    return wrap;
  }
  function drawStep(wrap, it) {
    wrap.innerHTML = '';
    if (it.sold) { put(wrap, h('span', { class: 'tq-tag tq-tag--out' }, t('sold'))); return; }
    if (C.stopped) return;
    var n = qtyOf(it.id);
    var hasOpts = (it.o || []).length > 0;
    if (!n || hasOpts) {
      put(wrap, h('button', { class: 'tq-add' + (n ? ' tq-add--n' : ''), type: 'button', 'aria-label': t('add') + ' ' + it.n, onclick: function (e) { e.stopPropagation(); if (hasOpts) openItem(it); else addLine({ id: it.id, qty: 1, sel: [], note: '' }); } },
        n ? h('b', null, n) : icon('plus'), h('span', null, t('add'))));
      return;
    }
    var line = cart.filter(function (l) { return l.id === it.id; })[0];
    put(wrap, h('div', { class: 'tq-step' },
      h('button', { type: 'button', 'aria-label': '−', onclick: function (e) { e.stopPropagation(); line.qty--; if (line.qty < 1) cart.splice(cart.indexOf(line), 1); save(); refresh(); } }, icon('minus')),
      h('span', { 'aria-live': 'polite' }, n),
      h('button', { type: 'button', 'aria-label': '+', onclick: function (e) { e.stopPropagation(); line.qty = Math.min(30, line.qty + 1); save(); refresh(); buzz(); } }, icon('plus'))));
  }
  function itemCard(it) {
    var low = it.left != null && it.left > 0 && it.left <= 5 && !it.sold;
    return h('article', { class: 'tq-item' + (it.sold ? ' is-sold' : '') + (it.img ? '' : ' tq-item--noimg'), tabindex: it.sold ? null : '0', 'aria-label': it.n, onclick: function () { if (!it.sold && !C.stopped) openItem(it); }, onkeydown: function (e) { if (e.key === 'Enter' && !it.sold && !C.stopped) openItem(it); } },
      h('div', { class: 'tq-item__body' },
        h('h3', null, it.n),
        it.d ? h('p', { class: 'tq-item__d' }, it.d) : null,
        (it.tags || []).length || low ? h('div', { class: 'tq-tags' }, tags(it), low ? h('span', { class: 'tq-tag tq-tag--low' }, t('left', it.left)) : null) : null,
        h('div', { class: 'tq-item__row' }, h('b', { class: 'tq-price' }, money(it.p)), stepper(it))),
      it.img ? h('img', { class: 'tq-item__img', src: it.img, alt: '', loading: 'lazy', width: '112', height: '112', onerror: function () { this.closest('.tq-item').classList.add('tq-item--noimg'); this.remove(); } }) : null);
  }
  function favCard(it) {
    return h('article', { class: 'tq-fav', tabindex: '0', 'aria-label': it.n, onclick: function () { if (!C.stopped) openItem(it); }, onkeydown: function (e) { if (e.key === 'Enter' && !C.stopped) openItem(it); } },
      h('div', { class: 'tq-fav__img' }, it.img ? h('img', { src: it.img, alt: '', loading: 'lazy', onerror: function () { this.remove(); } }) : h('span', null, it.n.charAt(0))),
      h('h3', null, it.n),
      h('div', { class: 'tq-fav__row' }, h('b', { class: 'tq-price' }, money(it.p)), C.stopped ? null : h('button', { class: 'tq-round', type: 'button', 'aria-label': t('add') + ' ' + it.n, onclick: function (e) { e.stopPropagation(); if ((it.o || []).length) openItem(it); else addLine({ id: it.id, qty: 1, sel: [], note: '' }); } }, icon('plus'))));
  }
  function refresh() {
    [].forEach.call(document.querySelectorAll('[data-step]'), function (w) { var it = BY[w.getAttribute('data-step')]; if (it) drawStep(w, it); });
    var n = count();
    bar.innerHTML = '';
    bar.classList.toggle('is-on', n > 0);
    if (n) put(bar, h('button', { class: 'tq-bar__btn', type: 'button', onclick: openCart },
      h('span', { class: 'tq-bar__bag' }, icon('bag'), h('b', null, n)), h('span', { class: 'tq-bar__t' }, t('view')), h('b', { class: 'tq-bar__sum' }, money(sum()))));
    if (billBtn) {
      billBtn.hidden = !orders.length;
      var open = orders.filter(function (o) { var st = states[o.id] || 'kitchen'; return st !== 'paid' && st !== 'cancelled'; }).length;
      billBtn.lastChild.textContent = open; billBtn.lastChild.hidden = !open;
    }
  }
  var toastT = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1600);
  }
  function watchCats() {
    var links = document.querySelectorAll('.tq-cats a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        [].forEach.call(links, function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-on', on);
          if (on) a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
        });
      });
    }, { rootMargin: '-130px 0px -65% 0px' });
    [].forEach.call(document.querySelectorAll('.tq-sec'), function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------------ sheets */
  var scrim = null, lastFocus = null;
  function closeSheet() {
    if (!scrim) return;
    var s = scrim; scrim = null;
    s.classList.remove('is-on');
    setTimeout(function () { s.remove(); }, 220);
    document.body.classList.remove('tq-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function sheet(title, body, foot, cls) {
    if (scrim) { scrim.remove(); scrim = null; }
    lastFocus = document.activeElement;
    var panel = h('div', { class: 'tq-sheet' + (cls ? ' ' + cls : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'tq-sheet__hd' }, h('h2', null, title), h('button', { class: 'tq-x', type: 'button', 'aria-label': t('close'), onclick: closeSheet }, icon('x'))),
      h('div', { class: 'tq-sheet__body' }, body), foot ? h('div', { class: 'tq-sheet__ft' }, foot) : null);
    scrim = h('div', { class: 'tq-scrim', onclick: function (e) { if (e.target === scrim) closeSheet(); } }, panel);
    document.body.appendChild(scrim);
    document.body.classList.add('tq-lock');
    requestAnimationFrame(function () { if (scrim) scrim.classList.add('is-on'); });
    setTimeout(function () { var x = panel.querySelector('.tq-x'); if (x) x.focus({ preventScroll: true }); }, 60);
    return panel;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  function openItem(it) {
    var sel = (it.o || []).map(function (g) { return g.one ? [Number(g.def || 0)] : []; });
    var qty = 1;
    var note = h('textarea', { rows: '2', maxlength: '120', placeholder: t('note_ph') });
    var btn = h('button', { class: 'tq-btn', type: 'button' });
    function label() { btn.textContent = t('add_to', money(unit({ id: it.id, sel: sel }) * qty)); }
    var groups = (it.o || []).map(function (g, gi) {
      var name = 'tq-g' + gi;
      return h('fieldset', { class: 'tq-opt' }, h('legend', null, h('span', null, g.n || ''), h('small', { class: g.one ? 'is-req' : null }, g.one ? t('one') : t('any'))),
        (g.v || []).map(function (v, vi) {
          var inp = h('input', { type: g.one ? 'radio' : 'checkbox', name: name, checked: sel[gi].indexOf(vi) !== -1, onchange: function () {
            if (g.one) sel[gi] = [vi];
            else if (inp.checked) sel[gi].push(vi); else sel[gi] = sel[gi].filter(function (x) { return x !== vi; });
            label();
          } });
          return h('label', { class: 'tq-opt__row' }, inp, h('span', { class: 'tq-opt__mark', 'aria-hidden': 'true' }), h('span', { class: 'tq-opt__t' }, v[0]), Number(v[1]) ? h('em', null, '+' + money(v[1])) : null);
        }));
    });
    var qn = h('span', null, qty);
    var step = h('div', { class: 'tq-step tq-step--lg', role: 'group', 'aria-label': t('qty') },
      h('button', { type: 'button', 'aria-label': '−', onclick: function () { qty = Math.max(1, qty - 1); qn.textContent = qty; label(); } }, icon('minus')), qn,
      h('button', { type: 'button', 'aria-label': '+', onclick: function () { qty = Math.min(30, qty + 1); qn.textContent = qty; label(); } }, icon('plus')));
    btn.addEventListener('click', function () { addLine({ id: it.id, qty: qty, sel: sel.map(function (x) { return x.slice().sort(); }), note: note.value.trim() }); closeSheet(); });
    label();
    sheet(it.n, [
      it.img ? h('div', { class: 'tq-sheet__img' }, h('img', { src: it.img, alt: '', onerror: function () { this.parentNode.remove(); } })) : null,
      h('div', { class: 'tq-detail' }, h('div', { class: 'tq-detail__top' }, h('b', { class: 'tq-price tq-price--lg' }, money(it.p)), h('div', { class: 'tq-tags' }, tags(it))),
        it.d ? h('p', { class: 'tq-muted' }, it.d) : null),
      groups,
      h('label', { class: 'tq-field' }, h('span', null, t('item_note'), h('small', null, t('optional'))), note)
    ], h('div', { class: 'tq-ftrow' }, step, btn), 'tq-sheet--item');
  }

  function openCart() {
    var body = h('div');
    var notes = h('textarea', { rows: '2', maxlength: '300', placeholder: t('note_ph') });
    var msg = h('p', { class: 'tq-err', role: 'alert', hidden: true });
    var totalEl = h('b');
    var btn = h('button', { class: 'tq-btn', type: 'button', onclick: send, disabled: !!C.stopped }, icon('pot'), h('span', null, t('send')));
    function drawLines() {
      body.innerHTML = '';
      if (!cart.length) { closeSheet(); refresh(); return; }
      put(body, h('ul', { class: 'tq-lines' }, cart.map(function (l) {
        var it = BY[l.id];
        var o = optText(l);
        return h('li', null,
          it.img ? h('img', { class: 'tq-lines__img', src: it.img, alt: '', onerror: function () { this.remove(); } }) : h('span', { class: 'tq-lines__img tq-lines__img--none' }, it.n.charAt(0)),
          h('div', { class: 'tq-lines__main' }, h('b', null, it.n), o ? h('small', null, o) : null, l.note ? h('small', { class: 'tq-lines__note' }, '“' + l.note + '”') : null,
            h('div', { class: 'tq-step tq-step--sm' },
              h('button', { type: 'button', 'aria-label': l.qty === 1 ? t('remove') : '−', onclick: function () { l.qty--; if (l.qty < 1) cart.splice(cart.indexOf(l), 1); save(); drawLines(); refresh(); } }, icon(l.qty === 1 ? 'x' : 'minus')),
              h('span', null, l.qty),
              h('button', { type: 'button', 'aria-label': '+', onclick: function () { l.qty = Math.min(30, l.qty + 1); save(); drawLines(); refresh(); } }, icon('plus')))),
          h('span', { class: 'tq-lines__p' }, money(unit(l) * l.qty)));
      })));
      put(body, h('label', { class: 'tq-field' }, h('span', null, t('note'), h('small', null, t('optional'))), notes));
      put(body, h('div', { class: 'tq-payinfo' }, icon('card'), h('div', null, h('b', null, t('pay_now')), h('span', null, t('pay_info', C.table)))));
      totalEl.textContent = money(sum());
    }
    function send() {
      btn.disabled = true; btn.lastChild.textContent = t('sending'); msg.hidden = true;
      fetch(url('order'), {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: C.table, k: C.key, items: cart.map(function (l) { return { id: l.id, qty: l.qty, sel: l.sel, note: l.note }; }), notes: notes.value.trim(), total: Math.round(sum() * 100) / 100 })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) throw new Error(d && d.message ? d.message : t('error'));
          return d;
        });
      }).then(function (d) {
        var lines = cart.map(function (l) { return { n: BY[l.id].n, o: optText(l), note: l.note, qty: l.qty, p: unit(l) * l.qty }; });
        orders.unshift({ id: d.id, key: d.key, number: d.number, total: d.total, at: Date.now(), lines: lines, note: notes.value.trim() });
        states[d.id] = 'kitchen';
        keepOrders();
        cart = []; save(); refresh();
        closeSheet();
        setTimeout(function () { openSent(orders[0]); }, 230);
      }).catch(function (e) {
        msg.textContent = e && e.message ? e.message : t('error'); msg.hidden = false;
        btn.disabled = !!C.stopped; btn.lastChild.textContent = t('send');
      });
    }
    drawLines();
    sheet(t('yours') + ' · ' + t('table', C.table), [body, msg], [h('div', { class: 'tq-total' }, h('span', null, t('total')), totalEl), btn], 'tq-sheet--cart');
  }
  function keepOrders() {
    orders.forEach(function (o) { o.state = states[o.id] || o.state; });
    store(ORD_K, orders.slice(0, 30));
  }

  /* ------------------------------------------------------------------ after sending: progress, and the bill */
  var STEPS = ['st_sent', 'st_kitchen', 'st_ready'];
  function track(o) {
    var s = states[o.id] || 'kitchen';
    if (s === 'cancelled') return h('p', { class: 'tq-state tq-state--cancelled' }, t('st_cancelled'));
    var at = s === 'kitchen' ? 1 : 2;
    return h('ol', { class: 'tq-track' + (s === 'paid' ? ' is-paid' : '') }, STEPS.map(function (k, i) {
      return h('li', { class: i < at || s === 'paid' || (s === 'ready' && i === 2) ? 'is-done' : (i === at ? 'is-now' : null) }, h('span', { class: 'tq-track__dot' }, i < at || s !== 'kitchen' ? icon('check') : null), h('span', null, t(k)));
    }));
  }
  function stateChip(o) {
    var s = states[o.id] || 'kitchen';
    return h('span', { class: 'tq-state tq-state--' + s }, t('st_' + s));
  }
  function orderLines(o) {
    return h('ul', { class: 'tq-olines' }, (o.lines || []).map(function (l) {
      return h('li', null, h('span', null, l.qty + ' × ' + l.n + (l.o ? ' (' + l.o + ')' : '') + (l.note ? ' · “' + l.note + '”' : '')), l.p != null ? h('span', null, money(l.p)) : null);
    }));
  }
  var redraw = null;
  function openSent(o) {
    var body = h('div', { class: 'tq-sentview' });
    function drawIt() {
      body.innerHTML = '';
      put(body, h('div', { class: 'tq-sent' }, h('span', { class: 'tq-sent__icon' }, icon('check')), h('h3', null, t('sent')), h('p', { 'data-order': o.number }, t('order_no', o.number) + ' · ' + t('table', C.table) + ' · ' + hhmm(o.at)), h('p', { class: 'tq-muted' }, t('sent_sub'))));
      put(body, track(o));
      put(body, h('div', { class: 'tq-card' }, h('div', { class: 'tq-card__hd' }, h('b', null, t('order_no', o.number)), stateChip(o)), orderLines(o), h('div', { class: 'tq-total' }, h('span', null, t('total')), h('b', null, money(o.total)))));
      put(body, h('div', { class: 'tq-payinfo' }, icon('card'), h('div', null, h('b', null, t('pay_now')), h('span', null, t('pay_info', C.table)))));
    }
    drawIt();
    redraw = drawIt;
    sheet(t('yours'), body, [h('button', { class: 'tq-btn', type: 'button', onclick: closeSheet }, icon('plus'), h('span', null, t('more'))), h('button', { class: 'tq-btn tq-btn--ghost', type: 'button', onclick: function () { openBill(); } }, icon('receipt'), h('span', null, t('bill')))], 'tq-sheet--sent');
    poll();
  }
  function openBill() {
    var body = h('div', { class: 'tq-billview' });
    function drawIt() {
      body.innerHTML = '';
      var d = due();
      put(body, h('div', { class: 'tq-billcard' }, h('span', null, t('table_w')), h('b', null, C.table),
        h('div', { class: 'tq-billcard__due' }, h('span', null, d > 0 ? t('to_pay') : t('paid_all')), d > 0 ? h('b', null, money(d)) : null),
        d > 0 ? h('small', null, t('show_cashier')) : null));
      put(body, h('h3', { class: 'tq-h3' }, t('rounds')));
      put(body, h('ul', { class: 'tq-orders' }, orders.map(function (o) {
        return h('li', null, h('div', { class: 'tq-orders__hd' }, h('b', null, t('order_no', o.number)), h('span', { class: 'tq-muted' }, hhmm(o.at)), stateChip(o), h('span', { class: 'tq-orders__p' }, money(o.total))), orderLines(o));
      })));
    }
    drawIt();
    redraw = drawIt;
    sheet(t('bill') + ' · ' + t('table', C.table), body, h('button', { class: 'tq-btn', type: 'button', onclick: closeSheet }, icon('plus'), h('span', null, t('more'))), 'tq-sheet--bill');
    poll();
  }

  var timer = null;
  function poll() {
    clearTimeout(timer);
    var open = orders.filter(function (o) { var s = states[o.id]; return s !== 'paid' && s !== 'cancelled'; });
    if (!open.length) return;
    fetch(url('status', 'o=' + open.map(function (o) { return o.id; }).join(',') + '&k=' + open.map(function (o) { return o.key; }).join(',')), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { orders: [] }; })
      .then(function (d) {
        var changed = false;
        (d.orders || []).forEach(function (x) { if (states[x.id] !== x.state) { states[x.id] = x.state; changed = true; } });
        if (changed) { keepOrders(); refresh(); if (scrim && redraw) redraw(); }
      })
      .catch(function () {})
      .then(function () { timer = setTimeout(poll, document.hidden ? 60000 : 12000); });
  }

  draw();
  if (orders.length) poll();
})();
