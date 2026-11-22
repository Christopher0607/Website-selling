#!/usr/bin/env bash
# 2026-11-22：Butter & Lantern 新年网店换了 5 张年饼照（黄梨挞、蛋卷、花生饼、牛油曲奇、番婆饼）和新年礼盒照；
# 杏仁瓦片换成番婆饼。重建示范（先回到干净版本，跟每晚还原一样）。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
d=butter-lantern
echo "==== $d"
bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d-020.log" 2>&1
rc=$?
grep -E 'Settings:|结果|照片|❌' "/var/log/agency/wp-demo-$d-020.log" | grep -viE 'pass(word)?[=:]'
names=$(wpx "demo-$d" post list --post_type=product --post_status=publish --field=post_title --posts_per_page=100 2>/dev/null)
echo "产品：番婆饼 $(grep -cE 'Kuih Bangkit|番婆饼' <<<"$names") 个 · 杏仁瓦片 $(grep -cE 'Almond|杏仁' <<<"$names") 个（应该是 1 和 0）"
[[ $rc == 0 ]] || { echo "没建好：$d"; exit 1; }
echo "完成"
