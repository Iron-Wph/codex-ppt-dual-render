# PPT 双渲染 MVP 运行指南

## 1. 项目目标

本 MVP 使用一份 Markdown 作为输入，由本地 Codex 完成内容分析、页面规划和结构审查，再通过同一份 `deck.spec.json` 同时生成：

- 可在浏览器中播放的 HTML 演示稿；
- PowerPoint 中可继续编辑的原生 PPTX；
- HTML/PPTX 截图、结构检查和 QA 报告。

整体流程：

```text
Markdown / 论文总结
        ↓
本地 Codex Planner + SKILL.md 结构规则
        ↓
deck.spec.json
   ┌────┴────┐
   ↓         ↓
HTML      PPTX
   └────┬────┘
        ↓
QA 检查 → Codex Reviewer
```

## 2. 环境要求

- Windows PowerShell；
- Node.js 20 或更高版本；
- 当前目录下的 `SKILL.md`；
- 本地 Codex CLI；
- Codex 桌面运行时提供的 `@oai/artifact-tool`。

项目目录：

```powershell
cd "C:\Users\Wph\Documents\PPT制作"
```

## 3. 首次安装

安装项目依赖：

```powershell
npm ci
```

登录本地 Codex：

```powershell
npx codex login
```

确认本地 Codex 版本：

```powershell
npx --no-install codex --version
```

如果 `npm ci` 后 PPTX 渲染提示找不到 artifact-tool，需要重新建立工作区链接：

```powershell
$env:HOME='C:\Users\Wph'

& 'C:\Users\Wph\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'C:\Users\Wph\.codex\plugins\cache\openai-primary-runtime\presentations\26.709.11516\skills\presentations\container_tools\setup_artifact_tool_workspace.mjs' `
  --workspace 'C:\Users\Wph\Documents\PPT制作'
```

## 4. 最短运行方式

使用默认示例生成 HTML 和 PPTX：

```powershell
npm run generate
```

等价命令：

```powershell
node src/cli.mjs generate `
  --input examples/demo.md `
  --out dist/demo `
  --format both `
  --planner local-codex
```

默认生成目录：

```text
dist/demo/
├── deck.spec.json
├── presentation.html
├── presentation.pptx
├── codex/
├── preview/
└── qa/
```

## 5. 使用论文或论文总结作为测试输入

### 5.1 直接使用 PDF（论文模式）

论文模式会直接提取 PDF 全文并交给本地 Codex，默认生成 8–10 页论文汇报结构。推荐直接使用 PDF：

```powershell
node src/cli.mjs generate `
  --input "C:\Users\Wph\Desktop\2509.09674v1.pdf" `
  --out dist\simplevla-rl-paper-full `
  --format both `
  --planner local-codex
```

论文模式的大纲通常覆盖：

```text
研究背景与问题 → 方法总览 → 训练机制 → 探索增强
→ 实验设置 → 主结果 → 数据效率/泛化
→ sim-to-real 或关键分析 → 局限与结论
```

PDF 全文和来源信息会保存到：

```text
dist/simplevla-rl-paper-full/codex/source-extracted.txt
dist/simplevla-rl-paper-full/codex/source-manifest.json
```

### 5.2 使用论文总结 Markdown

系统仍支持 Markdown 格式的论文总结。建议篇幅约为 800–1500 字，内容结构如下：

```markdown
# 论文标题

> 一句话概括论文的核心贡献

## 研究背景

说明研究问题的来源，以及现有方法存在的不足。

## 研究问题

说明论文试图回答的核心问题。

## 研究方法

介绍数据、实验、模型或分析流程。

## 主要发现

列出 2–4 个关键发现或实验结果。

## 研究价值

说明理论价值、应用价值或方法创新。

## 局限与展望

说明研究限制，以及未来可以继续研究的方向。
```

将文件保存为例如：

```text
examples/paper-summary.md
```

然后运行：

```powershell
node src/cli.mjs generate `
  --input examples/paper-summary.md `
  --out dist/paper-summary `
  --format both `
  --planner local-codex
```

推荐的论文演示结构：

```text
第 1 页：论文主题与核心结论
第 2 页：研究背景与研究问题
第 3 页：研究方法与实验流程
第 4 页：主要发现与关键数据
第 5 页：研究价值、局限与展望
```

当前 MVP 支持的布局为 `title`、`pipeline` 和 `comparison`。复杂公式、表格和实验图表建议先转换成简洁的关键发现卡片，后续再扩展专用布局。

## 6. 查看 HTML 演示

启动本地网页服务：

```powershell
node src/serve.mjs --dir dist/demo --port 4173
```

访问：

```text
http://127.0.0.1:4173/
```

网页支持键盘、滚轮、触控和页面导航。也可以直接打开：

```text
dist/demo/presentation.html
```

## 7. 验证与质量检查

验证规格文件：

```powershell
node src/cli.mjs validate --spec dist/demo/deck.spec.json
```

运行 QA：

```powershell
node src/cli.mjs qa --input dist/demo --format both
```

生成内容后，`generate` 会自动执行基础 QA，并在 `local-codex` 模式下调用 Codex Reviewer。也可以单独执行：

```powershell
node src/cli.mjs review --input dist/demo
```

重点查看：

```text
dist/demo/qa/report.json
dist/demo/qa/report.md
dist/demo/codex/review.json
dist/demo/preview/
```

## 8. 离线回退模式

如果本地 Codex 尚未登录，或者只想验证渲染器和 QA 链路，可以使用确定性 planner：

```powershell
node src/cli.mjs generate `
  --input examples/demo.md `
  --out dist/demo `
  --format both `
  --planner deterministic
```

离线模式不调用 Codex，但不会生成 Codex review。

## 9. 常用命令

| 目的 | 命令 |
|---|---|
| Codex 规划 | `node src/cli.mjs plan --input examples/demo.md --planner local-codex` |
| PDF 论文规划 | `node src/cli.mjs plan --input C:\\Users\\Wph\\Desktop\\2509.09674v1.pdf --planner local-codex` |
| 只生成 HTML | `node src/cli.mjs generate --input examples/demo.md --out dist/demo --format html --planner local-codex` |
| 只生成 PPTX | `node src/cli.mjs generate --input examples/demo.md --out dist/demo --format pptx --planner local-codex` |
| 同时生成 | `npm run generate` |
| 校验规格 | `npm run validate` |
| 执行 QA | `npm run qa` |
| 启动网页 | `npm run web` |
| 单独审查 | `npm run review` |

## 10. SKILL.md 的作用

当前目录的 `SKILL.md` 不负责直接生成 PPTX，而是作为结构审查规则使用。程序会提取其中与通用演示相关的内容，包括：

- 唯一核心主张；
- 阅读顺序和视觉层级；
- 内容分组和连接线语义；
- pipeline 与 comparison 的布局原则；
- 文字密度和最终审查清单。

这些规则会分别注入 Codex Planner 和 Codex Reviewer。渲染器仍然只接受经过 JSON Schema 校验的 `deck.spec.json`，从而保证 HTML 与 PPTX 使用同一份结构数据。

## 11. 常见问题

### 11.1 `invalid_grant` 或登录过期

重新执行：

```powershell
npx codex login
```

然后重新运行 `npm run generate`。

### 11.2 PPTX 渲染找不到 artifact-tool

重新执行第 3 节的 artifact-tool 工作区初始化命令。

### 11.3 只想验证本地工程

使用 `--planner deterministic`，它不依赖 Codex 登录，可以验证 schema、HTML、PPTX 和 QA。

### 11.4 如何更换模型

在 PowerShell 中设置：

```powershell
$env:CODEX_MODEL='模型名称'
npm run generate
```

### 11.5 如何调整 Codex 推理强度

Planner 和 Reviewer 默认使用 `medium`，以避免长论文输入在本地运行时等待过久。需要更强推理时可以设置：

```powershell
$env:CODEX_REASONING_EFFORT='high'
npm run generate
```
