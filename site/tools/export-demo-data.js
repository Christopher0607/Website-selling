// 2026-11-16 (docs/14-wordpress-demos.md): reads a demo's own lists (menu, festive sets, delivery zones, hours…) straight
// from its page script and writes sites/demo-<code>/site.json for the WordPress version: what WooCommerce products to make,
// and the rules the server checks (the same values the page uses, so the two can't drift apart).
//
// Usage (after python3 site/build.py, with python3 -m http.server 8790 -d site/dist running):
//   node site/tools/export-demo-data.js <code|all> [http://localhost:8790]
// Re-run whenever a demo's lists change; check-wp-demo.js warns when site.json is out of date.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[3] || 'http://localhost:8790').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..', '..');

// What each demo needs on WordPress. "lists": the page's product lists (item id = product SKU); the rest are the rules of
// each kind of order (class-site.php). Times are minutes after midnight, like the page's own HOURS.
const SPEC = {
  'sireh-salt': {
    page: 'menu.html',
    spec: {
      lists: [{ var: 'MENU', cats: 'CATS' }, { var: 'SEASONS', items: 'items', stock: 'left' }],
      order: { hours: 'HOURS', zones: 'ZONES', min: 'DELIVERY_MIN', free: 'FREE_DELIVERY', prep: 30, busy: 20, first: 15, last: 30, step: 15, days: 8 },
      book: { rules: 'BOOK', hours: 'HOURS', tables: 6, first: 0, last: 90, step: 30, prep: 30, days: 15, deposit: { from: 'depositFrom', amount: 'deposit', per: 'booking', pay: 'later' } },
      voucher: { product: 'gift-voucher', name: 'Gift voucher', min: 30, max: 1000, months: 12, prefix: 'GIFT-' },
      table: { menu: 'MENU', cats: 'CATS', hero: 'interior' },
      redirects: { 'dian.html': '/?agc_demo=dian&hash=/kitchen', 'table.html': '@table' },
      shop: '/menu.html',
      coupons: [{ from: 'PROMO', code: 'code', percent: 'pct' }],
      tables: '1-12',
      featured: 'SIGNATURE'
    }
  }
};

(async () => {
  const want = process.argv[2];
  if (!want) { console.log('用法: node site/tools/export-demo-data.js <代号|all> [网址]'); process.exit(2); }
  const slugs = want === 'all' ? Object.keys(SPEC) : [want];
  const browser = await chromium.launch();
  for (const slug of slugs) {
    const S = SPEC[slug];
    if (!S) { console.log('没有设定：' + slug); process.exitCode = 1; continue; }
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__agcExport = (d) => { window.__agcData = JSON.parse(JSON.stringify(d, (k, v) => (v instanceof RegExp ? v.source : v))); };
    });
    await page.goto(`${BASE}/demo/${slug}/${S.page}`);
    const data = await page.evaluate(() => window.__agcData || null);
    await page.close();
    if (!data) { console.log(`${slug}: the page didn't hand over its lists (window.__agcExport in app.js?)`); process.exitCode = 1; continue; }
    const out = path.join(ROOT, 'sites', `demo-${slug}`, 'site.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ slug, spec: S.spec, data }, null, 1) + '\n');
    const n = S.spec.lists.reduce((a, l) => a + (l.items ? (data[l.var] || []).reduce((b, g) => b + (g[l.items] || []).length, 0) : (data[l.var] || []).length), 0);
    console.log(`${slug}: ${n} products → ${path.relative(ROOT, out)}`);
  }
  await browser.close();
})();
