import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir, readJson, readText, writeJson, writeText } from "./utils.mjs";
import { extractPdfText } from "./pdf-text.mjs";
import { buildEvidenceIndex, evidencePromptContext, writeEvidenceIndex } from "./evidence-index.mjs";
import { assertContentPlan, normalizePlan } from "./content-planner.mjs";
import { themeDecisionContext } from "./theme-presets.mjs";
import { materializeThemeReference } from "./theme-reference.mjs";

function extractSection(source, startMarker, endMarker = "") {
  const start = source.indexOf(startMarker);
  if (start < 0) return "";
  const from = source.slice(start);
  const end = endMarker ? from.indexOf(endMarker, startMarker.length) : -1;
  return (end >= 0 ? from.slice(0, end) : from).trim();
}

export function extractSkillGuidance(skillText) {
  const sections = [
    extractSection(skillText, "## 19. Review Checklist", "## 20."),
    extractSection(skillText, "### Layout Pattern: pipeline", "### Layout Pattern: comparison"),
    extractSection(skillText, "### Layout Pattern: comparison", "### Layout Pattern:"),
    extractSection(skillText, "# Part F. Final Compact Operational Summary")
  ].filter(Boolean);
  const guidance = sections.join("\n\n---\n\n");
  return (guidance || skillText).slice(0, 24000);
}

function extractPresentationGuidance(skillText) {
  const sections = [
    extractSection(skillText, "# Slides Skill", "## Skill Folder Contents"),
    extractSection(skillText, "## Codex Grid Artifact-Tool Compose Layout Reference", "## Workspace"),
    extractSection(skillText, "## QA Reminder", "## Final Response"),
  ].filter(Boolean);
  return sections.join("\n\n--- PRESENTATION SKILL SECTION ---\n\n").slice(0, 20000);
}

async function findPresentationSkillPath() {
  if (process.env.PRESENTATION_SKILL_PATH) return process.env.PRESENTATION_SKILL_PATH;
  const root = path.join(os.homedir(), ".codex", "plugins", "cache", "openai-primary-runtime", "presentations");
  try {
    const versions = (await fs.readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const version of versions) {
      const candidate = path.join(root, version, "skills", "presentations", "SKILL.md");
      try { await fs.access(candidate); return candidate; } catch { /* try next version */ }
    }
  } catch { /* optional local skill */ }
  return null;
}

async function combinedSkillGuidance(workspace) {
  const projectSkill = extractSkillGuidance(await readText(path.join(workspace, "SKILL.md")));
  const presentationPath = await findPresentationSkillPath();
  if (!presentationPath) return projectSkill;
  const presentationSkill = extractPresentationGuidance(await readText(presentationPath));
  return `${projectSkill}\n\n=== PRESENTATION SKILL ===\n${presentationSkill}`.slice(0, 36000);
}

function codexCommand() {
  if (process.env.CODEX_CLI_PATH) return process.env.CODEX_CLI_PATH;
  return process.platform === "win32" ? "codex.cmd" : "codex";
}

function codexModel() {
  return process.env.CODEX_MODEL || "gpt-5.6-luna";
}

function codexReasoningEffort() {
  return process.env.CODEX_REASONING_EFFORT || "medium";
}

async function codexInvocation(cwd) {
  const localScript = path.join(cwd, "node_modules", "@openai", "codex", "bin", "codex.js");
  try {
    await fs.access(localScript);
    return { command: process.execPath, prefix: [localScript] };
  } catch {
    return { command: codexCommand(), prefix: [] };
  }
}

function stopProcessTree(child) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
    killer.on("error", () => {});
    return;
  }
  child.kill("SIGTERM");
}

function runProcess(command, args, { cwd, input, resultPath = null, timeoutMs = Number(process.env.CODEX_TIMEOUT_MS || 180000), shell = process.platform === "win32" }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell,
      windowsHide: true,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let pollTimer = null;
    let timeoutTimer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      resolve(value);
    };
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => finish({ code, stdout, stderr }));
    child.stdin.end(input);

    if (resultPath) {
      pollTimer = setInterval(async () => {
        if (settled) return;
        try {
          const raw = await fs.readFile(resultPath, "utf8");
          JSON.parse(raw);
          stopProcessTree(child);
          finish({ code: 0, stdout, stderr, earlyCompleted: true });
        } catch {
          // The output file may not exist yet or may still be in the middle of a write.
        }
      }, 500);
    }
    timeoutTimer = setTimeout(() => {
      if (settled) return;
      stopProcessTree(child);
      finish({ code: 124, stdout, stderr: `${stderr}\nCodex 调用超过 ${timeoutMs}ms，已终止。` });
    }, timeoutMs);
  });
}

function parseJsonMessage(raw, label) {
  const text = String(raw || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON: ${error.message}\n${text.slice(0, 1200)}`);
  }
}

function assertPlanShape(plan, { minSlides = 3, maxSlides = 10 } = {}) {
  if (!plan?.deck || !plan?.narrative || !plan?.plan?.slides?.length) throw new Error("Codex 规划缺少 deck、narrative 或 plan.slides");
  if (plan.plan.slides.length < minSlides || plan.plan.slides.length > maxSlides) {
    throw new Error(`Codex 规划页数必须为 ${minSlides}–${maxSlides} 页，实际为 ${plan.plan.slides.length} 页`);
  }
  if (plan.deck.aspect_ratio !== "16:9") throw new Error("Codex 规划必须使用 16:9");
  const ids = new Set();
  for (const slide of plan.plan.slides) {
    if (!slide.id || ids.has(slide.id)) throw new Error(`Codex 规划存在重复页面 ID: ${slide.id}`);
    ids.add(slide.id);
    if (!["title", "pipeline", "comparison", "insight", "evidence"].includes(slide.layout)) throw new Error(`Codex 规划使用了未实现布局: ${slide.layout}`);
    if (!slide.slide_goal || !slide.primary_claim) throw new Error(`Codex 页面 ${slide.id} 缺少 slide_goal 或 primary_claim`);
    const content = slide.content || {};
    if (!content.title) throw new Error(`Codex 页面 ${slide.id} 缺少 content.title`);
    if (slide.layout === "title" && (!content.note || !content.subtitle)) throw new Error(`Codex 标题页 ${slide.id} 缺少 note 或 subtitle`);
    if (slide.layout === "pipeline" && (!Array.isArray(content.steps) || content.steps.length < 2 || content.steps.length > 4 || !content.result)) throw new Error(`Codex 流程页 ${slide.id} 的 steps/result 不完整`);
    if (slide.layout === "comparison" && (!Array.isArray(content.columns) || content.columns.length !== 2 || !content.takeaway)) throw new Error(`Codex 对比页 ${slide.id} 的 columns/takeaway 不完整`);
    if (slide.layout === "insight" && (!Array.isArray(content.columns) || content.columns.length < 1 || !content.takeaway)) throw new Error(`Codex 洞察页 ${slide.id} 的 columns/takeaway 不完整`);
  }
  return plan;
}

function buildPlanPrompt({ sourceText, skillGuidance, paperMode, sourcePath, pageCount, evidenceContext }) {
  const task = paperMode
    ? `任务：这是论文模式。根据下面的 PDF 全文，生成一个 8–10 页的中文论文汇报大纲，推荐 9 页。不要只做摘要，要覆盖论文的研究背景/问题、方法总览、关键算法或训练流程、实验设置、主结果、数据效率、泛化或 sim-to-real、关键分析/失败模式、局限与结论。每页只能有一个 primary_claim，页面之间形成“问题—方法—证据—分析—边界”的累积叙事。允许使用 title、pipeline、comparison、insight 四种布局；尽量避免连续三页相同布局。布局语义必须准确：只有真正按时间或因果顺序发生的步骤才使用 pipeline；并行的机制、独立的实验结果、基线对照和多维分析使用 comparison；分析、失败模式和限制优先使用 insight。特别是 Dynamic Sampling、Clip-Higher、Higher Temperature 这类并行增强机制，必须放在同一张 comparison 页中，不要画成串行 pipeline。`
    : `任务：根据下面的 Markdown，生成一个 3–5 页、推荐 4 页的中文演示规划。允许使用 title、pipeline、comparison、insight 四种布局。每页只能有一个 primary_claim；页面之间形成清晰的“主张—方法—双输出—质量闭环”或同等叙事弧。`;
  const sourceDescription = paperMode
    ? `输入来源：${sourcePath}（已提取全文，共 ${pageCount || "未知"} 页）。必须基于全文中的真实章节、方法、实验和数字，不得把输入压缩成泛化的模板文案。`
    : `输入来源：${sourcePath}。`;
  return `你是本地 Codex PPT MVP 的内容与结构规划器。请读取并遵守当前工作区的 SKILL.md；它是结构审查规则，不是科学论文版式模板。请把其中适用于通用业务演示的原则应用到规划中：唯一 key message、明确 reading order、层级与分组、连接线语义、控制文字密度、保留 review flags。

${task}
内容必须简短，适合 16:9 页面，不要生成 HTML、CSS、PPTX 或解释文字。

输出要求：最终回复必须是严格 JSON，符合 schemas/codex-plan.schema.json。每个 slide.content 必须同时包含 eyebrow、title、subtitle、note、kicker、steps、result、columns、takeaway 这 9 个字段；当前布局不使用的字段输出 null（数组字段输出 []）。每个 slide 还必须输出 role、action_title、evidence_refs、asset_candidates、visual_intent、speaker_note；没有确定的证据引用时输出空数组，不得编造页码。
- title：使用 eyebrow、title、subtitle、note({label,value})，其余字段为 null 或 []；
- pipeline：使用 kicker、steps(2–4 项，每项含 title,text,metric,tone)、result({label,value})，其余字段为 null 或 []；
- comparison：使用 columns(2 项，每项含 label,headline,points,tone)、takeaway({label,value})，其余字段为 null 或 []。

${sourceDescription}
当前工作区路径：${process.cwd()}

以下是由解析器生成的证据索引摘要。它只用于定位页码、图片和章节；论文全文仍然是上面的主要输入：
---
${evidenceContext}
---

以下是从 SKILL.md 提取的相关结构规则：
---
${skillGuidance}
---

用户输入全文：
---
${sourceText}
---`;
}

function buildReviewPrompt({ spec, report, skillGuidance }) {
  return `你是本地 Codex PPT MVP 的结构审查器。请读取当前工作区 SKILL.md，并使用其中的 review checklist 审查下面的 deck.spec.json 和 QA report。只审查通用演示结构：唯一主张、阅读路径、层级、分组、连接线语义、文字密度、可访问性和可修订性。不要修改文件，不要输出 Markdown，只输出符合 schemas/codex-review.schema.json 的严格 JSON。

如果没有阻断问题，status 为 pass，changes 为空；如果需要修订，status 为 revise，并给出可执行的 slide_id、element_id、issue_id、action 和 priority。element_id 不适用时必须输出 null。

SKILL.md 相关规则：
---
${skillGuidance}
---

deck.spec.json：
---
${JSON.stringify(spec, null, 2)}
---

QA report：
---
${JSON.stringify(report, null, 2)}
---`;
}

function buildStoryboardPrompt({ sourceText, skillGuidance, paperMode, sourcePath, pageCount, evidenceContext, requestedTheme = "auto" }) {
  const slideCount = paperMode ? "8-10" : "3-6";
  return `You are the storyboard architect for a local-first PPT generator.
Create a ${slideCount}-slide storyboard from the source below. This is stage 1 only: define the communication job, action title, one primary claim, evidence references, table references, asset candidates, and visual intent for every slide. Do not write slide body copy yet.

Hard rules:
- Use the full source text, not a short summary.
- For a paper, cover problem, gap, contribution, method, experiment setup, main result, analysis, and limitation/conclusion.
- Each slide has exactly one primary_claim and a viewer-facing action_title.
- Use comparison for parallel mechanisms/results, pipeline only for temporal or causal sequences, insight for interpretation/boundary.
- Use source_table or data_chart when the evidence index has structured tables. Use source_figure when a figure or page snapshot is the best evidence.
- Evidence refs must use IDs present in the evidence index. Never invent page numbers or asset IDs.
- Apply the Presentation skill's narrative rules: define the audience outcome, choose a cumulative narrative arc, give every slide one job and one primary claim, turn evidence into meaning, and close the opening question deliberately.
- Decide the deck-level visual style. If the requested theme is explicit, preserve it. Otherwise choose exactly one style_family from the theme catalog below based on audience, topic, and scene, and explain the choice in visual.style_reason and visual.style_context.
- Choose a layout_system and density_profile that match the story. Use the Codex Grid principles as a composition reference: vary silhouettes, preserve whitespace and typography hierarchy, and do not repeat a card grid on every slide.
- Return strict JSON matching schemas/codex-storyboard.schema.json.

Source: ${sourcePath}; pages: ${pageCount}

Evidence index:
---
${evidenceContext}
---

Requested theme: ${requestedTheme}. Theme catalog:
---
${JSON.stringify(themeDecisionContext(), null, 2)}
---

Relevant presentation guidance from SKILL.md:
---
${skillGuidance}
---

Full source text:
---
${sourceText}
---`;
}

function pagesForRefs(refs = []) {
  return [...new Set((refs || []).map((ref) => Number(String(ref).match(/(?:page|p)(\d+)/i)?.[1] || 0)).filter(Boolean))];
}

function buildSlidePrompt({ slide, sourceText, evidenceIndex, skillGuidance, visual = {}, themeReferencePath = "" }) {
  const pages = pagesForRefs([...(slide.evidence_refs || []), ...(slide.table_refs || []), ...(slide.asset_candidates || [])]);
  const pageRecords = (evidenceIndex.pages || []).filter((page) => !pages.length || pages.includes(Number(page.page)));
  const tables = (evidenceIndex.tables || []).filter((table) => (slide.table_refs || []).includes(table.id) || pages.includes(Number(table.source_page))).slice(0, 4);
  const assets = (evidenceIndex.assets || []).filter((asset) => (slide.asset_candidates || []).includes(asset.id) || pages.includes(Number(asset.source_page))).slice(0, 8);
  return `You are the single-slide content and visual composer in a two-stage PPT pipeline.
Generate only the slide described below. Do not redesign the whole deck and do not emit HTML, CSS, PPTX, or commentary. Return strict JSON matching schemas/codex-slide.schema.json.

Storyboard contract:
${JSON.stringify(slide, null, 2)}

Slide-specific source pages:
${pageRecords.map((page) => `PAGE ${page.page}: ${page.text}`).join("\n\n") || "No page was explicitly referenced; use the storyboard claim and the full source."}

Structured tables available to this slide:
${JSON.stringify(tables, null, 2)}

Candidate images/page snapshots:
${JSON.stringify(assets, null, 2)}

Full source fallback:
${sourceText.slice(0, 18000)}

Composition rules:
- One viewer-facing action title, one primary claim, and a short speaker note.
- Keep copy concise: title one line where possible, body as 2-4 short points, no paragraph dumping.
- Match layout semantics. For source_table/data_chart, the renderer will consume table_refs; do not replace the table with generic bullets.
- Turn each evidence item into meaning: label what the audience should notice, not just what exists.
- Use the supplied evidence IDs only.
- The deck has a locked visual contract. Preserve the selected style family, mood, composition language, image treatment, table treatment, density, and typography hierarchy on this slide.
- Reference image: ${themeReferencePath || visual.style_reference || "not available"}. Treat it as a visual contract, not as a source of factual content.
- Keep the slide silhouette varied across the deck while remaining inside the same theme system; do not turn every slide into the same two-column card grid.

Relevant SKILL.md guidance:
${skillGuidance}

Selected visual contract:
${JSON.stringify(visual, null, 2)}`;
}

function assertStoryboardShape(storyboard, { paperMode }) {
  if (!storyboard?.deck || !storyboard?.narrative || !storyboard?.plan?.slides?.length) throw new Error("Storyboard is missing deck, narrative, or slides.");
  const min = paperMode ? 8 : 3;
  if (storyboard.plan.slides.length < min || storyboard.plan.slides.length > 10) throw new Error(`Storyboard slide count must be ${min}-10.`);
  return storyboard;
}

function assertSingleSlideShape(slide, storyboardSlide) {
  if (!slide?.content?.title) throw new Error(`Single-slide output ${storyboardSlide.id} is missing content.title.`);
  if (slide.id !== storyboardSlide.id) throw new Error(`Single-slide output ID mismatch: expected ${storyboardSlide.id}, got ${slide.id}.`);
  if (slide.layout !== storyboardSlide.layout) throw new Error(`Single-slide output layout mismatch for ${slide.id}.`);
  return slide;
}

async function runCodexJson({ cwd, prompt, schemaPath, outputDir, outputName }) {
  await ensureDir(outputDir);
  const promptPath = path.join(outputDir, `${outputName}-prompt.txt`);
  const rawPath = path.join(outputDir, `${outputName}-raw.txt`);
  const resultPath = path.join(outputDir, `${outputName}.json`);
  await writeText(promptPath, prompt);
  await fs.rm(resultPath, { force: true });
  const invocation = await codexInvocation(cwd);
  const result = await runProcess(invocation.command, [...invocation.prefix,
    "exec",
    "-c", "service_tier=\"fast\"",
    "-c", `model_reasoning_effort=\"${codexReasoningEffort()}\"`,
    "-m", codexModel(),
    "--sandbox", "read-only",
    "--ephemeral",
    "--output-schema", schemaPath,
    "--output-last-message", resultPath,
    "--cd", cwd,
    "-",
  ], { cwd, input: prompt, resultPath, shell: invocation.command !== process.execPath });
  await writeText(rawPath, `${result.stdout}\n\n[stderr]\n${result.stderr}`);
  if (result.code !== 0) {
    if (/invalid_grant|reauthorization required|OAuth authorization required|refresh token/i.test(result.stderr)) {
      throw new Error("本地 Codex 登录状态已过期，请先在终端执行 `codex login` 完成重新授权，然后再运行本项目的 local-codex planner。");
    }
    throw new Error(`本地 Codex 执行失败，退出码 ${result.code}。\n${result.stderr.slice(-2000)}`);
  }
  const rawMessage = await readText(resultPath);
  return { resultPath, value: parseJsonMessage(rawMessage, outputName) };
}

export async function planWithLocalCodex({ inputPath, workspace, outDir, paperMode = false, themeId = "auto" }) {
  const isPdf = path.extname(inputPath).toLowerCase() === ".pdf";
  const effectivePaperMode = paperMode || isPdf;
  const source = isPdf
    ? await extractPdfText(inputPath, outDir)
    : { text: await readText(inputPath), page_count: 1, pages: [{ page: 1, text: await readText(inputPath) }], assets: [], parser: "markdown" };
  const sourceText = source.text;
  const evidenceIndex = buildEvidenceIndex({ inputPath, inputType: isPdf ? "pdf" : "markdown", extraction: source });
  const skillGuidance = await combinedSkillGuidance(workspace);
  const storyboardSchemaPath = path.join(workspace, "schemas", "codex-storyboard.schema.json");
  const slideSchemaPath = path.join(workspace, "schemas", "codex-slide.schema.json");
  await writeText(path.join(outDir, "codex", "source-extracted.txt"), sourceText);
  await writeJson(path.join(outDir, "codex", "source-manifest.json"), {
    input: path.resolve(inputPath),
    type: isPdf ? "pdf" : "markdown",
    page_count: source.page_count,
    characters: [...sourceText].length,
    paper_mode: effectivePaperMode,
    parser: evidenceIndex.parser,
    asset_count: evidenceIndex.assets.length,
  });
  await writeEvidenceIndex(evidenceIndex, path.join(outDir, "codex", "evidence-index.json"));
  const evidenceContext = evidencePromptContext(evidenceIndex);
  const { value: storyboard, resultPath } = await runCodexJson({
    cwd: workspace,
    prompt: buildStoryboardPrompt({ sourceText, skillGuidance, paperMode: effectivePaperMode, sourcePath: path.resolve(inputPath), pageCount: source.page_count, evidenceContext, requestedTheme: themeId }),
    schemaPath: storyboardSchemaPath,
    outputDir: path.join(outDir, "codex"),
    outputName: "codex-storyboard",
  });
  const normalizedStoryboard = normalizePlan(storyboard, { paperMode: effectivePaperMode, evidenceIndex });
  assertStoryboardShape(normalizedStoryboard, { paperMode: effectivePaperMode });
  const themeReference = await materializeThemeReference({ plan: normalizedStoryboard, evidenceIndex, outDir, themeId });
  const styledStoryboard = {
    ...normalizedStoryboard,
    visual: {
      ...(normalizedStoryboard.visual || {}),
      ...themeReference.visual,
    },
  };
  await writeText(path.join(outDir, "codex", "skill-guidance.txt"), skillGuidance);
  await writeJson(path.join(outDir, "codex", "storyboard.json"), styledStoryboard);
  const slideOutputs = [];
  for (const [index, storyboardSlide] of styledStoryboard.plan.slides.entries()) {
    const slideId = `slide-${String(index + 1).padStart(3, "0")}`;
    const slideDir = path.join(outDir, "codex", "slides", slideId);
    const slideResult = await runCodexJson({
      cwd: workspace,
      prompt: buildSlidePrompt({ slide: storyboardSlide, sourceText, evidenceIndex, skillGuidance, visual: styledStoryboard.visual, themeReferencePath: themeReference.imagePath }),
      schemaPath: slideSchemaPath,
      outputDir: slideDir,
      outputName: slideId,
    });
    const composedSlide = assertSingleSlideShape({ ...storyboardSlide, ...slideResult.value }, storyboardSlide);
    slideOutputs.push(composedSlide);
    await writeJson(path.join(slideDir, `${slideId}.plan.json`), composedSlide);
  }
  const composedPlan = normalizePlan({ ...styledStoryboard, plan: { ...styledStoryboard.plan, slides: slideOutputs } }, { paperMode: effectivePaperMode, evidenceIndex });
  return { plan: assertContentPlan(assertPlanShape(composedPlan, { minSlides: effectivePaperMode ? 8 : 3, maxSlides: 10 }), { paperMode: effectivePaperMode }), resultPath, evidenceIndex, storyboard: styledStoryboard, themeReference };
}

export async function reviewWithLocalCodex({ specPath, reportPath, workspace, outDir }) {
  const spec = await readJson(specPath);
  const report = await readJson(reportPath);
  const skillGuidance = await combinedSkillGuidance(workspace);
  const schemaPath = path.join(workspace, "schemas", "codex-review.schema.json");
  const { value, resultPath } = await runCodexJson({
    cwd: workspace,
    prompt: buildReviewPrompt({ spec, report, skillGuidance }),
    schemaPath,
    outputDir: path.join(outDir, "codex"),
    outputName: "codex-review",
  });
  await writeJson(path.join(outDir, "codex", "review.json"), value);
  return { review: value, resultPath };
}
