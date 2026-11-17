#!/usr/bin/env bash
# 10 个示范网站搬到真的 WordPress + WooCommerce（2026-11-17，docs/14-wordpress-demos.md 第 6 步）。
# 014 = 013 再做一次：013 在第 1 步停了（服务器那份规则本来就有一行 try_files，多加一行变重复；Nginx 测试不过，已自动改回，没有影响）。
# 网址 <代号>.demo.<工作室网域>，跟工作室网站上的示范一模一样，但订单、产品、库存、优惠码都在 WooCommerce；
# 示范帐号一按就进 WordPress 后台 / 店家后台（不用密码，权限有限）；每晚 04:20 还原；访客资料 1 小时后遮掉。
# 工作室网站的连结还没换（俊宇看过才换），所以这一步对外没有影响。
#   1. Nginx 共用规则：有自己设计的网站，样式 / 程式 / 照片从 uploads/agc-skin/ 送出（provision-server.sh 已经改了，这里改服务器上那份）
#   2. DNS：*.demo 要指到这台服务器（俊宇 2026-11-17 在 Cloudflare 加了），还没生效就 exit 75 下次再试
#   3. 硬盘至少 6 GB 空间（每个示范约 300 MB）
#   4. 建 10 个网站（build-wp-demo.sh：从 master 复制、SSL、页面、产品、示范帐号、访客计数、存干净版本、smoke test）
#   5. 每晚 04:20（马来西亚）还原：/etc/cron.d/agency-demo-reset
#   6. 每个网站几个页面的 HTTP 状态和「有没有接上 WooCommerce」
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail
DEMOS="sireh-salt maison-cendre dulang-daun butter-lantern voltnest chili-pantry dewlane lowlight plainfold tailmate"

# 1. Nginx
C=/etc/nginx/agency/common.conf
if ! grep -q 'agc-skin' "$C"; then
  cp "$C" "$C.bak-014"
  # 服务器原本那行是 try_files $uri =404;（013 多加一行 → 重复，Nginx 不接受）：换掉那一行
  if grep -q '^  try_files \$uri =404;' "$C"; then
    sed -i 's#^  try_files \$uri =404;#  try_files $uri /wp-content/uploads/agc-skin$uri =404;#' "$C"
  else
    sed -i '/max-age=2592000/a\  try_files $uri /wp-content/uploads/agc-skin$uri =404;' "$C"
  fi
  T="$(nginx -t 2>&1)"
  if [[ $? == 0 ]]; then
    systemctl reload nginx && echo "Nginx：设计档案的规则加好了"
  else
    echo "Nginx 设定测试不通过："; echo "$T" | tail -4
    cp "$C.bak-014" "$C"; echo "已改回原样"
    exit 1
  fi
else
  echo "Nginx：设计档案的规则已经有了"
fi

# 2. DNS
ME="$(hostname -I 2>/dev/null)"
IP="$(getent hosts "sireh-salt.demo.$STUDIO_DOMAIN" | awk '{print $1}' | head -1)"
if [[ -z "$IP" || " $ME " != *" $IP "* ]]; then
  echo "DNS：sireh-salt.demo.$STUDIO_DOMAIN 还没指到这台服务器（现在：${IP:-没有}），等一下再试"
  exit 75
fi
echo "DNS：*.demo.$STUDIO_DOMAIN → $IP（这台服务器）"

# 3. Disk
FREE="$(df -Pm / | awk 'NR==2 {print $4}')"
echo "硬盘：还有 $((FREE / 1024)) GB"
if (( FREE < 6144 )); then
  echo "硬盘空间不够 6 GB，先不建（要先清理或加大硬盘，问俊宇）"
  exit 1
fi

# 4. The 10 websites
BAD=""
for d in $DEMOS; do
  echo; echo "==== $d"
  bash "$R/scripts/server/build-wp-demo.sh" "demo-$d" > "/var/log/agency/wp-demo-$d.log" 2>&1
  rc=$?
  tail -6 "/var/log/agency/wp-demo-$d.log"
  [[ $rc == 0 ]] || BAD="$BAD $d"
done

# 5. Nightly reset (20:20 UTC = 04:20 Malaysia)
cat > /etc/cron.d/agency-demo-reset <<EOF
# 示范网站每晚还原成干净的样子（ops/jobs/013-wp-demos.sh，docs/14-wordpress-demos.md）
20 20 * * * root $R/scripts/server/demo-reset.sh --all >> /var/log/agency/demo-reset.log 2>&1
EOF
chmod 644 /etc/cron.d/agency-demo-reset
echo; echo "每晚还原：已排程（马来西亚时间 04:20）"

# 6. Check
echo; echo "==== 检查"
for d in $DEMOS; do
  H="https://$d.demo.$STUDIO_DOMAIN"
  home="$(curl -s -o /dev/null -w '%{http_code}' "$H/")"
  live="$(curl -s "$H/" | grep -c 'window.AGC_LIVE=')"
  shop="$(curl -s -o /dev/null -w '%{http_code}' "$H/wp-json/agc/v1/site/data")"
  dian="$(curl -s -o /dev/null -w '%{http_code}' "$H/dian/")"
  printf '%-15s 首页 %s · 接上 WooCommerce %s · 资料接口 %s · 店家后台 %s\n' "$d" "$home" "$([[ $live -ge 1 ]] && echo 是 || echo 否)" "$shop" "$dian"
done
df -Pm / | awk 'NR==2 {printf "\n硬盘：还有 %d GB\n", $4/1024}'
if [[ -n "$BAD" ]]; then echo "没建好：$BAD（看上面的输出）"; exit 1; fi
echo "10 个示范网站都建好了"
