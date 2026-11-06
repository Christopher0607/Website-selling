#!/usr/bin/env bash
# delete-site.sh — 删除站点（Nginx 设定、PHP-FPM pool、SSL 证书、数据库和用户、文件、Linux 用户）
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"

usage() { echo "用法: sudo $0 <站点代号> [--no-backup] [--yes]   （没有 --yes 时要输入代号确认）"; }
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift; BACKUP=1; YES=0
while [[ $# -gt 0 ]]; do case "$1" in --no-backup) BACKUP=0; shift;; --yes) YES=1; shift;; *) die "不认识的参数 $1";; esac; done
require_root
start_log "$SLUG_ARG"
load_site "$SLUG_ARG"
[[ "$SLUG_ARG" == master ]] && warn "你要删除的是母版 master！"

echo "将会永久删除站点 $SLUG_ARG（$DOMAIN）："
echo "  文件 $SITE_HOME、数据库 $DB_NAME、用户 $SITE_USER、Nginx / PHP-FPM 设定、SSL 证书"
if [[ $YES != 1 ]]; then
  read -r -p "请输入站点代号 $SLUG_ARG 确认删除：" ans
  [[ "$ans" == "$SLUG_ARG" ]] || die "代号不对，已取消"
fi

if [[ $BACKUP == 1 && -f "$SITE_PUBLIC/wp-config.php" ]]; then
  info "删除前先备份"
  BK="$("$AGENCY_ROOT/scripts/server/backup-site.sh" "$SLUG_ARG" --keep 30 | tail -1)"
  ok "最后的备份：$BK（30 天后请手动清除）"
fi

rm -f "/etc/nginx/sites-enabled/agency-$SLUG_ARG.conf" "$(nginx_conf_path "$SLUG_ARG")" "$(htpasswd_path "$SLUG_ARG")"
rm -f "$FPM_POOL_DIR/$SLUG_ARG.conf"
reload_web
if [[ -d "/etc/letsencrypt/live/$DOMAIN" ]]; then
  certbot delete --cert-name "$DOMAIN" --non-interactive >/dev/null 2>&1 || warn "SSL 证书删除失败，请手动：certbot delete --cert-name $DOMAIN"
fi
mysql_root -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; DROP USER IF EXISTS '$DB_USER'@'localhost'; FLUSH PRIVILEGES;"
rm -rf "${SITE_HOME:?}" "${AGENCY_CACHE_DIR:?}/$SLUG_ARG"
pkill -u "$SITE_USER" 2>/dev/null || true
userdel "$SITE_USER" 2>/dev/null || true
rm -f "$SITE_REG" "$SITE_SECRETS"
sed -i "/^$SLUG_ARG,/d" "$AGENCY_ETC/previews.csv" 2>/dev/null || true
ok "站点 $SLUG_ARG 已删除"

# 检查有没有残留
left=0
[[ -e "$SITE_HOME" ]] && { warn "残留：$SITE_HOME"; left=1; }
id "$SITE_USER" >/dev/null 2>&1 && { warn "残留：用户 $SITE_USER"; left=1; }
mysql_root -N -e "SHOW DATABASES LIKE '$DB_NAME'" | grep -q . && { warn "残留：数据库 $DB_NAME"; left=1; }
ls /etc/nginx/sites-enabled/ | grep -q "agency-$SLUG_ARG.conf" && { warn "残留：Nginx 设定"; left=1; }
[[ -e "$FPM_POOL_DIR/$SLUG_ARG.conf" ]] && { warn "残留：PHP-FPM pool"; left=1; }
[[ $left == 0 ]] && ok "检查：没有残留"
