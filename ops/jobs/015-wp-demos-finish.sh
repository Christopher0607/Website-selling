#!/usr/bin/env bash
# 2026-11-17：014 建好了 8 个示范网站；lowlight 和 plainfold 从 master 复制完之后，复制步骤自己的 smoke test 没过，
# 所以设计和产品还没放。网站已经在了，再跑一次 build-wp-demo.sh 会跳过复制、接着做（设计、产品、示范帐号、干净版本）。
# 先印出上次没过的是哪几项（只印检查结果的行，不印密码）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
BAD=""
for d in lowlight plainfold; do
  echo "==== $d：上次没过的检查"
  grep -E '✗|FAIL|❌|WARN' "/var/log/agency/wp-demo-$d.log" 2>/dev/null | grep -viE 'pass(word)?[=:]' | tail -8
  echo "==== $d：再建一次"
  bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d-2.log" 2>&1
  rc=$?
  grep -E '✗|FAIL|❌' "/var/log/agency/wp-demo-$d-2.log" | grep -viE 'pass(word)?[=:]' | tail -6
  tail -4 "/var/log/agency/wp-demo-$d-2.log"
  [[ $rc == 0 ]] || BAD="$BAD $d"
done
echo; echo "==== 检查 10 个网站"
for d in sireh-salt maison-cendre dulang-daun butter-lantern voltnest chili-pantry dewlane lowlight plainfold tailmate; do
  H="https://$d.demo.$STUDIO_DOMAIN"
  live="$(curl -s "$H/" | grep -c 'window.AGC_LIVE=')"
  printf '%-15s 首页 %s · 接上 WooCommerce %s · 资料接口 %s · 店家后台 %s\n' "$d" "$(curl -s -o /dev/null -w '%{http_code}' "$H/")" "$([[ $live -ge 1 ]] && echo 是 || echo 否)" "$(curl -s -o /dev/null -w '%{http_code}' "$H/wp-json/agc/v1/site/data")" "$(curl -s -o /dev/null -w '%{http_code}' "$H/dian/")"
done
ls /var/backups/agency/demo-*/clean -d 2>/dev/null | wc -l | xargs echo "干净版本（每晚还原用）："
if [[ -n "$BAD" ]]; then echo "还是没建好：$BAD"; exit 1; fi
echo "10 个示范网站都建好了"
