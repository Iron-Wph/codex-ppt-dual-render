const BASE_FONTS = {
  heading: ["Aptos Display", "Microsoft YaHei", "sans-serif"],
  body: ["Aptos", "Microsoft YaHei", "sans-serif"],
  mono: ["Aptos Mono", "Consolas", "monospace"],
};

const BASE_SPACING = { page_margin: 64, section_gap: 28, card_gap: 18, text_gap: 10 };
const BASE_TYPE = { title_px: 58, slide_title_px: 38, subtitle_px: 21, body_px: 17, caption_px: 13, metric_px: 46 };

export const THEME_PRESETS = {
  "graphite-lime": {
    id: "graphite-lime",
    label: "Graphite Lime",
    mood: "technical, experimental, high-contrast",
    recommended_for: ["AI research", "robotics", "engineering", "developer tools"],
    composition: "dark canvas, strong left-aligned thesis, lime evidence highlight, coral counterpoint",
    image_treatment: "bright source figures inside dark frames",
    table_treatment: "high-contrast evidence table with lime header accents",
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

export function chooseTheme(plan, requested = "auto") {
  const keys = Object.keys(THEME_PRESETS);
  const requestedKey = String(requested || "auto").toLowerCase();
  if (requestedKey !== "auto" && THEME_PRESETS[requestedKey]) return structuredClone(THEME_PRESETS[requestedKey]);
  const preferred = plan?.visual?.style_family || plan?.deck?.style_family || plan?.deck?.theme_id;
  if (preferred && THEME_PRESETS[preferred]) return structuredClone(THEME_PRESETS[preferred]);
  const source = `${plan?.deck?.id || "deck"}|${plan?.deck?.title || ""}|${plan?.narrative?.key_message || ""}`;
  return structuredClone(THEME_PRESETS[keys[hashText(source) % keys.length]]);
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
  }));
}
