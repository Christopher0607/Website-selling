# sales/leads — 新商家收件箱的资料

Claude Code 上网找到的商家写在这里。`python3 site/build.py` 会把所有 `*.json` 合成 `site/netlify/functions/desk/inbox.mjs`。push 之后 Netlify 自动部署，工作台「今天」最上面就会出现「新商家 · Claude Code 找的」。俊宇按「全部加入」，AI 就逐家打分、写开场白，**资料不用复制粘贴**。

## 每天的定时任务（2026-11-08 起）

Claude Code 每天早上约 7 点（马来西亚时间）自动找商家，**目标 50 家**（2026-11-08 俊宇改：IG 效果不大，改用 WhatsApp / Email，量要多）。范围：餐厅、咖啡馆、烘焙 / 甜点、在家做的食品品牌、自有品牌的产品卖家（护肤、服装、礼品等）。写成 `sales/leads/<日期>-daily.json`（id 用 `d<日期>-<店名>`；2026-11-08 以前的档案叫 `-restaurants.json`），跑 `python3 site/build.py`（会产生 `sales/leads/inbox.json`），**只 commit `sales/leads/`，push 到 `leads` 分支**。

**为什么用 `leads` 分支：** Netlify 免费方案每次正式部署扣 15 点（每月 300 点）。工作台会直接读 GitHub 上 `leads` 分支的 `sales/leads/inbox.json`（`LEADS_URL`，5 分钟更新一次），所以新商家不用部署就会出现在「新商家」。正式分支 `ccr-4e1e8221-7msrbj` 只放程式的改动。

每天开始前：`git fetch origin ccr-4e1e8221-7msrbj leads && git checkout -B leads origin/leads && git merge --no-edit origin/ccr-4e1e8221-7msrbj`（拿到最新的规则和工具）。合并如果只在 `sales/leads/inbox.json` 或 `site/netlify/functions/desk/inbox.mjs` 有冲突，跑一次 `python3 site/build.py` 重新产生，再 `git add` 这两个档案、`git commit --no-edit`。

## 规则

- **一定要有 Instagram 帐号**（2026-11-08 俊宇定）：报道、推荐清单、搜索结果、Linktree、Facebook 上看到的 IG 链接都可以。找不到 IG 的不要放；`python3 site/build.py` 也会自动跳过并印出来。
- **每天的新商家一定要有 WhatsApp（手机号码）或 Email 其中一个**（2026-11-08 俊宇定：IG 私信效果不大）。找不到公开的 WhatsApp / Email 就不要放。
- **联系方式的来源**：很多商家比较常回 WhatsApp 和 Email。只用**公开给客人的**联系方式：报道里的订购电话、搜索结果里的 Google 商家资料 / Facebook 页面摘要、他们的 Linktree（搜「linktr.ee <店名>」找到网址，打开一次看上面的 WhatsApp / Email 链接）、网站联系页。**不要登录、不要用程式读 Instagram / Facebook 页面本身。** 写进 `whatsapp`（只放手机号码，原样写，例如 `012-345 6789`）、`email`、`contact_source`（简体中文写在哪里看到、哪个月份）。
- **补联系方式（2026-11-08 起，每天做）**：找完新商家后，花最多 15 分钟，帮名单里**还没有 WhatsApp / Email** 的商家（`sales/leads/inbox.json` 里两个都空的）再找一次，用上面同样的公开来源。找到的写进 `sales/leads/<日期>-contacts.json`（格式见下面），`build.py` 会把号码补进那家商家，工作台的卡片也会自动补上（不会盖掉已经有的）。**页面上要同时看到店名和号码才算**；只在不知名的聚合网站看到、看不出是哪一家的号码不要放；座机（03- 等）不能用 WhatsApp，不要放。找不到就算了，不要硬凑。
- **只放查证过的商家。** 资料来自搜索引擎、新闻报道和公开推荐清单，不登录、不用程式刷 Instagram / Shopee。
- **有没有网站要直接试：** 跑 `bash scripts/local/check-domains.sh <名字1> <名字2> …`（每家试两三种写法，例如 `brand`、`brandmy`、`brandkl`）。结果是 NONE / PARKED / EXPIRED 才算「没有网站」；SITE 要看标题是不是同一家，CHECK（有防护页）当作可能有网站、不放进 A 级。在 `input` 里写清楚试了什么。
- **只写有来源的事实。** 粉丝数、销量这种看不到的就不写；观察写报道里的具体内容（例如「The Edge 2025 年 5 月报道：第 10 年」）。
- `id` 一旦用过就不要改、不要重复：工作台用它记录加过或跳过的商家。已经在名单里的 IG 不会再出现。
- 同一批的研究说明放在 `sales/research/`，这里的 JSON 是给工作台读的版本。

## 格式

```json
{
  "batch": "2026-11-08 第 3 批 · 英文市场",
  "source": "sales/research/2026-11-08-batch-3-english.md",
  "leads": [
    {
      "id": "b3-ginger-batiks",            // 必填，唯一，小写英文 + 连字符
      "name": "Ginger Batiks",             // 必填，显示用的店名
      "instagram": "gingerbatiks",         // 必填，不用 @（没有 IG 的不放）
      "whatsapp": "012-345 6789",          // 选填：公开的手机号码
      "email": "hello@brand.com",          // 选填：公开的 Email
      "contact_source": "TheSmartLocal 圣诞清单（2025-12）",  // 有填 whatsapp / email 就写来源
      "store_url": "",                     // 选填：Shopee 店铺链接
      "language": "en",                    // zh / en / ms：开场白的语言
      "template": "plainfold",             // dewlane / plainfold / chili-pantry / lowlight / tailmate / voltnest
      "priority": "A",                     // A / B
      "why": "一句话：为什么值得联系（中文，显示在收件箱）",
      "verify": "俊宇发之前要亲眼确认的事（中文）",
      "input": "给 AI 的资料（英文或中文都可以，最多 3000 字）：卖什么、地点、信号、购买力、网站检查结果、Contacts、Observation（报道里的具体内容）、Angle、Sources"
    }
  ]
}
```

（上面的 `//` 注释只是说明，真正的 JSON 文件里不能有注释。）

补联系方式的档案（`<日期>-contacts.json`）：

```json
{
  "batch": "2026-11-09 补联系方式",
  "contacts": [
    { "id": "b3-forest-floor", "whatsapp": "012-345 6789", "email": "", "contact_source": "Vulcan Post 2026-01 报道里的订购 WhatsApp" }
  ]
}
```

`id` 要跟原来那家商家一样；`whatsapp` 或 `email` 至少一个；`contact_source` 必填。

## 改完检查

```bash
python3 site/build.py          # 格式不对会直接报错（缺 id/name/input、id 重复、语言或 email 不对）；没有 IG 的会被跳过
node site/tools/check-desk.js http://localhost:8769 <测试资料档>   # 本地测试，见 docs/11
```
