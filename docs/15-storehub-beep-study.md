# 15 — 向 StoreHub / Beep 学习（2026-11-17）

俊宇：「看看别人的系统（Beep），我们从他们身上学习。他们的系统店主轻松接入，而且可以直接接入 StoreHub POS，相当于无缝接入。」

> 资料是 2026-11-17 在网上查的，大多数来自 StoreHub 自己的网站和博客（是他们自己的说法，没有第三方证实）。价钱和功能会变，用之前再查一次。
> 我们只学「做法」，不抄他们的设计、文字和图片（CLAUDE.md 诚信守则）。

## StoreHub 在做什么

| 部分 | 他们的做法 | 来源 |
|---|---|---|
| 收银机（POS） | 店里的收银机 + 后台（BackOffice）。软件约 RM102–122/月起（年付；进阶方案更贵），硬件约 RM1,690 起 | storehub.com/my/blog/top-pos-systems-fnb-business-klang-valley；storehub.com/blog/storehub-vs-qashier-pos-system |
| 桌上扫码点单「QR Order & Pay」 | 客人扫桌上 QR → 看菜单（有照片）→ **在手机上付款** → 单子直接进收银机和厨房画面（KDS）。付款跟每笔销售自动对上，不用晚上对数；钱约 2 个工作天到帐；断网时照样用收银机点单，恢复后自动同步 | storehub.com/my/qr-order-pay；storehub.com/my/blog/beep-qr-code-ordering-system |
| 开通 | 已经用 StoreHub 收银机的店：在后台按「启用」就有，不用另外装点单系统 | 同上 |
| 网上外送 / 自取「Beep Delivery」 | 店家自己的点单连结；外送范围最远 20 km；**自动叫骑士**（自己的骑士或他们的物流伙伴）；客人看得到即时进度；收 **9%** 交易费（他们说外卖平台 25–35%） | storehub.com/my/online-ordering |
| 一份菜单到处用 | 后台改一次价钱 / 库存 / 卖完，收银机、桌上点单、外送全部马上跟着变；堂食、外带、外送、外卖平台的单都进同一个厨房画面 | storehub.com/my/qr-order-pay；storehub.com/my/fb/restaurants |
| 会员和回馈金（Cashback） | 付款后输入手机号码就加入；下次来用回馈金；会员等级、积分；店家拿到顾客名单可以发 SMS 促销。要进阶方案以上 | care.storehub.com（cashback、membership 文章） |
| 电子发票 | 收银机自动开 LHDN 合规收据和电子发票，也可以帮店家每月提交 | storehub.com/my/qr-order-pay |
| 给其他系统接 | **找不到公开的开发者 API**：别的系统（包括我们）没办法直接接 StoreHub 收银机，除非 StoreHub 另外给合作伙伴权限（要问他们） | 搜寻结果（没有找到 developer API 文件） |

**他们「无缝」的原因**：收银机、点单、厨房、外送、会员、报表都是他们自己的同一套系统，所以不用「接」。

## 俊宇补充的收费资料（2026-11-17，俊宇提供，来源是 StoreHub 官网、博客和商家贴文；我没有逐条再查）

- 外送订单：每单 9% 交易手续费（他们拿来比 GrabFood / Foodpanda 的 25–35%）。
- 顾客用店家专属 Beep 连结**自取**：抽佣低至 2%。
- 没有开通费；**网上付款另外收约 1.5–2.5% 付款网关费**（FPX、卡、GrabPay、TNG、Boost），每周结算单分开列。
- 顾客那边：菜单价通常跟堂食一样；外送另加按距离算的运费，适用时加 6% SST。
- **前提：要先订 StoreHub POS**（Beep 和桌上 QR 点单包在马来西亚所有方案里）：Starter 约 RM122/月起、Advanced 约 RM235/月起、Pro 约 RM471/月起（年付参考价）。
- 送货：自己的人送，或接他们的物流伙伴（Lalamove、GoGet 等）自动派。

**跟我们比（同一家小餐厅，一年）**：Beep 至少 RM122 × 12 = RM1,464 的 POS 月费，加上每张外送单 9%、自取单 2%、网上付款 1.5–2.5%；我们是一次性 RM800 起 + 每月 RM99 维护费（第一个月免费），**不抽成**，只有付款网关自己的手续费。讲的时候只讲事实，不贬低别人。

来源（俊宇提供）：https://www.storehub.com/online-ordering ；https://www.storehub.com/my/blog/how-much-your-online-food-ordering-system-really-costs-you ；https://www.storehub.com/blog/beep-food-delivery-app-launch ；https://www.storehub.com/my/pricing ；StoreHub 和商家的 Facebook 贴文。

## 我们现在有什么（agency-core + WooCommerce + 手机店家后台 /dian/）

| | 我们 | StoreHub |
|---|---|---|
| 店家自己的网站（品牌、菜单、订位、节日预购、礼券、外烩询问） | ✅ 这是我们的强项 | 只有点单连结，没有完整网站 |
| 网上点餐（自取 / 外送区域 / 时段 / 优惠码） | ✅ | ✅ |
| 桌上扫码点单 → 厨房画面 → 桌子账单 → 今日结算 | ✅（客人到柜台付、账单送到桌上，或**在手机上先付**；2026-11-17 起，agency-core 1.11.0） | ✅（客人**在手机上付**） |
| 一份菜单到处用（网站、桌上点单、后台） | ✅（同一份 WooCommerce 产品） | ✅ |
| 柜台收银机（店员替走进来的客人下单、收钱） | ✅ 轻量版「收银」画面（2026-11-17，agency-core 1.10.0）：堂食 / 外带 / 电话 / GrabFood / ShopeeFood，现金找钱，进同一个厨房和结算；没有打印收据、没有钱箱 | ✅ |
| 外送自动叫骑士 + 即时追踪 | ❌（现在是店家自己安排） | ✅ |
| 会员 / 回馈金 | ❌（有顾客名单、优惠码） | ✅ |
| 厨房打印机 | ❌（只有厨房画面） | ✅（KDS；打印机没写） |
| LHDN 电子发票 | ❌ | ✅ |
| 抽成 | 0%（只有付款网关的手续费） | 外送 9%；软件 + 硬件月费 |
| 价钱 | 一次性 RM800 起 + 每月 RM99 维护费 | 软件约 RM102+/月 + 硬件 RM1,690+ + 附加功能 |

## 可以学的（按对俊宇卖网站的帮助排）

1. ✅（2026-11-17 做好，1.11.0）**桌上「点单就付款」（选择性）**：客人在手机付款（FPX / 电子钱包 / 卡，用店家自己名义开的付款网关），厨房收到的是已付款的单，晚上不用对数。保留「到柜台付」给不想用的店。
2. ✅（2026-11-17 做好，1.10.0）**柜台收银（轻量版收银机）**：把店家后台的「代客下单」做成柜台收银画面：店员在平板替走进来的客人点单、选付款方式（现金 / DuitNow / 卡），单子进同一个厨房画面和「今日结算」。没有收银机的小店就不用另外买 StoreHub。
3. **接店家现有的收银机**：StoreHub 没有公开 API，接不了（除非 StoreHub 给合作伙伴权限）。**Loyverse**（免费收银机，小咖啡馆常用）有公开 API，可以把我们网站和桌上的单自动变成 Loyverse 的收据（POST `/v1.0/receipts`）。其他牌子（Qashier、Eats365…）有客户用到再查。
4. **会员回馈金**：付款后输入手机号码，下次消费可以折抵；店家后台看到常客名单。
5. **外送自动叫 Lalamove**：Lalamove 有公开 API（v3，马来西亚可用：报价、下单、司机即时位置、状态通知）。外送单一确认就自动叫车、把追踪连结给客人。需要店家自己的 Lalamove 商业帐号，运费照 Lalamove 收。
6. **店家自己开通**：店家后台的开店引导：用 Excel 贴菜单（或我们帮忙从照片打）、设营业时间和外送区域、一键印每张桌子的 QR 立牌，当天上线。
7. **厨房打印机**：很多厨房习惯纸单。要先查马来西亚常见的热感打印机怎么从网页打印。
8. **LHDN 电子发票**：要先查现在的门槛（小店可能不用），再决定。

## 卖的时候怎么说（不贬低别人，只讲事实）

- 「你自己的网站 + 网上点餐 + 桌上点单 + 厨房画面，**不抽成**；一次性 RM800 起，之后每月 RM99 维护费，第一个月免费。」
- 已经用 StoreHub 的店：我们的网站可以放他们的 Beep 点单连结，或者用我们自己的点单（0% 抽成）；两套收银机不会自动接在一起（StoreHub 没有开放接口），这一点要讲清楚。

## 来源（2026-11-17 查）

- https://www.storehub.com/my/online-ordering
- https://www.storehub.com/my/qr-order-pay
- https://www.storehub.com/my/blog/beep-qr-code-ordering-system
- https://www.storehub.com/my/fb/restaurants
- https://www.storehub.com/my/blog/top-pos-systems-fnb-business-klang-valley
- https://www.storehub.com/blog/storehub-vs-qashier-pos-system
- https://care.storehub.com/en/articles/8181413-cashback-how-does-it-work
- https://care.storehub.com/en/articles/11091849-how-to-set-up-membership-tiers-and-rewards
- https://loyverse.com/loyverse-pos-api
- https://developers.lalamove.com/
- https://www.lalamove.com/en-my/business/api-solutions
