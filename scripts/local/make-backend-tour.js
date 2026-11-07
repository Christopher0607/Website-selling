// 把 WooCommerce 后台截图加上中英说明 → content/backend-tour/01.jpg …（给俊宇看，也可以给商家看）
// 用法：node scripts/local/make-backend-tour.js <截图资料夹>
// 截图来自本地测试店（示范资料），每张图都标示 "Demo data"。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const SRC = process.argv[2];
const OUT = path.join(__dirname, '..', '..', 'content', 'backend-tour');
const SLIDES = [
  ['01-orders', '订单一目了然', 'Every order at a glance', '新订单、处理中、已完成、等付款——用颜色分好。点一下就看到详情。'],
  ['02-order-detail', '订单详情', 'Order details', '客人资料、地址、买了什么、运费、付款方式。改成「已完成」时，客人会自动收到电邮。'],
  ['03-products', '产品和库存', 'Products & stock', '所有产品的价格、库存、分类、促销价。库存卖完会自动显示缺货。'],
  ['04-product-edit', '编辑产品', 'Edit a product', '改价格、库存、照片、说明，按「更新」就上线。尺寸、颜色这些规格也在这里设定。'],
  ['05-shipping', '运费设定', 'Shipping rates', '西马、东马分开收运费，满额免运。我们交付时就帮你设好。'],
  ['06-payments', '付款方式', 'Payments', '上线时在这里接上用你公司名义开的付款网关（FPX 网银、信用卡、电子钱包）。备用的银行转账 / DuitNow 已经设好。'],
  ['07-agency-settings', '我们的工具', 'Our add-ons', 'WhatsApp / IG 聊天按钮、公告栏、信任标志、免运门槛……不用写程式，在这一页改。'],
  ['08-orders-phone', '手机也能管理', 'Manage from your phone', '在手机浏览器打开后台，一样可以看订单、改状态。'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1100 } });
  for (const [i, [file, zh, en, desc]] of SLIDES.entries()) {
    const img = 'file://' + path.join(path.resolve(SRC), file + '.png');
    const phone = file.includes('phone');
    const html = `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Inter:wght@400;600&family=Noto+Sans+SC:wght@500;700&display=swap"><style>
      *{box-sizing:border-box;margin:0}body{width:1440px;background:#f7f4ee;font-family:Inter,'Noto Sans SC',sans-serif;color:#14171c}
      .cap{display:flex;gap:26px;align-items:center;padding:34px 48px;background:#14171c;color:#fff}
      .n{flex:none;width:64px;height:64px;border-radius:16px;background:#ff5a2c;display:grid;place-items:center;font:700 30px 'Bricolage Grotesque'}
      h1{font:700 34px 'Noto Sans SC',sans-serif}h1 small{font:600 20px Inter;color:#9aa1ac;margin-left:12px}
      p{font-size:21px;color:#d9dde3;margin-top:6px;font-family:'Noto Sans SC',sans-serif}
      .shot{padding:28px 48px 18px;${phone ? 'display:flex;justify-content:center' : ''}}
      .shot img{display:block;${phone ? 'width:380px;border-radius:28px;border:10px solid #111' : 'width:100%;border-radius:12px;border:1px solid #ddd'};box-shadow:0 18px 50px rgba(0,0,0,.18)}
      .ft{display:flex;justify-content:space-between;padding:0 48px 26px;font-size:16px;color:#5d6470}
    </style></head><body><div class="cap"><div class="n">${i + 1}</div><div><h1>${zh}<small>${en}</small></h1><p>${desc}</p></div></div>
      <div class="shot"><img src="${img}"></div><div class="ft"><span>WooCommerce 后台 · 示范资料 Demo data（不是真的客户）</span><span>Cartsmith Studio</span></div></body></html>`;
    const tmp = path.join(OUT, '_tmp.html');
    fs.writeFileSync(tmp, html);
    await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const png = path.join(OUT, String(i + 1).padStart(2, '0') + '.png');
    await p.locator('body').screenshot({ path: png });
    execFileSync('convert', [png, '-resize', '1200x', '-quality', '85', png.replace('.png', '.jpg')]);
    fs.unlinkSync(png);
    fs.unlinkSync(tmp);
    console.log('  ' + path.basename(png.replace('.png', '.jpg')));
  }
  await b.close();
})();
