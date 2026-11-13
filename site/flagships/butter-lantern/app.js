/* Butter & Lantern — demo festive pre-order shop (Cartsmith Studio, v2 2026-11-13).
   The RM399 product as a working demo: up to 10 items, cut-off countdown, stock left, cart, collection / delivery slots,
   online payment (FPX, card, e-wallet) or DuitNow QR with a receipt, order email, order tracking and the owner's dashboard.
   Everything runs in this browser (localStorage bl_*). Nothing is charged, sent or stored anywhere else.
   ?fest=cny|raya|xmas|val picks the festival; the shop changes colour, ornaments, products and language with it. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load(k, d) { try { var v = localStorage.getItem('bl_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch (e) { /* private mode: the demo still works for this page */ } }
  function rm(n) { return 'RM' + (Math.round(n * 100) / 100).toFixed(2); }
  function my() { return new Date(Date.now() + 8 * 3600e3); } // Malaysia time, read with getUTC*
  function today() { return my().toISOString().slice(0, 10); }
  function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dow(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function q(name) { return new URLSearchParams(location.search).get(name); }
  var ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>'
  };

  // ------------------------------------------------------------------ language: CNY in Chinese first, Raya in Malay first, both with small English
  var LANG = 'en';
  function L(zh, ms, en) { return LANG === 'zh' ? zh : LANG === 'ms' ? ms : en; }
  function B(zh, ms, en) { var m = L(zh, ms, en); return LANG === 'en' || m === en ? esc(m) : esc(m) + '<small class="en">' + esc(en) + '</small>'; }
  function T(a) { return a[0]; } // item text: [main, english] or [english]
  function TB(a) { return LANG === 'en' || !a[1] ? esc(a[0]) : esc(a[0]) + '<small class="en">' + esc(a[1]) + '</small>'; }
  var WD = { zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  var MO = { ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  function fmtDay(s) { var d = new Date(s + 'T00:00:00Z'), m = d.getUTCMonth(), n = d.getUTCDate(), w = d.getUTCDay(); return LANG === 'zh' ? (m + 1) + '月' + n + '日（' + WD.zh[w] + '）' : WD[LANG][w] + ' ' + n + ' ' + MO[LANG][m]; }
  function fmtShort(s) { var d = new Date(s + 'T00:00:00Z'); return LANG === 'zh' ? (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日' : d.getUTCDate() + ' ' + MO[LANG][d.getUTCMonth()]; }

  // ------------------------------------------------------------------ the four festivals (fictional bakery, demo dates and prices)
  var FESTS = {
    cny: {
      lang: 'zh', btn: '农历新年', dot: '#c62828', name: ['农历新年', 'Chinese New Year'], day: '2027-02-06', cutoff: '2027-01-31', from: '2027-02-01', to: '2027-02-05', early: '2026-12-31',
      hero: 'cny-hero', band: 'cny-table', orn: 'lantern',
      kicker: ['2027 羊年 · 年饼预购开放', 'Chinese New Year 2027 · pre-orders open'],
      h1: ['手工年饼，<br><em>团圆的味道</em>', 'Handmade Chinese New Year cookies'],
      lead: ['黄梨球、蛋卷、花生饼、牛油曲奇，每一罐都在你取货的那个星期新鲜烘焙。网上下单付款，再选好取货或送货的日子。', 'Pineapple balls, love letters, peanut cookies and butter cookies, baked fresh the week you collect. Order and pay online, then pick your day.'],
      when: ['农历新年是 2027 年 2 月 6 日（星期六）。', 'Chinese New Year falls on Saturday 6 February 2027.'],
      cats: [['cookie', ['年饼', 'Cookies']], ['cake', ['年糕', 'Nian gao']], ['gift', ['礼盒', 'Gift boxes']]],
      items: [
        { id: 'pb', img: 'cny-pineapple-balls', cat: 'cookie', n: ['黄梨球', 'Pineapple Balls'], d: ['手工熬煮八小时的黄梨酱，包进入口即化的牛油酥皮。', 'Pineapple jam cooked for eight hours, in melt-in-the-mouth butter pastry.'], opts: [{ id: 's', l: ['小罐 · 40 粒', 'Small jar · 40 pcs'], p: 42 }, { id: 'l', l: ['大罐 · 80 粒', 'Big jar · 80 pcs'], p: 78 }], total: 120, left: 37, badge: ['招牌', 'Best seller'], keep: ['密封保存三星期', 'Keeps 3 weeks sealed'], has: ['麦、牛油、蛋', 'wheat, butter, egg'] },
        { id: 'pt', img: 'cny-pineapple-tarts', cat: 'cookie', n: ['金凤梨挞', 'Golden Pineapple Tarts'], d: ['凤梨造型的开口挞，酸甜黄梨馅，摆在桌上就很好看。', 'Pineapple-shaped open tarts with a sweet-sour filling. They look good on the table.'], u: ['一盒 30 粒', 'Box of 30'], p: 48, total: 60, left: 18, badge: ['新品', 'New'], keep: ['密封保存三星期', 'Keeps 3 weeks sealed'], has: ['麦、牛油、蛋', 'wheat, butter, egg'] },
        { id: 'll', img: 'cny-love-letters', cat: 'cookie', n: ['蛋卷', 'Love Letters'], d: ['椰浆蛋卷，炭火慢烤，酥脆不油腻。', 'Coconut-milk egg rolls, slow-baked over charcoal: crisp, not oily.'], opts: [{ id: 'o', l: ['原味 · 约 60 条', 'Original · about 60 rolls'], p: 38 }, { id: 'p', l: ['香兰 · 约 60 条', 'Pandan · about 60 rolls'], p: 40 }], total: 80, left: 41, keep: ['密封保存一个月', 'Keeps a month sealed'], has: ['麦、蛋、椰浆', 'wheat, egg, coconut'] },
        { id: 'pn', img: 'cny-peanut', cat: 'cookie', n: ['花生饼', 'Peanut Cookies'], d: ['现炒花生磨碎，一咬就散，满口花生香。', 'Freshly roasted peanuts, ground and baked. They melt as you bite.'], u: ['一罐 50 粒', 'Jar of 50'], p: 32, total: 100, left: 64, keep: ['密封保存三星期', 'Keeps 3 weeks sealed'], has: ['花生、麦', 'peanut, wheat'] },
        { id: 'bc', img: 'cny-butter-cookies', cat: 'cookie', n: ['牛油曲奇', 'Butter Cookies'], d: ['纽西兰牛油，五种造型，一罐刚好送长辈。', 'New Zealand butter, five shapes, a tin to give the elders.'], u: ['500 克铁罐', '500 g tin'], p: 45, total: 60, left: 9, keep: ['密封保存一个月', 'Keeps a month sealed'], has: ['麦、牛油、蛋', 'wheat, butter, egg'] },
        { id: 'ac', img: 'cny-almond-crisps', cat: 'cookie', n: ['杏仁瓦片', 'Almond Crisps'], d: ['薄薄一片，满满杏仁片，配茶刚好。', 'Thin crisps full of almond flakes. Good with tea.'], u: ['250 克', '250 g box'], p: 36, total: 50, left: 22, keep: ['密封保存三星期', 'Keeps 3 weeks sealed'], has: ['杏仁、蛋', 'almond, egg'] },
        { id: 'ng', img: 'cny-nian-gao', cat: 'cake', n: ['年糕', 'Nian Gao'], d: ['红糖年糕，年年高升。可以煎，也可以蒸。', 'Brown-sugar rice cake for a higher year. Pan-fry it or steam it.'], u: ['1 公斤', '1 kg'], p: 28, total: 40, left: 0, keep: ['冷藏两个月', 'Keeps 2 months in the fridge'], has: ['糯米', 'glutinous rice'] },
        { id: 'gb', img: 'cny-gift-box', cat: 'gift', n: ['新年礼盒', 'Prosperity Gift Box'], d: ['黄梨球、蛋卷、花生饼三罐装，红色礼盒配贺卡，可以直接送到对方家。', 'Pineapple balls, love letters and peanut cookies in a red gift box with a card. We can send it straight to them.'], u: ['三罐装 + 贺卡', 'Three jars + a card'], p: 118, total: 30, left: 11, badge: ['送礼', 'Gift'], gold: true, keep: ['密封保存三星期', 'Keeps 3 weeks sealed'], has: ['麦、牛油、蛋、花生、椰浆', 'wheat, butter, egg, peanut, coconut'] }
      ],
      faq: [
        [['最后下单日期是？', 'What is the last day to order?'], function (f) { return [fmtDay(f.cutoff) + '，或卖完为止。页面上剩几份是实时的。', fmtDayEn(f.cutoff) + ', or earlier if a set sells out. The counts on this page are live.']; }],
        [['怎么付款？', 'How do I pay?'], function () { return ['网上银行 FPX、信用卡、电子钱包，或用 DuitNow QR 转账后上传收据。付款后马上收到订单确认电邮。', 'FPX online banking, card, e-wallet, or DuitNow QR with your receipt. The order email arrives as soon as you pay.']; }],
        [['可以送货吗？', 'Do you deliver?'], function () { return ['巴生谷送货 RM15（满 RM200 免运），全马快递西马 RM12、东马 RM25。年糕和饼干都用密封罐寄。', 'Klang Valley delivery RM15 (free over RM200). Courier: West Malaysia RM12, East Malaysia RM25, in sealed jars.']; }],
        [['可以改取货日期吗？', 'Can I change my day?'], function () { return ['取货前两天可以改，在「查订单」找到你的订单联络我们。', 'Up to two days before. Find your order under "Track order" and contact us.']; }],
        [['年饼可以放多久？', 'How long do the cookies keep?'], function () { return ['密封罐三星期到一个月，开封后两星期内吃完最好。', 'Three weeks to a month sealed; best within two weeks of opening.']; }]
      ]
    },
    raya: {
      lang: 'ms', btn: 'Hari Raya', dot: '#138060', name: ['Hari Raya', 'Hari Raya'], day: '2027-03-10', cutoff: '2027-03-03', from: '2027-03-04', to: '2027-03-08', early: '2027-02-14',
      hero: 'raya-hero', band: 'raya-street', orn: 'ketupat',
      kicker: ['Hari Raya Aidilfitri 2027 · Tempahan dibuka', 'Hari Raya 2027 · pre-orders open'],
      h1: ['Kuih raya untuk <em>rumah terbuka</em>', 'Raya cookies for the open house'],
      lead: ['Tart nenas, biskut salju, biskut keju dan dulang kuih, dibakar segar minggu anda ambil. Tempah dan bayar dalam talian, kemudian pilih hari.', 'Pineapple tarts, snowball crescents, cheese sticks and kuih trays, baked fresh the week you collect. Order and pay online, then pick your day.'],
      when: ['Hari Raya Aidilfitri dijangka pada 10 Mac 2027, tertakluk kepada pengumuman rasmi.', 'Hari Raya Aidilfitri is expected on 10 March 2027, subject to the official announcement.'],
      cats: [['kuih', ['Kuih raya', 'Raya cookies']], ['tray', ['Dulang', 'Trays']], ['gift', ['Hamper', 'Hampers']]],
      items: [
        { id: 'tn', img: 'raya-tart-nenas', cat: 'kuih', n: ['Tart Nenas', 'Pineapple Tarts'], d: ['Jem nanas dimasak perlahan, pastri mentega yang cair di mulut.', 'Slow-cooked pineapple jam in melt-in-the-mouth butter pastry.'], opts: [{ id: 's', l: ['Balang kecil · 40 biji', 'Small jar · 40 pcs'], p: 40 }, { id: 'l', l: ['Balang besar · 80 biji', 'Big jar · 80 pcs'], p: 75 }], total: 120, left: 52, badge: ['Paling laris', 'Best seller'], keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, mentega, telur', 'wheat, butter, egg'] },
        { id: 'bs', img: 'raya-salju', cat: 'kuih', n: ['Biskut Salju', 'Snowball Crescents'], d: ['Biskut bulan sabit bersalut gula aising, lembut dan rapuh.', 'Crescent cookies under powdered sugar, soft and crumbly.'], u: ['Balang 300 g', '300 g jar'], p: 32, total: 80, left: 30, keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, mentega, kacang', 'wheat, butter, nuts'] },
        { id: 'bk', img: 'raya-keju', cat: 'kuih', n: ['Biskut Keju', 'Cheese Sticks'], d: ['Keju cheddar dan edam, rangup dan masin manis.', 'Cheddar and edam: crisp, salty and a little sweet.'], u: ['Balang 300 g', '300 g jar'], p: 38, total: 60, left: 12, keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, keju, telur', 'wheat, cheese, egg'] },
        { id: 'km', img: 'raya-makmur', cat: 'kuih', n: ['Kuih Makmur', 'Makmur Cookies'], d: ['Inti kacang tanah, bersalut gula halus. Kuih raya yang wajib ada.', 'Peanut filling under fine sugar. A Raya must-have.'], u: ['Balang 50 biji', 'Jar of 50'], p: 35, total: 80, left: 44, keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, kacang tanah, minyak sapi', 'wheat, peanut, ghee'] },
        { id: 'bb', img: 'raya-bulan-bintang', cat: 'kuih', n: ['Biskut Bulan Bintang', 'Star & Crescent Cookies'], d: ['Bentuk bulan dan bintang untuk meja raya.', 'Moon and star shapes for the Raya table.'], u: ['Balang 300 g', '300 g jar'], p: 34, total: 60, left: 25, badge: ['Baru', 'New'], keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, mentega, badam', 'wheat, butter, almond'] },
        { id: 'kt', img: 'raya-kuih-tray', cat: 'tray', n: ['Dulang Kuih Rumah Terbuka', 'Open-House Kuih Tray'], d: ['Kuih lapis, seri muka, onde-onde dan tart. Siap untuk tetamu.', 'Kuih lapis, seri muka, onde-onde and tarts, ready for guests.'], u: ['Untuk 20 orang', 'Serves 20'], p: 120, total: 20, left: 6, noCourier: true, keep: ['Makan pada hari yang sama', 'Eat on the day'], has: ['santan, telur, gandum', 'coconut milk, egg, wheat'] },
        { id: 'hr', img: 'raya-hamper', cat: 'gift', n: ['Hamper Raya', 'Raya Gift Hamper'], d: ['Empat balang kuih raya dalam dulang hadiah dengan kad ucapan. Boleh dihantar terus.', 'Four jars of Raya cookies on a gift tray with a greeting card. We can send it straight to them.'], u: ['4 balang + kad ucapan', '4 jars + a greeting card'], p: 158, total: 30, left: 9, badge: ['Hadiah', 'Gift'], gold: true, keep: ['Tahan 3 minggu bertutup', 'Keeps 3 weeks sealed'], has: ['gandum, mentega, telur, kacang', 'wheat, butter, egg, nuts'] }
      ],
      faq: [
        [['Bila tarikh akhir tempahan?', 'What is the last day to order?'], function (f) { return [fmtDay(f.cutoff) + ', atau lebih awal jika habis. Bilangan di halaman ini dikemas kini terus.', fmtDayEn(f.cutoff) + ', or earlier if a set sells out.']; }],
        [['Bagaimana cara bayar?', 'How do I pay?'], function () { return ['FPX, kad, e-dompet, atau DuitNow QR dengan resit. E-mel pengesahan dihantar sebaik sahaja anda bayar.', 'FPX, card, e-wallet, or DuitNow QR with your receipt. The order email arrives as soon as you pay.']; }],
        [['Ada penghantaran?', 'Do you deliver?'], function () { return ['Lembah Klang RM15 (percuma melebihi RM200). Kurier: Semenanjung RM12, Sabah dan Sarawak RM25.', 'Klang Valley RM15 (free over RM200). Courier: West Malaysia RM12, East Malaysia RM25.']; }],
        [['Boleh tukar hari ambil?', 'Can I change my day?'], function () { return ['Boleh, sehingga dua hari sebelum. Cari pesanan anda di "Semak pesanan".', 'Up to two days before. Find your order under "Track order".']; }]
      ]
    },
    xmas: {
      lang: 'en', btn: 'Christmas', dot: '#b3263a', name: ['Christmas'], day: '2026-12-25', cutoff: '2026-12-19', from: '2026-12-21', to: '2026-12-24', early: '2026-12-05',
      hero: 'xmas-hero', band: 'xmas-bokeh', orn: 'bauble',
      kicker: ['Christmas 2026 · pre-orders open'], h1: ['Christmas bakes, <em>ready to share</em>'],
      lead: ['Gingerbread, panettone, a rum-soaked fruit cake and a chocolate yule log, baked in small batches for the week before Christmas. Order and pay online, then pick your day.'],
      when: ['Collect or receive your bakes between 21 and 24 December.'],
      cats: [['cookie', ['Cookies']], ['cake', ['Cakes']], ['gift', ['Gift boxes']]],
      items: [
        { id: 'gb', img: 'xmas-gingerbread', cat: 'cookie', n: ['Gingerbread Box'], d: ['Twelve gingerbread cookies, hand-iced: trees, stars and little houses.'], u: ['Box of 12'], p: 58, total: 80, left: 34, badge: ['Best seller'], keep: ['Keeps 3 weeks sealed'], has: ['wheat, butter, egg'] },
        { id: 'cs', img: 'xmas-stars', cat: 'cookie', n: ['Cinnamon Star Cookies'], d: ['Almond and cinnamon stars under a crisp white glaze.'], u: ['Tin of 20'], p: 36, total: 60, left: 22, keep: ['Keeps 3 weeks sealed'], has: ['almond, egg'] },
        { id: 'yl', img: 'xmas-log-cake', cat: 'cake', n: ['Chocolate Yule Log'], d: ['Chocolate sponge rolled with ganache, finished with pine and berries.'], opts: [{ id: 'c', l: ['Classic chocolate · serves 8–10'], p: 98 }, { id: 'o', l: ['Chocolate orange · serves 8–10'], p: 104 }], total: 30, left: 7, noCourier: true, keep: ['Keeps 3 days in the fridge'], has: ['wheat, egg, dairy'] },
        { id: 'pa', img: 'xmas-panettone', cat: 'cake', n: ['Panettone'], d: ['Slow-proved for two days, with candied orange and raisins.'], u: ['750 g'], p: 78, total: 40, left: 15, keep: ['Keeps 2 weeks wrapped'], has: ['wheat, egg, butter'] },
        { id: 'fc', img: 'xmas-fruit-cake', cat: 'cake', n: ['Rum Fruit Cake'], d: ['Fruit and nuts soaked in rum for six weeks. Even better on Boxing Day.'], u: ['1 kg'], p: 88, total: 40, left: 17, keep: ['Keeps a month wrapped'], has: ['wheat, egg, nuts, alcohol'] },
        { id: 'sc', img: 'xmas-decorated', cat: 'cookie', n: ['Decorated Sugar Cookies'], d: ['Santa, snowmen and gifts, iced by hand.'], u: ['Set of 9'], p: 48, total: 60, left: 26, keep: ['Keeps 3 weeks sealed'], has: ['wheat, butter, egg'] },
        { id: 'hb', img: 'xmas-cookie-box', cat: 'gift', n: ['Holiday Cookie Gift Box'], d: ['Four kinds of cookies in a gift box with a ribbon and your card. We can send it straight to them.'], u: ['Four kinds, ribbon and card'], p: 128, total: 40, left: 12, badge: ['Gift'], gold: true, keep: ['Keeps 3 weeks sealed'], has: ['wheat, butter, egg, almond'] }
      ],
      faq: [
        [['What is the last day to order?'], function (f) { return [fmtDay(f.cutoff) + ', or earlier if a set sells out. The counts on this page are live.']; }],
        [['How do I pay?'], function () { return ['FPX online banking, card, e-wallet, or DuitNow QR with your receipt. The order email arrives as soon as you pay.']; }],
        [['Do you deliver?'], function () { return ['Klang Valley delivery RM15 (free over RM200). Courier: West Malaysia RM12, East Malaysia RM25. Cakes are collection or Klang Valley only.']; }],
        [['Can I change my day?'], function () { return ['Up to two days before. Find your order under "Track order" and contact us.']; }]
      ]
    },
    val: {
      lang: 'en', btn: "Valentine's", dot: '#d6336c', name: ["Valentine's Day"], day: '2027-02-14', cutoff: '2027-02-10', from: '2027-02-12', to: '2027-02-14', early: '2027-02-01',
      hero: 'val-hero', band: 'val-roses', orn: 'heart',
      kicker: ["Valentine's Day 2027 · pre-orders open"], h1: ['Sweet things, <em>said properly</em>'],
      lead: ['Iced heart cookies, chocolate truffles, red velvet cupcakes and roses, ready from 12 to 14 February. Order and pay online, add a card, or send it straight to them.'],
      when: ["Valentine's Day falls on Sunday 14 February 2027."],
      cats: [['cookie', ['Cookies']], ['choc', ['Chocolates & cakes']], ['gift', ['Gifts']]],
      items: [
        { id: 'hc', img: 'val-heart-box', cat: 'cookie', n: ['Love Letter Cookie Box'], d: ['Six iced heart cookies in a box with red paper and a note.'], u: ['Six iced hearts'], p: 48, total: 60, left: 20, badge: ['Best seller'], keep: ['Keeps 2 weeks sealed'], has: ['wheat, butter, egg'] },
        { id: 'tr', img: 'val-truffles', cat: 'choc', n: ['Chocolate Truffle Box'], d: ['Twelve dark-chocolate truffles, tied with a red ribbon.'], u: ['Box of 12'], p: 68, total: 50, left: 14, keep: ['Keeps 2 weeks in a cool place'], has: ['dairy, soy'] },
        { id: 'rv', img: 'val-red-velvet', cat: 'choc', n: ['Red Velvet Cupcakes'], d: ['Red velvet with cream-cheese frosting and a strawberry.'], u: ['Box of 6'], p: 42, total: 40, left: 18, noCourier: true, keep: ['Best on the day'], has: ['wheat, egg, dairy'] },
        { id: 'hk', img: 'val-heart-chocs', cat: 'choc', n: ['Heart Chocolates Tin'], d: ['Twenty-four foil-wrapped chocolate hearts in a heart-shaped tin.'], u: ['24 hearts'], p: 58, total: 30, left: 9, keep: ['Keeps a month in a cool place'], has: ['dairy, soy'] },
        { id: 'cr', img: 'val-chocs-roses', cat: 'gift', n: ['Chocolates & Roses'], d: ['A box of chocolates with fresh red roses, delivered together.'], opts: [{ id: '6', l: ['Six roses'], p: 168 }, { id: '12', l: ['Twelve roses'], p: 208 }], total: 20, left: 5, badge: ['Gift'], gold: true, noCourier: true, keep: ['Roses last about a week'], has: ['dairy, soy'] },
        { id: 'tb', img: 'val-teddy', cat: 'cookie', n: ['Teddy Cookie Box'], d: ['Two teddy-bear cookies with your names iced on them.'], u: ['Two teddies with your names'], p: 55, total: 30, left: 11, badge: ['New'], personal: 'Names on the teddies', keep: ['Keeps 2 weeks sealed'], has: ['wheat, butter, egg'] },
        { id: 'ih', img: 'val-heart-cookies', cat: 'cookie', n: ['Iced Heart Cookies'], d: ['Nine hearts with royal icing: pinks, reds and little words.'], u: ['Set of 9'], p: 45, total: 60, left: 24, keep: ['Keeps 2 weeks sealed'], has: ['wheat, butter, egg'] }
      ],
      faq: [
        [['What is the last day to order?'], function (f) { return [fmtDay(f.cutoff) + ', or earlier if something sells out. The counts on this page are live.']; }],
        [['Can you deliver to someone else?'], function () { return ['Yes. Tick "This is a gift" at checkout, add their name, number and your card message. No prices go in the box.']; }],
        [['How do I pay?'], function () { return ['FPX online banking, card, e-wallet, or DuitNow QR with your receipt. The order email arrives as soon as you pay.']; }],
        [['Do you deliver roses and cupcakes by courier?'], function () { return ['No, those are collection or Klang Valley delivery only, so they arrive fresh.']; }]
      ]
    }
  };
  var ORDER = ['cny', 'raya', 'xmas', 'val'];
  function fmtDayEn(s) { var keep = LANG; LANG = 'en'; var r = fmtDay(s); LANG = keep; return r; }

  // which festival: ?fest=, else the open one with the nearest last order day
  var settings0 = {};
  function setOf(k) { return load('set_' + k, {}); }
  function cutoffOf(k) { return setOf(k).cutoff || FESTS[k].cutoff; }
  function closedOf(k) { return today() > cutoffOf(k); }
  function defaultFest() { var best = null; ORDER.forEach(function (k) { if (!closedOf(k) && (!best || cutoffOf(k) < cutoffOf(best))) best = k; }); return best || 'cny'; }
  var cur = q('fest');
  if (!FESTS[cur]) cur = defaultFest();
  var F = FESTS[cur];
  LANG = F.lang;
  settings0 = setOf(cur);
  F.cutoff = cutoffOf(cur);
  if (settings0.early) F.early = settings0.early;
  F.closed = closedOf(cur);
  F.paused = !!settings0.paused;
  var CAP = { collect: settings0.capCollect || 6, kv: settings0.capKv || 10 };
  function url(page, extra) { return page + '?fest=' + cur + (extra || ''); }
  function item(id) { return F.items.filter(function (x) { return x.id === id; })[0]; }
  function leftOf(id) { var l = load('left_' + cur, {}); return id in l ? l[id] : item(id).left; }
  function setLeft(id, n) { var l = load('left_' + cur, {}); l[id] = Math.max(0, n); save('left_' + cur, l); }
  function isOff(id) { return !!load('off_' + cur, {})[id] || leftOf(id) <= 0; }
  function canOrder() { return !F.closed && !F.paused; }
  function earlyOn() { return today() <= F.early; }
  function unitPrice(it, opt) { var o = (it.opts || []).filter(function (x) { return x.id === opt; })[0]; return o ? o.p : it.p; }
  function fromPrice(it) { return it.opts ? Math.min.apply(null, it.opts.map(function (o) { return o.p; })) : it.p; }
  function unitLabel(it, opt) { var o = (it.opts || []).filter(function (x) { return x.id === opt; })[0]; return o ? o.l : (it.u || ['']); }

  // ------------------------------------------------------------------ cart (one per festival)
  function cart() { return load('cart_' + cur, []); }
  function setCart(c) { save('cart_' + cur, c); paintCartBtn(); }
  function addToCart(id, opt, qty, pers) {
    var c = cart(), k = id + '|' + (opt || '') + '|' + (pers || ''), line = c.filter(function (l) { return l.k === k; })[0];
    var room = leftOf(id) - c.filter(function (l) { return l.id === id; }).reduce(function (a, l) { return a + l.qty; }, 0);
    if (room <= 0) { toast(L('这一样已经没有了', 'Yang ini sudah habis', 'That one is sold out')); return false; }
    qty = Math.min(qty, room);
    if (line) line.qty += qty; else c.push({ k: k, id: id, opt: opt || '', pers: pers || '', qty: qty });
    setCart(c);
    return true;
  }
  function calc(c, mode, region) {
    c = c || cart();
    var lines = c.map(function (l) { var it = item(l.id); return it ? { l: l, it: it, unit: unitPrice(it, l.opt), sum: unitPrice(it, l.opt) * l.qty } : null; }).filter(Boolean);
    var sub = lines.reduce(function (a, x) { return a + x.sum; }, 0), disc = earlyOn() ? Math.round(sub * 10) / 100 : 0, after = sub - disc, fee = 0;
    if (mode === 'kv') fee = after >= 200 ? 0 : 15;
    if (mode === 'courier') fee = region === 'east' ? 25 : after >= 250 ? 0 : 12;
    return { lines: lines, sub: sub, disc: disc, fee: fee, total: Math.round((after + fee) * 100) / 100, count: c.reduce(function (a, l) { return a + l.qty; }, 0), noCourier: lines.some(function (x) { return x.it.noCourier; }) };
  }

  // ------------------------------------------------------------------ shared chrome
  function toast(t) { var el = $('[data-toast]'); if (!el) return; el.textContent = t; el.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('is-on'); }, 2600); }
  function ornament(kind) {
    if (kind === 'lantern') return '<svg width="64" height="170" viewBox="0 0 64 170" aria-hidden="true"><path d="M32 0v44" stroke="#e3b04b" stroke-width="2"/><rect x="21" y="42" width="22" height="7" rx="2" fill="#e3b04b"/><ellipse cx="32" cy="80" rx="28" ry="32" fill="#c62828"/><ellipse cx="32" cy="80" rx="28" ry="32" fill="url(#lg)"/><path d="M32 48v64M18 54c-7 16-7 36 0 52M46 54c7 16 7 36 0 52M8 80h48" stroke="#f3c766" stroke-opacity=".75" fill="none" stroke-width="1.6"/><rect x="21" y="110" width="22" height="7" rx="2" fill="#e3b04b"/><path d="M26 117h12l-2 40h-8z" fill="#e3b04b"/><defs><radialGradient id="lg" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#ff6b5b" stop-opacity=".7"/><stop offset="1" stop-color="#7a0a0d" stop-opacity=".5"/></radialGradient></defs></svg>';
    if (kind === 'ketupat') return '<svg width="64" height="150" viewBox="0 0 64 150" aria-hidden="true"><path d="M32 0v42" stroke="#d9b45a" stroke-width="2"/><g transform="translate(32 76) rotate(45)"><rect x="-24" y="-24" width="48" height="48" rx="5" fill="#2f8f5b"/><path d="M-24 -8H24M-24 8H24M-8 -24V24M8 -24V24" stroke="#d9e8a8" stroke-width="3" opacity=".85"/></g><path d="M32 110c-6 10-6 24 0 34M32 110c6 10 6 24 0 34" stroke="#2f8f5b" stroke-width="4" fill="none"/></svg>';
    if (kind === 'bauble') return '<svg width="64" height="150" viewBox="0 0 64 150" aria-hidden="true"><path d="M32 0v58" stroke="#d8ac4f" stroke-width="2"/><rect x="25" y="56" width="14" height="10" rx="2" fill="#d8ac4f"/><circle cx="32" cy="96" r="30" fill="#b3263a"/><circle cx="32" cy="96" r="30" fill="url(#bg)"/><path d="M4 92c18 8 38 8 56 0" stroke="#f3d48a" stroke-width="3" fill="none" opacity=".8"/><defs><radialGradient id="bg" cx=".32" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>';
    return '<svg width="64" height="140" viewBox="0 0 64 140" aria-hidden="true"><path d="M32 0v62" stroke="#f2bfcb" stroke-width="2"/><path d="M32 128s-28-17-28-38a15 15 0 0 1 28-8 15 15 0 0 1 28 8c0 21-28 38-28 38z" fill="#d6336c"/><path d="M18 80a8 8 0 0 1 8-6" stroke="#fff" stroke-opacity=".6" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
  }
  function chrome() {
    document.body.setAttribute('data-fest', cur);
    document.body.setAttribute('data-lang', LANG);
    document.documentElement.lang = LANG === 'zh' ? 'zh-Hans' : LANG === 'ms' ? 'ms' : 'en';
    var tc = $('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--brand').trim() || '#8f1418');
    $('[data-fests]').innerHTML = ORDER.map(function (k) { return '<button type="button" data-fest-go="' + k + '" aria-pressed="' + (k === cur) + '"><i style="background:' + FESTS[k].dot + '"></i>' + esc(FESTS[k].btn) + '</button>'; }).join('');
    $('[data-home]').setAttribute('href', url('index.html'));
    var page = document.body.getAttribute('data-page');
    var nav = [[url('index.html') + '#sets', L('本季年饼', 'Juadah raya', 'This season'), 'home'], [url('index.html') + '#how', L('怎么订', 'Cara tempah', 'How to order')], [url('index.html') + '#delivery', L('取货与送货', 'Ambil & hantar', 'Collection & delivery')], [url('order.html'), L('查订单', 'Semak pesanan', 'Track order'), 'order'], [url('owner.html'), L('店主后台', 'Papan pemilik', 'Owner view'), 'owner']];
    $('[data-nav]').innerHTML = nav.map(function (n) { return '<a href="' + n[0] + '"' + (n[2] && n[2] === page && page !== 'home' ? ' class="is-on"' : '') + '>' + esc(n[1]) + '</a>'; }).join('');
    $('[data-cart-label]').textContent = L('购物车', 'Troli', 'Cart');
    if (F.paused && page !== 'owner') $('[data-paused]').innerHTML = '<div class="paused">' + esc(L('店家暂停接单，很快回来。', 'Tempahan ditutup sementara.', 'Orders are paused for now. Back soon.')) + '</div>';
    $('[data-ftr]').innerHTML = '<div class="wrap ftr__in"><div><a class="brand" href="' + url('index.html') + '"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 6c-7 0-11 6-11 14s4 14 11 14 11-6 11-14S27 6 20 6z" fill="currentColor"/></svg><span>Butter <i>&amp;</i> Lantern</span></a>' +
      '<p>' + esc(L('家庭烘焙坊 · 八打灵再也（示范地址）', 'Dapur rumah · Petaling Jaya (alamat demo)', 'Home bakery · Petaling Jaya (demo address)')) + '</p><p>' + esc(L('自取时间 10am–6pm · hello@example.com', 'Ambil 10 pg–6 ptg · hello@example.com', 'Collection 10am–6pm · hello@example.com')) + '</p></div>' +
      '<div><h4>' + esc(L('订购', 'Tempahan', 'Ordering')) + '</h4><p><a href="' + url('order.html') + '">' + esc(L('查订单', 'Semak pesanan', 'Track your order')) + '</a></p><p><a href="' + url('index.html') + '#delivery">' + esc(L('取货与送货', 'Ambil & hantar', 'Collection & delivery')) + '</a></p><p><a href="' + url('owner.html') + '">' + esc(L('店主后台（示范）', 'Papan pemilik (demo)', 'Owner view (demo)')) + '</a></p><p>FPX · Visa · Mastercard · e-wallets · DuitNow QR</p></div>' +
      '<div class="ftr__cs"><b>A festive shop by Cartsmith Studio: RM399.</b> Up to 10 items, online payment or DuitNow QR, order emails and your own dashboard, live in 3 working days. Runs on WordPress + WooCommerce. Butter &amp; Lantern is fictional; photos are Pexels placeholders. <a href="https://cartsmithstudio.com/pricing.html#starts">See the details &rarr;</a></div></div>';
    paintCartBtn();
  }
  function paintCartBtn() { var n = $('[data-cart-n]'); if (n) n.textContent = calc().count; }

  // overlays
  function openLayer(el) { var s = $('[data-scrim]'); s.hidden = false; el.hidden = false; requestAnimationFrame(function () { s.classList.add('is-on'); el.classList.add('is-on'); }); document.body.style.overflow = 'hidden'; }
  function closeLayers() { var s = $('[data-scrim]'); $$('[data-drawer],[data-sheet],[data-pay]').forEach(function (el) { el.classList.remove('is-on'); setTimeout(function () { if (!el.classList.contains('is-on')) el.hidden = true; }, 260); }); s.classList.remove('is-on'); setTimeout(function () { if (!s.classList.contains('is-on')) s.hidden = true; }, 260); document.body.style.overflow = ''; }
  function sumHTML(c) {
    return '<div class="sum"><div><span>' + esc(L('小计', 'Jumlah kecil', 'Subtotal')) + '</span><span>' + rm(c.sub) + '</span></div>' +
      (c.disc ? '<div class="disc"><span>' + esc(L('早鸟 9 折', 'Diskaun awal 10%', 'Early-bird 10% off')) + '</span><span>−' + rm(c.disc) + '</span></div>' : '') +
      (c.fee != null && c.mode ? '<div><span>' + esc(L('运费', 'Penghantaran', 'Delivery')) + '</span><span>' + (c.fee ? rm(c.fee) : esc(L('免费', 'Percuma', 'Free'))) + '</span></div>' : '') +
      '<div class="tot"><span>' + esc(L('总额', 'Jumlah', 'Total')) + '</span><span>' + rm(c.total) + '</span></div></div>';
  }
  function lineHTML(x, edit) {
    return '<div class="line"><img src="img/' + x.it.img + '.webp" alt="" width="64" height="64"><div><h4>' + esc(T(x.it.n)) + '</h4><small>' + esc(T(unitLabel(x.it, x.l.opt))) + (x.l.pers ? ' · “' + esc(x.l.pers) + '”' : '') + '</small><small>' + rm(x.unit) + '</small></div>' +
      (edit ? '<div class="qty"><button type="button" data-cq="' + esc(x.l.k) + '" data-d="-1" aria-label="' + esc(L('减少', 'Kurang', 'One less')) + '">−</button><output>' + x.l.qty + '</output><button type="button" data-cq="' + esc(x.l.k) + '" data-d="1" aria-label="' + esc(L('增加', 'Tambah', 'One more')) + '">+</button></div>' : '<b>× ' + x.l.qty + '</b>') + '</div>';
  }
  function openCart() {
    var d = $('[data-drawer]'), c = calc();
    var free = c.sub - c.disc;
    d.innerHTML = '<div class="drawer__head"><h2>' + esc(L('购物车', 'Troli', 'Your cart')) + '</h2><button class="drawer__x" type="button" data-close aria-label="Close">×</button></div>' +
      '<div class="drawer__body">' + (c.lines.length ? c.lines.map(function (x) { return lineHTML(x, true); }).join('') : '<div class="empty">' + esc(L('购物车是空的', 'Troli anda kosong', 'Your cart is empty')) + '</div>') + '</div>' +
      (c.lines.length ? '<div class="drawer__foot"><div class="free">' + (free >= 200 ? esc(L('巴生谷送货免运费', 'Penghantaran Lembah Klang percuma', 'Free Klang Valley delivery')) : esc(L('再买 ' + rm(200 - free) + '，巴生谷送货免运费', 'Tambah ' + rm(200 - free) + ' untuk penghantaran percuma (Lembah Klang)', rm(200 - free) + ' more for free Klang Valley delivery'))) + '<div class="bar"><i style="width:' + Math.min(100, Math.round(free / 2)) + '%"></i></div></div>' + sumHTML(c) +
        '<a class="btn btn--block" style="margin-top:12px" href="' + url('checkout.html') + '"' + (canOrder() ? '' : ' aria-disabled="true"') + '>' + esc(L('去结账', 'Teruskan ke bayaran', 'Checkout')) + '</a></div>' : '<div class="drawer__foot"><button class="btn btn--block btn--ghost" type="button" data-close>' + esc(L('继续选购', 'Teruskan membeli', 'Keep shopping')) + '</button></div>');
    if (d.hidden) openLayer(d);
  }
  function openItem(id) {
    var it = item(id), s = $('[data-sheet]'), st = { opt: it.opts ? it.opts[0].id : '', qty: 1, pers: '' };
    function paint() {
      var off = isOff(id), left = leftOf(id);
      s.innerHTML = '<button class="sheet__close" type="button" data-close aria-label="Close">×</button><div class="sheet__img"><img src="img/' + it.img + '.webp" alt="' + esc(T(it.n)) + ' (placeholder photo)"></div><div class="sheet__body">' +
        (it.badge ? '<p class="kicker">' + esc(T(it.badge)) + '</p>' : '') + '<h2>' + TB(it.n) + '</h2><p>' + esc(T(it.d)) + (LANG !== 'en' && it.d[1] ? '<small class="en">' + esc(it.d[1]) + '</small>' : '') + '</p>' +
        (it.opts ? '<div class="chips">' + it.opts.map(function (o) { return '<button type="button" class="chip" data-opt="' + o.id + '" aria-pressed="' + (o.id === st.opt) + '">' + esc(T(o.l)) + (LANG !== 'en' && o.l[1] ? '<small>' + esc(o.l[1]) + '</small>' : '') + '<small>' + rm(o.p) + '</small></button>'; }).join('') + '</div>' : '<p class="muted">' + esc(T(it.u)) + '</p>') +
        (it.personal ? '<div class="field"><label for="pers">' + esc(it.personal) + ' <small>(max 24)</small></label><input class="input" id="pers" maxlength="24" value="' + esc(st.pers) + '" placeholder="e.g. Amir & Hana"></div>' : '') +
        '<div class="facts"><b>' + esc(L('保存', 'Simpan', 'Keeps')) + ':</b> ' + esc(T(it.keep)) + '<br><b>' + esc(L('含', 'Mengandungi', 'Contains')) + ':</b> ' + esc(T(it.has)) + (it.noCourier ? '<br>' + esc(L('只限自取或巴生谷送货', 'Ambil sendiri atau Lembah Klang sahaja', 'Collection or Klang Valley delivery only')) : '') + '<br>' + esc(off ? L('已售完', 'Habis dijual', 'Sold out') : L('只剩 ' + left + ' 份', 'Tinggal ' + left, 'Only ' + left + ' left')) + '</div>' +
        '<div class="sheet__foot"><div class="qty"><button type="button" data-sq="-1" aria-label="One less">−</button><output>' + st.qty + '</output><button type="button" data-sq="1" aria-label="One more">+</button></div><button class="btn" type="button" data-sheet-add' + (off || !canOrder() ? ' disabled' : '') + '>' + esc(off ? L('已售完', 'Habis', 'Sold out') : !canOrder() ? L('暂停接单', 'Ditutup', 'Not taking orders') : L('加入购物车', 'Masuk troli', 'Add to cart') + ' · ' + rm(unitPrice(it, st.opt) * st.qty)) + '</button></div></div>';
    }
    s.onclick = function (e) {
      var b;
      if ((b = e.target.closest('[data-opt]'))) { st.opt = b.getAttribute('data-opt'); paint(); return; }
      if ((b = e.target.closest('[data-sq]'))) { st.qty = Math.max(1, Math.min(10, st.qty + +b.getAttribute('data-sq'))); paint(); return; }
      if (e.target.closest('[data-sheet-add]')) {
        if (it.personal) { st.pers = ($('#pers', s).value || '').trim(); if (!st.pers) { toast('Add the names for the teddies'); $('#pers', s).focus(); return; } }
        if (addToCart(id, st.opt, st.qty, st.pers)) { closeLayers(); toast(L('已加入购物车', 'Dimasukkan ke troli', 'Added to your cart')); setTimeout(openCart, 280); }
      }
    };
    s.oninput = function (e) { if (e.target.id === 'pers') st.pers = e.target.value; };
    paint(); openLayer(s);
  }
  document.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('[data-fest-go]'))) { location.href = location.pathname.split('/').pop().replace(/^$/, 'index.html') + '?fest=' + b.getAttribute('data-fest-go') + (location.hash || ''); return; }
    if (e.target.closest('[data-cart-open]')) { openCart(); return; }
    if (e.target.closest('[data-close]') || e.target.matches('[data-scrim]')) { closeLayers(); return; }
    if ((b = e.target.closest('[data-cq]'))) {
      var c = cart(), l = c.filter(function (x) { return x.k === b.getAttribute('data-cq'); })[0];
      if (l) { var d = +b.getAttribute('data-d'); if (d > 0 && calc(c).lines.filter(function (x) { return x.l.id === l.id; }).reduce(function (a, x) { return a + x.l.qty; }, 0) >= leftOf(l.id)) { toast(L('没有更多了', 'Tiada lagi', 'No more left')); return; } l.qty += d; if (l.qty <= 0) c.splice(c.indexOf(l), 1); setCart(c); openCart(); if (document.body.getAttribute('data-page') === 'checkout') location.reload(); }
      return;
    }
    if ((b = e.target.closest('[data-item]'))) { e.preventDefault(); openItem(b.getAttribute('data-item')); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLayers(); });

  // ------------------------------------------------------------------ home page
  function countdownHTML() {
    var ms = Date.parse(F.cutoff + 'T23:59:00+08:00') - Date.now();
    if (ms <= 0) return '';
    var dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
    return '<div class="count" data-count><div><b>' + dd + '</b><small>' + esc(L('天', 'hari', 'days')) + '</small></div><div><b>' + hh + '</b><small>' + esc(L('小时', 'jam', 'hours')) + '</small></div><div><b>' + mm + '</b><small>' + esc(L('分钟', 'minit', 'min')) + '</small></div></div>';
  }
  function pageHome() {
    var h = $('[data-hero]');
    var closed = F.closed;
    h.innerHTML = '<img class="hero__bg" src="img/' + F.hero + '.webp" alt="" width="1920" height="1080">' +
      '<span class="orn orn--1">' + ornament(F.orn) + '</span><span class="orn orn--2">' + ornament(F.orn) + '</span><span class="orn orn--3">' + ornament(F.orn) + '</span>' +
      '<div class="wrap hero__in"><div class="hero__copy">' +
      '<p class="kicker">' + esc(closed ? L('今年的预购已截止', 'Tempahan tahun ini sudah ditutup', 'This year’s pre-orders have closed') : T(F.kicker)) + '</p>' +
      '<h1>' + T(F.h1) + (F.h1[1] ? '<small class="en">' + esc(F.h1[1]) + '</small>' : '') + '</h1>' +
      '<p class="hero__lead">' + esc(T(F.lead)) + (F.lead[1] ? '<small class="en">' + esc(F.lead[1]) + '</small>' : '') + '</p>' +
      '<div class="hero__meta">' + (!closed && earlyOn() ? '<p class="early">' + ICON.clock.replace('<svg', '<svg width="18" height="18"') + esc(L('早鸟优惠 9 折，至 ' + fmtShort(F.early), 'Diskaun awal 10% hingga ' + fmtShort(F.early), 'Early-bird 10% off until ' + fmtShort(F.early))) + '</p>' : '') +
      (closed ? '</div><form class="note" data-notify style="max-width:440px;color:var(--ink)"><b>' + esc(L('明年开放时通知我', 'Beritahu saya bila dibuka semula', 'Tell me when the next ones open')) + '</b><div style="display:flex;gap:8px;margin-top:8px"><input class="input" name="phone" type="tel" placeholder="012-345 6789" aria-label="WhatsApp number"><button class="btn btn--sm" type="submit">' + esc(L('通知我', 'Beritahu', 'Notify me')) + '</button></div></form>' : countdownHTML() + '</div>') +
      '<div class="hero__btns"><a class="btn btn--gold" href="#sets">' + esc(closed ? L('看看本季的年饼', 'Lihat juadah', 'See the sets') : L('立即选购', 'Tempah sekarang', 'Shop the sets')) + '</a><a class="btn btn--light" href="' + url('order.html') + '">' + esc(L('查订单', 'Semak pesanan', 'Track an order')) + '</a></div>' +
      '<div class="season"><p>' + esc(L('本季 This season', 'Musim ini · This season', 'This season')) + '</p><ul>' + F.items.slice(0, 5).map(function (it) { return '<li><a href="#i-' + it.id + '" data-item="' + it.id + '"><img src="img/' + it.img + '.webp" alt="" width="70" height="70" loading="lazy">' + esc(T(it.n)) + '</a></li>'; }).join('') + '</ul></div>' +
      '</div>' + (closed ? '' : '<div class="hero__badge"><span>' + esc(L('截止', 'Tempah sebelum', 'Order by')) + '<b>' + esc(fmtShort(F.cutoff)) + '</b>' + '<i>' + esc(L('取货 ' + fmtShort(F.from) + ' 起', 'Ambil dari', 'Ready from')) + '</i>' + (LANG === 'zh' ? '' : '<i>' + esc(fmtShort(F.from)) + '</i>') + '</span></div>') + '</div>';
    var nf = $('[data-notify]', h);
    if (nf) nf.addEventListener('submit', function (e) { e.preventDefault(); var v = nf.phone.value.trim(); if (!/^\+?6?0?1\d[\d\s-]{7,10}$/.test(v)) { toast(L('请填写手机号码', 'Masukkan nombor telefon', 'Please enter a mobile number')); return; } var w = load('notify', []); w.unshift({ fest: cur, phone: v, at: Date.now() }); save('notify', w.slice(0, 20)); nf.innerHTML = '<b>' + esc(L('好的，开放那天会通知你。', 'Baik, kami akan beritahu anda.', 'Done. We will message you once, on the day they open.')) + '</b>'; });

    $('[data-sets-head]').innerHTML = '<p class="kicker">' + esc(L('2027 年饼', 'Juadah Raya 2027', T(F.name) + ' ' + F.day.slice(0, 4))) + '</p><h2>' + B('小批量制作，卖完为止', 'Dibuat sedikit-sedikit, bila habis, habislah', 'Made in small batches, so they do run out') + '</h2><p>' + esc(T(F.when)) + (F.when[1] ? '<small class="en">' + esc(F.when[1]) + '</small>' : '') + '</p>';
    var cat = '';
    function paintGrid() {
      $('[data-cats]').innerHTML = '<button type="button" data-cat="" aria-pressed="' + (!cat) + '">' + esc(L('全部', 'Semua', 'All')) + '</button>' + F.cats.map(function (c) { return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (cat === c[0]) + '">' + esc(T(c[1])) + '</button>'; }).join('');
      $('[data-grid]').innerHTML = F.items.filter(function (it) { return !cat || it.cat === cat; }).map(function (it) {
        var left = leftOf(it.id), off = isOff(it.id), p = fromPrice(it);
        return '<article class="card' + (off ? ' is-out' : '') + '" id="i-' + it.id + '"><button class="card__img" type="button" data-item="' + it.id + '" aria-label="' + esc(T(it.n)) + '"><img src="img/' + it.img + '.webp" alt="' + esc(T(it.n)) + ' (placeholder photo)" loading="lazy" width="760" height="760">' + (off ? '<span class="badge">' + esc(L('已售完', 'Habis', 'Sold out')) + '</span>' : it.badge ? '<span class="badge' + (it.gold ? ' badge--gold' : '') + '">' + esc(T(it.badge)) + '</span>' : '') + '</button>' +
          '<div class="card__body"><h3>' + TB(it.n) + '</h3><p class="card__unit">' + esc(it.opts ? it.opts.map(function (o) { return T(o.l); }).join(' / ') : T(it.u)) + '</p>' +
          '<div class="stock"><span>' + esc(off ? L('已售完', 'Habis dijual', 'Sold out') : L('只剩 ' + left + ' 份', 'Tinggal ' + left, 'Only ' + left + ' left')) + '</span><span>' + esc(L('共 ' + it.total + ' 份', 'daripada ' + it.total, 'of ' + it.total)) + '</span></div><div class="bar"><i style="width:' + Math.round(100 * Math.max(0, left) / it.total) + '%"></i></div>' +
          '<div class="card__foot"><span class="price">' + (it.opts ? esc(L('起', 'dari', 'from')) + ' ' : '') + rm(earlyOn() ? p * 0.9 : p) + (earlyOn() ? '<s>' + rm(p) + '</s>' : '') + '</span><button class="btn btn--sm" type="button" data-item="' + it.id + '"' + (off || !canOrder() ? ' disabled' : '') + '>' + esc(off ? L('已售完', 'Habis', 'Sold out') : it.opts || it.personal ? L('选择', 'Pilih', 'Choose') : L('加入', 'Tambah', 'Add')) + '</button></div></div></article>';
      }).join('');
    }
    $('[data-cats]').addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; cat = b.getAttribute('data-cat'); paintGrid(); });
    paintGrid();
    $('[data-cap]').textContent = L('这个示范放了 ' + F.items.length + ' 样；RM399 的节日网店最多可以放 10 样。', 'Demo ini ada ' + F.items.length + ' item; kedai perayaan RM399 boleh muat sehingga 10 item.', 'This demo shows ' + F.items.length + ' items; a RM399 festive shop holds up to 10.');

    $('[data-how-head]').innerHTML = '<p class="kicker">' + esc(L('怎么订', 'Cara tempah', 'How to order')) + '</p><h2>' + B('像一般网店一样下单付款', 'Tempah dan bayar seperti kedai dalam talian', 'Order and pay like any good online shop') + '</h2>';
    var steps = [
      [ICON.bag, B('选好年饼', 'Pilih juadah', 'Choose your sets'), L('每一样剩几份都看得到，卖完会显示。', 'Lihat berapa yang tinggal; bila habis, ia tertulis.', 'See how many are left; when one is gone, it says so.')],
      [ICON.cal, B('选日子和时段', 'Pilih hari dan masa', 'Pick a day and time'), L('自取、巴生谷送货或全马快递，时段满了就不能选。', 'Ambil sendiri, hantar di Lembah Klang atau kurier. Slot penuh ditutup.', 'Collect, Klang Valley delivery or courier. Full slots close themselves.')],
      [ICON.card, B('网上付款', 'Bayar dalam talian', 'Pay online'), L('FPX 网上银行、信用卡、电子钱包，或 DuitNow QR 转账上传收据。', 'FPX, kad, e-dompet, atau DuitNow QR dengan resit.', 'FPX, card, e-wallet, or DuitNow QR with your receipt.')],
      [ICON.mail, B('收到确认电邮', 'Terima e-mel pengesahan', 'Get your confirmation'), L('订单编号和电邮马上到，随时在「查订单」看进度。', 'Nombor pesanan dan e-mel sampai serta-merta; semak status bila-bila masa.', 'Order number and email arrive at once; check the status any time.')]
    ];
    $('[data-steps]').innerHTML = steps.map(function (s) { return '<div class="step"><div class="step__ico">' + s[0] + '</div><h3>' + s[1] + '</h3><p>' + esc(s[2]) + '</p></div>'; }).join('');
    $('[data-pays]').innerHTML = ['FPX', 'Visa', 'Mastercard', "Touch 'n Go eWallet", 'GrabPay', 'Boost', 'DuitNow QR'].map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('');

    $('[data-del-head]').innerHTML = '<p class="kicker">' + esc(L('取货与送货', 'Ambil & hantar', 'Collection & delivery')) + '</p><h2>' + B('三种方式，你来选', 'Tiga cara, anda pilih', 'Three ways to get it') + '</h2><p>' + esc(L(fmtShort(F.from) + ' 到 ' + fmtShort(F.to), fmtShort(F.from) + ' hingga ' + fmtShort(F.to), fmtShort(F.from) + ' to ' + fmtShort(F.to))) + '</p>';
    $('[data-del]').innerHTML = [
      [B('自取', 'Ambil sendiri', 'Self-collect'), L('八打灵再也（示范地址），10am–6pm，每两个小时一个时段。', 'Petaling Jaya (alamat demo), 10 pg–6 ptg, slot setiap dua jam.', 'Petaling Jaya (demo address), 10am–6pm, two-hour slots.'), L('免费', 'Percuma', 'Free')],
      [B('巴生谷送货', 'Hantar Lembah Klang', 'Klang Valley delivery'), L('早上或下午送到，派送当天会通知你。', 'Pagi atau petang; kami beritahu pada hari penghantaran.', 'Morning or afternoon; we let you know on the day.'), L('RM15 · 满 RM200 免运', 'RM15 · percuma melebihi RM200', 'RM15 · free over RM200')],
      [B('全马快递', 'Kurier seluruh Malaysia', 'Courier across Malaysia'), L('饼干用密封罐寄出，2–4 个工作天到。蛋糕和花不寄。', 'Biskut dalam balang bertutup, 2–4 hari bekerja. Kek dan bunga tidak dikurier.', 'Cookies in sealed jars, 2–4 working days. No cakes or flowers by courier.'), L('西马 RM12 · 东马 RM25', 'Semenanjung RM12 · Sabah/Sarawak RM25', 'West RM12 · East RM25')]
    ].map(function (o) { return '<div class="opt"><h3>' + o[0] + '</h3><p>' + esc(o[1]) + '</p><b>' + esc(o[2]) + '</b></div>'; }).join('');

    $('[data-gift]').innerHTML = '<img src="img/' + F.band + '.webp" alt="" loading="lazy" width="1920" height="1080"><div><p class="kicker">' + esc(L('送礼', 'Hadiah', 'Gifting')) + '</p><h2>' + B('直接送到对方家', 'Hantar terus kepada mereka', 'Send it straight to them') + '</h2><ul class="ticks">' +
      [L('结账时勾选「送礼」，填对方的名字和电话', 'Tandakan "Hadiah" semasa bayar, isi nama dan nombor penerima', 'Tick "This is a gift" at checkout and add their name and number'), L('附上你写的贺卡', 'Kad ucapan dengan mesej anda', 'Add your own card message'), L('礼盒里不放价钱', 'Tiada harga di dalam kotak', 'No prices inside the box'), L('企业送礼 10 盒以上，另外报价', 'Hadiah korporat 10 kotak ke atas: minta sebut harga', 'Corporate orders of 10+ boxes: ask for a quote')].map(function (t) { return '<li>' + ICON.check + '<span>' + esc(t) + '</span></li>'; }).join('') +
      '</ul><a class="btn" href="#sets">' + esc(L('选礼盒', 'Pilih hamper', 'Choose a gift')) + '</a></div>';

    $('[data-faq-head]').innerHTML = '<p class="kicker">' + esc(L('常见问题', 'Soalan lazim', 'Questions')) + '</p><h2>' + B('下单前想知道的', 'Perkara yang anda mahu tahu', 'Good to know') + '</h2>';
    $('[data-faq]').innerHTML = F.faq.map(function (x) { var a = x[1](F); return '<details><summary>' + esc(x[0][0]) + (LANG !== 'en' && x[0][1] ? ' <small class="muted">' + esc(x[0][1]) + '</small>' : '') + '</summary><p>' + esc(a[0]) + (LANG !== 'en' && a[1] ? '<small class="en">' + esc(a[1]) + '</small>' : '') + '</p></details>'; }).join('');

    if (location.hash && /^#i-/.test(location.hash) && item(location.hash.slice(3))) openItem(location.hash.slice(3));
    setInterval(function () { var el = $('[data-count]'); if (el) el.outerHTML = countdownHTML(); }, 30000);
  }

  // ------------------------------------------------------------------ slots and delivery rules
  var SLOTS = { collect: ['10:00–12:00', '12:00–14:00', '14:00–16:00', '16:00–18:00'], kv: ['10:00–13:00', '14:00–18:00'] };
  function orders() { return load('orders_' + cur, null) || seed(); }
  function setOrders(o) { save('orders_' + cur, o); }
  function booked(date, mode, slot) {
    var cap = CAP[mode], h = hash(cur + date + mode + slot), base = h % 7 === 0 ? cap : (h % Math.max(2, cap - 1));
    var mine = orders().filter(function (o) { return !o.demo && o.date === date && o.mode === mode && o.slot === slot; }).length;
    return Math.min(cap, base + mine);
  }
  function windowDays() { var out = []; for (var d = F.from; d <= F.to; d = addDays(d, 1)) if (d >= today()) out.push(d); return out; }
  function shipDays() { return windowDays().slice(0, 3); }
  function kvPostcode(pc) { var n = +pc; return /^\d{5}$/.test(pc) && ((n >= 40000 && n <= 48300) || (n >= 50000 && n <= 60000) || (n >= 62000 && n <= 68100)); }
  function eastPostcode(pc) { var n = +pc; return (n >= 87000 && n <= 91399) || (n >= 93000 && n <= 98859); }
  var PM = {
    fpx: { n: ['FPX 网上银行', 'FPX perbankan dalam talian', 'FPX online banking'], s: ['Maybank2u、CIMB Clicks、Public Bank 等', 'Maybank2u, CIMB Clicks, Public Bank dan lain-lain', 'Maybank2u, CIMB Clicks, Public Bank and more'] },
    card: { n: ['信用卡 / 借记卡', 'Kad kredit / debit', 'Credit or debit card'], s: ['Visa、Mastercard', 'Visa, Mastercard', 'Visa, Mastercard'] },
    ewallet: { n: ['电子钱包', 'E-dompet', 'E-wallet'], s: ["Touch 'n Go eWallet、GrabPay、Boost、ShopeePay", "Touch 'n Go eWallet, GrabPay, Boost, ShopeePay", "Touch 'n Go eWallet, GrabPay, Boost, ShopeePay"] },
    duitnow: { n: ['DuitNow QR 转账', 'DuitNow QR', 'DuitNow QR transfer'], s: ['扫码转账后上传收据，我们确认后订单生效', 'Imbas, bayar dan muat naik resit; kami sahkan', 'Scan, pay and upload the receipt; we confirm it'] }
  };
  var BANKS = ['Maybank2u', 'CIMB Clicks', 'Public Bank', 'RHB Now', 'Hong Leong Connect', 'AmOnline', 'Bank Islam', 'BSN'];
  var MODE = { collect: ['自取', 'Ambil sendiri', 'Self-collect'], kv: ['巴生谷送货', 'Hantar Lembah Klang', 'Klang Valley delivery'], courier: ['全马快递', 'Kurier', 'Courier'] };
  function modeName(m) { return L.apply(null, MODE[m]); }

  // ------------------------------------------------------------------ checkout: when → details → payment
  function pageCheckout() {
    var root = $('[data-checkout]');
    var S = load('co_' + cur, null) || { step: 1, mode: 'collect', date: '', slot: '', addr: '', pc: '', name: '', phone: '', email: '', gift: false, gname: '', gphone: '', gmsg: '', notes: '', pm: 'fpx', bank: '', receipt: '' };
    function keep() { save('co_' + cur, S); }
    function region() { return S.mode === 'courier' && eastPostcode(S.pc) ? 'east' : 'west'; }
    function totals() { var c = calc(null, S.mode, region()); c.mode = S.mode; return c; }
    function err(msg) { var el = $('[data-err]', root); if (el) { el.innerHTML = '<p class="note note--bad">' + esc(msg) + '</p>'; el.scrollIntoView({ block: 'nearest' }); } }
    function paint() {
      var c = totals();
      if (!c.lines.length) { root.innerHTML = '<div class="ok"><h1>' + B('购物车是空的', 'Troli anda kosong', 'Your cart is empty') + '</h1><a class="btn" href="' + url('index.html') + '#sets">' + esc(L('去选购', 'Mula membeli', 'Start shopping')) + '</a></div>'; return; }
      if (!canOrder()) { root.innerHTML = '<div class="ok"><h1>' + B('现在不接单', 'Tempahan ditutup', 'Not taking orders right now') + '</h1><a class="btn" href="' + url('index.html') + '">' + esc(L('回到首页', 'Kembali', 'Back to the shop')) + '</a></div>'; return; }
      if (c.noCourier && S.mode === 'courier') S.mode = 'collect';
      var days = S.mode === 'courier' ? shipDays() : windowDays();
      if (days.indexOf(S.date) < 0) S.date = days[0] || '';
      var steps = [L('取货 / 送货', 'Ambil / hantar', 'When'), L('你的资料', 'Butiran anda', 'Your details'), L('付款', 'Bayaran', 'Payment')];
      var h = '<h1>' + B('结账', 'Bayaran', 'Checkout') + '</h1><ol class="prog">' + steps.map(function (s, i) { return '<li class="' + (S.step === i + 1 ? 'is-on' : S.step > i + 1 ? 'is-done' : '') + '"><b>' + (S.step > i + 1 ? '✓' : i + 1) + '</b>' + esc(s) + '</li>'; }).join('') + '</ol><div class="co__grid"><div>';
      if (S.step === 1) {
        h += '<section class="panel"><h2>' + B('怎么拿到', 'Cara terima', 'How do you want it?') + '</h2><div class="modes">' + ['collect', 'kv', 'courier'].map(function (m) {
          var dis = m === 'courier' && c.noCourier;
          var sub = m === 'collect' ? L('八打灵再也 · 免费', 'Petaling Jaya · percuma', 'Petaling Jaya · free') : m === 'kv' ? L('RM15 · 满 RM200 免运', 'RM15 · percuma melebihi RM200', 'RM15 · free over RM200') : (dis ? L('购物车里有蛋糕或花，不能快递', 'Ada kek atau bunga dalam troli', 'Not for cakes or flowers in your cart') : L('西马 RM12 · 东马 RM25', 'Semenanjung RM12 · Sabah/Sarawak RM25', 'West RM12 · East RM25'));
          return '<button type="button" class="mode" data-mode="' + m + '" aria-pressed="' + (S.mode === m) + '"' + (dis ? ' disabled' : '') + '><b>' + esc(modeName(m)) + '</b><small>' + esc(sub) + '</small></button>';
        }).join('') + '</div></section>';
        h += '<section class="panel"><h2>' + (S.mode === 'courier' ? B('寄出日期', 'Tarikh pos', 'Dispatch day') : B('选日子', 'Pilih hari', 'Choose a day')) + '</h2>' + (days.length ? '<div class="days">' + days.map(function (d) { return '<button type="button" class="day" data-day="' + d + '" aria-pressed="' + (d === S.date) + '"><small>' + esc(WD[LANG][dow(d)]) + '</small><b>' + new Date(d + 'T00:00:00Z').getUTCDate() + '</b><small>' + esc(LANG === 'zh' ? (new Date(d + 'T00:00:00Z').getUTCMonth() + 1) + '月' : MO[LANG][new Date(d + 'T00:00:00Z').getUTCMonth()]) + '</small></button>'; }).join('') + '</div>' : '<p class="muted">' + esc(L('没有可以选的日子了', 'Tiada hari yang tinggal', 'No days left')) + '</p>') +
          (S.mode === 'courier' ? '<p class="note">' + esc(L('寄出后 2–4 个工作天到，追踪号码会发到你的电邮。', 'Sampai 2–4 hari bekerja selepas dipos; nombor penjejakan dihantar ke e-mel anda.', 'Arrives 2–4 working days after dispatch; the tracking number goes to your email.')) + '</p>' : '') + '</section>';
        if (S.mode !== 'courier') {
          var slots = SLOTS[S.mode], free = slots.filter(function (s) { return booked(S.date, S.mode, s) < CAP[S.mode]; });
          if (slots.indexOf(S.slot) < 0 || free.indexOf(S.slot) < 0) S.slot = free[0] || '';
          h += '<section class="panel"><h2>' + B('选时段', 'Pilih masa', 'Choose a time') + '</h2><div class="slots">' + slots.map(function (s) { var left = CAP[S.mode] - booked(S.date, S.mode, s); return '<button type="button" class="slot" data-slot="' + s + '" aria-pressed="' + (s === S.slot) + '"' + (left <= 0 ? ' disabled' : '') + '>' + s + '<small class="' + (left <= 2 ? 'low' : '') + '">' + esc(left <= 0 ? L('已满', 'Penuh', 'Full') : L('剩 ' + left + ' 个名额', left + ' slot lagi', left + (left === 1 ? ' place' : ' places') + ' left')) + '</small></button>'; }).join('') + '</div></section>';
        }
        if (S.mode !== 'collect') h += '<section class="panel"><h2>' + B('送货地址', 'Alamat penghantaran', 'Delivery address') + '</h2><div class="field"><label for="c-addr">' + esc(L('地址', 'Alamat', 'Address')) + '</label><input class="input" id="c-addr" data-k="addr" value="' + esc(S.addr) + '" autocomplete="street-address" placeholder="' + esc(L('门牌、路名、地区', 'Unit, jalan, kawasan', 'Unit, street, area')) + '"></div><div class="field"><label for="c-pc">' + esc(L('邮区编号', 'Poskod', 'Postcode')) + '</label><input class="input" id="c-pc" data-k="pc" value="' + esc(S.pc) + '" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="47301"></div><div data-pcnote>' + pcNote() + '</div></section>';
        h += '<div data-err></div><div class="co__nav"><a class="btn btn--ghost" href="' + url('index.html') + '#sets">' + esc(L('继续选购', 'Teruskan membeli', 'Keep shopping')) + '</a><button class="btn" type="button" data-next>' + esc(L('下一步', 'Seterusnya', 'Continue')) + '</button></div>';
      } else if (S.step === 2) {
        h += '<section class="panel"><h2>' + B('你的资料', 'Butiran anda', 'Your details') + '</h2><div class="field"><label for="c-name">' + esc(L('名字', 'Nama', 'Name')) + '</label><input class="input" id="c-name" data-k="name" value="' + esc(S.name) + '" autocomplete="name"></div><div class="row2"><div class="field"><label for="c-phone">' + esc(L('手机号码', 'Nombor telefon', 'Mobile number')) + '</label><input class="input" id="c-phone" data-k="phone" type="tel" value="' + esc(S.phone) + '" autocomplete="tel" placeholder="012-345 6789"></div><div class="field"><label for="c-email">' + esc(L('电邮（寄确认信）', 'E-mel (untuk pengesahan)', 'Email (for your confirmation)')) + '</label><input class="input" id="c-email" data-k="email" type="email" value="' + esc(S.email) + '" autocomplete="email" placeholder="you@example.com"></div></div>' +
          '<label class="check"><input type="checkbox" data-k="gift"' + (S.gift ? ' checked' : '') + '><span>' + esc(L('这是送礼（送到别人那里，附贺卡，不放价钱）', 'Ini hadiah (dihantar kepada orang lain, dengan kad, tanpa harga)', 'This is a gift (sent to someone else, with a card, no prices inside)')) + '</span></label>' +
          (S.gift ? '<div class="row2"><div class="field"><label for="c-gname">' + esc(L('收礼人名字', 'Nama penerima', "Recipient's name")) + '</label><input class="input" id="c-gname" data-k="gname" value="' + esc(S.gname) + '"></div><div class="field"><label for="c-gphone">' + esc(L('收礼人电话', 'Telefon penerima', "Recipient's mobile")) + '</label><input class="input" id="c-gphone" data-k="gphone" type="tel" value="' + esc(S.gphone) + '"></div></div><div class="field"><label for="c-gmsg">' + esc(L('贺卡内容', 'Mesej kad', 'Card message')) + ' <small>(' + (150 - S.gmsg.length) + ')</small></label><textarea class="input" id="c-gmsg" data-k="gmsg" maxlength="150" placeholder="' + esc(L('新年快乐，身体健康！', 'Selamat Hari Raya, maaf zahir dan batin.', 'Happy holidays, with love.')) + '">' + esc(S.gmsg) + '</textarea></div>' : '') +
          '<div class="field"><label for="c-notes">' + esc(L('备注（可选）', 'Nota (pilihan)', 'Notes (optional)')) + '</label><textarea class="input" id="c-notes" data-k="notes" maxlength="300">' + esc(S.notes) + '</textarea></div></section>' +
          '<div data-err></div><div class="co__nav"><button class="btn btn--ghost" type="button" data-back>' + esc(L('上一步', 'Kembali', 'Back')) + '</button><button class="btn" type="button" data-next>' + esc(L('去付款', 'Ke bayaran', 'Continue to payment')) + '</button></div>';
      } else {
        h += '<section class="panel"><h2>' + B('付款方式', 'Cara bayar', 'Payment') + '</h2><div class="pm">' + ['fpx', 'card', 'ewallet', 'duitnow'].map(function (k) {
          var on = S.pm === k;
          var extra = '';
          if (on && k === 'fpx') extra = '<div class="banks">' + BANKS.map(function (b) { return '<button type="button" data-bank="' + b + '" aria-pressed="' + (S.bank === b) + '">' + b + '</button>'; }).join('') + '</div>';
          if (on && k === 'card') extra = '<div class="logos"><span>VISA</span><span>Mastercard</span></div><p class="small muted" style="margin:8px 0 0">' + esc(L('下一步在安全付款页面填写卡号（示范里不用填）。', 'Butiran kad diisi di halaman bayaran selamat (tidak perlu dalam demo).', 'You enter the card on the secure payment page next (not needed in this demo).')) + '</p>';
          if (on && k === 'ewallet') extra = '<div class="logos"><span>Touch \'n Go eWallet</span><span>GrabPay</span><span>Boost</span><span>ShopeePay</span></div>';
          if (on && k === 'duitnow') extra = '<div class="qr">' + qrSVG() + '<div><b>Butter &amp; Lantern</b><p class="small" style="margin:4px 0 10px">' + esc(L('用任何银行或电子钱包扫码，转账 ', 'Imbas dengan mana-mana bank atau e-dompet dan bayar ', 'Scan with any bank or e-wallet and pay ')) + '<b>' + rm(c.total) + '</b>' + esc(L('，再上传收据。', ', kemudian muat naik resit.', ', then upload the receipt.')) + '</p><label class="field" style="margin:0"><span>' + esc(L('上传收据', 'Muat naik resit', 'Upload your receipt')) + ' <small>(JPG, PNG, PDF)</small></span><input class="input" type="file" accept="image/*,application/pdf" data-receipt></label>' + (S.receipt ? '<p class="note note--ok">' + ICON.check.replace('<svg', '<svg width="16" height="16"') + ' ' + esc(S.receipt) + '</p>' : '<button class="linkbtn small" type="button" data-skip-receipt>' + esc(L('示范：没有收据也可以继续', 'Demo: teruskan tanpa resit', 'Demo: continue without a receipt')) + '</button>') + '</div></div>';
          return '<div><button type="button" class="pmo" data-pm="' + k + '" aria-pressed="' + on + '" style="width:100%"><span class="dot"></span><span><b>' + esc(L.apply(null, PM[k].n)) + '</b><small>' + esc(L.apply(null, PM[k].s)) + '</small></span></button>' + extra + '</div>';
        }).join('') + '</div><p class="secure">' + ICON.lock + esc(L('付款经过付款网关加密处理，我们看不到你的卡号。', 'Bayaran diproses dengan selamat oleh gerbang pembayaran; kami tidak melihat nombor kad anda.', 'Payments go through an encrypted payment gateway; we never see your card number.')) + '</p></section>' +
          '<div data-err></div><div class="co__nav"><button class="btn btn--ghost" type="button" data-back>' + esc(L('上一步', 'Kembali', 'Back')) + '</button><button class="btn" type="button" data-pay-go>' + esc(S.pm === 'duitnow' ? L('提交订单', 'Hantar pesanan', 'Place order') : L('付款 ', 'Bayar ', 'Pay ') + rm(c.total)) + '</button></div>';
      }
      h += '</div><aside class="panel summ"><h2>' + B('你的订单', 'Pesanan anda', 'Your order') + '</h2>' + c.lines.map(function (x) { return lineHTML(x, false); }).join('') +
        '<p class="small muted" style="margin:10px 0">' + esc(modeName(S.mode)) + (S.date ? ' · ' + esc(fmtDay(S.date)) : '') + (S.slot ? ' · ' + esc(S.slot) : '') + '</p>' + sumHTML(c) +
        '<button class="linkbtn small" type="button" data-cart-open style="margin-top:10px">' + esc(L('修改购物车', 'Ubah troli', 'Edit cart')) + '</button></aside></div>';
      root.innerHTML = h;
    }
    function pcNote() {
      if (!/^\d{5}$/.test(S.pc)) return '';
      if (S.mode === 'kv') return kvPostcode(S.pc) ? '<p class="note note--ok">' + esc(L('这个邮区在巴生谷送货范围内。', 'Poskod ini dalam kawasan Lembah Klang.', 'This postcode is inside our Klang Valley area.')) + '</p>' : '<p class="note note--bad">' + esc(L('这个邮区不在巴生谷范围，请选全马快递。', 'Di luar Lembah Klang; sila pilih kurier.', 'This postcode is outside the Klang Valley; please choose courier.')) + '</p>';
      return '<p class="note">' + esc(eastPostcode(S.pc) ? L('东马快递 RM25', 'Kurier Sabah/Sarawak RM25', 'East Malaysia courier: RM25') : L('西马快递 RM12（满 RM250 免运）', 'Kurier Semenanjung RM12 (percuma melebihi RM250)', 'West Malaysia courier: RM12 (free over RM250)')) + '</p>';
    }
    function check() {
      if (S.step === 1) {
        if (!S.date) return L('请选日子', 'Sila pilih hari', 'Please choose a day');
        if (S.mode !== 'courier' && !S.slot) return L('请选时段', 'Sila pilih masa', 'Please choose a time');
        if (S.mode !== 'collect') { if (S.addr.trim().length < 6) return L('请填写送货地址', 'Sila isi alamat', 'Please enter the delivery address'); if (!/^\d{5}$/.test(S.pc)) return L('请填写五位数的邮区编号', 'Sila isi poskod 5 digit', 'Please enter a 5-digit postcode'); if (S.mode === 'kv' && !kvPostcode(S.pc)) return L('这个邮区不在巴生谷范围', 'Poskod di luar Lembah Klang', 'That postcode is outside the Klang Valley'); }
      }
      if (S.step === 2) {
        if (S.name.trim().length < 2) return L('请填写名字', 'Sila isi nama', 'Please enter your name');
        if (!/^(\+?6?0)1\d[\d\s-]{7,10}$/.test(S.phone.trim())) return L('请填写马来西亚手机号码，例如 012-345 6789', 'Sila isi nombor telefon Malaysia, cth. 012-345 6789', 'Please enter a Malaysian mobile number, e.g. 012-345 6789');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(S.email.trim())) return L('请填写电邮，确认信会寄到这里', 'Sila isi e-mel untuk pengesahan', 'Please enter your email; the confirmation goes there');
        if (S.gift && (S.gname.trim().length < 2 || S.gphone.trim().length < 9)) return L('请填写收礼人的名字和电话', 'Sila isi nama dan telefon penerima', "Please add the recipient's name and mobile");
      }
      if (S.step === 3) {
        if (S.pm === 'fpx' && !S.bank) return L('请选银行', 'Sila pilih bank', 'Please choose your bank');
        if (S.pm === 'duitnow' && !S.receipt) return L('请上传付款收据', 'Sila muat naik resit', 'Please upload your receipt');
      }
      return '';
    }
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-mode]'))) { S.mode = b.getAttribute('data-mode'); S.date = ''; S.slot = ''; keep(); paint(); return; }
      if ((b = e.target.closest('[data-day]'))) { S.date = b.getAttribute('data-day'); S.slot = ''; keep(); paint(); return; }
      if ((b = e.target.closest('[data-slot]'))) { S.slot = b.getAttribute('data-slot'); keep(); paint(); return; }
      if ((b = e.target.closest('[data-pm]'))) { S.pm = b.getAttribute('data-pm'); keep(); paint(); return; }
      if ((b = e.target.closest('[data-bank]'))) { S.bank = b.getAttribute('data-bank'); keep(); paint(); return; }
      if (e.target.closest('[data-skip-receipt]')) { S.receipt = L('示范收据.jpg', 'resit-demo.jpg', 'demo-receipt.jpg'); keep(); paint(); return; }
      if (e.target.closest('[data-back]')) { S.step = Math.max(1, S.step - 1); keep(); paint(); window.scrollTo(0, 0); return; }
      if (e.target.closest('[data-next]')) { var m = check(); if (m) { err(m); return; } S.step++; keep(); paint(); window.scrollTo(0, 0); return; }
      if (e.target.closest('[data-pay-go]')) { var m2 = check(); if (m2) { err(m2); return; } if (S.pm === 'duitnow') place('verify'); else gateway(); }
    });
    root.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'); if (!k) return;
      S[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; keep();
      if (k === 'gift') paint();
      if (k === 'pc') { var n = $('[data-pcnote]', root); if (n) n.innerHTML = pcNote(); }
      if (k === 'gmsg') { var lab = $('label[for="c-gmsg"] small', root); if (lab) lab.textContent = '(' + (150 - S.gmsg.length) + ')'; }
    });
    root.addEventListener('change', function (e) { if (e.target.matches('[data-receipt]') && e.target.files[0]) { S.receipt = e.target.files[0].name.slice(0, 60); keep(); paint(); } });
    function gateway() {
      var c = totals(), p = $('[data-pay]');
      p.innerHTML = '<div class="pay__head"><span>' + ICON.lock.replace('<svg', '<svg width="16" height="16" style="vertical-align:-2px;margin-right:6px"') + 'Secure payment</span><small>Demo</small></div><div class="pay__body"><small>Butter &amp; Lantern</small><p class="pay__amt">' + rm(c.total) + '</p><dl><dt>' + esc(L('付款方式', 'Kaedah', 'Method')) + '</dt><dd>' + esc(L.apply(null, PM[S.pm].n)) + (S.pm === 'fpx' ? ' · ' + esc(S.bank) : '') + '</dd><dt>' + esc(L('订单', 'Pesanan', 'For')) + '</dt><dd>' + c.count + ' ' + esc(L('件', 'item', c.count === 1 ? 'item' : 'items')) + ' · ' + esc(fmtShort(S.date)) + '</dd></dl>' +
        '<button class="pay__btn" type="button" data-approve>' + esc(L('确认付款', 'Sahkan bayaran', 'Approve payment')) + '</button><button class="pay__cancel" type="button" data-close>' + esc(L('取消', 'Batal', 'Cancel')) + '</button><p class="pay__note">' + esc(L('示范：这里不会扣任何钱。真正的网店会转到银行或付款网关的页面。', 'Demo: tiada wang ditolak. Kedai sebenar membuka halaman bank atau gerbang pembayaran.', 'Demo: no money moves. A real shop opens your bank’s or the payment gateway’s page here.')) + '</p></div>';
      p.onclick = function (e) { if (e.target.closest('[data-approve]')) { var b = e.target.closest('[data-approve]'); b.disabled = true; b.textContent = L('处理中…', 'Memproses…', 'Processing…'); setTimeout(function () { place('paid'); }, 900); } };
      openLayer(p);
    }
    function place(status) {
      var c = totals(), seq = load('seq', 1040) + 1; save('seq', seq);
      var o = { no: 'BL-' + seq, fest: cur, at: Date.now(), status: status, mode: S.mode, date: S.date, slot: S.mode === 'courier' ? '' : S.slot, addr: S.addr.trim(), pc: S.pc, name: S.name.trim(), phone: S.phone.trim(), email: S.email.trim(), gift: S.gift ? { name: S.gname.trim(), phone: S.gphone.trim(), msg: S.gmsg.trim() } : null, notes: S.notes.trim(), pm: S.pm, bank: S.pm === 'fpx' ? S.bank : '', receipt: S.pm === 'duitnow' ? S.receipt : '',
        items: c.lines.map(function (x) { return { id: x.it.id, opt: x.l.opt, pers: x.l.pers, qty: x.l.qty, unit: x.unit }; }), sub: c.sub, disc: c.disc, fee: c.fee, total: c.total };
      c.lines.forEach(function (x) { setLeft(x.it.id, leftOf(x.it.id) - x.l.qty); });
      var all = orders(); all.unshift(o); setOrders(all);
      save('cart_' + cur, []); save('co_' + cur, null);
      var mine = load('mine', []); mine.unshift({ fest: cur, no: o.no, phone: o.phone }); save('mine', mine.slice(0, 10));
      location.href = url('order.html', '&no=' + o.no + '&new=1');
    }
    paint();
  }
  function qrSVG() {
    var n = 25, cells = '', h = hash('butter-lantern-duitnow');
    function finder(x, y) { return '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#111"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#111"/>'; }
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) { if ((x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)) continue; h = Math.imul(h ^ (x * 31 + y), 2654435761) >>> 0; if (h % 3 === 0) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; }
    return '<svg viewBox="0 0 ' + n + ' ' + n + '" role="img" aria-label="DuitNow QR (demo)" shape-rendering="crispEdges"><g fill="#111">' + cells + '</g>' + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '<rect x="10" y="10" width="5" height="5" fill="#ed1c62"/></svg>';
  }

  // ------------------------------------------------------------------ order confirmation and tracking
  var FLOW = {
    collect: [['paid', ['已付款', 'Dibayar', 'Paid']], ['baking', ['制作中', 'Sedang dibakar', 'Baking']], ['ready', ['可以取货', 'Sedia diambil', 'Ready to collect']], ['done', ['已取货', 'Sudah diambil', 'Collected']]],
    kv: [['paid', ['已付款', 'Dibayar', 'Paid']], ['baking', ['制作中', 'Sedang dibakar', 'Baking']], ['ready', ['派送中', 'Dalam penghantaran', 'Out for delivery']], ['done', ['已送达', 'Sudah sampai', 'Delivered']]],
    courier: [['paid', ['已付款', 'Dibayar', 'Paid']], ['baking', ['制作中', 'Sedang dibakar', 'Baking']], ['ready', ['已寄出', 'Sudah dipos', 'Shipped']], ['done', ['已送达', 'Sudah sampai', 'Delivered']]]
  };
  function stName(o) { if (o.status === 'verify') return L('付款确认中', 'Bayaran sedang disemak', 'Checking your payment'); var f = FLOW[o.mode].filter(function (x) { return x[0] === o.status; })[0]; return f ? L.apply(null, f[1]) : o.status; }
  function findOrder(no) { return orders().filter(function (o) { return o.no.toUpperCase() === String(no || '').trim().toUpperCase(); })[0]; }
  function ics(o) {
    var t = (o.slot || '10:00–12:00').split('–'), d = o.date.replace(/-/g, '');
    function z(hm) { var p = hm.split(':'); var h = +p[0] - 8; return d + 'T' + String(h).padStart(2, '0') + p[1] + '00Z'; }
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Butter and Lantern demo//EN', 'BEGIN:VEVENT', 'UID:' + o.no + '@butter-lantern.demo', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + z(t[0]), 'DTEND:' + z(t[1] || t[0]), 'SUMMARY:' + (o.mode === 'collect' ? 'Collect' : 'Delivery') + ' ' + o.no + ' (Butter & Lantern demo)', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function pageOrder() {
    var root = $('[data-order]'), o = findOrder(q('no'));
    if (!o) {
      var mine = load('mine', []).filter(function (m) { return m.fest === cur; });
      root.innerHTML = '<div style="max-width:560px;margin:0 auto"><h1>' + B('查订单', 'Semak pesanan', 'Track your order') + '</h1><form class="panel" data-track><div class="field"><label for="t-no">' + esc(L('订单编号', 'Nombor pesanan', 'Order number')) + '</label><input class="input" id="t-no" name="no" placeholder="BL-1041" required></div><div class="field"><label for="t-ph">' + esc(L('下单时的手机号码', 'Nombor telefon semasa tempahan', 'Mobile number used for the order')) + '</label><input class="input" id="t-ph" name="phone" type="tel" placeholder="012-345 6789" required></div><div data-err></div><button class="btn btn--block" type="submit">' + esc(L('查看', 'Semak', 'Find my order')) + '</button></form>' +
        (mine.length ? '<p class="muted small">' + esc(L('这台设备最近的订单：', 'Pesanan terkini di peranti ini:', 'Recent orders on this device:')) + ' ' + mine.map(function (m) { return '<a href="' + url('order.html', '&no=' + m.no) + '">' + esc(m.no) + '</a>'; }).join(', ') + '</p>' : '<p class="muted small">' + esc(L('示范：可以试 BL-1031，电话 012-555 0131。', 'Demo: cuba BL-1031, telefon 012-555 0131.', 'Demo: try BL-1031 with 012-555 0131.')) + '</p>') + '</div>';
      $('[data-track]').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, x = findOrder(f.no.value), digits = function (s) { return String(s).replace(/\D/g, '').replace(/^60/, '0'); };
        if (!x || digits(x.phone) !== digits(f.phone.value)) { $('[data-err]').innerHTML = '<p class="note note--bad">' + esc(L('找不到这张订单，请检查编号和电话。', 'Pesanan tidak dijumpai; semak nombor dan telefon.', 'We could not find that order; check the number and mobile.')) + '</p>'; return; }
        location.href = url('order.html', '&no=' + x.no);
      });
      return;
    }
    var fresh = q('new') === '1', verify = o.status === 'verify', flow = FLOW[o.mode], idx = flow.map(function (x) { return x[0]; }).indexOf(o.status);
    var lines = o.items.map(function (x) { var it = item(x.id); return it ? { l: { k: '', opt: x.opt, pers: x.pers, qty: x.qty }, it: it, unit: x.unit } : null; }).filter(Boolean);
    var where = o.mode === 'collect' ? L('八打灵再也（示范地址）', 'Petaling Jaya (alamat demo)', 'Petaling Jaya (demo address)') : o.addr + ', ' + o.pc;
    var tl = '<ol class="tl">' + (verify ? '<li class="is-now"><i></i><b>' + esc(L('付款确认中', 'Bayaran sedang disemak', 'Checking your payment')) + '</b><small>' + esc(L('我们收到你的 DuitNow 收据，一个工作天内确认。', 'Kami terima resit DuitNow anda; disahkan dalam 1 hari bekerja.', 'We have your DuitNow receipt and confirm it within one working day.')) + '</small></li>' : '') +
      flow.map(function (x, i) { var cls = !verify && i < idx ? 'is-done' : !verify && i === idx ? 'is-now is-done' : ''; return '<li class="' + cls + '"><i></i><b>' + esc(L.apply(null, x[1])) + '</b>' + (i === 2 && o.mode !== 'courier' ? '<small>' + esc(fmtDay(o.date) + (o.slot ? ' · ' + o.slot : '')) + '</small>' : i === 2 ? '<small>' + esc(L('寄出日 ', 'Dipos ', 'Dispatch ') + fmtDay(o.date)) + '</small>' : '') + '</li>'; }).join('') + '</ol>';
    var mailBody = '<p>' + esc(L('你好 ' + o.name + '，', 'Hai ' + o.name + ',', 'Hi ' + o.name + ',')) + '</p><p>' + esc(verify ? L('我们收到你的订单和 DuitNow 收据，确认后会再寄一封电邮给你。', 'Kami terima pesanan dan resit DuitNow anda; e-mel pengesahan menyusul.', 'We have your order and DuitNow receipt; we will email again once it is confirmed.') : L('谢谢你的订单，付款已收到。', 'Terima kasih, bayaran telah diterima.', 'Thank you, your payment has been received.')) + '</p>' +
      '<dl class="kv"><dt>' + esc(L('订单', 'Pesanan', 'Order')) + '</dt><dd>' + esc(o.no) + '</dd><dt>' + esc(modeName(o.mode)) + '</dt><dd>' + esc(fmtDay(o.date) + (o.slot ? ' · ' + o.slot : '')) + '</dd><dt>' + esc(L('总额', 'Jumlah', 'Total')) + '</dt><dd>' + rm(o.total) + '</dd></dl>';
    root.innerHTML = '<div class="ok"><span class="ok__ico' + (verify ? ' ok__ico--wait' : '') + '">' + (verify ? ICON.clock : ICON.check) + '</span><h1>' + (verify ? B('已收到订单，正在确认付款', 'Pesanan diterima, bayaran sedang disemak', 'Order received; checking your payment') : fresh ? B('谢谢！订单已确认', 'Terima kasih! Pesanan disahkan', 'Thank you, your order is confirmed') : B('你的订单', 'Pesanan anda', 'Your order')) + '</h1><p class="muted">' + esc(L('订单编号', 'Nombor pesanan', 'Order number')) + ' <b style="color:var(--ink);font-size:1.15rem">' + esc(o.no) + '</b> · ' + esc(L('确认电邮已寄到 ', 'E-mel pengesahan dihantar ke ', 'Confirmation sent to ') + o.email) + '</p></div>' +
      '<div class="ord"><div><section class="panel"><h2>' + B('订单进度', 'Status pesanan', 'Order status') + '</h2>' + tl + '</section>' +
      '<section class="panel"><h2>' + B(o.mode === 'collect' ? '取货' : '送货', o.mode === 'collect' ? 'Ambil' : 'Penghantaran', o.mode === 'collect' ? 'Collection' : 'Delivery') + '</h2><dl class="kv"><dt>' + esc(L('日子', 'Hari', 'Day')) + '</dt><dd>' + esc(fmtDay(o.date)) + (o.slot ? ' · ' + esc(o.slot) : '') + '</dd><dt>' + esc(L('地点', 'Tempat', 'Where')) + '</dt><dd>' + esc(where) + '</dd>' + (o.gift ? '<dt>' + esc(L('送给', 'Untuk', 'Gift for')) + '</dt><dd>' + esc(o.gift.name) + (o.gift.msg ? ' · “' + esc(o.gift.msg) + '”' : '') + '</dd>' : '') + '<dt>' + esc(L('付款', 'Bayaran', 'Payment')) + '</dt><dd>' + esc(L.apply(null, PM[o.pm].n)) + (o.bank ? ' · ' + esc(o.bank) : '') + (o.receipt ? ' · ' + esc(o.receipt) : '') + '</dd></dl>' +
      (o.mode !== 'courier' ? '<p style="margin:14px 0 0"><a class="btn btn--sm btn--ghost" download="' + esc(o.no) + '.ics" href="data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(o)) + '">' + ICON.cal.replace('<svg', '<svg width="16" height="16"') + ' ' + esc(L('加入日历', 'Tambah ke kalendar', 'Add to calendar')) + '</a></p>' : '') + '</section>' +
      '<section class="panel"><h2>' + B('确认电邮', 'E-mel pengesahan', 'Your confirmation email') + '</h2><div class="mail"><div class="mail__head"><b>Butter &amp; Lantern</b> &lt;orders@example.com&gt;<br>' + esc(L('收件人', 'Kepada', 'To')) + ': ' + esc(o.email) + '<br>' + esc(L('主旨', 'Subjek', 'Subject')) + ': <b>' + esc((verify ? L('已收到订单 ', 'Pesanan diterima ', 'Order received ') : L('订单确认 ', 'Pengesahan pesanan ', 'Order confirmed ')) + o.no) + '</b></div><div class="mail__brand">Butter &amp; Lantern</div><div class="mail__body">' + mailBody + '</div></div><p class="small muted" style="margin:10px 0 0">' + esc(L('示范：电邮不会真的寄出。真正的网店（WooCommerce）会自动寄这封信给顾客，也会通知店主。', 'Demo: e-mel tidak dihantar. Kedai sebenar (WooCommerce) menghantarnya secara automatik dan memberitahu pemilik.', 'Demo: no email is sent. The real shop (WooCommerce) sends this automatically, and tells the owner too.')) + '</p></section></div>' +
      '<aside class="panel summ"><h2>' + B('订单内容', 'Butiran pesanan', 'What you ordered') + '</h2>' + lines.map(function (x) { return lineHTML(x, false); }).join('') + sumHTML({ sub: o.sub, disc: o.disc, fee: o.fee, total: o.total, mode: o.mode }) + '<p class="small muted" style="margin:12px 0 0">' + esc(L('需要更改？取货前两天电邮 hello@example.com，写上订单编号。', 'Perlu ubah? E-mel hello@example.com dua hari sebelum, dengan nombor pesanan.', 'Need a change? Email hello@example.com two days before, with your order number.')) + '</p><a class="btn btn--block btn--ghost" style="margin-top:12px" href="' + url('index.html') + '">' + esc(L('继续选购', 'Teruskan membeli', 'Back to the shop')) + '</a></aside></div>';
  }

  // ------------------------------------------------------------------ demo orders for the owner's side
  function seed() {
    var names = { zh: ['陈美玲', '林伟杰', '黄嘉欣', '李志明', '郑淑芬', '吴家豪', '张慧敏', '刘俊宏', '许佩珊', '杨志强', '何丽娟', '罗建华'], ms: ['Nur Aisyah', 'Ahmad Faiz', 'Siti Hajar', 'Mohd Hafiz', 'Farah Nadia', 'Amirul Hakim', 'Nurul Izzah', 'Syafiq Rahman', 'Aina Sofea', 'Hafizuddin', 'Zulaikha', 'Irfan Danial'], en: ['Sarah Lim', 'Daniel Tan', 'Priya Nair', 'Jason Wong', 'Aisha Rahman', 'Michelle Ong', 'Kevin Lee', 'Rachel Chua', 'Arjun Menon', 'Melissa Goh', 'Brandon Yeo', 'Hannah Koh'] }[LANG];
    var days = []; for (var d = F.from; d <= F.to; d = addDays(d, 1)) days.push(d);
    var sts = ['paid', 'paid', 'verify', 'paid', 'baking', 'paid', 'verify', 'paid', 'baking', 'ready', 'paid', 'paid'], modes = ['collect', 'collect', 'kv', 'collect', 'courier', 'kv', 'collect', 'collect', 'kv', 'collect', 'courier', 'collect'], pms = ['fpx', 'ewallet', 'duitnow', 'card', 'fpx', 'fpx', 'duitnow', 'ewallet', 'card', 'fpx', 'fpx', 'ewallet'];
    var out = names.map(function (nm, i) {
      var h = hash(cur + nm), its = [], n = 1 + h % 3;
      for (var j = 0; j < n; j++) { var it = F.items[(h >>> (j * 3)) % F.items.length]; if (!it || its.some(function (x) { return x.id === it.id; }) || (modes[i] === 'courier' && it.noCourier)) continue; var opt = it.opts ? it.opts[(h >>> 7) % it.opts.length].id : ''; its.push({ id: it.id, opt: opt, pers: it.personal ? 'Amir & Hana' : '', qty: 1 + (h >>> (j + 4)) % 2, unit: unitPrice(it, opt) }); }
      if (!its.length) { var it0 = F.items.filter(function (x) { return !x.noCourier; })[0]; its.push({ id: it0.id, opt: it0.opts ? it0.opts[0].id : '', pers: '', qty: 1, unit: unitPrice(it0, it0.opts ? it0.opts[0].id : '') }); }
      var sub = its.reduce(function (a, x) { return a + x.unit * x.qty; }, 0), disc = Math.round(sub * 10) / 100, fee = modes[i] === 'kv' ? (sub - disc >= 200 ? 0 : 15) : modes[i] === 'courier' ? 12 : 0;
      return { demo: true, no: 'BL-' + (1030 + i), fest: cur, at: Date.now() - (i + 1) * 5.3e6, status: sts[i], mode: modes[i], date: days[i % days.length], slot: modes[i] === 'courier' ? '' : SLOTS[modes[i]][h % SLOTS[modes[i]].length], addr: modes[i] === 'collect' ? '' : 'No. ' + (10 + i) + ', Jalan SS2/' + (20 + i), pc: modes[i] === 'courier' ? '81300' : '47300', name: nm, phone: '012-555 01' + (30 + i), email: 'customer' + (i + 1) + '@example.com', gift: i % 5 === 3 ? { name: names[(i + 4) % names.length], phone: '012-555 0199', msg: L('新年快乐！', 'Selamat Hari Raya!', 'With love!') } : null, notes: '', pm: pms[i], bank: pms[i] === 'fpx' ? BANKS[i % BANKS.length] : '', receipt: pms[i] === 'duitnow' ? 'receipt-' + (1030 + i) + '.jpg' : '', items: its, sub: sub, disc: disc, fee: fee, total: Math.round((sub - disc + fee) * 100) / 100 };
    });
    save('orders_' + cur, out);
    return out;
  }

  // ------------------------------------------------------------------ owner dashboard
  function pageOwner() {
    var root = $('[data-owner]'), tab = q('tab') || 'orders', filter = 'all', pday = '';
    var NEXT = { verify: 'paid', paid: 'baking', baking: 'ready', ready: 'done' };
    function nextLabel(o) { if (o.status === 'verify') return L('确认收款', 'Sahkan bayaran', 'Payment received'); if (o.status === 'paid') return L('开始制作', 'Mula bakar', 'Start baking'); if (o.status === 'baking') return L(o.mode === 'collect' ? '已做好，通知取货' : o.mode === 'kv' ? '已出车' : '已寄出', o.mode === 'collect' ? 'Sedia, beritahu pelanggan' : o.mode === 'kv' ? 'Sudah keluar' : 'Sudah dipos', o.mode === 'collect' ? 'Ready: tell the customer' : o.mode === 'kv' ? 'Out for delivery' : 'Shipped'); if (o.status === 'ready') return L(o.mode === 'collect' ? '已取货' : '已送达', o.mode === 'collect' ? 'Sudah diambil' : 'Sudah sampai', o.mode === 'collect' ? 'Collected' : 'Delivered'); return ''; }
    function paint() {
      var all = orders(), live = all.filter(function (o) { return o.status !== 'cancel'; });
      var sales = live.reduce(function (a, o) { return a + o.total; }, 0), toCheck = live.filter(function (o) { return o.status === 'verify'; }).length, leftSum = F.items.reduce(function (a, it) { return a + (isOff(it.id) ? 0 : leftOf(it.id)); }, 0);
      var h = '<div class="own__head"><div><p class="kicker">' + esc(L('店主后台 · 示范', 'Papan pemilik · demo', 'Owner dashboard · demo')) + '</p><h1>' + B(T(F.name) + '订单', 'Pesanan ' + T(F.name), T(F.name) + ' orders') + '</h1></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--sm btn--ghost" type="button" data-csv>' + esc(L('导出 CSV', 'Eksport CSV', 'Export CSV')) + '</button><a class="btn btn--sm" href="' + url('index.html') + '">' + esc(L('看网店', 'Lihat kedai', 'View the shop')) + '</a></div></div>' +
        '<p class="note" style="margin:0 0 16px">' + esc(L('示范：这些是假订单。在这个示范网店下单，订单会马上出现在这里。真正的网店用 WooCommerce 后台，手机也能用。', 'Demo: pesanan contoh. Buat pesanan di kedai demo dan ia muncul di sini. Kedai sebenar guna papan WooCommerce, juga di telefon.', 'Demo: these are sample orders. Place an order in the demo shop and it appears here at once. A real shop uses the WooCommerce dashboard, on your phone too.')) + '</p>' +
        '<div class="kpis"><div class="kpi"><small>' + esc(L('订单', 'Pesanan', 'Orders')) + '</small><b>' + live.length + '</b></div><div class="kpi"><small>' + esc(L('销售额', 'Jualan', 'Sales')) + '</small><b>' + rm(sales) + '</b></div><div class="kpi"><small>' + esc(L('待确认付款', 'Bayaran untuk disemak', 'Payments to check')) + '</small><b>' + toCheck + '</b></div><div class="kpi"><small>' + esc(L('剩余份数', 'Baki stok', 'Items left')) + '</small><b>' + leftSum + '</b></div></div>' +
        '<div class="tabs" role="tablist">' + [['orders', L('订单', 'Pesanan', 'Orders')], ['bake', L('每日生产', 'Senarai bakar', 'What to bake')], ['stock', L('库存', 'Stok', 'Stock')], ['settings', L('设置', 'Tetapan', 'Settings')]].map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
      if (tab === 'orders') {
        var list = live.filter(function (o) { return filter === 'all' || (filter === 'verify' ? o.status === 'verify' : filter === 'open' ? o.status !== 'done' : o.status === 'done'); });
        h += '<div class="cats" style="justify-content:flex-start">' + [['all', L('全部', 'Semua', 'All')], ['verify', L('待确认付款', 'Untuk disemak', 'To check')], ['open', L('处理中', 'Dalam proses', 'In progress')], ['done', L('已完成', 'Selesai', 'Done')]].map(function (f) { return '<button type="button" data-filter="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + esc(f[1]) + '</button>'; }).join('') + '</div><div class="olist">' +
          (list.length ? list.map(function (o) {
            var nx = nextLabel(o);
            return '<div class="orow" data-row="' + esc(o.no) + '"><div><b>' + esc(o.no) + '</b><small>' + esc(fmtShort(o.date)) + (o.slot ? ' · ' + esc(o.slot) : '') + '</small></div><div><b>' + esc(o.name) + (o.demo ? '' : ' ★') + '</b><small>' + esc(o.items.map(function (x) { var it = item(x.id); return (it ? T(it.n) : x.id) + ' ×' + x.qty; }).join(', ')) + '</small></div><div><small>' + esc(modeName(o.mode)) + ' · ' + esc(L.apply(null, PM[o.pm].n)) + '</small><b>' + rm(o.total) + '</b></div><div class="orow__act"><span class="st st--' + o.status + '">' + esc(stName(o)) + '</span>' + (nx ? '<button class="btn btn--sm" type="button" data-adv="' + esc(o.no) + '">' + esc(nx) + '</button>' : '') + '</div></div>';
          }).join('') : '<div class="empty">' + esc(L('这里没有订单', 'Tiada pesanan', 'No orders here')) + '</div>') + '</div>';
      } else if (tab === 'bake') {
        var days = []; for (var d = F.from; d <= F.to; d = addDays(d, 1)) days.push(d);
        if (days.indexOf(pday) < 0) pday = days[0];
        var dayOrders = live.filter(function (o) { return o.date === pday && o.status !== 'verify'; }), totals = {};
        dayOrders.forEach(function (o) { o.items.forEach(function (x) { var k = x.id + '|' + x.opt; totals[k] = (totals[k] || 0) + x.qty; }); });
        h += '<div class="days" style="margin-bottom:14px">' + days.map(function (d) { var n = live.filter(function (o) { return o.date === d; }).length; return '<button type="button" class="day" data-pday="' + d + '" aria-pressed="' + (d === pday) + '"><small>' + esc(WD[LANG][dow(d)]) + '</small><b>' + new Date(d + 'T00:00:00Z').getUTCDate() + '</b><small>' + n + ' ' + esc(L('单', 'pesanan', n === 1 ? 'order' : 'orders')) + '</small></button>'; }).join('') + '</div>' +
          '<table class="prod"><thead><tr><th>' + esc(L('要做的', 'Perlu dibakar', 'To bake')) + '</th><th>' + esc(L('数量', 'Kuantiti', 'Qty')) + '</th></tr></thead><tbody>' + (Object.keys(totals).length ? Object.keys(totals).map(function (k) { var p = k.split('|'), it = item(p[0]); return '<tr><td>' + esc(it ? T(it.n) : p[0]) + (p[1] && it ? ' · ' + esc(T(unitLabel(it, p[1]))) : '') + '</td><td><b>' + totals[k] + '</b></td></tr>'; }).join('') : '<tr><td colspan="2" class="muted">' + esc(L('这天还没有已付款的订单', 'Tiada pesanan berbayar untuk hari ini', 'No paid orders for this day yet')) + '</td></tr>') + '</tbody></table>' +
          '<p class="small muted" style="margin-top:10px">' + esc(L('只算已付款的订单；DuitNow 确认收款后才会算进来。', 'Hanya pesanan berbayar; DuitNow dikira selepas disahkan.', 'Paid orders only; DuitNow orders count once you confirm the payment.')) + '</p>';
      } else if (tab === 'stock') {
        h += '<div class="stk">' + F.items.map(function (it) { var off = !!load('off_' + cur, {})[it.id], left = leftOf(it.id); return '<div class="stk__row"><img src="img/' + it.img + '.webp" alt="" width="52" height="52"><div><b>' + esc(T(it.n)) + '</b><small class="muted" style="display:block">' + esc(L('剩 ' + left + ' / ' + it.total, 'Baki ' + left + ' / ' + it.total, left + ' left of ' + it.total)) + '</small></div><div class="qty"><button type="button" data-stk="' + it.id + '" data-d="-1" aria-label="One less">−</button><output>' + left + '</output><button type="button" data-stk="' + it.id + '" data-d="1" aria-label="One more">+</button></div><label class="switch"><input type="checkbox" data-off="' + it.id + '"' + (off ? ' checked' : '') + '>' + esc(L('暂停卖', 'Tutup', 'Sold out')) + '</label></div>'; }).join('') + '</div>';
      } else {
        var st = setOf(cur);
        h += '<div class="setgrid"><div class="panel"><div class="field"><label for="s-cut">' + esc(L('最后下单日期', 'Tarikh akhir tempahan', 'Last order day')) + '</label><input class="input" type="date" id="s-cut" data-set="cutoff" value="' + esc(st.cutoff || FESTS[cur].cutoff) + '"></div><div class="field"><label for="s-early">' + esc(L('早鸟优惠到', 'Diskaun awal hingga', 'Early-bird until')) + '</label><input class="input" type="date" id="s-early" data-set="early" value="' + esc(st.early || F.early) + '"></div></div>' +
          '<div class="panel"><div class="field"><label for="s-cc">' + esc(L('每个自取时段最多几单', 'Maksimum pesanan setiap slot ambil', 'Max orders per collection slot')) + '</label><input class="input" type="number" min="1" max="30" id="s-cc" data-set="capCollect" value="' + CAP.collect + '"></div><div class="field"><label for="s-ck">' + esc(L('每个送货时段最多几单', 'Maksimum pesanan setiap slot hantar', 'Max orders per delivery slot')) + '</label><input class="input" type="number" min="1" max="40" id="s-ck" data-set="capKv" value="' + CAP.kv + '"></div><label class="check"><input type="checkbox" data-set="paused"' + (st.paused ? ' checked' : '') + '>' + esc(L('暂停接单（网店会显示暂停）', 'Tutup tempahan sementara', 'Pause orders (the shop says so)')) + '</label></div></div>' +
          '<p><button class="linkbtn" type="button" data-reset>' + esc(L('重设示范资料', 'Set semula demo', 'Reset this demo')) + '</button></p>';
      }
      root.innerHTML = h;
    }
    root.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-tab]'))) { tab = b.getAttribute('data-tab'); paint(); return; }
      if ((b = e.target.closest('[data-filter]'))) { filter = b.getAttribute('data-filter'); paint(); return; }
      if ((b = e.target.closest('[data-pday]'))) { pday = b.getAttribute('data-pday'); paint(); return; }
      if ((b = e.target.closest('[data-adv]'))) { var all = orders(), o = all.filter(function (x) { return x.no === b.getAttribute('data-adv'); })[0]; if (o && NEXT[o.status]) { o.status = NEXT[o.status]; setOrders(all); toast(o.no + ': ' + stName(o)); paint(); } return; }
      if ((b = e.target.closest('[data-stk]'))) { setLeft(b.getAttribute('data-stk'), leftOf(b.getAttribute('data-stk')) + +b.getAttribute('data-d')); paint(); return; }
      if (e.target.closest('[data-csv]')) {
        var rows = [['order', 'name', 'phone', 'email', 'mode', 'date', 'slot', 'items', 'total', 'payment', 'status']].concat(orders().map(function (o) { return [o.no, o.name, o.phone, o.email, o.mode, o.date, o.slot, o.items.map(function (x) { var it = item(x.id); return (it ? it.n[it.n.length - 1] : x.id) + ' x' + x.qty; }).join('; '), o.total.toFixed(2), o.pm, o.status]; }));
        var csv = rows.map(function (r) { return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
        var a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv); a.download = 'butter-lantern-' + cur + '-orders.csv'; document.body.appendChild(a); a.click(); a.remove(); return;
      }
      if (e.target.closest('[data-reset]')) { ['orders_', 'left_', 'off_', 'set_', 'cart_', 'co_'].forEach(function (k) { try { localStorage.removeItem('bl_' + k + cur); } catch (err) { /* ignore */ } }); location.reload(); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-off]')) { var off = load('off_' + cur, {}); off[t.getAttribute('data-off')] = t.checked; save('off_' + cur, off); paint(); return; }
      if (t.matches('[data-set]')) { var st = setOf(cur), k = t.getAttribute('data-set'); st[k] = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(1, +t.value || 1) : t.value; save('set_' + cur, st); toast(L('已保存', 'Disimpan', 'Saved')); }
    });
    paint();
  }

  chrome();
  var page = document.body.getAttribute('data-page');
  if (page === 'home') pageHome();
  else if (page === 'checkout') pageCheckout();
  else if (page === 'order') pageOrder();
  else if (page === 'owner') pageOwner();
})();
