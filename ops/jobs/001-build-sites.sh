#!/usr/bin/env bash
# 第一次建站（2026-11-13）：等 Cloudflare 的 DNS 指到这台服务器，再建母版 + 节日网店示范。
# DNS 还没好就 exit 75（小帮手 5 分钟后再试）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
IP="$(curl -s --noproxy '*' --max-time 5 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)"
[[ "$IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] || IP="$(curl -s --max-time 8 https://api.ipify.org)"
[[ "$IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] || { echo "等：读不到这台服务器的 IP"; exit 75; }
command -v resolvectl >/dev/null && resolvectl flush-caches >/dev/null 2>&1
for h in master demo-festive; do
  got="$(getent ahostsv4 "$h.$STUDIO_DOMAIN" | awk '{print $1; exit}')"
  if [[ "$got" != "$IP" ]]; then
    echo "等 DNS：$h.$STUDIO_DOMAIN 要指到 $IP（现在是 ${got:-还没有记录}）"
    exit 75
  fi
done
echo "DNS 好了，开始建站"
bash "$R"/scripts/server/build-all.sh || exit 1
bash "$R"/scripts/server/build-demo.sh demo-festive || exit 1
bash "$R"/scripts/server/site-inventory.sh
