#!/usr/bin/env bash
# site.sh — 站点的 Nginx / PHP-FPM / SSL / basic auth 设定（由 new-site.sh、site-config.sh 等载入）
# 设定文件全部由这里产生，可以随时重新产生（不要手动改 /etc/nginx/sites-available/agency-*.conf）

nginx_conf_path() { echo "/etc/nginx/sites-available/agency-$1.conf"; }
htpasswd_path()   { echo "/etc/nginx/agency/htpasswd-$1"; }

write_fpm_pool() {
  local slug="$1"; site_vars "$slug"
  cat > "$FPM_POOL_DIR/$slug.conf" <<EOF
; 由 agency 脚本产生 —— 站点 $slug
[$slug]
user = $SITE_USER
group = $SITE_USER
listen = /run/php/agency-$slug.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = ondemand
pm.max_children = 6
pm.process_idle_timeout = 30s
pm.max_requests = 500
php_admin_value[open_basedir] = $SITE_HOME/
php_admin_value[upload_tmp_dir] = $SITE_HOME/tmp
php_admin_value[sys_temp_dir] = $SITE_HOME/tmp
php_admin_value[session.save_path] = $SITE_HOME/tmp
php_admin_value[error_log] = $SITE_HOME/logs/php-error.log
php_admin_flag[log_errors] = on
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,pcntl_exec
EOF
}

# 根据站点登记文件产生 Nginx 设定
render_nginx() {
  local slug="$1"; load_site "$slug"
  local u="${slug//-/_}" names="$DOMAIN" conf; conf="$(nginx_conf_path "$slug")"
  [[ "${WWW:-0}" == "1" ]] && names="$DOMAIN www.$DOMAIN"
  local cert="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
  local use_ssl=0
  [[ "${SSL:-0}" == "1" && -f "$cert" ]] && use_ssl=1

  site_body() {
    local https="$1"
    echo "  root $SITE_PUBLIC;"
    echo "  index index.php index.html;"
    echo "  access_log $SITE_HOME/logs/access.log;"
    echo "  error_log $SITE_HOME/logs/error.log warn;"
    if [[ "${BASIC_AUTH:-0}" == "1" ]]; then
      echo "  auth_basic \"Private preview\";"
      echo "  auth_basic_user_file $(htpasswd_path "$slug");"
    fi
    [[ "${NOINDEX:-0}" == "1" ]] && echo "  add_header X-Robots-Tag \"noindex, nofollow\" always;"
    echo "  include /etc/nginx/agency/common.conf;"
    echo "  include /etc/nginx/agency/cache-bypass.conf;"
    echo "  location / { try_files \$uri \$uri/ /index.php?\$args; }"
    echo "  location ~ \\.php\$ {"
    echo "    try_files \$uri =404;"
    echo "    include fastcgi_params;"
    echo "    fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;"
    echo "    fastcgi_param HTTPS $https;"
    echo "    fastcgi_pass unix:/run/php/agency-$slug.sock;"
    echo "    fastcgi_read_timeout 120;"
    echo "    fastcgi_buffers 16 16k;"
    echo "    fastcgi_buffer_size 32k;"
    if [[ "${CACHE:-1}" == "1" ]]; then
      echo "    fastcgi_cache agc_$u;"
      echo "    fastcgi_cache_valid 200 301 $PAGE_CACHE_TTL;"
      echo "    fastcgi_cache_bypass \$agc_skip;"
      echo "    fastcgi_no_cache \$agc_skip;"
      echo "    add_header X-Cache \$upstream_cache_status always;"
    fi
    # location 里的 add_header 会盖掉 server 层的，所以这里再加一次
    [[ "${NOINDEX:-0}" == "1" ]] && echo "    add_header X-Robots-Tag \"noindex, nofollow\" always;"
    echo "  }"
  }

  {
    echo "# 由 agency 脚本产生 —— 站点 $slug（不要手动修改，用 site-config.sh）"
    if [[ "${CACHE:-1}" == "1" ]]; then
      echo "fastcgi_cache_path $AGENCY_CACHE_DIR/$slug levels=1:2 keys_zone=agc_$u:10m max_size=256m inactive=60m use_temp_path=off;"
    fi
    echo "server {"
    echo "  listen 80;"
    ipv6_ok && echo "  listen [::]:80;"
    echo "  server_name $names;"
    echo "  location ^~ /.well-known/acme-challenge/ { root $SITE_HOME/acme; auth_basic off; default_type text/plain; }"
    if [[ $use_ssl == 1 ]]; then
      echo "  location / { return 301 https://$DOMAIN\$request_uri; }"
    else
      if [[ "${WWW:-0}" == "1" ]]; then echo "  if (\$host = www.$DOMAIN) { return 301 http://$DOMAIN\$request_uri; }"; fi
      site_body off
    fi
    echo "}"
    if [[ $use_ssl == 1 ]]; then
      echo "server {"
      echo "  listen 443 ssl http2;"
      ipv6_ok && echo "  listen [::]:443 ssl http2;"
      echo "  server_name $names;"
      echo "  ssl_certificate $cert;"
      echo "  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;"
      echo "  ssl_protocols TLSv1.2 TLSv1.3;"
      echo "  ssl_session_cache shared:agcSSL:10m;"
      echo "  add_header Strict-Transport-Security \"max-age=31536000\" always;"
      if [[ "${WWW:-0}" == "1" ]]; then echo "  if (\$host = www.$DOMAIN) { return 301 https://$DOMAIN\$request_uri; }"; fi
      site_body on
      echo "}"
    fi
  } > "$conf"
  mkdir -p "$AGENCY_CACHE_DIR/$slug" && chown www-data:www-data "$AGENCY_CACHE_DIR/$slug"
  ln -sf "$conf" "/etc/nginx/sites-enabled/agency-$slug.conf"
}

setup_basic_auth() {
  # 产生 basic auth 帐号密码（已经有就沿用）
  local slug="$1"; site_vars "$slug"
  touch "$SITE_SECRETS"; chmod 600 "$SITE_SECRETS"
  # shellcheck disable=SC1090
  source "$SITE_SECRETS"
  if [[ -z "${BASIC_AUTH_USER:-}" ]]; then
    BASIC_AUTH_USER="view"; BASIC_AUTH_PASS="$(rand_pw 12)"
    { echo "BASIC_AUTH_USER=\"$BASIC_AUTH_USER\""; echo "BASIC_AUTH_PASS=\"$BASIC_AUTH_PASS\""; } >> "$SITE_SECRETS"
  fi
  htpasswd -b -c -B "$(htpasswd_path "$slug")" "$BASIC_AUTH_USER" "$BASIC_AUTH_PASS" >/dev/null 2>&1
  chown root:www-data "$(htpasswd_path "$slug")"; chmod 640 "$(htpasswd_path "$slug")"
}

obtain_ssl() {
  # 用 webroot 方式申请证书（basic auth 站点也可以，因为 acme-challenge 不需要密码）
  local slug="$1"; load_site "$slug"
  local -a ds=(-d "$DOMAIN")
  [[ "${WWW:-0}" == "1" ]] && ds+=(-d "www.$DOMAIN")
  local hook="nginx -s reload"
  mkdir -p "$SITE_HOME/acme"; chown -R "$SITE_USER:www-data" "$SITE_HOME/acme"; chmod 755 "$SITE_HOME/acme"
  if certbot certonly --webroot -w "$SITE_HOME/acme" "${ds[@]}" --cert-name "$DOMAIN" \
       --non-interactive --agree-tos -m "$ADMIN_EMAIL" --keep-until-expiring --deploy-hook "$hook" >> "${LOG_FILE:-/dev/null}" 2>&1; then
    set_reg "$slug" SSL 1
    render_nginx "$slug"; reload_web
    return 0
  fi
  set_reg "$slug" SSL 0
  render_nginx "$slug"; reload_web
  return 1
}
