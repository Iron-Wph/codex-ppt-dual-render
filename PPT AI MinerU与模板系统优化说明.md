# PPT AI MinerU 与模板系统优化说明

## 1. 本轮结果

本轮将项目从“PyMuPDF 文本抽取 + 4 个硬编码主题”升级为：

```text
PDF
  ↓
Document Parser Router
  ├── PyMuPDF：快速、轻量、适合数字 PDF
  └── MinerU：标题/段落/图片/图表/表格/公式/OCR/阅读顺序
  ↓
evidence-index v0.3
  ↓
Codex Storyboard + Presentation Skill
  ↓
visual_plan
  ↓
10 套外置 Template Manifest
  ↓
HTML + 原生可编辑 PPTX + QA
```

## 2. 解析模式

### 2.1 `auto`

- 检测本机 MinerU CLI。
- MinerU 可用时优先解析论文。
- MinerU 失败时回退 PyMuPDF，并把原因写入 `parser_details.fallback_reason`。
- 不可用时直接使用 PyMuPDF。

### 2.2 `pymupdf`

- 提取页级文本和结构化 text blocks。
- 根据字号推断标题层级。
- 提取嵌入图片、图片 bbox 和邻近图注。
- 使用 `find_tables()` 提取表格、bbox、原生单元格和截图。
- 对包含图片、表格或大量矢量绘制的页面生成 snapshot。
- 不包含针对某一篇论文页码的硬编码。

### 2.3 `mineru`

支持 MinerU `content_list.json` 和 `content_list_v2.json`：

- title / paragraph / list / code；
- image / chart；
- table + HTML 单元格；
- equation / LaTeX；
- bbox、阅读顺序、图注、脚注；
- 图片、表格截图和公式图片复制到项目 `assets/`。

运行示例：

```powershell
node src/cli.mjs generate `
  --input paper.pdf `
  --out dist/paper-mineru `
  --format both `
  --planner local-codex `
  --parser mineru `
  --mineru-backend hybrid-engine `
  --mineru-effort high `
  --theme auto
```

## 3. Evidence Index v0.3

主要新增字段：

```json
{
  "version": "0.3.0",
  "parser": "mineru",
  "parser_details": {},
  "pages": [
    {
      "page": 1,
      "blocks": [
        {
          "id": "p1-block-1",
          "type": "title",
          "reading_order": 1,
          "bbox": [80, 100, 920, 150],
          "text": "1 Introduction",
          "level": 1
        }
      ]
    }
  ],
  "assets": [],
  "tables": [],
  "formulas": [],
  "diagnostics": {}
}
```

这些信息会进入 Codex storyboard 提示，使模型引用真实的图、表、公式和页码，而不是只读取整篇纯文本。

## 4. 模板系统

模板由 `themes/catalog/*.json` 管理，不再只写在 JavaScript 中。模板 Manifest 包含：

- `category / tags / match_signals`；
- `visual_profile`；
- `density / mood / recommended_for`；
- `composition`；
- `typography_treatment`；
- `background_treatment`；
- `image_treatment`；
- `table_treatment`；
- `layout_families / avoid`；
- `colors / fonts / spacing / typography`；
- `style_reference_asset`；
- `provenance`。

新增 6 套模板：

1. `academic-evidence`：证据优先的标准论文汇报。
2. `scientific-plate`：论文图、公式和实验面板。
3. `engineering-blueprint`：系统架构、机器人与工程拆解。
4. `editorial-research`：杂志和研究报告式排版。
5. `consulting-data-story`：结论先行、图表和决策表。
6. `dark-frontier-tech`：AI、机器人和前沿产品发布。

保留 4 个旧主题 ID，已有命令和输出不会因本轮升级失效。

`visual_profile` 是 Manifest 到渲染器之间的视觉语法契约。当前七类轮廓会同时作用于 HTML 和可编辑 PPTX：

- `academic / scientific`：论文网格、测量面板、克制圆角和证据表头；
- `blueprint`：工程制图网格、节点连线和强调边框；
- `editorial`：大留白、引语母题、细分割线和纸张质感；
- `consulting`：结论先行的数据条、强表头和紧凑信息卡；
- `frontier`：暗色舞台、轨道线和高亮科技色；
- `graphite`：中性结构、硬边界和高密度技术卡片。

原生 PPTX 表格使用可编辑单元格，并按主题设置表头、字体、首列和边框；PDF 截图只作为不能稳定结构化时的证据备选。

## 5. 模板网页

```powershell
node src/cli.mjs themes --out dist/theme-gallery
node src/serve.mjs --dir dist/theme-gallery --port 4182
```

浏览器访问：

```text
http://127.0.0.1:4182/
```

模板预览不是一张纯背景，而会同时显示：

- 标题与段落层级；
- 图片框和图注；
- 图表色彩；
- 表格表头与行样式；
- 色板、标签和模板 ID。

## 6. QA 和回归

运行：

```powershell
npm test
node src/cli.mjs generate --input examples/demo.md --out dist/optimization-smoke --format both --planner deterministic --theme academic-evidence
node src/cli.mjs qa --input dist/optimization-smoke --format both
```

单元测试覆盖：

- MinerU legacy content list；
- MinerU v2 page-grouped content list；
- 图、表、公式和图注归一化；
- HTML 表格转原生单元格；
- Evidence Index v0.3；
- 10 套模板加载；
- 旧主题兼容；
- 论文语义自动选择 `academic-evidence`。

完整回归还应至少用同一份内容生成两种视觉差异明显的主题，并比较 `preview/pptx-001.png`，避免“模板 ID 不同但版式相同”的回归。

## 7. 版权边界

模板系统参考的是 Codex Slides 的“风格目录和 style grammar”方法，不复制其社区预览图片、原文案或固定页面构图。本项目模板的 Token、布局约束和参考图按原创资产维护，并在 Manifest 中保留 `provenance` 字段。
