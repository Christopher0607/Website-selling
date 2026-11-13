#!/usr/bin/env bash
# common.sh — 所有服务器脚本共用的函数。不要直接执行，用 source 载入。
# Shared helpers for all server scripts. Source it, don't run it.

set -euo pipefail

AGENCY_CONF="${AGENCY_CONF:-/etc/agency/agency.conf}"
AGENCY_ETC="${AGENCY_ETC:-/etc/agency}"
AGENCY_SITES_DIR="$AGENCY_ETC/sites"        # 每个站点一个登记文件 <slug>.conf
AGENCY_SECRETS_DIR="$AGENCY_ETC/secrets"    # 每个站点一个密码文件 <slug>.env（600）
AGENCY_LOG_DIR="${AGENCY_LOG_DIR:-/var/log/agency}"
AGENCY_BACKUP_DIR="${AGENCY_BACKUP_DIR:-/var/backups/agency}"
AGENCY_WWW="${AGENCY_WWW:-/var/www}"
AGENCY_CACHE_DIR="${AGENCY_CACHE_DIR:-/var/cache/nginx/agency}"
AGENCY_ROOT="${AGENCY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# ---------- 载入设定 ----------
if [[ -f "$AGENCY_CONF" ]]; then
  # shellcheck disable=SC1090
  source "$AGENCY_CONF"
fi
STUDIO_DOMAIN="${STUDIO_DOMAIN:-yourbrand.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${STUDIO_DOMAIN}}"
WP_ADMIN_USER="${WP_ADMIN_USER:-studio_admin}"
WP_LOCALE="${WP_LOCALE:-en_US}"
SSL_ENABLED="${SSL_ENABLED:-1}"           # 本地测试设为 0
BACKUP_KEEP="${BACKUP_KEEP:-7}"
PAGE_CACHE_TTL="${PAGE_CACHE_TTL:-2m}"

# ---------- 输出 ----------
if [[ -t 1 ]]; then
  C_RED=$'\e[31m'; C_GRN=$'\e[32m'; C_YLW=$'\e[33m'; C_BLU=$'\e[36m'; C_RST=$'\e[0m'
else
  C_RED=""; C_GRN=""; C_YLW=""; C_BLU=""; C_RST=""
fi

SCRIPT_NAME="$(basename "${0%.sh}")"
LOG_FILE=""

start_log() {
  mkdir -p "$AGENCY_LOG_DIR" 2>/dev/null || true
  if [[ -w "$AGENCY_LOG_DIR" ]]; then
    LOG_FILE="$AGENCY_LOG_DIR/${SCRIPT_NAME}-$(date +%Y%m%d).log"
    echo "===== $(date '+%F %T') $SCRIPT_NAME $* =====" >> "$LOG_FILE"
  fi
}

_log() { [[ -n "$LOG_FILE" ]] && echo "$(date '+%T') $*" >> "$LOG_FILE" || true; }
info() { echo "${C_BLU}[i]${C_RST} $*"; _log "INFO $*"; }
ok()   { echo "${C_GRN}[✓]${C_RST} $*"; _log "OK   $*"; }
warn() { echo "${C_YLW}[!]${C_RST} $*" >&2; _log "WARN $*"; }
die()  { echo "${C_RED}[✗] $*${C_RST}" >&2; _log "FAIL $*"; exit 1; }

# 执行命令并把输出写进日志（不显示在画面上）
run_quiet() {
  if [[ -n "$LOG_FILE" ]]; then "$@" >> "$LOG_FILE" 2>&1; else "$@" > /dev/null 2>&1; fi
}

require_root() { [[ $EUID -eq 0 ]] || die "请用 sudo 执行：sudo $0 $*"; }

need_cmd() { for c in "$@"; do command -v "$c" >/dev/null 2>&1 || die "找不到指令 $c，请先跑 provision-server.sh"; done; }

confirm() {
  # confirm "问题"  —— 有 ASSUME_YES=1 就直接通过
  [[ "${ASSUME_YES:-0}" == "1" ]] && return 0
  local ans; read -r -p "$1 [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

rand_pw() { tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "${1:-24}" || true; }

# ---------- 服务（有 systemd 用 systemctl，没有就用 service） ----------
has_systemd() { [[ -d /run/systemd/system ]]; }
svc() {
  local action="$1" name="$2"
  if has_systemd; then systemctl "$action" "$name"; else service "$name" "$action"; fi
}

php_version() { php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;'; }
PHPV="${PHPV:-$(php_version 2>/dev/null || echo 8.3)}"
FPM_POOL_DIR="/etc/php/$PHPV/fpm/pool.d"
FPM_SERVICE="php$PHPV-fpm"

reload_web() {
  nginx -t >/dev/null 2>&1 || { nginx -t; die "Nginx 设定有错，没有重新载入"; }
  svc reload nginx >/dev/null 2>&1 || svc restart nginx >/dev/null
  svc reload "$FPM_SERVICE" >/dev/null 2>&1 || svc restart "$FPM_SERVICE" >/dev/null
}

# ---------- 站点资料 ----------
validate_slug() {
  [[ "$1" =~ ^[a-z0-9]([a-z0-9-]{0,24}[a-z0-9])?$ ]] \
    || die "站点代号「$1」不合格：只能用小写英文、数字、连字符，2–26 个字，不能用连字符开头或结尾"
}

# 设定站点相关变量：SLUG SITE_USER SITE_HOME SITE_PUBLIC DB_NAME DB_USER
site_vars() {
  SLUG="$1"
  local u="${1//-/_}"
  SITE_USER="site_${u}"
  SITE_HOME="$AGENCY_WWW/$1"
  SITE_PUBLIC="$SITE_HOME/public"
  DB_NAME="wp_${u}"
  DB_USER="u_${u}"
  SITE_REG="$AGENCY_SITES_DIR/$1.conf"
  SITE_SECRETS="$AGENCY_SECRETS_DIR/$1.env"
}

site_exists() { [[ -f "$AGENCY_SITES_DIR/$1.conf" ]]; }

# 读站点登记：DOMAIN BASIC_AUTH NOINDEX SSL CREATED SOURCE
load_site() {
  site_vars "$1"
  site_exists "$1" || die "找不到站点 $1（没有 $SITE_REG）。用 site-inventory.sh 看现有站点"
  # shellcheck disable=SC1090
  source "$SITE_REG"
}

load_secrets() {
  site_vars "$1"
  [[ -f "$SITE_SECRETS" ]] || die "找不到 $SITE_SECRETS"
  # shellcheck disable=SC1090
  source "$SITE_SECRETS"
}

set_reg() {
  # set_reg <slug> KEY VALUE —— 更新站点登记文件中的一项
  local f="$AGENCY_SITES_DIR/$1.conf" k="$2" v="$3"
  touch "$f"
  if grep -q "^$k=" "$f"; then sed -i "s|^$k=.*|$k=\"$v\"|" "$f"; else echo "$k=\"$v\"" >> "$f"; fi
}

site_url() {
  # 站点网址（有 SSL 用 https）
  load_site "$1"
  if [[ "${SSL:-1}" == "1" ]]; then echo "https://$DOMAIN"; else echo "http://$DOMAIN"; fi
}

# 以站点用户身份执行 WP-CLI
wpx() {
  local slug="$1"; shift
  site_vars "$slug"
  sudo -u "$SITE_USER" -H env HOME="$SITE_HOME" WP_CLI_CACHE_DIR="$SITE_HOME/.wp-cli/cache" \
    WP_CLI_PACKAGES_DIR="$SITE_HOME/.wp-cli/packages" \
    wp --path="$SITE_PUBLIC" "$@"
}

# 不显示输出、只看成功与否
wpq() { local slug="$1"; shift; run_quiet wpx "$slug" "$@"; }

clear_cache() {
  site_vars "$1"
  rm -rf "${AGENCY_CACHE_DIR:?}/$1"/* 2>/dev/null || true
  wpx "$1" cache flush >/dev/null 2>&1 || true
  wpx "$1" transient delete --expired >/dev/null 2>&1 || true
}

fix_perms() {
  # 目录 755、文件 644、wp-config.php 640；站点根目录 750（别的站点用户进不来）
  site_vars "$1"
  chown -R "$SITE_USER:$SITE_USER" "$SITE_HOME"
  chown "$SITE_USER:www-data" "$SITE_HOME"
  chmod 750 "$SITE_HOME"
  find "$SITE_PUBLIC" -type d -exec chmod 755 {} +
  find "$SITE_PUBLIC" -type f -exec chmod 644 {} +
  [[ -f "$SITE_PUBLIC/wp-config.php" ]] && chmod 640 "$SITE_PUBLIC/wp-config.php" && chown "$SITE_USER:www-data" "$SITE_PUBLIC/wp-config.php"
  chmod 700 "$SITE_HOME/tmp" 2>/dev/null || true
  chmod 700 "$SITE_HOME/private" 2>/dev/null || true
}

mysql_root() { mysql --protocol=socket -uroot "$@"; }

# 服务器有没有 IPv6（没有的话 Nginx 不能 listen [::]）
ipv6_ok() { [[ -s /proc/net/if_inet6 ]]; }
