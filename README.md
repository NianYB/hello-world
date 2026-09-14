# Hello World

這是 GitHub 官方教學 [Hello World](https://docs.github.com/en/get-started/quickstart/hello-world) 的練習 repo，
從 [octocat/Hello-World](https://github.com/octocat/Hello-World) fork 而來。

## 內容

| 檔案 | 說明 |
| --- | --- |
| `README.md` | 專案說明（本檔案） |
| `.gitignore` | 不納入版控的檔案規則 |
| `.gitattributes` | 換行符與文字檔屬性設定 |

## 開始使用

```bash
git clone https://github.com/NianYB/hello-world.git
cd hello-world
```

## 工作流程

1. 從 `master` 開一個功能分支：`git checkout -b feature/你的主題`
2. 修改後提交：`git commit -m "說明這次改了什麼"`
3. 推上遠端：`git push -u origin feature/你的主題`
4. 在 GitHub 開 Pull Request，合併回 `master`
