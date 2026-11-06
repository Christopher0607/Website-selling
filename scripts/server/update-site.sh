#!/usr/bin/env bash
# update-site.sh — 安全更新：先备份 → 更新 → smoke test → 失败自动还原
source "$(dirname "$0")/../lib/common.sh"

usage() {
  cat <<EOF
用法: sudo $0 <站点代号|all> [--exclude 插件1,插件2] [--major] [--simulate-failure]

  --exclude            这些插件不更新
  --major              允许 WordPress 大版本更新（默认只做小版本；大版本先在 staging 测）
  --simulate-failure   演练用：更新后故意让 smoke test 失败，确认会自动还原
EOF
}
[[ $# -lt 1 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
TARGET="$1"; shift; EXCLUDE=""; MAJOR=0; SIMFAIL=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --exclude) EXCLUDE="$2"; shift 2;;
    --major) MAJOR=1; shift;;
    --simulate-failure) SIMFAIL=1; shift;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log "$@"
D="$AGENCY_ROOT/scripts/server"

versions() {
  local slug="$1"
  echo "WordPress $(wpx "$slug" core version 2>/dev/null)"
  wpx "$slug" plugin list --fields=name,version --format=csv 2>/dev/null | tail -n +2 | sed 's/,/ /'
  wpx "$slug" theme list --status=active,parent --fields=name,version --format=csv 2>/dev/null | tail -n +2 | sed 's/,/ /;s/^/theme /'
}

update_one() {
  local slug="$1"; load_site "$slug"
  [[ -f "$SITE_PUBLIC/wp-config.php" ]] || return 0
  info "== $slug（$DOMAIN）=="
  local before after bk
  before="$(versions "$slug")"
  bk="$("$D/backup-site.sh" "$slug" | tail -1)"
  [[ -d "$bk" ]] || { warn "$slug：备份失败，不更新"; return 1; }
  ok "已备份：$bk"

  if [[ $MAJOR == 1 ]]; then wpq "$slug" core update; else wpq "$slug" core update --minor; fi
  if [[ -n "$EXCLUDE" ]]; then wpq "$slug" plugin update --all --exclude="$EXCLUDE"; else wpq "$slug" plugin update --all; fi
  wpq "$slug" theme update --all
  wpq "$slug" core update-db
  if wpx "$slug" plugin is-active woocommerce 2>/dev/null; then wpq "$slug" wc update || true; fi
  wpq "$slug" language core update || true
  wpq "$slug" language plugin update --all || true
  # 重新部署我们自己的插件和子主题（以 repo 版本为准）
  "$D/install-code.sh" "$slug" both >/dev/null
  fix_perms "$slug"
  clear_cache "$slug"
  after="$(versions "$slug")"

  local smoke_ok=1
  if [[ $SIMFAIL == 1 ]]; then
    warn "演练：故意让 smoke test 失败"; smoke_ok=0
  elif ! "$D/smoke-test.sh" "$(site_url "$slug")" --site "$slug" > "$SITE_HOME/tmp/smoke.txt" 2>&1; then
    cat "$SITE_HOME/tmp/smoke.txt"; smoke_ok=0
  fi

  if [[ $smoke_ok == 0 ]]; then
    warn "$slug：更新后检查失败 → 自动还原到 $bk"
    "$D/restore-site.sh" "$slug" "$bk" --yes || die "$slug：自动还原也失败了！请马上手动处理"
    warn "$slug：已还原到更新前的版本。请在 staging 找出哪个更新有问题"
    return 1
  fi
  echo "版本变化："
  diff <(echo "$before") <(echo "$after") | grep '^[<>]' | sed 's/^</  旧:/; s/^>/  新:/' || echo "  （没有变化）"
  set_reg "$slug" LAST_UPDATE "$(date '+%F %T')"
  ok "$slug 更新完成，smoke test PASS"
}

if [[ "$TARGET" == all ]]; then
  rc=0
  for f in "$AGENCY_SITES_DIR"/*.conf; do [[ -e "$f" ]] && { update_one "$(basename "$f" .conf)" || rc=1; }; done
  exit $rc
else
  update_one "$TARGET"
fi
