#!/usr/bin/env python3
"""
build.py — 产生 Cartsmith Studio 的静态网站（Netlify 用）

    python3 build.py            # 输出到 dist/

只用 Python 标准库，Netlify 的 build 环境可以直接跑。
内容来源：
  studio.json                  工作室资料（名字、Instagram、价格、FAQ）
  pages/*.html                 工作室各页面的内容（第一行是 title / description）
  templates/<代号>/template.json  6 个网店模板（品牌、颜色、产品、首页区块）
  templates/<代号>/theme.css      该模板的样式
  templates/<代号>/img/           该模板的照片（fetch-stock-images.py 产生）
  assets/                       共用 CSS / JS / 图片 / 截图
  ../sales/agent/knowledge.md   AI 客服的知识库 → netlify/functions/chat/knowledge.mjs
"""
import html
import json
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, "dist")
YEAR = "2026"
ORDER = ["dewlane", "plainfold", "chili-pantry", "lowlight", "tailmate", "voltnest"]


def e(s):
    return html.escape(str(s), quote=True)


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write(rel, content, dist=None):
    path = os.path.join(dist or DIST, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def rm(n):
    return "RM{:,.2f}".format(n)


def rm0(n):
    return "RM{:,.0f}".format(n) if float(n).is_integer() else rm(n)


# --------------------------------------------------------------------------
# Icons (inline SVG sprite, 24px stroke icons drawn for this project)
# --------------------------------------------------------------------------
ICONS = {
    "bag": '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    "menu": '<path d="M4 7h16M4 12h16M4 17h16"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    "x": '<path d="M6 6l12 12M18 6 6 18"/>',
    "truck": '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    "shield": '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    "return": '<path d="M4 10h11a5 5 0 0 1 0 10h-3"/><path d="m8 6-4 4 4 4"/>',
    "chat": '<path d="M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-3 2.5Z"/>',
    "leaf": '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6 9-8"/>',
    "spark": '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    "check": '<path d="m5 12.5 4.5 4.5L19 7"/>',
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "gift": '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13"/><path d="M12 7c-3 0-4.5-1-4.5-2.5S9 2.5 12 7c3-4.5 4.5-4 4.5-2.5S15 7 12 7Z"/>',
    "bolt": '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>',
    "paw": '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17c0-3 2-5 4-5s4 2 4 5c0 2-2 2.5-4 2.5S8 19 8 17Z"/>',
    "cup": '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3"/>',
    "drop": '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
    "sun": '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
    "box": '<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
    "tag": '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    "flame": '<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-2 4-2 4s-1-1-2-3c-2 3-4 5.5-4 9a6 6 0 0 0 6 6Z"/>',
    "ruler": '<path d="m3 16 13-13 5 5-13 13-5-5Z"/><path d="m7 12 2 2M10 9l2 2M13 6l2 2"/>',
    "ig": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "minus": '<path d="M5 12h14"/>',
    "star": '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
    "card": '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    "phone": '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    "layout": '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9h17M10 9v11"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6.5 8-6.5s8 2.5 8 6.5"/>',
    "map": '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/>',
    "wrench": '<path d="M14.5 6.5a4 4 0 0 0 5 5L12 19l-3 1 1-3 7.5-7.5"/><path d="M14.5 6.5 17 4a4 4 0 0 1 3 3l-2.5 2.5"/>',
}


def sprite():
    out = ['<svg width="0" height="0" style="position:absolute" aria-hidden="true">']
    for k, v in ICONS.items():
        out.append(f'<symbol id="i-{k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{v}</symbol>')
    out.append("</svg>")
    return "".join(out)


def icon(name, cls="i"):
    return f'<svg class="{cls}" aria-hidden="true"><use href="#i-{name}"/></svg>'


# --------------------------------------------------------------------------
# Store templates
# --------------------------------------------------------------------------
STATES = ["Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Melaka", "Negeri Sembilan", "Pahang",
          "Penang", "Perak", "Perlis", "Putrajaya", "Sabah", "Sarawak", "Selangor", "Terengganu"]


class Store:
    def __init__(self, slug, studio, preview=None):
        self.slug = slug
        self.dir = os.path.join(HERE, "templates", slug)
        self.t = load_json(os.path.join(self.dir, "template.json"))
        self.studio = studio
        self.pv = preview
        self.base = "" if preview else f"demo/{slug}"
        self.out = preview["_out"] if preview else DIST
        if preview:
            apply_preview(self.t, preview)
        t = self.t
        self.ship = t.get("shipping", {"west": 8, "east": 15, "free_min": 150})
        # mockups for food / made-to-order shops: pick-up or local delivery on a chosen date instead of parcel shipping
        o = preview.get("order") if preview else None
        self.pickup = o if isinstance(o, dict) and o.get("mode") == "pickup" and o.get("pickup") else None
        self.cats = {c["id"]: c for c in t["categories"]}
        self.products = t["products"]
        for p in self.products:
            norm = []
            for o in p.get("options", []):
                vals = [v if isinstance(v, dict) else {"v": v} for v in o["values"]]
                norm.append({"name": o["name"], "values": vals, "style": o.get("style", "")})
            p["options"] = norm
        self.by_id = {p["id"]: p for p in self.products}

    # ---- helpers -------------------------------------------------------
    def studio_link(self, root, path):
        return (self.studio.get("site_url", "").rstrip("/") + "/" + path) if self.pv else root + path

    def price_html(self, p):
        base = p["price"]
        if base is None:  # mockups: price not published → never invent one
            return '<span class="ask">Ask for price</span>'
        sale = p.get("sale")
        has_from = any(v.get("add") for o in p["options"] for v in o["values"])
        pre = '<span class="from">from </span>' if has_from else ""
        per = f' <span class="per">/ {e(p["per"])}</span>' if p.get("per") else ""  # mockups: e.g. "/ 100 pcs"
        if sale:
            return f'{pre}<span class="now">{rm(sale)}</span>{per} <s class="was">{rm(base)}</s>'
        return f'{pre}<span class="now">{rm(base)}</span>{per}'

    def badge(self, p):
        b = p.get("badge")
        if not b and p.get("sale") and p.get("price") is not None:
            b = "Save " + rm0(p["price"] - p["sale"])
        return f'<span class="badge">{e(b)}</span>' if b else ""

    def card(self, p, sp=""):
        imgs = p["imgs"]
        alt = f'<img class="card__alt" src="{sp}img/{imgs[1]}" alt="" loading="lazy" width="600" height="600">' if len(imgs) > 1 else ""
        cat = self.cats.get(p["cat"], {}).get("name", "")
        url = f'{sp}p/{p["id"]}.html'
        extra = ""
        if p.get("specs_short"):
            extra += f'<p class="card__specs">{e(p["specs_short"])}</p>'
        if p.get("roast"):
            extra += self.roast_meter(p["roast"], small=True)
        if p.get("notes"):
            extra += f'<p class="card__notes">{e(" · ".join(p["notes"]))}</p>'
        sw = ""
        for o in p["options"]:
            if o["style"] == "swatch":
                dots = "".join(f'<span class="dot" style="--sw:{e(v.get("hex", "#ccc"))}" title="{e(v["v"])}"></span>' for v in o["values"])
                sw = f'<p class="card__swatches">{dots}</p>'
        if p["price"] is None:
            btn = f'<a class="btn btn--sm btn--ghost card__add" href="{url}">Ask for price</a>'
        elif p["options"]:
            btn = f'<a class="btn btn--sm card__add" href="{url}">Choose options</a>'
        else:
            btn = f'<button class="btn btn--sm card__add" type="button" data-add="{e(p["id"])}">Add to cart</button>'
        return (
            f'<article class="card" data-cat="{e(p["cat"])}" data-price="{p.get("sale") or p["price"] or 0}">'
            f'<a class="card__media" href="{url}" tabindex="-1">'
            f'<img src="{sp}img/{imgs[0]}" alt="{e(p["name"])}" loading="lazy" width="600" height="600">{alt}{self.badge(p)}</a>'
            f'<div class="card__body"><p class="card__cat">{e(cat)}</p>'
            f'<h3 class="card__title"><a href="{url}">{e(p["name"])}</a></h3>{extra}{sw}'
            f'<p class="price">{self.price_html(p)}</p>{btn}</div></article>'
        )

    def roast_meter(self, n, small=False):
        dots = "".join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(5))
        label = ["Light", "Light-medium", "Medium", "Medium-dark", "Dark"][max(0, min(4, n - 1))]
        return f'<p class="roast{" roast--sm" if small else ""}"><span class="roast__label">Roast</span><span class="roast__dots">{dots}</span><span class="roast__name">{label}</span></p>'

    def pick(self, sel):
        """sel: {"ids": [...]} or {"tag": "featured"} or {"cat": "x"}; limit"""
        if "ids" in sel:
            items = [self.by_id[i] for i in sel["ids"]]
        elif "tag" in sel:
            items = [p for p in self.products if sel["tag"] in p.get("tags", [])]
        elif "cat" in sel:
            items = [p for p in self.products if p["cat"] == sel["cat"]]
        else:
            items = list(self.products)
        return items[: sel.get("limit", 8)]

    # ---- layout --------------------------------------------------------
    def head(self, title, root, sp, kind, desc=""):
        t = self.t
        fonts = t.get("fonts")
        font_link = (
            '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
            f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fonts}&amp;display=swap">' if fonts else ""
        )
        fav = t.get("favicon", t["name"][0])
        favsvg = ("data:image/svg+xml," + re.sub(r"\s+", " ", f"""<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='{t["fav_bg"]}'/><text x='32' y='44' font-family='Arial' font-weight='700' font-size='34' text-anchor='middle' fill='{t["fav_fg"]}'>{fav}</text></svg>""")).replace("#", "%23")
        return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc or t['tagline'])}">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="{e(t['fav_bg'])}">
<link rel="icon" href="{favsvg}">
{font_link}
<link rel="stylesheet" href="{root}assets/css/store.css">
<link rel="stylesheet" href="{sp}theme.css">
<script src="{sp}data.js" defer></script>
<script src="{root}assets/js/store.js" defer></script>
</head>
<body class="store t-{self.slug} page-{kind}" data-sroot="{sp}" data-root="{root}">
{sprite()}
<a class="skip" href="#main">Skip to content</a>
{self.demo_bar(root)}
"""

    def demo_bar(self, root):
        if self.pv:
            pv = self.pv
            gate = ""
            if pv.get("_hash"):
                gate = ("<script>(function(){var H='" + pv["_hash"] + "';try{if(localStorage.getItem('pv_'+H)==='1')return;}catch(e){}"
                        "document.documentElement.classList.add('pv-locked');window.__pvHash=H;})();</script>")
            return (f'{gate}<div class="demo-bar demo-bar--pv"><div class="wrap demo-bar__in"><span class="demo-bar__txt"><b>Private mockup</b> for {e(pv["brand"]["name"])} · made by Cartsmith Studio · '
                    f'not a live store{" · photos are placeholders" if pv.get("photos") == "placeholder" else ""} · will be deleted by {e(pv["delete_by"])}</span>'
                    f'<span class="demo-bar__short">Private mockup{" · photos &amp; details are examples" if pv.get("photos") == "placeholder" else ""}</span><span class="demo-bar__links"><a class="demo-bar__cta" href="{e(self.studio_link(root, "index.html"))}">Cartsmith Studio {icon("arrow")}</a></span></div></div>')
        return (f'<div class="demo-bar"><div class="wrap demo-bar__in"><span class="demo-bar__txt"><b>Concept demo</b> · fictional brand by Cartsmith Studio · no real orders or payments</span>'
                f'<span class="demo-bar__links"><a href="{root}templates.html">All templates</a><a class="demo-bar__cta" href="{root}start.html?template={self.slug}">Use this template {icon("arrow")}</a></span></div></div>')

    def header(self, root, sp):
        t = self.t
        msgs = t.get("announcement", [])
        ann = ""
        if msgs:
            ann = f'<div class="announce" data-msgs="{e(json.dumps(msgs))}"><div class="wrap"><p data-announce>{e(msgs[0])}</p></div></div>'
        nav = [(f"{sp}shop.html", "Shop all")]
        for c in t["categories"]:
            if c.get("nav", True):
                nav.append((f'{sp}shop.html?cat={c["id"]}', c["name"]))
        nav += [(f"{sp}about.html", t.get("about_nav", "Our story"))]
        links = "".join(f'<a href="{u}">{e(n)}</a>' for u, n in nav)
        help_lbl = "Help &amp; pick-up" if self.pickup else "Help &amp; shipping"
        mlinks = links + f'<a href="{sp}help.html">{help_lbl}</a>'
        logo = self.logo(sp)
        return f"""{ann}
<header class="hdr hdr--{t.get('header', 'left')}">
  <div class="wrap hdr__in">
    <button class="icon-btn hdr__menu" type="button" aria-label="Menu" data-open="mnav">{icon('menu')}</button>
    {logo}
    <nav class="hdr__nav" aria-label="Main">{links}</nav>
    <div class="hdr__icons">
      <a class="icon-btn" href="{sp}shop.html" aria-label="Search products">{icon('search')}</a>
      <button class="icon-btn cart-btn" type="button" aria-label="Open cart" data-open="cart">{icon('bag')}<span class="cart-count" data-cart-count>0</span></button>
    </div>
  </div>
</header>
<div class="drawer drawer--left" id="mnav" aria-hidden="true"><div class="drawer__scrim" data-close></div>
  <aside class="drawer__panel" aria-label="Menu"><div class="drawer__head">{logo}<button class="icon-btn" type="button" aria-label="Close" data-close>{icon('x')}</button></div>
  <nav class="mnav">{mlinks}</nav>
  <p class="mnav__note">{e(t.get('mnav_note', 'Questions? Tap the chat button.'))}</p></aside></div>
<main id="main">
"""

    def logo(self, sp):
        lg = self.t["logo"]
        mark = f'<span class="logo__mark">{lg["mark"]}</span>' if lg.get("mark") else ""
        return f'<a class="logo" href="{sp}index.html">{mark}<span class="logo__txt">{e(lg["text"])}</span></a>'

    SOCIAL = {
        "instagram": ("ig", "Instagram", "Your Instagram link goes here."),
        "tiktok": ("", "TikTok", "Your TikTok link goes here."),
        "shopee": ("", "Shopee", "Your Shopee shop link goes here."),
        "whatsapp": ("phone", "WhatsApp", "Your WhatsApp link goes here."),
        "facebook": ("", "Facebook", "Your Facebook page goes here."),
        "grabfood": ("", "GrabFood", "Your GrabFood link goes here."),
        "foodpanda": ("", "foodpanda", "Your foodpanda link goes here."),
    }

    def social_links(self):
        # mockups can list only the channels the business really uses ("social": ["instagram", "whatsapp"])
        keys = self.pv.get("social") if self.pv and isinstance(self.pv.get("social"), list) else ["instagram", "tiktok", "shopee"]
        links = "".join(f'<a href="#" data-demo="{e(d)}">{icon(i) + " " if i else ""}{e(n)}</a>' for k in keys if k in self.SOCIAL for i, n, d in [self.SOCIAL[k]])
        return f'<p class="ftr__social">{links}</p>' if links else ""

    def footer(self, root, sp):
        t = self.t
        shop = "".join(f'<li><a href="{sp}shop.html?cat={c["id"]}">{e(c["name"])}</a></li>' for c in t["categories"])
        pk = self.pickup
        ship_lbl = "Pick-up &amp; delivery" if pk else "Shipping"
        ret_lbl = "Changes &amp; refunds" if pk else "Returns &amp; exchanges"
        drawer_note = (f"Pick-up in {e(pk['pickup'])}" + (f" or delivery by {e(pk['delivery'])}" if pk.get("delivery") else "") + " — choose at checkout.") if pk else "Shipping is calculated at checkout."
        return f"""</main>
<footer class="ftr">
  <div class="wrap ftr__grid">
    <div class="ftr__brand">{self.logo(sp)}<p>{e(t['footer_blurb'])}</p>
      {self.social_links()}</div>
    <div><h4>Shop</h4><ul><li><a href="{sp}shop.html">Shop all</a></li>{shop}</ul></div>
    <div><h4>Help</h4><ul><li><a href="{sp}help.html#faq">FAQ</a></li><li><a href="{sp}help.html#shipping">{ship_lbl}</a></li><li><a href="{sp}help.html#returns">{ret_lbl}</a></li><li><a href="{sp}about.html">{e(t.get('about_nav', 'Our story'))}</a></li></ul></div>
    <div><h4>{e(t.get('newsletter_title', 'Get first dibs'))}</h4><p>{e(t.get('newsletter_text', 'New drops and restocks, once or twice a month.'))}</p>
      <form class="nl" data-demo-form><label class="sr" for="nl-email">Email</label><input id="nl-email" type="email" placeholder="Email address" required><button class="btn btn--sm" type="submit">Sign up</button></form></div>
  </div>
  <div class="wrap ftr__bottom"><span>{self.footer_note(root)}</span>
  <span class="ftr__pay">{icon('card')} FPX · Cards · E-wallets</span></div>
</footer>
<div class="drawer" id="cart" aria-hidden="true"><div class="drawer__scrim" data-close></div>
  <aside class="drawer__panel" role="dialog" aria-label="Cart">
    <div class="drawer__head"><h2>Your cart</h2><button class="icon-btn" type="button" aria-label="Close cart" data-close>{icon('x')}</button></div>
    <div class="shipbar" data-shipbar></div>
    <div class="drawer__body" data-cart-lines></div>
    <div class="drawer__foot" data-cart-foot>
      <p class="row"><span>Subtotal</span><strong data-cart-subtotal>RM0.00</strong></p>
      <p class="muted small">{drawer_note}</p>
      <a class="btn btn--block" href="{sp}checkout.html">Checkout</a>
      <a class="btn btn--ghost btn--block" href="{sp}cart.html">View cart</a>
    </div>
  </aside></div>
<button class="chat-fab" type="button" aria-label="Chat" data-demo="In your store this button opens a chat with you on WhatsApp or Instagram — with the product name already filled in.">{icon('chat')}<span>Chat</span></button>
<div class="toast" role="status" aria-live="polite" data-toast></div>
{self.gate_html()}
</body>
</html>
"""

    def footer_note(self, root):
        if self.pv:
            return (f"© {YEAR} {e(self.t['name'])}. Private homepage mockup prepared by "
                    f'<a href="{e(self.studio_link(root, "index.html"))}">Cartsmith Studio</a> from public shop information — not a live store.')
        return (f"© {YEAR} {e(self.t['name'])} — a fictional brand. Concept store designed by "
                f'<a href="{root}index.html">Cartsmith Studio</a>. Photos: Pexels.')

    def gate_html(self):
        if not (self.pv and self.pv.get("_hash")):
            return ""
        return """<div class="pv-gate" id="pv-gate"><form><p class="pv-gate__t">Private mockup</p><p>Enter the password Cartsmith sent you.</p>
<input type="password" autocomplete="off" aria-label="Password" required><button class="btn btn--block" type="submit">Open</button><p class="pv-gate__err" hidden>Wrong password.</p></form></div>
<script>(function(){var g=document.getElementById('pv-gate');if(!document.documentElement.classList.contains('pv-locked')){g.remove();return;}
var f=g.querySelector('form');f.addEventListener('submit',function(ev){ev.preventDefault();var v=f.querySelector('input').value;
crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)).then(function(b){var h=Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');
if(h===window.__pvHash){try{localStorage.setItem('pv_'+h,'1');}catch(e){}document.documentElement.classList.remove('pv-locked');g.remove();}else{f.querySelector('.pv-gate__err').hidden=false;}});});})();</script>"""

    def page(self, rel, title, body, kind, desc=""):
        depth = rel.count("/")  # demo/<slug>/x.html → 2 ; demo/<slug>/p/x.html → 3 ; preview: x.html → 0
        base_depth = self.base.count("/") + 1 if self.base else 0
        root = "../" * depth
        sp = "../" * (depth - base_depth)
        html_ = self.head(title, root, sp, kind, desc) + self.header(root, sp) + body(root, sp) + self.footer(root, sp)
        write(rel, html_, self.out)

    # ---- home sections -------------------------------------------------
    def sec_head(self, s, sp, link=None):
        eyebrow = f'<p class="eyebrow">{e(s["eyebrow"])}</p>' if s.get("eyebrow") else ""
        sub = f'<p class="sec__sub">{e(s["text"])}</p>' if s.get("text") else ""
        title = f'<h2>{e(s["title"])}</h2>' if s.get("title") else ""
        lnk = f'<a class="link-arrow" href="{sp}{link[0]}">{e(link[1])} {icon("arrow")}</a>' if link else ""
        if not (eyebrow or title or sub):
            return ""
        return f'<div class="sec__head"><div>{eyebrow}{title}{sub}</div>{lnk}</div>'

    def btns(self, s, sp):
        out = ""
        for i, b in enumerate(s.get("buttons", [])):
            cls = "btn btn--lg" if i == 0 else "btn btn--lg btn--ghost"
            href = b["href"]
            attr = ""
            if href.startswith("demo:"):
                attr = f' data-demo="{e(href[5:])}"'
                href = "#"
            elif not href.startswith(("http", "#")):
                href = sp + href
            out += f'<a class="{cls}" href="{e(href)}"{attr}>{e(b["label"])}</a>'
        return f'<div class="btns">{out}</div>' if out else ""

    def section(self, s, sp):
        out = self._section(s, sp)
        if s.get("id"):
            out = out.replace("<section", f'<section id="{e(s["id"])}"', 1)
        return out

    def _section(self, s, sp):
        typ = s["type"]
        cls = f'sec sec--{typ} {s.get("class", "")}'.strip()
        if typ == "hero":
            chips = "".join(f'<li>{icon(c[0])}{e(c[1])}</li>' for c in s.get("chips", []))
            chips = f'<ul class="hero__chips">{chips}</ul>' if chips else ""
            img = s.get("img", "hero.jpg")
            pos = f' style="object-position:{e(s["pos"])}"' if s.get("pos") else ""
            sticker = f'<span class="hero__sticker">{s["sticker"]}</span>' if s.get("sticker") else ""
            return f"""<section class="hero hero--{s.get('layout', 'split')} {s.get('class', '')}">
  <div class="hero__media"><img src="{sp}img/{img}" alt="{e(s.get('alt', ''))}" fetchpriority="high" width="1920" height="1080"{pos}>{sticker}</div>
  <div class="hero__content"><div class="hero__inner">
    {f'<p class="eyebrow">{e(s["eyebrow"])}</p>' if s.get('eyebrow') else ''}
    <h1>{s['title']}</h1>
    <p class="hero__lead">{e(s['text'])}</p>
    {self.btns(s, sp)}{chips}
  </div></div>
</section>"""
        if typ == "trust":
            items = "".join(f'<li>{icon(i[0])}<div><strong>{e(i[1])}</strong><span>{e(i[2])}</span></div></li>' for i in s["items"])
            return f'<section class="{cls}"><div class="wrap"><ul class="trust">{items}</ul></div></section>'
        if typ == "marquee":
            txt = "".join(f"<span>{e(x)}</span>" for x in s["items"]) * 4
            return f'<section class="{cls}" aria-label="Highlights"><div class="marquee"><div class="marquee__track">{txt}</div></div></section>'
        if typ == "categories":
            layout = s.get("layout", "tiles")
            ids = s.get("ids") or [c["id"] for c in self.t["categories"]]
            items = ""
            for cid in ids:
                c = self.cats[cid]
                n = len([p for p in self.products if p["cat"] == cid])
                items += (f'<a class="cat" href="{sp}shop.html?cat={cid}"><span class="cat__img"><img src="{sp}img/{c["img"]}" alt="" loading="lazy" width="600" height="600"></span>'
                          f'<span class="cat__txt"><strong>{e(c["name"])}</strong><small>{e(c.get("blurb", f"{n} product" + ("" if n == 1 else "s")))}</small></span></a>')
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp)}<div class="cats cats--{layout} cats--n{len(ids)}">{items}</div></div></section>'
        if typ == "products":
            items = self.pick(s.get("pick", {}))
            grid = "".join(self.card(p, sp) for p in items)
            link = ("shop.html", s.get("link", "Shop all"))
            layout = s.get("layout", "grid")
            # phones: a swipeable row instead of a tall 2-column stack ("mobile": "grid" keeps the stack)
            rail = " grid--rail" if s.get("mobile", "rail") == "rail" and len(items) > 2 else ""
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp, link)}<div class="grid grid--{s.get("cols", 4)} grid--{layout}{rail}">{grid}</div></div></section>'
        if typ == "split":
            bullets = "".join(f"<li>{icon('check')}{e(b)}</li>" for b in s.get("bullets", []))
            bullets = f'<ul class="ticks">{bullets}</ul>' if bullets else ""
            paras = "".join(f"<p>{e(p)}</p>" for p in s.get("paras", []))
            return f"""<section class="{cls}{' split--rev' if s.get('reverse') else ''}"><div class="wrap split">
  <div class="split__media"><img src="{sp}img/{s['img']}" alt="{e(s.get('alt', ''))}" loading="lazy" width="1200" height="1500"></div>
  <div class="split__txt">{f'<p class="eyebrow">{e(s["eyebrow"])}</p>' if s.get('eyebrow') else ''}<h2>{e(s['title'])}</h2>{paras}{bullets}{self.btns(s, sp)}</div>
</div></section>"""
        if typ == "steps":
            items = ""
            for i, st in enumerate(s["items"]):
                link = ""
                if st.get("product"):
                    p = self.by_id[st["product"]]
                    link = f'<a class="step__prod" href="{sp}p/{p["id"]}.html"><img src="{sp}img/{p["imgs"][0]}" alt="" loading="lazy" width="120" height="120"><span>{e(p["name"])}<b>{rm(p.get("sale") or p["price"]) if p["price"] is not None else "Ask for price"}</b></span></a>'
                items += f'<li class="step"><span class="step__n">{st.get("n", i + 1)}</span><h3>{e(st["title"])}</h3><p>{e(st["text"])}</p>{link}</li>'
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp)}<ol class="steps steps--n{len(s["items"])}">{items}</ol></div></section>'
        if typ == "features":
            items = "".join(f'<li class="feat">{icon(f[0])}<h3>{e(f[1])}</h3><p>{e(f[2])}</p></li>' for f in s["items"])
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp)}<ul class="feats feats--n{len(s["items"])}">{items}</ul></div></section>'
        if typ == "band":
            img = f'<img src="{sp}img/{s["img"]}" alt="" loading="lazy" width="1920" height="1080">' if s.get("img") else ""
            return f"""<section class="{cls}"><div class="band{' band--img' if img else ''}">{img}<div class="wrap band__in"><div class="band__txt">
  {f'<p class="eyebrow">{e(s["eyebrow"])}</p>' if s.get('eyebrow') else ''}<h2>{e(s['title'])}</h2><p>{e(s.get('text', ''))}</p>{self.btns(s, sp)}</div></div></div></section>"""
        if typ == "statement":
            by = '<p class="statement__by">' + e(s["by"]) + "</p>" if s.get("by") else ""
            return f'<section class="{cls}"><div class="wrap"><p class="statement">{e(s["text"])}</p>{by}</div></section>'
        if typ == "table":
            head = "".join(f"<th>{e(h)}</th>" for h in s["head"])
            rows = "".join("<tr>" + "".join((f"<th scope=row>{e(c)}</th>" if j == 0 else f"<td>{e(c)}</td>") for j, c in enumerate(r)) + "</tr>" for r in s["rows"])
            note = f'<p class="muted small">{e(s["note"])}</p>' if s.get("note") else ""
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp)}<div class="tbl-wrap"><table class="tbl"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>{note}</div></section>'
        if typ == "faq":
            items = "".join(f'<details class="qa"><summary>{e(q)}{icon("plus")}</summary><p>{e(a)}</p></details>' for q, a in self.t["faq"][: s.get("limit", 6)])
            return f'<section class="{cls}"><div class="wrap wrap--narrow">{self.sec_head(s, sp, ("help.html#faq", "All questions"))}<div class="qas">{items}</div></div></section>'
        if typ == "gallery":
            imgs = "".join(f'<figure><img src="{sp}img/{g[0]}" alt="" loading="lazy" width="1200" height="1500"><figcaption>{e(g[1])}</figcaption></figure>' for g in s["items"])
            return f'<section class="{cls}"><div class="wrap">{self.sec_head(s, sp)}<div class="gallery-row gallery-row--n{len(s["items"])}">{imgs}</div></div></section>'
        if typ == "newsletter":
            return f"""<section class="{cls}"><div class="wrap"><div class="nlbox"><div><h2>{e(s['title'])}</h2><p>{e(s.get('text', ''))}</p></div>
  <form class="nl nl--lg" data-demo-form><label class="sr" for="nl2">Email</label><input id="nl2" type="email" placeholder="Email address" required><button class="btn" type="submit">{e(s.get('button', 'Sign up'))}</button></form></div></div></section>"""
        raise ValueError(f"unknown section type {typ}")

    # ---- pages ---------------------------------------------------------
    def build(self):
        t = self.t
        base = self.base
        pre = base + "/" if base else ""
        # images + theme
        dst_img = os.path.join(self.out, base, "img")
        shutil.copytree(os.path.join(self.dir, "img"), dst_img, dirs_exist_ok=True)
        theme = open(os.path.join(self.dir, "theme.css"), encoding="utf-8").read()
        if self.pv:
            shutil.copytree(self.pv["_img"], dst_img, dirs_exist_ok=True)
            theme += preview_css(self.pv, theme)
        write(f"{pre}theme.css", theme, self.out)
        # data.js
        data = {
            "slug": self.slug, "name": t["name"], "prefix": t.get("order_prefix", t["name"][:2].upper()),
            "ship": self.ship, "coupon": t.get("coupon", {"code": "WELCOME10", "pct": 10}),
            "products": {p["id"]: {"n": p["name"], "p": p["price"], "s": p.get("sale"), "img": p["imgs"][0],
                                   "o": [{"n": o["name"], "v": [[v["v"], v.get("add", 0), v.get("img", "")] for v in o["values"]]} for o in p["options"]],
                                   **({"u": p["per"]} if p.get("per") else {})}
                         for p in self.products},
        }
        if self.pickup:
            data["order"] = {"mode": "pickup", "pickup": self.pickup["pickup"], "pickup_note": self.pickup.get("pickup_note", ""),
                             "delivery": self.pickup.get("delivery", ""), "delivery_note": self.pickup.get("delivery_note", "")}
        write(f"{pre}data.js", "window.STORE=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", self.out)

        name = t["name"]
        self.page(f"{pre}index.html", f'{name} — {t["tagline"]}', lambda r, sp: "\n".join(self.section(s, sp) for s in t["home"]), "home")
        self.page(f"{pre}shop.html", f"Shop all — {name}", self.shop_body, "shop")
        for p in self.products:
            self.page(f"{pre}p/{p['id']}.html", f"{p['name']} — {name}", lambda r, sp, p=p: self.pdp_body(p, sp), "product", p.get("short", ""))
        self.page(f"{pre}cart.html", f"Cart — {name}", self.cart_body, "cart")
        self.page(f"{pre}checkout.html", f"Checkout — {name}", self.checkout_body, "checkout")
        self.page(f"{pre}order.html", f"Order received — {name}", self.order_body, "order")
        self.page(f"{pre}about.html", f"{t.get('about_nav', 'Our story')} — {name}", self.about_body, "about")
        self.page(f"{pre}help.html", f"Help — {name}", self.help_body, "help")
        return len(self.products) + 7

    def shop_body(self, root, sp):
        chips = '<button class="chip is-on" type="button" data-filter="all">All</button>' + "".join(
            f'<button class="chip" type="button" data-filter="{c["id"]}">{e(c["name"])}</button>' for c in self.t["categories"])
        grid = "".join(self.card(p, sp) for p in self.products)
        return f"""<div class="wrap shop">
  <header class="page-head"><p class="crumbs"><a href="index.html">Home</a> / Shop</p><h1 data-shop-title>Shop all</h1><p class="muted"><span data-shop-count>{len(self.products)}</span> products</p></header>
  <div class="shop__bar"><div class="chips" data-chips>{chips}</div>
    <label class="sort"><span>Sort</span><select data-sort><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>
  <div class="grid grid--4" data-grid>{grid}</div>
</div>"""

    def pdp_body(self, p, sp):
        t = self.t
        cat = self.cats.get(p["cat"], {}).get("name", "")
        imgs = p["imgs"]
        thumbs = "".join(f'<button type="button" class="thumb{" is-on" if i == 0 else ""}" data-img="{sp}img/{im}" aria-label="Image {i + 1}"><img src="{sp}img/{im}" alt="" width="120" height="120"></button>' for i, im in enumerate(imgs))
        dots = ('<span class="gallery__dots" aria-hidden="true">' + "".join('<i class="is-on"></i>' if i == 0 else "<i></i>" for i in range(len(imgs))) + "</span>") if len(imgs) > 1 else ""
        opts = ""
        for oi, o in enumerate(p["options"]):
            vals = ""
            for vi, v in enumerate(o["values"]):
                sw = f' style="--sw:{e(v["hex"])}"' if v.get("hex") else ""
                add = f' <em>+{rm0(v["add"])}</em>' if v.get("add") else ""
                vals += (f'<label class="opt__v{" opt__v--sw" if v.get("hex") else ""}"><input type="radio" name="o{oi}" value="{e(v["v"])}"{" checked" if vi == 0 else ""}>'
                         f'<span{sw}>{e(v["v"])}{add}</span></label>')
            opts += f'<fieldset class="opt"><legend>{e(o["name"])}: <b data-opt-label="{oi}">{e(o["values"][0]["v"])}</b></legend><div class="opt__vals">{vals}</div></fieldset>'
        desc = "".join(f"<p>{e(x)}</p>" for x in p.get("desc", []))
        details = ""
        if p.get("details"):
            details = '<table class="spec">' + "".join(f"<tr><th>{e(k)}</th><td>{e(v)}</td></tr>" for k, v in p["details"]) + "</table>"
        notes = f'<p class="pdp__notes">{"".join(f"<span>{e(n)}</span>" for n in p["notes"])}</p>' if p.get("notes") else ""
        roast = self.roast_meter(p["roast"]) if p.get("roast") else ""
        ship = self.ship
        pk = self.pickup
        if pk:
            ship_li = (f'<li>{icon("map")}<span><b>Pick-up in {e(pk["pickup"])}.</b>'
                       + (f' Or delivery by {e(pk["delivery"])}.' if pk.get("delivery") else "") + ' Choose the date at checkout.</span></li>')
            ship_acc, ship_link = "Pick-up, delivery &amp; changes", "Pick-up &amp; delivery details"
        else:
            ship_li = f"<li>{icon('truck')}<span><b>Ships in 1–2 working days.</b> West Malaysia {rm0(ship['west'])}, East Malaysia {rm0(ship['east'])} — free over {rm0(ship['free_min'])}.</span></li>"
            ship_acc, ship_link = "Shipping &amp; returns", "Full shipping &amp; returns policy"
        related = [x for x in self.products if x["cat"] == p["cat"] and x["id"] != p["id"]]
        related += [x for x in self.products if x["cat"] != p["cat"]]
        rel = "".join(self.card(x, sp) for x in related[:4])
        size_note = f'<p class="pdp__note">{icon("ruler")}{e(p["size_note"])}</p>' if p.get("size_note") else ""
        ask = p["price"] is None
        ask_html = (f'<a class="btn btn--lg btn--block" href="#" data-ask data-demo="In your store this opens WhatsApp with \'{e(p["name"])}\' already typed in, so customers can ask for the price.">'
                    f'{icon("chat")} Ask for price on WhatsApp</a>') if ask else ""
        return f"""<div class="wrap pdp" data-product="{e(p['id'])}">
  <p class="crumbs"><a href="{sp}index.html">Home</a> / <a href="{sp}shop.html?cat={p['cat']}">{e(cat)}</a> / <span>{e(p['name'])}</span></p>
  <div class="pdp__grid">
    <div class="gallery"><div class="gallery__main">{self.badge(p)}<img data-main-img src="{sp}img/{imgs[0]}" alt="{e(p['name'])}" width="1200" height="1200">{dots}</div>
      {f'<div class="gallery__thumbs">{thumbs}</div>' if len(imgs) > 1 else ''}</div>
    <div class="pdp__info">
      <p class="pdp__cat">{e(cat)}</p>
      <h1>{e(p['name'])}</h1>
      <p class="price price--lg"{'' if ask else ' data-pdp-price'}>{self.price_html(p).replace('<span class="from">from </span>', '')}</p>
      <p class="pdp__short">{e(p.get('short', ''))}</p>
      {notes}{roast}
      {ask_html}<form class="buy" data-buy{' hidden' if ask else ''}>
        {opts}{size_note}
        <div class="buy__row">
          <div class="qty"><button type="button" data-step="-1" aria-label="Less">{icon('minus')}</button><input name="qty" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" data-step="1" aria-label="More">{icon('plus')}</button></div>
          <button class="btn btn--lg buy__add" type="submit" data-atc>Add to cart</button>
        </div>
        <button class="btn btn--ghost btn--block" type="button" data-buy-now>Buy it now</button>
      </form>
      <ul class="pdp__trust">
        {ship_li}
        <li>{icon('shield')}<span><b>Secure checkout</b> with FPX online banking, cards or e-wallets.</span></li>
        <li>{icon('chat')}<span><b>Questions?</b> <a href="#" data-demo="In your store this opens WhatsApp or Instagram with '{e(p['name'])}' already typed in.">Chat with us</a> — we reply fast.</span></li>
      </ul>
      <div class="acc">
        <details open><summary>Description{icon('plus')}</summary><div>{desc}</div></details>
        {f'<details><summary>Details{icon("plus")}</summary><div>{details}</div></details>' if details else ''}
        <details><summary>{ship_acc}{icon('plus')}</summary><div><p>{e(t['returns_short'])}</p><p><a href="{sp}help.html#shipping">{ship_link}</a></p></div></details>
      </div>
    </div>
  </div>
  <section class="reviews"><h2>Reviews</h2><p class="muted">No reviews yet. In a real store, customers who bought this product can leave a review here — we never add made-up reviews.</p></section>
  <section class="related"><div class="sec__head"><div><h2>You may also like</h2></div></div><div class="grid grid--4 grid--rail">{rel}</div></section>
</div>
{'' if ask else f'''<div class="sticky-atc" data-sticky-atc aria-hidden="true"><div class="wrap sticky-atc__in"><img src="{sp}img/{imgs[0]}" alt="" width="48" height="48"><div class="sticky-atc__txt"><strong>{e(p['name'])}</strong><span data-sticky-price>{rm(p.get('sale') or p['price'])}</span></div><button class="btn" type="button" data-sticky-add>Add to cart</button></div></div>'''}
"""

    def cart_body(self, root, sp):
        pk = self.pickup
        if pk:
            zone = (f'<p class="small muted">Pick-up in {e(pk["pickup"])} is free.'
                    + (f' Delivery by {e(pk["delivery"])}: the fee is confirmed with you.' if pk.get("delivery") else "") + '</p>')
            ship_row = "Pick-up / delivery"
        else:
            zone = """<div class="zone"><p class="small muted">Shipping to</p>
        <label class="radio"><input type="radio" name="zone" value="west" checked> West Malaysia</label>
        <label class="radio"><input type="radio" name="zone" value="east"> Sabah, Sarawak &amp; Labuan</label></div>"""
            ship_row = "Shipping"
        return f"""<div class="wrap cartpage">
  <header class="page-head"><h1>Your cart</h1></header>
  <div class="cartpage__grid">
    <div><div class="shipbar" data-shipbar></div><div data-cart-table></div></div>
    <aside class="summary" data-cart-summary>
      <h2>Order summary</h2>
      <p class="row"><span>Subtotal</span><span data-sum-subtotal>RM0.00</span></p>
      {zone}
      <p class="row"><span>{ship_row}</span><span data-sum-ship>–</span></p>
      <form class="coupon" data-coupon><label class="sr" for="cpn">Discount code</label><input id="cpn" placeholder="Discount code"><button class="btn btn--ghost btn--sm" type="submit">Apply</button></form>
      <p class="small muted">Demo code: <b>{e(self.t.get('coupon', {}).get('code', 'WELCOME10'))}</b></p>
      <p class="row" data-sum-disc-row hidden><span>Discount</span><span data-sum-disc></span></p>
      <p class="row row--total"><span>Total</span><strong data-sum-total>RM0.00</strong></p>
      <a class="btn btn--block btn--lg" href="checkout.html" data-checkout-btn>Checkout</a>
      <p class="pay-note">{icon('shield')} FPX · Cards · E-wallets</p>
    </aside>
  </div>
</div>
<div class="cart-bar" data-cart-bar hidden><div class="wrap cart-bar__in"><span class="cart-bar__sum"><small>Total</small><strong data-bar-total>RM0.00</strong></span><a class="btn btn--lg" href="checkout.html">Checkout</a></div></div>"""

    def checkout_body(self, root, sp):
        states = "".join(f'<option>{s}</option>' for s in STATES)
        pk = self.pickup
        addr = f"""<label>Address<input name="addr1" autocomplete="address-line1" required></label>
        <label>Apartment, unit, etc. (optional)<input name="addr2" autocomplete="address-line2"></label>
        <div class="f3"><label>Postcode<input name="postcode" inputmode="numeric" maxlength="5" autocomplete="postal-code" required></label>
        <label>City<input name="city" autocomplete="address-level2" required></label>
        <label>State<select name="state" required><option value="">Choose…</option>{states}</select></label></div>"""
        if pk:
            deliv = (f'<label class="pay"><input type="radio" name="method" value="delivery"><span><b>Delivery by {e(pk["delivery"])}</b><small>Fee depends on distance, confirmed with you</small></span></label>'
                     if pk.get("delivery") else "")
            fulfil = f"""<fieldset><legend>Pick-up or delivery</legend>
        <label class="pay"><input type="radio" name="method" value="pickup" checked><span><b>Pick-up in {e(pk['pickup'])}</b><small>Free</small></span></label>
        {deliv}
        <div class="f2"><label>Full name<input name="name" autocomplete="name" required></label>
        <label>Pick-up / delivery date<input name="date" type="date" required></label></div>
        <div data-delivery-only hidden>{addr}</div>
        <label>Order note (optional)<input name="note" placeholder="e.g. which kuih, number of pieces, time you prefer"></label>
        <div class="ship-opt" data-ship-opt></div></fieldset>"""
            ship_row = "Pick-up / delivery"
        else:
            fulfil = f"""<fieldset><legend>Delivery</legend>
        <label>Full name<input name="name" autocomplete="name" required></label>
        {addr}
        <label>Delivery note (optional)<input name="note" placeholder="e.g. leave with the guard"></label></fieldset>
      <fieldset><legend>Shipping</legend><div class="ship-opt" data-ship-opt><p class="muted">Choose your state to see the shipping fee.</p></div></fieldset>"""
            ship_row = "Shipping"
        return f"""<div class="wrap checkout">
  <header class="page-head"><p class="crumbs"><a href="cart.html">Cart</a> / Checkout</p><h1>Checkout</h1></header>
  <div class="demo-note">{icon('shield')}<p><b>This is a demo checkout.</b> Nothing is charged and nothing is sent — fill it in to see how the order flow works. In your real store, payment goes through a Malaysian payment gateway opened in your own company's name.</p></div>
  <div class="checkout__grid">
    <form class="co-form" data-checkout novalidate>
      <fieldset><legend>Contact</legend>
        <div class="f2"><label>Email<input name="email" type="email" autocomplete="email" required></label>
        <label>Phone<input name="phone" type="tel" inputmode="tel" placeholder="012-345 6789" autocomplete="tel" required></label></div></fieldset>
      {fulfil}
      <fieldset><legend>Payment</legend>
        <label class="pay"><input type="radio" name="pay" value="FPX online banking" checked><span><b>FPX online banking</b><small>All major Malaysian banks</small></span></label>
        <label class="pay"><input type="radio" name="pay" value="Credit / debit card"><span><b>Credit / debit card</b><small>Visa, Mastercard</small></span></label>
        <label class="pay"><input type="radio" name="pay" value="E-wallet"><span><b>E-wallet</b><small>Popular Malaysian e-wallets</small></span></label></fieldset>
      <p class="form-error" data-form-error hidden></p>
      <button class="btn btn--lg btn--block" type="submit">Place order (demo)</button>
      <p class="small muted center">By placing an order you agree to the store's terms. (Demo — no order is created.)</p>
    </form>
    <aside class="summary summary--co"><h2>Your order</h2><div data-co-lines></div>
      <p class="row"><span>Subtotal</span><span data-co-subtotal></span></p>
      <p class="row"><span>{ship_row}</span><span data-co-ship>–</span></p>
      <p class="row" data-co-disc-row hidden><span>Discount</span><span data-co-disc></span></p>
      <p class="row row--total"><span>Total</span><strong data-co-total></strong></p></aside>
  </div>
</div>"""

    def order_body(self, root, sp):
        if self.pickup:
            ticks = (f"<li>{icon('check')}An order confirmation email with the receipt</li><li>{icon('check')}A WhatsApp message confirming the pick-up time and place (or the rider details for delivery)</li>"
                     f"<li>{icon('check')}The order in the seller's dashboard with its pick-up date, ready to prepare</li>")
        else:
            ticks = (f"<li>{icon('check')}An order confirmation email with the receipt</li><li>{icon('check')}A WhatsApp or Instagram update when it ships, with the tracking number</li>"
                     f"<li>{icon('check')}The order in the seller's dashboard, ready to pack</li>")
        return f"""<div class="wrap wrap--narrow orderpage" data-order>
  <div class="order-ok">{icon('check')}</div>
  <h1>Thank you<span data-order-name></span>!</h1>
  <p class="lead">Order <b data-order-no>—</b> received <span class="tag">demo</span></p>
  <div class="order-box" data-order-box><p class="muted">No recent demo order found. <a href="shop.html">Go shopping</a>.</p></div>
  <div class="next"><h2>In a real store, the customer would now get:</h2>
    <ul class="ticks">{ticks}</ul></div>
  <div class="btns center"><a class="btn btn--lg" href="index.html">Back to the store</a><a class="btn btn--lg btn--ghost" href="{e(self.studio_link(root, "start.html?template=" + self.slug))}">I want a store like this</a></div>
</div>"""

    def about_body(self, root, sp):
        a = self.t["about"]
        paras = "".join(f"<p>{e(x)}</p>" for x in a["paras"])
        vals = "".join(f'<li class="feat">{icon(v[0])}<h3>{e(v[1])}</h3><p>{e(v[2])}</p></li>' for v in a.get("values", []))
        return f"""<section class="about-hero"><img src="{sp}img/{a['img']}" alt="" width="1920" height="1080"><div class="wrap"><h1>{e(a['title'])}</h1></div></section>
<div class="wrap wrap--narrow about"><p class="lead">{e(a['lead'])}</p>{paras}
<p class="demo-inline">{("Mockup note: written from what has been published about " + e(self.t["name"]) + ". We'll rewrite it with you, in your own words and with your own photos.") if self.pv and self.pv.get("about") else "Mockup note: we'll write this page with you — your real story, photos and team go here." if self.pv else "Demo note: " + e(self.t["name"]) + " is a fictional brand created to show this template. Your real story, photos and team go here."}</p></div>
{f'<section class="sec"><div class="wrap"><ul class="feats feats--n{len(a.get("values", []))}">{vals}</ul></div></section>' if vals else ''}"""

    def help_body(self, root, sp):
        t = self.t
        s = self.ship
        faq = "".join(f'<details class="qa"><summary>{e(q)}{icon("plus")}</summary><p>{e(a)}</p></details>' for q, a in t["faq"])
        pk = self.pickup
        if pk:
            drow = (f'<tr><th scope="row">Delivery</th><td>{e(pk["delivery"])}</td><td>Depends on distance, confirmed with you{(" · " + e(pk["delivery_note"])) if pk.get("delivery_note") else ""}</td></tr>'
                    if pk.get("delivery") else "")
            sub, ship_h, ret_h = "Pick-up, delivery and common questions.", "Pick-up &amp; delivery", "Changes &amp; refunds"
            ship_sec = f"""<div class="tbl-wrap"><table class="tbl"><thead><tr><th>How</th><th>Where</th><th>Fee</th></tr></thead><tbody>
    <tr><th scope="row">Pick-up</th><td>{e(pk['pickup'])}</td><td>Free{(" · " + e(pk["pickup_note"])) if pk.get("pickup_note") else ""}</td></tr>
    {drow}</tbody></table></div>
  <p>Choose your pick-up or delivery date at checkout.</p>"""
        else:
            sub, ship_h, ret_h = "Shipping, returns and common questions.", "Shipping", "Returns &amp; exchanges"
            ship_sec = f"""<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Where</th><th>Fee</th><th>Delivery time</th></tr></thead><tbody>
    <tr><th scope="row">West Malaysia</th><td>{rm(s['west'])} · free over {rm0(s['free_min'])}</td><td>2–4 working days</td></tr>
    <tr><th scope="row">Sabah, Sarawak &amp; Labuan</th><td>{rm(s['east'])} · free over {rm0(s['free_min'])}</td><td>4–7 working days</td></tr></tbody></table></div>
  <p>Orders placed before 2pm on working days are packed the same day. You'll get a tracking number as soon as your parcel ships.</p>"""
        contact = e(self.pv["contact"]) if self.pv and self.pv.get("contact") else "Chat with us using the button at the bottom of the page, or message us on Instagram. We reply within one working day."
        return f"""<div class="wrap wrap--narrow help">
  <header class="page-head"><h1>Help centre</h1><p class="muted">{sub}</p></header>
  <h2 id="faq">Frequently asked questions</h2><div class="qas">{faq}</div>
  <h2 id="shipping">{ship_h}</h2>
  {ship_sec}
  <h2 id="returns">{ret_h}</h2><p>{e(t['returns'])}</p>
  <h2 id="contact">Contact</h2><p>{contact}</p>
  <p class="demo-inline">Demo note: these policies are examples. Your store gets your own policies — and we draft them with you.</p>
</div>"""


# --------------------------------------------------------------------------
# Private mockups (free homepage previews for one prospect)
# --------------------------------------------------------------------------
def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "item"


GENERIC_FAQ = [
    ["How long does delivery take?", "West Malaysia 2–4 working days, East Malaysia 4–7 working days. Orders before 2pm ship the same working day."],
    ["Which payment methods do you accept?", "FPX online banking, credit/debit cards and e-wallets — all through a secure Malaysian payment gateway."],
    ["Do you offer free shipping?", "Yes, for orders above the free-shipping amount shown at the top of the site."],
    ["Can I still buy on Shopee / TikTok?", "Of course. This website is another way to order — with member perks and direct support from us."],
]


def apply_preview(t, pv):
    """Replace a template's fictional brand with the prospect's public brand info (in place)."""
    b = pv["brand"]
    t["name"] = b["name"]
    t["tagline"] = b.get("tagline", t["tagline"])
    t["logo"] = {"text": b.get("logo_text", b["name"])}
    t["favicon"] = b["name"][:1].upper()
    t["fav_bg"] = b.get("colors", {}).get("accent", t["fav_bg"])
    t["fav_fg"] = "#ffffff"
    t["order_prefix"] = re.sub(r"[^A-Z]", "", b["name"].upper())[:2] or "PV"
    t["footer_blurb"] = b.get("blurb", b.get("tagline", ""))
    if pv.get("shipping"):
        t["shipping"] = pv["shipping"]
    ship = t.get("shipping", {"west": 8, "east": 15, "free_min": 150})
    t["announcement"] = b.get("announcement") or [f"Free shipping in Malaysia over RM{ship['free_min']}", "Pay with FPX online banking, cards or e-wallets"]
    cats, products = [], []
    def price_of(item):
        v = item.get("price")
        if v in (None, "", "ask"):
            return None
        if not isinstance(v, (int, float)) or v <= 0:
            sys.exit(f"产品 {item.get('name')!r} 的 price 要是数字（查不到价钱就不要写 price，样板会显示 Ask for price）")
        return v
    for i, item in enumerate(pv["products"]):
        cname = item.get("category", "Shop")
        cid = slugify(cname)
        imgs = item["images"] if isinstance(item.get("images"), list) else [item["image"]]
        if cid not in [c["id"] for c in cats]:
            cats.append({"id": cid, "name": cname, "img": imgs[0], "blurb": ""})
        products.append({
            "id": slugify(item["name"])[:50], "name": item["name"], "cat": cid, "price": price_of(item), "sale": item.get("sale") if price_of(item) is not None else None,
            "imgs": imgs, "short": item.get("short", ""), "desc": item.get("desc", [item.get("short", "")] if item.get("short") else []),
            "details": item.get("details", []), "options": item.get("options", []), "tags": ["featured"] if i < 4 else [],
            "badge": item.get("badge"), "per": item.get("per"),
        })
    for c in cats:
        n = len([p for p in products if p["cat"] == c["id"]])
        c["blurb"] = f"{n} product" + ("" if n == 1 else "s")
    t["categories"], t["products"] = cats, products
    hero_tpl = next((s for s in t["home"] if s["type"] == "hero"), {"type": "hero", "layout": "split"})
    hero = dict(hero_tpl)
    h = pv.get("hero", {})
    hero.update({"eyebrow": h.get("eyebrow", ""), "title": e(h.get("title", b["name"])), "text": h.get("text", b.get("tagline", "")),
                 "img": h.get("image", hero_tpl.get("img", "hero.jpg")), "alt": b["name"], "pos": h.get("pos", ""),
                 "buttons": [x for x in h.get("buttons", []) if isinstance(x, dict) and x.get("label") and x.get("href")][:2] or [{"label": "Shop now", "href": "shop.html"}, {"label": "Our story", "href": "about.html"}],
                 "chips": pv_list(pv, "chips", [["truck", f"Free shipping RM{ship['free_min']}+"], ["shield", "Secure checkout"]], 2)})
    if "sticker" in pv:  # restaurants etc.: "" removes the free-shipping sticker
        hero["sticker"] = e(pv["sticker"])
    elif hero.get("sticker"):
        hero["sticker"] = f"Free<br>shipping<br><b>RM{ship['free_min']}+</b>"
    cat_tpl = next((s for s in t["home"] if s["type"] == "categories"), {"layout": "cards"})
    layout = cat_tpl.get("layout", "cards") if len(cats) <= 5 else "cards"
    trust = pv_list(pv, "trust", [["truck", f"Free shipping RM{ship['free_min']}+", "West & East Malaysia"], ["shield", "Secure checkout", "FPX, cards, e-wallets"],
                                  ["box", "Ships in 1–2 days", "Tracking number by message"], ["chat", "Questions?", "Chat with us anytime"]], 3)
    home = [hero] + ([{"type": "trust", "items": trust}] if trust else [])
    if len(cats) > 1:
        home.append({"type": "categories", "layout": layout, "title": "Shop by category", "class": cat_tpl.get("class", ""), "ids": [c["id"] for c in cats]})
    home.append({"type": "products", "eyebrow": h.get("featured_eyebrow", "Start here"), "title": h.get("featured_title", "Our favourites"), "pick": {"tag": "featured", "limit": 4}})
    if len(products) > 4:
        home.append({"type": "products", "title": "More to love", "pick": {"ids": [p["id"] for p in products[4:12]]}})
    nl = pv.get("newsletter", {})  # false removes the sign-up box; {"title", "text"} rewrites it
    if nl is not False:
        nl = nl if isinstance(nl, dict) else {}
        home += [{"type": "newsletter", "title": nl.get("title", f"Join the {b['name']} list"), "text": nl.get("text", "New launches, restocks and member-only vouchers."), "button": nl.get("button", "Sign up")}]
        if nl.get("title"):
            t["newsletter_title"], t["newsletter_text"] = nl["title"], nl.get("text", "")
    t["home"] = home
    t["faq"] = pv.get("faq", GENERIC_FAQ)
    t["about_nav"] = "About"
    a = pv.get("about") if isinstance(pv.get("about"), dict) else {}
    t["about"] = {"img": a.get("image", h.get("image", "hero.jpg")), "title": a.get("title", f"About {b['name']}"), "lead": a.get("lead", b.get("story", b.get("tagline", ""))),
                  "paras": [str(x) for x in a.get("paras", []) if x], "values": pv_list(a, "values", [], 3)}
    t["returns_short"] = pv.get("returns_short", "Returns and exchanges follow your own policy — we'll set it up with you.")
    t["returns"] = pv.get("returns", "Your own returns and exchange policy goes here. We'll draft it together during setup.")


def _lum(hexc):
    h = hexc.lstrip("#")
    h = "".join(c * 2 for c in h) if len(h) == 3 else h[:6]
    ch = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    ch = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def _mix(a, b, t):
    """a moved toward b by t (0..1), as #rrggbb"""
    def h(x):
        x = x.lstrip("#")
        x = "".join(ch * 2 for ch in x) if len(x) == 3 else x[:6]
        return [int(x[i:i + 2], 16) for i in (0, 2, 4)]
    pa, pb = h(a), h(b)
    return "#" + "".join(f"{round(pa[i] + (pb[i] - pa[i]) * t):02x}" for i in range(3))


def _contrast(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def pv_list(pv, key, default, size):
    """preview.json overrides for the trust strip / hero chips: [[icon, title, text], …]; [] removes them."""
    v = pv.get(key)
    if not isinstance(v, list):
        return default
    out = []
    for it in v:
        if not isinstance(it, list) or len(it) < size - 1:
            sys.exit(f"preview.json 的 {key} 每一项要像 [\"clock\", \"Open daily\", \"10am–10pm\"]")
        it = [str(x) for x in it] + [""] * (size - len(it))
        if it[0] not in ICONS:
            it[0] = "spark"
        out.append(it[:size])
    return out


def preview_css(pv, theme=""):
    """Brand colours for a mockup. Colours that would make text unreadable on this template
    (e.g. a light background on a dark template) are dropped with a warning instead of applied."""
    c = {k: v for k, v in pv["brand"].get("colors", {}).items() if isinstance(v, str) and re.match(r"^#[0-9a-fA-F]{3,8}$", v)}
    base = dict(re.findall(r"--(bg|fg|accent|accent-fg|soft):\s*(#[0-9a-fA-F]{3,8})", theme.split("}", 1)[0]))
    eff = lambda k, ck: c.get(ck, base.get(k))
    dropped = []
    if base.get("bg") and base.get("fg") and _contrast(eff("fg", "fg"), eff("bg", "bg")) < 4.5:
        for k in ("bg", "soft", "fg"):
            if c.pop(k, None):
                dropped.append(k)
    if eff("accent", "accent") and eff("bg", "bg") and _contrast(eff("accent", "accent"), eff("bg", "bg")) < 2.5:
        if c.pop("accent", None):
            dropped.append("accent")
    if "accent" in c:
        # brand colour is used for buttons (with accent-fg text) and small coloured text on the page background:
        # nudge it darker (light templates) or lighter (dark templates) until both read at 4.5:1
        bg_ = eff("bg", "bg") or "#ffffff"
        light_bg = _lum(bg_) > 0.4
        fg_ = c.get("accent_fg") or ("#ffffff" if light_bg else "#111111")
        acc = c["accent"]
        for _ in range(40):
            if _contrast(acc, fg_) >= 4.5 and _contrast(acc, bg_) >= 4.5:
                break
            acc = _mix(acc, "#000000" if light_bg else "#ffffff", 0.06)
        if acc != c["accent"]:
            print(f"ℹ 品牌色 {c['accent']} 调深/调浅成 {acc}，按钮和小字才看得清楚")
        c["accent"], c["accent_fg"] = acc, fg_
    if dropped:
        print(f"⚠ 颜色 {', '.join(dropped)} 在模板 {pv['template']} 上会看不清，已改用模板原本的颜色")
    m = {"accent": "--accent", "accent_fg": "--accent-fg", "bg": "--bg", "fg": "--fg", "soft": "--soft"}
    vars_ = "".join(f"{m[k]}:{v};" for k, v in c.items() if k in m)
    return ("\n/* preview overrides */\n:root{" + vars_ + "}\n"
            "html.pv-locked body > *:not(.pv-gate){visibility:hidden}\n.pv-gate{display:none}\n"
            "html.pv-locked .pv-gate{display:grid;position:fixed;inset:0;z-index:999;place-items:center;background:var(--bg);visibility:visible}\n"
            ".pv-gate form{width:min(340px,90vw);text-align:center}.pv-gate input{width:100%;height:48px;margin:10px 0;border:1.5px solid var(--line);border-radius:10px;padding:0 14px}"
            ".pv-gate__t{font:700 1.4rem var(--font-head)}.pv-gate__err{color:#c0392b;margin-top:10px}\n"
            # stock photos are random: keep hero text readable whatever the picture
            ".hero--cover .hero__media::after{background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.65))}\n")


def build_preview(cfg_path, out=None):
    import datetime
    import hashlib
    cfg_path = os.path.abspath(cfg_path)
    folder = os.path.dirname(cfg_path)
    pv = load_json(cfg_path)
    for k in ("code", "template", "delete_by", "brand", "products"):
        if k not in pv:
            sys.exit(f"preview.json 缺少 {k}（参考 templates/preview.example.json）")
    if pv["template"] not in ORDER:
        sys.exit(f"template 只能是：{', '.join(ORDER)}")
    try:
        delete_by = datetime.date.fromisoformat(pv["delete_by"])
    except ValueError:
        sys.exit("delete_by 要写成 YYYY-MM-DD")
    today = datetime.date.today()
    if delete_by < today:
        sys.exit(f"这个样板已经过期（{delete_by}）。不要再发出；请到 Netlify 删除它的网站，然后删掉这个文件夹。")
    if (delete_by - today).days > 14:
        sys.exit("delete_by 最多 14 天后（诚信守则：没成交 14 天内删除）")
    pv["_img"] = os.path.join(folder, "img")
    missing = [i for p in pv["products"] for i in (p["images"] if isinstance(p.get("images"), list) else [p.get("image", "")]) if not os.path.exists(os.path.join(pv["_img"], i))]
    hero_img = pv.get("hero", {}).get("image")
    if hero_img and not os.path.exists(os.path.join(pv["_img"], hero_img)):
        missing.append(hero_img)
    if missing:
        sys.exit("img/ 里找不到这些照片：" + ", ".join(missing))
    pw = pv.get("password", "")
    if pw:
        pv["_hash"] = hashlib.sha256(pw.encode("utf-8")).hexdigest()
    out = os.path.abspath(out or os.path.join(folder, "site"))
    if os.path.exists(out):
        shutil.rmtree(out)
    pv["_out"] = out
    os.makedirs(os.path.join(out, "assets", "css"))
    os.makedirs(os.path.join(out, "assets", "js"))
    shutil.copy(os.path.join(HERE, "assets", "css", "store.css"), os.path.join(out, "assets", "css"))
    shutil.copy(os.path.join(HERE, "assets", "js", "store.js"), os.path.join(out, "assets", "js"))
    studio = load_json(os.path.join(HERE, "studio.json"))
    n = Store(pv["template"], studio, pv).build()
    write("robots.txt", "User-agent: *\nDisallow: /\n", out)
    write("_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n", out)
    print(f"样板 {pv['code']}（{pv['brand']['name']}，模板 {pv['template']}）：{n} 页 → {out}")
    print(f"删除日期：{delete_by}。" + ("已设密码。" if pw else "⚠ 没有设密码（preview.json 加 \"password\"）。"))
    print("下一步：打开 https://app.netlify.com/drop ，把上面的 site 文件夹拖进去（详细见 docs/09-netlify-guide.md）。")


# --------------------------------------------------------------------------
# Studio site
# --------------------------------------------------------------------------
class Studio:
    def __init__(self, data, stores):
        self.d = data
        self.stores = stores

    def nav(self):
        return [("templates.html", "Templates"), ("pricing.html", "Pricing"), ("why-us.html", "Why us"), ("process.html", "How it works"), ("faq.html", "FAQ")]

    def layout(self, rel, title, desc, body, current="", noindex=False):
        d = self.d
        depth = rel.count("/")
        root = "/" if rel == "404.html" else "../" * depth
        nav = "".join(f'<a href="{root}{u}"{" aria-current=page" if u == current else ""}>{n}</a>' for u, n in self.nav())
        robots = '<meta name="robots" content="noindex">' if noindex else ""
        ig = d["instagram"]
        return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
{robots}
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{e(d.get("site_url", "").rstrip("/"))}/assets/img/og.jpg">
<meta name="theme-color" content="#14171c">
<link rel="icon" href="{root}assets/img/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&amp;family=Inter:wght@400;500;600&amp;display=swap">
<link rel="stylesheet" href="{root}assets/css/studio.css">
<script src="{root}assets/js/studio.js" defer></script>
</head>
<body class="studio">
{sprite()}
<a class="skip" href="#main">Skip to content</a>
<header class="s-hdr"><div class="s-wrap s-hdr__in">
  <a class="s-logo" href="{root}index.html" aria-label="Cartsmith Studio home"><svg class="s-mark" viewBox="0 0 100 100" width="30" height="30" aria-hidden="true"><path d="M72.98 30.72A30 30 0 1 0 72.98 69.28" fill="none" stroke="currentColor" stroke-width="14"/><rect x="66" y="43" width="14" height="14" fill="#ff5a2c"/></svg><span>cartsmith<em>studio</em></span></a>
  <nav class="s-nav" aria-label="Main">{nav}</nav>
  <a class="s-btn s-btn--sm s-hdr__cta" href="{root}start.html">Free mockup</a>
  <button class="s-menu" type="button" aria-label="Menu" aria-expanded="false" data-s-menu>{icon('menu')}</button>
</div></header>
<main id="main">
{body}
</main>
<footer class="s-ftr"><div class="s-wrap s-ftr__grid">
  <div><a class="s-logo s-logo--light" href="{root}index.html" aria-label="Cartsmith Studio home"><svg class="s-mark" viewBox="0 0 100 100" width="30" height="30" aria-hidden="true"><path d="M72.98 30.72A30 30 0 1 0 72.98 69.28" fill="none" stroke="currentColor" stroke-width="14"/><rect x="66" y="43" width="14" height="14" fill="#ff5a2c"/></svg><span>cartsmith<em>studio</em></span></a>
    <p>Online stores for Malaysian brands that sell on Shopee, TikTok Shop and Instagram. Built, launched and looked after by one person you can actually reach.</p>
    <p><a class="s-ig" href="{e(ig['profile'])}" rel="noopener">{icon('ig')} @{e(ig['handle'])}</a></p></div>
  <div><h4>Studio</h4><ul><li><a href="{root}templates.html">6 templates</a></li><li><a href="{root}pricing.html">Pricing</a></li><li><a href="{root}why-us.html">Why Cartsmith</a></li><li><a href="{root}process.html">How it works</a></li></ul></div>
  <div><h4>Free tools</h4><ul><li><a href="{root}shopee-fee-calculator.html">Shopee fee calculator</a></li><li><a href="{root}start.html">Free homepage mockup</a></li><li><a href="{root}faq.html">FAQ</a></li></ul></div>
  <div><h4>Talk to us</h4><ul><li><a href="{e(ig['dm'])}" rel="noopener">DM on Instagram</a></li><li><a href="{root}start.html">Request form</a></li><li><button class="s-linkbtn" type="button" data-chat-open>Ask the AI assistant</button></li></ul></div>
</div>
<div class="s-wrap s-ftr__bottom"><span>© {YEAR} Cartsmith Studio · Malaysia</span><span><a href="{root}privacy.html">Privacy</a> · Store demos use fictional brands and Pexels photos.</span></div></footer>
{self.chat_widget(root)}
</body>
</html>
"""

    def chat_widget(self, root):
        ig = self.d["instagram"]
        return f"""<div class="chat" data-chat data-endpoint="/api/chat" data-dm="{e(ig['dm'])}">
  <button class="chat__fab" type="button" data-chat-open aria-label="Ask us anything">{icon('chat')}<span>Ask us anything</span></button>
  <section class="chat__panel" role="dialog" aria-label="Chat with Cartsmith's AI assistant" hidden>
    <header class="chat__head"><div><strong>Cartsmith assistant</strong><small>AI · answers from our price list · a real person takes over anytime</small></div><button class="chat__x" type="button" data-chat-close aria-label="Close">{icon('x')}</button></header>
    <div class="chat__log" data-chat-log aria-live="polite"></div>
    <div class="chat__quick" data-chat-quick><button type="button">How much is a website?</button><button type="button">Do I need to leave Shopee?</button><button type="button">网站要多少钱？</button></div>
    <form class="chat__form" data-chat-form><label class="sr" for="chat-in">Message</label><textarea id="chat-in" rows="1" maxlength="800" placeholder="Type your question…" required></textarea><button class="s-btn s-btn--sm" type="submit">Send</button></form>
    <p class="chat__fine">AI can make mistakes — prices and terms are confirmed by the Cartsmith team in writing. Don't share passwords or card details. <a href="{root}privacy.html#ai">Privacy</a></p>
  </section>
</div>
<form name="ai-chat-lead" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field"><input name="name"><input name="brand"><input name="instagram"><input name="shop_url"><input name="contact"><input name="language"><input name="interest"><textarea name="transcript"></textarea>
</form>"""

    # ---- fragments used by pages ---------------------------------------
    def frag_template_cards(self, root, detailed=False):
        out = []
        for st in self.stores:
            t = st.t
            shot_d = f"assets/shots/{st.slug}-desktop.webp"
            shot_m = f"assets/shots/{st.slug}-mobile.webp"
            has = os.path.exists(os.path.join(HERE, shot_d))
            if has:
                media = (f'<img class="tpl__desk" src="{root}{shot_d}" alt="{e(t["name"])} template on desktop" loading="lazy" width="1440" height="900">'
                         f'<img class="tpl__phone" src="{root}{shot_m}" alt="{e(t["name"])} template on mobile" loading="lazy" width="390" height="844">')
            else:
                media = f'<img class="tpl__desk" src="{root}demo/{st.slug}/img/hero.jpg" alt="" loading="lazy">'
            feats = ""
            if detailed:
                feats = '<ul class="s-ticks">' + "".join(f"<li>{icon('check')}{e(f)}</li>" for f in t["sell_points"]) + "</ul>"
            swatch = "".join(f'<i style="background:{c}"></i>' for c in t["swatches"])
            out.append(f"""<article class="tpl" id="{st.slug}">
  <a class="tpl__media" href="{root}demo/{st.slug}/index.html" style="--tpl-bg:{t['fav_bg']}">{media}</a>
  <div class="tpl__body">
    <p class="tpl__meta"><span class="tpl__sw">{swatch}</span>{e(t['style'])} · {e(t['category'])}</p>
    <h3>{e(t['name'])}</h3>
    <p>{e(t['pitch'])}</p>
    <p class="tpl__best"><b>Best for:</b> {e(t['best_for'])}</p>
    {feats}
    <div class="s-btns"><a class="s-btn s-btn--sm" href="{root}demo/{st.slug}/index.html">Open live demo</a><a class="s-btn s-btn--sm s-btn--ghost" href="{root}start.html?template={st.slug}">Choose this one</a></div>
  </div>
</article>""")
        return '<div class="tpls' + (' tpls--detailed' if detailed else '') + '">' + "".join(out) + "</div>"

    def frag_packages(self, root):
        out = []
        for p in self.d["packages"]:
            feats = "".join(f"<li>{icon('check')}{e(f)}</li>" for f in p["features"])
            hl = " pkg--hl" if p.get("highlight") else ""
            tag = f'<span class="pkg__tag">{e(p["tag"])}</span>' if p.get("tag") else ""
            out.append(f"""<article class="pkg{hl}">{tag}<h3>{e(p['name'])}</h3><p class="pkg__for">{e(p['for'])}</p>
<p class="pkg__price"><span>RM</span>{p['price']:,}<small>one-time</small></p>
<p class="pkg__meta">{e(p['meta'])}</p><ul class="s-ticks">{feats}</ul>
<a class="s-btn s-btn--block{'' if p.get('highlight') else ' s-btn--ghost'}" href="{root}start.html?package={p['id']}">Get a free mockup first</a></article>""")
        return '<div class="pkgs">' + "".join(out) + "</div>"

    def frag_care(self, root):
        c = self.d["care"]
        head = "".join(f"<th>{e(x['name'])}<br><b>RM{x['price']}/month</b></th>" for x in c["plans"])
        rows = "".join("<tr><th scope=row>" + e(r[0]) + "</th>" + "".join(f"<td>{e(v)}</td>" for v in r[1:]) + "</tr>" for r in c["rows"])
        return f'<div class="s-tbl-wrap"><table class="s-tbl"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table></div>'

    def frag_faq(self, root, limit=None):
        items = self.d["faq"][:limit] if limit else self.d["faq"]
        return '<div class="s-qas">' + "".join(f'<details class="s-qa"><summary>{e(q)}{icon("plus")}</summary><div>{a}</div></details>' for q, a in items) + "</div>"

    def frag_compare(self, root):
        c = self.d["compare"]
        head = "".join(f'<th{" class=us" if i == len(c["cols"]) - 1 else ""}>{e(x)}</th>' for i, x in enumerate(c["cols"]))
        rows = ""
        for r in c["rows"]:
            cells = ""
            for i, v in enumerate(r[1:]):
                us = ' class="us"' if i == len(r) - 2 else ""
                cells += f"<td{us}>{e(v)}</td>"
            rows += f"<tr><th scope=row>{e(r[0])}</th>{cells}</tr>"
        return f'<div class="s-tbl-wrap"><table class="s-tbl s-tbl--compare"><thead><tr><th></th>{head}</tr></thead><tbody>{rows}</tbody></table></div>'

    def frag_addons(self, root):
        rows = "".join(f"<tr><th scope=row>{e(a)}</th><td>{e(b)}</td></tr>" for a, b in self.d["addons"])
        return f'<div class="s-tbl-wrap"><table class="s-tbl"><tbody>{rows}</tbody></table></div>'

    def frag_compare_sources(self, root):
        c = self.d["compare"]
        items = " ".join(f'{i + 1}. <a href="{e(u)}" rel="noopener">{e(t)}</a>' for i, (t, u) in enumerate(c["sources"]))
        return (f'<p class="s-sources">Price ranges are typical market prices published in 2026 Malaysian pricing guides (checked {e(c["checked"])}): {items}. '
                'Your own quotes may differ. Platform plans and fees change — check each provider\'s official pricing page.</p>')

    def frag_template_options(self, root):
        return "".join(f'<option value="{st.slug}">{e(st.t["name"])} — {e(st.t["style"])} ({e(st.t["category"])})</option>' for st in self.stores)

    def frag_hero_phones(self, root):
        out = []
        for i, slug in enumerate(["plainfold", "dewlane", "lowlight"]):
            p = f"assets/shots/{slug}-mobile.webp"
            if os.path.exists(os.path.join(HERE, p)):
                out.append(f'<a class="phone phone--{i}" href="{root}demo/{slug}/index.html" aria-label="Open the {slug} demo"><img src="{root}{p}" alt="" width="390" height="844"{" fetchpriority=high" if i == 1 else " loading=lazy"}></a>')
        return '<div class="phones">' + "".join(out) + "</div>"

    def frag_calculator(self, root):
        c = self.d["calculator"]

        def num(i, label, val, step="0.01", suffix=""):
            suf = f'<span class="calc__suf">{e(suffix)}</span>' if suffix else ""
            return f'<p class="calc__f"><label for="{i}">{label}</label><span class="calc__in"><input type="number" inputmode="decimal" min="0" step="{step}" id="{i}" data-calc="{i}" value="{val}">{suf}</span></p>'
        rows = "".join(f'<tr><th scope="row">{l}</th><td data-out="shopee_{k}">–</td><td data-out="site_{k}">–</td></tr>' for k, l in
                       [("fees", "Fees per order · 每单费用"), ("received", "You receive · 实际收到"), ("profit", "Profit · 利润"), ("margin", "Margin · 利润率")])
        src = ", ".join(f'<a href="{e(u)}" rel="noopener">Source {i + 1}</a>' for i, u in enumerate(c["sources"]))
        return f"""<div class="calc" data-agc-calc>
<form class="calc__form" onsubmit="return false" autocomplete="off">
<fieldset><legend>1. Your order · 你的订单</legend>{num('price', 'Selling price · 售价 (RM)', 100)}{num('discount', 'Your discount / voucher · 卖家折扣 (RM)', 0)}{num('cost', 'Product cost · 商品成本 (RM)', 40)}{num('shipping', 'Shipping you pay · 卖家负担运费 (RM)', 0)}{num('orders', 'Repeat orders per month that could move to your website · 每月可以转到官网的回头客订单', 50, '1')}</fieldset>
<fieldset><legend>2. Shopee fees · Shopee 费用 <small>(edit to match your Seller Centre)</small></legend>{num('commission', 'Commission · 佣金 (% before SST)', c['commission'], '0.01', '%')}{num('transaction', 'Transaction fee · 交易费 (% before SST)', c['transaction'], '0.01', '%')}{num('other', 'Other % fees (e.g. cashback / free shipping programmes) · 其他 %', 0, '0.01', '%')}{num('support', 'Platform support fee per order · 平台支持费 (RM, before SST)', c['support'])}{num('sst', 'SST charged on fees · 费用的 SST', c['sst'], '0.01', '%')}</fieldset>
<fieldset><legend>3. Your own website · 自己的网站</legend>{num('gateway', 'Payment gateway fee · 付款网关手续费', c['gateway'], '0.01', '%')}{num('gateway_fixed', 'Fixed fee per payment · 每笔固定费用 (RM)', c['gateway_fixed'])}</fieldset>
</form>
<div class="calc__res" aria-live="polite">
<table><thead><tr><th></th><th>Shopee</th><th>Own website</th></tr></thead><tbody>{rows}</tbody></table>
<p class="calc__big">Keep about <strong data-out="diff">–</strong> more per order · 每单多留约 <strong data-out="diff2">–</strong><br>≈ <strong data-out="yearly">–</strong> a year on those repeat orders · 一年约多留 <strong data-out="yearly2">–</strong></p>
<details><summary>Shopee fee breakdown · 费用明细</summary><ul><li>Commission: <span data-out="c_commission">–</span></li><li>Transaction fee: <span data-out="c_transaction">–</span></li><li>Other % fees: <span data-out="c_other">–</span></li><li>Platform support fee: <span data-out="c_support">–</span></li><li>SST on fees: <span data-out="c_sst">–</span></li></ul></details>
</div>
<p class="calc__note">Default rates last checked: {e(c['checked'])} ({src}). Rates differ by category and seller programme and change often — <strong>always follow the latest rates in your Shopee Seller Centre</strong>. This is an estimate, not financial advice. Nothing you type here is saved or sent. · 默认费率查于 {e(c['checked'])}，以 Shopee 卖家中心最新公布为准。你输入的资料不会被储存或传送。</p>
</div>"""

    def build(self):
        d = self.d
        pages_dir = os.path.join(HERE, "pages")
        count = 0
        for fn in sorted(os.listdir(pages_dir)):
            if not fn.endswith(".html"):
                continue
            src = open(os.path.join(pages_dir, fn), encoding="utf-8").read()
            m = re.match(r"\s*<!--(.*?)-->\s*", src, re.S)
            meta = {}
            if m:
                for part in m.group(1).split("\n"):
                    if ":" in part:
                        k, v = part.split(":", 1)
                        meta[k.strip()] = v.strip()
                src = src[m.end():]
            root = ""
            repl = {
                "TEMPLATE_CARDS": lambda: self.frag_template_cards(root),
                "TEMPLATE_CARDS_DETAILED": lambda: self.frag_template_cards(root, detailed=True),
                "TEMPLATE_OPTIONS": lambda: self.frag_template_options(root),
                "PACKAGES": lambda: self.frag_packages(root),
                "CARE": lambda: self.frag_care(root),
                "FAQ": lambda: self.frag_faq(root),
                "FAQ_SHORT": lambda: self.frag_faq(root, 6),
                "COMPARE": lambda: self.frag_compare(root),
                "CALCULATOR": lambda: self.frag_calculator(root),
                "ADDONS": lambda: self.frag_addons(root),
                "COMPARE_SOURCES": lambda: self.frag_compare_sources(root),
                "HERO_PHONES": lambda: self.frag_hero_phones(root),
                "IG_DM": lambda: e(d["instagram"]["dm"]),
                "IG_PROFILE": lambda: e(d["instagram"]["profile"]),
                "IG_HANDLE": lambda: e(d["instagram"]["handle"]),
                "PRICE_STARTER": lambda: f'{d["packages"][0]["price"]:,}',
                "CARE_BASIC": lambda: str(d["care"]["plans"][0]["price"]),
                "ICON": None,
            }

            def sub(mm):
                key = mm.group(1)
                if key.startswith("ICON:"):
                    return icon(key[5:])
                fn_ = repl.get(key)
                if fn_ is None:
                    raise KeyError(f"{fn}: unknown placeholder {{{{{key}}}}}")
                return fn_()
            body = re.sub(r"\{\{([A-Z_]+(?::[a-z]+)?)\}\}", sub, src)
            out = self.layout(fn, meta.get("title", "Cartsmith Studio"), meta.get("description", ""), body, fn, meta.get("robots") == "noindex")
            write(fn, out)
            count += 1
        return count


# --------------------------------------------------------------------------
LEAD_KEYS = ("id", "name", "input")
LEAD_LANGS = ("zh", "en", "ms")


def load_leads():
    """sales/leads/*.json → one list for the desk inbox (Claude Code's research, no copy-paste)."""
    folder = os.path.join(HERE, "..", "sales", "leads")
    out, seen, updates = [], set(), []
    email_ok = lambda v: re.match(r"^[^\s@<>]+@[^\s@<>]+\.[A-Za-z]{2,}$", v)
    if not os.path.isdir(folder):
        return out
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".json") or name == "inbox.json":
            continue
        data = load_json(os.path.join(folder, name))
        # "contacts": WhatsApp / Email found later for merchants already listed (fills only what is missing)
        for c in data.get("contacts", []):
            cid, wa, em, src = (str(c.get(k, "")).strip() for k in ("id", "whatsapp", "email", "contact_source"))
            extra = {k: str(c.get(k, "")).strip() for k in ("phone", "area", "address")}
            if not cid or not (wa or em or any(extra.values())) or not src:
                raise SystemExit("sales/leads/%s: contact update %r needs id, one of whatsapp / email / phone / area / address, and contact_source" % (name, cid))
            if extra["phone"] and not 9 <= len(re.sub(r"\D", "", extra["phone"])) <= 15:
                raise SystemExit("sales/leads/%s: %s phone number looks wrong: %s" % (name, cid, extra["phone"]))
            if em and not email_ok(em):
                raise SystemExit("sales/leads/%s: %s email looks wrong: %s" % (name, cid, em))
            if wa and not 9 <= len(re.sub(r"\D", "", wa)) <= 15:
                raise SystemExit("sales/leads/%s: %s WhatsApp number looks wrong: %s" % (name, cid, wa))
            updates.append((name, cid, wa, em, src, extra))
        for lead in data.get("leads", []):
            missing = [k for k in LEAD_KEYS if not str(lead.get(k, "")).strip()]
            if missing:
                raise SystemExit("sales/leads/%s: lead %r is missing %s" % (name, lead.get("id"), ", ".join(missing)))
            if lead["id"] in seen:
                raise SystemExit("sales/leads/%s: duplicate lead id %s" % (name, lead["id"]))
            if lead.get("language") and lead["language"] not in LEAD_LANGS:
                raise SystemExit("sales/leads/%s: %s language must be zh / en / ms" % (name, lead["id"]))
            email = str(lead.get("email", "")).strip()
            if email and not email_ok(email):
                raise SystemExit("sales/leads/%s: %s email looks wrong: %s" % (name, lead["id"], email))
            seen.add(lead["id"])
            ig = str(lead.get("instagram", "")).strip().lstrip("@")
            if not ig:
                # 2026-11-08 俊宇：没有 IG 的商家不要放（IG 是基本条件；WhatsApp / Email 是加分的联系方式）
                print("  sales/leads/%s: skip %s (no Instagram)" % (name, lead["id"]))
                continue
            out.append({
                "id": lead["id"], "name": lead["name"].strip(), "instagram": ig,
                "whatsapp": str(lead.get("whatsapp", "")).strip(), "email": email, "contact_source": lead.get("contact_source", ""),
                "phone": str(lead.get("phone", "")).strip(), "area": str(lead.get("area", "")).strip()[:60], "address": str(lead.get("address", "")).strip()[:200],
                "store_url": lead.get("store_url", ""), "language": lead.get("language", ""), "template": lead.get("template", ""),
                "priority": lead.get("priority", ""), "why": lead.get("why", ""), "verify": lead.get("verify", ""),
                "batch": data.get("batch", name[:-5]), "input": lead["input"].strip()[:3000],
            })
    by_id = {l["id"]: l for l in out}
    for name, cid, wa, em, src, extra in updates:
        l = by_id.get(cid)
        if not l:
            print("  sales/leads/%s: contact update for %s skipped (not in the inbox)" % (name, cid))
            continue
        filled = []
        if wa and not l["whatsapp"]:
            l["whatsapp"] = wa
            filled.append("WhatsApp")
        if em and not l["email"]:
            l["email"] = em
            filled.append("Email")
        for k, label in (("phone", "电话"), ("area", "地区"), ("address", "地址")):
            if extra[k] and not l[k]:
                l[k] = extra[k][:200]
                filled.append(label)
        if filled:
            l["contact_source"] = "；".join(x for x in (l["contact_source"], src) if x)
            print("  sales/leads/%s: %s + %s" % (name, cid, " / ".join(filled)))
    return out


def load_previews():
    """sales/leads/*.json 的 "previews"：做好的免费样板（网址公开；密码用工作台的公钥加密，repo 公开也看不到）。"""
    folder = os.path.join(HERE, "..", "sales", "leads")
    out = {}
    if not os.path.isdir(folder):
        return []
    for name in sorted(os.listdir(folder)):
        if not name.endswith(".json") or name == "inbox.json":
            continue
        for pv in load_json(os.path.join(folder, name)).get("previews", []):
            slug, url, enc = (str(pv.get(k, "")).strip() for k in ("slug", "url", "enc"))
            if not re.match(r"^[a-z0-9-]{4,80}$", slug) or not url.startswith("https://") or len(enc) < 40:
                raise SystemExit("sales/leads/%s: preview %r needs slug, https url and enc" % (name, slug))
            if not (pv.get("lead_id") or pv.get("instagram")):
                raise SystemExit("sales/leads/%s: preview %s needs lead_id or instagram" % (name, slug))
            out[slug] = {"slug": slug, "url": url, "enc": enc, "lead_id": str(pv.get("lead_id", "")), "instagram": str(pv.get("instagram", "")).lstrip("@"),
                         "name": str(pv.get("name", ""))[:120], "delete_by": str(pv.get("delete_by", ""))[:10], "photos": str(pv.get("photos", ""))[:20]}
    return list(out.values())


def build_knowledge():
    src = os.path.join(HERE, "..", "sales", "agent", "knowledge.md")
    dst = os.path.join(HERE, "netlify", "functions", "chat", "knowledge.mjs")
    if not os.path.exists(src):
        print("  ! knowledge.md not found, chat knowledge not updated")
        return
    text = open(src, encoding="utf-8").read()
    ig = load_json(os.path.join(HERE, "studio.json"))["instagram"]["handle"]
    content = ("// 自动产生 —— 不要手动改。改 sales/agent/knowledge.md 或 site/studio.json，然后跑 python3 site/build.py\n"
               "export const KNOWLEDGE = " + json.dumps(text, ensure_ascii=False) + ";\n"
               "export const IG_HANDLE = " + json.dumps(ig) + ";\n")
    leads = load_leads()
    previews = load_previews()
    scripts_src = os.path.join(HERE, "..", "sales", "scripts.md")
    scripts = open(scripts_src, encoding="utf-8").read() if os.path.exists(scripts_src) else ""
    outputs = {
        dst: content,
        os.path.join(HERE, "netlify", "functions", "desk", "scripts.mjs"):
            "// 自动产生 —— 不要手动改。改 sales/scripts.md，然后跑 python3 site/build.py\nexport const SCRIPTS = " + json.dumps(scripts, ensure_ascii=False) + ";\n",
        os.path.join(HERE, "netlify", "functions", "desk", "inbox.mjs"):
            "// 自动产生 —— 不要手动改。改 sales/leads/*.json，然后跑 python3 site/build.py\nexport const INBOX = " + json.dumps(leads, ensure_ascii=False, indent=1) + ";\n"
            + "export const PREVIEWS = " + json.dumps(previews, ensure_ascii=False, indent=1) + ";\n",
        # 同一份资料的 JSON 版：工作台直接从 GitHub 的 leads 分支读取它，所以每天的新商家不用部署（不扣 Netlify 点数）
        os.path.join(HERE, "..", "sales", "leads", "inbox.json"):
            json.dumps({"note": "自动产生，不要手动改（python3 site/build.py）", "leads": leads, "previews": previews}, ensure_ascii=False, indent=1) + "\n",
    }
    for path, text_ in outputs.items():
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
        if old != text_:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text_)
            print("  " + os.path.relpath(path, HERE) + " updated")


def main():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    studio_data = load_json(os.path.join(HERE, "studio.json"))
    # shared assets
    shutil.copytree(os.path.join(HERE, "assets"), os.path.join(DIST, "assets"))
    calc_js = os.path.join(HERE, "..", "wp", "agency-core", "assets", "js", "fee-calculator.js")
    shutil.copy(calc_js, os.path.join(DIST, "assets", "js", "fee-calculator.js"))
    stores = [Store(s, studio_data) for s in ORDER]
    n = 0
    for st in stores:
        n += st.build()
    n += Studio(studio_data, stores).build()
    build_knowledge()
    # sales desk (private tool, password-protected by the /api/desk function)
    shutil.copytree(os.path.join(HERE, "desk"), os.path.join(DIST, "desk"))
    # robots (studio pages only; demos and the desk are noindex)
    write("robots.txt", "User-agent: *\nDisallow: /demo/\nDisallow: /desk/\n")
    files = sum(len(f) for _, _, f in os.walk(DIST))
    print(f"built {n} pages, {files} files → {DIST}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--preview":
        build_preview(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
    else:
        sys.exit(main())
