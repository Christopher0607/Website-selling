# 从这里开始

这是你的「一人建站工作室」执行包。把整个文件夹交给 Claude Code，它会按顺序带你完成：

1. 搭好服务器
2. 做一个可以重复使用的「母版网店」
3. 做 3 个样板站当作品集
4. 做你自己的工作室网站
5. 准备销售材料、话术和视频内容
6. 找客户、成交、交付、收月费

---

## 包里有什么

| 文件 | 主要给谁看 | 用途 |
|---|---|---|
| `START-HERE.md` | 你 | 使用说明（就是这份） |
| `CLAUDE.md` | Claude Code | 工作规则：怎么跟你沟通、安全守则、诚信守则、做事流程 |
| `PROGRESS.md` | 你 + Claude Code | 进度表，每完成一个任务就打勾 |
| `docs/00-decisions.md` | 你 | 开工前的 12 个决定（每一项都有默认建议） |
| `docs/01-business-plan.md` | 你 | 定位、目标客户、套餐、价格、收入目标、风险 |
| `docs/02-tech-spec.md` | Claude Code | 技术规格：服务器、母版站、插件、脚本、合规清单 |
| `docs/03-build-phases.md` | Claude Code | 分阶段任务清单 + 每个任务的验收标准 |
| `docs/04-sales-kit.md` | 你 | 找客户的方法、私信话术（中/英/马来文）、通话流程、异议处理 |
| `docs/05-content-video.md` | 你 + Claude Code | 30 个视频选题、脚本模板、不露脸的 AI 视频流程、广告 |
| `docs/06-delivery-sop.md` | 你 + Claude Code | 签约 → 上线 → 月费维护的完整流程和检查清单 |
| `docs/07-30-day-plan.md` | 你 | 30 天每天做什么、要看哪些数字 |
| `templates/` | 两边 | 客户需求表、报价单、客户追踪表、品牌参数、内容日历、月报 |

---

## 怎么用（5 步）

**第 1 步：解压。** 在电脑上建一个文件夹（例如 `D:\website-studio`），把压缩包解压进去。解压后要能直接看到 `CLAUDE.md` 和 `docs` 文件夹，不要多套一层文件夹。

**第 2 步：打开终端。** 在这个文件夹里打开 PowerShell 或 Windows Terminal。

**第 3 步：启动。** 输入 `claude`。

**第 4 步：贴上第一句话**（直接复制）：

```
请先读 CLAUDE.md、PROGRESS.md 和 docs/00-decisions.md。用简体中文跟我沟通。
先把 00-decisions 里还没决定的项目一次问清楚（每项给我默认建议），
然后从 Phase 0 的第一个任务开始。一次只做一个任务，做完按验收标准检查、
更新 PROGRESS.md，再问我要不要继续。
```

**第 5 步：之后每次回来**，只要说：

```
读 PROGRESS.md，继续下一个任务。
```

---

## 小技巧

- **一个 Phase 做完就输入 `/clear`**，清空对话，然后说"读 PROGRESS.md 继续"。对话太长时 Claude Code 会变慢、容易忘细节；进度都写在 PROGRESS.md，不会丢。
- **重要操作先看计划**：按 `Shift+Tab` 可以切换到 Plan mode（计划模式），让它先讲清楚要做什么，你同意了再动手。
- **看不懂就问**：Claude Code 执行命令前会问你。看不懂就回"这一步在做什么？有什么风险？"。不要开"跳过所有权限确认"的模式。
- **你要亲手做的事**（开服务器、买域名、注册账号、付钱、录屏），它会一步一步告诉你点哪里。你做完回"做好了"就行。
- **密码和 API Key 不要贴进任何文件。** 用密码管理器（例如 Bitwarden）保存，Claude Code 会教你放进 `.env`。
- **建议装 Git for Windows**：Claude Code 在 Windows 上找得到 Git Bash 会更顺，ssh 和脚本都比较好跑。

---

## 开始前要准备

- [ ] Claude Code 能正常启动和登录
- [ ] DigitalOcean 账号（已经有就直接用）
- [ ] 一个专门做生意的 WhatsApp Business 号码（跟私人号码分开）
- [ ] 服务器和域名的预算（第一个月大约 RM100–300，Claude Code 会帮你比价）
- [ ] 每周 15–20 小时

---

## 如果你拿到的是单文件版

文件名是 `website-business-kit-all-in-one.md`。把它放进一个空文件夹，启动 Claude Code 后先说：

```
把 website-business-kit-all-in-one.md 按文件开头写的拆分规则，拆成独立文件，
保持原本的文件夹结构。拆完列出所有文件给我看。
```

拆完以后，照上面第 4 步继续。
