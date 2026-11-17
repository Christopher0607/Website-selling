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
      book: { hours: 'HOURS', first: 0, last: 90, step: 30, prep: 30, days: 15,
        seats: { '*': { cap: 6, count: 'booking', max: 'BOOK.max', deposit: { from: 'BOOK.depositFrom', amount: 'BOOK.deposit', per: 'booking', pay: 'later' } } } },
      voucher: { product: 'gift-voucher', name: 'Gift voucher', min: 30, max: 1000, months: 12, prefix: 'GIFT-' },
      table: { menu: 'MENU', cats: 'CATS', hero: 'interior', pay: 'choose', note: 'Drinks come first; mains in about 15 minutes.' },
      redirects: { 'dian.html': '/?agc_demo=dian&hash=/kitchen', 'table.html': '@table' },
      shop: '/menu.html',
      coupons: [{ from: 'PROMO', code: 'code', percent: 'pct' }],
      tables: '1-12',
      featured: 'SIGNATURE',
      ref: 'SS'
    }
  },
  'maison-cendre': {
    page: 'menu.html',
    spec: {
      lists: [{ var: 'MENU', cats: 'CATS' }, { var: 'SEASONS', items: 'items', stock: 'left' }],
      order: { hours: 'HOURS', zones: 'ZONES', min: 'DELIVERY_MIN', free: 'FREE_DELIVERY', prep: 45, first: 30, last: 60, step: 15, days: 8 },
      book: { hours: 'HOURS', prep: 45, step: 30, first: 0, last: 90, last_lunch: 60, lunch_before: 900, days: 21, waitlist: true,
        seats: {
          room: { cap: 6, count: 'booking', min: 1, max: 8, deposit: { from: 6, amount: 50, per: 'guest', pay: 'now' } },
          counter: { cap: 8, count: 'guest', min: 1, max: 4, times: [1080, 1245], dows: [2, 3, 4, 5, 6], deposit: { from: 1, amount: 100, per: 'guest', pay: 'now' } }
        } },
      voucher: { product: 'gift-card', name: 'Gift card', min: 100, max: 5000, months: 12, prefix: 'GIFT-' },
      // 2026-11-17: order at the table by QR (Junyu: guests in the restaurant can't order to the back office), like Sireh & Salt
      table: { menu: 'MENU', cats: 'CATS', hero: 'room-2', pay: 'table', note: 'Order as you go: the kitchen paces your courses. Your bill comes to the table at the end.' },
      redirects: { 'dian.html': '/?agc_demo=dian&hash=/kitchen', 'table.html': '@table' },
      tables: '1-10',
      shop: '/menu.html',
      coupons: [{ from: 'PROMO', code: 'code', percent: 'pct' }],
      ref: 'MC'
    }
  },
  'dulang-daun': {
    page: 'shop.html',
    spec: {
      lists: [{ var: 'P', cats: 'CATS', fields: { desc: 'short', long: 'd' } }],
      ship: { states_east: 'EAST', rates: 'SHIP', deal: 'multi' },
      hamper: { product: 'custom-hamper', name: 'Your own hamper', boxes: 'BOXES', flag: 'hamper', img: 'hamper-thanks' },
      seed_order: 'SEED_ORDER',
      coupons: [{ from: 'VOUCHER', code: 'code', percent: 'pct', min: 'min' }],
      redirects: {},
      shop: '/shop.html',
      ref: 'DD'
    }
  },
  'butter-lantern': {
    page: 'index.html',
    spec: {
      // the page keeps its own words (Chinese / Malay / English): WooCommerce gives prices, stock and sold-out only
      lists: [{ var: 'FESTS', items: 'items', stock: 'left', sku: '{g}-{id}', label: 'Festive', fields: { name: '', desc: '' } }],
      preorder: { fests: 'FESTS', items: 'items', sku: '{g}-{id}', early: 10, cap: { collect: 6, kv: 10 }, slots: 'SLOTS',
        modes: { kv: { fee: 15, free: 200, pc: [[40000, 48300], [50000, 60000], [62000, 68100]] }, courier: { fee: 12, free: 250, east: 25, east_pc: [[87000, 91399], [93000, 98859]], days: 3 } } },
      duitnow: true,
      redirects: {},
      shop: '/index.html',
      ref: 'BL'
    }
  }
};

// The 6 shop templates (site/templates/<code>/template.json): the same product list the page's data.js has (id, name,
// price, sale price, photo, options with their extra prices) plus category and descriptions for WooCommerce; shipping West /
// East Malaysia with free shipping from the same amount; the welcome code.
const TEMPLATES = ['voltnest', 'chili-pantry', 'dewlane', 'lowlight', 'plainfold', 'tailmate'];
function templateSite(slug) {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'templates', slug, 'template.json'), 'utf8'));
  const ship = t.shipping || { west: 8, east: 15, free_min: 150 };
  const coupon = t.coupon || { code: 'WELCOME10', pct: 10 };
  const data = {
    PRODUCTS: t.products.map((p) => Object.assign({
      id: p.id, n: p.name, p: p.price, s: p.sale || null, img: p.imgs[0],
      o: (p.options || []).map((o) => ({ n: o.name, v: o.values.map((v) => (typeof v === 'object' ? [v.v, v.add || 0, v.img || ''] : [v, 0, ''])) })),
      cat: p.cat, d: p.short || '', long: p.desc || []
    }, p.per ? { u: p.per } : {}, (p.tags || []).includes('featured') ? { tags: ['pop'] } : {})),
    CATS: t.categories.map((c) => [c.id, c.name]),
    EAST: ['Sabah', 'Sarawak', 'Labuan'],
    SHIP: { west: { std: ship.west, free: ship.free_min }, east: { std: ship.east, free: ship.free_min } },
    COUPON: coupon,
    BRAND: t.name
  };
  const spec = {
    lists: [{ var: 'PRODUCTS', cats: 'CATS', fields: { name: 'n', price: 'p', sale: 's', desc: 'd', long: 'long', img: 'img', cat: 'cat' } }],
    ship: { states_east: 'EAST', rates: 'SHIP', free_on: 'sub' },
    coupons: [{ from: 'COUPON', code: 'code', percent: 'pct' }],
    redirects: {},
    shop: '/shop.html',
    ref: t.order_prefix || t.name.slice(0, 2).toUpperCase()
  };
  return { slug, spec, data };
}

(async () => {
  const want = process.argv[2];
  for (const slug of want === 'all' || want === 'templates' ? TEMPLATES : TEMPLATES.includes(want) ? [want] : []) {
    const out = path.join(ROOT, 'sites', `demo-${slug}`, 'site.json');
    const site = templateSite(slug);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(site, null, 1) + '\n');
    console.log(`${slug}: ${site.data.PRODUCTS.length} products → ${path.relative(ROOT, out)}`);
  }
  if (want === 'templates' || TEMPLATES.includes(want)) return;
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
    const n = S.spec.lists.reduce((a, l) => a + (l.items ? Object.values(data[l.var] || {}).reduce((b, g) => b + (g[l.items] || []).length, 0) : (data[l.var] || []).length), 0);
    console.log(`${slug}: ${n} products → ${path.relative(ROOT, out)}`);
  }
  await browser.close();
})();
