# demo-rimbun

- 网址：https://demo-rimbun.kedailab.com （上线后填）
- 用途：样板站（概念作品），风格 A 简约高级，护肤
- 来源：从 master 复制（clone-site.sh）
- 管理员：studio_admin（密码在服务器 /etc/agency/secrets/demo-rimbun.env → 存进密码管理器）
- 设定：Demo 模式开、noindex、公开（不设密码）
- 内容：`brand-config.json`、`products.csv`、`images/`、`content/`（首页和关于页覆盖母版）
- 重建：`sudo scripts/server/build-demo.sh demo-rimbun`
- PageSpeed 手机版：首页 __ / 产品页 __（上线后测）
- 待办：上线后测 PageSpeed、截图放 assets/portfolio/demo-rimbun/
