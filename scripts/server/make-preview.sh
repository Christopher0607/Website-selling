#!/usr/bin/env bash
# make-preview.sh — 给潜在客户做免费样板首页：从 master 复制 → 密码保护 + noindex + Demo 模式 → 套用他的品牌
# 规则：只用对方公开的资料、只给他本人看、没成交 14 天内删除（cleanup-previews.sh）
source "$(dirname "$0")/../lib/common.sh"

usage() {
  cat <<EOF
用法: sudo $0 <潜在客户代号，例如 p012> <brand-config.json> [--products <products.csv>] [--content <内容文件夹>] [--no-ssl]

产生：https://preview-<代号>.$STUDIO_DOMAIN （帐号 view + 随机密码）
EOF
}
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
CODE="$1"; CFG="$(readlink -f "$2")"; shift 2
EXTRA=(); NEW=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --products) EXTRA+=(--products "$(readlink -f "$2")"); shift 2;;
    --content) EXTRA+=(--content "$(readlink -f "$2")"); shift 2;;
    --no-ssl) NEW+=(--no-ssl); shift;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log "$CODE"
[[ "$CODE" =~ ^[a-z0-9-]+$ ]] || die "代号只能用小写英文、数字、连字符，例如 p012"
[[ -f "$CFG" ]] || die "找不到 $CFG"
SLUG="preview-$CODE"; DOM="$SLUG.$STUDIO_DOMAIN"
D="$AGENCY_ROOT/scripts/server"
START=$(date +%s)

# 强制 preview 模式
TMPCFG="$(mktemp --suffix=.json)"; trap 'rm -f "$TMPCFG"' EXIT
jq '.mode="preview"' "$CFG" > "$TMPCFG"
CFG_DIR="$(dirname "$CFG")"
# 保留相对路径的 logo：把临时设定放在原文件夹旁边
cp "$TMPCFG" "$CFG_DIR/.preview-config.json"; trap 'rm -f "$TMPCFG" "$CFG_DIR/.preview-config.json"' EXIT

"$D/clone-site.sh" master "$SLUG" "$DOM" --basic-auth --noindex "${NEW[@]}"
"$D/apply-brand.sh" "$SLUG" "$CFG_DIR/.preview-config.json"
if [[ ${#EXTRA[@]} -gt 0 ]]; then
  "$D/setup-store.sh" "$SLUG" --no-plugins --brand "$CFG_DIR/.preview-config.json" --force-pages "${EXTRA[@]}"
fi

mkdir -p "$AGENCY_ETC"
[[ -f "$AGENCY_ETC/previews.csv" ]] || echo "slug,created,delete_by,domain" > "$AGENCY_ETC/previews.csv"
sed -i "/^$SLUG,/d" "$AGENCY_ETC/previews.csv"
echo "$SLUG,$(date +%F),$(date -d '+14 days' +%F),$DOM" >> "$AGENCY_ETC/previews.csv"

load_secrets "$SLUG"
echo
ok "Preview 做好了（$(( $(date +%s) - START )) 秒）"
echo "   网址:   $(site_url "$SLUG")"
echo "   帐号:   $BASIC_AUTH_USER"
echo "   密码:   在 sudo cat $SITE_SECRETS （BASIC_AUTH_PASS）"
echo "   删除日: $(date -d '+14 days' +%F)（没成交就删除：cleanup-previews.sh）"
