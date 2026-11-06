#!/usr/bin/env bash
# backup-site.sh — 备份一个站点（数据库 + 文件），只保留最近 N 份（默认 7）
# cron 每天 03:15 跑  backup-site.sh --all
source "$(dirname "$0")/../lib/common.sh"

usage() { echo "用法: sudo $0 <站点代号|--all> [--keep 7]   备份放在 $AGENCY_BACKUP_DIR/<代号>/<日期时间>/"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
TARGET="$1"; shift
KEEP="$BACKUP_KEEP"
while [[ $# -gt 0 ]]; do case "$1" in --keep) KEEP="$2"; shift 2;; *) die "不认识的参数 $1";; esac; done
require_root
start_log "$TARGET"

backup_one() {
  local slug="$1"; load_site "$slug"
  [[ -f "$SITE_PUBLIC/wp-config.php" ]] || { warn "$slug 没有 WordPress，跳过"; return 0; }
  local ts dest need avail
  ts="$(date +%Y%m%d-%H%M%S)"
  dest="$AGENCY_BACKUP_DIR/$slug/$ts"
  # 磁盘空间：至少要有网站大小的 2 倍
  need=$(( $(du -sk "$SITE_PUBLIC" | cut -f1) * 2 + 102400 ))
  mkdir -p "$AGENCY_BACKUP_DIR/$slug"
  avail=$(df -Pk "$AGENCY_BACKUP_DIR" | awk 'NR==2 {print $4}')
  (( avail > need )) || { warn "$slug：磁盘空间不够（需要 $((need/1024)) MB，剩 $((avail/1024)) MB），没有备份"; return 1; }
  mkdir -p "$dest"; chmod 700 "$dest"
  # 数据库（用站点用户导出到站点 tmp，再搬过来）
  local tmpsql="$SITE_HOME/tmp/backup-$ts.sql"
  if ! wpx "$slug" db export "$tmpsql" --single-transaction --quiet >/dev/null 2>&1; then
    rm -f "$tmpsql"; rm -rf "$dest"; warn "$slug：数据库导出失败"; return 1
  fi
  gzip -c "$tmpsql" > "$dest/db.sql.gz"; rm -f "$tmpsql"
  # 文件（不含缓存）
  tar -C "$SITE_HOME" -czf "$dest/files.tar.gz" \
    --exclude='public/wp-content/cache' --exclude='public/wp-content/updraft' \
    --exclude='public/wp-content/upgrade' --exclude='public/wp-content/uploads/wc-logs' public
  {
    echo "SLUG=\"$slug\""
    echo "DOMAIN=\"$DOMAIN\""
    echo "CREATED=\"$(date '+%F %T')\""
    echo "WP_VERSION=\"$(wpx "$slug" core version 2>/dev/null || echo ?)\""
    echo "SITEURL=\"$(wpx "$slug" option get siteurl 2>/dev/null || echo ?)\""
  } > "$dest/meta.env"
  chmod 600 "$dest"/*
  # 只保留最近 KEEP 份
  ls -1d "$AGENCY_BACKUP_DIR/$slug"/*/ 2>/dev/null | sort | head -n -"$KEEP" | xargs -r rm -rf
  set_reg "$slug" LAST_BACKUP "$ts"
  ok "$slug → $dest（$(du -sh "$dest" | cut -f1)）"
  echo "$dest"
}

if [[ "$TARGET" == --all ]]; then
  rc=0
  for f in "$AGENCY_SITES_DIR"/*.conf; do
    [[ -e "$f" ]] || continue
    s="$(basename "$f" .conf)"
    # preview 不备份（14 天内会删）
    [[ "$s" == preview-* ]] && continue
    backup_one "$s" >/dev/null || rc=1
  done
  exit $rc
else
  backup_one "$TARGET" | tail -1
fi
