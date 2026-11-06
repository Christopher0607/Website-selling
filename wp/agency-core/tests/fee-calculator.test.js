// 用法：node wp/agency-core/tests/fee-calculator.test.js   —— 3 组手算例子
const assert = require('assert');
global.window = {}; global.document = { readyState: 'complete', querySelectorAll: () => [] };
require('../assets/js/fee-calculator.js');
const c = window.agcFeeCalc;
const base = { price: 100, discount: 0, cost: 40, shipping: 0, orders: 50, commission: 14, transaction: 3.5, other: 0, support: 0.5, sst: 8, gateway: 2, gateway_fixed: 0 };
const f = (n) => Number(n.toFixed(2));
// 例 1：RM100，佣金 14% + 交易费 3.5% + RM0.50，SST 8% → 费用 (14+3.5+0.5)×1.08 = 19.44
let r = c(base);
assert.deepStrictEqual([f(r.shopee_fees), f(r.shopee_profit), f(r.site_profit), f(r.diff), f(r.yearly)], [19.44, 40.56, 58, 17.44, 10464]);
// 例 2：RM59 − RM5 折扣，佣金 16%，交易 3.5%，Cashback 5.5%，运费 RM3，网关 1.5% + RM1
r = c({ ...base, price: 59, discount: 5, cost: 20, shipping: 3, commission: 16, other: 5.5, gateway: 1.5, gateway_fixed: 1 });
assert.deepStrictEqual([f(r.shopee_fees), f(r.shopee_profit), f(r.site_profit), f(r.diff)], [15.12, 15.88, 29.19, 13.31]);
// 例 3：折扣等于售价 → 没有费用
r = c({ ...base, price: 30, discount: 30 });
assert.strictEqual(r.shopee_fees, 0); assert.strictEqual(r.site_fees, 0);
console.log('fee calculator: 3/3 PASS');
