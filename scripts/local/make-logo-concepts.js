// 4 个更「高级」的标志方向：头像（1080×1080）+ 字标，放在一张比较图上
// 用法：node scripts/local/make-logo-concepts.js → content/brand/concept-*.png、logo-concepts.png
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', '..', 'content', 'brand');
const FONTS = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap';
const INK = '#14171c', CREAM = '#f4efe6', EMBER = '#ff5a2c', TERRA = '#a8442a';

// 每个方向：avatar() 回传 1080×1080 内容的 HTML；word(bg, fg) 回传字标 HTML
const C = {
  serif: {
    title: '1 · 衬线字母（精品、时尚感）',
    bg: INK,
    avatar: () => `<div class="mono"><span class="mC">C</span><span class="ms">s</span></div>`,
    word: (fg, accent) => `<div class="w1" style="color:${fg}">Cartsmith<small style="color:${accent}">STUDIO</small></div>`,
  },
  geo: {
    title: '2 · 几何 C + 小方块（现代设计工作室）',
    bg: CREAM,
    avatar: () => `<svg viewBox="0 0 100 100" width="620" height="620"><path d="M72.98 30.72A30 30 0 1 0 72.98 69.28" fill="none" stroke="${INK}" stroke-width="13"/><rect x="67" y="44" width="12" height="12" fill="${EMBER}"/></svg>`,
    word: (fg) => `<div class="w2" style="color:${fg}">cartsmith<i></i></div>`,
  },
  line: {
    title: '3 · 细线购物袋（保留网店意思，变简约）',
    bg: INK,
    avatar: () => `<svg viewBox="22 20 56 64" width="640" height="731"><path d="M29 40h42l-3.2 38.5a3 3 0 0 1-3 2.5H35.2a3 3 0 0 1-3-2.5L29 40Z" fill="none" stroke="${CREAM}" stroke-width="3.4" stroke-linejoin="round"/><path d="M41 40v-6a9 9 0 0 1 18 0v6" fill="none" stroke="${CREAM}" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="60" r="3.4" fill="${EMBER}"/></svg>`,
    word: (fg, accent) => `<div class="w3" style="color:${fg}">CARTSMITH<small style="color:${accent}">studio</small></div>`,
  },
  terra: {
    title: '4 · 陶土橙 + 衬线 C（保留橙色，但沉稳）',
    bg: TERRA,
    avatar: () => `<div class="mono2">C</div>`,
    word: (fg, accent) => `<div class="w4" style="color:${fg}">Cartsmith <em style="color:${accent}">Studio</em></div>`,
  },
};

const CSS = `
*{box-sizing:border-box;margin:0}body{font-family:Inter,sans-serif}
.av{width:1080px;height:1080px;display:grid;place-items:center}
.mono{display:flex;align-items:baseline;transform:translate(-4px,-30px)}
.mC{font:400 700px/1 'Instrument Serif',serif;color:${CREAM}}
.ms{font:italic 400 400px/1 'Instrument Serif',serif;color:${EMBER};margin-left:-22px}
.mono2{font:400 820px/1 'Instrument Serif',serif;color:${CREAM};transform:translate(-6px,-34px)}
.w1{font:400 64px/1 'Instrument Serif',serif;letter-spacing:-.01em;display:flex;align-items:baseline;gap:14px}.w1 small{font:600 13px Inter;letter-spacing:.42em}
.w2{font:700 58px/1 'Bricolage Grotesque';letter-spacing:-.045em;display:flex;align-items:baseline}.w2 i{display:inline-block;width:12px;height:12px;background:${EMBER};margin-left:5px}
.w3{font:500 34px/1 Inter;letter-spacing:.38em;display:flex;align-items:baseline;gap:16px}.w3 small{font:italic 400 30px 'Instrument Serif';letter-spacing:0}
.w4{font:400 62px/1 'Instrument Serif',serif}.w4 em{font-style:italic}
.sheet{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;padding:28px;background:#e9e6e0;width:1400px}
.card{background:#fff;border-radius:18px;padding:22px}.card h3{font:600 19px Inter;margin-bottom:16px}
.r{display:flex;gap:22px;align-items:center}.big{width:230px;border-radius:50%}.side{display:grid;gap:14px;flex:1}
.dm{display:flex;gap:10px;align-items:center;font-size:13px;padding:10px 12px;border-radius:10px}.dm img{width:42px;border-radius:50%}
.lt{background:#fff;border:1px solid #e3e3e3}.dk{background:#000;color:#fff}
.lock{border-radius:12px;padding:22px 20px;overflow:hidden}`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  for (const [k, v] of Object.entries(C)) {
    await p.setContent(`<html><head><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head><body><div class="av" style="background:${v.bg}">${v.avatar()}</div></body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `concept-${k}.png`) });
  }
  const cards = Object.entries(C).map(([k, v]) => `<div class="card"><h3>${v.title}</h3><div class="r"><img class="big" src="concept-${k}.png"><div class="side">
    <div class="dm lt"><img src="concept-${k}.png"><span><b>Cartsmith Studio</b><br>Hi! I'm Junyu from Cartsmith…</span></div>
    <div class="dm dk"><img src="concept-${k}.png"><span><b>Cartsmith Studio</b><br>Hi! I'm Junyu from Cartsmith…</span></div></div></div>
    <div class="lock" style="background:${CREAM};margin-top:16px">${v.word(INK, k === 'terra' ? TERRA : EMBER)}</div>
    <div class="lock" style="background:${INK};margin-top:10px">${v.word(CREAM, k === 'terra' ? '#e9a48c' : EMBER)}</div></div>`).join('');
  fs.writeFileSync(path.join(OUT, 'concepts.html'), `<html><head><link rel="stylesheet" href="${FONTS}"><style>${CSS}</style></head><body><div class="sheet">${cards}</div></body></html>`);
  const p2 = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  await p2.goto('file://' + path.join(OUT, 'concepts.html'), { waitUntil: 'networkidle' });
  await p2.evaluate(() => document.fonts.ready);
  await p2.locator('.sheet').screenshot({ path: path.join(OUT, 'logo-concepts.png') });
  fs.unlinkSync(path.join(OUT, 'concepts.html'));
  await b.close();
  console.log('done');
})();
