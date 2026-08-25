import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir, readJson, readText, writeJson, writeText } from "./utils.mjs";
import { extractPdfDocument } from "./document-parser.mjs";
import { buildEvidenceIndex, evidencePromptContext, writeEvidenceIndex } from "./evidence-index.mjs";
import { assertContentPlan, COMPOSITION_IDS, normalizePlan } from "./content-planner.mjs";
import { themeDecisionContext } from "./theme-presets.mjs";
import { materializeThemeReference } from "./theme-reference.mjs";
import { LAYOUT_FAMILIES } from "./visual-plan.mjs";

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
    extractSection(skillText, "# Part F. Final Compact Operational Summary", "# Part G."),
    extractSection(skillText, "# Part G. Presentation Narrative and Template Reference Layer")
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
  let presentationGuidance = "";
  if (presentationPath) {
    const presentationSkill = extractPresentationGuidance(await readText(presentationPath));
    const styleGuidelines = await readText(path.join(path.dirname(presentationPath), "style_guidelines.md"));
    presentationGuidance = `${presentationSkill}\n\n--- STYLE GUIDELINES ---\n${styleGuidelines}`;
  }
  let templateCatalog = "";
  try { templateCatalog = await readText(path.join(workspace, "skill-references", "presentation-layout-catalog.json")); } catch { /* optional project reference */ }
  return [
    projectSkill,
    presentationGuidance ? `=== PRESENTATION SKILL ===\n${presentationGuidance}` : "",
    templateCatalog ? `=== FLEXIBLE TEMPLATE CATALOG ===\n${templateCatalog}` : "",
  ].filter(Boolean).join("\n\n").slice(0, 52000);
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
  if (process.env.CODEX_CLI_PATH) {
    return { command: process.env.CODEX_CLI_PATH, prefix: [], shell: process.env.CODEX_CLI_PATH.toLowerCase().endsWith(".cmd") };
  }
  const localScript = path.join(cwd, "node_modules", "@openai", "codex", "bin", "codex.js");
  try {
    await fs.access(localScript);
    return { command: process.execPath, prefix: [localScript], shell: false };
  } catch {
    const command = codexCommand();
    return { command, prefix: [], shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd") };
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
  if (!plan.deck.communication_job || !plan.deck.audience_profile?.desired_outcome) throw new Error("Codex 规划缺少 communication_job 或 audience_profile");
  if (!plan.narrative.opening_question || !plan.narrative.closing_answer || !plan.narrative.priority_map) throw new Error("Codex 规划缺少开场问题、收束答案或内容优先级");
  const ids = new Set();
  for (const slide of plan.plan.slides) {
    if (!slide.id || ids.has(slide.id)) throw new Error(`Codex 规划存在重复页面 ID: ${slide.id}`);
    ids.add(slide.id);
    if (!LAYOUT_FAMILIES.includes(slide.layout)) throw new Error(`Codex 规划使用了未实现布局: ${slide.layout}`);
    if (!COMPOSITION_IDS.includes(slide.composition_id)) throw new Error(`Codex 页面 ${slide.id} 使用了未实现构图: ${slide.composition_id}`);
    if (!slide.slide_goal || !slide.primary_claim) throw new Error(`Codex 页面 ${slide.id} 缺少 slide_goal 或 primary_claim`);
    if (!slide.audience_question || !slide.narrative_job || !slide.implication || !slide.transition_out) throw new Error(`Codex 页面 ${slide.id} 的叙事链不完整`);
    if (!["core", "support", "context"].includes(slide.content_priority)) throw new Error(`Codex 页面 ${slide.id} 缺少正确的内容优先级`);
    if (!slide.visual_plan || slide.visual_plan.layout_family !== slide.layout) throw new Error(`Codex 页面 ${slide.id} 的 visual_plan.layout_family 必须与 layout 一致`);
    if (!Number.isInteger(slide.visual_plan.image_budget) || slide.visual_plan.image_budget < 0 || slide.visual_plan.image_budget > 3) throw new Error(`Codex 页面 ${slide.id} 的图片预算必须为 0–3`);
    if ((slide.visual_plan.image_roles || []).length > slide.visual_plan.image_budget) throw new Error(`Codex 页面 ${slide.id} 的图片角色超过图片预算`);
    const content = slide.content || {};
    if (!content.title) throw new Error(`Codex 页面 ${slide.id} 缺少 content.title`);
    if (!slide.speaker_notes?.talk_track || slide.speaker_notes.talk_track.length < 80) throw new Error(`Codex 页面 ${slide.id} 的逐页演讲稿不足 80 字`);
    if (slide.content_priority === "core" && !(slide.evidence || []).length && !["method_overview", "method_detail"].includes(slide.role)) throw new Error(`Codex 核心页面 ${slide.id} 缺少证据`);
    if (slide.composition_id === "causal-flow" && (!Array.isArray(content.steps) || content.steps.length < 2)) throw new Error(`Codex 因果流程页 ${slide.id} 缺少步骤`);
    if (slide.composition_id === "argument-pair" && (!Array.isArray(content.columns) || content.columns.length < 2)) throw new Error(`Codex 论证对照页 ${slide.id} 缺少两组论点`);
    if (slide.composition_id === "metric-triad" && (!Array.isArray(content.metrics) || content.metrics.length < 2)) throw new Error(`Codex 指标页 ${slide.id} 缺少核心指标`);
  }
  return plan;
}

function buildPlanPrompt({ sourceText, skillGuidance, paperMode, sourcePath, pageCount, evidenceContext }) {
  const task = paperMode
    ? `任务：这是论文模式。根据下面的 PDF 全文，生成一个 8–10 页的中文论文汇报大纲，推荐 9 页。不要只做摘要，要覆盖论文的研究背景/问题、方法总览、关键算法或训练流程、实验设置、主结果、数据效率、泛化或 sim-to-real、关键分析/失败模式、局限与结论。每页只能有一个 primary_claim，页面之间形成“问题—方法—证据—分析—边界”的累积叙事。布局语义必须准确：只有真正按时间或因果顺序发生的步骤才使用 pipeline；并行的机制、独立的实验结果、基线对照和多维分析使用 comparison；分析、失败模式和限制优先使用 insight。特别是 Dynamic Sampling、Clip-Higher、Higher Temperature 这类并行增强机制，必须放在同一张 comparison 页中，不要画成串行 pipeline。`
    : `任务：根据下面的 Markdown，生成一个 3–5 页、推荐 4 页的中文演示规划。每页只能有一个 primary_claim；页面之间形成清晰的“主张—方法—双输出—质量闭环”或同等叙事弧。`;
  const sourceDescription = paperMode
    ? `输入来源：${sourcePath}（已提取全文，共 ${pageCount || "未知"} 页）。必须基于全文中的真实章节、方法、实验和数字，不得把输入压缩成泛化的模板文案。`
    : `输入来源：${sourcePath}。`;
  return `你是本地 Codex PPT MVP 的内容与结构规划器。请读取并遵守当前工作区的 SKILL.md；它是结构审查规则，不是科学论文版式模板。请把其中适用于通用业务演示的原则应用到规划中：唯一 key message、明确 reading order、层级与分组、连接线语义、控制文字密度、保留 review flags。

${task}
内容必须简短，适合 16:9 页面，不要生成 HTML、CSS、PPTX 或解释文字。

输出要求：最终回复必须是严格 JSON，符合 schemas/codex-plan.schema.json。每个 slide.content 必须同时包含 eyebrow、title、subtitle、note、kicker、steps、result、columns、takeaway 这 9 个字段；当前布局不使用的字段输出 null（数组字段输出 []）。每个 slide 还必须输出 role、action_title、evidence_refs、asset_candidates、visual_intent、visual_plan、speaker_note；没有确定的证据引用时输出空数组，不得编造页码。
- visual_plan 是页面视觉合同：layout_family 必须和 layout 相同；image_budget 为 0–3；image_roles 数量不能超过预算；primary_visual 是候选资产 ID 或 null；data_strategy、background_variant、density 必须明确。数据图表、表格、流程图不计入图片预算。
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

规格解释：layout 是渲染器家族，不等同于页面拓扑；pipeline 家族由 flow_model 使用 canonical 值 linear、branch 或 feedback 声明拓扑。reading_order_groups 表达顺序、并行和反馈阅读组，connector_legend 与每条 connector.data.connector_style 共同定义连接语义。已有这些字段时，应按其声明审查，不要仅凭 layout 名称推断为线性流程。role=source-provenance 且 data.visual_role=source-provenance 的图片是系统追加的小型来源核验缩略图，不参与 visual_plan.image_roles 的 hero/evidence/comparison/context 主视觉合同；它应位于主结论、图表或表格之后的阅读顺序末尾。

单位解释：theme.typography 中的 *_px 是 HTML/CSS 设计 token；PPTX 渲染器会映射到 artifact-tool 的文本尺寸，并由逐页 PNG 与溢出检查验证。不要把 token 名称直接当作 PowerPoint 的实际像素值；正文目标为约 16–18pt 的可读尺度。

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

function buildPlanRevisionPrompt({ plan, review, report, sourceText, evidenceContext, skillGuidance }) {
  return `You are the final editorial repair pass for a presentation that has already been rendered and reviewed.
Return a complete revised plan as strict JSON matching schemas/codex-plan.schema.json. Apply every actionable review item; do not merely describe changes.

Repair rules:
- Preserve the deck's communication job, audience, central takeaway, factual claims, slide IDs, evidence IDs, and overall visual style unless the review explicitly identifies one of them as wrong.
- Keep the same slide count and narrative order unless the review explicitly requires a structural change.
- Fix all high-priority issues, then all medium-priority issues that affect comprehension, fit, or delivery.
- Visible Chinese titles should normally stay within 30 Chinese characters. Move detail into lede, body points, steps, columns, metrics, or speaker notes.
- A title slide must not repeat a long title as subtitle/lede. A conclusion slide must expose the answer, adoption conditions, and boundary as separate editable content units.
- Match content to composition. causal-flow needs 3–5 ordered steps; mechanism-triptych needs exactly three parallel mechanisms; argument-pair needs two meaningful columns; answer-and-boundary needs 2–3 body_points plus an explicit takeaway/boundary.
- No non-title slide may be only a title or slogan. Give it enough visible evidence or explanation to make the claim credible.
- speaker_notes.talk_track must be a natural 120–260 Chinese-character talk track with transition, claim, evidence, meaning/boundary, and next-step bridge.
- Preserve source truth. Use only IDs present in the evidence index; never invent a number, result, quote, page, asset, or table.
- Keep protocol facts and reported outcomes separate. A held-out/OOD evaluation setup is not itself an OOD result. If the source only reports train SSR, every related title, claim, chart label, conclusion, and talk track must explicitly say train SSR and must not imply OOD generalization.
- Set narrative.logic_check booleans to true only after the repaired plan actually passes.

Final review:
---
${JSON.stringify(review, null, 2)}
---

Deterministic QA:
---
${JSON.stringify(report, null, 2)}
---

Current plan:
---
${JSON.stringify(plan, null, 2)}
---

Evidence index:
---
${evidenceContext}
---

Relevant presentation guidance:
---
${skillGuidance}
---

Source text:
---
${sourceText}
---`;
}

function buildStoryboardPrompt({ sourceText, skillGuidance, paperMode, sourcePath, pageCount, evidenceContext, requestedTheme = "auto" }) {
  const slideCount = paperMode ? "8-10" : "3-6";
  return `You are the senior narrative architect for a local-first presentation generator.
Create a ${slideCount}-slide storyboard from the source below. This is stage 1 only: design the audience, communication job, cumulative narrative, content priority, evidence logic, transitions, and visual composition contract. Do not write slide body copy or speaker notes yet.

Hard rules:
- Use the full source text, not a short summary.
- Infer the audience, prior knowledge, concerns, likely questions, and desired outcome.
- Express the communication job as: "By the end, [audience] should [outcome] because [central takeaway]."
- For a paper, allocate most pages to the authors' actual work and evidence. Background is context, not the presentation.
- Mark each slide core, support, or context. Core contributions and results receive the strongest evidence and most speaking time.
- Each slide has exactly one primary_claim, one audience_question, one narrative_job, one implication, and explicit transition_in / transition_out.
- Use a viewer-facing takeaway title. Never expose planner language, page-production notes, "generated from N pages", or generic topic titles such as "Method" or "Results".
- Make the sequence cumulative: every slide answers a question raised by the prior slide or creates the need for the next.
- Put the opening question in narrative.opening_question and resolve it in narrative.closing_answer. Do not end with a generic thank-you slide.
- Each core slide must cite real evidence from the evidence index, except a method-mechanism slide whose evidence is the described algorithm itself.
- For every evidence object, state what supports the claim and what that evidence means to this audience.
- Separate experiment protocol from outcome evidence. Seeds, hardware, and an OOD evaluation design define the contract; they do not prove OOD performance. Preserve the exact reported split/metric scope (for example train SSR versus OOD/eval SSR) in claims, implications, and the closing answer.
- Use comparison for parallel mechanisms/results, pipeline only for temporal or causal sequences, insight for interpretation/boundary.
- Use source_table or data_chart when the evidence index has structured tables. Use source_figure when a figure or page snapshot is the best evidence.
- Evidence refs must use IDs present in the evidence index. Never invent page numbers or asset IDs.
- Select composition_id from: ${COMPOSITION_IDS.join(", ")}. Treat the catalog as flexible silhouettes, not a role-to-template lookup table. Avoid repeating the same composition three times in a row.
- Decide the deck-level visual style. If the requested theme is explicit, preserve it. Otherwise choose one style_family based on audience, topic, and scene, and explain the choice in visual.style_reason.
- Choose a layout_system and density_profile that match the story. Use the Codex Grid principles as a composition reference: vary silhouettes, preserve whitespace and typography hierarchy, and do not repeat a card grid on every slide.
- For every slide, output visual_plan. Its layout_family must equal layout and be one of: ${LAYOUT_FAMILIES.join(", ")}. Allocate 0–3 meaningful images only; use image_roles (hero, evidence, comparison, context), primary_visual (candidate asset ID or null), data_strategy, background_variant, and density. Native tables, native charts, and diagrams do not use image budget. Never allocate an image merely as decoration.
- Before returning JSON, silently verify: opening resolved, no duplicate slide jobs, every core claim has evidence, background does not dominate, and every transition is logical. Report the verdict in narrative.logic_check.
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

function buildStoryboardRevisionPrompt({ storyboard, sourceText, skillGuidance, paperMode, evidenceContext }) {
  const slideCount = paperMode ? "8–10" : "3–6";
  return `You are the second-pass editorial director for a presentation storyboard.
Do not rubber-stamp the first draft. Stress-test it as if you had to deliver the talk to the stated audience, then return a complete revised storyboard as strict JSON matching schemas/codex-storyboard.schema.json.

Editorial pass:
1. Restate internally what the audience must understand, believe, or decide by the end. Make deck.communication_job and audience_profile specific to this source.
2. Check whether the opening creates a real question and whether the closing answers that exact question with the source-supported conclusion and boundary.
3. Mark the authors' actual work and decisive results as core; demote generic background to context. For a paper, core pages should dominate the ${slideCount}-slide deck.
4. Read every pair of adjacent slides aloud. Each transition must make the next slide necessary, not merely say "next".
5. Remove duplicate jobs and claims. Reorder, merge, or replace weak slides when that improves the argument.
6. Check every core claim against the evidence index. Do not invent IDs, numbers, page references, findings, or causal claims.
6a. Audit metric scope. Never turn a protocol statement such as "128 unseen/OOD seeds were reserved" into a generalization result. If the source reports only train SSR, label it as train SSR throughout and explicitly state that OOD performance remains unshown.
7. Make each action_title an audience-facing takeaway, not a topic heading and not production language.
8. Choose a semantically appropriate composition from ${COMPOSITION_IDS.join(", ")}. Vary silhouettes without changing the visual system. A pipeline must be genuinely ordered; parallel mechanisms belong in a comparison/triptych.
9. Keep visual_plan feasible: 0–3 purposeful images, source figures/tables before decoration, and no image without a role.
10. Set narrative.logic_check booleans to true only if the revised storyboard actually passes. Its rationale must name what you changed or why no change was needed.

First-pass storyboard:
---
${JSON.stringify(storyboard, null, 2)}
---

Evidence index:
---
${evidenceContext}
---

Relevant presentation guidance:
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
  return `You are a senior presentation writer and single-slide visual composer in a two-stage PPT pipeline.
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
- Preserve every storyboard field exactly, including composition_id, content_priority, audience_question, narrative_job, evidence, implication, and transitions.
- Write a one-line takeaway title that the presenter could naturally say aloud. Do not use topic-only titles.
- Visible content must have enough substance to make the claim credible: use a concise lede plus 2–4 body_points, 2–3 metrics, steps, or comparison columns as the composition requires. Do not leave a slide as only a title and slogan.
- Keep visible copy concise and audience-facing; speaker explanation belongs in speaker_notes, not in tiny text on the canvas.
- Write speaker_notes.talk_track as a coherent 120–260 Chinese-character talk track: transition from the previous page, state the claim, explain the evidence, identify the implication or boundary, and lead naturally into the next page. It must not merely repeat the title.
- speaker_notes.delivery_cue should tell the presenter where to pause, point to a visual, contrast two ideas, or emphasize a number.
- speaker_notes.source_refs must contain the evidence/table/page IDs actually used.
- Match layout semantics. For source_table/data_chart, the renderer will consume table_refs; do not replace the table with generic bullets.
- Fill all content fields required by the schema. Use null for unused object/string fields and [] for unused arrays.
- thesis-stage: minimal thesis, subtitle, and one note.
- image-thesis-split: lede, 2–3 body points, and a real evidence image.
- argument-pair: two unequal columns and an explicit takeaway.
- mechanism-triptych: three parallel mechanisms, never a fake sequence.
- causal-flow: 3–5 genuinely ordered steps and an end-state result.
- metric-triad: 2–3 large metrics, each with baseline/unit and meaning.
- chart-with-interpretation-rail: one dominant chart/table plus 2–3 evidence callouts.
- evidence-table: prune to rows/columns needed for the claim and add an interpretation.
- evidence-collage: one dominant image plus at most two supporting images and one synthesis.
- answer-and-boundary: resolve the opening question, give implications, and state the boundary.
- Turn each evidence item into meaning: label what the audience should notice, not just what exists.
- Preserve metric scope exactly. Protocol facts (training/evaluation seeds, hardware, temperature) are not outcome evidence. If only train SSR is supplied, write "train SSR" in visible result copy and speaker notes, and do not imply that OOD/eval generalization has been demonstrated.
- Use the supplied evidence IDs only.
- The deck has a locked visual contract. Preserve the selected style family, mood, composition language, image treatment, table treatment, density, and typography hierarchy on this slide.
- Reference image: ${themeReferencePath || visual.style_reference || "not available"}. Treat it as a visual contract, not as a source of factual content.
- Original style inspiration: ${visual.style_inspiration || "not available"}. When present, inspect it for composition, whitespace, image/table treatment, and hierarchy; never copy its content or use it as factual evidence.
- Keep the slide silhouette varied across the deck while remaining inside the same theme system; do not turn every slide into the same two-column card grid.
- Preserve the storyboard visual_plan exactly: layout_family must equal layout; do not add more images than image_budget; use only its allowed image_roles; primary_visual must be a supplied asset ID or null. Native chart/table/diagram visuals do not count as images.

Relevant SKILL.md guidance:
${skillGuidance}

Selected visual contract:
${JSON.stringify(visual, null, 2)}`;
}

function assertStoryboardShape(storyboard, { paperMode }) {
  if (!storyboard?.deck || !storyboard?.narrative || !storyboard?.plan?.slides?.length) throw new Error("Storyboard is missing deck, narrative, or slides.");
  const min = paperMode ? 8 : 3;
  if (storyboard.plan.slides.length < min || storyboard.plan.slides.length > 10) throw new Error(`Storyboard slide count must be ${min}-10.`);
  if (!storyboard.deck.communication_job || !storyboard.deck.audience_profile?.desired_outcome) throw new Error("Storyboard is missing the communication job or audience profile.");
  if (!storyboard.narrative.opening_question || !storyboard.narrative.closing_answer || !storyboard.narrative.logic_check) throw new Error("Storyboard is missing its opening/closing logic check.");
  if (["opening_resolved", "core_has_evidence", "no_redundant_slides"].some((field) => storyboard.narrative.logic_check[field] !== true)) {
    throw new Error(`Storyboard failed its own logic check: ${storyboard.narrative.logic_check.rationale || "no rationale"}`);
  }
  const claims = new Set();
  const ids = new Set(storyboard.plan.slides.map((slide) => slide.id));
  for (const slide of storyboard.plan.slides) {
    if (!COMPOSITION_IDS.includes(slide.composition_id)) throw new Error(`Storyboard slide ${slide.id} has an unknown composition.`);
    if (!slide.audience_question || !slide.narrative_job || !slide.transition_out) throw new Error(`Storyboard slide ${slide.id} has an incomplete narrative contract.`);
    if (claims.has(slide.primary_claim)) throw new Error(`Storyboard repeats the same primary claim: ${slide.primary_claim}`);
    claims.add(slide.primary_claim);
  }
  const priorityIds = [
    ...(storyboard.narrative.priority_map?.core || []),
    ...(storyboard.narrative.priority_map?.support || []),
    ...(storyboard.narrative.priority_map?.context || []),
  ];
  if (priorityIds.length !== ids.size || new Set(priorityIds).size !== ids.size || priorityIds.some((id) => !ids.has(id))) {
    throw new Error("Storyboard priority map must classify every slide exactly once.");
  }
  return storyboard;
}

function assertSingleSlideShape(slide, storyboardSlide) {
  if (!slide?.content?.title) throw new Error(`Single-slide output ${storyboardSlide.id} is missing content.title.`);
  if (slide.id !== storyboardSlide.id) throw new Error(`Single-slide output ID mismatch: expected ${storyboardSlide.id}, got ${slide.id}.`);
  if (slide.layout !== storyboardSlide.layout) throw new Error(`Single-slide output layout mismatch for ${slide.id}.`);
  if (slide.composition_id !== storyboardSlide.composition_id) throw new Error(`Single-slide output composition mismatch for ${slide.id}.`);
  if (!slide.visual_plan || slide.visual_plan.layout_family !== storyboardSlide.visual_plan?.layout_family) throw new Error(`Single-slide output visual_plan mismatch for ${slide.id}.`);
  if (!slide.speaker_notes?.talk_track || slide.speaker_notes.talk_track.length < 80) throw new Error(`Single-slide output ${slide.id} is missing a usable talk track.`);
  for (const field of ["audience_question", "narrative_job", "primary_claim", "implication", "transition_in", "transition_out"]) {
    if (slide[field] !== storyboardSlide[field]) throw new Error(`Single-slide output ${slide.id} changed locked storyboard field ${field}.`);
  }
  return slide;
}

function composeSlideOutput(storyboardSlide, generatedSlide) {
  const lockedFields = [
    "id", "layout", "composition_id", "role", "content_priority", "action_title",
    "audience_question", "narrative_job", "slide_goal", "primary_claim", "evidence",
    "implication", "transition_in", "transition_out", "evidence_refs", "table_refs",
    "asset_candidates", "visual_intent", "visual_plan",
  ];
  const composed = { ...storyboardSlide, ...generatedSlide };
  for (const field of lockedFields) composed[field] = structuredClone(storyboardSlide[field]);
  return composed;
}

async function runCodexJson({ cwd, prompt, schemaPath, outputDir, outputName }) {
  await ensureDir(outputDir);
  const promptPath = path.join(outputDir, `${outputName}-prompt.txt`);
  const rawPath = path.join(outputDir, `${outputName}-raw.txt`);
  const resultPath = path.join(outputDir, `${outputName}.json`);
  if (process.env.CODEX_REUSE_OUTPUTS !== "false") {
    try {
      const [existingPrompt, existingResult] = await Promise.all([readText(promptPath), readText(resultPath)]);
      if (existingPrompt === prompt) {
        return { resultPath, value: parseJsonMessage(existingResult, outputName), reused: true };
      }
    } catch {
      // Missing or invalid partial output: execute the Codex call below.
    }
  }
  await writeText(promptPath, prompt);
  await fs.rm(resultPath, { force: true });
  const invocation = await codexInvocation(cwd);
  const result = await runProcess(invocation.command, [...invocation.prefix,
    "exec",
    "--ignore-user-config",
    "-c", "service_tier=\"fast\"",
    "-c", `model_reasoning_effort=\"${codexReasoningEffort()}\"`,
    "-m", codexModel(),
    "--sandbox", "read-only",
    "--ephemeral",
    "--output-schema", schemaPath,
    "--output-last-message", resultPath,
    "--cd", cwd,
    "-",
  ], { cwd, input: prompt, resultPath, shell: invocation.shell });
  await writeText(rawPath, `${result.stdout}\n\n[stderr]\n${result.stderr}`);
  if (result.code !== 0) {
    if (/invalid_json_schema/i.test(result.stderr)) {
      const schemaMessage = result.stderr.match(/"message":\s*"([^"]*Invalid schema[^"]*)"/i)?.[1] || result.stderr.slice(-2000);
      throw new Error(`Codex 严格输出 Schema 不兼容：${schemaMessage}`);
    }
    if (/invalid_grant|reauthorization required|OAuth authorization required|refresh token/i.test(result.stderr)) {
      throw new Error("本地 Codex 登录状态已过期，请先在终端执行 `codex login` 完成重新授权，然后再运行本项目的 local-codex planner。");
    }
    throw new Error(`本地 Codex 执行失败，退出码 ${result.code}。\n${result.stderr.slice(-2000)}`);
  }
  const rawMessage = await readText(resultPath);
  return { resultPath, value: parseJsonMessage(rawMessage, outputName) };
}

export async function planWithLocalCodex({ inputPath, workspace, outDir, paperMode = false, themeId = "auto", documentParser = {} }) {
  const isPdf = path.extname(inputPath).toLowerCase() === ".pdf";
  const effectivePaperMode = paperMode || isPdf;
  const source = isPdf
    ? await extractPdfDocument(inputPath, outDir, { ...documentParser, preferMinerU: effectivePaperMode })
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
    parser_details: evidenceIndex.parser_details,
    asset_count: evidenceIndex.assets.length,
    table_count: evidenceIndex.tables.length,
    formula_count: evidenceIndex.formulas.length,
  });
  await writeEvidenceIndex(evidenceIndex, path.join(outDir, "codex", "evidence-index.json"));
  const evidenceContext = evidencePromptContext(evidenceIndex);
  const firstPass = await runCodexJson({
    cwd: workspace,
    prompt: buildStoryboardPrompt({ sourceText, skillGuidance, paperMode: effectivePaperMode, sourcePath: path.resolve(inputPath), pageCount: source.page_count, evidenceContext, requestedTheme: themeId }),
    schemaPath: storyboardSchemaPath,
    outputDir: path.join(outDir, "codex"),
    outputName: "codex-storyboard",
  });
  const firstStoryboard = normalizePlan(firstPass.value, { paperMode: effectivePaperMode, evidenceIndex });
  assertStoryboardShape(firstStoryboard, { paperMode: effectivePaperMode });
  let editorialStoryboard = firstStoryboard;
  let resultPath = firstPass.resultPath;
  if (process.env.CODEX_STORYBOARD_REVIEW !== "false") {
    const secondPass = await runCodexJson({
      cwd: workspace,
      prompt: buildStoryboardRevisionPrompt({ storyboard: firstStoryboard, sourceText, skillGuidance, paperMode: effectivePaperMode, evidenceContext }),
      schemaPath: storyboardSchemaPath,
      outputDir: path.join(outDir, "codex"),
      outputName: "codex-storyboard-revised",
    });
    editorialStoryboard = normalizePlan(secondPass.value, { paperMode: effectivePaperMode, evidenceIndex });
    assertStoryboardShape(editorialStoryboard, { paperMode: effectivePaperMode });
    resultPath = secondPass.resultPath;
    await writeJson(path.join(outDir, "codex", "storyboard-editorial-audit.json"), {
      enabled: true,
      first_pass: path.relative(outDir, firstPass.resultPath).replaceAll("\\", "/"),
      revised_pass: path.relative(outDir, secondPass.resultPath).replaceAll("\\", "/"),
      slide_count_before: firstStoryboard.plan.slides.length,
      slide_count_after: editorialStoryboard.plan.slides.length,
      key_message_before: firstStoryboard.narrative.key_message,
      key_message_after: editorialStoryboard.narrative.key_message,
      logic_check: editorialStoryboard.narrative.logic_check,
    });
  }
  const themeReference = await materializeThemeReference({ plan: editorialStoryboard, evidenceIndex, outDir, themeId, styleAssetRoot: workspace });
  const styledStoryboard = {
    ...editorialStoryboard,
    visual: {
      ...(editorialStoryboard.visual || {}),
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
    const composedSlide = assertSingleSlideShape(composeSlideOutput(storyboardSlide, slideResult.value), storyboardSlide);
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

export async function revisePlanWithLocalCodex({ plan, review, reportPath, workspace, outDir, evidenceIndex = null, paperMode = false }) {
  const report = await readJson(reportPath);
  const skillGuidance = await combinedSkillGuidance(workspace);
  let sourceText = "";
  try { sourceText = await readText(path.join(outDir, "codex", "source-extracted.txt")); } catch { /* source may be an in-memory Markdown plan */ }
  let resolvedEvidenceIndex = evidenceIndex;
  if (!resolvedEvidenceIndex) {
    try { resolvedEvidenceIndex = await readJson(path.join(outDir, "codex", "evidence-index.json")); } catch {
      resolvedEvidenceIndex = { version: "0.3.0", parser: "none", pages: [], sections: [], claims: [], assets: [], tables: [], formulas: [], diagnostics: {} };
    }
  }
  const schemaPath = path.join(workspace, "schemas", "codex-plan.schema.json");
  const result = await runCodexJson({
    cwd: workspace,
    prompt: buildPlanRevisionPrompt({
      plan,
      review,
      report,
      sourceText,
      evidenceContext: evidencePromptContext(resolvedEvidenceIndex || {}),
      skillGuidance,
    }),
    schemaPath,
    outputDir: path.join(outDir, "codex"),
    outputName: "codex-auto-revision",
  });
  const revised = normalizePlan(result.value, { paperMode, evidenceIndex: resolvedEvidenceIndex });
  const styled = {
    ...revised,
    visual: {
      ...(plan.visual || {}),
      ...(revised.visual || {}),
      style_reference: plan.visual?.style_reference || revised.visual?.style_reference || null,
      style_reference_html: plan.visual?.style_reference_html,
      style_inspiration: plan.visual?.style_inspiration,
      style_lock: plan.visual?.style_lock,
      style_system: plan.visual?.style_system,
    },
  };
  const checked = assertContentPlan(assertPlanShape(styled, { minSlides: paperMode ? 8 : 3, maxSlides: 10 }), { paperMode });
  await writeJson(path.join(outDir, "codex", "auto-revised-plan.json"), checked);
  return { plan: checked, resultPath: result.resultPath };
}
