#!/usr/bin/env bash
# optimize-images.sh — jpg / png 转 WebP、缩小、去掉 EXIF（客户给的产品照片上传前先跑）
set -euo pipefail
usage() { echo "用法: $0 <输入文件夹> <输出文件夹> [--max 1600] [--quality 80]"; }
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
IN="$1"; OUT="$2"; shift 2; MAX=1600; Q=80
while [[ $# -gt 0 ]]; do case "$1" in --max) MAX="$2"; shift 2;; --quality) Q="$2"; shift 2;; *) usage; exit 1;; esac; done
command -v convert >/dev/null && command -v cwebp >/dev/null || { echo "需要 imagemagick 和 webp"; exit 1; }
mkdir -p "$OUT"
total_in=0; total_out=0; n=0
shopt -s nullglob nocaseglob
for f in "$IN"/*.{jpg,jpeg,png,webp}; do
  name="$(basename "${f%.*}")"
  # 文件名：小写、空格换连字符（网址比较干净）
  clean="$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g; s/^-//; s/-$//')"
  tmp="$(mktemp --suffix=.png)"
  convert "$f" -auto-orient -strip -resize "${MAX}x${MAX}>" "$tmp"
  cwebp -quiet -q "$Q" -metadata none "$tmp" -o "$OUT/$clean.webp"
  rm -f "$tmp"
  a=$(stat -c %s "$f"); b=$(stat -c %s "$OUT/$clean.webp")
  total_in=$((total_in+a)); total_out=$((total_out+b)); n=$((n+1))
  printf "  %-40s %6d KB → %5d KB%s\n" "$(basename "$f")" $((a/1024)) $((b/1024)) "$([[ $b -gt 204800 ]] && echo '  ⚠ 超过 200 KB，可试 --quality 70')"
done
[[ $n -eq 0 ]] && { echo "没有找到 jpg / png / webp"; exit 1; }
echo "完成 $n 张：$((total_in/1024)) KB → $((total_out/1024)) KB"
