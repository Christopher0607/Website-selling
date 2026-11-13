#!/usr/bin/env bash
# ops-runner.sh — 自动更新小帮手，每 5 分钟由 cron 执行一次（2026-11-13）
#
# 1. GitHub 上这个分支有新 commit → 拉下来 → 所有站点更新 agency-core 插件和子主题（install-code.sh all both）
# 2. 执行 ops/jobs/ 里还没跑过的维护脚本（按名字顺序，每个只跑一次）
#      - exit 0 = 完成；exit 75 = 现在还不能做（例如 DNS 还没指过来），下次再试，后面的先不跑；其他 = 失败（不会重跑，要重做就放一个新名字的脚本）
# 3. 进度写到 /var/lib/agency-ops/public/status.txt，输出写到 public/jobs/<名字>.log（看起来像密码的值会被遮掉）
#
# 关掉：sudo rm /etc/cron.d/agency-ops
set -u
exec 9>/var/lock/agency-ops.lock
flock -n 9 || exit 0

R="${AGENCY_OPS_ROOT:-$(. /etc/agency/agency.conf 2>/dev/null; echo "${AGENCY_ROOT:-/opt/agency}")}"
export AGENCY_OPS_ROOT="$R"
OPS=/var/lib/agency-ops
PUB=$OPS/public
DONE=$OPS/done
mkdir -p "$PUB/jobs" "$DONE"
st() { echo "$(date -u '+%F %T') UTC  $*" >> "$PUB/status.txt"; }
mask() { sed -E 's/((PASS|PASSWORD|[Pp]assword|TOKEN|[Tt]oken|SECRET|[Ss]ecret|KEY)[A-Za-z_]*["]?[=:] *["]?)[^" ]+/\1[hidden]/g'; }

cd "$R" || exit 1
BR="$(git rev-parse --abbrev-ref HEAD)"
OLD="$(git rev-parse HEAD)"
if timeout 120 git fetch -q origin "$BR" 2>/dev/null; then
  NEW="$(git rev-parse "origin/$BR")"
  if [[ "$OLD" != "$NEW" ]]; then
    git reset -q --hard "origin/$BR"
    st "更新程式 ${OLD:0:7} → ${NEW:0:7}"
    if ls /etc/agency/sites/*.conf >/dev/null 2>&1; then
      if bash "$R/scripts/server/install-code.sh" all both 2>&1 | mask > "$PUB/install-code.log"; then
        st "插件和子主题已装到所有站点"
      else
        st "插件 / 子主题更新失败（看 install-code.log）"
      fi
    fi
  fi
fi

for f in $(ls "$R"/ops/jobs/*.sh 2>/dev/null | sort); do
  n="$(basename "$f" .sh)"
  [[ -f "$DONE/$n" ]] && continue
  bash "$f" 2>&1 | mask > "$PUB/jobs/$n.log"
  rc=${PIPESTATUS[0]}
  if [[ $rc == 75 ]]; then
    msg="$(tail -1 "$PUB/jobs/$n.log")"
    if [[ "$(cat "$OPS/waiting-$n" 2>/dev/null)" != "$msg" ]]; then st "$n：等待中 —— $msg"; echo "$msg" > "$OPS/waiting-$n"; fi
    break
  fi
  date -u '+%F %T' > "$DONE/$n"
  rm -f "$OPS/waiting-$n"
  if [[ $rc == 0 ]]; then st "$n：完成"; else st "$n：失败（exit $rc，看 jobs/$n.log）"; fi
done
date -u '+%F %T UTC' > "$PUB/last-run.txt"
