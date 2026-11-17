/* Delivery-app commission vs your own website (2026-11-17) — worked out in the browser, nothing is sent. */
(function () {
  'use strict';
  function rm(n) { return (n < 0 ? '-RM' : 'RM') + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /** Pure calculation — exported for testing. */
  function calc(v, care, setup) {
    var rate = v.commission / 100 * (1 + v.sst / 100);          // commission + SST on it, per RM of sales
    var sales = v.orders * v.avg;
    var nowM = sales * rate;
    var moved = v.orders * Math.min(100, v.regulars) / 100;
    var saved = moved * v.avg * rate;
    var costs = moved * (v.avg * v.gateway / 100 + v.gateway_fixed + v.own_cost);
    var net = saved - costs - care;
    return { now_m: nowM, now_y: nowM * 12, moved: moved, saved: saved, costs: costs, net: net, payback: net > 0 ? setup / net : Infinity };
  }
  window.agcCommissionCalc = calc;

  function init(root) {
    var care = +root.getAttribute('data-care') || 0, setup = +root.getAttribute('data-setup') || 0;
    var inputs = root.querySelectorAll('[data-cc]');
    function out(k, t) { var el = root.querySelector('[data-cc-out="' + k + '"]'); if (el) el.textContent = t; }
    function run() {
      var v = {};
      inputs.forEach(function (el) { var n = parseFloat(el.value); v[el.getAttribute('data-cc')] = isFinite(n) && n >= 0 ? n : 0; });
      var r = calc(v, care, setup);
      out('now_m', rm(r.now_m)); out('now_y', rm(r.now_y));
      out('moved', Math.round(r.moved) + ' / month');
      out('saved', rm(r.saved)); out('costs', '-' + rm(r.costs)); out('net', rm(r.net));
      out('verdict', r.net > 0
        ? 'About ' + rm(r.net) + ' more a month. A RM' + setup.toLocaleString('en-MY') + ' website pays for itself in about ' + Math.max(1, Math.ceil(r.payback)) + ' month' + (Math.ceil(r.payback) > 1 ? 's' : '') + '. · 每月多留约 ' + rm(r.net) + '，约 ' + Math.max(1, Math.ceil(r.payback)) + ' 个月回本。'
        : 'At these numbers it does not pay off yet — that is useful to know too. · 照这些数字还不划算，这也值得知道。');
    }
    inputs.forEach(function (el) { el.addEventListener('input', run); });
    run();
  }
  document.querySelectorAll('[data-agc-commission]').forEach(init);
})();
