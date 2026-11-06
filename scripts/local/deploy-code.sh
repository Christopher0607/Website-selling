#!/usr/bin/env bash
# deploy-code.sh — 在你自己的电脑（Git Bash / Mac / Linux）执行：
#   1. 服务器上的 repo 拉最新版本（git pull）
#   2. 把 agency-core 插件和子主题装进站点
#   3. 跑 smoke test
# 前提：你已经 git push 了最新的改动；~/.ssh/config 有 Host 别名（例如 agency-dev）
set -euo pipefail
usage() { echo "用法: $0 <ssh 主机，例如 agency-dev> <站点代号|all> [plugin|theme|both]"; }
[[ $# -lt 2 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
HOST="$1"; TARGET="$2"; WHAT="${3:-both}"
REPO="${AGENCY_REMOTE_ROOT:-/opt/agency}"
ssh "$HOST" "set -e; cd $REPO && sudo git pull --ff-only && sudo $REPO/scripts/server/install-code.sh $TARGET $WHAT"
if [[ "$TARGET" != all ]]; then
  ssh "$HOST" "sudo bash -c 'source /etc/agency/sites/$TARGET.conf; $REPO/scripts/server/smoke-test.sh \$( [[ \$SSL == 1 ]] && echo https || echo http )://\$DOMAIN --site $TARGET'"
fi
