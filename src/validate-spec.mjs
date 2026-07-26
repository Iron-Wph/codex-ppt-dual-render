import { readJson } from "./utils.mjs";

const LAYOUTS = new Set(["title", "pipeline", "comparison", "insight", "evidence"]);
const KINDS = new Set(["text", "shape", "image", "chart", "table", "connector", "code"]);
const RENDER_MODES = new Set(["native", "asset", "html_only", "pptx_only"]);

function issue(rule_id, severity, message, extra = {}) {
  return { rule_id, severity, message, ...extra };
}

export function validateSpec(spec) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!spec || typeof spec !== "object") {
    return { valid: false, errors: [issue("SPEC_OBJECT", "error", "规格必须是 JSON 对象")], warnings };
  }
  if (!/^\d+\.\d+\.\d+$/.test(spec.spec_version || "")) {
    errors.push(issue("SPEC_VERSION", "error", "缺少合法的 spec_version"));
  }
  for (const key of ["deck", "theme", "narrative", "slides"]) {
    if (!spec[key]) errors.push(issue("REQUIRED_FIELD", "error", `缺少字段 ${key}`));
  }
  if (spec.deck?.aspect_ratio !== "16:9") {
    errors.push(issue("ASPECT_RATIO", "error", "MVP 只支持 16:9"));
  }
  if (!spec.narrative?.key_message) {
    errors.push(issue("KEY_MESSAGE", "error", "narrative.key_message 不能为空"));
  }
  if (!Array.isArray(spec.slides) || spec.slides.length < 1 || spec.slides.length > 10) {
    errors.push(issue("SLIDE_COUNT", "error", "slides 必须包含 1–10 页"));
  }

  for (const slide of spec.slides || []) {
    if (!slide.id || ids.has(slide.id)) errors.push(issue("DUPLICATE_ID", "error", `页面 ID 重复或为空: ${slide.id || "(empty)"}`, { slide_id: slide.id }));
    ids.add(slide.id);
    if (!LAYOUTS.has(slide.layout)) errors.push(issue("UNKNOWN_LAYOUT", "error", `未知布局: ${slide.layout}`, { slide_id: slide.id }));
    for (const key of ["slide_goal", "primary_claim"]) {
      if (!slide[key]) errors.push(issue("SLIDE_CLAIM", "error", `${key} 不能为空`, { slide_id: slide.id }));
    }
    if (!Array.isArray(slide.elements) || slide.elements.length === 0) {
      errors.push(issue("EMPTY_SLIDE", "error", "页面没有元素", { slide_id: slide.id }));
      continue;
    }
    for (const element of slide.elements) {
      if (!element.id || ids.has(element.id)) errors.push(issue("DUPLICATE_ID", "error", `元素 ID 重复或为空: ${element.id || "(empty)"}`, { slide_id: slide.id, element_id: element.id }));
      ids.add(element.id);
      if (!KINDS.has(element.kind)) errors.push(issue("UNKNOWN_KIND", "error", `未知元素类型: ${element.kind}`, { slide_id: slide.id, element_id: element.id }));
      if (!element.role) errors.push(issue("ELEMENT_ROLE", "error", "元素缺少 role", { slide_id: slide.id, element_id: element.id }));
      if (!RENDER_MODES.has(element.render_mode)) errors.push(issue("RENDER_MODE", "error", `未知 render_mode: ${element.render_mode}`, { slide_id: slide.id, element_id: element.id }));
      if (element.kind === "text" && !element.text) warnings.push(issue("EMPTY_TEXT", "warning", "文本元素为空", { slide_id: slide.id, element_id: element.id }));
      if (element.box) {
        const { left, top, width, height } = element.box;
        if ([left, top, width, height].some((value) => typeof value !== "number")) {
          errors.push(issue("BOX_NUMBER", "error", "box 坐标必须是数字", { slide_id: slide.id, element_id: element.id }));
        }
        if (left < 0 || top < 0 || left + width > 1280 || top + height > 720) {
          warnings.push(issue("BOX_BOUNDS", "warning", "元素超出 1280×720 逻辑画布", { slide_id: slide.id, element_id: element.id }));
        }
      }
    }
    for (const flag of slide.review_flags || []) {
      if (flag.severity === "error") warnings.push(issue(flag.rule_id || "REVIEW_FLAG", "warning", flag.message, { slide_id: slide.id, element_id: flag.element_id }));
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export async function validateSpecFile(specPath) {
  const spec = await readJson(specPath);
  return { spec, ...validateSpec(spec) };
}

export function assertValidSpec(spec) {
  const result = validateSpec(spec);
  if (!result.valid) {
    const detail = result.errors.map((item) => `${item.rule_id}: ${item.message}`).join("\n");
    throw new Error(`deck.spec.json 校验失败:\n${detail}`);
  }
  return result;
}
