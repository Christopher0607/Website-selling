#!/usr/bin/env bash
# ops-setup.sh — 安装「自动更新小帮手」（2026-11-13，俊宇同意）
#
#   - /etc/cron.d/agency-ops：每 5 分钟执行 ops-runner.sh
#   - Nginx 预设站点加一个只读的报告文件夹：http://<服务器IP>/agency-ops-<代号>/
#     （代号在 /var/lib/agency-ops/token，建立服务器时产生；里面只有进度和维护脚本的输出，不写密码）
#
# 可以重复执行。关掉小帮手：sudo rm /etc/cron.d/agency-ops
# 用法：sudo bash scripts/server/ops-setup.sh
source "$(dirname "$0")/../lib/common.sh"
require_root
OPS=/var/lib/agency-ops
[[ -s "$OPS/token" ]] || { mkdir -p "$OPS"; ( umask 077; tr -dc 'a-f0-9' < /dev/urandom | head -c 32 > "$OPS/token" ); }
TOKEN="$(tr -dc 'a-f0-9' < "$OPS/token")"
[[ ${#TOKEN} -ge 24 ]] || die "报告代号太短"
mkdir -p "$OPS/public/jobs" "$OPS/done"
chmod 755 "$OPS" "$OPS/public" "$OPS/public/jobs"
chmod 700 "$OPS/done"

cat > /etc/cron.d/agency-ops <<EOF
# 自动更新小帮手（scripts/server/ops-runner.sh）。关掉：删除这个文件。
*/5 * * * * root $AGENCY_ROOT/scripts/server/ops-runner.sh >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/agency-ops

DEF=/etc/nginx/sites-available/000-default
if [[ -f "$DEF" ]] && ! grep -q "agency-ops-" "$DEF"; then
  sed -i "s#  location / { return 444; }#  location ^~ /agency-ops-$TOKEN/ { alias $OPS/public/; default_type \"text/plain; charset=utf-8\"; charset utf-8; autoindex on; add_header X-Robots-Tag \"noindex\" always; add_header Cache-Control \"no-store\" always; }\n  location / { return 444; }#" "$DEF"
  nginx -t >/dev/null 2>&1 || { nginx -t; die "Nginx 设定有错"; }
  reload_web
fi
ok "小帮手已安装：每 5 分钟检查 GitHub；报告在 http://<服务器IP>/agency-ops-<代号>/status.txt"
