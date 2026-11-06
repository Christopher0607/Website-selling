#!/usr/bin/env bash
# site-inventory.sh — 列出所有站点的状态（维护和月报用）
source "$(dirname "$0")/../lib/common.sh"
[[ "${1:-}" == -h || "${1:-}" == --help ]] && { echo "用法: sudo $0"; exit 0; }
require_root

printf "%-16s %-32s %-7s %-6s %-8s %-11s %-7s %-15s %s\n" 代号 域名 模式 WP 待更新 SSL到期 磁盘 最后备份 最后更新
for f in "$AGENCY_SITES_DIR"/*.conf; do
  [[ -e "$f" ]] || continue
  s="$(basename "$f" .conf)"
  (
    load_site "$s"
    wpv="-"; upd="-"
    if [[ -f "$SITE_PUBLIC/wp-config.php" ]]; then
      wpv="$(wpx "$s" core version 2>/dev/null || echo ?)"
      pu="$(wpx "$s" plugin list --update=available --format=count 2>/dev/null || echo 0)"
      tu="$(wpx "$s" theme list --update=available --format=count 2>/dev/null || echo 0)"
      cu="$(wpx "$s" core check-update --minor --format=count 2>/dev/null || echo 0)"
      upd=$(( ${pu:-0} + ${tu:-0} + ${cu:-0} ))
    fi
    ssl="-"
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]]; then
      ssl="$(date -d "$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/cert.pem" | cut -d= -f2)" +%F)"
    fi
    disk="$(du -sh "$SITE_HOME" 2>/dev/null | cut -f1)"
    printf "%-16s %-32s %-7s %-6s %-8s %-11s %-7s %-15s %s\n" "$s" "$DOMAIN" "${MODE:--}" "$wpv" "$upd" "$ssl" "$disk" "${LAST_BACKUP:--}" "${LAST_UPDATE:--}"
  )
done
echo
echo "服务器磁盘：$(df -h / | awk 'NR==2 {print $3" / "$2" ("$5")"}')   备份占用：$(du -sh "$AGENCY_BACKUP_DIR" 2>/dev/null | cut -f1)"
