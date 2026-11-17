#!/usr/bin/env bash
# 2026-11-17 俊宇：「网站太慢了，每个东西都要 loading 好久」。
# 原因：PHP 的程式快取（opcache）只有 128 MB，但一个 WordPress + WooCommerce 网站就要 ~100 MB（本机量的），
# 服务器上有很多网站，快取满了以后新的程式就不再快取，每次打开都重新编译（服务器每页 2–3 秒，本机快取后 0.2 秒）。
# 这个 job（不删任何东西，不重启，只做平常建站也会做的 PHP 平顺重载）：
#   1. 印出现况（CPU、记忆体、swap、网站数、opcache 用量、服务器自己量的速度）
#   2. 没有 swap 的话加 2 GB swap 档（记忆体用满时不会当掉）
#   3. opcache 加大：新增 99-zz-agency-opcache.ini（排在原本的 99-agency.ini 后面才会生效；原本的档不改）
#   4. 10 个示范网站关掉用不到的 4 个外挂（Kadence Blocks、UpdraftPlus、Rank Math、FluentSMTP：示范的页面是自己的设计、
#      每晚还原、不给 Google 收录、不寄信），每个网站要编译的程式少一些；每晚还原后也会再关（demo-reset.sh）
#   5. PHP 平顺重载、暖一下 10 个示范、再量一次
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
DEMOS="sireh-salt maison-cendre dulang-daun butter-lantern voltnest chili-pantry dewlane lowlight plainfold tailmate"
timing() {
  for d in sireh-salt maison-cendre dulang-daun butter-lantern voltnest tailmate; do
    H="$d.demo.$STUDIO_DOMAIN"
    a="$(curl -s -o /dev/null -w '%{time_total}' --resolve "$H:443:127.0.0.1" "https://$H/")"
    b="$(curl -s -o /dev/null -w '%{time_total}' --resolve "$H:443:127.0.0.1" "https://$H/")"
    c="$(curl -s -o /dev/null -w '%{time_total}' --resolve "$H:443:127.0.0.1" "https://$H/wp-json/agc/v1/site/data")"
    printf '  %-15s 首页 %ss / 再一次 %ss · 资料接口 %ss\n' "$d" "$a" "$b" "$c"
  done
}
opcache_now() {
  site_vars demo-sireh-salt
  local f="agc-oc-$(head -c6 /dev/urandom | od -An -tx1 | tr -d ' \n').php" H="sireh-salt.demo.$STUDIO_DOMAIN"
  cat > "$SITE_PUBLIC/$f" <<'PHP'
<?php
$s = function_exists( 'opcache_get_status' ) ? opcache_get_status( false ) : false;
$c = function_exists( 'opcache_get_configuration' ) ? opcache_get_configuration() : array( 'directives' => array() );
if ( ! $s ) { echo "  opcache 没开\n"; return; }
$m = $s['memory_usage']; $st = $s['opcache_statistics'];
printf( "  快取大小 %d MB：用了 %d MB、空的 %d MB、浪费 %d MB · %s\n", $c['directives']['opcache.memory_consumption'] / 1048576, $m['used_memory'] / 1048576, $m['free_memory'] / 1048576, $m['wasted_memory'] / 1048576, ! empty( $s['cache_full'] ) ? '满了（新的程式不再快取）' : '还有空间' );
printf( "  程式档：快取了 %d 个（上限 %d）· 命中率 %.1f%% · 因为满了重来 %d 次\n", $st['num_cached_scripts'], $st['max_cached_keys'], $st['opcache_hit_rate'], $st['oom_restarts'] + $st['hash_restarts'] );
PHP
  chown "$SITE_USER:$SITE_USER" "$SITE_PUBLIC/$f"; chmod 644 "$SITE_PUBLIC/$f"
  curl -s --resolve "$H:443:127.0.0.1" "https://$H/$f?n=$RANDOM"   # ?n= : not from the page cache
  rm -f "$SITE_PUBLIC/$f"
}

echo "==== 1. 现况"
echo "CPU：$(nproc) 个 · 负载：$(cut -d' ' -f1-3 /proc/loadavg)"
free -m | sed 's/^/  /'
echo "WordPress 网站：$(ls "$AGENCY_SITES_DIR"/*.conf 2>/dev/null | wc -l) 个（$(ls "$AGENCY_SITES_DIR"/*.conf 2>/dev/null | xargs -n1 basename | sed 's/\.conf$//' | tr '\n' ' ')）"
echo "opcache："; opcache_now
echo "速度（服务器自己量，不含网路）："; timing
echo "最耗 CPU 的程式："; ps -eo pcpu,rss,comm --sort=-pcpu | head -6 | sed 's/^/  /'

echo; echo "==== 2. swap"
if [[ "$(swapon --show --noheadings | wc -l)" == 0 ]]; then
  if fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; then
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -q vm.swappiness=10; echo 'vm.swappiness=10' > /etc/sysctl.d/99-agency-swap.conf
    echo "加了 2 GB swap"
  else
    echo "swap 没加成（opcache 用小一点的大小）"
  fi
else
  echo "已经有 swap"
fi

echo; echo "==== 3. 加大 opcache"
TOTAL="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
MEM=320
[[ "$(swapon --show --noheadings | wc -l)" != 0 ]] && MEM=512
(( TOTAL > 3500 )) && MEM=1024
cat > "/etc/php/$PHPV/fpm/conf.d/99-zz-agency-opcache.ini" <<EOF
; ops/jobs/016-speed.sh (2026-11-17): many WordPress sites share one PHP code cache (after 99-agency.ini, so it wins)
opcache.enable=1
opcache.memory_consumption=$MEM
opcache.interned_strings_buffer=32
opcache.max_accelerated_files=100000
opcache.max_wasted_percentage=10
opcache.revalidate_freq=30
EOF
echo "opcache：${MEM} MB、最多 100000 个程式档（记忆体共 ${TOTAL} MB）"

echo; echo "==== 4. 示范网站关掉用不到的外挂"
for d in $DEMOS; do
  site_exists "demo-$d" || continue
  off="$(wpx "demo-$d" plugin deactivate kadence-blocks updraftplus seo-by-rank-math fluent-smtp 2>&1 | grep -o 'Deactivated [0-9]* of [0-9]*' | head -1)"
  echo "  $d：${off:-没有要关的}"
done

echo; echo "==== 5. PHP 平顺重载、暖一下、再量"
if php-fpm"$PHPV" -t >/dev/null 2>&1; then
  systemctl reload "$FPM_SERVICE" && echo "PHP 已重载"
else
  echo "PHP 设定测试不通过，拿掉新设定："; php-fpm"$PHPV" -t 2>&1 | tail -3
  rm -f "/etc/php/$PHPV/fpm/conf.d/99-zz-agency-opcache.ini"; systemctl reload "$FPM_SERVICE"
  exit 1
fi
sleep 3
for d in $DEMOS; do
  H="$d.demo.$STUDIO_DOMAIN"
  for p in / /wp-json/agc/v1/site/data; do curl -s -o /dev/null --resolve "$H:443:127.0.0.1" "https://$H$p"; done
done
echo "速度（重载后，服务器自己量）："; timing
echo "opcache："; opcache_now
free -m | sed 's/^/  /'
