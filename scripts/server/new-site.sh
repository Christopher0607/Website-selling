#!/usr/bin/env bash
# new-site.sh — 建一个新的 WordPress 站点（每个站点独立的 Linux 用户、PHP-FPM pool、数据库）
source "$(dirname "$0")/../lib/common.sh"
source "$(dirname "$0")/../lib/site.sh"

usage() {
  cat <<EOF
用法: sudo $0 <站点代号> <域名> [选项]

  --basic-auth    要输入帐号密码才能看（母版、preview、客户测试站）
  --noindex       不让搜索引擎收录
  --no-ssl        不申请 SSL（域名还没指向服务器时，或本地测试）
  --www           同时接受 www.<域名>，并跳转到主域名
  --no-cache      不开页面缓存
  --title "名称"  网站名称（默认用代号）
  --empty         只建环境（用户、目录、数据库、Nginx），不装 WordPress（clone / restore 用）
  --source <代号> 记录这个站是从哪个站复制的（clone-site.sh 用）

例子:
  sudo $0 master master.yourdomain.com --basic-auth --noindex
  sudo $0 studio yourdomain.com --www
EOF
}

[[ $# -lt 2 || "$1" == -* ]] && { usage; exit 1; }
SLUG_ARG="$1"; DOMAIN_ARG="$2"; shift 2
BA=0; NOI=0; USE_SSL="$SSL_ENABLED"; WWW_ARG=0; CACHE_ARG=1; TITLE=""; EMPTY=0; SOURCE_ARG=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --basic-auth) BA=1; shift;;
    --noindex) NOI=1; shift;;
    --no-ssl) USE_SSL=0; shift;;
    --www) WWW_ARG=1; shift;;
    --no-cache) CACHE_ARG=0; shift;;
    --title) TITLE="$2"; shift 2;;
    --empty) EMPTY=1; shift;;
    --source) SOURCE_ARG="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) usage; die "不认识的参数 $1";;
  esac
done
require_root
start_log "$SLUG_ARG" "$DOMAIN_ARG"
need_cmd wp nginx mysql htpasswd
validate_slug "$SLUG_ARG"
[[ "$DOMAIN_ARG" =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || die "域名「$DOMAIN_ARG」格式不对"
site_exists "$SLUG_ARG" && die "站点 $SLUG_ARG 已经存在。要重建请先 delete-site.sh $SLUG_ARG"
grep -lq "^DOMAIN=\"$DOMAIN_ARG\"" "$AGENCY_SITES_DIR"/*.conf 2>/dev/null && die "域名 $DOMAIN_ARG 已经被别的站点使用"

site_vars "$SLUG_ARG"
mkdir -p "$AGENCY_SITES_DIR" "$AGENCY_SECRETS_DIR"; chmod 700 "$AGENCY_SECRETS_DIR"

info "1/7 Linux 用户和目录"
id "$SITE_USER" >/dev/null 2>&1 || useradd --system --home-dir "$SITE_HOME" --no-create-home --shell /usr/sbin/nologin "$SITE_USER"
mkdir -p "$SITE_PUBLIC" "$SITE_HOME/logs" "$SITE_HOME/tmp" "$SITE_HOME/acme" "$SITE_HOME/.wp-cli/cache" "$SITE_HOME/private"
fix_perms "$SLUG"
chown -R "$SITE_USER:www-data" "$SITE_HOME/acme"
ok "$SITE_USER → $SITE_HOME"

info "2/7 站点登记"
: > "$SITE_REG"
set_reg "$SLUG" DOMAIN "$DOMAIN_ARG"
set_reg "$SLUG" WWW "$WWW_ARG"
set_reg "$SLUG" BASIC_AUTH "$BA"
set_reg "$SLUG" NOINDEX "$NOI"
set_reg "$SLUG" SSL 0
set_reg "$SLUG" CACHE "$CACHE_ARG"
set_reg "$SLUG" CREATED "$(date +%F)"
set_reg "$SLUG" SOURCE "$SOURCE_ARG"
set_reg "$SLUG" MODE ""
ok "$SITE_REG"

info "3/7 数据库"
DB_PASS="$(rand_pw 32)"
mysql_root <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL
umask 077
cat > "$SITE_SECRETS" <<EOF
# 站点 $SLUG 的密码（只有 root 能读）。看密码：sudo cat $SITE_SECRETS
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASS="$DB_PASS"
EOF
umask 022
ok "数据库 $DB_NAME / 用户 $DB_USER"

info "4/7 PHP-FPM 和 Nginx"
write_fpm_pool "$SLUG"
[[ $BA == 1 ]] && setup_basic_auth "$SLUG"
render_nginx "$SLUG"
reload_web
ok "PHP-FPM pool agency-$SLUG、Nginx 设定 $(nginx_conf_path "$SLUG")"

info "5/7 SSL"
if [[ "$USE_SSL" == "1" ]]; then
  if obtain_ssl "$SLUG"; then
    ok "SSL 证书已申请"
  else
    warn "SSL 申请失败（域名可能还没指向这台服务器）。之后执行：sudo $AGENCY_ROOT/scripts/server/site-config.sh $SLUG --ssl"
  fi
else
  info "跳过 SSL（--no-ssl）"
fi

if [[ $EMPTY == 0 ]]; then
  info "6/7 安装 WordPress"
  load_site "$SLUG"; [[ "$SSL" == "1" ]] && SCHEME=https || SCHEME=http
  WP_PASS="$(rand_pw 24)"
  wpq "$SLUG" core download --locale="$WP_LOCALE"
  wpq "$SLUG" config create --dbname="$DB_NAME" --dbuser="$DB_USER" --dbpass="$DB_PASS" --dbhost=localhost --dbcharset=utf8mb4 --locale="$WP_LOCALE" --extra-php <<'PHP'
define( 'DISALLOW_FILE_EDIT', true );
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'FS_METHOD', 'direct' );
define( 'WP_AUTO_UPDATE_CORE', 'minor' );
define( 'WP_POST_REVISIONS', 10 );
define( 'WP_DEBUG', false );
define( 'WP_DEBUG_LOG', false );
if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === $_SERVER['HTTP_X_FORWARDED_PROTO'] ) { $_SERVER['HTTPS'] = 'on'; }
PHP
  wpq "$SLUG" core install --url="$SCHEME://$DOMAIN_ARG" --title="${TITLE:-$SLUG}" \
     --admin_user="$WP_ADMIN_USER" --admin_password="$WP_PASS" --admin_email="$ADMIN_EMAIL" --skip-email
  {
    echo "WP_ADMIN_USER=\"$WP_ADMIN_USER\""
    echo "WP_ADMIN_PASS=\"$WP_PASS\""
  } >> "$SITE_SECRETS"
  ok "WordPress 已安装（管理员 $WP_ADMIN_USER）"

  info "7/7 基本设定"
  wpq "$SLUG" option update timezone_string "Asia/Kuala_Lumpur"
  wpq "$SLUG" option update date_format "j M Y"
  wpq "$SLUG" rewrite structure '/%postname%/'
  wpq "$SLUG" option update default_comment_status closed
  wpq "$SLUG" option update default_ping_status closed
  wpq "$SLUG" option update default_pingback_flag 0
  ids="$(wpx "$SLUG" post list --post_type=post,page --post_status=any --format=ids 2>/dev/null || true)"
  [[ -n "$ids" ]] && wpq "$SLUG" post delete $ids --force
  wpq "$SLUG" comment delete 1 --force || true
  wpq "$SLUG" plugin delete akismet hello || true
  wpq "$SLUG" widget reset --all || true
  if [[ $NOI == 1 ]]; then wpq "$SLUG" option update blog_public 0; else wpq "$SLUG" option update blog_public 1; fi
  ok "时区、永久链接、删示范内容、关闭留言$( [[ $NOI == 1 ]] && echo '、noindex')"
else
  info "6/7 --empty：跳过 WordPress 安装"
fi
fix_perms "$SLUG"

echo
ok "站点 $SLUG 建好了"
echo "   网址:     $(site_url "$SLUG")"
[[ $EMPTY == 0 ]] && echo "   后台:     $(site_url "$SLUG")/wp-admin   用户名: $WP_ADMIN_USER"
[[ $BA == 1 ]] && echo "   访问密码: 用户名 view，密码在密码文件里"
echo "   密码文件: sudo cat $SITE_SECRETS   （请把密码存进密码管理器）"
