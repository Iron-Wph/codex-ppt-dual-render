import path from "node:path";
import { readJson } from "./utils.mjs";
import { assertValidSpec } from "./validate-spec.mjs";
import { writeJson } from "./utils.mjs";
import { resolveEvidenceAssets, resolveEvidenceTables } from "./evidence-index.mjs";
import { chooseTheme } from "./theme-presets.mjs";
import { normalizeVisualPlan } from "./visual-plan.mjs";

function text(id, role, value, render_mode = "native") {
  return { id, kind: "text", role, text: value, editable: true, render_mode };
}

function shape(id, role, data, render_mode = "native") {
  return { id, kind: "shape", role, data, editable: true, render_mode };
}

function connector(id, role, data) {
  return { id, kind: "connector", role, data, editable: true, render_mode: "native" };
}

function image(id, role, asset, visualRole = "evidence") {
  return {
    id,
    kind: "image",
    role,
    editable: false,
    render_mode: "asset",
    asset_ref: asset.id,
    source_page: asset.source_page ?? null,
    alt_text: asset.alt_text || asset.caption || "论文证据图片",
    data: {
      path: asset.path,
      caption: asset.caption || "论文证据图片",
      placement: "corner",
      fit: asset.crop ? "contain" : "cover",
      crop: Boolean(asset.crop),
      table_ref: asset.table_ref || null,
      visual_role: visualRole,
    },
  };
}

function tableElement(id, role, table) {
  return {
    id,
    kind: "table",
    role,
    editable: true,
    render_mode: "native",
    source_page: table.source_page ?? null,
    data: {
      table_ref: table.id,
      caption: table.label || table.caption || "Paper table",
      values: table.values || [],
      categories: table.categories || [],
      rows: table.rows || table.values?.length || 0,
      columns: table.columns || Math.max(0, ...(table.values || []).map((row) => row.length)),
    },
  };
}

function numericChartFromTable(table) {
  const values = (table.values || []).flatMap((row) => row || [])
    .map((value) => String(value).replace(/[%+,]/g, "").trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (values.length < 2) return null;
  const clipped = values.slice(0, 8);
  const categories = Array.isArray(table.categories) && table.categories.length
    ? table.categories.slice(0, clipped.length)
    : clipped.map((_, index) => `Metric ${index + 1}`);
  return {
    categories,
    series: [{ name: table.label || "Paper values", values: clipped }],
  };
}

function chartElement(id, role, table) {
  const chart = numericChartFromTable(table);
  if (!chart) return null;
  return {
    id,
    kind: "chart",
    role,
    editable: true,
    render_mode: "native",
    source_page: table.source_page ?? null,
    data: { table_ref: table.id, chart_type: "bar", label: table.label || null, ...chart },
  };
}

function visibleText(value, fallback = "") {
  const textValue = String(value ?? "").trim();
  return textValue && !/^[.。…]+$/.test(textValue) ? textValue : fallback;
}

function compactBody(value, fallback = "", maxLength = 86) {
  const textValue = visibleText(value, fallback);
  return textValue.length > maxLength ? `${textValue.slice(0, maxLength - 1)}…` : textValue;
}

function compactStepTitle(value, fallback) {
  const title = visibleText(value, fallback);
  const aliases = {
    "Dynamic Sampling": "动态采样",
    "Clip-Higher": "Clip-Higher",
    "Higher Temperature": "高温采样",
  };
  return aliases[title] || (title.length > 18 ? `${title.slice(0, 17)}…` : title);
}

function contentColumns(content, count = 2) {
  const columns = Array.isArray(content.columns) ? content.columns.slice(0, count) : [];
  return columns.map((column, index) => ({
    label: visibleText(column?.label, `POINT ${index + 1}`),
    headline: visibleText(column?.headline, "Key finding"),
    points: Array.isArray(column?.points) ? column.points.slice(0, 2).map((point) => compactBody(point, "", 42)).filter(Boolean) : [],
    tone: column?.tone || (index % 2 ? "coral" : "lime"),
  }));
}

function makeFallbackColumns(content, claim, count = 2) {
  const source = contentColumns(content, count);
  while (source.length < count) {
    const index = source.length;
    source.push({
      label: `POINT ${index + 1}`,
      headline: index === 0 ? compactBody(content.subtitle || claim, "Key finding", 36) : "Evidence and implication",
      points: index === 0 ? [compactBody(claim, "", 48)] : ["用原始证据支持页面主张"],
      tone: index % 2 ? "coral" : "lime",
    });
  }
  return source;
}

function addHeading(elements, id, content, claim, kicker) {
  elements.push(text(`${id}-title`, "title", visibleText(content.title, claim)));
  elements.push(text(`${id}-kicker`, "kicker", visibleText(content.kicker, kicker)));
}

function addCustomLayoutElements(elements, layout, slide, content) {
  const columns = makeFallbackColumns(content, slide.primary_claim, 2);
  const result = content.result || content.note || content.takeaway || {};
  if (layout === "hero-image") {
    elements.push(text(`${slide.id}-eyebrow`, "eyebrow", visibleText(content.eyebrow, "RESEARCH BRIEF")));
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    elements.push(text(`${slide.id}-subtitle`, "subtitle", visibleText(content.subtitle, "")));
    elements.push(shape(`${slide.id}-note`, "hero-note", { label: result.label || "CORE CLAIM", value: result.value || slide.primary_claim, tone: result.tone || "lime" }));
    return;
  }
  if (layout === "metric-stage") {
    addHeading(elements, slide.id, content, slide.primary_claim, "KEY CONTRIBUTION");
    elements.push(shape(`${slide.id}-metric`, "metric-stage", {
      label: result.label || "KEY MOVE",
      value: compactBody(result.value || content.subtitle || "01", "01", 38),
      detail: compactBody(slide.primary_claim, "", 110),
      tone: result.tone || "lime",
    }));
    return;
  }
  if (layout === "story-split") {
    addHeading(elements, slide.id, content, slide.primary_claim, "THE STORY");
    for (const [index, column] of columns.entries()) {
      elements.push(shape(`${slide.id}-story-${index + 1}`, index === 0 ? "story-primary" : "story-support", column));
    }
    return;
  }
  if (layout === "chart-focus") {
    addHeading(elements, slide.id, content, slide.primary_claim, "RESULT FOCUS");
    elements.push(shape(`${slide.id}-result-callout`, "result-callout", {
      label: result.label || "KEY RESULT",
      value: compactBody(result.value || columns[0].headline, "Evidence-backed result", 44),
      detail: compactBody(result.detail || columns[0].points?.[0] || slide.primary_claim, "", 92),
      tone: result.tone || "lime",
    }));
    return;
  }
  if (layout === "matrix") {
    addHeading(elements, slide.id, content, slide.primary_claim, "DECISION MATRIX");
    const cells = columns.flatMap((column) => [
      { title: column.label, text: column.headline, tone: column.tone },
      { title: "WHAT IT MEANS", text: column.points?.[0] || slide.primary_claim, tone: column.tone },
    ]).slice(0, 4);
    for (const [index, cell] of cells.entries()) elements.push(shape(`${slide.id}-matrix-${index + 1}`, "matrix-cell", cell));
    return;
  }
  if (layout === "timeline") {
    addHeading(elements, slide.id, content, slide.primary_claim, "METHOD TIMELINE");
    const steps = Array.isArray(content.steps) && content.steps.length ? content.steps.slice(0, 4) : columns.map((column, index) => ({ title: column.headline, text: column.points?.[0], metric: String(index + 1).padStart(2, "0"), tone: column.tone }));
    for (const [index, rawStep] of steps.entries()) {
      const step = rawStep || {};
      elements.push(shape(`${slide.id}-timeline-${index + 1}`, "timeline-node", {
        title: compactStepTitle(step.title, `Step ${index + 1}`),
        text: compactBody(step.text, "", 74),
        metric: step.metric || String(index + 1).padStart(2, "0"),
        tone: step.tone || (index % 2 ? "coral" : "lime"),
      }));
    }
    return;
  }
  if (layout === "evidence-collage") {
    addHeading(elements, slide.id, content, slide.primary_claim, "EVIDENCE COLLAGE");
    elements.push(shape(`${slide.id}-collage-takeaway`, "collage-takeaway", {
      label: result.label || "READOUT",
      value: compactBody(result.value || content.takeaway?.value || slide.primary_claim, slide.primary_claim, 120),
    }));
    return;
  }
  addHeading(elements, slide.id, content, slide.primary_claim, "PAPER EVIDENCE");
}

function specSlideFromCodex(slide, evidenceAssets = [], evidenceTables = []) {
  const content = slide.content || {};
  const visualPlan = normalizeVisualPlan(slide, { paperMode: Boolean(slide.role && slide.role !== "content") });
  const layout = visualPlan.layout_family;
  const elements = [];
  if (layout === "title") {
    const note = content.note && typeof content.note === "object" ? content.note : { label: "THE CORE MOVE", value: content.note || "STRUCTURE ONCE → RENDER TWICE" };
    elements.push(text(`${slide.id}-eyebrow`, "eyebrow", visibleText(content.eyebrow, "CODEX / PRESENTATION MVP")));
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    elements.push(text(`${slide.id}-subtitle`, "subtitle", visibleText(content.subtitle, "")));
    elements.push(shape(`${slide.id}-note`, "hero-note", { label: note.label || "THE CORE MOVE", value: note.value || "STRUCTURE ONCE → RENDER TWICE", tone: note.tone || "lime" }));
  } else if (layout === "pipeline") {
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    elements.push(text(`${slide.id}-kicker`, "kicker", visibleText(content.kicker, "THE PIPELINE")));
    const steps = Array.isArray(content.steps) ? content.steps.slice(0, 4) : [];
    for (const [index, rawStep] of steps.entries()) {
      const step = rawStep || {};
      elements.push(shape(`${slide.id}-step-${index + 1}`, "step", {
        title: compactStepTitle(step.title, `Step ${index + 1}`),
        text: compactBody(step.text, "", 86),
        metric: step.metric || String(index + 1).padStart(2, "0"),
        tone: step.tone || (index % 2 ? "coral" : "lime"),
        index: index + 1,
      }));
      if (index < steps.length - 1) elements.push(connector(`${slide.id}-connector-${index + 1}`, "connector", { from: `${slide.id}-step-${index + 1}`, to: `${slide.id}-step-${index + 2}` }));
    }
    const result = content.result || {};
    elements.push(shape(`${slide.id}-result`, "result", { label: result.label || "RESULT", value: result.value || "可交付结果" }));
  } else if (layout === "comparison") {
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    for (const [index, rawColumn] of (Array.isArray(content.columns) ? content.columns.slice(0, 3) : []).entries()) {
      const column = rawColumn || {};
      elements.push(shape(`${slide.id}-column-${index + 1}`, "comparison-column", {
        label: column.label || `OPTION ${index + 1}`,
        headline: column.headline || "Output",
        points: Array.isArray(column.points) ? column.points.slice(0, 4).map((point) => compactBody(point, "", 78)) : [],
        tone: column.tone || (index % 2 ? "lime" : "coral"),
      }));
    }
    const takeaway = content.takeaway || {};
    elements.push(shape(`${slide.id}-takeaway`, "takeaway", { label: takeaway.label || "SHARED SPEC", value: takeaway.value || "结构只维护一份" }));
  } else if (layout === "insight") {
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    for (const [index, rawColumn] of (Array.isArray(content.columns) ? content.columns.slice(0, 2) : []).entries()) {
      const column = rawColumn || {};
      elements.push(shape(`${slide.id}-insight-${index + 1}`, "insight-block", {
        label: column.label || `INSIGHT ${index + 1}`,
        headline: column.headline || "Insight",
        points: Array.isArray(column.points) ? column.points.slice(0, 4).map((point) => compactBody(point, "", 78)) : [],
        tone: column.tone || (index % 2 ? "coral" : "lime"),
      }));
    }
    const takeaway = content.takeaway || {};
    elements.push(shape(`${slide.id}-insight-takeaway`, "takeaway", { label: takeaway.label || "TAKEAWAY", value: takeaway.value || "从证据中提炼可执行结论" }));
  }
  if (layout === "evidence") {
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    elements.push(text(`${slide.id}-kicker`, "kicker", visibleText(content.kicker, "PAPER EVIDENCE")));
  }
  if (["hero-image", "metric-stage", "story-split", "chart-focus", "matrix", "timeline", "evidence-collage"].includes(layout)) {
    addCustomLayoutElements(elements, layout, slide, content);
  }
  const assetRefs = [visualPlan.primary_visual, ...(slide.evidence_refs || []), ...(slide.asset_candidates || [])].filter(Boolean);
  const resolvedAssets = resolveEvidenceAssets({ assets: evidenceAssets }, assetRefs);
  const primaryAsset = visualPlan.primary_visual ? resolvedAssets.find((asset) => asset.id === visualPlan.primary_visual) : null;
  const assets = [primaryAsset, ...resolvedAssets.filter((asset) => asset.id !== primaryAsset?.id)].filter(Boolean).slice(0, visualPlan.image_budget);
  if (assets.length && slide.visual_intent !== "text_led" && slide.visual_intent !== "decorative_none") {
    for (const [index, asset] of assets.entries()) {
      elements.push(image(`${slide.id}-evidence-figure-${index + 1}`, "evidence-figure", asset, visualPlan.image_roles[index] || "evidence"));
    }
  }
  const tableRefs = [...(slide.table_refs || [])];
  const tables = resolveEvidenceTables({ tables: evidenceTables }, tableRefs).slice(0, 1);
  for (const table of tables) {
    if (slide.visual_intent === "data_chart") {
      const chart = chartElement(`${slide.id}-evidence-chart`, "evidence-chart", table);
      if (chart) elements.push(chart);
      else elements.push(tableElement(`${slide.id}-evidence-table`, "evidence-table", table));
    } else {
      elements.push(tableElement(`${slide.id}-evidence-table`, "evidence-table", table));
    }
  }
  return {
    id: slide.id,
    layout,
    role: slide.role || "content",
    action_title: slide.action_title || slide.primary_claim,
    slide_goal: slide.slide_goal,
    primary_claim: slide.primary_claim,
    evidence_refs: slide.evidence_refs || [],
    table_refs: slide.table_refs || [],
    asset_candidates: slide.asset_candidates || [],
    visual_intent: slide.visual_intent || "text_led",
    visual_plan: visualPlan,
    speaker_note: slide.speaker_note || "",
    reading_order: elements.map((element) => element.id),
    elements,
    review_flags: [],
  };
}

function makePipelineSlide(id, goal, claim, title, kicker, steps, result) {
  const elements = [text(`${id}-title`, "title", title), text(`${id}-kicker`, "kicker", kicker)];
  for (const [index, step] of steps.entries()) {
    elements.push(shape(`${id}-step-${index + 1}`, "step", { ...step, index: index + 1, tone: index % 2 ? "coral" : "lime" }));
    if (index < steps.length - 1) elements.push(connector(`${id}-connector-${index + 1}`, "connector", { from: `${id}-step-${index + 1}`, to: `${id}-step-${index + 2}` }));
  }
  elements.push(shape(`${id}-result`, "result", result));
  return { id, layout: "pipeline", slide_goal: goal, primary_claim: claim, reading_order: elements.map((item) => item.id), elements, review_flags: [] };
}

function withVisualPlan(slide) {
  const visualPlan = normalizeVisualPlan(slide);
  return { ...slide, layout: visualPlan.layout_family, visual_plan: visualPlan };
}

export function specFromPlan(plan, { evidenceIndex = null, themeId = "auto" } = {}) {
  const { deck, narrative, plan: content } = plan;
  const theme = chooseTheme(plan, themeId);
  const evidenceAssets = evidenceIndex?.assets || [];
  const shared = {
    spec_version: "0.2.0",
    deck,
    theme,
    visual: plan.visual || { style_family: theme.id, image_policy: "source-figure-first", density_profile: "balanced" },
    evidence: evidenceIndex ? {
      input: evidenceIndex.input,
      parser: evidenceIndex.parser,
      page_count: evidenceIndex.page_count,
      character_count: evidenceIndex.character_count,
      sections: evidenceIndex.sections,
      claims: evidenceIndex.claims,
    } : undefined,
    assets: evidenceAssets,
    tables: evidenceIndex?.tables || [],
    narrative,
  };

  if (Array.isArray(content?.slides) && content.slides.length > 0) {
    return {
      ...shared,
      slides: content.slides.map((slide) => specSlideFromCodex(slide, evidenceAssets, evidenceIndex?.tables || [])),
    };
  }

  const methodBullets = content.method.bullets;
  const outputBullets = content.output.bullets;
  const qaBullets = content.qa.bullets;

  return {
    ...shared,
    slides: [
      {
        id: "slide-001",
        layout: "title",
        slide_goal: "建立双渲染方法的上下文",
        primary_claim: "一份结构化规格，可以同时服务网页演示与原生 PPTX",
        reading_order: ["slide-001-eyebrow", "slide-001-title", "slide-001-subtitle", "slide-001-note"],
        elements: [
          text("slide-001-eyebrow", "eyebrow", "CODEX / PRESENTATION MVP"),
          text("slide-001-title", "title", deck.title),
          text("slide-001-subtitle", "subtitle", content.subtitle),
          shape("slide-001-note", "hero-note", { label: "THE CORE MOVE", value: "STRUCTURE ONCE → RENDER TWICE", tone: "lime" })
        ],
        review_flags: []
      },
      makePipelineSlide(
        "slide-002",
        "解释从输入到可交付演示的最短路径",
        "把内容分析、结构规格、双渲染和 QA 串成一条可重复流水线。",
        "从内容到演示，只维护一份规格",
        "THE PIPELINE",
        [
          { title: "Plan", text: "提炼主张、受众和阅读顺序", metric: "01" },
          { title: "Schema", text: "落盘为可校验的 deck.spec.json", metric: "02" },
          { title: "Render", text: "HTML 与原生 PPTX 并行输出", metric: "03" },
          { title: "Review", text: "截图、溢出、重叠与一致性检查", metric: "04" }
        ],
        { label: "RESULT", value: "可浏览 + 可编辑 + 可复核" }
      ),
      {
        id: "slide-003",
        layout: "comparison",
        slide_goal: "说明两种输出的分工",
        primary_claim: "HTML 负责表达速度，PPTX 负责后续编辑，共享规格负责一致性。",
        reading_order: ["slide-003-title", "slide-003-column-html", "slide-003-column-pptx", "slide-003-takeaway"],
        elements: [
          text("slide-003-title", "title", "HTML 负责表达，PPTX 负责编辑"),
          shape("slide-003-column-html", "comparison-column", { label: "HTML / WEB", tone: "coral", headline: "快速演示", points: outputBullets.slice(0, 3).length ? outputBullets.slice(0, 3) : ["浏览器直接打开", "支持轻量动效", "适合快速迭代"] }),
          shape("slide-003-column-pptx", "comparison-column", { label: "PPTX / OFFICE", tone: "lime", headline: "继续编辑", points: ["标题和正文是文本框", "流程节点是原生形状", "结构与输出可追踪"] }),
          shape("slide-003-takeaway", "takeaway", { label: "SHARED SPEC", value: "页面语义、层级、分组和连接关系只维护一份" })
        ],
        review_flags: []
      },
      makePipelineSlide(
        "slide-004",
        "展示质量检查如何把视觉结果拉回可交付状态",
        "质量检查不是最后的补丁，而是双渲染闭环中的一等模块。",
        "质量检查把漂亮与可交付连起来",
        "THE QA LOOP",
        [
          { title: "Schema", text: qaBullets[0] || "规格完整、合法、可追踪", metric: "01" },
          { title: "Geometry", text: qaBullets[1] || "溢出、重叠、裁切检查", metric: "02" },
          { title: "Compare", text: qaBullets[2] || "双输出页数与内容一致", metric: "03" },
          { title: "Revise", text: qaBullets[3] || "定位元素后重新渲染", metric: "04" }
        ],
        { label: "DONE", value: "发现问题 → 修订规格 → 再次验证" }
      )
    ].map(withVisualPlan)
  };
}

export async function writeSpec(plan, outPath, { themeId = "auto" } = {}) {
  const evidencePath = path.join(path.dirname(outPath), "codex", "evidence-index.json");
  let evidenceIndex = null;
  try { evidenceIndex = await readJson(evidencePath); } catch { /* deterministic planner has no evidence index */ }
  const spec = specFromPlan(plan, { evidenceIndex, themeId: themeId || plan?.theme_id || "auto" });
  assertValidSpec(spec);
  await writeJson(outPath, spec);
  return spec;
}
