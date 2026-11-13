/* Caleb's Hideout — private mockup by Cartsmith Studio (2026-11-13), built on the Sireh & Salt demo.
   A fictional restaurant. Everything runs in this browser: no real orders, bookings or payments are made,
   and nothing is sent anywhere. What you do here (your order, a booking, the owner's changes) is kept in this
   browser only (localStorage), so the "owner view" can show it. */
(function () {
  'use strict';

  // ------------------------------------------------------------------ data (demo)
  var HOURS = { 0: [[540, 1080]], 1: [], 2: [], 3: [], 4: [], 5: [[540, 1080]], 6: [[540, 1320]] };
  var CATS = [["coffee", "Coffee"], ["tea", "Tea"], ["cakes", "Cakes (rotating)"]];
  var MENU = [
    {
      "id": "flat-white",
      "cat": "coffee",
      "n": "Flat White",
      "d": "Made with Emberwood Coffee Roasters’ Ember house blend (Brazil, Colombia and Guatemala): creamy and chocolatey.",
      "p": null,
      "tags": [
        "pop"
      ],
      "heat": 0
    },
    {
      "id": "sunlit-jasmine",
      "cat": "tea",
      "n": "Sunlit Jasmine",
      "d": "Chilled jasmine tea, lightly sweetened with honey and brightened with yuzu.",
      "p": null,
      "tags": [
        "pop"
      ],
      "heat": 0,
      "img": false
    },
    {
      "id": "chocolate-mousse",
      "cat": "cakes",
      "n": "Tofu Oat Milk Chocolate Mousse Cake",
      "d": "Enough raw cacao to taste decadent; tofu and oat milk keep it dairy-free and lighter than it looks.",
      "p": null,
      "tags": [
        "pop"
      ],
      "heat": 0,
      "img": false
    },
    {
      "id": "banana-cake",
      "cat": "cakes",
      "n": "Banana Cake with Walnuts & Prunes",
      "d": "Baked by Caleb, on the rotating cake menu.",
      "p": null,
      "tags": [],
      "heat": 0,
      "img": false
    },
    {
      "id": "brownie-cheesecake",
      "cat": "cakes",
      "n": "Tofu Brownie Cheesecake with Biscoff",
      "d": "Brownie and a tofu cheesecake layer, with Biscoff biscuits.",
      "p": null,
      "tags": [],
      "heat": 0,
      "img": false
    },
    {
      "id": "watermelon-cake",
      "cat": "cakes",
      "n": "Rose Water Watermelon Cake",
      "d": "Watermelon infused with rose water, with strawberries and pistachios.",
      "p": null,
      "tags": [],
      "heat": 0,
      "img": false
    }
  ];
  // festive seasons: cut-off and pick-up dates are Malaysia dates. CNY 2027 = 6 Feb; Hari Raya 2027 expected 10 Mar.
  var SEASONS = [
    {
      "id": "xmas",
      "name": "Christmas 2026",
      "cutoff": "2026-12-20",
      "from": "2026-12-25",
      "to": "2026-12-27",
      "img": "interior",
      "blurb": "An example of Christmas cake pre-orders: whole cakes from the rotating menu, picked up at the café on the Christmas weekend. Which cakes, sizes, how many and the prices are yours to set.",
      "items": [
        {
          "id": "xmas-mousse",
          "n": "Whole Tofu Oat Milk Chocolate Mousse Cake",
          "p": null,
          "img": false,
          "total": 10,
          "left": 10,
          "dep": 1,
          "has": [
            "Raw cacao, tofu and oat milk",
            "Dairy-free",
            "Pick up at the café"
          ]
        },
        {
          "id": "xmas-banana",
          "n": "Whole Banana Cake with Walnuts & Prunes",
          "p": null,
          "img": false,
          "total": 10,
          "left": 10,
          "dep": 1,
          "has": [
            "Walnuts and prunes",
            "Pick up at the café"
          ]
        },
        {
          "id": "xmas-watermelon",
          "n": "Rose Water Watermelon Cake",
          "p": null,
          "img": false,
          "total": 10,
          "left": 10,
          "dep": 1,
          "has": [
            "Rose water, strawberries and pistachios",
            "Pick up at the café"
          ]
        }
      ]
    }
  ];
  var ZONES = [
    { re: /^4[67]\d{3}$/, fee: 6, eta: '35–50 min', area: 'Petaling Jaya and Subang' },
    { re: /^5\d{4}$/, fee: 10, eta: '45–70 min', area: 'Kuala Lumpur' }
  ];
  var DELIVERY = false; // a customer's mockup without a known delivery service: false (pick-up only)
  var DELIVERY_MIN = 40, FREE_DELIVERY = 120, PROMO = { code: "EXAMPLE10", pct: 10 };
  var ADDRESS = "24-1, Jalan Sepadu, Taman United, Kuala Lumpur (off Old Klang Road)";
  var MAPS = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent("Caleb's Hideout, 24-1 Jalan Sepadu, Taman United, Kuala Lumpur");
  var WA = 'https://wa.me/60183170986?text=';
  var WA_ASK = WA; // a customer's mockup puts their own WhatsApp number here (wa.me/60…?text=)
  var SIGNATURE = ["flat-white", "chocolate-mousse", "sunlit-jasmine"]; // the home page's "most ordered" dishes
  var BRAND = "Caleb's Hideout", REF = "CH", KEY = "ch_"; // a customer's mockup: their name, order prefix, own storage key
  var PHOTO_NOTE = ''; // a customer's mockup with their own photos: ''

  // ------------------------------------------------------------------ helpers
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rm(n) { return (n == null || isNaN(n)) ? 'Ask for price' : 'RM' + (Math.round(n * 100) / 100).toFixed(2); }
  function load(k, d) { try { var v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* private mode: the demo still works on this page */ } }
  function my() { return new Date(Date.now() + 8 * 3600e3); } // Malaysia time, read with getUTC*
  function today() { return my().toISOString().slice(0, 10); }
  function nowMin() { var d = my(); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dowOf(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], DAYL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(s) { var d = new Date(s + 'T00:00:00Z'); return DAY[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function fmtTime(m) { var h = Math.floor(m / 60), mm = m % 60; return (((h + 11) % 12) + 1) + ':' + (mm < 10 ? '0' : '') + mm + (h >= 12 ? 'pm' : 'am'); }
  function daysUntil(s) { return Math.round((Date.parse(s + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 864e5); }
  function code(prefix, n) { var a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return prefix + s; }
  function seq() { var n = load('seq', 1040) + 1; save('seq', n); return n; }
  function phoneOk(v) { return /^(\+?6?0)?1\d[\d\s-]{7,10}$/.test(String(v).trim()) || /^\+?\d[\d\s-]{8,14}$/.test(String(v).trim()); }
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.8 8.6c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.3.5.8 1.1 1.3 1.6.6.5 1.2.9 1.8 1.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.4 0 .3-.1 1-.6 1.4-.4.4-1.2.8-2 .7-.8-.1-2-.5-3.4-1.6-1.6-1.3-2.5-2.9-2.8-3.5-.3-.7-.4-1.6 0-2.4z" fill="currentColor"/></svg>'
  };
  function toast(t) { var el = $('[data-toast]'); if (!el) return; el.textContent = t; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('is-on'); }, 2600); }

  // ------------------------------------------------------------------ owner's settings (owner view) and this browser's activity
  function owner() { var o = load('owner', {}); o.sold = o.sold || {}; o.price = o.price || {}; o.left = o.left || {}; o.status = o.status || 'auto'; return o; }
  function setOwner(o) { save('owner', o); }
  function item(id) { for (var i = 0; i < MENU.length; i++) if (MENU[i].id === id) return MENU[i]; return null; }
  function priceOf(it) { var o = owner(); return typeof o.price[it.id] === 'number' ? o.price[it.id] : it.p; }
  // 2026-11-13: mockups for real shops leave out prices we could not confirm (p: null). Those items show "Ask for price"
  // and a WhatsApp button; in the owner view the shop can type its prices, and the item becomes orderable at once.
  function hasPrice(it) { var v = priceOf(it); return typeof v === 'number' && !isNaN(v); }
  function askLink(n) { return WA_ASK + encodeURIComponent('Hi, how much is the ' + n + '?'); }
  function picOf(it) { return it.img === false ? '' : 'img/' + (it.img || it.id) + '.webp'; }
  var NOPHOTO = '<div class="nophoto"><span>Your photo here</span></div>';
  function askBtn(n) { return '<a class="addbtn addbtn--ask" href="' + askLink(n) + '" target="_blank" rel="noopener">' + ICON.wa + 'Ask</a>'; }
  function isOut(id) { return !!owner().sold[id]; }
  function fitem(id) { for (var i = 0; i < SEASONS.length; i++) for (var j = 0; j < SEASONS[i].items.length; j++) if (SEASONS[i].items[j].id === id) return { s: SEASONS[i], it: SEASONS[i].items[j] }; return null; }
  function fp(fi) { var o = owner(); return typeof o.price[fi.id] === 'number' ? o.price[fi.id] : fi.p; }
  function leftOf(fi) { var o = owner(); return typeof o.left[fi.id] === 'number' ? o.left[fi.id] : fi.left; }
  function bag() { return load('bag', []); }
  function setBag(b) { save('bag', b); updateBag(); }
  function bagCount() { return bag().reduce(function (a, l) { return a + l.qty; }, 0); }
  function bagSub() { return bag().reduce(function (a, l) { return a + l.unit * l.qty; }, 0); }

  // ------------------------------------------------------------------ opening hours
  function status() {
    var o = owner(), t = today(), m = nowMin(), hrs = HOURS[dowOf(t)];
    if (o.status === 'closed') return { cls: 'closed', open: false, text: 'Closed today', long: 'Closed today. Orders and bookings for other days still work.' };
    for (var i = 0; i < hrs.length; i++) {
      var a = hrs[i][0], b = hrs[i][1];
      if (m >= a && m < b) {
        if (o.status === 'busy') return { cls: 'busy', open: true, text: 'Open · busy', long: 'Open until ' + fmtTime(b) + '. The kitchen is busy: orders take about 20 minutes longer.' };
        if (b - m <= 30) return { cls: 'open', open: true, text: 'Closing ' + fmtTime(b), long: 'Open now, closing at ' + fmtTime(b) + '.' };
        return { cls: 'open', open: true, text: 'Open until ' + fmtTime(b), long: 'Open now until ' + fmtTime(b) + '.' };
      }
    }
    for (var j = 0; j < hrs.length; j++) if (hrs[j][0] > m) return { cls: 'closed', open: false, text: 'Opens ' + fmtTime(hrs[j][0]), long: 'Closed right now. Opens today at ' + fmtTime(hrs[j][0]) + '.' };
    for (var d = 1; d <= 7; d++) {
      var day = addDays(t, d), h = HOURS[dowOf(day)];
      if (h.length) return { cls: 'closed', open: false, text: 'Opens ' + (d === 1 ? 'tomorrow' : DAY[dowOf(day)]) + ' ' + fmtTime(h[0][0]), long: 'Closed now. Opens ' + (d === 1 ? 'tomorrow' : DAYL[dowOf(day)]) + ' at ' + fmtTime(h[0][0]) + '.' };
    }
    return { cls: 'closed', open: false, text: 'Closed', long: 'Closed.' };
  }
  function hoursTable() {
    var t = dowOf(today()), order = [1, 2, 3, 4, 5, 6, 0];
    return '<table class="hours"><tbody>' + order.map(function (d) {
      var h = HOURS[d];
      return '<tr class="' + (d === t ? 'is-today' : '') + '"><td>' + DAYL[d] + (d === t ? ' (today)' : '') + '</td><td>' + (h.length ? h.map(function (x) { return fmtTime(x[0]) + '–' + fmtTime(x[1]); }).join(', ') : 'Closed') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function openDays(n, from) {
    var out = [], o = owner(), t = today();
    for (var i = from || 0; out.length < n && i < 40; i++) { var d = addDays(t, i); if (HOURS[dowOf(d)].length && !(d === t && o.status === 'closed')) out.push(d); }
    return out;
  }
  function orderSlots(d) {
    var out = [], prep = owner().status === 'busy' ? 50 : 30, min = d === today() ? nowMin() + prep : 0;
    HOURS[dowOf(d)].forEach(function (h) { for (var t = h[0] + 15; t <= h[1] - 30; t += 15) if (t >= min) out.push(t); });
    return out;
  }
  function bookings() { return load('bookings', []); }
  function tablesLeft(d, t) {
    var h = 7, s = d + ':' + t; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    var n = h % 6; if (t >= 1140 && t <= 1230) n = Math.max(0, n - 2);
    n -= bookings().filter(function (b) { return b.date === d && b.time === t; }).length;
    return Math.max(0, n);
  }

  // ------------------------------------------------------------------ shared UI: nav, status, bag, hours
  function updateBag() {
    var n = bagCount();
    $$('[data-bag-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
    var bar = $('[data-bagbar]');
    if (bar) { bar.hidden = !n; bar.innerHTML = '<span><b>' + n + ' item' + (n === 1 ? '' : 's') + '</b> · ' + rm(bagSub()) + '</span><span class="btn btn--light btn--sm">View order</span>'; }
  }
  function shared() {
    var page = document.body.getAttribute('data-page');
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === page) { a.classList.add('is-on'); a.setAttribute('aria-current', 'page'); } });
    var burger = $('[data-burger]'), nav = $('#nav');
    if (burger && nav) burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      var hdr = $('.hdr'); document.documentElement.style.setProperty('--navtop', (hdr.getBoundingClientRect().bottom) + 'px');
      nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    var st = status();
    $$('[data-status]').forEach(function (el) { el.textContent = st.text; el.className = 'status status--' + st.cls; });
    $$('[data-status-long]').forEach(function (el) { el.textContent = st.long; });
    $$('[data-status-text]').forEach(function (el) { el.textContent = st.text; });
    $$('[data-hours]').forEach(function (el) { el.innerHTML = hoursTable(); });
    $$('[data-address]').forEach(function (el) { el.textContent = ADDRESS; });
    $$('[data-maps]').forEach(function (el) { el.href = MAPS; });
    updateBag();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  }

  // ------------------------------------------------------------------ dishes and the options sheet
  function tagsHTML(it) {
    var t = [];
    if (isOut(it.id)) t.push('<span class="tag tag--out">Sold out today</span>');
    if (it.tags.indexOf('pop') >= 0) t.push('<span class="tag tag--pop">Popular</span>');
    if (it.tags.indexOf('new') >= 0) t.push('<span class="tag tag--new">New</span>');
    if (it.tags.indexOf('chef') >= 0) t.push('<span class="tag tag--chef">Chef’s pick</span>');
    if (it.heat >= 2) t.push('<span class="tag tag--hot">' + (it.heat >= 3 ? 'Very spicy' : 'Spicy') + '</span>');
    return t.join('');
  }
  function dishCard(it) {
    var out = isOut(it.id);
    return '<article class="dish' + (out ? ' is-out' : '') + '"><div class="dish__img">' + (picOf(it) ? '<img src="' + picOf(it) + '" alt="' + esc(it.n) + '' + PHOTO_NOTE + '" loading="lazy" width="600" height="450">' : NOPHOTO) + '<div class="dish__tags">' + tagsHTML(it) + '</div></div>' +
      '<div class="dish__body"><h3>' + esc(it.n) + '</h3><p>' + esc(it.d) + '</p><div class="dish__foot"><span class="price">' + rm(priceOf(it)) + (it.per ? ' <small class="muted">· ' + esc(it.per) + '</small>' : '') + '</span>' +
      (hasPrice(it) || out ? '<button class="addbtn" type="button" data-add="' + it.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Sold out' : ICON.plus + 'Add') + '</button>' : askBtn(it.n)) + '</div></div></article>';
  }
  function menuItem(it) {
    var out = isOut(it.id);
    return '<article class="mitem' + (out ? ' is-out' : '') + '" id="i-' + it.id + '"><div><h3>' + esc(it.n) + '</h3><p>' + esc(it.d) + '</p><div class="mitem__meta">' + tagsHTML(it) + (it.per ? '<span class="tag">' + esc(it.per) + '</span>' : '') + '</div>' +
      '<div class="mitem__foot"><span class="price">' + rm(priceOf(it)) + '</span>' + (hasPrice(it) || out ? '<button class="addbtn" type="button" data-add="' + it.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Sold out' : ICON.plus + 'Add') + '</button>' : askBtn(it.n)) + '</div></div>' +
      (picOf(it) ? '<img src="' + picOf(it) + '" alt="' + esc(it.n) + '' + PHOTO_NOTE + '" loading="lazy" width="112" height="112">' : '') + '</article>';
  }
  var sheetFocus = null;
  function openSheet(html, img) {
    var sh = $('[data-sheet]'), p = $('.sheet__panel', sh);
    sheetFocus = document.activeElement;
    p.innerHTML = '<button class="sheet__x" type="button" data-close aria-label="Close">&times;</button>' + (img ? '<img class="sheet__img" src="' + img + '" alt="">' : '') + html;
    sh.hidden = false; document.body.style.overflow = 'hidden'; p.focus();
  }
  function closeSheet() { var sh = $('[data-sheet]'); if (!sh || sh.hidden) return; sh.hidden = true; document.body.style.overflow = ''; if (sheetFocus && sheetFocus.focus) sheetFocus.focus(); }
  function addDirect(it, qty, sel, note) {
    var unit = priceOf(it), label = [];
    (it.o || []).forEach(function (g, gi) { (sel[gi] || []).forEach(function (vi) { unit += g.v[vi][1]; label.push(g.v[vi][0]); }); });
    var key = it.id + '|' + JSON.stringify(sel) + '|' + (note || '');
    var b = bag(), found = null;
    b.forEach(function (l) { if (l.key === key) found = l; });
    if (found) found.qty += qty; else b.push({ key: key, id: it.id, n: it.n, qty: qty, unit: Math.round(unit * 100) / 100, opts: label.join(', '), note: note || '' });
    setBag(b);
    toast('Added: ' + qty + ' × ' + it.n);
  }
  function optionsSheet(it) {
    var sel = {}, qty = 1;
    (it.o || []).forEach(function (g, gi) { sel[gi] = g.one ? [g.def || 0] : []; });
    var groups = (it.o || []).map(function (g, gi) {
      return '<fieldset class="optgroup"><legend>' + esc(g.n) + ' <small>' + (g.one ? '(choose one)' : '(optional)') + '</small></legend>' + g.v.map(function (v, vi) {
        return '<label class="opt"><input type="' + (g.one ? 'radio' : 'checkbox') + '" name="g' + gi + '" value="' + vi + '"' + (g.one && vi === (g.def || 0) ? ' checked' : '') + '><span>' + esc(v[0]) + '</span>' + (v[1] ? '<em>+' + rm(v[1]) + '</em>' : '') + '</label>';
      }).join('') + '</fieldset>';
    }).join('');
    openSheet('<div class="sheet__body"><h2 id="sheet-title">' + esc(it.n) + '</h2><p class="muted">' + esc(it.d) + '</p>' + groups +
      '<div class="field" style="margin-top:14px"><label for="sh-note">Note for the kitchen <small>(optional)</small></label><input class="input" id="sh-note" maxlength="120" placeholder="e.g. less oil, no peanuts"></div></div>' +
      '<div class="sheet__foot"><div class="qty"><button type="button" data-q="-1" aria-label="One less">−</button><output data-qv>1</output><button type="button" data-q="1" aria-label="One more">+</button></div><button class="btn btn--block" type="button" data-sheet-add></button></div>', picOf(it));
    var p = $('.sheet__panel');
    function total() { var u = priceOf(it); (it.o || []).forEach(function (g, gi) { (sel[gi] || []).forEach(function (vi) { u += g.v[vi][1]; }); }); return u * qty; }
    function paint() { $('[data-qv]', p).textContent = qty; $('[data-sheet-add]', p).textContent = 'Add to order · ' + rm(total()); }
    p.addEventListener('change', function (e) {
      var m = /^g(\d+)$/.exec(e.target.name || ''); if (!m) return;
      var gi = +m[1];
      sel[gi] = $$('input[name="g' + gi + '"]:checked', p).map(function (x) { return +x.value; });
      paint();
    });
    p.addEventListener('click', function (e) {
      var q = e.target.closest('[data-q]'); if (q) { qty = Math.max(1, Math.min(20, qty + +q.getAttribute('data-q'))); paint(); }
      if (e.target.closest('[data-sheet-add]')) { addDirect(it, qty, sel, $('#sh-note', p).value.trim()); closeSheet(); }
    });
    paint();
  }
  function onAdd(e) {
    var b = e.target.closest('[data-add]'); if (!b) return;
    var it = item(b.getAttribute('data-add')); if (!it || isOut(it.id) || !hasPrice(it)) return;
    if (it.o && it.o.length) optionsSheet(it); else addDirect(it, 1, {}, '');
  }

  // ------------------------------------------------------------------ home
  function nextSeason() { var t = today(); for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i].cutoff >= t) return SEASONS[i]; return null; }
  function pageHome() {
    var sig = SIGNATURE.map(item).filter(Boolean);
    $('[data-signature]').innerHTML = sig.map(dishCard).join('');
    var s = nextSeason(), el = $('[data-festive-strip]');
    if (s && el) {
      var left = s.items.reduce(function (a, x) { return a + leftOf(x); }, 0), total = s.items.reduce(function (a, x) { return a + x.total; }, 0), d = daysUntil(s.cutoff);
      el.innerHTML = '<div class="fstrip"><img src="img/' + s.img + '.webp" alt=""><div><h3>' + esc(s.name) + ' pre-orders are open</h3><p>Order by ' + fmtDay(s.cutoff) + ' (' + (d === 0 ? 'today' : d + ' day' + (d === 1 ? '' : 's') + ' left') + '). Pick up ' + fmtDay(s.from) + ' to ' + fmtDay(s.to) + '.</p>' +
        '<div class="bar" title="' + left + ' of ' + total + ' left"><i style="width:' + Math.round(100 * left / total) + '%"></i></div><p class="small" style="margin-top:6px">' + left + ' of ' + total + ' left to order</p></div><a class="btn btn--light" href="festive.html">See pre-orders</a></div>';
    }
    document.addEventListener('click', onAdd);
  }

  // ------------------------------------------------------------------ menu
  function pageMenu() {
    var filter = '';
    function paint() {
      $('[data-menu]').innerHTML = CATS.map(function (c) {
        var items = MENU.filter(function (it) { return it.cat === c[0] && (!filter || (filter === 'pop' ? it.tags.indexOf('pop') >= 0 : it.heat === 0)); });
        if (!items.length) return '';
        return '<section class="menu-cat" id="c-' + c[0] + '"><h2>' + esc(c[1]) + ' <small>' + items.length + ' item' + (items.length === 1 ? '' : 's') + '</small></h2><div class="mlist">' + items.map(menuItem).join('') + '</div></section>';
      }).join('') || '<p class="empty">Nothing here with that filter.</p>';
    }
    $('[data-cats]').innerHTML = CATS.map(function (c, i) { return '<a href="#c-' + c[0] + '"' + (i === 0 ? ' class="is-on"' : '') + '>' + esc(c[1]) + '</a>'; }).join('');
    $('[data-filters]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      filter = b.getAttribute('data-filter');
      $$('[data-filter]').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      paint();
    });
    paint();
    document.addEventListener('click', onAdd);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = en.target.id.slice(2);
          $$('[data-cats] a').forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#c-' + id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      setTimeout(function () { $$('.menu-cat').forEach(function (s) { io.observe(s); }); }, 50);
    }
  }

  // ------------------------------------------------------------------ order (checkout)
  function vouchers() { return load('vouchers', []); }
  function discountFor(c, sub) {
    c = String(c || '').trim().toUpperCase();
    if (!c) return { ok: true, amt: 0, label: '' };
    if (c === PROMO.code) return { ok: true, amt: Math.round(sub * PROMO.pct) / 100, label: PROMO.pct + '% off (' + c + ')' };
    var v = vouchers().filter(function (x) { return x.code === c; })[0];
    if (v && !v.used) return { ok: true, amt: Math.min(sub, v.amt), label: 'Gift voucher ' + c, voucher: c };
    if (v && v.used) return { ok: false, msg: 'This gift voucher has already been used.' };
    return { ok: false, msg: 'That code doesn’t work. Try ' + PROMO.code + ' (demo), or a gift voucher code from the vouchers page.' };
  }
  function orderText(o) {
    var L = ['New order (demo website): ' + BRAND, o.no + ' · ' + (o.mode === 'pickup' ? 'Pick-up' : 'Delivery') + ' · ' + fmtDay(o.date) + ', ' + fmtTime(o.time), ''];
    o.items.forEach(function (l) { L.push(l.qty + ' × ' + l.n + (l.opts ? ' (' + l.opts + ')' : '') + (l.note ? ' [' + l.note + ']' : '') + ' — ' + rm(l.unit * l.qty)); });
    L.push('');
    if (o.disc) L.push('Discount: −' + rm(o.disc));
    if (o.mode === 'delivery') L.push('Delivery: ' + (o.fee ? rm(o.fee) : 'free'));
    L.push('Total: ' + rm(o.total));
    L.push('', 'Name: ' + o.name, 'Phone: ' + o.phone);
    if (o.mode === 'delivery') L.push('Address: ' + o.addr + ', ' + o.pc);
    if (o.notes) L.push('Notes: ' + o.notes);
    return L.join('\n');
  }
  function pageOrder() {
    var S = load('checkout', { mode: 'pickup', date: '', time: 0, pc: '', addr: '', name: '', phone: '', notes: '', code: '', pay: 'online' });
    if (!DELIVERY) S.mode = 'pickup';
    var root = $('[data-order]');
    function keep() { save('checkout', S); }
    function zone() { var pc = String(S.pc || '').trim(); for (var i = 0; i < ZONES.length; i++) if (ZONES[i].re.test(pc)) return ZONES[i]; return null; }
    function calc() {
      var sub = bagSub(), d = discountFor(S.code, sub), disc = d.ok ? d.amt : 0, z = zone();
      var fee = S.mode === 'delivery' ? (z ? (sub - disc >= FREE_DELIVERY ? 0 : z.fee) : 0) : 0;
      return { sub: sub, d: d, disc: disc, fee: fee, z: z, total: Math.max(0, sub - disc + fee) };
    }
    function paint() {
      var b = bag();
      if (!b.length) {
        root.innerHTML = '<div class="panel empty"><h2>Your order is empty</h2><p>Start with a favourite. ' + (DELIVERY ? 'You can choose pick-up or delivery on the next step.' : 'You choose a pick-up time on the next step.') + '</p><div class="grid grid--3" style="text-align:left;margin-top:18px">' + SIGNATURE.slice(0, 3).map(item).filter(Boolean).map(function (it) { return dishCard(it); }).join('') + '</div><p style="margin-top:18px"><a class="btn" href="menu.html">See the full menu</a></p></div>';
        return;
      }
      var days = openDays(8).filter(function (d) { return orderSlots(d).length; }).slice(0, 7);
      if (days.indexOf(S.date) < 0) S.date = days[0];
      var slots = orderSlots(S.date);
      if (slots.indexOf(S.time) < 0) S.time = 0;
      var c = calc();
      var zoneMsg = '';
      if (S.mode === 'delivery') {
        if (!S.pc) zoneMsg = '<div class="note">' + ICON.info + '<span>We deliver to Petaling Jaya, Subang (RM6) and Kuala Lumpur (RM10). Free over ' + rm(FREE_DELIVERY) + '. Minimum order ' + rm(DELIVERY_MIN) + '.</span></div>';
        else if (!c.z) zoneMsg = '<div class="note note--bad">' + ICON.info + '<span>Sorry, ' + esc(S.pc) + ' is outside our delivery area. Pick-up works anywhere.</span></div>';
        else zoneMsg = '<div class="note note--ok">' + ICON.check + '<span>' + esc(c.z.area) + ': delivery ' + (c.fee ? rm(c.fee) : 'free') + ', about ' + c.z.eta + ' after your chosen time slot starts.</span></div>';
        if (c.z && c.sub < DELIVERY_MIN) zoneMsg += '<div class="note note--bad">' + ICON.info + '<span>Delivery needs a minimum order of ' + rm(DELIVERY_MIN) + '. Add ' + rm(DELIVERY_MIN - c.sub) + ' more, or choose pick-up.</span></div>';
      }
      var st = status();
      root.innerHTML = '<div class="co"><div>' +
        (DELIVERY ? '<section class="panel"><h2>1. Pick-up or delivery</h2><div class="seg" role="group" aria-label="Pick-up or delivery"><button type="button" data-mode="pickup" class="' + (S.mode === 'pickup' ? 'is-on' : '') + '" aria-pressed="' + (S.mode === 'pickup') + '">Pick-up</button><button type="button" data-mode="delivery" class="' + (S.mode === 'delivery' ? 'is-on' : '') + '" aria-pressed="' + (S.mode === 'delivery') + '">Delivery</button></div>' : '<section class="panel"><h2>1. Pick-up</h2>') +
        (S.mode === 'pickup' ? '<p class="muted small" style="margin:12px 0 0">Collect at the counter: ' + esc(ADDRESS) + '.</p>' : '<div class="row2" style="margin-top:14px"><div class="field"><label for="o-pc">Postcode</label><input class="input" id="o-pc" inputmode="numeric" maxlength="5" placeholder="e.g. 46100" value="' + esc(S.pc) + '" data-k="pc"></div><div class="field"><label for="o-addr">Address</label><input class="input" id="o-addr" placeholder="Unit, street, area" value="' + esc(S.addr) + '" data-k="addr"></div></div>' + zoneMsg) +
        '</section>' +
        '<section class="panel"><h2>2. When</h2>' + (st.cls === 'busy' ? '<div class="note">' + ICON.clock + '<span>' + esc(st.long) + '</span></div>' : '') +
        '<div class="days" role="group" aria-label="Day">' + days.map(function (d, i) { return '<button type="button" class="day' + (d === S.date ? ' is-on' : '') + '" data-day="' + d + '"><small>' + (i === 0 && d === today() ? 'Today' : DAY[dowOf(d)]) + '</small><b>' + d.slice(8).replace(/^0/, '') + '</b><small>' + MON[+d.slice(5, 7) - 1] + '</small></button>'; }).join('') + '</div>' +
        '<div class="field" style="margin-top:14px"><span>Time</span>' + (slots.length ? '<div class="slots">' + slots.map(function (t) { return '<button type="button" class="slot' + (t === S.time ? ' is-on' : '') + '" data-time="' + t + '">' + fmtTime(t) + '</button>'; }).join('') + '</div>' : '<p class="muted">No more times today. Choose another day.</p>') + '</div></section>' +
        '<section class="panel"><h2>3. Your details</h2><div class="row2"><div class="field"><label for="o-name">Name</label><input class="input" id="o-name" autocomplete="name" value="' + esc(S.name) + '" data-k="name"></div><div class="field"><label for="o-phone">Mobile number</label><input class="input" id="o-phone" type="tel" autocomplete="tel" placeholder="012-345 6789" value="' + esc(S.phone) + '" data-k="phone"></div></div>' +
        '<div class="field"><label for="o-notes">Notes <small>(optional)</small></label><input class="input" id="o-notes" maxlength="160" placeholder="e.g. cutlery for 3, call when outside" value="' + esc(S.notes) + '" data-k="notes"></div></section>' +
        '<section class="panel"><h2>4. Payment</h2><div class="pay">' +
        '<label class="payopt"><input type="radio" name="pay" value="online"' + (S.pay === 'online' ? ' checked' : '') + '><span><b>Pay online</b><small>FPX online banking, cards and e-wallets. Demo: no money is taken.</small></span></label>' +
        '<label class="payopt"><input type="radio" name="pay" value="wa"' + (S.pay === 'wa' ? ' checked' : '') + '><span><b>Send the order on WhatsApp</b><small>Your order arrives on the restaurant’s WhatsApp, already filled in. Pay at pick-up or by bank transfer.</small></span></label>' +
        '</div></section></div>' +
        '<aside class="summary panel" aria-label="Order summary"><h2>Your order</h2>' + b.map(function (l, i) {
          return '<div class="line"><div><h4>' + esc(l.n) + '</h4>' + (l.opts ? '<p>' + esc(l.opts) + '</p>' : '') + (l.note ? '<p>“' + esc(l.note) + '”</p>' : '') + '<div class="qty"><button type="button" data-lq="' + i + ':-1" aria-label="One less">−</button><output>' + l.qty + '</output><button type="button" data-lq="' + i + ':1" aria-label="One more">+</button></div></div><b>' + rm(l.unit * l.qty) + '</b></div>';
        }).join('') +
        '<div class="field" style="margin-top:14px"><label for="o-code">Voucher or promo code</label><div style="display:flex;gap:8px"><input class="input" id="o-code" placeholder="' + PROMO.code + ' or GIFT-…" value="' + esc(S.code) + '" data-k="code" autocapitalize="characters"><button class="btn btn--ghost btn--sm" type="button" data-apply>Apply</button></div>' + (S.code && !c.d.ok ? '<small style="color:var(--chili)">' + esc(c.d.msg) + '</small>' : (c.disc ? '<small style="color:var(--ok)">' + esc(c.d.label) + ' applied</small>' : '')) + '</div>' +
        '<div class="totals"><div><span>Subtotal</span><span>' + rm(c.sub) + '</span></div>' + (c.disc ? '<div><span>Discount</span><span>−' + rm(c.disc) + '</span></div>' : '') + (S.mode === 'delivery' ? '<div><span>Delivery</span><span>' + (c.z ? (c.fee ? rm(c.fee) : 'Free') : '—') + '</span></div>' : '') + '<div class="grand"><span>Total</span><span>' + rm(c.total) + '</span></div></div>' +
        '<p class="small muted" style="margin:10px 0 14px">' + (S.date && S.time ? (S.mode === 'pickup' ? 'Pick-up ' : 'Delivery ') + fmtDay(S.date) + ', ' + fmtTime(S.time) : 'Choose a time to continue.') + '</p>' +
        '<button class="btn btn--block ' + (S.pay === 'wa' ? 'btn--wa' : '') + '" type="button" data-place>' + (S.pay === 'wa' ? ICON.wa + 'Send order on WhatsApp' : 'Place order · ' + rm(c.total)) + '</button><p class="small muted center" style="margin-top:10px">Demo website: nothing is charged or sent.</p></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-mode]'))) { S.mode = t.getAttribute('data-mode'); keep(); paint(); return; }
      if ((t = e.target.closest('[data-day]'))) { S.date = t.getAttribute('data-day'); S.time = 0; keep(); paint(); return; }
      if ((t = e.target.closest('[data-time]'))) { S.time = +t.getAttribute('data-time'); keep(); paint(); return; }
      if ((t = e.target.closest('[data-apply]'))) { S.code = ($('#o-code').value || '').trim().toUpperCase(); keep(); paint(); return; }
      if ((t = e.target.closest('[data-lq]'))) {
        var pr = t.getAttribute('data-lq').split(':'), b = bag(), i = +pr[0];
        if (b[i]) { b[i].qty += +pr[1]; if (b[i].qty <= 0) b.splice(i, 1); setBag(b); paint(); }
        return;
      }
      if (e.target.closest('[data-place]')) place();
    });
    // re-draw only when it matters: a re-draw on "change" would swap the button the customer is about to tap
    root.addEventListener('change', function (e) {
      if (e.target.name === 'pay') { S.pay = e.target.value; keep(); paint(); return; }
      var k = e.target.getAttribute('data-k'); if (!k || k === 'code') return;
      var v = e.target.value.trim(), changed = S[k] !== v;
      S[k] = v; keep();
      if (k === 'pc' && changed) paint();
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'o-code') { e.preventDefault(); S.code = e.target.value.trim().toUpperCase(); keep(); paint(); } });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k && k !== 'pc' && k !== 'code') { S[k] = e.target.value; keep(); } if (k === 'pc' && e.target.value.length === 5) { S.pc = e.target.value; keep(); paint(); var el = $('#o-pc'); if (el) { el.focus(); el.setSelectionRange(5, 5); } } });
    function place() {
      var c = calc(), err = '';
      if (!S.time) err = 'Choose a time first.';
      else if (S.mode === 'delivery' && !c.z) err = 'Enter a postcode inside our delivery area, or choose pick-up.';
      else if (S.mode === 'delivery' && c.sub < DELIVERY_MIN) err = 'Delivery needs a minimum order of ' + rm(DELIVERY_MIN) + '.';
      else if (S.mode === 'delivery' && !S.addr) err = 'Add your delivery address.';
      else if (!S.name) err = 'Add your name, so we know whose order it is.';
      else if (!phoneOk(S.phone)) err = 'Add a mobile number we can reach you on.';
      if (err) { toast(err); return; }
      var o = { no: REF + '-' + seq(), mode: S.mode, date: S.date, time: S.time, items: bag(), sub: c.sub, disc: c.disc, fee: c.fee, total: c.total, name: S.name, phone: S.phone, addr: S.addr, pc: S.pc, notes: S.notes, pay: S.pay, st: 'New', at: Date.now() };
      var orders = load('orders', []); orders.unshift(o); save('orders', orders.slice(0, 30));
      if (c.d.voucher) save('vouchers', vouchers().map(function (v) { if (v.code === c.d.voucher) v.used = true; return v; }));
      save('bag', []); S.code = ''; S.notes = ''; keep(); updateBag();
      var text = orderText(o);
      root.innerHTML = '<div class="panel done" style="margin:30px 0 80px"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Order received (demo)</p><p class="ref">' + o.no + '</p>' +
        '<h2 style="margin-top:10px">' + (o.mode === 'pickup' ? 'Pick-up' : 'Delivery') + ' · ' + fmtDay(o.date) + ', ' + fmtTime(o.time) + '</h2>' +
        (o.pay === 'wa'
          ? '<p class="lead" style="margin:0 auto 14px">One more step: send it. This is the message that lands on the restaurant’s WhatsApp, already filled in:</p><div class="waprev" style="text-align:left;max-width:520px;margin:0 auto 16px">' + esc(text) + '</div><p><a class="btn btn--wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + ICON.wa + 'Open WhatsApp</a></p><p class="small muted">Demo: WhatsApp opens without a number, so you choose any chat. On a real website it opens the restaurant’s own number.</p>'
          : '<p class="lead" style="margin:0 auto 14px">Paid ' + rm(o.total) + ' (demo: no money was taken). We’ve sent a confirmation by SMS and email, and we’ll WhatsApp you when it’s ready.</p><p class="small muted">On a real website, payment goes through your own FPX / card / e-wallet gateway account, straight to your bank.</p>') +
        '<div class="btns" style="justify-content:center;margin-top:18px"><a class="btn btn--ghost" href="owner.html">See it in the owner view</a><a class="btn btn--ghost" href="menu.html">Back to the menu</a></div></div>';
      window.scrollTo(0, 0);
    }
    paint();
    document.addEventListener('click', onAdd);
  }

  // ------------------------------------------------------------------ book a table
  function ics(b) {
    function utc(d, m) { var x = new Date(Date.parse(d + 'T00:00:00Z') + (m - 480) * 60e3); return x.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sireh and Salt demo//EN', 'BEGIN:VEVENT', 'UID:' + b.ref + '@sireh-salt.demo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART:' + utc(b.date, b.time), 'DTEND:' + utc(b.date, b.time + 90), 'SUMMARY:Table for ' + b.pax + ' at ' + BRAND + ' (demo)', 'LOCATION:' + ADDRESS.replace(/,/g, '\\,'),
      'DESCRIPTION:Booking ' + b.ref + '. This is a demo booking on a concept website.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function pageBook() {
    var S = { date: '', time: 0, pax: 2, seat: 'Indoor', occ: '', name: '', phone: '', notes: '' };
    var root = $('[data-book]');
    function paint() {
      // offer a day only while it still has a time that is neither past nor full (at 19:55 the last table of the night can be taken)
      var days = openDays(15).filter(function (d) { var minT = d === today() ? nowMin() + 30 : 0; return HOURS[dowOf(d)].some(function (h) { for (var t = h[0]; t <= h[1] - 90; t += 30) if (t >= minT && tablesLeft(d, t) > 0) return true; return false; }); }).slice(0, 14);
      if (days.indexOf(S.date) < 0) S.date = days[0];
      var slots = [];
      HOURS[dowOf(S.date)].forEach(function (h) { for (var t = h[0]; t <= h[1] - 90; t += 30) slots.push(t); });
      var minT = S.date === today() ? nowMin() + 30 : 0;
      root.innerHTML = '<div class="co"><div>' +
        '<section class="panel"><h2>How many?</h2><div class="seg" role="group" aria-label="Party size">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (n) { return '<button type="button" data-pax="' + n + '" class="' + (n === S.pax ? 'is-on' : '') + '" aria-pressed="' + (n === S.pax) + '">' + n + '</button>'; }).join('') + '</div>' +
        '<p class="small muted" style="margin:12px 0 0">More than 12? <a href="catering.html#private">Book the private dining room</a>.' + (S.pax >= 8 ? ' Groups of 8 or more pay a RM50 deposit, taken off the bill.' : '') + '</p></section>' +
        '<section class="panel"><h2>Which day?</h2><div class="days">' + days.map(function (d, i) { return '<button type="button" class="day' + (d === S.date ? ' is-on' : '') + '" data-day="' + d + '"><small>' + (i === 0 && d === today() ? 'Today' : DAY[dowOf(d)]) + '</small><b>' + d.slice(8).replace(/^0/, '') + '</b><small>' + MON[+d.slice(5, 7) - 1] + '</small></button>'; }).join('') + '</div><p class="small muted" style="margin:10px 0 0">Closed on Mondays.</p></section>' +
        '<section class="panel"><h2>What time?</h2><div class="slots">' + slots.map(function (t) {
          var left = tablesLeft(S.date, t), past = t < minT, full = left === 0;
          return '<button type="button" class="slot' + (t === S.time ? ' is-on' : '') + '" data-time="' + t + '"' + (past || full ? ' disabled' : '') + '>' + fmtTime(t) + '<small>' + (past ? 'past' : full ? 'full' : left === 1 ? '1 table left' : left + ' tables') + '</small></button>';
        }).join('') + '</div></section>' +
        '<section class="panel"><h2>A few details</h2><div class="row2"><div class="field"><label for="b-seat">Seating</label><select class="input" id="b-seat" data-k="seat"><option' + (S.seat === 'Indoor' ? ' selected' : '') + '>Indoor</option><option' + (S.seat === 'Outdoor terrace' ? ' selected' : '') + '>Outdoor terrace</option><option' + (S.seat === 'No preference' ? ' selected' : '') + '>No preference</option></select></div>' +
        '<div class="field"><label for="b-occ">Occasion <small>(optional)</small></label><select class="input" id="b-occ" data-k="occ"><option value="">—</option><option>Birthday</option><option>Anniversary</option><option>Business</option><option>Family gathering</option></select></div></div>' +
        '<div class="row2"><div class="field"><label for="b-name">Name</label><input class="input" id="b-name" autocomplete="name" data-k="name" value="' + esc(S.name) + '"></div><div class="field"><label for="b-phone">Mobile number</label><input class="input" id="b-phone" type="tel" autocomplete="tel" placeholder="012-345 6789" data-k="phone" value="' + esc(S.phone) + '"></div></div>' +
        '<div class="field"><label for="b-notes">Anything we should know? <small>(optional)</small></label><input class="input" id="b-notes" maxlength="160" placeholder="High chair, allergies, a birthday cake…" data-k="notes" value="' + esc(S.notes) + '"></div></section></div>' +
        '<aside class="summary panel"><h2>Your table</h2><img src="img/interior.webp" alt="" style="border-radius:14px;aspect-ratio:4/3;object-fit:cover;width:100%;margin-bottom:14px">' +
        '<div class="totals"><div><span>Guests</span><b>' + S.pax + '</b></div><div><span>Day</span><b>' + fmtDay(S.date) + '</b></div><div><span>Time</span><b>' + (S.time ? fmtTime(S.time) : '—') + '</b></div><div><span>Seating</span><b>' + esc(S.seat) + '</b></div>' + (S.pax >= 8 ? '<div><span>Deposit</span><b>RM50.00</b></div>' : '') + '</div>' +
        '<button class="btn btn--block" type="button" data-confirm style="margin-top:16px">Confirm booking</button><p class="small muted center" style="margin-top:10px">Free cancellation up to 2 hours before. Demo: no table is held.</p></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-pax]'))) { S.pax = +t.getAttribute('data-pax'); paint(); return; }
      if ((t = e.target.closest('[data-day]'))) { S.date = t.getAttribute('data-day'); S.time = 0; paint(); return; }
      if ((t = e.target.closest('[data-time]'))) { S.time = +t.getAttribute('data-time'); paint(); return; }
      if (e.target.closest('[data-confirm]')) confirmBooking();
      if (e.target.closest('[data-ics]')) {
        var b = bookings()[0]; if (!b) return;
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics(b)], { type: 'text/calendar' })); a.download = 'sireh-salt-' + b.ref + '.ics'; document.body.appendChild(a); a.click(); a.remove();
      }
    });
    root.addEventListener('change', function (e) { var k = e.target.getAttribute('data-k'); if (k) { S[k] = e.target.value.trim(); if (k === 'seat') paint(); } });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k && k !== 'seat' && k !== 'occ') S[k] = e.target.value; });
    function confirmBooking() {
      var err = !S.time ? 'Choose a time first.' : !S.name.trim() ? 'Add your name.' : !phoneOk(S.phone) ? 'Add a mobile number, so we can confirm on WhatsApp.' : '';
      if (err) { toast(err); return; }
      var b = { ref: REF + '-B' + seq(), date: S.date, time: S.time, pax: S.pax, seat: S.seat, occ: S.occ, name: S.name.trim(), phone: S.phone.trim(), notes: S.notes, st: 'New', at: Date.now() };
      var all = bookings(); all.unshift(b); save('bookings', all.slice(0, 30));
      var text = 'Booking request (demo website): ' + BRAND + '\n' + b.ref + ' · Table for ' + b.pax + ' · ' + fmtDay(b.date) + ', ' + fmtTime(b.time) + '\nSeating: ' + b.seat + (b.occ ? '\nOccasion: ' + b.occ : '') + (b.notes ? '\nNotes: ' + b.notes : '') + '\nName: ' + b.name + ' · ' + b.phone;
      root.innerHTML = '<div class="panel done" style="margin:30px 0 80px"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Booking received (demo)</p><p class="ref">' + b.ref + '</p>' +
        '<h2 style="margin-top:10px">Table for ' + b.pax + ' · ' + fmtDay(b.date) + ', ' + fmtTime(b.time) + '</h2><p class="lead" style="margin:0 auto 16px">We’ll confirm on WhatsApp within 30 minutes during opening hours.' + (b.pax >= 8 ? ' A RM50 deposit link comes with the confirmation.' : '') + '</p>' +
        '<div class="btns" style="justify-content:center"><button class="btn" type="button" data-ics>Add to my calendar</button><a class="btn btn--ghost" href="owner.html">See it in the owner view</a></div>' +
        '<details style="max-width:520px;margin:22px auto 0;text-align:left"><summary class="linkbtn">What the restaurant receives</summary><div class="waprev" style="margin-top:10px">' + esc(text) + '</div></details></div>';
      window.scrollTo(0, 0);
    }
    paint();
  }

  // ------------------------------------------------------------------ festive pre-orders
  function pageFestive() {
    var t = today(), open = SEASONS.filter(function (s) { return s.cutoff >= t; }), S = { season: (open[0] || SEASONS[SEASONS.length - 1]).id, qty: {}, date: '', name: '', phone: '', pay: 'deposit' };
    var root = $('[data-festive]');
    function season() { return SEASONS.filter(function (s) { return s.id === S.season; })[0]; }
    function countdown(s) {
      var ms = Date.parse(s.cutoff + 'T23:59:00+08:00') - Date.now();
      if (ms <= 0) return '<p class="lead">Orders for ' + esc(s.name) + ' have closed.</p>';
      var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4);
      return '<div class="count" aria-label="Time left to order"><div><b>' + d + '</b><small>days</small></div><div><b>' + h + '</b><small>hours</small></div><div><b>' + m + '</b><small>min</small></div></div>';
    }
    function paint() {
      var s = season(), closed = s.cutoff < t;
      var dates = []; for (var d = s.from; d <= s.to; d = addDays(d, 1)) dates.push(d);
      if (dates.indexOf(S.date) < 0) S.date = dates[0];
      var lines = s.items.filter(function (x) { return S.qty[x.id]; }).map(function (x) { return { it: x, q: S.qty[x.id] }; });
      var ask = lines.some(function (l) { return fp(l.it) == null; });
      var total = lines.reduce(function (a, l) { return a + (fp(l.it) || 0) * l.q; }, 0), dep = lines.reduce(function (a, l) { return a + (fp(l.it) || 0) * l.q * l.it.dep; }, 0);
      $('[data-fhero]').innerHTML = '<img src="img/' + s.img + '.webp" alt=""><div class="wrap"><p class="kicker">Festive pre-orders</p><h1>' + esc(s.name) + '</h1><p class="lead">' + esc(s.blurb) + '</p><p class="lead" style="margin-top:-6px"><b>Order by ' + fmtDay(s.cutoff) + '</b> · pick up ' + fmtDay(s.from) + ' to ' + fmtDay(s.to) + '</p>' + countdown(s) + '</div>';
      root.innerHTML = '<div class="seg" role="tablist" aria-label="Festive season" style="margin-bottom:22px">' + SEASONS.map(function (x) { return '<button type="button" role="tab" data-season="' + x.id + '" class="' + (x.id === S.season ? 'is-on' : '') + '" aria-selected="' + (x.id === S.season) + '">' + esc(x.name) + (x.cutoff < t ? ' (closed)' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="co" style="padding-top:0"><div class="grid" style="gap:16px">' + s.items.map(function (x) {
          var left = leftOf(x), out = left <= 0 || closed, q = S.qty[x.id] || 0;
          return '<article class="fset' + (out ? ' is-out' : '') + '">' + (x.img === false ? NOPHOTO : '<img src="img/' + x.img + '.webp" alt="' + esc(x.n) + '' + PHOTO_NOTE + '" loading="lazy">') + '<div class="fset__body"><h3>' + esc(x.n) + '</h3><span class="price">' + rm(fp(x)) + '</span><ul>' + x.has.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
            '<div class="fset__left"><span>' + (left <= 0 ? 'Sold out' : 'Only ' + left + ' left') + '</span><span>' + (fp(x) == null ? 'Price on request' : x.dep < 1 ? '50% deposit' : 'Pay in full') + '</span></div><div class="bar bar--dark"><i style="width:' + Math.round(100 * Math.max(0, left) / x.total) + '%"></i></div>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:8px">' + (out ? '<span class="tag tag--out">' + (closed ? 'Orders closed' : 'Sold out') + '</span>' : '<div class="qty"><button type="button" data-fq="' + x.id + ':-1" aria-label="One less">−</button><output>' + q + '</output><button type="button" data-fq="' + x.id + ':1" aria-label="One more">+</button></div>') + '</div></div></article>';
        }).join('') + '</div>' +
        '<aside class="summary panel"><h2>Your pre-order</h2>' + (lines.length ? lines.map(function (l) { return '<div class="line"><div><h4>' + l.q + ' × ' + esc(l.it.n) + '</h4></div><b>' + (fp(l.it) == null ? 'Ask for price' : rm(fp(l.it) * l.q)) + '</b></div>'; }).join('') : '<p class="muted">Choose a set on the left.</p>') +
        '<div class="field" style="margin-top:14px"><span>Pick-up day</span><div class="days">' + dates.map(function (d) { return '<button type="button" class="day' + (d === S.date ? ' is-on' : '') + '" data-fday="' + d + '"><small>' + DAY[dowOf(d)] + '</small><b>' + d.slice(8).replace(/^0/, '') + '</b><small>' + MON[+d.slice(5, 7) - 1] + '</small></button>'; }).join('') + '</div></div>' +
        '<div class="field"><label for="f-name">Name</label><input class="input" id="f-name" data-k="name" value="' + esc(S.name) + '"></div><div class="field"><label for="f-phone">Mobile number</label><input class="input" id="f-phone" type="tel" data-k="phone" placeholder="012-345 6789" value="' + esc(S.phone) + '"></div>' +
        (ask ? '<p class="small" style="margin:12px 0 0">We’ll WhatsApp you the price to confirm before you pay anything.</p>' : '<div class="pay"><label class="payopt"><input type="radio" name="fpay" value="deposit"' + (S.pay === 'deposit' ? ' checked' : '') + '><span><b>Pay the deposit now: ' + rm(dep) + '</b><small>Balance ' + rm(total - dep) + ' at pick-up.</small></span></label><label class="payopt"><input type="radio" name="fpay" value="full"' + (S.pay === 'full' ? ' checked' : '') + '><span><b>Pay in full: ' + rm(total) + '</b><small>Just collect on the day.</small></span></label></div>') +
        (ask ? '' : '<div class="totals"><div class="grand"><span>Total</span><span>' + rm(total) + '</span></div></div>') + '<button class="btn btn--chili btn--block" type="button" data-forder style="margin-top:14px"' + (closed ? ' disabled' : '') + '>' + (ask ? 'Send my pre-order request' : 'Reserve my sets') + '</button><p class="small muted center" style="margin-top:10px">Demo: nothing is charged; the “left” counts are examples the owner can change.</p></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-season]'))) { S.season = x.getAttribute('data-season'); S.qty = {}; S.date = ''; paint(); return; }
      if ((x = e.target.closest('[data-fday]'))) { S.date = x.getAttribute('data-fday'); paint(); return; }
      if ((x = e.target.closest('[data-fq]'))) {
        var pr = x.getAttribute('data-fq').split(':'), f = fitem(pr[0]);
        var q = Math.max(0, Math.min(leftOf(f.it), (S.qty[pr[0]] || 0) + +pr[1]));
        if (q) S.qty[pr[0]] = q; else delete S.qty[pr[0]];
        if (+pr[1] > 0 && q === (S.qty[pr[0]] || 0) && q === leftOf(f.it)) toast('That’s all we have left of this one.');
        paint(); return;
      }
      if (e.target.closest('[data-forder]')) {
        var s = season(), ids = Object.keys(S.qty);
        var err = !ids.length ? 'Choose at least one set.' : !S.name.trim() ? 'Add your name.' : !phoneOk(S.phone) ? 'Add a mobile number.' : '';
        if (err) { toast(err); return; }
        var o = owner(), lines = ids.map(function (id) { var f = fitem(id); o.left[id] = leftOf(f.it) - S.qty[id]; return S.qty[id] + ' × ' + f.it.n; });
        setOwner(o);
        var total = ids.reduce(function (a, id) { return a + (fp(fitem(id).it) || 0) * S.qty[id]; }, 0);
        var ord = { no: REF + '-F' + seq(), mode: 'festive', date: S.date, time: 660, items: ids.map(function (id) { var f = fitem(id).it; return { n: f.n, qty: S.qty[id], unit: fp(f), opts: '' }; }), total: total, name: S.name.trim(), phone: S.phone.trim(), pay: S.pay, st: 'New', at: Date.now(), season: s.name };
        var orders = load('orders', []); orders.unshift(ord); save('orders', orders.slice(0, 30));
        root.innerHTML = '<div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Pre-order reserved (demo)</p><p class="ref">' + ord.no + '</p><h2 style="margin-top:10px">' + esc(s.name) + ' · pick up ' + fmtDay(S.date) + '</h2><p class="lead" style="margin:0 auto 10px">' + esc(lines.join(', ')) + '</p><p class="muted">We’ll send a reminder on WhatsApp the day before. Demo: nothing was charged.</p><div class="btns" style="justify-content:center;margin-top:16px"><a class="btn btn--ghost" href="owner.html">See it in the owner view</a><a class="btn btn--ghost" href="festive.html">Back to festive sets</a></div></div>';
        S.qty = {};
        window.scrollTo(0, 0);
      }
    });
    root.addEventListener('change', function (e) { if (e.target.name === 'fpay') { S.pay = e.target.value; paint(); } });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k) S[k] = e.target.value; });
    paint();
    setInterval(function () { var s = season(), el = $('[data-fhero] .count'); if (el) el.outerHTML = countdown(s); }, 30000);
  }

  // ------------------------------------------------------------------ catering & events
  function pageCatering() {
    var form = $('[data-catering]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = {}; new FormData(form).forEach(function (v, k) { f[k] = String(v).trim(); });
      if (!phoneOk(f.phone)) { toast('Add a mobile number we can reach you on.'); return; }
      var ref = REF + '-E' + seq();
      var text = 'Catering enquiry (demo website): ' + BRAND + '\n' + ref + '\n' + f.type + ' · ' + f.pax + ' guests · ' + (f.date ? fmtDay(f.date) : 'date to confirm') + (f.time ? ', ' + f.time : '') + '\nWhere: ' + (f.where || '-') + '\nBudget: ' + (f.budget || '-') + '\nDiet: ' + (f.diet || '-') + (f.notes ? '\nNotes: ' + f.notes : '') + '\nName: ' + f.name + ' · ' + f.phone + (f.email ? ' · ' + f.email : '');
      var all = load('enquiries', []); all.unshift({ ref: ref, type: f.type, pax: f.pax, date: f.date, name: f.name, at: Date.now() }); save('enquiries', all.slice(0, 20));
      form.outerHTML = '<div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Enquiry sent (demo)</p><p class="ref">' + ref + '</p><h2 style="margin-top:10px">Thank you, ' + esc(f.name) + '</h2><p class="lead" style="margin:0 auto 14px">You’ll get a written quote within one working day, with the menu, the price per head and what’s included.</p>' +
        '<details style="max-width:520px;margin:0 auto;text-align:left"><summary class="linkbtn">What the restaurant receives</summary><div class="waprev" style="margin-top:10px">' + esc(text) + '</div></details></div>';
    });
    $$('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { var s = $('select[name=type]', form); s.value = b.getAttribute('data-pick'); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
  }

  // ------------------------------------------------------------------ gift vouchers
  function pageVouchers() {
    var S = { amt: 100, to: '', from: '', msg: '', via: 'WhatsApp' };
    var root = $('[data-vouchers]');
    function card(c) {
      return '<div class="vcard" aria-label="Gift voucher preview"><div class="vcard__top"><span class="logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32C8 17 18 8 34 6c-2 16-11 26-26 26z" fill="currentColor"/></svg><span>Sireh <i>&amp;</i> Salt</span></span><span class="vcard__code">' + (c || 'GIFT-····') + '</span></div>' +
        '<div><div class="vcard__amt">' + rm(S.amt).replace('.00', '') + '</div><div class="vcard__msg">' + (S.to ? 'For ' + esc(S.to) + (S.msg ? ': “' + esc(S.msg) + '”' : '') : 'Your message appears here.') + (S.from ? ' — ' + esc(S.from) : '') + '</div></div></div>';
    }
    function paint() {
      root.innerHTML = '<div class="co" style="padding-top:0"><div><section class="panel"><h2>Choose an amount</h2><div class="amounts">' + [50, 100, 150, 200].map(function (a) { return '<button type="button" class="slot' + (a === S.amt ? ' is-on' : '') + '" data-amt="' + a + '">RM' + a + '</button>'; }).join('') + '</div>' +
        '<div class="field" style="margin-top:14px"><label for="v-custom">Or another amount (RM30 to RM1,000)</label><input class="input" id="v-custom" type="number" min="30" max="1000" step="10" placeholder="e.g. 250" data-custom></div></section>' +
        '<section class="panel"><h2>Who is it for?</h2><div class="row2"><div class="field"><label for="v-to">To</label><input class="input" id="v-to" maxlength="40" data-k="to" value="' + esc(S.to) + '"></div><div class="field"><label for="v-from">From</label><input class="input" id="v-from" maxlength="40" data-k="from" value="' + esc(S.from) + '"></div></div>' +
        '<div class="field"><label for="v-msg">Message <small>(optional)</small></label><input class="input" id="v-msg" maxlength="90" data-k="msg" placeholder="Happy birthday, dinner is on me" value="' + esc(S.msg) + '"></div>' +
        '<div class="field"><span>Send it by</span><div class="seg">' + ['WhatsApp', 'Email', 'Print at home'].map(function (v) { return '<button type="button" data-via="' + v + '" class="' + (v === S.via ? 'is-on' : '') + '">' + v + '</button>'; }).join('') + '</div></div></section></div>' +
        '<aside class="summary"><div data-vprev>' + card() + '</div><div class="panel" style="margin-top:16px"><div class="totals"><div class="grand"><span>Total</span><span data-vtotal>' + rm(S.amt) + '</span></div></div><button class="btn btn--block" type="button" data-vbuy style="margin-top:14px">Buy voucher</button><p class="small muted" style="margin-top:10px">Valid 12 months, for dine-in, pick-up and delivery. Demo: nothing is charged, and the code works at this demo’s checkout.</p></div></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-amt]'))) { S.amt = +x.getAttribute('data-amt'); paint(); return; }
      if ((x = e.target.closest('[data-via]'))) { S.via = x.getAttribute('data-via'); paint(); return; }
      if (e.target.closest('[data-vbuy]')) {
        if (!S.to.trim()) { toast('Add who the voucher is for.'); $('#v-to').focus(); return; }
        var c = code('GIFT-', 4), all = load('vouchers', []);
        all.unshift({ code: c, amt: S.amt, to: S.to.trim(), from: S.from.trim(), used: false, at: Date.now() }); save('vouchers', all.slice(0, 20));
        var text = 'A gift for you from ' + (S.from || 'a friend') + ': ' + rm(S.amt) + ' at Sireh & Salt (demo website).\nCode: ' + c + (S.msg ? '\n“' + S.msg + '”' : '') + '\nUse it for dine-in, pick-up or delivery within 12 months.';
        root.innerHTML = '<div class="co" style="padding-top:0"><div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Voucher ready (demo)</p><p class="ref">' + c + '</p><p class="lead" style="margin:6px auto 16px">Try it: add something to your order and type the code at checkout.</p><div class="btns" style="justify-content:center"><a class="btn btn--wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + ICON.wa + 'Send on WhatsApp</a><a class="btn btn--ghost" href="menu.html">Use it now</a></div></div><aside>' + card(c) + '</aside></div>';
      }
    });
    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k');
      if (k) S[k] = e.target.value;
      if (e.target.hasAttribute('data-custom')) { var v = +e.target.value; if (v >= 30 && v <= 1000) { S.amt = Math.round(v); $$('[data-amt]').forEach(function (b) { b.classList.remove('is-on'); }); } }
      var pv = $('[data-vprev]'); if (pv) pv.innerHTML = card();
      var tt = $('[data-vtotal]'); if (tt) tt.textContent = rm(S.amt);
    });
    paint();
  }

  // ------------------------------------------------------------------ owner view (what the restaurant sees on its phone)
  var SEED_ORDERS = [];
  var SEED_BOOK = [];
  var OST = ['New', 'Preparing', 'Ready', 'Collected'], BST = ['New', 'Confirmed', 'Seated'];
  function pageOwner() {
    var tab = 'orders', root = $('[data-owner]');
    function stMap() { return load('ost', {}); }
    function paint() {
      var o = owner(), sm = stMap(), mine = load('orders', []), myb = bookings();
      var orders = mine.map(function (x) { return { no: x.no, mode: x.mode, time: x.time, date: x.date, name: x.name, total: x.total, txt: x.items.map(function (l) { return l.qty + ' × ' + l.n; }).join(', ') + (x.mode === 'delivery' ? ' · ' + x.pc : ''), st: sm[x.no] || x.st, mine: true, pay: x.pay }; }).concat(SEED_ORDERS.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; y.st = sm[x.no] || x.st; y.date = today(); return y; }));
      var books = myb.map(function (x) { return { ref: x.ref, time: x.time, date: x.date, pax: x.pax, name: x.name, notes: [x.seat, x.occ, x.notes].filter(Boolean).join(' · '), st: sm[x.ref] || x.st, mine: true }; }).concat(SEED_BOOK.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; y.st = sm[x.ref] || x.st; y.date = today(); return y; }));
      var newCount = orders.filter(function (x) { return x.st === 'New'; }).length;
      var panes = {
        orders: orders.map(function (x) {
          return '<div class="ocard"><div class="ocard__top"><b>' + esc(x.no) + ' · ' + esc(x.name) + '</b><button type="button" class="ost ost--' + x.st + '" data-ost="' + esc(x.no) + '" data-kind="o" title="Tap to move to the next step">' + x.st + '</button></div><span>' + (x.mode === 'festive' ? 'Festive pre-order' : x.mode === 'pickup' ? 'Pick-up' : 'Delivery') + ' · ' + (x.date && x.date !== today() ? fmtDay(x.date) + ', ' : '') + fmtTime(x.time) + ' · ' + rm(x.total) + (x.pay === 'wa' ? ' · via WhatsApp' : '') + '</span><span class="muted">' + esc(x.txt) + '</span>' + (x.mine ? '<span class="tag tag--new" style="justify-self:start">You placed this one</span>' : '') + '</div>';
        }).join(''),
        bookings: books.map(function (x) {
          return '<div class="ocard"><div class="ocard__top"><b>' + fmtTime(x.time) + ' · ' + x.pax + ' pax · ' + esc(x.name) + '</b><button type="button" class="ost ost--' + x.st + '" data-ost="' + esc(x.ref) + '" data-kind="b">' + x.st + '</button></div><span class="muted">' + (x.date && x.date !== today() ? fmtDay(x.date) + ' · ' : 'Tonight · ') + esc(x.notes || '') + '</span>' + (x.mine ? '<span class="tag tag--new" style="justify-self:start">You booked this one</span>' : '') + '</div>';
        }).join(''),
        menu: '<p class="small muted" style="margin:0">Change a price or switch a dish to sold out. The website changes at once.</p>' + MENU.map(function (it) {
          return '<div class="orow"><span><b>' + esc(it.n) + '</b></span><input type="number" min="1" step="0.1" value="' + (hasPrice(it) ? priceOf(it).toFixed(2) : '') + '" placeholder="Set price" data-price="' + it.id + '" aria-label="Price of ' + esc(it.n) + '"><label class="switch" title="Sold out"><input type="checkbox" data-sold="' + it.id + '"' + (o.sold[it.id] ? ' checked' : '') + ' aria-label="' + esc(it.n) + ' sold out"><span></span></label></div>';
        }).join('') + '<p class="small muted">Red switch = sold out today.</p>',
        festive: SEASONS.map(function (s) {
          return '<p style="margin:6px 0 0;font-weight:800">' + esc(s.name) + '</p>' + s.items.map(function (x) {
            return '<div class="orow" style="grid-template-columns:1fr auto"><span><b>' + esc(x.n) + '</b><br><small class="muted">' + leftOf(x) + ' of ' + x.total + ' left</small></span><div class="qty"><button type="button" data-left="' + x.id + ':-1" aria-label="One fewer left">−</button><output>' + leftOf(x) + '</output><button type="button" data-left="' + x.id + ':1" aria-label="One more left">+</button></div></div>';
          }).join('');
        }).join(''),
        status: '<div class="ostatus">' + [['auto', 'Normal', 'Open and closed by your opening hours'], ['busy', 'Busy', 'Customers see “busy”; pick-up times start 20 minutes later'], ['closed', 'Closed today', 'Holiday or full house: today’s ordering and booking switch off']].map(function (s) {
          return '<button type="button" data-status-set="' + s[0] + '" class="' + (o.status === s[0] ? 'is-on' : '') + '">' + s[1] + '<small>' + s[2] + '</small></button>';
        }).join('') + '</div><p class="small muted">Right now the website says: <b>' + esc(status().text) + '</b></p>'
      };
      root.innerHTML = '<div class="phone"><div class="phone__screen"><div class="phone__top"><small>' + esc(BRAND) + ' · ' + fmtDay(today()) + '</small><h3>' + (newCount ? newCount + ' new order' + (newCount === 1 ? '' : 's') : 'All caught up') + '</h3><div class="otabs" role="tablist">' + [['orders', 'Orders'], ['bookings', 'Bookings'], ['menu', 'Menu'], ['festive', 'Festive'], ['status', 'Status']].map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'is-on' : '') + '" aria-selected="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="opane">' + panes[tab] + '</div></div></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-tab]'))) { tab = x.getAttribute('data-tab'); paint(); return; }
      if ((x = e.target.closest('[data-ost]'))) {
        var id = x.getAttribute('data-ost'), list = x.getAttribute('data-kind') === 'b' ? BST : OST, sm = stMap();
        var cur = list.indexOf(x.textContent); sm[id] = list[(cur + 1) % list.length]; save('ost', sm); paint(); return;
      }
      if ((x = e.target.closest('[data-left]'))) {
        var pr = x.getAttribute('data-left').split(':'), f = fitem(pr[0]), o = owner();
        o.left[pr[0]] = Math.max(0, Math.min(f.it.total, leftOf(f.it) + +pr[1])); setOwner(o); paint(); return;
      }
      if ((x = e.target.closest('[data-status-set]'))) { var ow = owner(); ow.status = x.getAttribute('data-status-set'); setOwner(ow); paint(); shared.refresh(); toast('The website now says: ' + status().text); return; }
    });
    root.addEventListener('change', function (e) {
      var o = owner(), x = e.target;
      if (x.hasAttribute('data-sold')) { var id = x.getAttribute('data-sold'); if (x.checked) o.sold[id] = 1; else delete o.sold[id]; setOwner(o); toast(item(id).n + (x.checked ? ' is now sold out on the menu.' : ' is back on the menu.')); return; }
      if (x.hasAttribute('data-price')) { var pid = x.getAttribute('data-price'), v = Math.round(parseFloat(x.value) * 100) / 100; if (v > 0 && v < 1000) { o.price[pid] = v; setOwner(o); toast((item(pid) || (fitem(pid) || {}).it || { n: 'This item' }).n + ' now costs ' + rm(v) + ' on the website.'); } else paint(); }
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      if (!confirm('Reset the demo? This clears the orders, bookings, vouchers and owner changes made in this browser.')) return;
      ['owner', 'orders', 'bookings', 'vouchers', 'ost', 'bag', 'checkout', 'enquiries', 'seq'].forEach(function (k) { try { localStorage.removeItem(KEY + k); } catch (err) { /* ignore */ } });
      tab = 'orders'; paint(); shared.refresh(); toast('Demo reset.');
    });
    paint();
  }

  // ------------------------------------------------------------------ start
  shared.refresh = function () { var st = status(); $$('[data-status]').forEach(function (el) { el.textContent = st.text; el.className = 'status status--' + st.cls; }); $$('[data-status-long]').forEach(function (el) { el.textContent = st.long; }); updateBag(); };
  var PAGES = { home: pageHome, menu: pageMenu, order: pageOrder, book: pageBook, festive: pageFestive, catering: pageCatering, vouchers: pageVouchers, owner: pageOwner };
  document.addEventListener('DOMContentLoaded', function () {
    shared();
    var fn = PAGES[document.body.getAttribute('data-page')];
    if (fn) fn();
    window.addEventListener('storage', function (e) { if (e.key === KEY + 'owner') location.reload(); }); // the owner view changed something in another tab
  });
})();
