#!/usr/bin/env bash
# 2026-11-17：柜台收银（agency-core 1.10.0，俊宇选的「向 StoreHub / Beep 学习」第一项）。两个餐厅示范打开收银画面：
# 重建 Sireh & Salt 和 Maison Cendre（先回到干净版本，跟每晚还原一样；设定 counter_on 存进干净版本）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
BAD=""
for d in sireh-salt maison-cendre; do
  echo "==== $d"
  bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d-018.log" 2>&1
  rc=$?
  grep -E 'Settings:|结果|❌' "/var/log/agency/wp-demo-$d-018.log" | grep -viE 'pass(word)?[=:]'
  echo "收银画面：$(wpx "demo-$d" agc get counter_on 2>/dev/null) · agency-core $(wpx "demo-$d" plugin get agency-core --field=version 2>/dev/null)"
  [[ $rc == 0 ]] || BAD="$BAD $d"
done
if [[ -n "$BAD" ]]; then echo "没建好：$BAD"; exit 1; fi
echo "完成"
