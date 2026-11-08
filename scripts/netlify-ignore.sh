#!/bin/bash
# Netlify「ignore」命令：exit 0 = 这次不 build（省点数），exit 1 = 照常 build。
# 免费方案每次正式部署扣 15 点（每月 300 点），所以只有网站真的有改动才部署。
# netlify.toml 里用：ignore = "bash ../scripts/netlify-ignore.sh"（Netlify 在 base 目录 site/ 执行）
set -u

# 1) leads 分支只放每天的新商家资料，工作台直接从 GitHub 读取，不需要部署
if [ "${BRANCH:-}" = "leads" ]; then
  echo "netlify-ignore: leads branch, skip"
  exit 0
fi

# 2) 第一次 build、手动重新部署、没有上次的纪录 → 照常 build
if [ -z "${CACHED_COMMIT_REF:-}" ] || [ "${CACHED_COMMIT_REF:-}" = "${COMMIT_REF:-}" ]; then
  exit 1
fi

# 3) 只改了文件 / 研究资料 / 新商家资料（工作台会自己读取）→ 不 build
if git diff --quiet "$CACHED_COMMIT_REF" "$COMMIT_REF" -- \
    ':/site' ':/netlify.toml' ':/sales/scripts.md' ':/sales/agent/knowledge.md' \
    ':/wp/agency-core/assets/js/fee-calculator.js' ':/scripts/netlify-ignore.sh' \
    ':(exclude,top)site/netlify/functions/desk/inbox.mjs' 2>/dev/null; then
  echo "netlify-ignore: no changes that affect the site, skip"
  exit 0
fi
exit 1
