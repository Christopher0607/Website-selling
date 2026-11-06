#!/usr/bin/env python3
"""
make-home-page.py — 用一个 JSON 产生网店首页（热卖网店常见的结构）：
  大图主视觉 → 信任标志横条 → 分类大图 → 热卖商品 → 图文分栏 → （第二个图文分栏）→ 更多商品 → 深色 WhatsApp 区 → FAQ

用法:
  python3 scripts/local/make-home-page.py sites/demo-rimbun/home.json sites/demo-rimbun/content/home.html
  python3 scripts/local/make-home-page.py sites/master/home.json wp/content/store/home.html

图片：content/images/hero.jpg（主视觉）、lifestyle.jpg、story.jpg 等，用 {{IMG:名字}} 引用（见 build-pages.php）。
"""
import json, sys, html
def esc(t): return html.escape(t, quote=False)
def cover(d):
    def one(i, t, u):
        if i:
            return '<!-- wp:button {"className":"is-style-outline"} -->\n<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="' + u + '">' + esc(t) + '</a></div>\n<!-- /wp:button -->'
        return '<!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="' + u + '">' + esc(t) + '</a></div>\n<!-- /wp:button -->'
    btns = "".join(one(i, t, u) for i, (t, u) in enumerate(d["buttons"]))
    cls = "agc-cover" + (" agc-cover-center" if d.get("center") else "")
    return f'''<!-- wp:cover {{"url":"{{{{IMG:hero:full}}}}","dimRatio":50,"minHeight":80,"minHeightUnit":"vh","align":"full","className":"{cls}"}} -->
<div class="wp-block-cover alignfull {cls}" style="min-height:80vh"><span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span><img class="wp-block-cover__image-background" alt="{esc(d["hero_alt"])}" src="{{{{IMG:hero:full}}}}" data-object-fit="cover" fetchpriority="high"/><div class="wp-block-cover__inner-container"><!-- wp:group {{"className":"agc-cover-text","layout":{{"type":"default"}}}} -->
<div class="wp-block-group agc-cover-text"><!-- wp:paragraph {{"className":"agc-eyebrow"}} -->
<p class="agc-eyebrow">{esc(d["eyebrow"])}</p>
<!-- /wp:paragraph -->
<!-- wp:heading {{"level":1}} -->
<h1 class="wp-block-heading">{esc(d["h1"])}</h1>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>{esc(d["sub"])}</p>
<!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons">{btns}</div>
<!-- /wp:buttons --></div>
<!-- /wp:group --></div></div>
<!-- /wp:cover -->'''
def head(eyebrow, title, more=None, center=False):
    m = f'\n<!-- wp:paragraph {{"className":"agc-more"}} -->\n<p class="agc-more"><a href="{more[1]}">{esc(more[0])} →</a></p>\n<!-- /wp:paragraph -->' if more else ""
    cls = "agc-head" + (" agc-center" if center else "")
    return f'''<!-- wp:group {{"className":"{cls}","layout":{{"type":"default"}}}} -->
<div class="wp-block-group {cls}"><!-- wp:group {{"layout":{{"type":"default"}}}} -->
<div class="wp-block-group"><!-- wp:paragraph {{"className":"agc-eyebrow"}} -->
<p class="agc-eyebrow">{esc(eyebrow)}</p>
<!-- /wp:paragraph -->
<!-- wp:heading -->
<h2 class="wp-block-heading">{esc(title)}</h2>
<!-- /wp:heading --></div>
<!-- /wp:group -->{m}</div>
<!-- /wp:group -->'''
def section(inner, cls="agc-section", width="1240px"):
    return f'''<!-- wp:group {{"className":"{cls}","layout":{{"type":"constrained","contentSize":"{width}"}}}} -->
<div class="wp-block-group {cls}">{inner}</div>
<!-- /wp:group -->'''
def sc(code): return f"<!-- wp:shortcode -->\n{code}\n<!-- /wp:shortcode -->"
def p(t, cls=None): 
    a = f' {{"className":"{cls}"}}' if cls else ""
    c = f' class="{cls}"' if cls else ""
    return f"<!-- wp:paragraph{a} -->\n<p{c}>{t}</p>\n<!-- /wp:paragraph -->"
def split(d, reverse=False):
    img = f'''<!-- wp:column {{"width":"50%"}} -->
<div class="wp-block-column" style="flex-basis:50%"><!-- wp:image {{"sizeSlug":"large"}} -->
<figure class="wp-block-image size-large"><img src="{{{{IMG:{d["img"]}}}}}" alt="{esc(d["alt"])}" loading="lazy"/></figure>
<!-- /wp:image --></div>
<!-- /wp:column -->'''
    items = "".join(f"<li>{esc(x)}</li>" for x in d["list"])
    txt = f'''<!-- wp:column {{"width":"50%"}} -->
<div class="wp-block-column" style="flex-basis:50%">{p(esc(d["eyebrow"]),"agc-eyebrow")}
<!-- wp:heading -->
<h2 class="wp-block-heading">{esc(d["title"])}</h2>
<!-- /wp:heading -->
{p(esc(d["text"]))}
<!-- wp:list {{"className":"{d.get("list_class","")}"}} -->
<ul class="wp-block-list {d.get("list_class","")}">{items}</ul>
<!-- /wp:list -->
<!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="{d["btn"][1]}">{esc(d["btn"][0])}</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column -->'''
    cols = (txt + img) if reverse else (img + txt)
    return section(f'<!-- wp:columns -->\n<div class="wp-block-columns">{cols}</div>\n<!-- /wp:columns -->', "agc-section agc-split" + (" agc-section-alt" if d.get("alt_bg") else ""))
def band(d):
    return section(p(esc(d["eyebrow"]),"agc-eyebrow") + f'''
<!-- wp:heading -->
<h2 class="wp-block-heading">{esc(d["title"])}</h2>
<!-- /wp:heading -->
''' + p(esc(d["text"])) + "\n" + sc(f'<p>[agc_whatsapp text="{d["btn"]}" message="{d.get("msg","")}"]</p>' if d.get("msg") else f'<p>[agc_whatsapp text="{d["btn"]}"]</p>'), "agc-section agc-band agc-center", "760px")
def faq(title, items):
    det = "".join(f'''
<!-- wp:details -->
<details class="wp-block-details"><summary>{esc(q)}</summary><!-- wp:paragraph -->
<p>{esc(a)}</p>
<!-- /wp:paragraph --></details>
<!-- /wp:details -->''' for q,a in items)
    return section(head("FAQ", title, center=True) + det, "agc-section agc-faq", "760px")
def build(d):
    parts = ['<!-- page: title="Home" slug="home" menu="primary" order="0" front="1" -->', cover(d["cover"]),
             section(sc("[agc_trust_bar]"), "agc-strip", "1240px"),
             section(head(*d["cats_head"]) + "\n" + sc('[product_categories number="4" columns="4" hide_empty="1" orderby="name"]'), "agc-section agc-cats agc-section-tight"),
             section(head(*d["best_head"], ("Shop all", "{{SHOP_URL}}")) + "\n" + sc('[products limit="4" columns="4" visibility="featured" orderby="menu_order"]')),
             split(d["split"]),
             section(head(*d["more_head"], ("View all", "{{SHOP_URL}}")) + "\n" + sc(d.get("more_sc", '[products limit="4" columns="4" orderby="date" order="DESC"]'))),
             band(d["band"]),
             faq(d["faq_title"], d["faq"])]
    if d.get("split2"): parts.insert(6, split(d["split2"], reverse=True))
    return "\n\n".join(parts) + "\n"
d = json.load(open(sys.argv[1], encoding="utf-8"))
open(sys.argv[2], "w", encoding="utf-8").write(build(d))
