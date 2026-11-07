# 09 — 把工作室网站放上 Netlify（一步一步）

> 给俊宇：照顺序做，每一步做完再做下一步。看不懂的地方，把那一步贴给 Claude Code 问。
> 全部大约 45 分钟。**不用买域名、不用开服务器**，先用免费的 `xxx.netlify.app` 网址。
> 写于 2026-11-07。Netlify / DeepSeek 的画面和价格会变，按钮名字不一样时，找意思最接近的。

## 你会得到什么

| 网址（例子） | 是什么 |
|---|---|
| `https://cartsmith.netlify.app` | 工作室网站：首页、6 个模板、价格、为什么选我们、流程、FAQ、免费样板申请表、Shopee 费用计算器、AI 客服 |
| `https://cartsmith.netlify.app/demo/dewlane/` 等 6 个 | 可以真的点的样板店（虚构品牌，结账不收钱） |
| Netlify 后台 → Forms | 客人填的「免费样板申请」和 AI 客服收集到的名单，会寄电邮通知你 |

**名词：**
- **Netlify** = 帮你放网站的平台。网站的程式在 GitHub，Netlify 每次看到新版本就自动更新网站（大约 1 分钟）。
- **DeepSeek API Key** = 让网站 AI 客服可以用 DeepSeek 回答问题的「钥匙」。要保密，像密码一样。
- **Environment variable（环境变量）** = 放在 Netlify 后台的秘密设定，不会出现在网站或 GitHub 上。

---

## 第 A 部分：开 Netlify 网站（15 分钟）

1. 打开 https://app.netlify.com/signup → 选 **Sign up with GitHub**，用 `Christopher0607` 这个 GitHub 账号登录、按 Authorize。
2. 进到后台后：**Add new project（或 Add new site）→ Import an existing project → GitHub**。
3. 第一次会要你安装 Netlify 的 GitHub App：选 **Only select repositories → Website-selling → Install**。
4. 选 `Website-selling`。
5. **Branch to deploy（用哪个分支）：** 选 `ccr-4e1e8221-7msrbj`（Claude Code 的工作都在这里）。
   > 以后把这个分支合并到 `main`，就改成 `main`：Site configuration → Build & deploy → Branches。
6. 下面的 Build settings **不要改**（会自动读 `netlify.toml`：base `site`、command `python3 build.py`、publish `dist`）。按 **Deploy**。
7. 等 1–3 分钟，看到 **Published** 就好了。点上面的网址（像 `random-name-123.netlify.app`）打开看看。
8. **改网址名字：** Site configuration → **Change site name** → 输入 `cartsmith` → Save。
   - 如果被用了，试 `cartsmith-studio` 或 `cartsmith-my`。
   - ⚠ 用的不是 `cartsmith` 的话，告诉 Claude Code 新网址，它会把 `site/studio.json`（site_url）和销售资料里的网址一起改掉。

### 开启表单（重要，不做的话客人填的表会收不到）

9. Site configuration → **Forms** → **Enable form detection**（开启表单侦测）。
10. 回到 **Deploys → Trigger deploy → Deploy site**（重新部署一次，Netlify 才会找到表单）。
11. 部署完，**Forms** 页面应该看到两个表单：`mockup-request`（免费样板申请）和 `ai-chat-lead`（AI 客服收集的名单）。
12. **电邮通知：** Site configuration → Forms → **Form notifications → Add notification → Email notification** → Event 选 `New form submission`、Form 选 **Any form**、填你的电邮 → Save。
13. **测试：** 打开 `https://cartsmith.netlify.app/start.html`，用你自己的资料填一次 → 应该跳到「Thank you」页 → 几分钟内收到电邮 → Netlify Forms 页看得到。

> 费用（2026-11-07 查）：Netlify 免费方案每月有一定的额度（credits），这种网站流量不大时通常够用；Netlify 2026 年 4 月的更新说免费方案的表单提交不再扣额度。额度用完网站会暂停，不会自动收钱。正式依据：https://www.netlify.com/pricing/ 。

---

## 第 B 部分：开启 AI 客服（DeepSeek，10 分钟）

1. 打开 https://platform.deepseek.com → 注册 / 登录。
2. **Top up（充值）**：先充小额就好（例如 USD 2–5）。DeepSeek 是**预付**的：钱用完 AI 就停，不会多收钱。充值前看一下价格页 https://api-docs.deepseek.com/quick_start/pricing 。
   > 大约用量：一段 5–10 句的网站聊天通常只用到很少的 token；先充小额，用一个月看后台 Usage 再决定。
3. 左边 **API keys → Create new API key** → 名字填 `cartsmith-website` → 复制那串 `sk-...`（只显示一次）。
   - **马上存进 Bitwarden。不要贴到聊天、Instagram、WhatsApp、GitHub。**
4. 回到 Netlify：Site configuration → **Environment variables → Add a variable → Add a single variable**
   - Key：`DEEPSEEK_API_KEY`
   - Value：贴上刚才的 `sk-...`
   - Scopes：至少勾 **Functions**（或选 All scopes）
   - 按 **Create variable**
5. **Deploys → Trigger deploy → Deploy site**（新的设定要重新部署才生效）。
6. **测试：** 打开网站 → 右下角 **Ask us anything** → 问「How much is a website?」和「网站要多少钱？」。
   - 回答怪怪的、或说错价格 → 告诉 Claude Code，它会改 `sales/agent/knowledge.md`（AI 只根据这个文件回答）。
   - 显示「AI assistant isn't available」→ 检查第 4 步的名字有没有打错、有没有重新部署、DeepSeek 余额。
7. **想关掉 AI 客服：** 在 Netlify 把 `DEEPSEEK_API_KEY` 删掉再重新部署，聊天视窗会改成显示「请 DM 我们的 Instagram」。

> 隐私：网站的隐私通知（`privacy.html`）已经写明聊天内容会交给 DeepSeek 处理、可能在马来西亚以外处理。这是草稿，正式接案前请律师看一次。

---

## 第 C 部分：Instagram（工作室的联系方式，15 分钟）

1. 开一个新的 Instagram 账号，用户名 `cartsmith.studio`。
   - ⚠ 被用了的话，选别的（例如 `cartsmith.my`），然后告诉 Claude Code，它会改 `site/studio.json`、`sales/agent/knowledge.md` 和话术。
2. 设定 → **Account type and tools → Switch to professional account → Business**，类别选和网站设计有关的（例如 Website / Web designer）。
3. **Bio（简介）**，可以直接用：
   ```
   Online stores for Shopee & TikTok brands 🇲🇾
   Free homepage mockup · fixed prices · first month of Care free
   EN / 中文 / BM · DM us 👇
   ```
   **Link：** `https://cartsmith.netlify.app`
4. **Saved replies（快速回复）：** 设定 → Business tools and controls → **Saved replies** → 按 `sales/scripts.md` 第 6 节加 5 个。
5. 测试：用另一个账号打开 `https://ig.me/m/cartsmith.studio`，应该直接打开对话。

---

## 第 D 部分：给潜在客户做免费样板（每个 15–20 分钟）

> 这是我们最重要的成交工具：对方先看到**自己的品牌**放在模板上，再决定。

**准备（只做一次）：** 在你的 Windows 电脑装 Python：https://www.python.org/downloads/ → Download → 安装时**勾选「Add python.exe to PATH」**。

1. 在项目文件夹建 `clients/p012/preview/`（p012 换成名单里的代号），把 `templates/preview.example.json` 复制进去、改名 `preview.json`。
2. 打开 `preview.json` 填：
   - `template`：对方最适合的模板（`dewlane` / `plainfold` / `chili-pantry` / `lowlight` / `tailmate` / `voltnest`）
   - `delete_by`：今天 + 14 天（程式不接受超过 14 天）
   - `password`：一个简单密码（发给对方用）
   - `brand`：名字、简介、颜色（从对方 logo 取）
   - `products`：4–8 个主打产品（名字、价格、分类、照片文件名）
3. 把对方店里**公开的**产品照片和一张大图存进 `clients/p012/preview/img/`（只用在这个私人样板）。
4. 在项目文件夹开 PowerShell，执行：
   ```
   python site/build.py --preview clients/p012/preview/preview.json
   ```
   会产生 `clients/p012/preview/site/` 文件夹。（这个文件夹和照片**不会**进 git。）
   > 不想自己跑：在电脑版 Claude Code 说「帮我做 p012 的样板」，它会帮你填和执行。
5. 打开 https://app.netlify.com/drop ，把 `site` 文件夹**拖进去** → 得到一个网址。
6. 改成不好猜的名字：那个网站 → Site configuration → Change site name → `p012-glowlab-7k3q`（加几个随机字）。
7. 用手机打开、输入密码、确认没问题 → 录 1 分钟屏幕（边滑边讲）→ 在 Instagram 发给对方：网址 + 密码 + 录屏 + 删除日期。
8. 记录：`python sales/agent/sales_agent.py mark p012 preview_sent --url https://p012-glowlab-7k3q.netlify.app`
9. **到期删除（必须做）：** 每天的销售清单会提醒。Netlify → 那个网站 → Site configuration → 最下面 **Delete this site**；电脑里的 `clients/p012/preview/` 文件夹也删掉。

> ⚠ 限制（老实说）：Netlify 免费方案没有真正的密码保护。我们的做法是「不公开的随机网址 + 密码页 + 不给搜索引擎收录」，可以挡住一般人，但懂技术的人还是看得到网页内容。所以样板只放对方本来就公开的资料。需要真正的密码保护：Netlify 付费方案（Pro 约 USD 20/月，开之前先确认价格）或以后用服务器版 `make-preview.sh`。

---

## 第 E 部分：以后怎么更新网站

- 跟 Claude Code 说要改什么（价格、文字、加模板……）→ 它改好、commit、push → Netlify 自动更新（1–3 分钟）。
- 改了价格或优惠：一定要同时改 `site/studio.json` 和 `sales/agent/knowledge.md`（Claude Code 会提醒）。
- 看部署有没有成功：Netlify → **Deploys**，最新一个是绿色 Published 就好。失败的话，点进去复制错误给 Claude Code。

## 常见问题

| 问题 | 怎么办 |
|---|---|
| 部署失败 `python3: command not found` | 截图 Deploy log 给 Claude Code |
| 表单页面看不到表单 | 第 A 部分第 9–10 步：开启 form detection 后要**重新部署** |
| 收不到表单电邮 | 检查垃圾邮件；Forms → Form notifications 有没有设 |
| AI 客服说不能用 | 第 B 部分第 6 步的检查 |
| 想换成自己的域名 | 买了域名后告诉 Claude Code；Netlify → Domain management → Add a domain，照指示改 DNS |
