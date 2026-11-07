> ⏸ **2026-11-07：这是 WordPress 版的工作室网站，暂时不用。** 现在的工作室网站在 Netlify，程式在 `site/`（见 `docs/09-netlify-guide.md`）。这个文件夹留着，以后想把工作室网站搬回服务器时用（`build-all.sh --with-studio`）。

# studio — Cartsmith 工作室网站

- 网址：https://yourdomain.com（www 跳转到主域名）
- 用途：工作室官网（公开、允许搜索引擎收录）
- 建立：`sudo scripts/server/setup-studio.sh yourdomain.com`
- 内容：`wp/content/studio/*.html`（改完再跑一次 setup-studio.sh --force-pages）
- 插件：agency-core（WhatsApp、询价表单、费用计算器、GA4/Pixel）、Rank Math（SEO、sitemap）、FluentSMTP（寄信）、UpdraftPlus（备份）、Limit Login Attempts、Two Factor
- 上线前要填：brand-config.json 的 SSM 名称和号码、WhatsApp 号码、电邮；GA4 / Pixel ID（有的话）
- 询价：后台 → Leads；同时寄到 business.email
- PageSpeed 手机版：首页 __（上线后测，目标 ≥ 85）
