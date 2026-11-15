// HTML files → A4 PDFs next to them (client documents, scripts/local/client-docs.py). Usage: node html-to-pdf.js a.html b.html …
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const f of process.argv.slice(2)) {
    await p.goto('file://' + path.resolve(f), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: f.replace(/\.html$/, '.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  }
  await b.close();
})();
