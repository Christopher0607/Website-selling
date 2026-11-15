#!/usr/bin/env python3
"""Client documents (2026-11-15): quotation, service agreement (draft), deposit invoice, receipt and content checklist,
as HTML + A4 PDF in clients/<code>/out/ (not in git: the repo is public). Prices come from site/studio.json.

Usage: python3 scripts/local/client-docs.py clients/c001-the-baking-trip/client.json
"""
import datetime as dt
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
E = html.escape


def rm(n):
    return 'RM' + ('{:,.2f}'.format(n) if n % 1 else '{:,.0f}'.format(n))


def load():
    cj = json.load(open(sys.argv[1], encoding='utf-8'))
    st = json.load(open(os.path.join(ROOT, 'site/studio.json'), encoding='utf-8'))
    return cj, st, {p['id']: p for p in st['packages'] + st.get('starts', []) if p.get('id')}


CSS = '''
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Manrope:wght@400;600;800&display=swap');
@page { size: A4; margin: 16mm 15mm 18mm; }
* { box-sizing: border-box; }
body { font-family: Manrope, system-ui, sans-serif; color: #1d1a17; font-size: 10.5pt; line-height: 1.5; margin: 0; }
h1 { font-family: Fraunces, Georgia, serif; font-size: 22pt; margin: 0 0 2mm; letter-spacing: -.01em; }
h2 { font-family: Fraunces, Georgia, serif; font-size: 13pt; margin: 7mm 0 2mm; }
.top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1d1a17; padding-bottom: 4mm; margin-bottom: 5mm; }
.brand { font-family: Fraunces, Georgia, serif; font-size: 15pt; font-weight: 600; }
.small, .meta { font-size: 8.8pt; color: #5b544d; }
.meta { text-align: right; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 4mm; }
.box { border: 1px solid #ddd5cb; border-radius: 3mm; padding: 4mm 5mm; break-inside: avoid; }
.opt { border: 1px solid #ddd5cb; border-radius: 3mm; padding: 4mm 5mm; margin: 0 0 3.5mm; break-inside: avoid; }
.opt.rec { border: 2px solid #9a5226; background: #fbf6f1; }
.opt h3 { margin: 0 0 1mm; font-size: 12pt; display: flex; justify-content: space-between; gap: 4mm; }
.opt h3 b { white-space: nowrap; }
.tag { display: inline-block; background: #9a5226; color: #fff; border-radius: 99px; padding: .5mm 3mm; font-size: 8pt; font-weight: 800; margin-left: 2mm; vertical-align: middle; }
ul { margin: 1.5mm 0 0; padding-left: 5mm; }
li { margin: .8mm 0; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
th, td { text-align: left; padding: 2mm 2.5mm; border-bottom: 1px solid #e6dfd6; vertical-align: top; }
th { font-size: 8.8pt; color: #5b544d; font-weight: 800; }
td.r, th.r { text-align: right; white-space: nowrap; }
tr.total td { font-weight: 800; border-top: 2px solid #1d1a17; border-bottom: 0; font-size: 11.5pt; }
.draft { background: #fff4d6; border-left: 4px solid #e0a526; padding: 2.5mm 4mm; border-radius: 2mm; font-size: 9pt; margin: 0 0 4mm; }
.steps { counter-reset: s; list-style: none; padding: 0; }
.steps li { counter-increment: s; padding-left: 8mm; position: relative; }
.steps li::before { content: counter(s); position: absolute; left: 0; top: 0; width: 5.5mm; height: 5.5mm; border-radius: 50%; background: #1d1a17; color: #fff; font-size: 8pt; font-weight: 800; display: grid; place-items: center; }
.line { display: inline-block; min-width: 45mm; border-bottom: 1px solid #1d1a17; }
.sign { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; margin-top: 10mm; }
.sign div { border-top: 1px solid #1d1a17; padding-top: 2mm; font-size: 9pt; }
.foot { margin-top: 8mm; font-size: 8.5pt; color: #5b544d; border-top: 1px solid #e6dfd6; padding-top: 3mm; }
.chk li { list-style: none; margin-left: -5mm; padding-left: 7mm; position: relative; }
.chk li::before { content: ""; position: absolute; left: 0; top: 1mm; width: 3.6mm; height: 3.6mm; border: 1.4px solid #1d1a17; border-radius: 1mm; }
.chk li.have::before { background: #1f7a4d; border-color: #1f7a4d; }
'''


def page(title, body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{E(title)}</title><style>{CSS}</style></head><body>{body}</body></html>'


def head(cj, kind, no, extra=''):
    s = cj['studio']
    return (f'<div class="top"><div><div class="brand">{E(s["name"])}</div><div class="small">{E(s["address"])}<br>SSM {E(s["ssm"])} · {E(s["web"])} · {E(s["email"])} · {E(s["phone"])}</div></div>'
            f'<div class="meta"><h1>{E(kind)}</h1>{E(no)}<br>Date: {E(cj["date"])}{extra}</div></div>')


def to_box(cj):
    c = cj['client']
    return f'<div class="box"><div class="small">For</div><b>{E(c["name"])}</b><br>{E(c["address"])}<br>{E(c["phone"])}</div>'


def feats(p, q):
    """A package's features for this client: drop the free-month line, apply the client's edits (substring → new text, or null to drop)."""
    out = []
    for x in p['features']:
        if x.startswith('First month'):
            continue
        for a, b in (q.get('feature_edits') or {}).items():
            if a in x:
                x = None if b is None else x.replace(a, b)
                if x is None:
                    break
        if x:
            out.append(x)
    return out


def meta(p, first):
    m = p['meta']
    return (m.split('·')[0].strip() + ' · live in 7 working days for our first 3 clients') if first and '·' in m else m


def care_text(st, first):
    basic = st['care']['plans'][0]['price']
    free = '2 months free (our first 3 clients)' if first else 'first month free'
    return basic, free


def quotation(cj, st, P):
    q = cj['quote']
    first = q.get('first_clients')
    valid = (dt.date.fromisoformat(cj['date']) + dt.timedelta(days=q['valid_days'])).isoformat()
    basic, free = care_text(st, first)
    g, s, m = P['growth'], P['starter'], P['monthly']
    hl = ''.join(f'<li>{E(x)}</li>' for x in q['highlights'])
    gx = ''.join(f'<li>{E(x)}</li>' for x in feats(g, q))
    body = head(cj, 'Quotation', q['no'], f'<br>Valid until: {valid}')
    body += f'<div class="cols">{to_box(cj)}<div class="box"><div class="small">What this is for</div>Your own online ordering website for <b>{E(cj["client"]["name"])}</b>, in the design you have already seen (private preview).</div></div>'
    body += f'<h2>What you get</h2><ul>{hl}</ul>'
    body += '<h2>Choose one</h2>'
    body += (f'<div class="opt rec"><h3><span>A. Growth <span class="tag">Recommended: exactly what you saw</span></span><b>{rm(g["price"])} one-time</b></h3>'
             f'<div class="small">{E(meta(g, first))}. Everything above, plus:</div><ul>{gx}</ul></div>')
    body += (f'<div class="opt"><h3><span>B. Starter</span><b>{rm(s["price"])} one-time</b></h3><div class="small">{E(s.get("founding", ""))}. {E(meta(s, first))}.</div>'
             f'<p style="margin:1.5mm 0 0">The basics: {E(q["starter_note"])}.</p></div>')
    body += (f'<div class="opt"><h3><span>C. Monthly plan</span><b>RM0 upfront · {rm(m["price"])} {E(m["unit"])}</b></h3>'
             f'<p style="margin:0">{E(" · ".join(m.get("short", m["features"])))}.</p></div>')
    body += (f'<h2>After launch: monthly maintenance</h2><p>{rm(basic)} a month (Basic): hosting, SSL, daily backups, monitoring, updates and small changes (30 minutes a month). '
             f'<b>{free}</b>; then optional, month to month. Not needed with the monthly plan (C), where it is included.</p>')
    if first:
        body += ('<h2>Our first 3 clients</h2><ul><li>50% deposit; the balance only when you are happy with the finished website</li>'
                 '<li>Live in 7 working days (from the deposit and your content), or RM50 off for each day we are late</li>'
                 '<li>2 months of maintenance free</li><li>In return: an honest review, and permission to show your website as an example (your sales figures stay private)</li></ul>')
    body += f'<h2>Not included</h2><p>{E(q["not_included"])}.</p>'
    body += ('<h2>Next steps</h2><ol class="steps"><li>Tell us which option you choose.</li><li>Sign the agreement and pay the 50% deposit.</li>'
             '<li>Send the content on our checklist (today’s prices, your photos, your DuitNow QR…).</li><li>Check the finished website on your phone; we change what you want.</li>'
             '<li>We go live on your domain and show you the shop dashboard; you pay the balance.</li></ol>')
    body += f'<div class="foot">Prices in Malaysian Ringgit. Preview: {E(cj["client"]["preview"])} · {E(cj["studio"]["name"])}</div>'
    return page(q['no'] + ' Quotation', body)


def invoice(cj, st, P):
    inv = cj['invoice']
    p = P[inv['package']]
    total = p['price']
    dep = round(total / 2, 2)
    s = cj['studio']
    body = head(cj, 'Invoice', inv['no'], f'<br>Quotation: {cj["quote"]["no"]}')
    body += f'<div class="cols">{to_box(cj)}<div class="box"><div class="small">Pay to</div><b>{E(s["account_name"])}</b><br>{E(s["bank"])} · {E(s["account_no"])}<br>Or DuitNow to the same account. Reference: {E(inv["no"])}</div></div>'
    body += ('<table><tr><th>Description</th><th class="r">Amount</th></tr>'
             f'<tr><td>{E(p["name"])} package — online ordering website for {E(cj["client"]["name"])} ({rm(total)})<br><span class="small">Deposit 50%, due on signing the agreement</span></td><td class="r">{rm(dep)}</td></tr>'
             f'<tr class="total"><td>Amount due</td><td class="r">{rm(dep)}</td></tr></table>')
    body += f'<p class="small">Balance {rm(total - dep)}: when you are happy with the finished website, before it goes live on your domain. We send a receipt for every payment.</p>'
    body += f'<div class="foot">{E(s["name"])} · SSM {E(s["ssm"])}. Not registered for SST.</div>'
    return page(inv['no'] + ' Invoice', body)


def receipt(cj, st, P):
    r = cj['receipt']
    amt = rm(r['amount']) if r.get('amount') else '<span class="line"></span>'
    body = head(cj, 'Receipt', r['no'])
    body += to_box(cj)
    body += (f'<table style="margin-top:6mm"><tr><th>Received</th><th class="r">Amount</th></tr><tr><td>{E(r["for"])}<br>'
             f'<span class="small">Paid on: {E(r["paid_on"]) or "<span class=line></span>"} · By: {E(r["method"]) or "<span class=line></span>"}</span></td><td class="r">{amt}</td></tr></table>')
    body += f'<div class="sign"><div>Received by, for {E(cj["studio"]["name"])}</div><div>Date</div></div>'
    body += f'<div class="foot">{E(cj["studio"]["name"])} · SSM {E(cj["studio"]["ssm"])}. Thank you.</div>'
    return page(r['no'] + ' Receipt', body)


CHECK = [
    (True, 'Your menu and descriptions (from the preview)'),
    (False, 'Today’s prices for every item, and which items to show (19 items still have no price)'),
    (False, 'Your own photos of the bakes, the counter and the house (or we take them with you)'),
    (False, 'Your registered business name and SSM number (for the terms, privacy notice and the .com.my domain)'),
    (False, 'The email for order notifications and your dashboard login'),
    (False, 'Your DuitNow QR (a screenshot from your bank app)'),
    (False, 'Online payment: sign up with a payment gateway in your business name (we help choose and fill in)'),
    (False, 'Your domain name, e.g. thebakingtrip.com.my (registered in your name; we set it up)'),
    (False, 'Collection rules: how many orders per time slot, holidays, how late customers can change or cancel'),
    (False, 'Christmas: items, prices, how many of each, the last day to order'),
    (False, 'Answers for the [brackets] in the collection & refunds page, privacy notice and terms'),
    (False, 'Staff who need their own dashboard login (name and email)'),
]


def checklist(cj, st, P):
    lis = ''.join(f'<li class="{"have" if h else ""}">{E(t)}{" — we have this" if h else ""}</li>' for h, t in CHECK)
    body = head(cj, 'Checklist', cj['code'])
    body += f'<p>To launch <b>{E(cj["client"]["name"])}</b>’s website, please send these on WhatsApp or email. The 7-working-day timeline starts when we have them.</p>'
    body += f'<ul class="chk">{lis}</ul>'
    body += ('<h2>Payment gateway: what to expect</h2><p class="small">Prices from the providers’ websites on 2026-11-15; check again when you sign up.</p>'
             '<table><tr><th>Way to pay</th><th>Fee</th><th>Notes</th></tr>'
             '<tr><td>DuitNow QR to your bank (already in the website)</td><td>No gateway fee</td><td>Customer uploads the receipt; you tap “payment received”</td></tr>'
             '<tr><td>Billplz (Basic plan)</td><td>FPX RM1.25 · cards 1.8% · DuitNow / e-wallets 1.5%</td><td>No monthly fee on Basic; FPX paid out next business day</td></tr>'
             '<tr><td>HitPay</td><td>FPX 1.8% + RM0.40 · DuitNow 1.2% · cards 1.2% + RM1</td><td>No monthly fee; WooCommerce plugin adds 0.2%</td></tr>'
             '<tr><td>toyyibPay</td><td>FPX about RM1 per payment</td><td>Check their current rates when signing up</td></tr></table>')
    body += f'<div class="foot">{E(cj["studio"]["name"])} · {E(cj["studio"]["web"])}</div>'
    return page('Checklist ' + cj['code'], body)


def agreement(cj, st, P):
    a, q = cj['agreement'], cj['quote']
    p = P[q['recommended']]
    total = p['price']
    basic, free = care_text(st, q.get('first_clients'))
    s, c = cj['studio'], cj['client']
    care = '<table><tr><th></th>' + ''.join(f'<th>{E(x["name"])} ({rm(x["price"])}/month)</th>' for x in st['care']['plans']) + '</tr>' + ''.join(
        '<tr>' + ''.join(f'<td>{E(v)}</td>' for v in row) + '</tr>' for row in st['care']['rows']) + '</table>'
    vals = {
        'agreement_no': a['no'], 'date': cj['date'], 'studio_name': s['name'], 'studio_ssm': s['ssm'], 'studio_address': s['address'],
        'client_legal': c['legal'], 'client_ssm': c['ssm'], 'client_name': c['name'], 'client_address': c['address'],
        'package_name': p['name'], 'quote_no': q['no'], 'timeline_days': str(a['timeline_days']),
        'guarantee_clause': 'If we are late for reasons on our side, we take RM50 off the balance for each working day late.' if q.get('first_clients') else '',
        'price': rm(total), 'price_note': 'one-time', 'deposit': rm(total / 2), 'balance': rm(total / 2),
        'balance_when': 'when you confirm you are happy with the finished website, before it goes live on your domain' if q.get('first_clients') else 'before the website goes live on your domain',
        'maintenance_line': f'Basic maintenance is {rm(basic)} a month, {free}.',
        'studio_signatory': s['signatory'],
        'scope_list': '<ul>' + ''.join(f'<li>{E(x)}</li>' for x in q['highlights']) + ''.join(f'<li>{E(x)}</li>' for x in feats(p, q)) + '</ul>',
        'not_included': E(q['not_included']) + '.',
        'checklist_short': '<ul>' + ''.join(f'<li>{E(t)}</li>' for h, t in CHECK if not h) + '</ul>',
        'care_table': care,
    }
    md = open(os.path.join(ROOT, 'templates/service-agreement.md'), encoding='utf-8').read()
    out = []
    for blk in re.split(r'\n\s*\n', md.strip()):
        blk = blk.strip()
        if blk.startswith('# '):
            out.append(f'<h1 style="font-size:18pt">{E(blk[2:])}</h1>')
        elif blk.startswith('## '):
            out.append(f'<h2>{E(blk[3:])}</h2>')
        elif blk.startswith('- '):
            out.append('<ul>' + ''.join(f'<li>{x[2:]}</li>' for x in blk.split('\n')) + '</ul>')
        elif blk.startswith('DRAFT'):
            out.append(f'<p class="draft">{blk}</p>')
        else:
            out.append(f'<p>{blk}</p>')
    h = '\n'.join(out)
    h = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', h)
    raw = {'scope_list', 'checklist_short', 'care_table', 'not_included'}
    h = re.sub(r'\{\{(\w+)\}\}', lambda m: vals[m.group(1)] if m.group(1) in raw else E(vals[m.group(1)]), h)
    h = h.replace('<p><ul>', '<ul>').replace('</ul></p>', '</ul>').replace('<p><table>', '<table>').replace('</table></p>', '</table>')
    return page(a['no'] + ' Agreement', h)


def main():
    cj, st, P = load()
    out = os.path.join(ROOT, 'clients', cj['code'], 'out')
    os.makedirs(out, exist_ok=True)
    docs = [('1-quotation', quotation), ('2-agreement-DRAFT', agreement), ('3-deposit-invoice', invoice), ('4-receipt', receipt), ('5-checklist', checklist)]
    files = []
    for name, fn in docs:
        f = os.path.join(out, f'{cj["code"]}-{name}.html')
        open(f, 'w', encoding='utf-8').write(fn(cj, st, P))
        files.append(f)
    subprocess.run(['node', os.path.join(ROOT, 'scripts/local/html-to-pdf.js')] + files, check=True)
    print('\n'.join(x.replace('.html', '.pdf') for x in files))


if __name__ == '__main__':
    main()
