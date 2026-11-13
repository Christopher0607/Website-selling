/* Agency Core — 节日预购：倒数、结账的日子和时段按钮（2026-11-13） */
(function () {
  'use strict';
  var T = window.agcFestive || { days: 'days', hours: 'hrs', mins: 'min', left: '%d left', full: 'Full' };

  // Countdown to the cut-off (the server already printed the starting numbers).
  function tick() {
    var now = Date.now() / 1000;
    document.querySelectorAll('[data-agc-count]').forEach(function (el) {
      var secs = Math.max(0, parseInt(el.getAttribute('data-agc-count'), 10) - now);
      var b = el.querySelectorAll('b');
      if (b.length !== 3) return;
      b[0].textContent = Math.floor(secs / 86400);
      b[1].textContent = Math.floor((secs % 86400) / 3600);
      b[2].textContent = Math.floor((secs % 3600) / 60);
    });
  }
  if (document.querySelector('[data-agc-count]')) { tick(); setInterval(tick, 30000); }

  // Checkout: turn the <select> into day chips + time chips (the select stays the real field).
  function chip(main, sub, pressed, disabled) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'agc-chip';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.disabled = !!disabled;
    b.innerHTML = '<span></span><small></small>';
    b.firstChild.textContent = main;
    b.lastChild.textContent = sub;
    return b;
  }
  function enhance() {
    document.querySelectorAll('.agc-fest-pick:not(.is-enhanced)').forEach(function (box) {
      var sel = box.querySelector('select');
      if (!sel) return;
      var days = [], byDay = {};
      Array.prototype.forEach.call(sel.options, function (o) {
        var d = o.getAttribute('data-day');
        if (!d) return;
        if (!byDay[d]) { byDay[d] = []; days.push({ day: d, label: o.getAttribute('data-daylabel') }); }
        byDay[d].push(o);
      });
      if (!days.length) return;
      box.classList.add('is-enhanced');
      var dayRow = document.createElement('div');
      dayRow.className = 'agc-fest-pick__days';
      dayRow.setAttribute('role', 'group');
      var slotRow = document.createElement('div');
      slotRow.className = 'agc-fest-pick__slots';
      slotRow.setAttribute('role', 'group');
      sel.parentNode.insertBefore(dayRow, sel.nextSibling);
      dayRow.parentNode.insertBefore(slotRow, dayRow.nextSibling);
      var current = sel.value ? sel.value.split('|')[0] : '';

      function showSlots(day) {
        slotRow.innerHTML = '';
        (byDay[day] || []).forEach(function (o) {
          var left = parseInt(o.getAttribute('data-left'), 10) || 0;
          var b = chip(o.getAttribute('data-slot'), left ? T.left.replace('%d', left) : T.full, sel.value === o.value, !left);
          b.addEventListener('click', function () {
            sel.value = o.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            slotRow.querySelectorAll('.agc-chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          });
          slotRow.appendChild(b);
        });
      }
      days.forEach(function (d) {
        var open = byDay[d.day].reduce(function (n, o) { return n + (parseInt(o.getAttribute('data-left'), 10) || 0); }, 0);
        var parts = d.label.split(' ');
        var b = chip(parts.slice(1).join(' ') || d.label, parts.length > 1 ? parts[0] : '', d.day === current, !open);
        b.addEventListener('click', function () {
          current = d.day;
          dayRow.querySelectorAll('.agc-chip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          if (sel.value.split('|')[0] !== d.day) sel.value = '';
          showSlots(d.day);
        });
        dayRow.appendChild(b);
      });
      if (current) showSlots(current);
    });
  }
  enhance();
  if (window.jQuery) window.jQuery(document.body).on('updated_checkout', enhance);
})();
