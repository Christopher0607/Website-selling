# 02 — 技术规格

> 给 Claude Code：这是技术标准。插件、版本、服务的选择，以任务 0.6 的「查证记录」为准；这里写的是默认方案。

---

## 1. 总体架构

```
你的电脑（Windows）
├── Claude Code
└── 本地项目文件夹（git）：docs / scripts / wp / sites / sales / content / clients
        │
        │  ssh / scp（密钥登录，用户 deploy）
        ▼
DigitalOcean dev 服务器（新加坡，Ubuntu LTS）
├── Nginx（每个站点一个 server block）
├── PHP-FPM（每个站点一个 pool + 一个 Linux 用户）
├── MariaDB（每个站点一个数据库 + 一个数据库用户）
└── 站点
    ├── yourbrand.com                 工作室网站（公开）
    ├── master.yourbrand.com          母版站（密码保护）
    ├── demo-<名字>.yourbrand.com      3 个样板站（公开，noindex）
    └── preview-<代号>.yourbrand.com   给潜在客户的样板首页（密码保护，14 天后删除）

DigitalOcean 生产服务器（第一个客户签约后才开，设定相同）
└── 客户正式网站（客户自己的域名）

外部服务：DNS（域名商或 Cloudflare）、交易邮件服务（API）、备份存储（Google Drive）、在线监控
```

`yourbrand.com` 在所有文件里代表俊宇的工作室域名，按 `00-decisions.md` 替换。

---

## 2. 服务器

### 2.1 dev 服务器

| 项目 | 设定 |
|---|---|
| 机房 | Singapore |
| 系统 | Ubuntu 最新 LTS |
| 规格 | Basic，2 GB 内存 / 1 vCPU 起步（站点多了再升级） |
| 登录 | 只用 SSH 密钥 |
| 其他 | 开启 DigitalOcean 自动备份 + Monitoring |
| Hostname | `agency-dev` |

### 2.2 生产服务器（以后）

第一个客户签约后才开，设定跟 dev 一样，hostname `agency-prod`。超过 10 个客户网站时考虑升级到 4 GB。

### 2.3 软件与设定

| 组件 | 要求 |
|---|---|
| Nginx | Ubuntu 套件版本 |
| PHP-FPM | WordPress 和 WooCommerce 推荐的版本（任务 0.6 查证）。扩展：curl、gd 或 imagick、intl、mbstring、mysql、xml、zip、bcmath、opcache；redis（可选） |
| MariaDB | Ubuntu 套件版本，做好基本安全设定 |
| WP-CLI | 最新版，全局安装 |
| Certbot | Let's Encrypt + nginx 插件，自动续期 |
| 工具 | unzip、zip、git、jq、webp（cwebp）、imagemagick、apache2-utils（htpasswd）、rsync |
| 安全 | ufw、fail2ban、unattended-upgrades |

**PHP 设定：** `memory_limit=256M`、`upload_max_filesize=64M`、`post_max_size=64M`、`max_execution_time=120`、`max_input_vars=3000`、OPcache 开启、`expose_php=Off`。

**Nginx 设定：** `client_max_body_size 64M`、gzip 开启、静态文件缓存标头、禁止访问 `.env`、`.git`、`wp-config.php` 的备份文件；`xmlrpc.php` 默认封锁。

**其他：** 时区 `Asia/Kuala_Lumpur`；2 GB 内存的机器加 2 GB swap。

### 2.4 每个站点互相隔离

| 项目 | 规则 |
|---|---|
| Linux 用户 | `site_<代号>`（不能登录的用户），拥有 `/var/www/<代号>/` |
| 网站目录 | `/var/www/<代号>/public`（网站根目录）、`/var/www/<代号>/logs` |
| PHP-FPM pool | 每站一个，用该站的 Linux 用户执行 |
| 数据库 | 数据库 `wp_<代号>`、用户 `u_<代号>`（代号里的 `-` 换成 `_`），随机密码 |
| 凭证 | 存在服务器 `/home/deploy/.secrets/<代号>.env`（权限 600），不进 git |
| WP-CLI | 用该站用户执行：`sudo -u site_<代号> wp --path=/var/www/<代号>/public ...` |

这样一个站出问题，不会影响其他站。

### 2.5 安全基线

- SSH 只用密钥；确认 `deploy` 能登录和 sudo 之后，才关闭 root 登录和密码登录
- 防火墙只开 22、80、443
- 自动安装安全更新
- WordPress：`DISALLOW_FILE_EDIT` 设为 true；管理员用户名不能是 `admin`；强密码；管理员开 2FA；限制登录尝试；封锁 XML-RPC
- 文件权限：目录 755、文件 644、`wp-config.php` 640
- 密码和 Key 不进 git、不写进 docs

---

## 3. 网址规划

| 用途 | 网址 | 访问 | 搜索引擎 |
|---|---|---|---|
| 工作室网站 | `yourbrand.com`（www 跳转到主域名） | 公开 | 允许收录 |
| 母版站 | `master.yourbrand.com` | 密码保护（Nginx basic auth） | noindex |
| 样板站 | `demo-<名字>.yourbrand.com` | 公开 | noindex |
| 潜在客户样板 | `preview-<代号>.yourbrand.com` | 密码保护 | noindex，14 天后删除 |
| 客户测试站 | `staging-<客户代号>.yourbrand.com` | 密码保护 | noindex |
| 客户正式站 | 客户自己的域名 | 公开 | 允许收录 |

**DNS：** `@`、`www` 各一条 A 记录；再加一条通配符 `*` A 记录指向 dev 服务器，以后开新的子域名不用再改 DNS。

**SSL：** 每个子域名用 Certbot 单独申请证书。用了 basic auth 的站点，Nginx 要让 `/.well-known/acme-challenge/` 不需要密码，否则证书申请和续期会失败。

如果用 Cloudflare：默认只用 DNS（灰色云朵，不走代理）；要开代理的话，SSL 模式设为 Full (strict)。

---

## 4. 母版站（master）

母版站是所有样板站、preview、客户网站的起点。原则：**做一次做好，之后每个站都从它复制。**

### 4.1 主题

- 父主题：**Kadence**（免费版），备选 Astra。任务 0.6 确认仍在维护、跟最新 WooCommerce 兼容。
- 子主题：`agency-child`（源文件在 `wp/child-theme/`）。
- 全局颜色和字体用 Kadence 的设定（不要写死在 CSS 里），这样 `apply-brand.sh` 才能自动换。Claude Code 先查清楚 Kadence 把全局颜色和字体存在哪个 theme_mod / option，再写进脚本。

### 4.2 插件清单

| 功能 | 默认选择 | 备注 |
|---|---|---|
| 网店核心 | WooCommerce | 必装 |
| 页面区块 | Kadence Blocks | 做首页区块和样式 |
| 付款 | **待查证**（候选：Billplz、ToyyibPay、SenangPay、Stripe） | 要支持 FPX，最好也支持电子钱包和信用卡；兼容最新 WooCommerce；客户用自己的公司名义开户 |
| 物流 | 母版只用 WooCommerce 内建运费区；**待查证**物流插件（候选：EasyParcel） | 客户需要自动下物流单时才加 |
| SEO | Rank Math（免费版） | 或 Yoast，二选一 |
| 邮件 | FluentSMTP + 交易邮件服务（API 方式） | 见 4.8 |
| 备份 | UpdraftPlus（免费版）→ Google Drive | 另加服务器层备份脚本 |
| 页面缓存 | WP Super Cache | 必须排除 cart / checkout / my-account 和 WooCommerce 的 cookie |
| 对象缓存（可选） | Redis Object Cache | 服务器装了 Redis 才用 |
| 登录安全 | Limit Login Attempts Reloaded + Two Factor | 管理员必须开 2FA |
| 表单（工作室网站用） | Fluent Forms | 网店一般不需要 |
| WhatsApp、Demo 模式、追踪代码 | 自建 `agency-core` | 不另外装插件 |
| 图片优化 | 不装插件 | 上传前用 `optimize-images.sh` 转 WebP |

原则：**插件越少越好。** 每加一个插件，在站点 README 写明原因。付费插件先问俊宇。

### 4.3 WooCommerce 马来西亚设定

- **货币：** Malaysian ringgit，显示 "RM"，2 位小数
- **店铺地址：** 客户的营业地址（母版用示范地址）
- **销售和送货地区：** 只限 Malaysia（客户需要时再加 Singapore）
- **运费区：**
  - 西马（Semenanjung）：Sabah、Sarawak、Labuan 以外的州属
  - 东马：Sabah、Sarawak、Labuan
  - 每区一个统一运费（Flat rate）+ 可选免运费门槛（例如满 RM150 免运）；可选自取（Local pickup）
- **结账页：**
  - 允许访客结账，创建账号可选
  - 电话必填（方便用 WhatsApp 联系客人）
  - 不需要的栏位设为可选或隐藏（公司名称、地址第 2 行）
  - 保留邮编（运费和物流需要）
- **税：** 默认关闭。客户有 SST 注册的话，按他会计的建议设定
- **库存：** 开启库存管理和低库存提醒
- **付款：**
  - 母版 / 样板站：不开真实付款（Demo 模式）
  - 客户站：先用付款网关的测试模式（sandbox），上线当天才切换到正式
  - 银行转账（Direct bank transfer）可以当作备用付款方式
- **订单邮件：** 用品牌颜色和 logo，测试要进 Gmail 收件箱
- **永久链接：** `/%postname%/`

### 4.4 页面清单和首页结构

**页面：** 首页、商店、产品页（模板）、购物车、结账、我的账户、关于我们、联系我们、常见问题、运送与退换、隐私政策、条款与条件、404。

**首页（从上到下）：**
1. 主视觉：主产品图 + 一句话卖点 + 两个按钮（立即购买 / WhatsApp 问我们）
2. 3 个卖点（例如：本地品牌、满额免运、7 天退换）
3. 热卖产品（4–8 款）
4. 品牌故事（短）
5. 真实顾客评价（**没有真实评价就不放这一区**）
6. 常见问题（3–5 条）
7. WhatsApp 行动呼吁
8. 页脚：公司名称 + SSM 注册号、联系方式、政策页面链接、社交链接、付款方式图标

**可重复使用的区块样式（block patterns）：** 主视觉、3 卖点、产品格子、品牌故事、评价、FAQ、行动呼吁、页脚公司资料。

### 4.5 合规清单（马来西亚）

> 这是检查清单，不是法律意见。法律页面只做草稿，提醒客户请律师确认。上线前 Claude Code 再查一次最新规定。

**A. 网店必须显示的资料**（《消费者保护（电子交易）条例 2012》）
- [ ] 卖家 / 公司名称
- [ ] 注册号码（如适用，例如 SSM 号码）
- [ ] 联系电邮
- [ ] 联系电话
- [ ] 商品的完整价格（运费和其他费用要讲清楚）
- [ ] 接受的付款方式
- [ ] 适用的条款与条件
- [ ] 建议也写清楚：商品主要特点、预计送货时间、退换货政策

**B. 隐私通知**（《个人资料保护法 2010》，PDPA）
- [ ] 第 7(3) 条要求通知要有**国语（马来文）和英文**两个版本
- [ ] 内容要说明：处理哪些个人资料、目的、资料来源、查阅和更正的权利和联系方式、会透露给哪些第三方、限制处理的选择、提供资料是自愿还是必须、不提供的后果
- [ ] 用了 GA4、Meta Pixel 等追踪工具，要写进隐私通知

**C. 产品本身的合规由客户负责**（例如化妆品通报、清真声明、健康功效说法）。我们不帮写没有根据的功效。

### 4.6 性能标准

- PageSpeed Insights 手机版性能分：网店首页和 1 个产品页 ≥ 80；工作室网站 ≥ 85
- LCP（最大内容出现时间）< 2.5 秒
- 产品图：WebP，长边 1200–1600 px，每张尽量 < 200 KB
- 首页不放自动播放视频；字体最多 2 种
- 分数和测试日期记录在站点 README

### 4.7 备份与还原

- UpdraftPlus：每天备份数据库，每周备份文件，保留 14 份，存到 Google Drive
- 服务器层：`backup-site.sh` 每天由 cron 执行，服务器上保留 7 天
- DigitalOcean 整台服务器自动备份
- **每季做一次还原测试**：还原到临时站点，确认能用，再删掉。没测过的备份不算备份。

### 4.8 邮件

DigitalOcean 默认封锁 Droplet 的 SMTP 端口 25、465、587，官方建议用第三方邮件服务寄信（来源 1）。所以：

- 用 **FluentSMTP 连接交易邮件服务的 API**，不用 SMTP 端口。候选：Brevo、Mailgun、Amazon SES、Postmark（任务 0.6 查证免费额度）
- 发件地址：客户站用 `orders@客户域名`；工作室网站用 `hello@yourbrand.com`
- 域名 DNS 加 SPF、DKIM、DMARC
- 测试：下单邮件、重设密码邮件都要进 Gmail 收件箱；用 mail-tester.com 测，目标 ≥ 8/10
- 商业邮箱（收信用）不在套餐里，建议客户用 Google Workspace 或 Zoho Mail

### 4.9 监控

- 在线监控：UptimeRobot 或同类免费服务，每个上线网站一个，提醒发到俊宇的电邮
- SSL：Certbot 自动续期；监控服务开 SSL 到期提醒
- 服务器：DigitalOcean Monitoring 设提醒（磁盘 > 80%、CPU 持续 > 90%）

---

## 5. `agency-core` 插件规格

源文件在 `wp/agency-core/`。

```
agency-core/
├── agency-core.php           主文件（插件标头、载入）
├── includes/
│   ├── class-settings.php    设定页
│   ├── class-whatsapp.php    WhatsApp 按钮
│   ├── class-demo-mode.php   Demo 模式
│   └── class-tracking.php    追踪代码和事件
├── assets/css/  assets/js/
├── languages/
├── readme.txt
└── CHANGELOG.md
```

### 5.1 设定页（Settings → Agency）

| 设定 | 说明 |
|---|---|
| WhatsApp 号码 | 国际格式、不加 + 号，例如 `60123456789` |
| 浮动按钮 | 开 / 关；位置（右下 / 左下） |
| 产品页按钮 | 开 / 关；按钮文字（默认 "WhatsApp 询问" / "Ask on WhatsApp"） |
| 预填信息模板 | 可用变量 `{product}`、`{url}`、`{site}`；默认："你好，我想问 {product}：{url}" |
| Demo 模式 | 开 / 关；横幅文字 |
| 追踪 | GA4 Measurement ID、Meta Pixel ID（留空就不输出） |

### 5.2 WhatsApp

- 链接格式：`https://wa.me/<号码>?text=<URL 编码后的信息>`
- 手机上浮动按钮不能挡住「加入购物车」和「下单」按钮；结账页自动隐藏浮动按钮
- 按钮加 `data-agc-event="whatsapp_click"`，给追踪用

### 5.3 Demo 模式

- 网站顶部显示横幅（默认："Demo site – not a real store · 这是展示用网站，不是真的商店"）
- 结账页可以看、可以填，但「下单」按钮换成提示："这是展示站，不会真的下单。" 服务器端也要挡下（在结账处理时加错误），不能靠前端隐藏
- 隐藏所有付款方式
- 输出 noindex（用 `wp_robots` filter）
- 不发顾客邮件

### 5.4 追踪

- 有填 ID 才输出 GA4 / Meta Pixel 代码
- 事件：WhatsApp 点击（`whatsapp_click`）、表单提交（`generate_lead`）
- 电商事件（加入购物车、购买）之后需要时再用官方插件处理，不要重复做

### 5.5 代码规范

- 函数和类的前缀 `agc_` / `AGC_`；text domain `agency-core`
- 所有输出都要 escape（`esc_html`、`esc_attr`、`esc_url`）；设定用 Settings API，检查 `manage_options` 权限和 nonce
- 不连接外部服务器（追踪代码除外），不收集数据
- 开着 `WP_DEBUG` 时不能有任何 warning / notice
- 版本号：主文件和 `CHANGELOG.md` 同步更新

---

## 6. 子主题规格

- 源文件：`wp/child-theme/`（主题名 `agency-child`，父主题 `kadence`）
- `style.css`（主题标头）、`functions.php`（载入父主题和子主题样式）、`assets/css/custom.css`
- 只放小的 CSS 和模板调整；品牌颜色和字体用 Kadence 设定，不写死
- 尽量不覆盖 WooCommerce 模板。真的要覆盖，在 README 写明是哪个文件（WooCommerce 更新后要检查）

---

## 7. 脚本规格

所有脚本的共同要求：
- bash，`set -euo pipefail`；有 `--help`
- 日志写到服务器 `~/agency-logs/<脚本名>-<日期>.log`
- 破坏性操作要 `--yes` 或互动确认；适合的地方支持 `--dry-run`
- 不在画面或日志显示密码；密码从 secrets 文件读
- 重复执行不会弄坏东西（尽量做到）
- 失败时用清楚的信息说明原因，并返回非 0

服务器脚本的源文件在本地 `scripts/server/`，用 `scp` 传到服务器 `~/agency-scripts/`。本地脚本在 `scripts/local/`。

| # | 脚本 | 在哪里跑 | 做什么 |
|---|---|---|---|
| 7.1 | `provision-server.sh` | 服务器（root，跑一次） | 系统更新、时区、建 `deploy` 用户、swap、防火墙、fail2ban、自动安全更新、装 Nginx / PHP / MariaDB / WP-CLI / Certbot / 工具、套用 2.3 的设定，最后列出版本摘要 |
| 7.2 | `harden-ssh.sh` | 服务器（最后一步） | 关闭 root 登录和密码登录。**只有在俊宇确认新视窗能用 `ssh deploy@IP` 登录且 `sudo` 正常之后才跑**，跑完再测一次 |
| 7.3 | `new-site.sh <代号> <域名> [--basic-auth] [--noindex] [--no-ssl]` | 服务器 | 建 Linux 用户、目录、PHP-FPM pool、数据库、Nginx 设定 → 装 WordPress（管理员名不能是 admin，随机强密码存进 secrets）→ 时区、永久链接、删示范内容和默认插件、关闭文章留言 → 申请 SSL → 列出网址、管理员名、密码存放位置 |
| 7.4 | `clone-site.sh <来源> <目标代号> <目标域名> [--basic-auth] [--noindex]` | 服务器 | 复制文件和数据库 → `wp search-replace` 换网址（https 和 http 都换）→ 重新产生 salts → 清空会"串站"的设定：UpdraftPlus 远端储存、追踪 ID、邮件发件人 → 清缓存 → 跑 smoke test |
| 7.5 | `apply-brand.sh <代号> <brand-config.json>` | 服务器 | 网站名称和标语、上传 logo 和网站图标、Kadence 全局颜色和字体、agency-core 设定（WhatsApp 号码和信息）、WooCommerce 店铺地址和邮件设定、页脚公司资料、社交链接。可以重复执行 |
| 7.6 | `backup-site.sh <代号>` | 服务器（cron 每天） | 先检查磁盘空间 → 导出数据库（gzip）+ 打包文件（不含缓存）→ 放到 `/var/backups/agency/<代号>/<日期时间>/` → 只保留最近 7 份 |
| 7.7 | `restore-site.sh <代号> <备份文件夹>` | 服务器 | 确认 → 维护模式 → 还原数据库和文件 → 清缓存 → smoke test |
| 7.8 | `smoke-test.sh <网址> [--shop] [--expect-noindex]` | 服务器或本地 | 检查：首页 HTTPS 200、http 跳转 https、商店 / 购物车 / 结账页 200（`--shop`）、登录页 200、sitemap 200、首页 < 2 秒（超过只警告）、页面里没有 "critical error" 字样、noindex 是否符合预期。输出 PASS / FAIL 表，有 FAIL 就返回 1。支持 basic auth |
| 7.9 | `update-site.sh <代号> [--exclude 插件1,插件2]` | 服务器 | 先备份 → WordPress 小版本更新 → 插件和主题更新 → 数据库更新（含 `wp wc update`）→ 清缓存 → smoke test → **失败就自动还原刚才的备份**，并报告。记录更新前后的版本。大版本更新先在 staging 测 |
| 7.10 | `optimize-images.sh <输入文件夹> <输出文件夹> [--max 1600] [--quality 80]` | 服务器 | jpg / png 转 WebP、缩小到长边上限、去掉 EXIF，列出压缩前后大小 |
| 7.11 | `delete-site.sh <代号>` | 服务器 | 要输入代号确认 → 先备份（preview 可以 `--no-backup`）→ 删 Nginx 设定、PHP-FPM pool、SSL 证书、数据库和用户、文件、Linux 用户 → 重新载入服务 |
| 7.12 | `make-preview.sh <潜在客户代号> <brand-config.json>` | 服务器 | 从 master 复制出 `preview-<代号>`（basic auth + noindex + Demo 模式）→ 套用品牌 → 记录建立日期到 `~/agency-sites/previews.csv` → 列出网址和密码存放位置 |
| 7.13 | `cleanup-previews.sh` | 服务器 | 列出超过 14 天的 preview → 确认 → 逐个删除 |
| 7.14 | `site-inventory.sh` | 服务器 | 列出所有站点：代号、域名、WordPress 版本、待更新插件数、SSL 到期日、磁盘用量、最后备份时间（给维护和月报用） |
| 7.15 | `deploy-code.sh <代号或 all> [plugin\|theme\|both]` | 本地（Git Bash） | 用 `scp -r` 上传 `wp/agency-core` 和 `wp/child-theme` 到服务器 → 在服务器打包、`wp plugin install --force --activate` / `wp theme install --force` → 跑 smoke test。在服务器打包，避免 Windows 没有 zip 指令的问题 |
| 7.16 | `migrate-site.sh <来源服务器> <来源代号> <目标服务器> <目标代号> <目标域名>` | 本地（Git Bash） | 跨服务器搬站（测试站 → 生产服务器）：在来源服务器跑 `backup-site.sh` → 经由本地或服务器之间 `scp` 传备份 → 目标服务器用 `new-site.sh` 建空站 → 还原 → `wp search-replace` 换网址 → 清缓存 → smoke test。第一个客户上线前写好并在测试站演练一次 |

---

## 8. 品牌参数 `brand-config.json`

模板在 `templates/brand-config.json`。每个站点复制一份放在 `sites/<代号>/brand-config.json`（客户站放 `clients/<客户代号>/brand-config.json`）。

字段说明：
- `site`：网站名称、标语、语言
- `colors`：主色、辅色、强调色、文字、背景（HEX）
- `fonts`：标题字体、内文字体（Google Fonts 名称；中文网站要选有中文字形或能正确 fallback 的字体）
- `assets`：logo、网站图标的文件路径（放在本地，脚本上传）
- `whatsapp`：号码（国际格式、不加 +）、预填信息、按钮文字
- `store`：店铺地址、送货地区、运费、免运门槛
- `business`：公司名称、SSM 号码、电邮、电话（页脚和法律页面用）
- `social`：各社交平台链接
- `mode`：`demo`（样板站）、`preview`（潜在客户样板）、`staging`（客户测试站）或 `live`（正式站）。`demo` 和 `preview` 会开启 Demo 模式；`demo`、`preview`、`staging` 都输出 noindex；只有 `live` 允许搜索引擎收录

---

## 9. 站点说明文件格式（`sites/<代号>/README.md`）

```markdown
# <站点代号>
- 网址：
- 用途：（母版 / 样板 / preview / 客户测试 / 客户正式）
- 建立日期：
- 来源：（从哪个站复制）
- 管理员：（用户名；密码在密码管理器的哪一项）
- 主题和插件：（列表 + 每个插件的原因）
- 特别设定：
- PageSpeed 手机版：首页 __ / 产品页 __（测试日期）
- 备份：（位置；最后一次还原测试日期）
- 待办：
```

---

## 10. 查证记录（任务 0.6，2026-11-06 Claude Code 查）

> 第三方比较文章很多是竞争对手写的。付款网关的费率，**开户前一定要到官方价格页再确认**。

| 项目 | 选择 | 理由 | 来源链接 | 查证日期 |
|---|---|---|---|---|
| Ubuntu LTS 版本 | **24.04 LTS** | 所有脚本已在 24.04（PHP 8.3、Nginx 1.24、MariaDB 10.11）完整测试。26.04 默认 PHP 8.5，插件兼容性还在跟进，等 26.04.1 再升级 | [Ubuntu 26.04 PHP 版本](https://www.fosslinux.com/157253/php-version-ubuntu-featured.htm) | 2026-11-06 |
| PHP 版本 | **8.3**（Ubuntu 24.04 自带） | WooCommerce 11.2.2 要求 ≥ 7.4；8.3 在本次测试没有任何 warning | [WooCommerce on wordpress.org](https://wordpress.org/plugins/woocommerce/) | 2026-11-06 |
| 主题 Kadence | **Kadence 1.6.0** | wordpress.org 显示 2026-11-06 更新，持续维护 | [Kadence](https://wordpress.org/themes/kadence/) | 2026-11-06 |
| 付款网关 | **默认 Billplz**（备选 ToyyibPay） | Billplz 的 WooCommerce 插件 3.28.15 在 2026-10-06 更新、测试到 WP 7.1.4；FPX 每笔固定费用（第三方资料：免费方案约 RM1.10–1.25、Standard 方案 RM999/年约 RM0.75），适合客单价较高的品牌。ToyyibPay 插件 2026-04 更新。SenangPay 插件 2024-11 后没更新，不推荐。**开户用客户自己的 SSM** | [Billplz 官方说明](https://support-billplz-prod.vercel.app/guide/understanding-billplz-pricing)、[比较（HitPay，竞争对手写的）](https://hitpayapp.com/my/blog/billplz-pricing-comparison) | 2026-11-06 |
| 物流插件 | **EasyParcel**（只在客户需要自动下单时装） | `easyparcel-shipping` 1.0.76，2026-11-05 更新 | [EasyParcel plugin](https://wordpress.org/plugins/easyparcel-shipping/) | 2026-11-06 |
| 交易邮件服务 | **Brevo 免费方案**（每天约 300 封） | FluentSMTP 2.4.5（2026-11-04 更新）支持 Brevo API；免费额度对小店够用，超过再升级。注意：免费邮件有 Brevo 标志 | [Brevo pricing 2026](https://dev.to/techsifted/brevo-pricing-2026-every-plan-explained-with-the-hidden-costs-4oe3) | 2026-11-06 |
| 备份存储 | UpdraftPlus 1.26.14 → Google Drive（免费版支持）+ 服务器 `backup-site.sh` | 两层备份；UpdraftPlus 2026-10-26 更新 | [UpdraftPlus](https://wordpress.org/plugins/updraftplus/) | 2026-11-06 |
| 在线监控 | UptimeRobot 免费方案 | 每个上线网站一个 HTTP 监控 + SSL 到期提醒 | 上线时再确认免费额度 | 2026-11-06 |
| Shopee 最新费率 | 计算器默认：佣金 14%、交易费 3.5%（含 SST 3.78%）、平台支持费 RM0.50/单、费用加 8% SST | 交易费来自 Shopee 官方卖家教育中心；佣金按类别不同（第三方资料：2026-08-14 起多数 11–17%），所以计算器让卖家自己改 | [Shopee 官方：Transaction Fee](https://seller.shopee.com.my/edu/article/16038)、[WorldFirst 2026 整理](https://www.worldfirst.com/my/blog/e-commerce-online-sellers/shopee-seller-fees-malaysia/) | 2026-11-06 |

---

## 10A. 实作说明（2026-11-06，跟上面规格不同的地方）

以下是写脚本时做的调整，原因都写在这里。

| 原本规格 | 实际做法 | 原因 |
|---|---|---|
| 脚本用 `scp` 传到 `~/agency-scripts/` | 整个 repo `git clone` 到服务器 `/opt/agency`，脚本直接在那里 `sudo` 执行；更新用 `git pull` | 不用每次手动传文件；服务器上的脚本永远和 git 一致 |
| 页面缓存用 WP Super Cache | **Nginx FastCGI 缓存**（每站独立，2 分钟有效；购物车、结账、登录用户、带参数的网址都不缓存） | 不用插件、不用设定；登录的店主改东西马上看到 |
| 工作室网站表单用 Fluent Forms | agency-core 自带 `[agc_lead_form]` | 少装一个插件；询价存在后台「Leads」+ 寄电邮 + 送出 `generate_lead` 事件 |
| 购物车 / 结账页 | 用 WooCommerce **经典短代码**（不是区块版） | agency-core 的 Demo 模式、马来西亚结账栏位调整都针对经典结账，已测试 |
| SSL 用 certbot nginx 插件 | certbot **webroot** 方式，Nginx 设定由脚本产生 | 设定文件可以随时重新产生（开关 basic auth、noindex 不会弄坏 SSL） |
| 密码存在 `/home/deploy/.secrets/` | `/etc/agency/secrets/<代号>.env`（只有 root 能读） | 脚本都用 sudo 执行；看密码：`sudo cat /etc/agency/secrets/<代号>.env` |
| 产品图用 AI 生成或图库 | 样板站用 **Pexels 免费商用照片**（`scripts/local/fetch-stock-images.py`，每个站的 `stock.json` 列出照片 ID，来源写进 `image-sources.md`）；避开有真实品牌 logo 的照片 | 看起来像真店；Pexels License 可商用、不需署名，但不能暗示照片中的人代言——所以只用在概念作品，客户站用客户自己的照片 |

**新增的脚本：** `setup-store.sh`（把空站变成网店母版）、`build-demo.sh`（建 / 重建样板站）、`setup-studio.sh`（工作室网站）、`install-code.sh`（安装插件和子主题）、`site-config.sh`（SSL、basic auth、noindex 开关）。完整用法见 `docs/08-deploy-guide.md` 和 `scripts/README.md`。

## 11. 可选：WordPress MCP Adapter（Phase 7 再考虑）

WordPress 有官方的 MCP Adapter 插件，可以让 Claude Code 通过 MCP 直接调用网站的功能（来源 2、3）。注意事项：
- 默认只开放标记为公开的功能，要另外设定才能做更多事
- 先在 staging 测试；用权限最小的 WordPress 用户 + Application Password；不用的 Application Password 要撤销
- 日常维护还是以 WP-CLI 脚本为主，MCP 只是辅助

---

## 资料来源（查于 2026-11-06）

1. [Why is SMTP blocked? – DigitalOcean Docs](https://docs.digitalocean.com/support/why-is-smtp-blocked/)
2. [WordPress MCP Adapter – GitHub](https://github.com/WordPress/mcp-adapter)
3. [WordPress MCP Adapter: How To Install It, Connect Claude, And Lock It Down – The Plus Addons](https://theplusaddons.com/blog/wordpress-mcp-adapter/)
4. [Consumer Protection (Electronic Trade Transactions) Regulations 2012 – 摘要（Lowyat）](https://lowyat.net/2013/9987/protecting-consumers-online-all-you-need-to-know-about-the-amended-consumer-protection-regulations-2012)
5. [Malaysia's Personal Data Protection Act 2010 – iubenda](https://www.iubenda.com/en/blog/malaysias-personal-data-protection-act-2010-iubenda/)
