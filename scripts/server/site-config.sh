#!/usr/bin/env bash
# site-config.sh — 改站点的 Nginx 层设定：SSL、basic auth、noindex、页面缓存、www
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"

usage() {
  cat <<EOF
用法: sudo $0 <站点代号> [--ssl] [--basic-auth on|off] [--noindex on|off] [--cache on|off] [--www on|off] [--show]

  --ssl            申请（或重新申请）SSL 证书，网址改为 https
  --basic-auth     开 / 关密码保护（PageSpeed 测试前可以暂时关掉，测完马上开回来）
  --noindex        开 / 关 noindex 标头（WordPress 的设定由 apply-brand.sh 的 mode 控制）
  --show           显示目前设定和 basic auth 密码
EOF
}
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SLUG_ARG="$1"; shift
require_root
start_log "$SLUG_ARG" "$@"
load_site "$SLUG_ARG"
onoff() { case "$1" in on|1|yes) echo 1;; off|0|no) echo 0;; *) die "只能是 on 或 off";; esac; }
DO_SSL=0; CHANGED=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssl) DO_SSL=1; shift;;
    --basic-auth) v=$(onoff "$2"); set_reg "$SLUG_ARG" BASIC_AUTH "$v"; [[ $v == 1 ]] && setup_basic_auth "$SLUG_ARG"; CHANGED=1; shift 2;;
    --noindex) set_reg "$SLUG_ARG" NOINDEX "$(onoff "$2")"; CHANGED=1; shift 2;;
    --cache) set_reg "$SLUG_ARG" CACHE "$(onoff "$2")"; CHANGED=1; shift 2;;
    --www) set_reg "$SLUG_ARG" WWW "$(onoff "$2")"; CHANGED=1; shift 2;;
    --show)
      cat "$SITE_REG"; grep -E '^BASIC_AUTH_(USER|PASS)=' "$AGENCY_SECRETS_DIR/$SLUG_ARG.env" 2>/dev/null || true; shift;;
    *) usage; die "不认识的参数 $1";;
  esac
done
if [[ $CHANGED == 1 ]]; then render_nginx "$SLUG_ARG"; reload_web; clear_cache "$SLUG_ARG"; ok "Nginx 设定已更新"; fi
if [[ $DO_SSL == 1 ]]; then
  if obtain_ssl "$SLUG_ARG"; then
    NEW="https://$DOMAIN"
    OLD="$(wpx "$SLUG_ARG" option get siteurl 2>/dev/null || true)"
    if [[ -n "$OLD" && "$OLD" != "$NEW" ]]; then
      wpq "$SLUG_ARG" search-replace "$OLD" "$NEW" --all-tables
      clear_cache "$SLUG_ARG"
    fi
    ok "SSL 已启用：$NEW"
  else
    die "SSL 申请失败：确认 DNS 已经指向这台服务器（dig +short $DOMAIN），80 端口有开"
  fi
fi
