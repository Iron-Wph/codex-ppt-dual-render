import fs from "node:fs/promises";
import path from "node:path";
import { formatIssue, readJson, writeJson, writeText } from "./utils.mjs";
import { validateSpec } from "./validate-spec.mjs";

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

function issue(rule_id, severity, message, extra = {}) {
  return { id: `${rule_id}-${Math.random().toString(36).slice(2, 8)}`, rule_id, severity, message, ...extra };
}

function slideIssues(spec) {
  const issues = [];
  let assetSlideCount = 0;
  for (const slide of spec.slides) {
    const titles = slide.elements.filter((element) => element.role === "title");
    if (titles.length !== 1) issues.push(issue("TITLE_COUNT", "error", "页面应有且只有一个 title 元素", { slide_id: slide.id }));
    const textElements = slide.elements.filter((element) => element.kind === "text");
    for (const element of textElements) {
      const text = element.text || "";
      if (element.role === "title" && text.length > 38) issues.push(issue("TITLE_DENSITY", "warning", "标题较长，可能导致双输出换行差异", { slide_id: slide.id, element_id: element.id }));
      if (!["title", "eyebrow", "kicker", "subtitle"].includes(element.role) && text.length > 150) issues.push(issue("BODY_DENSITY", "warning", "正文较长，建议压缩或拆页", { slide_id: slide.id, element_id: element.id }));
    }
    if (slide.layout === "pipeline") {
      const steps = slide.elements.filter((element) => element.role === "step");
      if (steps.length < 2 || steps.length > 5) issues.push(issue("PIPELINE_STEP_COUNT", "error", "pipeline 需要 2–5 个步骤", { slide_id: slide.id }));
    }
    if (slide.layout === "comparison") {
      const columns = slide.elements.filter((element) => element.role === "comparison-column");
      if (columns.length < 2 || columns.length > 3) issues.push(issue("COMPARISON_COLUMN_COUNT", "error", "comparison 需要 2–3 个对比列", { slide_id: slide.id }));
    }
    if (slide.elements.length === 0) issues.push(issue("EMPTY_PAGE", "error", "页面没有任何元素", { slide_id: slide.id }));
    const imageElements = slide.elements.filter((element) => element.kind === "image");
    if (imageElements.length) assetSlideCount += 1;
    if (slide.role && slide.role !== "title" && !slide.action_title) issues.push(issue("ACTION_TITLE_MISSING", "warning", "页面缺少 action_title，内容编排不完整", { slide_id: slide.id }));
    if (slide.role && !["title", "problem", "gap", "contribution", "method_overview", "method_detail", "experiment_setup", "main_results", "analysis", "limitations", "content"].includes(slide.role)) {
      issues.push(issue("UNKNOWN_SLIDE_ROLE", "warning", `未知页面角色: ${slide.role}`, { slide_id: slide.id }));
    }
    if (slide.role && ["method_overview", "method_detail", "experiment_setup", "main_results", "analysis"].includes(slide.role) && !imageElements.length) {
      issues.push(issue("VISUAL_ASSET_MISSING", "warning", "方法/实验/结果页面没有图片、图表或证据资产", { slide_id: slide.id }));
    }
  }
  if (spec.slides.length >= 8 && assetSlideCount < Math.min(4, spec.slides.length - 1)) {
    issues.push(issue("PAPER_IMAGE_COVERAGE", "warning", `论文模式有资产的页面仅 ${assetSlideCount} 页，建议至少 4 页`));
  }
  for (let index = 2; index < spec.slides.length; index += 1) {
    if (spec.slides[index - 2].layout === spec.slides[index - 1].layout && spec.slides[index - 1].layout === spec.slides[index].layout) {
      issues.push(issue("REPEATED_LAYOUT", "warning", "连续三页使用相同布局，建议切换 layout family", { slide_id: spec.slides[index].id }));
    }
  }
  return issues;
}

async function crossOutputIssues(spec, inputDir, requestedFormat) {
  const issues = [];
  const htmlPath = path.join(inputDir, "presentation.html");
  const pptxPath = path.join(inputDir, "presentation.pptx");
  if (["html", "both"].includes(requestedFormat) && !(await exists(htmlPath))) issues.push(issue("MISSING_HTML", "error", "缺少 presentation.html"));
  if (["pptx", "both"].includes(requestedFormat) && !(await exists(pptxPath))) issues.push(issue("MISSING_PPTX", "error", "缺少 presentation.pptx"));
  if (await exists(htmlPath)) {
    const html = await fs.readFile(htmlPath, "utf8");
    const slideCount = (html.match(/class="slide slide-/g) || []).length;
    if (slideCount !== spec.slides.length) issues.push(issue("HTML_SLIDE_COUNT", "error", `HTML 页数 ${slideCount} 与规格 ${spec.slides.length} 不一致`));
    for (const slide of spec.slides) {
      if (!html.includes(`id="${slide.id}"`)) issues.push(issue("HTML_SLIDE_ID", "error", `HTML 缺少页面 ${slide.id}`, { slide_id: slide.id }));
    }
  }
  const inspectPath = path.join(inputDir, "preview", "pptx-inspect.ndjson");
  if (await exists(inspectPath)) {
    const inspect = await fs.readFile(inspectPath, "utf8");
    if (!inspect.includes("textbox")) issues.push(issue("PPTX_EDITABILITY", "error", "PPTX 预览检查未发现原生文本框"));
    if ((inspect.match(/slide/g) || []).length < spec.slides.length) issues.push(issue("PPTX_SLIDE_COUNT", "warning", "PPTX inspect 结果无法确认所有页面"));
  }
  for (const asset of spec.assets || []) {
    if (!(await exists(path.join(inputDir, asset.path)))) {
      issues.push(issue("MISSING_ASSET", "warning", `规格引用的资产不存在: ${asset.path}`, { element_id: asset.id }));
    }
  }
  return issues;
}

export async function runQa({ specPath, inputDir, requestedFormat = "both" }) {
  const spec = await readJson(specPath);
  const validation = validateSpec(spec);
  const issues = [
    ...validation.errors.map((item) => ({ ...item, id: `${item.rule_id}-schema` })),
    ...validation.warnings.map((item) => ({ ...item, id: `${item.rule_id}-schema` })),
    ...slideIssues(spec),
    ...(await crossOutputIssues(spec, inputDir, requestedFormat)),
  ];
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  const report = {
    run_id: `${new Date().toISOString()}-${spec.deck.id}`,
    spec_version: spec.spec_version,
    status: errors.length ? "fail" : "pass",
    summary: { slides: spec.slides.length, errors: errors.length, warnings: warnings.length, passed: Math.max(0, 12 - errors.length - warnings.length) },
    issues,
    artifacts: {
      spec: "deck.spec.json",
      html: (await exists(path.join(inputDir, "presentation.html"))) ? "presentation.html" : null,
      pptx: (await exists(path.join(inputDir, "presentation.pptx"))) ? "presentation.pptx" : null,
      montage: (await exists(path.join(inputDir, "preview/pptx-montage.webp"))) ? "preview/pptx-montage.webp" : null,
    },
  };
  await writeJson(path.join(inputDir, "qa", "report.json"), report);
  const lines = [
    `# QA Report: ${spec.deck.title}`,
    "",
    `- Status: **${report.status.toUpperCase()}**`,
    `- Slides: ${report.summary.slides}`,
    `- Errors: ${report.summary.errors}`,
    `- Warnings: ${report.summary.warnings}`,
    "",
    "## Issues",
    "",
    ...(issues.length ? issues.map(formatIssue).map((line) => `- ${line}`) : ["- No blocking issues."]),
    "",
    "## Human Review",
    "",
    "- [ ] 阅读入口明确",
    "- [ ] 页面密度适中",
    "- [ ] HTML 与 PPTX 没有明显换行/裁切差异",
    "- [ ] PPTX 核心文字和形状可以继续编辑",
  ];
  await writeText(path.join(inputDir, "qa", "report.md"), `${lines.join("\n")}\n`);
  return report;
}
