#!/usr/bin/env bash
# cleanup-previews.sh — 列出 / 删除超过 14 天的 preview（成交了的客户请先改成 staging，不要用 preview）
source "$(dirname "$0")/../lib/common.sh"

usage() { echo "用法: sudo $0 [--days 14] [--list-only] [--yes]"; }
DAYS=14; LIST=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days) DAYS="$2"; shift 2;;
    --list-only) LIST=1; shift;;
    --yes) ASSUME_YES=1; shift;;
    -h|--help) usage; exit 0;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log
CUT=$(date -d "-$DAYS days" +%s)
DUE=()
echo "preview 列表（超过 $DAYS 天的标 ⚠）："
for f in "$AGENCY_SITES_DIR"/preview-*.conf; do
  [[ -e "$f" ]] || continue
  s="$(basename "$f" .conf)"
  created="$(source "$f"; echo "$CREATED")"
  ts=$(date -d "$created" +%s 2>/dev/null || echo 0)
  if (( ts < CUT )); then echo "  ⚠ $s  建立于 $created"; DUE+=("$s"); else echo "    $s  建立于 $created"; fi
done
[[ ${#DUE[@]} -eq 0 ]] && { ok "没有到期的 preview"; exit 0; }
[[ $LIST == 1 ]] && exit 0
for s in "${DUE[@]}"; do
  if confirm "删除 $s？"; then
    "$AGENCY_ROOT/scripts/server/delete-site.sh" "$s" --no-backup --yes | tail -2
  fi
done
