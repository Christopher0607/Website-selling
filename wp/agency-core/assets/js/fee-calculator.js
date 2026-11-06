/* Shopee 费用 vs 自己的网站 —— 全部在浏览器计算，不传送任何资料 */
(function () {
  'use strict';
  function rm(n) { return (n < 0 ? '-RM' : 'RM') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pct(n) { return isFinite(n) ? (n * 100).toFixed(1) + '%' : '–'; }

  /** Pure calculation — exported for testing. */
  function calc(v) {
    var base = Math.max(0, v.price - v.discount);
    var commission = base * v.commission / 100;
    var transaction = base * v.transaction / 100;
    var other = base * v.other / 100;
    var support = base > 0 ? v.support : 0;
    var beforeSst = commission + transaction + other + support;
    var sst = beforeSst * v.sst / 100;
    var shopeeFees = beforeSst + sst;
    var shopeeReceived = base - shopeeFees - v.shipping;
    var shopeeProfit = shopeeReceived - v.cost;
    var siteFees = base > 0 ? base * v.gateway / 100 + v.gateway_fixed : 0;
    var siteReceived = base - siteFees - v.shipping;
    var siteProfit = siteReceived - v.cost;
    var diff = siteProfit - shopeeProfit;
    return {
      base: base,
      c_commission: commission, c_transaction: transaction, c_other: other, c_support: support, c_sst: sst,
      shopee_fees: shopeeFees, shopee_received: shopeeReceived, shopee_profit: shopeeProfit,
      shopee_margin: base ? shopeeProfit / base : NaN,
      site_fees: siteFees, site_received: siteReceived, site_profit: siteProfit,
      site_margin: base ? siteProfit / base : NaN,
      diff: diff, yearly: diff * v.orders * 12
    };
  }
  window.agcFeeCalc = calc;

  function init(root) {
    var inputs = root.querySelectorAll('[data-calc]');
    function read() {
      var v = {};
      inputs.forEach(function (el) { var n = parseFloat(el.value); v[el.getAttribute('data-calc')] = isFinite(n) && n >= 0 ? n : 0; });
      return v;
    }
    function render() {
      var r = calc(read());
      var set = function (k, txt) { root.querySelectorAll('[data-out="' + k + '"]').forEach(function (el) { el.textContent = txt; }); };
      ['shopee', 'site'].forEach(function (p) {
        set(p + '_fees', rm(r[p + '_fees']));
        set(p + '_received', rm(r[p + '_received']));
        set(p + '_profit', rm(r[p + '_profit']));
        set(p + '_margin', pct(r[p + '_margin']));
      });
      ['c_commission', 'c_transaction', 'c_other', 'c_support', 'c_sst'].forEach(function (k) { set(k, rm(r[k])); });
      set('diff', rm(r.diff)); set('diff2', rm(r.diff));
      set('yearly', rm(r.yearly)); set('yearly2', rm(r.yearly));
    }
    inputs.forEach(function (el) { el.addEventListener('input', render); });
    render();
  }
  function boot() { document.querySelectorAll('[data-agc-calc]').forEach(init); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
