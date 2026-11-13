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

# 节日预购网店（2026-11-13）：sites/<代号>/festive.json 有的话，套用节日设定、运送区域、付款方式、中文语言包、示范订单
if [[ -f "$SRC_DIR/festive.json" ]]; then
  info "节日预购设定（festive.json）"
  site_vars "$SLUG_ARG"
  FW="$SITE_HOME/tmp/festive-$$"; mkdir -p "$FW"
  cp "$SRC_DIR/festive.json" "$AGENCY_ROOT/scripts/server/php/festive-setup.php" "$FW/"
  chown -R "$SITE_USER:$SITE_USER" "$FW"
  mkdir -p "$SITE_HOME/private" && chown "$SITE_USER:$SITE_USER" "$SITE_HOME/private" && chmod 700 "$SITE_HOME/private"
  wpx "$SLUG_ARG" agc import "$FW/festive.json" || die "节日设定失败"
  if grep -q '"language": "zh"' "$SRC_DIR/brand-config.json"; then
    wpx "$SLUG_ARG" language core install zh_CN --activate >/dev/null 2>&1 || warn "WordPress 中文语言包下载失败（网站能用，只是部分字是英文）"
    wpx "$SLUG_ARG" language plugin install woocommerce zh_CN >/dev/null 2>&1 || warn "WooCommerce 中文语言包下载失败"
    wpx "$SLUG_ARG" language theme install kadence zh_CN >/dev/null 2>&1 || true
  fi
  SEED=""; grep -q '"mode": "demo"' "$SRC_DIR/brand-config.json" && SEED="seed"
  wpx "$SLUG_ARG" eval-file "$FW/festive-setup.php" $SEED || die "节日网店设定失败"
  rm -rf "$FW"
  clear_cache "$SLUG_ARG"
fi
"$D/smoke-test.sh" "$(site_url "$SLUG_ARG")" --site "$SLUG_ARG" | tail -2
