// A5 价钱单 → PDF（印刷用）+ PNG（手机上看）
// 用法：node sales/print/render.js [WhatsApp 号码]
//   不给号码：WhatsApp 那一行留空白线，印好后手写。二维码在 qr-flyer.svg（cartsmithstudio.com/?ref=flyer）。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const wa = (process.argv[2] || '').replace(/[^\d +-]/g, '').trim();

(async () => {
  const src = fs.readFileSync(path.join(HERE, 'price-sheet-a5.html'), 'utf8')
    .replace('{{QR}}', fs.readFileSync(path.join(HERE, 'qr-flyer.svg'), 'utf8'))
    .replace('{{WHATSAPP}}', wa ? `<span class="num">${wa}</span>` : '<span class="line"></span>');
  const tmp = path.join(HERE, '.price-sheet-built.html');
  fs.writeFileSync(tmp, src);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 559, height: 794 }, deviceScaleFactor: 3 });
  await p.goto('file://' + tmp);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const fit = await p.evaluate(() => { const pg = document.querySelector('.page'); return { over: pg.scrollHeight - pg.clientHeight, fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i) }; });
  console.log('overflow px:', fit.over, '| fonts:', fit.fonts.join(', '));
  await p.pdf({ path: path.join(HERE, 'price-sheet-a5.pdf'), width: '148mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await p.screenshot({ path: path.join(HERE, 'price-sheet-a5.png'), fullPage: false });
  await b.close();
  fs.unlinkSync(tmp);
  console.log('wrote price-sheet-a5.pdf and price-sheet-a5.png');
})();
