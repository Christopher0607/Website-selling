// 免费样板（mockup）端到端检查：发给商家之前一定要跑，全部 ✅ 才可以发。
// 检查：密码页、每一页在手机 / 平板 / 电脑上有没有左右跑位、顶部提示条有没有被挤扁、
// 字的颜色看不看得清楚（对比度）、照片有没有坏掉、JavaScript 错误、加入购物车 → 结账 → 订单页。
//
// 用法（本机，加密前）：
//   python3 -m http.server 8770 --directory clients &
//   node site/tools/check-preview.js http://localhost:8770/<代号>/preview/site/ <密码> [截图资料夹]
// 用法（已发布的加密网址）：
//   node site/tools/check-preview.js https://previews--cartsmith.netlify.app/<slug>/ <密码> [截图资料夹]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [BASE_IN, PW, SHOTS] = process.argv.slice(2);
if (!BASE_IN || !PW) { console.error('用法：node site/tools/check-preview.js <样板网址> <密码> [截图资料夹]'); process.exit(2); }
const BASE = BASE_IN.endsWith('/') ? BASE_IN : BASE_IN + '/';
const VIEWPORTS = [
  { name: 'phone-360', width: 360, height: 780, mobile: true },
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'phone-412', width: 412, height: 915, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1366', width: 1366, height: 900, mobile: false },
];

let fails = 0, warns = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✅ ' : '  ❌ ') + msg); if (!cond) fails++; return cond; };
const warn = (msg) => { console.log('  ⚠️  ' + msg); warns++; };

async function unlock(page) {
  // encrypted pages: wait until either the store or the password box is on screen
  await page.waitForFunction(() => document.querySelector('.hdr') || [...document.querySelectorAll('input[type=password]')].some((i) => i.offsetParent), null, { timeout: 20000 }).catch(() => {});
  const input = await page.$('input[type=password]');
  if (input && await input.isVisible()) {
    await input.fill(PW);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => { const i = document.querySelector('input[type=password]'); return !i || !i.offsetParent; }, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
}

// Runs inside the page: layout, demo bar, contrast, broken images.
function audit() {
  const vw = document.documentElement.clientWidth;
  const out = { overflow: null, bar: [], contrast: [], lowContrast: [], cut: [], broken: [], small: [], covered: [] };
  const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > vw + 1) out.overflow = `page is ${sw}px wide on a ${vw}px screen`;

  const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 0]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, bottom) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + bottom[i] * (1 - a)).concat(1); };
  const visible = (el) => { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
  const clippedX = (el) => { for (let a = el.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox !== 'visible') return a; } return null; };

  // top note
  const bar = document.querySelector('.demo-bar');
  if (bar) {
    const spans = [...bar.querySelectorAll('.demo-bar__txt, .demo-bar__short')].filter((s) => s.offsetParent && visible(s));
    if (!spans.length) out.bar.push('no visible note in the top bar');
    for (const s of spans) {
      const r = s.getBoundingClientRect(), lh = parseFloat(getComputedStyle(s).lineHeight) || 16;
      if (r.left < -1 || r.right > vw + 1) out.bar.push(`note sticks out of the screen (${Math.round(r.left)}–${Math.round(r.right)})`);
      if (r.width < 120) out.bar.push(`note squeezed to ${Math.round(r.width)}px wide`);
      if (r.height > lh * 3 + 4) out.bar.push(`note wraps to ${Math.round(r.height / lh)} lines`);
      const cta = bar.querySelector('.demo-bar__cta');
      if (cta) { const c = cta.getBoundingClientRect(); if (c.right > vw + 1 || c.left < -1) out.bar.push('button sticks out of the screen'); if (c.left < r.right - 1 && c.right > r.left + 1 && c.top < r.bottom - 1 && c.bottom > r.top + 1) out.bar.push('button covers the note'); }
    }
  }

  // text contrast + text cut off on the right
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.textContent.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName)) continue;
    seen.add(el);
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
    if (el.closest('.pv-gate, [hidden], [aria-hidden=true], .drawer:not(.is-open), .sr-only, .visually-hidden')) continue;
    let hiddenAnc = false; for (let a = el; a; a = a.parentElement) if (!visible(a)) { hiddenAnc = true; break; }
    if (hiddenAnc) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const label = (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + ' "' + n.textContent.trim().slice(0, 30) + '"');
    if (r.right > vw + 1 && r.left < vw) { const clip = clippedX(el); if (!clip || clip === document.documentElement || clip === document.body) out.cut.push(label); }
    if (r.right <= 0 || r.left >= vw) continue; // inside a sideways-scrolling row, off screen
    // what is behind the middle of the text?
    const x = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1), y = r.top + r.height / 2;
    if (y < 0 || y > window.innerHeight) continue; // only what is on screen right now (caller scrolls)
    const stack = document.elementsFromPoint(x, y);
    const i = stack.indexOf(el);
    // covered by something else at this scroll position (sticky header, chat button…) → checked at another position
    if (i < 0 || (i > 0 && !el.contains(stack[0]))) continue;
    let bg = null, overImage = false;
    const layers = [];
    for (const s of stack.slice(i)) {
      const cs = getComputedStyle(s);
      if (s.tagName === 'IMG' || s.tagName === 'VIDEO' || s.tagName === 'PICTURE' || (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage))) { overImage = true; break; }
      const c = rgba(cs.backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.99) break; }
    }
    if (overImage) continue;
    bg = [255, 255, 255, 1];
    for (let k = layers.length - 1; k >= 0; k--) bg = over(layers[k], bg);
    const cs = getComputedStyle(el);
    const fg = over(rgba(cs.color), bg);
    const cr = ratio(fg, bg);
    const big = parseFloat(cs.fontSize) >= 18.6 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700);
    if (cr < 3) out.contrast.push(`${label} ${cr.toFixed(2)}:1`);
    else if (cr < 4.5 && !big) out.lowContrast.push(`${label} ${cr.toFixed(2)}:1`);
  }
  // form fields and buttons squashed too small to tap
  for (const f of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, button, .btn')) {
    if (!f.offsetParent || f.closest('.pv-gate, .drawer:not(.is-open), [hidden]')) continue;
    const r = (f.closest('.qty') || f).getBoundingClientRect(); // quantity: the − 1 + box is what people tap
    if (r.width > 0 && r.height > 0 && r.height < 32 && !f.matches('.icon-btn, .link, [data-close], .qty button, .chip')) out.small.push(`${f.tagName.toLowerCase()}${f.name ? '[' + f.name + ']' : ''} "${(f.placeholder || f.textContent || '').trim().slice(0, 20)}" ${Math.round(r.height)}px tall`);
  }
  // at the top of the page, floating things (chat button, sticky bars) must not sit on a button or field
  if (window.scrollY < 2) {
    const floats = [...document.querySelectorAll('body *')].filter((x) => getComputedStyle(x).position === 'fixed' && x.offsetParent !== null || (getComputedStyle(x).position === 'fixed' && x.getBoundingClientRect().height > 0))
      .filter((x) => visible(x) && +getComputedStyle(x).opacity > 0.1 && getComputedStyle(x).pointerEvents !== 'none' && !x.closest('.drawer, .pv-gate, .hdr, .demo-bar, .announce, [aria-hidden=true]') && x.getBoundingClientRect().height < window.innerHeight * 0.5);
    const targets = [...document.querySelectorAll('a.btn, button, input:not([type=hidden]), select, textarea')].filter((t) => t.offsetParent && visible(t) && !floats.some((f) => f.contains(t)));
    for (const f of floats) {
      const a = f.getBoundingClientRect();
      for (const t of targets) {
        const b = t.getBoundingClientRect();
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ix > 4 && iy > 4 && b.top < window.innerHeight && b.bottom > 0) out.covered.push(`${f.className.toString().split(' ')[0] || f.tagName} covers "${(t.textContent || t.placeholder || t.name || '').trim().slice(0, 20)}"`);
      }
    }
  }
  for (const img of document.images) if (img.complete && img.getAttribute('src') && img.naturalWidth === 0) out.broken.push(img.getAttribute('src'));
  return out;
}

async function scan(page, url, vp, shotDir) {
  await page.goto(url, { waitUntil: 'load' });
  await unlock(page);
  const ready = await page.waitForFunction(() => document.documentElement.getAttribute('data-store') === 'ready', null, { timeout: 8000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(300);
  const total = { overflow: null, bar: [], contrast: new Set(), lowContrast: new Set(), cut: new Set(), broken: new Set(), small: new Set(), covered: new Set(), noJs: !ready };
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += Math.floor(vp.height * 0.8)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(150);
    const a = await page.evaluate(audit);
    if (a.overflow) total.overflow = a.overflow;
    if (y === 0) total.bar = a.bar;
    a.contrast.forEach((x) => total.contrast.add(x)); a.lowContrast.forEach((x) => total.lowContrast.add(x));
    a.cut.forEach((x) => total.cut.add(x)); a.broken.forEach((x) => total.broken.add(x)); a.small.forEach((x) => total.small.add(x)); a.covered.forEach((x) => total.covered.add(x));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  if (shotDir) await page.screenshot({ path: path.join(shotDir, `${vp.name}-${url.slice(BASE.length).replace(/[^a-z0-9]+/gi, '_') || 'index'}.png`), fullPage: true });
  return total;
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();

  // 1) password page
  console.log('— password page');
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(BASE + 'index.html');
    const input = await page.$('input[type=password]');
    ok(input && await input.isVisible(), 'asks for a password before showing anything');
    const hdrBefore = await page.evaluate(() => { const h = document.querySelector('.hdr'); return !!h && getComputedStyle(h).visibility !== 'hidden' && !!h.offsetParent; });
    ok(!hdrBefore, 'store is hidden while locked');
    if (input) {
      await input.fill('wrong-password-123'); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      ok(await (await page.$('input[type=password]'))?.isVisible(), 'wrong password is refused');
      await unlock(page);
      ok(await page.evaluate(() => { const h = document.querySelector('.hdr'); return !!h && getComputedStyle(h).visibility !== 'hidden'; }), 'right password opens the store');
    }
    await ctx.close();
  }

  // 2) every page on every screen size
  const ctx0 = await browser.newContext(); const p0 = await ctx0.newPage();
  await p0.goto(BASE + 'index.html'); await unlock(p0);
  await p0.goto(BASE + 'shop.html'); await unlock(p0);
  const prod = await p0.$$eval('.card__title a', (as) => [...new Set(as.map((a) => a.getAttribute('href')))]);
  await ctx0.close();
  ok(prod.length >= 1, `shop lists ${prod.length} products`);
  const pages = ['index.html', 'shop.html', ...prod, 'about.html', 'help.html', 'cart.html', 'checkout.html'];

  for (const vp of VIEWPORTS) {
    console.log(`— ${vp.name} (${vp.width}×${vp.height})`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const issues = { overflow: [], bar: [], contrast: [], low: [], cut: [], broken: [], small: [], covered: [], noJs: [] };
    for (const pg of pages) {
      const t = await scan(page, BASE + pg, vp, SHOTS);
      if (t.overflow) issues.overflow.push(`${pg}: ${t.overflow}`);
      t.bar.forEach((x) => issues.bar.push(`${pg}: ${x}`));
      t.contrast.forEach((x) => issues.contrast.push(`${pg}: ${x}`));
      t.lowContrast.forEach((x) => issues.low.push(`${pg}: ${x}`));
      t.cut.forEach((x) => issues.cut.push(`${pg}: ${x}`));
      t.broken.forEach((x) => issues.broken.push(`${pg}: ${x}`));
      t.small.forEach((x) => issues.small.push(`${pg}: ${x}`));
      t.covered.forEach((x) => issues.covered.push(`${pg}: ${x}`));
      if (t.noJs) issues.noJs.push(pg);
    }
    const list = (a) => (a.length ? ': ' + a.slice(0, 6).join(' | ') + (a.length > 6 ? ` (+${a.length - 6} more)` : '') : '');
    ok(!issues.overflow.length, `no sideways shift on ${pages.length} pages` + list(issues.overflow));
    ok(!issues.bar.length, 'top note fits (not squeezed, not off screen)' + list(issues.bar));
    ok(!issues.contrast.length, 'all text readable (contrast ≥ 3:1)' + list(issues.contrast));
    ok(!issues.cut.length, 'no text cut off at the right edge' + list(issues.cut));
    ok(!issues.broken.length, 'no broken photos' + list(issues.broken));
    ok(!issues.small.length, 'form fields and buttons are not squashed' + list(issues.small));
    ok(!issues.covered.length, 'nothing floating covers a button at the top of the page' + list(issues.covered));
    ok(!issues.noJs.length, 'store script ran on every page (buttons work)' + list(issues.noJs));
    ok(!errors.length, 'no JavaScript errors' + list(errors));
    if (issues.low.length) warn('small text below 4.5:1' + list(issues.low));
    await ctx.close();
  }

  // 3) buying flow on a phone, 3 times (a timing bug once made it fail only some of the time)
  for (let run = 1; run <= 3; run++) {
  console.log(`— buying flow (phone, run ${run}/3)`);
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + 'index.html'); await unlock(page);
    // menu drawer
    const menuBtn = await page.$('[data-open="menu"], .hdr [aria-label*="enu" i]');
    if (menuBtn) { await menuBtn.click(); await page.waitForTimeout(500); ok(await page.evaluate(() => !!document.querySelector('.drawer.is-open')), 'menu opens'); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    await page.goto(BASE + 'shop.html'); await unlock(page);
    const quick = await page.$('[data-add]');
    if (quick) {
      await quick.click(); await page.waitForSelector('#cart.is-open', { timeout: 5000 }).catch(() => {});
      ok(await page.evaluate(() => !!document.querySelector('#cart.is-open')), 'add to cart opens the cart');
      ok((await page.textContent('[data-cart-count]')).trim() === '1', 'cart count = 1');
      await page.click('#cart .drawer__head [data-close]').catch(() => {});
      await page.goto(BASE + 'checkout.html'); await unlock(page);
      await page.fill('input[name=email]', 'test@example.com');
      await page.fill('input[name=phone]', '012-345 6789');
      await page.fill('input[name=name]', 'Aisyah Tan');
      await page.fill('input[name=addr1]', '12 Jalan Contoh');
      await page.fill('input[name=postcode]', '47400');
      await page.fill('input[name=city]', 'Petaling Jaya');
      await page.selectOption('select[name=state]', 'Selangor');
      await page.click('[data-checkout] button[type=submit]');
      await page.waitForURL(/order\.html/, { timeout: 15000 }).catch(() => {});
      await unlock(page);
      const no = await page.textContent('[data-order-no]').catch(() => '');
      ok(/^#[A-Z]{2}\d{4}$/.test((no || '').trim()), `checkout reaches the order page (${(no || '').trim() || 'none'})`);
    } else {
      warn('no product can be added to the cart (all "Ask for price")');
    }
    ok(!errors.length, 'no JavaScript errors in the flow' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  }

  await browser.close();
  console.log(fails ? `\n❌ ${fails} check(s) failed${warns ? `, ${warns} warning(s)` : ''} — 不要发给商家` : `\n✅ all checks passed${warns ? ` (${warns} warning(s))` : ''}`);
  process.exit(fails ? 1 : 0);
})();
