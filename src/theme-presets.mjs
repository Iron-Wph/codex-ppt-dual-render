import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_FONTS = {
  heading: ["Aptos Display", "Microsoft YaHei", "sans-serif"],
  body: ["Aptos", "Microsoft YaHei", "sans-serif"],
  mono: ["Aptos Mono", "Consolas", "monospace"],
};

const BASE_SPACING = { page_margin: 64, section_gap: 28, card_gap: 18, text_gap: 10 };
const BASE_TYPE = { title_px: 58, slide_title_px: 38, subtitle_px: 21, body_px: 17, caption_px: 13, metric_px: 46 };
const REQUIRED_COLORS = ["background", "surface", "surface2", "foreground", "muted", "accent", "accent2", "accent3", "border", "white", "black"];
const CATALOG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "themes", "catalog");

function readCatalog() {
  const files = fs.readdirSync(CATALOG_DIR).filter((file) => file.endsWith(".json")).sort();
  if (!files.length) throw new Error(`主题目录为空：${CATALOG_DIR}`);
  const themes = {};
  for (const file of files) {
    const manifest = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, file), "utf8"));
    if (!manifest.id || themes[manifest.id]) throw new Error(`主题 ID 缺失或重复：${file}`);
    const colors = manifest.colors || {};
    const missingColors = REQUIRED_COLORS.filter((key) => !colors[key]);
    if (missingColors.length) throw new Error(`主题 ${manifest.id} 缺少颜色：${missingColors.join(", ")}`);
    themes[manifest.id] = {
      ...manifest,
      category: manifest.category || "General",
      tags: manifest.tags || [],
      match_signals: manifest.match_signals || manifest.tags || [],
      density: manifest.density || "medium",
      fonts: { ...BASE_FONTS, ...(manifest.fonts || {}) },
      spacing: { ...BASE_SPACING, ...(manifest.spacing || {}) },
      typography: { ...BASE_TYPE, ...(manifest.typography || {}) },
    };
  }
  return themes;
}

export const THEME_PRESETS = readCatalog();

function hashText(value) {
  let hash = 0;
  for (const char of String(value || "")) hash = ((hash << 5) - hash + char.codePointAt(0)) | 0;
  return Math.abs(hash);
}

function planText(plan) {
  return [
    plan?.deck?.title,
    plan?.deck?.purpose,
    plan?.deck?.audience,
    plan?.narrative?.arc,
    plan?.narrative?.key_message,
    plan?.visual?.style_request,
    plan?.visual?.style_context,
  ].filter(Boolean).join(" ").toLowerCase();
}

function semanticThemeScores(plan) {
  const source = planText(plan);
  return Object.fromEntries(Object.values(THEME_PRESETS).map((theme) => [
    theme.id,
    (theme.match_signals || []).reduce((score, signal) => score + (source.includes(String(signal).toLowerCase()) ? 1 : 0), 0),
  ]));
}

function selectionFor(plan, requested = "auto") {
  const requestedKey = String(requested || "auto").toLowerCase();
  if (requestedKey !== "auto") {
    if (!THEME_PRESETS[requestedKey]) throw new Error(`未知主题 ${requestedKey}。可用主题：${Object.keys(THEME_PRESETS).join(", ")}`);
    return { id: requestedKey, basis: "explicit_theme", scores: {} };
  }
  const preferred = plan?.visual?.style_family || plan?.deck?.style_family || plan?.deck?.theme_id;
  if (preferred && THEME_PRESETS[preferred]) return { id: preferred, basis: "planner_choice", scores: {} };
  const scores = semanticThemeScores(plan);
  const [semanticId, semanticScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (semanticScore > 0) return { id: semanticId, basis: "semantic_match", scores };
  const keys = Object.keys(THEME_PRESETS);
  const source = `${plan?.deck?.id || "deck"}|${plan?.deck?.title || ""}|${plan?.narrative?.key_message || ""}`;
  return { id: keys[hashText(source) % keys.length], basis: "stable_fallback", scores };
}

export function chooseTheme(plan, requested = "auto") {
  return structuredClone(THEME_PRESETS[selectionFor(plan, requested).id]);
}

export function buildStyleBrief(plan, requested = "auto") {
  const selection = selectionFor(plan, requested);
  const theme = structuredClone(THEME_PRESETS[selection.id]);
  return {
    theme,
    selection: {
      theme_id: theme.id,
      basis: selection.basis,
      semantic_scores: selection.scores,
    },
    style_system: {
      category: theme.category,
      visual_profile: theme.visual_profile || "default",
      tags: theme.tags,
      density: theme.density,
      mood: theme.mood,
      composition: theme.composition,
      typography_treatment: theme.typography_treatment,
      background_treatment: theme.background_treatment,
      image_treatment: theme.image_treatment,
      table_treatment: theme.table_treatment,
      style_markers: theme.style_markers,
      layout_families: theme.layout_families,
      avoid: theme.avoid,
      inspiration_asset: theme.style_reference_asset || null,
      provenance: theme.provenance || { type: "original" },
    },
  };
}

export function listThemeIds() {
  return Object.keys(THEME_PRESETS);
}

export function listThemes() {
  return Object.values(THEME_PRESETS).map((theme) => structuredClone(theme));
}

export function themeDecisionContext() {
  return Object.values(THEME_PRESETS).map((theme) => ({
    id: theme.id,
    label: theme.label,
    category: theme.category,
    visual_profile: theme.visual_profile || "default",
    tags: theme.tags,
    density: theme.density,
    mood: theme.mood,
    recommended_for: theme.recommended_for,
    composition: theme.composition,
    typography_treatment: theme.typography_treatment,
    background_treatment: theme.background_treatment,
    image_treatment: theme.image_treatment,
    table_treatment: theme.table_treatment,
    style_markers: theme.style_markers,
    layout_families: theme.layout_families,
    avoid: theme.avoid,
    style_reference_asset: theme.style_reference_asset || null,
  }));
}
