# PPT AI 逐页内容—视觉—双渲染实现流线报告

> 版本：v0.3
> 日期：2026-07-16
> 目标：把论文或 Markdown 变成可审阅、可迭代、可编辑的 HTML + PPTX，而不是一次性吐出一套同质化卡片。

## 1. 核心决策

当前产品采用“三段式生成”而不是“一次生成”：

```text
输入 PDF / Markdown
  ↓
全文解析 + 证据索引
  ↓
Storyboard：先决定每页讲什么、为什么讲、用什么证据
  ↓
逐页生成：每页独立生成文案、布局和视觉意图
  ↓
逐页渲染：单页 HTML / PPTX / PNG
  ↓
单页 QA：结构、证据、图片、表格、图表、溢出风险
  ↓
汇编 deck.spec.json
  ↓
HTML 演示 + 原生可编辑 PPTX
```

这样做的直接收益是：失败只重做一页；用户可以在汇编前审阅单页；模型不会在整套 PPT 中重复同一版式；论文表格和数字不会被摘要阶段丢掉。

## 2. 全文证据层

`src/pdf-text.mjs` 使用本地 PyMuPDF 读取 PDF 全文，保留：

- 每页文本和页码；
- PDF 嵌入图片；
- 表格/图表区域的 `bbox`、行列、单元格值；
- 对表格页、方法页和案例页生成 page snapshot，补足 PDF 中以矢量绘制、无法作为嵌入图片提取的图表。

统一写入 `codex/evidence-index.json`。当前 evidence index 主要包含 `pages`、`sections`、`claims`、`assets`、`tables` 五类证据。

证据 ID 的例子：

```text
p15-image-2       嵌入图片
p10-snapshot      第 10 页完整证据截图
p10-table-1       第 10 页结构化表格
```

后续页面只允许引用索引中的 ID，禁止模型自行编造页码或数字。

## 3. Storyboard 阶段

Storyboard 只负责“内容编排”和“视觉决策”，不负责写满页面。每页必须包含：

```json
{
  "id": "slide-008",
  "role": "main_results",
  "layout": "evidence",
  "action_title": "让观众理解主结果改变了什么",
  "slide_goal": "连接论文结果与结论",
  "primary_claim": "RL 同时改善性能、数据效率和迁移",
  "evidence_refs": ["p10-claim-1"],
  "table_refs": ["p10-table-1"],
  "asset_candidates": ["p11-snapshot"],
  "visual_intent": "data_chart"
}
```

论文默认 8–10 页，推荐 9 页叙事：

1. 题目与核心结论；
2. 问题；
3. 技术缺口；
4. 贡献；
5. 方法总览；
6. 方法细节/探索机制；
7. 实验设置；
8. 主结果；
9. 分析、边界与结论。

布局语义不是装饰：`pipeline` 只用于时间/因果顺序，`comparison` 用于并行机制或对照，`insight` 用于解释和边界，`evidence` 用于原生表格/图表证据。

## 4. 逐页生成阶段

local-Codex 模式分成两类调用：

```text
codex-storyboard.json          一次：整套结构
  ↓
codex/slides/slide-001/...     一次/页：单页文案与内容结构
codex/slides/slide-002/...
...
```

单页调用只接收：

- 本页 storyboard contract；
- 本页相关页的文本；
- 本页 table refs 对应的结构化表格；
- 本页候选图片/截图；
- 适用于本页的 `SKILL.md` 规则。

单页输出必须符合 `schemas/codex-slide.schema.json`。这一步把“整套 PPT 的风格判断”拆成可重试的页面级任务。

没有登录 Codex 时，`deterministic` planner 也走同一套页面物化流程：使用论文全文和证据索引生成稳定 fallback 内容，以便开发、QA 和 CI 不依赖登录态。

## 5. 视觉物化与双渲染

单页计划先转为中间规范，再分别渲染：

```text
slide-XXX.plan.json
       ↓
slide-XXX/deck.spec.json
       ├── presentation.html
       ├── presentation.pptx
       └── preview/pptx-001.png

所有单页通过 QA 后
       ↓
out/deck.spec.json
       ├── presentation.html
       └── presentation.pptx
```

PPTX 渲染遵循本地 Presentation skill 的要求，使用 `@oai/artifact-tool`：

- 文本、形状、连接线：原生可编辑对象；
- 图片：作为图片对象嵌入并保留来源页；
- 论文表格：`slide.tables.add` 原生表格；
- 论文数值：`slide.charts.add("bar", ...)` 原生图表；
- 单页 PNG：用于人工复核和后续 revision loop。

HTML renderer 使用同一份 `deck.spec.json`，将表格输出为可访问 HTML table，将图表输出为可读数据条形图，并支持键盘、滚轮和 hash 导航。

## 6. 当前视觉策略

当前实现已经从“统一卡片”升级为按证据类型排版：

- `source_figure`：在 comparison / insight 页右侧使用较大的论文图像框；
- `method_diagram`：左侧原生步骤卡，右侧保留方法页证据截图；
- `source_table`：主区域使用原生表格，右上保留来源页截图；
- `data_chart`：主区域使用原生横向柱状图，右上保留来源页截图；
- `text_led`：只在确实没有证据视觉时使用，避免用装饰图填空。

图片候选按页面角色选择：问题/缺口优先真实案例图，方法优先方法页截图，实验/结果优先表格页截图，分析优先真实任务图。这样不会把第一页的同一张图片复制到整套 PPT。

## 7. QA 门禁

目前 QA 检查：

- schema 和 deck 结构；
- 每页必须有且只有一个 title；
- layout 语义约束；
- 标题/正文密度风险；
- 图片、表格、图表证据覆盖；
- HTML/PPTX 是否存在及页数一致；
- PPTX inspect 是否包含原生文本对象；
- 资产路径是否完整；
- 连续重复布局。

单页 QA 结果写入每个 `codex/slides/slide-XXX/qa/report.json`，总 QA 写入 `qa/report.json`。只有单页渲染成功并通过 QA，才进入最终汇编。

## 8. 已验证的真实论文结果

测试输入：`C:\Users\Wph\Desktop\2509.09674v1.pdf`。

已验证输出：

- 24 页全文被读取；
- 35 个图片/页面证据资产；
- 25 个结构化表格/图表区域；
- 9 个单页 plan/spec/HTML/PPTX/PNG 目录；
- 汇编 PPTX 中包含 1 个 native table 和 1 个 native chart；
- 8 页含图片或数据视觉；
- 总 QA：0 errors / 0 warnings。

## 9. 运行方式

无 Codex 登录时先验证完整流水线：

```powershell
node src/cli.mjs generate `
  --input "C:\Users\Wph\Desktop\2509.09674v1.pdf" `
  --out dist/simplevla-page-by-page-v7 `
  --format both `
  --planner deterministic `
  --theme auto
```

有 Codex 登录时使用逐页模式：

```powershell
codex login
node src/cli.mjs generate `
  --input "C:\Users\Wph\Desktop\2509.09674v1.pdf" `
  --out dist/simplevla-codex-page-by-page `
  --format both `
  --planner local-codex `
  --theme auto
```

浏览 HTML：

```powershell
node src/serve.mjs --dir dist/simplevla-paper-final-v7 --port 4177
```

## 10. 本轮实现与验收结果

本轮继续把“论文证据直接参与排版”落实为可见的产品行为：

- PDF 提取阶段会根据 `find_tables()` 的区域坐标生成独立的 `evidence_crop` 素材，不再只保留整页截图。
- 逐页选图会按页面角色、页码优先级、裁剪素材优先级和宽高比进行排序；实验页优先使用第 9 页任务分类表，结果页优先使用第 10 页结果表，分析页优先使用第 15 页 Pushcut 图。
- `evidence` 页面使用原生可编辑 table/chart 作为主视觉，右上角的 source crop 仅作为论文来源对照；避免把整页论文截图缩成不可读的小图。
- 第 9 页任务分类被清洗成 5 行、3 列的可编辑表格：Short / Medium / Long / Extra-long / Overall，并保留任务名、步数范围和平均步数。

最新验收目录：

```text
dist/simplevla-paper-final-v8/
```

验收结果：9 页；24 页 PDF 全文；60 个证据资产（含裁剪素材）；25 个结构化表格/图表区域；8 页含图片或数据视觉；1 个 native table；1 个 native chart；单页 QA `0 errors / 0 warnings`；最终 deck schema 校验通过。

关键交付物：

- `dist/simplevla-paper-final-v8/presentation.pptx`
- `dist/simplevla-paper-final-v8/presentation.html`
- `dist/simplevla-paper-final-v8/deck.spec.json`
- `dist/simplevla-paper-final-v8/codex/storyboard.json`
- `dist/simplevla-paper-final-v8/codex/slides/slide-XXX/`

## 11. Presentation skill 前移与主题参考页

本轮把 Presentation skill 从“PPTX 渲染与 QA 约束”前移到内容决策阶段。local-Codex 的两阶段提示现在同时注入：

- 内容质量规则：受众结果、传播任务、叙事弧线、每页一个主张、证据解释和有意的开场/收束；
- 布局规则：标题层级、信息密度、字号下限、避免重复卡片网格、页面轮廓变化；
- 视觉规则：图片比例、来源证据、表格证据、主题一致性和单页 QA；
- Codex Grid 布局库的布局族、密度预算和内容槽位原则。

Storyboard 现在还要输出：

```json
{
  "style_family": "paper-blue",
  "style_reason": "适合学术论文和企业研究汇报，强调可信度与证据可读性",
  "style_context": "面向机器人与机器学习团队的研究型技术汇报",
  "layout_system": "evidence-led editorial grid"
}
```

主题选择规则：

1. 用户显式指定 `--theme` 时，用户选择优先；
2. 未指定主题时，local-Codex 必须根据受众、主题和场景，从主题目录中选择一个主题并解释原因；
3. 主题确定后，先生成 `codex/theme-reference.png`；
4. 参考页至少包含标题文字、来源图片区域和可编辑表格；
5. 所有单页继承同一套主题颜色、字体、间距、图片处理方式和表格处理方式；
6. 每页仍然可以使用不同布局轮廓，但不能脱离主题参考页的视觉契约。

新增参考页交付物：

```text
codex/theme-reference.png
codex/theme-reference.html
codex/theme-reference.pptx
codex/theme-reference.spec.json
```

已验证：`dist/skill-ref-smoke/` 能生成包含文字、图片和表格的 `paper-blue` 主题参考页；`dist/skill-integrated-md-smoke/` 完成主题锁定、双渲染和 schema/QA 回归；`dist/local-codex-skill-smoke/codex/codex-storyboard-prompt.txt` 已确认包含叙事规则、Codex Grid 规则、主题目录和 `visual.style_reason` 要求。原始 PDF 在当前工作区已不存在，因此本轮未重新执行该 PDF 的完整 local-Codex 调用；Markdown local-Codex smoke 已进入新提示链路，但因本地 Codex 登录过期停止，未出现 schema 错误。

## 12. 下一阶段产品化路线

当前版本已经解决“全文、表格、逐页和双渲染”的基础链路。要达到稳定付费体验，下一阶段应继续增加：

1. 基于截图的单页视觉评分和自动 revision；
2. 表格语义清洗：识别表头、指标、单位和 baseline；
3. 图表语义解析：把图例、轴、趋势恢复成结构化数据；
4. 图片候选排序：按页面语义、分辨率和视觉重要性打分；
5. 用户选择“学术/咨询/产品发布/投资人”视觉风格，并为每种风格提供布局族；
6. 在浏览器中允许用户锁定某页、替换证据、重新生成单页，而不重做整套 PPT。
