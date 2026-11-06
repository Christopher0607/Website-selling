#!/usr/bin/env bash
# restore-site.sh — 从备份还原站点
#   还原到同一个站：  restore-site.sh master /var/backups/agency/master/20261106-031500
#   还原到别的站：    先 new-site.sh restore-test <域名> --empty，再 restore-site.sh restore-test <master 的备份>
#                     （会自动换网址，保留目标站自己的数据库密码）
source "$(dirname "$0")/../lib/common.sh"

usage() { echo "用法: sudo $0 <站点代号> <备份文件夹> [--yes] [--no-smoke]"; }
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; BK="${2%/}"; shift 2; SMOKE=1
while [[ $# -gt 0 ]]; do case "$1" in --yes) ASSUME_YES=1; shift;; --no-smoke) SMOKE=0; shift;; *) die "不认识的参数 $1";; esac; done
require_root
start_log "$SLUG_ARG" "$BK"
[[ -f "$BK/db.sql.gz" && -f "$BK/files.tar.gz" ]] || die "$BK 里没有 db.sql.gz 和 files.tar.gz"
load_site "$SLUG_ARG"
load_secrets "$SLUG_ARG"
# shellcheck disable=SC1091
OLD_SLUG="$(source "$BK/meta.env"; echo "$SLUG")"
OLD_URL="$(source "$BK/meta.env"; echo "$SITEURL")"
NEW_URL="$(site_url "$SLUG_ARG")"

echo "将会用备份覆盖站点 $SLUG_ARG（$DOMAIN）的数据库和文件："
echo "  备份：$BK（来自 $OLD_SLUG，$OLD_URL）"
confirm "确定要还原吗？" || die "已取消"

if [[ -f "$SITE_PUBLIC/wp-config.php" ]]; then
  wpq "$SLUG_ARG" maintenance-mode activate || true
fi

info "1/4 还原文件"
STAGE="$SITE_HOME/tmp/restore-$$"; mkdir -p "$STAGE"
tar -C "$STAGE" -xzf "$BK/files.tar.gz"
rsync -a --delete --exclude='.maintenance' "$STAGE/public/" "$SITE_PUBLIC/"
rm -rf "$STAGE" "$SITE_PUBLIC/.maintenance"
# 目标站用自己的数据库帐号（还原到别的站时很重要）
fix_perms "$SLUG_ARG"
wpq "$SLUG_ARG" config set DB_NAME "$DB_NAME"
wpq "$SLUG_ARG" config set DB_USER "$DB_USER"
wpq "$SLUG_ARG" config set DB_PASSWORD "$DB_PASS"
ok "文件已还原"

info "2/4 还原数据库"
SQL="$SITE_HOME/tmp/restore-$$.sql"
gunzip -c "$BK/db.sql.gz" > "$SQL"; chown "$SITE_USER" "$SQL"
wpq "$SLUG_ARG" db reset --yes
wpx "$SLUG_ARG" db import "$SQL" >/dev/null || { rm -f "$SQL"; die "数据库导入失败"; }
rm -f "$SQL"
ok "数据库已还原"

info "3/4 网址"
if [[ -n "$OLD_URL" && "$OLD_URL" != "?" && "$OLD_URL" != "$NEW_URL" ]]; then
  OLD_HOST="${OLD_URL#*://}"; NEW_HOST="${NEW_URL#*://}"
  wpq "$SLUG_ARG" search-replace "https://$OLD_HOST" "$NEW_URL" --all-tables
  wpq "$SLUG_ARG" search-replace "http://$OLD_HOST" "$NEW_URL" --all-tables
  wpq "$SLUG_ARG" search-replace "//$OLD_HOST" "//$NEW_HOST" --all-tables
  wpq "$SLUG_ARG" config shuffle-salts
  ok "网址 $OLD_URL → $NEW_URL"
else
  ok "网址不变"
fi

info "4/4 清缓存"
clear_cache "$SLUG_ARG"
wpq "$SLUG_ARG" maintenance-mode deactivate || true
fix_perms "$SLUG_ARG"
if [[ $SMOKE == 1 ]]; then
  "$AGENCY_ROOT/scripts/server/smoke-test.sh" "$NEW_URL" --site "$SLUG_ARG" || die "还原后 smoke test 失败"
fi
ok "还原完成：$NEW_URL"
