---
name: scientific-figure-structure
description: 将论文内容、graphical abstract 指南与 scientific illustration 原则编译为科研图“结构层”规范。凡是用户需要从论文文本提炼 key message、判断 figure type、定义 reading order / grouping / arrow semantics / text density、输出 machine-readable schema、或审查 graphical abstract / summary figure / overview figure / mechanism figure / method figure 的结构方案时，都应优先使用这个 skill。即使用户只说“帮我设计科研图”或“做一个 graphical abstract”，只要核心问题是结构组织而不是像素级美术风格，就要触发。
---

# Scientific Figure Structure Skill

这个 skill 服务于科研绘图自动化流程中的“结构层（structure layer）”。

- 它负责把论文内容压缩成可执行的图结构规范。
- 它不负责最终审美风格，也不直接替代数据图统计规范。
- 它输出给下游 HTML / CSS / Pretext / SVG / renderer 的，不是模糊提示词，而是可审查、可打分、可修正的 schema。

如果用户要求的是最终画面风格、品牌视觉、像素级修饰、期刊专属上色或软件操作教程，这个 skill 只能提供结构约束与交接要求，不能假装已经完成风格层与渲染层。

---

## 使用方式

当这个 skill 被调用时，按以下顺序工作：

1. 先确认当前任务是否属于结构层，而不是纯风格层。
2. 从论文、摘要、方法描述、结果结论或现有图草稿中提炼唯一主旨。
3. 根据内容关系类型选择 figure type 和 layout pattern。
4. 生成 reading order、grouping、hierarchy、arrow semantics、text density 规则。
5. 产出 machine-readable schema。
6. 按 Review Checklist 做自检。
7. 若失败，进入 revision loop，而不是直接输出一版“好看但不可执行”的草图。

---

# Part A. Reference Cards

## Card S1

- `source_id`: `S1`
- `source_title`: `Ten simple rules for designing graphical abstracts`
- `source_type`: `practical_tutorial`
- `primary_scope`: `graphical_abstract`
- `core_claims`:
  - 图形摘要首先要有清晰的单一核心信息，否则后续布局、图标、文字与颜色都无法成立。
  - 图形摘要需要明确阅读方向、明确箭头语义、控制文字与颜色复杂度，并通过分组降低认知负荷。
  - 图标、数据图、文字、颜色都应服务于信息传达，而不是装饰。
  - 反馈和迭代是设计流程的一部分，不是可选附加项。
- `hard_constraints`:
  - 图在小尺寸预览中也要可理解，因此布局必须有清晰入口与方向。
  - 若同一图里使用两种箭头样式，必须在视觉上可区分并解释其含义。
  - 颜色不能承担唯一信息通道；需要考虑色盲与对比度。
  - 图标应保持统一的线宽、配色和细节级别。
- `soft_principles`:
  - 用一两句 punchy 的 key message 先约束图，再画图。
  - 优先选读者短时间内能识别的简单图表。
  - 可用 Gestalt 原则做 proximity、similarity、closure、continuity 分组。
  - 标题和注释应尽量简短，避免行话。
- `structure_rules`:
  - 先定 message，再定 visual key，再定 layout，再补 text 与 color。
  - 线性过程优先左到右；循环过程可用 circular；静态对比可用 parallel 或 nesting。
  - 箭头既可以强化阅读顺序，也可以标出对主阅读方向的局部偏离。
  - 用 chunking 而不是把所有元素平铺。
- `layout_patterns`:
  - linear
  - circular
  - parallel
  - nesting
- `reading_order_rules`:
  - 布局必须给出 clear entry point。
  - 通常遵循 left-to-right、top-to-bottom。
  - 线性过程最适合 left-to-right。
- `hierarchy_rules`:
  - 先表达 central message，再布置 supporting details。
  - [Inference] 虽然文中没有给出正式 hierarchy taxonomy，但其“先 key message、后 layout、后 text/color”的流程隐含了主次分层。
- `grouping_rules`:
  - 利用 proximity、similarity、closure、continuity 形成“组块”。
  - 盒子可被留白替代，只要分组关系仍清晰。
- `arrow_connector_rules`:
  - 箭头是 explanatory graph 的关键语义元素。
  - 相同箭头可能表达 sequence、movement、increase、positive connotation、cycle 等不同语义，因此必须在上下文中澄清。
  - 混用多类箭头时必须解释。
- `text_rules`:
  - 图文结合有助于理解复杂过程。
  - 文本可以补充无法图像化的专有名词，也可以为歧义图形提供标签。
  - 标题和注释保持简短、少术语、少非常用缩写。
- `icon_pictogram_rules`:
  - 图标要风格一致。
  - 不同来源图标如混用，必须在矢量层面做风格对齐。
- `chart_rules`:
  - 只有当 pictogram 不能承担核心信息时才引入数据图。
  - 优先短时间可读的 bar / pie / line 等熟悉图型。
  - 高级方法图只可当 placeholder，不应把细节塞进 thumbnail 级图里。
  - 轴、刻度、图例等可在必要时省略。
- `color_rules`:
  - 颜色可以做突出、对比、编码数量或模拟自然外观。
  - 颜色含义必须一致，图形摘要与正文之间也不应改码。
  - 色彩应节制，防止分散注意力。
- `accessibility_rules`:
  - 提供 accompanying text / alt-text。
  - 不把颜色作为唯一编码通道。
  - 避免红绿组合与低对比度。
  - 前景/背景对比建议至少 4.5:1。
  - 输出分辨率要允许打印和缩放阅读。
- `journal_facing_constraints`:
  - 图形摘要经常以接近邮票大小显示。
  - 需考虑 square 或小型 landscape 显示面。
- `anti_patterns`:
  - key message 不清
  - 箭头语义不清
  - 图标风格不一致
  - 高级图表过细节
  - 颜色过多或改码
- `examples_or_templates`:
  - 线性、循环、并行、嵌套布局示意
  - 常见箭头类型
  - 常见简化图表
- `limitations`:
  - 以 graphical abstract 为主，对 summary figure / overview figure 的长篇叙事支持有限。
  - 对 machine-readable schema 没有直接规范。
  - 自动审查与迭代修正机制没有形式化。
- `confidence`: `high`
- `source_takeaway_for_skill`:
  - 最有价值的是其“从 key message 到 layout、arrows、text、color、feedback”的顺序化设计流程，可直接转写为自动化 SOP。
## Card S2

- `source_id`: `S2`
- `source_title`: `Graphical Abstracts: Understanding the Role of Factors and Design Patterns`
- `source_type`: `design_research`
- `primary_scope`: `graphical_abstract`
- `core_claims`:
  - 图形摘要存在稳定可识别的设计空间，可从 layout、depiction of time、text usage、representational genre 四个维度编码。
  - layout 不是中性的；它隐含了图的“逻辑”。
  - 图里可以同时存在多个 design pattern，同一维度并非互斥单选。
  - 文字与视觉结合常常是必需的，尤其在表达过程时。
- `hard_constraints`:
  - 没有硬性投稿规范意义上的 mandatory constraint；这是研究型归纳，不是出版社强制格式。
  - [Inference] 该文的“硬约束”更接近稳定认知规律，而非 submission checklist。
- `soft_principles`:
  - 布局选择会塑造读者对研究逻辑的理解。
  - 时间表达通常借由空间映射、箭头、枚举或少量符号完成。
  - 文本锚定程度会影响理解负担。
  - 表征类型的 iconicity 会传递额外语义，不只是“画法不同”。
- `structure_rules`:
  - linear layout 提供最明确顺序。
  - forking、nesting、parallel、orthogonal、centric 会逐渐增加顺序歧义。
  - 如果图想表达 temporality，需明确决定 time 是靠空间、箭头、枚举还是符号来编码。
  - label、legend、caption、commentary 的锚定程度不同，结构作用也不同。
- `layout_patterns`:
  - linear
  - zig-zag
  - forking
  - nesting
  - parallel
  - orthogonal
  - centric
  - single
- `reading_order_rules`:
  - 西方常见隐含顺序是 left-to-right 与 top-down。
  - 箭头与枚举可强化原本含糊的顺序。
  - orthogonal / centric 容易出现 ambiguity。
- `hierarchy_rules`:
  - layout 与 text anchoring 会隐式创建 hierarchy。
  - nested frame 常承担细节补注或尺度变化。
- `grouping_rules`:
  - parallel 表达替代方案或不同视角的并置。
  - orthogonal 把不同维度映射到 horizontal 与 vertical。
  - centric 把信息划分为 center 与 periphery。
- `arrow_connector_rules`:
  - arrows 最常用于两类语义：sequence between pictures 与 dynamic movement/action。
- `text_rules`:
  - text usage 包括 index、label、legend、caption、commentary。
  - labels 锚定最强，commentary 锚定最弱。
  - 多模态整合有助于复杂现象理解。
- `icon_pictogram_rules`:
  - representational genre 不是单一“图标”问题，而是从 photograph、scientific visualization、illustration、data visualization、symbolic notation、schema 形成 iconicity 光谱。
- `chart_rules`:
  - data visualization 适合抽象数据与统计关系，但其与 schema、symbolic notation 的差别在于是否在表达具体观测实例。
- `color_rules`:
  - 该文不把颜色当独立主轴系统讨论。
  - `not_explicitly_stated`
  - [Inference] 颜色更多作为 supporting cue 而非 primary coding dimension。
- `accessibility_rules`:
  - `not_explicitly_stated`
  - [Inference] 该文更偏结构认知分析，不提供无障碍操作规范。
- `journal_facing_constraints`:
  - `not_explicitly_stated`
  - [Inference] 研究样本来自已发表图形摘要，因此隐含了“小视窗快速浏览”的使用场景。
- `anti_patterns`:
  - ambiguous reading order
  - unclear hierarchy in orthogonal/centric layouts
  - commentary 与图面局部失锚
  - representational genre 混用却无结构理由
- `examples_or_templates`:
  - Fig.2 design space
  - parallel / orthogonal / nested examples
  - text-usage 与 representational-genre 类别
- `limitations`:
  - 研究对象是 54 个 graphical abstracts，不能直接当成所有科研图的硬性标准。
  - 没有给出自动化生成步骤与 schema。
  - 对投稿尺寸、分辨率、字体等发表约束没有覆盖。
- `confidence`: `high`
- `source_takeaway_for_skill`:
  - 最大价值在于把“结构层”分解为 layout、time、text anchoring、representational genre 四个可编码维度，这正适合转成 machine-readable schema。
## Card S3

- `source_id`: `S3`
- `source_title`: `Elsevier: Graphical abstract`
- `source_type`: `publisher_guideline`
- `primary_scope`: `graphical_abstract`
- `core_claims`:
  - 图形摘要是在线浏览环境中的单屏概览，目的是帮助跨学科读者快速判断论文是否相关。
  - 图形摘要要在 single glance 下传达 take-home message。
  - 结构上必须有 clear start and end，并且减少干扰和杂乱。
- `hard_constraints`:
  - 单独提交为独立文件。
  - 最小尺寸 1328 x 531 像素，300 dpi，比例约为 500:200。
  - 字体需在缩小到约 200 像素高窗口时仍可读。
  - 文件类型优选 TIFF / EPS / PDF / MS Office。
  - 不要在图文件里额外放 synopsis、标题“graphical abstract”或无必要空白。
- `soft_principles`:
  - 用简洁、可及、视觉上刺激浏览的概览图促进传播。
  - 可以引入 context、methodology、main outcome，但需压缩成一眼可扫读的形式。
- `structure_rules`:
  - 应当有明确起点与终点。
  - 最好 top-to-bottom 或 left-to-right。
  - 减少 distracting / cluttering elements。
- `layout_patterns`:
  - 文章未给出 taxonomy。
  - `not_explicitly_stated`
  - [Inference] 对 linear / simple overview 有明显偏好，因为要求 clear start and end。
- `reading_order_rules`:
  - top-to-bottom 或 left-to-right 是推荐默认顺序。
- `hierarchy_rules`:
  - `not_explicitly_stated`
  - [Inference] single glance 和 small-window 使用场景要求单主旨与明显主次。
- `grouping_rules`:
  - `not_explicitly_stated`
  - [Inference] 减少 clutter 等价于要求分组清晰而非平铺。
- `arrow_connector_rules`:
  - `not_explicitly_stated`
  - [Inference] 若需要 start/end 语义，连接件需服务于单方向浏览。
- `text_rules`:
  - 任何必要文字必须嵌入图像本体。
  - 由于会缩小显示，字体必须足够大。
- `icon_pictogram_rules`:
  - `not_explicitly_stated`
- `chart_rules`:
  - `not_explicitly_stated`
- `color_rules`:
  - `not_explicitly_stated`
- `accessibility_rules`:
  - 该页明确使用“accessible”但没有给出详细色盲/对比度规范。
  - [Inference] 对可及性的要求主要体现在简洁、缩小可读和跨学科扫读。
- `journal_facing_constraints`:
  - 在线检索列表、目录列表与 ScienceDirect 页面中的缩略呈现是核心语境。
  - 通常不出现在 PDF 或纸本中。
- `anti_patterns`:
  - 无 clear start/end
  - clutter
  - 多余留白
  - 缩小后字体失读
  - 图内额外文字区块与题头
- `examples_or_templates`:
  - 提供 visual/graphical abstract template 与若干示例。
- `limitations`:
  - 是出版方页面，不是设计研究。
  - 没有详细说明如何决定图类型、如何做自动审查、如何定义 arrow semantics。
- `confidence`: `high`
- `source_takeaway_for_skill`:
  - 对自动化系统最关键的是其明确的浏览场景与 submission constraints，可作为 journal-facing hard constraints。
## Card S4

- `source_id`: `S4`
- `source_title`: `Nature Scientific Illustration Author Guide`
- `source_type`: `publisher_guideline`
- `primary_scope`: `scientific_illustration`
- `core_claims`:
  - 概念图的首要目标是可理解性，而不是“画得漂亮”。
  - hierarchy、clarity、visual editing、accessibility 是概念图的核心原则。
  - 真正的 figure 通常展示 process 或 phenomenon，而不是被图标包装过的列表。
- `hard_constraints`:
  - 每个元素必须被定义。
  - 首次出现的对象应被标注。
  - 不应只靠颜色定义类别。
  - 不应使用多种不明含义的箭头权重和样式。
  - 避免 red/green 组合。
  - 文本优先使用黑色。
  - 草稿文字至少 7pt。
- `soft_principles`:
  - 最重要元素更饱和、更详细；背景元素更中性、更简化。
  - 先问 essential elements 是什么，再问可以删掉什么。
  - 背景共享中性色，重点用强调色。
- `structure_rules`:
  - 图要有信息层级，对应视觉层级。
  - 使用 figure parts 与 subheadings 建立结构。
  - 合并冗余步骤，减少歧义箭头。
  - 如果一个所谓“图”只是分类概念列表，通常应改成列表或表格。
- `layout_patterns`:
  - 未系统列 taxonomy。
  - 但明确区分 true figure 与 faux figure。
- `reading_order_rules`:
  - “guide the eye to the most important information first” 实质上要求明确定义 focal path。
  - [Inference] 图面必须先让读者知道看哪里，再决定往哪里读。
- `hierarchy_rules`:
  - 颜色饱和度、细节密度、背景/前景对比都应用于 hierarchy。
  - figure parts 与 subheadings 是结构层级工具。
- `grouping_rules`:
  - 复杂图或多面板图可用颜色辅助 group elements。
- `arrow_connector_rules`:
  - 不要用多种不清楚含义的箭头。
  - 通过合并步骤与单一箭头可减少歧义。
- `text_rules`:
  - 所有元素必须在 label 或 legend 中被解释。
  - 文本不能太小；至少 7pt。
  - figure parts 与 subheadings 有助于结构理解。
- `icon_pictogram_rules`:
  - 不要为装饰而使用 icons。
  - icons 只有在能提供理解与上下文时才有价值。
- `chart_rules`:
  - 该指南主要针对 conceptual figures，而非 data figures。
  - `not_explicitly_stated`
- `color_rules`:
  - 颜色用于 hierarchy、categorising information、scientific conventions / real-world depiction。
  - 重点元素用强调色，背景元素用中性色。
  - 不要随机、多而无章地用色。
- `accessibility_rules`:
  - 检查 color blindness 和 contrast。
  - 黑字优先。
  - 避免 red/green。
  - 遵守 text-on-color 可读性规则。
- `journal_facing_constraints`:
  - 草稿会被编辑团队重绘与重构，不应假设“一稿可直接发表”。
  - 概念图不是数据图；本指南主要面向 summary / explanatory figures。
- `anti_patterns`:
  - decorative icons
  - color-only definition
  - ambiguous arrows
  - faux figure
  - overcrowded figure
  - too many colours / random colour use
- `examples_or_templates`:
  - hierarchy / clarity / accessibility before-and-after examples
  - faux figure vs true figure
  - overcrowding examples
- `limitations`:
  - 主要面向 Nature 编辑协作语境，不等于普适投稿标准。
  - 对 machine schema、自动审查与 HTML/renderer 接口没有覆盖。
- `confidence`: `high`
- `source_takeaway_for_skill`:
  - 最有价值的是把“结构可理解性”变成 visual editing 过程：删冗余、保主线、定义每个元素、反对 faux figure。
---

# Part B. Cross-source Alignment

## 1. unified_term_dictionary

| 统一术语 | 定义 | 来自哪些来源 |
| --- | --- | --- |
| `key_message` | 图必须优先传达的唯一核心命题，而非论文全貌 | S1, S3, S4 |
| `figure_goal` | 图要完成的任务，如概览、解释机制、展示方法流程、做对比 | S1, S3, S4 |
| `layout_pattern` | 图面二维空间中组织节点与组块的结构模式 | S1, S2 |
| `reading_order` | 读者应当按何顺序进入、推进、结束阅读 | S1, S2, S3 |
| `visual_hierarchy` | 图中一级、二级、三级信息的显著性排序 | S4, S1 |
| `grouping_strategy` | 如何用 proximity / similarity / containment / connector 把元素组织成组 | S1, S4 |
| `connector_semantics` | 箭头或连线的明确语义，如流程、因果、移动、放大说明 | S1, S2, S4 |
| `text_anchoring` | 文本与其所指对象的锚定强弱 | S2 |
| `representational_genre` | 用 photograph / illustration / chart / schema 等哪一类表示方式 | S2, S1, S4 |
| `journal_constraints` | 尺寸、缩放、字体、单文件提交、在线浏览等发表场景约束 | S3, S4 |
| `accessibility_constraints` | 色盲、对比度、最小字体、颜色非唯一编码等限制 | S1, S4 |
| `review_flags` | 自动审查阶段记录的失败项与风险 | [Inference] |

## 2. synonym_mapping

| 同义词集合 | 统一映射 |
| --- | --- |
| reading direction / direction / flow / start-end | `reading_order` |
| emphasis / focus / salience / hierarchy | `visual_hierarchy` |
| arrangement / composition / organization / layout | `layout_pattern` |
| cluster / grouping / chunk / containment | `grouping_strategy` |
| arrows / connectors / lines / paths | `connector_semantics` |
| label / annotation / caption / commentary / legend | `text_role` |
| genre / representation / depiction type | `representational_genre` |
| clutter / overcrowding / cognitive overload | `density_failure` |
| take-home message / main message / central message | `key_message` |
| faux figure / decorative figure / dressed-up list | `non-figure artifact` |

## 3. concept_boundary_notes

- `structure` vs `style`：
  - `structure` 关心信息选择、节点关系、阅读顺序、分组、主次层级、图型选择、注释分配。
  - `style` 关心具体笔触、品牌色板、阴影、纹理、插画风格、线条性格。
  - 若一个决定改变了“读者先看到什么、再看到什么、知道哪些东西属于一组”，它属于 structure；否则更可能属于 style。
- `hierarchy` vs `emphasis`：
  - `hierarchy` 是全局排序；`emphasis` 是某一局部用来提升显著性的手段。
  - 颜色加深、尺寸放大、细节增加是 emphasis；一级/二级/三级节点定义是 hierarchy。
- `grouping` vs `containment`：
  - grouping 是上位概念；containment 只是其中一种实现方式。
  - proximity、similarity、alignment、connector、background plate 也都可以组成 grouping。
- `layout_pattern` vs `reading_order`：
  - layout_pattern 定义空间组织形式；reading_order 定义读者应如何浏览。
  - 一个 parallel layout 可以只有弱 reading order；linear layout 则通常内含强 reading order。
- `icon usage` vs `representational genre`：
  - icon 只是 representation 的一种低细节实现。
  - representational genre 还包括 photograph、illustration、chart、schema、scientific visualization。
## 4. conflict_table

| conflict_id | conflicting_sources | issue | why_conflict_exists | resolution | adopted_rule | rejected_alternative | rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `C1` | S2 vs S3 | S2 允许 parallel / orthogonal / centric 等弱顺序布局；S3 强调 clear start/end | 研究论文描述现有设计空间，出版社页面强调浏览效率 | 以出版浏览场景为上位约束 | 在 graphical abstract 场景中，若使用弱顺序布局，必须额外补强起点、局部顺序与结束点，否则降级为不推荐。`[Adopted after conflict resolution]` | “任何被观察到的 layout 都默认可用” | 被观察到不等于适合在线浏览缩略场景。 |
| `C2` | S1 vs S4 | S1 鼓励图文整合；S4 强调删冗余与避免 faux figure | 一个侧重解释性整合，一个侧重编辑压缩 | 允许文字，但要求文字有结构角色 | 文本只在 label / short phrase / concise caption / legend 有明确结构作用时进入图面；若只是列概念，应外移到标题、图注或表格。`[Adopted after conflict resolution]` | “能写在图里就尽量写” | 文本并非越多越清楚，过量会把图退化成段落。 |
| `C3` | S1 vs S4 | S1 允许多类箭头，只要解释；S4 反对不清楚的多箭头系统 | 一个从表达能力看问题，一个从编辑可懂性看问题 | 保留多语义可能，但提高门槛 | 一图可共存多种 connector semantics，但每种语义必须一一对应到稳定样式，并在局部或图例中解释。`[Adopted after conflict resolution]` | “统一用一种箭头解决所有关系” | 单一箭头会让 sequence、causality、callout 混淆。 |
| `C4` | S2 vs S4 | S2 把 representational genre 视为可变维度；S4 反对 decorative icons | 研究归纳与编辑规范关注点不同 | 引入“信息贡献”判据 | 只要某种表示方式不能增加区分、上下文或可理解性，就不能因审美而加入。`[Adopted after conflict resolution]` | “为丰富画面可混入额外 icon” | 这会增加噪声并诱发 faux figure。 |
| `C5` | S1 vs S3 | S1 提到 square 与不同版面；S3 给出宽幅 500:200 比例 | 图像适用平台不同 | 以目标刊物要求优先 | 若目标明确是 Elsevier graphical abstract，采用 500:200 近似宽幅比例；否则按目标载体定义，但仍遵守缩小浏览可读性。`[Adopted after conflict resolution]` | “所有平台都用同一比例” | 平台约束优先于通用经验。 |
| `C6` | S1 vs S4 | S1 允许用方法特定图表作 placeholder；S4 强调每个元素必须清楚定义 | 方法占位符对圈内读者有帮助，但对跨学科浏览可能失效 | 用 audience gating 解决 | 只有当目标受众能识别该 chart-as-symbol，且它比 pictogram / schema 更高效时才允许使用；否则改成更通用的结构符号。`[Adopted after conflict resolution]` | “高级图表可默认充当方法图标” | 跨学科读者常无法从方法图细节中获益。 |

## 5. precedence_rule

按以下优先级采纳规则：

1. 出版社 / 期刊明示的 submission hard constraints。
2. 多个来源的一致共识，如 clear reading order、减少 clutter、定义每个元素、避免颜色唯一编码。
3. 设计研究中稳定、可泛化的结构规律，如 layout taxonomy、text anchoring、representational genre。
4. 单篇文章中的经验性建议，如特定工具、特定图标库、具体配色网站。

## 6. knowledge_gaps

当前来源没有充分覆盖，但对自动化科研绘图很重要的空白如下：

- 如何把结构规则编码成 machine-readable schema。`[Inference]`
- 如何为自动布局器提供 layout constraints、node sizing、text slot 与 connector routing 接口。`[Inference]`
- 如何自动检测失败结构并进入 revision loop。`[Inference]`
- 如何把 HTML / Pretext / SVG 渲染能力与结构层解耦。`[Inference]`
- 如何跨学科自适应“方法图 vs 概念图 vs 数据图”的切换边界。`[Inference]`
- 如何为同一论文自动生成不同发行场景版本，如 thumbnail GA、review summary figure、talk slide overview。`[Inference]`

当前来源不足以支持强规则，仅可给出保守建议的点：

- “图太挤”的通用数值阈值。
- “焦点过多”的统一上限。
- 不同学科对图标抽象度的最佳默认值。
- 不同阅读文化中的阅读方向差异。

---

# Part C. Final Skill Document

## 1. Purpose

这个 skill 的目标，是把论文内容或科研结论转换成“科研图结构层规范”，供下游布局系统与渲染系统执行。

它服务于如下自动绘图流程：

1. 输入论文标题、摘要、方法、结果、结论或草稿图说明。
2. 提炼唯一 `key_message` 与图的 `figure_goal`。
3. 识别实体、关系、时间性、比较维度与受众。
4. 选择 `figure_type` 与 `layout_pattern`。
5. 定义 `reading_order`、`groups`、`hierarchy`、`edges`、`text_role`。
6. 导出 machine-readable schema。
7. 交给 HTML / Pretext / SVG / renderer 做布局与视觉实现。
8. 对初稿做结构审查并迭代修正。

对“科研图的结构层”的明确定义：

- 它是“信息如何被压缩、排序、分组、连接并映射到二维空间”的规则集合。
- 它不等于颜色风格、插画风格、品牌纹理。
- 它也不等于最终像素坐标；像素坐标属于渲染层的输出结果。

## 2. Non-goals

这个 skill 不负责以下内容：

- 不直接生成最终审美风格，不替代插画师或期刊美编的风格决策。
- 不替代统计图规范，不判断统计方法是否正确。
- 不负责具体软件操作步骤，如 Illustrator / PowerPoint / BioRender 的按钮级教程。
- 不直接完成像素级修图、阴影、材质、纹理、品牌统一。
- 不把整篇论文搬进图里。它只保留结构必要信息。

## 3. Applicability

适用对象：

- graphical abstract
- summary figure
- overview figure
- Figure 1 方法总览图
- mechanism figure
- conceptual figure
- system figure
- process / workflow / pipeline figure
- comparison / before-after / baseline-vs-method figure

不适用或仅部分适用：

- 纯数据图，如单独的统计图、散点图、箱线图、热图；这类图需要数据可视化专门规范。
- 纯风格类插画委托，如封面插图、宣传海报。
- 纯列表、纯分类表述、无 action / process / phenomenon 的“faux figure”。
- 需要严格实验测量精度表达的专业图表排版。

## 4. Core Design Philosophy

统一设计哲学如下：

- 不追求“看起来专业”，而追求“读者能迅速构建正确的心理模型”。
- 不追求“元素齐全”，而追求“主旨唯一、辅证有序、关系可读”。
- 不追求“风格丰富”，而追求“语义稳定、表示一致、噪声受控”。
- 不把“简洁”理解为元素少，而理解为“每个元素都贡献信息，且没有冗余竞争”。
- 不把“高级感”理解为抽象，而理解为“层级明确、编码一致、缩小后仍可理解”。

抽象审美词的规则化转写：

| 抽象说法 | 必须改写成的结构规则 |
| --- | --- |
| 简洁 | 删除不贡献主旨、分组、方向或定义的元素 |
| 清爽 | 控制组间留白与跨组连线数量，避免无结构堆叠 |
| 专业 | 遵守投稿尺寸、文字可读性、颜色语义稳定性与图型匹配 |
| 科研感 | 使用与内容匹配的表示类型，而不是随意增加实验器材图标 |
| 现代 | 不作为结构规则使用；若无法改写为操作项，禁止保留 |
| 高级 | 不作为结构规则使用；改写为“层级可感、缩小可读、无 faux figure” |

## 5. Information-to-Structure Transformation Pipeline

### Step 0. 定义输入包

- 输入至少包括：`paper_context`、`target_figure_goal`、`audience`、`publication_context`。
- 若缺 `publication_context`，默认按“在线缩略浏览 + 论文正文配套阅读”的保守场景处理。`[Inference]`

### Step 1. 提取 key message

Rule Name: Key Message Compression
- Intent: 把论文压缩成图能承担的一句话主旨。
- Applies To: 所有 figure types。
- Why It Exists: 没有唯一主旨，图会退化成杂乱目录。
- How To Execute:
  - 用一句话回答“读者看完图后必须记住什么”。
  - 再回答“如果删掉所有次要信息，只剩 3 个内容块，应保留什么”。
  - 若得到多个并列主旨，拆成主旨 + supporting claims，而不是并列塞入同一图。
- How To Detect Violation:
  - 同一图需要两个以上标题才能解释。
  - 图中存在两个互不从属的 focal cluster。
- Typical Failure: 同时想讲背景、方法、结果、意义四条主线。
- Revision Strategy: 选一条主叙事，其他内容降为支撑块或图注。
- Rule Level: `Level A`
如何从论文文本中提取 key message，而不是把整篇论文塞进图里：

1. 先找论文的 claim sentence，而不是摘要第一句。`[Inference]`
2. 如果论文是方法论文，key message 通常是“方法解决了什么瓶颈，以及输出什么结果”。`[Inference]`
3. 如果论文是机制论文，key message 通常是“哪些实体通过何机制产生何结果”。`[Inference]`
4. 如果论文是综述/overview，key message 通常是“领域如何被组织，以及读者该如何理解版图”。`[Inference]`
5. 任何与主旨无直接因果、步骤、比较、证据关系的内容，都不进入结构层主体。

### Step 2. 提取 key entities

- 抽取 `entities`：对象、过程、状态、输入、输出、环境、证据节点。
- 为每个实体标注：
  - `entity_type`: actor / material / process / state / evidence / context / outcome
  - `importance_level`: primary / secondary / tertiary
  - `representational_need`: pictogram / illustration / chart / text-only / schema
### Step 3. 识别关系类型

- 识别以下关系：
  - `sequence`
  - `causality`
  - `transformation`
  - `comparison`
  - `containment`
  - `part_of`
  - `feedback`
  - `correspondence`
  - `evidence_support`
  - `zoom_in`
- 若一对节点没有明确关系类型，就不应直接连线。`[Inference]`
### Step 4. 判断图类型

- 根据主关系类型选择 `figure_type`。
- 若主关系是时间推进，优先 process family。
- 若主关系是并列方案差异，优先 comparison family。
- 若主关系是系统构成与层次，优先 overview / layered / centric family。
- 若主关系是局部解释主图，优先 nesting。
### Step 5. 选择布局模式

- 先选能最好映射主关系的 layout，而不是最“丰富”的 layout。
- 若 layout 不能自然承载 reading order，就必须补强 arrows / enumeration / subheadings。

### Step 6. 确定 reading order

- 定义 `entry_point`、`midpoints`、`end_state`。
- 要求：
  - 3 秒内能抓住主旨。
  - 15 秒内能读懂主流程。
  - 局部插图或局部说明不能打断主线。`[Inference]`
### Step 7. 确定 hierarchy 与 grouping

- 把所有内容分为三级：
  - 一级：key message 主链路
  - 二级：解释主链路所必需的上下文 / 机制 / 对比
  - 三级：例外、补充、细节、缩放局部
- 再定义 grouping strategy：
  - proximity
  - similarity
  - containment
  - background plate
  - connector-based grouping
### Step 8. 设定文字密度

- 每个节点必须决定 text role：
  - none
  - label
  - short_phrase
  - sentence
  - caption
  - legend
  - callout
- 若文字只是解释布局本身，而不是图内容，说明结构失败，应先改结构。`[Inference]`
### Step 9. 输出结构层 schema

- 输出必须至少含：
  - `figure_goal`
  - `figure_type`
  - `audience`
  - `reading_order`
  - `nodes`
  - `edges`
  - `groups`
  - `hierarchy`
  - `annotations`
  - `layout_constraints`
  - `accessibility_constraints`
  - `journal_constraints`
  - `review_flags`
- [Inference]

### Step 10. 进入下游布局与渲染

- 结构层输出给布局器的是“语义约束”，不是固定坐标。
- 渲染器可以根据载体在 style layer 做变化，但不能破坏：
  - reading order
  - hierarchy
  - grouping
  - connector semantics
  - text anchoring
### 失败风险

- 主旨不唯一
- 图类型选错
- reading order 歧义
- 组块太多而无主链
- 文本补洞过多
- 表示类型与内容不匹配
- schema 中缺 publication constraints

## 6. Figure Type Taxonomy

### Layout Pattern: pipeline
- Definition: 明确输入到输出的多步骤流程，节点串联，通常单主链。
- Suitable For: 方法流程、实验处理链、数据处理链。
- Unsuitable For: 多个同权对比、无时间关系的概览图。
- Reading Direction: 默认 left-to-right；空间不足时 top-to-bottom。
- Required Structural Conditions: 单一主链、步骤间存在顺序依赖。
- Common Mistakes: 每步塞太多解释、把分支例外混进主链。
- Machine-friendly Representation: `narrative_structure = "sequential"`。
- Example: 样本采集 → 预处理 → 模型 → 输出。
- Strengths: 顺序清晰、最适合缩略浏览。
- Risks: 容易线性化过度，掩盖并行或反馈。
- Typical Failure Modes: 把并行结果强行串成时间顺序。
### Layout Pattern: linear
- Definition: 广义线性结构，未必是方法 pipeline，但有单一阅读主线。
- Suitable For: 生物过程、病程演进、概念链。
- Unsuitable For: 多维映射、矩阵对照。
- Reading Direction: left-to-right 或 top-to-bottom。
- Required Structural Conditions: start / middle / end 明确。
- Common Mistakes: 局部 zoom-in 打断主线。
- Machine-friendly Representation: `layout_pattern = "linear"`。
- Example: 刺激 → 信号激活 → 细胞反应。
- Strengths: 可读性高。
- Risks: 对复杂系统表达不足。
- Typical Failure Modes: 用过多交叉箭头破坏直线逻辑。
### Layout Pattern: forking
- Definition: 在单主线中至少一次分出多个后续路径。
- Suitable For: 分化、决策树、不同处理路径。
- Unsuitable For: 所有路径都同等重要且互相独立的并行比较。
- Reading Direction: 先主干，后分支。
- Required Structural Conditions: 分支点必须显著；分支必须有命名。
- Common Mistakes: 分支无主次、无终点。
- Machine-friendly Representation: `edges` 中存在 one-to-many branch node。
- Example: 共同前处理后进入两个实验条件。
- Strengths: 能表达 divergence。
- Risks: 焦点过多。
- Typical Failure Modes: 三个以上分支同时争夺注意力。
### Layout Pattern: parallel
- Definition: 多个替代方案、状态或视角并置展示。
- Suitable For: 基线 vs 方法、条件 A/B、器官间对比。
- Unsuitable For: 强因果推进过程。
- Reading Direction: 通常先整体比较，再局部逐列/逐行。
- Required Structural Conditions: 比较维度统一，对齐一致。
- Common Mistakes: 每列结构不同，无法对齐比较。
- Machine-friendly Representation: `narrative_structure = "juxtaposition"`。
- Example: 对照组与处理组并列。
- Strengths: 最适合显式比较。
- Risks: 若无共同参照轴则阅读顺序弱。
- Typical Failure Modes: 靠颜色区分两组但布局不对齐。
### Layout Pattern: comparison
- Definition: 一类专门以差异点为核心的 parallel 结构。
- Suitable For: before/after、old/new、baseline/method、normal/disease。
- Unsuitable For: 无明确对照关系的概览。
- Reading Direction: 先识别比较对象，再读差异项。
- Required Structural Conditions: 对照项同位、同尺度、同语义位置。
- Common Mistakes: 左右内容量差太大，导致一侧成主角。
- Machine-friendly Representation: `comparison_axes` 明确列出。
- Example: 传统流程 vs 新流程。
- Strengths: 差异抓取快。
- Risks: 容易忽略共性背景。
- Typical Failure Modes: 把流程图和结果图并置，却没有相同比较轴。
### Layout Pattern: circular
- Definition: 使用环形路径表达周期或闭合过程。
- Suitable For: 代谢循环、昼夜节律、细胞周期。
- Unsuitable For: 有强起止点的线性叙事。
- Reading Direction: 通常顺时针；必须标起点。
- Required Structural Conditions: 周期性真实存在，且各阶段首尾闭合。
- Common Mistakes: 没有起点，读者不知道从哪开始。
- Machine-friendly Representation: `narrative_structure = "cycle"`。
- Example: G1 → S → G2 → M。
- Strengths: 适合重复循环。
- Risks: 缩小时标签拥挤。
- Typical Failure Modes: 用环形排版非循环内容。
### Layout Pattern: feedback
- Definition: 以主流程加回授路径表达调控闭环。
- Suitable For: 控制系统、负反馈、生理调节。
- Unsuitable For: 单向不可逆过程。
- Reading Direction: 先主前向链，再读回授支路。
- Required Structural Conditions: 前向链与回授链视觉上必须区分。
- Common Mistakes: 把 feedback 画成单纯 circular，丢失前向主链。
- Machine-friendly Representation: 有 `feedback_edges` 指回上游。
- Example: 传感 → 控制 → 响应 → 反馈抑制。
- Strengths: 能表达动态稳定机制。
- Risks: 箭头交叉高。
- Typical Failure Modes: 回授线与主流程线同样粗同样色，语义混乱。
### Layout Pattern: nesting
- Definition: 主图中嵌入局部放大、补充机制或尺度转换窗口。
- Suitable For: 组织到细胞、器官到分子、系统到局部机理。
- Unsuitable For: 所有信息都同级重要的并列比较。
- Reading Direction: 先主图，再嵌套局部。
- Required Structural Conditions: 嵌套对象与主对象的对应关系必须明确。
- Common Mistakes: 嵌套窗口比主图还抢眼。
- Machine-friendly Representation: `groups` 中存在 parent-child containment。
- Example: 小鼠体内过程 + 细胞水平放大框。
- Strengths: 适合 multi-scale 叙事。
- Risks: 极易打断阅读顺序。
- Typical Failure Modes: 读者先被 inset 吸走，主线丢失。
### Layout Pattern: layered
- Definition: 按层次或尺度从上到下、外到内组织系统。
- Suitable For: 分层系统、生态层次、组织层次、协议栈。
- Unsuitable For: 明确的时序流程。
- Reading Direction: 通常 top-to-bottom 或 outside-to-inside。
- Required Structural Conditions: 层之间关系以 `contains` / `supports` / `passes_through` 为主。
- Common Mistakes: 把层与步骤混淆。
- Machine-friendly Representation: `hierarchy_levels` 明确。
- Example: 环境层 → 组织层 → 细胞层 → 分子层。
- Strengths: 适合说明级联层级。
- Risks: 若每层内部过多元素，会像堆叠表格。
- Typical Failure Modes: 看似有层，实际没有跨层因果。
### Layout Pattern: grid
- Definition: 规则栅格中放置多个等权单元。
- Suitable For: 多条件、多样本、多类别的 overview。
- Unsuitable For: 强叙事过程。
- Reading Direction: 通常按行列扫描，需要标题行/列辅助。
- Required Structural Conditions: 单元格意义一致。
- Common Mistakes: 单元内部结构各异，导致无法成组。
- Machine-friendly Representation: `grid_rows`, `grid_cols`。
- Example: 多组织 x 多机制的概览。
- Strengths: 对系统枚举有用。
- Risks: anti-narrative，容易变成海报墙。
- Typical Failure Modes: 读者只看到很多框，不知重点。
### Layout Pattern: centric
- Definition: 以中心实体为主，周边辐射关联因素。
- Suitable For: 中心机制、单核心系统、hub-and-spoke 关系。
- Unsuitable For: 明确先后顺序过程。
- Reading Direction: 先中心，后外围。
- Required Structural Conditions: 中心节点必须唯一且主导。
- Common Mistakes: 外围节点数量过多且无分组。
- Machine-friendly Representation: `radial_center_node`。
- Example: 一个细胞类型与多个影响因子。
- Strengths: 适合聚焦核心对象。
- Risks: 外围关系相互遮挡。
- Typical Failure Modes: 中心过小、外围过多。
### Layout Pattern: overview
- Definition: 对领域、系统或问题空间做高层组织图，不以单个步骤或单个因果链为唯一核心。
- Suitable For: review article 首图、领域地图、方法版图。
- Unsuitable For: 仅有一个线性实验流程。
- Reading Direction: 先总览框架，再局部区域。
- Required Structural Conditions: 必须有总体组织轴，如阶段、层级、维度或任务空间。
- Common Mistakes: 把 overview 做成装饰性拼贴。
- Machine-friendly Representation: `figure_goal = "overview"`。
- Example: 感知、建模、干预、验证四域版图。
- Strengths: 适合综述型内容。
- Risks: 极易失去唯一主旨。
- Typical Failure Modes: 图像很多、结构很弱。
### Layout Pattern: mechanism
- Definition: 以因果链或调控链解释某现象如何发生。
- Suitable For: 分子通路、病理机制、作用机理。
- Unsuitable For: 纯列举、纯分类。
- Reading Direction: 从 trigger 到 effect，或从 context 到 outcome。
- Required Structural Conditions: 因果边必须与相关边区分。
- Common Mistakes: 同时画所有已知通路，主机制不突出。
- Machine-friendly Representation: `figure_type = "mechanism"`。
- Example: 刺激激活受体，引发下游通路，导致表型。
- Strengths: 解释力强。
- Risks: 证据链与机制链混杂。
- Typical Failure Modes: 结果、假说、证据被同等画重。
### Layout Pattern: timeline
- Definition: 以时间点或时间段为主轴的阶段序列。
- Suitable For: 发育、病程、干预时间表、研究计划。
- Unsuitable For: 无时间维的比较。
- Reading Direction: 左到右优先。
- Required Structural Conditions: 时间刻度或阶段边界明确。
- Common Mistakes: 时间跨度与事件权重不成比例。
- Machine-friendly Representation: `time_axis` 对象。
- Example: baseline、treatment、follow-up。
- Strengths: 时间感最强。
- Risks: 若同时加多维说明，容易过挤。
- Typical Failure Modes: 时间轴沦为装饰，真正重点藏在旁支。
### Layout Pattern: matrix
- Definition: 用二维维度交叉形成 cells，强调多维映射关系。
- Suitable For: 任务 x 方法、细胞类型 x 标志物、场景 x 策略。
- Unsuitable For: 需要强路径叙事的机制图。
- Reading Direction: 先识别行列维度，再读关键交叉格。
- Required Structural Conditions: 行列维度都必须稳定且有解释。
- Common Mistakes: 把矩阵当作普通多面板，失去交叉语义。
- Machine-friendly Representation: `matrix_axes = {rows, cols}`。
- Example: 组织类型 x 调控层级。
- Strengths: 多维对照清晰。
- Risks: 缩小后文字压力大。
- Typical Failure Modes: 单元格内容过满。
## 7. Layout Selection Decision Tree

按以下决策树选择布局：

1. 如果核心是“一个对象如何经过多个步骤变成另一结果”，选 `pipeline` 或 `linear`。
   - 原因：主关系是 sequence。
   - 边界：若中途出现关键分叉，改为 `forking`。
2. 如果核心是“两个或多个方案如何对比”，选 `comparison` 或 `parallel`。
   - 原因：主关系是 juxtaposition，不是 sequence。
   - 边界：若每个方案内部又各有流程，可做平行小 pipeline。
3. 如果核心是“过程闭环或自调节”，选 `feedback`；只有真正周期性重复时才选 `circular`。
   - 原因：feedback 强调回授，circular 强调周期。`[Adopted after conflict resolution]`
4. 如果核心是“主图 + 局部放大 / 多尺度说明”，选 `nesting`。
   - 原因：containment 是主关系。
5. 如果核心是“系统层次或层级构成”，选 `layered`。
   - 原因：层级结构不是时间过程。
6. 如果核心是“中心实体与外围关联因素”，选 `centric`。
   - 边界：若外围因素之间还有明显流程，改用 `mechanism` 或 `forking`。
7. 如果核心是“多维映射”，选 `matrix` 或 `grid`。
   - 原因：需要用二维空间承载两个维度。
   - 边界：如果图仍需强主线，不要用纯 grid。
8. 如果核心是“综述性版图与高层组织”，选 `overview`。
   - 边界：overview 仍需一个组织轴，如阶段、层级或问题分区；没有组织轴就不是 overview，只是 collage。
9. 如果核心是“机理解释”，选 `mechanism`，再根据是否有分支、局部放大、反馈叠加 `forking` / `nesting` / `feedback`。
10. 如果拿不准：
   - 问自己：读者是要“跟着走一遍”、还是“并排比较”、还是“理解整体版图”？
   - 前者选 process family，第二种选 comparison family，第三种选 overview family。`[Inference]`

## 8. Reading-order Rules

如何定义“阅读顺序清晰”：

- 读者无需图例导航就能判断从哪里开始看。
- 主线推进方向不依赖猜测。
- 局部说明不会让读者误以为那是主线起点。
- 结束点或结论区块有明确收束。`[Inference]`

Rule Name: Entry Point Clarity
- Intent: 让读者在第一次扫视时找到入口。
- Applies To: 所有图。
- Why It Exists: 若没有入口，读者先消耗认知在“怎么读”，而不是“读到了什么”。
- How To Execute:
  - 在视觉上设置唯一最高优先级入口：左上、中心、或明确标题下第一块。
  - 若使用 centric 或 matrix，必须用标题、编号或强调块指示从哪里进入。
- How To Detect Violation:
  - 两个以上区域同等显眼且都像起点。
- Typical Failure: 左右两块都大且都带箭头。
- Revision Strategy: 降低非入口块的显著性，或添加编号。
- Rule Level: `Level A`
Rule Name: Main Flow Continuity
- Intent: 保证主流程能一口气被追踪。
- Applies To: linear / pipeline / mechanism / feedback。
- Why It Exists: 跳线、回折和过多插图会打断主链。
- How To Execute:
  - 主流程节点沿单一主轴排列。
  - 把插图、局部放大、证据块从主轴旁挂出，而不是插在主轴中间。
- How To Detect Violation:
  - 读者需要来回折返才能理解下一步。
- Typical Failure: 1→2→局部放大→3→4。
- Revision Strategy: 把局部放大改成 callout inset。
- Rule Level: `Level A`
默认 reading direction：

- `left_to_right`：线性过程、timeline、多数 graphical abstract。
- `top_to_bottom`：竖向流程、层级推进、空间限制下的窄版式。
- `center_outward`：centric / hub-and-spoke，但需显式说明后续阅读路径。
- `panel_order`：多面板图用 `a, b, c` 或子标题强化顺序。

避免路径歧义的方法：

- 用箭头强化主线，而不是用箭头弥补坏布局。
- 用 enumeration 处理弱顺序并列块。
- 不让 connector 穿越未相关组块。`[Inference]`
- 不在同一视觉层级里并置两个不同叙事系统。`[Inference]`

## 9. Grouping and Hierarchy Rules

如何定义一级、二级、三级信息：

- 一级：不看就无法理解图主旨的信息。
- 二级：理解一级所必需的上下文、对比、机制补充。
- 三级：例外、局部放大、方法细节、补充证据。

如何定义“焦点过多”：

- 若一级信息块超过一个且彼此不是主从关系，就是焦点过多。
- [Inference] 为自动化系统可使用保守启发式：同一图中 `primary` group 超过 2 个时触发 `too_many_focal_points` review flag。
- 当前来源不足以支持强规则，仅给出保守建议。`[Inference]`

Rule Name: Hierarchy-by-Significance
- Intent: 让视觉层级对应信息层级。
- Applies To: 所有图。
- Why It Exists: 读者应先看到最重要信息，再看到背景信息。
- How To Execute:
  - 一级信息占据最大面积或最高对比。
  - 二级信息以邻接、次级标题、次一级色强调出现。
  - 三级信息用 inset、轻底板或更小文本表示。
- How To Detect Violation:
  - 三级细节比主结论更醒目。
- Typical Failure: inset 用最亮颜色。
- Revision Strategy: 下调 tertiary contrast，抬高 primary block。
- Rule Level: `Level A`
Rule Name: Grouping-by-Multiple-Cues
- Intent: 分组不能只靠单一线索。
- Applies To: 所有多组图。
- Why It Exists: 颜色、位置、连接任意一个单独失效时，分组仍应成立。
- How To Execute:
  - 至少使用两种 cue：位置 + 对齐，或底板 + 标题，或颜色 + 边界。
- How To Detect Violation:
  - 去色后分组消失。
- Typical Failure: 只靠蓝组和橙组区分。
- Revision Strategy: 增加标题、边界或空间分隔。
- Rule Level: `Level A`
可用 grouping 机制：

- `proximity`: 最近原则。
- `similarity`: 相同形状、线宽、色码、文本样式。
- `containment`: 框、淡底板、放大窗。
- `alignment`: 沿同一隐形轴排列。
- `connector-based grouping`: 同一上游或同一出入口。`[Inference]`

什么情况下不能只靠颜色表达分组：

- 需要投稿缩小浏览时。
- 存在色盲风险时。
- 不同组还需要承担不同 connector semantics 时。`[Inference]`
- 图要转成黑白打印或灰度预览时。`[Inference]`

## 10. Arrow and Connector Semantics

箭头/连线必须承担明确语义，不允许“只是让画面看起来像流程图”。

推荐 connector semantics：

| 语义 | 推荐默认样式 | 说明 |
| --- | --- | --- |
| `process_flow` | 实线箭头 | 步骤推进 |
| `causal_effect` | 实线箭头，可更粗 | 因果影响 |
| `movement_transport` | 实线箭头 + 方向感 | 位置移动、运输 |
| `transformation` | 箭头 + 状态变化标签 | A 变 B |
| `control_regulation` | 虚线箭头或不同端点 | 调控、抑制、激活 |
| `association_mapping` | 无箭头连线或细线 | 对应关系，不表达因果 |
| `zoom_callout` | 细引线 + inset 框 | 局部放大说明 |
| `feedback` | 回返箭头 | 下游回到上游 |

Rule Name: One Visual Style, One Meaning
- Intent: 把 connector style 与语义一一映射。
- Applies To: 所有使用 connector 的图。
- Why It Exists: 同一箭头不应同时表示 sequence、causality、label callout。
- How To Execute:
  - 为每类关系分配稳定样式。
  - 若图中只有一种关系，可以只用一种箭头。
  - 若多种关系共存，必须在 legend 或局部说明中解释。
- How To Detect Violation:
  - 同样式连线连接了不同语义关系。
- Typical Failure: 所有线都用实线箭头。
- Revision Strategy: 区分 callout 线、association 线与 causal/process 箭头。
- Rule Level: `Level A`
一张图中何时允许多种连线语义共存：

- 当图确实同时需要表达主流程与局部解释、或主机制与调控关系。
- 但必须满足：
  - 每种样式视觉差异足够明显。
  - 同一语义在全图保持一致。
  - 图例或局部注释能解释。
  - 不因为样式变多而压倒主流程。`[Adopted after conflict resolution]`

如何处理跨组连线：

- 跨组边尽量少，只保留结构必要边。
- 从组边界的固定锚点出入，避免在组内部穿针引线。`[Inference]`
- 如果跨组边超过组内边，说明 grouping strategy 可能错了。`[Inference]`

如何减少交叉与视觉噪声：

- 优先调整布局，不先加桥接线。
- 把回授边走外圈。`[Inference]`
- 用 shared bus / shared legend 表达多对一映射，避免 N 条平行线。`[Inference]`

## 11. Text Density and Annotation Rules

文本允许承担的角色：

| text_role | 角色定义 | 适用场景 |
| --- | --- | --- |
| `label` | 命名对象或状态 | 几乎所有图 |
| `short_phrase` | 2 到 8 个词的局部动作说明 | process / mechanism |
| `sentence` | 完整短句，用于关键说明 | complex mechanism / overview |
| `caption` | 解释一个子块或一组对象 | multi-panel / grouped figure |
| `legend` | 解释符号、颜色、线型 | multi-semantic figures |
| `callout` | 对局部放大或特殊现象的补充说明 | nesting / evidence inset |

各类图推荐文本密度：

- `pipeline / linear`: 低到中，优先 label + short phrase。
- `mechanism`: 中，允许少量 sentence，但要锚定到局部。
- `overview`: 中到高，但应由子标题与组标题承载，而不是散乱段落。
- `comparison`: 低到中，比较轴必须短而一致。
- `graphical_abstract`: 尽量低，因在线缩略浏览场景限制明显。

什么时候应把文字前移到标题：

- 文字描述的是整图主旨，而非局部节点时。`[Inference]`
- 文字仅用于告诉读者“这张图想证明什么”时。`[Inference]`

什么时候放到局部注释：

- 文字只解释单个节点或单个关系时。
- 文字是图例、局部例外、尺度放大说明时。

如何判断文本过多：

- 图中存在无法一眼归属的 commentary blocks。
- 读者必须先读大段文字才能理解布局。`[Inference]`
- [Inference] 自动化保守阈值：
  - 任一节点文本超过 20 个中文字符且没有拆分为标题 + label 时，标记 `text_block_too_long`。
  - 图面中 `sentence` 与 `caption` 总数超过 4 时，标记 `text_density_risk`。
  - 这些阈值只是审查启发式，不是发表硬标准。

如何避免让图变成“带图的段落”：

- 不用 paragraph 解释本可由 layout 表达的顺序。
- 让文字附着在对象、组或连线上，而不是漂浮。
- 若 explanation 必须用段落，考虑把那部分移入图注或正文。

## 12. Icon / Pictogram / Illustration / Chart Usage Rules

什么时候使用 pictogram：

- 需要快速识别一个“类别对象”，而不需要具体实例细节时。
- 例如试剂瓶、细胞、器官、显微镜、患者、云端服务。

什么时候使用 abstract shape：

- 对象本身不重要，重要的是结构角色或状态关系。`[Inference]`
- 例如未知节点、抽象模块、方法块、信息流块。

什么时候使用 plot：

- 当核心信息是数量变化、差异大小、趋势、分布或测量结果。
- 若图只想“暗示某方法被使用过”，只有在受众明确识别该 plot-as-symbol 时才可用。`[Adopted after conflict resolution]`

什么时候使用 illustration：

- 当 biological / physical context 对理解机制必要，且 photograph 太具体或太噪声时。

什么时候图标有帮助，什么时候图标反而造成噪声：

- 有帮助：
  - 它帮助识别对象类别。
  - 它帮助建立场景或尺度。
  - 它能缩短文本标签。
- 造成噪声：
  - 只是为了让画面“像个 figure”。
  - 同一类对象用了不同风格图标。
  - 图标占面积很大，却不承担流程、分组或语义定义。

如何保持 representational consistency：

- 同一类实体保持同一表示类型与近似细节级别。
- 除非有明确结构原因，不在一个局部里混用 photograph、cartoon、扁平 icon 与统计图。
- 不同风格元素混用的风险：
  - 误导 hierarchy
  - 让读者误解具体实例 vs 抽象类别
  - 增加视觉噪声

什么时候需要真实 biological / physical context：

- 如果缺少真实上下文会让机制位置、尺度或作用对象无法理解。
- 若真实上下文只是背景气氛，则不应加入。

什么时候应该用数据图，什么时候应该用概念图：

- 用数据图：核心问题是“量化证据是什么”。
- 用概念图：核心问题是“系统如何运作”或“信息如何组织”。
- 混合：主图用概念结构，关键 outcome 用简化 plot 嵌入。

## 13. Color and Accessibility Rules

颜色只能承担以下功能：

- `emphasis`: 突出一级重点。
- `grouping`: 辅助分组。
- `status`: 区分正负、激活抑制、正常疾病等状态。
- `real_world_depiction`: 表示自然外观或学科惯例。

不允许只靠颜色区分类别的情况：

- 存在缩小浏览。
- 存在色盲风险。
- 存在灰度打印可能。`[Inference]`

颜色语义分配建议：

- emphasis：1 到 2 个高对比 accent。
- grouping：组级弱色板或同色系不同浅深。
- status：使用学科惯例时可 off-palette，但必须一致。

如何降低非重点元素权重：

- 降低饱和度。
- 降低细节密度。
- 使用中性底色。
- 减少标签长度。
如何控制色数、对比度、背景与前景关系：

- 重点块与背景块必须形成显著对比。
- 前景/背景对比建议不低于 4.5:1。
- 避免红/绿组合。
- 颜色一旦编码了某语义，不得在同图或同论文中改码。

如何保证色盲友好、缩小后仍可辨认：

- 颜色不是唯一编码。
- 文字优先黑色或高对比深色。
- 组别还应有位置、边界、标题或线型辅助。
- 缩小预览时仍需靠布局与文字锚定识别，而不是靠微妙配色。

## 14. Journal-facing Constraints

面向投稿/发表的结构约束：

- Elsevier graphical abstract：
  - 独立文件。
  - 1328 x 531 像素以上，300 dpi。
  - 缩放后约落入 500 x 200 视窗。
  - clear start/end。
  - 少 clutter，少空白，文字嵌入图本体。
- Nature conceptual figure：
  - 每个元素定义清楚。
  - 使用图内 hierarchy、figure parts、subheadings。
  - 草稿字至少 7pt。
  - 会被编辑团队重绘，不要把草图当终版。

单栏缩放、快速浏览、线上展示的影响：

- 小窗浏览会惩罚：
  - dense matrix
  - centric with many spokes
  - over-nesting
  - tiny legends
  - many crossing arrows
哪些结构在放小后最容易失败：

- orthogonal / grid 中每格都带小标签。
- 多层 nesting 且每层都要解释。
- 需要靠细线型差异区分的多箭头系统。

哪些图适合单面板，哪些适合多面板：

- 单面板：
  - pipeline
  - simple mechanism
  - compact comparison
  - centric
- 多面板：
  - overview with heterogeneous zones
  - comparison with per-condition substructure
  - multi-scale nesting
  - evidence-backed mechanism
## 15. Rule Levels

### Level A: non-negotiable

1. 图必须有唯一主旨。
2. 图必须能识别入口点。
3. 主流程必须可追踪，不得依赖猜测。
4. 每个关键元素必须被定义或标注。
5. 颜色不能是唯一编码通道。
6. 同一种 connector style 不得承担多种未解释语义。
7. decorative icons 禁止进入主体结构。
8. 图标与表示类型不得无理由风格混杂。
9. graphical abstract 必须考虑缩略浏览场景。
10. 文字必须在缩小后仍可读，Nature 草稿至少 7pt。
11. 若内容本质是列表而非 process / phenomenon，应改用表或列表。
12. 输出必须含 machine-readable schema，而不是只给审美描述。 `[Inference]`

### Level B: default-best-practice

1. process 类图默认左到右。
2. 周期类图默认顺时针并标起点。
3. grouping 至少使用两种 cue。
4. overview 图应有显式组织轴。
5. nested inset 应附着于主对象，而非漂浮。
6. caption 优先解释组块，不优先解释整张图。
7. 非重点元素降低饱和度和细节密度。
8. 高级方法图只在受众能识别时用作方法符号。 `[Adopted after conflict resolution]`
9. comparison 图的对照项应同位对齐。
10. feedback 图优先先画前向链，再加回授边。
11. 跨组边数量应少于组内边数量。 `[Inference]`
12. 任何自动生成初稿都必须经过 checklist 审查。

### Level C: context-dependent

1. 是否使用 circular 还是 feedback，取决于强调周期还是回授。
2. 是否使用 photograph，取决于实例性是否有助于理解。
3. 是否使用 scientific convention colors，取决于学科习惯。
4. 是否允许 sentence 级文字，取决于图类型与载体。
5. 是否用 top-to-bottom，取决于版面与脚本方向。
6. 是否采用多面板，取决于 heterogeneous substructures 是否无法并入单面板。
7. 是否用 matrix，取决于读者是否需要二维检索。
8. 是否让局部 evidence 入图，取决于它是否支持主旨而不是分散主旨。
9. 是否使用 enumeration，取决于布局本身是否足够清楚。
10. 是否在图中放 legend，取决于符号/线型系统复杂度。
11. 是否输出多个版本，取决于目标期刊与传播渠道。
12. 自动审查阈值可按学科调节，不宜强制统一。 `[Inference]`

## 16. Structural Anti-patterns

### Anti-pattern: too_many_focal_points
- Symptom: 两个以上同等显眼区域都像“图的主角”。
- Underlying Cause: 没有唯一主旨或没有 hierarchy。
- Why It Hurts Comprehension: 读者无法建立先后注意顺序。
- Detection Heuristic: `primary_groups > 2` 或两个以上区域同时拥有最大尺寸与最高对比。 `[Inference]`
- Fix Strategy: 选出唯一主链，其余降级为 supporting blocks。
- Severity: high

### Anti-pattern: ambiguous_reading_path
- Symptom: 读者不知道从哪里开始，也不知道下一步去哪。
- Underlying Cause: layout 与 arrows 没有共同定义顺序。
- Why It Hurts Comprehension: 增加导航负担，削弱主旨提取。
- Detection Heuristic: 无 entry point；多条主箭头指向不同起始块。
- Fix Strategy: 重排主轴，增加编号或子标题。
- Severity: high

### Anti-pattern: decorative_but_not_informative
- Symptom: 图里有很多器材、分子、云朵、装饰背景，却不承担任何结构作用。
- Underlying Cause: 把 style 当 structure。
- Why It Hurts Comprehension: 占面积、误导焦点、加重 clutter。
- Detection Heuristic: 元素既不连入主流程，也不定义分组或上下文。
- Fix Strategy: 删除或降为背景纹理；若确需上下文，改成轻量背景。
- Severity: medium

### Anti-pattern: arrow_semantics_mixed
- Symptom: 同样箭头既表示流程，又表示因果，又表示 callout。
- Underlying Cause: 未建立 connector semantics。
- Why It Hurts Comprehension: 读者会把所有关系都读成一个关系。
- Detection Heuristic: 相同 edge style 对应多个 relation_type。
- Fix Strategy: 建立一对一样式映射，并补 legend。
- Severity: high

### Anti-pattern: label_overload
- Symptom: 每个对象都带长句，图像只剩标签容器。
- Underlying Cause: 结构未能承担组织任务，转而用文字补洞。
- Why It Hurts Comprehension: 图退化成“带图的段落”。
- Detection Heuristic: 多数文本块超过 short phrase；存在漂浮 commentary。
- Fix Strategy: 先减少节点、重构布局，再缩短文字。
- Severity: high

### Anti-pattern: over_nesting
- Symptom: inset 套 inset，层层放大。
- Underlying Cause: 试图在单图塞入太多尺度与细节。
- Why It Hurts Comprehension: 主图被打断，读者迷失于局部。
- Detection Heuristic: nested depth > 2。 `[Inference]`
- Fix Strategy: 只保留一层关键放大，其余移到补图。
- Severity: medium

### Anti-pattern: pseudo_minimalism
- Symptom: 画面元素少，但关系不清、标签不足、语义不完整。
- Underlying Cause: 误把“少”当“清楚”。
- Why It Hurts Comprehension: 信息不够，读者只能猜。
- Detection Heuristic: 多个对象未定义，edge 无标签，图例缺失。
- Fix Strategy: 恢复必要 label、group title 或 relationship cue。
- Severity: medium

### Anti-pattern: color_only_encoding
- Symptom: 去色后完全看不懂组别、状态或对比对象。
- Underlying Cause: 缺少文字、位置、边界或线型辅助。
- Why It Hurts Comprehension: 无障碍失败，缩小浏览失败。
- Detection Heuristic: grayscale simulation 下 groups collapse。 `[Inference]`
- Fix Strategy: 增加标签、位置分隔、形状或边界。
- Severity: high

### Anti-pattern: panel_imbalance
- Symptom: 某个 panel 巨大复杂，其他 panel 很小，整体像拼盘。
- Underlying Cause: 多面板未统一 hierarchy。
- Why It Hurts Comprehension: 主面板与辅面板关系模糊。
- Detection Heuristic: 单 panel 面积超过其余总和且未声明为 primary。 `[Inference]`
- Fix Strategy: 明确主辅；或拆分为主图 + inset，而不是平铺 panel。
- Severity: medium

### Anti-pattern: visually_attractive_but_structurally_unreadable
- Symptom: 色彩、图标、构图都吸引人，但无法用一句话说明图的逻辑。
- Underlying Cause: style 优先于 structure。
- Why It Hurts Comprehension: 读者被吸引，却得不到可操作理解。
- Detection Heuristic: review 中“好看但不知道想说什么”。
- Fix Strategy: 回到 key message 与 figure_goal 重构。
- Severity: high

## 17. Output Schema for Downstream Systems

### 17.1 Schema 字段说明

```json
{
  "figure_goal": "string",
  "figure_type": "string",
  "audience": "string",
  "reading_order": {
    "entry_point": "string",
    "flow": "left_to_right | top_to_bottom | radial | panel_order | mixed",
    "sequence": ["node_or_group_id"]
  },
  "narrative_structure": "sequential | comparison | cycle | overview | layered | mixed",
  "nodes": [],
  "edges": [],
  "groups": [],
  "hierarchy": {
    "primary": [],
    "secondary": [],
    "tertiary": []
  },
  "annotations": [],
  "style_constraints": {},
  "accessibility_constraints": {},
  "journal_constraints": {},
  "layout_constraints": {},
  "review_flags": []
}
```

字段定义：

| 字段 | 类型 | 含义 | 可选值/说明 |
| --- | --- | --- | --- |
| `figure_goal` | string | 图的任务陈述 | 如 `summarize_method`, `explain_mechanism`, `compare_conditions` |
| `figure_type` | string | 主图型 | `pipeline`, `mechanism`, `overview`, `comparison` 等 |
| `audience` | string | 目标读者 | `specialist`, `interdisciplinary`, `broad_science` |
| `reading_order` | object | 阅读入口、方向、节点序列 | 必填 |
| `narrative_structure` | string | 叙事形态 | `sequential`, `comparison`, `cycle`, `overview`, `mixed` |
| `nodes` | array | 图中节点 | 每项含 `id`, `role`, `label`, `entity_type`, `importance`, `representation`, `text_role` |
| `edges` | array | 节点关系 | 每项含 `source`, `target`, `relation_type`, `connector_style`, `priority` |
| `groups` | array | 分组信息 | 每项含 `id`, `label`, `member_ids`, `grouping_cues` |
| `hierarchy` | object | 主次层级 | primary / secondary / tertiary |
| `annotations` | array | legend、callout、zoom note 等 | 可空 |
| `style_constraints` | object | 风格层不可违背的结构约束 | 如 `semantic_color_lock`, `representation_consistency` |
| `accessibility_constraints` | object | 无障碍限制 | `color_not_only_channel`, `min_contrast_ratio`, `min_font_pt` |
| `journal_constraints` | object | 发表环境限制 | 比例、分辨率、字体、单文件要求 |
| `layout_constraints` | object | 布局器必须遵守的约束 | 主轴、对齐、禁交叉、嵌套深度 |
| `review_flags` | array | 审查中发现的问题 | 如 `ambiguous_reading_path` |

### 17.2 Node 对象建议结构

```json
{
  "id": "n3",
  "label": "Feature extraction",
  "entity_type": "process",
  "importance": "primary",
  "representation": "abstract_shape",
  "text_role": "label",
  "group_id": "g_method",
  "evidence_anchor": null
}
```

### 17.3 Edge 对象建议结构

```json
{
  "id": "e2",
  "source": "n2",
  "target": "n3",
  "relation_type": "process_flow",
  "connector_style": "solid_arrow",
  "priority": "primary"
}
```

### 17.4 完整 Schema 示例 1: 方法流程图

```json
{
  "figure_goal": "summarize_method",
  "figure_type": "pipeline",
  "audience": "interdisciplinary",
  "reading_order": {
    "entry_point": "n1",
    "flow": "left_to_right",
    "sequence": ["n1", "n2", "n3", "n4"]
  },
  "narrative_structure": "sequential",
  "nodes": [
    {"id": "n1", "label": "Samples", "entity_type": "material", "importance": "primary", "representation": "pictogram", "text_role": "label", "group_id": "g_pipeline"},
    {"id": "n2", "label": "Preprocess", "entity_type": "process", "importance": "primary", "representation": "abstract_shape", "text_role": "label", "group_id": "g_pipeline"},
    {"id": "n3", "label": "Model", "entity_type": "process", "importance": "primary", "representation": "abstract_shape", "text_role": "label", "group_id": "g_pipeline"},
    {"id": "n4", "label": "Prediction", "entity_type": "outcome", "importance": "primary", "representation": "chart", "text_role": "short_phrase", "group_id": "g_pipeline"},
    {"id": "n5", "label": "Key metric", "entity_type": "evidence", "importance": "secondary", "representation": "chart", "text_role": "caption", "group_id": "g_outcome"}
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2", "relation_type": "process_flow", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e2", "source": "n2", "target": "n3", "relation_type": "process_flow", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e3", "source": "n3", "target": "n4", "relation_type": "process_flow", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e4", "source": "n4", "target": "n5", "relation_type": "zoom_callout", "connector_style": "thin_callout", "priority": "secondary"}
  ],
  "groups": [
    {"id": "g_pipeline", "label": "Method workflow", "member_ids": ["n1", "n2", "n3", "n4"], "grouping_cues": ["alignment", "proximity"]},
    {"id": "g_outcome", "label": "Outcome detail", "member_ids": ["n5"], "grouping_cues": ["containment"]}
  ],
  "hierarchy": {
    "primary": ["g_pipeline"],
    "secondary": ["g_outcome"],
    "tertiary": []
  },
  "annotations": [
    {"id": "a1", "type": "callout", "target": "n5", "text": "Keep only one key metric in the figure."}
  ],
  "style_constraints": {
    "semantic_color_lock": true,
    "representation_consistency": true
  },
  "accessibility_constraints": {
    "color_not_only_channel": true,
    "min_contrast_ratio": 4.5,
    "prefer_black_text": true
  },
  "journal_constraints": {
    "target_context": "graphical_abstract",
    "prefer_ratio": "500:200",
    "min_resolution": "1328x531@300dpi"
  },
  "layout_constraints": {
    "main_axis": "horizontal",
    "max_nested_depth": 1,
    "avoid_edge_crossing": true
  },
  "review_flags": []
}
```

### 17.5 完整 Schema 示例 2: 机制图

```json
{
  "figure_goal": "explain_mechanism",
  "figure_type": "mechanism",
  "audience": "specialist",
  "reading_order": {
    "entry_point": "n1",
    "flow": "left_to_right",
    "sequence": ["n1", "n2", "n3", "n4", "n5"]
  },
  "narrative_structure": "sequential",
  "nodes": [
    {"id": "n1", "label": "Stimulus", "entity_type": "context", "importance": "primary", "representation": "pictogram", "text_role": "label", "group_id": "g_main"},
    {"id": "n2", "label": "Receptor", "entity_type": "actor", "importance": "primary", "representation": "illustration", "text_role": "label", "group_id": "g_main"},
    {"id": "n3", "label": "Signal cascade", "entity_type": "process", "importance": "primary", "representation": "schema", "text_role": "short_phrase", "group_id": "g_main"},
    {"id": "n4", "label": "Gene program", "entity_type": "process", "importance": "secondary", "representation": "abstract_shape", "text_role": "label", "group_id": "g_response"},
    {"id": "n5", "label": "Phenotype", "entity_type": "outcome", "importance": "primary", "representation": "illustration", "text_role": "label", "group_id": "g_response"},
    {"id": "n6", "label": "Feedback inhibition", "entity_type": "process", "importance": "secondary", "representation": "schema", "text_role": "short_phrase", "group_id": "g_feedback"}
  ],
  "edges": [
    {"id": "e1", "source": "n1", "target": "n2", "relation_type": "causal_effect", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e2", "source": "n2", "target": "n3", "relation_type": "causal_effect", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e3", "source": "n3", "target": "n4", "relation_type": "causal_effect", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e4", "source": "n4", "target": "n5", "relation_type": "causal_effect", "connector_style": "solid_arrow", "priority": "primary"},
    {"id": "e5", "source": "n5", "target": "n2", "relation_type": "feedback", "connector_style": "dashed_arrow", "priority": "secondary"}
  ],
  "groups": [
    {"id": "g_main", "label": "Trigger and signaling", "member_ids": ["n1", "n2", "n3"], "grouping_cues": ["alignment", "similarity"]},
    {"id": "g_response", "label": "Response", "member_ids": ["n4", "n5"], "grouping_cues": ["alignment", "proximity"]},
    {"id": "g_feedback", "label": "Feedback", "member_ids": ["n6"], "grouping_cues": ["connector"]}
  ],
  "hierarchy": {
    "primary": ["g_main", "n5"],
    "secondary": ["g_response", "g_feedback"],
    "tertiary": []
  },
  "annotations": [
    {"id": "a1", "type": "legend", "target": "edges", "text": "Dashed arrow = feedback inhibition"}
  ],
  "style_constraints": {
    "semantic_color_lock": true,
    "allow_dual_connector_system": true
  },
  "accessibility_constraints": {
    "color_not_only_channel": true,
    "avoid_red_green_pair": true,
    "prefer_black_text": true
  },
  "journal_constraints": {
    "target_context": "summary_figure",
    "min_font_pt": 7
  },
  "layout_constraints": {
    "main_axis": "horizontal",
    "feedback_on_outer_route": true,
    "avoid_edge_crossing": true
  },
  "review_flags": []
}
```

### 17.6 完整 Schema 示例 3: overview + matrix

```json
{
  "figure_goal": "organize_problem_space",
  "figure_type": "overview",
  "audience": "interdisciplinary",
  "reading_order": {
    "entry_point": "g_header",
    "flow": "panel_order",
    "sequence": ["g_header", "g_matrix", "g_summary"]
  },
  "narrative_structure": "overview",
  "nodes": [
    {"id": "n1", "label": "Cell types", "entity_type": "context", "importance": "secondary", "representation": "text_only", "text_role": "label", "group_id": "g_matrix"},
    {"id": "n2", "label": "Regulation layers", "entity_type": "context", "importance": "secondary", "representation": "text_only", "text_role": "label", "group_id": "g_matrix"},
    {"id": "n3", "label": "Transcription", "entity_type": "process", "importance": "primary", "representation": "schema", "text_role": "label", "group_id": "g_cell_1"},
    {"id": "n4", "label": "Metabolism", "entity_type": "process", "importance": "primary", "representation": "schema", "text_role": "label", "group_id": "g_cell_2"},
    {"id": "n5", "label": "Main takeaway", "entity_type": "outcome", "importance": "primary", "representation": "abstract_shape", "text_role": "sentence", "group_id": "g_summary"}
  ],
  "edges": [
    {"id": "e1", "source": "n3", "target": "n5", "relation_type": "evidence_support", "connector_style": "thin_line", "priority": "secondary"},
    {"id": "e2", "source": "n4", "target": "n5", "relation_type": "evidence_support", "connector_style": "thin_line", "priority": "secondary"}
  ],
  "groups": [
    {"id": "g_header", "label": "Problem framing", "member_ids": [], "grouping_cues": ["subheading"]},
    {"id": "g_matrix", "label": "Cell type x regulation layer", "member_ids": ["n1", "n2", "n3", "n4"], "grouping_cues": ["grid", "containment"]},
    {"id": "g_summary", "label": "Take-home message", "member_ids": ["n5"], "grouping_cues": ["background_plate", "position"]}
  ],
  "hierarchy": {
    "primary": ["g_summary"],
    "secondary": ["g_matrix"],
    "tertiary": ["g_header"]
  },
  "annotations": [
    {"id": "a1", "type": "subheading", "target": "g_matrix", "text": "Map the space before highlighting the conclusion."}
  ],
  "style_constraints": {
    "representation_consistency": true,
    "low_decorative_load": true
  },
  "accessibility_constraints": {
    "color_not_only_channel": true,
    "min_contrast_ratio": 4.5
  },
  "journal_constraints": {
    "target_context": "review_overview"
  },
  "layout_constraints": {
    "grid_rows": 2,
    "grid_cols": 2,
    "reserve_summary_band": true
  },
  "review_flags": []
}
```

## 18. Skill Execution Procedure

SOP 如下：

1. `input_parsing`
   - 读取论文内容、图目标、受众、发表环境。
   - 缺信息时只补结构必要项。若无法确定期刊，采用保守默认。
2. `message_extraction`
   - 产出 1 句 key message。
   - 产出 3 到 5 个必须入图的核心实体。
3. `figure_type_classification`
   - 根据主关系类型选择 figure type。
   - 若不确定，输出两个候选并说明淘汰条件。`[Inference]`
4. `structure_generation`
   - 生成 nodes、edges、groups、hierarchy、reading_order。
5. `representation_assignment`
   - 为每个节点指定 pictogram / illustration / chart / schema / text-only。
6. `text_and_connector_assignment`
   - 给每个节点分配 text_role。
   - 给每条边分配 relation_type 与 connector_style。
7. `schema_export`
   - 导出 JSON schema。
8. `self_review`
   - 用 Review Checklist 打分。
9. `revision_loop`
   - 对所有 `review_flags` 逐个修正。
10. `final_output`
   - 同时输出：
     - human-readable structure rationale
     - machine-readable schema
     - review status

## 19. Review Checklist

按 yes/no 检查：

1. 主旨是否唯一？
2. 图类型是否与主关系类型匹配？
3. 起点是否明确？
4. 主流程是否能不折返读完？
5. 是否存在两个以上同等主焦点？
6. 分组是否至少由两种 cue 支撑？
7. 是否只靠颜色编码关键区别？
8. 每个关键元素是否被定义？
9. 箭头语义是否一一对应且已解释？
10. 是否存在装饰性但无信息贡献的元素？
11. 文本是否过长或漂浮无锚？
12. 缩小后是否仍可读？
13. 是否存在 faux figure 风险？
14. representational genre 是否无故混杂？
15. 是否可映射到 HTML / Pretext 的块级布局？
16. 是否已满足目标期刊/平台的尺寸与字体约束？
17. 是否存在 review_flags 未处理？

结论规则：

- `pass`：
  - 第 1, 3, 4, 5, 7, 8, 9, 12, 15, 16 项全部为 yes。
  - 且 review_flags 中无 high severity。
- `revise`：
  - 存在 1 到 3 个 high severity 问题，或多个 medium 问题。
- `reject`：
  - 主旨不唯一；或 reading path 不明确；或 faux figure；或颜色唯一编码；或缩小后不可读。

## 20. Few-shot Examples

### Example 1: 方法流程图
- 论文内容摘要:
  - 研究提出一个从原始显微图到细胞分类结果的自动化流程。
- 结构分析:
  - 主关系是顺序步骤。
  - 关键对象是输入、预处理、特征提取、分类、输出。
- 选用的 layout pattern:
  - `pipeline`
- 阅读顺序:
  - 左到右。
- 分组与层级:
  - 一级：主流程。
  - 二级：输出指标 inset。
- schema 输出:
```json
{"figure_type":"pipeline","reading_order":{"flow":"left_to_right"},"groups":[{"id":"g_pipeline"}]}
```

### Example 2: 机制图
- 论文内容摘要:
  - 某刺激通过受体和信号通路引发炎症表型。
- 结构分析:
  - 主关系是因果链。
  - 有一条次级抑制反馈。
- 选用的 layout pattern:
  - `mechanism + feedback`
- 阅读顺序:
  - 先主链，后回授。
- 分组与层级:
  - 一级：刺激到表型。
  - 二级：反馈抑制。
- schema 输出:
```json
{"figure_type":"mechanism","edges":[{"relation_type":"causal_effect"},{"relation_type":"feedback"}]}
```

### Example 3: 对比图
- 论文内容摘要:
  - 比较传统诊断流程和新方法流程在速度与准确性上的差异。
- 结构分析:
  - 主关系是并列比较，不是时间推进。
  - 每列内部各有三步。
- 选用的 layout pattern:
  - `comparison`
- 阅读顺序:
  - 先看列标题，再逐行对照步骤与结果。
- 分组与层级:
  - 一级：两列对照。
  - 二级：底部关键指标。
- schema 输出:
```json
{"figure_type":"comparison","layout_constraints":{"parallel_columns":2},"comparison_axes":["workflow","outcome"]}
```

### Example 4: 闭环系统图
- 论文内容摘要:
  - 可穿戴传感器驱动药物释放系统，并根据生理指标回调剂量。
- 结构分析:
  - 有明确前向控制链和回授链。
- 选用的 layout pattern:
  - `feedback`
- 阅读顺序:
  - 传感 → 控制 → 释放 → 生理响应 → 反馈。
- 分组与层级:
  - 一级：闭环链。
  - 二级：局部监测指标。
- schema 输出:
```json
{"figure_type":"feedback","layout_constraints":{"feedback_on_outer_route":true}}
```

### Example 5: overview figure
- 论文内容摘要:
  - 综述不同干预策略如何作用于疾病进展的四个阶段。
- 结构分析:
  - 需要“阶段”作为组织轴，而不是单一机制链。
- 选用的 layout pattern:
  - `overview + layered`
- 阅读顺序:
  - 先读四阶段骨架，再读每阶段策略。
- 分组与层级:
  - 一级：阶段框架。
  - 二级：策略类别。
- schema 输出:
```json
{"figure_type":"overview","groups":[{"id":"g_stage_1"},{"id":"g_stage_2"}],"narrative_structure":"overview"}
```

### Example 6: 图文混合型 graphical abstract
- 论文内容摘要:
  - 研究展示一种新型纳米颗粒进入肿瘤后触发免疫反应并提升疗效。
- 结构分析:
  - 需要 context、delivery、mechanism、outcome 四块。
  - 图像承担场景与对象识别，短语承担动作说明。
- 选用的 layout pattern:
  - `linear + nesting`
- 阅读顺序:
  - 左到右四块，第三块有局部放大解释免疫激活。
- 分组与层级:
  - 一级：四块主链。
  - 二级：局部机制 inset。
- schema 输出:
```json
{"figure_type":"graphical_abstract","reading_order":{"flow":"left_to_right"},"groups":[{"id":"g_main"},{"id":"g_inset"}]}
```

## 21. Failure Cases and Revision Demonstrations

### Case 1: 初稿失败于 ambiguous_reading_path
- 初稿失败:
  - 一个方法图同时从左到右和从上到下都有箭头。
- 诊断:
  - layout 没有单一主轴，箭头在补救而不是强化。
- 修正:
  - 主流程统一为 left-to-right；性能结果改为底部 inset。
- 修正后:
  - 主链可一笔读完，局部结果不再打断流程。

### Case 2: 初稿失败于 label_overload
- 初稿失败:
  - 每个节点附一整句描述。
- 诊断:
  - 图在承担正文。
- 修正:
  - 把整图主旨移到标题；局部句子改为 label + callout；细节移图注。
- 修正后:
  - 图面文本从 9 块降到 4 块，主链仍完整。

### Case 3: 初稿失败于 color_only_encoding
- 初稿失败:
  - 两组条件只用蓝/红区分。
- 诊断:
  - 去色后完全失效。
- 修正:
  - 两列并列、标题明确、组底板不同，颜色只做辅助。
- 修正后:
  - 黑白打印仍能读懂对照关系。

### Case 4: 初稿失败于 faux_figure
- 初稿失败:
  - 把五类挑战和五类对策画成几十个 icon 拼盘。
- 诊断:
  - 它本质上是配对列表，不是 process 或 mechanism。
- 修正:
  - 改成列表/表格；若必须画图，则改为“问题产生 → 介入点 → 改善结果”的流程结构。
- 修正后:
  - 图终于表达 action，而不是图标化分类。

## 22. Integration Notes for HTML / Pretext / Renderer

这个结构层如何服务自动化 HTML + Pretext 流程：

### 接口边界

- 结构层负责：
  - schema
  - hierarchy
  - grouping
  - reading order
  - connector semantics
  - text role 分配
- HTML / Pretext 负责：
  - 把 groups 映射成 section / panel / div / figure-part
  - 把 nodes 映射成 block / slot / inline annotation
  - 按 `layout_constraints` 安排栅格与主轴
- SVG / renderer 负责：
  - 具体坐标
  - connector routing
  - shape drawing
  - icon placement
  - fine-grained typography

### 结构层到 HTML 的映射

- `groups` -> 容器块
- `hierarchy.primary` -> 首屏主块
- `reading_order.sequence` -> DOM 或阅读序优先级
- `annotations` -> callout / legend block
- `layout_constraints.main_axis` -> flex / grid 主轴
- `matrix_axes` / `grid_rows` / `grid_cols` -> CSS grid template

### 结构层到 Pretext 的映射

- Pretext 适合先生成语义块，再由模板渲染。
- 每个 `group` 可映射成一个可重排的语义单元。
- 每个 `node` 可映射成：
  - icon slot
  - text slot
  - optional chart slot
- 每条 `edge` 可映射成后处理 SVG overlay，而不是正文流式元素。`[Inference]`

### 自动修正流程

1. layout engine 生成初稿。
2. review engine 根据 checklist 生成 `review_flags`。
3. 若 flags 包含 `ambiguous_reading_path`，优先重排主轴。
4. 若 flags 包含 `label_overload`，优先压缩文本与抽离 caption。
5. 若 flags 包含 `color_only_encoding`，优先增加位置、边界与标题 cue。
6. 若 flags 包含 `faux_figure`，退回 figure_type 选择阶段。

### 关键原则

- 不要让 renderer 反向决定结构。
- 不要让 HTML 组件库默认样式篡改 hierarchy。
- 不要在 schema 里存太早的像素坐标，否则失去跨载体适应性。

---

# Part D. Reviewer Report

角色切换：`Skill Reviewer`

## 审查结果

1. 是否存在未转写为规则的空泛审美词：
   - 发现早期草稿中有“清爽”“专业感”表达，已在 Part C Section 4 改写为可执行规则。
2. 是否把结构规则和视觉风格混淆：
   - 已区分 structure / style / renderer，但 Section 22 初稿接口边界不够明确，需补充。
3. 是否遗漏来源冲突处理：
   - 已在 Part B conflict_table 处理 6 组冲突。
4. 是否没有给出布局选择条件：
   - 已在 Section 7 给出 decision tree。
5. 是否没有给出下游 schema：
   - 已在 Section 17 给出 schema 和 3 个完整例子。
6. 是否没有给出可执行 checklist：
   - 已在 Section 19 给出 yes/no checklist 与 pass/revise/reject 规则。
7. 是否没有给出 failure cases：
   - 已在 Section 21 给出 4 个案例。
8. 是否没有说明与 HTML / Pretext / renderer 的衔接：
   - 初稿有，但不够工程化，需细化接口边界与自动修正流程。
9. 是否存在只适用于个别学科、却被泛化为通用规则的情况：
   - 高级方法图作为 placeholder 的使用条件已经收紧，避免泛化。
10. 是否存在不够保守、会误导 Agent 的推断：
   - 关于“图太挤”“焦点过多”的阈值全部明确标注为 `[Inference]`，并声明仅作审查启发式。

## Reviewer Verdict

- 总体可用。
- 需要对以下章节做修订增强：
  - Section 11：文本密度的自动化阈值说明要更保守。
  - Section 17：schema 字段需要强调“结构约束优先于坐标”。
  - Section 22：HTML / Pretext / renderer 的接口边界需更清楚。

---

# Part E. Revised Sections (if any)

以下修订内容已经并入 Part C，对应章节在此再次摘录为修订版。

## Revised Section 11 Note

- 文本过多的数值阈值并非来源硬标准。
- 所有文本长度阈值都只用于自动审查启发式，不可直接当成投稿硬性规则。
- 当自动审查与人审冲突时，人审优先。 `[Inference]`

## Revised Section 17 Note

- schema 的使命是约束结构，不是提前锁定坐标。
- 任意下游系统都可以改变样式与绝对位置，但不得改变：
  - reading_order
  - hierarchy
  - grouping
  - connector semantics
  - text anchoring

## Revised Section 22 Note

- HTML 负责块级组织，SVG 负责矢量叠加，review engine 负责回流修正。
- 若 renderer 需要为了美观而破坏结构约束，应判定为非法优化。
- `[Inference]`

---

# Part F. Final Compact Operational Summary

1. 先问这张图的唯一主旨是什么，不允许把论文全塞进去。
2. 识别主关系类型：sequence、comparison、cycle、feedback、containment、overview、matrix。
3. 先选图型，再选表示方式；不要先想“画什么风格”。
4. process 优先 linear/pipeline；对比优先 comparison/parallel；闭环优先 feedback/circular；多尺度优先 nesting；综述优先 overview；多维映射优先 matrix/grid。
5. reading order 必须可解释为 start -> middle -> end；若不能，用 layout 重构，不要先补箭头。
6. 一级、二级、三级信息必须分开；三级细节不能抢一级焦点。
7. 分组不能只靠颜色；至少两种 cue。
8. 一种 connector style 只表达一种语义；多语义共存必须区分并解释。
9. 文字只做 label、short phrase、caption、legend、callout 等结构角色；不要让图变成段落。
10. decorative icon 禁止；每个表示元素都要有信息贡献。
11. 颜色用于 emphasis、grouping、status 或学科惯例，不得唯一编码。
12. graphical abstract 默认按缩略浏览场景设计；Elsevier 场景优先宽幅 500:200 近似比例。
13. summary / conceptual figure 默认检查 faux figure、overcrowding、ambiguous arrows。
14. 输出必须是 machine-readable schema，而不是空泛审美说明。
15. 用 checklist 审查：主旨、路径、焦点、分组、箭头、文字、缩小可读性、HTML 可映射性。
16. 若失败，回退到 key message、figure type 或 layout 重新生成，不要只做表面美化。

---

# Part G. Presentation Narrative and Template Reference Layer

本节在制作完整 PPT / HTML 演示时启用。它补充 Part C 的结构规则，但不把页面锁死为固定模板。

## 1. 先定义 communication job

在生成大纲前，必须回答：

1. audience 是谁，他们已经知道什么；
2. 他们最关心、最可能质疑什么；
3. 演讲的工作是 educate、persuade、recommend、review 还是 enable a decision；
4. 演讲结束时，观众应该 understand / believe / choose / approve / do 什么；
5. 哪些工作是 core contribution，哪些只是 supporting context。

必须形成一句：

> By the end, [audience] should [outcome] because [central takeaway].

## 2. 大纲不是目录

- 使用累积叙事：上一页提出的问题，由下一页回答或推进。
- 每页必须有 `audience_question`、`narrative_job`、`primary_claim`、`evidence`、`implication` 和 `transition_out`。
- 标题必须表达结论，不使用“研究背景 / 方法介绍 / 实验结果”这类纯主题标题。
- 重要性按 `core / support / context` 标注；当时间不足时，优先删 context，不压缩 core。
- 开场提出值得听的 tension / question；结尾必须回答它，并给出边界或行动，不用通用 Thank you 结束。

## 3. 每页内容最低论证单元

除极简封面和章节页外，每页至少包含：

1. 一个明确主张；
2. 两项以内的关键证据，或一项主证据加一个解释；
3. 证据对观众意味着什么；
4. 一句通向下一页的过渡。

演讲稿不能复制标题。每页 `talk_track` 应覆盖：承接、解释、证据、边界、过渡；论文汇报建议 120–260 个中文字。

论文结果页必须保持证据口径：

- 实验协议（seed、硬件、评估设置）只定义结论适用范围，不自动构成性能结果。
- `train / validation / test / OOD` 指标不得互换；标题、图表、结论和演讲稿都必须显式保留原始 split 与 metric。
- 若论文只展示 train SSR，不得因为存在 OOD 评估协议就推断或暗示 OOD 泛化已经得到验证。

## 4. 模板只提供构图语法

模板选择参考 `skill-references/presentation-layout-catalog.json`。其中的 recipe 是候选轮廓，不是 role 到 layout 的硬编码映射。

- 同一种内容可以因受众问题和证据形态选择不同 recipe。
- 相邻页面应避免连续使用相同轮廓。
- 页面优先使用一个整体构图，避免默认生成卡片墙或 UI dashboard。
- 组件可以复用，但视觉结果必须像 presentation composition，而不是网页后台。
- React / HTML 与 PPTX 应共享同一 `composition_id` 和内容语义；允许在不同媒介上采用不同实现。

## 5. 生成后必须做逻辑自检

逐页检查：

- 如果删掉本页，故事是否仍成立；若成立，本页可能是次要或重复内容。
- 本页主张是否由证据支持，而不是只靠措辞。
- 协议事实是否被误写成结果证据，train / validation / test / OOD 的口径是否贯穿标题、图表、结论与演讲稿。
- 观众是否知道“这对我意味着什么”。
- 本页结尾是否自然制造下一页的需求。
- speaker notes 是否足以让另一个人按同样逻辑讲清楚。

整套检查：

- 开场问题是否在结尾得到回答；
- core contribution 是否获得最多页面和最强证据；
- 背景是否抢占过多篇幅；
- 方法、结果、边界之间是否存在逻辑跳跃；
- 是否出现连续三页相同构图；
- 是否存在生产过程文案、占位文案或模型自述泄漏到观众页面。
