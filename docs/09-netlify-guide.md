# 09 — 把工作室网站放上 Netlify（一步一步）

> 给俊宇：照顺序做，每一步做完再做下一步。看不懂的地方，把那一步贴给 Claude Code 问。
> 全部大约 45 分钟。**不用买域名、不用开服务器**，先用免费的 `xxx.netlify.app` 网址。
> 写于 2026-11-07（同日按 Netlify 新版后台更新）。Netlify 现在把「Site」叫做 **Project**：以前的 *Site configuration* 现在叫 **Project configuration**。按钮名字不一样时，找意思最接近的，或截图给 Claude Code。

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
   > 以后把这个分支合并到 `main`，就改成 `main`：Project configuration → Build & deploy → Branches。
6. 下面的 Build settings **不要改**（会自动读 `netlify.toml`：base `site`、command `python3 build.py`、publish `dist`）。按 **Deploy**。
7. 等 1–3 分钟，看到 **Published** 就好了。点上面的网址（像 `random-name-123.netlify.app`）打开看看。
8. **改网址名字：** Project configuration → General → **Change project name**（以前叫 Change site name） → 输入 `cartsmith` → Save。
   - 如果被用了，试 `cartsmith-studio` 或 `cartsmith-my`。
   - ⚠ 用的不是 `cartsmith` 的话，告诉 Claude Code 新网址，它会把 `site/studio.json`（site_url）和销售资料里的网址一起改掉。

### 开启表单（重要，不做的话客人填的表会收不到）

9. 在网站的后台，看**左边的菜单**（不是 Project configuration 里面），点 **Forms**。
   - 页面中间会有一个按钮 **Enable form detection**（开启表单侦测）→ 点它。
   - 手机上左边菜单可能收起来了：点左上角的 ☰ 或网站名字旁边的箭头打开菜单。
   - 也可以直接打开这个网址（把 `cartsmith` 换成你的网址名）：`https://app.netlify.com/projects/cartsmith/forms`
10. 回到左边菜单 **Deploys → Trigger deploy → Deploy project**（以前叫 Deploy site；重新部署一次，Netlify 才会找到表单）。
11. 部署完，**Forms** 页面应该看到两个表单：`mockup-request`（免费样板申请）和 `ai-chat-lead`（AI 客服收集的名单）。
12. **电邮通知：** 左边菜单 **Forms** → 上面的分页 **Submission notifications**（或直接打开 `https://app.netlify.com/projects/cartsmith/forms?tab=notifications`）→ **Add notification → Email notification** → Event 选 `New form submission`、Form 选 **Any form**、填你的电邮 → Save。
13. **测试：** 打开 `https://cartsmith.netlify.app/start.html`，用你自己的资料填一次 → 应该跳到「Thank you」页 → 几分钟内收到电邮 → Netlify Forms 页看得到。

> 费用（2026-11-07 查）：Netlify 免费方案每月有一定的额度（credits），这种网站流量不大时通常够用；Netlify 2026 年 4 月的更新说免费方案的表单提交不再扣额度。额度用完网站会暂停，不会自动收钱。正式依据：https://www.netlify.com/pricing/ 。

---

## 第 B 部分：开启 AI 客服（DeepSeek，10 分钟）

1. 打开 https://platform.deepseek.com → 注册 / 登录。
2. **Top up（充值）**：先充小额就好（例如 USD 2–5）。DeepSeek 是**预付**的：钱用完 AI 就停，不会多收钱。充值前看一下价格页 https://api-docs.deepseek.com/quick_start/pricing 。
   > 大约用量：一段 5–10 句的网站聊天通常只用到很少的 token；先充小额，用一个月看后台 Usage 再决定。
3. 左边 **API keys → Create new API key** → 名字填 `cartsmith-website` → 复制那串 `sk-...`（只显示一次）。
   - **马上存进 Bitwarden。不要贴到聊天、Instagram、WhatsApp、GitHub。**
4. 回到 Netlify：Project configuration → **Environment variables → Add a variable → Add a single variable**
   - Key：`DEEPSEEK_API_KEY`
   - Value：贴上刚才的 `sk-...`
   - Scopes：至少勾 **Functions**（或选 All scopes）
   - 按 **Create variable**
5. **Deploys → Trigger deploy → Deploy project**（新的设定要重新部署才生效）。
6. **测试：** 打开网站 → 右下角 **Ask us anything** → 问「How much is a website?」和「网站要多少钱？」。
   - 回答怪怪的、或说错价格 → 告诉 Claude Code，它会改 `sales/agent/knowledge.md`（AI 只根据这个文件回答）。
   - 显示「AI assistant isn't available」→ 检查第 4 步的名字有没有打错、有没有重新部署、DeepSeek 余额。
7. **想关掉 AI 客服：** 在 Netlify 把 `DEEPSEEK_API_KEY` 删掉再重新部署，聊天视窗会改成显示「请 DM 我们的 Instagram」。

> 隐私：网站的隐私通知（`privacy.html`）已经写明聊天内容会交给 DeepSeek 处理、可能在马来西亚以外处理。这是草稿，正式接案前请律师看一次。

---

## 第 C 部分：Instagram（工作室的联系方式，15 分钟）

1. 工作室用的 Instagram 账号：**`cartsmith.studio`**（2026-11-08 俊宇改好，头像用 2 号标志）。网站、AI 客服、话术里的 Instagram 链接都已经指向这个账号。
   - 以后想换成品牌名（例如 `cartsmith.studio`）：Instagram 可以直接改用户名；改了之后告诉 Claude Code，它会改 `site/studio.json` 并重新部署。
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
> **2026-11-09 起只给电话里说「可以」的商家做**（每天最多 2–3 个）。注意点数：用 Netlify Drop 发布一个样板很可能算一次正式部署（15 点，免费方案每月 300 点）；deploy preview / branch deploy 不扣点（2026-11-09 查，[官方说明](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)）。一个月要做超过十几个样板之前，先请 Claude Code 改成不扣点的发布方式。

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
6. 改成不好猜的名字：那个网站 → Project configuration → General → Change project name → `p012-glowlab-7k3q`（加几个随机字）。
7. 用手机打开、输入密码、确认没问题 → 录 1 分钟屏幕（边滑边讲）→ 在 Instagram 发给对方：网址 + 密码 + 录屏 + 删除日期。
8. 记录：`python sales/agent/sales_agent.py mark p012 preview_sent --url https://p012-glowlab-7k3q.netlify.app`
9. **到期删除（必须做）：** 每天的销售清单会提醒。Netlify → 那个网站 → Project configuration → General → 最下面 **Delete this project**；电脑里的 `clients/p012/preview/` 文件夹也删掉。

> ⚠ 限制（老实说）：Netlify 免费方案没有真正的密码保护。我们的做法是「不公开的随机网址 + 密码页 + 不给搜索引擎收录」，可以挡住一般人，但懂技术的人还是看得到网页内容。所以样板只放对方本来就公开的资料。需要真正的密码保护：Netlify 付费方案（Pro 约 USD 20/月，开之前先确认价格）或以后用服务器版 `make-preview.sh`。

---

## 第 E 部分：以后怎么更新网站

- 跟 Claude Code 说要改什么（价格、文字、加模板……）→ 它改好、commit、push → Netlify 自动更新（1–3 分钟）。
- **省点数：** 免费方案每次正式部署扣 15 点（每月 300 点）。所以改动会集中起来一次 push；只改文件、研究资料、每天的新商家，都不会部署（`scripts/netlify-ignore.sh`、`leads` 分支）。
- 改了价格或优惠：一定要同时改 `site/studio.json` 和 `sales/agent/knowledge.md`（Claude Code 会提醒）。
- 看部署有没有成功：Netlify → **Deploys**，最新一个是绿色 Published 就好。失败的话，点进去复制错误给 Claude Code。
- **手机版（2026-11-08）：** 6 个模板在手机上（宽度 600px 以下）有自己的排版：顶部比较窄；首页的商品和「步骤」改成左右滑动；商品页的大图贴满屏幕宽度，手指左右滑换图（下面的小圆点表示第几张）；购物车底部固定「总数 + Checkout」；聊天按钮变小，在购物车和结账页隐藏；页脚分两栏。电脑版和平板不变。某一排商品想在手机上维持两栏方格（不要左右滑），在 `template.json` 那一段加 `"mobile": "grid"`；只有 2 个商品的那一排会自动用方格。

## 第 F 部分：换一个 Netlify 帐号（2026-11-08，旧帐号的点数用完了）

> **为什么：** 免费方案每月 300 点，**每次正式部署扣 15 点**（等于一个月只能部署 20 次），点数用完后部署会被挡、网站最后会暂停到下个月（2026-11-08 查：[Netlify 计费更新](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/)、[Free 方案比较](https://www.netlify.com/pricing/pro-vs-free/)）。
> **以后不会再那么快用完：** 每天的新商家改放在 GitHub 的 `leads` 分支，工作台直接读取，不用部署；只改文件的 commit 也会自动跳过 build（`scripts/netlify-ignore.sh`）。只有网站或工作台真的改了才部署，Claude Code 也会把改动集中起来一次 push。
> 只开**一个**新帐号就好，不要一直换（Netlify 的使用政策不允许大量开帐号）。

**第 1 步：先在旧网站备份（5 分钟）**
1. 手机打开旧的工作台 `https://cartsmith.netlify.app/desk/` → 下面「数字」→「下载名单（CSV）」。把档案存好（例如传到自己的 Google Drive）。
2. 旧帐号的 Netlify 后台 → 左边菜单 **Forms** → 看有没有客人填过的「免费样板申请」，有的话截图或复制下来。

**第 2 步：让旧网站停下来、把名字让出来（3 分钟）**
3. 旧帐号 → 网站 → **Project configuration → Build & deploy → Continuous deployment → Build settings → Configure → Builds: Stopped** → Save。（这样以后 push 不会再触发旧帐号的 build。）
4. **Project configuration → General → Change project name** → 改成 `cartsmith-old` → Save。这样 `cartsmith` 这个名字就空出来给新帐号用。

**第 3 步：用新帐号开网站（15 分钟）**
5. 先登出旧帐号。打开 https://app.netlify.com/signup ，**用一个新的 Email 注册**（建议用工作室专用的 Gmail，例如 `cartsmith.studio@gmail.com`）。
6. 注册好以后：**Add new project → Import an existing project → GitHub** → 用 `Christopher0607` 的 GitHub 授权 → 安装 Netlify GitHub App 时选 **Only select repositories → Website-selling**。
   - 如果 GitHub 说这个 App 已经装过了：在 GitHub → Settings → Applications → Netlify → Configure，确认有勾 `Website-selling`。
7. 选 `Website-selling` → **Branch to deploy：`ccr-4e1e8221-7msrbj`** → Build settings 不要改 → 先**不要按 Deploy**，往下找 **Add environment variables**（或部署后再到 Project configuration → Environment variables）加这三个：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek Key（跟旧的一样）
   - `SALES_DESK_KEY` = 工作台密码（可以跟旧的一样）
   - `DEEPSEEK_MODEL` = `deepseek-flash`（选填）
   - Scopes 至少勾 **Functions**。
8. 按 **Deploy**，等 1–3 分钟变绿色 **Published**。
9. **Project configuration → General → Change project name** → `cartsmith` → Save。网址就会是 `https://cartsmith.netlify.app`，跟以前一样（IG 简介不用改）。
   - 名字如果还没空出来：先用 `cartsmith-studio`，告诉 Claude Code，它会把网址改掉。
10. **只部署正式分支（省点数）：** Project configuration → Build & deploy → Branches and deploy contexts → Configure → **Branch deploys: Deploy only the production branch** → Save。
11. **表单：** 左边菜单 **Forms → Enable form detection** → 然后 **Deploys → Trigger deploy → Deploy project** 重新部署一次 → 再到 Forms 设电邮通知（照第 A 部分第 12 步）。

**第 4 步：把名单搬过去（2 分钟）**
12. 打开新的 `https://cartsmith.netlify.app/desk/` → 输入工作台密码 → 下面「数字」→ **从备份还原** → 选第 1 步下载的 CSV → 按「还原」。联系过的商家、跟进日期都会回来。
13. 「今天」最上面应该看到「新商家」。

**第 5 步：确认没问题后，删掉旧网站（1 分钟，可以过几天再做）**
14. 旧帐号 → `cartsmith-old` → Project configuration → General → 最下面 **Delete project**。

> 做完告诉 Claude Code「新帐号好了」，它会检查网站、工作台、AI 客服，再重新开启每天找餐厅的定时任务。

---

## 常见问题

| 问题 | 怎么办 |
|---|---|
| 部署失败 `python3: command not found` | 截图 Deploy log 给 Claude Code |
| 表单页面看不到表单 | 第 A 部分第 9–10 步：开启 form detection 后要**重新部署**。检查方法：告诉 Claude Code，它可以从外面看出表单有没有被 Netlify 接管 |
| 收不到表单电邮 | 检查垃圾邮件；Forms → Form notifications 有没有设 |
| AI 客服说不能用 | 第 B 部分第 6 步的检查 |
| 想换成自己的域名 | 买了域名后告诉 Claude Code；Netlify → Domain management → Add a domain，照指示改 DNS |
