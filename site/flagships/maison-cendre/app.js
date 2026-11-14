/* Maison Cendre — demo website for a boutique restaurant, by Cartsmith Studio (2026-11-12).
   A fictional restaurant. Everything runs in this browser: no real reservations, orders or payments, nothing is sent.
   Bookings, takeaway orders and the owner's changes stay in this browser only (localStorage, keys mc_*). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ data (demo)
  // lunch Fri–Sun 12:00–2:30pm, dinner Tue–Sun 6:00–11:00pm, closed Monday (minutes from midnight, Malaysia time)
  var HOURS = { 0: [[720, 870], [1080, 1380]], 1: [], 2: [[1080, 1380]], 3: [[1080, 1380]], 4: [[1080, 1380]], 5: [[720, 870], [1080, 1380]], 6: [[720, 870], [1080, 1380]] };
  var TASTING = [
    { id: 'cendre', n: 'Cendre', sub: 'Eight courses', p: 388, pair: 260, tea: 120, note: 'Every evening, for the whole table.',
      courses: [['Sourdough, cultured butter', 'Baked this afternoon, butter churned in-house'], ['Hokkaido scallop', 'Burnt leek, brown butter, finger lime'], ['Embered beetroot', 'Smoked labneh, pickled shallot, rye crumb'], ['Barramundi', 'Beurre blanc, charred cabbage, trout roe'], ['Aged duck', 'Plum, five-spice jus, roasted turnip'], ['Wagyu striploin over embers', 'Bone-marrow jus, smoked onion'], ['Sorbet and cream', 'Calamansi, buttermilk'], ['Dark chocolate', 'Miso caramel, smoked salt']] },
    { id: 'petit', n: 'Petit', sub: 'Five courses', p: 238, pair: 160, tea: 90, note: 'Tuesday to Thursday evenings, and at lunch.',
      courses: [['Sourdough, cultured butter', 'Baked this afternoon'], ['Embered beetroot', 'Smoked labneh, rye crumb'], ['Barramundi or aged duck', 'Your choice on the night'], ['Charred cabbage', 'Anchovy butter, lemon'], ['Dark chocolate', 'Miso caramel, smoked salt']] }
  ];
  var CATS = [['start', 'To begin'], ['main', 'From the embers'], ['side', 'Alongside'], ['sweet', 'To finish'], ['drink', 'To drink']];
  var MENU = [
    { id: 'bread', cat: 'start', n: 'Sourdough & cultured butter', d: 'Baked this afternoon; butter churned in-house.', p: 18, img: 'bread', tags: ['v'], take: true },
    { id: 'scallop', cat: 'start', n: 'Hokkaido scallop crudo', d: 'Burnt leek, brown butter, finger lime.', p: 58, img: 'scallop', tags: ['sig', 'gf'] },
    { id: 'scallops', cat: 'start', n: 'Seared scallops', d: 'Smoked chilli butter, charred corn.', p: 62, img: 'scallops', tags: ['gf'] },
    { id: 'beet', cat: 'start', n: 'Embered beetroot', d: 'Smoked labneh, pickled shallot, rye crumb.', p: 36, tags: ['v'] },
    { id: 'fish', cat: 'main', n: 'Barramundi', d: 'Beurre blanc, charred cabbage, trout roe.', p: 88, img: 'fish', tags: ['gf'], take: true },
    { id: 'salmon', cat: 'main', n: 'Salmon & clams', d: 'Spinach, clam velouté, dill oil.', p: 78, img: 'salmon', tags: [], take: true },
    { id: 'duck', cat: 'main', n: 'Aged duck breast', d: 'Plum, five-spice jus, roasted turnip.', p: 96, img: 'duck', tags: ['sig'], take: true,
      o: [{ n: 'Cooked', one: true, def: 0, v: [['Pink', 0], ['Medium', 0]] }] },
    { id: 'wagyu', cat: 'main', n: 'Wagyu striploin, 200 g', d: 'Over embers, with bone-marrow jus and smoked onion.', p: 220, img: 'wagyu', tags: ['sig', 'gf'], take: true,
      o: [{ n: 'Cooked', one: true, def: 1, v: [['Rare', 0], ['Medium rare', 0], ['Medium', 0]] }, { n: 'Sauce', one: true, def: 0, v: [['Bone-marrow jus', 0], ['Green peppercorn', 0], ['Chimichurri', 0]] }, { n: 'Add', v: [['Truffle butter', 28], ['Seared foie gras', 58]] }] },
    { id: 'cabbage', cat: 'side', n: 'Charred cabbage', d: 'Anchovy butter, lemon.', p: 24, tags: ['gf'], take: true },
    { id: 'potatoes', cat: 'side', n: 'Ember potatoes', d: 'Crème fraîche, chives.', p: 22, tags: ['v', 'gf'], take: true },
    { id: 'greens', cat: 'side', n: 'Garden leaves', d: 'Shallot vinaigrette, toasted seeds.', p: 18, tags: ['v', 'gf'] },
    { id: 'chocolate', cat: 'sweet', n: 'Dark chocolate', d: 'Miso caramel, smoked salt.', p: 38, img: 'chocolate', tags: ['sig'], take: true },
    { id: 'sorbet', cat: 'sweet', n: 'Sorbet & cream', d: 'Calamansi, buttermilk, almond.', p: 28, img: 'sorbet', tags: ['nuts'] },
    { id: 'rhubarb', cat: 'sweet', n: 'Rhubarb', d: 'Almond crumble, vanilla ice cream.', p: 34, img: 'rhubarb', tags: ['nuts'], take: true },
    { id: 'wine', cat: 'drink', n: 'Wine by the glass', d: 'Ask for tonight’s pours, from RM48.', p: 48, img: 'wine', tags: [] },
    { id: 'soda', cat: 'drink', n: 'House sodas', d: 'Lemongrass and ginger, or smoked pineapple.', p: 16, tags: ['v'] },
    { id: 'tea', cat: 'drink', n: 'Loose-leaf tea', d: 'Oolong, jasmine or Ceylon, by the pot.', p: 18, tags: ['v'] }
  ];
  var TAGS = { v: 'Vegetarian', gf: 'Gluten-free', nuts: 'Contains nuts', sig: 'Signature' };
  var SEATS = {
    room: { n: 'Dining room', min: 1, max: 8, desc: 'À la carte or a tasting menu. Dinner Tuesday to Sunday, lunch Friday to Sunday.' },
    counter: { n: 'Chef’s counter', min: 1, max: 4, desc: 'Eight seats facing the fire, Cendre menu only. Tuesday to Saturday, 6:00pm and 8:45pm.' },
    salon: { n: 'Private salon', min: 8, max: 14, desc: 'A private room for 8 to 14 guests. Minimum spend RM3,000.' }
  };
  var DIETS = ['Vegetarian', 'Pescatarian', 'No beef', 'Shellfish allergy', 'Nut allergy', 'Gluten-free'];
  // seasonal menus (Malaysia dates). Chinese New Year 2027 = 6 Feb.
  var SEASONS = [
    { id: 'xmas', name: 'Christmas', cutoff: '2026-12-20', from: '2026-12-24', to: '2026-12-25', img: 'festive',
      blurb: 'A six-course Christmas menu on the 24th and 25th, and a roast to carve at home.',
      items: [
        { id: 'xmas-dinner', kind: 'dine', n: 'Christmas dinner, six courses', unit: 'per guest', p: 428, img: 'plating', total: 60, left: 18, dep: 0.5, has: ['Oysters, shallot mignonette', 'Embered beetroot, smoked labneh', 'Barramundi, beurre blanc', 'Wagyu over embers', 'Christmas pudding, brandy butter', 'Petits fours'] },
        { id: 'xmas-roast', kind: 'take', n: 'A roast to carve at home, serves 6', unit: 'per set', p: 688, img: 'embers', total: 20, left: 7, dep: 0.5, has: ['Two aged ducks or a wagyu rump', 'Ember potatoes, charred cabbage', 'Jus, sourdough, cultured butter'] }
      ] },
    { id: 'cny', name: 'Chinese New Year', cutoff: '2027-02-01', from: '2027-02-04', to: '2027-02-07', img: 'festive-2',
      blurb: 'A reunion menu from the eve to the first days of the new year (Chinese New Year falls on 6 February 2027), and a reunion feast to take home.',
      items: [
        { id: 'cny-dinner', kind: 'dine', n: 'Reunion dinner, seven courses', unit: 'per guest', p: 458, img: 'room', total: 80, left: 23, dep: 0.5, has: ['Lo hei with smoked salmon and pomelo', 'Scallop in superior broth', 'Barramundi, ginger beurre blanc', 'Aged duck, plum', 'Wagyu over embers', 'Glutinous rice, lap cheong', 'Osmanthus jelly, mandarin'] },
        { id: 'cny-feast', kind: 'take', n: 'Reunion feast to take home, serves 6', unit: 'per set', p: 888, img: 'spread', total: 30, left: 11, dep: 0.5, has: ['Lo hei', 'Aged duck', 'Barramundi', 'Glutinous rice', 'Osmanthus jelly'] }
      ] },
    { id: 'vday', name: 'Valentine’s Day', cutoff: '2027-02-12', from: '2027-02-14', to: '2027-02-14', img: 'counter',
      blurb: 'Eight courses for two at a candlelit table, with a glass of champagne on arrival.',
      items: [
        { id: 'vday-dinner', kind: 'dine', n: 'Valentine’s dinner for two', unit: 'per couple', p: 888, img: 'chocolate', total: 24, left: 6, dep: 1, has: ['Champagne on arrival', 'Eight courses from the Cendre menu', 'Rose and lychee pre-dessert', 'Petits fours to take home'] }
      ] }
  ];
  var ZONES = [
    { re: /^5\d{4}$/, fee: 12, eta: '40–60 min', area: 'Kuala Lumpur' },
    { re: /^4[67]\d{3}$/, fee: 15, eta: '45–70 min', area: 'Petaling Jaya and Subang' }
  ];
  var DELIVERY_MIN = 80, FREE_DELIVERY = 300, PROMO = { code: 'CENDRE10', pct: 10 };
  var ADDRESS = 'Level 1, 18 Jalan Demo, 50250 Kuala Lumpur (demo address)';
  var MAPS = 'https://www.google.com/maps/search/?api=1&query=Kuala+Lumpur';
  var WA = 'https://wa.me/?text=';

  // ------------------------------------------------------------------ helpers
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rm(n) { var v = Math.round(n * 100) / 100; return 'RM' + (v % 1 ? v.toFixed(2) : v.toLocaleString('en-US')); }
  function load(k, d) { try { var v = localStorage.getItem('mc_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('mc_' + k, JSON.stringify(v)); } catch (e) { /* private mode: this page still works */ } }
  function my() { return new Date(Date.now() + 8 * 3600e3); }
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
  function seq() { var n = load('seq', 3100) + 1; save('seq', n); return n; }
  function phoneOk(v) { return /^\+?\d[\d\s-]{8,14}$/.test(String(v || '').trim()); }
  function dayBtn(d, on, attr, label) { return '<button type="button" class="day' + (on ? ' is-on' : '') + '" ' + attr + '="' + d + '"><small>' + (label || DAY[dowOf(d)]) + '</small><b>' + d.slice(8).replace(/^0/, '') + '</b><small>' + MON[+d.slice(5, 7) - 1] + '</small></button>'; }
  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.8 8.6c.3-.6.6-.6.9-.6h.6c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.3.5.8 1.1 1.3 1.6.6.5 1.2.9 1.8 1.1.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.4 0 .3-.1 1-.6 1.4-.4.4-1.2.8-2 .7-.8-.1-2-.5-3.4-1.6-1.6-1.3-2.5-2.9-2.8-3.5-.3-.7-.4-1.6 0-2.4z" fill="currentColor"/></svg>'
  };
  function toast(t) { var el = $('[data-toast]'); if (!el) return; el.textContent = t; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('is-on'); }, 2800); }

  // ------------------------------------------------------------------ owner settings, bookings, bag
  function owner() { var o = load('owner', {}); o.out = o.out || {}; o.price = o.price || {}; o.left = o.left || {}; o.status = o.status || 'auto'; return o; }
  function setOwner(o) { save('owner', o); }
  function item(id) { for (var i = 0; i < MENU.length; i++) if (MENU[i].id === id) return MENU[i]; return null; }
  function priceOf(it) { var o = owner(); return typeof o.price[it.id] === 'number' ? o.price[it.id] : it.p; }
  function isOut(id) { return !!owner().out[id]; }
  function fitem(id) { for (var i = 0; i < SEASONS.length; i++) for (var j = 0; j < SEASONS[i].items.length; j++) if (SEASONS[i].items[j].id === id) return { s: SEASONS[i], it: SEASONS[i].items[j] }; return null; }
  function leftOf(fi) { var o = owner(); return typeof o.left[fi.id] === 'number' ? o.left[fi.id] : fi.left; }
  function bookings() { return load('bookings', []); }
  function bag() { return load('bag', []); }
  function setBag(b) { save('bag', b); updateBag(); }
  function bagCount() { return bag().reduce(function (a, l) { return a + l.qty; }, 0); }
  function bagSub() { return bag().reduce(function (a, l) { return a + l.unit * l.qty; }, 0); }

  // ------------------------------------------------------------------ hours and status
  function status() {
    var o = owner(), t = today(), m = nowMin(), hrs = HOURS[dowOf(t)];
    if (o.status === 'closed') return { cls: 'closed', text: 'Closed tonight · private event', long: 'Closed tonight for a private event. Reservations for other days are open.' };
    for (var i = 0; i < hrs.length; i++) {
      var a = hrs[i][0], b = hrs[i][1];
      if (m >= a && m < b) {
        if (o.status === 'full') return { cls: 'busy', text: 'Open · fully booked', long: 'Open now until ' + fmtTime(b) + '. Tonight is fully booked; join the waitlist on the reservations page.' };
        return { cls: 'open', text: 'Open until ' + fmtTime(b), long: 'Open now until ' + fmtTime(b) + '.' };
      }
    }
    for (var j = 0; j < hrs.length; j++) if (hrs[j][0] > m) return { cls: 'closed', text: 'Opens ' + fmtTime(hrs[j][0]), long: 'Closed right now. We open today at ' + fmtTime(hrs[j][0]) + (o.status === 'full' ? '; tonight is fully booked' : '') + '.' };
    for (var d = 1; d <= 7; d++) {
      var day = addDays(t, d), h = HOURS[dowOf(day)];
      if (h.length) return { cls: 'closed', text: 'Opens ' + (d === 1 ? 'tomorrow' : DAY[dowOf(day)]) + ' ' + fmtTime(h[0][0]), long: 'Closed now. We open ' + (d === 1 ? 'tomorrow' : DAYL[dowOf(day)]) + ' at ' + fmtTime(h[0][0]) + '.' };
    }
    return { cls: 'closed', text: 'Closed', long: 'Closed.' };
  }
  function hoursTable() {
    // days with the same hours share one row (2026-11-14), e.g. "Tuesday – Friday" or "Every day"
    var t = dowOf(today()), order = [1, 2, 3, 4, 5, 6, 0], rows = [];
    order.forEach(function (d) {
      var k = JSON.stringify(HOURS[d]), last = rows[rows.length - 1];
      if (last && last.k === k) last.days.push(d); else rows.push({ k: k, days: [d] });
    });
    return '<table class="hours"><tbody>' + rows.map(function (r) {
      var h = HOURS[r.days[0]], a = r.days[0], b = r.days[r.days.length - 1], has = r.days.indexOf(t) >= 0;
      var label = r.days.length === 7 ? 'Every day' : r.days.length === 1 ? DAYL[a] : DAYL[a] + ' – ' + DAYL[b];
      return '<tr class="' + (has ? 'is-today' : '') + '"><td>' + label + (has && r.days.length < 7 ? ' <small>(today)</small>' : '') + '</td><td>' + (h.length ? h.map(function (x) { return fmtTime(x[0]) + '–' + fmtTime(x[1]); }).join(' · ') : 'Closed') + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function openDays(n) { var out = [], o = owner(), t = today(); for (var i = 0; out.length < n && i < 40; i++) { var d = addDays(t, i); if (HOURS[dowOf(d)].length && !(d === t && o.status === 'closed')) out.push(d); } return out; }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function seatSlots(seat, d) {
    var out = [];
    if (seat === 'counter') { if ([2, 3, 4, 5, 6].indexOf(dowOf(d)) >= 0) out = [1080, 1245]; }
    else HOURS[dowOf(d)].forEach(function (h) { for (var t = h[0]; t <= h[1] - (h[0] < 900 ? 60 : 90); t += 30) out.push(t); });
    var minT = d === today() ? nowMin() + 45 : 0;
    return out.filter(function (t) { return t >= minT; });
  }
  function leftAt(seat, d, t) {
    if (d === today() && owner().status === 'full') return 0;
    var mine = bookings().filter(function (b) { return b.date === d && b.time === t && b.seat === seat && !b.wait; });
    if (seat === 'counter') { var seats = 2 + hash('c' + d + t) % 7; return Math.max(0, seats - mine.reduce(function (a, b) { return a + b.pax; }, 0)); }
    var n = hash(d + ':' + t) % 6; if (t >= 1140 && t <= 1230) n = Math.max(0, n - 2);
    return Math.max(0, n - mine.length);
  }

  // ------------------------------------------------------------------ shared UI
  function updateBag() {
    var n = bagCount();
    $$('[data-bag-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
    var bar = $('[data-bagbar]');
    if (bar) { bar.hidden = !n; bar.innerHTML = '<span><b>' + n + ' item' + (n === 1 ? '' : 's') + '</b> · ' + rm(bagSub()) + '</span><span class="btn btn--gold btn--sm">View order</span>'; }
  }
  function refreshStatus() {
    var st = status();
    $$('[data-status]').forEach(function (el) { el.textContent = st.text; el.className = 'status status--' + st.cls; });
    $$('[data-status-long]').forEach(function (el) { el.textContent = st.long; });
    $$('[data-status-text]').forEach(function (el) { el.textContent = st.text; });
  }
  function shared() {
    var page = document.body.getAttribute('data-page');
    $$('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === page) { a.classList.add('is-on'); a.setAttribute('aria-current', 'page'); } });
    var burger = $('[data-burger]'), nav = $('#nav');
    if (burger && nav) burger.addEventListener('click', function () {
      var open = !nav.classList.contains('is-open');
      document.documentElement.style.setProperty('--navtop', $('[data-hdr]').getBoundingClientRect().bottom + 'px');
      nav.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    refreshStatus();
    $$('[data-hours]').forEach(function (el) { el.innerHTML = hoursTable(); });
    // the hours show once per page: the footer's copy steps aside where the page already has the table
    if ($('main [data-hours]')) { var fh = $('[data-ftr-hours]'); if (fh) { fh.hidden = true; fh.parentNode.classList.add('ftr__grid--2'); } }
    $$('[data-address]').forEach(function (el) { el.textContent = ADDRESS; });
    $$('[data-maps]').forEach(function (el) { el.href = MAPS; });
    updateBag();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    document.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeSheet(); });
  }
  var sheetFocus = null;
  function openSheet(html, img) {
    var sh = $('[data-sheet]'), p = $('.sheet__panel', sh);
    sheetFocus = document.activeElement;
    p.innerHTML = '<button class="sheet__x" type="button" data-close aria-label="Close">&times;</button>' + (img ? '<img class="sheet__img" src="' + img + '" alt="">' : '') + html;
    sh.hidden = false; document.body.style.overflow = 'hidden'; p.focus();
  }
  function closeSheet() { var sh = $('[data-sheet]'); if (!sh || sh.hidden) return; sh.hidden = true; document.body.style.overflow = ''; if (sheetFocus && sheetFocus.focus) sheetFocus.focus(); }

  // ------------------------------------------------------------------ menus
  function tagsHTML(it) { return (isOut(it.id) ? '<span class="tag tag--out">Not available tonight</span>' : '') + it.tags.map(function (t) { return '<span class="tag' + (t === 'sig' ? ' tag--sig' : '') + '">' + TAGS[t] + '</span>'; }).join(''); }
  function mrow(it) {
    var photo = it.img && ['scallop', 'wagyu', 'chocolate', 'duck'].indexOf(it.id) >= 0;
    return '<div class="mrow' + (photo ? ' mrow--photo' : '') + (isOut(it.id) ? ' is-out' : '') + '" id="m-' + it.id + '">' + (photo ? '<img class="mrow__photo" src="img/' + it.img + '.webp" alt="" loading="lazy">' : '') +
      '<span class="mrow__name">' + esc(it.n) + '</span><span class="mrow__price">' + rm(priceOf(it)) + '</span><p class="mrow__desc">' + esc(it.d) + '</p>' + (it.tags.length || isOut(it.id) ? '<div class="mrow__tags">' + tagsHTML(it) + '</div>' : '') + '</div>';
  }
  function tastingHTML(t, dark) {
    return '<div class="center"><p class="kicker">' + esc(t.sub) + '</p><h2>' + esc(t.n) + ' <em>' + rm(t.p) + '</em></h2><p class="lead" style="margin-bottom:26px">' + esc(t.note) + ' Wine pairing ' + rm(t.pair) + ', tea and non-alcoholic pairing ' + rm(t.tea) + '.</p></div>' +
      '<ol class="courses">' + t.courses.map(function (c) { return '<li><span><b>' + esc(c[0]) + '</b><small>' + esc(c[1]) + '</small></span></li>'; }).join('') + '</ol>';
  }
  function pageMenu() {
    var tab = location.hash === '#carte' ? 'carte' : location.hash === '#drinks' ? 'drinks' : 'tasting';
    function paint() {
      $$('[data-mtab]').forEach(function (b) { var on = b.getAttribute('data-mtab') === tab; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
      var el = $('[data-menu]');
      if (tab === 'tasting') { el.innerHTML = TASTING.map(function (t) { return '<section class="mcat">' + tastingHTML(t) + '</section>'; }).join('<hr class="rule" style="margin:10px auto 56px;max-width:640px">') + '<p class="menu-note">Tasting menus are served to the whole table. Tell us about allergies and dietary needs when you book; we adapt every course we can.</p>'; return; }
      var cats = tab === 'drinks' ? CATS.filter(function (c) { return c[0] === 'drink'; }) : CATS.filter(function (c) { return c[0] !== 'drink'; });
      el.innerHTML = cats.map(function (c) { var items = MENU.filter(function (it) { return it.cat === c[0]; }); return '<section class="mcat" id="c-' + c[0] + '"><h3>' + esc(c[1]) + '</h3><div class="mlist">' + items.map(mrow).join('') + '</div></section>'; }).join('') +
        '<p class="menu-note">Prices in RM, inclusive of service. Our kitchen uses nuts, shellfish and gluten; please tell us about allergies.</p>';
    }
    $('[data-mtabs]').addEventListener('click', function (e) { var b = e.target.closest('[data-mtab]'); if (!b) return; tab = b.getAttribute('data-mtab'); history.replaceState(null, '', tab === 'tasting' ? location.pathname : '#' + tab); paint(); });
    paint();
  }

  // ------------------------------------------------------------------ home
  function nextSeason() { var t = today(); for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i].cutoff >= t) return SEASONS[i]; return null; }
  function pageHome() {
    $('[data-tasting]').innerHTML = tastingHTML(TASTING[0], true);
    var s = nextSeason(), el = $('[data-festive-strip]');
    if (s && el) {
      var dine = s.items.filter(function (x) { return x.kind === 'dine'; })[0] || s.items[0], d = daysUntil(s.cutoff);
      el.innerHTML = '<div class="fstrip"><img src="img/' + s.img + '.webp" alt=""><div><p class="kicker" style="margin-bottom:8px">Seasonal</p><h3>' + esc(s.name) + ' at Maison Cendre</h3><p>' + esc(dine.n) + ', ' + rm(dine.p) + ' ' + esc(dine.unit) + '. Only ' + leftOf(dine) + ' places left; book by ' + fmtDay(s.cutoff) + ' (' + (d === 0 ? 'today' : d + ' day' + (d === 1 ? '' : 's')) + ').</p></div><a class="btn btn--gold" href="festive.html">See the seasonal menus</a></div>';
    }
  }

  // ------------------------------------------------------------------ reservations
  function ics(b) {
    function utc(d, m) { return new Date(Date.parse(d + 'T00:00:00Z') + (m - 480) * 60e3).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'; }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maison Cendre demo//EN', 'BEGIN:VEVENT', 'UID:' + b.ref + '@maison-cendre.demo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART:' + utc(b.date, b.time), 'DTEND:' + utc(b.date, b.time + 150), 'SUMMARY:' + SEATS[b.seat].n + ' for ' + b.pax + ', Maison Cendre (demo)', 'LOCATION:' + ADDRESS.replace(/,/g, '\\,'),
      'DESCRIPTION:Reservation ' + b.ref + '. This is a demo reservation on a concept website.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function pageBook() {
    var S = { seat: new URLSearchParams(location.search).get('seat') || 'room', date: '', time: 0, pax: 2, occ: '', diet: [], name: '', phone: '', notes: '' };
    if (!SEATS[S.seat]) S.seat = 'room';
    var root = $('[data-book]');
    function deposit() { return S.seat === 'counter' ? 100 * S.pax : S.pax >= 6 ? 50 * S.pax : 0; }
    function paint() {
      var seat = SEATS[S.seat];
      S.pax = Math.max(seat.min, Math.min(seat.max, S.pax));
      var days = openDays(21).filter(function (d) { return seatSlots(S.seat, d).length; }).slice(0, 14);
      if (days.indexOf(S.date) < 0) S.date = days[0];
      var slots = S.date ? seatSlots(S.seat, S.date) : [];
      if (slots.indexOf(S.time) < 0) S.time = 0;
      var full = S.time && leftAt(S.seat, S.date, S.time) === 0, dep = deposit();
      var paxBtns = []; for (var n = seat.min; n <= seat.max; n++) paxBtns.push('<button type="button" data-pax="' + n + '" class="' + (n === S.pax ? 'is-on' : '') + '" aria-pressed="' + (n === S.pax) + '">' + n + '</button>');
      root.innerHTML = '<div class="co"><div>' +
        '<section class="panel"><h2>Where would you like to sit?</h2><div class="seatopts">' + Object.keys(SEATS).map(function (k) { return '<button type="button" class="seatopt' + (k === S.seat ? ' is-on' : '') + '" data-seat="' + k + '" aria-pressed="' + (k === S.seat) + '"><b>' + esc(SEATS[k].n) + '</b><small>' + esc(SEATS[k].desc) + '</small></button>'; }).join('') + '</div></section>' +
        (S.seat === 'salon' ? '<section class="panel"><h2>The private salon</h2><p class="muted">A private room with its own table for 8 to 14 guests, a set menu chosen with the kitchen, and a minimum spend of RM3,000. Tell us the date and what you are celebrating, and we will reply with menus and availability within one working day.</p><a class="btn" href="private.html#enquire">Send a private dining enquiry</a></section></div><aside class="summary panel"><img src="img/private.webp" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;margin-bottom:16px"><h2>Private salon</h2><p class="muted small">8 to 14 guests · minimum spend RM3,000 · set menus from RM328 per guest.</p></aside></div>' :
        '<section class="panel"><h2>Guests</h2><div class="seg" role="group" aria-label="Number of guests">' + paxBtns.join('') + '</div><p class="small muted" style="margin:12px 0 0">' + (S.seat === 'counter' ? 'The counter seats eight. For more guests, choose the dining room.' : 'More than eight? <a href="?seat=salon">Book the private salon</a>.') + '</p></section>' +
        '<section class="panel"><h2>Date</h2><div class="days">' + days.map(function (d, i) { return dayBtn(d, d === S.date, 'data-day', i === 0 && d === today() ? 'Today' : ''); }).join('') + '</div><p class="small muted" style="margin:10px 0 0">Closed on Mondays.' + (S.seat === 'counter' ? ' The counter is open Tuesday to Saturday.' : '') + '</p></section>' +
        '<section class="panel"><h2>Time</h2>' + (slots.length ? '<div class="slots">' + slots.map(function (t) { var left = leftAt(S.seat, S.date, t); return '<button type="button" class="slot' + (t === S.time ? ' is-on' : '') + (left ? '' : ' is-full') + '" data-time="' + t + '">' + fmtTime(t) + '<small>' + (left ? (S.seat === 'counter' ? left + ' seat' + (left === 1 ? '' : 's') : left === 1 ? 'last table' : left + ' tables') : 'waitlist') + '</small></button>'; }).join('') + '</div>' : '<p class="muted">No more times this day.</p>') +
        (full ? '<div class="note">' + ICON.info + '<span>This time is fully booked. Join the waitlist: if a table opens, we message you on WhatsApp and hold it for 30 minutes.</span></div>' : '') + '</section>' +
        '<section class="panel"><h2>Details</h2><div class="row2"><div class="field"><label for="b-name">Name</label><input class="input" id="b-name" autocomplete="name" data-k="name" value="' + esc(S.name) + '"></div><div class="field"><label for="b-phone">Mobile</label><input class="input" id="b-phone" type="tel" autocomplete="tel" placeholder="012-345 6789" data-k="phone" value="' + esc(S.phone) + '"></div></div>' +
        '<div class="field"><label for="b-occ">Occasion <small>(optional)</small></label><select class="input" id="b-occ" data-k="occ"><option value="">—</option>' + ['Birthday', 'Anniversary', 'Business dinner', 'Proposal', 'Celebration'].map(function (o) { return '<option' + (S.occ === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><span>Dietary needs</span><div class="checks">' + DIETS.map(function (d) { return '<label><input type="checkbox" data-diet value="' + esc(d) + '"' + (S.diet.indexOf(d) >= 0 ? ' checked' : '') + '>' + esc(d) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label for="b-notes">Anything else? <small>(optional)</small></label><input class="input" id="b-notes" maxlength="160" placeholder="A quiet table, a high chair, a cake…" data-k="notes" value="' + esc(S.notes) + '"></div></section></div>' +
        '<aside class="summary panel"><img src="img/' + (S.seat === 'counter' ? 'counter' : 'room-2') + '.webp" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;margin-bottom:16px"><h2>' + esc(seat.n) + '</h2>' +
        '<div class="totals"><div><span>Guests</span><span>' + S.pax + '</span></div><div><span>Date</span><span>' + (S.date ? fmtDay(S.date) : '—') + '</span></div><div><span>Time</span><span>' + (S.time ? fmtTime(S.time) : '—') + '</span></div>' + (S.seat === 'counter' ? '<div><span>Menu</span><span>Cendre, ' + rm(TASTING[0].p) + ' pp</span></div>' : '') + (dep && !full ? '<div><span>Deposit, taken off the bill</span><span>' + rm(dep) + '</span></div>' : '') + '</div>' +
        '<button class="btn btn--block" type="button" data-confirm style="margin-top:18px">' + (full ? 'Join the waitlist' : dep ? 'Reserve · deposit ' + rm(dep) : 'Reserve') + '</button><p class="small muted center" style="margin:12px 0 0">Free to change up to 24 hours before. Demo website: no table is held and nothing is charged.</p></aside></div>');
    }
    root.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-seat]'))) { S.seat = t.getAttribute('data-seat'); S.time = 0; paint(); return; }
      if ((t = e.target.closest('[data-pax]'))) { S.pax = +t.getAttribute('data-pax'); paint(); return; }
      if ((t = e.target.closest('[data-day]'))) { S.date = t.getAttribute('data-day'); S.time = 0; paint(); return; }
      if ((t = e.target.closest('[data-time]'))) { S.time = +t.getAttribute('data-time'); paint(); return; }
      if (e.target.closest('[data-confirm]')) confirmBooking();
      if (e.target.closest('[data-ics]')) {
        var b = bookings()[0]; if (!b) return;
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics(b)], { type: 'text/calendar' })); a.download = 'maison-cendre-' + b.ref + '.ics'; document.body.appendChild(a); a.click(); a.remove();
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-diet')) { S.diet = $$('[data-diet]:checked', root).map(function (x) { return x.value; }); return; }
      var k = e.target.getAttribute('data-k'); if (k) S[k] = e.target.value;
    });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k && k !== 'occ') S[k] = e.target.value; });
    function confirmBooking() {
      var err = !S.time ? 'Choose a time first.' : !S.name.trim() ? 'Add your name.' : !phoneOk(S.phone) ? 'Add a mobile number, so we can confirm on WhatsApp.' : '';
      if (err) { toast(err); return; }
      var wait = leftAt(S.seat, S.date, S.time) === 0, dep = wait ? 0 : deposit();
      var b = { ref: 'MC-' + seq(), seat: S.seat, date: S.date, time: S.time, pax: S.pax, occ: S.occ, diet: S.diet.slice(), notes: S.notes.trim(), name: S.name.trim(), phone: S.phone.trim(), dep: dep, wait: wait, st: wait ? 'Waitlist' : 'New', at: Date.now() };
      var all = bookings(); all.unshift(b); save('bookings', all.slice(0, 40));
      var text = (wait ? 'Waitlist request' : 'Reservation') + ' (demo website): Maison Cendre\n' + b.ref + ' · ' + SEATS[b.seat].n + ' · ' + b.pax + ' guest' + (b.pax === 1 ? '' : 's') + ' · ' + fmtDay(b.date) + ', ' + fmtTime(b.time) + (b.occ ? '\nOccasion: ' + b.occ : '') + (b.diet.length ? '\nDietary: ' + b.diet.join(', ') : '') + (b.notes ? '\nNotes: ' + b.notes : '') + (dep ? '\nDeposit paid: ' + rm(dep) : '') + '\nName: ' + b.name + ' · ' + b.phone;
      root.innerHTML = '<div class="panel done" style="margin:36px 0 90px"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">' + (wait ? 'You are on the waitlist (demo)' : 'Reservation received (demo)') + '</p><p class="ref">' + b.ref + '</p>' +
        '<h2 style="margin-top:12px">' + esc(SEATS[b.seat].n) + ' for ' + b.pax + ' · ' + fmtDay(b.date) + ', ' + fmtTime(b.time) + '</h2>' +
        '<p class="lead" style="margin:0 auto 18px">' + (wait ? 'If a table opens, we will message you on WhatsApp and hold it for 30 minutes.' : 'We will confirm on WhatsApp within the hour during opening times.' + (dep ? ' Deposit of ' + rm(dep) + ' received (demo: nothing was charged); it comes off your bill.' : '')) + '</p>' +
        '<div class="btns" style="justify-content:center">' + (wait ? '' : '<button class="btn" type="button" data-ics>Add to calendar</button>') + '<a class="btn btn--ghost" href="owner.html">See it in the owner view</a></div>' +
        '<details style="max-width:540px;margin:24px auto 0;text-align:left"><summary class="linkbtn">What the restaurant receives</summary><div class="waprev" style="margin-top:12px">' + esc(text) + '</div></details></div>';
      window.scrollTo(0, 0);
    }
    paint();
  }

  // ------------------------------------------------------------------ takeaway
  function dishCard(it) {
    var out = isOut(it.id);
    return '<article class="dish' + (out ? ' is-out' : '') + '" id="t-' + it.id + '"><div class="dish__img' + (it.img ? '' : ' dish__img--none') + '">' + (it.img ? '<img src="img/' + it.img + '.webp" alt="' + esc(it.n) + ' (placeholder photo)" loading="lazy" width="760" height="570">' : '<span>' + esc(it.n) + '</span>') + '<div class="dish__tags">' + (out ? '<span class="tag tag--out">Not available tonight</span>' : it.tags.indexOf('sig') >= 0 ? '<span class="tag tag--sig">Signature</span>' : '') + '</div></div>' +
      '<div class="dish__body"><h3>' + esc(it.n) + '</h3><p>' + esc(it.d) + '</p><div class="dish__foot"><span class="price">' + rm(priceOf(it)) + '</span><button class="addbtn" type="button" data-add="' + it.id + '"' + (out ? ' disabled' : '') + '>' + (out ? 'Unavailable' : 'Add') + '</button></div></div></article>';
  }
  function addDirect(it, qty, sel, note) {
    var unit = priceOf(it), label = [];
    (it.o || []).forEach(function (g, gi) { (sel[gi] || []).forEach(function (vi) { unit += g.v[vi][1]; label.push(g.v[vi][0]); }); });
    var key = it.id + '|' + JSON.stringify(sel) + '|' + (note || ''), b = bag(), found = null;
    b.forEach(function (l) { if (l.key === key) found = l; });
    if (found) found.qty += qty; else b.push({ key: key, id: it.id, n: it.n, qty: qty, unit: Math.round(unit * 100) / 100, opts: label.join(', '), note: note || '' });
    setBag(b); toast('Added: ' + qty + ' × ' + it.n);
  }
  function optionsSheet(it) {
    var sel = {}, qty = 1;
    (it.o || []).forEach(function (g, gi) { sel[gi] = g.one ? [g.def || 0] : []; });
    var groups = (it.o || []).map(function (g, gi) {
      return '<fieldset class="optgroup"><legend>' + esc(g.n) + ' <small>' + (g.one ? '(choose one)' : '(optional)') + '</small></legend>' + g.v.map(function (v, vi) { return '<label class="opt"><input type="' + (g.one ? 'radio' : 'checkbox') + '" name="g' + gi + '" value="' + vi + '"' + (g.one && vi === (g.def || 0) ? ' checked' : '') + '><span>' + esc(v[0]) + '</span>' + (v[1] ? '<em>+' + rm(v[1]) + '</em>' : '') + '</label>'; }).join('') + '</fieldset>';
    }).join('');
    openSheet('<div class="sheet__body"><h2 id="sheet-title">' + esc(it.n) + '</h2><p class="muted">' + esc(it.d) + '</p>' + groups + '<div class="field" style="margin-top:16px"><label for="sh-note">Note for the kitchen <small>(optional)</small></label><input class="input" id="sh-note" maxlength="120"></div></div>' +
      '<div class="sheet__foot"><div class="qty"><button type="button" data-q="-1" aria-label="One less">−</button><output data-qv>1</output><button type="button" data-q="1" aria-label="One more">+</button></div><button class="btn btn--block" type="button" data-sheet-add></button></div>', it.img ? 'img/' + it.img + '.webp' : '');
    var p = $('.sheet__panel');
    function total() { var u = priceOf(it); (it.o || []).forEach(function (g, gi) { (sel[gi] || []).forEach(function (vi) { u += g.v[vi][1]; }); }); return u * qty; }
    function paint() { $('[data-qv]', p).textContent = qty; $('[data-sheet-add]', p).textContent = 'Add · ' + rm(total()); }
    p.onchange = function (e) { var m = /^g(\d+)$/.exec(e.target.name || ''); if (!m) return; sel[+m[1]] = $$('input[name="g' + m[1] + '"]:checked', p).map(function (x) { return +x.value; }); paint(); };
    p.onclick = function (e) {
      var q = e.target.closest('[data-q]'); if (q) { qty = Math.max(1, Math.min(20, qty + +q.getAttribute('data-q'))); paint(); }
      if (e.target.closest('[data-sheet-add]')) { addDirect(it, qty, sel, $('#sh-note', p).value.trim()); closeSheet(); paintOrderIfThere(); }
    };
    paint();
  }
  var paintOrderIfThere = function () {};
  function orderSlots(d) {
    var out = [], min = d === today() ? nowMin() + 45 : 0;
    HOURS[dowOf(d)].forEach(function (h) { for (var t = h[0] + 30; t <= h[1] - 60; t += 15) if (t >= min) out.push(t); });
    return out;
  }
  function vouchers() { return load('vouchers', []); }
  function discountFor(c, sub) {
    c = String(c || '').trim().toUpperCase();
    if (!c) return { ok: true, amt: 0 };
    if (c === PROMO.code) return { ok: true, amt: Math.round(sub * PROMO.pct) / 100, label: PROMO.pct + '% off (' + c + ')' };
    var v = vouchers().filter(function (x) { return x.code === c; })[0];
    if (v && !v.used) return { ok: true, amt: Math.min(sub, v.amt), label: 'Gift card ' + c, voucher: c };
    if (v && v.used) return { ok: false, msg: 'This gift card has already been used.' };
    return { ok: false, msg: 'That code doesn’t work. Try ' + PROMO.code + ' (demo), or a gift card code from this demo.' };
  }
  function pageOrder() {
    var S = load('checkout', { mode: 'pickup', date: '', time: 0, pc: '', addr: '', name: '', phone: '', notes: '', code: '', pay: 'online' });
    var root = $('[data-order]'), menuEl = $('[data-takeaway]');
    function keep() { save('checkout', S); }
    function zone() { var pc = String(S.pc || '').trim(); for (var i = 0; i < ZONES.length; i++) if (ZONES[i].re.test(pc)) return ZONES[i]; return null; }
    function calc() { var sub = bagSub(), d = discountFor(S.code, sub), disc = d.ok ? d.amt : 0, z = zone(), fee = S.mode === 'delivery' ? (z ? (sub - disc >= FREE_DELIVERY ? 0 : z.fee) : 0) : 0; return { sub: sub, d: d, disc: disc, fee: fee, z: z, total: Math.max(0, sub - disc + fee) }; }
    function paintMenu() { menuEl.innerHTML = MENU.filter(function (it) { return it.take; }).map(dishCard).join(''); }
    function paint() {
      paintMenu();
      var b = bag();
      if (!b.length) { root.innerHTML = '<div class="panel empty"><h2>Your takeaway order is empty</h2><p>Choose from the dishes above; we pack them to travel and finish at home.</p></div>'; return; }
      var days = openDays(8).filter(function (d) { return orderSlots(d).length; }).slice(0, 7);
      if (days.indexOf(S.date) < 0) S.date = days[0];
      var slots = orderSlots(S.date); if (slots.indexOf(S.time) < 0) S.time = 0;
      var c = calc(), zoneMsg = '';
      if (S.mode === 'delivery') {
        if (!S.pc) zoneMsg = '<div class="note">' + ICON.info + '<span>We deliver in Kuala Lumpur (RM12) and Petaling Jaya and Subang (RM15). Free over ' + rm(FREE_DELIVERY) + '; minimum order ' + rm(DELIVERY_MIN) + '.</span></div>';
        else if (!c.z) zoneMsg = '<div class="note note--bad">' + ICON.info + '<span>Sorry, ' + esc(S.pc) + ' is outside our delivery area. Collection works from anywhere.</span></div>';
        else zoneMsg = '<div class="note note--ok">' + ICON.check + '<span>' + esc(c.z.area) + ': delivery ' + (c.fee ? rm(c.fee) : 'free') + ', about ' + c.z.eta + '.</span></div>';
        if (c.z && c.sub < DELIVERY_MIN) zoneMsg += '<div class="note note--bad">' + ICON.info + '<span>Delivery needs a minimum order of ' + rm(DELIVERY_MIN) + '.</span></div>';
      }
      root.innerHTML = '<div class="co" style="padding-top:0"><div>' +
        '<section class="panel"><h2>Collect or deliver</h2><div class="seg" role="group"><button type="button" data-mode="pickup" class="' + (S.mode === 'pickup' ? 'is-on' : '') + '">Collect</button><button type="button" data-mode="delivery" class="' + (S.mode === 'delivery' ? 'is-on' : '') + '">Delivery</button></div>' +
        (S.mode === 'pickup' ? '<p class="muted small" style="margin:14px 0 0">Collect at the front desk: ' + esc(ADDRESS) + '.</p>' : '<div class="row2" style="margin-top:14px"><div class="field"><label for="o-pc">Postcode</label><input class="input" id="o-pc" inputmode="numeric" maxlength="5" placeholder="e.g. 50450" value="' + esc(S.pc) + '" data-k="pc"></div><div class="field"><label for="o-addr">Address</label><input class="input" id="o-addr" value="' + esc(S.addr) + '" data-k="addr"></div></div>' + zoneMsg) + '</section>' +
        '<section class="panel"><h2>When</h2><div class="days">' + days.map(function (d, i) { return dayBtn(d, d === S.date, 'data-day', i === 0 && d === today() ? 'Today' : ''); }).join('') + '</div><div class="slots" style="margin-top:14px">' + slots.map(function (t) { return '<button type="button" class="slot' + (t === S.time ? ' is-on' : '') + '" data-time="' + t + '">' + fmtTime(t) + '</button>'; }).join('') + '</div></section>' +
        '<section class="panel"><h2>Your details</h2><div class="row2"><div class="field"><label for="o-name">Name</label><input class="input" id="o-name" autocomplete="name" value="' + esc(S.name) + '" data-k="name"></div><div class="field"><label for="o-phone">Mobile</label><input class="input" id="o-phone" type="tel" autocomplete="tel" placeholder="012-345 6789" value="' + esc(S.phone) + '" data-k="phone"></div></div><div class="field"><label for="o-notes">Notes <small>(optional)</small></label><input class="input" id="o-notes" maxlength="160" value="' + esc(S.notes) + '" data-k="notes"></div></section>' +
        '<section class="panel"><h2>Payment</h2><div class="pay"><label class="payopt"><input type="radio" name="pay" value="online"' + (S.pay === 'online' ? ' checked' : '') + '><span><b>Pay online</b><small>FPX, cards and e-wallets. Demo: nothing is charged.</small></span></label><label class="payopt"><input type="radio" name="pay" value="wa"' + (S.pay === 'wa' ? ' checked' : '') + '><span><b>Send the order on WhatsApp</b><small>Arrives on our WhatsApp, already filled in. Pay on collection.</small></span></label></div></section></div>' +
        '<aside class="summary panel"><h2>Your order</h2>' + b.map(function (l, i) { return '<div class="line"><div><h4>' + esc(l.n) + '</h4>' + (l.opts ? '<p>' + esc(l.opts) + '</p>' : '') + (l.note ? '<p>“' + esc(l.note) + '”</p>' : '') + '<div class="qty"><button type="button" data-lq="' + i + ':-1" aria-label="One less">−</button><output>' + l.qty + '</output><button type="button" data-lq="' + i + ':1" aria-label="One more">+</button></div></div><span>' + rm(l.unit * l.qty) + '</span></div>'; }).join('') +
        '<div class="field" style="margin-top:16px"><label for="o-code">Gift card or promo code</label><div style="display:flex;gap:8px"><input class="input" id="o-code" placeholder="' + PROMO.code + ' or GIFT-…" value="' + esc(S.code) + '" autocapitalize="characters"><button class="btn btn--ghost btn--sm" type="button" data-apply>Apply</button></div>' + (S.code && !c.d.ok ? '<small style="color:var(--bad)">' + esc(c.d.msg) + '</small>' : (c.disc ? '<small style="color:var(--ok)">' + esc(c.d.label) + ' applied</small>' : '')) + '</div>' +
        '<div class="totals"><div><span>Subtotal</span><span>' + rm(c.sub) + '</span></div>' + (c.disc ? '<div><span>Discount</span><span>−' + rm(c.disc) + '</span></div>' : '') + (S.mode === 'delivery' ? '<div><span>Delivery</span><span>' + (c.z ? (c.fee ? rm(c.fee) : 'Free') : '—') + '</span></div>' : '') + '<div class="grand"><span>Total</span><span>' + rm(c.total) + '</span></div></div>' +
        '<button class="btn btn--block' + (S.pay === 'wa' ? ' btn--wa' : '') + '" type="button" data-place style="margin-top:18px">' + (S.pay === 'wa' ? ICON.wa + 'Send on WhatsApp' : 'Pay ' + rm(c.total)) + '</button><p class="small muted center" style="margin-top:10px">Demo website: nothing is charged or sent.</p></aside></div>';
    }
    paintOrderIfThere = paint;
    document.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-add]'))) { var it = item(t.getAttribute('data-add')); if (!it || isOut(it.id)) return; if (it.o && it.o.length) optionsSheet(it); else { addDirect(it, 1, {}, ''); paint(); } return; }
      if (!root.contains(e.target)) return;
      if ((t = e.target.closest('[data-mode]'))) { S.mode = t.getAttribute('data-mode'); keep(); paint(); return; }
      if ((t = e.target.closest('[data-day]'))) { S.date = t.getAttribute('data-day'); S.time = 0; keep(); paint(); return; }
      if ((t = e.target.closest('[data-time]'))) { S.time = +t.getAttribute('data-time'); keep(); paint(); return; }
      if (e.target.closest('[data-apply]')) { S.code = ($('#o-code').value || '').trim().toUpperCase(); keep(); paint(); return; }
      if ((t = e.target.closest('[data-lq]'))) { var pr = t.getAttribute('data-lq').split(':'), b = bag(), i = +pr[0]; if (b[i]) { b[i].qty += +pr[1]; if (b[i].qty <= 0) b.splice(i, 1); setBag(b); paint(); } return; }
      if (e.target.closest('[data-place]')) place();
    });
    root.addEventListener('change', function (e) {
      if (e.target.name === 'pay') { S.pay = e.target.value; keep(); paint(); return; }
      var k = e.target.getAttribute('data-k'); if (!k) return;
      var v = e.target.value.trim(), changed = S[k] !== v; S[k] = v; keep();
      if (k === 'pc' && changed) paint();
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'o-code') { e.preventDefault(); S.code = e.target.value.trim().toUpperCase(); keep(); paint(); } });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k && k !== 'pc') { S[k] = e.target.value; keep(); } if (k === 'pc' && e.target.value.length === 5) { S.pc = e.target.value; keep(); paint(); var el = $('#o-pc'); if (el) { el.focus(); el.setSelectionRange(5, 5); } } });
    function place() {
      var c = calc(), err = '';
      if (!S.time) err = 'Choose a time first.';
      else if (S.mode === 'delivery' && !c.z) err = 'Enter a postcode inside our delivery area, or choose collection.';
      else if (S.mode === 'delivery' && c.sub < DELIVERY_MIN) err = 'Delivery needs a minimum order of ' + rm(DELIVERY_MIN) + '.';
      else if (S.mode === 'delivery' && !S.addr) err = 'Add the delivery address.';
      else if (!S.name) err = 'Add your name.';
      else if (!phoneOk(S.phone)) err = 'Add a mobile number.';
      if (err) { toast(err); return; }
      var o = { no: 'MC-T' + seq(), mode: S.mode, date: S.date, time: S.time, items: bag(), sub: c.sub, disc: c.disc, fee: c.fee, total: c.total, name: S.name, phone: S.phone, addr: S.addr, pc: S.pc, notes: S.notes, pay: S.pay, st: 'New', at: Date.now() };
      var orders = load('orders', []); orders.unshift(o); save('orders', orders.slice(0, 30));
      if (c.d.voucher) save('vouchers', vouchers().map(function (v) { if (v.code === c.d.voucher) v.used = true; return v; }));
      save('bag', []); S.code = ''; S.notes = ''; keep(); updateBag();
      var L = ['Takeaway order (demo website): Maison Cendre', o.no + ' · ' + (o.mode === 'pickup' ? 'Collect' : 'Delivery') + ' · ' + fmtDay(o.date) + ', ' + fmtTime(o.time), ''];
      o.items.forEach(function (l) { L.push(l.qty + ' × ' + l.n + (l.opts ? ' (' + l.opts + ')' : '') + ' — ' + rm(l.unit * l.qty)); });
      L.push('', 'Total: ' + rm(o.total), 'Name: ' + o.name + ' · ' + o.phone); if (o.mode === 'delivery') L.push('Address: ' + o.addr + ', ' + o.pc);
      var text = L.join('\n');
      root.innerHTML = '<div class="panel done" style="margin:0 0 90px"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Order received (demo)</p><p class="ref">' + o.no + '</p><h2 style="margin-top:12px">' + (o.mode === 'pickup' ? 'Collect' : 'Delivery') + ' · ' + fmtDay(o.date) + ', ' + fmtTime(o.time) + '</h2>' +
        (o.pay === 'wa' ? '<p class="lead" style="margin:0 auto 14px">One more step: send it. This message lands on our WhatsApp, already filled in:</p><div class="waprev" style="max-width:540px;margin:0 auto 16px">' + esc(text) + '</div><p><a class="btn btn--wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + ICON.wa + 'Open WhatsApp</a></p><p class="small muted">Demo: WhatsApp opens without a number, so you choose any chat.</p>'
          : '<p class="lead" style="margin:0 auto 14px">Paid ' + rm(o.total) + ' (demo: nothing was charged). We will message you when it is ready.</p>') +
        '<div class="btns" style="justify-content:center;margin-top:18px"><a class="btn btn--ghost" href="owner.html">See it in the owner view</a></div></div>';
      window.scrollTo(0, root.getBoundingClientRect().top + scrollY - 120);
    }
    paint();
  }

  // ------------------------------------------------------------------ seasonal menus
  function pageFestive() {
    var t = today(), open = SEASONS.filter(function (s) { return s.cutoff >= t; });
    var S = { season: (open[0] || SEASONS[SEASONS.length - 1]).id, qty: {}, date: '', seat: 1080, pick: 720, name: '', phone: '', pay: 'deposit' };
    var root = $('[data-festive]');
    function season() { return SEASONS.filter(function (s) { return s.id === S.season; })[0]; }
    function countdown(s) {
      var ms = Date.parse(s.cutoff + 'T23:59:00+08:00') - Date.now();
      if (ms <= 0) return '<p class="lead">Bookings for ' + esc(s.name) + ' have closed.</p>';
      return '<div class="count" aria-label="Time left to book"><div><b>' + Math.floor(ms / 864e5) + '</b><small>days</small></div><div><b>' + Math.floor(ms % 864e5 / 36e5) + '</b><small>hours</small></div><div><b>' + Math.floor(ms % 36e5 / 6e4) + '</b><small>min</small></div></div>';
    }
    function paint() {
      var s = season(), closed = s.cutoff < t, dates = [];
      for (var d = s.from; d <= s.to; d = addDays(d, 1)) dates.push(d);
      if (dates.indexOf(S.date) < 0) S.date = dates[0];
      var lines = s.items.filter(function (x) { return S.qty[x.id]; }).map(function (x) { return { it: x, q: S.qty[x.id] }; });
      var total = lines.reduce(function (a, l) { return a + l.it.p * l.q; }, 0), dep = lines.reduce(function (a, l) { return a + l.it.p * l.q * l.it.dep; }, 0);
      var hasDine = lines.some(function (l) { return l.it.kind === 'dine'; }), hasTake = lines.some(function (l) { return l.it.kind === 'take'; });
      $('[data-fhero]').innerHTML = '<img src="img/' + s.img + '.webp" alt=""><div class="wrap"><p class="kicker">Seasonal menus</p><h1>' + esc(s.name) + '</h1><p class="lead">' + esc(s.blurb) + '</p><p class="lead" style="margin-top:-6px">Book by ' + fmtDay(s.cutoff) + ' · ' + (s.from === s.to ? fmtDay(s.from) : fmtDay(s.from) + ' to ' + fmtDay(s.to)) + '</p>' + countdown(s) + '</div>';
      root.innerHTML = '<div class="mtabs" role="tablist">' + SEASONS.map(function (x) { return '<button type="button" role="tab" data-season="' + x.id + '" class="' + (x.id === S.season ? 'is-on' : '') + '" aria-selected="' + (x.id === S.season) + '">' + esc(x.name) + (x.cutoff < t ? ' (closed)' : '') + '</button>'; }).join('') + '</div>' +
        '<div class="co" style="padding-top:0"><div class="grid" style="gap:16px">' + s.items.map(function (x) {
          var left = leftOf(x), out = left <= 0 || closed, q = S.qty[x.id] || 0;
          return '<article class="fset' + (out ? ' is-out' : '') + '"><img src="img/' + x.img + '.webp" alt="" loading="lazy"><div class="fset__body"><p class="kicker" style="margin:0">' + (x.kind === 'dine' ? 'In the dining room' : 'To take home') + '</p><h3>' + esc(x.n) + '</h3><span class="price">' + rm(x.p) + ' ' + esc(x.unit) + '</span><ul>' + x.has.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' +
            '<div class="fset__left"><span>' + (left <= 0 ? 'Fully booked' : 'Only ' + left + ' left') + '</span><span>' + (x.dep < 1 ? '50% deposit' : 'Paid in full') + '</span></div><div class="bar"><i style="width:' + Math.round(100 * Math.max(0, left) / x.total) + '%"></i></div>' +
            '<div style="display:flex;justify-content:flex-end;margin-top:10px">' + (out ? '<span class="tag tag--out">' + (closed ? 'Closed' : 'Fully booked') + '</span>' : '<div class="qty"><button type="button" data-fq="' + x.id + ':-1" aria-label="One less">−</button><output>' + q + '</output><button type="button" data-fq="' + x.id + ':1" aria-label="One more">+</button></div>') + '</div></div></article>';
        }).join('') + '</div>' +
        '<aside class="summary panel"><h2>Your booking</h2>' + (lines.length ? lines.map(function (l) { return '<div class="line"><div><h4>' + l.q + ' × ' + esc(l.it.n) + '</h4></div><span>' + rm(l.it.p * l.q) + '</span></div>'; }).join('') : '<p class="muted">Choose a menu or a set.</p>') +
        '<div class="field" style="margin-top:16px"><span>Date</span><div class="days">' + dates.map(function (d) { return dayBtn(d, d === S.date, 'data-fday'); }).join('') + '</div></div>' +
        (hasDine ? '<div class="field"><span>Seating</span><div class="seg">' + [1080, 1230].map(function (m) { return '<button type="button" data-fseat="' + m + '" class="' + (S.seat === m ? 'is-on' : '') + '">' + fmtTime(m) + '</button>'; }).join('') + '</div></div>' : '') +
        (hasTake ? '<div class="field"><span>Collection</span><div class="seg">' + [720, 900, 1020].map(function (m) { return '<button type="button" data-fpick="' + m + '" class="' + (S.pick === m ? 'is-on' : '') + '">' + fmtTime(m) + '</button>'; }).join('') + '</div></div>' : '') +
        '<div class="field"><label for="f-name">Name</label><input class="input" id="f-name" data-k="name" value="' + esc(S.name) + '"></div><div class="field"><label for="f-phone">Mobile</label><input class="input" id="f-phone" type="tel" data-k="phone" placeholder="012-345 6789" value="' + esc(S.phone) + '"></div>' +
        '<div class="pay"><label class="payopt"><input type="radio" name="fpay" value="deposit"' + (S.pay === 'deposit' ? ' checked' : '') + '><span><b>Pay the deposit: ' + rm(dep) + '</b><small>The rest on the day.</small></span></label><label class="payopt"><input type="radio" name="fpay" value="full"' + (S.pay === 'full' ? ' checked' : '') + '><span><b>Pay in full: ' + rm(total) + '</b><small>Nothing to pay on the day.</small></span></label></div>' +
        '<div class="totals"><div class="grand"><span>Total</span><span>' + rm(total) + '</span></div></div><button class="btn btn--block" type="button" data-forder style="margin-top:16px"' + (closed ? ' disabled' : '') + '>Confirm</button><p class="small muted center" style="margin-top:10px">Demo: nothing is charged; the “left” counts are examples the owner can change.</p></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-season]'))) { S.season = x.getAttribute('data-season'); S.qty = {}; S.date = ''; paint(); return; }
      if ((x = e.target.closest('[data-fday]'))) { S.date = x.getAttribute('data-fday'); paint(); return; }
      if ((x = e.target.closest('[data-fseat]'))) { S.seat = +x.getAttribute('data-fseat'); paint(); return; }
      if ((x = e.target.closest('[data-fpick]'))) { S.pick = +x.getAttribute('data-fpick'); paint(); return; }
      if ((x = e.target.closest('[data-fq]'))) {
        var pr = x.getAttribute('data-fq').split(':'), f = fitem(pr[0]), q = Math.max(0, Math.min(leftOf(f.it), (S.qty[pr[0]] || 0) + +pr[1]));
        if (q) S.qty[pr[0]] = q; else delete S.qty[pr[0]];
        paint(); return;
      }
      if (e.target.closest('[data-forder]')) {
        var s = season(), ids = Object.keys(S.qty);
        var err = !ids.length ? 'Choose a menu or a set.' : !S.name.trim() ? 'Add your name.' : !phoneOk(S.phone) ? 'Add a mobile number.' : '';
        if (err) { toast(err); return; }
        var o = owner(); ids.forEach(function (id) { o.left[id] = leftOf(fitem(id).it) - S.qty[id]; }); setOwner(o);
        var dine = ids.some(function (id) { return fitem(id).it.kind === 'dine'; });
        var rec = { ref: 'MC-S' + seq(), season: s.name, date: S.date, time: dine ? S.seat : S.pick, items: ids.map(function (id) { return S.qty[id] + ' × ' + fitem(id).it.n; }), total: ids.reduce(function (a, id) { return a + fitem(id).it.p * S.qty[id]; }, 0), name: S.name.trim(), phone: S.phone.trim(), at: Date.now() };
        var all = load('seasonal', []); all.unshift(rec); save('seasonal', all.slice(0, 30));
        root.innerHTML = '<div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Confirmed (demo)</p><p class="ref">' + rec.ref + '</p><h2 style="margin-top:12px">' + esc(s.name) + ' · ' + fmtDay(S.date) + ', ' + fmtTime(rec.time) + '</h2><p class="lead" style="margin:0 auto 12px">' + esc(rec.items.join(', ')) + '</p><p class="muted">We will send a reminder on WhatsApp the day before. Demo: nothing was charged.</p><div class="btns" style="justify-content:center;margin-top:18px"><a class="btn btn--ghost" href="owner.html">See it in the owner view</a><a class="btn btn--ghost" href="festive.html">Back to seasonal menus</a></div></div>';
        S.qty = {}; window.scrollTo(0, 0);
      }
    });
    root.addEventListener('change', function (e) { if (e.target.name === 'fpay') { S.pay = e.target.value; paint(); } });
    root.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k) S[k] = e.target.value; });
    paint();
    setInterval(function () { var el = $('[data-fhero] .count'); if (el) el.outerHTML = countdown(season()); }, 30000);
  }

  // ------------------------------------------------------------------ private dining enquiry
  function pagePrivate() {
    var form = $('[data-private]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var f = {}; new FormData(form).forEach(function (v, k) { f[k] = String(v).trim(); });
      if (!phoneOk(f.phone)) { toast('Add a mobile number we can reach you on.'); return; }
      var ref = 'MC-E' + seq();
      var text = 'Private dining enquiry (demo website): Maison Cendre\n' + ref + '\n' + f.space + ' · ' + f.guests + ' guests · ' + (f.date ? fmtDay(f.date) : 'date to confirm') + '\nOccasion: ' + (f.occasion || '-') + '\nBudget: ' + (f.budget || '-') + (f.notes ? '\nNotes: ' + f.notes : '') + '\nContact: ' + f.name + ' · ' + f.phone + (f.email ? ' · ' + f.email : '');
      var all = load('enquiries', []); all.unshift({ ref: ref, space: f.space, guests: f.guests, date: f.date, name: f.name, at: Date.now() }); save('enquiries', all.slice(0, 20));
      form.outerHTML = '<div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Enquiry received (demo)</p><p class="ref">' + ref + '</p><h2 style="margin-top:12px">Thank you, ' + esc(f.name) + '</h2><p class="lead" style="margin:0 auto 16px">Our events team will reply within one working day with menus, availability and a written quote.</p><details style="max-width:540px;margin:0 auto;text-align:left"><summary class="linkbtn">What the restaurant receives</summary><div class="waprev" style="margin-top:12px">' + esc(text) + '</div></details></div>';
    });
    $$('[data-space]').forEach(function (b) { b.addEventListener('click', function () { $('select[name=space]', form).value = b.getAttribute('data-space'); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); });
  }

  // ------------------------------------------------------------------ gift cards
  var EXPERIENCES = [['Cendre tasting menu for two', 776], ['Tasting menu for two with wine pairing', 1296], ['Chef’s counter for two', 976]];
  function pageGift() {
    var S = { amt: 500, label: '', to: '', from: '', msg: '', via: 'WhatsApp' }, root = $('[data-gift]');
    function card(c) {
      return '<div class="vcard" aria-label="Gift card preview"><div class="vcard__top"><span class="logo"><span class="logo__mark">MC</span><span class="logo__name">Maison <i>Cendre</i></span></span><span class="vcard__code">' + (c || 'GIFT-····') + '</span></div>' +
        '<div><div class="vcard__amt">' + (S.label ? esc(S.label) : rm(S.amt)) + '</div><div class="vcard__msg">' + (S.to ? 'For ' + esc(S.to) + (S.msg ? ': “' + esc(S.msg) + '”' : '') : 'Your message appears here.') + (S.from ? ' — ' + esc(S.from) : '') + '</div></div></div>';
    }
    function paint() {
      root.innerHTML = '<div class="co" style="padding-top:0"><div><section class="panel"><h2>An amount</h2><div class="amounts">' + [200, 300, 500, 1000].map(function (a) { return '<button type="button" class="slot' + (!S.label && a === S.amt ? ' is-on' : '') + '" data-amt="' + a + '">' + rm(a) + '</button>'; }).join('') + '</div>' +
        '<h2 style="margin-top:26px">Or an experience</h2><div class="pay">' + EXPERIENCES.map(function (x, i) { return '<label class="payopt"><input type="radio" name="exp" value="' + i + '"' + (S.label === x[0] ? ' checked' : '') + '><span><b>' + esc(x[0]) + '</b><small>' + rm(x[1]) + '</small></span></label>'; }).join('') + '</div></section>' +
        '<section class="panel"><h2>Who is it for?</h2><div class="row2"><div class="field"><label for="g-to">To</label><input class="input" id="g-to" maxlength="40" data-k="to" value="' + esc(S.to) + '"></div><div class="field"><label for="g-from">From</label><input class="input" id="g-from" maxlength="40" data-k="from" value="' + esc(S.from) + '"></div></div>' +
        '<div class="field"><label for="g-msg">Message <small>(optional)</small></label><input class="input" id="g-msg" maxlength="90" data-k="msg" placeholder="Happy anniversary, dinner is on us" value="' + esc(S.msg) + '"></div>' +
        '<div class="field"><span>Send it by</span><div class="seg">' + ['WhatsApp', 'Email', 'Printed card'].map(function (v) { return '<button type="button" data-via="' + v + '" class="' + (v === S.via ? 'is-on' : '') + '">' + v + '</button>'; }).join('') + '</div></div></section></div>' +
        '<aside class="summary"><div data-gprev>' + card() + '</div><div class="panel" style="margin-top:16px"><div class="totals"><div class="grand"><span>Total</span><span data-gtotal>' + rm(S.amt) + '</span></div></div><button class="btn btn--block" type="button" data-gbuy style="margin-top:16px">Buy gift card</button><p class="small muted" style="margin-top:12px">Valid for 12 months, for dining in and takeaway. Demo: nothing is charged; the code works at this demo’s takeaway checkout.</p></div></aside></div>';
    }
    root.addEventListener('click', function (e) {
      var x;
      if ((x = e.target.closest('[data-amt]'))) { S.amt = +x.getAttribute('data-amt'); S.label = ''; paint(); return; }
      if ((x = e.target.closest('[data-via]'))) { S.via = x.getAttribute('data-via'); paint(); return; }
      if (e.target.closest('[data-gbuy]')) {
        if (!S.to.trim()) { toast('Add who the gift card is for.'); $('#g-to').focus(); return; }
        var c = code('GIFT-', 4), all = load('vouchers', []);
        all.unshift({ code: c, amt: S.amt, label: S.label, to: S.to.trim(), used: false, at: Date.now() }); save('vouchers', all.slice(0, 20));
        var text = 'A gift for you' + (S.from ? ' from ' + S.from : '') + ': ' + (S.label || rm(S.amt)) + ' at Maison Cendre (demo website).\nCode: ' + c + (S.msg ? '\n“' + S.msg + '”' : '') + '\nValid for 12 months.';
        root.innerHTML = '<div class="co" style="padding-top:0"><div class="panel done"><div class="done__icon">' + ICON.check + '</div><p class="kicker" style="justify-content:center">Gift card ready (demo)</p><p class="ref">' + c + '</p><p class="lead" style="margin:8px auto 18px">Try it: add something to a takeaway order and enter the code at checkout.</p><div class="btns" style="justify-content:center"><a class="btn btn--wa" href="' + WA + encodeURIComponent(text) + '" target="_blank" rel="noopener">' + ICON.wa + 'Send on WhatsApp</a><a class="btn btn--ghost" href="order.html">Use it for takeaway</a></div></div><aside>' + card(c) + '</aside></div>';
      }
    });
    root.addEventListener('change', function (e) { if (e.target.name === 'exp') { var x = EXPERIENCES[+e.target.value]; S.label = x[0]; S.amt = x[1]; paint(); } });
    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'); if (k) S[k] = e.target.value;
      var pv = $('[data-gprev]'); if (pv) pv.innerHTML = card();
    });
    paint();
  }

  // ------------------------------------------------------------------ owner view
  var SEED_BOOK = [
    { ref: 'MC-3091', seat: 'counter', time: 1080, pax: 2, name: 'Mr and Mrs Tan', notes: 'Anniversary · deposit paid', st: 'Confirmed' },
    { ref: 'MC-3094', seat: 'room', time: 1110, pax: 4, name: 'Arjun', notes: 'Nut allergy (1)', st: 'Confirmed' },
    { ref: 'MC-3097', seat: 'room', time: 1170, pax: 6, name: 'Corporate dinner', notes: 'Cendre menu, wine pairing', st: 'Confirmed' },
    { ref: 'MC-3099', seat: 'room', time: 1230, pax: 2, name: 'Sarah', notes: 'Window table if possible', st: 'New' },
    { ref: 'MC-3102', seat: 'counter', time: 1245, pax: 3, name: 'Hui Min', notes: 'Waitlist for 8:45pm', st: 'Waitlist', wait: true }
  ];
  var BST = ['New', 'Confirmed', 'Seated'], OST = ['New', 'Preparing', 'Ready', 'Collected'];
  function pageOwner() {
    var tab = 'tonight', root = $('[data-owner]');
    function paint() {
      var o = owner(), sm = load('ost', {}), t = today();
      var mine = bookings().map(function (b) { return { ref: b.ref, seat: b.seat, time: b.time, date: b.date, pax: b.pax, name: b.name, notes: [b.occ, (b.diet || []).join(', '), b.notes, b.dep ? 'deposit ' + rm(b.dep) : ''].filter(Boolean).join(' · '), st: sm[b.ref] || b.st, wait: b.wait, mine: true }; });
      var seeds = SEED_BOOK.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; y.date = t; y.st = sm[x.ref] || x.st; return y; });
      var all = mine.concat(seeds), tonight = all.filter(function (b) { return b.date === t && !b.wait; }), waits = all.filter(function (b) { return b.wait; }), later = mine.filter(function (b) { return b.date !== t && !b.wait; });
      var covers = tonight.reduce(function (a, b) { return a + b.pax; }, 0), counter = tonight.filter(function (b) { return b.seat === 'counter'; }).reduce(function (a, b) { return a + b.pax; }, 0);
      var takeaway = load('orders', []), seasonal = load('seasonal', []);
      function bcard(b) { return '<div class="ocard"><div class="ocard__top"><b>' + fmtTime(b.time) + ' · ' + b.pax + ' · ' + esc(b.name) + '</b><button type="button" class="ost ost--' + b.st + '" data-bst="' + esc(b.ref) + '"' + (b.wait ? ' disabled' : '') + '>' + b.st + '</button></div><span>' + esc(SEATS[b.seat].n) + (b.date !== t ? ' · ' + fmtDay(b.date) : '') + '</span>' + (b.notes ? '<span class="muted">' + esc(b.notes) + '</span>' : '') + (b.mine ? '<span class="tag tag--new" style="justify-self:start">You booked this one</span>' : '') + '</div>'; }
      var panes = {
        tonight: '<div class="covers"><div><b>' + covers + '</b><small>covers</small></div><div><b>' + counter + '/8</b><small>counter</small></div><div><b>' + waits.length + '</b><small>waitlist</small></div></div>' + tonight.sort(function (a, b) { return a.time - b.time; }).map(bcard).join('') + (later.length ? '<p style="margin:8px 0 0;font-weight:500">Coming up</p>' + later.map(bcard).join('') : ''),
        waitlist: waits.length ? waits.map(function (b) { return '<div class="ocard"><div class="ocard__top"><b>' + (b.date !== t ? fmtDay(b.date) + ', ' : '') + fmtTime(b.time) + ' · ' + b.pax + ' · ' + esc(b.name) + '</b><span class="ost ost--Waitlist">Waitlist</span></div><span class="muted">' + esc(SEATS[b.seat].n) + (b.notes ? ' · ' + esc(b.notes) : '') + '</span><button class="btn btn--sm btn--ghost" type="button" data-offer="' + esc(b.ref) + '" style="justify-self:start;margin-top:4px">Offer the table</button></div>'; }).join('') : '<p class="muted">Nobody is waiting.</p>',
        takeaway: (takeaway.length ? takeaway.map(function (x) { var st = sm[x.no] || x.st; return '<div class="ocard"><div class="ocard__top"><b>' + esc(x.no) + ' · ' + esc(x.name) + '</b><button type="button" class="ost ost--' + st + '" data-ost="' + esc(x.no) + '">' + st + '</button></div><span>' + (x.mode === 'pickup' ? 'Collect' : 'Delivery') + ' · ' + fmtDay(x.date) + ', ' + fmtTime(x.time) + ' · ' + rm(x.total) + (x.pay === 'wa' ? ' · via WhatsApp' : '') + '</span><span class="muted">' + esc(x.items.map(function (l) { return l.qty + ' × ' + l.n; }).join(', ')) + '</span></div>'; }).join('') : '<p class="muted">No takeaway orders yet. Place one on the takeaway page.</p>') +
          (seasonal.length ? '<p style="margin:8px 0 0;font-weight:500">Seasonal bookings</p>' + seasonal.map(function (x) { return '<div class="ocard"><b>' + esc(x.ref) + ' · ' + esc(x.name) + '</b><span>' + esc(x.season) + ' · ' + fmtDay(x.date) + ', ' + fmtTime(x.time) + ' · ' + rm(x.total) + '</span><span class="muted">' + esc(x.items.join(', ')) + '</span></div>'; }).join('') : ''),
        menu: '<p class="small muted" style="margin:0">Switch a dish off when it runs out, or change a price. The menus change at once.</p>' + MENU.map(function (it) { return '<div class="orow"><span><b>' + esc(it.n) + '</b></span><input type="number" min="1" step="1" value="' + priceOf(it) + '" data-price="' + it.id + '" aria-label="Price of ' + esc(it.n) + '"><label class="switch" title="Not available tonight"><input type="checkbox" data-out="' + it.id + '"' + (o.out[it.id] ? ' checked' : '') + ' aria-label="' + esc(it.n) + ' not available tonight"><span></span></label></div>'; }).join(''),
        seasonal: SEASONS.map(function (s) { return '<p style="margin:6px 0 0;font-weight:500">' + esc(s.name) + '</p>' + s.items.map(function (x) { return '<div class="orow" style="grid-template-columns:1fr auto"><span><b>' + esc(x.n) + '</b><br><small class="muted">' + leftOf(x) + ' of ' + x.total + ' left</small></span><div class="qty"><button type="button" data-left="' + x.id + ':-1" aria-label="One fewer">−</button><output>' + leftOf(x) + '</output><button type="button" data-left="' + x.id + ':1" aria-label="One more">+</button></div></div>'; }).join(''); }).join(''),
        status: '<div class="ostatus">' + [['auto', 'Normal', 'Open by your hours; reservations as usual'], ['full', 'Fully booked tonight', 'Tonight’s times show “waitlist”; guests can still join it'], ['closed', 'Closed for a private event', 'Tonight switches off; other days stay open']].map(function (s) { return '<button type="button" data-status-set="' + s[0] + '" class="' + (o.status === s[0] ? 'is-on' : '') + '">' + s[1] + '<small>' + s[2] + '</small></button>'; }).join('') + '</div><p class="small muted">The website now says: <b>' + esc(status().text) + '</b></p>'
      };
      root.innerHTML = '<div class="phone"><div class="phone__screen"><div class="phone__top"><small>Maison Cendre · ' + fmtDay(t) + '</small><h3>' + covers + ' covers tonight' + (waits.length ? ' · ' + waits.length + ' waiting' : '') + '</h3><div class="otabs" role="tablist">' + [['tonight', 'Tonight'], ['waitlist', 'Waitlist'], ['takeaway', 'Takeaway'], ['menu', 'Menu'], ['seasonal', 'Seasonal'], ['status', 'Status']].map(function (x) { return '<button type="button" role="tab" data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'is-on' : '') + '" aria-selected="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div><div class="opane">' + panes[tab] + '</div></div></div>';
    }
    root.addEventListener('click', function (e) {
      var x, sm;
      if ((x = e.target.closest('[data-tab]'))) { tab = x.getAttribute('data-tab'); paint(); return; }
      if ((x = e.target.closest('[data-bst]'))) { sm = load('ost', {}); sm[x.getAttribute('data-bst')] = BST[(BST.indexOf(x.textContent) + 1) % BST.length]; save('ost', sm); paint(); return; }
      if ((x = e.target.closest('[data-ost]'))) { sm = load('ost', {}); sm[x.getAttribute('data-ost')] = OST[(OST.indexOf(x.textContent) + 1) % OST.length]; save('ost', sm); paint(); return; }
      if ((x = e.target.closest('[data-offer]'))) {
        var ref = x.getAttribute('data-offer'), b = bookings().filter(function (y) { return y.ref === ref; })[0] || SEED_BOOK.filter(function (y) { return y.ref === ref; })[0];
        var msg = 'Good news from Maison Cendre (demo website): a table has opened ' + (b && b.date && b.date !== today() ? 'on ' + fmtDay(b.date) + ' ' : 'tonight ') + 'at ' + fmtTime(b.time) + ' for ' + b.pax + '. Reply YES within 30 minutes and it is yours.';
        openSheet('<div class="sheet__body" style="padding-bottom:18px"><h2 id="sheet-title">Offer the table</h2><p class="muted">The guest gets this on WhatsApp (demo: nothing is sent):</p><div class="waprev">' + esc(msg) + '</div></div>');
        return;
      }
      if ((x = e.target.closest('[data-left]'))) { var pr = x.getAttribute('data-left').split(':'), f = fitem(pr[0]), o = owner(); o.left[pr[0]] = Math.max(0, Math.min(f.it.total, leftOf(f.it) + +pr[1])); setOwner(o); paint(); return; }
      if ((x = e.target.closest('[data-status-set]'))) { var ow = owner(); ow.status = x.getAttribute('data-status-set'); setOwner(ow); paint(); refreshStatus(); toast('The website now says: ' + status().text); }
    });
    root.addEventListener('change', function (e) {
      var o = owner(), x = e.target;
      if (x.hasAttribute('data-out')) { var id = x.getAttribute('data-out'); if (x.checked) o.out[id] = 1; else delete o.out[id]; setOwner(o); toast(item(id).n + (x.checked ? ' is marked “not available tonight”.' : ' is back on the menu.')); return; }
      if (x.hasAttribute('data-price')) { var pid = x.getAttribute('data-price'), v = Math.round(parseFloat(x.value) * 100) / 100; if (v > 0 && v < 5000) { o.price[pid] = v; setOwner(o); toast(item(pid).n + ' is now ' + rm(v) + ' on the menus.'); } else paint(); }
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      if (!confirm('Reset the demo? This clears the reservations, orders, gift cards and owner changes made in this browser.')) return;
      ['owner', 'orders', 'bookings', 'vouchers', 'ost', 'bag', 'checkout', 'enquiries', 'seasonal', 'seq'].forEach(function (k) { try { localStorage.removeItem('mc_' + k); } catch (err) { /* ignore */ } });
      tab = 'tonight'; paint(); refreshStatus(); updateBag(); toast('Demo reset.');
    });
    paint();
  }

  // ------------------------------------------------------------------ start
  var PAGES = { home: pageHome, menu: pageMenu, book: pageBook, order: pageOrder, festive: pageFestive, private: pagePrivate, gift: pageGift, owner: pageOwner };
  document.addEventListener('DOMContentLoaded', function () {
    shared();
    var fn = PAGES[document.body.getAttribute('data-page')];
    if (fn) fn();
    window.addEventListener('storage', function (e) { if (e.key === 'mc_owner') location.reload(); });
  });
})();
