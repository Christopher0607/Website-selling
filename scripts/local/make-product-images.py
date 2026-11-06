#!/usr/bin/env python3
"""
make-product-images.py — 用程式画简单的产品插图（样板站用，原创、可以商用，不用找图库）

用法:
  python3 scripts/local/make-product-images.py <images.json> <输出文件夹>

images.json 格式:
{
  "background": "#F3EEE7",
  "font": "Inter",
  "images": [
    {"file": "serum.webp", "shape": "dropper", "body": "#2F5D50", "cap": "#1F1F1F",
     "label": "#FFFFFF", "title": "GLOW", "sub": "Vitamin C Serum", "bg": "#E8DCCB"},
    {"file": "hero.webp", "kind": "hero", "items": ["serum.webp", "cream.webp", "toner.webp"], "bg": "#E8DCCB"}
  ]
}

shape 可选: bottle, dropper, jar, tube, pump, box, pouch, bag, tin, cup, sachet, tag, fabric
需要: rsvg-convert（librsvg2-bin）和 cwebp（webp）。
产生的图片写进输出文件夹的 image-sources.md（来源：程式产生的原创插图）。
"""
import json
import os
import subprocess
import sys
import tempfile
from html import escape

W = 1200


def shade(hex_color, f):
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    if f < 0:
        r, g, b = [int(c * (1 + f)) for c in (r, g, b)]
    else:
        r, g, b = [int(c + (255 - c) * f) for c in (r, g, b)]
    return "#%02X%02X%02X" % (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))


def label_text(cx, cy, title, sub, color, font, size=1.0):
    t = escape(title or "")
    s = escape(sub or "")
    out = f'<text x="{cx}" y="{cy}" text-anchor="middle" font-family="{font}" font-weight="700" font-size="{int(46*size)}" letter-spacing="{int(6*size)}" fill="{color}">{t}</text>'
    if s:
        out += f'<text x="{cx}" y="{cy + int(44*size)}" text-anchor="middle" font-family="{font}" font-size="{int(24*size)}" fill="{color}" fill-opacity="0.85">{s}</text>'
    return out


def product(spec, font, cx=600, base=1010, k=1.0):
    """Return SVG elements for one product centred at cx, standing on y=base, scaled by k."""
    shape = spec.get("shape", "bottle")
    body = spec.get("body", "#2F5D50")
    cap = spec.get("cap", shade(body, -0.35))
    lab = spec.get("label", "#FFFFFF")
    title, sub = spec.get("title", ""), spec.get("sub", "")
    hl = shade(body, 0.25)
    dk = shade(body, -0.18)

    def S(v):
        return v * k

    g = []
    # shadow
    g.append(f'<ellipse cx="{cx}" cy="{base}" rx="{S(230)}" ry="{S(26)}" fill="#000" fill-opacity="0.10"/>')
    if shape in ("bottle", "dropper", "pump"):
        bw, bh = S(300), S(520)
        x, y = cx - bw / 2, base - bh
        g.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{S(46)}" fill="{body}"/>')
        g.append(f'<rect x="{x + S(24)}" y="{y + S(30)}" width="{S(34)}" height="{bh - S(80)}" rx="{S(17)}" fill="{hl}" fill-opacity="0.45"/>')
        nw = S(120)
        g.append(f'<rect x="{cx - nw/2}" y="{y - S(50)}" width="{nw}" height="{S(60)}" rx="{S(10)}" fill="{dk}"/>')
        if shape == "dropper":
            g.append(f'<rect x="{cx - S(70)}" y="{y - S(150)}" width="{S(140)}" height="{S(110)}" rx="{S(18)}" fill="{cap}"/>')
            g.append(f'<rect x="{cx - S(42)}" y="{y - S(250)}" width="{S(84)}" height="{S(110)}" rx="{S(42)}" fill="{cap}"/>')
        elif shape == "pump":
            g.append(f'<rect x="{cx - S(60)}" y="{y - S(150)}" width="{S(120)}" height="{S(100)}" rx="{S(14)}" fill="{cap}"/>')
            g.append(f'<rect x="{cx - S(18)}" y="{y - S(230)}" width="{S(36)}" height="{S(90)}" fill="{cap}"/>')
            g.append(f'<rect x="{cx - S(18)}" y="{y - S(240)}" width="{S(150)}" height="{S(34)}" rx="{S(12)}" fill="{cap}"/>')
        else:
            g.append(f'<rect x="{cx - S(80)}" y="{y - S(150)}" width="{S(160)}" height="{S(110)}" rx="{S(14)}" fill="{cap}"/>')
        g.append(f'<rect x="{x + S(30)}" y="{y + S(170)}" width="{bw - S(60)}" height="{S(200)}" rx="{S(12)}" fill="{lab}" fill-opacity="0.16"/>')
        g.append(label_text(cx, y + S(265), title, sub, lab, font, k))
    elif shape in ("jar", "tin"):
        bw, bh = S(420), S(300)
        x, y = cx - bw / 2, base - bh
        g.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{S(40)}" fill="{body}"/>')
        g.append(f'<rect x="{x - S(10)}" y="{y - S(110)}" width="{bw + S(20)}" height="{S(120)}" rx="{S(26)}" fill="{cap}"/>')
        g.append(f'<rect x="{x + S(22)}" y="{y + S(26)}" width="{S(30)}" height="{bh - S(60)}" rx="{S(15)}" fill="{hl}" fill-opacity="0.45"/>')
        g.append(label_text(cx, y + S(150), title, sub, lab, font, k))
    elif shape == "tube":
        bw, bh = S(260), S(620)
        x, y = cx - bw / 2, base - bh
        g.append(f'<rect x="{cx - S(90)}" y="{base - S(110)}" width="{S(180)}" height="{S(110)}" rx="{S(16)}" fill="{cap}"/>')
        g.append(f'<path d="M{x} {y} L{x + bw} {y} L{cx + S(100)} {base - S(100)} L{cx - S(100)} {base - S(100)} Z" fill="{body}"/>')
        g.append(f'<rect x="{x - S(6)}" y="{y - S(24)}" width="{bw + S(12)}" height="{S(30)}" rx="{S(6)}" fill="{dk}"/>')
        g.append(label_text(cx, y + S(250), title, sub, lab, font, k * 0.9))
    elif shape in ("box", "tag"):
        bw, bh = S(440), S(560) if shape == "box" else S(420)
        x, y = cx - bw / 2, base - bh
        g.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{S(10)}" fill="{body}"/>')
        g.append(f'<rect x="{x + bw - S(70)}" y="{y}" width="{S(70)}" height="{bh}" fill="{dk}" fill-opacity="0.5"/>')
        g.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{S(60)}" fill="{cap}"/>')
        g.append(label_text(cx - S(30), y + bh / 2, title, sub, lab, font, k))
    elif shape in ("pouch", "sachet"):
        bw, bh = S(420), S(560)
        x, y = cx - bw / 2, base - bh
        g.append(f'<path d="M{x + S(20)} {y} L{x + bw - S(20)} {y} Q{x + bw + S(10)} {base - S(200)} {x + bw - S(10)} {base} L{x + S(10)} {base} Q{x - S(10)} {base - S(200)} {x + S(20)} {y} Z" fill="{body}"/>')
        g.append(f'<rect x="{x + S(20)}" y="{y}" width="{bw - S(40)}" height="{S(46)}" fill="{cap}"/>')
        g.append(f'<circle cx="{cx}" cy="{y + S(80)}" r="{S(14)}" fill="{dk}"/>')
        g.append(label_text(cx, y + S(300), title, sub, lab, font, k))
    elif shape == "bag":
        bw, bh = S(460), S(480)
        x, y = cx - bw / 2, base - bh
        g.append(f'<path d="M{cx - S(110)} {y} Q{cx} {y - S(220)} {cx + S(110)} {y}" stroke="{cap}" stroke-width="{S(22)}" fill="none"/>')
        g.append(f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" rx="{S(18)}" fill="{body}"/>')
        g.append(label_text(cx, y + S(250), title, sub, lab, font, k))
    elif shape == "fabric":
        # 叠好的布（头巾 / 衣服）：三层，带花纹
        alt = spec.get("pattern", lab)
        for i, (w_, h_) in enumerate([(S(440), S(150)), (S(425), S(150)), (S(410), S(150))]):
            yy = base - S(150) * (i + 1) - S(6) * i
            col = body if i != 1 else shade(body, 0.12)
            g.append(f'<rect x="{cx - w_/2}" y="{yy}" width="{w_}" height="{h_}" rx="{S(26)}" fill="{col}"/>')
            for j in range(7):
                g.append(f'<circle cx="{cx - w_/2 + S(50) + j*S(70)}" cy="{yy + h_/2}" r="{S(9)}" fill="{alt}" fill-opacity="0.35"/>')
        top = base - S(462)
        g.append(f'<path d="M{cx - S(200)} {top + S(20)} Q{cx} {top - S(70)} {cx + S(200)} {top + S(20)}" fill="{shade(body, -0.1)}"/>')
        g.append(f'<rect x="{cx - S(150)}" y="{base - S(250)}" width="{S(300)}" height="{S(110)}" rx="{S(10)}" fill="{cap}"/>')
        g.append(label_text(cx, base - S(198), title, sub, lab, font, k * 0.75))
    elif shape == "cup":
        bw, bh = S(360), S(420)
        x, y = cx - bw / 2, base - bh
        g.append(f'<path d="M{x} {y} L{x + bw} {y} L{x + bw - S(50)} {base} L{x + S(50)} {base} Z" fill="{body}"/>')
        g.append(f'<rect x="{x - S(16)}" y="{y - S(50)}" width="{bw + S(32)}" height="{S(56)}" rx="{S(16)}" fill="{cap}"/>')
        g.append(label_text(cx, y + S(220), title, sub, lab, font, k * 0.9))
    return "".join(g)


def svg_wrap(w, h, bg, inner):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{bg}"/>'
            f'<circle cx="{w*0.82}" cy="{h*0.18}" r="{h*0.32}" fill="#FFFFFF" fill-opacity="0.22"/>'
            f'{inner}</svg>')


def render(svg, out_path, width):
    with tempfile.TemporaryDirectory() as d:
        s, p = os.path.join(d, "a.svg"), os.path.join(d, "a.png")
        with open(s, "w", encoding="utf-8") as fh:
            fh.write(svg)
        subprocess.run(["rsvg-convert", "-w", str(width), s, "-o", p], check=True)
        subprocess.run(["cwebp", "-quiet", "-q", "80", "-metadata", "none", p, "-o", out_path], check=True)


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)
    font = spec.get("font", "Inter")
    default_bg = spec.get("background", "#F3EEE7")
    by_file = {i["file"]: i for i in spec["images"]}
    lines = ["# 图片来源 Image sources", "",
             "| 文件 | 来源 | 授权 |", "|---|---|---|"]
    for img in spec["images"]:
        bg = img.get("bg", default_bg)
        path = os.path.join(out, img["file"])
        if img.get("kind") == "hero":
            items = [by_file[f] for f in img.get("items", []) if f in by_file][:3]
            w, h = 1600, 1200
            parts = []
            pos = [(480, 1080, 1.0), (930, 1100, 0.78), (1290, 1100, 0.62)]
            for spec_i, (cx, base, k) in reversed(list(zip(items, pos))):
                parts.append(product(spec_i, font, cx, base, k))
            render(svg_wrap(w, h, bg, "".join(parts)), path, w)
        else:
            render(svg_wrap(W, W, bg, product(img, font)), path, W)
        size = os.path.getsize(path) // 1024
        print(f"  {img['file']}  {size} KB")
        lines.append(f"| {img['file']} | 程式产生的原创插图（scripts/local/make-product-images.py） | 原创，可商用 |")
    with open(os.path.join(out, "..", "image-sources.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
