# 08 — 部署到 DigitalOcean（一步一步）

> **2026-11-13 更新：现在就开（俊宇：「试看真的买一台 DigitalOcean，不然看不到」）。** 跟旧版不同的地方：
> - **工作室网站和工作台继续放 Cloudflare，不搬。** 服务器只放「母版网店」和以后客户的网店。
> - 域名用已经有的 `cartsmithstudio.com`（不用再买）。母版网址：`https://master.cartsmithstudio.com`（要密码、noindex）。
> - DNS 在 **Cloudflare** 改，**只加一条 `master` 记录**。不要加 `@`、`www`、`*`，也不要改现有的记录（会把工作室网站和工作台弄坏）。
> - 项目是公开的，服务器直接用 https 下载，不用 GitHub deploy key。
> - 下面的「快速版」做完就有母版站；旧版的详细说明留在后面参考（第 1、4、5 步按快速版做）。

## 贴一行版（2026-11-13，手机上最简单，不用给 API Token）

在 DigitalOcean 网站开 Droplet 时，**Advanced options → Add Initialization scripts** 贴 Claude Code 给的一行指令（它会从 GitHub 下载 `scripts/server/cloud-init.sh`，填好分支、管理员电邮、报告代号再执行）。
Authentication 选 Password（设一个强密码存进 Bitwarden；开机后 SSH 只接受密钥，密码只给网站的 Recovery Console 用）。
开好之后把 IP 告诉 Claude Code，在 Cloudflare 加 `master`、`demo-festive` 两条 A 记录（灰色云）。服务器自己建站，Claude Code 看报告网址。

## 自动版（2026-11-13，俊宇在手机上操作时用）

Claude Code 用 DigitalOcean API 帮你开服务器，服务器开机自己装好一切，你只要做两件事：

1. **给 Claude Code 一个 DigitalOcean API Token**（不要贴在聊天里）：
   - DigitalOcean → **API** → **Generate New Token**：名字 `cartsmith-claude`，Expiration **30 days**，Scopes 选 **Custom**，勾 droplet（全部）、ssh_key（create、read）、tag（create、read）、account / size / region / image / actions（read）。手机上找不到这些的话，选 **Full Access**（30 天会自动失效，用完也可以自己删掉）。
   - 复制 Token，存到 Claude Code 环境设定：工作阶段标题上的环境选单 → **Edit** → **Network secrets**：Host `api.digitalocean.com`，Bearer Token 贴上。存好之后**开一个新的工作阶段**，说「读 PROGRESS.md 继续开服务器」。
2. Claude Code 开好服务器会告诉你 **IP**，你在 Cloudflare 加 `master` 和 `demo-festive` 两条 A 记录（灰色云 DNS only）。

之后服务器自己建母版和节日网店示范，Claude Code 从报告网址看进度。设定（2026-11-13 俊宇选的）：新加坡、Ubuntu 24.04、2 GB / 1 CPU（USD 12 / 月）、**不开 DigitalOcean 备份**、管理员电邮 cartsmith.studio@gmail.com、装自动更新小帮手。
指令：`bash scripts/local/do-server.sh check`（不花钱）→ `create` → `status`。

## 快速版（2026-11-13，约 1 小时）

**A. 你的电脑做 SSH 密钥**（PowerShell；已经有就跳过）
```
ssh-keygen -t ed25519 -C "cartsmith"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```
复制显示的整行（`ssh-ed25519 AAAA... cartsmith`）。

**B. DigitalOcean 开 Droplet**：Create → Droplets → Region **Singapore** → Image **Ubuntu 24.04 (LTS) x64**（脚本是在 24.04 测的，不要选 26.04）→ Size **Basic → Regular → 2 GB / 1 CPU / 50 GB**（2026-11-13 官网价 USD 12 / 月）→ Authentication **SSH Key → New SSH Key**，贴 A 的那一行，名字 `cartsmith-pc` → 勾 **Backups（每周，+20% ≈ USD 2.40）** 和 **Monitoring（免费）** → Hostname `agency-dev` → Create → 复制 **IP**。

**C. Cloudflare 加两条 DNS**：dash.cloudflare.com → `cartsmithstudio.com` → **DNS → Records → Add record**：Type `A`，Name `master`，IPv4 = 服务器 IP，**Proxy status 关掉（灰色云 DNS only）** → Save。再按一次 Add record，一样的设定，Name 填 `demo-festive`（RM399 节日网店的 WordPress 示范）。

**D. 登录服务器、下载程式、初始化**（PowerShell）：
```
ssh root@服务器IP
```
第一次问 `Are you sure...` 输入 `yes`。登录后一行一行贴：
```
apt-get update && apt-get install -y git
git clone -b ccr-4e1e8221-7msrbj https://github.com/Christopher0607/Website-selling.git /opt/agency
bash /opt/agency/scripts/server/provision-server.sh --studio-domain cartsmithstudio.com --email 你的电邮
```
等 5–10 分钟，看到「完成」后，把最后 30 行贴给 Claude Code。

**E. 换成 deploy 用户、关掉 root 登录**：照下面旧版的「第 6 步」（旧视窗不要关）。

**F. 建母版站 + 节日网店示范**（用 deploy 登录）：
```
sudo /opt/agency/scripts/server/build-all.sh
sudo /opt/agency/scripts/server/build-demo.sh demo-festive
```
第一行建母版（约 10–15 分钟），第二行从母版复制出 Butter & Lantern 节日网店（约 5 分钟）。把最后的表格贴给 Claude Code（**不要贴密码**）。

**G. 存密码**：`sudo cat /etc/agency/secrets/master.env` → 把 `WP_ADMIN_USER` / `WP_ADMIN_PASS` / `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` 存进 Bitwarden。然后用手机开 `https://master.cartsmithstudio.com` 和 `https://demo-festive.cartsmithstudio.com`（节日网店示范；后台在网址后面加 `/wp-admin`，密码在 `sudo cat /etc/agency/secrets/demo-festive.env`）。

**以后更新程式**（Claude Code push 之后）：`cd /opt/agency && sudo git pull && sudo scripts/server/install-code.sh all`

---

## 旧版详细说明（2026-11-06 写，参考用）

## 你会得到什么

| 网址 | 用途 | 谁能看 |
|---|---|---|
| `https://yourdomain.com` | 工作室网站（套餐、样板、费用计算器、询价表单） | 公开 |
| `https://master.yourdomain.com` | 母版网店（所有网站的起点） | 要密码 |

---

## 第 0 步：准备（10 分钟）

- [ ] 一个密码管理器（推荐 **Bitwarden**，免费）。之后所有密码都存这里。
- [ ] DigitalOcean 账号
- [ ] 一个 WhatsApp Business 号码（之后填进工作室网站）

## 第 1 步：买域名（10 分钟）

1. 到域名商买 `yourdomain.com`（Namecheap、Cloudflare Registrar、Porkbun 都可以；**看续费价格**，不要只看第一年）。
2. 先不要设定任何东西，等第 3 步拿到服务器 IP。

> 想换名字也可以：只要在第 5 步把 `yourdomain.com` 换成你的域名就好，其他全部自动跟着改。

## 第 2 步：在你的电脑做 SSH 密钥（5 分钟，Windows）

SSH 密钥 = 登录服务器的"钥匙"，比密码安全。

1. 开 **PowerShell**。
2. 输入（一直按 Enter 就好；问 passphrase 可以设一个，记在 Bitwarden）：
   ```
   ssh-keygen -t ed25519 -C "cartsmith"
   ```
3. 显示公钥（等下要贴进 DigitalOcean）：
   ```
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```
   复制整行（`ssh-ed25519 AAAA... cartsmith`）。

## 第 3 步：开服务器（Droplet）（5 分钟）

在 DigitalOcean 控制台：

1. 右上角 **Create → Droplets**
2. **Region：Singapore**
3. **Image：Ubuntu 24.04 (LTS) x64**
4. **Size：Basic → Regular → 2 GB / 1 CPU**（每月约 USD 12，开前看清楚价格）
5. **Authentication：SSH Key → New SSH Key**，贴上第 2 步复制的那一行，名字填 `cartsmith-pc`
6. 勾选 **Enable automated backups**（另外收费，约 +20%）和 **Monitoring**（免费）
7. **Hostname：** `agency-dev`
8. **Create Droplet**，等 1 分钟，复制它的 **IP 地址**（例如 `128.199.xx.xx`）

> ⚠ 新开一台，不要用你跑其他项目的服务器。

## 第 4 步：设定 DNS（5 分钟 + 等生效）

在你买域名的地方，找 DNS 设定，加 3 条 **A 记录**，都指向第 3 步的 IP：

| 类型 | 名称 / Host | 值 |
|---|---|---|
| A | `@` | 服务器 IP |
| A | `www` | 服务器 IP |
| A | `*` | 服务器 IP |

（`*` 是通配符：以后开 `preview-p012.yourdomain.com` 这种新网址，不用再改 DNS。）

检查有没有生效（PowerShell）：
```
nslookup master.yourdomain.com
```
看到你的 IP 就是生效了。

## 第 5 步：登录服务器，下载程式，初始化（15 分钟）

1. PowerShell 登录：
   ```
   ssh root@你的IP
   ```
   第一次会问 `Are you sure...`，输入 `yes`。

2. 让服务器可以从 GitHub 下载这个项目（项目是私人的，所以要给服务器一把"只读钥匙"）：
   ```
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "agency-dev"
   cat ~/.ssh/github_deploy.pub
   ```
   复制显示的那一行，然后在 GitHub：打开 `Christopher0607/Website-selling` → **Settings → Deploy keys → Add deploy key** → Title 填 `agency-dev`，Key 贴上，**不要**勾 Allow write access → Add key。

3. 下载项目到 `/opt/agency`：
   ```
   apt-get update && apt-get install -y git
   GIT_SSH_COMMAND="ssh -i ~/.ssh/github_deploy -o StrictHostKeyChecking=accept-new" git clone git@github.com:Christopher0607/Website-selling.git /opt/agency
   cd /opt/agency && git config core.sshCommand "ssh -i /root/.ssh/github_deploy"
   ```
   > 如果 Claude Code 的工作还在 `ccr-...` 分支、还没合并到 main，加 `-b <分支名>`。

4. 初始化服务器（装 Nginx、PHP、数据库、防火墙等，大约 5–10 分钟）：
   ```
   bash /opt/agency/scripts/server/provision-server.sh --studio-domain yourdomain.com --email 你的电邮
   ```
   最后会显示「版本摘要」和「完成」。

## 第 6 步：确认 deploy 用户能登录，再关掉 root 登录（5 分钟）

**旧的视窗不要关。**

1. 开一个**新的** PowerShell 视窗：
   ```
   ssh deploy@你的IP
   sudo -v
   ```
   没有错误、不用密码 = 成功。
2. 回到旧视窗（root）执行：
   ```
   bash /opt/agency/scripts/server/harden-ssh.sh
   ```
   输入 `y` 确认。
3. 再开一个新视窗测试：`ssh deploy@你的IP` 要能登录；`ssh root@你的IP` 要被拒绝。

**从现在开始，都用 `ssh deploy@你的IP` 登录，指令前面加 `sudo`。**

（可选）在你电脑的 `C:\Users\你的名字\.ssh\config` 加这几行，以后只要打 `ssh agency-dev`：
```
Host agency-dev
  HostName 你的IP
  User deploy
```

## 第 7 步：一次建好所有网站（15 分钟）

确认第 4 步的 DNS 已经生效（`nslookup master.yourdomain.com` 看到 IP），然后：
```
sudo /opt/agency/scripts/server/build-all.sh
```
它会依序建：母版 → 三个样板站 → 工作室网站，每个都自动申请 SSL、跑检查（smoke test）。最后列出所有站点。

> 如果 SSL 申请失败（通常是 DNS 还没生效），等一下再跑一次同一个指令就好，它会接着做。

## 第 8 步：存密码（5 分钟）

每个站点的密码都在服务器上，只有 root 能看：
```
sudo cat /etc/agency/secrets/master.env
sudo cat /etc/agency/secrets/studio.env
```
把 `WP_ADMIN_USER` / `WP_ADMIN_PASS`（后台登录）、`BASIC_AUTH_USER` / `BASIC_AUTH_PASS`（母版的访问密码）存进 Bitwarden。**不要贴到聊天或 WhatsApp。**

后台网址：`https://yourdomain.com/wp-admin`、`https://master.yourdomain.com/wp-admin` …

## 第 9 步：上线前要补的资料（跟 Claude Code 一起做）

1. **工作室资料**：WhatsApp 号码、电邮、SSM 名称和号码 → 改 `sites/studio/brand-config.json` → commit → 服务器 `cd /opt/agency && sudo git pull && sudo scripts/server/setup-studio.sh yourdomain.com`
2. **寄信**：注册 Brevo（免费）→ 后台 FluentSMTP 选 Brevo、贴 API Key → 按 FluentSMTP 显示的记录在 DNS 加 SPF / DKIM → 发测试邮件到 Gmail，确认在收件箱
3. **监控**：注册 UptimeRobot（免费）→ 为 `https://yourdomain.com` 和三个样板站各加一个 HTTP 监控
4. **Google**：Search Console 用 DNS TXT 验证 `yourdomain.com`，提交 `https://yourdomain.com/sitemap_index.xml`
5. **备份到 Google Drive**（可选）：后台 UpdraftPlus → Settings → Google Drive → 授权
6. **（可选）销售 AI 助理 / 网站 AI 客服**：照 `sales/agent/README.md` 的「安装」三步（要一个 Anthropic API Key，先设每月花费上限）
7. **测速**：用 PageSpeed Insights 测 `https://yourdomain.com` 和一个样板站的手机版分数，记在 `sites/<代号>/README.md`

---

## 日常会用到的指令（都在服务器上，用 deploy 登录）

| 想做什么 | 指令 |
|---|---|
| 看所有站点状态 | `sudo /opt/agency/scripts/server/site-inventory.sh` |
| 给潜在客户做样板 | `sudo /opt/agency/scripts/server/make-preview.sh p012 /path/brand-config.json` |
| 删除到期的样板 | `sudo /opt/agency/scripts/server/cleanup-previews.sh` |
| 备份一个站 | `sudo /opt/agency/scripts/server/backup-site.sh <代号>` |
| 安全更新一个站（失败自动还原） | `sudo /opt/agency/scripts/server/update-site.sh <代号>` |
| 检查一个站 | `sudo /opt/agency/scripts/server/smoke-test.sh https://<网址> --site <代号>` |
| 拉最新程式 + 更新插件和子主题 | `cd /opt/agency && sudo git pull && sudo scripts/server/install-code.sh all` |
| 暂时关掉母版的密码（测 PageSpeed） | `sudo /opt/agency/scripts/server/site-config.sh master --basic-auth off`（测完 `on`） |

每个脚本都可以加 `--help` 看说明。完整列表见 `scripts/README.md`。

---

## 之后怎么让 Claude Code 帮你管服务器

两种方式，选一种：

1. **（推荐）在你的 Windows 电脑装 Claude Code**，在项目文件夹里开它。它可以用 `ssh agency-dev "sudo ..."` 直接帮你跑上面的指令。
2. **在网页版 Claude Code（像现在这样）**：它改程式、写文案、commit 到 GitHub；你在服务器上 `git pull` 再跑指令，把结果贴回给它看。

无论哪一种：破坏性的操作（删除站点、还原）它都会先问你。
