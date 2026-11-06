# 03 — 分阶段任务清单

> 给 Claude Code：一次只做一个任务。每个任务开始前按 CLAUDE.md 的格式说明，做完逐项跑「验收标准」，再更新 PROGRESS.md。
> `yourbrand.com` 代表 00-decisions 里决定的工作室域名。

---

# Phase 0 准备（第 1–3 天）

## 0.1 填好决定清单
- **目标：** `docs/00-decisions.md` 的必填项（★）都有答案
- **Claude Code：**
  1. 读 00-decisions，一次问完所有空白项（每项附默认建议）
  2. 工作室名字：按行业提 10 个名字，查 `.com` 是否可注册、Instagram / TikTok / Facebook 账号名是否可用，列表给俊宇选
  3. 提醒俊宇去 SSM ezBiz 查名字、去 MyIPO 查商标（给步骤）
  4. 把答案写进「已决定」一栏；价格如果有改，在 PROGRESS.md 建议区记下要同步更新的文件
- **俊宇：** 回答问题；选名字
- **验收：** ★ 项全部填好；工作室名字和域名确定
- **产出：** 更新后的 `docs/00-decisions.md`

## 0.2 本地项目结构 + git
- **Claude Code：**
  1. `git init`；按 CLAUDE.md 的目录约定建文件夹，每个文件夹放一个简短 README
  2. 建 `.gitignore`：
     ```
     .env
     *.env
     *.sql
     *.sql.gz
     *.zip
     *.tar.gz
     backups/
     clients/*/raw/
     assets/raw/
     node_modules/
     Thumbs.db
     .DS_Store
     ```
  3. 建 `.env.example`（只有变量名，没有值），例如 `DEV_SERVER_IP=`、`PROD_SERVER_IP=`
  4. 第一次 commit
- **验收：**
  - [ ] `git status` 干净
  - [ ] 目录结构跟 CLAUDE.md 一致
  - [ ] 建一个测试用 `.env`，`git check-ignore .env` 确认被忽略
- **产出：** 本地 git repo

## 0.3 开服务器（俊宇操作）+ SSH 测试
- **Claude Code：**
  1. 检查俊宇电脑有没有 SSH 密钥（`~/.ssh/id_ed25519.pub`）；没有就带他用 `ssh-keygen -t ed25519` 建一个
  2. 给 DigitalOcean 控制台的步骤：Create → Droplets → Singapore → Ubuntu 最新 LTS → Basic、2 GB → 选 SSH Key（贴上 `.pub` 内容）→ 勾选 Backups 和 Monitoring → hostname `agency-dev` → Create
  3. 提醒：**新开一台**，不要用跑其他项目（例如机器人）的服务器
  4. 俊宇贴回 IP 后：写进 `.env` 的 `DEV_SERVER_IP`；经俊宇同意，在 `~/.ssh/config` 加 host 别名 `agency-dev`
- **俊宇：** 在 DigitalOcean 开服务器，把 IP 贴回来
- **验收：**
  - [ ] `ssh root@<IP> "echo ok"` 返回 `ok`

## 0.4 服务器初始化与安全设置
- **Claude Code：**
  1. 按 02 §7.1 写 `scripts/server/provision-server.sh`
  2. 执行前先给俊宇看摘要：会装什么、会改什么
  3. `scp` 上传，以 root 执行，检查日志
  4. 请俊宇**开一个新的终端视窗**测试 `ssh deploy@<IP>` 和 `sudo -v`（旧视窗不要关）
  5. 俊宇确认之后，写并执行 `scripts/server/harden-ssh.sh`（02 §7.2）
  6. 再测一次：root 登录被拒、deploy 登录正常
- **验收：**
  - [ ] `ssh deploy@<IP>` 用密钥登录成功，`sudo -v` 正常
  - [ ] root SSH 登录被拒；密码登录已关闭
  - [ ] `sudo ufw status` 只开 22、80、443
  - [ ] `nginx -t` 正常；`php -v`、`wp --info`、`mysql --version`、`certbot --version` 都有输出
  - [ ] fail2ban、unattended-upgrades 在运行
  - [ ] swap 已开启；时区是 Asia/Kuala_Lumpur
- **产出：** `scripts/server/provision-server.sh`、`scripts/server/harden-ssh.sh`、`sites/server-dev.md`（服务器资料，不含密码）

## 0.5 域名与 DNS
- **Claude Code：**
  1. 比较 2–3 家域名商的首年价格和**续费价格**（续费常常比首年贵），给俊宇推荐
  2. 列出要加的 DNS 记录：`@`、`www`、`*` 三条 A 记录，都指向 dev 服务器 IP
  3. 等生效后用 `nslookup` 或 `dig` 检查
- **俊宇：** 买域名、加 DNS 记录（Claude Code 给步骤）
- **验收：**
  - [ ] `yourbrand.com`、`www.yourbrand.com`、`master.yourbrand.com`、`test123.yourbrand.com` 都解析到 dev 服务器 IP

## 0.6 查证插件与服务
- **Claude Code：** 上网查最新资料，填 02 §10「查证记录」：
  1. Ubuntu LTS、PHP 推荐版本（WordPress 和 WooCommerce 官方的服务器要求）
  2. Kadence 是否仍在维护、兼容最新 WooCommerce（看 wordpress.org 插件 / 主题页面的更新日期）
  3. 付款网关：比较候选的手续费、支持的付款方式（FPX、电子钱包、卡）、WooCommerce 插件是否在维护、开户要求（要不要 SSM、审核多久）
  4. 物流插件（EasyParcel 等）是否有维护中的 WooCommerce 插件
  5. 交易邮件服务：免费额度、FluentSMTP 是否支持它的 API
  6. UpdraftPlus 免费版是否支持 Google Drive
  7. 免费的在线监控服务
  8. Shopee 马来西亚最新卖家费率（以官方 Seller Education Hub 为主）
  9. 每一项给出推荐和理由
- **俊宇：** 确认推荐
- **验收：**
  - [ ] 查证记录每一行都有选择、理由、来源链接、日期
  - [ ] 俊宇已确认
- **产出：** 更新后的 `docs/02-tech-spec.md` §10

---

# Phase 1 母版站（第 3–7 天）

## 1.1 建立 master 站
- **Claude Code：**
  1. 按 02 §7.3 写 `new-site.sh`
  2. 执行 `new-site.sh master master.yourbrand.com --basic-auth --noindex`
  3. basic auth 密码和 WordPress 管理员密码：请俊宇存进密码管理器
  4. 网站语言用英文；俊宇的管理员账号后台语言可以设成简体中文
- **验收：**
  - [ ] `https://master.yourbrand.com` 要输入密码才能看；SSL 有效
  - [ ] 能登录 wp-admin；管理员名不是 `admin`
  - [ ] 时区、永久链接正确；示范文章、示范页面、默认插件已删除
  - [ ] `smoke-test.sh https://master.yourbrand.com --expect-noindex` PASS（smoke-test 在 1.9 正式完成，这里可以先写简单版）
- **产出：** `scripts/server/new-site.sh`、`sites/master/README.md`

## 1.2 主题 + 子主题 + 品牌套用
- **Claude Code：**
  1. 安装 Kadence
  2. 按 02 §6 写 `wp/child-theme/`；写 `scripts/local/deploy-code.sh`（02 §7.15）；部署并启用
  3. 查清楚 Kadence 把全局颜色和字体存在哪里，按 02 §7.5 写 `apply-brand.sh`
  4. 复制 `templates/brand-config.json` 到 `sites/master/brand-config.json`，填中性的示范值，执行
- **验收：**
  - [ ] 子主题已启用，网站正常
  - [ ] 修改 brand-config 的主色后重跑 `apply-brand.sh`，网站颜色跟着改变
  - [ ] 开着 `WP_DEBUG` 时没有错误
- **产出：** `wp/child-theme/`、`scripts/local/deploy-code.sh`、`scripts/server/apply-brand.sh`

## 1.3 安装与设定插件
- **Claude Code：** 按 0.6 的查证结果和 02 §4.2 安装设定。付款网关插件只安装，不填真实 Key
- **验收：**
  - [ ] 所有插件已启用，后台没有错误提示
  - [ ] `sites/master/README.md` 的插件表完整，每个插件都写了原因

## 1.4 WooCommerce 马来西亚设定 + 示范产品
- **Claude Code：**
  1. 按 02 §4.3 设定
  2. 建 3 个分类、10 款虚构示范产品（其中 2 款有变体，例如尺寸或颜色）
  3. 产品图用 AI 生成或可商用图库，先跑 `optimize-images.sh`（02 §7.10），来源记录在 `sites/master/image-sources.md`
- **验收：**
  - [ ] 价格显示 RM；用西马地址和东马地址各试一次，运费正确
  - [ ] 开一个测试付款方式（例如银行转账），完整下单一次：浏览 → 加入购物车 → 结账 → 后台看到订单 → 库存减少（邮件在 1.8 再测）
  - [ ] 测完删除测试订单
- **产出：** `scripts/server/optimize-images.sh`、`sites/master/image-sources.md`

## 1.5 agency-core 插件
- **Claude Code：** 按 02 §5 写 `wp/agency-core/`，部署，测试
- **验收：**
  - [ ] 设定页可以储存，重新整理后值还在
  - [ ] 手机宽度（360 px）浮动按钮不挡「加入购物车」；结账页没有浮动按钮
  - [ ] 产品页按钮能打开 WhatsApp，预填信息有正确的产品名称和网址，中文不乱码
  - [ ] Demo 模式：有横幅、付款方式隐藏、按「下单」只出现提示；用 curl 直接送结账请求也被挡下；页面原始码有 noindex
  - [ ] 追踪 ID 留空时，页面原始码没有 GA4 / Pixel 代码
  - [ ] 开着 `WP_DEBUG` 时没有 warning / notice
  - [ ] 测完把 master 设成 Demo 模式开启
- **产出：** `wp/agency-core/`（含 CHANGELOG.md）

## 1.6 页面、区块样式、法律页面草稿
- **Claude Code：**
  1. 按 02 §4.4 建所有页面和首页结构
  2. 做可重复使用的区块样式（block patterns）
  3. 法律页面草稿：隐私通知（**马来文 + 英文**）、条款与条件、运送与退换。客户资料用 `[方括号]` 占位，页首注明"草稿——上线前请律师确认"
- **验收：**
  - [ ] 所有页面都存在，菜单和页脚链接正确，没有死链
  - [ ] 手机（360 px）和桌面（1440 px）版面正常
  - [ ] 页脚有 02 §4.5 A 的所有资料位置
  - [ ] 隐私通知有马来文和英文两个版本，涵盖 02 §4.5 B 的项目

## 1.7 性能与 SEO
- **Claude Code：**
  1. 页面缓存（排除 WooCommerce 页面和 cookie）；Redis（可选）
  2. 确认图片都是 WebP
  3. Rank Math 基本设定（sitemap、标题格式）
  4. PageSpeed Insights 需要能公开访问：测试前暂时关闭 basic auth（noindex 保留），测完马上恢复
- **验收：**
  - [ ] 首页和一个产品页手机版性能分 ≥ 80；LCP < 2.5 秒；分数记录在 README
  - [ ] 加东西进购物车后换页，购物车内容正确（缓存没有出错）
  - [ ] basic auth 已经恢复

## 1.8 邮件发送
- **俊宇：** 注册 0.6 选好的交易邮件服务（Claude Code 给步骤），API Key 存进密码管理器
- **Claude Code：**
  1. 设定 FluentSMTP（API 方式，02 §4.8）
  2. 列出 SPF、DKIM、DMARC 的 DNS 记录给俊宇加
  3. 关闭 Demo 模式做一次测试订单，测完重新开启并删除测试订单
- **验收：**
  - [ ] 测试订单邮件和重设密码邮件都进 Gmail 收件箱（不是垃圾邮件）
  - [ ] mail-tester.com 分数 ≥ 8/10
  - [ ] FluentSMTP 的邮件记录显示发送成功

## 1.9 备份、更新、监控
- **Claude Code：**
  1. 设定 UpdraftPlus → Google Drive（俊宇在浏览器授权）
  2. 按 02 §7 写 `backup-site.sh`、`restore-site.sh`、`smoke-test.sh`（正式版）、`update-site.sh`、`site-inventory.sh`；设定 cron
  3. 带俊宇注册在线监控服务，先加一个服务器 443 端口或 ping 监控来测试提醒（master 有密码保护，不适合做网址监控）；之后样板站、工作室网站、客户站上线时，各加一个网址监控
- **验收：**
  - [ ] UpdraftPlus 第一次备份成功，Google Drive 看得到文件
  - [ ] `backup-site.sh` 产生备份；cron 已设定
  - [ ] **还原测试：** 把 master 的备份还原到临时站 `restore-test`，能打开、能登录，然后删除 `restore-test`
  - [ ] `update-site.sh` 跑一次，smoke test PASS
  - [ ] 在一个临时测试站故意让 smoke test 失败，确认 `update-site.sh` 会自动还原
  - [ ] 监控服务的测试提醒收得到
- **产出：** 5 个脚本 + crontab 说明写在 `sites/server-dev.md`

## 1.10 复制脚本测试 + 母版 v1.0
- **Claude Code：**
  1. 按 02 §7 写 `clone-site.sh`、`delete-site.sh`、`make-preview.sh`、`cleanup-previews.sh`
  2. 测试：clone master → `demo-test` → apply-brand（换一套颜色和 logo）→ 检查 → `delete-site.sh demo-test`
- **验收：**
  - [ ] 从开始复制到套用品牌完成 ≤ 30 分钟
  - [ ] 复制出来的站：数据库里搜不到 `master.yourbrand.com`；能登录；产品和页面都在；UpdraftPlus 没有连到母版的 Google Drive；追踪 ID 已清空
  - [ ] `delete-site.sh` 删得干净（Nginx 设定、PHP-FPM pool、数据库、文件、证书都没有残留）
  - [ ] git tag `master-v1.0`；`sites/master/README.md` 写清楚母版里有什么、怎么复制
- **Phase 1 完成后：** 建议俊宇 `/clear`

---

# Phase 2 样板站（第 8–12 天）

## 2.1 三个虚构品牌方案
- **Claude Code：** 按主攻行业设计 3 个品牌，风格：A 简约高级、B 活泼年轻、C 温暖自然。每个品牌一页简介（存在 `sites/demo-<名字>/brief.md`）：
  - 名字（先上网搜，确认没有同名品牌，查证结果写进简介）
  - 目标顾客、说话语气
  - 颜色、字体、logo 方向
  - 8–12 款产品：名称、简短描述、价格、规格
- **俊宇：** 确认或修改
- **验收：** 俊宇确认 3 个方案

## 2.2 建好 3 个样板站
- **Claude Code：**
  1. clone master × 3 → `demo-<名字>.yourbrand.com`（公开、noindex、Demo 模式开启）
  2. apply-brand；logo 用简单文字 logo 或 AI 生成
  3. 产品图用 AI 生成或可商用图库，跑 `optimize-images.sh`，来源记录在 `image-sources.md`
  4. 用 CSV 导入产品
  5. 首页按风格调整——3 个站首页不能看起来一样
  6. 页脚标注「概念作品 Concept Project」
- **验收（每个站）：**
  - [ ] `06-delivery-sop.md` 的上线检查清单通过（付款和正式上线相关项目除外）
  - [ ] Demo 横幅显示；页面原始码有 noindex；下单被挡下
  - [ ] PageSpeed 手机版 ≥ 80
  - [ ] `image-sources.md` 每张图都有来源
  - [ ] 三个站的风格明显不同

## 2.3 作品集截图 + 介绍视频
- **Claude Code：**
  1. 试着用 Playwright 自动截图（先问俊宇能不能装）：桌面 1440 px、手机 390 px，每站的首页、商店、产品页、购物车、结账页。不行的话给俊宇截图清单
  2. 写每个站 60–90 秒介绍视频的手机录屏脚本（05 §7）
- **俊宇：** 用手机录 3 段介绍视频
- **验收：**
  - [ ] `assets/portfolio/<代号>/` 每站至少 8 张截图
  - [ ] 3 段介绍视频
- **Phase 2 完成后：** 建议俊宇 `/clear`

---

# Phase 3 工作室网站（第 10–14 天）

## 3.1 网站文案
- **Claude Code：** 按 01-business-plan 写中文 + 英文文案：
  - 首页：定位、客户痛点、我们的做法、套餐摘要、作品、流程、FAQ、行动呼吁
  - 套餐与价格页、作品页（3 个概念作品，清楚标注）、流程页（5 步）、关于页（一人工作室、刚起步可以直说）、联系页、FAQ（10 条）
  - 诚信：不写假数据、假评价；没有真实客户时不放评价区
- **俊宇：** 确认文案
- **验收：** 俊宇确认

## 3.2 建站 + 表单 + WhatsApp + 追踪
- **Claude Code：**
  1. `new-site.sh studio yourbrand.com`（干净的 WordPress，不装 WooCommerce）；装 Kadence + 子主题 + agency-core + Fluent Forms + Rank Math + FluentSMTP + 备份 + 登录安全插件
  2. www 跳转到主域名
  3. 联系表单栏位：名字、品牌 / 店铺名、店铺链接（Shopee / IG）、WhatsApp 号码、预算范围（下拉选单）、想解决的问题；提交后发通知到俊宇的电邮
  4. WhatsApp 按钮预填："你好，我想了解建站套餐"
  5. GA4 + Meta Pixel（agency-core 设定）；Search Console 用 DNS TXT 验证，提交 sitemap
  6. Organization / LocalBusiness 结构化资料
  7. 隐私通知（马来文 + 英文），写明用了哪些追踪工具
- **验收：**
  - [ ] HTTPS 正常，www 跳转到主域名
  - [ ] 表单测试：俊宇收到通知邮件（在收件箱）
  - [ ] GA4 即时报告看得到 `whatsapp_click` 和 `generate_lead`
  - [ ] PageSpeed 手机版 ≥ 85
  - [ ] Search Console 验证成功，sitemap 已提交
  - [ ] `smoke-test.sh https://yourbrand.com` PASS，而且**没有** noindex

## 3.3 Shopee 费用计算器
- **Claude Code：** 在工作室网站做一个计算器页面（纯前端 JavaScript，不储存、不上传任何输入）：
  - **输入：** 售价、卖家折扣 / 优惠券、商品成本、佣金 %、交易费 %、其他平台费 %（例如技术支持费）、费用的 SST %（默认 8%）、卖家负担的运费
  - **输出：** 平台总扣费、实际收到的钱、利润、利润率；"同一张单在自己的网站成交，可以多留多少"（网站付款网关手续费也要算，用可以修改的 %）
  - 默认费率用 0.6 查证的 Shopee 官方最新资料；页面显示「费率最后更新：日期 + 来源链接」和免责声明「以 Shopee 官方最新公布为准」
  - 行动呼吁：WhatsApp「帮我算我的店」
- **验收：**
  - [ ] 用 3 组手算的例子核对，结果一致
  - [ ] 手机上好用
  - [ ] 浏览器开发者工具里看不到任何输入资料被送出

## 3.4 社交账号 + Google 商家资料
- **俊宇：** 开 Facebook 专页、Instagram、TikTok、YouTube、小红书；Google Business Profile（在家工作的服务型商家可以隐藏地址）；WhatsApp Business 填好商业资料
- **Claude Code：** 写好各平台的名称、简介（中 / 英 / 马来文）；WhatsApp 自动问候、离开信息、快速回复；Google 商家简介和服务清单
- **验收：**
  - [ ] 所有账号已建立，都链接到工作室网站
  - [ ] 网站页脚有社交链接
- **Phase 3 完成后：** 建议俊宇 `/clear`

---

# Phase 4 销售准备（第 12–15 天）

## 4.1 客户名单（前 100 个）
- **Claude Code：**
  1. 复制 `templates/prospects.csv` 到 `sales/prospects.csv`
  2. 按 04-sales-kit §2 教俊宇怎么找
  3. 帮俊宇整理名单、按 04 §2.3 打分（1–5）、根据俊宇记下的观察写每个人的个人化开场句
- **俊宇：** 每天收集 20 个潜在客户
- **规则：** 只记录公开的商业联系方式；**不要用程式自动抓取 Shopee、Instagram 等平台**（违反平台规则，也容易被封号）
- **验收：** `sales/prospects.csv` 有 100 个潜在客户，每个都有分数和个人化开场句

## 4.2 话术定稿
- **Claude Code：** 按主攻行业和俊宇的说话方式，修改 04-sales-kit 的模板（中 / 英 / 马来文），存成 `sales/scripts.md`；给俊宇把常用话术设成 WhatsApp Business 快速回复的步骤
- **验收：** 俊宇确认

## 4.3 套餐单、报价单、合同清单
- **Claude Code：**
  1. 做一页可以列印的套餐单 `sales/packages.html`（中文版、英文版），用浏览器「列印 → 另存为 PDF」
  2. 把 `templates/proposal.md` 复制到 `sales/proposal-template.md`，按俊宇的决定填好固定内容
  3. 整理 04 §8 的合同要点，给俊宇拿去请律师看
- **验收：**
  - [ ] 套餐单 PDF（中、英）
  - [ ] 报价单模板
  - [ ] 合同要点清单

## 4.4 免费样板首页流程（preview）
- **Claude Code：** 用一个虚构的潜在客户走一次流程：`make-preview.sh` → 换 logo、颜色、3–5 款产品 → 写 60 秒介绍视频的录屏重点 → 测试 `cleanup-previews.sh`
- **规则：** preview 用的是潜在客户自己公开的资料，只给他本人看（密码保护 + noindex），没成交就在 14 天内删除
- **验收：**
  - [ ] 一个 preview 从开始到可以发出 ≤ 45 分钟
  - [ ] `cleanup-previews.sh` 正常
- **Phase 4 完成后：** 建议俊宇 `/clear`

---

# Phase 5 内容（从第 8 天开始，持续进行）

## 5.1 30 天内容日历
- **Claude Code：** 复制 `templates/content-calendar.csv` 到 `content/calendar.csv`，排好 30 天，每天 1 支，按 05 §4 的内容支柱比例分配
- **验收：** 30 天都有选题、平台、预定日期

## 5.2 30 个视频脚本
- **Claude Code：** 按 05 §6 的模板写 30 个脚本，存成 `content/scripts/01-xxx.md` …；前 10 个另外写英文版
- **验收：** 30 个脚本都有钩子、内容、行动呼吁、画面清单、文案、hashtag

## 5.3 第一批 7 支视频
- **俊宇：** 按 05 §7 录制、剪辑、发布
- **Claude Code：** 每支的标题、发布文案、hashtag、置顶留言
- **验收：** 7 支已发布，链接写进 calendar.csv

## 5.4 每周复盘（持续）
- **俊宇：** 每周把数据填进 calendar.csv（播放、完播率、留言、私信）
- **Claude Code：** 每周日出复盘：表现最好和最差的 3 支、可能的原因、下周的调整
- **验收：** 每周发布 5–7 支；数据有记录；每周有复盘

---

# Phase 6 接单与交付（第一个客户签约后）

## 6.1 客户建档
- 建 `clients/<客户代号>/`（代号 `c001`、`c002`…）：`brief.md`（从 `templates/client-brief.md` 复制）、`proposal.md`、合同、`brand-config.json`、`checklist.md`；素材放 `raw/`（不进 git）

## 6.2 生产服务器
- 第一个客户时开 `agency-prod`（重复 0.3、0.4），部署所有服务器脚本、设定备份和监控
- 写好 `migrate-site.sh`（02 §7.16），用一个临时测试站从 dev 搬到 prod 演练一次，确认能用后删除
- 之后客户正式站都放这里（或按合同放客户自己的主机）

## 6.3 建站与客户审核
- 按 `06-delivery-sop.md` 阶段 1–5

## 6.4 上线与交接
- 按 `06-delivery-sop.md` 阶段 6–8

## 6.5 月费维护
- 按 `06-delivery-sop.md` 阶段 9–10；月报用 `templates/monthly-report.md`

- **验收：** 每个客户的检查清单全部打勾，记录在 `clients/<代号>/checklist.md`

---

# Phase 7 放大（有 2–3 个真实案例后）

## 7.1 真实案例页
- 客户同意后写案例：问题 → 做法 → 结果，只用真实数字；评价用客户本人同意的原话

## 7.2 Meta 点击跳 WhatsApp 广告测试
- 按 05 §9.1

## 7.3 Google 搜索广告测试（可选）
- 按 05 §9.2

## 7.4 合作伙伴推荐计划
- 列 20 个潜在伙伴（摄影师、会计师、电商讲师、物流代理），按 04 §10 联系

## 7.5 维护工具升级（可选）
- WordPress MCP Adapter（02 §11）、更多自动化

- **验收：** 每个任务都有记录和数字，写进 PROGRESS.md
