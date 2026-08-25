# Codex PPT 双渲染 MVP

> 后续 Agent 或新机器接手时，先阅读 [AGENTS.md](AGENTS.md)、[PROJECT_STATUS.md](PROJECT_STATUS.md) 和 [MIGRATION.md](MIGRATION.md)。

这是一个本地优先的 PPT 自动化 MVP：一份 `deck.spec.json` 同时生成网页演示和可编辑 PPTX。

## 已实现

- Markdown → 结构化 `deck.spec.json`
- 12 个布局家族与 10 个语义构图：封面、论证双栏、五步因果链、指标组、证据表、结果图、边界结论等
- 论文模式 8–10 页内容编排：页面角色、行动标题、证据引用、视觉意图和讲稿
- PDF 可插拔解析：`auto / PyMuPDF / MinerU`，统一输出标题、段落、图片、图表、表格、公式、bbox、图注和页码证据
- `evidence-index.json` v0.3：保留阅读顺序、解析诊断、公式、图注和来源坐标
- 10 套外置主题模板：6 套新增专业模板，并兼容原有 4 个主题 ID
- 风格语义自动选择：主题、内容场景、受众与视觉禁用项共同形成可复现的 style brief
- 三张原创风格参考图：炫酷科技、学术证据、简约编辑；生成时会复制到 `codex/style-inspiration.png`
- 论文模式自动确保至少 4 页使用有来源的证据图/来源核验裁剪；每页最多 3 图
- React 19 SSR 单文件 HTML 演示，与 PPTX 共用同一语义规格
- 键盘、滚轮、触控和导航点切页
- 基于 `@oai/artifact-tool` 的原生 PPTX 输出
- 标题、正文、形状、流程节点和连接线保持原生对象
- 两轮故事板编辑、逐页生成、自动修订、HTML / PPTX 预览、Schema 检查与独立 Codex 终审

## 项目保存与迁移

仓库会版本化全部源码、Schema、Skill、主题、测试、产品文档，以及 `dist/real-paper-v2` 和 `dist/theme-gallery` 两套可复核基准。`node_modules` 和重复历史构建缓存不进入 Git；完整历史 `dist` 可使用下列命令保存到仓库同级 ZIP：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/create-migration-archive.ps1
git bundle create ..\PPT制作-history.bundle --all
```

完整 GitHub、离线 bundle 和新机器恢复步骤见 [MIGRATION.md](MIGRATION.md)。项目进度与下一步统一维护在 [PROJECT_STATUS.md](PROJECT_STATUS.md)。

## 运行

项目优先使用 `CODEX_CLI_PATH` 指定的本地 Codex，否则使用系统或项目内 Codex CLI。工作区 `SKILL.md`、Presentation Skill、style guidelines 与布局目录会共同注入规划、二审和终审。首次安装依赖：

```powershell
npm ci
```

如果本地 Codex 尚未登录，先执行：

```powershell
codex login
```

也可以通过 `CODEX_MODEL` 覆盖模型。Planner/Reviewer 默认使用 `medium` 推理档位，可通过 `CODEX_REASONING_EFFORT` 调整。

当前 Codex 桌面运行时已经提供 Node.js 和 artifact-tool。执行 `npm ci` 后，若需要重新建立 artifact-tool 工作区链接，在 PowerShell 执行：

```powershell
$env:HOME='C:\Users\Wph'
& 'C:\Users\Wph\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'C:\Users\Wph\.codex\plugins\cache\openai-primary-runtime\presentations\26.727.11326\skills\presentations\container_tools\setup_artifact_tool_workspace.mjs' `
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
  --parser auto `
  --theme auto
```

PDF 解析器选择：

```powershell
# 自动模式：检测到 MinerU 时优先用 MinerU，失败时记录原因并回退 PyMuPDF
node src/cli.mjs generate --input paper.pdf --out dist/paper --planner local-codex --parser auto

# 明确使用快速解析
node src/cli.mjs generate --input paper.pdf --out dist/paper-fast --planner local-codex --parser pymupdf

# 明确使用 MinerU；未安装时会给出安装提示，不会静默回退
node src/cli.mjs generate `
  --input paper.pdf `
  --out dist/paper-mineru `
  --planner local-codex `
  --parser mineru `
  --mineru-backend hybrid-engine `
  --mineru-effort high
```

MinerU CLI 的基本安装与使用方式以其官方文档为准。安装后项目通过 `mineru -p <pdf> -o <dir>` 调用；也可以用 `MINERU_CLI_PATH` 指向自定义可执行文件。`auto` 模式不要求 MinerU 必须存在。

论文模式会额外落盘：

- `codex/source-extracted.txt`：PDF 全文提取结果
- `codex/source-manifest.json`：输入、页数、解析器和资产数量
- `codex/evidence-index.json`：页级 blocks、章节、claims、公式、表格、图片和解析诊断
- `codex/mineru/`：使用 MinerU 时保留结构化结果和运行日志
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
src/document-parser.mjs     auto / PyMuPDF / MinerU 解析路由
src/mineru-parser.mjs       MinerU CLI、content_list v1/v2 适配
src/evidence-index.mjs      统一证据索引 v0.3
src/theme-presets.mjs       外置模板加载和自动主题选择
src/template-gallery.mjs    网页模板目录
src/codex-bridge.mjs        本地 Codex 规划/审查、SKILL.md 注入、JSON Schema 约束
src/schema-writer.mjs       规划 → deck.spec.json
src/react-html.mjs          规格 → React SSR 单文件 HTML
src/render-pptx.mjs         规格 → 原生 PPTX
src/qa.mjs                  结构/输出/基础密度 QA
src/serve.mjs               本地网页服务器
dist/demo/                  生成产物
```

## 本地 Codex 接入原理

```text
Markdown / PDF 全文
  ↓
src/codex-bridge.mjs
  ├── 第一版故事板：受众、目标、论文主张、证据、主次
  ├── Presentation Skill 二审：删重、补证据、回答开场问题
  ├── 逐页内容与演讲稿生成
  └── 严格 JSON Schema + 本地 Codex 自动修订
  ↓
schema-writer.mjs → deck.spec.json
  ├── react-html.mjs → React SSR 可视化网页
  └── render-pptx.mjs → 原生可编辑 PPTX
  ↓
qa.mjs → Codex review → 必要时整份计划修订 → 再渲染
```

Codex 仅负责内容、叙事和结构规划；渲染器仍使用固定 schema 和布局组件，因此 HTML 与 PPTX 共享同一份中间表示。`--planner deterministic` 是离线回退，不依赖 Codex 登录。

当前实现的内容流线是：

```text
全文解析 → evidence-index → 第一版故事板 → Presentation Skill 二审
        → 逐页讲述与视觉合同 → deck.spec.json
        → React HTML / 原生 PPTX → QA → Codex 终审 → 自动修订
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

最终汇编仍然输出根目录的 `deck.spec.json`、`presentation.html`、`presentation.pptx` 和 `preview/`。PDF 会全文解析，并把论文表格写入 `evidence-index.json`；实验/结果页优先输出原生可编辑 table/chart。原文截图使用 `source-provenance` 语义并排在主证据之后；论文 QA 还会检查 train / validation / test / OOD 指标口径，防止把评估协议误写成结果。

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

当前可用主题共 10 套：

- 新增：`academic-evidence`、`scientific-plate`、`engineering-blueprint`、`editorial-research`、`consulting-data-story`、`dark-frontier-tech`
- 兼容：`graphite-lime`、`paper-blue`、`sunset-editorial`、`signal-dark`

模板清单位于 `themes/catalog/*.json`。每个模板包含类别、标签、密度、色板、字体、间距、图片处理、表格处理、布局语法、禁用项和来源说明。`visual_profile` 会进一步控制真实渲染语法，目前有 `academic / scientific / blueprint / editorial / consulting / frontier / graphite` 七类轮廓；它们会改变背景网格、分割线、卡片圆角、标题页母题和原生表格样式，而不只是替换颜色。`--theme` 优先级最高；未指定时，系统会先采纳 storyboard 的选择，再按主题和场景语义评分，最后稳定回退。

生成可视化模板目录：

```powershell
node src/cli.mjs themes --out dist/theme-gallery
node src/serve.mjs --dir dist/theme-gallery --port 4182
```

然后访问 `http://127.0.0.1:4182/`。每个模板预览同时包含文字、图片、数据条和表格处理效果。

三张原创风格参考图位于 `themes/style-references/`；可直接打开 `themes/style-references/index.html` 浏览。调研来源、风格判定方法、版权边界和布局约束见 `PPT AI风格研究与参考图库.md`。
