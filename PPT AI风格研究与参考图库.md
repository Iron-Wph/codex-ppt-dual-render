# PPT AI 风格研究与参考图库

## 目的与边界

本项目把 PPT 风格定义为可执行的**视觉契约**，而不是一次性的配色选择。它约束主题、排版、图像、数据呈现、留白、动效倾向与可访问性；每一页可以选择不同的版式轮廓，但不能脱离同一契约。

公开作品只用于研究“信息层级、构图和素材处理”的共性规则。项目不下载、嵌入或复刻第三方模板、商标、文案和具体页面；`themes/style-references/` 下的三张图均由图像生成器原创生成，用作项目内可版本控制的情绪板。

## 调研参考

| 参考 | 可借鉴内容 | 不应复制的内容 |
| --- | --- | --- |
| [Microsoft：有效演示的设计建议](https://support.microsoft.com/en-us/powerpoint/tips-for-creating-and-delivering-an-effective-presentation) | 远距离可读的字体、简短文本、图形服务叙事、背景一致且高对比 | 微软模板外观与品牌资产 |
| [Microsoft：主题与幻灯片母版](https://support.microsoft.com/en-us/powerpoint/training/what-is-a-slide-master-in-powerpoint) | 主题应包含颜色、字体、效果与成组布局，而不是孤立页面 | 具体内置主题 |
| [Nature Scitable：科研演示页](https://www.nature.com/scitable/topicpage/presentation-slides-13905480/) | 标题应表达结论；一页一个信息点；视觉辅助而非演讲提词器 | 文章示例的具体图文 |
| [USWDS Typography](https://designsystem.digital.gov/components/typography/) | 用留白表达分组和层级；标题应更贴近所引导内容 | 其网站组件外观 |
| [Slidesgo Research 模板集](https://slidesgo.com/research) | 学术叙事常见页面类型：研究问题、方法、证据、限制、结论 | 模板源文件、插图、版式复刻 |
| [Slidesgo Minimalist 模板集](https://slidesgo.com/minimalist) | 极简风格依赖克制色彩、留白、少而强的视觉锚点 | 模板源文件、插图、版式复刻 |
| [Canva Presentation Gallery](https://www.canva.com/presentations/) | 可参考场景化模板分类与图片/媒体占位方式 | Canva 素材、模板与品牌元素 |

## 风格由什么决定

风格选择必须先回答内容问题，后回答审美问题。输入由八类要素组成：

1. **传播任务**：说服、解释、汇报、教学、融资、发布还是答辩。
2. **受众与正式度**：专家、管理层、客户、学生；严谨程度与阅读距离。
3. **主题语义**：研究、工程、产品、战略、品牌、未来科技等。
4. **叙事结构**：问题—方法—证据—结论，或愿景—机会—方案—行动。
5. **内容载荷**：文本、图片、流程、表格、图表、指标各占多少。
6. **素材条件**：是否有论文原图、产品图、人物/场景、可结构化数据。
7. **品牌与场景约束**：品牌色、投影环境、16:9/4:3、是否允许暗底与动效。
8. **可访问性**：文字/背景对比、颜色不能是唯一编码、阅读顺序、替代文本。

输出不是“蓝色科技风”这种模糊标签，而是以下字段：

```json
{
  "style_family": "paper-blue",
  "mood": "credible, academic, clean",
  "layout_families": ["research-title", "evidence-split", "method-flow", "chart-first", "finding-and-limit"],
  "image_treatment": "clean source figures with white framing",
  "table_treatment": "white table surface with blue structural rules",
  "style_markers": ["warm white canvas", "navy thesis", "native chart and table"],
  "avoid": ["poster-like text walls", "colour-only comparisons"]
}
```

## 本项目的四种可执行主题

| 主题 | 适合场景 | 核心构图 | 视觉资源 | 需要避免 |
| --- | --- | --- | --- | --- |
| `paper-blue` | 论文、研究综述、技术汇报 | 浅色画布；左侧结论；右侧证据；图表优先 | 论文裁图、原生表格、条形图 | 大段文字、用颜色作为唯一编码 |
| `signal-dark` | AI 产品发布、前沿技术演示、Demo | 深色画布；大标题；右侧主视觉；信号线 | 原创科技主视觉、指标和系统图 | 过度霓虹、低对比发光文字 |
| `sunset-editorial` | 咨询、战略、管理层汇报、品牌叙事 | 象牙白；大指标；暖调图片；留白 | 建筑/材质/产品图、安静的对照表 | 蓝色企业渐变、均等卡片阵列 |
| `graphite-lime` | 工程、架构、开发者工具、实验性技术 | 石墨黑；荧光证据强调；强信息层级 | 架构图、实验截图、指标条 | 装饰性霓虹、密集仪表盘 |

自动选择时，系统先尊重用户 `--theme`，再尊重 Codex storyboard 的显式选择；没有显式选择时，依据标题、目标、受众、叙事和风格请求进行关键词打分；完全无法判断时才使用稳定哈希回退。这使同一份内容的默认风格可复现，而不是随机漂移。

## 原创参考图

| 风格 | 原创参考图 | 作用 |
| --- | --- | --- |
| 炫酷科技 / `signal-dark` | `themes/style-references/future-tech-signal-v1.png` | 深色层级、轨道主视觉、数据网格、青紫强调 |
| 学术证据 / `paper-blue` | `themes/style-references/academic-evidence-v1.png` | 证据图片、原生图表、表格、批注和留白 |
| 简约编辑 / `sunset-editorial` | `themes/style-references/minimal-editorial-v1.png` | 超大指标、暖调图片、极简对照和留白 |

可直接在浏览器打开 `themes/style-references/index.html` 查看三张图。每次生成时，选中的图会复制到输出目录的 `codex/style-inspiration.png`，随后与 `codex/theme-reference.png` 一起成为逐页 Codex 提示中的视觉输入。

## 生成流程中的落点

```text
用户目标 / 输入内容 / 受众 / 品牌约束
              ↓
style selection（显式主题 → Codex 选择 → 语义打分 → 稳定回退）
              ↓
style brief（颜色、字体、布局族、图片策略、表格策略、禁用项）
              ↓
原创 style inspiration + 可编辑 theme reference PPTX
              ↓
逐页内容规划：每页选择不同 layout family，但继承同一视觉契约
              ↓
HTML / 原生 PPTX / 截图 QA
```

## 质量门槛

- 每页有且只有一个主张；标题优先写“结论”，而非“章节名”。
- 研究页优先原始证据、可编辑表格或图表；产品页优先一张有叙事作用的主视觉。
- 相邻页不连续使用同一版式轮廓；同一套 PPT 至少混用 4 个布局族。
- 背景和文字保持足够对比；关键区分不得只靠颜色。
- 主题图只指导风格，不可作为事实性证据或直接替代论文/产品素材。
- 外部参考只提炼规则；生成结果必须是原创，且保留来源/提示词记录。

## 自定义主题模板约束

每个自定义主题都必须同时声明主题层（背景、颜色、字体、间距、图片/表格/图表处理）、页面层（至少 5 个布局族）和组件层（标题、正文、指标、图片、图注、来源、原生表格与图表）。只替换背景色、字体或表格皮肤，不算一个新主题。

单页图片预算是：封面 0–1 张、图文叙事 1–2 张、证据拼贴最多 3 张、方法/流程/图表/表格通常 0–1 张、结论页 0–1 张。这里的“图片”包括论文 Figure、产品截图、实拍/素材图和生成插图；原生图表、原生表格、图标和形状不计入。超过 3 张必须回退到专门的拼贴布局，且只能保留 1 张主图和最多 2 张有明确语义的辅助图。

表格、段落和背景也有约束：原生表格默认不超过 6 列、7 个数据行；标题最多 2 行且必须表达主张；正文只使用短要点、短句、图注和脚注；背景只能表达层级或情绪，不能降低文字对比或代替证据。整套 PPT 至少使用 4 个布局族，连续页面不得复用同一页面轮廓。

## 当前实现与下一步

当前实现已经把主题元数据、自动选择、原创参考图拷贝和 `style_inspiration` 路径写入 `deck.spec.json`。下一阶段应让渲染器真正消费 `layout_families`：新增全幅图片、指标舞台、时间线、矩阵、故事分屏、拼贴和系统地图等布局，而不只改变主题色。
