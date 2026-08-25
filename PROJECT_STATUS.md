# 项目状态与进度

最后同步：2026-08-25

当前阶段：双渲染论文 PPT MVP v0.4 已完成并通过真实论文验收

GitHub：`https://github.com/Iron-Wph/codex-ppt-dual-render`

远端基线分支：`main`；后续开发继续使用 `codex/*` 功能分支。

## 已完成

- 建立统一 `deck.spec.json`，同时驱动 React HTML 和可编辑 PPTX。
- 本地 Codex 接入：两轮故事板、逐页内容生成、逐页演讲稿、独立终审、一次自动修订。
- 工作区 `SKILL.md` 与 Presentation Skill 参与受众、大纲、主张、证据、阅读顺序和构图决策。
- PDF 全文解析，支持 MinerU 探测与 PyMuPDF 回退。
- 建立 evidence index，提取页、表格、裁剪图、来源页和公式信息。
- 建立 10 套主题、主题参考图和可组合页面 recipe。
- React 19 SSR 单文件演示，支持键盘、触控、URL hash 和逐页演讲稿开关。
- PPTX 使用原生文本、形状、连接线、表格和图表，保留可编辑性。
- 建立 visual plan、图片预算、来源核验层级、阅读分组、流程拓扑和指标口径 QA。
- 用 RLinf/RoboTwin 真实论文完成 9 页基准案例，并多轮修正 train SSR 与 OOD 评估协议混淆。
- 机器 QA、人工截图复核与本地 Codex review 全部通过。

## 当前基准结果

| 项目 | 结果 |
| --- | --- |
| 基准目录 | `dist/real-paper-v2/` |
| 页数 | 9 |
| HTML 引擎 | React 19 SSR |
| 图片证据页 | 4 |
| 原生表格 | 3 |
| 原生图表 | 1 |
| 演讲稿 | 每页 143–239 字 |
| Schema | pass，0 error / 0 warning |
| QA | pass，0 error / 0 warning |
| Codex review | pass |

## 当前已知限制

- 当前机器没有安装可调用的 MinerU CLI，论文基准实际使用 PyMuPDF 回退；接口与探测逻辑已实现。
- HTML 是演示播放器，不是 WYSIWYG 编辑器。
- PPTX 中来源截图不可编辑，但其旁边的文本、表格、图表和结构元素可编辑。
- 自动风格选择来自主题目录与参考图，尚未形成可持续学习的用户偏好模型。
- 图片策略目前以论文来源图和表格裁剪为主，尚未接入稳定的图片检索、授权判断和生成式插图闭环。
- 本机未安装 GitHub CLI；当前通过 Git Credential Manager 和标准 `git` 命令同步。
- 当前 GitHub 仓库可被未登录访问，处于公开状态；基准产物包含论文摘录和来源图，需立即确认是否改为私有，并持续检查再分发版权。

## 下一步优先级

### P0：版本化与迁移（已完成）

- 已配置 `origin` 并将迁移 checkpoint 推送至远端 `main`。
- 已提交 GitHub Actions；首次工作流结果需在仓库 Actions 页面确认。
- 确认仓库可见性；如不计划公开基准论文摘录与来源图，应在 GitHub Settings 中改为 Private。
- 根据仓库策略决定是否把完整历史 `dist` ZIP 作为 GitHub Release 附件，而不是塞入 Git 历史。

### P1：文档识别与证据可靠性

- 在目标机器安装并验证 MinerU，增加一组 MinerU 与 PyMuPDF 的对照基准。
- 增加表格语义清洗、公式引用和图注绑定测试。
- 对证据范围、实验 split 和数值引用增加更系统的事实一致性检查。

### P1：模板与视觉质量

- 把主题参考图扩展为可检索的 style fingerprint。
- 增加同主题下的多种构图变体，降低跨项目视觉重复。
- 增加图片检索/生成接口及版权、来源、图片预算 QA。

### P2：编辑与产品化

- 增加网页端轻量编辑器，允许调整逐页内容、图片和主题后重新双渲染。
- 增加生成任务历史、差异比较、人工批注和回滚。
- 增加用户偏好和组织品牌资产层。

## 近期关键决策

| 日期 | 决策 | 原因 |
| --- | --- | --- |
| 2026-07-30 | 使用统一语义规格驱动 React HTML 与 PPTX | 避免双端内容漂移 |
| 2026-07-30 | 故事板与逐页写作分为两个阶段 | 提高大纲逻辑和单页完整度 |
| 2026-07-30 | 原文截图定义为 `source-provenance` | 避免来源图抢占主视觉和阅读路径 |
| 2026-07-30 | QA 区分实验协议与结果口径 | 防止 OOD 协议被误写成 OOD 结果 |
| 2026-08-25 | GitHub 仅版本化源码、文档与基准产物 | 保留可复现性，同时避免历史构建缓存膨胀仓库 |
| 2026-08-25 | 远端以 `main` 保存稳定基线，开发使用 `codex/*` 分支 | 兼顾标准仓库入口与 Agent 分支隔离 |

## Agent 更新区

后续每轮开发必须在这里追加一条记录。

### 2026-08-25：迁移 checkpoint

- 目标：让项目可被 GitHub 保存、在新机器恢复，并让后续 Agent 无上下文接手。
- 变更：增加 `AGENTS.md`、`MIGRATION.md`、CI、归档脚本、基准产物版本化规则。
- 验证：`npm run verify` 通过；4 组测试通过；基准 Schema 通过；基准 QA 为 0 error / 0 warning。
- 遗留：已完成远端配置和首次推送；后续确认首次 GitHub Actions 结果。

### 2026-08-25：GitHub 首次推送

- 目标：把完整可复现项目、Git 历史、Agent 交接说明和版本化基准保存到 GitHub。
- 变更：配置 `origin` 为 `Iron-Wph/codex-ppt-dual-render`，将本地 `codex/migration-checkpoint` 发布为远端 `main`，同步迁移文档。
- 验证：远端 `main` 已创建；推送成功；本地分支跟踪 `origin/main`；GitHub 页面当前可被未登录访问。
- 决策：远端稳定入口使用 `main`，后续实现继续在 `codex/*` 分支完成后合入。
- 遗留：确认是否将当前公开仓库改为私有，并检查首次 Actions 运行结果。
