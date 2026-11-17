#!/usr/bin/env bash
# 2026-11-17：桌上点单就付款（agency-core 1.11.0）。Sireh & Salt 示范让客人自己选（现在用手机付 / 到柜台付）：
# 重建 Sireh & Salt（先回到干净版本，跟每晚还原一样；设定 table_pay=choose 存进干净版本）。Maison Cendre 不用重建（插件已随 git pull 更新）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
d=sireh-salt
echo "==== $d"
bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d-019.log" 2>&1
rc=$?
grep -E 'Settings:|结果|❌' "/var/log/agency/wp-demo-$d-019.log" | grep -viE 'pass(word)?[=:]'
echo "客人在哪里付：$(wpx "demo-$d" agc get table_pay 2>/dev/null) · 收银画面：$(wpx "demo-$d" agc get counter_on 2>/dev/null) · agency-core $(wpx "demo-$d" plugin get agency-core --field=version 2>/dev/null)"
echo "Maison Cendre：$(wpx demo-maison-cendre agc get table_pay 2>/dev/null) · agency-core $(wpx demo-maison-cendre plugin get agency-core --field=version 2>/dev/null)"
[[ $rc == 0 ]] || { echo "没建好：$d"; exit 1; }
echo "完成"
