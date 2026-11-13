#!/bin/bash
# cloud-init.sh — 新服务器第一次开机时自动执行（2026-11-13）
#
# 由 scripts/local/do-server.sh create 放进 DigitalOcean 的开机设定（user_data），以 root 执行一次。
# 用在「网页版 / 手机版 Claude Code 连不上 SSH」的情况：服务器自己把能做的都做完，进度写在
#   http://<服务器IP>/agency-ops-<代号>/status.txt     （代号只在建立服务器时产生，不放进 git；页面不写任何密码）
#
# 顺序：下载项目 → provision-server.sh（Nginx / PHP / MariaDB / 防火墙…）→ 自动更新小帮手（ops-setup.sh）
#       → 之后的事都交给小帮手：ops/jobs/001-build-sites.sh 等 DNS 指过来再建母版 + 节日网店示范
#
# 下面 4 个值由 do-server.sh 填好再送出。
set -u
BRANCH="__BRANCH__"
EMAIL="__EMAIL__"
TOKEN="__OPS_TOKEN__"
DOMAIN="__DOMAIN__"
REPO="https://github.com/Christopher0607/Website-selling.git"

OPS=/var/lib/agency-ops
PUB=$OPS/public
mkdir -p "$PUB"
chmod 755 "$OPS" "$PUB"
umask 077
echo "$TOKEN" > "$OPS/token"
umask 022
st() { echo "$(date -u '+%F %T') UTC  $*" >> "$PUB/status.txt"; }

st "开机设定开始（分支 $BRANCH）"
export DEBIAN_FRONTEND=noninteractive
# First boot: unattended-upgrades may hold the apt lock; wait for it instead of failing.
echo 'DPkg::Lock::Timeout "900";' > /etc/apt/apt.conf.d/90agency-lock-wait
for i in 1 2 3 4 5; do apt-get update -y >/dev/null 2>&1 && apt-get install -y git >/dev/null 2>&1 && break; sleep 20; done
if ! git clone -q -b "$BRANCH" "$REPO" /opt/agency; then
  st "失败：下载项目"
  exit 1
fi
st "下载项目：完成（$(git -C /opt/agency rev-parse --short HEAD)）"

# The status page needs Nginx, which provision installs; until then the log stays on disk.
if bash /opt/agency/scripts/server/provision-server.sh --studio-domain "$DOMAIN" --email "$EMAIL" > /var/log/agency-provision.log 2>&1; then
  st "服务器初始化：完成"
else
  st "失败：服务器初始化（最后 30 行如下）"
  tail -30 /var/log/agency-provision.log | sed -E 's/((PASS|PASSWORD|password|token|TOKEN)[^=:]*[=:] *)[^ ]+/\1[hidden]/' | sed 's/^/    /' >> "$PUB/status.txt"
fi

# SSH: keys only. A root password chosen in the DigitalOcean form stays usable in the website's Recovery Console,
# and the normal web Console (Droplet Agent) keeps working, but nobody can try passwords over SSH.
cat > /etc/ssh/sshd_config.d/10-agency-no-password.conf <<'EOF2'
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF2
if sshd -t 2>/dev/null; then systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true; st "SSH：只能用密钥登录（网页 Console 照样可以用）"; else rm -f /etc/ssh/sshd_config.d/10-agency-no-password.conf; fi

if bash /opt/agency/scripts/server/ops-setup.sh; then
  st "自动更新小帮手：已安装（每 5 分钟检查一次 GitHub）"
else
  st "失败：自动更新小帮手"
fi
# First round now (it starts the site build as soon as DNS points here).
bash /opt/agency/scripts/server/ops-runner.sh || true
