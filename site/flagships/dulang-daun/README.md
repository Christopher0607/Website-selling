# Dulang & Daun — 电商精品示范网站（2026-11-12）

- **是什么：** 虚构的本地手作食品礼盒品牌（参巴、娘惹糕饼、蕉片、咖啡、节日礼盒），靠 IG / WhatsApp 卖货的商家最需要的网店。不是真实品牌。
- **网址：** https://cartsmithstudio.com/demo/dulang-daun/ （noindex；顶部写明 Demo；不收钱、不送出任何资料）
- **店名查证（2026-11-12）：** 上网搜「Dulang & Daun」「Dulang and Daun」「dulangdaun」，没有同名的品牌或商家（只有 dulang、daun 这两个字的一般意思）。
- **照片：** Pexels（可商用、不用署名），来源在 `image-sources.md`，下载设定在 `stock.json`。部分照片是示意（例如 kaya 用椰子照片），页面上写明 placeholder。
- **评价：** 首页 4 则是**示范评价**（标「Sample review」、名字虚构、区块写明示范）。
- **功能：** 商品选项（尺寸、口味、研磨）· 选项缺货 / 整个缺货 →「Notify me」（WhatsApp 号码）· 购物车抽屉 + 免运进度条（西马 RM150、东马 RM250）+ 搭配推荐 · 买 3 包蕉片 RM27 · 自组礼盒（盒子大小、装满才能加入、缎带、卡片）· 结账：州属判断东西马、新鲜 kaya 不寄东马、标准 / 快递、送礼（卡片、箱内不放价钱）、优惠码 WELCOME10、网上付款（示范）或 WhatsApp 下单（信息自动填好）· 订单追踪（示范单 DD-2041 / 012-345 6789）· 公司送礼（数量折扣 5/10/15%、估价、询价表）· 节日寄送截止日（圣诞、农历新年、开斋节，东马较早）· **老板后台示范**（订单：付款→包装→寄出加追踪号→送达；缺货开关；等候名单 + 一键通知；截止日）。
- **资料只存在浏览器：** localStorage（`dd_*`）；老板后台「Reset the demo」清掉。
- **程式：** `layout.html` + `pages/*.html` + `style.css`（以餐厅样板为底，换颜色字体，加网店元件）+ `app.js`。`python3 site/build.py` 产生 `dist/demo/dulang-daun/`。
- **测试：** `python3 -m http.server 8790 -d site/dist` 然后 `node site/tools/check-flagships.js http://localhost:8790`。
