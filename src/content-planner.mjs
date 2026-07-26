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

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
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

export function normalizePlan(plan, { paperMode = false, evidenceIndex = null } = {}) {
  if (!plan?.plan?.slides) return plan;
  const usedAssets = new Set();
  const usedTables = new Set();
  const slides = plan.plan.slides.map((rawSlide, index) => {
    const slide = { ...rawSlide };
    slide.role = slide.role || fallbackRole(index, paperMode);
    slide.action_title = slide.action_title || slide.primary_claim || slide.content?.title || `第 ${index + 1} 页`;
    slide.evidence_refs = unique(slide.evidence_refs);
    slide.table_refs = unique(slide.table_refs);
    slide.visual_intent = inferVisualIntent(slide, slide.role);
    slide.speaker_note = slide.speaker_note || slide.primary_claim || "围绕本页主张解释证据和边界。";
    slide.visual_plan = normalizeVisualPlan(slide, { paperMode });
    slide.layout = slide.visual_plan.layout_family;
    slide.asset_candidates = unique(slide.asset_candidates).slice(0, slide.visual_plan.image_budget);
    if (!slide.asset_candidates.length) {
      slide.asset_candidates = selectCandidateAssets(slide, index, evidenceIndex, usedAssets, slide.visual_plan.image_budget);
    }
    if (!slide.visual_plan.primary_visual && slide.asset_candidates[0]) slide.visual_plan.primary_visual = slide.asset_candidates[0];
    if (!slide.table_refs.length) slide.table_refs = selectCandidateTable(slide, evidenceIndex, usedTables);
    return slide;
  });
  return {
    ...plan,
    visual: plan.visual || { style_family: "auto", image_policy: "source-figure-first", density_profile: "balanced" },
    plan: { ...plan.plan, slides },
  };
}

export function assertContentPlan(plan, { paperMode = false } = {}) {
  const slides = plan?.plan?.slides || [];
  if (paperMode && (slides.length < 8 || slides.length > 10)) {
    throw new Error(`论文内容编排必须为 8–10 页，实际为 ${slides.length} 页`);
  }
  for (const slide of slides) {
    if (!slide.role || !slide.action_title || !slide.visual_intent || !slide.visual_plan) {
      throw new Error(`页面 ${slide.id || "(unknown)"} 缺少 role/action_title/visual_intent/visual_plan`);
    }
  }
  return plan;
}

export { PAPER_ROLES };
