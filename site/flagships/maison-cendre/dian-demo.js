/* Maison Cendre demo: the kitchen and counter screens (2026-11-16).
   The real shop dashboard (agency-core assets/owner/app.js, copied to owner-app/ by build.py) runs here unchanged; this
   file stands in for the restaurant's server. Table orders come from the demo's table page (table.html, kept in this
   browser under mc_tables), so the kitchen, the tables and "close the day" show what you ordered on this phone. */
(function () {
  'use strict';
  var KEY = 'mc_tables';
  var REST = 'demo-owner/';
  var TABLES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  var METHODS = { cash: 'Cash', duitnow: 'DuitNow QR', card: 'Card', pos: 'Shop cashier', other: 'Other' };
  var q = new URLSearchParams(location.search);

  window.AGC_OWNER = {
    rest: REST, nonce: 'demo', lang: q.get('lang') === 'zh' ? 'zh' : 'en', tz: 'Asia/Kuala_Lumpur', site: 'Maison Cendre', shop: 'index.html',
    admin: '#', orders: '#', logout: 'owner.html', user: 'Demo', currency: 'RM',
    can: { products: false, settings: false, admin: false }, demo: true, manual: false, table: true,
    qrjs: 'owner-app/qrcode.js', nav: ['kitchen', 'tables', 'close'], start: '#/kitchen'
  };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private mode: this page still works */ } }
  function money(v) { return 'RM' + (Math.round(Number(v || 0) * 100) / 100).toFixed(2); }
  function sec(ms) { return Math.floor(ms / 1000); }
  function isOpen(x) { return x.st === 'open'; }
  function row(x) {
    return {
      id: x.id, number: x.number, table: x.table, created: sec(x.at), done: x.kitchen === 'done', done_at: x.doneAt ? sec(x.doneAt) : 0,
      items: (x.lines || []).map(function (l) { return { qty: l.qty, name: l.n, opts: l.o || '', note: l.note || '', total: money(l.p) }; }),
      note: x.note || '', total: x.total, total_f: money(x.total), status: x.st === 'paid' ? 'completed' : (x.st === 'cancelled' ? 'cancelled' : 'on-hold')
    };
  }
  function link(t) { return new URL('table.html?t=' + encodeURIComponent(t), location.href).href; }
  function kitchen() {
    var all = load(), now = Date.now();
    var todo = all.filter(function (x) { return isOpen(x) && x.kitchen !== 'done'; }).map(row).sort(function (a, b) { return a.created - b.created; });
    var done = all.filter(function (x) { return x.st !== 'cancelled' && x.kitchen === 'done' && (x.doneAt || 0) > now - 30 * 60000; }).map(row).sort(function (a, b) { return b.done_at - a.done_at; }).slice(0, 12);
    return { todo: todo, done: done, now: sec(now), on: true };
  }
  function tables() {
    var all = load(), open = {};
    all.filter(isOpen).forEach(function (x) { (open[x.table] = open[x.table] || []).push(x); });
    var names = TABLES.slice();
    Object.keys(open).forEach(function (t) { if (names.indexOf(t) === -1) names.push(t); });
    return {
      tables: names.map(function (t) {
        var list = (open[t] || []).slice().reverse().map(row);
        var sum = list.reduce(function (s, x) { return s + x.total; }, 0);
        return { table: t, orders: list, total: sum, total_f: money(sum), since: list.length ? Math.min.apply(null, list.map(function (x) { return x.created; })) : 0, ready: list.length ? list.every(function (x) { return x.done; }) : false, link: link(t) };
      }),
      now: sec(Date.now()), site: 'Maison Cendre'
    };
  }
  function ymd(ms) { var d = new Date(ms); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function day(date) {
    var today = ymd(Date.now());
    date = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date <= today ? date : today;
    var all = load(), bills = {}, methods = {}, items = {}, open = {}, cancel = { n: 0, t: 0 }, total = 0, n = 0;
    all.forEach(function (x) {
      if (x.st === 'cancelled') { if (ymd(x.at) === date) { cancel.n++; cancel.t += x.total; } return; }
      if (isOpen(x)) { if (date === today) open[x.table] = (open[x.table] || 0) + x.total; return; }
      var paidAt = x.paidAt || x.at;
      if (ymd(paidAt) !== date) return;
      var m = METHODS[x.paidBy] ? x.paidBy : 'cash';
      var b = x.bill || ('o' + x.id);
      if (!bills[b]) bills[b] = { table: x.table, time: paidAt, numbers: [], method: m, total: 0 };
      bills[b].numbers.push(x.number); bills[b].total += x.total;
      methods[m] = (methods[m] || 0) + x.total; total += x.total; n++;
      (x.lines || []).forEach(function (l) { items[l.n] = (items[l.n] || 0) + l.qty; });
    });
    var list = Object.keys(bills).map(function (k) { return bills[k]; }).sort(function (a, b) { return a.time - b.time; });
    var d = new Date(date + 'T12:00:00');
    return {
      date: date, label: d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }), today: date === today,
      total: total, total_f: money(total), bills_n: list.length, orders_n: n,
      methods: Object.keys(METHODS).filter(function (k) { return k === 'cash' || methods[k]; }).map(function (k) { return { key: k, label: METHODS[k], bills: list.filter(function (b) { return b.method === k; }).length, total: methods[k] || 0, total_f: money(methods[k] || 0) }; }),
      bills: list.map(function (b) { return { table: b.table, time: sec(b.time), time_f: new Date(b.time).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' }).toLowerCase(), numbers: b.numbers, method: METHODS[b.method], method_key: b.method, total: b.total, total_f: money(b.total) }; }),
      items: Object.keys(items).sort(function (a, b) { return items[b] - items[a]; }).slice(0, 15).map(function (k) { return { name: k, qty: items[k] }; }),
      open: Object.keys(open).sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); }).map(function (k) { return { table: k, total_f: money(open[k]) }; }),
      open_f: money(Object.keys(open).reduce(function (s, k) { return s + open[k]; }, 0)),
      cancelled: { n: cancel.n, total_f: money(cancel.t) }, web: { n: 0, total_f: money(0) }
    };
  }
  function summary() {
    var all = load(), today = ymd(Date.now());
    var paidToday = all.filter(function (x) { return x.st === 'paid' && ymd(x.paidAt || x.at) === today; });
    return {
      counts: { check: 0, make: 0, ready: 0, done: 0, cancelled: 0, pending: 0, table: all.filter(isOpen).length },
      today: { orders: all.filter(function (x) { return ymd(x.at) === today; }).length, revenue: money(paidToday.reduce(function (s, x) { return s + x.total; }, 0)) },
      season: { orders: 0, revenue: money(0) }, next: [], low: [], soldout: [], notify: 0, paused: false, table: true,
      fest: { on: false, name: '', cutoff: 0, cutoff_l: '', closed: false, early: 0, rolling: '', next_day: '' }
    };
  }

  function reply(code, body) { return Promise.resolve(new Response(JSON.stringify(body), { status: code, headers: { 'Content-Type': 'application/json' } })); }
  var realFetch = window.fetch.bind(window);
  window.fetch = function (url, init) {
    url = String(url);
    if (url.indexOf(REST) !== 0) return realFetch(url, init);
    var path = url.slice(REST.length), qs = new URLSearchParams(path.split('?')[1] || ''), m;
    var body = {}; try { body = JSON.parse((init && init.body) || '{}'); } catch (e) { /* no body */ }
    path = path.split('?')[0];
    if (path === 'summary') return reply(200, summary());
    if (path === 'kitchen') return reply(200, kitchen());
    if ((m = path.match(/^kitchen\/(\d+)$/))) {
      var k = load(); k.forEach(function (x) { if (String(x.id) === m[1]) { x.kitchen = body.done ? 'done' : 'new'; x.doneAt = body.done ? Date.now() : 0; } }); save(k);
      return reply(200, kitchen());
    }
    if (path === 'tables') return reply(200, tables());
    if (path === 'tables/pay') {
      var p = load(), bill = Math.random().toString(36).slice(2, 10), ids = (body.ids || []).map(String), paid = 0, method = METHODS[body.method] ? body.method : 'other';
      p.forEach(function (x) {
        if (x.table === String(body.table) && isOpen(x) && (!ids.length || ids.indexOf(String(x.id)) !== -1)) { x.st = 'paid'; x.kitchen = 'done'; x.doneAt = x.doneAt || Date.now(); x.paidAt = Date.now(); x.paidBy = method; x.bill = bill; paid++; }
      });
      if (!paid) return reply(404, { message: 'Nothing to pay for this table.' });
      save(p);
      var tb = tables(); tb.paid = paid; return reply(200, tb);
    }
    if ((m = path.match(/^tables\/cancel\/(\d+)$/))) {
      var c = load(); c.forEach(function (x) { if (String(x.id) === m[1] && isOpen(x)) x.st = 'cancelled'; }); save(c);
      return reply(200, tables());
    }
    if (path === 'tables/day') return reply(200, day(qs.get('date')));
    return reply(404, { message: 'This screen is not part of the demo.' });
  };
  // the customer's table page in another tab changes the orders: the screens poll every few seconds anyway
})();
