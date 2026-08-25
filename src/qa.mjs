import fs from "node:fs/promises";
import path from "node:path";
import { formatIssue, readJson, writeJson, writeText } from "./utils.mjs";
import { validateSpec } from "./validate-spec.mjs";

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

function issue(rule_id, severity, message, extra = {}) {
  return { id: `${rule_id}-${Math.random().toString(36).slice(2, 8)}`, rule_id, severity, message, ...extra };
}

const INTERNAL_COPY = [
  /generated from/i,
  /deterministic storyboard/i,
  /internal visual contract/i,
  /full[- ]paper/i,
  /由.{0,8}(?:页|字符).{0,8}(?:生成|提取)/,
  /内部(?:规划|制作|渲染)说明/,
];

const GENERIC_TITLES = new Set([
  "背景", "研究背景", "问题", "方法", "实验", "实验结果", "结果", "分析", "结论", "总结",
  "background", "problem", "method", "methods", "experiment", "experiments", "results", "analysis", "conclusion", "summary",
]);

function contentUnitCount(slide) {
  const content = slide.content || {};
  return [
    ...(content.body_points || []),
    ...(content.metrics || []),
    ...(content.steps || []),
    ...(content.columns || []),
    ...(slide.evidence || []),
    ...(content.note ? [content.note] : []),
    ...(content.result ? [content.result] : []),
    ...(content.takeaway ? [content.takeaway] : []),
  ].length;
}

function slideIssues(spec) {
  const issues = [];
  let assetSlideCount = 0;
  const claims = new Map();
  for (const slide of spec.slides) {
    const titles = slide.elements.filter((element) => element.role === "title");
    if (titles.length !== 1) issues.push(issue("TITLE_COUNT", "error", "页面应有且只有一个 title 元素", { slide_id: slide.id }));
    const textElements = slide.elements.filter((element) => element.kind === "text");
    for (const element of textElements) {
      const text = element.text || "";
      if (element.role === "title" && text.length > 38) issues.push(issue("TITLE_DENSITY", "warning", "标题较长，可能导致双输出换行差异", { slide_id: slide.id, element_id: element.id }));
      if (!["title", "eyebrow", "kicker", "subtitle"].includes(element.role) && text.length > 150) issues.push(issue("BODY_DENSITY", "warning", "正文较长，建议压缩或拆页", { slide_id: slide.id, element_id: element.id }));
    }
    if (slide.layout === "pipeline") {
      const steps = slide.elements.filter((element) => ["step", "parallel-check", "review-gate", "revision-output", "branch-gate"].includes(element.role));
      if (steps.length < 2 || steps.length > 5) issues.push(issue("PIPELINE_STEP_COUNT", "error", "pipeline 需要 2–5 个步骤", { slide_id: slide.id }));
      const plannedSteps = Math.min(5, (slide.content?.steps || []).length);
      if (plannedSteps && steps.length !== plannedSteps) issues.push(issue("PIPELINE_STEP_MAPPING", "error", `流程内容有 ${plannedSteps} 个步骤，但可编辑节点只有 ${steps.length} 个`, { slide_id: slide.id }));
      if (!slide.flow_model) issues.push(issue("FLOW_MODEL_MISSING", "error", "流程页必须声明 linear、branch 或 feedback 拓扑", { slide_id: slide.id }));
      if (!["linear", "branch", "feedback"].includes(slide.flow_model)) issues.push(issue("FLOW_MODEL_INVALID", "error", "流程页 flow_model 必须是 linear、branch 或 feedback", { slide_id: slide.id }));
      if (!(slide.reading_order_groups || []).length) issues.push(issue("FLOW_READING_GROUPS_MISSING", "error", "流程页必须声明顺序、并行或反馈阅读组", { slide_id: slide.id }));
      const elementIds = new Set(slide.elements.map((element) => element.id));
      for (const connectorElement of slide.elements.filter((element) => element.kind === "connector")) {
        if (!elementIds.has(connectorElement.data?.from) || !elementIds.has(connectorElement.data?.to)) {
          issues.push(issue("CONNECTOR_ENDPOINT_MISSING", "error", "连接线起点或终点不存在", { slide_id: slide.id, element_id: connectorElement.id }));
        }
        if (!connectorElement.data?.semantic || !connectorElement.data?.connector_style?.path || !connectorElement.data?.connector_style?.arrow) {
          issues.push(issue("CONNECTOR_SEMANTICS_MISSING", "error", "连接线缺少 semantic 或 connector_style", { slide_id: slide.id, element_id: connectorElement.id }));
        }
      }
    }
    if (slide.layout === "comparison") {
      const columns = slide.elements.filter((element) => element.role === "comparison-column");
      const hasComparisonTable = slide.composition_id === "evidence-table" && slide.elements.some((element) => element.kind === "table");
      if (!hasComparisonTable && (columns.length < 2 || columns.length > 3)) issues.push(issue("COMPARISON_COLUMN_COUNT", "error", "comparison 需要 2–3 个对比列，或一张对齐同位维度的原生表格", { slide_id: slide.id }));
    }
    if (slide.elements.length === 0) issues.push(issue("EMPTY_PAGE", "error", "页面没有任何元素", { slide_id: slide.id }));
    const visibleTitle = String(slide.content?.title || slide.action_title || "").trim();
    if (GENERIC_TITLES.has(visibleTitle.toLowerCase())) {
      issues.push(issue("GENERIC_TITLE", "warning", `标题“${visibleTitle}”只是主题标签，建议改成可直接讲出的结论`, { slide_id: slide.id }));
    }
    const publicCopy = [
      slide.action_title,
      slide.primary_claim,
      slide.content?.title,
      slide.content?.subtitle,
      slide.content?.lede,
    ].filter(Boolean).join(" ");
    if (INTERNAL_COPY.some((pattern) => pattern.test(publicCopy))) {
      issues.push(issue("INTERNAL_COPY_LEAK", "error", "页面泄露了生成流程或内部制作说明", { slide_id: slide.id }));
    }
    if (slide.role !== "title" && contentUnitCount(slide) < 2) {
      issues.push(issue("THIN_SLIDE", "warning", "页面只有主张，缺少支撑主张的可见内容或证据", { slide_id: slide.id }));
    }
    const claim = String(slide.primary_claim || "").trim();
    if (claim && claims.has(claim)) {
      issues.push(issue("DUPLICATE_CLAIM", "error", `与 ${claims.get(claim)} 重复同一页面主张`, { slide_id: slide.id }));
    } else if (claim) {
      claims.set(claim, slide.id);
    }
    const notes = slide.speaker_notes || {};
    const talkLength = [...String(notes.talk_track || slide.speaker_note || "")].length;
    if (talkLength < 80) {
      issues.push(issue("SPEAKER_NOTES_TOO_SHORT", "error", `逐页演讲稿仅 ${talkLength} 字，无法支撑完整讲述`, { slide_id: slide.id }));
    } else if (talkLength < 120 || talkLength > 260) {
      issues.push(issue("SPEAKER_NOTES_LENGTH", "warning", `逐页演讲稿为 ${talkLength} 字，建议控制在 120–260 字`, { slide_id: slide.id }));
    }
    if (!slide.audience_question || !slide.narrative_job || !slide.implication || !slide.transition_out) {
      issues.push(issue("NARRATIVE_CONTRACT", "error", "页面缺少观众问题、叙事任务、意义或转场", { slide_id: slide.id }));
    }
    const scopeCopy = [
      slide.action_title,
      slide.primary_claim,
      slide.implication,
      notes.talk_track,
      JSON.stringify(slide.content || {}),
    ].filter(Boolean).join(" ");
    const mixesTrainAndOod = /train\s*SSR/i.test(scopeCopy) && /\bOOD\b/i.test(scopeCopy);
    const statesOodBoundary = /(?:OOD[^。；;\n]{0,56}(?:不是|不等于|不能替代|未(?:提供|报告|展示|证明)|无[^。；;\n]{0,16}结果)|(?:不是|不等于|不能替代|未(?:提供|报告|展示|证明)|无[^。；;\n]{0,16}结果)[^。；;\n]{0,56}OOD)/i.test(scopeCopy);
    if (mixesTrainAndOod && !statesOodBoundary) {
      issues.push(issue("METRIC_SCOPE_AMBIGUOUS", "error", "同页混用 train SSR 与 OOD 协议，但没有明确说明 OOD 协议不等于 OOD 结果", { slide_id: slide.id }));
    }
    if (slide.content_priority === "core" && !(slide.evidence || []).length && !["method_overview", "method_detail"].includes(slide.role)) {
      issues.push(issue("CORE_EVIDENCE_MISSING", "error", "核心页面没有证据；若为方法页，应明确标注方法机制角色", { slide_id: slide.id }));
    }
    for (const [index, evidence] of (slide.evidence || []).entries()) {
      if (!evidence.claim_support || !evidence.interpretation) {
        issues.push(issue("EVIDENCE_MEANING_MISSING", "error", `证据 ${index + 1} 没有同时说明“支持什么”和“意味着什么”`, { slide_id: slide.id }));
      }
    }
    const imageElements = slide.elements.filter((element) => element.kind === "image");
    const evidenceVisuals = slide.elements.filter((element) => ["image", "table", "chart"].includes(element.kind));
    const visualPlan = slide.visual_plan || {};
    if (visualPlan.data_strategy === "native_table" && !slide.elements.some((element) => element.kind === "table")) {
      issues.push(issue("VISUAL_PLAN_DATA_MISMATCH", "error", "visual_plan 声明 native_table，但页面没有原生表格", { slide_id: slide.id }));
    }
    if (visualPlan.data_strategy === "native_chart" && !slide.elements.some((element) => element.kind === "chart")) {
      issues.push(issue("VISUAL_PLAN_DATA_MISMATCH", "error", "visual_plan 声明 native_chart，但页面没有原生图表", { slide_id: slide.id }));
    }
    if (visualPlan.data_strategy === "source_figure" && !imageElements.length) {
      issues.push(issue("VISUAL_PLAN_DATA_MISMATCH", "error", "visual_plan 声明 source_figure，但页面没有来源图片", { slide_id: slide.id }));
    }
    if (imageElements.length > 3) issues.push(issue("TEMPLATE_IMAGE_LIMIT", "error", `页面使用 ${imageElements.length} 张图片，超过每页最多 3 张的产品约束`, { slide_id: slide.id }));
    if (Number.isInteger(visualPlan.image_budget) && imageElements.length > visualPlan.image_budget) {
      issues.push(issue("TEMPLATE_IMAGE_LIMIT", "error", `页面使用 ${imageElements.length} 张图片，超过 visual_plan.image_budget=${visualPlan.image_budget}`, { slide_id: slide.id }));
    }
    const plannedRoles = Array.isArray(visualPlan.image_roles) ? visualPlan.image_roles : [];
    for (const element of imageElements) {
      const imageRole = element.data?.visual_role;
      if (!imageRole || !["hero", "evidence", "comparison", "context", "source-provenance"].includes(imageRole)) {
        issues.push(issue("TEMPLATE_IMAGE_ROLE", "error", "图片缺少合法的 visual_role（hero/evidence/comparison/context/source-provenance）", { slide_id: slide.id, element_id: element.id }));
      } else if (imageRole !== "source-provenance" && !plannedRoles.includes(imageRole)) {
        issues.push(issue("TEMPLATE_IMAGE_ROLE", "error", `图片角色 ${imageRole} 不在本页 visual_plan.image_roles 中`, { slide_id: slide.id, element_id: element.id }));
      }
      if (imageRole === "source-provenance" && element.role !== "source-provenance") {
        issues.push(issue("SOURCE_PROVENANCE_ROLE", "error", "来源核验图片必须同时使用 element.role=source-provenance", { slide_id: slide.id, element_id: element.id }));
      }
    }
    if (visualPlan.primary_visual && imageElements.length && !imageElements.some((element) => element.asset_ref === visualPlan.primary_visual)) {
      issues.push(issue("TEMPLATE_IMAGE_PRIMARY", "warning", "primary_visual 未成为本页实际使用的图片资产", { slide_id: slide.id }));
    }
    for (const element of slide.elements.filter((item) => item.kind === "table")) {
      const rows = Number(element.data?.rows || element.data?.values?.length || 0);
      const columns = Number(element.data?.columns || Math.max(0, ...(element.data?.values || []).map((row) => row.length)));
      const maxCellLength = Math.max(0, ...(element.data?.values || []).flatMap((row) => row || []).map((cell) => String(cell || "").length));
      if (rows > 12 || columns > 8) {
        issues.push(issue("TEMPLATE_TABLE_DENSITY", "warning", `原生表格为 ${rows} 行 × ${columns} 列，建议拆分或改为图表`, { slide_id: slide.id, element_id: element.id }));
      }
      if (maxCellLength > 180) {
        issues.push(issue("TABLE_RAW_DUMP", "error", `表格单元格最长 ${maxCellLength} 字，疑似把原始配置转储直接放入页面`, { slide_id: slide.id, element_id: element.id }));
      }
    }
    for (const element of slide.elements.filter((item) => item.kind === "chart")) {
      if (!element.data?.title || !element.data?.value_axis_label || !element.data?.accessibility_summary) {
        issues.push(issue("CHART_ACCESSIBILITY", "error", "原生图表必须提供标题、数值轴单位和可访问数据摘要", { slide_id: slide.id, element_id: element.id }));
      }
    }
    const mappedMetrics = slide.elements.filter((element) => element.role === "metric").length;
    if ((slide.content?.metrics || []).length && mappedMetrics < Math.min(3, slide.content.metrics.length) && ["image-thesis-split", "metric-triad"].includes(slide.composition_id)) {
      issues.push(issue("METRIC_MAPPING_MISSING", "error", "页面指标未全部映射为可编辑语义元素", { slide_id: slide.id }));
    }
    if ((slide.reading_order_groups || []).length) {
      const groupedIds = slide.reading_order_groups.flatMap((group) => group.items || []);
      const missingGroupedIds = groupedIds.filter((id) => !slide.elements.some((element) => element.id === id));
      if (missingGroupedIds.length) issues.push(issue("READING_GROUP_ELEMENT_MISSING", "error", `reading_order_groups 引用了不存在的元素：${missingGroupedIds.join(", ")}`, { slide_id: slide.id }));
      const orderPositions = groupedIds.map((id) => slide.reading_order.indexOf(id));
      if (orderPositions.some((position) => position < 0) || orderPositions.some((position, index) => index > 0 && position < orderPositions[index - 1])) {
        issues.push(issue("READING_ORDER_CONFLICT", "error", "reading_order 与 reading_order_groups 的语义顺序冲突", { slide_id: slide.id }));
      }
    }
    if (imageElements.length) assetSlideCount += 1;
    if (slide.role && slide.role !== "title" && !slide.action_title) issues.push(issue("ACTION_TITLE_MISSING", "warning", "页面缺少 action_title，内容编排不完整", { slide_id: slide.id }));
    if (slide.role && !["title", "problem", "gap", "contribution", "method_overview", "method_detail", "experiment_setup", "main_results", "analysis", "limitations", "content"].includes(slide.role)) {
      issues.push(issue("UNKNOWN_SLIDE_ROLE", "warning", `未知页面角色: ${slide.role}`, { slide_id: slide.id }));
    }
    const hasDiagram = ["method_diagram", "comparison_matrix"].includes(slide.visual_intent)
      && slide.elements.some((element) => element.kind === "connector" || [
        "step",
        "parallel-check",
        "review-gate",
        "revision-output",
        "branch-gate",
        "branch-output",
        "comparison-column",
        "metric",
      ].includes(element.role));
    if (slide.role && ["method_overview", "method_detail", "experiment_setup", "main_results", "analysis"].includes(slide.role) && !evidenceVisuals.length && !hasDiagram) {
      issues.push(issue("VISUAL_ASSET_MISSING", "warning", "方法/实验/结果页面没有图片、图表或证据资产", { slide_id: slide.id }));
    }
  }
  if (spec.slides.length >= 8 && assetSlideCount < Math.min(4, spec.slides.length - 1)) {
    issues.push(issue("PAPER_IMAGE_COVERAGE", "warning", `论文模式有资产的页面仅 ${assetSlideCount} 页，建议至少 4 页`));
  }
  const logic = spec.narrative?.logic_check || {};
  for (const [field, label] of [["opening_resolved", "开场问题未被结尾回答"], ["core_has_evidence", "核心主张缺少证据"], ["no_redundant_slides", "大纲仍有重复页面"]]) {
    if (logic[field] !== true) issues.push(issue("NARRATIVE_LOGIC_CHECK", "error", label));
  }
  const allSlideIds = new Set(spec.slides.map((slide) => slide.id));
  const priorityIds = [
    ...(spec.narrative?.priority_map?.core || []),
    ...(spec.narrative?.priority_map?.support || []),
    ...(spec.narrative?.priority_map?.context || []),
  ];
  if (priorityIds.length !== spec.slides.length || new Set(priorityIds).size !== spec.slides.length || priorityIds.some((id) => !allSlideIds.has(id))) {
    issues.push(issue("PRIORITY_MAP_INCOMPLETE", "error", "core/support/context 没有对每一页进行一次且仅一次的主次划分"));
  }
  if (spec.slides.length >= 8 && (spec.narrative?.priority_map?.core || []).length < 4) {
    issues.push(issue("PAPER_CORE_TOO_SMALL", "warning", "论文汇报的核心工作与关键证据页少于 4 页，背景可能占比过高"));
  }
  for (let index = 2; index < spec.slides.length; index += 1) {
    if (spec.slides[index - 2].layout === spec.slides[index - 1].layout && spec.slides[index - 1].layout === spec.slides[index].layout) {
      issues.push(issue("REPEATED_LAYOUT", "warning", "连续三页使用相同布局，建议切换 layout family", { slide_id: spec.slides[index].id }));
    }
    if (spec.slides[index - 2].composition_id === spec.slides[index - 1].composition_id && spec.slides[index - 1].composition_id === spec.slides[index].composition_id) {
      issues.push(issue("REPEATED_COMPOSITION", "warning", "连续三页使用同一语义构图，演示轮廓过于单调", { slide_id: spec.slides[index].id }));
    }
  }
  return issues;
}

async function crossOutputIssues(spec, inputDir, requestedFormat) {
  const issues = [];
  const htmlPath = path.join(inputDir, "presentation.html");
  const pptxPath = path.join(inputDir, "presentation.pptx");
  if (["html", "both"].includes(requestedFormat) && !(await exists(htmlPath))) issues.push(issue("MISSING_HTML", "error", "缺少 presentation.html"));
  if (["pptx", "both"].includes(requestedFormat) && !(await exists(pptxPath))) issues.push(issue("MISSING_PPTX", "error", "缺少 presentation.pptx"));
  if (await exists(htmlPath)) {
    const html = await fs.readFile(htmlPath, "utf8");
    const slideCount = (html.match(/<section\s+class="slide(?:\s|")/g) || []).length;
    if (slideCount !== spec.slides.length) issues.push(issue("HTML_SLIDE_COUNT", "error", `HTML 页数 ${slideCount} 与规格 ${spec.slides.length} 不一致`));
    for (const slide of spec.slides) {
      if (!html.includes(`id="${slide.id}"`)) issues.push(issue("HTML_SLIDE_ID", "error", `HTML 缺少页面 ${slide.id}`, { slide_id: slide.id }));
    }
  }
  const inspectPath = path.join(inputDir, "preview", "pptx-inspect.ndjson");
  if (await exists(inspectPath)) {
    const inspect = await fs.readFile(inspectPath, "utf8");
    if (!inspect.includes("textbox")) issues.push(issue("PPTX_EDITABILITY", "error", "PPTX 预览检查未发现原生文本框"));
    if ((inspect.match(/slide/g) || []).length < spec.slides.length) issues.push(issue("PPTX_SLIDE_COUNT", "warning", "PPTX inspect 结果无法确认所有页面"));
  }
  for (const asset of spec.assets || []) {
    if (!(await exists(path.join(inputDir, asset.path)))) {
      issues.push(issue("MISSING_ASSET", "warning", `规格引用的资产不存在: ${asset.path}`, { element_id: asset.id }));
    }
  }
  return issues;
}

export async function runQa({ specPath, inputDir, requestedFormat = "both" }) {
  const spec = await readJson(specPath);
  const validation = validateSpec(spec);
  const issues = [
    ...validation.errors.map((item) => ({ ...item, id: `${item.rule_id}-schema` })),
    ...validation.warnings.map((item) => ({ ...item, id: `${item.rule_id}-schema` })),
    ...slideIssues(spec),
    ...(await crossOutputIssues(spec, inputDir, requestedFormat)),
  ];
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  const report = {
    run_id: `${new Date().toISOString()}-${spec.deck.id}`,
    spec_version: spec.spec_version,
    status: errors.length ? "fail" : "pass",
    summary: { slides: spec.slides.length, errors: errors.length, warnings: warnings.length, passed: Math.max(0, 12 - errors.length - warnings.length) },
    issues,
    artifacts: {
      spec: "deck.spec.json",
      html: (await exists(path.join(inputDir, "presentation.html"))) ? "presentation.html" : null,
      pptx: (await exists(path.join(inputDir, "presentation.pptx"))) ? "presentation.pptx" : null,
      montage: (await exists(path.join(inputDir, "preview/pptx-montage.webp"))) ? "preview/pptx-montage.webp" : null,
    },
  };
  await writeJson(path.join(inputDir, "qa", "report.json"), report);
  const lines = [
    `# QA Report: ${spec.deck.title}`,
    "",
    `- Status: **${report.status.toUpperCase()}**`,
    `- Slides: ${report.summary.slides}`,
    `- Errors: ${report.summary.errors}`,
    `- Warnings: ${report.summary.warnings}`,
    "",
    "## Issues",
    "",
    ...(issues.length ? issues.map(formatIssue).map((line) => `- ${line}`) : ["- No blocking issues."]),
    "",
    "## Human Review",
    "",
    "- [ ] 阅读入口明确",
    "- [ ] 页面密度适中",
    "- [ ] HTML 与 PPTX 没有明显换行/裁切差异",
    "- [ ] PPTX 核心文字和形状可以继续编辑",
  ];
  await writeText(path.join(inputDir, "qa", "report.md"), `${lines.join("\n")}\n`);
  return report;
}
