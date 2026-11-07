// 产生 Instagram 头像（1080×1080，IG 会裁成圆形）+ 一张预览图（大、中、私信列表大小，浅色/深色背景）
// 用法：node scripts/local/make-avatar.js   → content/brand/avatar-*.png、avatar-preview.png
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', '..', 'content', 'brand');
// 和网站的 site/assets/img/icon.svg 同一个标志（购物袋 + 星星），只是放大、留白适合圆形
const mark = (bag, handle, star) => `<svg viewBox="13 10 38 45" xmlns="http://www.w3.org/2000/svg">
<path d="M18 24h28l-2.4 24.5a3 3 0 0 1-3 2.5H23.4a3 3 0 0 1-3-2.5L18 24Z" fill="none" stroke="${bag}" stroke-width="4" stroke-linejoin="round"/>
<path d="M25 24v-3a7 7 0 0 1 14 0v3" fill="none" stroke="${handle}" stroke-width="4" stroke-linecap="round"/>
<path d="M32 31.5l1.9 4.3 4.6.4-3.5 3 1.1 4.6-4.1-2.5-4.1 2.5 1.1-4.6-3.5-3 4.6-.4Z" fill="${star}"/></svg>`;
const VARIANTS = {
  ink: { bg: '#14171c', svg: mark('#ff5a2c', '#f7f4ee', '#f7f4ee'), label: 'A · 深色（和网站图标一样）' },
  ember: { bg: '#ff5a2c', svg: mark('#ffffff', '#14171c', '#14171c'), label: 'B · 橙色（在列表里最显眼）' },
  paper: { bg: '#f7f4ee', svg: mark('#14171c', '#ff5a2c', '#ff5a2c'), label: 'C · 米白（最清爽）' },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  for (const [k, v] of Object.entries(VARIANTS)) {
    // 只取购物袋的范围放大到约一半高度，圆形裁切后还有足够留白；微微往上让视觉置中
    await p.setContent(`<html><body style="margin:0"><div style="width:1080px;height:1080px;background:${v.bg};display:grid;place-items:center">
      <div style="width:507px;height:600px;transform:translateY(-8px)">${v.svg}</div></div></body></html>`);
    await p.screenshot({ path: path.join(OUT, `avatar-${k}.png`) });
  }
  // preview sheet
  const cells = Object.entries(VARIANTS).map(([k, v]) => `
    <div class="col"><p class="lab">${v.label}</p>
      <div class="row light"><img src="avatar-${k}.png" class="c320"><img src="avatar-${k}.png" class="c110"><div class="dm"><img src="avatar-${k}.png" class="c44"><span><b>Cartsmith Studio</b><br>Hi! I'm Junyu from Cartsmith…</span></div></div>
      <div class="row dark"><img src="avatar-${k}.png" class="c110"><div class="dm"><img src="avatar-${k}.png" class="c44"><span><b>Cartsmith Studio</b><br>Hi! I'm Junyu from Cartsmith…</span></div></div>
    </div>`).join('');
  const html = `<html><head><style>
    body{margin:0;padding:30px;font-family:Inter,'Noto Sans SC',sans-serif;background:#eee;display:flex;gap:24px}
    .col{background:#fff;border-radius:16px;padding:20px;width:420px}.lab{font-weight:700;margin:0 0 14px;font-size:18px}
    .row{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:16px;border-radius:12px;margin-bottom:12px}
    .light{background:#fff;border:1px solid #ddd}.dark{background:#000;color:#fff}
    img{border-radius:50%;display:block}.c320{width:320px}.c110{width:110px}.c44{width:44px}
    .dm{display:flex;gap:10px;align-items:center;font-size:13px;line-height:1.35}.dm span{opacity:.9}
  </style></head><body>${cells}</body></html>`;
  fs.writeFileSync(path.join(OUT, 'avatar-preview.html'), html);
  const p2 = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p2.goto('file://' + path.join(OUT, 'avatar-preview.html'));
  await p2.screenshot({ path: path.join(OUT, 'avatar-preview.png'), fullPage: true });
  fs.unlinkSync(path.join(OUT, 'avatar-preview.html'));
  await b.close();
  console.log('done → content/brand/');
})();
