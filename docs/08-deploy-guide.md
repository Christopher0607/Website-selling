# 08 — 部署到 DigitalOcean（一步一步）

> 给俊宇：照顺序做。每一步做完再做下一步。看不懂的地方，把那一步贴给 Claude Code 问。
> 全部做完大约 1–2 小时（其中等 DNS 生效可能要 10 分钟到几小时）。
> 所有东西都已经在本地完整测试过（2026-11-06）：建站、复制、套品牌、备份、还原、更新失败自动还原、删除站点。

---

## 你会得到什么

| 网址 | 用途 | 谁能看 |
|---|---|---|
| `https://kedailab.com` | 工作室网站（套餐、样板、费用计算器、询价表单） | 公开 |
| `https://master.kedailab.com` | 母版网店（所有网站的起点） | 要密码 |
| `https://demo-rimbun.kedailab.com` | 样板：护肤 Rimbun Skin | 公开（不被搜索引擎收录） |
| `https://demo-teduh.kedailab.com` | 样板：头巾 Teduh Studio | 公开（不被搜索引擎收录） |
| `https://demo-kenanga.kedailab.com` | 样板：食品 Dapur Seri Kenanga | 公开（不被搜索引擎收录） |

---

## 第 0 步：准备（10 分钟）

- [ ] 一个密码管理器（推荐 **Bitwarden**，免费）。之后所有密码都存这里。
- [ ] DigitalOcean 账号
- [ ] 一个 WhatsApp Business 号码（之后填进工作室网站）

## 第 1 步：买域名（10 分钟）

1. 到域名商买 `kedailab.com`（Namecheap、Cloudflare Registrar、Porkbun 都可以；**看续费价格**，不要只看第一年）。
2. 先不要设定任何东西，等第 3 步拿到服务器 IP。

> 想换名字也可以：只要在第 5 步把 `kedailab.com` 换成你的域名就好，其他全部自动跟着改。

## 第 2 步：在你的电脑做 SSH 密钥（5 分钟，Windows）

SSH 密钥 = 登录服务器的"钥匙"，比密码安全。

1. 开 **PowerShell**。
2. 输入（一直按 Enter 就好；问 passphrase 可以设一个，记在 Bitwarden）：
   ```
   ssh-keygen -t ed25519 -C "kedailab"
   ```
3. 显示公钥（等下要贴进 DigitalOcean）：
   ```
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```
   复制整行（`ssh-ed25519 AAAA... kedailab`）。

## 第 3 步：开服务器（Droplet）（5 分钟）

在 DigitalOcean 控制台：

1. 右上角 **Create → Droplets**
2. **Region：Singapore**
3. **Image：Ubuntu 24.04 (LTS) x64**
4. **Size：Basic → Regular → 2 GB / 1 CPU**（每月约 USD 12，开前看清楚价格）
5. **Authentication：SSH Key → New SSH Key**，贴上第 2 步复制的那一行，名字填 `kedailab-pc`
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

（`*` 是通配符：以后开 `preview-p012.kedailab.com` 这种新网址，不用再改 DNS。）

检查有没有生效（PowerShell）：
```
nslookup master.kedailab.com
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
   bash /opt/agency/scripts/server/provision-server.sh --studio-domain kedailab.com --email 你的电邮
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

确认第 4 步的 DNS 已经生效（`nslookup demo-rimbun.kedailab.com` 看到 IP），然后：
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

后台网址：`https://kedailab.com/wp-admin`、`https://master.kedailab.com/wp-admin` …

## 第 9 步：上线前要补的资料（跟 Claude Code 一起做）

1. **工作室资料**：WhatsApp 号码、电邮、SSM 名称和号码 → 改 `sites/studio/brand-config.json` → commit → 服务器 `cd /opt/agency && sudo git pull && sudo scripts/server/setup-studio.sh kedailab.com`
2. **寄信**：注册 Brevo（免费）→ 后台 FluentSMTP 选 Brevo、贴 API Key → 按 FluentSMTP 显示的记录在 DNS 加 SPF / DKIM → 发测试邮件到 Gmail，确认在收件箱
3. **监控**：注册 UptimeRobot（免费）→ 为 `https://kedailab.com` 和三个样板站各加一个 HTTP 监控
4. **Google**：Search Console 用 DNS TXT 验证 `kedailab.com`，提交 `https://kedailab.com/sitemap_index.xml`
5. **备份到 Google Drive**（可选）：后台 UpdraftPlus → Settings → Google Drive → 授权
6. **（可选）销售 AI 助理 / 网站 AI 客服**：照 `sales/agent/README.md` 的「安装」三步（要一个 Anthropic API Key，先设每月花费上限）
7. **测速**：用 PageSpeed Insights 测 `https://kedailab.com` 和一个样板站的手机版分数，记在 `sites/<代号>/README.md`

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
