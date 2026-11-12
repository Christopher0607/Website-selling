// 全站版面检查（2026-11-12）：每一页在手机和电脑宽度打开，找出：
//   坏掉的请求、程式错误、左右超出画面、文字 / 按钮互相重叠、字被切掉、手机上的字太小、
//   坏掉的站内连结和锚点、没载入或被拉大很多的图片。
// 用法：python3 site/build.py && python3 -m http.server 8790 -d site/dist &
//       node site/tools/check-site.js http://localhost:8790 [只检查的路径前缀，例如 demo/sireh-salt]
// 结果：没有问题的页面不印；有问题的页面一行一个问题；最后印总数。exit 1 = 有问题。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = (process.argv[2] || 'http://localhost:8790').replace(/\/$/, '');
const ONLY = process.argv[3] || '';
const DIST = path.join(__dirname, '..', 'dist');
const VIEWS = [['phone-360', 360, 740, 2], ['phone-412', 412, 915, 2], ['desk-1280', 1280, 680, 1], ['desk-1536', 1536, 760, 1]];

function pages() {
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) { if (f !== 'desk') walk(p); } else if (f.endsWith('.html')) out.push(path.relative(DIST, p).split(path.sep).join('/'));
    }
  })(DIST);
  return out.filter((p) => p.startsWith(ONLY)).sort();
}

// runs inside the page: returns a list of problems
function inspect(phone) {
  const W = document.documentElement.clientWidth, probs = [];
  const name = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    else if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
    const t = (el.textContent || el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 32);
    return t ? `${s} "${t}"` : s;
  };
  const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity !== 0; };
  const floating = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky' || p === 'absolute') return true; } return false; };
  const inScroller = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const inClosed = (el) => !!el.closest('details:not([open]) > :not(summary), [hidden], dialog:not([open])');

  if (document.documentElement.scrollWidth > W + 1) probs.push(`page is ${document.documentElement.scrollWidth - W}px wider than the screen`);

  // leaf boxes: text runs, buttons, links, inputs, images in normal flow
  const leaves = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!shown(el) || inClosed(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const tag = el.tagName;
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const ctl = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG)$/.test(tag);
    if (!direct && !ctl) continue;
    if (r.right > W + 1 && !inScroller(el) && !floating(el)) probs.push(`sticks out past the right edge by ${Math.round(r.right - W)}px: ${name(el)}`);
    if (direct && phone) { const fz = parseFloat(getComputedStyle(el).fontSize); if (fz < 11 && el.textContent.trim().length > 2) probs.push(`text ${fz}px on a phone: ${name(el)}`); }
    if ((tag === 'BUTTON' || tag === 'A') && el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(getComputedStyle(el).overflow)) probs.push(`label cut off: ${name(el)}`);
    if (tag === 'IMG') {
      if (el.complete && !el.naturalWidth && el.getAttribute('src')) probs.push(`image did not load: ${el.getAttribute('src')}`);
      else if (el.naturalWidth && r.width * devicePixelRatio > el.naturalWidth * 1.6 && r.width > 300) probs.push(`image stretched ${Math.round(r.width * devicePixelRatio)}/${el.naturalWidth}px: ${el.getAttribute('src')}`);
    }
    if (!floating(el)) leaves.push({ el, rs: [...el.getClientRects()].filter((x) => x.width >= 1 && x.height >= 1) }); // one box per line for wrapped inline text
  }
  // overlapping boxes (neither inside the other)
  let n = 0;
  for (let i = 0; i < leaves.length && n < 6; i++) {
    for (let j = i + 1; j < leaves.length && n < 6; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      let hit = false;
      for (const ra of a.rs) for (const rb of b.rs) {
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w >= 3 && h >= 3 && w * h >= Math.min(ra.width * ra.height, rb.width * rb.height) * 0.15) hit = true;
      }
      if (!hit) continue;
      // label wrapping its own input / text inside an <a> that is a block: skip parent-child-like pairs sharing a parent link or label
      if (a.el.closest('label') && a.el.closest('label') === b.el.closest('label')) continue;
      probs.push(`overlap: ${name(a.el)} ⟷ ${name(b.el)}`); n++;
    }
  }
  // site links (checked against the files afterwards)
  const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && !/^(https?:|mailto:|tel:|javascript:|data:|#$)/.test(h));
  return { probs, links: [...new Set(links)] };
}

(async () => {
  const list = pages();
  const browser = await chromium.launch();
  let bad = 0;
  const seenLinks = new Map(); // page → links
  for (const [label, w, h, dpr] of VIEWS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: 'reduce', isMobile: label.startsWith('phone'), hasTouch: label.startsWith('phone') });
    const page = await ctx.newPage();
    let errs = [];
    page.on('pageerror', (e) => errs.push('JS error: ' + e.message.split('\n')[0]));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|api\/track|ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text().slice(0, 120)); });
    page.on('response', (r) => { if (r.status() >= 400 && !/\/api\//.test(r.url())) errs.push(`HTTP ${r.status()}: ${r.url().replace(BASE, '')}`); });
    for (const rel of list) {
      errs = [];
      try {
        await page.goto(`${BASE}/${rel}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
        await page.waitForTimeout(250);
        const r = await page.evaluate(inspect, label.startsWith('phone'));
        if (!seenLinks.has(rel)) seenLinks.set(rel, r.links);
        const all = [...new Set([...errs, ...r.probs])];
        if (all.length) { bad += all.length; console.log(`\n${label} ${rel}`); for (const p of all) console.log('  ✗ ' + p); }
      } catch (e) { bad++; console.log(`\n${label} ${rel}\n  ✗ could not load: ${e.message.split('\n')[0]}`); }
    }
    await ctx.close();
  }
  await browser.close();
  // site links and anchors
  const idsOf = new Map();
  const ids = (file) => { if (!idsOf.has(file)) { const t = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; idsOf.set(file, new Set([...t.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); } return idsOf.get(file); };
  for (const [rel, links] of seenLinks) {
    for (const href of links) {
      const [p0, hash] = href.split('#');
      const p = p0.split('?')[0];
      const file = p ? path.normalize(path.join(DIST, p.startsWith('/') ? p.slice(1) : path.join(path.dirname(rel), p))) : path.join(DIST, rel);
      const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
      if (!fs.existsSync(target)) { bad++; console.log(`  ✗ ${rel}: link to a missing page: ${href}`); continue; }
      if (hash && target.endsWith('.html') && !ids(target).has(hash) && !/data-|tab=/.test(hash)) {
        // anchors made by scripts are fine if the page builds them; report so a person can look
        console.log(`  ? ${rel}: anchor #${hash} not in the HTML of ${path.relative(DIST, target)} (fine if a script makes it)`);
      }
    }
  }
  console.log(`\n${list.length} pages × ${VIEWS.length} screen sizes: ${bad ? bad + ' problem(s)' : 'no problems'}`);
  process.exit(bad ? 1 : 0);
})();
