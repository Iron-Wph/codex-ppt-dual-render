import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, writeJson } from "./utils.mjs";
import { renderHtml } from "./render-html.mjs";
import { renderPptx } from "./render-pptx.mjs";
import { buildStyleBrief } from "./theme-presets.mjs";

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

async function copyStyleInspiration(theme, outDir, styleAssetRoot) {
  if (!theme.style_reference_asset) return null;
  const sourcePath = path.resolve(styleAssetRoot, theme.style_reference_asset);
  const targetPath = path.join(outDir, "codex", "style-inspiration.png");
  try {
    await fs.access(sourcePath);
    await ensureDir(path.dirname(targetPath));
    await fs.copyFile(sourcePath, targetPath);
    return {
      id: "style-inspiration",
      type: "style_reference",
      path: "codex/style-inspiration.png",
      source_page: null,
      mime_type: "image/png",
      caption: `Original ${theme.label} inspiration board used only as a visual contract.`,
      alt_text: `${theme.label} PowerPoint style inspiration board with typography, image, data, and table treatment.`,
      editable_level: "reference",
    };
  } catch {
    return null;
  }
}

function referenceSpec(plan, evidenceIndex, theme, asset, styleAsset, styleBrief) {
  const displayAsset = styleAsset || asset;
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
  if (displayAsset?.path) {
    elements.push({
      id: "theme-reference-image",
      kind: "image",
      role: "evidence-figure",
      editable: false,
      render_mode: "asset",
      asset_ref: displayAsset.id,
      source_page: displayAsset.source_page ?? null,
      alt_text: displayAsset.alt_text || "Style inspiration image used by the selected theme",
      data: {
        path: displayAsset.path,
        caption: displayAsset.caption || "Source figure slot / image treatment",
        placement: "corner",
        fit: "contain",
        crop: Boolean(displayAsset.crop),
      },
    });
  }
  return {
    spec_version: "0.4.0",
    deck: plan.deck,
    theme,
    visual: {
      ...(plan.visual || {}),
      style_family: theme.id,
      style_reference: "codex/theme-reference.png",
      ...(styleAsset ? { style_inspiration: styleAsset.path } : {}),
      style_lock: "all slides inherit this theme's palette, typography, spacing, image treatment, and table treatment",
      style_system: { ...styleBrief.style_system, selection: styleBrief.selection },
    },
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
    assets: [...(evidenceIndex?.assets || []), ...(styleAsset ? [styleAsset] : [])],
    tables: evidenceIndex?.tables || [],
    formulas: evidenceIndex?.formulas || [],
    narrative: plan.narrative,
    slides: [{
      id: "theme-reference",
      layout: "evidence",
      role: "theme_reference",
      composition_id: "evidence-table",
      content_priority: "context",
      action_title: "Lock the visual language before slide generation",
      audience_question: "这套演示将采用什么统一视觉语言？",
      narrative_job: "在逐页生成前固定字体、色板、图片和表格处理。",
      slide_goal: "Show the selected typography, image treatment, and editable table treatment before rendering the deck.",
      primary_claim: "Every slide inherits the same visual contract.",
      evidence: [],
      implication: "后续页面可以改变构图，但不能破坏整体视觉系统。",
      transition_in: "从内容规划进入视觉实现。",
      transition_out: "使用同一视觉合同生成所有页面。",
      evidence_refs: [],
      table_refs: [],
      asset_candidates: displayAsset ? [displayAsset.id] : [],
      visual_intent: "source_table",
      speaker_note: "Internal visual contract; not a presentation slide.",
      speaker_notes: {
        talk_track: "This internal page locks the typography, palette, image treatment, and editable table treatment before the presentation is generated. It is a production reference and should not appear in the audience-facing deck.",
        delivery_cue: "Internal only.",
        source_refs: [],
        estimated_seconds: 20
      },
      content: {
        eyebrow: "VISUAL CONTRACT",
        title: "Theme reference / visual contract",
        subtitle: `${theme.label} · ${theme.mood}`,
        kicker: null,
        lede: "Typography, image treatment, chart color and table style are locked before slide generation.",
        note: null,
        body_points: [],
        metrics: [],
        steps: [],
        result: null,
        columns: [],
        takeaway: { label: "STYLE LOCK", value: "Composition may vary; the visual language remains coherent." }
      },
      reading_order: elements.map((element) => element.id),
      elements,
      review_flags: [],
    }],
  };
}

export async function materializeThemeReference({ plan, evidenceIndex = null, outDir, themeId = "auto", styleAssetRoot = process.cwd() }) {
  const styleBrief = buildStyleBrief(plan, themeId);
  const theme = styleBrief.theme;
  const codexDir = path.join(outDir, "codex");
  const previewDir = path.join(codexDir, "theme-reference-preview");
  await ensureDir(codexDir);
  const styleAsset = await copyStyleInspiration(theme, outDir, styleAssetRoot);
  const spec = referenceSpec(plan, evidenceIndex, theme, referenceAsset(evidenceIndex), styleAsset, styleBrief);
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
      ...(styleAsset ? { style_inspiration: styleAsset.path } : {}),
      style_lock: "theme-reference",
      style_system: {
        ...styleBrief.style_system,
        selection: styleBrief.selection,
      },
    },
  };
}
