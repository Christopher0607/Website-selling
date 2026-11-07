# 销售 AI 助理（DeepSeek）

两个部分：

| | 做什么 | 在哪里 |
|---|---|---|
| **A. 网站 AI 客服** | 工作室网站右下角「Ask us anything」：24 小时回答套餐、价格、模板、流程；客人留下名字 + Instagram / 店铺链接时，自动存进 Netlify Forms 并寄电邮给你；合同、付款、特别要求转给你 | `site/netlify/functions/chat/`（Netlify 上跑，设定见 `docs/09-netlify-guide.md` 第 B 部分） |
| **B. 你的销售助理** | 为名单写个人化开场白、每天产生「今天要发的信息」清单、分析客人回复并起草回信、通话笔记变报价单、每周漏斗报告 | 这个文件夹的 `sales_agent.py`（在你的电脑跑） |

**为什么不让 AI 自动发信息给陌生人？** 自动群发会让 Instagram 封号，也违反我们的诚信守则（`CLAUDE.md`）。所以 AI 负责「想」和「写」，**你负责看一眼、按发送**——一条只要几秒钟。客人主动来问的（网站聊天），AI 才自己回。

AI 只用 `knowledge.md` 里的资料回答。改价格、改优惠时，改这个文件 + `site/studio.json`（和 `docs/01-business-plan.md`、`sales/packages.html`），然后让 Claude Code 重新 build 网站。

---

## 安装（你的 Windows 电脑，一次）

1. 装 Python：https://www.python.org/downloads/ → 安装时勾选 **Add python.exe to PATH**。（`sales_agent.py` 只用 Python 自带的功能，不用装别的套件。）
2. DeepSeek API Key：和网站 AI 客服可以用同一把（`docs/09-netlify-guide.md` 第 B 部分），或另外建一把方便分开看用量。
3. 每次开 PowerShell 要用之前，先设定 Key（只在这个视窗有效，不会存进档案）：
   ```
   cd 你的项目文件夹\Website-selling
   $env:DEEPSEEK_API_KEY = "sk-..."      # 从 Bitwarden 复制；不要存进 git
   ```

**API Key 不要贴到聊天、Instagram、git。**

---

## 每天用（B 部分）

```
python sales/agent/sales_agent.py draft-openers            # 新名单 → 打分 + 个人化开场白（写回 sales/prospects.csv）
python sales/agent/sales_agent.py today                    # 今天的清单 → sales/today/<日期>.md
python sales/agent/sales_agent.py mark p012 sent           # 发出后记录（3 天后自动提醒跟进）
python sales/agent/sales_agent.py reply p012 "Berapa harga?"   # 对方回复 → 意图 + 建议回信
python sales/agent/sales_agent.py mark p012 preview_sent --url https://p012-xxxx.netlify.app
python sales/agent/sales_agent.py proposal p012 --notes notes.txt   # 通话笔记 → clients/proposals/p012-<日期>.md
python sales/agent/sales_agent.py mark p012 won
python sales/agent/sales_agent.py report --days 7          # 每周漏斗数字（不用 AI，不花钱）
python sales/agent/sales_agent.py chat                     # 在终端试网站客服的回答
```

`mark` 可以用的事件：sent、replied、preview_sent、call_booked、proposal_sent、won、lost、no_response、dnc（对方说不要 → 永远不再联系）。

**Instagram 小提醒：** `ig.me` 链接会直接打开对话，但 Instagram 不能预先填好文字——先复制 `today` 清单里的信息，再点链接贴上。新账号前两周每天新联系 10 个以内，之后最多 20 个。

名单 `sales/prospects.csv` 是普通的 CSV，可以用 Excel / Google Sheets 打开编辑（存回 CSV）。改完记得 commit。

---

## 费用（大约）

模型：`deepseek-flash`（可用环境变量 `DEEPSEEK_MODEL` 改）。DeepSeek 是预付制，余额用完就停，不会超支。最新价格看 https://api-docs.deepseek.com/quick_start/pricing 。

- 开场白、跟进、回信、网站聊天：不开「思考模式」，快、便宜
- 报价单：开「思考模式」，比较仔细，花费多一点

先充小额，用一个月后看 DeepSeek 后台的 Usage 再决定。

---

## 安全

- 网站聊天：每个访客每 10 分钟最多约 20 条、每小时 40 条；只接受来自自己网站的请求；Key 只在 Netlify 后台
- 客人的话被当成「不可信的输入」：AI 不会因为客人要求就给折扣、改规则或透露设定
- 聊天内容只存在客人浏览器的这个分页；客人留下资料时，对话才存进 Netlify Forms
- 隐私通知（`site/pages/privacy.html`）已写明 AI 由 DeepSeek 提供——正式接案前请律师确认

## （可选）给 WordPress 网店用的 AI 客服服务

以后客户的 WooCommerce 网店想加 AI 客服，可以在服务器跑 `sales_agent.py serve`（只听 127.0.0.1:8787），由 agency-core 插件的聊天视窗呼叫：
`sudo scripts/server/setup-sales-agent.sh --site <站点代号>`（会建立 `/etc/agency/sales-agent.env`，DeepSeek Key 填在那里）。
注意：现在的 `knowledge.md` 是 Cartsmith 自己的资料；给客户用要另外准备客户的知识库。

## 测试记录（2026-11-07）

- ✅ 用模拟的 DeepSeek API 测了全部指令：draft-openers（打分、写回名单）、today（Instagram 链接）、mark（自动排跟进）、reply、proposal（思考模式）、report、chat
- ✅ 送出的请求：`deepseek-flash`、`response_format: json_object`、提示里有 "json" 和格式例子、草稿关掉思考模式、报价单开启；空白回答自动重试
- ✅ 网站聊天函数：没设 Key → 显示「请 DM Instagram」；别的网站来源 → 拒绝；太长的信息会截短；客人留资料 → 存进 Netlify 表单（含对话）
- ⚠ 还没用真的 DeepSeek Key 测回答品质——装好后先用 `chat` 试 10 个常见问题，不满意就改 `knowledge.md`
