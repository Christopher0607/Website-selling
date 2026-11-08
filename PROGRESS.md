# 进度表

> Claude Code：每完成一个任务，把 `[ ]` 改成 `[x]`，更新「当前状态」，并在「工作日志」加一行。
> 任务的详细步骤和验收标准在 `docs/03-build-phases.md`。
> 标 🧪 的 = 已经在本地（Ubuntu 24.04 测试环境）完成并测试，**部署到 DigitalOcean 后还要在真服务器上验收一次**。

## 当前状态

- 当前阶段：**Phase 4.1 找客户**（网站 https://cartsmith.netlify.app 已上线；俊宇 2026-11-07 说开始找客户）
- 下一个任务：**俊宇：① Netlify → Forms 看有没有收到测试资料（mockup-request，品牌写「TEST - 请忽略」），确认后可以删掉 ② 每天早上打开工作台：「新商家」按「全部加入」→「连续发送」（第一周 WhatsApp 每天 15–20 个） ③ 11 家只有 IG 的商家：打开 IG 主页看简介，有电话 / Email 就按「补上 WhatsApp / Email」 ④ 2026-11-11 跟进已联系的 4 家。Claude Code：2026-11-09 07:45 检查每日任务有没有 push 到 leads 分支、有没有补联系方式**
- 卡住的事：没有（DigitalOcean 服务器、域名、SSM 都等第一个客户说「好」再做；SSM 一定要在收订金前完成）

---

## Phase N Netlify 展示站（2026-11-07 新增）
- [x] N.1 改名 Cartsmith Studio（不用马来文名字），全部文件同步
- [x] N.2 6 个模板（网店样板）：Dewlane 护肤 / Plainfold 服装 / Little Chili Pantry 食品 / Lowlight Roasters 咖啡 / Tailmate 宠物 / Voltnest 3C 配件（`site/templates/`；购物车、规格、东西马运费、优惠码、示范结账都能用；自动测试 6 个全通过）
- [x] N.3 工作室网站（`site/pages/`）：首页、6 个模板、价格、为什么选我们（和同业比较 + 资料来源）、流程、FAQ、免费样板申请表、Shopee 费用计算器、隐私通知
- [x] N.4 AI 客服改用 DeepSeek（`site/netlify/functions/chat/`）+ 名单存进 Netlify Forms；销售助理 `sales/agent/sales_agent.py` 改用 DeepSeek、不用装套件
- [x] N.5 联系方式改成 Instagram（话术、手册、套餐单、报价单、AI 知识库）
- [x] N.6 免费样板产生器：`python site/build.py --preview ...` → Netlify Drop（密码页 + noindex + 14 天删除）
- [ ] N.7 俊宇：开 Netlify 网站 ✅（https://cartsmith.netlify.app，2026-11-07 上线）+ 开表单 + 电邮通知 ⏳（新版后台在左边菜单 Forms）
- [x] N.8 DeepSeek Key 已放进 Netlify，AI 客服线上能回答；修好多轮对话失败的问题、限制只谈工作室的事（线上测过）
- [ ] N.9 Instagram 用 `cartsmith.studio`（俊宇决定，全部链接已改）；简介和快速回复照 C 部分设定
- [ ] N.10 用手机把 6 个模板各走一次（加入购物车 → 结账），有不顺的地方告诉 Claude Code

## Phase 0 准备
- [x] 0.1 填好决定清单（俊宇说"全部你决定"，Claude Code 已填；只缺 WhatsApp 号码）
- [x] 0.2 本地项目结构 + git
- [ ] 0.3 开服务器（俊宇操作）+ SSH 连接测试 → `docs/08-deploy-guide.md` 第 2–3 步
- [ ] 0.4 服务器初始化与安全设置 🧪 脚本已写好测好（`provision-server.sh`、`harden-ssh.sh`）
- [ ] 0.5 域名与 DNS → `docs/08-deploy-guide.md` 第 1、4 步
- [x] 0.6 查证插件与服务（`docs/02-tech-spec.md` §10）

## Phase 1 母版站
- [ ] 1.1 建立 master 站 🧪
- [ ] 1.2 主题 + 子主题 + 品牌套用脚本 🧪
- [ ] 1.3 安装与设定插件 🧪（付款网关插件等客户开户时才装）
- [ ] 1.4 WooCommerce 马来西亚设定 + 示范产品 🧪（西马 RM8 / 东马 RM15 运费、下单、库存都测过）
- [ ] 1.5 agency-core 插件（WhatsApp、Demo 模式、追踪）🧪（Demo 模式经典结账 + Store API 都挡下）
- [ ] 1.6 页面、区块样式、法律页面草稿 🧪
- [ ] 1.7 性能与 SEO —— 要在真服务器用 PageSpeed 测（本地测不到）
- [ ] 1.8 邮件发送 —— 要俊宇注册 Brevo
- [ ] 1.9 备份、更新、监控（含还原测试）🧪（备份、还原、更新失败自动还原都测过；UpdraftPlus Google Drive 和 UptimeRobot 要在真服务器设）
- [ ] 1.10 复制脚本测试 + 母版 v1.0 🧪（复制 38 秒、没有残留）

## Phase 2 样板站（2026-11-07 改由 Phase N 的 6 个 Netlify 模板代替）
- [x] 2.1 虚构品牌方案 —— 旧的 3 个（马来文名字）已移到 `sites/_archive/`；新的 6 个在 `site/templates/`
- [x] 2.2 样板站 —— 改成 Netlify 静态版（`site/`）；服务器版以后需要再做
- [ ] 2.3 作品集截图 + 介绍视频 —— 模板截图已自动产生（`site/assets/shots/`）；介绍视频俊宇录（用手机录 6 个模板）

## Phase 3 工作室网站（2026-11-07 改放 Netlify，见 Phase N）
- [x] 3.1 网站文案 —— 新版在 `site/pages/` + `site/studio.json`（旧的 WordPress 版 `wp/content/studio/` 留着备用）
- [x] 3.2 建站 + 表单 + 联系方式 —— Netlify 版：Netlify Forms + Instagram + AI 客服（等俊宇上线，N.7–N.9）
- [x] 3.3 Shopee 费用计算器（同一个计算程式，3 组手算例子测试通过）
- [x] 3.4 社交账号 —— Instagram `cartsmith.studio` 已改名、换头像、发了 9 张贴文（01、09 要换成新 IG 名字的版本）

## Phase 4 销售准备
- [ ] 4.1 客户名单（前 100 个）⏳ 进行中 —— 俊宇每天在**销售工作台**（https://cartsmith.netlify.app/desk/）加 10 个商家 → AI 打分 + 开场白 → 俊宇手动发送；每周导出 CSV 备份
- [x] 4.1b 销售工作台（`site/desk/` + `site/netlify/functions/desk/`，资料存 Netlify Blobs；本地完整测试通过）
- [ ] 4.1c IG 私信自动回复（Meta Business Suite：即时回复、常见问题、关键字 MOCKUP / PRICE，`docs/10-instagram-auto-replies.md`）—— 俊宇设定
- [x] 4.2 话术定稿（`sales/scripts.md`，中 / 英 / 马来文 + Instagram 快速回复）+ 完整销售手册 `sales/playbook.md`
- [x] 4.2b 销售 AI 助理（`sales/agent/sales_agent.py`，DeepSeek；在自己电脑跑，见 `sales/agent/README.md`）
- [x] 4.3 套餐单、报价单、合同清单（`sales/packages.html`、`proposal-template.md`、`contract-checklist.md`）
- [x] 4.4 免费样板首页流程 —— Netlify 版：`site/build.py --preview`（密码页、noindex、14 天期限都测过）；服务器版 `make-preview.sh` 以后用

## Phase 5 内容（持续进行）
- [x] 5.1 30 天内容日历（`content/calendar.csv`，从 2026-11-16 开始）
- [x] 5.2 30 个视频脚本（`content/scripts/`）
- [ ] 5.3 第一批 7 支视频发布（俊宇）
- [ ] 5.4 每周复盘（持续）

## Phase 6 接单与交付（第一个客户签约后）
- [ ] 6.1 客户建档
- [ ] 6.2 生产服务器（`migrate-site.sh` 已写好，**第一次用前先演练**）
- [ ] 6.3 建站与客户审核
- [ ] 6.4 上线与交接
- [ ] 6.5 月费维护流程运行

## Phase 7 放大（有 2–3 个真实案例后）
- [ ] 7.1 真实案例页
- [ ] 7.2 Meta 点击跳 WhatsApp 广告测试
- [ ] 7.3 Google 搜索广告测试（可选）
- [ ] 7.4 合作伙伴推荐计划
- [ ] 7.5 维护工具升级（可选）

---

## 网站清单

| 站点代号 | 网址 | 用途 | 状态 |
|---|---|---|---|
| studio（Netlify） | https://cartsmith.netlify.app（网址名以俊宇开的为准） | 工作室网站 + AI 客服 + 表单 | ✅ 做好、自动测试通过，等俊宇上线 |
| 6 个模板 | https://cartsmith.netlify.app/demo/<模板>/ | Dewlane、Plainfold、Little Chili Pantry、Lowlight Roasters、Tailmate、Voltnest | ✅ 同上 |
| master | https://master.yourdomain.com | 母版网店（WordPress，密码保护） | 🧪 本地测试通过，等第一个客户再开服务器 |
| （旧）demo-rimbun / teduh / kenanga | — | 马来文名字的旧样板 | 已停用，移到 `sites/_archive/` |

## 建议区（Claude Code 想到但还没做的改进）

- 工作室网站做一个中文版首页（/zh/），给只看中文的卖家（现在是英文为主 + 中文副标题）
- Netlify 免费方案没有真正的密码保护：样板用「随机网址 + 密码页 + noindex」。如果以后很多样板，考虑 Netlify Pro（约 USD 20/月，先问）或服务器版 make-preview.sh
- 6 个模板做 WordPress / WooCommerce 版（子主题 + 各自的 brand-config），第一个客户选了哪个就先做哪个
- 交付彩排（俊宇 2026-11-08 决定：第一个商家对样板有兴趣时马上做）：开 DigitalOcean、上线母版店、接 Billplz 测试模式、下测试订单、录 2 分钟后台影片
- 网站加 Google Analytics / Meta Pixel（要先有隐私通知更新 + cookie 说明）
- Shopee 产品导出表 → WooCommerce CSV 的转换脚本（第一个客户时写，按实际导出格式）
- Ubuntu 26.04 LTS 稳定后（26.04.1），在测试站试 PHP 8.5 再升级
- 工作室网站加 Organization 结构化资料以外，再加 FAQ 结构化资料（Rank Math 可以做）

## 工作日志

| 日期 | 任务 | 结果 | 网址 / 文件 | 未解决的问题 |
|---|---|---|---|---|
| 2026-11-08 | 4.1k 每天 100 家（俊宇：不要一天 20 个，做 100 个；你继续找资料，我继续发） | 研究改成每天两轮（06:40 + 11:20，每轮 50，各一个定时任务，同一个研究会话）；规则写进 `sales/leads/README.md`（A 级七项、B 级 = 只缺做得好的证据、每 10 家 push 一次、临时加一轮的档名）；工作台每天上限最多 100（WhatsApp 建议 30–40 个以内）；17:50 请研究会话马上加一轮（`2026-11-08-extra-1750.json`）；工作台测试 55 项全通过 | `sales/leads/README.md`、`site/netlify/functions/desk/index.mjs`、`site/desk/index.html`、`site/tools/check-desk.js`、`docs/00-decisions.md` #24 | 一天真的找得到 100 家合格的不确定（以前最严格时一天 7 家）；WhatsApp 一天发很多有封号风险 |
| 2026-11-08 | 4.1j AI 客服统一署名 + 表单测试 + 自动补联系方式（俊宇：改成 Cartsmith team；表单检测开了；自动抓 Gmail / WhatsApp、哪里都发） | 工作室 AI 客服和页面里的「Junyu」改成 Cartsmith team / we（隐私政策里写经营者的那一句保留）；线上表单已被 Netlify 接管（HTML 有 form-name），交了一笔「TEST - 请忽略」，回应 200；表单提交不扣点数（Netlify 官方 2026-04-14 更新，2026-11-08 查）。build.py 支持 `sales/leads/<日期>-contacts.json`：只补缺的 WhatsApp / Email、不盖掉原来的、格式不对会报错；每日任务多一步补联系方式；跟进时把对方还没看过的渠道排第一并提示。试跑：现有 11 家只经营 IG 的商家，公开网页都找不到可靠号码（Roost 只有座机，Fluffed 的手机号查不到出处）。不做程式抓 IG / Google Maps、不做自动发、不同时多渠道发同一条。测试：工作台 53 项全通过、补联系方式（补缺 / 不盖掉 / 跳过 / 报错）通过 | `site/assets/js/studio.js`、`site/build.py`、`site/pages/`、`site/desk/`、`site/tools/check-desk.js`、`sales/leads/README.md`、`docs/11-sales-desk.md`、`docs/00-decisions.md` #23 | 要俊宇在 Netlify Forms 确认测试资料有进来；只经营 IG 的商家还是要人工看主页补号码 |
| 2026-11-08 | 4.1i 模板手机版改善（俊宇：电脑上好看，手机上差强人意） | 只改手机版（600px 以下）：顶部三条变窄（约 140px → 115px）；首页商品排、「你可能也喜欢」和步骤卡改成左右滑（两张多一点，看得到下一张）；功能介绍两栏；商店页分类按钮一行左右滑；商品页大图贴满宽度、可以手指滑动换图、圆点表示第几张，商品名和价格在第一屏就看得到；购物车底部固定「总数 + Checkout」（真正的按钮出现时自动收起）；聊天按钮变小，购物车 / 结账页隐藏；页脚两栏；3 个分类方块时最后一个占满一行。首页高度少 11–23%（dewlane 7394px → 5679px）。检查：手机互动 76 项、购物流程 72 项全通过；电脑版（1280）和平板（768）跟改之前逐像素比对，排版相同（不同的只有往下滚才载入的图片） | `site/assets/css/store.css`（最后一段）、`site/assets/js/store.js`、`site/build.py`、`site/templates/tailmate/theme.css`、`docs/09-netlify-guide.md` 第 E 部分 | 要在真的手机（iPhone / Android）上打开看一次 |
| 2026-11-08 | 4.1h 新帐号上线 + 连续发送 + 每天 50 家（俊宇：IG 效果不大，想自动发 WhatsApp / Gmail、一天 50 个） | 新 Netlify 帐号检查：首页 200、新版工作台、FAQ 新文字、/api/desk 401（密码已设）、AI 客服回答正常（用 Cartsmith team、没表情符号）；表单还没被 Netlify 接管（线上 HTML 还有 data-netlify，要俊宇开 Form detection 并重新部署）。自动发 WhatsApp / Gmail 不做（自动群发陌生人）；改做「连续发送」：一家一家打开已经填好的 WhatsApp / Email / IG，按「已发送，下一家」，有 WhatsApp / Email 的排前面；每天上限最多 60，设定页加 WhatsApp 封号提醒；每日研究改成目标 50 家、一定要有 WhatsApp 或 Email、范围放宽（新定时任务，20 家的那个停用）；本地测试 52 项全通过 | `site/desk/`、`site/netlify/functions/desk/index.mjs`、`sales/leads/README.md`、`docs/11-sales-desk.md`、`docs/00-decisions.md` #22 | 实际每天能找到几家有公开 WhatsApp / Email 的 A 级商家还不确定（之前餐厅只有 7 家一天）；WhatsApp 一天发很多陌生人有封号风险 |
| 2026-11-08 | 4.1g Netlify 点数用完 → 换新帐号 + 省点数（俊宇选默认做法、换帐号） | 查证（Netlify 官方）：免费方案每月 300 点、每次正式部署 15 点、用完部署被挡 / 网站暂停；上线后约部署 20 次 → 1f2b652 的改版没部署。改法：每天的新商家 push 到 GitHub `leads` 分支，工作台执行时读取 `leads` 分支的 `sales/leads/inbox.json`（5 分钟快取，失败就用部署时打包的）；`scripts/netlify-ignore.sh` 让 leads 分支和只改文件 / 新商家的 commit 不 build（6 种情况测过）；工作台加「从备份还原（CSV）」给换帐号用；`docs/09` 第 F 部分写好换帐号步骤；每日定时任务改成 push 到 `leads` 分支（新任务，旧的停用）；本地测试全部通过（含还原、远端新商家合并） | `scripts/netlify-ignore.sh`、`netlify.toml`、`site/netlify/functions/desk/index.mjs`、`site/desk/`、`docs/09-netlify-guide.md`、`sales/leads/README.md` | 等俊宇开新帐号；旧的定时任务删不掉（系统不允许），已停用；GitHub repo 是公开的（新商家资料是公开商业资料，没有密码） |
| 2026-11-08 | 4.1f 工作台改版：WhatsApp / Email、只放有 IG 的商家、不署名、不用表情符号（俊宇要求） | 新商家一定要有 IG（build 自动跳过没有 IG 的：Ilham Ceramics、Pik Wah、Leen's）；工作台加 WhatsApp（wa.me 预先填好信息）和 Email（mailto 预先填好主旨和内容）发送按钮，号码自动整理成国际格式，「补上 WhatsApp / Email」可以手动贴；「已发送」记录渠道，数字页分渠道统计；AI 提示词改成用 Cartsmith Studio / 我们署名、不写个人名字、不用表情符号（工作台、网站 AI 客服、话术、知识库都改）；工作台介面重新设计（浅色、线条图示、没有表情符号）；已知电话补进 Good Blue Men、RATA、Artigusto；每日研究规则写进 `sales/leads/README.md`（一定要有 IG、找公开的 WhatsApp / Email，不读 IG 页面）；本地测试全部通过 | `site/desk/`、`site/netlify/functions/desk/`、`sales/scripts.md`、`sales/agent/knowledge.md`、`sales/leads/README.md`、`docs/11-sales-desk.md` | 定时任务本身的指示只能在固定 session 里改（它每天会读 README，所以照新规则做）；大多数 IG 店的电话只在 IG 主页上，要俊宇打开主页时补；WhatsApp 用哪个号码发要俊宇决定 |
| 2026-11-08 | 4.1e 每日找餐厅：测试和修正 | 前两次测试失败：定时任务新开的 session 没有 repo 写入权限（push 403），也没有 add_repo 工具；第一次还只找了 3 家、漏掉 Jan's Gelato 老板另有网店 → 没放进工作台。改成固定 session「每日餐厅研究（定时任务专用）」（session_01QtqzzUGnykcU7RTi4ow58S，带 repo），新定时任务 trig_01Hsdep7eaLpgXd9jzyii6fS 每天 6:39 送进去；旧任务删除；提示词加严（看 60+ 候选、8+ 来源、三项网站检查、价钱门槛）。固定 session 测试成功：看了约 110 家、17 个来源，放 7 家（Roost KL、Good Blue Men、RATA、Fluffed、Pik Wah、Leen's、Naj & Belle），已 push（4c50bee）；抽查域名检查都对；修了 check-domains.sh（Wix 没接上的错误页、空白 WordPress、空目录算 EXPIRED） | `sales/leads/2026-11-08-restaurants.json`、`scripts/local/check-domains.sh` | 手动触发会另开新 session（没有 repo），所以要明早确认定时执行有没有送对；每天 7 家左右，比 20 家少（很多餐厅已经有网站或用 Beepit / Oddle）；Pik Wah 的网站可能已经有人在做 |
| 2026-11-08 | 4.1e 每天自动找餐厅（俊宇要求：每天早上 7 点找 20 家 A 级餐厅、确认没有网站；另外想用 instagram_dm_mcp 自动发 IG） | 新增 `scripts/local/check-domains.sh`（试 .com/.com.my/.my/.co，分 NONE/PARKED/EXPIRED/CHECK/SITE）；用它重查发现 Joymom's 有 joymoms.my、第 3 批 10 家仍然没有网站；设定每天约 6:39（马来西亚时间）的定时任务：新 session 找 20 家 A 级餐厅（英文市场、有购买力、有东西可以在网上卖），写 `sales/leads/<日期>-restaurants.json`，build、push，工作台收件箱自动出现；决定记进 `docs/00-decisions.md` #18、#19。自动发 IG 私信：Claude Code 不做（非官方接口 + 自动发陌生私信），私信继续手动发 | `scripts/local/check-domains.sh`、`sales/leads/README.md`、`docs/00-decisions.md` | 每天 20 家多过每天可以发的 10 家，名单会累积；餐厅是新方向，第一批出来后看适不适合 |
| 2026-11-08 | 4.1d 工作台「新商家收件箱」（俊宇要求把 instagram_dm_mcp 和工作台结合、全部自动化、不要复制粘贴） | 查证：instagram_dm_mcp 用 instagrapi（非官方接口，用 IG 帐号密码登入），README 没有提 Instagram 条款或封号风险；Meta 官方接口不能主动发第一条私信 → 自动发送先不做，等俊宇决定。已做：Claude Code 找的商家写进 `sales/leads/*.json` → build 产生 `inbox.mjs` → 工作台「今天」最上面显示，「全部加入」逐家 AI 打分写开场白、可以「跳过」、已加过的不会重复；卡片显示「Claude Code 找的 · A 级」和「发之前看一眼」；按「复制并打开 IG 私信」后底部出现「发给 ○○ 了吗？✓ 已发送」提示条；第 3 批 10 家已放进收件箱；本地测试 32 项全通过 | `site/netlify/functions/desk/`、`site/desk/`、`site/build.py`、`sales/leads/`、`docs/11-sales-desk.md` | 自动发 IG 要俊宇决定（有封号风险）；定时找商家的频率待确认 |
| 2026-11-08 | 4.1 候选商家第 3 批：英文市场、规模不大、有购买力（俊宇要求；他发现第 2 批有几家已经有网站） | A 级标准加第 5 项「购买力」（实体店 / 公司客户 / 寄卖点 / 单价 RM40+ / 花钱推广，至少一项）；每家都直接试品牌域名（.com/.com.my/.my/.co），排除了约 35 家已经有网站或太大 / 太小的；选出 8 家 A 级（Ginger Batiks、Ministry of Cakes、Best Borneo、Habitatku + Loulou、Ilham Ceramics、Dimpled、Forest Floor、Artigusto）+ 2 家 B 级（Shiramics、Over Time Leathercraft），附英文开场白注意事项、贴进工作台的资料格、排除名单；第 2 批补注：壹家有 yijiapastry.com | `sales/research/2026-11-08-batch-3-english.md`、`sales/research/2026-11-08-batch-2-chinese.md` | Habitatku、Ilham Ceramics 的 IG 要俊宇找；Forest Floor、Shiramics 要确认还在营业；IG 简介里的链接要俊宇亲眼看 |
| 2026-11-08 | 4.1 候选商家第 2 批：华人商家，只要 A 级（俊宇已用工作台发出 4 个开场白：Benang Needle、Sambal Enak、Let's Coopi、Tokey Sambal Hitam，11-11 跟进） | 用公开资料（Shopee 官方年饼 / 月饼推荐、新闻、美食指南、商家名录）查了约 25 家华人商家，严格按 4 项（自有品牌、卖得好的证据、还在营业、搜不到网站）筛出 5 家 A 级：Joymom's 娇妈妈、Yi Jia Pastry House 壹家烘培坊、Silli Chilli、Arcane Leather、Hejia 合家；附切入点（2027 新年 2/6 → 年饼预订 + 公司礼盒询价）、贴进工作台的资料格、排除名单和原因 | `sales/research/2026-11-08-batch-2-chinese.md` | 合家搜不到 IG / FB（找不到就跳过，不用 Shopee 聊天推销）；壹家的 IG 要核实；全部要俊宇点进去确认没有网站 |
| 2026-11-08 | 后台导览（俊宇要看后台） | 俊宇确认：交付彩排（真服务器 + Billplz 测试模式）等第一个有兴趣的商家再做；从本地测试店截了 8 张 WooCommerce 后台（订单、订单详情、产品、编辑产品、运费、付款、我们的设定、手机版），加中英说明、标示示范资料 | `content/backend-tour/`、`scripts/local/make-backend-tour.js` | 真服务器和付款网关测试模式还没做（等有兴趣的商家） |
| 2026-11-08 | 4.1 候选商家第 1 批（俊宇要求 Claude Code 上网找） | 用搜索引擎的公开资料找了 17 个马来西亚本地中小品牌（头巾 5、sambal 7、咖啡 4、护肤 3，按 A/B/C 排优先），每个附链接、看到的信号、建议模板、贴进工作台的资料格（观察要俊宇亲眼核实补上）；没有登录、没有用程式刷 IG / Shopee | `sales/research/2026-11-08-batch-1.md` | 粉丝 / 评价数来自搜索结果，要逐个核实 |
| 2026-11-08 | 4.1b 销售工作台 + IG 自动回复指南（俊宇要求「自动找、自动联络、自动接洽」） | 查证：Instagram 条款不允许自动收集资料；官方私信接口只能回复主动私信的人（24 小时内）→ 不做自动抓 / 自动群发。改做合规版：手机工作台（DeepSeek 打分 + 写开场白 / 跟进 / 回信、今日清单、每日上限、跟进提醒、不再联系、数字、导出 CSV），信息由俊宇手动发送；Meta Business Suite 自动回复（即时回复、5 个常见问题、关键字）的步骤和文字 | https://cartsmith.netlify.app/desk/、`docs/10-instagram-auto-replies.md`、`docs/11-sales-desk.md` | 等俊宇设定 `SALES_DESK_KEY`；IG 官方 AI 私信等有客户 + SSM 后再申请 |
| 2026-11-08 | IG 上线 + 品牌 | 俊宇把 IG 改成 `cartsmith.studio`、头像用 2 号标志、发了 9 张贴文；网站全部改回 `cartsmith.studio`；网站换上 2 号标志（页首、页尾、浏览器小图标、分享图）；表单加后备：发送失败时显示资料 + 「复制并打开 Instagram 私信」；重做 01、09 两张贴文（新 IG 名字） | `content/brand/`、`content/ig-launch/01.jpg`、`09.jpg` | 表单侦测还没开启（线上检查）；01、09 旧图上写的是旧 IG 名字，要换 |
| 2026-11-07 | 4.1 开始找客户 | 删掉两个旧预览链接（俊宇要求）；做了 9 张 IG 开场贴文（九宫格：介绍、6 个模板、价格、免费样板）+ 文案 + 发文顺序；找客户速查表（关键词、判断标准、贴给 Claude Code 的格式、跟进节奏） | `content/ig-launch/`、`sales/find-customers.md`、`scripts/local/make-ig-posts.py` | Netlify 表单还没开启（从外面检查过）；名单 0/100 |
| 2026-11-07 | N.7–N.9 上线后修正 | 网站上线；AI 客服「多轮对话失败」原因：之前的回答以纯文字送回 DeepSeek，它跟着用纯文字回答，JSON 模式就变成空白 → 改成把之前的回答也包成 JSON + 第 3 次改用纯文字备援；加「只谈工作室的事」规则；Instagram 改 `cartsmith.studio`；部署指南按 Netlify 新版后台改（Site → Project、Forms 在左边菜单） | https://cartsmith.netlify.app、`site/netlify/functions/chat/index.mjs`、`docs/09-netlify-guide.md` | 表单要俊宇在左边菜单 Forms 开启后重新部署 |
| 2026-11-07 | Phase N（俊宇要求：改名、换掉头巾、Netlify、6 个模板、比同业、DeepSeek、Instagram、暂不 SSM） | 改名 Cartsmith Studio；6 个模板（Pexels 照片约 90 张、全部虚构品牌，网上查过没有同名）；工作室网站 11 页；DeepSeek AI 客服（Netlify Function）；销售助理改 DeepSeek；话术改 Instagram；免费样板产生器；旧马来文样板移到 `sites/_archive/`。测试：6 个模板购物流程自动测试全通过、聊天和表单端对端（模拟 DeepSeek）通过、样板密码页通过 | 预览链接已删除（俊宇要求，改用真网站）；`site/`、`netlify.toml`、`docs/09-netlify-guide.md`、`sales/agent/` | 要真的 DeepSeek Key 才能测回答品质；隐私通知、条款要请律师看；SSM 收订金前要注册 |
| 2026-11-06 | 0.1 决定清单 | 俊宇确认：一次性建站费 + 月费 + 上线后首月免费试用；只做 Shopee/TikTok 中小型自有品牌卖家；其余由 Claude Code 决定（Cartsmith、yourdomain.com、Ubuntu 24.04） | docs/00-decisions.md、docs/01-business-plan.md | WhatsApp 号码待提供 |
| 2026-11-06 | 0.2 项目结构 | repo 建好，.gitignore、.env.example | — | — |
| 2026-11-06 | 0.6 查证 | Billplz（默认）/ ToyyibPay、EasyParcel、Brevo、UpdraftPlus、Shopee 费率 | docs/02-tech-spec.md §10 | 付款网关费率开户前看官方价格页 |
| 2026-11-06 | 0.4、1.1–1.10 脚本 | 17 个服务器脚本 + agency-core 1.1.0 + 子主题，在本地 Ubuntu 24.04 完整测试 | scripts/、wp/、scripts/README.md（测试记录） | SSL、ufw、fail2ban、跨服务器搬站要在真服务器测 |
| 2026-11-06 | 2.1–2.2 样板站 | 3 个虚构品牌（网上查过没有同名）+ 程式产生的原创产品图 | sites/demo-*/ | 部署后测 PageSpeed |
| 2026-11-06 | 3.1–3.3 工作室网站 | 文案、套餐页、流程、关于、FAQ、费用计算器、询价表单 | wp/content/studio/、sites/studio/ | SSM 资料、WhatsApp 号码待填 |
| 2026-11-06 | 4.2–4.3、5.1–5.2 | 话术、套餐单（中英 A4）、报价单、合同要点、30 天日历、30 个脚本 | sales/、content/ | 合同要请律师看 |
| 2026-11-07 | 成品展示 + 销售手册 + 销售 AI 助理（俊宇要求） | 4 个网站做成静态预览发布成展示页；`sales/playbook.md` 完整销售流程（找客户→成交→首月免费转月费）；`sales/agent/` 销售 AI 助理（Claude Opus 5.5）：网站 AI 客服（agency-core 1.3.0 聊天视窗 + 本机服务）、开场白、每日清单、回信、报价单、周报；用模拟 API 测通全部流程 | https://claude.ai/artifact/UMUpzoNwKbN2d7uBN7aDbH、sales/playbook.md、sales/agent/、scripts/server/setup-sales-agent.sh | 要真的 API Key 才能测回答品质；隐私通知已加 AI 客服说明，要请律师看 |
| 2026-11-07 | 版面重做（俊宇要求） | 样板站和工作室网站改用 Pexels 真实照片（约 40 张，避开有品牌 logo 的）；版面参考热卖网店：公告栏、全宽大图主视觉、信任标志、分类大图、商品卡片 hover 换图 + 整排按钮、图文分栏、深色行动区和页脚、产品页信任标志、手机版底部固定加入购物车、购物车免运进度条；修正黏住的页首在手机上往下偏移 | sites/*/stock.json、sites/*/home.json、wp/child-theme（1.1.0）、wp/agency-core（1.2.0） | 照片只用在概念作品 |
| 2026-11-06 | 部署准备 | build-all.sh 从零建全部站点（本地测试）+ 部署指南 | docs/08-deploy-guide.md | 等俊宇开服务器 |
