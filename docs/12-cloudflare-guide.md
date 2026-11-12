# 12 · 网站放在 Cloudflare（2026-11-12 起）

> 为什么搬：Netlify 免费方案每月只能正式部署 20 次，新帐号还会在网站上加「Powered by Netlify」标志，关掉要付费。
> Cloudflare 免费方案：每月 500 次部署、网页流量不限、没有标志。工作台、AI 客服、浏览监控、网站表单都放在 Cloudflare 的
> Pages Functions，资料放在 Cloudflare 的资料库 D1。
> 查证日期 2026-11-12：[Workers 限制](https://developers.cloudflare.com/workers/platform/limits/)（免费版每次请求 10 毫秒 CPU、
> 每天 10 万次请求）、[D1 限制](https://developers.cloudflare.com/d1/platform/limits/)（每行 2 MB、每次请求 50 次查询）。

## 网址

| 用途 | 网址 |
|---|---|
| 工作室网站 | https://cartsmithstudio.com |
| 销售工作台 | https://cartsmithstudio.com/desk/ |
| 客户的样板 | https://previews.cartsmithstudio.com/<代号>-xxxx/（网址和密码永远不变） |
| Cloudflare 自己的网址（备用） | https://<项目名>.pages.dev 、样板分支 https://previews.<项目名>.pages.dev |

## 第 1 部分：开 Cloudflare 和网站（俊宇，约 20 分钟；这时 Netlify 照常运作，客户不受影响）

1. 打开 https://dash.cloudflare.com/sign-up ，用工作室的 Gmail 注册（免费），去信箱按验证。
2. **建资料库：** 左边选单 **Storage & databases → D1 SQL database → Create database** → 名字填 `cartsmith-desk` → Create。
3. **建网站：** 左边选单 **Workers & Pages → Create → Pages 分页 → Connect to Git（Import an existing Git repository）** →
   GitHub 授权时选 **Only select repositories → Website-selling** → 回到 Cloudflare 选 `Website-selling` → **Begin setup**。
4. 设定（照填）：
   - Project name：`cartsmith`（被用掉的话用 `cartsmith-studio`）
   - Production branch：`ccr-4e1e8221-7msrbj`
   - Framework preset：`None`
   - Build command：`python3 build.py`
   - Build output directory：`dist`
   - **Root directory（Advanced 里面）：`site`**
   - Environment variables（按 Add variable，前两个选 **Encrypt**）：
     - `SALES_DESK_KEY` = 工作台密码
     - `DEEPSEEK_API_KEY` = DeepSeek 的 Key
     - `DEEPSEEK_MODEL` = `deepseek-flash`
5. 按 **Save and Deploy**，等它变成 Success（2–3 分钟）。
6. **接资料库：** 项目 → **Settings → Bindings → Add → D1 database** → Variable name 填 `DB` → 选 `cartsmith-desk` → Save。
7. **只部署两个分支：** 项目 → **Settings → Builds** → Branch control → Preview branches 选 **Custom branches** → Include 填 `previews` → Save。
   （每天的 `leads` 分支不用部署，工作台直接读它。）
8. **让设定生效：** 项目 → **Deployments** → 最上面那一次右边 **⋯ → Retry deployment**。
9. 把 `https://<项目名>.pages.dev` 这个网址告诉 Claude Code。

## 第 2 部分：Claude Code 做（不用你动手）

- 在 `<项目名>.pages.dev` 上检查网站、工作台、AI 客服、表单、浏览监控。
- 把旧工作台的完整资料（研究笔记、联系记录、通话记录、AI 对话、样板密码）整份放进 Cloudflare 的资料库，逐家核对。
- 推一次样板分支，让 Cloudflare 建好 `previews`；用新工作台的钥匙重写 17 个样板的工作台备注（客户的密码不变）。

## 第 3 部分：切换域名（俊宇，约 15 分钟 + 等生效；建议晚上做，这段时间先不要用工作台）

1. Cloudflare 左边选单 **Websites（Domains）→ Add a domain** → 填 `cartsmithstudio.com` → 选 **Free** → Continue。
   它会自动抓现有的 DNS 记录，直接 Continue。最后一页会给你 **2 个 nameserver**（像 `xxx.ns.cloudflare.com`），先记下来。
2. Pages 项目 → **Custom domains → Set up a custom domain** → 填 `cartsmithstudio.com` → Continue → Activate domain。
   再做一次，填 `www.cartsmithstudio.com`。再做一次，填 `previews.cartsmithstudio.com`。
3. Cloudflare → `cartsmithstudio.com` → **DNS → Records** → 找到名字是 `previews` 的 CNAME → Edit →
   Target 改成 `previews.<项目名>.pages.dev` → **Proxy status 要是橘色云（Proxied）** → Save。
4. **Porkbun** → ACCOUNT → Domain Management → `cartsmithstudio.com` → Details → Nameservers 的铅笔 →
   删掉 4 个 `nsone.net`，填第 1 步的 2 个 Cloudflare nameserver → Save Nameservers。
5. 告诉 Claude Code「域名改好了」。通常几分钟到几小时生效；Claude Code 会一直检查，全部正常才通知你。
6. 全部正常后：Netlify 新帐号 → 项目 → Domain management → 把 `cartsmithstudio.com` 移除（不删项目，过几天确认没问题再删）。
7. **换工作台密码**（之前的临时密码出现在聊天里）：Cloudflare → Pages 项目 → Settings → Variables and Secrets → `SALES_DESK_KEY` → Edit →
   新密码 → Save → Deployments → Retry deployment。手机和电脑的工作台重新登入一次。

## 技术说明（给 Claude Code）

- 程式：`site/server/`（不分平台：`desk.mjs`、`chat.mjs`、自动产生的 `knowledge.mjs` / `brief.mjs` / `scripts.mjs` / `inbox.mjs`、
  存储 `store-d1.mjs` / `store-file.mjs`）；Cloudflare 入口 `site/functions/api/{desk,track,form,chat}.js`；回应标头由 build.py 写进 `dist/_headers`。
- 资料表 `kv(k, v, t)`：`prospects-v1`（工作台全部资料，超过 50 万字会自动分段 `#000`…）、`preview-keys-v2`、`view:<样板>`、`form:<编号>`。
- 工作台钥匙：ECDH P-256 + HKDF + AES-GCM（`preview-publish.js` 看 `?pubkey=1` 的 `alg` 决定怎么加密）。换了资料库就要重跑 `desk-note`。
- 本机测试：`DESK_LOCAL_FILE=/tmp/desk.json SALES_DESK_KEY=testpass123 ... node site/tools/dev-server.mjs` + `node site/tools/check-desk.js http://localhost:8769 /tmp/desk.json`；
  真正的 Cloudflare 执行环境：`npx wrangler pages dev dist --d1 DB`（在 `site/` 里）。
- CPU：打开工作台中位数约 3 毫秒（免费版上限 10 毫秒，2026-11-12 用真实资料量的）。资料变很大时再量一次。
- 不要部署的 commit：说明**开头**写 `[skip ci]`。`leads` 分支在 Branch control 排除，不会部署。
- 样板分支 `previews`：发布工具会放一个只复制 `public/` 的 `site/build.py`，Cloudflare 用同一个建置指令也能建。
