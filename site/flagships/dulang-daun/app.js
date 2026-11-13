/* Dulang & Daun — demo online shop for a local food gift brand, by Cartsmith Studio (2026-11-12).
   A fictional brand. Everything runs in this browser: no real orders or payments, nothing is sent anywhere.
   Cart, orders, waitlist and the owner's changes are kept in this browser only (localStorage, keys dd_*). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ data (demo)
  var CATS = [['sambal', 'Sambal & spreads'], ['cookies', 'Cookies & kuih'], ['snacks', 'Snacks'], ['drinks', 'Kopi & teh'], ['hampers', 'Hampers & gift boxes']];
  var P = [
    { id: 'sambal-bilis', cat: 'sambal', n: 'Sambal Ikan Bilis', p: 16, short: 'Our bestseller: slow-fried chilli with crispy anchovies.', badge: 'Bestseller', img: ['sambal-bilis', 'sambal-udang'],
      v: [{ n: 'Size', o: [['200 g', 0], ['380 g', 12]] }, { n: 'Heat', o: [['Original', 0], ['Extra pedas', 0]] }],
      d: 'Fried for three hours in small batches until the oil turns deep red. The ikan bilis go in at the end, so they stay crunchy. Great with rice, eggs and bread.',
      keep: 'Keeps 3 months unopened. Refrigerate after opening and finish within 4 weeks.', ing: 'Chilli, shallots, garlic, anchovies, palm oil, gula melaka, tamarind, salt.', ship: 'all', hamper: true, pair: 'kerepek' },
    { id: 'sambal-udang', cat: 'sambal', n: 'Sambal Udang Kering', p: 19, short: 'Dried shrimp sambal: sweet, savoury and smoky.', img: ['sambal-udang', 'sambal-bilis'],
      v: [{ n: 'Size', o: [['200 g', 0], ['380 g', 15]] }], d: 'Pounded dried shrimp fried slowly with chilli and lemongrass. One spoon turns plain rice or a bowl of noodles into a meal.',
      keep: 'Keeps 3 months unopened; refrigerate after opening.', ing: 'Dried shrimp, chilli, shallots, lemongrass, palm oil, sugar, salt.', ship: 'all', hamper: true, pair: 'kaya' },
    { id: 'kaya', cat: 'sambal', n: 'Pandan Kaya', p: 14, short: 'Silky coconut jam with fresh pandan. West Malaysia only.', badge: 'Fresh', img: ['kaya'],
      v: [{ n: 'Pack', o: [['1 jar (250 g)', 0], ['2 jars', 12]] }], d: 'Cooked slowly over a double boiler with eggs, coconut milk and pandan juice. No preservatives, so it ships to West Malaysia only.',
      keep: 'Keeps 3 days without a fridge, 3 weeks in the fridge.', ing: 'Coconut milk, eggs, sugar, pandan leaves.', ship: 'west', hamper: false, pair: 'kopi' },
    { id: 'kuih-bangkit', cat: 'cookies', n: 'Kuih Bangkit', p: 32, short: 'Melt-in-the-mouth coconut cookies, 300 g jar.', badge: 'CNY', img: ['kuih-bangkit', 'cookie-jars'], v: [],
      d: 'Tapioca and coconut cookies that melt the moment they touch your tongue, pressed by hand in a wooden mould.', keep: 'Keeps 6 weeks in the airtight jar.', ing: 'Tapioca flour, coconut milk, sugar, egg yolk, pandan.', ship: 'all', hamper: true, pair: 'pineapple-tarts' },
    { id: 'pineapple-tarts', cat: 'cookies', n: 'Pineapple Tarts', p: 36, short: 'Buttery pastry, slow-cooked pineapple jam.', badge: 'CNY', img: ['pineapple-tarts', 'cookie-jars'],
      v: [{ n: 'Box', o: [['20 pcs', 0], ['40 pcs', 32]], out: ['40 pcs'] }], d: 'Pineapple jam cooked down for five hours and wrapped in a short butter pastry. Baked fresh every week until Chinese New Year.',
      keep: 'Keeps 3 weeks in the box.', ing: 'Butter, flour, pineapple, sugar, egg, salt.', ship: 'all', hamper: true, pair: 'kuih-bangkit' },
    { id: 'butter-cookies', cat: 'cookies', n: 'Butter Cookies', p: 28, short: 'Classic piped butter cookies, 350 g jar.', img: ['butter-cookies'], v: [],
      d: 'Piped by hand and baked until just golden at the edges.', keep: 'Keeps 6 weeks in the jar.', ing: 'Butter, flour, sugar, egg, vanilla.', ship: 'all', hamper: true, pair: 'kopi' },
    { id: 'pandan-cookies', cat: 'cookies', n: 'Pandan Star Cookies', p: 26, short: 'Shortbread with fresh pandan, 300 g jar.', badge: 'New', img: ['pandan-cookies'], v: [],
      d: 'Crisp shortbread flavoured with fresh pandan juice, never essence.', keep: 'Keeps 6 weeks in the jar.', ing: 'Butter, flour, sugar, pandan.', ship: 'all', hamper: true, pair: 'teh' },
    { id: 'kerepek', cat: 'snacks', n: 'Kerepek Pisang', p: 9.9, short: 'Banana chips, sliced thin and fried fresh. Any 3 for RM27.', img: ['kerepek', 'kerepek-2'],
      v: [{ n: 'Flavour', o: [['Sweet', 0], ['Spicy', 0], ['Salted', 0]] }], d: 'Thin-sliced green bananas, fried in small batches and tossed while hot. Mix the flavours: any 3 bags for RM27.',
      keep: 'Best within 6 weeks; reseal the bag.', ing: 'Banana, palm oil, and sugar, chilli or salt.', ship: 'all', hamper: true, multi: { n: 3, price: 27 }, pair: 'sambal-bilis' },
    { id: 'kopi', cat: 'drinks', n: 'Kopi Pantai Timur', p: 22, short: 'Local roast with butter and sugar, 250 g.', img: ['kopi'],
      v: [{ n: 'Grind', o: [['Beans', 0], ['Medium (filter)', 0], ['Fine (sock / kopitiam)', 0]] }], d: 'A traditional local roast with a dark, caramel finish. Brew it strong in a cloth sock and add condensed milk.',
      keep: 'Best within 8 weeks of roasting.', ing: 'Coffee beans roasted with butter, sugar and a pinch of salt.', ship: 'all', hamper: true, pair: 'butter-cookies' },
    { id: 'teh', cat: 'drinks', n: 'Teh Tarik Premix', p: 18, short: '15 sachets of strong pulled milk tea.', img: ['teh'], v: [], out: true,
      d: 'Strong black tea with milk and just enough sugar. Pour, stir, and pull it between two cups for the foam.', keep: 'Keeps 12 months.', ing: 'Black tea, milk powder, sugar.', ship: 'all', hamper: true, pair: 'pandan-cookies' },
    { id: 'hamper-ong', cat: 'hampers', n: 'Ong Ong CNY Hamper', p: 168, short: 'Pineapple tarts, kuih bangkit, sambal and kopi in a red gift box.', badge: 'CNY', img: ['hamper-ong', 'cookie-jars'], v: [],
      has: ['Pineapple Tarts (20 pcs)', 'Kuih Bangkit (300 g)', 'Sambal Ikan Bilis (200 g)', 'Kopi Pantai Timur (250 g)', 'Gift card with your message'],
      d: 'Our Chinese New Year bestseller, packed in a red box with a gold ribbon.', keep: 'Everything keeps at least 3 weeks.', ship: 'all' },
    { id: 'hamper-thanks', cat: 'hampers', n: 'Terima Kasih Box', p: 78, short: 'A thank-you box for any time of the year.', img: ['hamper-thanks', 'kerepek'], v: [],
      has: ['Sambal Ikan Bilis (200 g)', 'Butter Cookies (350 g)', 'Kerepek Pisang ×2', 'Gift card with your message'],
      d: 'For clients, teachers, neighbours and the friend who drove you to the airport.', keep: 'Everything keeps at least 4 weeks.', ship: 'all' },
    { id: 'hamper-raya', cat: 'hampers', n: 'Raya Open House Box', p: 148, short: 'Kuih raya, sambal and kerepek for the open house.', badge: 'Raya', img: ['hamper-raya', 'kuih-box'], v: [],
      has: ['Pandan Star Cookies (300 g)', 'Butter Cookies (350 g)', 'Sambal Udang Kering (200 g)', 'Kerepek Pisang ×2', 'Gift card with your message'],
      d: 'Packed in a green and gold box, ready to bring or to send.', keep: 'Everything keeps at least 4 weeks.', ship: 'all' },
    { id: 'hamper-basket', cat: 'hampers', n: 'Family Basket', p: 238, short: 'A rattan basket with a bit of everything.', img: ['hamper-basket', 'hamper-ong'], v: [],
      has: ['Sambal Ikan Bilis (380 g)', 'Sambal Udang Kering (200 g)', 'Pineapple Tarts (20 pcs)', 'Butter Cookies (350 g)', 'Kopi Pantai Timur (250 g)', 'Kerepek Pisang ×3', 'Reusable rattan basket'],
      d: 'The big one, for families and office pantries.', keep: 'Everything keeps at least 3 weeks.', ship: 'all' }
  ];
  var BOXES = [{ id: 'S', n: 'Small', slots: 4, p: 18 }, { id: 'M', n: 'Medium', slots: 6, p: 25 }, { id: 'L', n: 'Large', slots: 9, p: 35 }];
  var RIBBONS = [['Red', '#b3261e'], ['Gold', '#c9a24a'], ['Green', '#1c5653'], ['Cream', '#efe4cf']];
  var STATES = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Selangor', 'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Putrajaya', 'Sabah', 'Sarawak', 'W.P. Labuan'];
  var EAST = ['Sabah', 'Sarawak', 'W.P. Labuan'];
  var SHIP = { west: { std: 8, express: 18, free: 150, days: '2–3 working days' }, east: { std: 15, free: 250, days: '4–6 working days' } };
  // last day to order for delivery before the festival (Malaysia dates). CNY 2027 = 6 Feb; Hari Raya 2027 expected 10 Mar.
  var CUTOFF = [{ n: 'Christmas', west: '2026-12-18', east: '2026-12-14' }, { n: 'Chinese New Year', west: '2027-01-28', east: '2027-01-22' }, { n: 'Hari Raya', west: '2027-03-03', east: '2027-02-27' }];
  var VOUCHER = { code: 'WELCOME10', pct: 10, min: 60 };
  var TIERS = [[20, 5], [50, 10], [100, 15]];
  var WA = 'https://wa.me/?text=';
  var SEED_ORDER = { no: 'DD-2041', phone: '0123456789', name: 'Demo customer', date: '', st: 'Shipped', trk: 'DEMO-TRK-77314', region: 'west', state: 'Selangor', items: [{ n: 'Terima Kasih Box', qty: 2, unit: 78, opts: '' }], total: 156 };

  // ------------------------------------------------------------------ helpers
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rm(n) { return 'RM' + (Math.round(n * 100) / 100).toFixed(2); }
  function load(k, d) { try { var v = localStorage.getItem('dd_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('dd_' + k, JSON.stringify(v)); } catch (e) { /* private mode: the page still works */ } }
  function today() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtDay(s) { var d = new Date(s + 'T00:00:00Z'); return DAY[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function daysUntil(s) { return Math.round((Date.parse(s + 'T00:00:00Z') - Date.parse(today() + 'T00:00:00Z')) / 864e5); }
  function seq() { var n = load('seq', 2041) + 1; save('seq', n); return n; }
  function phoneOk(v) { return /^\+?\d[\d\s-]{8,14}$/.test(String(v || '').trim()); }
  function digits(v) { return String(v || '').replace(/\D/g, '').replace(/^60/, '0'); }
  function prod(id) { for (var i = 0; i < P.length; i++) if (P[i].id === id) return P[i]; return null; }
  function toast(t) { var el = $('[data-toast]'); if (!el) return; el.textContent = t; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('is-on'); }, 2600); }
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" fill="currentColor"/><circle cx="17" cy="17.5" r="1.8" fill="currentColor"/></svg>',
    gift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C9 7 7 3 9.5 3S12 7 12 7zm0 0c3 0 5-4 2.5-4S12 7 12 7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M5 19 14 10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.8 8.6c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.3.5.8 1.1 1.3 1.6.6.5 1.2.9 1.8 1.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.4 0 .3-.1 1-.6 1.4-.4.4-1.2.8-2 .7-.8-.1-2-.5-3.4-1.6-1.6-1.3-2.5-2.9-2.8-3.5-.3-.7-.4-1.6 0-2.4z" fill="currentColor"/></svg>'
  };

  // ------------------------------------------------------------------ stock (the owner can change it) and cart
  function owner() { var o = load('owner', {}); o.out = o.out || {}; o.back = o.back || {}; return o; }
  function setOwner(o) { save('owner', o); }
  function isOut(p) { var o = owner(); return o.back[p.id] ? false : !!(o.out[p.id] || p.out); }
  function variantOut(p, label) { var o = owner(); if (o.back[p.id]) return false; return p.v.some(function (g) { return (g.out || []).indexOf(label) >= 0; }); }
  function fromPrice(p) { return p.p; }
  function unitOf(p, sel) { var u = p.p; p.v.forEach(function (g, gi) { var i = sel[gi] || 0; u += g.o[i][1]; }); return Math.round(u * 100) / 100; }
  function cart() { return load('cart', []); }
  function setCart(c) { save('cart', c); updateCount(); }
  function count() { return cart().reduce(function (a, l) { return a + l.qty; }, 0); }
  function subtotal() { return cart().reduce(function (a, l) { return a + l.unit * l.qty; }, 0); }
  function multiDeal() { // kerepek: any 3 for RM27
    var n = cart().filter(function (l) { return l.id === 'kerepek'; }).reduce(function (a, l) { return a + l.qty; }, 0), k = prod('kerepek');
    var groups = Math.floor(n / k.multi.n); return { n: n, off: Math.round(groups * (k.multi.n * k.p - k.multi.price) * 100) / 100 };
  }
  function region() { return load('region', 'west'); }
  function addLine(line) {
    var c = cart(), found = null;
    c.forEach(function (l) { if (l.key === line.key) found = l; });
    if (found) found.qty += line.qty; else c.push(line);
    setCart(c);
    openCart(line.id);
  }
  function addProduct(p, sel, qty) {
    var opts = p.v.map(function (g, gi) { return g.o[sel[gi] || 0][0]; });
    addLine({ key: p.id + '|' + opts.join('|'), id: p.id, n: p.n, img: p.img[0], qty: qty || 1, unit: unitOf(p, sel), opts: opts.join(' · '), ship: p.ship });
  }

  // ------------------------------------------------------------------ shared UI
  function updateCount() { var n = count(); $$('[data-bag-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; }); }
  function shipNote(sub) {
    var r = region(), s = SHIP[r], left = s.free - sub;
    var where = r === 'east' ? 'East Malaysia' : 'West Malaysia';
    return '<div class="shipbar">' + (left > 0 ? 'Add <b>' + rm(left) + '</b> more for free shipping to ' + where + '.' : '<b>Free shipping</b> to ' + where + ' unlocked.') +
      ' <button class="linkbtn" type="button" data-region="' + (r === 'east' ? 'west' : 'east') + '">Shipping to ' + (r === 'east' ? 'West' : 'East') + ' Malaysia?</button><div class="bar"><i style="width:' + Math.min(100, Math.round(100 * sub / s.free)) + '%"></i></div></div>';
  }
  function cartHTML(lastId) {
    var c = cart();
    if (!c.length) return '<div class="empty"><p>Your cart is empty.</p><a class="btn" href="shop.html">Start shopping</a></div>';
    var sub = subtotal(), deal = multiDeal(), last = prod(lastId || c[c.length - 1].id), pair = last && last.pair && prod(last.pair);
    var inCart = function (id) { return c.some(function (l) { return l.id === id; }); };
    return shipNote(sub - deal.off) + c.map(function (l, i) {
      return '<div class="cline"><img src="img/' + esc(l.img) + '.webp" alt=""><div><h4>' + esc(l.n) + '</h4>' + (l.opts ? '<p>' + esc(l.opts) + '</p>' : '') + '<div class="qty"><button type="button" data-cq="' + i + ':-1" aria-label="One less">−</button><output>' + l.qty + '</output><button type="button" data-cq="' + i + ':1" aria-label="One more">+</button></div></div><b>' + rm(l.unit * l.qty) + '</b></div>';
    }).join('') +
      (pair && !inCart(pair.id) && !isOut(pair) ? '<div class="upsell"><img src="img/' + pair.img[0] + '.webp" alt=""><div><b>Goes well with: ' + esc(pair.n) + '</b>' + rm(pair.p) + '</div><button class="btn btn--sm btn--ghost" type="button" data-quick="' + pair.id + '">Add</button></div>' : '') +
      '<div class="drawer__foot"><div class="totals">' + (deal.off ? '<div><span>Kerepek: any 3 for RM27</span><span>−' + rm(deal.off) + '</span></div>' : '') + '<div class="grand"><span>Subtotal</span><span>' + rm(sub - deal.off) + '</span></div></div>' +
      '<p class="small muted" style="margin:8px 0 12px">Shipping, vouchers and gift options at checkout. You can also send the order on WhatsApp.</p><a class="btn btn--block" href="checkout.html">Checkout</a></div>';
  }
  var lastFocus = null;
  function openCart(lastId) {
    var d = $('[data-drawer]'); if (!d) return;
    lastFocus = document.activeElement;
    $('[data-cart-body]').innerHTML = cartHTML(lastId);
    d.hidden = false; document.body.style.overflow = 'hidden'; $('.drawer__panel').focus();
  }
  function closeCart() { var d = $('[data-drawer]'); if (!d || d.hidden) return; d.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function openSheet(html) { var sh = $('[data-sheet]'), p = $('.sheet__panel', sh); lastFocus = document.activeElement; p.innerHTML = '<button class="sheet__x" type="button" data-close aria-label="Close">&times;</button>' + html; sh.hidden = false; document.body.style.overflow = 'hidden'; p.focus(); }
  function closeSheet() { var sh = $('[data-sheet]'); if (!sh || sh.hidden) return; sh.hidden = true; document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function shared() {
    var page = document.body.getAttribute('data-page');
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === page) { a.classList.add('is-on'); a.setAttribute('aria-current', 'page'); } });
    var burger = $('[data-burger]'), nav = $('#nav');
    if (burger && nav) burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      document.documentElement.style.setProperty('--navtop', $('.hdr').getBoundingClientRect().bottom + 'px');
      nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('[data-wa-chat]').forEach(function (a) { a.href = WA + encodeURIComponent('Hi Dulang & Daun (demo website), I have a question about '); });
    updateCount();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeCart(); closeSheet(); } });
    document.addEventListener('click', function (e) {
      var t;
      if (e.target.closest('[data-cart-open]')) { openCart(); return; }
      if (e.target.closest('[data-cart-close]')) { closeCart(); return; }
      if (e.target.closest('[data-close]')) { closeSheet(); return; }
      if ((t = e.target.closest('[data-cq]'))) {
        var pr = t.getAttribute('data-cq').split(':'), c = cart(), i = +pr[0];
        if (c[i]) { c[i].qty += +pr[1]; if (c[i].qty <= 0) c.splice(i, 1); setCart(c); $('[data-cart-body]').innerHTML = cartHTML(); if (shared.onCart) shared.onCart(); }
        return;
      }
      if ((t = e.target.closest('[data-region]'))) { save('region', t.getAttribute('data-region')); if ($('[data-cart-body]') && !$('[data-drawer]').hidden) $('[data-cart-body]').innerHTML = cartHTML(); if (shared.onCart) shared.onCart(); return; }
      if ((t = e.target.closest('[data-quick]'))) {
        var p = prod(t.getAttribute('data-quick')); if (!p) return;
        if (isOut(p)) { location.href = 'product.html?p=' + p.id; return; }
        if (p.v.length) { quickSheet(p); return; }
        addProduct(p, {}, 1);
      }
    });
  }

  // ------------------------------------------------------------------ product cards
  function badgeHTML(p) {
    var b = [];
    if (isOut(p)) b.push('<span class="tag tag--out">Sold out</span>');
    if (p.badge === 'Bestseller') b.push('<span class="tag tag--pop">Bestseller</span>');
    else if (p.badge === 'New') b.push('<span class="tag tag--new">New</span>');
    else if (p.badge === 'Fresh') b.push('<span class="tag tag--chef">Fresh, West Malaysia</span>');
    else if (p.badge) b.push('<span class="tag tag--season">' + esc(p.badge) + '</span>');
    if (p.multi) b.push('<span class="tag tag--sale">3 for RM' + p.multi.price + '</span>');
    return b.join('');
  }
  function card(p) {
    var out = isOut(p);
    return '<article class="pcard' + (out ? ' is-out' : '') + '"><a class="pcard__img" href="product.html?p=' + p.id + '" tabindex="-1" aria-hidden="true"><img src="img/' + p.img[0] + '.webp" alt="" loading="lazy" width="600" height="600">' + (p.img[1] ? '<img src="img/' + p.img[1] + '.webp" alt="" loading="lazy" width="600" height="600">' : '') + '</a><div class="pcard__badges">' + badgeHTML(p) + '</div>' +
      '<div class="pcard__body"><h3><a href="product.html?p=' + p.id + '">' + esc(p.n) + '</a></h3><p>' + esc(p.short) + '</p><div class="pcard__foot"><span class="price">' + (p.v.some(function (g) { return g.o.some(function (x) { return x[1]; }); }) ? '<small class="muted">from </small>' : '') + rm(fromPrice(p)) + '</span>' +
      '<button class="addbtn" type="button" data-quick="' + p.id + '">' + (out ? 'Notify me' : p.v.length ? 'Choose' : 'Add') + '</button></div></div></article>';
  }
  function quickSheet(p) {
    var sel = {};
    p.v.forEach(function (g, gi) { sel[gi] = 0; });
    function html() {
      var blocked = p.v.some(function (g, gi) { return variantOut(p, g.o[sel[gi]][0]); });
      return '<div class="sheet__body"><h2 id="sheet-title">' + esc(p.n) + '</h2><p class="muted">' + esc(p.short) + '</p>' + p.v.map(function (g, gi) {
        return '<div class="vgroup"><span>' + esc(g.n) + '</span><div class="vbtns">' + g.o.map(function (o, oi) { var vo = variantOut(p, o[0]); return '<button type="button" class="vbtn' + (sel[gi] === oi ? ' is-on' : '') + (vo ? ' is-out' : '') + '" data-qs="' + gi + ':' + oi + '">' + esc(o[0]) + (o[1] ? ' (+' + rm(o[1]) + ')' : '') + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div><div class="sheet__foot"><button class="btn btn--block" type="button" data-qs-add' + (blocked ? ' disabled' : '') + '>' + (blocked ? 'This option is sold out' : 'Add to cart · ' + rm(unitOf(p, sel))) + '</button></div>';
    }
    openSheet(html());
    var panel = $('.sheet__panel');
    panel.onclick = function (e) {
      var t = e.target.closest('[data-qs]');
      if (t) { var pr = t.getAttribute('data-qs').split(':'); sel[+pr[0]] = +pr[1]; panel.innerHTML = '<button class="sheet__x" type="button" data-close aria-label="Close">&times;</button>' + html(); return; }
      if (e.target.closest('[data-qs-add]')) { closeSheet(); addProduct(p, sel, 1); }
    };
  }

  // ------------------------------------------------------------------ home
  function nextCutoff() { var r = region(), t = today(); for (var i = 0; i < CUTOFF.length; i++) if (CUTOFF[i][r] >= t) return { c: CUTOFF[i], d: CUTOFF[i][r], r: r }; return null; }
  function pageHome() {
    $('[data-best]').innerHTML = ['sambal-bilis', 'pineapple-tarts', 'kerepek', 'kopi'].map(function (id) { return card(prod(id)); }).join('');
    $('[data-hampers]').innerHTML = P.filter(function (p) { return p.cat === 'hampers'; }).map(card).join('');
    var n = nextCutoff(), el = $('[data-cutoff]');
    if (n && el) {
      var dl = daysUntil(n.d);
      el.innerHTML = '<div class="fstrip"><img src="img/lanterns.webp" alt=""><div><h3>' + esc(n.c.n) + ' gifts: order by ' + fmtDay(n.d) + '</h3><p>That’s the last day for delivery before ' + esc(n.c.n) + ' in ' + (n.r === 'east' ? 'East' : 'West') + ' Malaysia (' + (dl === 0 ? 'today' : dl + ' day' + (dl === 1 ? '' : 's') + ' left') + '). East Malaysia closes a few days earlier.</p></div><a class="btn btn--light" href="shop.html#hampers">Shop gift boxes</a></div>';
    }
  }

  // ------------------------------------------------------------------ shop
  function pageShop() {
    var S = { cat: location.hash === '#hampers' ? 'hampers' : '', sort: 'featured' };
    function paint() {
      var list = P.filter(function (p) { return !S.cat || p.cat === S.cat; });
      if (S.sort === 'low') list = list.slice().sort(function (a, b) { return a.p - b.p; });
      if (S.sort === 'high') list = list.slice().sort(function (a, b) { return b.p - a.p; });
      $('[data-cats]').innerHTML = '<button type="button" data-cat="" class="' + (!S.cat ? 'is-on' : '') + '" aria-pressed="' + !S.cat + '">All</button>' + CATS.map(function (c) { return '<button type="button" data-cat="' + c[0] + '" class="' + (S.cat === c[0] ? 'is-on' : '') + '" aria-pressed="' + (S.cat === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
      $('[data-count]').textContent = list.length + ' product' + (list.length === 1 ? '' : 's');
      $('[data-grid]').innerHTML = list.map(card).join('');
    }
    $('[data-cats]').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; S.cat = b.getAttribute('data-cat'); history.replaceState(null, '', S.cat === 'hampers' ? '#hampers' : location.pathname); paint(); });
    $('[data-sort]').addEventListener('change', function (e) { S.sort = e.target.value; paint(); });
    window.addEventListener('hashchange', function () { S.cat = location.hash === '#hampers' ? 'hampers' : S.cat; paint(); });
    paint();
  }

  // ------------------------------------------------------------------ product page
  function pageProduct() {
    var id = new URLSearchParams(location.search).get('p'), p = prod(id), root = $('[data-pdp]');
    if (!p) { root.innerHTML = '<div class="panel empty" style="margin:40px 0"><h2>We couldn’t find that product</h2><a class="btn" href="shop.html">See everything</a></div>'; return; }
    document.title = p.n + ' — Dulang & Daun (demo website)';
    var sel = {}, img = 0, qty = 1;
    p.v.forEach(function (g, gi) { sel[gi] = 0; });
    function blocked() { return isOut(p) || p.v.some(function (g, gi) { return variantOut(p, g.o[sel[gi]][0]); }); }
    function paint() {
      var u = unitOf(p, sel), b = blocked(), r = region(), pair = p.pair && prod(p.pair);
      var label = p.v.map(function (g, gi) { return g.o[sel[gi]][0]; }).join(' · ');
      root.innerHTML = '<div class="pdp"><div class="gallery"><div class="gallery__main"><img src="img/' + p.img[img] + '.webp" alt="' + esc(p.n) + ' (placeholder photo)" width="760" height="760"></div>' + (p.img.length > 1 ? '<div class="gallery__thumbs">' + p.img.map(function (x, i) { return '<button type="button" class="' + (i === img ? 'is-on' : '') + '" data-img="' + i + '" aria-label="Photo ' + (i + 1) + '"><img src="img/' + x + '.webp" alt=""></button>'; }).join('') + '</div>' : '') + '</div>' +
        '<div><p class="crumbs"><a href="shop.html">Shop</a> / ' + esc((CATS.filter(function (c) { return c[0] === p.cat; })[0] || ['', ''])[1]) + '</p><div class="pcard__badges" style="position:static;flex-direction:row;margin-bottom:10px">' + badgeHTML(p) + '</div><h1>' + esc(p.n) + '</h1><p class="lead" style="margin-bottom:6px">' + esc(p.short) + '</p>' +
        '<div class="pdp__price">' + rm(u) + (label ? '<small>' + esc(label) + '</small>' : '') + '</div>' +
        p.v.map(function (g, gi) {
          return '<div class="vgroup"><span>' + esc(g.n) + ': <em>' + esc(g.o[sel[gi]][0]) + '</em></span><div class="vbtns">' + g.o.map(function (o, oi) { var vo = variantOut(p, o[0]); return '<button type="button" class="vbtn' + (sel[gi] === oi ? ' is-on' : '') + (vo ? ' is-out' : '') + '" data-v="' + gi + ':' + oi + '" aria-pressed="' + (sel[gi] === oi) + '"' + (vo ? ' title="Sold out"' : '') + '>' + esc(o[0]) + '</button>'; }).join('') + '</div></div>';
        }).join('') +
        (b ? '<div class="notify" data-notify-box><h3>' + (isOut(p) ? 'Sold out for now' : 'This option is sold out') + '</h3><p class="small" style="margin:0">Leave your WhatsApp number and we’ll message you once when it’s back. No spam.</p><form data-notify><input class="input" type="tel" name="contact" placeholder="012-345 6789" aria-label="Your WhatsApp number" required><button class="btn btn--sm" type="submit">Notify me</button></form></div>'
          : '<div class="buyrow"><div class="qty"><button type="button" data-q="-1" aria-label="One less">−</button><output>' + qty + '</output><button type="button" data-q="1" aria-label="One more">+</button></div><button class="btn" type="button" data-add>Add to cart · ' + rm(u * qty) + '</button></div>') +
        '<ul class="perks"><li>' + ICON.truck + '<span>' + (p.ship === 'west' ? 'West Malaysia only (fresh, no preservatives). ' + SHIP.west.days + '.' : 'Ships to West Malaysia in ' + SHIP.west.days + ', East Malaysia in ' + SHIP.east.days + '.') + ' Free over ' + rm(SHIP[r].free) + '.</span></li><li>' + ICON.gift + '<span>Add a gift message and send it straight to someone at checkout.</span></li><li>' + ICON.leaf + '<span>Made in small batches in a home kitchen.</span></li></ul>' +
        '<div class="acc"><details open><summary>About this</summary><p>' + esc(p.d) + '</p>' + (p.has ? '<ul>' + p.has.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') + '</details>' + (p.ing ? '<details><summary>Ingredients</summary><p>' + esc(p.ing) + '</p></details>' : '') + '<details><summary>Keeping</summary><p>' + esc(p.keep) + '</p></details><details><summary>Shipping &amp; returns</summary><p>Packed by hand, sent with a tracked courier. Arrived damaged? Send us a photo on WhatsApp within 48 hours and we’ll replace it.</p></details></div>' +
        (pair && !isOut(pair) && !b ? '<div class="fbt"><h3>Often bought together</h3><div class="fbt__row"><img src="img/' + p.img[0] + '.webp" alt=""><span class="plus">+</span><img src="img/' + pair.img[0] + '.webp" alt=""><span><b>' + esc(pair.n) + '</b><br><small class="muted">' + rm(pair.p) + '</small></span></div><button class="btn btn--ghost btn--sm" type="button" data-both>Add both · ' + rm(u + pair.p) + '</button></div>' : '') +
        '</div></div>' +
        '<div class="stickyadd' + (b ? '' : ' is-on') + '"><div><b>' + esc(p.n) + '</b><small>' + rm(u) + (label ? ' · ' + esc(label) : '') + '</small></div><button class="btn btn--sm" type="button" data-add>Add to cart</button></div>';
    }
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-v]'))) { var pr = t.getAttribute('data-v').split(':'); sel[+pr[0]] = +pr[1]; paint(); return; }
      if ((t = e.target.closest('[data-img]'))) { img = +t.getAttribute('data-img'); paint(); return; }
      if ((t = e.target.closest('[data-q]'))) { qty = Math.max(1, Math.min(20, qty + +t.getAttribute('data-q'))); paint(); return; }
      if (e.target.closest('[data-add]')) { addProduct(p, sel, qty); return; }
      if (e.target.closest('[data-both]')) { addProduct(p, sel, 1); var pp = prod(p.pair); if (pp.v.length) { var s2 = {}; pp.v.forEach(function (g, gi) { s2[gi] = 0; }); addProduct(pp, s2, 1); } else addProduct(pp, {}, 1); }
    });
    root.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-notify]')) return;
      e.preventDefault();
      var v = e.target.contact.value.trim();
      if (!phoneOk(v)) { toast('Add a WhatsApp number, e.g. 012-345 6789.'); return; }
      var w = load('notify', []), label = p.v.map(function (g, gi) { return g.o[sel[gi]][0]; }).join(' · ');
      w.unshift({ id: p.id, n: p.n, opt: isOut(p) ? '' : label, contact: v, at: Date.now() }); save('notify', w.slice(0, 50));
      $('[data-notify-box]').innerHTML = '<h3>' + ICON.check.replace('<svg', '<svg width="18" height="18"') + ' You’re on the list</h3><p class="small" style="margin:0">We’ll WhatsApp ' + esc(v) + ' once when ' + esc(p.n) + (label && !isOut(p) ? ' (' + esc(label) + ')' : '') + ' is back. Demo: nothing is sent; the owner view shows the waiting list.</p>';
    });
    paint();
  }

  // ------------------------------------------------------------------ build your own hamper
  function pageHamper() {
    var S = { box: 'M', items: {}, ribbon: 'Red', msg: '' };
    var pool = P.filter(function (p) { return p.hamper; });
    var root = $('[data-hamper]');
    function box() { return BOXES.filter(function (b) { return b.id === S.box; })[0]; }
    function filled() { return Object.keys(S.items).reduce(function (a, k) { return a + S.items[k]; }, 0); }
    function total() { return box().p + Object.keys(S.items).reduce(function (a, k) { return a + prod(k).p * S.items[k]; }, 0); }
    function paint() {
      var b = box(), f = filled();
      while (f > b.slots) { var ks = Object.keys(S.items), last = ks[ks.length - 1]; S.items[last]--; if (!S.items[last]) delete S.items[last]; f--; }
      root.innerHTML = '<div class="co" style="padding-top:0"><div>' +
        '<section class="panel"><h2>1. Choose a box</h2><div class="boxes">' + BOXES.map(function (x) { return '<button type="button" class="boxopt' + (x.id === S.box ? ' is-on' : '') + '" data-box="' + x.id + '"><b>' + x.n + '</b><small>' + x.slots + ' items · box ' + rm(x.p) + '</small></button>'; }).join('') + '</div></section>' +
        '<section class="panel"><h2>2. Fill it</h2><p class="muted small" style="margin:0">' + f + ' of ' + b.slots + ' filled. Items that keep at least 3 weeks only, so the box travels well.</p><div class="slotsbar" aria-hidden="true">' + Array.apply(null, Array(b.slots)).map(function (_, i) { return '<i class="' + (i < f ? 'is-full' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="hgrid" style="margin-top:12px">' + pool.map(function (p) {
          var q = S.items[p.id] || 0, out = isOut(p);
          return '<div class="hitem' + (q ? ' is-in' : '') + '"><img src="img/' + p.img[0] + '.webp" alt="" loading="lazy"><div><h4>' + esc(p.n) + '</h4><span class="price" style="font-size:.95rem">' + rm(p.p) + '</span>' + (out ? '<span class="tag tag--out" style="align-self:flex-start">Sold out</span>' : '<div class="qty"><button type="button" data-hi="' + p.id + ':-1" aria-label="One less">−</button><output>' + q + '</output><button type="button" data-hi="' + p.id + ':1" aria-label="One more"' + (f >= b.slots ? ' disabled' : '') + '>+</button></div>') + '</div></div>';
        }).join('') + '</div></section>' +
        '<section class="panel"><h2>3. Ribbon and card</h2><div class="field"><span>Ribbon</span><div class="ribbons">' + RIBBONS.map(function (r) { return '<button type="button" data-ribbon="' + r[0] + '" class="' + (S.ribbon === r[0] ? 'is-on' : '') + '" style="background:' + r[1] + '" aria-label="' + r[0] + ' ribbon" aria-pressed="' + (S.ribbon === r[0]) + '"></button>'; }).join('') + '</div></div>' +
        '<div class="field"><label for="h-msg">Message on the card <small>(optional, free)</small></label><input class="input" id="h-msg" maxlength="120" placeholder="Happy Chinese New Year, with love from…" value="' + esc(S.msg) + '"></div></section></div>' +
        '<aside class="summary panel"><h2>Your hamper</h2><img src="img/hamper-ong.webp" alt="" style="border-radius:14px;aspect-ratio:4/3;object-fit:cover;width:100%;margin-bottom:12px">' +
        '<div class="totals"><div><span>' + b.n + ' box, ' + S.ribbon.toLowerCase() + ' ribbon</span><span>' + rm(b.p) + '</span></div>' + Object.keys(S.items).map(function (k) { return '<div><span>' + S.items[k] + ' × ' + esc(prod(k).n) + '</span><span>' + rm(prod(k).p * S.items[k]) + '</span></div>'; }).join('') + '<div class="grand"><span>Total</span><span>' + rm(total()) + '</span></div></div>' +
        '<button class="btn btn--block" type="button" data-hadd style="margin-top:14px"' + (f < b.slots ? ' disabled' : '') + '>' + (f < b.slots ? 'Add ' + (b.slots - f) + ' more item' + (b.slots - f === 1 ? '' : 's') : 'Add hamper to cart') + '</button></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-box]'))) { S.box = t.getAttribute('data-box'); paint(); return; }
      if ((t = e.target.closest('[data-ribbon]'))) { S.ribbon = t.getAttribute('data-ribbon'); paint(); return; }
      if ((t = e.target.closest('[data-hi]'))) {
        var pr = t.getAttribute('data-hi').split(':'), q = (S.items[pr[0]] || 0) + +pr[1];
        if (+pr[1] > 0 && filled() >= box().slots) { toast('The box is full. Choose a bigger box or take something out.'); return; }
        if (q > 0) S.items[pr[0]] = q; else delete S.items[pr[0]];
        paint(); return;
      }
      if (e.target.closest('[data-hadd]')) {
        var b = box(), list = Object.keys(S.items).map(function (k) { return S.items[k] + ' × ' + prod(k).n; });
        addLine({ key: 'hamper-' + Date.now(), id: 'custom-hamper', n: 'Your own hamper (' + b.n + ')', img: 'hamper-thanks', qty: 1, unit: Math.round(total() * 100) / 100, opts: list.join(', ') + ' · ' + S.ribbon + ' ribbon' + (S.msg ? ' · card: “' + S.msg + '”' : ''), ship: 'all' });
        S.items = {}; S.msg = ''; paint();
      }
    });
    root.addEventListener('input', function (e) { if (e.target.id === 'h-msg') S.msg = e.target.value; });
    paint();
  }

  // ------------------------------------------------------------------ checkout
  function discount(code, sub) {
    code = String(code || '').trim().toUpperCase();
    if (!code) return { ok: true, amt: 0 };
    if (code === VOUCHER.code) return sub >= VOUCHER.min ? { ok: true, amt: Math.round(sub * VOUCHER.pct) / 100, label: VOUCHER.pct + '% off (' + code + ')' } : { ok: false, msg: code + ' needs a minimum order of ' + rm(VOUCHER.min) + '.' };
    return { ok: false, msg: 'That code doesn’t work. Try ' + VOUCHER.code + ' (demo).' };
  }
  function orderText(o) {
    var L = ['New order (demo website): Dulang & Daun', o.no, ''];
    o.items.forEach(function (l) { L.push(l.qty + ' × ' + l.n + (l.opts ? ' (' + l.opts + ')' : '') + ' — ' + rm(l.unit * l.qty)); });
    L.push('');
    if (o.deal) L.push('Kerepek 3 for RM27: −' + rm(o.deal));
    if (o.disc) L.push('Voucher: −' + rm(o.disc));
    L.push('Shipping (' + o.method + '): ' + (o.ship ? rm(o.ship) : 'free'));
    L.push('Total: ' + rm(o.total), '', 'Name: ' + o.name + ' · ' + o.phone, 'Address: ' + o.addr + ', ' + o.pc + ' ' + o.city + ', ' + o.state);
    if (o.gift) L.push('Gift for: ' + o.gift.to + (o.gift.msg ? ' · card: “' + o.gift.msg + '”' : '') + ' · no prices in the box');
    return L.join('\n');
  }
  function pageCheckout() {
    var S = load('checkout', { name: '', phone: '', email: '', addr: '', pc: '', city: '', state: 'Selangor', method: 'std', gift: false, to: '', msg: '', code: '', pay: 'online' });
    var root = $('[data-checkout]');
    function keep() { save('checkout', S); }
    function reg() { return EAST.indexOf(S.state) >= 0 ? 'east' : 'west'; }
    function calc() {
      var sub = subtotal(), deal = multiDeal().off, r = reg(), d = discount(S.code, sub - deal), disc = d.ok ? d.amt : 0, after = sub - deal - disc;
      if (r === 'east' && S.method === 'express') S.method = 'std';
      var ship = S.method === 'express' ? SHIP.west.express : (after >= SHIP[r].free ? 0 : SHIP[r].std);
      return { sub: sub, deal: deal, d: d, disc: disc, ship: ship, r: r, total: Math.max(0, after + ship) };
    }
    shared.onCart = function () { paint(); };
    function paint() {
      var c = cart();
      if (!c.length) { root.innerHTML = '<div class="panel empty" style="margin:20px 0 80px"><h2>Your cart is empty</h2><p>Have a look at the gift boxes, or build your own.</p><div class="btns" style="justify-content:center"><a class="btn" href="shop.html">Shop all</a><a class="btn btn--ghost" href="hamper.html">Build a hamper</a></div></div>'; return; }
      save('region', reg());
      var k = calc(), fresh = c.filter(function (l) { return l.ship === 'west'; }), cut = null;
      for (var i = 0; i < CUTOFF.length; i++) if (CUTOFF[i][k.r] >= today()) { cut = CUTOFF[i]; break; }
      root.innerHTML = '<div class="co"><div>' +
        '<section class="panel"><h2>1. Contact</h2><div class="row2"><div class="field"><label for="c-name">Name</label><input class="input" id="c-name" data-k="name" autocomplete="name" value="' + esc(S.name) + '"></div><div class="field"><label for="c-phone">Mobile (for delivery updates)</label><input class="input" id="c-phone" data-k="phone" type="tel" autocomplete="tel" placeholder="012-345 6789" value="' + esc(S.phone) + '"></div></div><div class="field"><label for="c-email">Email <small>(receipt, optional)</small></label><input class="input" id="c-email" data-k="email" type="email" autocomplete="email" value="' + esc(S.email) + '"></div></section>' +
        '<section class="panel"><h2>2. Delivery address</h2><div class="field"><label for="c-addr">Address</label><input class="input" id="c-addr" data-k="addr" autocomplete="street-address" placeholder="Unit, street, area" value="' + esc(S.addr) + '"></div><div class="row2"><div class="field"><label for="c-pc">Postcode</label><input class="input" id="c-pc" data-k="pc" inputmode="numeric" maxlength="5" autocomplete="postal-code" value="' + esc(S.pc) + '"></div><div class="field"><label for="c-city">City</label><input class="input" id="c-city" data-k="city" value="' + esc(S.city) + '"></div></div>' +
        '<div class="field"><label for="c-state">State</label><select class="input" id="c-state" data-k="state">' + STATES.map(function (s) { return '<option' + (s === S.state ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>' +
        (fresh.length && k.r === 'east' ? '<div class="note note--bad">' + ICON.info + '<span>' + esc(fresh.map(function (l) { return l.n; }).join(', ')) + ' ships to West Malaysia only (it keeps 3 days without a fridge). Remove it from the cart, or send to a West Malaysia address.</span></div>' : '') +
        '<div class="field" style="margin-top:6px"><span>Shipping</span><div class="pay"><label class="payopt"><input type="radio" name="method" value="std"' + (S.method === 'std' ? ' checked' : '') + '><span><b>Standard, tracked · ' + (k.ship === 0 && S.method === 'std' ? 'Free' : rm(SHIP[k.r].std)) + '</b><small>' + (k.r === 'east' ? 'East Malaysia: ' + SHIP.east.days : 'West Malaysia: ' + SHIP.west.days) + '. Free over ' + rm(SHIP[k.r].free) + '.</small></span></label>' +
        (k.r === 'west' ? '<label class="payopt"><input type="radio" name="method" value="express"' + (S.method === 'express' ? ' checked' : '') + '><span><b>Express · ' + rm(SHIP.west.express) + '</b><small>Next working day in West Malaysia if you order by 2pm.</small></span></label>' : '') + '</div></div>' +
        (cut ? '<div class="note">' + ICON.truck + '<span>' + esc(cut.n) + ': order by <b>' + fmtDay(cut[k.r]) + '</b> to receive it before the festival in ' + (k.r === 'east' ? 'East' : 'West') + ' Malaysia.</span></div>' : '') + '</section>' +
        '<section class="panel"><h2>3. Is it a gift?</h2><label class="payopt"><input type="checkbox" data-gift' + (S.gift ? ' checked' : '') + '><span><b>Yes, send it as a gift</b><small>Free gift card, no prices in the box. Use the address above for the person receiving it.</small></span></label>' +
        (S.gift ? '<div class="row2" style="margin-top:12px"><div class="field"><label for="c-to">Their name</label><input class="input" id="c-to" data-k="to" value="' + esc(S.to) + '"></div><div class="field"><label for="c-msg">Card message</label><input class="input" id="c-msg" data-k="msg" maxlength="120" value="' + esc(S.msg) + '"></div></div>' : '') + '</section>' +
        '<section class="panel"><h2>4. Payment</h2><div class="pay"><label class="payopt"><input type="radio" name="pay" value="online"' + (S.pay === 'online' ? ' checked' : '') + '><span><b>Pay online</b><small>FPX online banking, cards and e-wallets. Demo: no money is taken.</small></span></label><label class="payopt"><input type="radio" name="pay" value="wa"' + (S.pay === 'wa' ? ' checked' : '') + '><span><b>Order on WhatsApp</b><small>Your order arrives on our WhatsApp, already filled in. Pay by bank transfer or DuitNow when we reply.</small></span></label></div></section></div>' +
        '<aside class="summary panel"><h2>Order summary</h2>' + c.map(function (l, i) {
          return '<div class="cline"><img src="img/' + esc(l.img) + '.webp" alt=""><div><h4>' + esc(l.n) + '</h4>' + (l.opts ? '<p>' + esc(l.opts) + '</p>' : '') + '<div class="qty"><button type="button" data-cq="' + i + ':-1" aria-label="One less">−</button><output>' + l.qty + '</output><button type="button" data-cq="' + i + ':1" aria-label="One more">+</button></div></div><b>' + rm(l.unit * l.qty) + '</b></div>';
        }).join('') +
        '<div class="field" style="margin-top:14px"><label for="c-code">Voucher code</label><div style="display:flex;gap:8px"><input class="input" id="c-code" placeholder="' + VOUCHER.code + '" value="' + esc(S.code) + '" autocapitalize="characters"><button class="btn btn--ghost btn--sm" type="button" data-apply>Apply</button></div>' + (S.code && !k.d.ok ? '<small style="color:var(--chili)">' + esc(k.d.msg) + '</small>' : (k.disc ? '<small style="color:var(--ok)">' + esc(k.d.label) + ' applied</small>' : '')) + '</div>' +
        '<div class="totals"><div><span>Subtotal</span><span>' + rm(k.sub) + '</span></div>' + (k.deal ? '<div><span>Kerepek: any 3 for RM27</span><span>−' + rm(k.deal) + '</span></div>' : '') + (k.disc ? '<div><span>Voucher</span><span>−' + rm(k.disc) + '</span></div>' : '') + '<div><span>Shipping</span><span>' + (k.ship ? rm(k.ship) : 'Free') + '</span></div><div class="grand"><span>Total</span><span>' + rm(k.total) + '</span></div></div>' +
        '<button class="btn btn--block' + (S.pay === 'wa' ? ' btn--wa' : '') + '" type="button" data-place style="margin-top:14px">' + (S.pay === 'wa' ? ICON.wa + 'Send order on WhatsApp' : 'Pay ' + rm(k.total)) + '</button><p class="small muted center" style="margin-top:10px">Demo website: nothing is charged or sent.</p></aside></div>';
    }
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-apply]')) { S.code = $('#c-code').value.trim().toUpperCase(); keep(); paint(); return; }
      if (e.target.closest('[data-place]')) place();
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'c-code') { e.preventDefault(); S.code = e.target.value.trim().toUpperCase(); keep(); paint(); } });
    root.addEventListener('change', function (e) {
      var x = e.target;
      if (x.name === 'method') { S.method = x.value; keep(); paint(); return; }
      if (x.name === 'pay') { S.pay = x.value; keep(); paint(); return; }
      if (x.hasAttribute('data-gift')) { S.gift = x.checked; keep(); paint(); return; }
      if (x.getAttribute('data-k') === 'state') { S.state = x.value; keep(); paint(); }
    });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k && k !== 'state') { S[k] = e.target.value; keep(); } });
    function place() {
      var k = calc(), c = cart(), err = '';
      if (c.some(function (l) { return l.ship === 'west'; }) && k.r === 'east') err = 'Pandan Kaya ships to West Malaysia only. Remove it, or use a West Malaysia address.';
      else if (!S.name.trim()) err = 'Add your name.';
      else if (!phoneOk(S.phone)) err = 'Add a mobile number for delivery updates.';
      else if (!S.addr.trim() || !/^\d{5}$/.test(S.pc.trim()) || !S.city.trim()) err = 'Add the full delivery address with a 5-digit postcode.';
      else if (S.gift && !S.to.trim()) err = 'Add the name of the person receiving the gift.';
      if (err) { toast(err); return; }
      var o = { no: 'DD-' + seq(), date: today(), items: c, sub: k.sub, deal: k.deal, disc: k.disc, ship: k.ship, method: S.method === 'express' ? 'express' : 'standard', total: k.total, name: S.name.trim(), phone: S.phone.trim(), addr: S.addr.trim(), pc: S.pc.trim(), city: S.city.trim(), state: S.state, region: k.r, gift: S.gift ? { to: S.to.trim(), msg: S.msg.trim() } : null, pay: S.pay, st: 'Paid', at: Date.now() };
      if (S.pay === 'wa') o.st = 'New';
      var all = load('orders', []); all.unshift(o); save('orders', all.slice(0, 30));
      save('cart', []); updateCount(); S.code = ''; S.gift = false; S.to = ''; S.msg = ''; keep();
      var text = orderText(o), eta = addDays(today(), S.method === 'express' ? 1 : k.r === 'east' ? 6 : 3);
      root.innerHTML = '<div class="panel done" style="margin:20px 0 80px"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">' + (o.pay === 'wa' ? 'Order ready to send (demo)' : 'Thank you, order paid (demo)') + '</p><p class="ref">' + o.no + '</p>' +
        '<h2 style="margin-top:10px">' + (o.gift ? 'A gift for ' + esc(o.gift.to) : 'On its way soon') + ' · arrives around ' + fmtDay(eta) + '</h2>' +
        (o.pay === 'wa' ? '<p class="lead" style="margin:0 auto 14px">One more step: send it. This message lands on our WhatsApp, already filled in:</p><div class="waprev" style="text-align:left;max-width:520px;margin:0 auto 16px">' + esc(text) + '</div><p><a class="btn btn--wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + ICON.wa + 'Open WhatsApp</a></p><p class="small muted">Demo: WhatsApp opens without a number, so you choose any chat. On a real website it opens the shop’s own number.</p>'
          : '<p class="lead" style="margin:0 auto 14px">Paid ' + rm(o.total) + ' (demo: no money was taken). We pack every order by hand and send the tracking number by WhatsApp and email.</p><p class="small muted">On a real website, payment goes through your own FPX / card / e-wallet gateway account, straight to your bank.</p>') +
        '<div class="btns" style="justify-content:center;margin-top:18px"><a class="btn" href="track.html?o=' + o.no + '">Track this order</a><a class="btn btn--ghost" href="owner.html">See it in the owner view</a></div></div>';
      window.scrollTo(0, 0);
    }
    paint();
  }

  // ------------------------------------------------------------------ tracking
  var STEPS = [['Paid', 'Order received'], ['Packed', 'Packed by hand'], ['Shipped', 'With the courier'], ['Delivered', 'Delivered']];
  function allOrders() { var seed = JSON.parse(JSON.stringify(SEED_ORDER)); seed.date = addDays(today(), -2); var st = load('ost', {}); seed.st = st[seed.no] || seed.st; return load('orders', []).map(function (o) { if (st[o.no]) o.st = st[o.no]; return o; }).concat([seed]); }
  function pageTrack() {
    var form = $('[data-track]'), out = $('[data-track-out]'), q = new URLSearchParams(location.search).get('o');
    function show(o) {
      var idx = Math.max(0, STEPS.map(function (s) { return s[0]; }).indexOf(o.st === 'New' ? 'Paid' : o.st));
      if (o.st === 'New') idx = -1;
      out.innerHTML = '<div class="panel" style="margin-top:16px"><p class="kicker">Order ' + esc(o.no) + '</p><h2>' + (o.st === 'New' ? 'Waiting for payment' : STEPS[idx][1]) + '</h2><p class="muted">' + esc(o.items.map(function (l) { return l.qty + ' × ' + l.n; }).join(', ')) + ' · to ' + esc(o.state) + '</p>' +
        '<ol class="timeline">' + STEPS.map(function (s, i) { return '<li class="' + (i < idx ? 'is-done' : i === idx ? 'is-done is-now' : '') + '"><i></i><b>' + s[1] + '</b><small>' + (i === 0 ? fmtDay(o.date) : i <= idx ? 'Done' : 'Next') + (s[0] === 'Shipped' && o.trk && idx >= 2 ? ' · tracking no. ' + esc(o.trk) : '') + '</small></li>'; }).join('') + '</ol>' +
        (o.trk && idx >= 2 ? '<p class="small muted">Demo tracking number. On a real website it links to the courier’s own tracking page.</p>' : '') + '</div>';
    }
    function find(no, ph) { no = String(no || '').trim().toUpperCase(); return allOrders().filter(function (o) { return o.no === no && (!ph || digits(o.phone) === digits(ph)); })[0]; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var o = find(form.no.value, form.phone.value);
      if (!o) { out.innerHTML = '<div class="note note--bad" style="margin-top:16px">' + ICON.info + '<span>We couldn’t find that order with that phone number. Check the order number in your email or WhatsApp, or try the demo order DD-2041 with 012-345 6789.</span></div>'; return; }
      show(o);
    });
    if (q) { var o = find(q); if (o) { form.no.value = o.no; show(o); } }
  }

  // ------------------------------------------------------------------ corporate gifts
  function pageCorporate() {
    var S = { box: 'hamper-thanks', qty: 50 }, root = $('[data-corp]');
    function tier(q) { var t = 0; TIERS.forEach(function (x) { if (q >= x[0]) t = x[1]; }); return t; }
    function paint() {
      var p = prod(S.box), t = tier(S.qty), gross = p.p * S.qty, off = Math.round(gross * t) / 100;
      $('[data-tiers]').innerHTML = '<table class="tiers"><thead><tr><th>Quantity</th><th>Discount</th></tr></thead><tbody>' + TIERS.map(function (x, i) { var next = TIERS[i + 1]; return '<tr class="' + (t === x[1] ? 'is-on' : '') + '"><td>' + x[0] + (next ? '–' + (next[0] - 1) : '+') + ' boxes</td><td>' + x[1] + '% off</td></tr>'; }).join('') + '</tbody></table>';
      root.innerHTML = '<div class="field"><label for="k-box">Gift box</label><select class="input" id="k-box">' + P.filter(function (x) { return x.cat === 'hampers'; }).map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.box ? ' selected' : '') + '>' + esc(x.n) + ' · ' + rm(x.p) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label for="k-qty">How many boxes?</label><input class="input" id="k-qty" type="number" min="10" max="2000" value="' + S.qty + '"></div>' +
        '<div class="calc"><div><span>' + S.qty + ' × ' + esc(p.n) + '</span><span>' + rm(gross) + '</span></div>' + (t ? '<div><span>Volume discount (' + t + '%)</span><span>−' + rm(off) + '</span></div>' : '<div><span>Volume discount</span><span>from 20 boxes</span></div>') + '<div><span>Logo card and ribbon in your colours</span><span>Free</span></div><div class="grand"><span>Estimate</span><span>' + rm(gross - off) + '</span></div></div><p class="small muted" style="margin-top:8px">Delivery to many addresses is quoted separately. The final price comes in a written quote.</p>';
    }
    root.addEventListener('change', function (e) { if (e.target.id === 'k-box') { S.box = e.target.value; paint(); } });
    root.addEventListener('input', function (e) { if (e.target.id === 'k-qty') { var v = parseInt(e.target.value, 10); if (v >= 1 && v <= 5000) { S.qty = v; var pos = e.target.selectionStart; paint(); var el = $('#k-qty'); el.focus(); try { el.setSelectionRange(pos, pos); } catch (err) { /* number inputs */ } } } });
    paint();
    var form = $('[data-corp-form]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = {}; new FormData(form).forEach(function (v, k) { f[k] = String(v).trim(); });
      if (!phoneOk(f.phone)) { toast('Add a mobile number we can reach you on.'); return; }
      var ref = 'DD-Q' + seq(), p = prod(S.box);
      var text = 'Corporate gift enquiry (demo website): Dulang & Daun\n' + ref + '\n' + S.qty + ' × ' + p.n + ' (estimate ' + rm(p.p * S.qty * (100 - tier(S.qty)) / 100) + ')\nCompany: ' + f.company + '\nDeliver by: ' + (f.date ? fmtDay(f.date) : 'to confirm') + ' · ' + (f.where || 'one address') + (f.notes ? '\nNotes: ' + f.notes : '') + '\nContact: ' + f.name + ' · ' + f.phone + (f.email ? ' · ' + f.email : '');
      form.outerHTML = '<div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Enquiry sent (demo)</p><p class="ref">' + ref + '</p><h2 style="margin-top:10px">Thank you, ' + esc(f.name) + '</h2><p class="lead" style="margin:0 auto 14px">You’ll get a written quote with a photo of a sample box within one working day.</p><details style="max-width:520px;margin:0 auto;text-align:left"><summary class="linkbtn">What the shop receives</summary><div class="waprev" style="margin-top:10px">' + esc(text) + '</div></details></div>';
    });
  }

  // ------------------------------------------------------------------ owner view
  var OST = ['New', 'Paid', 'Packed', 'Shipped', 'Delivered'];
  function pageOwner() {
    var tab = 'orders', root = $('[data-owner]');
    function paint() {
      var o = owner(), orders = allOrders(), waits = load('notify', []);
      var seedWaits = [{ id: 'teh', n: 'Teh Tarik Premix', opt: '', contact: '012-*** 4471', at: 0 }, { id: 'teh', n: 'Teh Tarik Premix', opt: '', contact: '017-*** 0920', at: 0 }, { id: 'pineapple-tarts', n: 'Pineapple Tarts', opt: '40 pcs', contact: '011-*** 3385', at: 0 }];
      var allWaits = waits.concat(seedWaits).filter(function (w) { return !o.back[w.id]; });
      var toShip = orders.filter(function (x) { return x.st === 'Paid' || x.st === 'Packed'; }).length;
      var panes = {
        orders: orders.map(function (x) {
          var i = OST.indexOf(x.st), next = OST[Math.min(OST.length - 1, i + 1)];
          return '<div class="ocard"><div class="ocard__top"><b>' + esc(x.no) + ' · ' + esc(x.name) + '</b><span class="ost ost--' + (x.st === 'Shipped' || x.st === 'Delivered' ? 'Ready' : x.st === 'Packed' ? 'Preparing' : 'New') + '">' + esc(x.st) + '</span></div><span>' + rm(x.total) + ' · ' + esc(x.state) + (x.region === 'east' ? ' (East)' : '') + (x.pay === 'wa' ? ' · via WhatsApp' : '') + (x.gift ? ' · gift' : '') + '</span><span class="muted">' + esc(x.items.map(function (l) { return l.qty + ' × ' + l.n; }).join(', ')) + '</span>' +
            (x.st !== 'Delivered' ? '<button class="btn btn--sm btn--ghost" type="button" data-next="' + esc(x.no) + '" style="justify-self:start;margin-top:4px">' + (x.st === 'New' ? 'Mark as paid' : x.st === 'Paid' ? 'Mark as packed' : x.st === 'Packed' ? 'Ship (adds tracking no.)' : 'Mark as delivered') + '</button>' : '') + (x.trk ? '<small class="muted">Tracking: ' + esc(x.trk) + '</small>' : '') + '</div>';
        }).join(''),
        stock: '<p class="small muted" style="margin:0">Switch a product to sold out. The shop shows “Notify me” instead of “Add”.</p>' + P.map(function (p) {
          return '<div class="orow" style="grid-template-columns:1fr auto"><span><b>' + esc(p.n) + '</b>' + (p.v.some(function (g) { return (g.out || []).length; }) && !o.back[p.id] ? '<br><small class="muted">Sold out: ' + esc(p.v.map(function (g) { return (g.out || []).join(', '); }).join('')) + '</small>' : '') + '</span><label class="switch" title="Sold out"><input type="checkbox" data-out="' + p.id + '"' + (isOut(p) ? ' checked' : '') + ' aria-label="' + esc(p.n) + ' sold out"><span></span></label></div>';
        }).join(''),
        waitlist: (allWaits.length ? allWaits.map(function (w) { return '<div class="ocard"><div class="ocard__top"><b>' + esc(w.n) + (w.opt ? ' (' + esc(w.opt) + ')' : '') + '</b><span class="ost">Waiting</span></div><span class="muted">' + esc(w.contact) + (w.at ? ' · you, just now' : '') + '</span></div>'; }).join('') : '<p class="muted">Nobody is waiting.</p>') +
          '<p class="small muted">When it’s back, one tap messages everyone on the list.</p>' + ['teh', 'pineapple-tarts'].filter(function (id) { return !o.back[id]; }).map(function (id) { return '<button class="btn btn--sm" type="button" data-back="' + id + '">' + esc(prod(id).n) + ' is back: notify everyone</button>'; }).join(' '),
        festive: CUTOFF.map(function (c) { var w = daysUntil(c.west), e2 = daysUntil(c.east); return '<div class="ocard"><b>' + esc(c.n) + '</b><span>West Malaysia: order by ' + fmtDay(c.west) + (w >= 0 ? ' (' + w + ' days)' : ' (closed)') + '</span><span>East Malaysia: order by ' + fmtDay(c.east) + (e2 >= 0 ? ' (' + e2 + ' days)' : ' (closed)') + '</span></div>'; }).join('') + '<p class="small muted">These dates show on the home page, the product pages and at checkout, so customers know when it’s too late.</p>'
      };
      root.innerHTML = '<div class="phone"><div class="phone__screen"><div class="phone__top"><small>Dulang &amp; Daun · ' + fmtDay(today()) + '</small><h3>' + (toShip ? toShip + ' order' + (toShip === 1 ? '' : 's') + ' to pack and ship' : 'All shipped') + '</h3><div class="otabs" role="tablist">' + [['orders', 'Orders'], ['stock', 'Stock'], ['waitlist', 'Waiting list'], ['festive', 'Cut-offs']].map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'is-on' : '') + '" aria-selected="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="opane">' + panes[tab] + '</div></div></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-tab]'))) { tab = x.getAttribute('data-tab'); paint(); return; }
      if ((x = e.target.closest('[data-next]'))) {
        var no = x.getAttribute('data-next'), st = load('ost', {}), list = load('orders', []), cur = (allOrders().filter(function (y) { return y.no === no; })[0] || {}).st || 'New';
        var nx = OST[Math.min(OST.length - 1, OST.indexOf(cur) + 1)]; st[no] = nx; save('ost', st);
        if (nx === 'Shipped') { list.forEach(function (y) { if (y.no === no && !y.trk) y.trk = 'DEMO-TRK-' + Math.floor(10000 + Math.random() * 89999); }); save('orders', list); toast('Shipped. The customer gets the tracking number by WhatsApp and email (demo: nothing is sent).'); }
        paint(); return;
      }
      if ((x = e.target.closest('[data-back]'))) {
        var id = x.getAttribute('data-back'), o = owner(); o.back[id] = 1; delete o.out[id]; setOwner(o);
        var p = prod(id), msg = 'Good news from Dulang & Daun (demo website): ' + p.n + ' is back in stock. Order here: ' + location.href.replace(/owner\.html.*$/, 'product.html?p=' + id);
        openSheet('<div class="sheet__body" style="padding-bottom:18px"><h2 id="sheet-title">Back in stock</h2><p class="muted">Everyone on the waiting list gets this message once (demo: nothing is sent):</p><div class="waprev">' + esc(msg) + '</div></div>');
        paint(); return;
      }
    });
    root.addEventListener('change', function (e) {
      var x = e.target; if (!x.hasAttribute('data-out')) return;
      var id = x.getAttribute('data-out'), o = owner();
      if (x.checked) { o.out[id] = 1; delete o.back[id]; } else { delete o.out[id]; o.back[id] = 1; }
      setOwner(o); toast(prod(id).n + (x.checked ? ' now shows “Notify me”.' : ' is back on sale.'));
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      if (!confirm('Reset the demo? This clears the cart, orders, waiting list and owner changes made in this browser.')) return;
      ['owner', 'orders', 'cart', 'checkout', 'notify', 'ost', 'seq', 'region'].forEach(function (k) { try { localStorage.removeItem('dd_' + k); } catch (err) { /* ignore */ } });
      tab = 'orders'; paint(); updateCount(); toast('Demo reset.');
    });
    paint();
  }

  // ------------------------------------------------------------------ start
  var PAGES = { home: pageHome, shop: pageShop, product: pageProduct, hamper: pageHamper, checkout: pageCheckout, track: pageTrack, corporate: pageCorporate, owner: pageOwner };
  document.addEventListener('DOMContentLoaded', function () {
    shared();
    var fn = PAGES[document.body.getAttribute('data-page')];
    if (fn) fn();
    window.addEventListener('storage', function (e) { if (e.key === 'dd_owner') location.reload(); });
  });
})();
