# scripts/ — 服务器和建站脚本

服务器上的位置：`/opt/agency/scripts/`（整个 repo clone 在 `/opt/agency`）。所有 `server/` 脚本都要 `sudo`，都有 `--help`。
日志：`/var/log/agency/<脚本名>-<日期>.log`。站点登记：`/etc/agency/sites/<代号>.conf`。密码：`/etc/agency/secrets/<代号>.env`（只有 root 能读）。

## server/ — 在服务器执行

| 脚本 | 做什么 |
|---|---|
| `provision-server.sh --studio-domain <域名> --email <电邮>` | 新服务器初始化（跑一次）：deploy 用户、防火墙、Nginx/PHP/MariaDB/WP-CLI/Certbot、PHP 和 Nginx 设定、每天备份的 cron |
| `harden-ssh.sh` | 关闭 root 和密码登录（确认 deploy 能登录后才跑） |
| `build-all.sh` | 一次建好 master + 3 个样板站 + 工作室网站（可以重复跑） |
| `new-site.sh <代号> <域名> [--basic-auth] [--noindex] [--www] [--no-ssl] [--empty]` | 新 WordPress 站（独立用户、PHP pool、数据库、SSL） |
| `setup-store.sh <代号> [--products csv] [--content 文件夹] [--brand json]` | 把空站变成网店：主题、插件、WooCommerce 马来西亚设定、页面、菜单、页脚、产品 |
| `setup-studio.sh <域名> [--force-pages]` | 工作室网站 |
| `build-demo.sh <demo-代号>` | 建 / 重建样板站（资料在 `sites/<代号>/`） |
| `clone-site.sh <来源> <目标> <域名> [--basic-auth] [--noindex]` | 复制站点（换网址、换 salts、清掉追踪 ID / 邮件 / 备份设定、新管理员密码） |
| `apply-brand.sh <代号> <brand-config.json>` | 套用品牌：名称、颜色、字体、logo、WhatsApp、公司资料、运费、mode |
| `make-preview.sh <潜在客户代号> <brand-config.json>` | 免费样板首页（密码 + noindex + Demo 模式，记录 14 天删除日） |
| `cleanup-previews.sh [--list-only] [--days 14]` | 删除到期的 preview |
| `backup-site.sh <代号\|--all>` | 备份（数据库 + 文件），保留 7 份 |
| `restore-site.sh <代号> <备份文件夹>` | 还原（可以还原到别的站，自动换网址） |
| `update-site.sh <代号\|all> [--exclude 插件] [--simulate-failure]` | 先备份 → 更新 → smoke test → 失败自动还原 |
| `smoke-test.sh <网址> [--site 代号] [--shop] [--expect-noindex]` | 快速检查（任何电脑都能跑） |
| `site-inventory.sh` | 所有站点：WP 版本、待更新、SSL 到期、磁盘、最后备份 |
| `site-config.sh <代号> [--ssl] [--basic-auth on\|off] [--noindex on\|off] [--show]` | 改 Nginx 层设定 |
| `install-code.sh <代号\|all> [plugin\|theme\|both]` | 安装 / 更新 agency-core 插件和子主题 |
| `delete-site.sh <代号> [--no-backup]` | 删除站点（要输入代号确认），并检查没有残留 |
| `optimize-images.sh <输入> <输出> [--max 1600]` | 照片转 WebP、缩小、去 EXIF |

`server/php/` 是给 `wp eval-file` 用的 PHP（WooCommerce 设定、套用品牌、建页面、导入产品）。

## local/ — 在你自己的电脑执行

| 脚本 | 做什么 |
|---|---|
| `deploy-code.sh <ssh主机> <代号\|all>` | 服务器 `git pull` + 安装插件和子主题 + smoke test |
| `migrate-site.sh <来源主机> <代号> <目标主机> <代号> <域名>` | 跨服务器搬站（staging → 生产）。**第一次用前先演练** |
| `screenshot.js <网址> <文件夹> [--auth u:p]` | 作品集截图（桌面 1440 + 手机 390） |
| `fetch-stock-images.py <stock.json> <站点文件夹>` | 下载 Pexels 免费商用照片（裁切、转 WebP、写 image-sources.md） |
| `make-home-page.py <home.json> <home.html>` | 用 JSON 产生网店首页（大图、信任标志、分类、商品、图文、FAQ） |
| `make-product-images.py <images.json> <文件夹>` | （旧）程式画的产品插图，已不用 |

## 测试记录（2026-11-06，Ubuntu 24.04 + PHP 8.3 + MariaDB 10.11 + Nginx 1.24）

- ✅ provision → new-site → setup-store → smoke test PASS
- ✅ Demo 模式：经典结账和 Store API 下单都被服务器挡下（403），没有产生订单
- ✅ 关闭 Demo 模式：西马 RM8 / 东马 RM15 运费正确，订单建立，库存减少；测试订单已删除
- ✅ clone master → 新站：数据库里搜不到旧网址；38 秒完成
- ✅ apply-brand 改主色 → 网站颜色跟着变
- ✅ update-site --simulate-failure → 自动还原，smoke test PASS
- ✅ restore 到另一个站 → 能打开、能登录 → delete-site 没有残留
- ✅ make-preview（50 秒）→ cleanup-previews 删除
- ✅ 询价表单：存进 Leads；费用计算器 3 组手算例子一致，没有任何外部请求
- ⚠ 未测（需要真实服务器）：certbot 申请 SSL、ufw、fail2ban、harden-ssh、migrate-site 跨服务器
