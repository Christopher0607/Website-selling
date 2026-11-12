/* Butter & Lantern — demo festive pre-order page, by Cartsmith Studio (2026-11-12). A fictional home bakery.
   One page for every festival: the switch at the top re-dresses it (colours, pattern, words, sets, dates).
   Orders go to WhatsApp already filled in; nothing is charged or sent from this demo. State stays in this browser (bl_*). */
(function () {
  'use strict';
  // dates are Malaysia dates. CNY 2027 = 6 Feb; Hari Raya 2027 expected 10 Mar (subject to the official announcement).
  var FESTS = {
    cny: { name: 'Chinese New Year', dot: '#c8302c', theme: '#9d1c1f', kicker: 'Chinese New Year 2027 · pre-orders open', h1: 'Chinese New Year cookies, <em>baked to order</em>',
      lead: 'Pineapple tarts, kuih bangkit and butter cookies, baked in small batches the week you collect. Choose your sets, pick a day, and your order arrives on our WhatsApp.',
      cutoff: '2027-01-31', from: '2027-02-01', to: '2027-02-05', hero: 'cny-hero', when: 'Chinese New Year falls on 6 February 2027.',
      sets: [
        { id: 'tarts', n: 'Pineapple Tarts', d: '40 pieces. Buttery pastry, pineapple jam cooked for five hours.', p: 68, img: 'pineapple-tarts', total: 80, left: 23 },
        { id: 'bangkit', n: 'Kuih Bangkit', d: '300 g jar. Melts the moment it touches your tongue.', p: 36, img: 'kuih-bangkit', total: 60, left: 31 },
        { id: 'butter', n: 'Butter Cookies', d: '350 g jar, piped by hand.', p: 32, img: 'butter-cookies', total: 80, left: 44 },
        { id: 'set', n: 'Prosperity Gift Set', d: 'Tarts, bangkit and butter cookies in a red gift box with a card.', p: 128, img: 'cookie-jars', total: 40, left: 9 }
      ] },
    raya: { name: 'Hari Raya', dot: '#13755a', theme: '#0d5a45', kicker: 'Hari Raya Aidilfitri 2027 · pre-orders open', h1: 'Kuih raya for the whole <em>open house</em>',
      lead: 'Tart nenas, biskut dahlia, semperit and trays of kuih, made fresh for the week before Raya. Choose your sets, pick a day, and your order arrives on our WhatsApp.',
      cutoff: '2027-03-03', from: '2027-03-04', to: '2027-03-08', hero: 'raya-hero', when: 'Hari Raya Aidilfitri is expected on 10 March 2027, subject to the official announcement.',
      sets: [
        { id: 'jars', n: 'Kuih Raya Jars, set of 4', d: 'Tart nenas, biskut dahlia, semperit and kuih bangkit.', p: 88, img: 'cookie-jars', total: 100, left: 38 },
        { id: 'tray', n: 'Kuih Tray, 40 pieces', d: 'Five kinds of kuih for the open house.', p: 95, img: 'kuih-tray', total: 40, left: 14 },
        { id: 'pandan', n: 'Pandan Star Cookies', d: '300 g jar, with fresh pandan juice.', p: 32, img: 'pandan-stars', total: 80, left: 51 },
        { id: 'box', n: 'Open House Box', d: 'Cookies, kuih and a jar of sambal in a green and gold box.', p: 168, img: 'raya-box', total: 30, left: 7 }
      ] },
    xmas: { name: 'Christmas', dot: '#b3263a', theme: '#1d4a36', kicker: 'Christmas 2026 · pre-orders open', h1: 'Christmas bakes, <em>ready to share</em>',
      lead: 'Chocolate Christmas cake, slow-proved panettone and a fruit cake soaked for six weeks. Choose your bakes, pick a day, and your order arrives on our WhatsApp.',
      cutoff: '2026-12-19', from: '2026-12-21', to: '2026-12-24', hero: 'xmas-hero', when: 'Collect in the days before Christmas Eve.',
      sets: [
        { id: 'choc', n: 'Chocolate Christmas Cake', d: 'Dark chocolate, orange and spice. Serves 10.', p: 98, img: 'choc-cake', total: 40, left: 12 },
        { id: 'panettone', n: 'Panettone', d: 'Proved for two days, with candied orange and raisins.', p: 78, img: 'panettone', total: 50, left: 26 },
        { id: 'fruit', n: 'Christmas Fruit Cake', d: '1 kg, soaked for six weeks.', p: 88, img: 'fruit-cake', total: 40, left: 17 },
        { id: 'box', n: 'Christmas Gift Box', d: 'Fruit cake slices, cookies and a card, ready to give.', p: 138, img: 'xmas-box', total: 30, left: 6 }
      ] },
    deepavali: { name: 'Deepavali', dot: '#f39c24', theme: '#4a1d6b', kicker: 'Deepavali 2027 · coming soon', h1: 'Deepavali sweets, <em>made with ghee and patience</em>',
      lead: 'Motichoor laddoo, barfi and a sweets platter for visiting family. Pre-orders open about four weeks before Deepavali; leave your WhatsApp number and we will tell you the day they open.',
      soon: true, hero: 'deepavali-hero', when: 'We announce the dates about four weeks before the festival.',
      sets: [
        { id: 'laddoo', n: 'Motichoor Laddoo', d: 'Box of 12, with saffron and cardamom.', p: 45, img: 'laddoo', total: 60, left: 60 },
        { id: 'barfi', n: 'Laddoo & Barfi Tower', d: 'Besan laddoo and milk barfi, 30 pieces.', p: 88, img: 'barfi', total: 40, left: 40 },
        { id: 'platter', n: 'Festival Sweets Platter', d: 'Six kinds of sweets for 15 to 20 guests.', p: 128, img: 'sweets-plate', total: 30, left: 30 }
      ] }
  };
  var ORDER = ['cny', 'raya', 'xmas', 'deepavali'];
  var DELIVERY = { fee: 15, free: 200, area: 'Klang Valley' };
  var TIMES = ['10am–1pm', '2pm–6pm'];
  var WA = 'https://wa.me/?text=';

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rm(n) { return 'RM' + (Math.round(n * 100) / 100).toFixed(2); }
  function load(k, d) { try { var v = localStorage.getItem('bl_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  function today() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  var DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDay(s) { var d = new Date(s + 'T00:00:00Z'); return DAY[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MON[d.getUTCMonth()]; }
  function phoneOk(v) { return /^\+?\d[\d\s-]{8,14}$/.test(String(v || '').trim()); }
  function seq() { var n = load('seq', 500) + 1; save('seq', n); return n; }
  function toast(t) { var el = $('[data-toast]'); el.textContent = t; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('is-on'); }, 2600); }
  var WAICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.8 8.6c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.3.5.8 1.1 1.3 1.6.6.5 1.2.9 1.8 1.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.4 0 .3-.1 1-.6 1.4-.4.4-1.2.8-2 .7-.8-.1-2-.5-3.4-1.6-1.6-1.3-2.5-2.9-2.8-3.5-.3-.7-.4-1.6 0-2.4z" fill="currentColor"/></svg>';

  function defaultFest() { var t = today(), best = null; ORDER.forEach(function (k) { var f = FESTS[k]; if (!f.soon && f.cutoff >= t && (!best || f.cutoff < FESTS[best].cutoff)) best = k; }); return best || 'cny'; }
  var cur = new URLSearchParams(location.search).get('fest');
  if (!FESTS[cur]) cur = defaultFest();
  var S = { qty: {}, mode: 'collect', date: '', time: TIMES[0], name: '', phone: '', addr: '', pc: '' };
  function F() { return FESTS[cur]; }
  function leftOf(s) { var l = load('left', {}); return l[cur] && typeof l[cur][s.id] === 'number' ? l[cur][s.id] : s.left; }
  function countdown(f) {
    var ms = Date.parse(f.cutoff + 'T23:59:00+08:00') - Date.now();
    if (ms <= 0) return '<p><b>Pre-orders for ' + esc(f.name) + ' have closed.</b></p>';
    return '<div class="count" aria-label="Time left to order"><div><b>' + Math.floor(ms / 864e5) + '</b><small>days</small></div><div><b>' + Math.floor(ms % 864e5 / 36e5) + '</b><small>hours</small></div><div><b>' + Math.floor(ms % 36e5 / 6e4) + '</b><small>minutes</small></div></div>';
  }
  function dates(f) { var out = []; if (f.soon) return out; for (var d = f.from; d <= f.to; d = addDays(d, 1)) out.push(d); return out; }

  function paintBar() {
    $('[data-fests]').innerHTML = ORDER.map(function (k) { return '<button type="button" data-fest="' + k + '" class="' + (k === cur ? 'is-on' : '') + '" aria-pressed="' + (k === cur) + '"><i style="background:' + FESTS[k].dot + '"></i>' + FESTS[k].name + '</button>'; }).join('');
  }
  function paintHero() {
    var f = F();
    $('[data-hero]').innerHTML = '<div><p class="kicker">' + esc(f.kicker) + '</p><h1>' + f.h1 + '</h1><p class="lead">' + esc(f.lead) + '</p>' + (f.soon ? '' : countdown(f)) +
      '<div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" href="#sets">' + (f.soon ? 'See what is coming' : 'Choose your sets') + '</a><a class="btn btn--ghost" href="' + WA + encodeURIComponent('Hi Butter & Lantern (demo website), a question about your ' + f.name + ' bakes: ') + '" target="_blank" rel="noopener">' + WAICON + 'Ask on WhatsApp</a></div>' +
      '<div class="chips">' + (f.soon ? '<span>Dates announced about four weeks before</span>' : '<span>Order by ' + fmtDay(f.cutoff) + '</span><span>Collect ' + fmtDay(f.from) + ' to ' + fmtDay(f.to) + '</span><span>Delivery in the ' + DELIVERY.area + '</span>') + '</div></div>' +
      '<div class="hero__img"><img src="img/' + f.hero + '.webp" alt="" width="1600" height="900"><div class="hero__badge">' + (f.soon ? '<span><b>Soon</b>pre-orders</span>' : '<span>Order by<b>' + fmtDay(f.cutoff).slice(4) + '</b></span>') + '</div></div>';
  }
  function paintSets() {
    var f = F();
    $('[data-sets-head]').innerHTML = '<p class="kicker">' + esc(f.name) + ' sets</p><h2>' + (f.soon ? 'Coming this Deepavali' : 'Made in small batches, so they do run out') + '</h2><p class="muted">' + esc(f.when) + '</p>';
    $('[data-sets]').innerHTML = f.sets.map(function (s) {
      var left = leftOf(s), out = left <= 0, q = S.qty[s.id] || 0;
      return '<article class="set' + (out ? ' is-out' : '') + '"><img src="img/' + s.img + '.webp" alt="' + esc(s.n) + ' (placeholder photo)" loading="lazy" width="700" height="525"><div class="set__body"><h3>' + esc(s.n) + '</h3><p>' + esc(s.d) + '</p>' +
        (f.soon ? '' : '<div class="left"><span>' + (out ? 'Sold out' : 'Only ' + left + ' left') + '</span><span>of ' + s.total + '</span></div><div class="bar"><i style="width:' + Math.round(100 * Math.max(0, left) / s.total) + '%"></i></div>') +
        '<div class="set__foot"><span class="price">' + rm(s.p) + '</span>' + (f.soon ? '<span class="tag">Opens soon</span>' : out ? '<span class="tag">Sold out</span>' : '<div class="qty"><button type="button" data-q="' + s.id + ':-1" aria-label="One less ' + esc(s.n) + '">−</button><output>' + q + '</output><button type="button" data-q="' + s.id + ':1" aria-label="One more ' + esc(s.n) + '">+</button></div>') + '</div></div></article>';
    }).join('');
  }
  function calc() {
    var f = F(), lines = f.sets.filter(function (s) { return S.qty[s.id]; }).map(function (s) { return { s: s, q: S.qty[s.id] }; });
    var sub = lines.reduce(function (a, l) { return a + l.s.p * l.q; }, 0), fee = S.mode === 'delivery' && sub < DELIVERY.free ? DELIVERY.fee : 0;
    return { lines: lines, sub: sub, fee: fee, total: sub + fee };
  }
  function paintOrder() {
    var f = F(), el = $('[data-order]');
    if (f.soon) {
      el.innerHTML = '<h2>Be the first to know</h2><p class="muted">Pre-orders for ' + esc(f.name) + ' are not open yet. Leave your WhatsApp number and we will message you once, on the day they open.</p><form data-notify><div class="field"><label for="n-phone">WhatsApp number</label><input class="input" id="n-phone" name="phone" type="tel" placeholder="012-345 6789" required></div><button class="btn btn--brand btn--block" type="submit">Tell me when it opens</button></form><p class="small muted" style="margin-top:10px">Demo: nothing is sent.</p>';
      return;
    }
    var ds = dates(f); if (ds.indexOf(S.date) < 0) S.date = ds[0];
    var c = calc();
    el.innerHTML = '<h2>Your order</h2>' + (c.lines.length ? '<div class="lines">' + c.lines.map(function (l) { return '<div class="line"><span>' + l.q + ' × ' + esc(l.s.n) + '</span><b>' + rm(l.s.p * l.q) + '</b></div>'; }).join('') + '</div>' : '<p class="muted">Add a set with the + buttons.</p>') +
      '<div class="field"><span>Collect or delivery</span><div class="seg"><button type="button" data-mode="collect" class="' + (S.mode === 'collect' ? 'is-on' : '') + '">Collect</button><button type="button" data-mode="delivery" class="' + (S.mode === 'delivery' ? 'is-on' : '') + '">Delivery</button></div></div>' +
      '<div class="field"><span>' + (S.mode === 'collect' ? 'Collection day' : 'Delivery day') + '</span><div class="days">' + ds.map(function (d) { return '<button type="button" class="day' + (d === S.date ? ' is-on' : '') + '" data-day="' + d + '"><small>' + DAY[new Date(d + 'T00:00:00Z').getUTCDay()] + '</small><b>' + d.slice(8).replace(/^0/, '') + '</b><small>' + MON[+d.slice(5, 7) - 1] + '</small></button>'; }).join('') + '</div></div>' +
      '<div class="field"><span>Time</span><div class="seg">' + TIMES.map(function (t) { return '<button type="button" data-time="' + t + '" class="' + (S.time === t ? 'is-on' : '') + '">' + t + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><label for="o-name">Name</label><input class="input" id="o-name" data-k="name" value="' + esc(S.name) + '" autocomplete="name"></div><div class="field"><label for="o-phone">Mobile</label><input class="input" id="o-phone" data-k="phone" type="tel" placeholder="012-345 6789" value="' + esc(S.phone) + '" autocomplete="tel"></div>' +
      (S.mode === 'delivery' ? '<div class="field"><label for="o-addr">Delivery address</label><input class="input" id="o-addr" data-k="addr" value="' + esc(S.addr) + '" placeholder="Unit, street, area, postcode"></div><div class="note">Delivery in the ' + DELIVERY.area + ': ' + rm(DELIVERY.fee) + ', free over ' + rm(DELIVERY.free) + '.</div>' : '<div class="note">Collect at our kitchen in Petaling Jaya (demo address). We send the exact location with the confirmation.</div>') +
      (c.fee ? '<div class="line"><span>Delivery</span><b>' + rm(c.fee) + '</b></div>' : '') + '<div class="total"><span>Total</span><span>' + rm(c.total) + '</span></div>' +
      '<button class="btn btn--wa btn--block" type="button" data-send style="margin-top:10px">' + WAICON + 'Send my order on WhatsApp</button><p class="small muted" style="margin-top:10px">We confirm on WhatsApp and send DuitNow or bank details. Demo: nothing is sent or charged.</p>';
  }
  function paintFaq() {
    var f = F();
    var qa = f.soon ? [['When do Deepavali pre-orders open?', 'About four weeks before Deepavali. Leave your WhatsApp number above and we will tell you the day.'], ['Do you deliver?', 'Yes, in the Klang Valley, RM15 or free over RM200.']] :
      [['What is the last day to order?', fmtDay(f.cutoff) + ', or earlier if a set sells out. The counts on this page are live.'], ['When can I collect?', 'Any day from ' + fmtDay(f.from) + ' to ' + fmtDay(f.to) + ', 10am–1pm or 2pm–6pm.'], ['How do I pay?', 'We confirm your order on WhatsApp and send DuitNow or bank details. Your sets are held once paid.'], ['Can I change my order?', 'Yes, until two days before your collection day. Just reply on WhatsApp.']];
    $('[data-faq]').innerHTML = qa.map(function (x) { return '<details><summary>' + esc(x[0]) + '</summary><p>' + esc(x[1]) + '</p></details>'; }).join('');
  }
  function apply(k, first) {
    cur = k; S.qty = {}; S.date = '';
    document.body.setAttribute('data-fest', k);
    var m = $('meta[name=theme-color]'); if (m) m.setAttribute('content', FESTS[k].theme);
    document.title = 'Butter & Lantern — ' + FESTS[k].name + ' pre-orders (demo website)';
    if (!first) history.replaceState(null, '', '?fest=' + k);
    paintBar(); paintHero(); paintSets(); paintOrder(); paintFaq();
  }
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-fest]')) && t.tagName === 'BUTTON') { apply(t.getAttribute('data-fest')); toast('This page, dressed for ' + FESTS[cur].name + '.'); return; }
    if ((t = e.target.closest('[data-q]'))) {
      var pr = t.getAttribute('data-q').split(':'), s = F().sets.filter(function (x) { return x.id === pr[0]; })[0];
      var q = Math.max(0, Math.min(leftOf(s), (S.qty[pr[0]] || 0) + +pr[1]));
      if (q) S.qty[pr[0]] = q; else delete S.qty[pr[0]];
      if (+pr[1] > 0 && q === leftOf(s) && (S.qty[pr[0]] || 0) === q && q === leftOf(s)) { /* at the limit */ }
      paintSets(); paintOrder(); return;
    }
    if ((t = e.target.closest('[data-mode]'))) { S.mode = t.getAttribute('data-mode'); paintOrder(); return; }
    if ((t = e.target.closest('[data-day]'))) { S.date = t.getAttribute('data-day'); paintOrder(); return; }
    if ((t = e.target.closest('[data-time]'))) { S.time = t.getAttribute('data-time'); paintOrder(); return; }
    if (e.target.closest('[data-send]')) send();
  });
  document.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k) S[k] = e.target.value; });
  document.addEventListener('submit', function (e) {
    if (!e.target.matches('[data-notify]')) return;
    e.preventDefault();
    var v = e.target.phone.value.trim();
    if (!phoneOk(v)) { toast('Add a WhatsApp number, e.g. 012-345 6789.'); return; }
    var w = load('notify', []); w.unshift({ fest: cur, phone: v, at: Date.now() }); save('notify', w.slice(0, 20));
    $('[data-order]').innerHTML = '<h2>You are on the list</h2><p class="muted">We will WhatsApp ' + esc(v) + ' once, on the day ' + esc(F().name) + ' pre-orders open. Demo: nothing is sent.</p>';
  });
  function send() {
    var f = F(), c = calc(), err = !c.lines.length ? 'Add at least one set.' : !S.name.trim() ? 'Add your name.' : !phoneOk(S.phone) ? 'Add a mobile number.' : S.mode === 'delivery' && !S.addr.trim() ? 'Add the delivery address.' : '';
    if (err) { toast(err); return; }
    var no = 'BL-' + seq();
    var L = [f.name + ' pre-order (demo website): Butter & Lantern', no + ' · ' + (S.mode === 'collect' ? 'Collect' : 'Delivery') + ' · ' + fmtDay(S.date) + ', ' + S.time, ''];
    c.lines.forEach(function (l) { L.push(l.q + ' × ' + l.s.n + ' — ' + rm(l.s.p * l.q)); });
    if (c.fee) L.push('Delivery — ' + rm(c.fee));
    L.push('Total: ' + rm(c.total), '', 'Name: ' + S.name.trim() + ' · ' + S.phone.trim()); if (S.mode === 'delivery') L.push('Address: ' + S.addr.trim());
    var text = L.join('\n');
    var left = load('left', {}); left[cur] = left[cur] || {}; c.lines.forEach(function (l) { left[cur][l.s.id] = leftOf(l.s) - l.q; }); save('left', left);
    var orders = load('orders', []); orders.unshift({ no: no, fest: cur, total: c.total, at: Date.now() }); save('orders', orders.slice(0, 20));
    S.qty = {}; paintSets();
    $('[data-order]').innerHTML = '<h2>One more step</h2><p class="muted">Your order ' + no + ' is ready. Press the button to send it on WhatsApp; this is the message we receive:</p><div class="waprev">' + esc(text) + '</div><a class="btn btn--wa btn--block" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + WAICON + 'Open WhatsApp</a><p class="small muted" style="margin-top:10px">Demo: WhatsApp opens without a number, so you choose any chat. On a real page it opens the bakery’s own number.</p><button class="btn btn--sm btn--brand" type="button" data-again style="margin-top:6px">Start another order</button>';
    $('[data-order]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-again]')) paintOrder(); });
  document.addEventListener('DOMContentLoaded', function () {
    apply(cur, true);
    setInterval(function () { var el = $('[data-hero] .count'); if (el && !F().soon) el.outerHTML = countdown(F()); }, 30000);
  });
})();
