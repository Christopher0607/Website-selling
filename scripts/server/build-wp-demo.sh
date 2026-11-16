#!/usr/bin/env bash
# build-wp-demo.sh (2026-11-16, docs/14-wordpress-demos.md) — one of the studio's demo websites as a real WordPress +
# WooCommerce site that looks exactly like the demo: copies master (first time), builds the demo's pages into
# wp-content/uploads/agc-skin/ (site/build.py --wp), turns sites/<site>/site.json into products and settings
# (php/site-setup.php), then saves a clean copy that demo-reset.sh puts back every night.
#
#   sudo scripts/server/build-wp-demo.sh demo-sireh-salt [--no-ssl]
# Address: <demo>.demo.<studio domain> (DNS: one *.demo record → this server).
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 <demo-代号，例如 demo-sireh-salt> [--no-ssl]"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift; NEW=()
[[ "${1:-}" == --no-ssl ]] && NEW+=(--no-ssl)
require_root
start_log "$SLUG_ARG"
SRC_DIR="$AGENCY_ROOT/sites/$SLUG_ARG"
[[ -f "$SRC_DIR/site.json" ]] || die "找不到 $SRC_DIR/site.json（先在本机跑 node site/tools/export-demo-data.js）"
DEMO="${SLUG_ARG#demo-}"
DOMAIN_NEW="$DEMO.demo.$STUDIO_DOMAIN"
D="$AGENCY_ROOT/scripts/server"

if ! site_exists "$SLUG_ARG"; then
  info "新网站：$DOMAIN_NEW（从 master 复制）"
  "$D/clone-site.sh" master "$SLUG_ARG" "$DOMAIN_NEW" --noindex "${NEW[@]}"
fi
"$D/install-code.sh" "$SLUG_ARG" both
# PHP keeps compiled code for up to a minute: right after the copy from master it would still run master's older plugin
for svc in $(ls /etc/init.d/ 2>/dev/null | grep -E '^php[0-9.]+-fpm$'); do service "$svc" reload >/dev/null 2>&1 || true; done

# The design: the demo's own pages, styles, scripts and photos (exactly what the studio site shows).
site_vars "$SLUG_ARG"
SK="$SITE_PUBLIC/wp-content/uploads/agc-skin"
rm -rf -- "${SK:?}.new"
python3 "$AGENCY_ROOT/site/build.py" --wp "$DEMO" "$SK.new" || die "做不出 $DEMO 的页面（site/build.py --wp）"
cp "$SRC_DIR/site.json" "$SK.new/site.json"
chown -R "$SITE_USER:$SITE_USER" "$SK.new"
find "$SK.new" -type d -exec chmod 755 {} +
find "$SK.new" -type f -exec chmod 644 {} +
rm -rf -- "${SK:?}.old"
[[ -d "$SK" ]] && mv "$SK" "$SK.old"
mv "$SK.new" "$SK"
rm -rf -- "${SK:?}.old"
info "页面：$(find "$SK" -name '*.html' | wc -l) 页、$(find "$SK/img" -type f 2>/dev/null | wc -l) 张照片"

# Products, settings, demo account.
TMPD="$SITE_HOME/tmp/site-setup-$$"; mkdir -p "$TMPD"
cp "$D/php/site-setup.php" "$TMPD/"
chown -R "$SITE_USER:$SITE_USER" "$TMPD"
wpx "$SLUG_ARG" agc set skin 1 >/dev/null || die "打不开设计（agc set skin）"
wpx "$SLUG_ARG" eval-file "$TMPD/site-setup.php" || die "网店设定失败（site-setup.php）"
rm -rf "$TMPD"
clear_cache "$SLUG_ARG"

# A clean copy for the nightly reset (scripts/server/demo-reset.sh).
"$D/demo-reset.sh" "$SLUG_ARG" --save
"$D/smoke-test.sh" "$(site_url "$SLUG_ARG")" --site "$SLUG_ARG" | tail -2
info "完成：$(site_url "$SLUG_ARG")"
