import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, writeJson } from "./utils.mjs";
import { specFromPlan } from "./schema-writer.mjs";
import { renderHtml } from "./render-html.mjs";
import { renderPptx } from "./render-pptx.mjs";
import { assertValidSpec } from "./validate-spec.mjs";
import { runQa } from "./qa.mjs";

function singleSlidePlan(plan, slide) {
  return {
    ...plan,
    plan: {
      ...plan.plan,
      slides: [slide],
    },
  };
}

export async function materializeSlidePipeline({ plan, evidenceIndex = null, outDir, themeId = "auto", render = true }) {
  const slidesRoot = path.join(outDir, "codex", "slides");
  await ensureDir(slidesRoot);
  await writeJson(path.join(outDir, "codex", "storyboard.json"), {
    deck: plan.deck,
    narrative: plan.narrative,
    visual: plan.visual,
    slides: (plan.plan?.slides || []).map((slide) => ({
      id: slide.id,
      role: slide.role,
      layout: slide.layout,
      action_title: slide.action_title,
      slide_goal: slide.slide_goal,
      primary_claim: slide.primary_claim,
      evidence_refs: slide.evidence_refs || [],
      table_refs: slide.table_refs || [],
      asset_candidates: slide.asset_candidates || [],
      visual_intent: slide.visual_intent,
      visual_plan: slide.visual_plan,
    })),
  });
  const results = [];
  for (const [index, slide] of (plan.plan?.slides || []).entries()) {
    const id = `slide-${String(index + 1).padStart(3, "0")}`;
    const slideDir = path.join(slidesRoot, id);
    await ensureDir(slideDir);
    try { await fs.cp(path.join(outDir, "assets"), path.join(slideDir, "assets"), { recursive: true, force: true }); } catch { /* no evidence assets for Markdown decks */ }
    const slidePlan = singleSlidePlan(plan, slide);
    await writeJson(path.join(slideDir, `${id}.plan.json`), slidePlan);
    const spec = specFromPlan(slidePlan, { evidenceIndex, themeId });
    assertValidSpec(spec);
    await writeJson(path.join(slideDir, "deck.spec.json"), spec);
    const result = { id: slide.id, index: index + 1, plan: path.join(slideDir, `${id}.plan.json`), spec: path.join(slideDir, "deck.spec.json") };
    if (render) {
      result.html = (await renderHtml({ spec, outPath: path.join(slideDir, "presentation.html") })).htmlPath;
      result.pptx = (await renderPptx({ spec, outPath: path.join(slideDir, "presentation.pptx"), previewDir: path.join(slideDir, "preview"), assetRoot: outDir })).pptxPath;
      result.preview = path.join(slideDir, "preview", "pptx-001.png");
      result.qa = await runQa({ specPath: path.join(slideDir, "deck.spec.json"), inputDir: slideDir, requestedFormat: "both" });
      if (result.qa.status === "fail") throw new Error(`Single-slide QA failed for ${slide.id}.`);
    }
    results.push(result);
  }
  await writeJson(path.join(outDir, "codex", "slide-pipeline.json"), {
    mode: "storyboard-to-slide-to-assembly",
    slide_count: results.length,
    slides: results,
  });
  return results;
}
