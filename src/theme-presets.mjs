const BASE_FONTS = {
  heading: ["Aptos Display", "Microsoft YaHei", "sans-serif"],
  body: ["Aptos", "Microsoft YaHei", "sans-serif"],
  mono: ["Aptos Mono", "Consolas", "monospace"],
};

const BASE_SPACING = { page_margin: 64, section_gap: 28, card_gap: 18, text_gap: 10 };
const BASE_TYPE = { title_px: 58, slide_title_px: 38, subtitle_px: 21, body_px: 17, caption_px: 13, metric_px: 46 };

const STYLE_SIGNAL_MAP = {
  "paper-blue": ["academic", "research", "paper", "thesis", "science", "study", "experiment", "evidence", "论文", "研究", "学术", "实验", "综述", "技术报告"],
  "signal-dark": ["launch", "product", "demo", "future", "innovation", "ai", "robotics", "technology", "release", "发布", "产品", "演示", "未来", "科技", "人工智能"],
  "sunset-editorial": ["strategy", "consulting", "executive", "investor", "market", "growth", "brand", "board", "商业", "咨询", "战略", "高管", "投资", "市场", "品牌"],
  "graphite-lime": ["developer", "engineering", "architecture", "platform", "system", "api", "infrastructure", "tooling", "开发者", "工程", "架构", "系统", "平台", "基础设施"],
};

export const THEME_PRESETS = {
  "graphite-lime": {
    id: "graphite-lime",
    label: "Graphite Lime",
    mood: "technical, experimental, high-contrast",
    recommended_for: ["AI research", "robotics", "engineering", "developer tools"],
    composition: "dark canvas, strong left-aligned thesis, lime evidence highlight, coral counterpoint",
    image_treatment: "bright source figures inside dark frames",
    table_treatment: "high-contrast evidence table with lime header accents",
    style_reference_asset: "themes/style-references/future-tech-signal-v1.png",
    style_markers: ["near-black canvas", "luminous evidence accent", "technical line work", "large thesis typography"],
    layout_families: ["thesis-stage", "architecture-map", "experiment-comparison", "metric-strip", "evidence-panel"],
    avoid: ["dense dashboard grids", "low-contrast labels", "decorative neon without evidence"],
    fonts: BASE_FONTS,
    colors: { background: "#101312", surface: "#181D1A", surface2: "#202721", foreground: "#F1F3E9", muted: "#A5AEA5", accent: "#D8FF5A", accent2: "#FF7757", accent3: "#8EE3C4", border: "#39443B", white: "#FFFFFF", black: "#0A0D0B" },
    spacing: BASE_SPACING,
    typography: BASE_TYPE,
  },
  "paper-blue": {
    id: "paper-blue",
    label: "Paper Blue",
    mood: "credible, academic, clean",
    recommended_for: ["academic paper", "research review", "enterprise analysis", "technical briefing"],
    composition: "light canvas, blue hierarchy, generous margins, restrained evidence panels",
    image_treatment: "clean source figures with white framing",
    table_treatment: "white table surface with blue structural rules",
    style_reference_asset: "themes/style-references/academic-evidence-v1.png",
    style_markers: ["warm white canvas", "navy thesis", "evidence image crop", "native chart and table", "coral annotation"],
    layout_families: ["research-title", "evidence-split", "method-flow", "chart-first", "finding-and-limit"],
    avoid: ["poster-like text walls", "more than one primary chart", "colour-only comparisons"],
    fonts: BASE_FONTS,
    colors: { background: "#F4F7FB", surface: "#FFFFFF", surface2: "#E8EFF8", foreground: "#14243A", muted: "#58708D", accent: "#1664D8", accent2: "#E06B47", accent3: "#2C9D91", border: "#C7D5E6", white: "#FFFFFF", black: "#0C1725" },
    spacing: BASE_SPACING,
    typography: BASE_TYPE,
  },
  "sunset-editorial": {
    id: "sunset-editorial",
    label: "Sunset Editorial",
    mood: "warm, editorial, strategic",
    recommended_for: ["strategy", "consulting", "product narrative", "executive briefing"],
    composition: "warm paper canvas, editorial headline, terracotta thesis, amber emphasis",
    image_treatment: "warm framed figures with editorial captions",
    table_treatment: "quiet table with warm accent rows and strong labels",
    style_reference_asset: "themes/style-references/minimal-editorial-v1.png",
    style_markers: ["ivory canvas", "oversized metric", "warm architectural image", "terracotta rule", "editorial whitespace"],
    layout_families: ["editorial-cover", "metric-stage", "story-split", "decision-table", "closing-statement"],
    avoid: ["generic office stock photography", "blue corporate gradients", "equal-weight card collections"],
    fonts: BASE_FONTS,
    colors: { background: "#FFF8F1", surface: "#FFFFFF", surface2: "#F9E8D8", foreground: "#2B1D1A", muted: "#7D665F", accent: "#B9462E", accent2: "#E5A33A", accent3: "#2C8C83", border: "#E5CABC", white: "#FFFFFF", black: "#241512" },
    spacing: BASE_SPACING,
    typography: BASE_TYPE,
  },
  "signal-dark": {
    id: "signal-dark",
    label: "Signal Dark",
    mood: "futuristic, energetic, product-forward",
    recommended_for: ["frontier technology", "product launch", "systems architecture", "future-facing demo"],
    composition: "navy canvas, cyan signal lines, magenta contrast, lime success state",
    image_treatment: "dark media wells with cyan edge treatment",
    table_treatment: "dark evidence table with luminous signal accents",
    style_reference_asset: "themes/style-references/future-tech-signal-v1.png",
    style_markers: ["midnight navy", "orbital hero visual", "cyan signal lines", "controlled violet and magenta", "dark data grid"],
    layout_families: ["futuristic-hero", "orbit-system", "product-reveal", "signal-chart", "dark-comparison"],
    avoid: ["rainbow neon", "illegible glowing text", "sci-fi decoration without story purpose"],
    fonts: BASE_FONTS,
    colors: { background: "#090E1A", surface: "#111B2D", surface2: "#182640", foreground: "#F1F6FF", muted: "#97A9C5", accent: "#55D6FF", accent2: "#FF6E91", accent3: "#B6F36B", border: "#304565", white: "#FFFFFF", black: "#060A12" },
    spacing: BASE_SPACING,
    typography: BASE_TYPE,
  },
};

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
  return Object.fromEntries(Object.entries(STYLE_SIGNAL_MAP).map(([themeId, signals]) => [
    themeId,
    signals.reduce((score, signal) => score + (source.includes(signal) ? 1 : 0), 0),
  ]));
}

function selectionFor(plan, requested = "auto") {
  const requestedKey = String(requested || "auto").toLowerCase();
  if (requestedKey !== "auto" && THEME_PRESETS[requestedKey]) return { id: requestedKey, basis: "explicit_theme", scores: {} };
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
      mood: theme.mood,
      composition: theme.composition,
      image_treatment: theme.image_treatment,
      table_treatment: theme.table_treatment,
      style_markers: theme.style_markers,
      layout_families: theme.layout_families,
      avoid: theme.avoid,
      inspiration_asset: theme.style_reference_asset,
    },
  };
}

export function listThemeIds() {
  return Object.keys(THEME_PRESETS);
}

export function themeDecisionContext() {
  return Object.values(THEME_PRESETS).map((theme) => ({
    id: theme.id,
    label: theme.label,
    mood: theme.mood,
    recommended_for: theme.recommended_for,
    composition: theme.composition,
    image_treatment: theme.image_treatment,
    table_treatment: theme.table_treatment,
    style_markers: theme.style_markers,
    layout_families: theme.layout_families,
    avoid: theme.avoid,
    style_reference_asset: theme.style_reference_asset,
  }));
}
