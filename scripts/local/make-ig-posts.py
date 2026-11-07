#!/usr/bin/env python3
"""
make-ig-posts.py — 产生 Instagram 开场贴文（9 张，1080×1350，刚好排成九宫格）+ 文案

    python3 scripts/local/make-ig-posts.py          # 写 content/ig-launch/posts.html
    node scripts/local/render-ig-posts.js           # 截图成 content/ig-launch/01.jpg … 09.jpg

资料来自 site/studio.json 和 site/templates/*/template.json（改价格或模板后重新跑就会更新）。
模板截图来自 site/assets/shots/（site/tools/screenshots.js 产生）。
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "content", "ig-launch")
ORDER = ["dewlane", "plainfold", "chili-pantry", "lowlight", "tailmate", "voltnest"]
SHOTS = "../../site/assets/shots/"


def e(s):
    return html.escape(str(s))


def main():
    studio = json.load(open(os.path.join(ROOT, "site", "studio.json"), encoding="utf-8"))
    tpls = [json.load(open(os.path.join(ROOT, "site", "templates", s, "template.json"), encoding="utf-8")) for s in ORDER]
    site = studio["site_url"].replace("https://", "")
    ig = studio["instagram"]["handle"]
    pk = {p["id"]: p for p in studio["packages"]}
    posts = []

    # 1 — intro
    phones = "".join(f'<img class="ph ph{i}" src="{SHOTS}{s}-mobile.webp">' for i, s in enumerate(["plainfold", "dewlane", "lowlight"]))
    posts.append(f"""<section class="post intro"><p class="kick">For Shopee &amp; TikTok Shop brands in Malaysia</p>
<h1>Your own online store,<br><em>built for repeat customers.</em></h1><p class="zh">帮 Shopee / TikTok 品牌卖家做自己的网店</p>
<div class="phones">{phones}</div><p class="foot">{e(site)} · @{e(ig)}</p></section>""")

    # 2–7 — templates
    for i, (slug, t) in enumerate(zip(ORDER, tpls), start=1):
        sw = "".join(f'<i style="background:{c}"></i>' for c in t["swatches"])
        posts.append(f"""<section class="post tpl" style="--bg:{t['fav_bg']}"><div class="tpl__shots"><img class="desk" src="{SHOTS}{slug}-desktop.webp"><img class="mob" src="{SHOTS}{slug}-mobile.webp"></div>
<div class="tpl__card"><p class="kick">Template {i} / 6 <span class="sw">{sw}</span></p><h2>{e(t['name'])}</h2><p class="style">{e(t['style'])} · {e(t['category'])}</p>
<p class="best"><b>Best for:</b> {e(t['best_for'])}</p><p class="note">Concept store · fictional brand · try it on your phone: {e(site)}/demo/{slug}/</p></div></section>""")

    # 8 — pricing
    rows = "".join(f"""<div class="pk{' pk--hl' if p.get('highlight') else ''}"><h3>{e(p['name'])}</h3><p class="pk__p">RM{p['price']:,}</p><p class="pk__m">{e(p['meta'])}</p></div>""" for p in studio["packages"])
    care = studio["care"]["plans"]
    posts.append(f"""<section class="post price"><p class="kick">Fixed prices · 价格写清楚</p><h2>One-time setup.<br>No surprises.</h2><div class="pks">{rows}</div>
<p class="care">Monthly Care from <b>RM{care[0]['price']}</b> — hosting, backups, updates, small edits.<br><b>First month free</b> after launch · 上线后第一个月维护免费</p>
<p class="foot">Domain &amp; payment gateway in your own name · full list: {e(site)}/pricing.html</p></section>""")

    # 9 — free mockup
    posts.append(f"""<section class="post mock"><p class="kick">Free · no obligation · 免费、不用承诺</p><h2>See your brand on it<br>before you decide.</h2>
<ol class="steps"><li><b>1</b><span>DM us your Shopee / TikTok / IG link<small>私信你的店铺链接</small></span></li><li><b>2</b><span>Pick one of the 6 templates<small>选一个喜欢的模板</small></span></li><li><b>3</b><span>Get a private homepage mockup with your products in 1–2 working days<small>1–2 个工作天收到你的品牌样板</small></span></li></ol>
<p class="cta">DM “MOCKUP” to @{e(ig)}</p><p class="foot">Not going ahead? We delete it within 14 days.</p></section>""")

    css = """
*{box-sizing:border-box;margin:0}body{background:#ddd;font-family:Inter,'Noto Sans SC',sans-serif;color:#14171c}
.post{width:1080px;height:1350px;position:relative;overflow:hidden;padding:84px 80px;background:#f7f4ee;margin:0 0 40px}
h1,h2,h3{font-family:'Bricolage Grotesque',Inter,sans-serif;letter-spacing:-.035em;line-height:1.02}
h1{font-size:92px;font-weight:800}h1 em{font-style:normal;color:#ff5a2c}h2{font-size:96px;font-weight:800}
.kick{font-size:26px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e0441a;margin-bottom:26px;display:flex;align-items:center;gap:16px}
.zh{font-size:40px;font-weight:600;color:#5d6470;margin-top:22px}.foot{position:absolute;left:80px;right:80px;bottom:56px;font-size:24px;color:#5d6470}
.phones{position:absolute;left:0;right:0;top:500px;height:660px}
.ph{position:absolute;width:290px;border-radius:40px;border:11px solid #111;box-shadow:0 40px 80px rgba(0,0,0,.3);background:#111}
.ph0{left:150px;top:60px;transform:rotate(-7deg)}.ph1{left:395px;top:0;z-index:2}.ph2{right:150px;top:70px;transform:rotate(7deg)}
.intro .foot{font-size:28px;font-weight:600;color:#14171c;text-align:center}
.tpl{background:var(--bg);padding:0}
.tpl__shots{position:absolute;left:0;right:0;top:0;height:860px}
.desk{position:absolute;left:60px;top:70px;width:900px;border-radius:14px;box-shadow:0 30px 70px rgba(0,0,0,.35)}
.mob{position:absolute;right:56px;top:250px;width:300px;border-radius:38px;border:10px solid #111;box-shadow:0 30px 70px rgba(0,0,0,.4);background:#111}
.tpl__card{position:absolute;left:0;right:0;bottom:0;height:500px;background:#f7f4ee;padding:56px 80px;border-radius:44px 44px 0 0}
.tpl__card h2{font-size:104px}.style{font-size:36px;font-weight:600;margin-top:10px}.best{font-size:30px;color:#3a3f47;margin-top:26px;line-height:1.35}
.note{position:absolute;left:80px;right:80px;bottom:50px;font-size:24px;color:#5d6470}
.sw{display:inline-flex}.sw i{width:30px;height:30px;border-radius:50%;border:3px solid #f7f4ee;margin-left:-8px;box-shadow:0 0 0 1px rgba(0,0,0,.15)}
.price{background:#14171c;color:#f1eee8}.price .kick{color:#ff8a65}.price h2{color:#fff}
.pks{display:grid;gap:22px;margin-top:56px}.pk{display:grid;grid-template-columns:1fr auto;align-items:baseline;background:#1f232a;border-radius:26px;padding:30px 36px;border:2px solid #2c313a}
.pk--hl{border-color:#ff5a2c}.pk h3{font-size:46px}.pk__p{font:800 64px 'Bricolage Grotesque';letter-spacing:-.04em;color:#fff}.pk__m{grid-column:1/-1;font-size:26px;color:#a9afb9;margin-top:6px}
.care{font-size:31px;line-height:1.45;margin-top:46px;color:#d9dde3}.care b{color:#ff8a65}.price .foot{color:#8a919c}
.mock{background:#ff5a2c;color:#fff}.mock .kick{color:#fff;opacity:.9}.mock h2{color:#fff}
.steps{list-style:none;padding:0;margin-top:70px;display:grid;gap:34px}.steps li{display:flex;gap:28px;align-items:flex-start;font-size:36px;font-weight:600;line-height:1.25}
.steps b{flex:none;width:72px;height:72px;border-radius:50%;background:#fff;color:#ff5a2c;display:grid;place-items:center;font:800 38px 'Bricolage Grotesque'}
.steps small{display:block;font-size:28px;font-weight:500;opacity:.85;margin-top:6px}
.cta{margin-top:80px;display:inline-block;background:#14171c;color:#fff;font:800 44px 'Bricolage Grotesque';padding:26px 40px;border-radius:999px}.mock .foot{color:#ffe1d6}
"""
    page = f"""<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@500;600;700&display=swap">
<style>{css}</style></head><body>{''.join(posts)}</body></html>"""
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "posts.html"), "w", encoding="utf-8").write(page)
    print(f"{len(posts)} posts → content/ig-launch/posts.html")


if __name__ == "__main__":
    main()
