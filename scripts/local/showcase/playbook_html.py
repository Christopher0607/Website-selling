import sys, markdown, re
src, out = sys.argv[1], sys.argv[2]
md = open(src, encoding="utf-8").read()
md = re.sub(r"`(sales/scripts\.md|sales/packages\.html|sales/agent/README\.md|docs/[^`]+|templates/[^`]+|sales/contract-checklist\.md)`", r"`\1`（在 GitHub repo 里）", md)
body = markdown.markdown(md, extensions=["tables", "fenced_code", "toc"])
body = body.replace("<table>", '<div class="tw"><table>').replace("</table>", "</table></div>")
html = """<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cartsmith 销售手册</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Plus+Jakarta+Sans:wght@600;800&display=swap">
<style>
:root{--bg:#f5f3ee;--paper:#fffdf9;--ink:#1b2430;--muted:#5f6b78;--line:#e3ddd2;--accent:#1f3a5f;--gold:#b7791f;--code:#efe9de;
--sans:"Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif;--disp:"Plus Jakarta Sans","Noto Sans SC",system-ui,sans-serif}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#12161c;--paper:#181e26;--ink:#e7ebf0;--muted:#a1acb8;--line:#2a333f;--accent:#9dbbe2;--gold:#e0aa52;--code:#232b36;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#12161c;--paper:#181e26;--ink:#e7ebf0;--muted:#a1acb8;--line:#2a333f;--accent:#9dbbe2;--gold:#e0aa52;--code:#232b36;color-scheme:dark}
html,body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 var(--sans)}
.wrap{max-width:860px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
nav.top{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:14px;margin-bottom:18px}
a{color:var(--accent)}
h1{font:800 clamp(28px,5vw,40px)/1.15 var(--disp);letter-spacing:-.01em;margin:.2em 0 .4em;text-wrap:balance}
h2{font:800 22px/1.3 var(--disp);margin:2.2em 0 .6em;padding-top:1em;border-top:1px solid var(--line);text-wrap:balance}
h3{font-weight:700;font-size:17px;margin:1.6em 0 .4em}
blockquote{margin:1em 0;padding:12px 16px;background:var(--paper);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;color:var(--ink)}
blockquote p{margin:.3em 0}
code{background:var(--code);padding:1px 6px;border-radius:5px;font-size:.88em;word-break:break-word}
pre{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px;overflow-x:auto;font-size:13px;line-height:1.6}
pre code{background:none;padding:0}
.tw{overflow-x:auto;margin:1em 0;border:1px solid var(--line);border-radius:10px;background:var(--paper)}
table{border-collapse:collapse;width:100%;font-size:14.5px;min-width:520px}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{font-weight:700;background:var(--code)}
tr:last-child td{border-bottom:0}
ul,ol{padding-left:1.3em}li{margin:.25em 0}
</style></head><body><div class="wrap"><nav class="top"><a href="index.html">← 返回成品展示</a><span style="color:var(--muted)">原文：sales/playbook.md</span></nav>
""" + body + "\n</div></body></html>\n"
open(out, "w", encoding="utf-8").write(html)
