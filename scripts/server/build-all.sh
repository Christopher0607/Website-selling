#!/usr/bin/env bash
# build-all.sh — 新服务器一次建好全部站点（provision-server.sh 跑完、DNS 生效之后执行）
#   1. master 母版（密码保护 + noindex）
#   2. 三个样板站 demo-rimbun / demo-teduh / demo-kenanga（公开 + noindex + Demo 模式）
#   3. 工作室网站（公开、可收录）
# 可以重复执行（已经存在的站点只会更新内容）。本地测试约 5 分钟（真服务器加上申请 SSL 大约 10–15 分钟）。
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 [--no-ssl] [--skip-studio]"; }
NEW=(); STUDIO=1
while [[ $# -gt 0 ]]; do
  case "$1" in --no-ssl) NEW+=(--no-ssl); shift;; --skip-studio) STUDIO=0; shift;; -h|--help) usage; exit 0;; *) usage; die "不认识的参数 $1";; esac
done
require_root
start_log
D="$AGENCY_ROOT/scripts/server"
[[ "$STUDIO_DOMAIN" == yourbrand.com ]] && die "先在 /etc/agency/agency.conf 设定 STUDIO_DOMAIN"
START=$(date +%s)

info "== 1/3 母版 master.$STUDIO_DOMAIN =="
site_exists master || "$D/new-site.sh" master "master.$STUDIO_DOMAIN" --basic-auth --noindex --title "Master Store" "${NEW[@]}"
"$D/setup-store.sh" master --content "$AGENCY_ROOT/sites/master/content" --products "$AGENCY_ROOT/sites/master/products.csv"

info "== 2/3 样板站 =="
for demo in demo-rimbun demo-teduh demo-kenanga; do
  "$D/build-demo.sh" "$demo" "${NEW[@]}"
done

if [[ $STUDIO == 1 ]]; then
  info "== 3/3 工作室网站 $STUDIO_DOMAIN =="
  "$D/setup-studio.sh" "$STUDIO_DOMAIN" "${NEW[@]}"
fi

echo
"$D/site-inventory.sh"
ok "全部完成（$(( ($(date +%s) - START) / 60 )) 分钟）"
echo "   密码：sudo cat /etc/agency/secrets/<代号>.env   → 存进密码管理器"
