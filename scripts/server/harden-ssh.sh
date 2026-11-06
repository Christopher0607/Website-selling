#!/usr/bin/env bash
# harden-ssh.sh — 关闭 root 登录和密码登录（最后一步）
# 只有在你已经用新视窗确认  ssh deploy@<IP>  能登录、 sudo -v  正常之后才执行！
source "$(dirname "$0")/../lib/common.sh"

DEPLOY_USER="deploy"
[[ "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { echo "用法: sudo $0 [--deploy-user deploy] [--yes]"; exit 0; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-user) DEPLOY_USER="$2"; shift 2;;
    --yes) ASSUME_YES=1; shift;;
    *) die "不认识的参数 $1";;
  esac
done
require_root
start_log

# 安全检查：避免把自己锁在外面
id "$DEPLOY_USER" >/dev/null 2>&1 || die "用户 $DEPLOY_USER 不存在"
AK="/home/$DEPLOY_USER/.ssh/authorized_keys"
[[ -s "$AK" ]] || die "$AK 是空的——$DEPLOY_USER 不能用密钥登录，停止"
sudo -l -U "$DEPLOY_USER" 2>/dev/null | grep -q "ALL" || die "$DEPLOY_USER 没有 sudo 权限，停止"

echo "将会："
echo "  - PermitRootLogin no（root 不能 SSH 登录）"
echo "  - PasswordAuthentication no（只能用密钥）"
echo "之后只能用  ssh $DEPLOY_USER@<IP>  登录。请确认你已经在另一个视窗测试过。"
confirm "确定要继续吗？" || die "已取消"

cat > /etc/ssh/sshd_config.d/99-agency-hardening.conf <<'EOF'
# 由 harden-ssh.sh 建立
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PubkeyAuthentication yes
MaxAuthTries 4
X11Forwarding no
EOF
sshd -t || { rm -f /etc/ssh/sshd_config.d/99-agency-hardening.conf; die "sshd 设定有错，已还原"; }
svc reload ssh >/dev/null 2>&1 || svc reload sshd >/dev/null 2>&1 || svc restart ssh
ok "SSH 已加固。现在开新视窗测试："
echo "   ssh $DEPLOY_USER@<IP>   → 应该可以登录"
echo "   ssh root@<IP>           → 应该被拒绝"
