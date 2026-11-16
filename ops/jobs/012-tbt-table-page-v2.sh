#!/usr/bin/env bash
# The Baking Trip 预览网店（2026-11-16）：桌上点单的客人页面第 2 版（agency-core 1.8.2）。
# 样板的 data.json 多了 "table_hero": "garden"（桌上点单最上面的照片），复制到网站；其他不动。
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
S=preview-tbt
H="$S.$STUDIO_DOMAIN"
site_vars "$S"
V="$(wpx "$S" plugin get agency-core --field=version 2>/dev/null)"
[[ "$V" == "1.8.2" ]] || { echo "agency-core 还是 ${V:-?}，等小帮手先更新插件"; exit 75; }
SK="$SITE_PUBLIC/wp-content/uploads/agc-skin"
install -o "$SITE_USER" -g "$SITE_USER" -m 644 "$R/sites/$S/skin/data.json" "$SK/data.json" && echo "样板菜单资料：已更新（桌上点单的照片）"
systemctl reload "$FPM_SERVICE" >/dev/null 2>&1 || true
clear_cache "$S"
L="$(wpx "$S" eval 'echo AGC_Table::link("1");' 2>/dev/null | tail -1)"
P="$(curl -s "$L")"
echo "1 号桌的菜单：HTTP $(curl -s -o /dev/null -w '%{http_code}' "$L")（要 200）"
echo "有大照片：$(printf '%s' "$P" | grep -c 'img/garden.webp')（要 1）"
echo "有店的标志：$(printf '%s' "$P" | grep -c '"logo":"\\u003Csvg')（要 1）"
echo "人气推荐的产品：$(printf '%s' "$P" | grep -o '"tags":\["pop"\]' | wc -l) 样"
echo "新版程式：$(curl -s -o /dev/null -w '%{http_code}' "https://$H/wp-content/plugins/agency-core/assets/table/table.js")（要 200）"
