import path from "node:path";
import { planFromMarkdown } from "./planner.mjs";
import { writeSpec } from "./schema-writer.mjs";
import { renderHtml } from "./render-html.mjs";
import { runQa } from "./qa.mjs";
import { assertValidSpec, validateSpecFile } from "./validate-spec.mjs";
import { planWithLocalCodex, reviewWithLocalCodex, revisePlanWithLocalCodex } from "./codex-bridge.mjs";
import { ensureDir, parseArgs, readJson, writeJson, writeText } from "./utils.mjs";
import { extractPdfDocument } from "./document-parser.mjs";
import { buildEvidenceIndex, writeEvidenceIndex } from "./evidence-index.mjs";
import { normalizePlan, assertContentPlan } from "./content-planner.mjs";
import { planFromText } from "./planner.mjs";
import { materializeSlidePipeline } from "./slide-pipeline.mjs";
import { materializeThemeReference } from "./theme-reference.mjs";

function help() {
  console.log(`Codex PPT dual-render MVP

Commands:
  plan --input <markdown|pdf> --planner <local-codex|deterministic> [--paper] [--parser <auto|pymupdf|mineru>]
  generate --input <markdown|pdf> --out <dir> --format <html|pptx|both> [--paper] [--parser <auto|pymupdf|mineru>] [--mineru-backend <pipeline|hybrid-engine>] [--mineru-effort <medium|high>] [--theme <auto|theme-id>] [--slide-previews false]
  themes --out <dir>
  validate --spec <deck.spec.json>
  render --spec <deck.spec.json> --format <html|pptx|both>
  qa --input <output-dir> --format <html|pptx|both>
  review --input <output-dir>`);
}

async function renderOutputs(spec, outDir, format) {
  const results = {};
  if (["html", "both"].includes(format)) results.html = await renderHtml({ spec, outPath: path.join(outDir, "presentation.html") });
  if (["pptx", "both"].includes(format)) {
    const { renderPptx } = await import("./render-pptx.mjs");
    results.pptx = await renderPptx({ spec, outPath: path.join(outDir, "presentation.pptx"), previewDir: path.join(outDir, "preview") });
  }
  return results;
}

function isPdfPath(inputPath) {
  return path.extname(inputPath).toLowerCase() === ".pdf";
}

function parserOptions(args, paperMode) {
  return {
    parser: args.parser || "auto",
    mineruBackend: args["mineru-backend"] || "hybrid-engine",
    mineruEffort: args["mineru-effort"] || "medium",
    preferMinerU: paperMode,
  };
}

async function createPlan({ planner, inputPath, workspace, outDir, paperMode, themeId = "auto", documentParser = {} }) {
  if (planner === "local-codex") {
    const result = await planWithLocalCodex({ inputPath, workspace, outDir, paperMode, themeId, documentParser });
    return result;
  }
  if (planner === "deterministic") {
    if (isPdfPath(inputPath)) {
      const source = await extractPdfDocument(inputPath, outDir, documentParser);
      const evidenceIndex = buildEvidenceIndex({ inputPath, inputType: "pdf", extraction: source });
      await writeText(path.join(outDir, "codex", "source-extracted.txt"), source.text);
      await writeJson(path.join(outDir, "codex", "source-manifest.json"), {
        input: path.resolve(inputPath),
        type: "pdf",
        page_count: source.page_count,
        characters: [...String(source.text || "")].length,
        paper_mode: true,
        parser: evidenceIndex.parser,
        parser_details: evidenceIndex.parser_details,
        asset_count: evidenceIndex.assets.length,
        table_count: evidenceIndex.tables.length,
        formula_count: evidenceIndex.formulas.length,
      });
      await writeEvidenceIndex(evidenceIndex, path.join(outDir, "codex", "evidence-index.json"));
      const firstPage = String(source.pages?.[0]?.text || "").split(/\r?\n/).map((line) => line.trim()).find(Boolean) || path.basename(inputPath, path.extname(inputPath));
      const markdown = `# ${firstPage}\n\n> 从研究问题、方法机制到实验证据与适用边界\n\n## Paper evidence\n- ${source.text.replace(/\s+/g, " ").slice(0, 10000)}`;
      const plan = normalizePlan(planFromText(markdown), { paperMode: true, evidenceIndex });
      return { plan: assertContentPlan(plan, { paperMode: true }), evidenceIndex };
    }
    const plan = normalizePlan(await planFromMarkdown(inputPath), { paperMode: false, evidenceIndex: null });
    return { plan: assertContentPlan(plan, { paperMode: false }), evidenceIndex: null };
  }
  throw new Error(`未知 planner: ${planner}`);
}

async function ensureThemeReference(created, { outDir, themeId, workspace }) {
  if (created.themeReference) return created;
  const themeReference = await materializeThemeReference({ plan: created.plan, evidenceIndex: created.evidenceIndex || null, outDir, themeId, styleAssetRoot: workspace });
  return {
    ...created,
    themeReference,
    plan: {
      ...created.plan,
      visual: {
        ...(created.plan.visual || {}),
        ...themeReference.visual,
      },
    },
  };
}

async function main(argv) {
  const args = parseArgs(argv);
  const command = args._?.[0];
  if (!command || args.help) return help();
  const format = args.format || "both";
  const planner = args.planner || "local-codex";
  const workspace = path.resolve(String(args.workspace || process.cwd()));
  if (!new Set(["html", "pptx", "both"]).has(format)) throw new Error(`不支持的格式: ${format}`);

  if (command === "plan") {
    const inputPath = path.resolve(String(args.input));
    const paperMode = args.paper === true || isPdfPath(inputPath);
    const outDir = path.resolve(String(args.out || "dist/codex-plan"));
    const created = await createPlan({ planner, inputPath, workspace, paperMode, outDir, themeId: args.theme || "auto", documentParser: parserOptions(args, paperMode) });
    const themed = await ensureThemeReference(created, { outDir, themeId: args.theme || "auto", workspace });
    console.log(JSON.stringify(themed.plan, null, 2));
    return;
  }
  if (command === "themes") {
    const { writeTemplateGallery } = await import("./template-gallery.mjs");
    const result = await writeTemplateGallery(path.resolve(String(args.out || "dist/theme-gallery")));
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (command === "validate") {
    const result = await validateSpecFile(path.resolve(String(args.spec)));
    console.log(JSON.stringify({ valid: result.valid, errors: result.errors, warnings: result.warnings }, null, 2));
    if (!result.valid) process.exitCode = 2;
    return;
  }
  if (command === "generate") {
    const input = path.resolve(String(args.input));
    const outDir = path.resolve(String(args.out || "dist/demo"));
    const paperMode = args.paper === true || isPdfPath(input);
    await ensureDir(outDir);
    const created = await createPlan({ planner, inputPath: input, workspace, paperMode, outDir, themeId: args.theme || "auto", documentParser: parserOptions(args, paperMode) });
    const themed = await ensureThemeReference(created, { outDir, themeId: args.theme || "auto", workspace });
    let plan = themed.plan;
    await materializeSlidePipeline({ plan, evidenceIndex: created.evidenceIndex || null, outDir, themeId: args.theme || "auto", render: args["slide-previews"] !== false });
    let spec = await writeSpec(plan, path.join(outDir, "deck.spec.json"), { themeId: args.theme || "auto" });
    let results = await renderOutputs(spec, outDir, format);
    let report = await runQa({ specPath: path.join(outDir, "deck.spec.json"), inputDir: outDir, requestedFormat: format });
    let codexReview = null;
    let autoRevision = null;
    if (planner === "local-codex" || args.review === true) {
      codexReview = await reviewWithLocalCodex({ specPath: path.join(outDir, "deck.spec.json"), reportPath: path.join(outDir, "qa", "report.json"), workspace, outDir });
      if (planner === "local-codex" && codexReview.review?.status === "revise" && args["auto-revise"] !== false) {
        await writeJson(path.join(outDir, "codex", "review-before-auto-revision.json"), codexReview.review);
        autoRevision = await revisePlanWithLocalCodex({
          plan,
          review: codexReview.review,
          reportPath: path.join(outDir, "qa", "report.json"),
          workspace,
          outDir,
          evidenceIndex: created.evidenceIndex || null,
          paperMode,
        });
        plan = autoRevision.plan;
        await materializeSlidePipeline({ plan, evidenceIndex: created.evidenceIndex || null, outDir, themeId: args.theme || "auto", render: args["slide-previews"] !== false });
        spec = await writeSpec(plan, path.join(outDir, "deck.spec.json"), { themeId: args.theme || "auto" });
        results = await renderOutputs(spec, outDir, format);
        report = await runQa({ specPath: path.join(outDir, "deck.spec.json"), inputDir: outDir, requestedFormat: format });
        codexReview = await reviewWithLocalCodex({ specPath: path.join(outDir, "deck.spec.json"), reportPath: path.join(outDir, "qa", "report.json"), workspace, outDir });
        await writeJson(path.join(outDir, "codex", "review-after-auto-revision.json"), codexReview.review);
      }
    }
    console.log(JSON.stringify({ output: outDir, planner, results, qa: report.summary, auto_revision: autoRevision ? { plan: path.join(outDir, "codex", "auto-revised-plan.json"), result: autoRevision.resultPath } : null, codex_review: codexReview?.review || null }, null, 2));
    if (report.status === "fail") process.exitCode = 3;
    return;
  }
  if (command === "render") {
    const specPath = path.resolve(String(args.spec));
    const spec = await readJson(specPath);
    assertValidSpec(spec);
    const outDir = path.dirname(specPath);
    const results = await renderOutputs(spec, outDir, format);
    const report = await runQa({ specPath, inputDir: outDir, requestedFormat: format });
    console.log(JSON.stringify({ output: outDir, results, qa: report.summary }, null, 2));
    if (report.status === "fail") process.exitCode = 3;
    return;
  }
  if (command === "qa") {
    const inputDir = path.resolve(String(args.input || "dist/demo"));
    const report = await runQa({ specPath: path.join(inputDir, "deck.spec.json"), inputDir, requestedFormat: format });
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "fail") process.exitCode = 3;
    return;
  }
  if (command === "review") {
    const inputDir = path.resolve(String(args.input || "dist/demo"));
    const result = await reviewWithLocalCodex({ specPath: path.join(inputDir, "deck.spec.json"), reportPath: path.join(inputDir, "qa", "report.json"), workspace, outDir: inputDir });
    console.log(JSON.stringify(result.review, null, 2));
    return;
  }
  throw new Error(`未知命令: ${command}`);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
