#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-15）：打开「桌上扫码点单」（agency-core 1.8.0 class-table.php）。
# 俊宇地推后决定先做基本版：客人扫桌上的 QR → 手机点单 → 厨房画面（/dian/#/kitchen）→ 柜台结帐（/dian/#/tables）。
# 不接收银系统、不用打印机。桌子先放 1-8（店家可以在店家后台「设定」改）。只动 table_on / table_list，其他设定不变。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
site_vars "$S"
V="$(wpx "$S" plugin get agency-core --field=version 2>/dev/null)"
[[ "$V" == "1.8.0" ]] || { echo "agency-core 还是 ${V:-?}，等小帮手先更新插件"; exit 75; }

# 桌上菜单用的分类名称（样板 data.json 多了 "cats"；样板网站本身不变）
SK="$SITE_PUBLIC/wp-content/uploads/agc-skin"
install -o "$SITE_USER" -g "$SITE_USER" -m 644 "$R/sites/$S/skin/data.json" "$SK/data.json" && echo "菜单分类名称：已更新"

wpx "$S" agc set table_on 1 >/dev/null && wpx "$S" agc set table_list "1-8" >/dev/null && echo "桌上扫码点单：打开，桌子 1-8"
clear_cache "$S"

A=()
grep -q '^BASIC_AUTH="1"' "/etc/agency/sites/$S.conf" 2>/dev/null && { source "/etc/agency/secrets/$S.env"; A=(-u "$BASIC_AUTH_USER:$BASIC_AUTH_PASS"); }
L="$(wpx "$S" eval 'echo AGC_Table::link("1");' 2>/dev/null | tail -1)"
echo "1 号桌的菜单：HTTP $(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" "$L")（要 200）"
echo "错的 QR：HTTP $(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" "https://$H/table/?t=1&k=0000000000")（要 404）"
echo "桌上菜单的产品：$(curl -s "${A[@]}" "$L" | grep -o '"n":"' | wc -l) 样（只放有价钱的）"
for u in / /menu/ /order/ /dian/; do printf '%-8s HTTP %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "${A[@]}" "https://$H$u")"; done
