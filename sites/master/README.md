# master — 母版网店

- 网址：https://master.kedailab.com（basic auth：帐号 view，密码在 `sudo cat /etc/agency/secrets/master.env`）
- 用途：母版。所有样板站、preview、客户测试站都从这里复制（`clone-site.sh master ...`）
- 建立：`sudo scripts/server/new-site.sh master master.kedailab.com --basic-auth --noindex` → `sudo scripts/server/setup-store.sh master --content sites/master/content --products sites/master/products.csv`（`build-all.sh` 会自动做）
- 管理员：studio_admin（密码在 secrets 文件 → 存进密码管理器）
- 模式：demo（Demo 模式开、noindex、不能真的下单）

## 里面有什么
- 主题：Kadence（父）+ agency-child（子主题，`wp/child-theme/`）
- 页面：首页、商店、购物车、结账（经典短代码）、我的账户、关于、联系、FAQ、运送与退换、隐私通知（英 + 马来文草稿）、条款（草稿）
- WooCommerce：RM、只卖马来西亚、访客结账、库存管理；运费区西马 RM8 / 东马 RM15、满 RM150 免运；银行转账（备用）
- 示范产品：10 款（3 个分类、2 款有变体），图片是程式产生的插图（`image-sources.md`）
- 菜单：主菜单（首页、商店、关于、FAQ、联系）、页脚菜单（FAQ、联系、运送与退换、隐私、条款）；页脚 3 栏：公司资料 / 页脚菜单 / 社交 + 付款方式

## 插件（每个的原因）
| 插件 | 原因 |
|---|---|
| WooCommerce | 网店核心 |
| agency-core（自建） | WhatsApp 按钮、Demo 模式、GA4 / Pixel、公司资料短代码、马来西亚结账栏位 |
| Kadence Blocks | 页面区块和样式 |
| Rank Math SEO | sitemap、标题、结构化资料 |
| FluentSMTP | 用 Brevo API 寄订单邮件（DigitalOcean 封锁 SMTP 端口） |
| UpdraftPlus | 第二层备份（Google Drive） |
| Limit Login Attempts Reloaded | 防暴力登录 |
| Two Factor | 管理员 2FA |

付款网关插件（Billplz / ToyyibPay）在客户开户时才装，母版不装。

## 页面缓存
Nginx FastCGI 缓存 2 分钟；购物车、结账、我的账户、登录用户、带参数的网址不缓存。清缓存：任何脚本执行完都会自动清。

- PageSpeed 手机版：首页 __ / 产品页 __（部署后测）
- 备份：/var/backups/agency/master/（每天 03:15）；最后一次还原测试：2026-11-06（本地）
