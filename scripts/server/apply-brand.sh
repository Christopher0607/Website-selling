#!/usr/bin/env bash
# apply-brand.sh — 套用 brand-config.json：名称、标语、颜色、字体、logo、WhatsApp、公司资料、运费、模式
# 可以重复执行（改了 brand-config.json 再跑一次就好）
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"

usage() {
  cat <<EOF
用法: sudo $0 <站点代号> <brand-config.json>

brand-config.json 的格式见 templates/brand-config.json。
logo / 图标路径是相对于 brand-config.json 所在的文件夹。
mode：demo（样板，公开+noindex+Demo 模式）、preview（潜在客户样板）、staging（客户测试站）、live（正式站，允许收录）
EOF
}
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; CFG="$(readlink -f "$2")"
require_root
start_log "$@"
need_cmd jq
[[ -f "$CFG" ]] || die "找不到 $2"
jq empty "$CFG" 2>/dev/null || die "$2 不是正确的 JSON（用 jq . $2 看哪里错）"
load_site "$SLUG_ARG"
MODE_IN="$(jq -r '.mode // "demo"' "$CFG")"
[[ "$MODE_IN" =~ ^(demo|preview|staging|live)$ ]] || die "mode 只能是 demo / preview / staging / live"

# 把设定和图片复制到站点用户读得到的临时文件夹
WORK="$SITE_HOME/tmp/brand-$$"
mkdir -p "$WORK/assets"
cp "$CFG" "$WORK/brand-config.json"
cp "$AGENCY_ROOT/scripts/server/php/apply-brand.php" "$WORK/apply-brand.php"
CFG_DIR="$(dirname "$CFG")"
for key in logo site_icon; do
  rel="$(jq -r ".assets.$key // empty" "$CFG")"
  [[ -z "$rel" ]] && continue
  src="$rel"; [[ "$rel" != /* ]] && src="$CFG_DIR/$rel"
  if [[ -f "$src" ]]; then
    mkdir -p "$WORK/$(dirname "$rel")" 2>/dev/null || true
    if [[ "$rel" == /* ]]; then
      cp "$src" "$WORK/assets/$(basename "$src")"
      tmp="$(mktemp)"; jq --arg k "$key" --arg v "assets/$(basename "$src")" '.assets[$k]=$v' "$WORK/brand-config.json" > "$tmp" && mv "$tmp" "$WORK/brand-config.json"
    else
      cp "$src" "$WORK/$rel"
    fi
  else
    warn "找不到 $key 文件：$src（跳过）"
  fi
done
chown -R "$SITE_USER:$SITE_USER" "$WORK"
trap 'rm -rf "$WORK"' EXIT

info "套用品牌到 $SLUG_ARG（$DOMAIN，mode=$MODE_IN）"
wpx "$SLUG_ARG" eval-file "$WORK/apply-brand.php" "$WORK/brand-config.json" || die "套用失败，看上面的错误信息"

# 搜索引擎：只有 live 不加 noindex 标头
NEW_NOI=1; [[ "$MODE_IN" == live ]] && NEW_NOI=0
set_reg "$SLUG_ARG" MODE "$MODE_IN"
set_reg "$SLUG_ARG" NOINDEX "$NEW_NOI"
render_nginx "$SLUG_ARG"; reload_web
clear_cache "$SLUG_ARG"
ok "完成：$(site_url "$SLUG_ARG")"
