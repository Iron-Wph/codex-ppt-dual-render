import { normalizeVisualPlan } from "./visual-plan.mjs";

const PAPER_ROLES = [
  "title",
  "problem",
  "gap",
  "contribution",
  "method_overview",
  "method_detail",
  "experiment_setup",
  "main_results",
  "analysis",
  "limitations",
];

const CANONICAL_ROLES = new Set([...PAPER_ROLES, "content"]);

export const COMPOSITION_IDS = [
  "thesis-stage",
  "image-thesis-split",
  "argument-pair",
  "mechanism-triptych",
  "causal-flow",
  "metric-triad",
  "chart-with-interpretation-rail",
  "evidence-table",
  "evidence-collage",
  "answer-and-boundary",
];

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function normalizeContent(content = {}, claim = "") {
  return {
    eyebrow: content.eyebrow ?? null,
    title: String(content.title || claim || "Untitled slide"),
    subtitle: content.subtitle ?? null,
    kicker: content.kicker ?? null,
    lede: content.lede ?? content.subtitle ?? null,
    note: content.note ?? null,
    body_points: Array.isArray(content.body_points) ? content.body_points.slice(0, 4) : [],
    metrics: Array.isArray(content.metrics) ? content.metrics.slice(0, 3) : [],
    steps: Array.isArray(content.steps) ? content.steps.slice(0, 5) : [],
    result: content.result ?? null,
    columns: Array.isArray(content.columns) ? content.columns.slice(0, 3) : [],
    takeaway: content.takeaway ?? null,
  };
}

function fallbackComposition(slide, role) {
  if (COMPOSITION_IDS.includes(slide.composition_id)) return slide.composition_id;
  const byRole = {
    title: "thesis-stage",
    problem: slide.visual_intent === "source_figure" ? "image-thesis-split" : "argument-pair",
    gap: "argument-pair",
    contribution: "mechanism-triptych",
    method_overview: "causal-flow",
    method_detail: "mechanism-triptych",
    experiment_setup: "evidence-table",
    main_results: "chart-with-interpretation-rail",
    analysis: "evidence-collage",
    limitations: "answer-and-boundary",
    content: slide.visual_intent === "data_chart" ? "chart-with-interpretation-rail" : "argument-pair",
  };
  return byRole[role] || "argument-pair";
}

function fallbackPriority(role) {
  if (["contribution", "method_overview", "method_detail", "main_results", "analysis"].includes(role)) return "core";
  if (["gap", "experiment_setup", "limitations"].includes(role)) return "support";
  return "context";
}

function contentEvidence(content, refs = []) {
  const rows = [];
  for (const [index, point] of (content.body_points || []).entries()) {
    if (!point?.text) continue;
    rows.push({
      claim_support: point.text,
      evidence_ref: refs[index] || null,
      interpretation: point.label ? `${point.label}说明本页主张并非孤立判断。` : "这项信息直接支撑本页主张。",
    });
  }
  for (const [index, metric] of (content.metrics || []).entries()) {
    if (!metric?.value) continue;
    rows.push({
      claim_support: `${metric.label}: ${metric.value}`,
      evidence_ref: refs[index] || null,
      interpretation: metric.meaning || "该数字给出主张的量化尺度。",
    });
  }
  for (const column of content.columns || []) {
    if (!column?.headline) continue;
    rows.push({
      claim_support: [column.headline, ...(column.points || []).slice(0, 1)].filter(Boolean).join("："),
      evidence_ref: refs[rows.length] || null,
      interpretation: "该对照帮助观众判断差异为何重要。",
    });
  }
  return rows.slice(0, 4);
}

function fallbackTalkTrack(slide) {
  const clip = (value, max) => {
    const text = String(value || "").trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  };
  const evidence = (slide.evidence || []).slice(0, 2)
    .map((item) => `${clip(item.claim_support, 44)}，${clip(item.interpretation, 34)}`)
    .join("其次，");
  return [
    clip(slide.transition_in, 34),
    `这一页要回答：${clip(slide.audience_question, 40)}`,
    `核心判断是：${clip(slide.primary_claim, 52)}`,
    evidence ? `证据上，${evidence}。` : "这里先建立判断框架，随后用原始证据验证。",
    `这意味着：${clip(slide.implication, 42)}`,
    clip(slide.transition_out, 36),
  ].filter(Boolean).join(" ");
}

function fitTalkTrack(value, slide) {
  let text = String(value || "").trim();
  if (text.length < 80 || text.length > 280) text = fallbackTalkTrack(slide);
  if (text.length <= 280) return text;
  const clipped = text.slice(0, 276);
  const sentenceEnd = Math.max(clipped.lastIndexOf("。"), clipped.lastIndexOf("！"), clipped.lastIndexOf("？"));
  return `${(sentenceEnd > 160 ? clipped.slice(0, sentenceEnd + 1) : clipped).trim()}…`;
}

function normalizeDeckAndNarrative(plan, slides) {
  const deck = { ...(plan.deck || {}) };
  deck.communication_job ||= `演讲结束时，${deck.audience || "目标观众"}应能理解并判断：${plan.narrative?.key_message || deck.purpose || "核心结论"}`;
  deck.talk_duration_minutes = Number.isInteger(deck.talk_duration_minutes) ? deck.talk_duration_minutes : Math.max(8, Math.min(30, slides.length * 2));
  deck.audience_profile ||= {
    role: deck.audience || "目标观众",
    prior_knowledge: "了解该领域基本概念，但未必熟悉本文细节",
    cares_about: ["方法是否真正解决问题", "证据是否可信", "结论能否迁移到实际工作"],
    likely_questions: ["为什么需要这项工作？", "结果提升来自哪里？", "适用边界是什么？"],
    desired_outcome: "能复述核心贡献、主要证据和适用边界",
  };

  const narrative = { ...(plan.narrative || {}) };
  narrative.opening_question ||= `为什么${deck.title || "这项工作"}值得关注？`;
  narrative.closing_answer ||= narrative.key_message || "用证据回答开场问题，并明确结论边界。";
  narrative.sections ||= [
    { id: "setup", title: "问题与判断标准", job: "建立听众为何需要继续听的张力", slide_ids: slides.slice(0, Math.min(3, slides.length)).map((slide) => slide.id) },
    { id: "core", title: "方法与核心证据", job: "解释核心工作并给出可信证据", slide_ids: slides.filter((slide) => slide.content_priority === "core").map((slide) => slide.id) },
    { id: "meaning", title: "意义、边界与结论", job: "把结果转化为可使用的判断", slide_ids: slides.slice(Math.max(0, slides.length - 2)).map((slide) => slide.id) },
  ].filter((section) => section.slide_ids.length);
  narrative.priority_map ||= {
    core: slides.filter((slide) => slide.content_priority === "core").map((slide) => slide.id),
    support: slides.filter((slide) => slide.content_priority === "support").map((slide) => slide.id),
    context: slides.filter((slide) => slide.content_priority === "context").map((slide) => slide.id),
  };
  narrative.logic_check ||= {
    opening_resolved: true,
    core_has_evidence: slides.filter((slide) => slide.content_priority === "core").every((slide) => slide.evidence.length > 0 || ["method_overview", "method_detail"].includes(slide.role)),
    no_redundant_slides: new Set(slides.map((slide) => slide.primary_claim)).size === slides.length,
    rationale: "每页承担不同叙事任务，核心页包含证据或方法机制，并在结尾回答开场问题。",
  };
  return { deck, narrative };
}

function inferVisualIntent(slide, role) {
  if (slide.visual_intent) return slide.visual_intent;
  if (role === "title") return "text_led";
  if (["problem", "gap", "contribution"].includes(role)) return "comparison_matrix";
  if (["method_overview", "method_detail"].includes(role)) return "method_diagram";
  if (role === "experiment_setup") return "source_table";
  if (["main_results", "analysis"].includes(role)) return "data_chart";
  if (role === "limitations") return "text_led";
  return slide.layout === "pipeline" ? "method_diagram" : "comparison_matrix";
}

function fallbackRole(index, paperMode) {
  if (!paperMode) return index === 0 ? "title" : "content";
  return PAPER_ROLES[index] || "analysis";
}

function canonicalRole(slide, index, paperMode) {
  if (CANONICAL_ROLES.has(slide.role)) return slide.role;
  const rawRole = String(slide.role || "").toLowerCase();
  const signal = `${slide.role || ""} ${slide.action_title || ""} ${slide.primary_claim || ""} ${slide.content?.title || ""}`.toLowerCase();
  if (index === 0 || slide.layout === "title" || slide.composition_id === "thesis-stage") return "title";
  if (/结论|采用边界|边界|限制|limitations?/.test(rawRole)) return "limitations";
  if (/质量|保障|qa|检查|复核/.test(rawRole)) return "analysis";
  if (/双输出|价值对比|职责对比|交付对比/.test(rawRole)) return "content";
  if (/核心方法|方法解释|训练流程|系统流程/.test(rawRole)) return "method_overview";
  if (/方法细节|机制|消融/.test(rawRole)) return "method_detail";
  if (/实验设置|评测设置/.test(rawRole)) return "experiment_setup";
  if (/主要结果|主结果|关键结果/.test(rawRole)) return "main_results";
  if (/局限|边界|限制|adopt|boundary|limitation|结论/.test(signal) || slide.composition_id === "answer-and-boundary") return "limitations";
  if (/实验设置|评测设置|benchmark setup|experiment setup/.test(signal)) return "experiment_setup";
  if (/结果|性能|提升|success rate|main result/.test(signal) || ["metric-triad", "chart-with-interpretation-rail"].includes(slide.composition_id)) return "main_results";
  if (/方法细节|机制|mechanism|ablation/.test(signal) || slide.composition_id === "mechanism-triptych") return "method_detail";
  if (/方法|流程|训练|系统|pipeline|method/.test(signal) || slide.composition_id === "causal-flow") return "method_overview";
  if (/贡献|创新|contribution/.test(signal)) return "contribution";
  if (/缺口|gap/.test(signal)) return "gap";
  if (/背景|问题|挑战|problem|background/.test(signal)) return "problem";
  if (/分析|保障|检查|qa|analysis|质量/.test(signal)) return "analysis";
  return paperMode ? fallbackRole(index, true) : "content";
}

function selectCandidateAssets(slide, index, evidenceIndex, usedAssets, count = 1) {
  if (!evidenceIndex?.assets?.length || count <= 0 || slide.visual_intent === "text_led") return [];
  const usableAssets = evidenceIndex.assets.filter((asset) => {
    const extension = String(asset.path || "").toLowerCase();
    const tinyTransparentCandidate = extension.endsWith(".png") && asset.bytes && asset.bytes < 5000;
    const tinyCandidate = asset.width && asset.height && asset.width < 120 && asset.height < 80;
    return !tinyTransparentCandidate && !tinyCandidate;
  });
  const pageHint = Number(String(slide.evidence_refs?.[0] || "").match(/(?:page|p)(\d+)/i)?.[1] || 0);
  const rolePages = {
    problem: [1, 2, 3],
    gap: [3, 4, 5],
    contribution: [6, 7],
    method_overview: [6, 7, 8],
    method_detail: [8, 9],
    experiment_setup: [9, 10],
    main_results: [10, 11, 13, 16],
    analysis: [15, 16, 17],
  };
  const preferredPages = pageHint ? [pageHint] : rolePages[slide.role] || [];
  const preferredPool = preferredPages.length
    ? usableAssets.filter((asset) => preferredPages.includes(Number(asset.source_page)))
    : usableAssets;
  const pool = preferredPool.length ? preferredPool : usableAssets;
  const preferCrop = ["method_detail", "experiment_setup", "main_results", "analysis"].includes(slide.role);
  const preferSnapshot = ["contribution", "method_overview"].includes(slide.role);
  const rankedPool = [...pool].sort((left, right) => {
    const score = (asset) => {
      let value = 0;
      if (preferCrop && asset.crop) value += 100;
      if (!preferSnapshot && !asset.snapshot) value += 35;
      if (asset.type === "evidence_crop") value += 20;
      const pageRank = preferredPages.indexOf(Number(asset.source_page));
      if (pageRank >= 0) value += (preferredPages.length - pageRank) * 12;
      if (asset.width && asset.height && asset.width / asset.height > 1.25) value += 8;
      return value;
    };
    return score(right) - score(left);
  });
  const visualPool = preferSnapshot ? rankedPool.filter((asset) => asset.snapshot).concat(rankedPool.filter((asset) => !asset.snapshot)) : rankedPool;
  const selected = [];
  for (const candidate of visualPool) {
    if (selected.length >= count) break;
    if (usedAssets.has(candidate.id)) continue;
    usedAssets.add(candidate.id);
    selected.push(candidate.id);
  }
  if (!selected.length && visualPool[0]) selected.push(visualPool[0].id);
  return selected;
}

function selectCandidateTable(slide, evidenceIndex, usedTables) {
  if (!evidenceIndex?.tables?.length || !["source_table", "data_chart"].includes(slide.visual_intent)) return [];
  const pageHint = Number(String(slide.evidence_refs?.[0] || "").match(/(?:page|p)(\d+)/i)?.[1] || 0);
  const preferredPages = pageHint ? [pageHint] : slide.role === "main_results" ? [10, 11, 13, 16] : slide.role === "experiment_setup" ? [9] : [10, 11, 13, 14, 16, 9];
  const pool = evidenceIndex.tables
    .filter((table) => preferredPages.includes(Number(table.source_page)))
    .sort((left, right) => preferredPages.indexOf(Number(left.source_page)) - preferredPages.indexOf(Number(right.source_page)));
  const candidate = pool.find((table) => !usedTables.has(table.id)) || evidenceIndex.tables.find((table) => !usedTables.has(table.id)) || pool[0];
  if (!candidate) return [];
  usedTables.add(candidate.id);
  return [candidate.id];
}

function parseReferencePage(value) {
  return Number(String(value || "").match(/(?:page|p)(\d+)/i)?.[1] || 0);
}

function tableSearchText(table) {
  return (table?.values || []).flatMap((row) => row || []).join(" ").toLowerCase();
}

function slideSearchTokens(slide) {
  const content = slide.content || {};
  const raw = [
    slide.action_title,
    slide.primary_claim,
    content.title,
    content.lede,
    ...(content.metrics || []).flatMap((metric) => [metric?.label, metric?.value, metric?.meaning]),
    ...(content.body_points || []).flatMap((point) => [point?.label, point?.text]),
    ...(content.columns || []).flatMap((column) => [column?.label, column?.headline, ...(column?.points || [])]),
  ].filter(Boolean).join(" ").toLowerCase();
  return unique(raw.match(/[a-z][a-z0-9_.-]{1,}|[+-]?\d+(?:\.\d+)?%?/g) || [])
    .filter((token) => !["the", "and", "with", "from", "true", "false"].includes(token))
    .slice(0, 40);
}

function tableRelevanceScore(table, slide) {
  const text = tableSearchText(table);
  const tokens = slideSearchTokens(slide);
  const refPages = unique([...(slide.evidence_refs || []), ...(slide.table_refs || [])])
    .map(parseReferencePage)
    .filter(Boolean);
  let score = tokens.reduce((total, token) => total + (text.includes(token) ? 5 : 0), 0);
  if (refPages.includes(Number(table.source_page))) score += 24;
  if (table.rows >= 2 && table.rows <= 12 && table.columns >= 2 && table.columns <= 8) score += 18;
  const maxCellLength = Math.max(0, ...(table.values || []).flatMap((row) => row || []).map((cell) => String(cell || "").length));
  if (table.rows <= 1) score -= 80;
  if (maxCellLength > 180) score -= 70;
  if (table.columns > 8) score -= 24;
  return score;
}

function bestEvidenceTable(slide, evidenceIndex) {
  if (!evidenceIndex?.tables?.length) return null;
  return [...evidenceIndex.tables].sort((left, right) => tableRelevanceScore(right, slide) - tableRelevanceScore(left, slide))[0] || null;
}

function ensurePaperImageCoverage(slides, evidenceIndex) {
  if (!evidenceIndex?.assets?.length || !evidenceIndex?.tables?.length) return;
  const usedAssets = new Set(slides.flatMap((slide) => slide.asset_candidates || []));
  let covered = slides.filter((slide) => slide.visual_plan?.image_budget > 0 && (slide.asset_candidates || []).length).length;
  const target = Math.min(4, Math.max(0, slides.length - 1));
  const candidates = slides.filter((slide) =>
    slide.role !== "title"
    && ["evidence-table", "chart-with-interpretation-rail"].includes(slide.composition_id)
    && ["source_table", "data_chart"].includes(slide.visual_intent)
  );
  for (const slide of candidates) {
    if (covered >= target) break;
    if (slide.visual_plan?.image_budget > 0 && (slide.asset_candidates || []).length) continue;
    const bestTable = bestEvidenceTable(slide, evidenceIndex);
    const preferredAssetId = bestTable?.crop_asset_id;
    const asset = evidenceIndex.assets.find((candidate) => candidate.id === preferredAssetId)
      || evidenceIndex.assets.find((candidate) => candidate.crop && Number(candidate.source_page) === Number(bestTable?.source_page) && !usedAssets.has(candidate.id));
    if (!asset || usedAssets.has(asset.id)) continue;
    usedAssets.add(asset.id);
    slide.visual_plan = {
      ...slide.visual_plan,
      primary_visual: asset.id,
      image_budget: 1,
      image_roles: ["evidence"],
    };
    slide.asset_candidates = [asset.id];
    slide.evidence_refs = unique([...(slide.evidence_refs || []), asset.id]);
    covered += 1;
  }
}

export function normalizePlan(plan, { paperMode = false, evidenceIndex = null } = {}) {
  if (!plan?.plan?.slides) return plan;
  const usedAssets = new Set();
  const usedTables = new Set();
  const slides = plan.plan.slides.map((rawSlide, index, sourceSlides) => {
    const slide = { ...rawSlide };
    slide.role = canonicalRole(slide, index, paperMode);
    slide.action_title = slide.action_title || slide.primary_claim || slide.content?.title || `第 ${index + 1} 页`;
    slide.content_priority = ["core", "support", "context"].includes(slide.content_priority) ? slide.content_priority : fallbackPriority(slide.role);
    slide.audience_question ||= index === 0 ? "为什么这项工作值得听？" : `上一页留下的关键问题，如何由“${slide.action_title}”回答？`;
    slide.narrative_job ||= slide.slide_goal || `让观众理解${slide.action_title}`;
    slide.implication ||= slide.content?.takeaway?.value || slide.content?.result?.value || slide.primary_claim;
    slide.transition_in ||= index === 0 ? "先从这项工作的核心问题开始。" : `承接上一页关于“${sourceSlides[index - 1]?.action_title || sourceSlides[index - 1]?.primary_claim || "前一问题"}”的判断。`;
    slide.transition_out ||= index === sourceSlides.length - 1 ? "回到开场问题，给出最终回答和适用边界。" : `接下来需要回答“${sourceSlides[index + 1]?.action_title || sourceSlides[index + 1]?.primary_claim || "下一问题"}”。`;
    slide.evidence_refs = unique(slide.evidence_refs);
    slide.table_refs = unique(slide.table_refs);
    slide.visual_intent = inferVisualIntent(slide, slide.role);
    slide.composition_id = fallbackComposition(slide, slide.role);
    slide.content = normalizeContent(slide.content, slide.primary_claim);
    slide.evidence = Array.isArray(slide.evidence) ? slide.evidence.slice(0, 4) : contentEvidence(slide.content, slide.evidence_refs);
    slide.visual_plan = normalizeVisualPlan(slide, { paperMode });
    slide.layout = slide.visual_plan.layout_family;
    slide.asset_candidates = unique(slide.asset_candidates).slice(0, slide.visual_plan.image_budget);
    if (!slide.asset_candidates.length) {
      slide.asset_candidates = selectCandidateAssets(slide, index, evidenceIndex, usedAssets, slide.visual_plan.image_budget);
    }
    if (!slide.visual_plan.primary_visual && slide.asset_candidates[0]) slide.visual_plan.primary_visual = slide.asset_candidates[0];
    if (!slide.table_refs.length) slide.table_refs = selectCandidateTable(slide, evidenceIndex, usedTables);
    if (["source_table", "data_chart"].includes(slide.visual_intent)) {
      const bestTable = bestEvidenceTable(slide, evidenceIndex);
      if (bestTable) slide.table_refs = unique([bestTable.id, ...slide.table_refs]);
    }
    const providedNotes = slide.speaker_notes && typeof slide.speaker_notes === "object" ? slide.speaker_notes : {};
    slide.speaker_notes = {
      talk_track: fitTalkTrack(providedNotes.talk_track || slide.speaker_note || fallbackTalkTrack(slide), slide),
      delivery_cue: String(providedNotes.delivery_cue || "先讲结论，再指向证据，最后说清边界并自然过渡。"),
      source_refs: unique(providedNotes.source_refs || [...slide.evidence_refs, ...slide.table_refs]),
      estimated_seconds: Number.isInteger(providedNotes.estimated_seconds) ? Math.max(20, Math.min(240, providedNotes.estimated_seconds)) : (slide.content_priority === "core" ? 100 : 65),
    };
    if (slide.speaker_notes.talk_track.length < 80) slide.speaker_notes.talk_track = fallbackTalkTrack(slide);
    slide.speaker_note = slide.speaker_notes.talk_track;
    return slide;
  });
  if (paperMode) ensurePaperImageCoverage(slides, evidenceIndex);
  const { deck, narrative } = normalizeDeckAndNarrative(plan, slides);
  return {
    ...plan,
    deck,
    narrative,
    visual: {
      style_family: plan.visual?.style_family || "auto",
      image_policy: plan.visual?.image_policy || "source-figure-first",
      density_profile: plan.visual?.density_profile || "balanced",
      style_reason: plan.visual?.style_reason || "根据受众、内容证据类型和演讲场景选择一致的视觉系统。",
      layout_system: plan.visual?.layout_system || "semantic-composition-recipes",
      style_reference: plan.visual?.style_reference ?? null,
      ...(plan.visual || {}),
    },
    plan: { ...plan.plan, slides },
  };
}

export function assertContentPlan(plan, { paperMode = false } = {}) {
  const slides = plan?.plan?.slides || [];
  if (paperMode && (slides.length < 8 || slides.length > 10)) {
    throw new Error(`论文内容编排必须为 8–10 页，实际为 ${slides.length} 页`);
  }
  for (const slide of slides) {
    if (!slide.role || !slide.action_title || !slide.visual_intent || !slide.visual_plan || !slide.composition_id) {
      throw new Error(`页面 ${slide.id || "(unknown)"} 缺少 role/action_title/visual_intent/visual_plan/composition_id`);
    }
    if (!slide.audience_question || !slide.narrative_job || !slide.implication || !slide.transition_out) throw new Error(`页面 ${slide.id} 的叙事链不完整`);
    if (!slide.speaker_notes?.talk_track || slide.speaker_notes.talk_track.length < 80) throw new Error(`页面 ${slide.id} 的演讲稿不足 80 字`);
  }
  return plan;
}

export { PAPER_ROLES };
