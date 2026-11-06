#!/usr/bin/env bash
# setup-studio.sh — 建立 / 更新工作室网站（不装 WooCommerce）
#   第一次：sudo scripts/server/setup-studio.sh kedailab.com
#   之后改了文案：sudo scripts/server/setup-studio.sh kedailab.com --force-pages
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 <工作室域名> [--force-pages] [--no-ssl]"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
DOM="$1"; shift; FORCE=""; NEW=()
while [[ $# -gt 0 ]]; do
  case "$1" in --force-pages) FORCE="force"; shift;; --no-ssl) NEW+=(--no-ssl); shift;; *) usage; die "不认识的参数 $1";; esac
done
require_root
start_log "$DOM"
D="$AGENCY_ROOT/scripts/server"
SLUG=studio
if ! site_exists "$SLUG"; then
  "$D/new-site.sh" "$SLUG" "$DOM" --www --title "KedaiLab" "${NEW[@]}"
fi
load_site "$SLUG"
"$D/install-code.sh" "$SLUG" both
for p in seo-by-rank-math fluent-smtp updraftplus limit-login-attempts-reloaded two-factor; do
  if wpx "$SLUG" plugin is-installed "$p" 2>/dev/null; then wpq "$SLUG" plugin activate "$p" || true; else wpq "$SLUG" plugin install "$p" --activate || warn "$p 安装失败"; fi
done
for t in $(wpx "$SLUG" theme list --status=inactive --field=name 2>/dev/null); do [[ "$t" == kadence ]] || wpq "$SLUG" theme delete "$t" || true; done
wpq "$SLUG" option update rank_math_wizard_completed 1 || true
wpq "$SLUG" option update rank_math_registration_skip 1 || true

# 品牌（域名按实际改写进临时设定）
TMP="$SITE_HOME/tmp/studio-$$"; mkdir -p "$TMP"; trap 'rm -rf "$TMP"' EXIT
cp -r "$AGENCY_ROOT/sites/studio/." "$TMP/"
jq --arg d "$DOM" '.site.domain=$d' "$AGENCY_ROOT/sites/studio/brand-config.json" > "$TMP/brand-config.json"
"$D/apply-brand.sh" "$SLUG" "$TMP/brand-config.json"

# 页面
cp -r "$AGENCY_ROOT/wp/content/studio" "$TMP/content"
cp "$AGENCY_ROOT/scripts/server/php/build-pages.php" "$TMP/"
chown -R "$SITE_USER:$SITE_USER" "$TMP"
wpx "$SLUG" eval-file "$TMP/build-pages.php" "$TMP/content" $FORCE
# Rank Math：组织资料（Organization schema）
wpx "$SLUG" eval '
$o = get_option( "rank-math-options-titles", array() );
$o["knowledgegraph_type"] = "company";
$o["knowledgegraph_name"] = get_bloginfo( "name" );
$o["website_name"] = get_bloginfo( "name" );
$o["local_business_type"] = "Organization";
update_option( "rank-math-options-titles", $o );
echo "Rank Math organization set\n";' || true
wpq "$SLUG" rewrite flush
fix_perms "$SLUG"
clear_cache "$SLUG"
"$D/smoke-test.sh" "$(site_url "$SLUG")" --site "$SLUG" | tail -3
