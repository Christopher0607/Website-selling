#!/usr/bin/env bash
# The Baking Trip 的私人预览网店（2026-11-14，俊宇：把 The Baking Trip 的后台做出来，交付时店家可以直接用）
#   网址 https://preview-tbt.cartsmithstudio.com （WordPress + WooCommerce + 店家后台 /dian/），有密码（basic auth）+ noindex。
#   （005 第一次跑就停了：common.sh 的严格模式遇到 DNS 还没有记录就直接结束；这个是修好的版本）
#   等 Cloudflare 的 DNS（preview-tbt → 这台服务器，DNS only）好了才建；还没好就 exit 75，5 分钟后再试。
#   照片建站时从 The Baking Trip 自己公开的照片下载（sites/preview-tbt/images-src.json），不进 git，只在有密码的预览站。
#   密码都不写进记录：basic auth、店家帐号、测试帐号的密码 = sha256(报告代号 + 后缀) 前 32 个字，两边各自算。
#     tbt / -tbt-view：打开网站（basic auth）
#     thebakingtrip / -tbt-owner：店家后台 /dian/（shop_manager）
#     tbttest / -tbttest：Claude Code 在真网址跑 check-owner.js（之后的脚本会删掉）
set -u
source /etc/agency/agency.conf
R="${AGENCY_OPS_ROOT:-${AGENCY_ROOT:-/opt/agency}}"
source "$R/scripts/lib/common.sh"
set +eo pipefail # common.sh turns on strict mode; this job checks every step itself (005 stopped on the DNS lookup before the domain existed)
S=preview-tbt
H="$S.$STUDIO_DOMAIN"

IP="$(curl -s --noproxy '*' --max-time 5 http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)"
[[ "$IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] || IP="$(curl -s --max-time 8 https://api.ipify.org)"
[[ "$IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] || { echo "等：读不到这台服务器的 IP"; exit 75; }
command -v resolvectl >/dev/null && resolvectl flush-caches >/dev/null 2>&1
got="$(getent ahostsv4 "$H" 2>/dev/null | awk '{print $1; exit}')" || got=""
if [[ "$got" != "$IP" ]]; then
  echo "等 DNS：$H 要指到 $IP（现在是 ${got:-还没有记录}）。Cloudflare → DNS → Add record：A、preview-tbt、$IP、DNS only（灰色云）"
  exit 75
fi
echo "DNS 好了，开始建 The Baking Trip 预览网店"

bash "$R/scripts/server/build-demo.sh" "$S" || exit 1

T="$(tr -dc 'a-f0-9' < /var/lib/agency-ops/token)"
pw() { printf '%s' "$T-$1" | sha256sum | cut -c1-32; }

# 打开网站要密码（basic auth）
site_vars "$S"
touch "$SITE_SECRETS"; chmod 600 "$SITE_SECRETS"
sed -i '/^BASIC_AUTH_USER=/d;/^BASIC_AUTH_PASS=/d' "$SITE_SECRETS"
{ echo 'BASIC_AUTH_USER="tbt"'; echo "BASIC_AUTH_PASS=\"$(pw tbt-view)\""; } >> "$SITE_SECRETS"
bash "$R/scripts/server/site-config.sh" "$S" --basic-auth on --noindex on >/dev/null || exit 1
echo "basic auth：已打开（帐号 tbt）"

# 店家帐号（店家后台 /dian/）+ 测试帐号
user_set() { # login email role password
  if wpx "$S" user get "$1" >/dev/null 2>&1; then
    wpx "$S" user update "$1" --user_pass="$4" --role="$3" --skip-email >/dev/null && echo "帐号 $1（$3）：已更新"
  else
    wpx "$S" user create "$1" "$2" --role="$3" --user_pass="$4" --display_name="The Baking Trip" >/dev/null && echo "帐号 $1（$3）：已建立"
  fi
}
user_set thebakingtrip "thebakingtrip-preview@$STUDIO_DOMAIN" shop_manager "$(pw tbt-owner)"
user_set tbttest "tbttest@$STUDIO_DOMAIN" administrator "$(pw tbttest)"
clear_cache "$S"

A="tbt:$(pw tbt-view)"
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
echo "首页（没密码）HTTP $(code "https://$H/")（应该是 401）"
echo "首页（有密码）HTTP $(code -u "$A" "https://$H/")"
echo "店家后台 /dian/ HTTP $(code -u "$A" "https://$H/dian/")"
echo "上架产品：$(wpx "$S" post list --post_type=product --post_status=publish --format=count) 样；等价钱的草稿：$(wpx "$S" post list --post_type=product --post_status=draft --format=count) 样；订单：$(wpx "$S" eval 'echo count( wc_get_orders( array( "limit" => -1, "return" => "ids" ) ) );') 张"
echo "照片：$(find "$R/sites/$S/images" -name '*.webp' 2>/dev/null | wc -l) 张"
