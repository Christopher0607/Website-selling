# preview-tbt 照片来源

- **来源：** Eat Drink KL，2023-05-31 的 The Baking Trip 介绍文章（https://eatdrinkkl.blogspot.com/2023/05/ ），照片网址在 `images-src.json`（20 张：门口、店里、店主、面包、蛋糕、咖啡、花园座位）。
- **怎么用（决定 37）：** 真实店家的照片只放在**有密码 + noindex 的私人预览**里，给这家店本人看；网站上写明来源（关于我们页、产品区下面的小字）。
- **不进 git：** repo 是公开的，所以照片不 commit。建站时 `build-demo.sh` 照 `images-src.json` 在服务器下载到 `images/` 和 `content/images/`（两个都在 `.gitignore`）。
- **交付时：** 换成店家自己拍的照片（或店家给的照片），删掉 `images-src.json`，这份文件改成写店家的照片。
- **没成交：** 14 天内删除预览站（`sudo /opt/agency/scripts/server/delete-site.sh preview-tbt`，先跟俊宇确认）。
