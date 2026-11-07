// 把 content/ig-launch/posts.html 的每一张贴文截成 01.jpg … 09.jpg（1080×1350）
const { chromium } = require('playwright');
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');

(async () => {
  const dir = path.join(__dirname, '..', '..', 'content', 'ig-launch');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(dir, 'posts.html'), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const posts = await p.$$('.post');
  for (let i = 0; i < posts.length; i++) {
    const png = path.join(dir, String(i + 1).padStart(2, '0') + '.png');
    await posts[i].screenshot({ path: png });
    const jpg = png.replace(/\.png$/, '.jpg');
    execFileSync('convert', [png, '-quality', '88', '-sampling-factor', '4:2:0', jpg]);
    fs.unlinkSync(png);
    console.log('  ' + path.basename(jpg), Math.round(fs.statSync(jpg).size / 1024) + ' KB');
  }
  await b.close();
})();
