#!/usr/bin/env bash
# build-demo.sh — 建立 / 重建一个样板站：从 master 复制（如果还没有）→ 换成这个品牌的产品、页面、颜色
# 资料都在 sites/<代号>/：brand-config.json、products.csv、images/、content/
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 <样板站代号，例如 demo-rimbun> [--no-ssl]"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift; NEW=()
[[ "${1:-}" == --no-ssl ]] && NEW+=(--no-ssl)
require_root
start_log "$SLUG_ARG"
SRC_DIR="$AGENCY_ROOT/sites/$SLUG_ARG"
[[ -f "$SRC_DIR/brand-config.json" ]] || die "找不到 $SRC_DIR/brand-config.json"
D="$AGENCY_ROOT/scripts/server"
if ! site_exists "$SLUG_ARG"; then
  "$D/clone-site.sh" master "$SLUG_ARG" "$SLUG_ARG.$STUDIO_DOMAIN" --noindex "${NEW[@]}"
fi
ARGS=(--no-plugins --brand "$SRC_DIR/brand-config.json" --force-pages)
[[ -d "$SRC_DIR/content" ]] && ARGS+=(--content "$SRC_DIR/content")
[[ -f "$SRC_DIR/products.csv" ]] && ARGS+=(--products "$SRC_DIR/products.csv" --replace-products)
"$D/install-code.sh" "$SLUG_ARG" both
"$D/setup-store.sh" "$SLUG_ARG" "${ARGS[@]}"
"$D/smoke-test.sh" "$(site_url "$SLUG_ARG")" --site "$SLUG_ARG" | tail -2
