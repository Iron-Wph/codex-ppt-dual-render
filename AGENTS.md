# Codex PPT 项目 Agent 交接说明

本文件是后续 Agent 接手项目时的首要入口。它描述当前产品契约、架构、完成进度、验证方式和协作规则。修改核心流程、Schema、模板系统或交付状态后，必须同步更新本文件与 `PROJECT_STATUS.md`。

## 1. 接手后的阅读顺序

1. `AGENTS.md`：不可破坏的产品契约和开发规则。
2. `PROJECT_STATUS.md`：当前进度、已验证基线、限制和下一步。
3. `README.md`：功能、命令与目录说明。
4. `PPT双渲染MVP运行指南.md`：从安装到论文生成的完整操作。
5. `SKILL.md`：内容压缩、叙事、阅读顺序、证据和视觉结构规则。
6. `schemas/`：所有规划与渲染数据的严格接口。

不要直接从渲染器开始改。先确认内容规划、Schema 和 QA 契约是否需要同步变化。

## 2. 产品目标

项目是一个本地优先的 Codex PPT 自动生成 MVP。它将 Markdown 或 PDF 全文转换为一份统一语义规格，然后同时生成：

- React 19 SSR 单文件 HTML 演示；
- 原生可编辑 PPTX；
- 逐页演讲稿；
- 论文证据索引、来源核验图、表格和图表；
- PPTX 截图、布局检查、确定性 QA 与本地 Codex 终审。

核心原则是“一份语义规格，两个渲染出口”，而不是分别维护网页和 PowerPoint 内容。

## 3. 不可破坏的产品契约

- 大纲必须先明确 audience、communication job、opening question、closing answer 和 core/support/context 主次。
- 每页只有一个 `primary_claim`，并包含 `audience_question`、`narrative_job`、证据、意义、转场和演讲稿。
- 论文模式使用全文与证据索引，不允许退化为固定示例或短摘要模板。
- `train / validation / test / OOD` 指标不得互换；评估协议不能被写成性能结果。
- `deck.spec.json` 是 HTML 与 PPTX 的共同事实来源。
- HTML 与 PPTX 必须共享 `composition_id`、内容语义和阅读顺序，但可以使用不同媒介实现。
- 原生表格、图表、文本和形状应保持可编辑；来源截图可作为不可编辑的 `source-provenance`。
- `source-provenance` 只能作为末级来源核验，不得抢占主图表或打断核心阅读路径。
- 单页图片最多 3 张；图片必须有 hero/evidence/comparison/context 语义，来源核验图单独使用 `source-provenance`。
- 论文成品应为 8–10 页，核心页占多数，每页演讲稿建议 120–260 个中文字。
- 合并前必须通过 Schema、测试、QA、截图复核；涉及内容逻辑的改动还需本地 Codex review 为 `pass`。

## 4. 当前架构

```text
Markdown / PDF
  -> document-parser.mjs
       -> MinerU（可用时）
       -> PyMuPDF fallback
  -> evidence-index.mjs
  -> codex-bridge.mjs
       -> 第一轮 storyboard
       -> 第二轮 editorial audit
       -> 逐页内容与演讲稿
       -> 必要时自动修订
  -> content-planner.mjs / schema-writer.mjs
  -> deck.spec.json
       -> react-html.mjs -> presentation.html
       -> render-pptx.mjs -> presentation.pptx
  -> qa.mjs
  -> Codex independent review
```

模板不是固定母版。`skill-references/presentation-layout-catalog.json` 定义可组合的页面轮廓，`themes/catalog/` 定义主题 token，Codex 根据受众、主题、场景和证据形态选择风格与构图。

## 5. 核心文件地图

- `src/cli.mjs`：CLI 与完整生成闭环。
- `src/codex-bridge.mjs`：本地 Codex、Presentation Skill、故事板、逐页生成、终审和自动修订。
- `src/document-parser.mjs`、`src/mineru-parser.mjs`、`src/pdf-text.mjs`：文档解析和降级策略。
- `src/evidence-index.mjs`：页、表格、图片、公式和来源证据索引。
- `src/content-planner.mjs`：计划规范化和论文内容约束。
- `src/schema-writer.mjs`：计划到 `deck.spec.json` 的语义编译。
- `src/react-html.mjs`：React SSR 演示组件和浏览器交互。
- `src/render-pptx.mjs`：可编辑 PowerPoint 对象与逐页截图。
- `src/qa.mjs`：结构、叙事、图片预算、表格、图表、指标口径和双输出 QA。
- `schemas/`：严格 JSON Schema，使用 Codex structured output 时必须保持 `additionalProperties: false` 等兼容约束。
- `SKILL.md`：项目级 Presentation 结构知识。
- `themes/catalog/`：10 套主题定义。
- `test/`：解析、主题、叙事、流程节点和 React 渲染回归测试。

## 6. 当前已验证基线

GitHub 稳定基线：`https://github.com/Iron-Wph/codex-ppt-dual-render` 的 `main` 分支。后续开发从 `main` 创建 `codex/*` 功能分支。仓库截至 2026-08-25 处于公开状态，新增私人论文、客户材料或敏感基准前必须先确认可见性与授权。

基准目录：`dist/real-paper-v2/`

- 9 页真实论文汇报；
- 4 页包含论文来源图片；
- 3 张原生可编辑表格；
- 1 张原生可编辑图表；
- 演讲稿长度 143–239 字；
- Schema：0 error / 0 warning；
- QA：0 error / 0 warning；
- 本地 Codex 独立终审：`pass`；
- HTML 9 页无滚动溢出、无损坏图片；
- PPTX 逐页 PNG 已人工复核。

风格总览保存在 `dist/theme-gallery/`。这两个 `dist` 子目录是版本化基准产物，其余 `dist` 目录视为可再生成的本地运行历史。

## 7. 标准验证命令

```powershell
npm ci
npm run verify
node src/cli.mjs qa --input dist/real-paper-v2 --format both
node src/cli.mjs review --input dist/real-paper-v2
```

只改文档时至少检查链接和命令；改 Schema、planner 或 renderer 时必须运行 `npm run verify`。改渲染布局后必须重新打开 HTML，并检查 `preview/pptx-*.png`，不能只依赖自动 QA。

## 8. Agent 开发规则

- 保留用户已有改动，不使用 `git reset --hard` 或破坏性回滚。
- 手工修改源文件，不直接手工修补生成后的 HTML/PPTX。
- Schema 字段变化必须同步 planner、writer、renderer、QA、测试和文档。
- 新布局应首先定义语义与阅读顺序，再实现 React 和 PPTX 两端。
- 不提交账号凭据、Codex 登录状态、`.env`、`config/local.json` 或私人论文原件。
- 真实论文输出中可能包含全文摘录；推送公开仓库前必须重新确认版权与隐私。默认使用私有 GitHub 仓库。
- `node_modules` 不入库；依赖由 `package-lock.json` 重建。
- 每次完成一个里程碑，在 `PROJECT_STATUS.md` 更新日期、完成项、测试结果、决策和下一步。

## 9. 交接更新模板

后续 Agent 完成工作后，在 `PROJECT_STATUS.md` 追加：

```text
日期：YYYY-MM-DD
目标：本轮解决什么问题
变更：核心文件与产品行为
验证：执行的命令和结果
决策：新增或改变的架构约束
遗留：下一位 Agent 应优先处理什么
```

迁移、备份和 GitHub 推送步骤见 `MIGRATION.md`。
