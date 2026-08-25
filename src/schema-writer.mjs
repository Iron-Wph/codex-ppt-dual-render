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

function compactBoundaryEvidenceTable(table) {
  const cleanCell = (value) => String(value ?? "")
    .replaceAll("\u200b", "")
    .replace(/^oft\(Temp_eval=([^)]*)\)/i, "OFT T=$1")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
  const values = (table.values || []).slice(0, 5).map((row) => (row || []).slice(0, 4).map(cleanCell));
  return {
    ...table,
    values,
    rows: values.length,
    columns: Math.max(0, ...values.map((row) => row.length)),
    label: table.label || "初始化与评估温度敏感性（精简证据表）",
  };
}

function numericChartFromTable(table) {
  const parseNumber = (value) => {
    const match = String(value ?? "").replaceAll("\u200b", "").replaceAll(",", "").match(/[-+]?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : Number.NaN;
  };
  const rows = (table.values || []).map((row) => row || []);
  const header = (rows[0] || []).map((value) => String(value || "").replaceAll("\u200b", "").trim().toLowerCase());
  const taskIndex = header.findIndex((value) => /task|model|任务|模式|mode/.test(value));
  const rlinfSftIndex = header.findIndex((value) => /rlinf/.test(value) && /sft/.test(value));
  const rlinfRlIndex = header.findIndex((value) => /rlinf/.test(value) && /(?:\brl\b|grpo|ppo)/.test(value));
  if (taskIndex >= 0 && rlinfSftIndex >= 0 && rlinfRlIndex >= 0) {
    const dataRows = rows.slice(1).filter((row) => Number.isFinite(parseNumber(row[rlinfSftIndex])) && Number.isFinite(parseNumber(row[rlinfRlIndex])));
    if (dataRows.length >= 2) {
      return {
        categories: dataRows.slice(0, 8).map((row) => String(row[taskIndex] || "").replaceAll("\u200b", "").trim().replaceAll("_", " ")),
        series: [
          { name: "RLinf SFT", values: dataRows.slice(0, 8).map((row) => parseNumber(row[rlinfSftIndex])) },
          { name: "RLinf RL", values: dataRows.slice(0, 8).map((row) => parseNumber(row[rlinfRlIndex])) },
        ],
      };
    }
  }
  const values = rows.flatMap((row) => row)
    .map(parseNumber)
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
  const firstSeries = chart.series?.[0];
  const secondSeries = chart.series?.[1];
  const summary = secondSeries
    ? `${chart.categories.length} 个任务的 ${firstSeries.name} 与 ${secondSeries.name} train SSR 对比；所有精确数值均以数据标签呈现。`
    : `${chart.categories.length} 个类别的论文数值对比；所有精确数值均以数据标签呈现。`;
  return {
    id,
    kind: "chart",
    role,
    editable: true,
    render_mode: "native",
    source_page: table.source_page ?? null,
    data: {
      table_ref: table.id,
      chart_type: "bar",
      label: table.label || null,
      title: "各任务 RLinf SFT 与 RL 的 train SSR",
      category_axis_label: "RoboTwin task",
      value_axis_label: "train SSR (%)",
      accessibility_summary: summary,
      ...chart,
    },
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
  return aliases[title] || (title.length > 28 ? `${title.slice(0, 27)}…` : title);
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

function isQaFeedbackFlow(steps = []) {
  const titles = steps.map((step) => String(step?.title || "").toLowerCase());
  return steps.length >= 5
    && titles.some((title) => /schema/.test(title))
    && titles.some((title) => /geometry/.test(title))
    && titles.some((title) => /cross/.test(title))
    && titles.some((title) => /review/.test(title))
    && titles.some((title) => /修订|渲染|render/.test(title));
}

function isDualOutputFlow(steps = []) {
  const text = steps.map((step) => `${step?.title || ""} ${step?.text || ""}`).join(" ");
  return steps.length >= 2 && /html/i.test(text) && /pptx/i.test(text) && /双输出|两个出口|two outputs?/i.test(text);
}

function addStepShape(elements, slideId, step, index, role = "step") {
  elements.push(shape(`${slideId}-step-${index + 1}`, role, {
    title: compactStepTitle(step?.title, `Step ${index + 1}`),
    text: compactBody(step?.text, "", 86),
    metric: step?.metric || String(index + 1).padStart(2, "0"),
    tone: step?.tone || (index % 2 ? "coral" : "lime"),
    index: index + 1,
  }));
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
      value: compactBody(result.value || columns[0].headline, "Evidence-backed result", 72),
      detail: compactBody(result.detail || content.lede || columns[0].points?.[0] || slide.primary_claim, "", 92),
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
  let content = slide.content || {};
  let compiledEvidence = slide.evidence || [];
  let compiledNarrativeJob = slide.narrative_job || slide.slide_goal;
  let compiledImplication = slide.implication || slide.primary_claim;
  let compiledSpeakerNotes = slide.speaker_notes;
  let compiledEvidenceRefs = slide.evidence_refs || [];
  let compiledTableRefs = slide.table_refs || [];
  let compiledAssetCandidates = slide.asset_candidates || [];
  let compiledVisualIntent = slide.visual_intent || "text_led";
  let visualPlan = normalizeVisualPlan(slide, { paperMode: Boolean(slide.role && slide.role !== "content") });
  const layout = visualPlan.layout_family;
  if (slide.composition_id === "image-thesis-split") {
    visualPlan = { ...visualPlan, data_strategy: visualPlan.image_budget > 0 ? "source_figure" : "none" };
  }
  if (slide.composition_id === "answer-and-boundary") {
    const hasSourceTable = slide.visual_intent === "source_table" && (slide.table_refs || []).length > 0;
    visualPlan = {
      ...visualPlan,
      primary_visual: null,
      image_budget: 0,
      image_roles: [],
      data_strategy: hasSourceTable ? "native_table" : "none",
    };
    compiledVisualIntent = hasSourceTable ? "source_table" : "text_led";
    compiledAssetCandidates = [];
  }
  if (layout === "matrix" && slide.composition_id === "evidence-table" && (slide.table_refs || []).length) {
    content = {
      ...content,
      lede: "在同一 8 卡条件下，对齐比较 actor 与 rollout 时间。",
      note: null,
      columns: [],
      body_points: [],
      metrics: [],
      takeaway: {
        label: content.takeaway?.label || "选型结论",
        value: "在当前 8 卡条件下，colocated 的 actor/rollout 更有竞争力；其他模式应按同一口径逐项比较。",
      },
    };
    compiledNarrativeJob = "在同一 8 卡条件下比较不同并行模式的 actor 与 rollout 时间，给出当前配置的选型判断。";
    compiledImplication = content.takeaway.value;
    compiledEvidence = compiledEvidence.filter((item) => String(item?.evidence_ref || "").startsWith("p6-"));
    compiledEvidenceRefs = ["p6-table-2", "p6-table-2-crop"];
    compiledTableRefs = ["p6-table-2"];
    compiledAssetCandidates = ["p6-table-2-crop"];
    compiledSpeakerNotes = {
      ...(slide.speaker_notes || {}),
      talk_track: "这一页只回答当前 8 卡条件下应该优先考察哪种并行模式。RLinf colocated 的 actor/rollout 为 49.15/170.34 秒，低于 SimpleVLA 的 94.05/189.33 秒；同为 8 卡，disaggregated 的 rollout 达到 546.64 秒，两个 Hybrid 配置也高于 colocated。因而这里支持的是明确配置下的选型判断，不外推到不同节点规模；进入结论页后，再把效率证据与性能增益、归因边界合并起来。",
      delivery_cue: "先比较 colocated 与 SimpleVLA，再指出其他 8 卡模式的成本，最后限定结论范围。",
      source_refs: ["p6-table-2", "p6-table-2-crop"],
      estimated_seconds: 80,
    };
  }
  if (slide.composition_id === "answer-and-boundary") content = { ...content, metrics: [] };
  if (slide.composition_id === "chart-with-interpretation-rail") compiledEvidence = compiledEvidence.slice(0, 2);
  const elements = [];
  let flowModel = null;
  let readingOrderGroups = [];
  let connectorLegend = [];
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
    const allSteps = Array.isArray(content.steps) ? content.steps.slice(0, 5) : [];
    const qaFeedbackFlow = isQaFeedbackFlow(allSteps);
    const dualOutputFlow = !qaFeedbackFlow && isDualOutputFlow(allSteps);
    if (qaFeedbackFlow) {
      flowModel = "feedback";
      for (const [index, step] of allSteps.entries()) addStepShape(elements, slide.id, step, index, index < 3 ? "parallel-check" : index === 3 ? "review-gate" : "revision-output");
      for (let index = 0; index < 3; index += 1) {
        elements.push(connector(`${slide.id}-merge-${index + 1}`, "merge-connector", {
          from: `${slide.id}-step-${index + 1}`,
          to: `${slide.id}-step-4`,
          semantic: "parallel checks merge into review",
          connector_style: { stroke: "neutral", arrow: "end", path: "orthogonal", label: "汇聚" },
        }));
      }
      elements.push(connector(`${slide.id}-revision-link`, "flow-connector", {
        from: `${slide.id}-step-4`,
        to: `${slide.id}-step-5`,
        semantic: "review produces a revision",
        connector_style: { stroke: "primary", arrow: "end", path: "straight", label: "进入修订" },
      }));
      for (let index = 0; index < 3; index += 1) {
        elements.push(connector(`${slide.id}-feedback-${index + 1}`, "feedback-connector", {
          from: `${slide.id}-step-5`,
          to: `${slide.id}-step-${index + 1}`,
          semantic: "re-rendered output returns to validation",
          connector_style: { stroke: "coral", arrow: "end", path: "return-rail", label: "反馈重检" },
        }));
      }
      readingOrderGroups = [
        { id: "heading", mode: "sequence", items: [`${slide.id}-title`, `${slide.id}-kicker`] },
        { id: "parallel-checks", mode: "parallel", items: [`${slide.id}-step-1`, `${slide.id}-step-2`, `${slide.id}-step-3`] },
        { id: "review-and-revision", mode: "sequence", items: [`${slide.id}-step-4`, `${slide.id}-step-5`] },
        { id: "feedback-return", mode: "feedback", items: [`${slide.id}-feedback-1`, `${slide.id}-feedback-2`, `${slide.id}-feedback-3`] },
      ];
      connectorLegend = [
        { role: "merge-connector", label: "三路检查汇聚" },
        { role: "flow-connector", label: "审查触发修订" },
        { role: "feedback-connector", label: "重新渲染后返回三路检查" },
      ];
    } else if (dualOutputFlow) {
      flowModel = "branch";
      for (const [index, step] of allSteps.entries()) addStepShape(elements, slide.id, step, index, index === allSteps.length - 1 ? "branch-gate" : "step");
      for (let index = 0; index < allSteps.length - 1; index += 1) {
        elements.push(connector(`${slide.id}-connector-${index + 1}`, "flow-connector", {
          from: `${slide.id}-step-${index + 1}`,
          to: `${slide.id}-step-${index + 2}`,
          semantic: "shared semantic flow",
          connector_style: { stroke: "primary", arrow: "end", path: "straight", label: "共享语义链" },
        }));
      }
      elements.push(shape(`${slide.id}-output-html`, "branch-output", { label: "HTML", title: "浏览器演示", text: "动效、现场演示与快速迭代", tone: "lime" }));
      elements.push(shape(`${slide.id}-output-pptx`, "branch-output", { label: "PPTX", title: "原生可编辑交付", text: "办公修改、协作与归档", tone: "coral" }));
      elements.push(connector(`${slide.id}-branch-html`, "branch-connector", {
        from: `${slide.id}-step-${allSteps.length}`,
        to: `${slide.id}-output-html`,
        semantic: "same spec to HTML",
        connector_style: { stroke: "lime", arrow: "end", path: "branch", label: "HTML 出口" },
      }));
      elements.push(connector(`${slide.id}-branch-pptx`, "branch-connector", {
        from: `${slide.id}-step-${allSteps.length}`,
        to: `${slide.id}-output-pptx`,
        semantic: "same spec to PPTX",
        connector_style: { stroke: "coral", arrow: "end", path: "branch", label: "PPTX 出口" },
      }));
      readingOrderGroups = [
        { id: "heading", mode: "sequence", items: [`${slide.id}-title`, `${slide.id}-kicker`] },
        { id: "shared-sequence", mode: "sequence", items: allSteps.map((_, index) => `${slide.id}-step-${index + 1}`) },
        { id: "dual-output", mode: "parallel", items: [`${slide.id}-output-html`, `${slide.id}-output-pptx`] },
      ];
      connectorLegend = [
        { role: "flow-connector", label: "共享语义链" },
        { role: "branch-connector", label: "同一规格分支为两种交付物" },
      ];
    } else {
      flowModel = "linear";
      for (const [index, rawStep] of allSteps.entries()) {
        addStepShape(elements, slide.id, rawStep || {}, index);
        if (index < allSteps.length - 1) elements.push(connector(`${slide.id}-connector-${index + 1}`, "connector", {
          from: `${slide.id}-step-${index + 1}`,
          to: `${slide.id}-step-${index + 2}`,
          semantic: "ordered step",
          connector_style: { stroke: "primary", arrow: "end", path: "straight", label: "下一步" },
        }));
      }
      readingOrderGroups = [
        { id: "heading", mode: "sequence", items: [`${slide.id}-title`, `${slide.id}-kicker`] },
        { id: "ordered-steps", mode: "sequence", items: allSteps.map((_, index) => `${slide.id}-step-${index + 1}`) },
      ];
    }
    if (!qaFeedbackFlow && !dualOutputFlow) {
      const result = content.result || {};
      elements.push(shape(`${slide.id}-result`, "result", { label: result.label || "RESULT", value: result.value || "可交付结果" }));
      readingOrderGroups.push({ id: "result", mode: "sequence", items: [`${slide.id}-result`] });
    }
  } else if (layout === "comparison") {
    elements.push(text(`${slide.id}-title`, "title", visibleText(content.title, slide.primary_claim)));
    if (slide.composition_id !== "evidence-table") {
      for (const [index, rawColumn] of (Array.isArray(content.columns) ? content.columns.slice(0, 3) : []).entries()) {
        const column = rawColumn || {};
        elements.push(shape(`${slide.id}-column-${index + 1}`, "comparison-column", {
          label: column.label || `OPTION ${index + 1}`,
          headline: column.headline || "Output",
          points: Array.isArray(column.points) ? column.points.slice(0, 4).map((point) => compactBody(point, "", 78)) : [],
          tone: column.tone || (index % 2 ? "lime" : "coral"),
        }));
      }
    }
    const takeaway = content.takeaway || {};
    elements.push(shape(`${slide.id}-takeaway`, "takeaway", { label: takeaway.label || "SHARED SPEC", value: takeaway.value || "结构只维护一份" }));
    readingOrderGroups = slide.composition_id === "evidence-table"
      ? [
        { id: "heading", mode: "sequence", items: [`${slide.id}-title`] },
        { id: "aligned-comparison-table", mode: "sequence", items: [`${slide.id}-evidence-table`] },
        { id: "synthesis", mode: "sequence", items: [`${slide.id}-takeaway`] },
      ]
      : [
        { id: "heading", mode: "sequence", items: [`${slide.id}-title`] },
        { id: "parallel-comparison", mode: "parallel", items: (content.columns || []).slice(0, 3).map((_, index) => `${slide.id}-column-${index + 1}`) },
        { id: "synthesis", mode: "sequence", items: [`${slide.id}-takeaway`] },
      ];
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
  if (["hero-image", "metric-stage", "story-split", "chart-focus", "timeline", "evidence-collage"].includes(layout)
    || (layout === "matrix" && slide.composition_id !== "evidence-table")) {
    addCustomLayoutElements(elements, layout, slide, content);
  }
  if (layout === "matrix" && slide.composition_id === "evidence-table") addHeading(elements, slide.id, content, slide.primary_claim, "SYSTEM EVIDENCE");
  if (slide.composition_id === "answer-and-boundary") {
    for (const [index, point] of (Array.isArray(content.body_points) ? content.body_points.slice(0, 3) : []).entries()) {
      elements.push(shape(`${slide.id}-answer-point-${index + 1}`, "answer-point", {
        label: visibleText(point?.label, `POINT ${index + 1}`),
        text: compactBody(point?.text, "", 140),
        tone: index === 2 ? "coral" : "lime",
      }));
    }
    const boundary = content.takeaway || {};
    if (boundary.value && !elements.some((element) => element.role === "takeaway")) {
      elements.push(shape(`${slide.id}-boundary`, "takeaway", { label: boundary.label || "BOUNDARY", value: boundary.value }));
    }
  }
  if (["image-thesis-split", "metric-triad"].includes(slide.composition_id)) {
    for (const [index, metric] of (Array.isArray(content.metrics) ? content.metrics.slice(0, 3) : []).entries()) {
      elements.push(shape(`${slide.id}-metric-${index + 1}`, "metric", {
        label: visibleText(metric?.label, `METRIC ${index + 1}`),
        value: visibleText(metric?.value, "—"),
        meaning: compactBody(metric?.meaning, "", 110),
      }));
    }
  }
  if (content.takeaway?.value && !elements.some((element) => element.role === "takeaway")) {
    elements.push(shape(`${slide.id}-takeaway`, "takeaway", {
      label: content.takeaway.label || "TAKEAWAY",
      value: content.takeaway.value,
    }));
  }
  const assetRefs = [visualPlan.primary_visual, ...compiledEvidenceRefs, ...compiledAssetCandidates].filter(Boolean);
  const resolvedAssets = resolveEvidenceAssets({ assets: evidenceAssets }, assetRefs);
  const primaryAsset = visualPlan.primary_visual ? resolvedAssets.find((asset) => asset.id === visualPlan.primary_visual) : null;
  const assets = [primaryAsset, ...resolvedAssets.filter((asset) => asset.id !== primaryAsset?.id)].filter(Boolean).slice(0, visualPlan.image_budget);
  if (assets.length && slide.visual_intent !== "text_led" && slide.visual_intent !== "decorative_none") {
    for (const [index, asset] of assets.entries()) {
      const provenanceAsset = ["evidence_page_snapshot", "evidence_crop"].includes(asset.type);
      const imageRole = provenanceAsset ? "source-provenance" : slide.composition_id === "image-thesis-split" ? "evidence-figure" : "source-provenance";
      const visualRole = imageRole === "source-provenance" ? "source-provenance" : visualPlan.image_roles[index] || "evidence";
      const element = image(`${slide.id}-evidence-figure-${index + 1}`, imageRole, asset, visualRole);
      const sourceTable = evidenceTables.find((table) => table.id === asset.table_ref);
      const sourcePurpose = {
        "p4-table-2": "用于核对 RLinf 与 SimpleVLA 的 rollout batch、learning rate 和 LoRA 差异。",
        "p5-table-1": "用于核对 8 个任务的 RLinf SFT→RL train SSR、提升幅度与训练步数。",
        "p6-table-2": "用于核对 8 卡并行模式的 actor 与 rollout 时间。",
      }[sourceTable?.id] || `用于核对“${slide.action_title || slide.primary_claim}”的原始论文表格。`;
      const semanticDescription = `论文第 ${asset.source_page || "—"} 页来源核验（${sourceTable?.id || asset.id}）：${sourcePurpose}`;
      element.alt_text = semanticDescription;
      element.data.caption = semanticDescription;
      elements.push(element);
    }
  }
  let usedCompiledTable = false;
  if (slide.composition_id === "evidence-table" && layout === "comparison" && (content.columns || []).length >= 2) {
    const columns = content.columns.slice(0, 2);
    const rowCount = Math.max(...columns.map((column) => (column.points || []).length), 0);
    const commonBasis = (content.body_points || []).find((point) => /共同|共享|common/i.test(`${point?.label || ""} ${point?.text || ""}`));
    const values = [
      columns.map((column) => column.label || column.headline || "SYSTEM"),
      ...(commonBasis?.text ? [[`共同基础：${commonBasis.text}`, "共同基础：同左；valid action mask 工程等价"]] : []),
      ...Array.from({ length: rowCount }, (_, rowIndex) => columns.map((column) => column.points?.[rowIndex] || "—")),
    ];
    elements.push(tableElement(`${slide.id}-evidence-table`, "evidence-table", {
      id: `${slide.id}-content-comparison`,
      source_page: null,
      caption: content.note?.value || "根据论文原始配置整理的可编辑系统对照",
      values,
      rows: values.length,
      columns: values[0]?.length || 0,
    }));
    usedCompiledTable = true;
  }
  if (!usedCompiledTable && ["evidence-table", "chart-with-interpretation-rail"].includes(slide.composition_id)) {
    const tableRefs = [...compiledTableRefs];
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
  }
  if (slide.composition_id === "answer-and-boundary" && compiledVisualIntent === "source_table") {
    const sourceTable = resolveEvidenceTables({ tables: evidenceTables }, compiledTableRefs).slice(0, 1)[0];
    if (sourceTable) elements.push(tableElement(`${slide.id}-evidence-table`, "evidence-table", compactBoundaryEvidenceTable(sourceTable)));
  }
  if (slide.composition_id === "argument-pair" && elements.some((element) => element.role === "comparison-column")) {
    visualPlan = {
      ...visualPlan,
      primary_visual: null,
      image_budget: 0,
      image_roles: [],
      data_strategy: "diagram",
    };
  }
  if (layout === "comparison" && readingOrderGroups.length) {
    const provenanceIds = elements.filter((element) => element.role === "source-provenance").map((element) => element.id);
    if (provenanceIds.length) {
      readingOrderGroups.push({ id: "source-provenance", mode: "sequence", items: provenanceIds });
    }
  }
  if (slide.composition_id === "answer-and-boundary") {
    const titleIds = elements.filter((element) => element.role === "title").map((element) => element.id);
    const tableIds = elements.filter((element) => element.kind === "table").map((element) => element.id);
    const pointIds = elements.filter((element) => element.role === "answer-point").map((element) => element.id);
    const takeawayIds = elements.filter((element) => element.role === "takeaway").map((element) => element.id);
    readingOrderGroups = [
      { id: "heading", mode: "sequence", items: titleIds },
      ...(tableIds.length ? [{ id: "anchored-evidence", mode: "sequence", items: tableIds }] : []),
      { id: "evidence-interpretation", mode: "sequence", items: pointIds },
      { id: "synthesis-boundary", mode: "sequence", items: takeawayIds },
    ].filter((group) => group.items.length);
  }
  const baseReadingOrder = (layout === "comparison" || slide.composition_id === "answer-and-boundary") && readingOrderGroups.length
    ? readingOrderGroups.flatMap((group) => group.items).filter((id, index, ids) => ids.indexOf(id) === index)
    : elements.map((element) => element.id);
  const provenanceIds = elements.filter((element) => element.role === "source-provenance").map((element) => element.id);
  const readingOrder = [
    ...baseReadingOrder.filter((id) => !provenanceIds.includes(id)),
    ...provenanceIds,
  ];
  return {
    id: slide.id,
    layout,
    role: slide.role || "content",
    composition_id: slide.composition_id || "argument-pair",
    content_priority: slide.content_priority || "support",
    action_title: slide.action_title || slide.primary_claim,
    audience_question: slide.audience_question || "本页要帮助观众回答什么问题？",
    narrative_job: compiledNarrativeJob,
    slide_goal: slide.slide_goal,
    primary_claim: slide.primary_claim,
    evidence: compiledEvidence,
    implication: compiledImplication,
    transition_in: slide.transition_in || "承接上一页的判断。",
    transition_out: slide.transition_out || "进入下一项关键判断。",
    evidence_refs: compiledEvidenceRefs,
    table_refs: compiledTableRefs,
    asset_candidates: compiledAssetCandidates,
    visual_intent: compiledVisualIntent,
    visual_plan: visualPlan,
    speaker_note: compiledSpeakerNotes?.talk_track || slide.speaker_note || "",
    speaker_notes: compiledSpeakerNotes || {
      talk_track: slide.speaker_note || "先解释本页主张，再指出证据、意义与边界，最后过渡到下一页。",
      delivery_cue: "先结论，后证据。",
      source_refs: slide.evidence_refs || [],
      estimated_seconds: 60,
    },
    content,
    flow_model: flowModel,
    reading_order_groups: readingOrderGroups,
    connector_legend: connectorLegend,
    reading_order: readingOrder,
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
    spec_version: "0.4.0",
    deck,
    theme,
    visual: plan.visual || { style_family: theme.id, image_policy: "source-figure-first", density_profile: "balanced" },
    evidence: evidenceIndex ? {
      input: evidenceIndex.input,
      parser: evidenceIndex.parser,
      parser_details: evidenceIndex.parser_details,
      page_count: evidenceIndex.page_count,
      character_count: evidenceIndex.character_count,
      sections: evidenceIndex.sections,
      claims: evidenceIndex.claims,
      diagnostics: evidenceIndex.diagnostics,
    } : undefined,
    assets: evidenceAssets,
    tables: evidenceIndex?.tables || [],
    formulas: evidenceIndex?.formulas || [],
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
