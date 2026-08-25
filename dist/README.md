# Versioned reference artifacts

本目录默认保存本地生成结果，不全部纳入 Git。

版本化的两个基准目录：

- `real-paper-v2/`：真实论文双渲染验收案例，包含 HTML、PPTX、Schema、逐页演讲稿、QA、Codex review、证据资产和 PPTX 预览。
- `theme-gallery/`：主题目录与风格效果总览。

其他子目录是开发过程中的重复 smoke test 或历史生成缓存。它们会进入完整本地迁移 ZIP，但不进入 GitHub 主仓库。需要更新基准时，必须先运行测试、QA、截图复核和 Codex review。
