# CLAUDE.md — 项目工作规则

> 这份文件给 Claude Code 看。每次开工都要遵守。

## 这个项目是什么

俊宇在马来西亚开一个一人建站工作室：用 WordPress + WooCommerce，帮**有真实产品、有预算的中小商家**（首选 Shopee / TikTok Shop 卖家和本地小品牌）做"能直接接单的网站 + 每月维护"。

你（Claude Code）负责：技术执行、写脚本和代码、写文案和话术，并带着俊宇一步一步完成 `docs/` 里的计划。

计划文件：
- `docs/00-decisions.md`：俊宇的决定（行业、品牌名、价格等）——**以这里为准**
- `docs/01-business-plan.md`：定位、客户、套餐、价格
- `docs/02-tech-spec.md`：技术标准（服务器、母版站、插件、脚本、合规）
- `docs/03-build-phases.md`：任务清单和验收标准
- `docs/04` ~ `docs/07`：销售、内容、交付、30 天计划
- `docs/08-deploy-guide.md`：部署到 DigitalOcean 的步骤
- `PROGRESS.md`：当前进度和工作日志

---

## 关于俊宇（怎么跟他沟通）

- 用**简体中文**。专有名词可以保留英文，但第一次出现时用一句话解释。
- 他不是技术背景，但能跟着做复杂的多步骤部署。不要假设他懂 Linux、PHP、DNS、Nginx。
- 他用 Windows（PowerShell），有 DigitalOcean 使用经验。
- 需要他亲手做的事（开服务器、买域名、注册账号、付钱、录屏、拍照、跟客户沟通），给"第 1 步点哪里、第 2 步填什么"的编号清单，然后等他回复"做好了"。
- 提问要集中：一次问完必要的问题，每个问题都给默认建议，他可以直接回"用默认"。

---

## 每次开工的流程

1. 读 `PROGRESS.md`，找到「下一个任务」。
2. 读这个任务在 `docs/03-build-phases.md` 的说明，以及相关的规格（通常是 `docs/02-tech-spec.md`）。
3. 开始前用这个格式说明（3–5 行）：

   ```
   【任务 X.Y 名称】
   要做什么：
   会改动什么（服务器 / 网站 / 本地文件）：
   需要你做什么：
   ```

4. 做完后，按任务的「验收标准」逐项检查，**实际执行检查命令**，不要只凭推测说"应该没问题"。
5. 更新 `PROGRESS.md`：打勾、更新「下一个任务」、在工作日志加一行（日期、任务、结果、网址或文件位置、未解决的问题）。
6. 用这个格式汇报：

   ```
   【完成】任务 X.Y
   结果：
   验收：✅ / ❌（逐项）
   需要你做的：
   下一个任务：
   ```

7. 问俊宇要不要继续。一个 Phase 全部完成后，建议他输入 `/clear`，再说"读 PROGRESS.md 继续"。

**遇到错误时：** 用白话解释原因和可选的做法。同一个问题试 2 次还不成功，就停下来报告，不要一直乱试。

---

## 安全守则（必须遵守）

1. **破坏性操作先确认。** 删除文件或数据库、`wp db reset`、`wp site empty`、`DROP`、`rm -rf`、覆盖配置文件、重启线上服务——先说明会影响什么，得到俊宇明确同意才执行。
2. **改上线中的网站之前先备份。** 尤其是客户网站：先 `wp db export` + 备份文件，写下回滚方法。能先在 staging（测试站）做的，就先在 staging 做。
3. **密码、API Key、Application Password 不写进 docs、代码或 git。** 放进 `.env`（已在 `.gitignore`）或让俊宇存进密码管理器。聊天里不要完整显示密码。
4. **SSH 只用密钥登录。** 服务器日常用非 root 的 `deploy` 用户 + sudo。关闭 root 登录之前，必须先确认 `deploy` 用户能用密钥登录并能 sudo，避免把自己锁在外面。
5. **不要建议俊宇使用跳过权限确认的模式。**
6. **花钱先问。** 任何付费插件、付费工具、升级服务器，先列出价格和免费替代方案，俊宇同意才用。
7. **不超出范围。** 不做计划以外的大改动。有更好的想法，写进 `PROGRESS.md` 的「建议」区，问俊宇。

---

## 诚信守则（必须遵守）

1. **不造假。** 不写假评价、假客户、假数据、假 logo 墙、假"已服务 100+ 商家"。没有真实客户之前，作品一律标注「概念作品 / Concept Project」。
2. **样板站用虚构品牌名**（先上网搜，确认不是现有品牌），全站 noindex，顶部横幅写明 "Demo site – not a real store"，不开真实付款。
3. **不抄。** 不抄别人的设计、logo、文字和产品图。图片只用：俊宇或客户自己拍的、AI 生成的、或明确可以商用的免费图库，并在站点的 `image-sources.md` 记录来源。
4. **给潜在客户做的样板首页（preview）只给对方本人看：** 设密码 + noindex；没成交就在 14 天内删除。
5. **不夸大。** 写给客户和公众的内容不承诺销量、不承诺"保证上 Google 第一页"。
6. **不骚扰。** 找客户不群发。对方说不需要，就在 `prospects.csv` 标记 `do-not-contact`，不再联系。
7. **客户的资产属于客户。** 域名、付款网关账户用客户自己的名义开；付清款项后网站归客户；客户要离开时给完整备份。

---

## 查证守则

插件名称和版本、平台费率（Shopee、TikTok Shop）、工具价格、服务条款、马来西亚法律要求都会变。

- 用到这些资料之前，**先上网查最新资料**，记录查证日期和来源链接。
- docs 里写的数字和工具，是 2026-11-06 写包时的资料，当作参考，不当作事实。
- 查不到或不确定，就直接告诉俊宇"我不确定"，不要凭记忆写死。
- 法律相关内容（隐私政策、条款、合同）只能做草稿，提醒俊宇或客户请律师确认。

---

## 技术约定

- **服务器：** Ubuntu LTS + Nginx + PHP-FPM + MariaDB + WP-CLI + Certbot。细节见 `docs/02-tech-spec.md`。
- **能用 WP-CLI 做的就用 WP-CLI**，并写进脚本，方便下次重复。
- **定制只放两个地方：** 子主题 `wp/child-theme/`（样式、模板）和自建插件 `wp/agency-core/`（功能）。不改 WordPress 核心，不改父主题。
- **git：** 本地文件夹用 git 管理，每完成一个任务 commit 一次。`.env`、数据库备份、客户原始素材不进 git。
- **工作室网站（2026-11-07）：** 放在 Netlify，程式在 `site/`（`python3 site/build.py` 产生 `site/dist/`，Python 标准库即可；`netlify.toml` 在 repo 根目录）。6 个模板在 `site/templates/<代号>/`（template.json + theme.css + img/）；工作室页面在 `site/pages/`；价格等资料在 `site/studio.json`；AI 客服是 `site/netlify/functions/chat/`（DeepSeek，Key 只放 Netlify 环境变量）。改价格要同时改 `site/studio.json` 和 `sales/agent/knowledge.md`。改完跑 `node site/tools/check-flow.js` 测 6 个模板的购物流程。免费样板：`python3 site/build.py --preview clients/<代号>/preview/preview.json`（`clients/*/preview/` 不进 git）。
- **联系方式：** 工作室的公开帐号是 Instagram `@cartsmith.studio`。找客户时（2026-11-08 起）用 Instagram + WhatsApp + Email，都由俊宇在工作台按一下打开、自己按发送。AI 写的信息用「Cartsmith Studio / 我们」署名，**不写俊宇的名字，不用表情符号**。AI 用 DeepSeek（不是 Claude）。
- **销售工作台（2026-11-08）：** https://cartsmith.netlify.app/desk/ ，前端 `site/desk/`，后端 `site/netlify/functions/desk/`（密码 = Netlify 环境变量 `SALES_DESK_KEY`，资料存 Netlify Blobs，依赖 `site/package.json` 的 `@netlify/blobs`）。改完跑 `node site/tools/check-desk.js`。**每张卡片有自己的 AI 助手（2026-11-09，DeepSeek）**：对话存在那一家的资料里（Blobs），每次只给 AI 这一家的资料和对话、长对话自动整理重点；客户对话不放 GitHub（repo 公开）。原则：AI 只分析和起草，**信息由俊宇手动发送**；不自动抓资料、不自动私信（Instagram 条款）。**新商家收件箱（2026-11-08）：** Claude Code 找到的商家写进 `sales/leads/<日期>-<批次>.json`（格式见 `sales/leads/README.md`），build 时变成 `site/netlify/functions/desk/inbox.mjs`，push 后工作台「今天」最上面出现，俊宇按「全部加入」就打分写开场白；每家先跑 `bash scripts/local/check-domains.sh` 确认没有网站才放。**每天早上约 06:40 定时任务做「可以直接打电话的商家包」（2026-11-09 起：约 15 个/天，每家 = 有电话的商家 + 做好的加密样板，网址和密码自动出现在工作台卡片；先清积压再找新商家；查不到价钱显示 Ask for price；照片用 Pexels 示意图；每天删除超过 14 天的样板；见 `sales/leads/README.md`）**。**联系顺序（2026-11-09）：先打电话**（工作台「打电话」按钮 + 结果按钮；脚本在 `site/desk/call-script.html`），对方说可以才 WhatsApp / Email 发样板，IG 只当跟进；建议时段：餐厅 14:30–17:00、卖产品 10:00–12:00，push 到 GitHub 的 `leads` 分支（不部署；工作台直接读取，见 `sales/leads/README.md`）。**Netlify 免费方案每次正式部署扣 15 点（每月 300 点）：程式改动要集中起来一次 push，不要每改一点就 push**；只改文件的 commit 会被 `scripts/netlify-ignore.sh` 跳过。信息一律由俊宇手动发（工作台有「连续发送」帮他一家一家打开已经填好的 WhatsApp / Email），不做自动发 IG / WhatsApp / Gmail 的工具。
- **运行位置（2026-11-06 更新）：** 整个 repo `git clone` 在服务器 `/opt/agency`，脚本直接 `sudo /opt/agency/scripts/server/<脚本>.sh` 执行；改了程式 → commit + push → 服务器 `cd /opt/agency && sudo git pull`。远程操作用 `ssh deploy@<IP>`（或 host 别名 `agency-dev`）。部署步骤见 `docs/08-deploy-guide.md`，脚本一览见 `scripts/README.md`。
- **站点资料：** 登记 `/etc/agency/sites/<代号>.conf`、密码 `/etc/agency/secrets/<代号>.env`（只有 root 能读，聊天里不要显示完整密码）、日志 `/var/log/agency/`、备份 `/var/backups/agency/<代号>/`。
- **网页版 Claude Code（云端）不能直接 SSH 到服务器**：在网页版就只改 repo、commit、push，再请俊宇在服务器 `git pull` 和执行指令，把输出贴回来。
- **目录约定：**

  ```
  docs/                 计划文档（俊宇看得懂的）
  scripts/              服务器和建站脚本
  wp/agency-core/       自建插件
  wp/child-theme/       子主题
  sites/<站点代号>/      每个站点的 README.md（网址、用途、配置、待办）和 image-sources.md
  sales/                销售材料（客户名单、话术、套餐单）
  content/              视频脚本、内容日历
  clients/<客户代号>/    客户资料（raw/ 子文件夹不进 git）
  assets/               作品集截图、视频
  templates/            模板（复制后再填，不直接改模板本身）
  ```

- **站点代号：** 只用小写英文、数字和连字符，例如 `master`、`demo-glow`、`preview-p012`、`client-c001`。
