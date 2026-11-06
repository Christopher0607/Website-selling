#!/usr/bin/env node
/**
 * screenshot.js — 作品集截图（桌面 1440 px + 手机 390 px）
 *
 * 用法:
 *   node scripts/local/screenshot.js <网址> <输出文件夹> [--auth 用户:密码] [--pages /,/shop/,/product/xxx/] [--scale 2]
 *
 * 默认截：首页、商店、第一个产品页、购物车（先加入一件产品）、结账页。
 * 需要 Playwright（node -e "require('playwright')" 不报错就可以）。
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2 || args[0] === '-h' || args[0] === '--help') {
  console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 11).join('\n'));
  process.exit(args.length < 2 ? 1 : 0);
}
const base = args[0].replace(/\/$/, '');
const out = args[1];
const opt = (name, def) => { const i = args.indexOf(name); return i > -1 ? args[i + 1] : def; };
const auth = opt('--auth', '');
const scale = Number(opt('--scale', '2'));
const custom = opt('--pages', '');
fs.mkdirSync(out, { recursive: true });

// 慢慢卷到底，让 lazy-load 的图片都载入
async function autoScroll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();
  const viewports = [
    { name: 'desktop', width: 1440, height: 900, isMobile: false },
    { name: 'mobile', width: 390, height: 844, isMobile: true },
  ];
  for (const vp of viewports) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: scale,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
      httpCredentials: auth ? { username: auth.split(':')[0], password: auth.split(':').slice(1).join(':') } : undefined,
    });
    const page = await ctx.newPage();
    let pages = custom ? custom.split(',') : ['/', '/shop/'];
    if (!custom) {
      await page.goto(base + '/shop/', { waitUntil: 'networkidle' });
      const first = await page.$eval('ul.products li.product a.woocommerce-LoopProduct-link', (a) => a.getAttribute('href')).catch(() => null);
      if (first) pages.push(new URL(first, base).pathname);
    }
    for (const p of pages) {
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await autoScroll(page);
      const name = (p === '/' ? 'home' : p.replace(/^\/|\/$/g, '').replace(/\//g, '-')) || 'home';
      await page.screenshot({ path: path.join(out, `${vp.name}-${name}.png`), fullPage: true });
      console.log(`  ${vp.name}-${name}.png`);
    }
    if (!custom) {
      // 加一件简单产品进购物车，再截购物车和结账
      await page.goto(base + '/shop/', { waitUntil: 'networkidle' });
      const pid = await page.$eval('a.add_to_cart_button.ajax_add_to_cart', (a) => a.getAttribute('data-product_id')).catch(() => null);
      if (pid) {
        await page.goto(base + '/cart/?add-to-cart=' + pid, { waitUntil: 'networkidle' });
        for (const p of ['/cart/', '/checkout/']) {
          await page.goto(base + p, { waitUntil: 'networkidle' });
          const name = p.replace(/\//g, '');
          await page.screenshot({ path: path.join(out, `${vp.name}-${name}.png`), fullPage: true });
          console.log(`  ${vp.name}-${name}.png`);
        }
      }
    }
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
