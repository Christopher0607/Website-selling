# 成品展示页（静态预览）怎么重做

1. 测试环境建好全部站点（`build-all.sh --no-ssl`）
2. 用 `wget -m -p -k -E -nH --regex-type pcre --reject-regex '(add-to-cart|wp-json|...|\?(?!ver=))'` 把 4 个站抓成静态网页（studio / rimbun / teduh / kenanga 四个文件夹）
3. `python3 -I postmirror.py <文件夹>`：去掉 ?ver=、srcset，网址改成相对路径，加「返回成品展示」横条，删掉没用到的图片
4. `python3 playbook_html.py sales/playbook.md <文件夹>/playbook.html`（需要 `pip install markdown`）
5. 首页 index.html 用 Artifact 发布（每次最多 255 个文件，分两批）

展示页：https://claude.ai/artifact/UMUpzoNwKbN2d7uBN7aDbH（私人，只有你看得到，要给别人看从页面的 Share 分享）
