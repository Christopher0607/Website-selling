# preview-tbt — The Baking Trip 的私人预览网店（WordPress + WooCommerce + 店家后台）

- **是什么（2026-11-14）：** 给 The Baking Trip（Happy Garden 的天然酵母面包店，工作台卡片 p065）看的**真网店**：客人选面包、选取货日子和时段、网上付款或 DuitNow QR；店家用手机在 `/dian/` 看订单、确认付款、按「可以取货」、改价钱、上架新产品。成交后就是交付的网站（换成店家自己的付款网关、照片、价钱，关掉示范模式和密码）。
- **网址：** `https://preview-tbt.cartsmithstudio.com`（有密码：basic auth 帐号 `tbt`；noindex）。店家后台 `https://preview-tbt.cartsmithstudio.com/dian/`（帐号 `thebakingtrip`，shop_manager）。**密码都在工作台 The Baking Trip 卡片的笔记里**，不写在这里。
- **示范模式：** 顶部横幅写明是 Cartsmith Studio 做的私人预览、不收钱；可以下测试订单（只有「Online banking (FPX), cards, e-wallets」示范付款 = 直接当作已付款，和 DuitNow 示范 QR，写着 DEMO DO NOT PAY），**不收任何钱**。
- **怎么建：** 服务器上的小帮手跑 `ops/jobs/006-preview-tbt.sh`（005 第一次跑就停了，已换成 006）：等 DNS（`preview-tbt` A 记录 → 服务器，DNS only）→ `build-demo.sh preview-tbt`（从 master 复制 → 品牌、产品、页面 → `festive.json` → `setup.php`）→ 开 basic auth → 建店家帐号和测试帐号。
  - 第一次建的时候会删掉从 master 复制过来的测试订单、顾客、优惠码（`setup.php`，记号 `agc_preview_clean`）；之后重建不会删订单。
  - 重建会把产品换回 `products.csv`（`--replace-products`）：店家在后台改过的价钱会被盖掉，所以给店家用了之后就**不要再跑 build-demo**，改东西用后台或 WP-CLI。
- **外观 = 给店家看的样板（2026-11-15，俊宇：「改成一模一样」）：** `skin/` 是样板（`clients/m-the-baking-trip/preview/site`）原样的页面、样式、程式，由 agency-core 1.7.0 的 `class-skin.php` 直接显示（设定 `skin` = 1，在 `festive.json`）。网址：`/`、`/menu/`、`/order/`（谢谢页 `/order/?o=…&k=…`）、`/festive/`、`/catering/`；隐私、条款、取货与退款、查订单这些 WordPress 页面也套进同一个外观；`/shop/`、`/cart/` 会跳到 `/menu/`、`/order/`。背后全部是真的：价钱、售完、剩几份来自 WooCommerce（SKU = `skin/data.json` 里的 id），取货日子和时段来自预购设定（星期一、二休息，每个 3 小时时段最多 10 单；客人在样板的 15 分钟时间里选，订单记下所属时段和准确时间），付款有「网上付款」（预览 = 示范付款）、DuitNow QR + 上传收据、「用 WhatsApp 发订单」，优惠码用 WooCommerce 的优惠券，整个蛋糕询问会寄电邮给店家。样板改了的话：`python3 mk/tbt_skin.py`（Claude Code 的 scratchpad 脚本，从样板重新产生 `skin/` 和 `products.csv`）。测试：`node site/tools/check-skin.js <网址>`（26 项，会下测试订单，只在预览站跑）+ `check-owner.js`（会自动认出这种网站，用样板的页面下单）。
- **资料：**
  - `brand-config.json`：店名、颜色（深咖啡 / 米色 / 焦糖）、字体 Fraunces + Nunito、WhatsApp 019-576 1419、地址 A6 Jalan Rukun 7 Taman Gembira、营业 星期三至日 9am–6pm
  - `products.csv`：照样板的菜单产生（25 样 + 圣诞 2 样，SKU = 样板的 id）：8 样有价钱（Eat Drink KL 2023-05 公布的价钱）；其他没公布价钱的是草稿，网站显示「Ask」，店家在后台填价钱、上架后马上可以下单；圣诞的 babka（30 份）和整个 Amai Genmai 蛋糕（15 份）是「价钱另外确认」的预订
  - `festive.json`：**天天接预订**（agency-core 1.6.2 的 `fest_rolling` = 30）：客人选明天起 30 天内的日子，星期一、二休息（`fest_closed` = mon, tue），三个取货时段 9–12 / 12–15 / 15–18、每个时段最多 10 单；没有送货
  - `setup.php`：只有到店自取（结账不用填地址：名字、电话、电邮就好）、DuitNow QR + 上传收据、示范网上付款（只在示范模式）、产品顺序、英文页面名称
  - `content/`：首页、关于、常见问题、联系、查订单、取货与退款（草稿）、隐私（草稿，英文 + 马来文）、条款（草稿）——法律页面都标明 DRAFT，上线前请店家和律师确认 `[方括号]` 里的内容
  - `images-src.json` + `image-sources.md`：照片来源（Eat Drink KL），建站时才下载，不进 git
- **测试（2026-11-14 本机全部通过）：**
  - 店家后台：`OWNER_USER=tbttest OWNER_PASS=… node site/tools/check-owner.js <网址>`（50 项：登录、订单、客人网上下单 + DuitNow、改取货时间、已收到付款 → 可以取货 → 完成、生产清单、改价钱和库存、草稿产品填价钱上架、新产品 + 照片、顾客、报表 + Excel、设定、优惠码、暂停接单、员工帐号、电脑版）；用店家帐号跑加 `OWNER_IS_ADMIN=0 MANAGER_USER=… MANAGER_PASS=…`（49 项）。
  - 有 basic auth 的真网址：Playwright 要加 `httpCredentials`。**每跑一次会故意输错一次密码**，Limit Login Attempts 输错 4 次会锁 20 分钟，不要连续跑太多次。
  - 测试留下的订单（电邮 `@example.com`）和 `tbttest` 帐号，测完要用 ops 脚本删掉。
- **交付时要做（成交后）：**
  1. 店家自己的付款网关（用店家的名义开）→ 关掉示范模式（`wp agc demo off`）和示范付款；上传店家真正的 DuitNow QR（后台 → 设定 → DuitNow QR）
  2. 换照片、确认价钱、上架草稿产品；法律页面请店家 / 律师确认
  3. 删掉 `tbttest`，`thebakingtrip` 改成店家自己的电邮并让店家自己设密码；关掉 basic auth 和 noindex，换成店家的域名（`site-config.sh`）
  4. 电邮：服务器设好 Brevo 才寄得出订单电邮
- **没成交：** 14 天内删除（`delete-site.sh preview-tbt`，先确认）。
