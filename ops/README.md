# ops/ — 给服务器「自动更新小帮手」的维护脚本（2026-11-13）

服务器上的 `scripts/server/ops-runner.sh` 每 5 分钟（cron）做两件事：

1. GitHub 这个分支有新 commit → `git pull` → 所有站点更新 agency-core 插件和子主题。
2. 执行 `ops/jobs/` 里**还没跑过**的脚本，按名字顺序，每个只跑一次（以 root 执行）。
   - `exit 0` 完成；`exit 75` 现在还不能做（下次再试，后面的脚本先不跑）；其他数字 = 失败，不会重跑。
   - 要重做一件事：放一个**新名字**的脚本（例如 `014-rebuild-demo.sh`），不要改旧的。

结果在 `http://<服务器IP>/agency-ops-<代号>/status.txt` 和 `jobs/<名字>.log`（代号只存在服务器的 `/var/lib/agency-ops/token`
和建立服务器的那个 Claude Code 工作阶段里，不进 git）。输出里像密码的值会被遮掉，但脚本本来就不要印出密码。

规则（跟 CLAUDE.md 一样）：删除站点、还原、清资料库这类破坏性的事，先问俊宇，同意了才放脚本。
关掉小帮手：在服务器执行 `sudo rm /etc/cron.d/agency-ops`。

命名：三位数字 + 做什么，例如 `001-build-sites.sh`。
