#!/usr/bin/env bash
# demo-reset.sh (2026-11-16, docs/14-wordpress-demos.md) — the studio's demo websites are open to everyone (orders, the
# demo back office), so every night each one is put back to the clean copy saved when it was built.
#
#   sudo scripts/server/demo-reset.sh demo-sireh-salt --save   save the clean copy (build-wp-demo.sh does this)
#   sudo scripts/server/demo-reset.sh demo-sireh-salt          put it back
#   sudo scripts/server/demo-reset.sh --all                    every demo website that has a clean copy (cron /etc/cron.d/agency-demo-reset, 04:20 MYT)
# Only for sites made by build-wp-demo.sh (sites/<site>/site.json); never for a client's shop.
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 <demo-代号> [--save] | --all"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
require_root

one() {
  local slug="$1" mode="$2"
  [[ -f "$AGENCY_ROOT/sites/$slug/site.json" ]] || die "$slug 不是示范网站（没有 sites/$slug/site.json），不还原"
  site_exists "$slug" || die "找不到站点 $slug"
  site_vars "$slug"
  local bk="$AGENCY_BACKUP_DIR/$slug/clean" up="$SITE_PUBLIC/wp-content/uploads"
  mkdir -p "$bk"; chmod 700 "$AGENCY_BACKUP_DIR/$slug" "$bk"
  if [[ "$mode" == save ]]; then
    wpx "$slug" db export - > "$bk/db.sql.new" && mv "$bk/db.sql.new" "$bk/db.sql" || die "$slug：存资料库失败"
    rsync -a --delete "$up/" "$bk/uploads/"
    info "$slug：干净的版本已存（$(du -sh "$bk" | cut -f1)）"
    return
  fi
  [[ -s "$bk/db.sql" ]] || { warn "$slug：没有干净的版本，跳过"; return; }
  wpx "$slug" db import - < "$bk/db.sql" >/dev/null || die "$slug：还原资料库失败"
  rsync -a --delete "$bk/uploads/" "$up/"
  chown -R "$SITE_USER:$SITE_USER" "$up"
  clear_cache "$slug"
  info "$slug：已还原"
}

if [[ "$1" == --all ]]; then
  for f in "$AGENCY_ROOT"/sites/demo-*/site.json; do
    [[ -f "$f" ]] || continue
    s="$(basename "$(dirname "$f")")"
    site_exists "$s" && ( one "$s" reset ) || true
  done
else
  m="${2:-}"; one "$1" "${m#--}"
fi
