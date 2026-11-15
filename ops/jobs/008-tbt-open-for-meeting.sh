#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-15 14:3x）：俊宇在店里给店家看，手机一直卡在 basic auth 的框，要求先拿掉。
# 暂时关掉 basic auth（noindex 和店家后台的 WordPress 登入照旧），4 小时后自动开回来（systemd-run 计时器）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
bash "$R/scripts/server/site-config.sh" "$S" --basic-auth off --noindex on >/dev/null || exit 1
echo "basic auth：暂时关掉（noindex 照旧）"
systemctl stop tbt-basic-auth-on.timer tbt-basic-auth-on.service >/dev/null 2>&1
systemctl reset-failed tbt-basic-auth-on.service >/dev/null 2>&1
if systemd-run --unit=tbt-basic-auth-on --on-active=4h /bin/bash "$R/scripts/server/site-config.sh" "$S" --basic-auth on >/dev/null 2>&1; then
  echo "4 小时后自动开回来：$(date -d '+4 hours' '+%F %H:%M %Z')"
else
  echo "注意：自动开回来的计时器没设好，要另外开回来"
fi
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
echo "首页（没密码）HTTP $(code "https://$H/")（应该是 200）"
echo "店家后台 /dian/ HTTP $(code "https://$H/dian/")（应该是 200，是店家登入页）"
echo "noindex 标头：$(curl -sI "https://$H/" | grep -i '^x-robots-tag' | tr -d '\r')"
