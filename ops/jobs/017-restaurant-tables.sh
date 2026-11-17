#!/usr/bin/env bash
# 2026-11-17 俊宇：「我们少了 table service，顾客在餐厅里无法点单并发送至后台」。
# Maison Cendre 现在也有桌上扫码点单（首页「Order at your table」→ 桌号 3 → 送到厨房画面；账单送到桌上），
# Sireh & Salt 和 Maison Cendre 的店家页多了「Kitchen screen」按钮。重建这两个示范（会先回到干净版本，
# 跟每晚还原一样，今天的测试订单会清掉），再检查桌上点单的页面。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
BAD=""
for d in maison-cendre sireh-salt; do
  echo "==== $d"
  bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d-017.log" 2>&1
  rc=$?
  grep -E 'Settings:|结果|❌' "/var/log/agency/wp-demo-$d-017.log" | grep -viE 'pass(word)?[=:]'
  [[ $rc == 0 ]] || BAD="$BAD $d"
done
echo; echo "==== 检查"
for x in "maison-cendre 3" "sireh-salt 5"; do
  set -- $x; H="$1.demo.$STUDIO_DOMAIN"
  to="$(curl -s -o /dev/null -w '%{redirect_url}' --resolve "$H:443:127.0.0.1" "https://$H/table.html?t=$2")"
  page="$(curl -s --resolve "$H:443:127.0.0.1" "$to" | grep -c 'window.AGC_TABLE')"
  printf '%-14s table.html?t=%s → %s · 点单页 %s\n' "$1" "$2" "${to#https://$H}" "$([[ $page -ge 1 ]] && echo 有 || echo 没有)"
done
if [[ -n "$BAD" ]]; then echo "没建好：$BAD"; exit 1; fi
echo "完成"
