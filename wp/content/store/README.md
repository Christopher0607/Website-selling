# 网店页面内容（母版）

`build-pages.php` 读这个文件夹的 `*.html`，按第一行的标记建立或更新页面：

```
<!-- page: title="About us" slug="about" menu="primary,footer" order="20" -->
```

- `menu`：放进哪个菜单（primary 主菜单 / footer 页脚菜单），留空就不放
- 占位符：`{{SITE_NAME}}` 网站名称、`{{TAGLINE}}` 标语、`{{SHOP_URL}}` 商店网址、`{{IMG:文件名}}` 已上传图片的网址
- 公司资料用短代码 `[agc_business]`，在 Settings → Agency 改一次，全站跟着变
- 样板站 / 客户站可以有自己的内容文件夹，同名文件会覆盖这里的版本
- 法律页面只是草稿，`[方括号]` 的地方上线前必须换成真实资料，并请律师确认
