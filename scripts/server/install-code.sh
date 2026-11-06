#!/usr/bin/env bash
# install-code.sh — 把 repo 里的 wp/agency-core 插件和 wp/child-theme 子主题装进站点（可以重复执行）
source "$(dirname "$0")/../lib/common.sh"

usage() { echo "用法: sudo $0 <站点代号|all> [plugin|theme|both]   (默认 both)"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
TARGET="$1"; WHAT="${2:-both}"
[[ "$WHAT" =~ ^(plugin|theme|both)$ ]] || { usage; die "第二个参数只能是 plugin / theme / both"; }
require_root
start_log "$@"

PLUGIN_SRC="$AGENCY_ROOT/wp/agency-core"
THEME_SRC="$AGENCY_ROOT/wp/child-theme"

install_one() {
  local slug="$1"; load_site "$slug"
  [[ -f "$SITE_PUBLIC/wp-config.php" ]] || { warn "$slug 没有 WordPress，跳过"; return; }
  if [[ "$WHAT" != theme ]]; then
    rsync -a --delete "$PLUGIN_SRC/" "$SITE_PUBLIC/wp-content/plugins/agency-core/"
    chown -R "$SITE_USER:$SITE_USER" "$SITE_PUBLIC/wp-content/plugins/agency-core"
    wpq "$slug" plugin activate agency-core || true
    ok "$slug：agency-core $(grep -m1 'Version:' "$PLUGIN_SRC/agency-core.php" | awk '{print $NF}')"
  fi
  if [[ "$WHAT" != plugin ]]; then
    if ! wpx "$slug" theme is-installed kadence 2>/dev/null; then
      wpq "$slug" theme install kadence
    fi
    rsync -a --delete "$THEME_SRC/" "$SITE_PUBLIC/wp-content/themes/agency-child/"
    chown -R "$SITE_USER:$SITE_USER" "$SITE_PUBLIC/wp-content/themes/agency-child"
    [[ "$(wpx "$slug" option get stylesheet)" == "agency-child" ]] || wpq "$slug" theme activate agency-child
    ok "$slug：agency-child $(grep -m1 'Version:' "$THEME_SRC/style.css" | awk '{print $NF}')"
  fi
  clear_cache "$slug"
}

if [[ "$TARGET" == all ]]; then
  for f in "$AGENCY_SITES_DIR"/*.conf; do [[ -e "$f" ]] && install_one "$(basename "$f" .conf)"; done
else
  install_one "$TARGET"
fi
