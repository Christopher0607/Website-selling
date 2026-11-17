// "Exactly the same" check (2026-11-16, docs/14-wordpress-demos.md): each page of a demo on the studio site and on its
// WordPress version, same clock, phone and desktop; how many pixels differ, and a side-by-side picture of each pair
// (static | WordPress | differences in red) to look at.
//   node site/tools/compare-wp-demo.js <studio base> <wordpress base> <demo> <out dir> [page,page,…]
// Needs Python 3 with Pillow for the pictures (only the comparison; the screenshots are Playwright).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const [STATIC, WP, DEMO, OUT, ONLY] = process.argv.slice(2);
if (!OUT) { console.log('用法: node site/tools/compare-wp-demo.js <工作室网址> <WordPress 网址> <示范代号> <输出资料夹> [页面,…]'); process.exit(2); }
const PAGES = (ONLY || 'index,menu,order,book,festive,catering,vouchers').split(',');
const key = (pg) => pg.replace(/[?=&/]/g, '-');
const NOW = Date.parse('2026-11-18T13:05:00+08:00'); // a Wednesday lunchtime: open, festive pre-orders open
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const rows = [];
  for (const vp of [{ n: 'phone', width: 390, height: 844 }, { n: 'desktop', width: 1366, height: 900 }]) {
    for (const side of [['static', `${STATIC.replace(/\/$/, '')}/demo/${DEMO}/`], ['wp', `${WP.replace(/\/$/, '')}/`]]) {
      const c = await b.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'reduce' });
      await c.addInitScript((now) => {
        const D = Date; const off = now - D.now();
        // eslint-disable-next-line no-global-assign
        Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off); } static now() { return D.now() + off; } };
        try { localStorage.clear(); } catch (e) { /* no storage */ }
      }, NOW);
      const p = await c.newPage();
      for (const pg of PAGES) {
        await p.goto(side[1] + (pg.includes('?') ? pg.replace('?', '.html?') : pg + '.html')); // "index?fest=cny" → index.html?fest=cny
        await p.waitForTimeout(900);
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
        await p.waitForTimeout(400);
        await p.screenshot({ path: path.join(OUT, `${DEMO}-${key(pg)}-${vp.n}-${side[0]}.png`), fullPage: true });
      }
      await c.close();
    }
    for (const pg of PAGES) rows.push([key(pg), vp.n]);
  }
  await b.close();
  const py = `
import sys
from PIL import Image, ImageChops
out, demo = sys.argv[1], sys.argv[2]
for arg in sys.argv[3:]:
    pg, vp = arg.split(':')
    a = Image.open(f'{out}/{demo}-{pg}-{vp}-static.png').convert('RGB')
    b = Image.open(f'{out}/{demo}-{pg}-{vp}-wp.png').convert('RGB')
    h = max(a.height, b.height); w = max(a.width, b.width)
    A = Image.new('RGB', (w, h), 'white'); A.paste(a, (0, 0))
    B = Image.new('RGB', (w, h), 'white'); B.paste(b, (0, 0))
    d = ImageChops.difference(A, B).convert('L').point(lambda x: 255 if x > 24 else 0)
    n = sum(d.histogram()[255:])
    pct = 100.0 * n / (w * h)
    red = Image.new('RGB', (w, h), (255, 0, 0)); diff = A.copy(); diff.paste(red, (0, 0), d)
    s = 0.5 if vp == 'desktop' else 1.0
    tiles = [x.resize((int(w * s), int(h * s))) for x in (A, B, diff)]
    sheet = Image.new('RGB', (sum(t.width for t in tiles) + 20, tiles[0].height), (255, 0, 255)); x = 0
    for t in tiles:
        sheet.paste(t, (x, 0)); x += t.width + 10
    sheet.save(f'{out}/cmp-{demo}-{pg}-{vp}.png')
    print(f'{pg:10} {vp:8} heights {a.height}/{b.height}  differing pixels {pct:.2f}%')
`;
  console.log(execFileSync('python3', ['-c', py, OUT, DEMO, ...rows.map((r) => r.join(':'))]).toString());
})();
