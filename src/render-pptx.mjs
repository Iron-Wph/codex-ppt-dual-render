import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";
import { ensureDir, writeText } from "./utils.mjs";

const SIZE = { width: 1280, height: 720 };

function addText(slide, name, value, position, style = {}) {
  const shape = slide.shapes.add({ geometry: "textbox", name, position, fill: "none", line: { style: "solid", fill: "none", width: 0 } });
  shape.text = String(value ?? "");
  shape.text.style = {
    fontSize: style.fontSize ?? 18,
    bold: Boolean(style.bold),
    color: style.color ?? "#F1F3E9",
    alignment: style.alignment ?? "left",
    verticalAlignment: style.verticalAlignment ?? "top",
    lineSpacing: style.lineSpacing ?? 1.12,
  };
  return shape;
}

function addShape(slide, name, geometry, position, fill, line = "#39443B", options = {}) {
  return slide.shapes.add({ geometry, name, position, fill, line: { style: "solid", fill: line, width: options.lineWidth ?? 1 }, ...(options.borderRadius ? { borderRadius: options.borderRadius } : {}) });
}

function addLine(slide, name, position, color, width = 1) {
  return slide.shapes.add({ geometry: "line", name, position, fill: "none", line: { style: "solid", fill: color, width } });
}

function toneColor(tone, colors) {
  return tone === "coral" ? colors.accent2 : tone === "mint" ? colors.accent3 : colors.accent;
}

function elementByRole(slide, role) {
  return slide.elements.find((element) => element.role === role);
}

function commonChrome(slide, index, total, colors) {
  slide.background.fill = colors.background;
  addLine(slide, `slide-${index + 1}-top-rule`, { left: 72, top: 34, width: 1136, height: 0 }, colors.border, 1);
  addText(slide, `slide-${index + 1}-page`, `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, { left: 1116, top: 668, width: 92, height: 20 }, { fontSize: 12, color: colors.muted, alignment: "right" });
}

async function addEvidenceImages(slide, deckSlide, assetRoot, { prominent = false, sourceStrip = false } = {}) {
  const elements = deckSlide.elements.filter((element) => element.role === "evidence-figure");
  let count = 0;
  if (prominent && elements.length) addShape(slide, `${deckSlide.id}-evidence-frame`, "roundRect", { left: 900, top: 232, width: 300, height: 286 }, "#FFFFFF", "#D8CFC5", { borderRadius: "rounded-xl" });
  if (sourceStrip && elements.length) {
    addShape(slide, `${deckSlide.id}-source-frame`, "roundRect", { left: 900, top: 88, width: 300, height: 112 }, "#FFFFFF", "#D8CFC5", { borderRadius: "rounded-xl" });
    addText(slide, `${deckSlide.id}-source-label`, "SOURCE CROP", { left: 914, top: 98, width: 110, height: 16 }, { fontSize: 10, bold: true, color: "#9B5C45" });
  }
  for (const [index, element] of elements.entries()) {
    if (!element.data?.path) continue;
    const source = path.resolve(assetRoot, element.data.path);
    try {
      const blob = new Uint8Array(await fs.readFile(source));
      const ext = path.extname(source).toLowerCase();
      slide.images.add({
        blob,
        contentType: ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg",
        position: prominent ? { left: 912, top: 244, width: 276, height: 262 } : sourceStrip ? { left: 912, top: 116, width: 276, height: 72 } : { left: 920 + (index % 2) * 142, top: 60 + Math.floor(index / 2) * 88, width: 126, height: 76 },
        fit: prominent || sourceStrip ? "contain" : (element.data.fit || "cover"),
        alt: element.alt_text || element.data.caption || "Paper evidence image",
      });
      count += 1;
    } catch {
      // QA reports missing assets; rendering continues.
    }
  }
  return count;
}

function renderTitleSlide(slide, deckSlide, colors, typography) {
  const eyebrow = elementByRole(deckSlide, "eyebrow")?.text || "PAPER / RESEARCH BRIEF";
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const subtitle = elementByRole(deckSlide, "subtitle")?.text || "";
  const note = elementByRole(deckSlide, "hero-note")?.data || {};
  addText(slide, `${deckSlide.id}-eyebrow`, eyebrow, { left: 72, top: 78, width: 560, height: 24 }, { fontSize: 14, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 168, width: 650, height: 150 }, { fontSize: typography.title_px, bold: true, color: colors.foreground, lineSpacing: .94 });
  addText(slide, `${deckSlide.id}-subtitle`, subtitle, { left: 72, top: 352, width: 590, height: 80 }, { fontSize: typography.subtitle_px, color: colors.muted, lineSpacing: 1.18 });
  const cx = 930;
  addShape(slide, `${deckSlide.id}-ring-a`, "ellipse", { left: cx - 202, top: 176, width: 404, height: 332, rotation: -20 }, "none", colors.accent, { lineWidth: 1 });
  addShape(slide, `${deckSlide.id}-ring-b`, "ellipse", { left: cx - 152, top: 234, width: 304, height: 216, rotation: 22 }, "none", colors.accent2, { lineWidth: 1 });
  addShape(slide, `${deckSlide.id}-core`, "ellipse", { left: cx - 62, top: 280, width: 124, height: 124 }, colors.accent, colors.accent, { lineWidth: 1 });
  addText(slide, `${deckSlide.id}-core-text`, "EVIDENCE", { left: cx - 62, top: 321, width: 124, height: 28 }, { fontSize: 15, bold: true, color: colors.black, alignment: "center", verticalAlignment: "middle" });
  addText(slide, `${deckSlide.id}-html`, "METHOD", { left: cx + 138, top: 184, width: 100, height: 24 }, { fontSize: 14, bold: true, color: colors.accent2, alignment: "center" });
  addText(slide, `${deckSlide.id}-pptx`, "RESULT", { left: cx - 214, top: 506, width: 100, height: 24 }, { fontSize: 14, bold: true, color: colors.accent3, alignment: "center" });
  addShape(slide, `${deckSlide.id}-note-bg`, "roundRect", { left: 72, top: 568, width: 720, height: 66 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-note-label`, note.label || "CORE CLAIM", { left: 94, top: 584, width: 170, height: 18 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-note-value`, note.value || deckSlide.primary_claim, { left: 270, top: 580, width: 490, height: 28 }, { fontSize: 16, bold: true, color: colors.foreground });
}

async function renderPipelineSlide(slide, deckSlide, colors, typography, assetRoot) {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const kicker = elementByRole(deckSlide, "kicker")?.text || "METHOD OVERVIEW";
  const steps = deckSlide.elements.filter((element) => element.role === "step");
  const result = elementByRole(deckSlide, "result")?.data || {};
  addText(slide, `${deckSlide.id}-kicker`, kicker, { left: 72, top: 76, width: 360, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 114, width: 940, height: 86 }, { fontSize: typography.slide_title_px, bold: true, color: colors.foreground, lineSpacing: .98 });
  const gap = 18;
  const width = (1136 - gap * 3) / 4;
  const y = 258;
  for (let index = 0; index < steps.length - 1; index += 1) addLine(slide, `${deckSlide.id}-line-${index + 1}`, { left: 72 + width * (index + 1) + gap * index + 4, top: y + 112, width: gap - 8, height: 0 }, colors.border, 2);
  for (const [index, step] of steps.entries()) {
    const data = step.data || {};
    const x = 72 + index * (width + gap);
    const tone = toneColor(data.tone, colors);
    addShape(slide, step.id, "roundRect", { left: x, top: y, width, height: 240 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
    addText(slide, `${step.id}-metric`, data.metric || `0${index + 1}`, { left: x + 22, top: y + 22, width: 80, height: 22 }, { fontSize: 14, bold: true, color: tone });
    addText(slide, `${step.id}-title`, data.title || "Step", { left: x + 22, top: y + 82, width: width - 44, height: 42 }, { fontSize: 24, bold: true, color: colors.foreground });
    addText(slide, `${step.id}-body`, data.text || "", { left: x + 22, top: y + 132, width: width - 44, height: 88 }, { fontSize: 15, color: colors.muted, lineSpacing: 1.08 });
  }
  addShape(slide, `${deckSlide.id}-result-bg`, "roundRect", { left: 72, top: 570, width: 1136, height: 64 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-result-label`, result.label || "RESULT", { left: 94, top: 591, width: 140, height: 18 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-result-value`, result.value || "", { left: 240, top: 586, width: 820, height: 28 }, { fontSize: 18, bold: true, color: colors.foreground });
  await addEvidenceImages(slide, deckSlide, assetRoot);
}

async function renderComparisonSlide(slide, deckSlide, colors, typography, assetRoot) {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const columns = deckSlide.elements.filter((element) => element.role === "comparison-column");
  const takeaway = elementByRole(deckSlide, "takeaway")?.data || {};
  addText(slide, `${deckSlide.id}-kicker`, "COMPARISON", { left: 72, top: 76, width: 300, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  const hasVisual = deckSlide.elements.some((element) => element.role === "evidence-figure");
  const visualWidth = hasVisual ? 780 : 1136;
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 114, width: visualWidth, height: 86 }, { fontSize: typography.slide_title_px, bold: true, color: colors.foreground, lineSpacing: .98 });
  const gap = 22;
  const width = (visualWidth - gap) / 2;
  for (const [index, column] of columns.entries()) {
    const data = column.data || {};
    const x = 72 + index * (width + gap);
    const tone = toneColor(data.tone, colors);
    addShape(slide, `${column.id}-bg`, "rect", { left: x, top: 242, width, height: 292 }, colors.surface, colors.border, { lineWidth: 1 });
    addShape(slide, `${column.id}-rule`, "rect", { left: x, top: 242, width, height: 5 }, tone, tone, { lineWidth: 0 });
    addText(slide, `${column.id}-label`, data.label || "OUTPUT", { left: x + 28, top: 270, width: width - 56, height: 20 }, { fontSize: 12, bold: true, color: tone });
    addText(slide, `${column.id}-headline`, data.headline || "Output", { left: x + 28, top: 317, width: width - 56, height: 72 }, { fontSize: String(data.headline || "").length > 24 ? 27 : 32, bold: true, color: colors.foreground, lineSpacing: 1.02 });
    (data.points || []).slice(0, 4).forEach((point, pointIndex) => addText(slide, `${column.id}-point-${pointIndex + 1}`, `• ${point}`, { left: x + 28, top: 414 + pointIndex * 28, width: width - 56, height: 24 }, { fontSize: String(point).length > 38 ? 13 : 16, color: colors.muted, lineSpacing: 1.04 }));
  }
  addShape(slide, `${deckSlide.id}-takeaway-bg`, "roundRect", { left: 72, top: 570, width: 1136, height: 64 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-takeaway-label`, takeaway.label || "TAKEAWAY", { left: 94, top: 591, width: 150, height: 18 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-takeaway-value`, takeaway.value || "", { left: 260, top: 586, width: 820, height: 28 }, { fontSize: 18, bold: true, color: colors.foreground });
  await addEvidenceImages(slide, deckSlide, assetRoot, { prominent: hasVisual });
}

async function renderInsightSlide(slide, deckSlide, colors, typography, assetRoot) {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const blocks = deckSlide.elements.filter((element) => element.role === "insight-block");
  const takeaway = elementByRole(deckSlide, "takeaway")?.data || {};
  addText(slide, `${deckSlide.id}-kicker`, "INSIGHT / BOUNDARY", { left: 72, top: 76, width: 360, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  const hasVisual = deckSlide.elements.some((element) => element.role === "evidence-figure");
  const visualWidth = hasVisual ? 780 : 1136;
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 114, width: visualWidth, height: 86 }, { fontSize: typography.slide_title_px, bold: true, color: colors.foreground, lineSpacing: .98 });
  const positions = hasVisual ? [{ left: 72, width: 360 }, { left: 450, width: 382 }] : [{ left: 72, width: 520 }, { left: 622, width: 586 }];
  for (const [index, block] of blocks.slice(0, 2).entries()) {
    const data = block.data || {};
    const position = positions[index];
    const tone = toneColor(data.tone, colors);
    addShape(slide, `${block.id}-bg`, "rect", { left: position.left, top: 242, width: position.width, height: 292 }, colors.surface, colors.border, { lineWidth: 1 });
    addShape(slide, `${block.id}-rule`, "rect", { left: position.left, top: 242, width: position.width, height: 6 }, tone, tone, { lineWidth: 0 });
    addText(slide, `${block.id}-label`, data.label || "INSIGHT", { left: position.left + 32, top: 274, width: position.width - 64, height: 20 }, { fontSize: 12, bold: true, color: tone });
    addText(slide, `${block.id}-headline`, data.headline || "Insight", { left: position.left + 32, top: 340, width: position.width - 64, height: 82 }, { fontSize: 30, bold: true, color: colors.foreground, lineSpacing: 1.02 });
    (data.points || []).slice(0, 2).forEach((point, pointIndex) => addText(slide, `${block.id}-point-${pointIndex + 1}`, `• ${point}`, { left: position.left + 32, top: 450 + pointIndex * 30, width: position.width - 64, height: 24 }, { fontSize: 15, color: colors.muted }));
  }
  addShape(slide, `${deckSlide.id}-takeaway-bg`, "roundRect", { left: 72, top: 570, width: 1136, height: 64 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-takeaway-label`, takeaway.label || "TAKEAWAY", { left: 94, top: 591, width: 150, height: 18 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-takeaway-value`, takeaway.value || "", { left: 260, top: 586, width: 820, height: 28 }, { fontSize: 18, bold: true, color: colors.foreground });
  await addEvidenceImages(slide, deckSlide, assetRoot, { prominent: hasVisual });
}

function chartData(element) {
  const data = element?.data || {};
  const categories = (data.categories || []).map(String);
  const series = (data.series || []).map((item) => ({ name: String(item.name || "Paper values"), values: (item.values || []).map(Number).filter(Number.isFinite) }));
  if (!categories.length || !series.length || !series[0].values.length) return null;
  return { categories, series };
}

async function renderDataSlide(slide, deckSlide, colors, typography, assetRoot) {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  addText(slide, `${deckSlide.id}-kicker`, "PAPER EVIDENCE", { left: 72, top: 76, width: 360, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 114, width: 800, height: 86 }, { fontSize: typography.slide_title_px, bold: true, color: colors.foreground, lineSpacing: .98 });
  const tableElement = deckSlide.elements.find((element) => element.kind === "table");
  const chartElement = deckSlide.elements.find((element) => element.kind === "chart");
  if (chartElement) {
    const data = chartData(chartElement);
    if (data) slide.charts.add("bar", { position: { left: 92, top: 236, width: tableElement ? 760 : 1050, height: 350 }, categories: data.categories, series: data.series, hasLegend: data.series.length > 1, barOptions: { direction: "bar", grouping: "clustered", gapWidth: 36 }, xAxis: { visible: false, majorGridlines: null }, yAxis: { textStyle: { fill: colors.muted, fontSize: 13 }, line: { style: "solid", fill: colors.border, width: 1 } }, dataLabels: { showValue: true, position: "outEnd", textStyle: { fill: colors.foreground, fontSize: 13, bold: true } }, chartFill: colors.surface, plotAreaFill: colors.surface });
  }
  if (tableElement) {
    const values = tableElement.data?.values || [];
    const rows = values.length;
    const columns = Math.max(1, ...values.map((row) => row.length));
    if (rows && columns) {
      const table = slide.tables.add({ rows, columns, left: chartElement ? 880 : 92, top: 236, width: chartElement ? 328 : 1040, height: 350, values });
      table.styleOptions = { headerRow: true, bandedRows: true };
    }
  }
  addText(slide, `${deckSlide.id}-caption`, tableElement?.data?.caption || chartElement?.data?.table_ref || "Source table from paper", { left: 92, top: 210, width: 760, height: 16 }, { fontSize: 11, color: colors.muted });
  await addEvidenceImages(slide, deckSlide, assetRoot, { sourceStrip: true });
}

export async function renderPptx({ spec, outPath, previewDir, assetRoot: assetRootOverride = null }) {
  await ensureDir(path.dirname(outPath));
  await ensureDir(previewDir);
  const presentation = Presentation.create({ slideSize: SIZE });
  const colors = spec.theme.colors;
  const typography = spec.theme.typography;
  const assetRoot = assetRootOverride ? path.resolve(assetRootOverride) : path.dirname(outPath);
  const objectSummary = [];
  for (const [index, deckSlide] of spec.slides.entries()) {
    const slide = presentation.slides.add();
    commonChrome(slide, index, spec.slides.length, colors);
    const hasDataVisual = deckSlide.elements.some((element) => element.kind === "table" || element.kind === "chart");
    if (hasDataVisual) await renderDataSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "title") renderTitleSlide(slide, deckSlide, colors, typography);
    else if (deckSlide.layout === "pipeline") await renderPipelineSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "comparison") await renderComparisonSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "insight") await renderInsightSlide(slide, deckSlide, colors, typography, assetRoot);
    const png = await presentation.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(previewDir, `pptx-${String(index + 1).padStart(3, "0")}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(previewDir, `pptx-${String(index + 1).padStart(3, "0")}.layout.json`), await layout.text(), "utf8");
    objectSummary.push({ slide_id: deckSlide.id, layout: deckSlide.layout, object_count: slide.shapes.items.length, table_count: slide.tables?.items?.length || 0, chart_count: slide.charts?.items?.length || 0, image_count: slide.images?.items?.length || 0 });
  }
  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(previewDir, "pptx-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const inspect = await presentation.inspect({ kind: "slide,textbox,shape,image,table,chart", maxChars: 20000 });
  await writeText(path.join(previewDir, "pptx-inspect.ndjson"), inspect.ndjson || String(inspect));
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(outPath);
  return { pptxPath: outPath, previewDir, objectSummary, slideCount: spec.slides.length };
}
