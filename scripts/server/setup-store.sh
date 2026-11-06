#!/usr/bin/env bash
# setup-store.sh — 把一个空的 WordPress 站点变成「网店母版」：
#   Kadence + 子主题 + agency-core + 插件 → WooCommerce 马来西亚设定 → 页面 / 菜单 / 页脚 → 示范产品 → 套用品牌
# 可以重复执行。
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"

usage() {
  cat <<EOF
用法: sudo $0 <站点代号> [--brand <brand-config.json>] [--content <内容文件夹>]... [--products <products.csv>] [--force-pages] [--no-plugins]

  --brand        套用这个品牌设定（默认 sites/master/brand-config.json）
  --content      额外的页面内容文件夹（同名文件覆盖母版 wp/content/store）
  --products     导入产品 CSV（图片放在 CSV 同一层的 images/ 文件夹）
  --force-pages  页面已存在也用文件内容覆盖
  --replace-products  导入前先删除所有现有产品（样板站 / preview 换品牌时用）
  --no-plugins   不安装 / 更新插件（只更新内容）

例子:
  sudo $0 master --products sites/master/products.csv
EOF
}
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift
BRAND="$AGENCY_ROOT/sites/master/brand-config.json"; CONTENT_DIRS=("$AGENCY_ROOT/wp/content/store"); PRODUCTS=""; FORCE=""; PLUGINS=1; REPLACE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --brand) BRAND="$(readlink -f "$2")"; shift 2;;
    --content) CONTENT_DIRS+=("$(readlink -f "$2")"); shift 2;;
    --products) PRODUCTS="$(readlink -f "$2")"; shift 2;;
    --force-pages) FORCE="force"; shift;;
    --no-plugins) PLUGINS=0; shift;;
    --replace-products) REPLACE=1; shift;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log "$SLUG_ARG"
load_site "$SLUG_ARG"
[[ -f "$SITE_PUBLIC/wp-config.php" ]] || die "$SLUG_ARG 还没有装 WordPress（先跑 new-site.sh）"

# 网店插件（免费版）；原因写在 sites/master/README.md
STORE_PLUGINS=(woocommerce kadence-blocks seo-by-rank-math fluent-smtp updraftplus limit-login-attempts-reloaded two-factor)

if [[ $PLUGINS == 1 ]]; then
  info "1/6 主题、子主题、agency-core"
  "$AGENCY_ROOT/scripts/server/install-code.sh" "$SLUG_ARG" both
  info "2/6 插件：${STORE_PLUGINS[*]}"
  for p in "${STORE_PLUGINS[@]}"; do
    if wpx "$SLUG_ARG" plugin is-installed "$p" 2>/dev/null; then
      wpq "$SLUG_ARG" plugin activate "$p" || warn "$p 启用失败"
    else
      wpq "$SLUG_ARG" plugin install "$p" --activate || warn "$p 安装失败"
    fi
  done
  # 不用的主题删掉（保留 kadence + agency-child）
  for t in $(wpx "$SLUG_ARG" theme list --status=inactive --field=name 2>/dev/null); do
    [[ "$t" == kadence ]] && continue
    wpq "$SLUG_ARG" theme delete "$t" || true
  done
  ok "插件和主题就绪"
else
  info "1-2/6 跳过插件（--no-plugins）"
fi

WORK="$SITE_HOME/tmp/setup-$$"; mkdir -p "$WORK/content"
trap 'rm -rf "$WORK"' EXIT
cp "$AGENCY_ROOT"/scripts/server/php/*.php "$WORK/"
i=0; WORK_DIRS=()
for d in "${CONTENT_DIRS[@]}"; do
  [[ -d "$d" ]] || { warn "内容文件夹不存在：$d"; continue; }
  mkdir -p "$WORK/content/$i"; cp -r "$d"/. "$WORK/content/$i/"; WORK_DIRS+=("$WORK/content/$i"); i=$((i+1))
done
if [[ -n "$PRODUCTS" ]]; then
  mkdir -p "$WORK/products"; cp "$PRODUCTS" "$WORK/products/products.csv"
  [[ -d "$(dirname "$PRODUCTS")/images" ]] && cp -r "$(dirname "$PRODUCTS")/images" "$WORK/products/images"
fi
chown -R "$SITE_USER:$SITE_USER" "$WORK"

info "3/6 WooCommerce 马来西亚设定"
wpx "$SLUG_ARG" eval-file "$WORK/wc-setup.php" || die "WooCommerce 设定失败"
# Rank Math：不跑设定精灵，开 sitemap
wpq "$SLUG_ARG" option update rank_math_wizard_completed 1 || true
wpq "$SLUG_ARG" option update rank_math_registration_skip 1 || true
# 限制登录尝试：默认值就可以；关闭它的推广通知
wpq "$SLUG_ARG" option update limit_login_hide_dashboard_widget 1 || true

info "4/6 套用品牌"
[[ -f "$BRAND" ]] && "$AGENCY_ROOT/scripts/server/apply-brand.sh" "$SLUG_ARG" "$BRAND" || warn "没有品牌设定文件 $BRAND，跳过"

if [[ -n "$PRODUCTS" ]]; then
  info "5/6 导入产品"
  if [[ $REPLACE == 1 ]]; then wpx "$SLUG_ARG" eval-file "$WORK/clear-products.php" || die "删除旧产品失败"; fi
  wpx "$SLUG_ARG" eval-file "$WORK/import-products.php" "$WORK/products/products.csv" "$WORK/products/images" || die "产品导入失败"
else
  info "5/6 没有 --products，跳过产品导入"
fi

info "6/6 页面、菜单、页脚"
wpx "$SLUG_ARG" eval-file "$WORK/build-pages.php" "${WORK_DIRS[@]}" $FORCE || die "页面建立失败"
wpq "$SLUG_ARG" rewrite flush
fix_perms "$SLUG_ARG"
clear_cache "$SLUG_ARG"
ok "网店设定完成：$(site_url "$SLUG_ARG")"
