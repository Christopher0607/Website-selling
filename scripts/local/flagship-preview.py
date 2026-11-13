#!/usr/bin/env python3
"""Build a customer's mockup from one of the 4 flagship demos (2026-11-13).

The mockup is an adapted copy of a demo in clients/<code>/preview/src/ (layout.html, pages/*.html, style.css, app.js,
img/), made for one real shop: their name, menu, hours, address, WhatsApp and photos. This script puts the pages
together the same way site/build.py does for the demos (layout + page), without the studio's visitor counter or
asset versions, into clients/<code>/preview/site/. scripts/local/preview-publish.js then encrypts it with the mockup
password and publishes it (it runs this script itself when preview.json has "flagship").

Usage: python3 scripts/local/flagship-preview.py clients/<code>/preview/preview.json
clients/*/preview/ is not in git (customers' material).
"""
import html
import json
import os
import re
import shutil
import sys


def main(cfg_path):
    cfg = json.load(open(cfg_path, encoding="utf-8"))
    base = os.path.dirname(os.path.abspath(cfg_path))
    src = os.path.join(base, cfg.get("src", "src"))
    out = os.path.join(base, "site")
    if not os.path.isfile(os.path.join(src, "layout.html")):
        sys.exit(f"no layout.html in {src} (copy a demo from site/flagships/<name>/ there first)")
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    shutil.copytree(os.path.join(src, "img"), os.path.join(out, "img"))
    for f in os.listdir(src):
        if f.endswith((".css", ".js")):
            shutil.copy(os.path.join(src, f), os.path.join(out, f))
    layout = open(os.path.join(src, "layout.html"), encoding="utf-8").read()
    n = 0
    for fn in sorted(os.listdir(os.path.join(src, "pages"))):
        if not fn.endswith(".html"):
            continue
        body = open(os.path.join(src, "pages", fn), encoding="utf-8").read()
        m = re.match(r"\s*<!--(.*?)-->\s*", body, re.S)
        meta = {}
        if m:
            for part in m.group(1).split("\n"):
                if ":" in part:
                    k, v = part.split(":", 1)
                    meta[k.strip()] = v.strip()
            body = body[m.end():]
        page = (layout.replace("{{TITLE}}", html.escape(meta.get("title", cfg.get("brand", {}).get("name", "Mockup"))))
                .replace("{{DESC}}", html.escape(meta.get("description", "")))
                .replace("{{PAGE}}", html.escape(meta.get("page", fn[:-5])))
                .replace("{{BODY}}", body))
        if "{{" in page:
            sys.exit(f"{fn}: a {{{{…}}}} placeholder was left in the page")
        with open(os.path.join(out, fn), "w", encoding="utf-8") as fh:
            fh.write(page)
        n += 1
    print(f"built {n} pages → {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
