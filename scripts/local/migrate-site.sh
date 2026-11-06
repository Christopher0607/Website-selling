#!/usr/bin/env bash
# migrate-site.sh — 跨服务器搬站（例如客户测试站 dev → 生产服务器 prod）
# 在你自己的电脑执行（两台服务器都要能用 ssh 登录，都已经跑过 provision-server.sh 并有 /opt/agency）
#
# 流程：来源服务器备份 → 经过你的电脑传到目标服务器 → 目标建空站 → 还原（自动换网址）→ smoke test
# 第一个客户上线前，先用一个临时测试站演练一次！
set -euo pipefail
usage() {
  cat <<USAGE
用法: $0 <来源主机> <来源代号> <目标主机> <目标代号> <目标域名> [--basic-auth] [--noindex] [--www]
例子: $0 agency-dev staging-c001 agency-prod c001 www-client.com.my --www
USAGE
}
[[ $# -lt 5 || "$1" == -h || "$1" == --help ]] && { usage; exit 0; }
SRC_HOST="$1"; SRC="$2"; DST_HOST="$3"; DST="$4"; DOM="$5"; shift 5
FLAGS="$*"
REPO="${AGENCY_REMOTE_ROOT:-/opt/agency}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "[1/5] 在 $SRC_HOST 备份 $SRC"
BK="$(ssh "$SRC_HOST" "sudo $REPO/scripts/server/backup-site.sh $SRC --keep 30 | tail -1")"
[[ -n "$BK" ]] || { echo "备份失败"; exit 1; }
echo "      $BK"

echo "[2/5] 下载备份到本机"
ssh "$SRC_HOST" "sudo tar -C '$BK' -cf - db.sql.gz files.tar.gz meta.env" > "$TMP/backup.tar"

echo "[3/5] 上传到 $DST_HOST"
REMOTE_DIR="/var/backups/agency/incoming/$SRC-$(date +%Y%m%d-%H%M%S)"
ssh "$DST_HOST" "sudo mkdir -p '$REMOTE_DIR' && sudo tar -C '$REMOTE_DIR' -xf -" < "$TMP/backup.tar"

echo "[4/5] 在 $DST_HOST 建空站 $DST 并还原"
ssh "$DST_HOST" "sudo $REPO/scripts/server/new-site.sh $DST $DOM --empty $FLAGS && sudo $REPO/scripts/server/restore-site.sh $DST '$REMOTE_DIR' --yes --no-smoke && sudo $REPO/scripts/server/install-code.sh $DST both"

echo "[5/5] smoke test"
ssh "$DST_HOST" "sudo bash -c 'source /etc/agency/sites/$DST.conf; $REPO/scripts/server/smoke-test.sh \$( [[ \$SSL == 1 ]] && echo https || echo http )://\$DOMAIN --site $DST'"
echo "完成。记得：DNS 指向 $DST_HOST、basic auth / noindex 按需要关掉（site-config.sh）、apply-brand 的 mode 改成 live。"
