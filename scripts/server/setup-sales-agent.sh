#!/usr/bin/env bash
# setup-sales-agent.sh — 在服务器装好「销售 AI 助理」并接上工作室网站的 AI 客服
#   1. Python 虚拟环境 /opt/agency-venv + anthropic SDK
#   2. 设定文件 /etc/agency/sales-agent.env（API Key 由你填，只有 root 能读，不进 git）
#   3. systemd 服务 kedailab-sales-agent（只听 127.0.0.1:8787）
#   4. 工作室网站 wp-config.php 加 AGC_AI_CHAT_URL / AGC_AI_CHAT_TOKEN，开启聊天视窗
# 可以重复执行。
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 [--site studio] [--no-enable]"; }
SITE=studio; ENABLE=1
while [[ $# -gt 0 ]]; do case "$1" in --site) SITE="$2"; shift 2;; --no-enable) ENABLE=0; shift;; -h|--help) usage; exit 0;; *) usage; die "不认识的参数 $1";; esac; done
require_root
start_log
ENV=/etc/agency/sales-agent.env
VENV=/opt/agency-venv

info "1/4 Python 环境"
command -v python3 >/dev/null || die "没有 python3"
apt-get install -y -q python3-venv >/dev/null 2>&1 || true
[[ -x "$VENV/bin/python" ]] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q -r "$AGENCY_ROOT/sales/agent/requirements.txt" || die "安装 anthropic SDK 失败"
ok "$("$VENV/bin/python" -c 'import anthropic; print("anthropic", anthropic.__version__)')"

info "2/4 设定文件 $ENV"
if [[ ! -f "$ENV" ]]; then
  umask 077
  cat > "$ENV" <<CONF
# 销售 AI 助理设定（只有 root 能读）。改完执行：sudo systemctl restart kedailab-sales-agent
# 1) 到 https://console.anthropic.com 建一个 API Key，贴在下面（不要贴到聊天或 git）
ANTHROPIC_API_KEY=
# 2) WordPress 和服务共用的密码（自动产生，不用改）
KEDAILAB_CHAT_TOKEN=$(rand_pw 40)
# 3) 模型（默认 Claude Opus 5.5）
KEDAILAB_MODEL=claude-opus-5-5
CONF
  umask 022
fi
chmod 600 "$ENV"
# shellcheck disable=SC1090
source "$ENV"
[[ -n "${ANTHROPIC_API_KEY:-}" ]] || warn "还没有填 ANTHROPIC_API_KEY：sudo nano $ENV（填好后再跑一次这个脚本）"

info "3/4 systemd 服务"
cat > /etc/systemd/system/kedailab-sales-agent.service <<UNIT
[Unit]
Description=KedaiLab sales assistant (website AI chat)
After=network-online.target

[Service]
EnvironmentFile=$ENV
ExecStart=$VENV/bin/python $AGENCY_ROOT/sales/agent/kedailab_sales.py serve --port 8787
Restart=on-failure
RestartSec=5
DynamicUser=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
UNIT
if has_systemd; then
  systemctl daemon-reload
  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    systemctl enable --now kedailab-sales-agent >/dev/null 2>&1 && systemctl restart kedailab-sales-agent
    curl -fsS --max-time 5 http://127.0.0.1:8787/health >/dev/null && ok "服务运行中：127.0.0.1:8787" || warn "服务没有回应：journalctl -u kedailab-sales-agent -n 50"
  else
    warn "API Key 还没填，服务先不启动"
  fi
else
  warn "这台机器没有 systemd（测试环境），跳过启动"
fi

info "4/4 工作室网站聊天视窗（$SITE）"
if site_exists "$SITE"; then
  wpq "$SITE" config set AGC_AI_CHAT_URL "http://127.0.0.1:8787/chat"
  wpq "$SITE" config set AGC_AI_CHAT_TOKEN "$KEDAILAB_CHAT_TOKEN"
  if [[ $ENABLE == 1 && -n "${ANTHROPIC_API_KEY:-}" ]]; then wpq "$SITE" agc set ai_chat 1; ok "聊天视窗已开启"; else wpq "$SITE" agc set ai_chat 0; info "聊天视窗先关闭（填好 API Key 后再跑一次）"; fi
  clear_cache "$SITE"
else
  warn "没有站点 $SITE，跳过"
fi
ok "完成。在服务器试聊：sudo bash -c 'set -a; source $ENV; $VENV/bin/python $AGENCY_ROOT/sales/agent/kedailab_sales.py chat'"
