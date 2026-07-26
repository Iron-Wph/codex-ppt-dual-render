# PPT AI 内容编排与双渲染实现流线

> 版本：v0.2 MVP 实施报告  
> 日期：2026-07-15  
> 适用项目：本地 Codex 驱动的“论文/文档 → HTML 演示 + 原生可编辑 PPTX”工程

## 1. 实施目标

本轮不追求一次性做成完整的在线 PPT 编辑器，而是把现有 MVP 从“固定 4 页 + 固定主题 + 纯文本规划”升级为一条可验证的内容生产线：

```text
PDF / Markdown
  → 全文解析
  → 证据索引（页码、段落、图、表）
  → Presentation 内容编排
  → 科研图结构规划
  → deck.spec.json
  → HTML / 原生 PPTX 双渲染
  → 结构与视觉 QA
  → 局部修订
```

### 本轮必须解决的问题

1. 论文不再只依赖短摘要，而是保留页级全文和资产信息。
2. 内容规划从“章节列表”升级为“页级结论 + 证据 + 视觉意图”。
3. 论文模式默认 8–10 页，覆盖问题、缺口、贡献、方法、实验、结果、分析、限制和结论。
4. HTML 与 PPTX 共享同一份中间规格，但 renderer 不再使用单一固定主题。
5. 论文图/图片进入资产 manifest，并至少在 HTML 中可视化；PPTX 以图片对象或原生对象输出并标记编辑级别。
6. QA 能识别空页面、标题/正文过密、布局重复、图片覆盖不足和来源引用缺失。

## 2. 采用的架构边界

### 2.1 Presentation 内容编排层

负责：

- 受众、目标和讲述场景。
- 8–10 页页面角色。
- 每页一个 `action_title` 和 `primary_claim`。
- 页面之间的叙事弧：问题 → 缺口 → 方法 → 证据 → 分析 → 边界。
- 每页的 `evidence_refs`、`speaker_note` 和内容密度。

### 2.2 Scientific Figure Structure 层

由项目根目录的 `SKILL.md` 提供结构约束，负责：

- 判断流程、机制、对比、反馈、概览和矩阵关系。
- 规定阅读顺序、信息分组、层级和箭头语义。
- 对图表、图标和文字角色做结构审查。

它不负责最终主题和像素级美术风格。

### 2.3 Visual Planner 层

把内容意图转换为：

- `style_family`
- `layout_family`
- `visual_intent`
- `image_policy`
- `density_profile`

它决定一页使用原论文图、数据图、流程图、概念插画还是纯文本，不直接输出 HTML 或 PPTX。

### 2.4 Renderer 层

- HTML：CSS Grid/Flex + SVG/图片，支持浏览器演示和页面截图。
- PPTX：继续使用当前 artifact-tool；必要时再切换到 PptxGenJS。
- 两种 renderer 只消费 `deck.spec.json`，不重新理解论文。

### 2.5 QA / Revision 层

```text
render
  → screenshot / inspect
  → review_flags
  → Codex revision_actions
  → 只修复失败页
```

## 3. 数据流与文件流

### 3.1 输入阶段

```text
input.pdf / input.md
  ↓
codex/source-extracted.txt
codex/source-manifest.json
codex/evidence-index.json
assets/page-001-image-001.png
assets/page-004-image-001.jpg
```

### 3.2 规划阶段

```text
codex-plan.json
  ↓
content-planner.mjs
  ↓
标准化 slide role / action title / evidence refs / visual intent
```

### 3.3 规格阶段

```text
deck.spec.json
├── deck
├── narrative
├── theme
├── evidence
├── assets
└── slides
    ├── role
    ├── action_title
    ├── evidence_refs
    ├── visual_intent
    └── elements
```

### 3.4 输出阶段

```text
presentation.html
presentation.pptx
preview/pptx-*.png
preview/pptx-montage.webp
preview/pptx-inspect.ndjson
qa/report.json
qa/report.md
```

## 4. 页面内容编排协议

### 4.1 论文模式默认页面角色

```text
title
problem
gap
contribution
method_overview
method_detail
experiment_setup
main_results
analysis
limitations
```

默认推荐 9 页；如果论文结果复杂可扩展到 10 页。如果输入是普通产品/技术说明，则继续使用 3–5 页。

### 4.2 每页必备字段

```json
{
  "id": "slide-008",
  "role": "main_results",
  "action_title": "强化学习同时改善了数据效率与真实世界成功率",
  "slide_goal": "展示主结果并连接到论文结论",
  "primary_claim": "...",
  "evidence_refs": ["p07-figure-02", "p08-table-01"],
  "visual_intent": "data_chart",
  "speaker_note": "先说明主趋势，再解释数据来源和边界。",
  "layout": "comparison",
  "content": {}
}
```

### 4.3 视觉意图枚举

```text
source_figure
source_table
data_chart
method_diagram
concept_illustration
comparison_matrix
text_led
decorative_none
```

事实型页面优先使用 `source_figure`、`source_table`、`data_chart` 或 `method_diagram`；生成式插画只能用于封面、转场或解释性背景。

## 5. 分阶段实现计划

### P1：证据驱动的内容编排

实施内容：

1. PDF 解析返回页级文本和嵌入图片。
2. 输出 `evidence-index.json`。
3. Codex Prompt 要求输出 8–10 页、页面角色、行动标题、证据引用和视觉意图。
4. `content-planner.mjs` 对 Codex 结果做标准化和 fallback。
5. Markdown 论文模式也生成 8–10 页确定性大纲，便于无登录测试。

验收：

- 论文后半部分的结果、分析和限制不会被摘要覆盖。
- 每个主要事实型页面有来源引用或明确标记为引入页。
- 规划结果能通过严格 JSON Schema。

### P2：主题、版式和图片双渲染

实施内容：

1. 主题从 renderer 硬编码中抽离为 preset。
2. 增加 `--theme auto|graphite-lime|paper-blue|sunset-editorial|signal-dark`。
3. HTML renderer 支持 `image` 元素、相对资产路径和图片说明。
4. PPTX renderer 支持图片对象；无法原生编辑的图片标记为 `editable_level=image`。
5. 页面根据 `visual_intent` 自动放置证据图片。

验收：

- 同一论文至少可生成 3 种风格。
- 8–10 页中至少 4 页有图片、图表或方法图。
- HTML 与 PPTX 的页面数、标题和核心证据一致。

### P3：QA 和局部修订

实施内容：

1. 增加布局重复率检测。
2. 增加图片覆盖率检测。
3. 增加证据引用缺失检测。
4. 增加 `review_flags` 和 `revision_actions` 文件。
5. 为后续 Codex review 预留页面级修订接口。

验收：

- 标题溢出、页面为空和关键页无证据图被自动发现。
- 修订只针对失败页，不默认整套重生成。

## 6. 关键架构决策

### ADR-001：保留当前双渲染主链

**选择**：继续使用 `deck.spec.json → HTML/PPTX`，不直接迁移到 Marp/Slidev。

**理由**：当前项目已经有原生 PPTX 和 HTML 双输出，迁移会丢失现有验证资产；Marp/Slidev 更适合 HTML/PDF 快速演示，不能作为强编辑 PPTX 的唯一主链。

**接受的代价**：需要自己维护主题和布局组件。

### ADR-002：证据索引优先于重型 RAG

**选择**：先用页级 `evidence-index.json`，暂不引入 LangGraph/LlamaIndex。

**理由**：当前是本地单用户 MVP，核心问题是全文、页码、图片和表格没有进入中间层，而不是复杂多文档检索。

**升级触发**：多篇论文、长任务恢复、人工审稿和知识库问答成为核心需求时再引入。

### ADR-003：内容编排与视觉规划解耦

**选择**：`presentation-content` 只决定讲述结构，`visual-planner` 决定视觉意图，renderer 只负责确定性输出。

**理由**：避免模型直接输出固定 HTML，减少内容正确但版式不可控的问题，也方便同一大纲切换主题。

## 7. 本轮实现后的运行方式

### 确定性测试

```powershell
node src/cli.mjs generate `
  --input examples/simplevla-rl-paper.md `
  --out dist/simplevla-route `
  --format both `
  --planner deterministic `
  --theme paper-blue
```

### 本地 Codex 论文测试

```powershell
node src/cli.mjs generate `
  --input 'C:\Users\Wph\Desktop\2509.09674v1.pdf' `
  --out dist/simplevla-rl-full `
  --format both `
  --planner local-codex `
  --theme auto
```

### 检查

```powershell
node src/cli.mjs validate --spec dist/simplevla-rl-route/deck.spec.json
node src/cli.mjs qa --input dist/simplevla-rl-route --format both
node src/serve.mjs --dir dist/simplevla-rl-route --port 4174
```

## 8. 本轮完成定义

- [ ] 有独立的实现流线报告。
- [ ] PDF 输出页级证据索引和图片资产。
- [ ] Codex 规划支持内容编排字段。
- [ ] 论文模式默认 8–10 页。
- [ ] 至少 3 个主题 preset。
- [ ] HTML 支持证据图片。
- [ ] PPTX 支持图片对象或明确 fallback。
- [ ] QA 检测内容、输出和视觉结构风险。
- [ ] 确定性示例可在无 Codex 登录时跑通。

