/* 桌上扫码点单 Table QR ordering (Cartsmith agency-core 1.8.0, 2026-11-15)
   The customer's page at /table/?t=<table>&k=<key>. Menu and prices come from the shop (class-table.php); the order is
   checked again on the server. No build step; text is always inserted as text, never as HTML. */
(function () {
  'use strict';
  var C = window.AGC_TABLE || {};
  var ZH = !!C.zh;
  var W = {
    table: ['Table {0}', '{0} 号桌'],
    sub: ['Order here, pay at the counter', '在这里点单，吃完到柜台付款'],
    add: ['Add', '加入'],
    sold: ['Sold out', '卖完了'],
    left: ['Only {0} left', '只剩 {0} 个'],
    view: ['View order', '看我的单'],
    items: ['{0} items', '{0} 样'],
    item1: ['1 item', '1 样'],
    yours: ['Your order', '你的单'],
    note: ['Note for the kitchen (optional)', '给厨房的备注（可以不填）'],
    note_ph: ['e.g. less sugar, no onion', '例如：少糖、不要葱'],
    send: ['Send to the kitchen', '送到厨房'],
    sending: ['Sending…', '送出中…'],
    pay: ['Pay at the counter when you are done. Just tell them your table number.', '吃完到柜台付款，说你的桌号就可以。'],
    sent: ['Sent to the kitchen', '已经送到厨房'],
    order_no: ['Order #{0}', '单号 #{0}'],
    kitchen: ['Preparing', '准备中'],
    ready: ['Ready', '做好了'],
    paid: ['Paid', '已付款'],
    cancelled: ['Cancelled', '已取消'],
    more: ['Order more', '再加点'],
    at_table: ['Your orders at this table', '这张桌子的单'],
    so_far: ['To pay at the counter', '要到柜台付的'],
    remove: ['Remove', '删除'],
    total: ['Total', '总数'],
    error: ['Something went wrong. Please try again, or order at the counter.', '出错了。请再试一次，或者到柜台点。'],
    bad_qr: ['This QR code is not valid any more. Please ask our staff.', '这个 QR 不能用了，请问店员。'],
    one: ['Choose one', '选一个'],
    any: ['Optional', '可以不选'],
    add_to: ['Add to order · {0}', '加入 · {0}'],
    qty: ['Quantity', '数量'],
    close: ['Close', '关闭'],
    empty: ['Nothing on the table menu yet. Please order at the counter.', '桌上菜单还没有东西，请到柜台点。'],
    demo: ['Demo shop: orders are tests, nothing is charged.', '示范网站：只是测试，不会收钱。'],
    item_note: ['Note for this item (optional)', '这样东西的备注（可以不填）'],
    see_orders: ['My orders', '我的单']
  };
  function t(k) {
    var s = (W[k] || [k, k])[ZH ? 1 : 0];
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(String(arguments[i]));
    return s;
  }
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
  function money(v) { return (C.cur || 'RM') + Number(v || 0).toFixed(2); }
  function store(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
    return null;
  }
  function url(path, q) {
    var base = C.rest || '';
    if (base.indexOf('rest_route=') !== -1) return base.replace(/\/?$/, '') + '/' + path + (q ? '&' + q : '');
    return base.replace(/\/?$/, '/') + path + (q ? '?' + q : '');
  }

  var app = document.getElementById('tq');
  app.innerHTML = '';
  if (!C.table) {
    put(app, h('div', { class: 'tq-bad' }, h('h1', null, C.site || ''), h('p', null, t('bad_qr'))));
    return;
  }

  var MENU = C.menu || { cats: [], items: [] };
  var BY = {};
  MENU.items.forEach(function (it) { BY[it.id] = it; });
  var CART_K = 'agc_tq_cart_' + C.table + '_' + C.key;
  var ORD_K = 'agc_tq_orders_' + C.table + '_' + C.key;
  // cart lines: { id, qty, sel: [[i,...] per option group], note }
  var cart = (store(CART_K) || []).filter(function (l) { return BY[l.id] && !BY[l.id].sold; });
  var orders = (store(ORD_K) || []).filter(function (o) { return o.at > Date.now() - 12 * 3600 * 1000; });
  var states = {};

  function unit(l) {
    var it = BY[l.id]; if (!it) return 0;
    var p = Number(it.p || 0);
    (it.o || []).forEach(function (g, gi) {
      (l.sel && l.sel[gi] || []).forEach(function (vi) { var v = g.v && g.v[vi]; if (v) p += Number(v[1] || 0); });
    });
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
  function addLine(l) {
    var hit = cart.filter(function (x) { return same(x, l); })[0];
    if (hit) hit.qty = Math.min(30, hit.qty + l.qty); else cart.push(l);
    save(); drawBar(); drawSteppers();
  }
  function qtyOf(id) { return cart.reduce(function (n, l) { return n + (l.id === id ? l.qty : 0); }, 0); }

  /* ------------------------------------------------------------------ page */
  var hd = h('header', { class: 'tq-hd' },
    h('div', { class: 'tq-hd__row' }, h('h1', { class: 'tq-hd__site' }, C.site || ''), h('span', { class: 'tq-pill' }, t('table', C.table))),
    h('p', { class: 'tq-hd__sub' }, t('sub')));
  put(app, hd);
  if (C.demo) put(app, h('p', { class: 'tq-demo' }, t('demo')));
  if (C.stopped) put(app, h('p', { class: 'tq-stop', role: 'alert' }, C.stopped));
  if (C.note) put(app, h('p', { class: 'tq-note' }, C.note));

  var cats = MENU.cats.filter(function (c) { return MENU.items.some(function (it) { return it.cat === c[0]; }); });
  if (cats.length > 1) {
    put(app, h('nav', { class: 'tq-cats', 'aria-label': 'Menu' }, cats.map(function (c, i) {
      return h('a', { href: '#tq-' + c[0], class: i === 0 ? 'is-on' : null, onclick: function (e) {
        e.preventDefault();
        var s = document.getElementById('tq-' + c[0]);
        if (s) window.scrollTo({ top: s.getBoundingClientRect().top + window.scrollY - 64, behavior: 'smooth' });
      } }, c[1]);
    })));
  }
  var main = h('main', { class: 'tq-menu' });
  if (!MENU.items.length) put(main, h('p', { class: 'tq-empty' }, t('empty')));
  cats.forEach(function (c) {
    var list = MENU.items.filter(function (it) { return it.cat === c[0]; });
    put(main, h('section', { class: 'tq-sec', id: 'tq-' + c[0] }, h('h2', null, c[1]), list.map(itemRow)));
  });
  put(app, main);
  var bar = h('div', { class: 'tq-bar', hidden: true });
  put(app, bar);
  var mine = h('button', { class: 'tq-mine', type: 'button', hidden: true, onclick: function () { openOrders(); } }, t('see_orders'));
  put(app, mine);

  function itemRow(it) {
    var stepWrap = h('div', { class: 'tq-item__act', 'data-step': it.id });
    var row = h('article', { class: 'tq-item' + (it.sold ? ' is-sold' : '') },
      it.img ? h('img', { class: 'tq-item__img', src: it.img, alt: '', loading: 'lazy', width: '84', height: '84', onerror: function () { this.remove(); } }) : null,
      h('div', { class: 'tq-item__body' },
        h('h3', null, it.n),
        it.d ? h('p', { class: 'tq-item__d' }, it.d) : null,
        h('p', { class: 'tq-item__p' }, money(it.p), it.sold ? h('span', { class: 'tq-tag' }, t('sold')) : (it.left != null && it.left <= 5 ? h('span', { class: 'tq-tag tq-tag--warn' }, t('left', it.left)) : null))),
      stepWrap);
    drawStep(stepWrap, it);
    return row;
  }
  function drawStep(wrap, it) {
    wrap.innerHTML = '';
    if (it.sold || C.stopped) return;
    var n = qtyOf(it.id);
    var hasOpts = (it.o || []).length > 0;
    if (!n || hasOpts) {
      put(wrap, h('button', { class: 'tq-add', type: 'button', 'aria-label': t('add') + ' ' + it.n, onclick: function () { if (hasOpts) openItem(it); else addLine({ id: it.id, qty: 1, sel: [], note: '' }); } }, n && hasOpts ? '+ ' + n : t('add')));
      return;
    }
    var line = cart.filter(function (l) { return l.id === it.id; })[0];
    put(wrap, h('div', { class: 'tq-step' },
      h('button', { type: 'button', 'aria-label': '−', onclick: function () { line.qty--; if (line.qty < 1) cart.splice(cart.indexOf(line), 1); save(); drawBar(); drawSteppers(); } }, '−'),
      h('span', { 'aria-live': 'polite' }, n),
      h('button', { type: 'button', 'aria-label': '+', onclick: function () { line.qty = Math.min(30, line.qty + 1); save(); drawBar(); drawSteppers(); } }, '+')));
  }
  function drawSteppers() {
    [].forEach.call(document.querySelectorAll('[data-step]'), function (w) { var it = BY[w.getAttribute('data-step')]; if (it) drawStep(w, it); });
  }
  function drawBar() {
    var n = count();
    bar.hidden = !n;
    mine.hidden = !!n || !orders.length;
    bar.innerHTML = '';
    if (!n) return;
    put(bar, h('button', { class: 'tq-bar__btn', type: 'button', onclick: openCart },
      h('span', { class: 'tq-bar__n' }, n), h('span', null, t('view')), h('b', null, money(sum()))));
  }

  /* ------------------------------------------------------------------ sheets */
  var scrim = null;
  function closeSheet() { if (scrim) { scrim.remove(); scrim = null; document.body.classList.remove('tq-lock'); } }
  function sheet(title, body, foot) {
    closeSheet();
    var panel = h('div', { class: 'tq-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'tq-sheet__hd' }, h('h2', null, title), h('button', { class: 'tq-x', type: 'button', 'aria-label': t('close'), onclick: closeSheet }, '×')),
      h('div', { class: 'tq-sheet__body' }, body), foot ? h('div', { class: 'tq-sheet__ft' }, foot) : null);
    scrim = h('div', { class: 'tq-scrim', onclick: function (e) { if (e.target === scrim) closeSheet(); } }, panel);
    document.body.appendChild(scrim);
    document.body.classList.add('tq-lock');
    return panel;
  }
  function openItem(it) {
    var sel = (it.o || []).map(function (g) { return g.one ? [Number(g.def || 0)] : []; });
    var qty = 1;
    var note = h('input', { type: 'text', maxlength: '120', placeholder: t('note_ph') });
    var btn = h('button', { class: 'tq-btn', type: 'button' });
    function price() { return unit({ id: it.id, sel: sel }) * qty; }
    function label() { btn.textContent = t('add_to', money(price())); }
    var groups = (it.o || []).map(function (g, gi) {
      var name = 'tq-g' + gi;
      return h('fieldset', { class: 'tq-opt' }, h('legend', null, (g.n || '') + ' ', h('small', null, g.one ? t('one') : t('any'))),
        (g.v || []).map(function (v, vi) {
          var inp = h('input', { type: g.one ? 'radio' : 'checkbox', name: name, checked: sel[gi].indexOf(vi) !== -1, onchange: function () {
            if (g.one) sel[gi] = [vi];
            else if (inp.checked) sel[gi].push(vi); else sel[gi] = sel[gi].filter(function (x) { return x !== vi; });
            label();
          } });
          return h('label', { class: 'tq-opt__row' }, inp, h('span', null, v[0]), Number(v[1]) ? h('em', null, '+' + money(v[1])) : null);
        }));
    });
    var qn = h('span', null, qty);
    var step = h('div', { class: 'tq-step tq-step--lg', role: 'group', 'aria-label': t('qty') },
      h('button', { type: 'button', 'aria-label': '−', onclick: function () { qty = Math.max(1, qty - 1); qn.textContent = qty; label(); } }, '−'), qn,
      h('button', { type: 'button', 'aria-label': '+', onclick: function () { qty = Math.min(30, qty + 1); qn.textContent = qty; label(); } }, '+'));
    btn.addEventListener('click', function () { addLine({ id: it.id, qty: qty, sel: sel.map(function (x) { return x.slice().sort(); }), note: note.value.trim() }); closeSheet(); });
    label();
    sheet(it.n, [it.img ? h('img', { class: 'tq-sheet__img', src: it.img, alt: '' }) : null, it.d ? h('p', { class: 'tq-muted' }, it.d) : null, groups,
      h('label', { class: 'tq-field' }, h('span', null, t('item_note')), note)], [step, btn]);
  }
  function openCart() {
    var body = h('div');
    var notes = h('textarea', { rows: '2', maxlength: '300', placeholder: t('note_ph') });
    var msg = h('p', { class: 'tq-err', role: 'alert', hidden: true });
    var totalEl = h('b');
    var btn = h('button', { class: 'tq-btn', type: 'button', onclick: send, disabled: !!C.stopped }, t('send'));
    function draw() {
      body.innerHTML = '';
      if (!cart.length) { closeSheet(); drawBar(); drawSteppers(); return; }
      put(body, h('ul', { class: 'tq-lines' }, cart.map(function (l) {
        var it = BY[l.id];
        var o = optText(l);
        return h('li', null,
          h('div', { class: 'tq-lines__main' }, h('b', null, it.n), o ? h('small', null, o) : null, l.note ? h('small', { class: 'tq-lines__note' }, l.note) : null),
          h('div', { class: 'tq-step' },
            h('button', { type: 'button', 'aria-label': '−', onclick: function () { l.qty--; if (l.qty < 1) cart.splice(cart.indexOf(l), 1); save(); draw(); drawBar(); drawSteppers(); } }, '−'),
            h('span', null, l.qty),
            h('button', { type: 'button', 'aria-label': '+', onclick: function () { l.qty = Math.min(30, l.qty + 1); save(); draw(); drawBar(); drawSteppers(); } }, '+')),
          h('span', { class: 'tq-lines__p' }, money(unit(l) * l.qty)));
      })));
      put(body, h('label', { class: 'tq-field' }, h('span', null, t('note')), notes));
      put(body, h('p', { class: 'tq-muted tq-small' }, t('pay')));
      totalEl.textContent = money(sum());
    }
    function send() {
      btn.disabled = true; btn.textContent = t('sending'); msg.hidden = true;
      fetch(url('order'), {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: C.table, k: C.key, items: cart.map(function (l) { return { id: l.id, qty: l.qty, sel: l.sel, note: l.note }; }), notes: notes.value.trim(), total: Math.round(sum() * 100) / 100 })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) throw new Error(d && d.message ? d.message : t('error'));
          return d;
        });
      }).then(function (d) {
        var lines = cart.map(function (l) { return { n: BY[l.id].n, o: optText(l), note: l.note, qty: l.qty }; });
        orders.unshift({ id: d.id, key: d.key, number: d.number, total: d.total, at: Date.now(), lines: lines });
        store(ORD_K, orders.slice(0, 30));
        states[d.id] = 'kitchen';
        cart = []; save(); drawBar(); drawSteppers();
        openOrders(d.number);
      }).catch(function (e) {
        msg.textContent = e && e.message ? e.message : t('error'); msg.hidden = false;
        btn.disabled = !!C.stopped; btn.textContent = t('send');
      });
    }
    draw();
    sheet(t('yours'), [body, msg], [h('div', { class: 'tq-total' }, h('span', null, t('total')), totalEl), btn]);
  }
  function stateBadge(o) {
    var s = states[o.id] || 'kitchen';
    return h('span', { class: 'tq-state tq-state--' + s }, t(s));
  }
  function openOrders(justSent) {
    var body = h('div');
    function draw() {
      body.innerHTML = '';
      if (justSent) put(body, h('div', { class: 'tq-sent' }, h('b', null, t('sent')), h('span', null, t('order_no', justSent))));
      var due = 0;
      put(body, h('h3', { class: 'tq-h3' }, t('at_table')));
      put(body, h('ul', { class: 'tq-orders' }, orders.map(function (o) {
        var s = states[o.id] || 'kitchen';
        if (s !== 'paid' && s !== 'cancelled') due += Number(o.total || 0);
        return h('li', null, h('div', { class: 'tq-orders__hd' }, h('b', null, t('order_no', o.number)), stateBadge(o), h('span', { class: 'tq-orders__p' }, money(o.total))),
          h('ul', null, (o.lines || []).map(function (l) { return h('li', null, l.qty + ' × ' + l.n + (l.o ? ' (' + l.o + ')' : '') + (l.note ? ' · ' + l.note : '')); })));
      })));
      if (due > 0) put(body, h('div', { class: 'tq-total tq-total--due' }, h('span', null, t('so_far')), h('b', null, money(due))));
      put(body, h('p', { class: 'tq-muted tq-small' }, t('pay')));
    }
    draw();
    sheet(t('yours'), body, h('button', { class: 'tq-btn', type: 'button', onclick: function () { closeSheet(); drawBar(); } }, t('more')));
    poll(draw);
  }

  /* ------------------------------------------------------------------ order status */
  var timer = null;
  function poll(redraw) {
    clearTimeout(timer);
    var open = orders.filter(function (o) { var s = states[o.id]; return s !== 'paid' && s !== 'cancelled'; });
    if (!open.length) return;
    fetch(url('status', 'o=' + open.map(function (o) { return o.id; }).join(',') + '&k=' + open.map(function (o) { return o.key; }).join(',')), { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { orders: [] }; })
      .then(function (d) {
        var changed = false;
        (d.orders || []).forEach(function (x) { if (states[x.id] !== x.state) { states[x.id] = x.state; changed = true; } });
        if (changed && redraw && scrim) redraw();
      })
      .catch(function () {})
      .then(function () { timer = setTimeout(function () { poll(redraw); }, document.hidden ? 60000 : 15000); });
  }

  drawBar();
  if (orders.length) poll(null);
  // highlight the category in view
  if (cats.length > 1 && 'IntersectionObserver' in window) {
    var links = document.querySelectorAll('.tq-cats a');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        [].forEach.call(links, function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('is-on', on);
          if (on && a.scrollIntoView) a.parentNode.scrollLeft = a.offsetLeft - 16;
        });
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    [].forEach.call(document.querySelectorAll('.tq-sec'), function (s) { io.observe(s); });
  }
})();
