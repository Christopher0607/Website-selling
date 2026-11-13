# 12 · 网站放在 Cloudflare Workers（2026-11-12 起）

> 为什么搬：Netlify 免费方案每月只能正式部署 20 次，新帐号还会在网站上加「Powered by Netlify」标志（关掉要付费）。
> Cloudflare 免费方案：每天 10 万次程式请求、静态网页不限、没有标志。新帐号已经没有「Pages」入口（Cloudflare 把 Pages 并进 Workers），
> 所以用 **Workers + 静态档案（static assets）**：网站档案直接由 Cloudflare 送出，`/api/...` 交给我们的程式，资料放在 D1 资料库。
> 查证日期 2026-11-12：[Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)（免费版每次请求 10 毫秒 CPU、每天 10 万次请求）、
> [D1 限制](https://developers.cloudflare.com/d1/platform/limits/)（每行 2 MB、每次请求 50 次查询）、
> [Workers Builds 设定](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)、[建置环境](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)（Python 3.14、Node 24）。

## 两个 Worker

| Worker | 用途 | GitHub 分支 | 网址 |
|---|---|---|---|
| `cartsmith` | 工作室网站 + 工作台 + AI 客服 + 浏览监控 + 网站表单 | `ccr-4e1e8221-7msrbj` | https://cartsmithstudio.com 、https://cartsmithstudio.com/desk/ |
| `cartsmith-previews` | 客户的加密样板（只有静态档案） | `previews` | https://previews.cartsmithstudio.com/<代号>-xxxx/（网址和密码永远不变） |

## 第 1 部分：开 Cloudflare（俊宇；这时 Netlify 照常运作，客户不受影响）

1. https://dash.cloudflare.com/sign-up 注册（免费），去信箱验证。
2. **资料库：** 左边选单 **Storage & databases → D1 SQL database → Create database** → 名字 `cartsmith-desk` → Create。
   把资料库页面上的 **Database ID** 贴给 Claude Code（不是密码）。Claude Code 会把它写进 `site/wrangler.jsonc` 再 push。
3. **网站 Worker：** **Workers & Pages → Create → Import a repository → GitHub → Website-selling**，设定页照填：
   - Project name：`cartsmith`（一定要跟 `site/wrangler.jsonc` 的 name 一样）
   - Build command：`python3 build.py`
   - Deploy command：`npx wrangler deploy`
   - **Enable Preview builds：关掉**
   - **Advanced settings → Root directory（Path）：`site`**
   - 按 **Deploy**，等它成功。
4. **密码和 Key：** Worker `cartsmith` → **Settings → Variables and Secrets → Add** → Type 选 **Secret**：
   - `SALES_DESK_KEY` = 工作台密码
   - `DEEPSEEK_API_KEY` = DeepSeek 的 Key
   - 存好后它会自动重新部署。
5. **样板 Worker：** 再做一次 **Create → Import a repository → Website-selling**：
   - Project name：`cartsmith-previews`
   - Build command：空白
   - Deploy command：`npx wrangler deploy`
   - Enable Preview builds：关掉
   - Advanced settings → Root directory：`site`
   - 按 Deploy（第一次会失败，正常，因为它先用了主分支）→ 进 Worker → **Settings → Build → Git branch** 改成 `previews` → Save →
     **Deployments**（或 Builds）→ 重新建置一次（Retry build）。
6. 两个 Worker 的 **Settings → Domains & Routes** 里会有 `xxx.workers.dev` 网址，贴给 Claude Code。

## 第 2 部分：Claude Code 做（不用你动手）

- 在 `workers.dev` 网址上检查网站、工作台、AI 客服、表单、浏览监控、样板。
- 把旧工作台的完整资料（研究笔记、联系记录、通话记录、AI 对话、样板密码）放进 D1，逐家核对。
- 用新工作台的钥匙重写 17 个样板的工作台备注（客户的密码不变）。

## 第 3 部分：切换域名（俊宇，建议晚上做；这段时间先不要用工作台）

1. Cloudflare 左边选单 **Domains（Websites）→ Add a domain**（Onboard a domain）→ `cartsmithstudio.com` → 选 **Free** → Continue。
   它会列出自动抓到的 DNS 记录：**每一条的 Proxy status 都切成灰色云（DNS only）**，这样切换当下网站还是先由 Netlify 送出，不会断。
   最后一页会给你 **2 个 nameserver**（`xxx.ns.cloudflare.com`）。
2. **Porkbun** → ACCOUNT → Domain Management → `cartsmithstudio.com` → Details → Nameservers 的铅笔 →
   删掉 4 个 `nsone.net`，填那 2 个 → Save Nameservers。
3. 等 Cloudflare 寄信说域名 **Active**（几分钟到几小时）。
4. Worker `cartsmith` → **Settings → Domains & Routes → Add → Custom domain** → `cartsmithstudio.com` → Add；再加一次 `www.cartsmithstudio.com`。
   Worker `cartsmith-previews` → 同样加 `previews.cartsmithstudio.com`。
   如果说「已经有 DNS 记录」：到 **DNS → Records** 删掉那个名字的旧记录，再加一次。
5. 告诉 Claude Code「域名改好了」，它会检查全部网址，没问题才通知你。
6. 之后：Netlify 新帐号 → 项目 → Domain management → 移除 `cartsmithstudio.com`（项目过几天确认没问题再删）。
7. **换工作台密码**（之前的临时密码出现在聊天里）：Worker `cartsmith` → Settings → Variables and Secrets → `SALES_DESK_KEY` → Edit → 新密码 → Deploy。
   手机和电脑的工作台重新登入一次。

## 技术说明（给 Claude Code）

- 程式：`site/server/`（不分平台：`desk.mjs`、`chat.mjs`、自动产生的 `knowledge.mjs` / `brief.mjs` / `scripts.mjs` / `inbox.mjs`、
  存储 `store-d1.mjs` / `store-file.mjs`；网站访客 `/api/hit` → `traffic.mjs`，D1 表 `hits`，第一次用时自动建立）；Worker 入口 `site/worker.mjs`；设定 `site/wrangler.jsonc`（静态档案 `dist/`、D1 binding `DB`、`keep_vars`）。
  回应标头由 build.py 写进 `dist/_headers`。样板分支的设定 `site/wrangler.jsonc` 由 `preview-publish.js` 放（`cartsmith-previews`，只有静态档案）。
- Workers 会把 `xxx.html` 307 转到 `xxx`（`html_handling: auto-trailing-slash`），所有链接照样能用；浏览监控把两种写法算成同一页。
- 资料表 `kv(k, v, t)`：`prospects-v1`（工作台全部资料，超过 50 万字自动分段 `#000`…）、`preview-keys-v2`、`view:<样板>`、`form:<编号>`。
- 工作台钥匙：ECDH P-256 + HKDF + AES-GCM（`preview-publish.js` 看 `?pubkey=1` 的 `alg` 决定怎么加密）。换了资料库就要重跑 `desk-note`。
- 本机测试：`DESK_LOCAL_FILE=/tmp/desk.json SALES_DESK_KEY=testpass123 ... node site/tools/dev-server.mjs` + `node site/tools/check-desk.js http://localhost:8769 /tmp/desk.json`；
  Cloudflare 执行环境：在 `site/` 跑 `npx wrangler dev`（本机 D1）。
- CPU：打开工作台中位数约 3 毫秒（免费版上限 10 毫秒，2026-11-12 用真实资料量的）。资料变很大时再量一次。
- 不要部署的 commit：说明**开头**写 `[skip ci]`。`leads` 分支两个 Worker 都不会建置（只建置各自设定的 Git branch，Preview builds 关掉）。
