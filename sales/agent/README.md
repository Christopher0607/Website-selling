# 销售 AI 助理（Claude）

两个部分：

| | 做什么 | 谁先开始 |
|---|---|---|
| **A. 网站 AI 客服** | 工作室网站左下角的聊天视窗：24 小时回答套餐、价格、流程、FAQ；客人留下名字 + WhatsApp 时，自动存进后台「Leads」并寄电邮给你；合同、付款、特别要求转给你 | 客人 |
| **B. 你的销售助理** | 为名单写个人化开场白、每天产生「今天要发的信息」清单（附一键打开对话的链接）、分析客人回复并起草回信、通话笔记变报价单、每周漏斗报告 | 你 |

**为什么不让 AI 自动发信息给陌生人？** 自动群发会让 WhatsApp / Instagram 封号，也违反我们的诚信守则（`CLAUDE.md`）。所以 AI 负责「想」和「写」，**你负责看一眼、按发送**——一条只要几秒钟。客人主动来问的（网站聊天），AI 才自己回。

AI 只用 `knowledge.md` 里的资料回答。改价格、改优惠时，改这个文件（和 `docs/01-business-plan.md`、`sales/packages.html`）。

---

## 安装（服务器，一次）

1. 到 https://console.anthropic.com → API Keys → Create Key（先设每月花费上限，例如 USD 20）
2. 服务器：
   ```
   cd /opt/agency && sudo git pull
   sudo scripts/server/setup-sales-agent.sh          # 第一次：建立设定文件
   sudo nano /etc/agency/sales-agent.env             # 把 API Key 贴在 ANTHROPIC_API_KEY= 后面，存档
   sudo scripts/server/setup-sales-agent.sh          # 第二次：启动服务、开启网站聊天视窗
   ```
3. 打开 https://kedailab.com ，左下角有「Ask us anything」→ 试问几个问题
4. 关闭聊天视窗：后台 Settings → Agency → AI chat assistant → 取消勾选

**API Key 只放在 `/etc/agency/sales-agent.env`（只有 root 能读）。不要贴到聊天、WhatsApp、git。**

---

## 每天用（B 部分）

在服务器（或任何装了 Python 的电脑）上，repo 根目录：

```
# 让指令读到 API Key（服务器上）
sudo -s
set -a; source /etc/agency/sales-agent.env; set +a
A="/opt/agency-venv/bin/python /opt/agency/sales/agent/kedailab_sales.py"

$A draft-openers                 # 新名单 → 打分 + 个人化开场白（写回 sales/prospects.csv）
$A today                         # 今天的清单 → sales/today/<日期>.md
$A mark p012 sent                # 发出后记录（3 天后自动提醒跟进）
$A reply p012 "Berapa harga?"    # 对方回复 → 意图 + 建议回信
$A mark p012 preview_sent --url https://preview-p012.kedailab.com
$A proposal p012 --notes notes.txt   # 通话笔记 → clients/proposals/p012-<日期>.md
$A mark p012 won
$A report --days 7               # 每周漏斗数字（不用 AI，不花钱）
$A chat                          # 在终端试网站客服
```

`mark` 可以用的事件：sent、replied、preview_sent、call_booked、proposal_sent、won、lost、no_response、dnc（对方说不要 → 永远不再联系）。

名单 `sales/prospects.csv` 是普通的 CSV，可以用 Excel / Google Sheets 打开编辑（存回 CSV）。改完记得 commit。

---

## 费用（大约）

模型：Claude Opus 5.5（USD 4 / 百万输入 token、USD 20 / 百万输出 token），知识库会被缓存。

| 用途 | 每次大约 |
|---|---|
| 网站聊天一条回复 | USD 0.01–0.03 |
| 写一条开场白 / 跟进 | USD 0.02–0.05 |
| 一份报价单 | USD 0.10–0.30 |

每天 20 条开场白 + 10 段聊天 ≈ 每月 USD 15–40。在 Anthropic Console 设好每月上限，就不会超支。

---

## 安全

- 服务只听 `127.0.0.1:8787`，外面连不到；WordPress 用共用密码（`KEDAILAB_CHAT_TOKEN`）呼叫它
- 每个访客 10 分钟最多 20 条、每小时最多 30 条（WordPress 和服务两层限制）
- 客人的话被当成「不可信的输入」：AI 不会因为客人要求就给折扣、改规则或透露设定
- 聊天内容只存在客人浏览器的这个分页；只有客人留下资料时，对话才存进后台 Leads
- 隐私通知（`wp/content/studio/privacy.html`）要加一句：网站聊天由 AI（Anthropic Claude）回答——上线前请律师确认

## 测试记录（2026-11-07）

- ✅ 用模拟的 Claude API 测试：开场白写回名单、分数低的跳过、`today` 清单与 wa.me / ig.me 链接、`mark` 自动排跟进日期、`reply`、`report`
- ✅ `serve`：没有密码 → 403；超过次数 → 429；回传格式正确
- ✅ 网站聊天视窗：发问 → 收到回复 → 留资料时自动存进 Leads（含对话）→ 出现「Continue on WhatsApp」
- ✅ 送出的请求：`claude-opus-5-5`、adaptive thinking、结构化 JSON 输出、知识库缓存、`fallbacks: "default"`（被拒时自动换模型重试）
- ⚠ 还没用真的 API Key 测试回答品质——装好后先用 `chat` 试 10 个常见问题，不满意就改 `knowledge.md`
