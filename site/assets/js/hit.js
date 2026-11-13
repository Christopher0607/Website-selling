/* Cartsmith visitor counter (2026-11-13) — feeds the 流量 tab in the sales desk (site/server/traffic.mjs).
   Sends: the page, the site the visitor came from (name only), ?utm_source / ?ref, a random id kept in this browser
   (to count visitors, no cookie), seconds the page was on screen, and taps on WhatsApp / email / Instagram / phone
   links and forms. No IP, name or anything typed. Skipped in automated browsers.
   Also loaded by the WordPress demo shop (agency-core, setting studio_hits), so the address of /api/hit comes from
   where this file was loaded. */
(function () {
  try {
    if (navigator.webdriver || window.__csHit) return;
    window.__csHit = 1;
    var me = document.currentScript && document.currentScript.src;
    var api = (me ? new URL(me).origin : location.origin) + '/api/hit';
    var vid = '', isNew = 0;
    try {
      vid = localStorage.getItem('cs_vid') || '';
      if (!vid) { vid = Math.random().toString(36).slice(2, 12); localStorage.setItem('cs_vid', vid); isNew = 1; }
    } catch (e) { /* private mode: counted per page view */ }
    var path = location.pathname;
    var ref = '';
    try { if (document.referrer) { var r = new URL(document.referrer); ref = r.host === location.host ? '-' : r.host; } } catch (e) { /* none */ }
    var q = new URLSearchParams(location.search);
    var send = function (o) {
      o.v = vid; o.p = path;
      var u = api + '?' + new URLSearchParams(o).toString();
      try { if (navigator.sendBeacon && navigator.sendBeacon(u)) return; } catch (e) { /* fall through */ }
      try { fetch(u, { method: 'POST', keepalive: true, credentials: 'include', mode: 'no-cors' }); } catch (e) { /* ignore */ }
    };
    send({ e: 'pv', r: ref, s: q.get('utm_source') || q.get('ref') || '', n: isNew });

    // seconds on screen (sent when the page is hidden or left)
    var on = document.visibilityState === 'visible' ? Date.now() : 0, shown = 0, sent = 0;
    var flush = function () {
      if (on) { shown += Date.now() - on; on = 0; }
      var sec = Math.round(shown / 1000) - sent;
      if (sec >= 1) { sent += sec; send({ e: 't', sec: Math.min(sec, 1800) }); }
    };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else on = Date.now(); });
    addEventListener('pagehide', flush);

    // taps that mean "I want to talk to you"
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]');
      if (!a) return;
      var h = a.getAttribute('href') || '';
      var k = /wa\.me|whatsapp\.com/i.test(h) ? 'whatsapp' : /^mailto:/i.test(h) ? 'email' : /instagram\.com|ig\.me/i.test(h) ? 'instagram' : /^tel:/i.test(h) ? 'phone' : '';
      if (k) send({ e: 'act', a: k });
    }, true);
    document.addEventListener('submit', function (ev) {
      var f = ev.target, n = f && f.querySelector && f.querySelector('[name="form-name"]');
      send({ e: 'act', a: 'form:' + String((n && n.value) || (f && f.getAttribute('name')) || 'form').replace(/[^\w-]/g, '').slice(0, 40) });
    }, true);
    window.csHit = function (a) { send({ e: 'act', a: a }); }; // e.g. the AI chat: csHit('chat')
  } catch (e) { /* never break the page */ }
})();
