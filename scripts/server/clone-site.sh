#!/usr/bin/env bash
# clone-site.sh — 复制一个站点（例如从 master 复制出样板站 / preview / 客户测试站）
source "$(dirname "$0")/../lib/common.sh"

usage() {
  cat <<EOF
用法: sudo $0 <来源代号> <目标代号> <目标域名> [--basic-auth] [--noindex] [--no-ssl] [--www] [--title "名称"]

会做：建空站 → 备份来源 → 还原到目标（自动换网址、新 salts）→ 清掉会"串站"的设定
      （UpdraftPlus 远端储存、追踪 ID、邮件发件设定）→ 清缓存 → smoke test
例子:  sudo $0 master demo-glow demo-glow.yourdomain.com --noindex
EOF
}
[[ $# -lt 3 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SRC="$1"; DST="$2"; DOM="$3"; shift 3
NEW_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --basic-auth|--noindex|--no-ssl|--www) NEW_ARGS+=("$1"); shift;;
    --title) NEW_ARGS+=(--title "$2"); shift 2;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log "$SRC" "$DST" "$DOM"
site_exists "$SRC" || die "来源站点 $SRC 不存在"
START=$(date +%s)
D="$AGENCY_ROOT/scripts/server"

info "1/5 建立空站 $DST"
"$D/new-site.sh" "$DST" "$DOM" --empty --source "$SRC" "${NEW_ARGS[@]}" | sed 's/^/    /'

info "2/5 备份来源 $SRC"
BK="$("$D/backup-site.sh" "$SRC" --keep 30 | tail -1)"
[[ -d "$BK" ]] || die "来源备份失败"

info "3/5 还原到 $DST"
"$D/restore-site.sh" "$DST" "$BK" --yes --no-smoke | sed 's/^/    /'

info "4/5 清掉不该复制的设定"
wpq "$DST" option delete updraft_googledrive || true
wpq "$DST" option delete updraft_service || true
wpq "$DST" option delete updraftplus-addons_siteid || true
wpq "$DST" option delete fluentmail-settings || true
wpq "$DST" agc set ga4_id "" || true
wpq "$DST" agc set meta_pixel_id "" || true
wpq "$DST" option delete agc_brand_assets || true
# 管理员密码：目标站用新的随机密码
load_secrets "$DST"
NEWPW="$(rand_pw 24)"
wpq "$DST" user update "$WP_ADMIN_USER" --user_pass="$NEWPW" --skip-email
sed -i '/^WP_ADMIN_USER=/d; /^WP_ADMIN_PASS=/d' "$SITE_SECRETS"
{ echo "WP_ADMIN_USER=\"$WP_ADMIN_USER\""; echo "WP_ADMIN_PASS=\"$NEWPW\""; } >> "$SITE_SECRETS"
NOI="$(source "$AGENCY_SITES_DIR/$DST.conf"; echo "$NOINDEX")"
wpq "$DST" option update blog_public "$([[ "$NOI" == 1 ]] && echo 0 || echo 1)"
clear_cache "$DST"
ok "已清除：备份远端、邮件设定、追踪 ID；管理员换了新密码"

info "5/5 smoke test"
URL="$(site_url "$DST")"
"$D/smoke-test.sh" "$URL" --site "$DST" | tail -2
ok "复制完成（$(( $(date +%s) - START )) 秒）：$URL"
echo "   下一步：sudo $D/apply-brand.sh $DST <brand-config.json>"
