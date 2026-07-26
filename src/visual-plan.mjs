export const LAYOUT_FAMILIES = [
  "title",
  "pipeline",
  "comparison",
  "insight",
  "evidence",
  "hero-image",
  "metric-stage",
  "story-split",
  "chart-focus",
  "matrix",
  "timeline",
  "evidence-collage",
];

export const IMAGE_ROLES = ["hero", "evidence", "comparison", "context"];
export const DATA_STRATEGIES = ["none", "native_chart", "native_table", "diagram", "source_figure"];
export const BACKGROUND_VARIANTS = ["default", "light", "dark", "quiet", "immersive"];
export const DENSITY_PROFILES = ["sparse", "balanced", "dense"];

const ROLE_DEFAULTS = {
  title: { layout_family: "hero-image", image_budget: 1, image_roles: ["hero"], data_strategy: "none", background_variant: "immersive", density: "sparse" },
  problem: { layout_family: "story-split", image_budget: 1, image_roles: ["context"], data_strategy: "none", background_variant: "default", density: "balanced" },
  gap: { layout_family: "matrix", image_budget: 0, image_roles: [], data_strategy: "diagram", background_variant: "quiet", density: "balanced" },
  contribution: { layout_family: "metric-stage", image_budget: 0, image_roles: [], data_strategy: "none", background_variant: "quiet", density: "sparse" },
  method_overview: { layout_family: "timeline", image_budget: 1, image_roles: ["context"], data_strategy: "diagram", background_variant: "default", density: "balanced" },
  method_detail: { layout_family: "pipeline", image_budget: 1, image_roles: ["evidence"], data_strategy: "diagram", background_variant: "default", density: "balanced" },
  experiment_setup: { layout_family: "matrix", image_budget: 0, image_roles: [], data_strategy: "native_table", background_variant: "quiet", density: "balanced" },
  main_results: { layout_family: "chart-focus", image_budget: 1, image_roles: ["evidence"], data_strategy: "native_chart", background_variant: "default", density: "balanced" },
  analysis: { layout_family: "evidence-collage", image_budget: 3, image_roles: ["hero", "comparison", "evidence"], data_strategy: "source_figure", background_variant: "default", density: "balanced" },
  limitations: { layout_family: "story-split", image_budget: 1, image_roles: ["evidence"], data_strategy: "none", background_variant: "quiet", density: "balanced" },
  content: { layout_family: "story-split", image_budget: 1, image_roles: ["context"], data_strategy: "none", background_variant: "default", density: "balanced" },
};

function clampImageBudget(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(3, Math.round(numeric))) : fallback;
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function defaultFor(slide, { paperMode = false } = {}) {
  const role = slide?.role || (paperMode ? "analysis" : "content");
  const roleDefault = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.content;
  if (role === "method_detail" && slide?.visual_intent === "comparison_matrix") {
    return { ...roleDefault, layout_family: "matrix" };
  }
  const legacyLayout = slide?.layout;
  if (!paperMode && LAYOUT_FAMILIES.includes(legacyLayout)) return { ...roleDefault, layout_family: legacyLayout };
  return roleDefault;
}

export function isLayoutFamily(value) {
  return LAYOUT_FAMILIES.includes(value);
}

export function normalizeVisualPlan(slide = {}, options = {}) {
  const base = defaultFor(slide, options);
  const provided = slide.visual_plan && typeof slide.visual_plan === "object" ? slide.visual_plan : {};
  const imageBudget = clampImageBudget(provided.image_budget, base.image_budget);
  const rawRoles = Array.isArray(provided.image_roles) ? provided.image_roles : base.image_roles;
  const imageRoles = [...new Set(rawRoles.filter((role) => IMAGE_ROLES.includes(role)))].slice(0, imageBudget);
  for (const role of [...base.image_roles, ...IMAGE_ROLES]) {
    if (imageRoles.length >= imageBudget) break;
    if (!imageRoles.includes(role)) imageRoles.push(role);
  }
  return {
    layout_family: enumValue(provided.layout_family || (options.paperMode ? base.layout_family : slide.layout), LAYOUT_FAMILIES, base.layout_family),
    primary_visual: typeof provided.primary_visual === "string" && provided.primary_visual.trim() ? provided.primary_visual.trim() : null,
    image_budget: imageBudget,
    image_roles: imageRoles,
    data_strategy: enumValue(provided.data_strategy, DATA_STRATEGIES, base.data_strategy),
    background_variant: enumValue(provided.background_variant, BACKGROUND_VARIANTS, base.background_variant),
    density: enumValue(provided.density, DENSITY_PROFILES, base.density),
  };
}
