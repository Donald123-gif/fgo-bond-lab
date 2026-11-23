# 发布流程

每次完成项目改动后，运行 `node test.cjs`，将改动推送到 `Donald123-gif/fgo-bond-lab` 的 `main` 分支，并确认对应提交的 GitHub Pages 部署成功。

同时将同一份 `dist/` 发布到 `.openai/hosting.json` 指定的现有 ChatGPT Sites 站点，检查发布状态。两个网址分别部署，交付前确认两处都已更新。
