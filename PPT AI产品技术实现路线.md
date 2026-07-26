# PPT AI 产品技术实现路线

## 1. 文档目标

本文档把《PPT AI生成产品迭代方案》转化为可以在当前本地 Codex MVP 上逐步落地的工程路线。

目标不是重写现有系统，而是在保留以下能力的基础上迭代：

- 本地 Codex 负责内容分析与结构规划。
- `deck.spec.json` 作为 HTML 和可编辑 PPTX 的唯一中间表示。
- HTML 用于快速预览，PPTX 使用原生文本、形状和图片对象。
- `SKILL.md` 继续用于结构、层级、阅读路径和视觉 QA 规则。
- 所有 Codex 输出经过 JSON Schema 验证和渲染级 QA。

本路线的最终结果是：同一份 PDF 可以选择不同风格，生成包含论文图表/图片、可编辑 PPTX、可交互 HTML，并支持页面级局部重生成。

## 2. 现状与约束

### 2.1 当前已经具备的模块

| 模块 | 当前实现 |
| --- | --- |
| CLI | `src/cli.mjs` |
| 本地 Codex 接入 | `src/codex-bridge.mjs` |
| PDF 文本提取 | `src/pdf-text.mjs` |
| 结构规划 | `src/planner.mjs`、`schemas/codex-plan.schema.json` |
| 规格生成 | `src/schema-writer.mjs` |
| HTML 渲染 | `src/render-html.mjs` |
| PPTX 渲染 | `src/render-pptx.mjs` |
| 规格校验 | `src/validate-spec.mjs` |
| QA | `src/qa.mjs` |
| 本地网页服务 | `src/serve.mjs` |

### 2.2 当前主要约束

- 当前只有 `title`、`pipeline`、`comparison` 三种布局。
- 主题和大部分几何位置写在渲染器中，Codex 无法真正规划视觉风格。
- PDF 目前以文本提取为主，论文 Figure、Table 和图注尚未进入资产模型。
- 生成过程是一次性 CLI，缺少页面锁定、局部重生成和版本管理。
- 当前项目是本地优先、单机运行、低并发工具，不需要提前引入微服务、消息队列或云数据库。

## 3. 总体技术路线

```text
PDF / Markdown / 图片 / 参考 PPT
              ↓
        Source Loader
  文本、页码、图片、表格、图注
              ↓
        Evidence Index
  章节、claim、figure、table、source page
              ↓
        Codex Planner
  narrative plan + style brief + asset plan
              ↓
      Strict Schema Validator
              ↓
        Deck Assembler
  风格令牌 + 布局注册表 + 资产布局
              ↓
   deck.spec.json / asset-manifest.json
          ↙                    ↘
   HTML Renderer          PPTX Renderer
          ↓                    ↓
     浏览器预览          原生可编辑 PPTX
          ↘                    ↙
       Visual QA / Source QA / Review
```

核心原则是：Codex 负责“选择和解释”，渲染器负责“稳定执行”。不让 Codex 直接生成 HTML、CSS 或 PPTX 代码，避免每次生成结果不可控。

## 4. 架构决策

### ADR-001：采用模块化单体，不提前拆分微服务

**决策**：继续使用 Node.js CLI + Python 辅助脚本的模块化单体结构。

**理由**：当前是本地开发、单用户或小规模使用，没有独立扩缩容和多人协作需求。模块化边界可以保留，未来需要服务化时再拆分。

**接受的代价**：长任务仍在本地进程执行，需要通过阶段日志、缓存和中间文件提升可观测性。

### ADR-002：PDF 采用“文本 + 资产”双通道提取

**决策**：文字继续使用 `pypdf`；图片和页面视觉回退使用 `PyMuPDF`，表格先采用轻量识别，复杂表格再接入可选工具。

**理由**：文字抽取和图片抽取的最佳工具不同。论文图表首先需要可引用、可展示，不要求第一版完全理解所有图表语义。

**回退策略**：嵌入图片提取失败时，使用对应 PDF 页面的高分辨率截图作为图片资产，并保留来源页；截图是可移动图片对象，但不是可编辑图表。

### ADR-003：图片作为原生 PPTX 图片对象，不把整页做成背景图

**决策**：PPTX 使用可移动、可缩放、可裁切的图片对象；文字、图注和图表标签仍保留为原生元素。

**理由**：整页截图视觉稳定但不可编辑，会破坏产品核心价值。论文原图可以保持原貌，简单数据图则优先用形状和文本重绘。

### ADR-004：Codex 输出采用严格 JSON + 多层验证

**决策**：新增 `style-brief`、`asset-manifest` 和扩展后的 `deck.schema`，每次调用都校验结构、来源和可渲染性。

**理由**：AI 输出不能直接信任；当前已经遇到过 `oneOf`、`additionalProperties` 等 schema 兼容问题，因此新 schema 应保持扁平、严格、易修复。

### ADR-005：先做缓存和中间产物，再做复杂异步队列

**决策**：每次任务生成 `run.json`、`source-manifest.json`、`evidence-index.json`、`plan.json`、`deck.spec.json` 和 QA 报告。

**理由**：本地工具最重要的是失败可恢复和可复现。只有在并发任务成为瓶颈时，才引入任务队列。

## 5. 目标目录结构

```text
PPT制作/
├── src/
│   ├── cli.mjs
│   ├── codex-bridge.mjs
│   ├── source-loader.mjs
│   ├── pdf-text.mjs
│   ├── pdf-assets.mjs
│   ├── evidence-index.mjs
│   ├── style-engine.mjs
│   ├── layout-registry.mjs
│   ├── asset-layout.mjs
│   ├── schema-writer.mjs
│   ├── render-html.mjs
│   ├── render-pptx.mjs
│   ├── qa.mjs
│   └── serve.mjs
├── schemas/
│   ├── deck.schema.json
│   ├── style-brief.schema.json
│   ├── asset-manifest.schema.json
│   ├── evidence-index.schema.json
│   ├── codex-plan.schema.json
│   └── codex-review.schema.json
├── prompts/
│   ├── plan-v1.md
│   ├── style-v1.md
│   ├── asset-mapping-v1.md
│   └── review-v1.md
├── themes/
│   ├── academic-light.json
│   ├── editorial-paper.json
│   ├── tech-dark.json
│   ├── data-lab.json
│   ├── executive-minimal.json
│   └── brand-narrative.json
├── tests/
│   ├── fixtures/
│   ├── schema/
│   ├── render/
│   ├── assets/
│   └── regression/
└── dist/
    └── <run-id>/
        ├── codex/
        ├── assets/
        ├── preview/
        └── reports/
```

## 6. 分阶段实现路径

### Phase 0：整理当前 MVP 的边界

#### 目标

让现有链路可回归、可缓存、可比较，避免在不稳定基础上继续增加布局。

#### 实现任务

1. 给 planner、prompt、schema、theme 和 renderer 增加版本号。
2. 将生成过程的每个阶段写入 `dist/<run-id>/`。
3. 增加 `--style auto|academic-light|tech-dark...` 参数，但 `auto` 默认仍使用当前风格。
4. 为当前 3 种布局建立快照测试。
5. 把 `SKILL.md` 相关规则继续保留在 review prompt 和 QA 报告中。

#### 验收

- 同一输入可以用同一 `run-id` 复现。
- 任一阶段失败时可以从中间产物重新渲染，不需要再次调用 Codex。
- 旧版 demo 和论文 PDF 结果不回归。

### Phase 1：Style Engine 与布局注册表

#### 目标

先解决“每次生成都一样”，暂时不引入图片抽取。

#### 6.1 Style Brief

新增 `schemas/style-brief.schema.json`：

```json
{
  "style_id": "academic-light",
  "family": "Academic Light",
  "background": "paper-white",
  "palette": {
    "background": "#F8FAFC",
    "surface": "#FFFFFF",
    "foreground": "#172033",
    "muted": "#64748B",
    "accent": "#2563EB",
    "accent2": "#14B8A6"
  },
  "typography": {
    "heading": "Aptos Display",
    "body": "Aptos",
    "mono": "Aptos Mono"
  },
  "density": "balanced",
  "image_treatment": "clean-card",
  "layout_rhythm": "editorial"
}
```

#### 6.2 实现方式

- `themes/*.json` 保存人工设计的安全主题，不让 Codex 任意生成颜色。
- `style-engine.mjs` 负责读取主题、合并用户约束和生成 `style tokens`。
- Codex 只选择 `style_id` 并补充风格理由，不直接输出任意 CSS。
- `render-html.mjs` 和 `render-pptx.mjs` 都从 `spec.theme` 读取颜色、字体、间距和背景策略。
- 每套主题定义封面、章节页、数据页、图表页和结论页的推荐节奏。

#### 6.3 布局注册表

新增 `layout-registry.mjs`：

```js
{
  id: "figure-caption",
  allowedElementKinds: ["text", "image", "shape"],
  recommendedFor: ["main_evidence", "method_figure"],
  minAssets: 1,
  maxTextDensity: "medium",
  renderers: { html: true, pptx: true }
}
```

布局选择逻辑由 `layout-selector` 根据 `claim_type`、资产类型、文字密度和 style brief 决定。Codex 可以提出候选布局，但最终必须经过注册表校验。

#### 验收

- 同一份论文使用三种主题，至少在背景、字体、封面构图、卡片形态和页面节奏上产生明显差异。
- 每套主题至少覆盖 6 种布局。
- 两个 renderer 不再各自维护一套主题常量。

### Phase 2：PDF 视觉资产管线

#### 目标

让论文 PPT 能够使用原文 Figure、Table、图注和关键页面。

#### 7.1 `pdf-assets.mjs`

输入 PDF，输出：

```json
{
  "assets": [
    {
      "id": "fig-001",
      "type": "image",
      "source": "pdf",
      "source_page": 7,
      "path": "assets/fig-001.png",
      "caption": "Success rate comparison",
      "bbox": [72, 120, 520, 430],
      "quality": "embedded"
    }
  ]
}
```

#### 7.2 提取策略

1. 使用 `pypdf` 提取带页码的文本。
2. 使用 PyMuPDF 提取页面中的嵌入图片和边界框。
3. 通过图注正则识别 `Figure/Fig./Table` 附近文本。
4. 如果嵌入图片缺失，按页渲染 PNG 作为回退资产。
5. 计算图片尺寸、分辨率、透明度和可读性。
6. 将资产复制到本次 run 的 `assets/`，禁止直接引用临时目录。

#### 7.3 表格和图表

第一阶段不要试图解析所有复杂图表：

- 原论文图表：直接引用为图片对象。
- 简单表格：使用文本块或原生 PPTX 表格重建。
- 简单柱状图/折线图：从已识别数据重绘为形状和文本。
- 复杂图表：保留原图，并用可编辑文本标注结论。

#### 验收

- 含 Figure 的论文至少提取出 80% 的可见图像资产或页图回退资产。
- 每个资产有来源页、文件路径和 caption 字段。
- HTML 和 PPTX 都能加载同一个 asset manifest。

### Phase 3：Evidence Index 与 Codex 规划升级

#### 目标

避免把整篇 PDF 无差别塞进每一次 Codex 调用，改成按页面任务检索证据。

#### 8.1 Evidence Index

新增 `evidence-index.mjs`，将来源组织为：

- `section`：章节和页码范围。
- `claim`：研究问题、方法、结果、限制。
- `metric`：数字、单位、基线和实验条件。
- `asset_ref`：Figure、Table 和页面截图。
- `source_page`：可回溯的页码。

#### 8.2 两阶段 Codex 调用

#### 调用 A：论文理解与风格规划

输出：

- `narrative_plan`
- `style_brief`
- `required_evidence`
- `candidate_assets`

#### 调用 B：页面级 deck spec

每页只注入相关证据：

- 当前页面目标。
- 当前页面主张。
- 相关章节摘要。
- 相关数字和来源页。
- 候选图片、图表和图注。
- 可使用的布局集合。

这样可以降低上下文噪声、减少成本，并降低论文内容被泛化模板替代的概率。

#### 8.3 严格输出与修复

- 所有 schema 对象设置 `additionalProperties: false`。
- 避免 Codex 当前不稳定支持的复杂 `oneOf`，使用统一字段和 `type` 区分元素。
- Codex 输出先写入临时文件，再由 `validate-spec.mjs` 校验。
- 校验失败时只执行结构修复，不重新生成整份论文。
- Prompt 放入 `prompts/` 并带版本号，回归测试记录 prompt 版本。

### Phase 4：双渲染器增加视觉元素

#### 9.1 统一元素模型

扩展 `deck.schema.json`：

```json
{
  "id": "s6-figure-1",
  "kind": "image",
  "role": "main-evidence",
  "asset_ref": "fig-003",
  "editable": true,
  "render_mode": "native",
  "position": { "left": 0.52, "top": 0.22, "width": 0.40, "height": 0.55 },
  "crop": "contain",
  "caption": "图 3：主结果对比",
  "source_page": 8
}
```

#### 9.2 HTML Renderer

- `image` 使用 `<img>`，设置 `object-fit` 和可访问的 `alt`。
- `chart` 第一版使用 SVG 或 HTML Canvas，保证缩放清晰。
- 图片加载失败显示来源页占位和明确错误，不显示空白区域。
- 主题通过 CSS variables 注入，布局通过 class registry 控制。

#### 9.3 PPTX Renderer

- 封装 `addImage()`，集中处理路径、裁切、透明度和定位。
- 先验证 `@oai/artifact-tool` 当前 runtime 的图片 API，再在 renderer 内部隔离版本差异。
- 图片使用原生 picture object，保留 `source_page` 在 speaker note 或页脚元数据中。
- 简单图表用原生形状、文本和线条重绘，避免第一版依赖不稳定的 chart API。
- 所有文字、图注、数字和标签保持 native text。

#### 9.4 图片布局优先级

布局选择顺序：

1. 页面主张需要真实证据时，优先使用论文原图。
2. 有数据但没有适合原图时，优先重绘简单图表。
3. 只有抽象方法描述时，生成流程图或结构图。
4. 没有内容资产时，才使用装饰背景或抽象几何图形。

### Phase 5：局部重生成与 Web 交互

#### 目标

从一次性 CLI 变成可反复编辑的本地工作台。

#### 10.1 最小本地 Web API

初期不引入独立后端服务，在 `serve.mjs` 上增加本地接口：

```text
POST /api/runs                 创建任务
GET  /api/runs/:id             查询阶段状态
GET  /api/runs/:id/spec        获取 deck spec
POST /api/runs/:id/slides/:id  局部重生成页面
POST /api/runs/:id/lock        锁定页面或元素
POST /api/runs/:id/render      重新渲染 HTML/PPTX
```

#### 10.2 页面局部重生成

请求中包含：

- 原页面 spec。
- 用户修改指令。
- 锁定的元素和资产。
- 当前 style brief。
- 当前页面相关 evidence refs。

Codex 只返回该页面的 patch 或完整页面对象，不能修改其他页面。服务端先合并 patch，再执行 schema、来源和渲染 QA。

#### 10.3 交互优先级

第一版 Web 只需要：

- 风格选择器。
- 页面缩略图列表。
- “只重做这一页”。
- 锁定页面/元素。
- 图片替换。
- HTML/PPTX 导出。

复杂画布编辑、多人协作和云端账号放到后续版本。

## 7. 质量与回归体系

### 11.1 自动检查

在现有 `qa.mjs` 之上增加：

- schema validity：结构合法。
- geometry：溢出、重叠、越界。
- asset existence：图片路径存在且可加载。
- source coverage：数字、结论、图片有来源页。
- visual evidence ratio：正文页视觉证据占比。
- style diversity：多次生成的主题和布局是否发生真实变化。
- editability：PPTX 不是整页图片，核心文字仍为原生对象。

### 11.2 回归数据集

建立至少 20 份材料：

- 10 篇机器学习/机器人论文。
- 3 篇产品技术方案。
- 3 份数据分析报告。
- 2 份管理层材料。
- 2 份没有图片的纯文本材料。

每份材料测试：

- 3 种风格。
- HTML 和 PPTX 两种输出。
- 自动 QA。
- 人工视觉盲评。
- 关键数字和来源页抽查。

### 11.3 质量阈值

| 指标 | 阈值 |
| --- | --- |
| 无溢出/重叠通过率 | ≥ 95% |
| 论文图像提取或页面回退成功率 | ≥ 80% |
| 有图论文的视觉证据页占比 | ≥ 40% |
| 数字和结论来源可追溯率 | ≥ 95% |
| 三种风格的人工可区分率 | ≥ 80% |
| PPTX 核心内容 native 可编辑率 | ≥ 90% |

## 8. 建议开发顺序

不要同时开发所有能力，建议按以下顺序形成可用闭环：

### 迭代 1：风格变化

1. 抽离 renderer 中的颜色、字体、间距常量。
2. 增加 3 个浅色/编辑类主题和 3 个深色/数据类主题。
3. 增加 `style_brief` 和主题选择 CLI 参数。
4. 建立主题差异回归截图。

### 迭代 2：图片进入 schema

1. 完成 `pdf-assets.mjs`。
2. 增加 asset manifest 和 `image` 元素。
3. 先在 HTML 支持图片，再接入 PPTX `addImage()`。
4. 增加 `hero-image` 和 `figure-caption` 布局。

### 迭代 3：证据驱动规划

1. 建立 evidence index。
2. 将 Codex prompt 改为两阶段。
3. 页面只读取相关证据。
4. 加入来源页和图注校验。

### 迭代 4：可控编辑

1. 增加页面锁定。
2. 增加局部重生成。
3. 增加图片替换和风格重做。
4. 增加版本回退和 render cache。

### 迭代 5：产品化

1. 增加参考 PPT/品牌色导入。
2. 增加风格收藏和模板复用。
3. 增加讲稿、备注和问答卡片。
4. 再评估是否需要本地任务队列、数据库和多用户服务。

## 9. 风险与应对

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| PDF 图表提取质量不稳定 | 图片缺失或错位 | 保留整页截图回退，记录来源页和质量等级 |
| Codex 选出不适合的布局 | 页面语义错误 | 布局注册表限制候选，渲染前验证 |
| 主题变化变成随机换色 | 用户觉得不可控 | 主题使用固定 token，Codex 只能在主题内组合 |
| 图片过多导致 PPT 体积变大 | 打开慢、导出失败 | 生成缩略图、压缩、设置最大像素和缓存 |
| 全文注入造成上下文过大 | 慢、贵、内容稀释 | evidence index + 页面级检索 |
| PPTX 图片 API 版本变化 | 渲染失败 | 封装 `addImage()`，启动时做 runtime capability check |
| 局部重生成破坏其他页面 | 用户失去信任 | patch 限制、锁定机制、版本快照和回滚 |
| 视觉 QA 只看几何不看设计 | 结果仍然单调 | 增加视觉证据率、风格差异度和人工盲评 |

## 10. 开发完成定义

### 技术完成

- `style_brief`、`asset-manifest`、`evidence-index` 和 `deck.schema` 均有版本化 schema。
- HTML 和 PPTX 共用同一套 theme tokens、layout registry 和 asset refs。
- PDF 图像可以进入 HTML 和 PPTX。
- PPTX 文字、图注、形状和图片可以继续编辑。
- 所有阶段都有中间产物、日志和可恢复路径。
- 自动 QA 能发现溢出、重叠、资产缺失、来源缺失和风格重复。

### 产品完成

- 用户可以选择至少 6 种风格。
- 同一份材料生成的不同风格具有明显视觉差异。
- 论文 PPT 不再是纯文字卡片，存在真实图表或原文视觉证据。
- 用户可以只重做一页、锁定一页、替换一张图。
- 用户可以导出 HTML 和可编辑 PPTX。

## 11. 第一条可执行命令路径

在完成 Phase 1 后，CLI 目标形态为：

```powershell
node src/cli.mjs generate `
  --input 'C:\Users\Wph\Desktop\2509.09674v1.pdf' `
  --out dist\paper-academic-light `
  --format both `
  --planner local-codex `
  --style academic-light
```

同一份 PDF 可以通过修改 `--style` 生成不同版本：

```powershell
node src/cli.mjs generate --input paper.pdf --out dist/paper-editorial --format both --planner local-codex --style editorial-paper
node src/cli.mjs generate --input paper.pdf --out dist/paper-data --format both --planner local-codex --style data-lab
```

在图片管线完成后，输出目录至少包含：

```text
dist/paper-academic-light/
├── presentation.html
├── presentation.pptx
├── deck.spec.json
├── codex/
│   ├── source-extracted.txt
│   ├── source-manifest.json
│   ├── evidence-index.json
│   └── plan.json
├── assets/
│   ├── asset-manifest.json
│   └── fig-001.png
├── preview/
└── reports/
    ├── qa.json
    └── review.json
```

## 12. 结论

最可行的路线不是一次性重构成复杂 SaaS，而是沿着“风格令牌 → 图片资产 → 证据索引 → 局部编辑 → 质量与留存”逐层增加能力。

其中第一优先级是：

1. 先让主题真正可变。
2. 再让论文图片和图表进入统一 schema。
3. 再让用户可以局部控制生成结果。

这条路径能够最大程度复用当前本地 Codex、`deck.spec.json`、HTML/PPTX 双渲染和 QA 代码，同时直接解决“风格单一”和“没有图片”两个最影响用户留存的问题。
