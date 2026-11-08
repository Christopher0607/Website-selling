# 00 — 开工前的决定

> 俊宇：每一项都有默认建议。不想想太多，就跟 Claude Code 说"全部用默认"，以后随时可以改。
> Claude Code：把俊宇的回答写进「已决定」一栏。标 ★ 的是必填，没填好不要开始 Phase 1。
>
> **2026-11-06：俊宇说「全部你自己决定」**，以下是 Claude Code 定的版本。俊宇随时可以改，改了告诉 Claude Code 同步所有文件。
>
> **2026-11-07 俊宇的修改：** 不用马来文名字（改名 Cartsmith Studio）；头巾样板换成别的产品；暂时不买域名，先用 Netlify 免费网址；要 6 个不同模板给客户选；要说明为什么比同行好；AI 聊天用 DeepSeek；暂时不开 WhatsApp，用 Instagram 联系商家；暂时不注册 SSM。

---

## 决定清单

| # | 决定 | 默认建议 | 已决定 |
|---|---|---|---|
| 1 ★ | 主攻行业（只选一个） | 本地护肤 / 美妆品牌 | **Shopee / TikTok Shop 上有自己品牌的中小型卖家**；6 个模板覆盖护肤、服装、食品、咖啡、宠物、3C 配件，30 天后看哪一类回复率最高再收窄 |
| 2 ★ | 工作室名字 | Claude Code 提 10 个名字，查域名和社交账号是否可用 | **Cartsmith Studio**（2026-11-07 改；cart = 购物车，smith = 工匠，"做网店的工匠"；英文名，中英马都好念）。2026-11-07 网上搜过，马来西亚没有同名的网站设计公司。注册 SSM 时再到 ezBiz 查名字、MyIPO 查商标 |
| 3 ★ | 工作室域名 | `.com`（有 SSM 注册后可以再加 `.com.my`） | **暂时不买**（2026-11-07）。工作室网站先放 Netlify 免费网址 `cartsmith.netlify.app`（`docs/09-netlify-guide.md`）。以后买了域名，服务器文件里的 `yourdomain.com` 都换成新域名 |
| 4 | 服务语言 | 中文 + 英文；马来文用话术模板 | 用默认 |
| 5 | 套餐价格 | 用 `01-business-plan.md` 的价格 | **一次性建站费 + 月费**（Starter RM2,800 / Growth RM4,800 / Catalog RM3,500；Care RM150 / RM300）。**试用：上线后第 1 个月维护免费** |
| 6 | 首批客户优惠 | 前 3 个客户 7 折，换真实评价和案例授权 | 前 3 个客户：建站 7 折 **+ 维护免费 2 个月**（代替 1 个月），换真实评价、案例授权、介绍朋友 |
| 7 | 每月启动预算 | RM300 以内（服务器、域名、工具）；前 30 天广告 RM0 | 用默认 |
| 8 | 每周投入时间 | 15–20 小时 | 用默认 |
| 9 ★ | 联系方式 | WhatsApp Business 号码 | **Instagram `@cartsmith.studio`**（2026-11-08 俊宇改好；暂时不开 WhatsApp）。网站上：Instagram 私信按钮 + 免费样板申请表（Netlify Forms）+ AI 客服。以后改成品牌名的话，只要改 `site/studio.json` 的 instagram 再重新 build |
| 10 | SSM 注册 | 先做样板和找客户，收第一笔订金之前完成 SSM 注册（独资 Enterprise）+ 开商业户口 | **暂时不注册**（2026-11-07）——找客户、做免费样板可以先做；但**收第一笔订金之前一定要注册**（见下面第 10 节）。网站上不显示 SSM 号码 |
| 11 | 服务器 | DigitalOcean，新加坡机房，2GB 内存起步 | DigitalOcean 新加坡，**Ubuntu 24.04 LTS**、2 GB（脚本已在 24.04 完整测试；26.04 默认 PHP 8.5，等插件兼容稳定后再升级） |
| 12 | 视频要不要露脸 | 不露脸：录屏 + 自己的声音 | 用默认 |
| 13 | 工作室网站放哪里 | 服务器（WordPress） | **Netlify**（静态网站 + 免费表单 + 一个聊天函数），程式在 `site/`。DigitalOcean 服务器等第一个客户签约再开，用来放客户的 WooCommerce 网店 |
| 14 | 给客户选的模板 | 3 个样板站 | **6 个模板**（全部虚构品牌、Pexels 照片）：Dewlane 护肤（简约）、Plainfold 服装（大胆杂志风）、Little Chili Pantry 食品（温暖手作）、Lowlight Roasters 咖啡（深色高级）、Tailmate 宠物（活泼彩色）、Voltnest 3C 配件（科技规格）。2026-11-07 网上搜过都没有同名品牌 |
| 15 | AI | Claude | **DeepSeek API**（`deepseek-flash`，预付制）：网站 AI 客服 + 销售助理 |
| 17 | 标志 | — | **2 号：几何 C + 橙色小方块**（2026-11-08 俊宇选，已用在 IG 头像和网站）。档案在 `content/brand/` |
| 16 | 免费样板怎么做 | 服务器 `make-preview.sh` | `python site/build.py --preview` 产生 → 拖进 Netlify Drop（随机网址 + 密码页 + noindex，14 天内删除） |
| 18 | 自动找商家 | 俊宇自己找 | **每天早上约 7 点（马来西亚时间）Claude Code 定时任务自动找 20 家 A 级餐厅**（2026-11-08 俊宇决定）：英文市场、有购买力、有东西可以在网上卖（节日套餐、外烩、预订蛋糕、冷冻 / 瓶装产品、礼券），用 `scripts/local/check-domains.sh` 确认没有网站，写进 `sales/leads/`，push 后出现在工作台收件箱 |
| 20 | 联系渠道和署名 | 只用 Instagram | **Instagram + WhatsApp + Email，都由俊宇按发送**（2026-11-08 俊宇：很多商家比较常回 WhatsApp 和 Gmail）。工作台一键打开 WhatsApp（wa.me，信息预先填好）/ Email（mailto，主旨和内容预先填好）/ IG（复制并打开）。新商家一定要有 IG；WhatsApp / Email 只用公开给客人的。AI 写的信息用「Cartsmith Studio」和「我们」署名，**不写俊宇的名字、不用表情符号**；工作台介面也拿掉表情符号 |
| 19 | Instagram 私信 | 手动发 | **还是手动发**（工作台「复制并打开」+「已发送」提示条）。2026-11-08 俊宇想用 instagram_dm_mcp（非官方 instagrapi，用帐号密码登入）自动发；Claude Code 不做自动发陌生私信的工具 |

---

## 每一项的说明

### 1. 主攻行业

只选一个行业做深，话术、样板站、视频都围绕它，成交会容易很多。做出 3–5 个真实案例以后，再考虑加第二个行业。

| 选项 | 优点 | 缺点 |
|---|---|---|
| **护肤 / 美妆（默认）** | Shopee 和 TikTok Shop 上很多本地品牌；重视形象；回头客多 | 竞争的设计公司也多 |
| 服装 / 穆斯林服饰 | 款式多，回头客多，节日销售旺季明显 | 产品变体多（尺寸、颜色），上架工作量大 |
| 烘焙 / 食品 / 节日礼盒 | 本地需求稳定，很多店还只靠 WhatsApp 接单 | 送货范围和时间限制多，单价偏低 |
| 宠物用品 | 回头客多，客户忠诚 | 市场比较小 |
| B2B 批发 / 小厂商 | 预算较高，需要的是产品目录 + 询价，不一定要结账功能 | 决策慢，需要更多信任 |

### 2–3. 工作室名字和域名

Claude Code 会：
1. 根据行业提 10 个名字（短、好念、中英文都顺口）。
2. 查每个名字的 `.com` 域名是否可注册、Instagram / TikTok / Facebook 账号名是否可用。
3. 提醒你去 SSM 的 ezBiz 查名字能不能注册、去 MyIPO 查有没有相同商标。

`.com.my` 域名通常需要 SSM 注册文件，所以默认先用 `.com`。

### 5. 套餐价格

默认价格见 `01-business-plan.md` 第 5 节。想改的话直接告诉 Claude Code，它会同步更新所有文件（套餐单、报价单、网站文案、话术）。

### 7. 启动预算（参考）

| 项目 | 估计 |
|---|---|
| DigitalOcean 服务器（2GB）+ 自动备份 | 每月约 RM60–90 |
| 域名 | 每年约 RM50–120 |
| 交易邮件服务（订单邮件） | 免费额度通常够用 |
| 视频工具（剪映 / CapCut、AI 配音等） | 先用免费版，需要时再付费 |
| 广告 | 前 30 天 RM0，有 2–3 个案例以后再测试 |

以上是写包时的估计，Claude Code 会在付款前查最新价格。

### 9. 联系方式（2026-11-07 改成 Instagram）

现在只用 Instagram 私信（找客户和客户找你都是）。以前写的 WhatsApp 说明留着，以后想加 WhatsApp 时参考：

马来西亚商家主要用 WhatsApp 沟通，这个号码会出现在你的网站、名片、视频里。建议另外准备一个号码装 WhatsApp Business，不要用私人号码。

### 10. SSM 注册

开发票、开商业银行户口、申请 `.com.my` 域名、让客户信任你，都需要 SSM 注册。可以在 SSM 的 ezBiz 网站上线申请。报税和以后的 e-Invoice 要求，问会计最清楚。

**2026-11-07 决定：暂时不注册。** 这阶段（做网站、开 IG、找客户、做免费样板）可以先不注册。但要知道（2026-11-07 查）：
- 在马来西亚**做生意**（收客户的钱）要先向 SSM 注册，没注册就营业是违法的（Registration of Businesses Act 1956，罚款最高可达 RM50,000）。
- 独资用商号（例如 Cartsmith Studio）每年 **RM60**，用自己 IC 名字 RM30；在 ezBiz 网上办，通常 1 个工作天内批。
- 所以：**有客户说「好，开始吧」时，先花一天注册，再发订金资料。** 合同、收据、商业户口都要用注册的名字。
- 来源：[SSM ezBiz 新商业注册指南（PDF）](https://www.ssm.com.my/Documents/Ezbiz%20Online%20User%20Guideline/GUIDELINE-FOR-REGISTRATION-OF-NEW-BUSINESS.pdf)、[3E Accounting：独资 / 合伙注册指南](https://www.3ecpa.com.my/resources/guide-to-setup-malaysia-business/guide-to-registration-of-a-sole-proprietorship-or-partnership-in-malaysia/)。法律细节以 SSM 官方和会计 / 律师意见为准。

### 11. 服务器

- **dev 服务器**（现在就开）：放母版站、样板站、你的工作室网站、给潜在客户看的 preview。
- **生产服务器**（第一个客户签约后再开）：只放客户的正式网站，跟实验环境分开，比较安全。

### 12. 视频要不要露脸

不露脸也可以做得很好：录屏（建站过程、网站在手机上的样子）+ 你自己的声音最有说服力。也可以用 AI 数字人和 AI 配音，详见 `05-content-video.md`。
