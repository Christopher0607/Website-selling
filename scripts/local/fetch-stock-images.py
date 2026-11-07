#!/usr/bin/env python3
"""
fetch-stock-images.py — 下载免费商用图库照片（Pexels），裁切、转 WebP，并写 image-sources.md

用法:
  python3 scripts/local/fetch-stock-images.py <stock.json> <站点文件夹>

stock.json 格式:
{
  "images": [
    {"file": "rb-serum.webp", "pexels": 35909808, "crop": "square", "dest": "images", "note": "Dew Serum 主图"},
    {"file": "hero.jpg",      "pexels": 8101520,  "crop": "wide",   "dest": "content/images"}
  ]
}
  crop: square（1:1，产品图）、portrait（4:5）、wide（16:9，主视觉 / 横幅）、none（只缩小）
  gravity: center（默认）、north（人像，保留头部）、south 等（ImageMagick gravity）
  dest: 相对于站点文件夹的输出位置（默认 images）

授权（2026-11-07 查）：Pexels License —— 免费、可商用、不需要署名；
不可以：原样转售照片、暗示照片中的人或品牌为你的产品代言、用负面方式呈现照片中的人。
所以：样板站（概念作品）用来示范版面没问题；客户正式网站请用客户自己的产品照片。
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

SIZES = {"square": (1200, 1200), "portrait": (1200, 1500), "wide": (1920, 1080), "none": None}


def download(pid, width, dst):
    url = f"https://images.pexels.com/photos/{pid}/pexels-photo-{pid}.jpeg?auto=compress&cs=tinysrgb&w={width}"
    req = urllib.request.Request(url, headers={"User-Agent": "cartsmith-stock-fetch/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(dst, "wb") as fh:
        fh.write(r.read())


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    site = sys.argv[2]
    rows = []
    for img in spec["images"]:
        pid = int(img["pexels"])
        crop = img.get("crop", "square")
        gravity = img.get("gravity", "center")
        dest = os.path.join(site, img.get("dest", "images"))
        os.makedirs(dest, exist_ok=True)
        out = os.path.join(dest, img["file"])
        with tempfile.TemporaryDirectory() as d:
            raw = os.path.join(d, "raw.jpg")
            download(pid, 2000, raw)
            tmp = os.path.join(d, "out.png")
            size = SIZES.get(crop)
            cmd = ["convert", raw, "-auto-orient", "-strip"]
            if size:
                w, h = size
                cmd += ["-resize", f"{w}x{h}^", "-gravity", gravity, "-extent", f"{w}x{h}"]
            else:
                cmd += ["-resize", "1600x1600>"]
            subprocess.run(cmd + [tmp], check=True)
            if out.endswith(".webp"):
                subprocess.run(["cwebp", "-quiet", "-q", "78", "-metadata", "none", tmp, "-o", out], check=True)
            else:
                subprocess.run(["convert", tmp, "-quality", "80", "-interlace", "Plane", out], check=True)
        kb = os.path.getsize(out) // 1024
        print(f"  {img.get('dest', 'images')}/{img['file']:<28} pexels {pid:<10} {crop:<8} {kb} KB")
        rows.append(f"| {img.get('dest', 'images')}/{img['file']} | [Pexels {pid}](https://www.pexels.com/photo/{pid}/) | {img.get('note', '')} | Pexels License（免费商用，不需署名） |")
    with open(os.path.join(site, "image-sources.md"), "w", encoding="utf-8") as fh:
        fh.write("# 图片来源 Image sources\n\n")
        fh.write("> 查证日期 2026-11-07。Pexels License：免费、可商用、不需要署名；不可原样转售、不可暗示照片中的人或品牌代言。\n")
        fh.write("> 这些照片只用在**概念作品（样板站）**示范版面；客户正式网站一律用客户自己的产品照片。\n\n")
        fh.write("| 文件 | 来源 | 用途 | 授权 |\n|---|---|---|---|\n")
        fh.write("\n".join(rows) + "\n")


if __name__ == "__main__":
    main()
