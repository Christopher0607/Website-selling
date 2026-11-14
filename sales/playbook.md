# Cartsmith 销售手册：从找客户到成交、到收月费

> 这份是「照着做就可以」的完整流程。话术原文在 `sales/scripts.md`，价格在 `sales/packages.html`，AI 助理用法在 `sales/agent/README.md`。
> 最重要的三件事：**每天联系 10–20 个（Instagram 私信）、24 小时内回复、成交后把第 1 个月做好让他继续付月费。**
> 2026-11-07 更新：工作室联系方式只用 **Instagram @cartsmith.studio**（暂时不用 WhatsApp）；网站在 Netlify（`cartsmithstudio.com`）；免费样板用 `site/build.py --preview` 做、放 Netlify Drop。

---

## 0. 全流程

```
找客户 → 第一次私信 → 跟进（第 3 天）→ 有兴趣：免费样板（1–2 天）→ 15 分钟通话 → 24 小时内报价
→ 50% 订金 + 签约 → 收资料 → 建站（测试站）→ 修改 → 50% 余款 → 上线 → 第 1 个月免费维护 → 转月费
                  └ 没回：第 10 天最后一条，然后停                └ 客人自己找来（网站 AI 客服 / 表单 / IG / 视频）直接跳到「样板」
```

| 阶段 | 目标数字（每 100 个联系，参考） | 你要做的 | AI 助理帮你 |
|---|---|---|---|
| 找客户 | 每天 20 个 | 在 Shopee / TikTok / IG 找、填名单 | 打分、写个人化开场白 |
| 第一次私信 | 20 条/天 | 看过、改口气、**自己按发送** | `today` 产生清单和一键打开对话的链接 |
| 回复 | 15–25 个 | 1 小时内回（工作时间） | `reply` 分析意图、起草回信 |
| 免费样板 | 8–12 个 | 填 preview.json、一个指令做好、拖进 Netlify Drop、录 1 分钟视频 | — |
| 通话 | 4–8 个 | 15 分钟，多听少讲 | — |
| 报价 | 3–6 个 | 24 小时内发 | `proposal` 把笔记变报价单 |
| 成交 | 1–3 个 | 收订金、签约 | — |

---

## 1. 每天的固定流程（约 2 小时）

| 时间 | 做什么 | 指令 / 文件 |
|---|---|---|
| 09:30（10 分钟） | 看网站询价（Netlify → Forms，也会寄电邮）、Instagram 新私信，**先回客人** | Netlify Forms、IG |
| 09:40（40 分钟） | 找 20 个新的潜在客户，每个记 1 个「具体观察」 | `sales/prospects.csv` |
| 10:20（5 分钟） | AI 写开场白 + 产生今天清单 | `draft-openers` → `today` |
| 10:25（30 分钟） | 一条一条看过、改、**自己发送**，每发一条记录 | `mark <id> sent` |
| 下午（30 分钟） | 处理回复、做样板、约通话 | `reply`、`make-preview.sh` |
| 晚上（15 分钟） | 发视频 / 回留言 | `content/calendar.csv` |
| 星期日 | 看数字，调整话术 | `report` |

**规则：** 只在早上 9 点到晚上 9 点发信息；不连发好几条；对方没先发语音就不要发语音；对方说不要就 `mark <id> dnc`，永远不再联系。

---

## 2. 找客户（每个 1–2 分钟）

**去哪里找：**
1. Shopee：搜「行业关键词 + malaysia」（例：serum malaysia、tudung bawal、sambal bilis），筛选「Local」卖家
2. TikTok Shop：搜同样的词，挑**常开直播**、有自己品牌的
3. Instagram：#localbrandmalaysia #skincaremalaysia #tudungmurah #kuihraya，挑简介只有 WhatsApp / Linktree、没有网站的（我们用 IG 私信联系他们）
4. Facebook 卖家群组（先帮忙回答问题，不要一进去就发广告）

**值得联系的（打分，每项 1 分，4–5 分先联系）：**
- 有清楚的品牌名和 logo
- 有明显销量：评价大约 300–20,000、或常开直播
- 最近 7 天有发文
- 没有网站，或网站很旧、手机不好用
- 看得出有预算（专业产品照、投广告、实体店）

**不找：** 大集团旗舰店、没有产品的 dropshipper、卖仿冒或违禁品的。

**填名单（最重要的一栏是 observation）：**

| 栏位 | 例子 |
|---|---|
| business_name | Glow Lab MY |
| niche / platform | skincare / shopee |
| contact_channel / contact_handle | instagram / @theirbrand（只记录公开的商业联系方式） |
| language | bm / en / zh |
| 5 个打分栏 | 1 或 0 |
| **observation** | 「Vitamin C serum 1,200 条评价，很多人说回购第 3 瓶」 |

> 不要用程式自动抓 Shopee / IG 的资料（违反平台规则、会被封号）。手动找 20 个，品质比 200 个群发好。

---

## 3. 第一次私信

1. `python3 sales/agent/sales_agent.py draft-openers` → AI 按「具体观察」写开场白（对方的语言）
2. `python3 sales/agent/sales_agent.py today` → 产生 `sales/today/<日期>.md`，每个人一段信息 + 一键打开对话的链接
3. **看过、改成你的口气**（AI 写的只是草稿）→ 点链接 → 自己按发送
4. `python3 sales/agent/sales_agent.py mark p012 sent` → 自动排 3 天后跟进

**一条好的开场白 = 你是谁 + 具体观察 + 一个问题 + 免费、没压力的下一步。** 范例见 `sales/scripts.md` §1。

**用哪个渠道：** 暂时只用 **Instagram 私信**（用 @cartsmith.studio 发）。没有 IG 的品牌先跳过。**不要用 Shopee 聊天推销。** IG 不能预先填好文字：先复制 `today` 清单里的信息，再点链接打开对话贴上。

---

## 4. 跟进节奏

| 天 | 做什么 | 范例 |
|---|---|---|
| 第 0 天 | 第一次私信 | scripts.md §1 |
| 第 3 天 | 给一个有用的资讯：用费用计算器算他的单 | scripts.md §2 |
| 第 10 天 | 最后一条，礼貌告别 | scripts.md §3 → docs/04 §4.5 |
| 之后 | 停。标记 `no_response` | `mark` 第 3 次 sent 会自动标记 |

`today` 每天会自动把到期的人列出来，AI 帮你起草跟进信息。

---

## 5. 对方回复了

1. **1 小时内回**（工作时间）。回得快是小工作室最大的优势。
2. `python3 sales/agent/sales_agent.py reply p012 "对方的原话"` → AI 判断意图（有兴趣 / 问问题 / 异议 / 不要）+ 起草回信
3. 目标只有一个：**让他同意你做免费样板**，或直接约 15 分钟通话。

| 对方说 | 你的下一步 |
|---|---|
| 「多少钱？」 | 简短给价格范围（Starter RM800 起，上线后第 1 个月维护免费；节日预购网店 RM399；也可以月付 RM169）→ 样板已经做好，发给他看 |
| 「可以看看」 | 要店铺链接 + logo + 3–5 款主打产品 → 做样板 |
| 「现在没空 / 以后再说」 | 「好的，我 [日期] 再问你一次可以吗？」→ 在 notes 写日期 |
| 「不需要」 | 「明白，谢谢你的时间 🙏 祝生意越来越好！」→ `mark dnc` |
| 异议 | 看第 11 节 |

---

## 6. 免费样板首页（1–2 天内交出，45 分钟做好）

**跟对方要（都用公开资料就可以）：** 店铺链接、logo（可以从 IG 头像）、3–5 款主打产品（名称、价格、照片——可以用他店里公开的照片，**样板只给他本人看**）。

**做法（详细步骤：`docs/09-netlify-guide.md` 第 D 部分）：**
1. 复制 `templates/preview.example.json` 到 `clients/p012/preview/preview.json`，填：模板、名字、颜色（从 logo 取）、4–8 个产品、删除日期（≤14 天）、密码
2. 照片放 `clients/p012/preview/img/`（这个文件夹不进 git）
3. `python site/build.py --preview clients/p012/preview/preview.json` → 产生 `site/` 文件夹
4. 拖进 https://app.netlify.com/drop → 改成不好猜的网址名
5. 手机打开样板，录 1 分钟屏幕（边滑边讲：首页 → 产品 → 选规格 → 加入购物车 → 结账）
6. 在 Instagram 发出（scripts.md §3）：网址 + 密码 + 视频 + 删除日期
7. `mark p012 preview_sent --url <网址>`

（以后有服务器的话，也可以用服务器版 `make-preview.sh`，有真正的密码保护。）

> 样板有密码、不被搜索引擎收录、14 天没成交就删除（`cleanup-previews.sh`）。

---

## 7. 15 分钟通话

**开场（1 分钟）：** 「我先问你几个问题，再给你看样板和建议，15 分钟内结束。」

**问问题（6 分钟，多听少讲）—— 挑 5–6 个：**
1. 现在每个月大概多少订单？从哪里来？
2. 回头客大概占多少？
3. 客人怎么联系你、怎么下单？
4. 你希望网站帮你解决什么？3 个月后怎样算成功？
5. 产品有多少款？有颜色 / 尺寸吗？
6. 有送东马吗？用哪家物流？
7. 有 SSM 和公司户口吗？（付款网关通常要用对方的商业注册开）
8. 谁负责上产品、处理订单？
9. 预算大概多少？希望什么时候上线？
10. 除了你，还有谁要一起决定？

**给他看（4 分钟）：** 打开他的样板，**对着他刚才说的问题讲**（例：「你说回头客多 → 这里他可以直接下单，不用再私信问价」）。

**推荐一个套餐（3 分钟）——照这样讲：**
> 「我建议 [Starter]：一次性 RM800，大约 10 个工作天上线。上线后**第一个月维护免费**——你先用一个月，觉得有帮助再开始月费，基础维护每月 RM99。你是我们前 3 个客户之一的话，先付一半订金，做好你满意才付尾款，7 个工作天上线，维护免费两个月，条件是上线后给我一段真实评价。不想一次付也可以月付，每个月 RM169，12 个月。一般付款是 50% 订金开工，50% 上线前付。付款网关和域名都用你自己的名字开，网站付清后就是你的。」

**结尾（1 分钟）：** 「没问题的话，我今天发报价单给你，收到订金就开工。你觉得怎样？」

**怎么选套餐：**

| 情况 | 推荐 |
|---|---|
| 第一次做网站、产品 ≤ 20 款 | Starter |
| 产品多、有颜色尺寸、准备投广告 | Growth |
| 批发 / 工厂、不需要网上结账 | Catalog |
| 预算真的不够 | Starter + 分两期付；**不要再降价** |

---

## 8. 报价单（通话后 24 小时内）

1. 把通话笔记存成 `notes.txt`
2. `python3 sales/agent/sales_agent.py proposal p012 --notes notes.txt` → `clients/proposals/p012-<日期>.md`
3. 检查 AI 列出的「发出前要确认」，补上银行资料
4. 转成 PDF，用 Instagram 或电邮发出
5. `mark p012 proposal_sent` → 3 天后提醒你跟进

---

## 9. 成交

**3 天后还没回：**
> 「嗨 [名字]，报价单有收到吗？有任何地方想调整，或者想先看哪个部分，跟我说就好 🙂」

**常见的最后一步：**

| 对方说 | 你回 |
|---|---|
| 「我想一想」 | 「当然。你主要在考虑哪一点？价格、时间，还是效果？」→ 针对那一点回答 → 约好下次联系的日期 |
| 「可以便宜一点吗？」 | 「价格是固定的，这样对每个客户都公平。如果预算紧，可以先做 Starter，以后再升级；订金和余款也是分开付。」 |
| 「好，开始吧」 | 马上发付款资料（下面） |

**收订金的流程：**
> ⚠ 收第一笔订金之前，**我们自己一定要先完成 SSM 注册**（独资，ezBiz 网上办理，用商号每年约 RM60）。没注册就做生意是违法的（Registration of Businesses Act 1956），也开不了商业户口。见 `docs/00-decisions.md` #10。

1. 发 50% 订金资料：银行名称、户口名称（SSM 注册名）、户口号码 / DuitNow
2. 发合同（律师审过的模板，见 `sales/contract-checklist.md`）→ 双方签名（电子签也可以）
3. 收到钱 → 开收据（用 SSM 名称）
4. `mark p012 won` 🎉
5. 发欢迎信息 + 资料表（docs/04 §4.7、`templates/client-brief.md`）
6. 按 `docs/06-delivery-sop.md` 开始交付

**一定要做到：** 收订金才开工；收余款才上线；付款网关、域名用客户自己的名字。

---

## 10. 上线后：把「第 1 个月免费」变成长期月费

月费是长期收入，这一步最重要。

| 时间 | 做什么 |
|---|---|
| 上线当天 | 交接教学（录下来）、交接文件、「用得顺吗？」 |
| +3 天 | 确认订单、邮件、付款都正常 |
| +7 天 | 主动帮他做一个小修改（换图、上新品），让他感受到「有人在管」 |
| **+21 天** | 发第一份「免费月报」：备份几次、更新了什么、网站速度、订单数（只写真的） |
| **+25 天** | 问要不要继续月费（下面的话术） |
| +30 天 | 开始收月费；请评价和介绍（docs/04 §4.8） |

**+25 天的话术：**

**中文**
> 嗨 [名字]，网站上线快一个月了 🙂 这个月我帮你做了：每天备份、[X] 次更新、[修改内容]，网站一直正常。免费的维护月到 [日期] 结束，之后基础维护是每月 RM99（备份、更新、监控、每月 30 分钟小修改）。要继续的话，我发付款资料给你；如果想自己管，我会把完整备份交给你。你觉得呢？

**English**
> Hi [Name], your website has been live for almost a month 🙂 This month I handled daily backups, [X] updates and [changes], and everything has been running smoothly. The free maintenance month ends on [date]; after that Basic maintenance is RM99/month (backups, updates, monitoring, 30 minutes of small changes). Shall I send the payment details to continue? If you'd rather manage it yourself, I'll hand over a full backup. What do you think?

**Bahasa Malaysia**
> Hai [Nama], website anda dah hampir sebulan live 🙂 Bulan ini saya uruskan backup harian, [X] kemas kini dan [perubahan], dan semuanya berjalan lancar. Bulan maintenance percuma tamat pada [tarikh]; selepas itu Basic maintenance RM99/bulan (backup, kemas kini, pemantauan, 30 minit perubahan kecil). Nak saya hantar butiran bayaran untuk teruskan? Kalau nak urus sendiri, saya serahkan backup penuh. Macam mana?

---

## 11. 异议快查表

| 对方说 | 你回（重点） |
|---|---|
| 太贵了 | 先从 Starter；订金 + 余款分开；用计算器算多少张回头客的单就回本 |
| Shopee 已经够了 | 不用离开 Shopee；网站是给回头客、批发客、广告用的，客户资料是你的 |
| 网站又没人来 | 对，网站本身不会带客人；客人来自你的粉丝、直播、包裹 QR 卡、广告——这些入口我帮你设好 |
| 没时间管 | 所以有月费维护：上新品、改价格、备份更新我来 |
| 朋友会做 | 很好！以后需要有人长期维护、处理付款和物流设定，随时找我 |
| 能保证有订单吗 | 不能，谁保证都要小心；我保证网站好用、付款运费正确、速度快、有人管 |
| 你是新人 | 对，所以前 3 个客户满意才付尾款、7 天上线保证；先看免费样板 |
| 可以免费用一两个月吗 | 样板免费、上线后第 1 个月维护免费；整个网站没办法免费做 |
| 不要月费可以吗 | 可以，上线后给完整备份，你自己放主机，之后更新备份要自己处理 |

---

## 12. 转介绍和合作伙伴

- **客户介绍：** 朋友成交 → 介绍人得一个月免费维护或 RM200（二选一）。上线时和 +30 天各提一次。
- **合作伙伴：** 产品摄影师、会计师 / 公司秘书、电商讲师、物流代理。对方介绍的客户付清后，给首个项目金额 10%。邀请话术见 docs/04 §10。

---

## 13. 每周复盘（星期日 15 分钟）

1. `python3 sales/agent/sales_agent.py report --days 7`
2. 看「最弱的一步」：
   - 回复率低 → 「具体观察」不够具体？渠道不对？
   - 有回复但不要样板 → 先算费用给他看
   - 有样板不约通话 → 附录屏视频、跟进更快
   - 有报价不成交 → 信任感（满意才付尾款、7 天上线保证）和更小的第一步（节日预购网店 RM399、月付 RM169）
3. 只改一个地方，下周再看

**第 30 天目标：** 联系 300 个 → 1 个付费客户。做不到也没关系，数字会告诉你哪里要改。

---

## 14. 不要做的事

- 不群发、不买名单、不用程式自动发信息（会被封号，也违反我们的守则）
- 不制造假的急迫感（「今天最后一天」——除非是真的）
- 不写假评价、不说「已经服务 100 个客户」
- 不说竞争对手坏话
- 对方说不要，就停
- 潜在客户的资料只用来联系他本人
