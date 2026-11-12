# Sireh & Salt — 餐厅精品示范网站（2026-11-12）

- **是什么：** 虚构的现代马来西亚餐厅（Petaling Jaya），给餐饮客户看「做好的网站可以做到什么」。不是真实店家。
- **网址：** https://cartsmithstudio.com/demo/sireh-salt/ （noindex；顶部写明 Demo；不收钱、不送出任何资料）
- **店名查证（2026-11-12）：** 上网搜「Sireh & Salt」「Sireh and Salt」「sirehandsalt」，没有同名的餐厅或品牌。
- **照片：** Pexels（可商用、不用署名），来源在 `image-sources.md`，下载设定在 `stock.json`（`python3 scripts/local/fetch-stock-images.py site/flagships/sireh-salt/stock.json site/flagships/sireh-salt`）。
- **评价：** 首页的 4 则评价是**示范评价**：每则标「Sample review」、名字虚构、区块标题和说明都写明是示范（俊宇 2026-11-12 同意示范网站可以放例子）。客户的专属样板和正式网站不放编出来的评价。
- **功能：** 菜单（选项、加料、售完、筛选）· 自取 / 外送下单（外送区用邮区判断、最低消费、免运门槛）· 网上付款（示范）或 WhatsApp 下单（信息自动填好，wa.me 不指定号码）· 优惠码 SIREH10 和礼券码 · 订位（剩几桌、8 人以上订金、加入日历 .ics）· 节日预购（圣诞、农历新年 2027-02-06、开斋节预计 2027-03-10；截止日、倒数、剩几份、订金）· 外烩询价 · 礼券 · 营业中 / 已打烊（马来西亚时间）· 地图 · **老板后台示范**（订单、订位、售完开关、改价、节日剩余数量、今天休息 / 很忙）。
- **资料只存在浏览器：** localStorage（`ss_*`），所以老板后台改了，菜单页马上看到；「Reset the demo」清掉。
- **程式：** `layout.html`（外框）+ `pages/*.html`（每页内容）+ `style.css` + `app.js`（资料和功能都在这里）。`python3 site/build.py` 产生 `dist/demo/sireh-salt/`。
- **测试：** `python3 -m http.server 8790 -d site/dist` 然后 `node site/tools/check-flagships.js http://localhost:8790`（手机和电脑、每个流程）。
