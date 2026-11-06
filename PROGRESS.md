# 进度表

> Claude Code：每完成一个任务，把 `[ ]` 改成 `[x]`，更新「当前状态」，并在「工作日志」加一行。
> 任务的详细步骤和验收标准在 `docs/03-build-phases.md`。
> 标 🧪 的 = 已经在本地（Ubuntu 24.04 测试环境）完成并测试，**部署到 DigitalOcean 后还要在真服务器上验收一次**。

## 当前状态

- 当前阶段：等俊宇开 DigitalOcean 服务器（Phase 0.3）
- 下一个任务：**俊宇照 `docs/08-deploy-guide.md` 第 0–8 步部署**（买域名、开服务器、跑 provision-server.sh、harden-ssh.sh、build-all.sh）
- 卡住的事：需要俊宇提供 WhatsApp Business 号码、SSM 资料（写进 `sites/studio/brand-config.json`）

---

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

## Phase 2 样板站
- [x] 2.1 三个虚构品牌方案（Claude Code 决定：Rimbun Skin / Teduh Studio / Dapur Seri Kenanga，见 `sites/demo-*/brief.md`）
- [ ] 2.2 建好 3 个样板站 🧪（`build-demo.sh`；部署后测 PageSpeed）
- [ ] 2.3 作品集截图 + 介绍视频 —— 部署后跑 `scripts/local/screenshot.js`；视频俊宇录

## Phase 3 工作室网站
- [x] 3.1 网站文案（中英，`wp/content/studio/`；俊宇可以再改）
- [ ] 3.2 建站 + 表单 + WhatsApp + 追踪 🧪（`setup-studio.sh`；表单用 agency-core 自带的 `[agc_lead_form]`）
- [x] 3.3 Shopee 费用计算器（`[agc_fee_calculator]`，3 组手算例子测试通过）
- [ ] 3.4 社交账号 + Google 商家资料（俊宇开账号；简介文案待写）

## Phase 4 销售准备
- [ ] 4.1 客户名单（前 100 个）—— 俊宇每天找 20 个，`sales/prospects.csv`
- [x] 4.2 话术定稿（`sales/scripts.md`，中 / 英 / 马来文 + WhatsApp 快速回复）
- [x] 4.3 套餐单、报价单、合同清单（`sales/packages.html`、`proposal-template.md`、`contract-checklist.md`）
- [ ] 4.4 免费样板首页流程（preview）🧪（`make-preview.sh` 50 秒、`cleanup-previews.sh` 测过）

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
| master | https://master.kedailab.com | 母版网店（密码保护） | 🧪 本地测试通过，待部署 |
| demo-rimbun | https://demo-rimbun.kedailab.com | 样板：护肤，简约高级 | 🧪 待部署 |
| demo-teduh | https://demo-teduh.kedailab.com | 样板：头巾，活泼年轻 | 🧪 待部署 |
| demo-kenanga | https://demo-kenanga.kedailab.com | 样板：食品，温暖自然 | 🧪 待部署 |
| studio | https://kedailab.com | 工作室网站 | 🧪 待部署 |

## 建议区（Claude Code 想到但还没做的改进）

- 工作室网站做一个中文版首页（/zh/），给只看中文的卖家（现在是中英混排）
- 样板站产品图现在是程式画的插图；有预算时可以换成真实拍摄或 AI 生成的照片，看起来更像真店
- Shopee 产品导出表 → WooCommerce CSV 的转换脚本（第一个客户时写，按实际导出格式）
- Ubuntu 26.04 LTS 稳定后（26.04.1），在测试站试 PHP 8.5 再升级
- 工作室网站加 Organization 结构化资料以外，再加 FAQ 结构化资料（Rank Math 可以做）

## 工作日志

| 日期 | 任务 | 结果 | 网址 / 文件 | 未解决的问题 |
|---|---|---|---|---|
| 2026-11-06 | 0.1 决定清单 | 俊宇确认：一次性建站费 + 月费 + 上线后首月免费试用；只做 Shopee/TikTok 中小型自有品牌卖家；其余由 Claude Code 决定（KedaiLab、kedailab.com、Ubuntu 24.04） | docs/00-decisions.md、docs/01-business-plan.md | WhatsApp 号码待提供 |
| 2026-11-06 | 0.2 项目结构 | repo 建好，.gitignore、.env.example | — | — |
| 2026-11-06 | 0.6 查证 | Billplz（默认）/ ToyyibPay、EasyParcel、Brevo、UpdraftPlus、Shopee 费率 | docs/02-tech-spec.md §10 | 付款网关费率开户前看官方价格页 |
| 2026-11-06 | 0.4、1.1–1.10 脚本 | 17 个服务器脚本 + agency-core 1.1.0 + 子主题，在本地 Ubuntu 24.04 完整测试 | scripts/、wp/、scripts/README.md（测试记录） | SSL、ufw、fail2ban、跨服务器搬站要在真服务器测 |
| 2026-11-06 | 2.1–2.2 样板站 | 3 个虚构品牌（网上查过没有同名）+ 程式产生的原创产品图 | sites/demo-*/ | 部署后测 PageSpeed |
| 2026-11-06 | 3.1–3.3 工作室网站 | 文案、套餐页、流程、关于、FAQ、费用计算器、询价表单 | wp/content/studio/、sites/studio/ | SSM 资料、WhatsApp 号码待填 |
| 2026-11-06 | 4.2–4.3、5.1–5.2 | 话术、套餐单（中英 A4）、报价单、合同要点、30 天日历、30 个脚本 | sales/、content/ | 合同要请律师看 |
| 2026-11-06 | 部署准备 | build-all.sh 从零建全部站点（本地测试）+ 部署指南 | docs/08-deploy-guide.md | 等俊宇开服务器 |
