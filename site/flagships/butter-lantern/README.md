# Butter & Lantern（示范网站：RM399 节日预购网店）

- **是什么：** RM399「节日预购网店」这个产品的示范（2026-11-13 第 2 版）。不是一页 WhatsApp 下单，而是一间真正的节日网店的样子：最多 10 样产品（剩几份、早鸟价、截止倒数）、购物车、自取 / 外送时段、网上付款（FPX、信用卡、电子钱包）或 DuitNow QR + 上传收据、订单确认电邮、查订单、店家后台。虚构的家庭烘焙坊，不是真实店家；不收任何钱、不送出任何资料。
- **网址：** https://cartsmithstudio.com/demo/butter-lantern/ （加 `?fest=cny` / `raya` / `xmas` / `val`；noindex；顶部写明 Demo）
  - 结账：`checkout.html`；订单页 / 查订单：`order.html`；店家后台：`owner.html`
- **四个节日（一个网店换装）：**
  - 农历新年 `cny`：中文为主、英文小字；8 样华人年饼（黄梨球、凤梨酥、Love Letter 蛋卷、花生饼、腰果饼、杏仁饼、年糕已售完、礼盒）
  - Hari Raya `raya`：马来文为主；7 样 kuih raya
  - Christmas `xmas`：英文；7 样圣诞烘焙
  - Valentine's Day `val`：英文；7 样（花 + 巧克力有选项、熊熊礼盒可写名字；鲜花和杯子蛋糕不能快递）
  - 没指定时自动显示下一个节日；过了截止日，首页变成「留号码，开放时通知你」
- **日期（要更新）：** 截止日 CNY 2027-01-31、Raya 2027-03-03、Christmas 2026-12-19、Valentine's 2027-02-10，都写在 `app.js` 的 `FESTS`。**Raya 2027 过后（约 2027-03）要把四个节日的日期换成下一年。**
- **资料：** 只存在浏览器 localStorage（`bl_*`：购物车、库存、订单、设定）。后台的 12 张订单是示范资料；后台「重设示范」可以清掉。
- **程式：** `layout.html`（Demo 横幅、节日切换、页首、购物车抽屉、商品选项、付款视窗）+ `pages/`（`index`、`checkout`、`order`、`owner`）+ `style.css`（每个节日的颜色、花纹、吊饰都用 CSS 变数）+ `app.js`（节日资料、库存、运费、时段、付款、订单、后台）。
- **测试：** `node site/tools/check-flagships.js http://localhost:8790`（下单、库存、付款、查订单、后台）+ `node site/tools/check-times.js http://localhost:8790`（深夜、截止前后）。
- **照片：** Pexels（来源和授权在 `image-sources.md`）。Pexels 找不到真的花生饼照片：`cny-peanut.webp` 是从 36824910 手动裁掉盖子上开斋节吊饰的部分。真正交付时用客户自己拍的产品照。
- **卖给客户时：** 示范是静态的 JS 模仿；真正交付做在 **WordPress + WooCommerce**（客户名义的付款网关，审批要几天；在那之前先用 DuitNow QR + 上传收据），换成客户的店名、产品、价钱、照片、日期，3 个工作天上线。包 3 个月主机和维护；之后免费暂停、下个节日 RM149 重开，或 RM49 / 月继续开；换节日造型 RM99。
