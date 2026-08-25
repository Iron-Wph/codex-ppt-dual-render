# PPT 双渲染 MVP 运行指南（v0.4）

## 1. 当前实现

本项目在本地 Codex 中完成以下闭环：

```text
Markdown / PDF 全文
  → 文档解析与 evidence-index
  → 第一版故事板（受众、目标、主次、证据、叙事）
  → Presentation Skill 二次编辑审查
  → 逐页内容、视觉合同与演讲稿
  → deck.spec.json
      ├─ React SSR HTML
      └─ 原生可编辑 PPTX
  → 截图 / 溢出 / 图片预算 / 证据映射 QA
  → 本地 Codex 终审
  → 必要时整份计划自动修订并重新渲染
```

HTML 与 PPTX 不是两套内容：两者都从同一份 `deck.spec.json` 读取页面主张、阅读顺序、布局、证据、连接关系和演讲稿。

## 2. 环境准备

```powershell
cd "C:\Users\Wph\Documents\PPT制作"
npm ci
codex login
```

推荐确认版本：

```powershell
codex --version
node --version
```

若系统存在多个 Codex CLI，可显式指定：

```powershell
$env:CODEX_CLI_PATH='C:\Users\Wph\AppData\Roaming\npm\codex.cmd'
```

项目调用 Codex 时使用隔离的 CLI 配置参数，避免无关 MCP 或过期插件认证影响生成。

## 3. 生成普通演示

```powershell
$env:CODEX_REASONING_EFFORT='high'
$env:CODEX_TIMEOUT_MS='300000'

node src/cli.mjs generate `
  --input examples/demo.md `
  --out dist/demo `
  --format both `
  --planner local-codex `
  --theme auto
```

不调用模型、只测试渲染器：

```powershell
node src/cli.mjs generate `
  --input examples/demo.md `
  --out dist/demo-offline `
  --format both `
  --planner deterministic
```

## 4. 生成 8–10 页论文汇报

PDF 会按全文处理，不依赖 800–1500 字摘要。推荐命令：

```powershell
$env:CODEX_REASONING_EFFORT='high'
$env:CODEX_TIMEOUT_MS='600000'

node src/cli.mjs generate `
  --input "C:\path\to\paper.pdf" `
  --out dist/paper `
  --format both `
  --planner local-codex `
  --paper `
  --parser auto `
  --theme auto
```

`--parser auto` 的行为：

- 检测到 MinerU CLI：优先使用 MinerU；
- MinerU 不可用或执行失败：记录原因并回退 PyMuPDF；
- `--parser mineru`：强制 MinerU，未安装时直接报错；
- `--parser pymupdf`：使用本地快速解析器。

强制 MinerU 示例：

```powershell
node src/cli.mjs generate `
  --input "C:\path\to\paper.pdf" `
  --out dist/paper-mineru `
  --format both `
  --planner local-codex `
  --paper `
  --parser mineru `
  --mineru-backend hybrid-engine `
  --mineru-effort high
```

如 MinerU 不在 `PATH`：

```powershell
$env:MINERU_CLI_PATH='C:\path\to\mineru.exe'
```

## 5. 输出目录

```text
dist/paper/
├─ deck.spec.json                 统一语义规格
├─ presentation.html             React SSR 网页演示
├─ presentation.pptx             原生可编辑 PowerPoint
├─ speaker-notes.md              完整逐页演讲稿
├─ assets/                       PDF 图片、表格裁剪和页面快照
├─ preview/                      PPTX 逐页 PNG、布局检查与 montage
├─ qa/
│  ├─ report.json
│  └─ report.md
└─ codex/
   ├─ source-extracted.txt        PDF 全文
   ├─ source-manifest.json        解析器、页数和资产统计
   ├─ evidence-index.json         页码、block、claim、表格和图片索引
   ├─ codex-storyboard.json       第一版故事板
   ├─ codex-storyboard-revised.json
   ├─ storyboard-editorial-audit.json
   ├─ slides/                     逐页生成缓存与单页预检
   ├─ review.json                 独立终审结果
   └─ auto-revised-plan.json      终审后自动修订计划（如触发）
```

## 6. 查看 HTML

```powershell
node src/serve.mjs --dir dist/paper --port 4173
```

访问：

```text
http://127.0.0.1:4173/presentation.html
```

操作：

- `← / →`、`PageUp / PageDown`：切页；
- `Home / End`：首尾页；
- `N`：显示或隐藏当前页演讲稿；
- 触控左右滑动：切页。

## 7. 单独验证、渲染和终审

```powershell
node src/cli.mjs validate --spec dist/paper/deck.spec.json
node src/cli.mjs render --spec dist/paper/deck.spec.json --format both
node src/cli.mjs qa --input dist/paper --format both
node src/cli.mjs review --input dist/paper
```

论文成品建议同时满足：

- QA 为 `0 errors / 0 warnings`；
- Codex review 为 `pass`；
- 8–10 页；
- 至少 4 页包含有来源的论文证据图或来源核验裁剪；
- 方法步骤、比较维度和连接关系均映射为可编辑元素；
- `train / validation / test / OOD` 口径在标题、图表、结论和演讲稿中保持一致，实验协议不能冒充性能结果；
- 原文截图统一标记为 `source-provenance`，放在主结论、图表或表格之后，不打断核心阅读路径；
- 每页演讲稿约 120–260 字；
- 结论页直接回答开场问题，并区分结论、采用条件和边界。

## 8. SKILL.md 与 Presentation Skill 的作用

工作区 `SKILL.md` 和内置 Presentation Skill 不直接写 PowerPoint 文件，而是参与以下决策：

- 论文汇报面向谁、结束后希望观众能做什么；
- 论文大纲、页面主次、每页唯一主张与证据；
- 页面应该承担解释、比较、证明还是收束任务；
- 阅读顺序、并行分组、流程连接、视觉层级和文字密度；
- 终审时是否存在重复页面、占位文案、未映射内容、证据错配或指标口径越界。

渲染器负责把审核后的语义规格转换成 React 组件和 PowerPoint 原生对象，因此模板参考是“设计语法与约束”，不是锁死内容的母版。

## 9. 常见问题

### Codex 登录失效

```powershell
codex login
```

### `invalid_json_schema`

请确认使用当前项目的 `schemas/`，不要恢复旧版包含不兼容 `oneOf` 或缺少 `additionalProperties: false` 的响应 Schema。

### 生成中断

同一 `--input` 与 `--out` 重新执行即可。桥接器会复用提示内容完全一致的 Codex JSON 和已完成的逐页缓存。

### PPTX 可以编辑吗

标题、正文、指标、流程节点、连接线、原生表格和原生图表均为 PowerPoint 对象；论文截图或裁剪图属于图片资产。

### 为什么仍保留人工复核

自动 QA 能发现结构、密度、图片预算、连接线和溢出问题，但论文证据是否被正确解释、风格是否适合具体场合，仍应由最终使用者复核。
