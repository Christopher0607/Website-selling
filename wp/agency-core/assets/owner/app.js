/* 店家后台 /dian/（Cartsmith agency-core，2026-11-13）
   One page app, no build step. Data: REST agc/v1/owner/* (cookie login + nonce). Text is always inserted as text, never as HTML. */
(function () {
  'use strict';
  var C = window.AGC_OWNER || {};
  var ZH = C.lang === 'zh';
  var TZ = C.tz || 'Asia/Kuala_Lumpur';

  /* ------------------------------------------------------------------ words */
  var W = {
    en: {
      home: 'Overview', orders: 'Orders', production: 'Production', products: 'Products', more: 'More', customers: 'Customers', reports: 'Reports', settings: 'Settings',
      loading: 'Loading…', retry: 'Try again', saved: 'Saved', error: 'Something went wrong: {0}', expired: 'You were logged out. Opening the login page…', back: 'Back',
      f_check: 'Payment to check', f_make: 'To make', f_ready: 'Ready', f_done: 'Done', f_all: 'All', f_cancelled: 'Cancelled', f_pending: 'Not paid yet',
      today: 'Today', season: 'This season', orders_n: '{0} orders', revenue: 'Sales', paid: 'Paid', check: 'To check',
      tile_check: 'payments to check', tile_make: 'paid, to make', tile_ready: 'ready / on the way', tile_today: 'orders today', tile_rev: 'paid today', tile_season: 'orders this season', tile_sales: 'paid this season',
      closes_in: 'Pre-orders close in {0} days {1} hrs', closes_at: 'Cut-off: {0}', closed: 'Pre-orders are closed', early_on: 'Early-bird {0}% off is on', season_off: 'Festive season is switched off', change: 'Change',
      next_days: 'Coming up', no_next: 'No collections or deliveries coming up.', stock_alert: 'Stock', low_left: 'Only {0} left', sold_out: 'Sold out', all_good: 'Stock looks fine.', notify_n: '{0} people asked to be told when you open again',
      search_orders: 'Name, phone or order no.', no_orders: 'No orders here.', load_more: 'Show more', items: 'Items', subtotal: 'Subtotal', shipping: 'Delivery', total: 'Total', payment: 'Payment',
      receipt: 'Payment receipt', see_receipt: 'Open receipt', no_receipt: 'No receipt uploaded yet.', customer: 'Customer', phone: 'Phone', email: 'Email', address: 'Address', send_to: 'Send to (gift)', note: 'Customer note', collect_at: 'Collect at',
      call: 'Call', whatsapp: 'WhatsApp', history: 'History', add_note: 'Add a note', note_ph: 'Only you see this, unless you tick the box', note_cust: 'Send to the customer (by email)', add: 'Add',
      act_paid: 'Payment received', act_ready_c: 'Ready for collection', act_ready_d: 'Out for delivery', act_done: 'Done', act_cancel: 'Cancel order', act_hold: 'Back to "payment to check"',
      cancel_q: 'Cancel order #{0}?', cancel_p: 'The items go back into stock. The customer is not refunded automatically: refund them from your bank or payment gateway.', yes_cancel: 'Yes, cancel', keep: 'Keep the order',
      paid_q: 'Payment received for #{0}?', paid_p: 'Check your bank app first. The customer gets an email that the payment is confirmed.', yes: 'Yes', no: 'No',
      move: 'Change day / time', move_h: 'Move to another day or time', full: 'Full', left: '{0} left', courier: 'Courier', no_slot: 'No day or time to choose.',
      make_h: 'What to make', print: 'Print', by_slot: 'Orders by time', nothing_day: 'Nothing for this day.', item: 'Item',
      add_product: 'Add a product', search_products: 'Search products', no_stock_count: 'Stock not counted', hidden: 'Hidden', draft: 'Draft', plan_limit: 'Your plan includes up to {0} items; {1} are on sale.',
      p_name: 'Name', p_price: 'Price (RM)', p_sale: 'Sale price (RM, optional)', p_stock: 'How many left', p_stock_hint: 'Leave empty to not count stock', p_status: 'On the website', p_on: 'On sale', p_hide: 'Hidden',
      p_short: 'Short description', p_desc: 'Full description', p_cat: 'Category', p_cat_new: 'New category…', p_photos: 'Photos', p_add_photo: 'Add photo', p_main: 'Main', p_options: 'Options', p_option: 'Option',
      p_soldout: 'Mark as sold out', p_save: 'Save', p_delete: 'Delete product', p_delete_q: 'Delete “{0}”?', p_delete_p: 'It moves to the bin in WordPress and can be restored there.', p_view: 'View on the website', p_new: 'New product', uploading: 'Uploading photo…',
      c_search: 'Search customers', c_orders: '{0} orders', c_notify: 'Waiting for next season', c_copy: 'Copy all numbers', c_copied: 'Numbers copied', c_none: 'No customers yet.', c_notify_none: 'Nobody yet.',
      r_days: 'Last {0} days', r_sales: 'Paid sales', r_orders: 'Paid orders', r_avg: 'Average order', r_chart: 'Paid sales per day', r_top: 'Best sellers', r_pay: 'Payment methods', r_mode: 'Collection & delivery', r_export: 'Export orders (CSV)', r_qty: 'Sold', r_rev: 'Sales', r_none: 'No paid orders in this period.',
      s_fest: 'Festive pre-orders', s_on: 'Festive season on', s_name: 'Season name', s_cutoff: 'Last day to order', s_cut_time: 'Until', s_from: 'First collection day', s_to: 'Last collection day', s_closed: 'Days off (YYYY-MM-DD, commas)',
      s_collect: 'Self-collect times', s_delivery: 'Delivery times', s_from_t: 'From', s_to_t: 'To', s_cap: 'Orders', s_add_slot: 'Add a time', s_early_end: 'Early-bird until', s_early_pct: 'Early-bird discount %', s_show_left: 'Show how many are left', s_low: 'Say “only X left” at', s_notify: 'After the cut-off, collect numbers for next season', s_courier: 'Note for courier orders',
      s_shop: 'Shop details', s_legal: 'Business name', s_phone: 'Phone', s_email: 'Email', s_address: 'Address (also the collection point)', s_hours: 'Opening hours', s_announce: 'Announcement bar (empty = off)',
      s_duit: 'DuitNow QR', s_duit_on: 'Accept DuitNow QR', s_qr: 'Your DuitNow QR', s_qr_up: 'Upload QR', s_account: 'Name under the QR', s_duit_note: 'Note to customers', s_demo_qr: 'Demo store: a sample QR marked DEMO is shown until you upload yours.',
      s_ship: 'Delivery fees', s_free_min: 'Free from (RM)', s_cost: 'Fee (RM)', s_save: 'Save',
      m_shop: 'View the shop', m_wp: 'WordPress admin (advanced)', m_logout: 'Log out', m_home_tip: 'Tip: add this page to your home screen (Share → Add to Home Screen) to open it like an app.',
      wa_check: 'Hi {0}, this is {1}. We received your order #{2} ({3}) and are checking your payment. We will let you know once it is confirmed.',
      wa_make: 'Hi {0}, this is {1}. Your payment for order #{2} is confirmed. {3}',
      wa_ready_c: 'Hi {0}, this is {1}. Your order #{2} is ready for collection. {3}',
      wa_ready_d: 'Hi {0}, this is {1}. Your order #{2} is on its way to you. {3}',
      wa_other: 'Hi {0}, this is {1}, about your order #{2}: ',
      demo: 'Demo store',
      coupons: 'Coupons', team: 'Team', new_order: 'New order', excel: 'Excel', export_xlsx: 'Export to Excel', print_list: 'Print pick-up list',
      select: 'Select', selected: '{0} selected', cancel: 'Cancel', mark_ready: 'Mark ready', mark_done: 'Mark done', mark_paid: 'Payment received', bulk_done: '{0} orders updated',
      nav_waze: 'Waze', nav_maps: 'Google Maps', print_order: 'Print',
      new_alert: 'New order! ({0})', paused_on: 'Online orders are paused', paused_off: 'Taking online orders', pause_hint: 'Customers can still look at the shop, but cannot order.', pause_msg: 'Message while paused',
      no_name: 'Customer name', o_items: 'Items', o_add_item: 'Add an item', o_choose: 'Choose a product', o_qty: 'Qty', o_mode: 'How they get it', o_when: 'Day and time', o_addr: 'Delivery address', o_fee: 'Delivery fee (RM)', o_paid: 'Already paid', o_method: 'Paid by',
      m_cash: 'Cash', m_transfer: 'Bank transfer', m_duitnow: 'DuitNow QR', m_other: 'Other', o_note: 'Note (card message, allergies…)', o_save: 'Save order', o_total: 'Total', o_email: 'Email (optional, for order emails)', o_stock_force: 'Not enough stock. Save anyway?',
      cp_new: 'New coupon', cp_code: 'Code', cp_type: 'Discount', cp_percent: '% off', cp_fixed: 'RM off', cp_amount: 'Amount', cp_min: 'Minimum spend (RM, optional)', cp_limit: 'How many times it can be used (empty = no limit)', cp_exp: 'Valid until (optional)', cp_free: 'Also free delivery', cp_on: 'Active',
      cp_used: 'used {0}×', cp_of: 'used {0} of {1}', cp_expired: 'Expired', cp_off: 'Off', cp_none: 'No coupons yet.', cp_delete: 'Delete coupon', cp_delete_q: 'Delete coupon {0}?',
      tm_owner: 'Owner', tm_staff: 'Staff', tm_add: 'Add a staff account', tm_name: 'Name', tm_email: 'Email', tm_hint: 'Staff can handle orders, production, products and customers. They cannot change settings or the team.', tm_link: 'Send this link to {0}. It lets them set their own password (one time, 24 hours):', tm_copy: 'Copy link', tm_wa: 'Send on WhatsApp', tm_remove: 'Remove', tm_remove_q: 'Remove {0}?', tm_remove_p: 'They will not be able to log in any more.', tm_you: 'you',
      c_tap: 'Tap a customer to see their orders.', all_orders: 'All orders'
    },
    zh: {
      home: '概况', orders: '订单', production: '生产', products: '产品', more: '更多', customers: '顾客', reports: '报表', settings: '设定',
      loading: '载入中…', retry: '再试一次', saved: '已保存', error: '出错了：{0}', expired: '登录已过期，正在打开登录页…', back: '返回',
      f_check: '待确认付款', f_make: '要做', f_ready: '可以取货', f_done: '已完成', f_all: '全部', f_cancelled: '已取消', f_pending: '还没付款',
      today: '今天', season: '这一季', orders_n: '{0} 单', revenue: '销售额', paid: '已付款', check: '待确认',
      tile_check: '待确认付款', tile_make: '已付款，要做', tile_ready: '可以取货 / 送货中', tile_today: '今天的订单', tile_rev: '今天已收款', tile_season: '这一季的订单', tile_sales: '这一季已收款',
      closes_in: '离截止还有 {0} 天 {1} 小时', closes_at: '截止：{0}', closed: '预购已经截止', early_on: '早鸟 {0}% 折扣进行中', season_off: '节日预购没有开启', change: '修改',
      next_days: '接下来的取货 / 送货', no_next: '接下来没有取货或送货。', stock_alert: '库存', low_left: '只剩 {0} 份', sold_out: '已售完', all_good: '库存都正常。', notify_n: '{0} 人想在下次开放时收到通知',
      search_orders: '名字、电话或订单号', no_orders: '这里没有订单。', load_more: '显示更多', items: '产品', subtotal: '小计', shipping: '运送', total: '合计', payment: '付款方式',
      receipt: '付款收据', see_receipt: '打开收据', no_receipt: '顾客还没上传收据。', customer: '顾客', phone: '电话', email: '电邮', address: '地址', send_to: '送到（送礼）', note: '顾客备注', collect_at: '取货地点',
      call: '打电话', whatsapp: 'WhatsApp', history: '记录', add_note: '加备注', note_ph: '只有你看得到；勾选下面才会发给顾客', note_cust: '发给顾客（用电邮）', add: '加上',
      act_paid: '已收到付款', act_ready_c: '可以取货', act_ready_d: '已出发送货', act_done: '完成', act_cancel: '取消订单', act_hold: '改回「待确认付款」',
      cancel_q: '取消订单 #{0}？', cancel_p: '产品会放回库存。系统不会自动退款，请从银行或付款网关退给顾客。', yes_cancel: '确定取消', keep: '保留订单',
      paid_q: '#{0} 已经收到付款了吗？', paid_p: '请先在银行 App 核对。顾客会收到「付款已确认」的电邮。', yes: '是', no: '不是',
      move: '改日子 / 时间', move_h: '改到别的日子或时间', full: '已满', left: '剩 {0} 个位', courier: '快递', no_slot: '没有可以选的日子或时间。',
      make_h: '这天要做多少', print: '打印', by_slot: '按时段的订单', nothing_day: '这天没有订单。', item: '产品',
      add_product: '新增产品', search_products: '搜寻产品', no_stock_count: '不计库存', hidden: '已隐藏', draft: '草稿', plan_limit: '你的配套包括最多 {0} 样产品，现在上架了 {1} 样。',
      p_name: '名称', p_price: '价钱（RM）', p_sale: '特价（RM，可不填）', p_stock: '还剩几份', p_stock_hint: '空白 = 不计算库存', p_status: '在网站上', p_on: '上架', p_hide: '隐藏',
      p_short: '简短介绍', p_desc: '详细介绍', p_cat: '分类', p_cat_new: '新分类…', p_photos: '照片', p_add_photo: '加照片', p_main: '主图', p_options: '规格 / 口味', p_option: '选项',
      p_soldout: '设为售完', p_save: '保存', p_delete: '删除产品', p_delete_q: '删除「{0}」？', p_delete_p: '会移到 WordPress 的回收站，需要时可以还原。', p_view: '在网站上看', p_new: '新产品', uploading: '正在上传照片…',
      c_search: '搜寻顾客', c_orders: '{0} 张订单', c_notify: '等下次开放的号码', c_copy: '复制全部号码', c_copied: '号码已复制', c_none: '还没有顾客。', c_notify_none: '还没有人留号码。',
      r_days: '最近 {0} 天', r_sales: '已收款', r_orders: '已付款订单', r_avg: '平均每单', r_chart: '每天已收款', r_top: '卖得最好', r_pay: '付款方式', r_mode: '取货 / 送货方式', r_export: '导出订单（CSV）', r_qty: '卖出', r_rev: '销售额', r_none: '这段时间没有已付款的订单。',
      s_fest: '节日预购', s_on: '开启节日预购', s_name: '节日名称', s_cutoff: '截止日', s_cut_time: '时间', s_from: '第一天取货', s_to: '最后一天取货', s_closed: '中间休息的日子（YYYY-MM-DD，用逗号分开）',
      s_collect: '自取时段', s_delivery: '送货时段', s_from_t: '从', s_to_t: '到', s_cap: '几单', s_add_slot: '加一个时段', s_early_end: '早鸟价到', s_early_pct: '早鸟折扣 %', s_show_left: '显示还剩几份', s_low: '剩几份时显示「只剩」', s_notify: '截止后收集号码，下次开放通知', s_courier: '快递订单的说明',
      s_shop: '店铺资料', s_legal: '店名 / 公司名', s_phone: '电话', s_email: '电邮', s_address: '地址（也是取货地点）', s_hours: '营业时间', s_announce: '网站顶部公告（空白 = 不显示）',
      s_duit: 'DuitNow QR', s_duit_on: '接受 DuitNow QR 付款', s_qr: '你的 DuitNow QR', s_qr_up: '上传 QR', s_account: 'QR 下面的户口名字', s_duit_note: '给顾客的说明', s_demo_qr: '示范网站：上传你自己的 QR 之前，会显示写着 DEMO 的示范 QR。',
      s_ship: '运费', s_free_min: '满多少免运（RM）', s_cost: '运费（RM）', s_save: '保存',
      m_shop: '看网店', m_wp: 'WordPress 后台（进阶）', m_logout: '登出', m_home_tip: '小技巧：把这一页加到手机主画面（分享 → 加入主画面），以后像 App 一样打开。',
      wa_check: '您好 {0}，这里是 {1}。我们收到您的订单 #{2}（{3}），正在核对付款，确认后会通知您。',
      wa_make: '您好 {0}，这里是 {1}。订单 #{2} 的付款已经确认。{3}',
      wa_ready_c: '您好 {0}，这里是 {1}。订单 #{2} 已经可以取货了。{3}',
      wa_ready_d: '您好 {0}，这里是 {1}。订单 #{2} 已经出发，正在送去给您。{3}',
      wa_other: '您好 {0}，这里是 {1}，关于您的订单 #{2}：',
      demo: '示范网站',
      coupons: '优惠码', team: '员工帐号', new_order: '新增订单', excel: 'Excel', export_xlsx: '导出 Excel', print_list: '打印取货清单',
      select: '选择', selected: '选了 {0} 张', cancel: '取消', mark_ready: '标为可以取货', mark_done: '标为完成', mark_paid: '已收到付款', bulk_done: '已更新 {0} 张订单',
      nav_waze: 'Waze', nav_maps: 'Google 地图', print_order: '打印',
      new_alert: '有新订单！（{0}）', paused_on: '已暂停网上接单', paused_off: '正在网上接单', pause_hint: '顾客还是可以看网店，但不能下单。', pause_msg: '暂停时显示的公告',
      no_name: '顾客名字', o_items: '产品', o_add_item: '再加一样', o_choose: '选产品', o_qty: '数量', o_mode: '怎么拿', o_when: '日子和时间', o_addr: '送货地址', o_fee: '运费（RM）', o_paid: '已经付款了', o_method: '付款方式',
      m_cash: '现金', m_transfer: '银行转账', m_duitnow: 'DuitNow QR', m_other: '其他', o_note: '备注（贺卡内容、过敏…）', o_save: '保存订单', o_total: '合计', o_email: '电邮（可不填；填了顾客会收到订单电邮）', o_stock_force: '库存不够，还是要保存吗？',
      cp_new: '新增优惠码', cp_code: '优惠码', cp_type: '折扣方式', cp_percent: '打折 %', cp_fixed: '减 RM', cp_amount: '数目', cp_min: '最低消费（RM，可不填）', cp_limit: '可以用几次（空白 = 不限）', cp_exp: '有效到（可不填）', cp_free: '同时免运费', cp_on: '启用',
      cp_used: '用了 {0} 次', cp_of: '用了 {0} / {1} 次', cp_expired: '已过期', cp_off: '已停用', cp_none: '还没有优惠码。', cp_delete: '删除优惠码', cp_delete_q: '删除优惠码 {0}？',
      tm_owner: '老板', tm_staff: '员工', tm_add: '新增员工帐号', tm_name: '名字', tm_email: '电邮', tm_hint: '员工可以处理订单、生产、产品和顾客，不能改设定和员工帐号。', tm_link: '把这个连结发给 {0}，让他自己设定密码（只能用一次、24 小时内有效）：', tm_copy: '复制连结', tm_wa: '用 WhatsApp 发', tm_remove: '移除', tm_remove_q: '移除 {0}？', tm_remove_p: '移除后这个人就不能再登录。', tm_you: '你',
      c_tap: '点顾客可以看他所有的订单。', all_orders: '全部订单'
    }
  };
  function t(k) {
    var s = (ZH ? W.zh : W.en)[k];
    if (s == null) s = W.en[k] != null ? W.en[k] : k;
    for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(String(arguments[i]));
    return s;
  }

  /* ------------------------------------------------------------------ DOM helpers */
  var PROPS = { value: 1, checked: 1, disabled: 1, selected: 1, hidden: 1 };
  function h(tag, a) {
    var el = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (PROPS[k]) el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) put(el, arguments[i]);
    return el;
  }
  function put(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { put(el, x); }); return; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
    orders: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    production: '<path d="M4 20V9l5 3V9l5 3V5h6v15z"/>',
    products: '<path d="M4 8 12 4l8 4-8 4z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    customers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.6 2.6 3 5.2"/>',
    reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5A8 8 0 1 1 21 12z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    down: '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    team: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.3-6 8-6s7 2 8 6"/>',
    map: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    check: '<path d="M5 12.5 10 17l9-10"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
  };
  function icon(n) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.9'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[n] || '';
    return s;
  }
  function toast(msg, err) {
    var old = document.querySelector('.toast'); if (old) old.remove();
    var el = h('div', { class: 'toast' + (err ? ' toast--err' : ''), role: 'status' }, msg);
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, err ? 4200 : 2200);
  }
  function sheet(title, text, buttons) {
    return new Promise(function (resolve) {
      var close = function (v) { scrim.remove(); resolve(v); };
      var scrim = h('div', { class: 'scrim', onclick: function (e) { if (e.target === scrim) close(null); } },
        h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('h3', null, title), text ? h('p', null, text) : null,
          h('div', { class: 'btns' }, buttons.map(function (b) { return h('button', { class: 'btn ' + (b.cls || ''), type: 'button', style: 'flex:1', onclick: function () { close(b.v); } }, b.label); }))));
      document.body.appendChild(scrim);
    });
  }
  function confirmBox(title, text, yes, no, danger) {
    return sheet(title, text, [{ label: no, v: false, cls: 'btn--plain' }, { label: yes, v: true, cls: danger ? 'btn--danger' : '' }]);
  }

  /* ------------------------------------------------------------------ formatting */
  function fmt(o) { try { return new Intl.DateTimeFormat(ZH ? 'zh-CN' : 'en-MY', Object.assign({ timeZone: TZ }, o)); } catch (e) { return new Intl.DateTimeFormat(ZH ? 'zh-CN' : 'en-MY', o); } }
  var fmtDT = fmt({ month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: !ZH });
  var fmtD = fmt({ month: 'short', day: 'numeric' });
  function dt(ts) { return ts ? fmtDT.format(new Date(ts * 1000)) : ''; }
  function d(ts) { return ts ? fmtD.format(new Date(ts * 1000)) : ''; }
  function whenLine(o) {
    var mode = o.mode === 'collect' ? (ZH ? '到店自取' : 'Self-collect') : o.mode === 'delivery' ? (ZH ? '送货' : 'Delivery') : o.mode === 'courier' ? t('courier') : '';
    return [mode, o.day_l, o.slot].filter(Boolean).join(' · ');
  }
  function stockBadge(p) {
    if (!p.in_stock || p.stock === 0) return h('span', { class: 'badge b-cancelled' }, t('sold_out'));
    if (p.stock == null) return h('span', { class: 'badge b-grey' }, t('no_stock_count'));
    return h('span', { class: 'badge ' + (p.stock <= 15 ? 'b-check' : 'b-make') }, t('low_left', p.stock).replace(ZH ? '只剩' : 'Only', ZH ? '剩' : '').trim());
  }

  /* ------------------------------------------------------------------ Excel (.xlsx) without a library */
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), name);
      off += head.length + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(csize), u32(off), u16(0)));
    return new Blob(parts.concat(central, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xesc(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function colName(i) { var s = ''; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows) {
    var widths = [];
    rows.forEach(function (r) { r.forEach(function (c, i) { var l = String(c == null ? '' : c).length; widths[i] = Math.min(60, Math.max(widths[i] || 8, l + 2)); }); });
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    widths.forEach(function (w, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; });
    x += '</cols><sheetData>';
    rows.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      r.forEach(function (c, ci) {
        var ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : '';
        if (typeof c === 'number' && isFinite(c)) x += '<c r="' + ref + '"' + st + '><v>' + c + '</v></c>';
        else if (c != null && c !== '') x += '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xesc(c) + '</t></is></c>';
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }
  function downloadXlsx(filename, sheets) {
    var ws = '', rels = '', ct = '';
    sheets.forEach(function (sh, i) {
      ws += '<sheet name="' + xesc(sh.name).slice(0, 31) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      rels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      ct += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    });
    var n = sheets.length;
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + ct + '</Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + ws + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3EDE5"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>' }
    ];
    sheets.forEach(function (sh, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(sh.rows) }); });
    var a = h('a', { href: URL.createObjectURL(zip(files)), download: filename });
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  var today = function () { return new Date().toISOString().slice(0, 10); };
  function orderRows(list) {
    var head = ZH ? ['订单', '下单时间', '状态', '顾客', '电话', '电邮', '产品', '金额 (RM)', '付款方式', '取货方式', '日子', '时段', '地址'] : ['Order', 'Placed', 'Status', 'Customer', 'Phone', 'Email', 'Items', 'Total (RM)', 'Payment', 'Mode', 'Day', 'Time', 'Address'];
    return [head].concat(list.map(function (o) {
      var mode = o.mode === 'collect' ? (ZH ? '到店自取' : 'Self-collect') : o.mode === 'delivery' ? (ZH ? '送货' : 'Delivery') : o.mode === 'courier' ? t('courier') : '';
      return ['#' + o.number, dt(o.created), t('f_' + o.bucket), o.name, o.phone, o.email || '', o.items, Number(o.total), o.pay, mode, o.day, o.slot, o.mode === 'collect' ? '' : (o.addr || '')];
    }));
  }

  /* ------------------------------------------------------------------ API */
  function url(path) {
    var base = C.rest || '';
    if (base.indexOf('rest_route=') !== -1) return base.replace(/\/?$/, '') + '/' + path.replace('?', '&');
    return base.replace(/\/?$/, '/') + path;
  }
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', credentials: 'same-origin', headers: { 'X-WP-Nonce': C.nonce } };
    if (opt.form) init.body = opt.form;
    else if (opt.body) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    return fetch(url(path), init).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (data) {
        if (r.status === 401 || r.status === 403 || (data && data.code === 'rest_cookie_invalid_nonce')) {
          toast(t('expired'), true);
          setTimeout(function () { location.reload(); }, 1600);
          throw new Error('auth');
        }
        if (!r.ok) throw new Error((data && data.message) || ('HTTP ' + r.status));
        return data;
      });
    });
  }

  /* ------------------------------------------------------------------ shell */
  var state = { summary: null };
  var NAV = [['home', 'home'], ['orders', 'orders'], ['production', 'production'], ['products', 'products'], ['more', 'more']];
  var SIDE = [['home', 'home'], ['orders', 'orders'], ['production', 'production'], ['products', 'products'], ['customers', 'customers'], ['coupons', 'tag'], ['reports', 'reports'], ['settings', 'settings'], ['team', 'team']];
  if (!C.can || !C.can.admin) SIDE = SIDE.filter(function (x) { return x[0] !== 'team'; });
  if (!C.can || !C.can.products) { NAV = NAV.filter(function (x) { return x[0] !== 'products'; }); SIDE = SIDE.filter(function (x) { return x[0] !== 'products'; }); }
  if (!C.can || !C.can.settings) SIDE = SIDE.filter(function (x) { return x[0] !== 'settings'; });
  var el = {};
  function shell() {
    var root = document.getElementById('app');
    root.innerHTML = '';
    el.side = h('aside', { class: 'side' }, h('div', { class: 'side__brand' }, C.site), h('div', { class: 'side__sub' }, (ZH ? '店家后台' : 'Shop dashboard') + (C.demo ? ' · ' + t('demo') : '')),
      SIDE.map(function (x) { return h('a', { href: '#/' + x[0], 'data-k': x[0] }, icon(x[1]), h('span', null, t(x[0]))); }),
      h('div', { class: 'side__foot' }, h('a', { href: C.shop, target: '_blank', rel: 'noopener' }, t('m_shop')), C.can && C.can.admin ? h('a', { href: C.admin }, t('m_wp')) : null, h('a', { href: C.logout }, t('m_logout'))));
    el.back = h('button', { class: 'top__back', type: 'button', 'aria-label': t('back'), hidden: true, onclick: function () { history.length > 1 ? history.back() : (location.hash = '#/home'); } }, icon('back'));
    el.site = h('div', { class: 'top__site' }, C.site);
    el.title = h('h1', { class: 'top__title' }, '');
    el.act = h('div', { class: 'top__act' });
    el.top = h('header', { class: 'top' }, el.back, h('div', { class: 'top__titles' }, el.site, el.title), el.act);
    el.main = h('main', { class: 'main', id: 'main' });
    el.nav = h('nav', { class: 'nav', 'aria-label': t('more') }, NAV.map(function (x) { return h('a', { href: '#/' + x[0], 'data-k': x[0] }, icon(x[1]), h('span', null, t(x[0]))); }));
    put(root, [el.side, h('div', { class: 'col' }, el.top, el.main), el.nav]);
    window.addEventListener('scroll', function () { el.top.classList.toggle('is-scrolled', window.scrollY > 4); }, { passive: true });
  }
  function setTop(title, sub, back, action) {
    el.title.textContent = title;
    el.site.textContent = sub || C.site;
    el.back.hidden = !back;
    el.act.innerHTML = '';
    if (action) put(el.act, action);
    document.title = title + ' · ' + C.site;
  }
  function setNav(k) {
    var map = { order: 'orders', 'new-order': 'orders', product: 'products', customers: 'more', reports: 'more', settings: 'more', coupons: 'more', coupon: 'more', team: 'more', print: 'production' };
    var navK = map[k] || k;
    [].forEach.call(el.nav.querySelectorAll('a'), function (a) { a.classList.toggle('is-on', a.getAttribute('data-k') === navK); });
    var sideK = { order: 'orders', 'new-order': 'orders', product: 'products', coupon: 'coupons', print: 'production' }[k] || k;
    [].forEach.call(el.side.querySelectorAll('a[data-k]'), function (a) { a.classList.toggle('is-on', a.getAttribute('data-k') === sideK); });
  }
  function badges() {
    var n = state.summary ? state.summary.counts.check : 0;
    [].forEach.call(document.querySelectorAll('a[data-k="orders"] .dot'), function (x) { x.remove(); });
    if (n) [].forEach.call(document.querySelectorAll('a[data-k="orders"]'), function (a) { a.appendChild(h('span', { class: 'dot', 'aria-label': t('tile_check') }, n)); });
  }
  function loading() { return h('p', { class: 'empty' }, t('loading')); }
  function fail(e) {
    if (e && e.message === 'auth') return;
    el.main.innerHTML = '';
    put(el.main, h('div', { class: 'card empty' }, h('p', null, t('error', e && e.message ? e.message : '')), h('button', { class: 'btn btn--ghost', type: 'button', onclick: render }, t('retry'))));
  }

  /* ------------------------------------------------------------------ router */
  function route() {
    var raw = location.hash.replace(/^#\/?/, '');
    var q = raw.split('?');
    var parts = q[0].split('/');
    return { name: parts[0] || 'home', id: parts[1], p: new URLSearchParams(q[1] || '') };
  }
  var VIEWS = {};
  var SEQ = 0;
  // Only the latest navigation may draw (a slow answer from an older screen is ignored).
  function live(r) { return r && r.seq === SEQ ? el.main : null; }
  function render() {
    var r = route();
    r.seq = ++SEQ;
    var v = VIEWS[r.name] || VIEWS.home;
    setNav(r.name);
    el.main.innerHTML = '';
    put(el.main, loading());
    window.scrollTo(0, 0);
    Promise.resolve().then(function () { return v(r); }).catch(function (e) { if (r.seq === SEQ) fail(e); });
  }
  function refreshSummary() {
    return api('summary').then(function (s) {
      var before = state.summary ? state.summary.season.orders + state.summary.counts.pending : null;
      state.summary = s; badges();
      var now = s.season.orders + s.counts.pending;
      if (before != null && now > before) {
        toast(t('new_alert', now - before));
        if (navigator.vibrate) navigator.vibrate(200);
        document.title = '(' + (now - before) + ') ' + document.title.replace(/^\(\d+\) /, '');
      }
      return s;
    });
  }

  /* ------------------------------------------------------------------ overview */
  VIEWS.home = function (r) {
    setTop(t('home'), C.site + (C.demo ? ' · ' + t('demo') : ''));
    return refreshSummary().then(function (s) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      var f = s.fest;
      var fest;
      if (!f.on) fest = h('div', { class: 'card card--soft' }, h('div', { class: 'card__h' }, h('h2', null, t('season_off')), C.can.settings ? h('a', { href: '#/settings' }, t('change')) : null));
      else {
        var secs = Math.max(0, f.cutoff - Date.now() / 1000);
        fest = h('div', { class: 'card card--soft' },
          h('div', { class: 'card__h' }, h('h2', null, f.name || t('s_fest')), C.can.settings ? h('a', { href: '#/settings' }, t('change')) : null),
          h('p', { style: 'margin:0;font-weight:800;font-size:1.1rem' }, f.closed ? t('closed') : t('closes_in', Math.floor(secs / 86400), Math.floor((secs % 86400) / 3600))),
          f.cutoff_l ? h('p', { class: 'muted small', style: 'margin:2px 0 0' }, t('closes_at', f.cutoff_l)) : null,
          f.early ? h('p', { style: 'margin:8px 0 0' }, h('span', { class: 'badge b-soft' }, t('early_on', f.early))) : null);
      }
      put(m, fest);
      if (C.can.settings) {
        var pz = h('input', { type: 'checkbox', role: 'switch', checked: !s.paused, 'aria-label': t('paused_off') });
        var pzLabel = h('span', null, s.paused ? t('paused_on') : t('paused_off'));
        pz.addEventListener('change', function () {
          pz.disabled = true;
          api('settings', { method: 'POST', body: { settings: { shop_paused: !pz.checked } } }).then(function () {
            pzLabel.textContent = pz.checked ? t('paused_off') : t('paused_on');
            card.classList.toggle('stat--warn', !pz.checked);
            toast(t('saved'));
          }).catch(function (e) { pz.checked = !pz.checked; toast(t('error', e.message), true); }).then(function () { pz.disabled = false; });
        });
        var card = h('div', { class: 'card' + (s.paused ? ' stat--warn' : '') }, h('label', { class: 'switch' }, h('span', { class: 'row' }, icon(s.paused ? 'pause' : 'check'), pzLabel), pz), h('p', { class: 'small muted', style: 'margin:2px 0 0' }, t('pause_hint')));
        put(m, card);
      }
      put(m, h('div', { class: 'grid3', style: 'margin-bottom:14px' },
        h('a', { class: 'stat' + (s.counts.check ? ' stat--warn' : ''), href: '#/orders?f=check' }, h('b', null, s.counts.check), h('span', null, t('tile_check'))),
        h('a', { class: 'stat' + (s.counts.make ? ' stat--go' : ''), href: '#/orders?f=make' }, h('b', null, s.counts.make), h('span', null, t('tile_make'))),
        h('a', { class: 'stat' + (s.counts.ready ? ' stat--ready' : ''), href: '#/orders?f=ready' }, h('b', null, s.counts.ready), h('span', null, t('tile_ready')))));
      put(m, h('div', { class: 'grid4', style: 'margin-bottom:14px' },
        h('div', { class: 'stat' }, h('b', null, s.today.orders), h('span', null, t('tile_today'))),
        h('div', { class: 'stat' }, h('b', null, s.today.revenue), h('span', null, t('tile_rev'))),
        h('a', { class: 'stat', href: '#/orders?f=all' }, h('b', null, s.season.orders), h('span', null, t('tile_season'))),
        h('a', { class: 'stat', href: '#/reports' }, h('b', null, s.season.revenue), h('span', null, t('tile_sales')))));
      var cols = h('div', { class: 'cols' });
      put(cols, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('next_days')), h('a', { href: '#/production' }, t('production'))),
        s.next.length ? h('table', { class: 'tbl' }, h('tbody', null, s.next.map(function (x) {
          return h('tr', null, h('td', null, h('a', { href: '#/production?day=' + x.day, class: 'link' }, x.label)), h('td', { class: 'r' }, t('orders_n', x.orders)));
        }))) : h('p', { class: 'muted', style: 'margin:0' }, t('no_next'))));
      var stockRows = s.soldout.map(function (n) { return h('tr', null, h('td', null, n), h('td', { class: 'r' }, h('span', { class: 'badge b-cancelled' }, t('sold_out')))); })
        .concat(s.low.map(function (x) { return h('tr', null, h('td', null, x.name), h('td', { class: 'r' }, h('span', { class: 'badge b-check' }, t('low_left', x.left)))); }));
      put(cols, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('stock_alert')), C.can.products ? h('a', { href: '#/products' }, t('products')) : null),
        stockRows.length ? h('table', { class: 'tbl' }, h('tbody', null, stockRows)) : h('p', { class: 'muted', style: 'margin:0' }, t('all_good'))));
      put(m, cols);
      if (s.notify) put(m, h('a', { class: 'card', href: '#/customers?tab=notify', style: 'display:block;text-decoration:none;color:inherit' }, h('div', { class: 'row' }, icon('customers'), h('span', null, t('notify_n', s.notify)))));
    });
  };

  /* ------------------------------------------------------------------ orders */
  function orderCard(o) {
    return h('a', { class: 'ocard', href: '#/order/' + o.id },
      h('div', { class: 'ocard__top' }, h('span', { class: 'ocard__no' }, '#' + o.number), h('span', { class: 'ocard__name' }, o.name || '—'), h('span', { class: 'badge b-' + o.bucket, title: o.label }, t('f_' + o.bucket))),
      h('div', { class: 'ocard__items' }, o.items),
      h('div', { class: 'ocard__foot' }, whenLine(o) ? h('span', { class: 'when' }, icon('clock'), whenLine(o)) : h('span', null, dt(o.created)), o.receipt && o.bucket === 'check' ? h('span', { class: 'badge b-soft' }, t('receipt')) : null, h('b', null, o.total_f)));
  }
  VIEWS.orders = function (r) {
    var s = state.summary;
    var f = r.p.get('f') || (s && s.counts.check ? 'check' : s && s.counts.make ? 'make' : 'all');
    var q = r.p.get('q') || '';
    var day = r.p.get('day') || '';
    setTop(t('orders'), day ? (day === 'courier' ? t('courier') : day) : C.site, false, h('a', { class: 'btn btn--sm', href: '#/new-order' }, icon('plus'), t('new_order')));
    var picking = false, picked = {};
    var bulkInfo = h('span', { class: 'small', style: 'font-weight:700' });
    function bulkGo(status) {
      var ids = Object.keys(picked).filter(function (k) { return picked[k]; });
      if (!ids.length) return;
      api('orders/bulk', { method: 'POST', body: { ids: ids.map(Number), status: status } }).then(function (r2) { toast(t('bulk_done', r2.changed)); return refreshSummary(); }).then(render).catch(function (e) { toast(t('error', e.message), true); });
    }
    var bulkBar = h('div', { class: 'actbar actbar--bulk', hidden: true }, bulkInfo, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { bulkGo('processing'); } }, t('mark_paid')),
      h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { bulkGo('agc-ready'); } }, t('mark_ready')), h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { bulkGo('completed'); } }, t('mark_done')));
    var pickBtn = h('button', { class: 'pill', type: 'button', onclick: function () {
      picking = !picking; picked = {}; pickBtn.classList.toggle('is-on', picking); pickBtn.textContent = picking ? t('cancel') : t('select');
      bulkBar.hidden = !picking; bulkInfo.textContent = t('selected', 0);
      [].forEach.call(list.querySelectorAll('.ocard'), function (c) { c.classList.toggle('is-picking', picking); c.classList.remove('is-picked'); });
    } }, t('select'));
    var FILTERS = ['check', 'make', 'ready', 'done', 'all', 'cancelled'];
    var page = 1;
    var list = h('div', { class: 'olist' });
    var more = h('button', { class: 'btn btn--plain btn--block', type: 'button', hidden: true, style: 'margin-top:12px' }, t('load_more'));
    var input = h('input', { type: 'search', placeholder: t('search_orders'), value: q, 'aria-label': t('search_orders') });
    function go(nf, nq) {
      var p = new URLSearchParams(); p.set('f', nf); if (nq) p.set('q', nq); if (day) p.set('day', day);
      history.replaceState(null, '', '#/orders?' + p.toString());
      f = nf; q = nq; page = 1; list.innerHTML = ''; load();
      [].forEach.call(pills.children, function (b) { b.classList.toggle('is-on', b.getAttribute('data-f') === f); });
    }
    var pills = h('div', { class: 'pills', role: 'tablist' }, FILTERS.map(function (k) {
      var n = s && s.counts[k] != null ? s.counts[k] : null;
      return h('button', { class: 'pill' + (k === f ? ' is-on' : ''), type: 'button', role: 'tab', 'data-f': k, onclick: function () { go(k, input.value.trim()); } }, t('f_' + k), n ? h('i', null, n) : null);
    }));
    var timer;
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { go(f, input.value.trim()); }, 350); });
    function load() {
      var p = new URLSearchParams(); p.set('f', f); p.set('page', page); if (q) p.set('q', q); if (day) p.set('day', day);
      return api('orders?' + p.toString()).then(function (d) {
        if (page === 1 && !d.orders.length) put(list, h('p', { class: 'empty' }, t('no_orders')));
        put(list, d.orders.map(function (o) {
          var c = orderCard(o);
          c.addEventListener('click', function (e) {
            if (!picking) return;
            e.preventDefault();
            picked[o.id] = !picked[o.id];
            c.classList.toggle('is-picked', picked[o.id]);
            bulkInfo.textContent = t('selected', Object.keys(picked).filter(function (k) { return picked[k]; }).length);
          });
          if (picking) c.classList.add('is-picking');
          return c;
        }));
        more.hidden = d.page >= d.pages;
      });
    }
    more.addEventListener('click', function () { page++; more.disabled = true; load().then(function () { more.disabled = false; }); });
    el.main.innerHTML = '';
    pills.appendChild(pickBtn);
    put(el.main, [h('label', { class: 'search' }, icon('search'), input), pills, list, more, bulkBar]);
    return (s ? Promise.resolve() : refreshSummary()).then(load);
  };

  function waText(o) {
    var name = (o.name || '').trim();
    var when = whenLine(o);
    var extra = when ? (o.collect_at && o.mode === 'collect' ? when + (ZH ? '，地点：' : ', at ') + o.collect_at : when) : '';
    if (o.bucket === 'check') return t('wa_check', name, C.site, o.number, o.total_f);
    if (o.bucket === 'make') return t('wa_make', name, C.site, o.number, extra);
    if (o.bucket === 'ready') return t(o.mode === 'collect' ? 'wa_ready_c' : 'wa_ready_d', name, C.site, o.number, extra);
    return t('wa_other', name, C.site, o.number);
  }
  function setStatus(o, status) {
    return api('orders/' + o.id + '/status', { method: 'POST', body: { status: status } }).then(function () { toast(t('saved')); return refreshSummary(); }).then(render).catch(function (e) { if (e.message !== 'auth') toast(t('error', e.message), true); });
  }
  VIEWS.order = function (r) {
    return api('orders/' + r.id).then(function (o) {
      setTop('#' + o.number, o.name || C.site, true, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { window.print(); } }, icon('print'), t('print_order')));
      var m = live(r); if (!m) return; m.innerHTML = '';
      var navAddr = o.mode !== 'collect' ? (o.ship_to || o.address) : '';
      var head = h('div', { class: 'card' },
        h('div', { class: 'row', style: 'flex-wrap:wrap' }, h('span', { class: 'badge b-' + o.bucket, title: o.label }, t('f_' + o.bucket)), h('span', { class: 'muted small' }, dt(o.created)), h('span', { class: 'spacer' }), h('b', { style: 'font-size:1.15rem' }, o.total_f)),
        whenLine(o) ? h('div', { class: 'row', style: 'margin-top:12px;flex-wrap:wrap' }, h('span', { class: 'when', style: 'font-size:1.02rem' }, icon('clock'), whenLine(o)), h('span', { class: 'spacer' }),
          o.slots && Object.keys(o.slots).length && ['check', 'make', 'pending'].indexOf(o.bucket) !== -1 ? h('button', { class: 'btn btn--sm btn--plain', type: 'button', onclick: function () { moveSlot(o); } }, t('move')) : null) : null,
        o.collect_at ? h('p', { class: 'muted small', style: 'margin:6px 0 0' }, t('collect_at') + '：' + o.collect_at) : null);
      put(m, head);

      var rows = o.line.map(function (it) { return h('tr', null, h('td', null, it.qty + ' × ' + it.name, it.meta ? h('small', null, it.meta) : null), h('td', null, it.total)); });
      rows.push(h('tr', null, h('td', { class: 'muted' }, t('subtotal')), h('td', null, o.subtotal)));
      o.fees.forEach(function (fe) { rows.push(h('tr', null, h('td', { class: 'muted' }, fe.name), h('td', null, fe.total))); });
      if (o.shipping) rows.push(h('tr', null, h('td', { class: 'muted' }, t('shipping')), h('td', { style: 'white-space:normal' }, o.shipping)));
      rows.push(h('tr', { class: 'tot' }, h('td', null, t('total')), h('td', null, o.total_f)));
      put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('items'))), h('table', { class: 'lines' }, h('tbody', null, rows)),
        h('p', { class: 'small muted', style: 'margin:10px 0 0' }, t('payment') + '：' + (o.pay || '—'))));

      if (o.bucket === 'check' || o.receipt_url) {
        var rc = h('div', { class: 'card receipt' }, h('div', { class: 'card__h' }, h('h2', null, t('receipt')), o.receipt_url ? h('a', { href: o.receipt_url, target: '_blank', rel: 'noopener' }, t('see_receipt')) : null));
        if (o.receipt_url) {
          var img = h('img', { src: o.receipt_url, alt: t('receipt'), loading: 'lazy' });
          img.addEventListener('error', function () { img.remove(); });
          put(rc, img);
        } else put(rc, h('p', { class: 'muted', style: 'margin:0' }, t('no_receipt')));
        put(m, rc);
      }

      var dl = [h('dt', null, t('customer')), h('dd', null, o.name || '—')];
      if (o.phone) dl.push(h('dt', null, t('phone')), h('dd', null, h('a', { href: 'tel:' + o.phone }, o.phone)));
      if (o.email) dl.push(h('dt', null, t('email')), h('dd', null, h('a', { href: 'mailto:' + o.email }, o.email)));
      if (o.address && o.mode !== 'collect') dl.push(h('dt', null, t('address')), h('dd', null, o.address));
      if (o.ship_to) dl.push(h('dt', null, t('send_to')), h('dd', null, [o.ship_name, o.ship_phone, o.ship_to].filter(Boolean).join(' · ')));
      if (o.note) dl.push(h('dt', null, t('note')), h('dd', { style: 'font-weight:650' }, o.note));
      put(m, h('div', { class: 'card' }, h('dl', { class: 'dl' }, dl),
        h('div', { class: 'btns', style: 'margin-top:14px' },
          o.phone ? h('a', { class: 'btn btn--plain btn--sm', href: 'tel:' + o.phone }, icon('phone'), t('call')) : null,
          o.wa ? h('a', { class: 'btn btn--ghost btn--sm', href: 'https://wa.me/' + o.wa + '?text=' + encodeURIComponent(waText(o)), target: '_blank', rel: 'noopener' }, icon('chat'), t('whatsapp')) : null,
          navAddr ? h('a', { class: 'btn btn--plain btn--sm noprint', href: 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(navAddr), target: '_blank', rel: 'noopener' }, icon('map'), t('nav_waze')) : null,
          navAddr ? h('a', { class: 'btn btn--plain btn--sm noprint', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(navAddr), target: '_blank', rel: 'noopener' }, icon('map'), t('nav_maps')) : null)));

      var noteIn = h('textarea', { rows: 2, placeholder: t('note_ph'), 'aria-label': t('add_note') });
      var cust = h('input', { type: 'checkbox' });
      put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('history'))),
        h('ul', { class: 'timeline' }, o.notes.map(function (n) { return h('li', { class: n.customer ? 'is-cust' : '' }, n.text, h('time', null, dt(n.date) + (n.customer ? ' · ' + (ZH ? '已发给顾客' : 'sent to customer') : ''))); })),
        h('div', { class: 'form', style: 'margin-top:14px' }, h('div', { class: 'field' }, h('span', null, t('add_note')), noteIn),
          h('label', { class: 'ow-check row small' }, cust, t('note_cust')),
          h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function (e) {
            if (!noteIn.value.trim()) return;
            e.target.disabled = true;
            api('orders/' + o.id + '/note', { method: 'POST', body: { note: noteIn.value, customer: cust.checked } }).then(function () { toast(t('saved')); render(); }).catch(function (er) { e.target.disabled = false; toast(t('error', er.message), true); });
          } }, t('add')))));

      var acts = [];
      if (o.bucket === 'check' || o.bucket === 'pending') {
        acts.push(h('button', { class: 'btn btn--danger', type: 'button', onclick: function () { cancelOrder(o); } }, t('act_cancel')));
        acts.push(h('button', { class: 'btn', type: 'button', onclick: function () { confirmBox(t('paid_q', o.number), t('paid_p'), t('yes'), t('no')).then(function (ok) { if (ok) setStatus(o, 'processing'); }); } }, t('act_paid')));
      } else if (o.bucket === 'make') {
        acts.push(h('button', { class: 'btn', type: 'button', onclick: function () { setStatus(o, 'agc-ready'); } }, o.mode === 'collect' ? t('act_ready_c') : t('act_ready_d')));
      } else if (o.bucket === 'ready') {
        acts.push(h('button', { class: 'btn', type: 'button', onclick: function () { setStatus(o, 'completed'); } }, t('act_done')));
      }
      if (acts.length) put(m, h('div', { class: 'actbar' }, acts));
      if (o.bucket === 'make' || o.bucket === 'ready') put(m, h('p', { class: 'small', style: 'text-align:center' }, h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: function () { cancelOrder(o); } }, t('act_cancel'))));
    });
  };
  function cancelOrder(o) {
    confirmBox(t('cancel_q', o.number), t('cancel_p'), t('yes_cancel'), t('keep'), true).then(function (ok) { if (ok) setStatus(o, 'cancelled'); });
  }
  function moveSlot(o) {
    var days = Object.keys(o.slots);
    if (!days.length) { toast(t('no_slot'), true); return; }
    var scrim;
    var close = function () { scrim.remove(); };
    var body = h('div', { class: 'form' }, days.map(function (day) {
      var slots = o.slots[day];
      return h('div', null, h('p', { style: 'margin:0 0 6px;font-weight:800;color:var(--ink)' }, day),
        h('div', { class: 'btns' }, Object.keys(slots).map(function (sl) {
          var left = slots[sl];
          var cur = day === o.day && sl === o.slot;
          return h('button', { class: 'btn btn--sm ' + (cur ? '' : 'btn--plain'), type: 'button', disabled: !left && !cur, onclick: function () {
            close();
            api('orders/' + o.id + '/slot', { method: 'POST', body: { when: day + '|' + sl } }).then(function () { toast(t('saved')); render(); }).catch(function (e) { toast(t('error', e.message), true); });
          } }, sl + ' · ' + (left ? t('left', left) : t('full')));
        })));
    }));
    scrim = h('div', { class: 'scrim', onclick: function (e) { if (e.target === scrim) close(); } }, h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('h3', null, t('move_h')), body,
      h('button', { class: 'btn btn--plain btn--block', type: 'button', style: 'margin-top:14px', onclick: close }, t('back'))));
    document.body.appendChild(scrim);
  }

  /* ------------------------------------------------------------------ production */
  VIEWS.production = function (r) {
    var day = r.p.get('day') || '';
    var dayNow = day;
    setTop(t('production'), C.site, false, h('div', { class: 'btns' },
      h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { location.hash = '#/print?day=' + encodeURIComponent(dayNow); } }, icon('print'), ZH ? '清单' : 'List'),
      h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { exportDay(dayNow); } }, icon('down'), t('excel'))));
    return api('production' + (day ? '?day=' + encodeURIComponent(day) : '')).then(function (dd) {
      dayNow = dd.day;
      var m = live(r); if (!m) return; m.innerHTML = '';
      put(m, h('div', { class: 'pills' }, dd.days.map(function (x) {
        return h('a', { class: 'pill' + (x.day === dd.day ? ' is-on' : ''), href: '#/production?day=' + x.day }, x.day === 'courier' ? t('courier') : x.label, x.orders ? h('i', null, x.orders) : null);
      })));
      var label = dd.day === 'courier' ? t('courier') : (dd.days.filter(function (x) { return x.day === dd.day; })[0] || {}).label || '';
      var sumP = 0, sumC = 0;
      var rows = dd.make.map(function (x) { sumP += x.paid; sumC += x.check; return h('tr', null, h('td', null, x.name), h('td', { class: 'n' }, h('b', null, x.paid)), h('td', { class: 'n muted' }, x.check || '–')); });
      put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('make_h') + (label ? ' · ' + label : ''))),
        rows.length ? h('table', { class: 'make' }, h('thead', null, h('tr', null, h('th', null, t('item')), h('th', { class: 'n' }, t('paid')), h('th', { class: 'n' }, t('check')))), h('tbody', null, rows),
          h('tfoot', null, h('tr', null, h('td', null, h('b', null, t('total'))), h('td', { class: 'n' }, h('b', null, sumP)), h('td', { class: 'n muted' }, sumC || '–')))) : h('p', { class: 'muted', style: 'margin:0' }, t('nothing_day'))));
      if (dd.slots.length) {
        var c = h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('by_slot'))));
        dd.slots.forEach(function (s) {
          put(c, h('div', { class: 'slot-h' }, icon('clock'), s.slot, h('span', { class: 'badge b-grey' }, t('orders_n', s.orders.length))));
          put(c, h('div', { class: 'olist' }, s.orders.map(orderCard)));
        });
        put(m, c);
      }
    });
  };

  function exportDay(day) {
    api('production?day=' + encodeURIComponent(day)).then(function (dd) {
      var label = day === 'courier' ? t('courier') : day;
      var make = [[t('item'), t('paid'), t('check')]].concat(dd.make.map(function (x) { return [x.name, x.paid, x.check]; }));
      var list = [];
      dd.slots.forEach(function (s) { s.orders.forEach(function (o) { list.push(o); }); });
      downloadXlsx('production-' + label + '.xlsx', [{ name: ZH ? '要做多少' : 'To make', rows: make }, { name: ZH ? '订单' : 'Orders', rows: orderRows(list) }]);
    }).catch(function (e) { toast(t('error', e.message), true); });
  }
  // Printable pick-up list: one row per order with a box to tick.
  VIEWS.print = function (r) {
    var day = r.p.get('day') || '';
    setTop(t('print_list'), C.site, true, h('button', { class: 'btn btn--sm', type: 'button', onclick: function () { window.print(); } }, icon('print'), t('print')));
    return api('production' + (day ? '?day=' + encodeURIComponent(day) : '')).then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      var label = dd.day === 'courier' ? t('courier') : ((dd.days.filter(function (x) { return x.day === dd.day; })[0] || {}).label || dd.day);
      put(m, h('h2', { style: 'margin:0 0 12px' }, C.site + ' · ' + label));
      if (!dd.slots.length) { put(m, h('p', { class: 'empty' }, t('nothing_day'))); return; }
      dd.slots.forEach(function (s) {
        put(m, h('div', { class: 'card' }, h('div', { class: 'slot-h', style: 'margin-top:0' }, icon('clock'), s.slot, h('span', { class: 'badge b-grey' }, t('orders_n', s.orders.length))),
          h('table', { class: 'tbl checklist' }, h('tbody', null, s.orders.map(function (o) {
            return h('tr', null, h('td', { style: 'width:28px' }, h('span', { class: 'box' })), h('td', null, h('b', null, '#' + o.number + ' ' + (o.name || '')), h('div', { class: 'small muted' }, [o.phone, o.items].filter(Boolean).join(' · '))),
              h('td', { class: 'r' }, h('span', { class: 'badge b-' + o.bucket }, t('f_' + o.bucket)), h('div', { class: 'small' }, o.total_f)));
          })))));
      });
    });
  };

  /* ------------------------------------------------------------------ products */
  VIEWS.products = function (r) {
    setTop(t('products'), C.site, false, h('a', { class: 'btn btn--sm', href: '#/product/new' }, icon('plus'), t('add_product')));
    return api('products').then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      var onSale = dd.products.filter(function (p) { return p.status === 'publish'; }).length;
      if (dd.limit && onSale > dd.limit) put(m, h('div', { class: 'card card--soft small' }, t('plan_limit', dd.limit, onSale)));
      var input = h('input', { type: 'search', placeholder: t('search_products'), 'aria-label': t('search_products') });
      var list = h('div', { class: 'plist' });
      function draw() {
        var q = input.value.trim().toLowerCase();
        list.innerHTML = '';
        var ps = dd.products.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) !== -1; });
        if (!ps.length) put(list, h('p', { class: 'empty' }, '—'));
        put(list, ps.map(function (p) {
          return h('a', { class: 'pcard', href: '#/product/' + p.id },
            p.image ? h('img', { class: 'pcard__img', src: p.image.url, alt: '', loading: 'lazy' }) : h('div', { class: 'pcard__img' }),
            h('div', null, h('div', { class: 'pcard__name' }, p.name),
              h('div', { class: 'pcard__meta' }, h('span', { class: 'pcard__price' }, p.price_f), stockBadge(p),
                p.status === 'private' ? h('span', { class: 'badge b-grey' }, t('hidden')) : null, p.status === 'draft' ? h('span', { class: 'badge b-grey' }, t('draft')) : null),
              p.variations.length ? h('div', { class: 'muted small', style: 'margin-top:4px' }, p.variations.map(function (v) { return v.label + (v.stock != null ? ' (' + v.stock + ')' : ''); }).join(' · ')) : null));
        }));
      }
      input.addEventListener('input', draw);
      put(m, [h('label', { class: 'search' }, icon('search'), input), list]);
      draw();
    });
  };

  function resizeImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) { resolve(file); return; }
      createImageBitmap(file).then(function (bmp) {
        var max = 1600, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        if (s === 1 && file.size < 1500000) { resolve(file); return; }
        var cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        cv.toBlob(function (b) { resolve(b ? new File([b], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.86);
      }).catch(function () { resolve(file); });
    });
  }
  function upload(file) {
    toast(t('uploading'));
    return resizeImage(file).then(function (f) { var fd = new FormData(); fd.append('file', f); return api('media', { method: 'POST', form: fd }); });
  }
  function field(label, input, hint) { return h('label', { class: 'field' }, h('span', null, label), input, hint ? h('small', null, hint) : null); }
  function sw(label, checked) { var i = h('input', { type: 'checkbox', checked: !!checked, role: 'switch' }); return { el: h('label', { class: 'switch' }, h('span', null, label), i), input: i }; }

  VIEWS.product = function (r) {
    var isNew = r.id === 'new';
    var load = isNew ? api('products').then(function (dd) { return { p: { name: '', type: 'simple', status: 'publish', regular_price: '', sale_price: '', stock: '', in_stock: true, short: '', description: '', categories: [], image: null, gallery: [], variations: [] }, cats: dd.categories }; })
      : api('products').then(function (dd) { var p = dd.products.filter(function (x) { return String(x.id) === r.id; })[0]; if (!p) throw new Error('404'); return { p: p, cats: dd.categories }; });
    return load.then(function (x) {
      var p = x.p;
      setTop(isNew ? t('p_new') : p.name, C.site, true);
      var m = live(r); if (!m) return; m.innerHTML = '';
      var img = p.image, gallery = p.gallery.slice();
      var f = {
        name: h('input', { type: 'text', value: p.name, required: true }),
        price: h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: '0', value: p.regular_price }),
        sale: h('input', { type: 'number', inputmode: 'decimal', step: '0.01', min: '0', value: p.sale_price }),
        stock: h('input', { type: 'number', inputmode: 'numeric', min: '0', step: '1', value: p.stock == null ? '' : p.stock }),
        short: h('textarea', { rows: 3, value: p.short }),
        desc: h('textarea', { rows: 5, value: (p.description || '').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '') }),
        cat: h('select', null, h('option', { value: '' }, '—'), x.cats.map(function (c) { return h('option', { value: c, selected: p.categories.indexOf(c) !== -1 }, c); }), h('option', { value: '__new' }, t('p_cat_new')))
      };
      var status = sw(t('p_status') + ' · ' + t('p_on'), p.status === 'publish');
      var photos = h('div', { class: 'photos' });
      var fileIn = h('input', { type: 'file', accept: 'image/*', class: 'sr' });
      function drawPhotos() {
        photos.innerHTML = '';
        if (img) put(photos, h('div', { class: 'photo photo--main', 'data-l': t('p_main') }, h('img', { src: img.url, alt: '' }), h('button', { type: 'button', 'aria-label': 'remove', onclick: function () { img = gallery.length ? gallery.shift() : null; drawPhotos(); } }, icon('x'))));
        gallery.forEach(function (g, i) { put(photos, h('div', { class: 'photo' }, h('img', { src: g.url, alt: '' }), h('button', { type: 'button', 'aria-label': 'remove', onclick: function () { gallery.splice(i, 1); drawPhotos(); } }, icon('x')))); });
        put(photos, h('label', { class: 'photo photo--add' }, h('span', null, '+ ' + t('p_add_photo')), fileIn));
      }
      fileIn.addEventListener('change', function () {
        var file = fileIn.files[0]; if (!file) return;
        upload(file).then(function (u) { var ph = { id: u.id, url: u.url }; if (!img) img = ph; else gallery.push(ph); drawPhotos(); }).catch(function (e) { toast(t('error', e.message), true); });
        fileIn.value = '';
      });
      drawPhotos();
      var varRows = p.variations.map(function (v) {
        return { id: v.id, price: h('input', { type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: v.regular_price, 'aria-label': v.label + ' ' + t('p_price') }), sale: h('input', { type: 'number', step: '0.01', min: '0', inputmode: 'decimal', value: v.sale_price, 'aria-label': v.label + ' ' + t('p_sale') }), stock: h('input', { type: 'number', step: '1', min: '0', inputmode: 'numeric', value: v.stock == null ? '' : v.stock, 'aria-label': v.label + ' ' + t('p_stock') }), label: v.label };
      });
      var form = h('div', { class: 'form' }, field(t('p_name'), f.name),
        p.type !== 'variable' ? h('div', { class: 'fields2' }, field(t('p_price'), f.price), field(t('p_sale'), f.sale)) : null,
        p.type !== 'variable' ? field(t('p_stock'), f.stock, t('p_stock_hint')) : null,
        status.el);
      put(m, h('div', { class: 'card' }, form,
        !isNew && p.type !== 'variable' ? h('button', { class: 'btn btn--plain btn--sm', type: 'button', style: 'margin-top:12px', onclick: function () { f.stock.value = '0'; save({ sold_out: true }); } }, t('p_soldout')) : null));
      if (varRows.length) put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('p_options'))),
        h('table', { class: 'vars' }, h('thead', null, h('tr', null, h('th', null, t('p_option')), h('th', null, 'RM'), h('th', null, ZH ? '特价' : 'Sale'), h('th', null, ZH ? '剩' : 'Left'))),
          h('tbody', null, varRows.map(function (v) { return h('tr', null, h('td', null, v.label), h('td', null, v.price), h('td', null, v.sale), h('td', null, v.stock)); }))),
        h('p', { class: 'small muted', style: 'margin:8px 0 0' }, t('p_stock_hint'))));
      put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('p_photos'))), photos));
      put(m, h('div', { class: 'card form' }, field(t('p_short'), f.short), field(t('p_desc'), f.desc), field(t('p_cat'), f.cat)));
      var saveBtn = h('button', { class: 'btn', type: 'button', onclick: function () { save({}); } }, t('p_save'));
      put(m, h('div', { class: 'actbar' }, !isNew ? h('a', { class: 'btn btn--plain', href: p.url, target: '_blank', rel: 'noopener' }, icon('ext'), t('p_view')) : null, saveBtn));
      if (!isNew) put(m, h('p', { style: 'text-align:center' }, h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: function () {
        confirmBox(t('p_delete_q', p.name), t('p_delete_p'), t('p_delete'), t('keep').replace(ZH ? '订单' : 'order', ZH ? '' : 'it'), true).then(function (ok) {
          if (ok) api('products/' + p.id, { method: 'DELETE' }).then(function () { toast(t('saved')); location.hash = '#/products'; }).catch(function (e) { toast(t('error', e.message), true); });
        });
      } }, t('p_delete'))));

      function save(extra) {
        if (!f.name.value.trim()) { f.name.focus(); return; }
        var cat = f.cat.value;
        var go = cat === '__new' ? Promise.resolve(window.prompt(t('p_cat_new')) || '') : Promise.resolve(cat);
        go.then(function (catName) {
          var desc = f.desc.value.trim();
          var body = Object.assign({
            name: f.name.value.trim(), status: status.input.checked ? 'publish' : 'private', short: f.short.value,
            description: desc ? '<p>' + desc.split(/\n{2,}/).map(function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>'); }).join('</p><p>') + '</p>' : '',
            image_id: img ? img.id : 0, gallery_ids: gallery.map(function (g) { return g.id; }), category: catName
          }, extra);
          if (p.type !== 'variable') { body.regular_price = f.price.value; body.sale_price = f.sale.value; body.stock = f.stock.value; }
          if (varRows.length) body.variations = varRows.map(function (v) { return { id: v.id, regular_price: v.price.value, sale_price: v.sale.value, stock: v.stock.value }; });
          saveBtn.disabled = true;
          return api(isNew ? 'products' : 'products/' + p.id, { method: 'POST', body: body }).then(function (np) {
            toast(t('saved')); saveBtn.disabled = false;
            if (isNew) location.hash = '#/product/' + np.id; else render();
          });
        }).catch(function (e) { saveBtn.disabled = false; toast(t('error', e.message), true); });
      }
    });
  };

  VIEWS['new-order'] = function (r) {
    setTop(t('new_order'), C.site, true);
    return api('products').then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      var opts = [];
      dd.products.forEach(function (p) {
        if (p.status !== 'publish') return;
        if (p.variations.length) p.variations.forEach(function (v) { opts.push({ id: v.id, label: p.name + ' · ' + v.label, price: parseFloat(v.sale_price || v.regular_price) || 0, left: v.stock }); });
        else opts.push({ id: p.id, label: p.name, price: parseFloat(p.sale_price || p.regular_price) || 0, left: p.stock });
      });
      var F = { name: h('input', { type: 'text', autocomplete: 'off' }), phone: h('input', { type: 'tel', inputmode: 'tel' }), email: h('input', { type: 'email' }),
        mode: h('select', null, h('option', { value: 'collect' }, ZH ? '到店自取' : 'Self-collect'), h('option', { value: 'delivery' }, ZH ? '送货' : 'Delivery'), h('option', { value: 'courier' }, t('courier'))),
        when: h('select'), addr: h('textarea', { rows: 2 }), fee: h('input', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: '0' }),
        method: h('select', null, ['cash', 'transfer', 'duitnow', 'other'].map(function (k) { return h('option', { value: k }, t('m_' + k)); })), note: h('textarea', { rows: 2 }) };
      var paid = sw(t('o_paid'), true);
      var rows = h('div', { class: 'form' });
      var totalEl = h('b', { style: 'font-size:1.2rem' }, '');
      var lines = [];
      function money(v) { return C.currency + v.toFixed(2); }
      function recalc() {
        var sum = lines.reduce(function (a, l) { var o = opts.filter(function (x) { return String(x.id) === l.sel.value; })[0]; return a + (o ? o.price * (parseInt(l.qty.value, 10) || 0) : 0); }, 0) + (parseFloat(F.fee.value) || 0);
        totalEl.textContent = money(sum);
      }
      function addLine() {
        var sel = h('select', { 'aria-label': t('o_choose') }, h('option', { value: '' }, t('o_choose')), opts.map(function (o) { return h('option', { value: o.id, disabled: o.left === 0 }, o.label + ' · ' + money(o.price) + (o.left != null ? ' · ' + (o.left === 0 ? t('sold_out') : t('low_left', o.left).replace(ZH ? '只剩' : 'Only', ZH ? '剩' : '').trim()) : '')); }));
        var qty = h('input', { type: 'number', min: '1', step: '1', inputmode: 'numeric', value: '1', 'aria-label': t('o_qty'), style: 'max-width:80px' });
        var line = { sel: sel, qty: qty };
        var row = h('div', { class: 'row oline' }, h('div', { style: 'flex:1;min-width:0' }, sel), qty, h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'remove', onclick: function () { lines.splice(lines.indexOf(line), 1); row.remove(); recalc(); } }, icon('x')));
        sel.addEventListener('change', recalc); qty.addEventListener('input', recalc);
        lines.push(line); rows.appendChild(row);
      }
      addLine();
      function loadWhen() {
        var mode = F.mode.value;
        addrField.hidden = mode === 'collect';
        whenField.hidden = mode === 'courier';
        if (mode === 'courier') return;
        F.when.innerHTML = '';
        api('slots?mode=' + mode).then(function (sl) {
          put(F.when, h('option', { value: '' }, '—'));
          sl.days.forEach(function (d) { put(F.when, h('optgroup', { label: d.label }, Object.keys(d.slots).map(function (k) { return h('option', { value: d.day + '|' + k }, d.label + ' · ' + k + ' · ' + (d.slots[k] ? t('left', d.slots[k]) : t('full'))); }))); });
        });
      }
      var whenField = field(t('o_when'), F.when);
      var addrField = field(t('o_addr'), F.addr);
      F.mode.addEventListener('change', function () { F.fee.value = F.mode.value === 'collect' ? '0' : F.fee.value; loadWhen(); recalc(); });
      F.fee.addEventListener('input', recalc);
      paid.input.addEventListener('change', function () { methodField.hidden = !paid.input.checked; });
      var methodField = field(t('o_method'), F.method);
      put(m, h('div', { class: 'card form' }, field(t('no_name'), F.name), h('div', { class: 'fields2' }, field(t('phone'), F.phone), field(t('email'), F.email))));
      put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('o_items'))), rows, h('button', { class: 'btn btn--plain btn--sm', type: 'button', style: 'margin-top:10px', onclick: addLine }, icon('plus'), t('o_add_item'))));
      put(m, h('div', { class: 'card form' }, field(t('o_mode'), F.mode), whenField, addrField, field(t('o_fee'), F.fee)));
      put(m, h('div', { class: 'card form' }, paid.el, methodField, field(t('o_note'), F.note)));
      var saveBtn = h('button', { class: 'btn', type: 'button' }, t('o_save'));
      put(m, h('div', { class: 'actbar' }, h('div', { style: 'flex:1' }, h('div', { class: 'small muted' }, t('o_total')), totalEl), saveBtn));
      function send(force) {
        var items = lines.filter(function (l) { return l.sel.value; }).map(function (l) { return { id: Number(l.sel.value), qty: parseInt(l.qty.value, 10) || 1 }; });
        if (!F.name.value.trim()) { F.name.focus(); return; }
        if (!items.length) { toast(t('o_choose'), true); return; }
        saveBtn.disabled = true;
        api('orders', { method: 'POST', body: { name: F.name.value, phone: F.phone.value, email: F.email.value, items: items, mode: F.mode.value, when: F.mode.value === 'courier' ? '' : F.when.value,
          address: F.addr.value, shipping: F.fee.value, paid: paid.input.checked, method: F.method.value, note: F.note.value, force: !!force } })
          .then(function (o) { toast(t('saved')); return refreshSummary().then(function () { location.hash = '#/order/' + o.id; }); })
          .catch(function (e) {
            saveBtn.disabled = false;
            if (e.message !== 'auth' && /left|剩/.test(e.message) && !force) { confirmBox(e.message, t('o_stock_force'), t('yes'), t('no')).then(function (ok) { if (ok) send(true); }); return; }
            toast(t('error', e.message), true);
          });
      }
      saveBtn.addEventListener('click', function () { send(false); });
      loadWhen(); recalc();
    });
  };

  /* ------------------------------------------------------------------ customers */
  VIEWS.customers = function (r) {
    setTop(t('customers'), C.site, true);
    var tab = r.p.get('tab') === 'notify' ? 'notify' : 'list';
    return api('customers').then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      put(m, h('div', { class: 'pills' },
        h('a', { class: 'pill' + (tab === 'list' ? ' is-on' : ''), href: '#/customers' }, t('customers'), h('i', null, dd.customers.length)),
        h('a', { class: 'pill' + (tab === 'notify' ? ' is-on' : ''), href: '#/customers?tab=notify' }, t('c_notify'), h('i', null, dd.notify.length))));
      if (tab === 'notify') {
        if (!dd.notify.length) { put(m, h('p', { class: 'empty' }, t('c_notify_none'))); return; }
        put(m, h('div', { class: 'btns', style: 'margin-bottom:12px' }, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () {
          downloadXlsx('notify-list-' + today() + '.xlsx', [{ name: ZH ? '等通知' : 'Notify', rows: [[t('phone'), ZH ? '留号码日期' : 'Date']].concat(dd.notify.map(function (n) { return [n.phone, d(n.date)]; })) }]);
        } }, icon('down'), t('export_xlsx')), h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () {
          var txt = dd.notify.map(function (n) { return n.phone; }).join('\n');
          (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast(t('c_copied')); }).catch(function () { window.prompt('', txt); });
        } }, t('c_copy'))));
        put(m, h('div', { class: 'card' }, h('table', { class: 'tbl' }, h('tbody', null, dd.notify.map(function (n) {
          return h('tr', null, h('td', null, n.phone, h('div', { class: 'small muted' }, d(n.date))), h('td', { class: 'r' }, n.wa ? h('a', { class: 'btn btn--ghost btn--sm', href: 'https://wa.me/' + n.wa, target: '_blank', rel: 'noopener' }, icon('chat'), t('whatsapp')) : null));
        })))));
        return;
      }
      var input = h('input', { type: 'search', placeholder: t('c_search'), 'aria-label': t('c_search') });
      var box = h('div', { class: 'card' });
      function draw() {
        var q = input.value.trim().toLowerCase();
        var cs = dd.customers.filter(function (c) { return !q || (c.name + ' ' + c.phone + ' ' + c.email).toLowerCase().indexOf(q) !== -1; });
        box.innerHTML = '';
        if (!cs.length) { put(box, h('p', { class: 'empty' }, t('c_none'))); return; }
        put(box, h('table', { class: 'tbl' }, h('tbody', null, cs.map(function (c) {
          return h('tr', null, h('td', null, h('a', { href: '#/orders?f=all&q=' + encodeURIComponent((c.phone || c.email || '').replace(/\s+/g, '')), style: 'text-decoration:none;color:inherit' }, h('b', null, c.name || '—'), h('div', { class: 'small muted' }, [c.phone, t('c_orders', c.orders), c.spent_f].filter(Boolean).join(' · ')))),
            h('td', { class: 'r' }, h('div', { class: 'btns', style: 'justify-content:flex-end' },
              c.phone ? h('a', { class: 'btn btn--plain btn--sm', href: 'tel:' + c.phone, 'aria-label': t('call') }, icon('phone')) : null,
              c.wa ? h('a', { class: 'btn btn--ghost btn--sm', href: 'https://wa.me/' + c.wa, target: '_blank', rel: 'noopener', 'aria-label': t('whatsapp') }, icon('chat')) : null)));
        }))));
      }
      input.addEventListener('input', draw);
      put(m, [h('label', { class: 'search' }, icon('search'), input), h('div', { class: 'row', style: 'margin-bottom:10px' }, h('span', { class: 'small muted', style: 'flex:1' }, t('c_tap')),
        h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () {
          downloadXlsx('customers-' + today() + '.xlsx', [{ name: ZH ? '顾客' : 'Customers', rows: [[t('customer'), t('phone'), t('email'), ZH ? '订单数' : 'Orders', ZH ? '已付金额 (RM)' : 'Paid (RM)', ZH ? '最近下单' : 'Last order']].concat(dd.customers.map(function (c) { return [c.name, c.phone, c.email, c.orders, Math.round(c.spent * 100) / 100, d(c.last)]; })) }]);
        } }, icon('down'), t('export_xlsx'))), box]);
      draw();
    });
  };

  /* ------------------------------------------------------------------ reports */
  function barChart(days) {
    var max = Math.max.apply(null, days.map(function (x) { return x.revenue; }).concat([1]));
    var W0 = 600, H0 = 190, padL = 0, padB = 22, top = 18, n = days.length;
    var bw = (W0 - padL) / n;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W0 + ' ' + H0); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', t('r_chart'));
    function mk(tag, attrs, txt) { var e = document.createElementNS(NS, tag); Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (txt != null) e.textContent = txt; return e; }
    var g = mk('g', { class: 'grid' });
    [0.5, 1].forEach(function (f) { var y = top + (H0 - padB - top) * (1 - f); g.appendChild(mk('line', { x1: 0, x2: W0, y1: y, y2: y })); });
    g.appendChild(mk('line', { x1: 0, x2: W0, y1: H0 - padB, y2: H0 - padB }));
    svg.appendChild(g);
    var tip = h('div', { class: 'tip', hidden: true });
    var wrap = h('div', { class: 'chart' }, svg, tip);
    var maxI = -1;
    days.forEach(function (x, i) { if (maxI === -1 || x.revenue > days[maxI].revenue) maxI = i; });
    var ax = mk('g', { class: 'axis' });
    days.forEach(function (x, i) {
      var hgt = x.revenue > 0 ? Math.max(3, (H0 - padB - top) * x.revenue / max) : 0;
      var gap = Math.min(4, bw * 0.25);
      var bx = padL + i * bw + gap / 2, bwid = Math.max(1, bw - gap), by = H0 - padB - hgt;
      if (hgt) {
        var r = Math.min(4, bwid / 2);
        var path = mk('path', { class: 'b', d: 'M' + bx + ',' + (H0 - padB) + 'V' + (by + r) + 'Q' + bx + ',' + by + ' ' + (bx + r) + ',' + by + 'H' + (bx + bwid - r) + 'Q' + (bx + bwid) + ',' + by + ' ' + (bx + bwid) + ',' + (by + r) + 'V' + (H0 - padB) + 'Z', fill: 'var(--chart)' });
        svg.appendChild(path);
        x._el = path;
      }
      var hit = mk('rect', { class: 'hit', x: padL + i * bw, y: 0, width: bw, height: H0 - padB });
      var show = function () {
        days.forEach(function (y) { if (y._el) y._el.setAttribute('fill', 'var(--chart)'); });
        if (x._el) x._el.setAttribute('fill', 'var(--accent)');
        tip.textContent = x.label + ' · ' + x.revenue_f + ' · ' + t('orders_n', x.orders);
        tip.hidden = false;
        tip.style.left = ((i + 0.5) / n * 100) + '%';
        tip.style.top = (by / H0 * 190) + 'px';
      };
      hit.addEventListener('mouseenter', show); hit.addEventListener('click', show);
      svg.appendChild(hit);
      var every = Math.ceil(n / 7);
      if (i % every === 0 || i === n - 1) ax.appendChild(mk('text', { x: padL + i * bw + bw / 2, y: H0 - 6, 'text-anchor': 'middle' }, x.label));
    });
    svg.addEventListener('mouseleave', function () { tip.hidden = true; days.forEach(function (y) { if (y._el) y._el.setAttribute('fill', 'var(--chart)'); }); });
    svg.appendChild(ax);
    if (maxI >= 0 && days[maxI].revenue > 0) {
      var mx = padL + maxI * bw + bw / 2, my = H0 - padB - (H0 - padB - top) * days[maxI].revenue / max - 5;
      svg.appendChild(mk('text', { class: 'lbl', x: Math.min(W0 - 40, Math.max(40, mx)), y: Math.max(12, my), 'text-anchor': 'middle' }, days[maxI].revenue_f));
    }
    return wrap;
  }
  function share(rows) {
    var total = rows.reduce(function (a, b) { return a + b.orders; }, 0) || 1;
    return h('div', { class: 'share' }, rows.map(function (x) {
      var pct = Math.round(x.orders / total * 100);
      return h('div', { class: 'share__row' }, h('span', null, x.name), h('span', { class: 'muted' }, t('orders_n', x.orders) + ' · ' + pct + '%'), h('div', { class: 'bar' }, h('i', { style: 'width:' + pct + '%' })));
    }));
  }
  function exportXlsx(days, rep) {
    api('orders?f=all&all=1&days=' + days).then(function (dd) {
      var sheets = [{ name: ZH ? '订单' : 'Orders', rows: orderRows(dd.orders) }];
      if (rep) {
        sheets.push({ name: ZH ? '每天收款' : 'Daily sales', rows: [[ZH ? '日子' : 'Day', ZH ? '已付款订单' : 'Paid orders', ZH ? '已收款 (RM)' : 'Paid (RM)']].concat(rep.days.map(function (x) { return [x.day, x.orders, Math.round(x.revenue * 100) / 100]; })) });
        sheets.push({ name: ZH ? '热卖' : 'Best sellers', rows: [[t('item'), t('r_qty'), ZH ? '销售额 (RM)' : 'Sales (RM)']].concat(rep.top.map(function (x) { return [x.name, x.qty, Math.round(x.revenue * 100) / 100]; })) });
      }
      downloadXlsx('orders-' + days + 'd-' + today() + '.xlsx', sheets);
    }).catch(function (e) { toast(t('error', e.message), true); });
  }
  VIEWS.reports = function (r) {
    var days = parseInt(r.p.get('days'), 10) || 30;
    var repData = null;
    setTop(t('reports'), C.site, true, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { exportXlsx(days, repData); } }, icon('down'), t('excel')));
    return api('reports?days=' + days).then(function (dd) {
      repData = dd;
      var m = live(r); if (!m) return; m.innerHTML = '';
      put(m, h('div', { class: 'pills' }, [7, 30, 90].map(function (n) { return h('a', { class: 'pill' + (n === days ? ' is-on' : ''), href: '#/reports?days=' + n }, t('r_days', n)); })));
      put(m, h('div', { class: 'grid2', style: 'margin-bottom:14px' },
        h('div', { class: 'stat', style: 'grid-column:1/-1' }, h('b', null, dd.total), h('span', null, t('r_sales'))),
        h('div', { class: 'stat' }, h('b', null, dd.orders), h('span', null, t('r_orders'))),
        h('div', { class: 'stat' }, h('b', null, dd.average), h('span', null, t('r_avg')))));
      if (!dd.orders) { put(m, h('p', { class: 'empty card' }, t('r_none'))); }
      else {
        put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('r_chart'))), barChart(dd.days)));
        put(m, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('r_top'))), h('table', { class: 'tbl' },
          h('thead', null, h('tr', null, h('th', null, t('item')), h('th', { class: 'r' }, t('r_qty')), h('th', { class: 'r' }, t('r_rev')))),
          h('tbody', null, dd.top.map(function (x) { return h('tr', null, h('td', null, x.name), h('td', { class: 'r' }, x.qty), h('td', { class: 'r' }, x.revenue_f)); })))));
        put(m, h('div', { class: 'cols' }, h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('r_pay'))), share(dd.pay)),
          h('div', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, t('r_mode'))), share(dd.mode))));
      }
      put(m, h('button', { class: 'btn btn--plain btn--block', type: 'button', onclick: function () { exportXlsx(days, dd); } }, icon('down'), t('export_xlsx')));
    });
  };

  /* ------------------------------------------------------------------ coupons */
  VIEWS.coupons = function (r) {
    setTop(t('coupons'), C.site, true, h('a', { class: 'btn btn--sm', href: '#/coupon/new' }, icon('plus'), t('cp_new')));
    return api('coupons').then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      if (!dd.coupons.length) { put(m, h('p', { class: 'empty card' }, t('cp_none'))); return; }
      put(m, h('div', { class: 'plist' }, dd.coupons.map(function (c) {
        var off = c.type === 'percent' ? c.amount + '%' : C.currency + c.amount;
        return h('a', { class: 'pcard', href: '#/coupon/' + c.id, style: 'grid-template-columns:1fr' }, h('div', null,
          h('div', { class: 'row' }, h('b', { style: 'font-size:1.1rem;letter-spacing:.04em' }, c.code.toUpperCase()), h('span', { class: 'spacer' }),
            !c.on ? h('span', { class: 'badge b-grey' }, t('cp_off')) : c.expired ? h('span', { class: 'badge b-cancelled' }, t('cp_expired')) : h('span', { class: 'badge b-make' }, t('cp_on'))),
          h('div', { class: 'pcard__meta' }, h('span', { class: 'badge b-soft' }, (ZH ? '优惠 ' : '') + off), parseFloat(c.min) > 0 ? h('span', { class: 'muted' }, (ZH ? '满 ' : 'min ') + C.currency + c.min) : null, c.free_ship ? h('span', { class: 'muted' }, t('cp_free')) : null),
          h('div', { class: 'small muted', style: 'margin-top:6px' }, [c.limit ? t('cp_of', c.used, c.limit) : t('cp_used', c.used), c.expires ? (ZH ? '到 ' : 'until ') + c.expires : ''].filter(Boolean).join(' · '))));
      })));
    });
  };
  VIEWS.coupon = function (r) {
    var isNew = r.id === 'new';
    return (isNew ? Promise.resolve({ coupons: [] }) : api('coupons')).then(function (dd) {
      var c = isNew ? { code: '', type: 'percent', amount: '10', min: '', limit: null, expires: '', free_ship: false, on: true } : dd.coupons.filter(function (x) { return String(x.id) === r.id; })[0];
      if (!c) throw new Error('404');
      setTop(isNew ? t('cp_new') : c.code.toUpperCase(), C.site, true);
      var m = live(r); if (!m) return; m.innerHTML = '';
      var F = { code: h('input', { type: 'text', value: c.code.toUpperCase(), autocapitalize: 'characters', placeholder: 'CNY10' }),
        type: h('select', null, h('option', { value: 'percent', selected: c.type === 'percent' }, t('cp_percent')), h('option', { value: 'fixed_cart', selected: c.type !== 'percent' }, t('cp_fixed'))),
        amount: h('input', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: c.amount }), min: h('input', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: parseFloat(c.min) > 0 ? c.min : '' }),
        limit: h('input', { type: 'number', min: '0', step: '1', inputmode: 'numeric', value: c.limit || '' }), expires: h('input', { type: 'date', value: c.expires }) };
      var free = sw(t('cp_free'), c.free_ship), on = sw(t('cp_on'), c.on);
      var saveBtn = h('button', { class: 'btn', type: 'button' }, t('p_save'));
      put(m, h('div', { class: 'card form' }, field(t('cp_code'), F.code), h('div', { class: 'fields2' }, field(t('cp_type'), F.type), field(t('cp_amount'), F.amount)), field(t('cp_min'), F.min), field(t('cp_limit'), F.limit), field(t('cp_exp'), F.expires), free.el, on.el,
        !isNew ? h('p', { class: 'small muted', style: 'margin:0' }, c.limit ? t('cp_of', c.used, c.limit) : t('cp_used', c.used)) : null));
      put(m, h('div', { class: 'actbar' }, saveBtn));
      if (!isNew) put(m, h('p', { style: 'text-align:center' }, h('button', { class: 'btn btn--danger btn--sm', type: 'button', onclick: function () {
        confirmBox(t('cp_delete_q', c.code.toUpperCase()), '', t('cp_delete'), t('cancel'), true).then(function (ok) { if (ok) api('coupons/' + c.id, { method: 'DELETE' }).then(function () { toast(t('saved')); location.hash = '#/coupons'; }).catch(function (e) { toast(t('error', e.message), true); }); });
      } }, t('cp_delete'))));
      saveBtn.addEventListener('click', function () {
        if (!F.code.value.trim()) { F.code.focus(); return; }
        saveBtn.disabled = true;
        api('coupons', { method: 'POST', body: { id: isNew ? 0 : c.id, code: F.code.value.trim(), type: F.type.value, amount: F.amount.value, min: F.min.value, limit: F.limit.value, expires: F.expires.value, free_ship: free.input.checked, on: on.input.checked } })
          .then(function () { toast(t('saved')); location.hash = '#/coupons'; }).catch(function (e) { saveBtn.disabled = false; toast(t('error', e.message), true); });
      });
    });
  };

  /* ------------------------------------------------------------------ team (owners only) */
  VIEWS.team = function (r) {
    setTop(t('team'), C.site, true);
    return api('team').then(function (dd) {
      var m = live(r); if (!m) return; m.innerHTML = '';
      var listBox = h('div', { class: 'card' });
      function drawList(team) {
        listBox.innerHTML = '';
        put(listBox, h('table', { class: 'tbl' }, h('tbody', null, team.map(function (u) {
          return h('tr', null, h('td', null, h('b', null, u.name + (u.me ? ' (' + t('tm_you') + ')' : '')), h('div', { class: 'small muted' }, u.email)),
            h('td', { class: 'r' }, h('span', { class: 'badge ' + (u.role === 'admin' ? 'b-soft' : 'b-grey') }, u.role === 'admin' ? t('tm_owner') : t('tm_staff')),
              u.role === 'staff' && !u.me ? h('div', null, h('button', { class: 'btn btn--danger btn--sm', type: 'button', style: 'margin-top:6px', onclick: function () {
                confirmBox(t('tm_remove_q', u.name), t('tm_remove_p'), t('tm_remove'), t('cancel'), true).then(function (ok) { if (ok) api('team/' + u.id, { method: 'DELETE' }).then(function (r2) { toast(t('saved')); drawList(r2.team); }).catch(function (e) { toast(t('error', e.message), true); }); });
              } }, t('tm_remove'))) : null));
        }))));
      }
      drawList(dd.team);
      var F = { name: h('input', { type: 'text' }), email: h('input', { type: 'email' }) };
      var out = h('div');
      var addBtn = h('button', { class: 'btn', type: 'button' }, t('tm_add'));
      addBtn.addEventListener('click', function () {
        addBtn.disabled = true;
        api('team', { method: 'POST', body: { name: F.name.value, email: F.email.value } }).then(function (r2) {
          drawList(r2.team);
          out.innerHTML = '';
          var who = F.name.value;
          put(out, h('div', { class: 'card card--soft' }, h('p', { style: 'margin:0 0 8px' }, t('tm_link', who)), h('p', { class: 'small', style: 'word-break:break-all;margin:0 0 10px' }, r2.link),
            h('div', { class: 'btns' }, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { (navigator.clipboard ? navigator.clipboard.writeText(r2.link) : Promise.reject()).then(function () { toast(t('saved')); }).catch(function () { window.prompt('', r2.link); }); } }, t('tm_copy')),
              h('a', { class: 'btn btn--ghost btn--sm', href: 'https://wa.me/?text=' + encodeURIComponent(r2.link), target: '_blank', rel: 'noopener' }, icon('chat'), t('tm_wa')))));
          F.name.value = ''; F.email.value = '';
        }).catch(function (e) { toast(t('error', e.message), true); }).then(function () { addBtn.disabled = false; });
      });
      put(m, [listBox, out, h('div', { class: 'card form' }, h('h2', { style: 'font-size:1.02rem' }, t('tm_add')), h('p', { class: 'small muted', style: 'margin:0' }, t('tm_hint')), field(t('tm_name'), F.name), field(t('tm_email'), F.email), addBtn)]);
    });
  };

  /* ------------------------------------------------------------------ settings */
  function parseSlots(txt) {
    return String(txt || '').split(/\n/).map(function (l) { var p = l.split('|'); var tm = (p[0] || '').trim().split(/\s*[–-]\s*/); return { from: tm[0] || '', to: tm[1] || '', cap: (p[1] || '').trim() }; }).filter(function (x) { return x.from; });
  }
  function slotsEditor(txt) {
    var rows = parseSlots(txt);
    var box = h('div', { class: 'slots' });
    function draw() {
      box.innerHTML = '';
      put(box, h('div', { class: 'slotrow small muted' }, h('span', null, t('s_from_t')), h('span', null, t('s_to_t')), h('span', null, t('s_cap')), h('span')));
      rows.forEach(function (r, i) {
        var a = h('input', { type: 'text', inputmode: 'numeric', placeholder: '10:00', maxlength: '5', value: r.from, 'aria-label': t('s_from_t'), oninput: function () { r.from = a.value.trim(); } });
        var b = h('input', { type: 'text', inputmode: 'numeric', placeholder: '13:00', maxlength: '5', value: r.to, 'aria-label': t('s_to_t'), oninput: function () { r.to = b.value.trim(); } });
        var c = h('input', { type: 'number', min: '0', step: '1', inputmode: 'numeric', value: r.cap, oninput: function () { r.cap = c.value; } });
        put(box, h('div', { class: 'slotrow' }, a, b, c, h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'remove', onclick: function () { rows.splice(i, 1); draw(); } }, icon('x'))));
      });
      put(box, h('button', { class: 'btn btn--plain btn--sm', type: 'button', onclick: function () { rows.push({ from: '10:00', to: '13:00', cap: '6' }); draw(); } }, icon('plus'), t('s_add_slot')));
    }
    draw();
    function hhmm(v) { var m = String(v).replace(/[^0-9:]/g, '').match(/^(\d{1,2}):?(\d{2})$/); return m && +m[1] < 24 && +m[2] < 60 ? ('0' + m[1]).slice(-2) + ':' + m[2] : ''; }
    return { el: box, value: function () { return rows.map(function (r) { return { a: hhmm(r.from), b: hhmm(r.to), c: parseInt(r.cap, 10) || 0 }; }).filter(function (r) { return r.a && r.b; }).map(function (r) { return r.a + '–' + r.b + '|' + r.c; }).join('\n'); } };
  }
  function section(title, nodes, onSave) {
    var btn = h('button', { class: 'btn', type: 'button' }, t('s_save'));
    btn.addEventListener('click', function () { btn.disabled = true; onSave().then(function () { toast(t('saved')); }).catch(function (e) { toast(t('error', e.message), true); }).then(function () { btn.disabled = false; }); });
    return h('section', { class: 'card' }, h('div', { class: 'card__h' }, h('h2', null, title)), h('div', { class: 'form' }, nodes, btn));
  }
  VIEWS.settings = function (r) {
    setTop(t('settings'), C.site, true);
    return api('settings').then(function (dd) {
      var s = dd.settings, m = live(r); if (!m) return; m.innerHTML = '';
      var cut = String(s.fest_cutoff || '').split(' ');
      var F = {
        on: sw(t('s_on'), +s.fest_on), name: h('input', { type: 'text', value: s.fest_name }),
        cutD: h('input', { type: 'date', value: cut[0] || '' }), cutT: h('input', { type: 'time', value: cut[1] || '23:59' }),
        from: h('input', { type: 'date', value: s.fest_from }), to: h('input', { type: 'date', value: s.fest_to }), closed: h('input', { type: 'text', value: s.fest_closed, placeholder: '2027-02-03' }),
        collect: slotsEditor(s.fest_collect_slots), delivery: slotsEditor(s.fest_delivery_slots),
        earlyEnd: h('input', { type: 'date', value: s.fest_early_end }), earlyPct: h('input', { type: 'number', min: '0', max: '90', step: '1', value: s.fest_early_pct }),
        showLeft: sw(t('s_show_left'), +s.fest_show_left), low: h('input', { type: 'number', min: '0', step: '1', value: s.fest_low_stock }),
        notify: sw(t('s_notify'), +s.fest_notify), courier: h('input', { type: 'text', value: s.fest_courier_note })
      };
      put(m, section(t('s_fest'), [F.on.el, field(t('s_name'), F.name), h('div', { class: 'fields2' }, field(t('s_cutoff'), F.cutD), field(t('s_cut_time'), F.cutT)),
        h('div', { class: 'fields2' }, field(t('s_from'), F.from), field(t('s_to'), F.to)), field(t('s_closed'), F.closed),
        h('div', { class: 'field' }, h('span', null, t('s_collect')), F.collect.el), h('div', { class: 'field' }, h('span', null, t('s_delivery')), F.delivery.el),
        h('div', { class: 'fields2' }, field(t('s_early_end'), F.earlyEnd), field(t('s_early_pct'), F.earlyPct)), F.showLeft.el, field(t('s_low'), F.low), F.notify.el, field(t('s_courier'), F.courier)],
        function () {
          return api('settings', { method: 'POST', body: { settings: {
            fest_on: F.on.input.checked, fest_name: F.name.value, fest_cutoff: F.cutD.value ? F.cutD.value + (F.cutT.value && F.cutT.value !== '23:59' ? ' ' + F.cutT.value : '') : '',
            fest_from: F.from.value, fest_to: F.to.value, fest_closed: F.closed.value, fest_collect_slots: F.collect.value(), fest_delivery_slots: F.delivery.value(),
            fest_early_end: F.earlyEnd.value, fest_early_pct: F.earlyPct.value, fest_show_left: F.showLeft.input.checked, fest_low_stock: F.low.value, fest_notify: F.notify.input.checked, fest_courier_note: F.courier.value
          } } });
        }));
      var B = { legal: h('input', { type: 'text', value: s.legal_name }), phone: h('input', { type: 'tel', value: s.business_phone }), email: h('input', { type: 'email', value: s.business_email }),
        address: h('textarea', { rows: 2, value: s.business_address }), hours: h('input', { type: 'text', value: s.business_hours }), ann: h('input', { type: 'text', value: s.announcement }),
        pause: sw(t('paused_on'), +s.shop_paused), pauseMsg: h('input', { type: 'text', value: s.shop_paused_msg }) };
      put(m, section(t('s_shop'), [field(t('s_legal'), B.legal), h('div', { class: 'fields2' }, field(t('s_phone'), B.phone), field(t('s_email'), B.email)), field(t('s_address'), B.address), field(t('s_hours'), B.hours), field(t('s_announce'), B.ann), B.pause.el, field(t('pause_msg'), B.pauseMsg)],
        function () { return api('settings', { method: 'POST', body: { settings: { legal_name: B.legal.value, business_phone: B.phone.value, business_email: B.email.value, business_address: B.address.value, business_hours: B.hours.value, announcement: B.ann.value, shop_paused: B.pause.input.checked, shop_paused_msg: B.pauseMsg.value } } }); }));
      var D = dd.duitnow;
      var qr = D.qr;
      var qrBox = h('div', { class: 'photos' });
      var qrIn = h('input', { type: 'file', accept: 'image/*', class: 'sr' });
      function drawQr() { qrBox.innerHTML = ''; if (qr) put(qrBox, h('div', { class: 'photo' }, h('img', { src: qr, alt: 'DuitNow QR' }), h('button', { type: 'button', 'aria-label': 'remove', onclick: function () { qr = ''; drawQr(); } }, icon('x')))); put(qrBox, h('label', { class: 'photo photo--add' }, h('span', null, '+ ' + t('s_qr_up')), qrIn)); }
      qrIn.addEventListener('change', function () { var file = qrIn.files[0]; if (!file) return; upload(file).then(function (u) { qr = u.full || u.url; drawQr(); }).catch(function (e) { toast(t('error', e.message), true); }); qrIn.value = ''; });
      drawQr();
      var Dn = { on: sw(t('s_duit_on'), D.enabled), account: h('input', { type: 'text', value: D.account }), note: h('textarea', { rows: 2, value: D.note }) };
      put(m, section(t('s_duit'), [Dn.on.el, h('div', { class: 'field' }, h('span', null, t('s_qr')), qrBox, dd.demo && !qr ? h('small', null, t('s_demo_qr')) : null), field(t('s_account'), Dn.account), field(t('s_duit_note'), Dn.note)],
        function () { return api('settings', { method: 'POST', body: { duitnow: { enabled: Dn.on.input.checked, qr: qr, account: Dn.account.value, note: Dn.note.value } } }); }));
      var Z = [];
      var zoneNodes = dd.zones.map(function (z) {
        return h('div', { class: 'field' }, h('span', null, z.name), z.methods.map(function (mm) {
          var title = h('input', { type: 'text', value: mm.title, 'aria-label': z.name });
          var num = h('input', { type: 'number', min: '0', step: '0.01', inputmode: 'decimal', value: mm.type === 'free_shipping' ? mm.min : mm.cost, 'aria-label': mm.type === 'free_shipping' ? t('s_free_min') : t('s_cost') });
          var on = h('input', { type: 'checkbox', checked: mm.enabled, role: 'switch' });
          Z.push({ instance: mm.instance, type: mm.type, title: title, num: num, on: on });
          return h('div', { class: 'card', style: 'margin:0;padding:12px' }, h('div', { class: 'fields2' }, field(ZH ? '名称' : 'Name', title), field(mm.type === 'free_shipping' ? t('s_free_min') : t('s_cost'), num)), h('label', { class: 'switch' }, h('span', null, ZH ? '开启' : 'On'), on));
        }));
      });
      put(m, section(t('s_ship'), zoneNodes, function () {
        return api('settings', { method: 'POST', body: { zones: Z.map(function (x) { var o = { instance: x.instance, title: x.title.value, enabled: x.on.checked }; if (x.type === 'free_shipping') o.min = x.num.value; else o.cost = x.num.value; return o; }) } });
      }));
    });
  };

  /* ------------------------------------------------------------------ more (phone) */
  VIEWS.more = function (r) {
    setTop(t('more'), C.site);
    var m = live(r); if (!m) return; m.innerHTML = '';
    var links = [['customers', 'customers'], ['coupons', 'tag'], ['reports', 'reports']];
    if (C.can.settings) links.push(['settings', 'settings']);
    if (C.can.admin) links.push(['team', 'team']);
    put(m, h('div', { class: 'card', style: 'padding:6px' }, links.map(function (x) {
      return h('a', { href: '#/' + x[0], class: 'row', style: 'padding:14px 10px;text-decoration:none;color:var(--ink);font-weight:700;border-bottom:1px solid var(--line)' }, icon(x[1]), h('span', null, t(x[0])));
    }), h('a', { href: C.shop, target: '_blank', rel: 'noopener', class: 'row', style: 'padding:14px 10px;text-decoration:none;color:var(--ink);font-weight:700;border-bottom:1px solid var(--line)' }, icon('ext'), h('span', null, t('m_shop'))),
      C.can.admin ? h('a', { href: C.admin, class: 'row', style: 'padding:14px 10px;text-decoration:none;color:var(--muted);border-bottom:1px solid var(--line)' }, icon('settings'), h('span', null, t('m_wp'))) : null,
      h('a', { href: C.logout, class: 'row', style: 'padding:14px 10px;text-decoration:none;color:#a12626;font-weight:700' }, icon('back'), h('span', null, t('m_logout')))));
    put(m, h('p', { class: 'small muted', style: 'padding:0 6px' }, t('m_home_tip')));
    return Promise.resolve();
  };

  /* ------------------------------------------------------------------ start */
  shell();
  window.addEventListener('hashchange', render);
  if (!location.hash) history.replaceState(null, '', '#/home');
  render();
  setInterval(function () { if (!document.hidden) refreshSummary().catch(function () {}); }, 60000);
})();
