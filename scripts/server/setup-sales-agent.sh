#!/usr/bin/env bash
# setup-sales-agent.sh —（可选）在服务器跑「销售 AI 助理」服务，给 WordPress 网站的 AI 客服视窗用
#   工作室网站已经搬到 Netlify，它的 AI 客服是 site/netlify/functions/chat/，不需要这个脚本。
#   这个脚本留给以后：客户的 WooCommerce 网店想加 AI 客服时用。
#   1. 设定文件 /etc/agency/sales-agent.env（DeepSeek API Key 由你填，只有 root 能读，不进 git）
#   2. systemd 服务 cartsmith-sales-agent（只听 127.0.0.1:8787；只用 Python 标准库，不用装套件）
#   3. 指定站点的 wp-config.php 加 AGC_AI_CHAT_URL / AGC_AI_CHAT_TOKEN，开启聊天视窗
# 可以重复执行。
source "$(dirname "$0")/../lib/common.sh"
usage() { echo "用法: sudo $0 --site <站点代号> [--no-enable]"; }
SITE=""; ENABLE=1
while [[ $# -gt 0 ]]; do case "$1" in --site) SITE="$2"; shift 2;; --no-enable) ENABLE=0; shift;; -h|--help) usage; exit 0;; *) usage; die "不认识的参数 $1";; esac; done
[[ -n "$SITE" ]] || { usage; die "请指定 --site"; }
require_root
start_log
ENV=/etc/agency/sales-agent.env
PY=$(command -v python3) || die "没有 python3"

info "1/3 设定文件 $ENV"
if [[ ! -f "$ENV" ]]; then
  umask 077
  cat > "$ENV" <<CONF
# 销售 AI 助理设定（只有 root 能读）。改完执行：sudo systemctl restart cartsmith-sales-agent
# 1) 到 https://platform.deepseek.com 建一个 API Key，贴在下面（不要贴到聊天或 git）
DEEPSEEK_API_KEY=
# 2) WordPress 和服务共用的密码（自动产生，不用改）
AGENCY_CHAT_TOKEN=$(rand_pw 40)
# 3) 模型（默认 deepseek-flash）
DEEPSEEK_MODEL=deepseek-flash
CONF
  umask 022
fi
chmod 600 "$ENV"
# shellcheck disable=SC1090
source "$ENV"
[[ -n "${DEEPSEEK_API_KEY:-}" ]] || warn "还没有填 DEEPSEEK_API_KEY：sudo nano $ENV（填好后再跑一次这个脚本）"

info "2/3 systemd 服务"
cat > /etc/systemd/system/cartsmith-sales-agent.service <<UNIT
[Unit]
Description=Cartsmith sales assistant (WordPress AI chat backend)
After=network-online.target

[Service]
EnvironmentFile=$ENV
ExecStart=$PY $AGENCY_ROOT/sales/agent/sales_agent.py serve --port 8787
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
  if [[ -n "${DEEPSEEK_API_KEY:-}" ]]; then
    systemctl enable --now cartsmith-sales-agent >/dev/null 2>&1 && systemctl restart cartsmith-sales-agent
    curl -fsS --max-time 5 http://127.0.0.1:8787/health >/dev/null && ok "服务运行中：127.0.0.1:8787" || warn "服务没有回应：journalctl -u cartsmith-sales-agent -n 50"
  else
    warn "API Key 还没填，服务先不启动"
  fi
else
  warn "这台机器没有 systemd（测试环境），跳过启动"
fi

info "3/3 网站聊天视窗（$SITE）"
if site_exists "$SITE"; then
  wpq "$SITE" config set AGC_AI_CHAT_URL "http://127.0.0.1:8787/chat"
  wpq "$SITE" config set AGC_AI_CHAT_TOKEN "$AGENCY_CHAT_TOKEN"
  if [[ $ENABLE == 1 && -n "${DEEPSEEK_API_KEY:-}" ]]; then wpq "$SITE" agc set ai_chat 1; ok "聊天视窗已开启"; else wpq "$SITE" agc set ai_chat 0; info "聊天视窗先关闭（填好 API Key 后再跑一次）"; fi
  clear_cache "$SITE"
else
  warn "没有站点 $SITE，跳过"
fi
ok "完成。在服务器试聊：sudo bash -c 'set -a; source $ENV; $PY $AGENCY_ROOT/sales/agent/sales_agent.py chat'"
