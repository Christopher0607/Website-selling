#!/usr/bin/env bash
# 真网店示范也算进工作台的「流量」（2026-11-13，俊宇要看别人看我们网站的监控面板）：
# demo-festive 载入 https://cartsmithstudio.com/assets/js/hit.js（agency-core 1.6.1 的设定 studio_hits）。
# 只给我们自己的示范站，不放客户网站。登录的人（俊宇、店家后台）不算。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
S=demo-festive
V="$(wpx "$S" eval 'echo AGC_VERSION;')"
if [ "$V" != "1.6.1" ] && [ "$(printf '%s\n1.6.1\n' "$V" | sort -V | head -1)" != "1.6.1" ]; then
  echo "agency-core 还是 $V，等插件更新到 1.6.1 再做"; exit 75
fi
wpx "$S" agc set studio_hits "https://cartsmithstudio.com/assets/js/hit.js" >/dev/null && echo "demo-festive：访客计数已打开"
clear_cache "$S"
curl -s -H 'Host: demo-festive.cartsmithstudio.com' http://127.0.0.1/ -o /dev/null -w '首页 HTTP %{http_code}\n' || true
curl -sk https://demo-festive.cartsmithstudio.com/ | grep -o 'assets/js/hit.js?v=[0-9.]*' | head -1 | sed 's/^/首页载入：/'
