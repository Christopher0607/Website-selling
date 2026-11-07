// 自动测试 6 个模板的购物流程（加入购物车 → 优惠码 → 结账 → 订单页）
// 用法：先 python3 build.py，然后
//   python3 -m http.server 8765 --directory dist &   node tools/check-flow.js [http://localhost:8765]
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765';
const SLUGS = ['dewlane', 'plainfold', 'chili-pantry', 'lowlight', 'tailmate', 'voltnest'];

(async () => {
  const browser = await chromium.launch();
  let fail = 0;
  const ok = (cond, msg) => { console.log((cond ? '  ✅ ' : '  ❌ ') + msg); if (!cond) fail++; };
  for (const slug of SLUGS) {
    console.log('— ' + slug);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const root = `${BASE}/demo/${slug}/`;

    // product with options: pick the first product that has radios
    await page.goto(root + 'shop.html');
    const links = await page.$$eval('.card__title a', (as) => as.map((a) => a.getAttribute('href')));
    ok(links.length >= 8, `shop lists ${links.length} products`);
    let withOpts = null;
    for (const href of links) {
      await page.goto(root + href);
      if (await page.$('.opt input[type=radio]')) { withOpts = href; break; }
    }
    if (withOpts) {
      const radios = await page.$$('.opt:first-of-type .opt__v');
      if (radios.length > 1) await radios[1].click();
      const label = await page.textContent('[data-opt-label="0"]');
      await page.click('[data-atc]');
      await page.waitForSelector('#cart.is-open');
      const v = await page.textContent('#cart .line__var');
      ok(v.includes(label.trim()), `variant "${label.trim()}" shown in cart drawer`);
      await page.click('#cart .drawer__head [data-close]');
    }
    // simple product via quick add on shop page
    await page.goto(root + 'shop.html');
    const quick = await page.$('[data-add]');
    if (quick) { await quick.click(); await page.waitForSelector('#cart.is-open'); await page.click('#cart .drawer__head [data-close]'); }
    const count = await page.textContent('[data-cart-count]');
    const expect = (withOpts ? 1 : 0) + (quick ? 1 : 0);
    ok(+count === expect && expect > 0, `cart count = ${count} (expected ${expect})`);

    // filter
    await page.goto(root + 'shop.html?cat=' + (await page.$eval('[data-filter]:not([data-filter=all])', (b) => b.getAttribute('data-filter'))));
    const visible = await page.$$eval('[data-grid] .card', (cs) => cs.filter((c) => !c.hidden).length);
    const all = await page.$$eval('[data-grid] .card', (cs) => cs.length);
    ok(visible > 0 && visible < all, `category filter shows ${visible}/${all}`);

    // cart page + coupon
    await page.goto(root + 'cart.html');
    const before = await page.textContent('[data-sum-total]');
    await page.fill('#cpn', 'WELCOME10');
    await page.click('[data-coupon] button');
    const disc = await page.isVisible('[data-sum-disc-row]');
    ok(disc, `coupon applied (total ${before} → ${await page.textContent('[data-sum-total]')})`);
    await page.check('input[name=zone][value=east]');
    const ship = await page.textContent('[data-sum-ship]');
    ok(/RM15\.00|Free/.test(ship), `East Malaysia shipping = ${ship}`);

    // checkout: empty submit shows errors
    await page.goto(root + 'checkout.html');
    await page.click('[data-checkout] button[type=submit]');
    ok(await page.isVisible('[data-form-error]'), 'empty checkout shows an error');
    await page.fill('input[name=email]', 'test@example.com');
    await page.fill('input[name=phone]', '012-345 6789');
    await page.fill('input[name=name]', 'Aisyah Tan');
    await page.fill('input[name=addr1]', '12 Jalan Contoh');
    await page.fill('input[name=postcode]', '88000');
    await page.fill('input[name=city]', 'Kota Kinabalu');
    await page.selectOption('select[name=state]', 'Sabah');
    const coShip = await page.textContent('[data-co-ship]');
    ok(/RM15\.00|Free/.test(coShip), `checkout shipping for Sabah = ${coShip}`);
    await page.click('[data-checkout] button[type=submit]');
    await page.waitForURL(/order\.html/);
    const no = await page.textContent('[data-order-no]');
    ok(/^#[A-Z]{2}\d{4}$/.test(no), `order page shows ${no}`);
    await page.goto(root + 'index.html');
    const after = await page.textContent('[data-cart-count]');
    ok(after === '0', 'cart is empty after the demo order');

    // sticky add-to-cart on phones
    await page.goto(root + 'p/' + links[0].replace(/^p\//, ''));
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(400);
    ok(await page.$eval('[data-sticky-atc]', (el) => el.classList.contains('is-on')), 'sticky add-to-cart appears after scrolling');

    ok(errors.length === 0, 'no JavaScript errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  await browser.close();
  console.log(fail ? `\n${fail} check(s) failed` : '\nall checks passed');
  process.exit(fail ? 1 : 0);
})();
