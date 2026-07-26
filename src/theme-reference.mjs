import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, writeJson } from "./utils.mjs";
import { renderHtml } from "./render-html.mjs";
import { renderPptx } from "./render-pptx.mjs";
import { chooseTheme } from "./theme-presets.mjs";

function referenceTable() {
  return [
    ["Evidence", "Baseline", "Improved"],
    ["Primary signal", "Example", "Example"],
    ["Long horizon", "Example", "Example"],
    ["Average", "Example", "Example"],
  ];
}

function referenceAsset(evidenceIndex) {
  const assets = evidenceIndex?.assets || [];
  return assets.find((asset) => asset.crop && Number(asset.source_page) === 15)
    || assets.find((asset) => asset.crop)
    || assets.find((asset) => !asset.snapshot)
    || assets[0]
    || null;
}

function referenceSpec(plan, evidenceIndex, theme, asset) {
  const elements = [
    {
      id: "theme-reference-title",
      kind: "text",
      role: "title",
      text: "Theme reference / visual contract",
      editable: true,
      render_mode: "native",
    },
    {
      id: "theme-reference-kicker",
      kind: "text",
      role: "kicker",
      text: `${theme.label} · ${theme.mood}`,
      editable: true,
      render_mode: "native",
    },
    {
      id: "theme-reference-table",
      kind: "table",
      role: "reference-table",
      editable: true,
      render_mode: "native",
      source_page: null,
      data: {
        table_ref: "theme-reference-table",
        caption: "Editable table treatment used as the deck contract",
        values: referenceTable(),
        rows: 4,
        columns: 3,
      },
    },
  ];
  if (asset?.path) {
    elements.push({
      id: "theme-reference-image",
      kind: "image",
      role: "evidence-figure",
      editable: false,
      render_mode: "asset",
      asset_ref: asset.id,
      source_page: asset.source_page ?? null,
      alt_text: "Source figure slot used by the selected theme",
      data: {
        path: asset.path,
        caption: "Source figure slot / image treatment",
        placement: "corner",
        fit: "contain",
        crop: Boolean(asset.crop),
      },
    });
  }
  return {
    spec_version: "0.2.0",
    deck: plan.deck,
    theme,
    visual: {
      ...(plan.visual || {}),
      style_family: theme.id,
      style_reference: "codex/theme-reference.png",
      style_lock: "all slides inherit this theme's palette, typography, spacing, image treatment, and table treatment",
    },
    evidence: evidenceIndex ? {
      input: evidenceIndex.input,
      parser: evidenceIndex.parser,
      page_count: evidenceIndex.page_count,
      character_count: evidenceIndex.character_count,
      sections: evidenceIndex.sections,
      claims: evidenceIndex.claims,
    } : undefined,
    assets: evidenceIndex?.assets || [],
    tables: evidenceIndex?.tables || [],
    narrative: plan.narrative,
    slides: [{
      id: "theme-reference",
      layout: "evidence",
      role: "theme_reference",
      action_title: "Lock the visual language before slide generation",
      slide_goal: "Show the selected typography, image treatment, and editable table treatment before rendering the deck.",
      primary_claim: "Every slide inherits the same visual contract.",
      evidence_refs: [],
      table_refs: [],
      asset_candidates: asset ? [asset.id] : [],
      visual_intent: "source_table",
      speaker_note: "Internal visual contract; not a presentation slide.",
      reading_order: elements.map((element) => element.id),
      elements,
      review_flags: [],
    }],
  };
}

export async function materializeThemeReference({ plan, evidenceIndex = null, outDir, themeId = "auto" }) {
  const theme = chooseTheme(plan, themeId);
  const spec = referenceSpec(plan, evidenceIndex, theme, referenceAsset(evidenceIndex));
  const codexDir = path.join(outDir, "codex");
  const previewDir = path.join(codexDir, "theme-reference-preview");
  await ensureDir(codexDir);
  const htmlPath = path.join(codexDir, "theme-reference.html");
  const pptxPath = path.join(codexDir, "theme-reference.pptx");
  await writeJson(path.join(codexDir, "theme-reference.spec.json"), spec);
  const htmlSpec = structuredClone(spec);
  for (const slide of htmlSpec.slides) {
    for (const element of slide.elements || []) {
      if (element.kind === "image" && element.data?.path) element.data.path = `../${element.data.path}`;
    }
  }
  await renderHtml({ spec: htmlSpec, outPath: htmlPath });
  await renderPptx({ spec, outPath: pptxPath, previewDir, assetRoot: outDir });
  const previewPath = path.join(previewDir, "pptx-001.png");
  const imagePath = path.join(codexDir, "theme-reference.png");
  await fs.copyFile(previewPath, imagePath);
  return {
    theme,
    spec,
    htmlPath,
    pptxPath,
    imagePath,
    visual: {
      ...(plan.visual || {}),
      style_family: theme.id,
      style_reference: "codex/theme-reference.png",
      style_reference_html: "codex/theme-reference.html",
      style_lock: "theme-reference",
      style_system: {
        mood: theme.mood,
        composition: theme.composition,
        image_treatment: theme.image_treatment,
        table_treatment: theme.table_treatment,
      },
    },
  };
}
