#!/usr/bin/env bash
# provision-server.sh — 新服务器初始化（以 root 执行一次）
# 用法：sudo bash scripts/server/provision-server.sh --studio-domain kedailab.com --email you@gmail.com
#
# 会做：系统更新、时区、deploy 用户、swap、防火墙、fail2ban、自动安全更新、
#       Nginx / PHP-FPM / MariaDB / WP-CLI / Certbot / 工具，套用 PHP 和 Nginx 设定，
#       建 /etc/agency/agency.conf，设定每天备份的 cron，最后列出版本摘要。
# 不会做：关闭 root 登录（那是 harden-ssh.sh，确认 deploy 能登录后才跑）。
source "$(dirname "$0")/../lib/common.sh"

usage() {
  cat <<EOF
用法: sudo $0 --studio-domain <域名> --email <电邮> [--deploy-user deploy] [--no-ufw] [--skip-upgrade]

  --studio-domain   工作室域名，例如 kedailab.com（写进 /etc/agency/agency.conf）
  --email           接收 SSL 到期通知、WordPress 管理员电邮
  --deploy-user     日常登录用的非 root 用户（默认 deploy）
  --no-ufw          不设定防火墙（只在容器测试时用）
  --skip-upgrade    不跑 apt upgrade（测试用）
EOF
}

STUDIO=""; EMAIL=""; DEPLOY_USER="deploy"; USE_UFW=1; UPGRADE=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --studio-domain) STUDIO="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --deploy-user) DEPLOY_USER="$2"; shift 2;;
    --no-ufw) USE_UFW=0; shift;;
    --skip-upgrade) UPGRADE=0; shift;;
    -h|--help) usage; exit 0;;
    *) usage; die "不认识的参数 $1";;
  esac
done
[[ -n "$STUDIO" && -n "$EMAIL" ]] || { usage; die "缺少 --studio-domain 或 --email"; }
require_root
start_log "$@"
export DEBIAN_FRONTEND=noninteractive

info "1/12 更新系统套件（几分钟）"
run_quiet apt-get update -q
[[ $UPGRADE == 1 ]] && run_quiet apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
ok "系统已更新"

info "2/12 时区 Asia/Kuala_Lumpur"
if command -v timedatectl >/dev/null && has_systemd; then timedatectl set-timezone Asia/Kuala_Lumpur
else ln -sf /usr/share/zoneinfo/Asia/Kuala_Lumpur /etc/localtime; echo "Asia/Kuala_Lumpur" > /etc/timezone; fi
ok "时区 $(date +%Z)"

info "3/12 deploy 用户"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER" >/dev/null
fi
usermod -aG sudo "$DEPLOY_USER"
# deploy 只能用密钥登录、没有密码，所以 sudo 不问密码
echo "$DEPLOY_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$DEPLOY_USER"
chmod 440 "/etc/sudoers.d/90-$DEPLOY_USER"
visudo -cf "/etc/sudoers.d/90-$DEPLOY_USER" >/dev/null || die "sudoers 设定有错"
DH="/home/$DEPLOY_USER"
mkdir -p "$DH/.ssh"
if [[ -f /root/.ssh/authorized_keys ]]; then
  cp /root/.ssh/authorized_keys "$DH/.ssh/authorized_keys"
else
  warn "root 没有 authorized_keys，deploy 还不能用密钥登录——请手动加公钥到 $DH/.ssh/authorized_keys"
  touch "$DH/.ssh/authorized_keys"
fi
chmod 700 "$DH/.ssh"; chmod 600 "$DH/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DH/.ssh"
ok "deploy 用户：$DEPLOY_USER（sudo 免密码，SSH 密钥 $(grep -c . "$DH/.ssh/authorized_keys" || true) 把）"

info "4/12 swap"
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [[ $(swapon --show --noheadings 2>/dev/null | wc -l) -eq 0 && $MEM_MB -lt 4096 ]]; then
  if fallocate -l 2G /swapfile 2>/dev/null && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile 2>/dev/null; then
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -q vm.swappiness=10; echo 'vm.swappiness=10' > /etc/sysctl.d/99-agency-swap.conf
    ok "已加 2 GB swap"
  else
    rm -f /swapfile; warn "无法建立 swap（容器环境常见），跳过"
  fi
else
  ok "swap 已存在或内存足够（${MEM_MB} MB），跳过"
fi

info "5/12 安装软件（Nginx / PHP / MariaDB / Certbot / 工具）"
run_quiet apt-get install -y -q \
  nginx mariadb-server mariadb-client \
  php-fpm php-cli php-mysql php-curl php-gd php-imagick php-intl php-mbstring php-xml php-zip php-bcmath php-opcache \
  certbot python3-certbot-nginx \
  unzip zip git jq webp imagemagick librsvg2-bin apache2-utils rsync curl ca-certificates cron \
  ufw fail2ban unattended-upgrades
PHPV="$(php_version)"; FPM_POOL_DIR="/etc/php/$PHPV/fpm/pool.d"; FPM_SERVICE="php$PHPV-fpm"
ok "PHP $PHPV、nginx $(nginx -v 2>&1 | cut -d/ -f2)、$(mysql --version | grep -o "[0-9.]*-MariaDB")"

info "6/12 WP-CLI"
TMPW=$(mktemp)
curl -fsSL -o "$TMPW" https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
php "$TMPW" --info >/dev/null 2>&1 || die "WP-CLI 下载不完整"
install -m 755 "$TMPW" /usr/local/bin/wp; rm -f "$TMPW"
ok "$(wp --allow-root --version)"

info "7/12 PHP 设定"
for sapi in fpm cli; do
  cat > "/etc/php/$PHPV/$sapi/conf.d/99-agency.ini" <<'INI'
memory_limit = 256M
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 120
max_input_vars = 3000
expose_php = Off
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 20000
opcache.validate_timestamps = 1
opcache.revalidate_freq = 60
date.timezone = Asia/Kuala_Lumpur
INI
done
# 停用默认 www pool（每个站点有自己的 pool）
[[ -f "$FPM_POOL_DIR/www.conf" ]] && mv "$FPM_POOL_DIR/www.conf" "$FPM_POOL_DIR/www.conf.disabled"
# 至少要有一个 pool，php-fpm 才能启动
cat > "$FPM_POOL_DIR/zz-agency-default.conf" <<EOF
[agency-default]
user = www-data
group = www-data
listen = /run/php/agency-default.sock
listen.owner = www-data
listen.group = www-data
pm = ondemand
pm.max_children = 2
EOF
ok "PHP 设定完成"

info "8/12 Nginx 设定"
mkdir -p "$AGENCY_CACHE_DIR" /etc/nginx/agency
chown www-data:www-data "$AGENCY_CACHE_DIR"
cat > /etc/nginx/conf.d/00-agency.conf <<EOF
# 由 provision-server.sh 产生
server_tokens off;
client_max_body_size 64M;
gzip_vary on;
gzip_comp_level 5;
gzip_min_length 256;
gzip_types text/plain text/css application/javascript application/json image/svg+xml application/xml text/xml;
fastcgi_cache_key "\$scheme\$request_method\$host\$request_uri";
fastcgi_cache_use_stale error timeout updating http_500;
fastcgi_cache_lock on;
EOF
# 每个站点都 include 的共用规则
cat > /etc/nginx/agency/common.conf <<'EOF'
# 由 provision-server.sh 产生 —— 所有站点共用
location = /favicon.ico { log_not_found off; access_log off; }
location = /robots.txt  { try_files $uri /index.php?$args; access_log off; }
location ~ /\.(?!well-known) { deny all; }
location ~* /(\.env|\.git|composer\.(json|lock)|readme\.html|license\.txt) { deny all; }
location ~* wp-config\.php(\.|~|$) { deny all; }
location = /xmlrpc.php { deny all; access_log off; }
location ~* /wp-content/uploads/.*\.php$ { deny all; }
location ~* \.(?:css|js|mjs|jpg|jpeg|gif|png|webp|avif|svg|ico|woff2?|ttf)$ {
  expires 30d;
  add_header Cache-Control "public, max-age=2592000";
  access_log off;
  try_files $uri =404;
}
EOF
# 缓存跳过规则（WooCommerce 购物车 / 结账 / 登录用户 不缓存）
cat > /etc/nginx/agency/cache-bypass.conf <<'EOF'
set $agc_skip 0;
if ($request_method = POST) { set $agc_skip 1; }
if ($query_string != "") { set $agc_skip 1; }
if ($request_uri ~* "/(wp-admin|wp-login\.php|wp-json|cart|checkout|my-account|wc-api|addons|feed|xmlrpc\.php)") { set $agc_skip 1; }
if ($http_cookie ~* "wordpress_logged_in|wp-postpass|woocommerce_items_in_cart|woocommerce_cart_hash|wp_woocommerce_session_|comment_author") { set $agc_skip 1; }
EOF
# 默认 server：不认识的域名一律断开
rm -f /etc/nginx/sites-enabled/default
V6LINE="  listen [::]:80 default_server;"; ipv6_ok || V6LINE=""
cat > /etc/nginx/sites-available/000-default <<EOF
server {
  listen 80 default_server;
$V6LINE
  server_name _;
  location /.well-known/acme-challenge/ { root /var/www/html; }
  location / { return 444; }
}
EOF
ln -sf /etc/nginx/sites-available/000-default /etc/nginx/sites-enabled/000-default
nginx -t >/dev/null 2>&1 || { nginx -t; die "Nginx 设定有错"; }
ok "Nginx 设定完成"

info "9/12 MariaDB 基本安全设定"
svc start mariadb >/dev/null 2>&1 || svc start mysql >/dev/null 2>&1 || true
mysql_root -e "DELETE FROM mysql.global_priv WHERE User=''; DROP DATABASE IF EXISTS test; DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%'; FLUSH PRIVILEGES;" 2>/dev/null \
  || mysql_root -e "DROP DATABASE IF EXISTS test; FLUSH PRIVILEGES;"
ok "MariaDB：删除匿名用户和 test 数据库；root 只能在服务器本机用 sudo 登录"

info "10/12 防火墙 / fail2ban / 自动安全更新"
if [[ $USE_UFW == 1 ]]; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
  ok "ufw：只开 22、80、443"
else
  warn "跳过 ufw（--no-ufw）"
fi
cat > /etc/fail2ban/jail.d/agency.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
EOF
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
for s in fail2ban unattended-upgrades cron; do
  if has_systemd; then systemctl enable --now "$s" >/dev/null 2>&1 || warn "$s 没有启动"; else svc start "$s" >/dev/null 2>&1 || true; fi
done
ok "fail2ban、自动安全更新已开启"

info "11/12 /etc/agency 设定和目录"
mkdir -p "$AGENCY_SITES_DIR" "$AGENCY_SECRETS_DIR" "$AGENCY_LOG_DIR" "$AGENCY_BACKUP_DIR"
chmod 700 "$AGENCY_SECRETS_DIR" "$AGENCY_BACKUP_DIR"
if [[ ! -f "$AGENCY_CONF" ]]; then
  cat > "$AGENCY_CONF" <<EOF
# 工作室服务器设定（由 provision-server.sh 建立，可以手动修改）
STUDIO_DOMAIN="$STUDIO"
ADMIN_EMAIL="$EMAIL"
WP_ADMIN_USER="studio_admin"   # WordPress 管理员用户名（不能是 admin）
WP_LOCALE="en_US"
SSL_ENABLED=1
BACKUP_KEEP=7
PAGE_CACHE_TTL="2m"
AGENCY_ROOT="$AGENCY_ROOT"
EOF
fi
chmod 644 "$AGENCY_CONF"
# 每天 03:15 备份所有站点；每周日 04:00 清除过期 preview 的提醒
cat > /etc/cron.d/agency <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
15 3 * * * root $AGENCY_ROOT/scripts/server/backup-site.sh --all >/dev/null 2>&1
0 9 * * 1 root $AGENCY_ROOT/scripts/server/cleanup-previews.sh --list-only >> $AGENCY_LOG_DIR/previews-due.log 2>&1
EOF
chmod 644 /etc/cron.d/agency
ok "设定文件 $AGENCY_CONF；cron：每天 03:15 备份"

info "12/12 启动服务"
svc restart "$FPM_SERVICE" >/dev/null
svc restart nginx >/dev/null
if has_systemd; then systemctl enable nginx "$FPM_SERVICE" mariadb >/dev/null 2>&1 || true; fi

echo
echo "================ 版本摘要 ================"
echo "系统:     $(. /etc/os-release; echo "$PRETTY_NAME")"
echo "Nginx:    $(nginx -v 2>&1 | cut -d/ -f2)"
echo "PHP:      $(php -r 'echo PHP_VERSION;')"
echo "MariaDB:  $(mysql --version | grep -o "[0-9.]*-MariaDB")"
echo "WP-CLI:   $(wp --allow-root --version | awk '{print $2}')"
echo "Certbot:  $(certbot --version 2>/dev/null || echo "无法执行，请检查 certbot")"
echo "时区:     $(date '+%Z %z')"
echo "swap:     $(free -h | awk '/Swap/ {print $2}')"
echo "工作室域名: $STUDIO"
echo "=========================================="
ok "完成。下一步：开一个新的终端视窗测试  ssh $DEPLOY_USER@<服务器IP>  和  sudo -v"
echo "   确认可以登录之后，才执行  sudo bash $AGENCY_ROOT/scripts/server/harden-ssh.sh"
