# sales/leads — 新商家收件箱的资料

Claude Code 上网找到的商家写在这里。`python3 site/build.py` 会把所有 `*.json` 合成 `site/netlify/functions/desk/inbox.mjs`。push 之后 Netlify 自动部署，工作台「今天」最上面就会出现「新商家 · Claude Code 找的」。俊宇按「全部加入」，AI 就逐家打分、写开场白，**资料不用复制粘贴**。

## 每天的定时任务（2026-11-08 起）

Claude Code 每天早上约 06:40（马来西亚时间）做「**可以直接打电话的商家包**」（2026-11-09 俊宇定：每一家在俊宇联系之前，样板就要做好放在工作台那张卡上）。每天大约 **15 个样板**（Claude 额度的上限）：

1. **先清积压：** `sales/leads/inbox.json` 里有电话（`whatsapp` 或 `phone`）、但 `sales/leads/previews.json` 里还没有样板的商家，先帮它们做样板（旧的先做）。
2. **积压清完才找新商家：** 每找到一家合格的（一定要有电话），马上帮它做样板，直到当天一共 15 个。新商家写进 `sales/leads/<日期>-daily.json`（id `d<YYYYMMDD>-<店名>`）。
3. **每天顺便删除到期的样板：** `node scripts/local/preview-publish.js list` 看到「到期了」的，跑 `delete <代号>`（会一起拿掉 previews.json 的那一行），再删 `clients/<代号>/preview/`。

**做样板的规则（`docs/09-netlify-guide.md` 第 D 部分）：** 代号 `m-<店名>`；`preview.json` 写 `lead_id`、`instagram`、`photos: "placeholder"`、`delete_by` = 今天 + 14 天、`password` = 店名一个字 + 4 个随机数字；店名、招牌产品、地点只用查得到的真实资料；**查不到价钱的产品就不要写 `price`**（样板会显示 Ask for price，不要编价钱），3–8 个产品；照片用 Pexels（`scripts/local/fetch-stock-images.py`），不用对方 IG / Facebook / 报道里的照片。`python3 site/build.py --preview …` → `node scripts/local/preview-publish.js publish <代号>` → `python3 site/build.py` → commit `sales/leads/previews.json` + `sales/leads/inbox.json`（+ 当天的 daily.json）到 `leads` 分支。

临时加的一轮（俊宇说「现在继续找」）用 `<日期>-extra-<HHMM>.json`、id `x<YYYYMMDD><HHMM>-<店名>`。档案已经存在就表示那一轮做过了，不要重做。

**优先顺序（找新商家时）：** 1. 有公开电话号码（手机或座机）而且在巴生谷有实体店的；2. 其他地区有电话的。每一家都要写 `area` 和 `address`（在家做的写「在家做 · <地区>」）。

范围：餐厅、咖啡馆、烘焙 / 甜点、在家做的食品品牌、自有品牌的产品卖家。2026-11-08 以前的档案叫 `-restaurants.json` / `-batch-N.json`；`-daily-2.json` 是停用的第二轮。跑 `python3 site/build.py`（会产生 `sales/leads/inbox.json`），**只 commit `sales/leads/`，push 到 `leads` 分支**；样板本身由 publish 推到 `previews` 分支。

**边做边 push：** 每做好 3 个样板就跑一次 `python3 site/build.py`、commit、push（工作台 5 分钟内就会出现）。最后一次 push 再写总结。

**为什么用 `leads` 分支：** Netlify 免费方案每次正式部署扣 15 点（每月 300 点）。工作台会直接读 GitHub 上 `leads` 分支的 `sales/leads/inbox.json`（`LEADS_URL`，5 分钟更新一次），所以新商家不用部署就会出现在「新商家」。正式分支 `ccr-4e1e8221-7msrbj` 只放程式的改动。

每天开始前：`git fetch origin ccr-4e1e8221-7msrbj leads && git checkout -B leads origin/leads && git merge --no-edit origin/ccr-4e1e8221-7msrbj`（拿到最新的规则和工具）。合并如果只在 `sales/leads/inbox.json` 或 `site/netlify/functions/desk/inbox.mjs` 有冲突，跑一次 `python3 site/build.py` 重新产生，再 `git add` 这两个档案、`git commit --no-edit`。

## 商家标准（A / B 级）

**A 级：下面七项都要符合。**

1. 自己的品牌或独立经营的店（不要连锁 5 家分店以上、酒店餐厅、新加坡的店、转卖别人品牌的店）。
2. **有东西可以在网上卖**（产品、节日套餐、预订蛋糕、外烩、礼券、课程等）。
3. 做得好的证据：最近 2 年的媒体报道或推荐清单、或 Google 评价数量多（例如 200+ 条，从搜索结果摘要看）、或开店多年。
4. **有购买力**：人均 / 单价 RM40 以上、或节日套餐 / 产品 RM80 以上、或有实体店加上报道、或有公司 / 酒店客户、或花钱做过推广。
5. **没有网站**：a. `bash scripts/local/check-domains.sh <写法1> <写法2> <写法3>`（只有 NONE / PARKED / EXPIRED 算没有）；b. 搜「<店名> order online」和「<店名> website」（Shopify、StoreHub、Beepit、Oddle、EasyStore、take.app、WooCommerce、Wix 网上商店 → 排除）；c. 老板的其他品牌有网站 → 排除。
6. **一定要有 Instagram 帐号**。
7. **一定要有公开的电话号码（手机或座机）或 Email**（2026-11-09 起座机也可以，因为改成打电话为主）。手机号码写进 `whatsapp`，座机写进 `phone`。

**B 级（2026-11-08 起，为了每天 100 家）：只有第 3 项（做得好的证据）不够，其他六项都符合——购买力（第 4 项）一样要有。** `priority` 写 `B`，`why` 写清楚缺什么。每一轮先找 A 级，A 级找不到了才放 B 级。不符合第 1、2、4、5、6、7 项的一律不放，不要为了凑数降低标准。

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
      "whatsapp": "012-345 6789",          // 选填：公开的手机号码（可以打电话也可能有 WhatsApp）
      "phone": "03-2201 1710",             // 选填：座机（只能打电话）
      "area": "Bangsar",                   // 必填（2026-11-09 起）：地区，拜访清单用
      "address": "69-1 Jalan Telawi 3, Bangsar Baru, KL",  // 必填：店的地址；在家做的写「在家做 · 地区」
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
    { "id": "b3-forest-floor", "whatsapp": "012-345 6789", "email": "", "phone": "", "area": "Damansara Utama", "address": "57 Jalan SS 21/1a, PJ", "contact_source": "Vulcan Post 2026-01 报道里的订购 WhatsApp" }
  ]
}
```

`id` 要跟原来那家商家一样；`whatsapp` / `email` / `phone` / `area` / `address` 至少一个；`contact_source` 必填。也可以用来帮以前的商家补上地区和地址（拜访清单用）。

## 改完检查

```bash
python3 site/build.py          # 格式不对会直接报错（缺 id/name/input、id 重复、语言或 email 不对）；没有 IG 的会被跳过
node site/tools/check-desk.js http://localhost:8769 <测试资料档>   # 本地测试，见 docs/11
```
