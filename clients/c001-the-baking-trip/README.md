# c001 — The Baking Trip（第一个客户，准备中）

> 2026-11-15 俊宇：先当作他们已经要了，把我们的东西都准备好。**店家还没有正式说要**：工作台卡片的状态照实际情况，不改成「成交」。

## 现在的状况
- 2026-11-15 到店：店主看了网店和后台，说「挺细心」；店里太忙没时间详谈。15:33 用 WhatsApp 把**静态样板**发给店家（`previews.cartsmithstudio.com/m-the-baking-trip-69eefe98/`，密码在工作台，**链接和密码都不换**，样板 2026-11-28 删除）。
- 真网店（外观跟样板一样）：`https://preview-tbt.cartsmithstudio.com`，店家后台 `/dian/`。帐号密码在工作台卡片的「网店 · 店家后台」区块，**以后都不换**；交付时才换成店家的域名，店家自己设密码。
- 站点资料：`sites/preview-tbt/`（README 有完整说明）。

## 文件（报价单、合约草稿、订金单、收据、资料清单）
- 产生：`python3 scripts/local/client-docs.py clients/c001-the-baking-trip/client.json` → `out/` 里的 PDF（不进 git，repo 是公开的）。
- 方案：报价单推荐 **Growth RM1,600**（跟样板一样：时段限量、圣诞预购、优惠码；产品 27 样，Starter 只到 20 样），另附 Starter RM800（前 5 家客户价）和月付 RM169 × 12。店家选别的方案，就改 `client.json` 的 `invoice.package` 再产生一次。
- 前 3 位客户的保障（决定第 6 项）：50% 订金、满意才付尾款；7 个工作天上线，迟一天减 RM50；维护免费 2 个月；换真实评价和案例授权。
- **还空着：** 我们的 SSM 号码、地址、电邮、电话、商业户口（`client.json` 的 `studio`）；店家的注册名称和 SSM 号码（`client`）。俊宇办好 SSM 和户口后填上，再产生一次。
- 合约是草稿：**第一次用之前请律师看**（`templates/service-agreement.md`）。

## 成交后的步骤
1. **俊宇：** SSM 注册 + 商业户口（`docs/13-business-setup.md`），把号码给 Claude Code，产生正式的订金单。
2. 店家签合约、付 50% 订金 → 开收据（`receipt` 填金额、日期、方式，再产生一次）。
3. 收资料（资料清单）：
   - 价钱、照片、注册名称和 SSM 号码、电邮、DuitNow QR；
   - 付款网关（用店家名义开）、域名（用店家名义买）；
   - 取货规则、圣诞的产品和价钱、法律页面里方括号的答案。
4. Claude Code 在预览站改：价钱、照片、文字。
   - 照片：换掉 `images-src.json`，或者直接在后台上传。
   - Growth 的「代客下单」设定 `owner_manual_orders` 打开。
   - 接付款网关的插件，开好店家的员工帐号。
   - 店家在手机上检查，要改的照改。
5. **上线**（店家满意、付尾款之前）：
   - 店家的域名加 A 记录指到服务器；
   - 用服务器小帮手（ops job）跑 `sudo /opt/agency/scripts/server/go-live.sh preview-tbt --domain <店家域名> --owner-user thebakingtrip --owner-email <店家电邮> --remove-user tbttest --yes`。
   - 这个指令会：先备份 → 关示范模式和示范付款 → 删测试订单 → 换域名和 SSL → 开放给 Google → 印出店家「自己设密码」的连结。
   - 2026-11-15 已经在本机复制的网店上测试通过。
   - 上线前店家要在后台上传自己的 DuitNow QR，不然客人看不到 DuitNow 付款。
6. 交付：
   - 30 分钟教店家用后台，录一段短片；
   - 收尾款、开收据；
   - 维护费免费 2 个月，到期前 7 天提醒店家。
