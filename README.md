# Codex PPT 双渲染 MVP

这是一个本地优先的 PPT 自动化 MVP：一份 `deck.spec.json` 同时生成网页演示和可编辑 PPTX。

## 已实现

- Markdown → 结构化 `deck.spec.json`
- `title`、`pipeline`、`comparison` 三种布局
- 论文模式 8–10 页内容编排：页面角色、行动标题、证据引用、视觉意图和讲稿
- PDF 页级全文证据索引：`evidence-index.json`、嵌入图片资产和页码信息
- `graphite-lime`、`paper-blue`、`sunset-editorial`、`signal-dark` 主题 preset
- 风格语义自动选择：主题、内容场景、受众与视觉禁用项共同形成可复现的 style brief
- 三张原创风格参考图：炫酷科技、学术证据、简约编辑；生成时会复制到 `codex/style-inspiration.png`
- HTML / PPTX 图片资产支持与图片覆盖率 QA
- 零构建依赖的单文件 HTML 演示
- 键盘、滚轮、触控和导航点切页
- 基于 `@oai/artifact-tool` 的原生 PPTX 输出
- 标题、正文、形状、流程节点和连接线保持原生对象
- HTML / PPTX 预览、Schema 检查、基础 QA 报告

## 运行

项目现在优先调用项目内的 `@openai/codex` CLI，并把工作区根目录的 `SKILL.md` 提取为结构规划与审查提示词的一部分。首次安装依赖：

```powershell
npm ci
```

如果本地 Codex 尚未登录，先执行：

```powershell
npx codex login
```

也可以通过 `CODEX_MODEL` 覆盖默认模型；默认值为当前本地 Codex 配置中的 `gpt-5.6-luna`。Planner/Reviewer 默认使用 `medium` 推理档位，可通过 `CODEX_REASONING_EFFORT` 调整。

当前 Codex 桌面运行时已经提供 Node.js 和 artifact-tool。执行 `npm ci` 后，若需要重新建立 artifact-tool 工作区链接，在 PowerShell 执行：

```powershell
$env:HOME='C:\Users\Wph'
& 'C:\Users\Wph\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'C:\Users\Wph\.codex\plugins\cache\openai-primary-runtime\presentations\26.709.11516\skills\presentations\container_tools\setup_artifact_tool_workspace.mjs' `
  --workspace 'C:\Users\Wph\Documents\PPT制作'
```

生成双输出（Codex 规划 → deck.spec.json → HTML/PPTX → QA → Codex review）：

```powershell
$env:HOME='C:\Users\Wph'
& 'C:\Users\Wph\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  src/cli.mjs generate --input examples/demo.md --out dist/demo --format both --planner local-codex
```

如果暂时不使用模型调用，可以运行确定性回退规划器，验证渲染和 QA 链路：

```powershell
node src/cli.mjs generate --input examples/demo.md --out dist/demo --format both --planner deterministic
```

论文模式可以直接接收 PDF。桥接器会提取 PDF 全文交给本地 Codex，并生成 8–10 页论文结构；不再依赖预先写好的短摘要：

```powershell
node src/cli.mjs generate `
  --input 'C:\Users\Wph\Desktop\2509.09674v1.pdf' `
  --out dist\simplevla-rl-paper-full `
  --format both `
  --planner local-codex `
  --theme auto
```

论文模式会额外落盘：

- `codex/source-extracted.txt`：PDF 全文提取结果
- `codex/source-manifest.json`：输入、页数、解析器和资产数量
- `codex/evidence-index.json`：页级文本、章节、claims 和图片资产索引
- `assets/`：PDF 中提取的嵌入图片

如果暂时不调用 Codex，也可以用确定性论文内容编排验证 8–10 页、主题和双渲染：

```powershell
node src/cli.mjs generate `
  --input examples/simplevla-rl-paper.md `
  --out dist\simplevla-route `
  --format both `
  --planner deterministic `
  --theme paper-blue
```

打开网页：

```powershell
& 'C:\Users\Wph\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  src/serve.mjs --dir dist/demo --port 4173
```

然后访问 `http://127.0.0.1:4173/`，或直接打开 `dist/demo/presentation.html`。

检查规格和 QA：

```powershell
node src/cli.mjs validate --spec dist/demo/deck.spec.json
node src/cli.mjs qa --input dist/demo --format both
```

## 目录

```text
schemas/deck.schema.json   规格约束
examples/demo.md            示例输入
src/planner.mjs             Markdown → 规划
src/content-planner.mjs     页面角色、行动标题、视觉意图和论文页级编排
src/evidence-index.mjs      页级证据索引与图片资产解析
src/theme-presets.mjs       多主题 preset 和自动主题选择
src/codex-bridge.mjs        本地 Codex 规划/审查、SKILL.md 注入、JSON Schema 约束
src/schema-writer.mjs       规划 → deck.spec.json
src/render-html.mjs         规格 → 单文件 HTML
src/render-pptx.mjs         规格 → 原生 PPTX
src/qa.mjs                  结构/输出/基础密度 QA
src/serve.mjs               本地网页服务器
dist/demo/                  生成产物
```

## 本地 Codex 接入原理

```text
Markdown
  ↓
src/codex-bridge.mjs
  ├── 读取 SKILL.md，提取 review checklist / pipeline / comparison 规则
  ├── 调用本地 Codex exec
  └── 使用 schemas/codex-plan.schema.json 约束严格 JSON
  ↓
schema-writer.mjs → deck.spec.json
  ├── render-html.mjs → 可视化网页
  └── render-pptx.mjs → 原生可编辑 PPTX
  ↓
qa.mjs → Codex review → codex/review.json
```

Codex 仅负责内容、叙事和结构规划；渲染器仍使用固定 schema 和布局组件，因此 HTML 与 PPTX 共享同一份中间表示。`--planner deterministic` 是离线回退，不依赖 Codex 登录。

当前实现的内容流线是：

```text
全文解析 → evidence-index → presentation content plan
        → SKILL.md 科研图结构规则 → deck.spec.json
        → HTML/PPTX → QA → 页面级 review flags
```
## 逐页生成模式

论文输入会先生成 `codex/storyboard.json`，随后为每一页生成独立的：

```text
codex/slides/slide-XXX/slide-XXX.plan.json
codex/slides/slide-XXX/deck.spec.json
codex/slides/slide-XXX/presentation.html
codex/slides/slide-XXX/presentation.pptx
codex/slides/slide-XXX/preview/pptx-001.png
codex/slides/slide-XXX/qa/report.json
```

最终汇编仍然输出根目录的 `deck.spec.json`、`presentation.html`、`presentation.pptx` 和 `preview/`。PDF 会全文解析，并把论文表格写入 `evidence-index.json`；实验/结果页优先输出原生可编辑 table/chart。

```powershell
node src/cli.mjs generate `
  --input "C:\Users\Wph\Desktop\2509.09674v1.pdf" `
  --out dist/simplevla-page-by-page `
  --format both `
  --planner deterministic `
  --theme auto
```

本地 Codex 已登录时，将 `--planner deterministic` 改为 `--planner local-codex`；后者会先调用 storyboard，再逐页调用 Codex。

## 风格选择与参考图

可用主题为 `graphite-lime`、`paper-blue`、`sunset-editorial`、`signal-dark`。`--theme` 优先级最高；未指定时，系统会先采纳 storyboard 的选择，再按输入的研究/产品/战略/工程语义确定主题，最后使用稳定回退，避免风格随机变化。

三张原创风格参考图位于 `themes/style-references/`；可直接打开 `themes/style-references/index.html` 浏览。调研来源、风格判定方法、版权边界和布局约束见 `PPT AI风格研究与参考图库.md`。
