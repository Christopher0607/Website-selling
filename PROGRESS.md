# 进度表

> Claude Code：每完成一个任务，把 `[ ]` 改成 `[x]`，更新「当前状态」，并在「工作日志」加一行。
> 任务的详细步骤和验收标准在 `docs/03-build-phases.md`。
> 标 🧪 的 = 已经在本地（Ubuntu 24.04 测试环境）完成并测试，**部署到 DigitalOcean 后还要在真服务器上验收一次**。

## 当前状态

- 当前阶段：**Phase 4.1 找客户**（网站 https://cartsmith.netlify.app 已上线；俊宇 2026-11-07 说开始找客户）
- 下一个任务：**俊宇：① 发 9 张 IG 开场贴文 + 改简介（`content/ig-launch/README.md`）② 开启 Netlify 表单（`docs/09-netlify-guide.md` A 部分第 9–12 步）③ 每天找 10–20 个店，照 `sales/find-customers.md` 的格式贴给 Claude Code** → Claude Code 打分、写开场白、记进 `sales/prospects.csv`
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
- [ ] N.9 Instagram 用 `xiao.ming0607`（俊宇决定，全部链接已改）；简介和快速回复照 C 部分设定
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
- [ ] 3.4 社交账号 —— Instagram `xiao.ming0607`；简介 + 9 张开场贴文和文案已做好（`content/ig-launch/`），等俊宇发

## Phase 4 销售准备
- [ ] 4.1 客户名单（前 100 个）⏳ 进行中 —— 俊宇每天找 10–20 个（只找有 Instagram 的），贴给 Claude Code（格式见 `sales/find-customers.md`）→ 打分 + 开场白 → `sales/prospects.csv`
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
- 网站加 Google Analytics / Meta Pixel（要先有隐私通知更新 + cookie 说明）
- Shopee 产品导出表 → WooCommerce CSV 的转换脚本（第一个客户时写，按实际导出格式）
- Ubuntu 26.04 LTS 稳定后（26.04.1），在测试站试 PHP 8.5 再升级
- 工作室网站加 Organization 结构化资料以外，再加 FAQ 结构化资料（Rank Math 可以做）

## 工作日志

| 日期 | 任务 | 结果 | 网址 / 文件 | 未解决的问题 |
|---|---|---|---|---|
| 2026-11-07 | 4.1 开始找客户 | 删掉两个旧预览链接（俊宇要求）；做了 9 张 IG 开场贴文（九宫格：介绍、6 个模板、价格、免费样板）+ 文案 + 发文顺序；找客户速查表（关键词、判断标准、贴给 Claude Code 的格式、跟进节奏） | `content/ig-launch/`、`sales/find-customers.md`、`scripts/local/make-ig-posts.py` | Netlify 表单还没开启（从外面检查过）；名单 0/100 |
| 2026-11-07 | N.7–N.9 上线后修正 | 网站上线；AI 客服「多轮对话失败」原因：之前的回答以纯文字送回 DeepSeek，它跟着用纯文字回答，JSON 模式就变成空白 → 改成把之前的回答也包成 JSON + 第 3 次改用纯文字备援；加「只谈工作室的事」规则；Instagram 改 `xiao.ming0607`；部署指南按 Netlify 新版后台改（Site → Project、Forms 在左边菜单） | https://cartsmith.netlify.app、`site/netlify/functions/chat/index.mjs`、`docs/09-netlify-guide.md` | 表单要俊宇在左边菜单 Forms 开启后重新部署 |
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
