# 04 — 销售工具包

> 给俊宇：这份是你找客户、谈客户用的。话术里的 `[方括号]` 都要换成真实内容，尤其是「具体观察」——这是对方会不会回你的关键。
> 给 Claude Code：任务 4.2 时按主攻行业和俊宇的说话方式修改这些模板，存成 `sales/scripts.md`。

---

## 1. 销售原则

1. **先给价值，再谈钱。** 免费样板首页、算账、一个有用的建议——让对方先看到你能做什么。
2. **具体。** "你们的 XX 精华有 1,000 多条好评" 比 "你们的店很棒" 有效十倍。
3. **诚实。** 不保证销量、不制造假的急迫感、不说别人坏话。刚起步就直说，用样板和清楚的价格建立信任。
4. **跟进。** 多数成交发生在第 2–3 次联系之后。但最多 3 次，对方说不要就停。
5. **记录。** 每个联系都记在 `sales/prospects.csv`，每周看数字调整。

---

## 2. 去哪里找客户

### 2.1 渠道和方法

| 渠道 | 怎么找 | 怎么联系 |
|---|---|---|
| **Shopee** | 搜行业关键词，挑马来西亚本地卖家；看店铺有没有品牌名、评价多不多、简介有没有 IG / 网站 | 用他们公开的 IG、FB 或 WhatsApp 联系。**不要用 Shopee 聊天推销**（可能违反平台规定） |
| **TikTok Shop** | 搜行业关键词，挑常开直播、有自己品牌的卖家 | IG / WhatsApp |
| **Instagram** | 搜行业 hashtag（例如 #localbrandmalaysia、#skincaremalaysia，依行业换）；挑简介只有 WhatsApp 链接、没有网站的品牌 | IG 私信 |
| **Facebook** | 卖家群组（搜 "Shopee seller Malaysia"、"peniaga online"、"usahawan online"）。先遵守群规、帮忙回答问题，不要一进群就发广告 | 对方跟你互动过之后再私信 |
| **小红书** | 搜"马来西亚本地品牌""大马小店"等 | 私信 |
| **Google Maps** | 搜"[行业] shop [城市]"，挑没有网站或网站很旧的店 | WhatsApp / 电话 / 到店 |
| **线下** | 市集、展销会、商会活动 | 当面聊 + 名片（QR 码连到 WhatsApp 和作品集） |
| **合作伙伴** | 见第 10 节 | — |

### 2.2 每天找客户的流程（30–45 分钟找 20 个）

1. 选一个渠道 + 一个关键词
2. 每个店花 1–2 分钟：看有没有网站，记下 **1 个具体观察**（某款产品、评价数量、最近的内容）
3. 填进 `sales/prospects.csv`（只记录公开的商业联系方式）
4. 按 2.3 打分
5. 请 Claude Code 根据你的观察写个人化开场句
6. 当天发出私信，4–5 分的先发

### 2.3 打分（1–5 分）

| 条件 | 分 |
|---|---|
| 有清楚的品牌名和 logo | +1 |
| 有明显销量（评价多、常开直播） | +1 |
| 社交媒体活跃（最近 7 天有发文） | +1 |
| 没有网站，或网站很旧、手机上不好用 | +1 |
| 看得出有预算（有投广告、有专业产品照、有实体店） | +1 |

4–5 分优先联系；2 分以下跳过。

---

## 3. 联系节奏

| 时间 | 动作 |
|---|---|
| 第 0 天 | 第一次私信（4.1 或 4.2） |
| 第 2–3 天 | 跟进：给一个有用的资讯（4.3） |
| 对方有兴趣 | 1–2 天内做好免费样板首页（preview），发出（4.4），约通话（4.6） |
| 第 10 天还没回 | 最后一条（4.5），标记 `no_response` |
| 对方说不需要 | 礼貌道谢，标记 `do_not_contact`，不再联系 |

**每天目标（工作日）：** 新联系 20 个、所有到期的跟进、preview 最多 2 个。

**礼貌规则：** 只在早上 9 点到晚上 9 点发信息；不要连发好几条；对方没先发语音就不要发语音。

---

## 4. 话术模板

### 4.1 第一次私信：Shopee / TikTok Shop 卖家

**中文**
> 你好 [名字 / 店名] 👋 我是 [你的名字]，专门帮本地 [行业] 品牌做自己的网店。
> 刚看了你们在 Shopee 的店，[具体观察，例如：XX 精华有 1,000 多条好评，回头客应该不少]。
> 想问一下，你们有考虑过让回头客直接在自己的网站下单吗？这样回头客的订单就不用再被平台抽成，客户资料也是你们自己的。
> 如果有兴趣，我可以免费帮你们做一个首页样板，只给你看，不满意完全没关系 🙂

**English**
> Hi [Name] 👋 I'm [Your name]. I help local [industry] brands build their own online store.
> I just came across your Shopee shop — [specific observation, e.g. your XX serum has over 1,000 reviews, so you must have plenty of repeat customers].
> Have you thought about letting repeat customers order directly from your own website? Those orders wouldn't be subject to platform fees, and the customer data would be yours.
> If you're open to it, I can put together a free homepage mockup for you to look at — no obligation at all 🙂

**Bahasa Malaysia**
> Hai [Nama] 👋 Saya [Nama anda]. Saya bantu jenama [industri] tempatan bina kedai online sendiri.
> Saya baru tengok kedai Shopee anda — [pemerhatian spesifik, contohnya: serum XX anda ada lebih 1,000 ulasan, mesti ramai pelanggan tetap].
> Pernah terfikir untuk benarkan pelanggan tetap order terus dari website sendiri? Order itu tak kena yuran platform, dan data pelanggan jadi milik anda sendiri.
> Kalau berminat, saya boleh buatkan contoh homepage secara percuma untuk anda tengok — tiada sebarang komitmen 🙂

### 4.2 第一次私信：靠 WhatsApp / IG 接单的品牌

**中文**
> 你好 [名字] 👋 我是 [你的名字]，帮本地小品牌做网店的。看到你们现在主要是用 [IG 私信 / WhatsApp] 接单，[具体观察，例如：留言区很多人在问价钱]。
> 客人多的时候，一个个回价钱、确认转账、记单，应该挺花时间的吧？
> 我可以帮你们做一个简单的网店：客人自己选产品、自己付款（FPX / 电子钱包），订单自动进来，你只要负责出货。有兴趣的话，我先免费做个首页样板给你看看 🙂

**English**
> Hi [Name] 👋 I'm [Your name] — I build online stores for local small brands. I noticed you mainly take orders through [IG DMs / WhatsApp], [specific observation, e.g. lots of people asking for prices in the comments].
> When it gets busy, replying to every price question, confirming transfers and recording orders must take a lot of time?
> I can set up a simple online store for you: customers choose and pay on their own (FPX / e-wallets), orders come in automatically, and you just handle shipping. If you're interested, I'll make a free homepage mockup first so you can see what it looks like 🙂

**Bahasa Malaysia**
> Hai [Nama] 👋 Saya [Nama anda], saya buat kedai online untuk jenama kecil tempatan. Saya perasan anda kebanyakannya terima order melalui [DM IG / WhatsApp], [pemerhatian spesifik, contohnya: ramai yang tanya harga di ruangan komen].
> Bila tengah sibuk, nak balas soalan harga satu-satu, sahkan pemindahan wang dan catat order mesti makan masa, kan?
> Saya boleh sediakan kedai online yang ringkas: pelanggan pilih dan bayar sendiri (FPX / e-wallet), order masuk secara automatik, anda cuma uruskan penghantaran. Kalau berminat, saya buatkan contoh homepage dulu secara percuma supaya anda boleh tengok 🙂

### 4.3 跟进：给一个有用的资讯（第 2–3 天）

> 数字要先用 Shopee 官方最新费率算好（可以用工作室网站上的计算器），不确定就说"大约"。

**中文**
> 嗨 [名字]，不打扰太久～ 我用 Shopee 最新公布的费率大概算了一下：一张 RM[价格] 的 [品类] 订单，平台各种费用加起来大约是 RM[金额]。如果每个月有 [X] 张回头客的单改在官网下，一年大约可以多留下 RM[金额]（官网的付款手续费我已经算进去了）。
> 要不要我做个首页样板给你看看？

**English**
> Hi [Name], just a quick one — using Shopee's latest published rates, I estimated that a RM[price] order in [category] costs roughly RM[amount] in platform fees. If [X] repeat orders a month went through your own website instead, you'd keep about RM[amount] more per year (I've already included website payment fees).
> Would you like me to make a homepage mockup for you?

**Bahasa Malaysia**
> Hai [Nama], ringkas saja — berdasarkan kadar terkini yang Shopee umumkan, saya anggarkan satu order RM[harga] untuk kategori [kategori] kena lebih kurang RM[jumlah] yuran platform. Kalau [X] order pelanggan tetap sebulan masuk melalui website sendiri, anda boleh simpan lebih kurang RM[jumlah] lagi setahun (yuran pembayaran website dah saya kira sekali).
> Nak saya buatkan contoh homepage?

### 4.4 送出免费样板首页

**中文**
> 做好了！这是给 [品牌] 的首页样板 👉 [链接]（密码：[密码]）
> 我录了一段 1 分钟的介绍：[视频链接]。用手机打开效果最好。
> 样板只用了你们公开的产品资料，只有你看得到，[日期] 会删除。
> 觉得不错的话，我们约 15 分钟聊聊怎么做成完整的网店？你哪天比较方便？

**English**
> It's ready! Here's the homepage mockup for [Brand] 👉 [link] (password: [password])
> I recorded a 1-minute walkthrough: [video link]. It looks best on your phone.
> It only uses your publicly available product info, only you can see it, and it will be deleted on [date].
> If you like it, shall we have a quick 15-minute chat about turning it into a full store? What day works for you?

**Bahasa Malaysia**
> Dah siap! Ini contoh homepage untuk [Jenama] 👉 [pautan] (kata laluan: [kata laluan])
> Saya ada rakam video penerangan 1 minit: [pautan video]. Paling cantik kalau buka di telefon.
> Contoh ini hanya guna maklumat produk anda yang sedia ada secara umum, hanya anda yang boleh lihat, dan akan dipadam pada [tarikh].
> Kalau suka, boleh kita berbual 15 minit tentang cara jadikannya kedai online yang lengkap? Hari apa yang sesuai untuk anda?

### 4.5 最后一条（第 10 天）

**中文**
> 嗨 [名字]，这是我最后一条消息啦～ 可能现在时机不对，完全理解 🙏 样板会在 [日期] 删除。以后如果想做自己的网站，随时 WhatsApp 我。祝生意越来越好！

**English**
> Hi [Name], this is my last message — totally understand if now isn't the right time 🙏 The mockup will be deleted on [date]. If you ever want your own website, just WhatsApp me anytime. Wishing your business all the best!

**Bahasa Malaysia**
> Hai [Nama], ini mesej terakhir saya — saya faham kalau sekarang bukan masa yang sesuai 🙏 Contoh homepage akan dipadam pada [tarikh]. Kalau satu hari nanti nak website sendiri, WhatsApp saja saya bila-bila masa. Semoga bisnes anda terus maju!

### 4.6 约通话

**中文**
> 太好了！我们约个 15 分钟的电话或视频吧。我想先了解你们现在怎么接单、出货，再告诉你适合哪个方案。[日期 1] 或 [日期 2] 的 [时间] 方便吗？

**English**
> Great! Let's do a quick 15-minute call. I'd like to understand how you take orders and ship today, then I'll recommend the plan that fits. Would [date 1] or [date 2] at [time] work for you?

### 4.7 收到订金后

**中文**
> 收到订金了，谢谢你的信任 🙏 接下来：
> 1. 这是资料表：[链接]（logo、产品资料、照片、公司资料、政策）
> 2. 资料齐了之后，[X] 个工作天内给你看第一版
> 3. 有任何问题直接在这里 WhatsApp 我（工作日 1 个工作天内回复）

**English**
> Deposit received — thank you for your trust 🙏 Next steps:
> 1. Here's the information form: [link] (logo, product details, photos, business details, policies)
> 2. Once everything is in, you'll see the first version within [X] working days
> 3. Any questions, just WhatsApp me here (I reply within 1 working day)

### 4.8 请客户介绍（上线时 + 上线后 30 天）

**中文**
> 网站上线一个月了，用得还顺吗？如果你觉得满意，能不能帮我写两三句真实的评价？另外，如果你身边有朋友也在做 Shopee 或自己的品牌，介绍给我的话，对方成交后我送你 [奖励：一个月免费维护 / RM200]。谢谢！

**English**
> It's been a month since your website went live — is everything running smoothly? If you're happy with it, would you mind writing two or three lines of honest feedback? Also, if you know anyone running a Shopee store or their own brand, I'd love an introduction — once they sign up, I'll give you [reward: one month of free maintenance / RM200]. Thank you!

---

## 5. 15 分钟通话流程

| 时间 | 做什么 |
|---|---|
| 0–2 分钟 | 寒暄，说明流程："我先问几个问题，再给你看样板和建议" |
| 2–8 分钟 | 问问题（下面挑 5–6 个），**多听少讲** |
| 8–12 分钟 | 打开样板 / preview，对着他刚才说的问题讲 |
| 12–14 分钟 | **推荐一个套餐**（另一个当备选），讲清楚价格、时间、付款方式 |
| 14–15 分钟 | 下一步："没问题的话，我今天发报价单给你，收到订金就开工" |

**10 个好问题：**
1. 现在每个月大概多少订单？主要从哪些渠道来？
2. 回头客大概占多少？
3. 客人现在是怎么联系你、怎么下单的？
4. 你希望网站帮你解决什么？3 个月后怎样算成功？
5. 产品有多少款？有没有颜色、尺寸这类选项？
6. 用哪家物流？有送东马吗？
7. 现在怎么收款？有 SSM 和公司户口吗？
8. 谁负责上产品、处理订单？
9. 预算大概多少？希望什么时候上线？
10. 除了你，还有谁要一起决定？

---

## 6. 常见异议怎么回

| 对方说 | 你可以这样回 |
|---|---|
| **太贵了** | "明白。可以先从起步店开始，也可以分两期付。我们也可以一起算：如果每个月有 [X] 张回头客的单改在官网下，省下的平台费大概 [Y] 个月就回本。" |
| **Shopee 已经够了** | "Shopee 继续做！网站不是取代 Shopee，而是给回头客、批发客户和广告流量一个你自己的地方，客户资料也是你的。" |
| **网站又没人来** | "对，网站本身不会自动带客人来。客人来自你现有的粉丝、WhatsApp 客户、包裹里的小卡片和广告。我会帮你把这些入口都设好。" |
| **我没时间管网站** | "所以有月费维护：上新品、改价格、备份更新都我来，你只要 WhatsApp 我。" |
| **我朋友 / 亲戚会做** | "很好啊！他有空的话可以先让他做。以后如果需要有人长期维护、处理付款和物流设定，随时找我。" |
| **我想一想** | "当然。你主要在考虑哪一点？价格、时间，还是效果？"——然后约好下次跟进的日期 |
| **能保证有订单吗** | "我不能保证销量，谁跟你保证都要小心。我能保证的是：网站好用、手机下单顺、付款和运费设定正确、速度快，有问题我会处理。" |
| **你是新人，没有案例** | "对，我刚开始，所以前 3 个客户有优惠，价格和内容也都写清楚。你可以先看我的 3 个样板站，和我帮你做的免费样板。" |

---

## 7. 报价与收款

- 通话后 **24 小时内**发报价单（`templates/proposal.md`），报价单有效期 14 天
- 付款：50% 订金开工，50% 余款付清后上线；月费每月预付（或 3 个月一次）
- 收款：银行转账或 DuitNow 到商业户口；收到后发收据 / 发票（用 SSM 注册名称）
- 时间从「收到订金 + 资料齐全」那天开始算；客户资料晚给，交付时间顺延
- 第三方费用（域名、付款网关手续费、付费插件）由客户自己付，账户用客户自己的名义开
- 营业额变大以后，SST 和 LHDN e-Invoice 的要求问会计

---

## 8. 合同要点（请律师看一次）

> 这是要点清单，不是合同。第一次请律师按这些要点做一份合同模板，之后每个客户套用。

- [ ] 双方资料（SSM 名称和号码、地址、联系人）
- [ ] 工作范围：套餐内容、页面、产品数量、修改轮数
- [ ] 不包含的项目
- [ ] 客户的责任：提供资料的期限；资料（图片、文字、logo）的版权和合法性；产品本身的合规
- [ ] 时间表：从订金 + 完整资料起算；客户延迟就顺延
- [ ] 付款：金额、阶段、期限、逾期处理
- [ ] 所有权：付清后网站和内容归客户；我们可以把网站放进作品集（客户可以要求不放）
- [ ] 第三方服务（域名、付款网关、插件、主机）的费用和条款由客户承担
- [ ] 月费维护：内容、回复时间、最短期限、终止要提前多久通知
- [ ] 保密
- [ ] 责任限制：不保证销量；第三方服务中断不负责；赔偿上限为客户已付的金额
- [ ] 终止条款（双方）
- [ ] 适用法律：马来西亚
- [ ] 双方签名和日期

---

## 9. 成交后

1. 发 4.7 欢迎信息 + 资料表（`templates/client-brief.md`）
2. Claude Code 建客户档案（任务 6.1）
3. 按 `06-delivery-sop.md` 执行
4. 在 `prospects.csv` 把状态改成 `won`

---

## 10. 转介绍与合作伙伴

**客户介绍：** 介绍的朋友成交后，送介绍人一个月免费维护或 RM200（二选一）。

**合作伙伴：** 他们手上有你的客户，你也可以介绍客户给他们。
- 产品摄影师、平面设计师
- 会计师、公司秘书（帮人注册 SSM 的）
- 电商讲师、Shopee / TikTok 代运营、直播主
- 物流代理、包装供应商

**合作方式：** 对方介绍的客户付清款项后，给对方首个项目金额的 10%。

**合作邀请（中文）**
> 你好 [名字]，我是 [你的名字]，专门帮本地 [行业] 品牌做网店和维护。我看到你也服务很多 [行业] 商家，想问问有没有机会互相介绍客户？你介绍的客户成交后，我给你项目金额的 10%；我的客户需要 [对方的服务] 时，我也会优先推荐你。有兴趣的话我们约 15 分钟聊聊？

**Partnership invite (English)**
> Hi [Name], I'm [Your name] — I build and maintain online stores for local [industry] brands. Since you also work with a lot of [industry] businesses, would you be open to referring clients to each other? For any client you refer who signs up, I'll pay you 10% of the project fee, and whenever my clients need [their service], I'll recommend you first. Shall we have a 15-minute chat?

---

## 11. 销售数字追踪

`prospects.csv` 的状态：`new` → `contacted` → `replied` → `preview_sent` → `call_booked` → `proposal_sent` → `won` / `lost` / `no_response` / `do_not_contact`

**规划用的假设（不是保证）：**

| 阶段 | 每 100 个联系 |
|---|---|
| 有回复 | 15–25 |
| 做了 preview | 8–12 |
| 有通话 | 4–8 |
| 成交 | 1–3 |

第一个月的**真实数字**比任何假设都重要。每周日请 Claude Code 读 `prospects.csv` 算出你的转化率，看哪一步最弱：
- 回复率低 → 改开场白（观察不够具体？渠道不对？）
- 有回复但不要 preview → 改价值说法
- 有 preview 但不约通话 → 改样板质量或跟进方式
- 有通话但不成交 → 改套餐、价格或信任感（案例、保证、付款方式）

---

## 12. 不要做的事

- 不群发、不买名单、不用程式自动发信息（容易被 WhatsApp / Instagram 封号）
- 不制造假的急迫感（"今天最后一天优惠"——除非是真的）
- 不写假评价、不说"已经服务 100 个客户"
- 不说竞争对手坏话
- 对方说不要，就停
- 潜在客户的资料只用来联系他本人，不分享给别人
