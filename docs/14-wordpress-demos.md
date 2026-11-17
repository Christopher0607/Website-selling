# 14 — 10 个示范网站搬到真的 WordPress + WooCommerce（2026-11-16 起）

> 俊宇（2026-11-16）：「工作室网站上的示范全部接入 WordPress + WooCommerce，要真实的，而且要一模一样，不可以因为搬过去就弄不对；
> 做完了端到端检查包括后台；接单了进 WordPress 后台也可以。」
> 决定：**10 个全部做完、全部检查通过才一起换**；客人可以用**示范帐号**进 WordPress 后台，**每晚自动还原**。

## 目标

| 示范 | 现在（静态，资料在浏览器） | 之后（真的 WordPress 网站） |
|---|---|---|
| Sireh & Salt（一般餐厅） | cartsmithstudio.com/demo/sireh-salt/ | sireh-salt.demo.cartsmithstudio.com |
| Maison Cendre（精品餐厅） | /demo/maison-cendre/ | maison-cendre.demo.cartsmithstudio.com |
| Dulang & Daun（食品礼盒网店） | /demo/dulang-daun/ | dulang-daun.demo.cartsmithstudio.com |
| Butter & Lantern（RM399 节日预购） | /demo/butter-lantern/ | butter-lantern.demo.cartsmithstudio.com |
| 6 个电商模板 | /demo/<代号>/ | <代号>.demo.cartsmithstudio.com |

- 站点代号 `demo-<代号>`（例如 `demo-sireh-salt`），一个示范一个 WordPress。
- 换的那天：工作室网站、工作台、AI 资料里的连结全部改成新网址；旧网址 `/demo/<代号>/...` 自动 301 跳到新网址的同一页（已经发给客人的连结照样能开）。
  `demo-festive.cartsmithstudio.com` 跳到新的 Butter & Lantern。
- DNS：Cloudflare 一条 `*.demo` A 记录 → 服务器（DNS only），以后不用每个示范加一条。

## 「一模一样」怎么做到

- 页面、样式、程式**就是现在示范的那一份**（`python3 site/build.py` 产生的 `site/dist/demo/<代号>/`），build-demo 时复制进 WordPress 的
  `uploads/agc-skin/`，由 agency-core 的 skin 直接送出，网址和档名都不变（`menu.html`、`p/xxx.html`…）。
- 示范的程式（flagship 的 `app.js`、模板的 `store.js`）只有「资料从哪里来、送到哪里」不一样：
  - 静态版：浏览器里的假资料（localStorage）。
  - WordPress 版：页面里有 `window.AGC_LIVE`（skin 放进去），程式改用 WordPress 的接口：产品、价钱、库存、售完从 WooCommerce 来；
    下单、订位、礼券、询问、追踪订单都是真的，存进 WordPress。
- 同一份程式两边都能跑，所以改设计只要改一次。
- 检查：同一页静态版和 WordPress 版在手机 / 电脑截图对比（只允许资料不同的地方不同）。

## 背后真的功能（agency-core）

| 功能 | 用在 | 做法 |
|---|---|---|
| 网上点餐 / 网店下单（取货、外送区域、运费、时段、优惠码） | 全部 | WooCommerce 订单；价钱一律服务器算 |
| 节日预购（取货日子、截止、早鸟） | S&S、Maison、B&L | 现有节日模块（`class-festive*.php`） |
| 桌上扫码点单、厨房、今日结算 | S&S | 现有 `class-table.php` |
| 订位（人数、座位、订金、饮食要求） | S&S、Maison | **新**：订位记录 + 订金 = WooCommerce 订单；店家后台「订位」 |
| 礼券 | S&S、Maison | **新**：买礼券 = 订单，付款后自动产生一组只能用一次的优惠码 |
| 包场 / 外烩 / 公司礼品询问 | S&S、Maison、D&D | **新**：询问记录，店家后台看得到 |
| 自配礼盒 | D&D | **新**：礼盒 + 选的产品，服务器算价钱、扣库存 |
| 查订单 | D&D | **新**：订单号 + 电话 |
| 6 个模板：规格（尺寸、颜色…）、购物袋、优惠码、东马 / 西马运费、示范付款 | 6 个模板 | WooCommerce 产品（名称、价钱、特价、库存、照片，后台改了网站马上变）；规格加价跟页面一样；下单、WELCOME10、运费由服务器算，存成 WooCommerce 订单 |

## 示范帐号和每晚还原

- 每个示范网站有「看后台」：一按就用示范帐号进 WordPress 后台（`/wp-admin/`）或手机店家后台（`/dian/`），不用密码。
- 示范帐号（自己的角色）：看和改订单、产品、库存、优惠码、报表；**不能**改设定、装插件、管用户、删东西、改自己的密码。
- 每晚 04:20（马来西亚时间）整个网站还原成干净的样子（资料库 + 上传的照片）。
- 客人填的名字、电话、电邮、地址：1 小时后自动遮掉（其他访客看不到）；示范自己编的样本订单（例如 DD-2041）不遮。6 个模板的结账页写明「订单是真的、不收钱，请用假的资料」。
- 示范网站**不寄任何电邮**、不收钱（只有示范付款）、全站 noindex、顶部写明是示范。

## 步骤（每一步做完在 PROGRESS.md 打勾）

1. 平台：skin v2（任何页面、子资料夹、`AGC_LIVE`）、示范帐号 + 自动登录、不寄电邮、遮资料、每晚还原脚本。
2. 新功能：订位、礼券、询问、自配礼盒、查订单（接口 + 店家后台 + 测试）。
3. 4 个精品示范：资料（产品、选项、设定）→ `sites/demo-<代号>/` → 程式接真资料 → 本机端到端测试（客人 + 店家后台 + WordPress 后台）。
4. 6 个电商模板：同上（共用一套 `store.js`）。
5. 「一模一样」截图对比、全站检查、时间检查。
6. 服务器：一个小帮手 job 建 10 个网站 + SSL + 每晚还原排程；线上端到端测试。
7. 一起换：连结、跳转、工作台、AI 资料、截图；再全部测一次。

## 进度（本机）

| 示范 | 端到端测试 | 和工作室网站对比 |
|---|---|---|
| Sireh & Salt | 43/43 | 一样（只有订位剩几张桌子是真的数字） |
| Maison Cendre | 36/36 | 一样 |
| Dulang & Daun | 33/33 | 一样 |
| Butter & Lantern | 43/43 | 客人页面一样（时段剩几个名额是真的数字）；店家页 = 进真后台的按钮 |
| 6 个电商模板 | 各 35 项（同一套测试，读模板自己的产品） | 只有示范横幅和结账说明的字不同（WordPress 版写「真的订单、不收钱」） |

测试：`node site/tools/check-wp-demo.js http://<代号>.demo.kedailab.test <代号>`；对比：`node site/tools/compare-wp-demo.js http://localhost:8790 <WordPress 网址> <代号> <输出资料夹> <页面,...>`。

## 俊宇要做的

- **现在（任何时候）：** Cloudflare 加一条 DNS 记录（步骤在聊天里）。
- 最后换之前：自己用手机走一次（下单 → 看后台）。
