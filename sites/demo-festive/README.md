# demo-festive — Butter & Lantern（RM399 节日预购网店，WordPress 真网店示范）

- **是什么（2026-11-13）：** RM399 节日预购网店真正交付时的样子，用 WordPress + WooCommerce + 我们的插件 agency-core 1.4.0 做的。虚构的家庭烘焙坊，**不是真实店家**；示范模式：顶部写明 Demo、noindex、只有「示范网上付款」（直接当作已付款）和 DuitNow 示范 QR（写着 DEMO, DO NOT PAY），**不收任何钱**。
- **网址：** `https://demo-festive.cartsmithstudio.com`（服务器建好之后；本机测试是 `http://demo-festive.kedailab.test`）
- **跟静态示范的关系：** `site/flagships/butter-lantern/` 是放在工作室网站上的静态示范（四个节日都能切换）；这个是真的 WordPress 网店（农历新年中文版），客户买了就是照这个做。
- **怎么建 / 重建：** 服务器上 `sudo /opt/agency/scripts/server/build-demo.sh demo-festive`（从 master 复制 → 套品牌、产品、页面 → 读 `festive.json` → 运送区域、付款方式、中文语言包、12 张示范订单）。可以重复跑，会把产品和示范订单重设。
- **资料：**
  - `brand-config.json`：店名、颜色（年红 + 金）、字体（Noto Serif SC / Noto Sans SC）、信任标志
  - `products.csv`：8 样年饼（黄梨球和蛋卷有规格 / 口味，年糕示范「已售完」），库存数字就是「剩几份」
  - `festive.json`：节日设定（截止 2027-01-31、取货 2027-02-01 至 02-05、早鸟 9 折到 2026-12-31、自取每时段 6 单、送货每时段 10 单）
  - `content/`：首页、查订单、关于、常见问题、联系（中文）
- **功能（全部在 agency-core，`wp/agency-core/includes/class-festive*.php`、`class-receipts.php`）：**
  截止倒数和截止后停止下单（留 WhatsApp 号码等下次开放）、剩几份、早鸟价、结账选自取 / 送货的日子和时段（满了不能选）、巴生谷邮区送货、快递说明、DuitNow QR + 上传收据（收据存在网站公开文件夹外面，只有店家能开）、「可以取货」状态 + 电邮、订单页时间线 + 加入日历、查订单、店家后台「WooCommerce → 节日订单」（每天要做多少、按时段的订单、待确认付款、一键「已收到付款 / 可以取货 / 完成」、打印）。
- **测试：** `FEST_ADMIN_USER=… FEST_ADMIN_PASS=… node site/tools/check-festive-wp.js <网址>`（38 项：三种取货方式、三种付款、收据、查订单、店家后台、时段满、截止后；2026-11-13 本机全部通过）。
- **要注意：**
  - 示范订单的客户名字都写「（示范）」，电邮是 example.com。
  - 网站没有密码（方便给潜在客户看）。如果出现垃圾测试订单，跑 `sudo /opt/agency/scripts/server/site-config.sh demo-festive --basic-auth on` 加密码。
  - 电邮要等服务器设好 Brevo（`docs/08-deploy-guide.md` 第 9 步）才寄得出去。
  - 节日日期在 `festive.json`，2027 农历新年过后要换下一季。
- **图片：** `image-sources.md`（Pexels）。
