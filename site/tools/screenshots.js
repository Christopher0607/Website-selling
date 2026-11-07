// 产生模板截图（工作室网站的模板卡片和首页手机图用）→ assets/shots/
// 用法：python3 build.py && python3 -m http.server 8765 --directory dist &  node tools/screenshots.js
// 截完再跑一次 python3 build.py，截图才会进到 dist/
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8765';
const OUT = path.join(__dirname, '..', 'assets', 'shots');
const SLUGS = ['dewlane', 'plainfold', 'chili-pantry', 'lowlight', 'tailmate', 'voltnest'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [kind, vp, scale, width] of [['desktop', { width: 1440, height: 900 }, 1, 1440], ['mobile', { width: 390, height: 844 }, 2, 600]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale });
    const page = await ctx.newPage();
    for (const slug of SLUGS) {
      await page.goto(`${BASE}/demo/${slug}/index.html`, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: '.toast{display:none!important}' });
      await page.waitForTimeout(400);
      const png = path.join(OUT, `${slug}-${kind}.png`);
      await page.screenshot({ path: png });
      const webp = png.replace(/\.png$/, '.webp');
      execFileSync('cwebp', ['-quiet', '-q', '80', '-resize', String(width), '0', png, '-o', webp]);
      fs.unlinkSync(png);
      console.log('  ' + path.basename(webp), Math.round(fs.statSync(webp).size / 1024) + ' KB');
    }
    await ctx.close();
  }
  await browser.close();
})();
