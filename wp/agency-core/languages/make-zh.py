#!/usr/bin/env python3
"""Write agency-core-zh_CN.po from agency-core.pot + the table below (2026-11-13: festive shop strings).

Run from wp/agency-core:
  wp i18n make-pot . languages/agency-core.pot --domain=agency-core --exclude=tests
  python3 languages/make-zh.py
  wp i18n make-mo languages/agency-core-zh_CN.po languages/
Strings not in the table stay English.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))

ZH = {
    # emails
    'Order ready': '订单可以取货 / 已出发',
    'Sent to the customer when you mark an order "Ready" (ready for collection, or out for delivery).': '把订单标为「可以取货」（可以取货，或已经出发送货）时，寄给顾客。',
    'Your {site_title} order #{order_number} is ready': '你在 {site_title} 的订单 #{order_number} 好了',
    'Your order is ready': '你的订单好了',
    'Thank you, and happy celebrating!': '谢谢你，祝佳节愉快！',
    'Hi %s,': '%s 你好：',
    'Your order is ready for collection. Please show this email or your order number when you come.': '你的订单可以来取了。来的时候出示这封电邮或订单号码就可以。',
    'Your order is on its way to you.': '你的订单已经出发，正在送去给你。',
    # DuitNow
    'DuitNow QR (manual)': 'DuitNow QR（手动确认）',
    'Shows your DuitNow QR and the amount. The order waits on hold until the customer uploads the receipt and you press "Payment received".': '显示你的 DuitNow QR 和金额。顾客上传收据、你按「已收到付款」之前，订单是「保留」状态。',
    'Enable': '开启',
    'Accept DuitNow QR payments': '接受 DuitNow QR 付款',
    'Title': '标题',
    'DuitNow QR (any banking or e-wallet app)': 'DuitNow QR（任何银行或电子钱包 App）',
    'Description': '说明',
    'After you place the order you will see our DuitNow QR and the amount. Pay with any banking or e-wallet app, then upload the receipt.': '下单后会看到我们的 DuitNow QR 和金额。用任何银行或电子钱包 App 付款，再上传收据。',
    'DuitNow QR image (URL)': 'DuitNow QR 图片网址',
    "Upload your shop's DuitNow QR to Media, copy its URL here.": '把店的 DuitNow QR 上传到「媒体」，复制它的网址贴在这里。',
    'Account name shown under the QR': 'QR 下面显示的户口名字',
    'Extra note': '补充说明',
    'We confirm payments within the same day (9am–9pm).': '我们当天确认付款（早上 9 点到晚上 9 点）。',
    'Waiting for the DuitNow payment and receipt.': '等顾客 DuitNow 付款和上传收据。',
    'Pay by DuitNow QR': '用 DuitNow QR 付款',
    'DuitNow QR': 'DuitNow QR',
    'Scan the QR with your banking or e-wallet app (or save it and choose it from your photos).': '用银行或电子钱包 App 扫这个 QR（也可以先存图，再从相册选）。',
    'Pay <strong>%1$s</strong>, reference <strong>%2$s</strong>.': '付 <strong>%1$s</strong>，备注（reference）写 <strong>%2$s</strong>。',
    'Upload the receipt below. We will email you when the payment is confirmed.': '在下面上传收据。我们确认付款后会发电邮给你。',
    'Pay %1$s by DuitNow QR, reference %2$s, then upload the receipt here:': '请用 DuitNow QR 付 %1$s，备注写 %2$s，然后在这里上传收据：',
    'Upload my receipt': '上传收据',
    'Demo online payment (nothing is charged)': '示范网上付款（不会收钱）',
    'Only appears in demo mode with test orders allowed. The order is marked paid without charging anything.': '只在示范模式、允许测试订单时出现。订单直接当作已付款，不会收任何钱。',
    'Offer in demo mode': '在示范模式提供',
    'Online banking (FPX), card or e-wallet': '网上银行 FPX、信用卡、电子钱包',
    'Demo store: the order is marked paid and nothing is charged. A real shop connects its own payment gateway here.': '示范网站：订单直接当作已付款，不会收钱。真正的网店会接上店家自己的付款网关。',
    'Demo payment: nothing was charged.': '示范付款：没有收任何钱。',
    # shop front
    'D j M': 'D n月j日',
    'j M, g:i a': 'n月j日 H:i',
    'Self-collect': '到店自取',
    'Delivery': '送货',
    'Courier': '快递',
    'days': '天',
    'hrs': '小时',
    'min': '分',
    '%d left': '剩 %d 份',
    'Full': '已满',
    'Sold out': '已售完',
    'Only %d left': '只剩 %d 份',
    'Pre-orders for %s have closed. Thank you!': '%s预购已经截止，谢谢大家！',
    'Order by %s': '截止：%s',
    'Time left to order': '离截止还有',
    'Collection & delivery: %s': '取货 / 送货：%s',
    'Early-bird %1$s%% off until %2$s': '早鸟 %1$s%% 折扣，到 %2$s',
    'Thank you. We will message you when the next season opens.': '谢谢！下次开放预购时我们会通知你。',
    'Leave your WhatsApp number and we will tell you when we open again.': '留下 WhatsApp 号码，下次开放时通知你。',
    'Notify me': '通知我',
    'Early-bird %s%% off': '早鸟 %s%% 折扣',
    'Delivery day and time': '送货日子和时间',
    'Collection day and time': '取货日子和时间',
    'required': '必填',
    'No days left to choose. Please contact the shop.': '已经没有日子可以选了，请联系店家。',
    'Choose a day and time': '选日子和时间',
    'Collect from: %s': '取货地点：%s',
    'Pre-orders for this season have closed.': '这一季的预购已经截止。',
    'Please choose a delivery day and time.': '请选送货的日子和时间。',
    'Please choose a collection day and time.': '请选取货的日子和时间。',
    'That day or time can no longer be chosen. Please choose another.': '这个日子或时间已经不能选了，请换一个。',
    'That time has just filled up. Please choose another.': '这个时段刚刚满了，请换一个。',
    'Order received': '已收到订单',
    'Paid · being made': '已付款 · 制作中',
    'Ready for collection': '可以取货',
    'On its way': '送货中',
    'Done': '完成',
    'Order status: %s': '订单状态：%s',
    'Add to my calendar': '加入我的日历',
    'Collect order': '取订单',
    'Delivery of order': '送货：订单',
    'Ready': '可以取货',
    'Ready <span class="count">(%s)</span>': '可以取货 <span class="count">(%s)</span>',
    'Change status to Ready': '改成「可以取货」',
    'Collect / deliver': '取货 / 送货',
    'Receipt uploaded': '已上传收据',
    # owner page
    'Your festive shop plan includes up to %1$d items; %2$d are published. Ask your web studio before adding more.': '你的节日网店配套包括最多 %1$d 样产品，现在上架了 %2$d 样。要加更多，请先问帮你做网站的工作室。',
    'Festive orders': '节日订单',
    'Pre-orders are closed.': '预购已经截止。',
    'Pre-orders close %s.': '预购截止：%s。',
    'Change dates and times': '改日期和时段',
    'orders this season': '这一季的订单',
    'payments to check': '待确认付款',
    'paid, to make': '已付款，要做',
    'paid so far': '已收款',
    'No orders yet.': '还没有订单。',
    'Days': '日子',
    'What to make': '这天要做多少',
    'Item': '产品',
    'Paid': '已付款',
    'Payment to check': '待确认付款',
    'Nothing for this day yet.': '这天还没有订单。',
    'Print': '打印',
    'Orders': '订单',
    'Time': '时间',
    'Order': '订单',
    'Customer': '顾客',
    'Items': '产品',
    'Status': '状态',
    'See receipt': '看收据',
    'Payment received': '已收到付款',
    'No orders for this day yet.': '这天还没有订单。',
    'Asked to be told when you open again (%d)': '想在下次开放时收到通知（%d）',
    # receipts
    'That file could not be used. Please upload a JPG, PNG, WebP or PDF under 5 MB.': '这个文件不能用。请上传 5 MB 以内的 JPG、PNG、WebP 或 PDF。',
    'Receipt received. We will check it and email you when your payment is confirmed.': '收到收据了。我们确认付款后会发电邮给你。',
    'Upload a different receipt': '换一张收据',
    'Upload your payment receipt': '上传付款收据',
    '(screenshot or PDF, up to 5 MB)': '（截图或 PDF，5 MB 以内）',
    'Send receipt': '送出收据',
    'This link has expired. Please open your order again.': '这个连结已经过期，请重新打开你的订单。',
    'The customer uploaded a payment receipt. Check it, then mark the order "Processing" (payment received).': '顾客上传了付款收据。请核对，然后把订单改成「处理中」（已收到付款）。',
    'Payment receipt for order #%1$s – %2$s': '订单 #%1$s 的付款收据 – %2$s',
    '%1$s uploaded a payment receipt for %2$s.': '%1$s 上传了 %2$s 的付款收据。',
    'Check it in your bank app, then press "Payment received":': '请在银行 App 核对，然后按「已收到付款」：',
    'Receipt not found.': '找不到收据。',
    # festive settings
    'Festive pre-orders': '节日预购',
    'Festive pre-order season on': '开启节日预购',
    'Season name shown to customers (e.g. Chinese New Year 2027)': '给顾客看的节日名称（例如 2027 农历新年）',
    'Last day to order: YYYY-MM-DD (until 23:59) or YYYY-MM-DD HH:MM': '截止日：YYYY-MM-DD（到晚上 11:59），或 YYYY-MM-DD HH:MM',
    'First collection / delivery day (YYYY-MM-DD)': '第一天取货 / 送货（YYYY-MM-DD）',
    'Last collection / delivery day (YYYY-MM-DD)': '最后一天取货 / 送货（YYYY-MM-DD）',
    'Days off in between (YYYY-MM-DD, separated by commas)': '中间休息的日子（YYYY-MM-DD，用逗号分开）',
    'Self-collect times, one per line: time|orders per day (e.g. 10:00–13:00|6)': '自取时段，一行一个：时间|每天几单（例如 10:00–13:00|6）',
    'Delivery times, one per line: time|orders per day': '送货时段，一行一个：时间|每天几单',
    'Shipping zone for local delivery (its name contains this word)': '本地送货的运送区域（名字里有这个字）',
    'Note shown for courier orders (e.g. Posted by 3 Feb, arrives in 1–3 working days)': '快递订单的说明（例如：2 月 3 日前寄出，1–3 个工作天送到）',
    'Early-bird price until (YYYY-MM-DD, empty = none)': '早鸟价到哪一天（YYYY-MM-DD，空白 = 没有）',
    'Early-bird discount (%)': '早鸟折扣（%）',
    'Show how many are left (from your stock numbers)': '显示还剩几份（按库存数量）',
    'Say "Only X left" at or below': '剩下几份或更少时，显示「只剩 X 份」',
    'After the cut-off, ask for a WhatsApp number to tell them when you open again': '截止后，请顾客留 WhatsApp 号码，下次开放时通知',
    'Items included in the plan (a warning above this; 0 = no warning)': '配套包括几样产品（超过会提醒；0 = 不提醒）',
    'Allow test orders in demo mode (only DuitNow QR and the demo online payment; nothing is charged)': '示范模式也可以下测试订单（只有 DuitNow QR 和示范网上付款，不会收钱）',
}


def esc(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')


def unesc(s):
    return s.replace('\\"', '"').replace('\\\\', '\\')


pot = open(os.path.join(HERE, 'agency-core.pot'), encoding='utf-8').read()
head, *blocks = pot.split('\n\n')
out = [
    'msgid ""\nmsgstr ""\n"Project-Id-Version: Agency Core\\n"\n"Language: zh_CN\\n"\n"MIME-Version: 1.0\\n"\n'
    '"Content-Type: text/plain; charset=UTF-8\\n"\n"Content-Transfer-Encoding: 8bit\\n"\n"Plural-Forms: nplurals=1; plural=0;\\n"\n"X-Domain: agency-core\\n"'
]
done = 0
for b in blocks:
    m = re.search(r'^msgid "(.*)"$', b, re.M)
    if not m:
        continue
    mid = unesc(m.group(1))
    if mid not in ZH:
        continue
    lines = [l for l in b.split('\n') if l.startswith('#') or l.startswith('msgctxt') or l.startswith('msgid')]
    if 'msgid_plural' in b:
        lines.append('msgstr[0] "%s"' % esc(ZH[mid]))
    else:
        lines.append('msgstr "%s"' % esc(ZH[mid]))
    out.append('\n'.join(lines))
    done += 1
open(os.path.join(HERE, 'agency-core-zh_CN.po'), 'w', encoding='utf-8').write('\n\n'.join(out) + '\n')
print('translated', done, 'of', len(ZH))
