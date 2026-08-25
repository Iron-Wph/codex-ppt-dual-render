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

function titleFontSize(value, base = 48, minimum = 30) {
  const length = [...String(value || "")].length;
  if (length > 72) return minimum;
  if (length > 56) return Math.max(minimum, base - 14);
  if (length > 42) return Math.max(minimum, base - 10);
  if (length > 30) return Math.max(minimum, base - 6);
  return base;
}

function textIsSimilar(left, right) {
  const normalize = (value) => String(value || "").replace(/[\s，。；：、,.!?！？:;`"'“”‘’（）()\-—]/g, "").toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aChars = new Set([...a]);
  const bChars = new Set([...b]);
  const overlap = [...aChars].filter((char) => bChars.has(char)).length;
  return overlap / Math.max(1, Math.min(aChars.size, bChars.size)) >= .72;
}

function elementByRole(slide, role) {
  return slide.elements.find((element) => element.role === role);
}

function visualProfile(theme) {
  return String(theme?.visual_profile || "default");
}

function addDraftingGrid(slide, colors, step = 80, opacityColor = null) {
  const lineColor = opacityColor || colors.border;
  for (let x = step; x < SIZE.width; x += step) addLine(slide, `grid-v-${x}`, { left: x, top: 0, width: 0, height: SIZE.height }, lineColor, .35);
  for (let y = step; y < SIZE.height; y += step) addLine(slide, `grid-h-${y}`, { left: 0, top: y, width: SIZE.width, height: 0 }, lineColor, .35);
}

function commonChrome(slide, index, total, theme, deckSlide = {}) {
  const colors = theme.colors;
  const profile = visualProfile(theme);
  slide.background.fill = deckSlide.visual_plan?.background_variant === "quiet" ? colors.surface2 : colors.background;
  if (profile === "scientific") addDraftingGrid(slide, colors, 72);
  if (profile === "blueprint") addDraftingGrid(slide, colors, 48);
  if (profile === "editorial") addShape(slide, `slide-${index + 1}-editorial-rule`, "rect", { left: 0, top: 0, width: 8, height: 720 }, colors.accent2, colors.accent2, { lineWidth: 0 });
  if (profile === "consulting") addShape(slide, `slide-${index + 1}-consulting-bar`, "rect", { left: 0, top: 0, width: 1280, height: 8 }, colors.accent, colors.accent, { lineWidth: 0 });
  if (profile === "frontier" || profile === "graphite") {
    addShape(slide, `slide-${index + 1}-signal-a`, "ellipse", { left: 1035, top: -112, width: 330, height: 330 }, "none", colors.accent, { lineWidth: .6 });
    addShape(slide, `slide-${index + 1}-signal-b`, "ellipse", { left: -130, top: 560, width: 280, height: 220 }, "none", colors.accent2, { lineWidth: .5 });
  }
  const topRuleColor = ["consulting", "editorial"].includes(profile) ? colors.accent : colors.border;
  addLine(slide, `slide-${index + 1}-top-rule`, { left: 72, top: 34, width: 1136, height: 0 }, topRuleColor, 1);
  addText(slide, `slide-${index + 1}-page`, `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, { left: 1116, top: 668, width: 92, height: 20 }, { fontSize: 12, color: colors.muted, alignment: "right" });
}

function renderProfileHeroVisual(slide, id, colors, profile, box) {
  const { left, top, width, height } = box;
  if (profile === "academic" || profile === "scientific") {
    addShape(slide, `${id}-plate`, "rect", box, colors.surface, colors.border, { lineWidth: 1 });
    addText(slide, `${id}-plate-label`, profile === "scientific" ? "RESEARCH / METHOD MAP" : "PAPER / ARGUMENT MAP", { left: left + 24, top: top + 20, width: width - 48, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
    for (let index = 0; index < 5; index += 1) {
      addLine(slide, `${id}-manuscript-line-${index + 1}`, { left: left + 40, top: top + 92 + index * 48, width: width * (index === 0 ? .72 : index === 4 ? .46 : .58), height: 0 }, index === 0 ? colors.accent : colors.border, index === 0 ? 3 : 1);
    }
    addShape(slide, `${id}-annotation`, "rect", { left: left + width * .68, top: top + 86, width: width * .18, height: height * .42 }, "none", colors.accent2, { lineWidth: 2 });
    addText(slide, `${id}-annotation-label`, "CLAIM\n→\nEVIDENCE", { left: left + width * .69, top: top + 118, width: width * .16, height: 90 }, { fontSize: 12, bold: true, color: colors.accent2, alignment: "center", lineSpacing: 1.25 });
    return;
  }
  if (profile === "blueprint") {
    addShape(slide, `${id}-bp-frame`, "rect", box, "none", colors.accent, { lineWidth: 1 });
    const nodes = [
      { left: left + 34, top: top + 52, width: width * .28, height: 76 },
      { left: left + width * .58, top: top + 52, width: width * .28, height: 76 },
      { left: left + width * .31, top: top + height * .58, width: width * .38, height: 82 },
    ];
    for (const [index, node] of nodes.entries()) {
      addShape(slide, `${id}-bp-node-${index + 1}`, "rect", node, colors.surface, index === 2 ? colors.accent2 : colors.accent, { lineWidth: 1 });
      addText(slide, `${id}-bp-node-label-${index + 1}`, ["INPUT", "SYSTEM", "OUTPUT"][index], { left: node.left, top: node.top + 27, width: node.width, height: 20 }, { fontSize: 11, bold: true, color: colors.foreground, alignment: "center" });
    }
    addLine(slide, `${id}-bp-link-1`, { left: nodes[0].left + nodes[0].width, top: nodes[0].top + 38, width: nodes[1].left - nodes[0].left - nodes[0].width, height: 0 }, colors.accent, 1);
    return;
  }
  if (profile === "editorial") {
    addShape(slide, `${id}-editorial-frame`, "rect", box, colors.surface, colors.border, { lineWidth: 1 });
    addText(slide, `${id}-editorial-mark`, "“", { left: left + 24, top: top + 20, width: 160, height: 180 }, { fontSize: 112, bold: true, color: colors.accent2 });
    addLine(slide, `${id}-editorial-line`, { left: left + 40, top: top + height * .7, width: width - 80, height: 0 }, colors.accent, 3);
    addText(slide, `${id}-editorial-label`, "RESEARCH / EDITION", { left: left + 40, top: top + height * .76, width: width - 80, height: 22 }, { fontSize: 12, bold: true, color: colors.muted });
    return;
  }
  if (profile === "consulting") {
    addShape(slide, `${id}-consult-frame`, "rect", box, colors.surface, colors.border, { lineWidth: 1 });
    const widths = [.84, .62, .43];
    for (const [index, ratio] of widths.entries()) {
      addShape(slide, `${id}-consult-bar-${index + 1}`, "rect", { left: left + 38, top: top + 66 + index * 72, width: (width - 76) * ratio, height: 28 }, index === 2 ? colors.accent2 : colors.accent, "none", { lineWidth: 0 });
    }
    addText(slide, `${id}-consult-label`, "ANSWER FIRST", { left: left + 38, top: top + 26, width: width - 76, height: 20 }, { fontSize: 12, bold: true, color: colors.accent });
    return;
  }
  addShape(slide, `${id}-orbit-a`, "ellipse", { left: left + width * .1, top: top + height * .08, width: width * .8, height: height * .8, rotation: -24 }, "none", colors.accent, { lineWidth: 1 });
  addShape(slide, `${id}-orbit-b`, "ellipse", { left: left + width * .25, top: top + height * .24, width: width * .5, height: height * .5, rotation: 34 }, "none", colors.accent2, { lineWidth: 1 });
  addShape(slide, `${id}-orbit-core`, "ellipse", { left: left + width * .4, top: top + height * .4, width: width * .2, height: height * .2 }, colors.accent, colors.accent, { lineWidth: 0 });
  addText(slide, `${id}-orbit-text`, "EVIDENCE", { left: left + width * .4, top: top + height * .48, width: width * .2, height: 20 }, { fontSize: 11, bold: true, color: colors.black, alignment: "center" });
}

async function addEvidenceImages(slide, deckSlide, assetRoot, { prominent = false, sourceStrip = false, placements = [] } = {}) {
  const elements = deckSlide.elements.filter((element) => ["evidence-figure", "source-provenance"].includes(element.role));
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
        position: placements[index] || (prominent ? { left: 912, top: 244, width: 276, height: 262 } : sourceStrip ? { left: 912, top: 116, width: 276, height: 72 } : { left: 920 + (index % 2) * 142, top: 60 + Math.floor(index / 2) * 88, width: 126, height: 76 }),
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

function renderTitleSlide(slide, deckSlide, colors, typography, profile = "default") {
  const eyebrow = elementByRole(deckSlide, "eyebrow")?.text || "PAPER / RESEARCH BRIEF";
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const subtitle = elementByRole(deckSlide, "subtitle")?.text || "";
  const note = elementByRole(deckSlide, "hero-note")?.data || {};
  addText(slide, `${deckSlide.id}-eyebrow`, eyebrow, { left: 72, top: 78, width: 560, height: 24 }, { fontSize: 14, bold: true, color: colors.accent });
  const coverTitleSize = [...String(title)].length > 10 ? Math.min(52, titleFontSize(title, typography.title_px, 36)) : titleFontSize(title, typography.title_px, 38);
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 154, width: 620, height: 268 }, { fontSize: coverTitleSize, bold: true, color: colors.foreground, lineSpacing: .94 });
  if (subtitle && !textIsSimilar(title, subtitle)) addText(slide, `${deckSlide.id}-subtitle`, subtitle, { left: 72, top: 438, width: 590, height: 72 }, { fontSize: typography.subtitle_px, color: colors.muted, lineSpacing: 1.18 });
  renderProfileHeroVisual(slide, `${deckSlide.id}-title-visual`, colors, profile, { left: 738, top: 152, width: 420, height: 390 });
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

function addLayoutHeading(slide, deckSlide, colors, typography, kicker, width = 1060) {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const actualKicker = elementByRole(deckSlide, "kicker")?.text || kicker;
  addText(slide, `${deckSlide.id}-kicker`, actualKicker, { left: 72, top: 76, width: 420, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 112, width, height: 106 }, { fontSize: titleFontSize(title, typography.slide_title_px, 30), bold: true, color: colors.foreground, lineSpacing: .98 });
}

async function renderHeroImageSlide(slide, deckSlide, colors, typography, assetRoot, profile = "default") {
  const eyebrow = elementByRole(deckSlide, "eyebrow")?.text || "RESEARCH BRIEF";
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const subtitle = elementByRole(deckSlide, "subtitle")?.text || "";
  const note = elementByRole(deckSlide, "hero-note")?.data || {};
  addText(slide, `${deckSlide.id}-eyebrow`, eyebrow, { left: 72, top: 88, width: 500, height: 22 }, { fontSize: 14, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, title, { left: 72, top: 142, width: 560, height: 230 }, { fontSize: titleFontSize(title, typography.title_px, 36), bold: true, color: colors.foreground, lineSpacing: .94 });
  if (subtitle && !textIsSimilar(title, subtitle)) addText(slide, `${deckSlide.id}-subtitle`, subtitle, { left: 72, top: 390, width: 520, height: 92 }, { fontSize: typography.subtitle_px, color: colors.muted, lineSpacing: 1.2 });
  const hasImage = deckSlide.elements.some((element) => element.kind === "image");
  addShape(slide, `${deckSlide.id}-hero-frame`, "roundRect", { left: 690, top: 104, width: 510, height: 418 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  if (hasImage) await addEvidenceImages(slide, deckSlide, assetRoot, { placements: [{ left: 706, top: 120, width: 478, height: 385 }] });
  else renderProfileHeroVisual(slide, `${deckSlide.id}-hero-visual`, colors, profile, { left: 706, top: 120, width: 478, height: 385 });
  addShape(slide, `${deckSlide.id}-note-bg`, "roundRect", { left: 72, top: 572, width: 1128, height: 62 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-note-label`, note.label || "CORE CLAIM", { left: 94, top: 593, width: 180, height: 18 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-note-value`, note.value || deckSlide.primary_claim, { left: 286, top: 588, width: 860, height: 26 }, { fontSize: 17, bold: true, color: colors.foreground });
}

async function renderImageThesisSplitSemantic(slide, deckSlide, colors, typography, assetRoot, profile = "default") {
  const content = semanticContent(deckSlide);
  const metrics = content.metrics.slice(0, 3);
  addText(slide, `${deckSlide.id}-kicker`, deckSlide.content?.eyebrow || "RESEARCH CONTRACT", { left: 72, top: 76, width: 420, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, content.title, { left: 72, top: 114, width: 596, height: 104 }, { fontSize: titleFontSize(content.title, typography.slide_title_px, 30), bold: true, color: colors.foreground, lineSpacing: .98 });
  addText(slide, `${deckSlide.id}-lede`, content.lede, { left: 72, top: 228, width: 590, height: 54 }, { fontSize: 17, color: colors.muted, lineSpacing: 1.16 });
  const metricWidth = (596 - 24) / 3;
  for (const [index, metric] of metrics.entries()) {
    const left = 72 + index * (metricWidth + 12);
    addShape(slide, `${deckSlide.id}-contract-metric-${index + 1}`, "rect", { left, top: 314, width: metricWidth, height: 196 }, colors.surface, colors.border, { lineWidth: 1 });
    addShape(slide, `${deckSlide.id}-contract-rule-${index + 1}`, "rect", { left, top: 314, width: metricWidth, height: 4 }, index === 2 ? colors.accent2 : colors.accent, "none", { lineWidth: 0 });
    addText(slide, `${deckSlide.id}-contract-label-${index + 1}`, metric.label || `METRIC ${index + 1}`, { left: left + 18, top: 338, width: metricWidth - 36, height: 18 }, { fontSize: 10, bold: true, color: index === 2 ? colors.accent2 : colors.accent });
    addText(slide, `${deckSlide.id}-contract-value-${index + 1}`, metric.value || "—", { left: left + 18, top: 376, width: metricWidth - 36, height: 54 }, { fontSize: String(metric.value || "").length > 10 ? 27 : 34, bold: true, color: colors.foreground, lineSpacing: .96 });
    addText(slide, `${deckSlide.id}-contract-meaning-${index + 1}`, metric.meaning || "", { left: left + 18, top: 448, width: metricWidth - 36, height: 46 }, { fontSize: 12, color: colors.muted, lineSpacing: 1.08 });
  }
  addShape(slide, `${deckSlide.id}-contract-image-frame`, "roundRect", { left: 704, top: 110, width: 496, height: 400 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  const hasImage = deckSlide.elements.some((element) => element.kind === "image");
  if (hasImage) await addEvidenceImages(slide, deckSlide, assetRoot, { placements: [{ left: 720, top: 126, width: 464, height: 368 }] });
  else renderProfileHeroVisual(slide, `${deckSlide.id}-contract-visual`, colors, profile, { left: 720, top: 126, width: 464, height: 368 });
  addLine(slide, `${deckSlide.id}-contract-takeaway-rule`, { left: 72, top: 566, width: 1128, height: 0 }, colors.border, 1);
  addText(slide, `${deckSlide.id}-contract-takeaway-label`, content.takeaway?.label || "EXPERIMENT CONTRACT", { left: 72, top: 592, width: 190, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-contract-takeaway`, content.takeaway?.value || deckSlide.implication, { left: 276, top: 584, width: 900, height: 40 }, { fontSize: 18, bold: true, color: colors.foreground, lineSpacing: 1.08 });
}

function renderMetricStageSlide(slide, deckSlide, colors, typography) {
  const metric = elementByRole(deckSlide, "metric-stage")?.data || {};
  addLayoutHeading(slide, deckSlide, colors, typography, "KEY CONTRIBUTION");
  addShape(slide, `${deckSlide.id}-metric-bg`, "roundRect", { left: 72, top: 244, width: 780, height: 304 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-metric-label`, metric.label || "KEY MOVE", { left: 108, top: 282, width: 280, height: 20 }, { fontSize: 13, bold: true, color: toneColor(metric.tone, colors) });
  addText(slide, `${deckSlide.id}-metric-value`, metric.value || "01", { left: 108, top: 338, width: 690, height: 90 }, { fontSize: 64, bold: true, color: colors.foreground, lineSpacing: .9 });
  addText(slide, `${deckSlide.id}-metric-detail`, metric.detail || deckSlide.primary_claim, { left: 112, top: 464, width: 630, height: 48 }, { fontSize: 18, color: colors.muted, lineSpacing: 1.12 });
  addShape(slide, `${deckSlide.id}-metric-orbit-a`, "ellipse", { left: 926, top: 238, width: 218, height: 218, rotation: -25 }, "none", colors.accent, { lineWidth: 1 });
  addShape(slide, `${deckSlide.id}-metric-orbit-b`, "ellipse", { left: 970, top: 288, width: 130, height: 130, rotation: 32 }, "none", colors.accent2, { lineWidth: 1 });
  addShape(slide, `${deckSlide.id}-metric-core`, "ellipse", { left: 998, top: 316, width: 74, height: 74 }, colors.accent, colors.accent, { lineWidth: 0 });
  addText(slide, `${deckSlide.id}-metric-core-text`, "+", { left: 998, top: 331, width: 74, height: 40 }, { fontSize: 34, bold: true, color: colors.black, alignment: "center" });
}

async function renderStorySplitSlide(slide, deckSlide, colors, typography, assetRoot) {
  const primary = elementByRole(deckSlide, "story-primary")?.data || {};
  const support = elementByRole(deckSlide, "story-support")?.data || {};
  addLayoutHeading(slide, deckSlide, colors, typography, "THE STORY", 980);
  const hasImage = deckSlide.elements.some((element) => element.role === "evidence-figure");
  const widths = hasImage ? [468, 260] : [696, 416];
  for (const [index, [data, left, width, role]] of [[primary, 72, widths[0], "primary"], [support, 72 + widths[0] + 20, widths[1], "support"]].entries()) {
    const tone = toneColor(data.tone, colors);
    addShape(slide, `${deckSlide.id}-story-${role}`, "roundRect", { left, top: 242, width, height: 304 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
    addText(slide, `${deckSlide.id}-story-${role}-label`, data.label || (index ? "IMPLICATION" : "CONTEXT"), { left: left + 24, top: 270, width: width - 48, height: 18 }, { fontSize: 11, bold: true, color: tone });
    addText(slide, `${deckSlide.id}-story-${role}-headline`, data.headline || deckSlide.primary_claim, { left: left + 24, top: 324, width: width - 48, height: 92 }, { fontSize: index ? 26 : 34, bold: true, color: colors.foreground, lineSpacing: 1.02 });
    (data.points || []).slice(0, 2).forEach((point, pointIndex) => addText(slide, `${deckSlide.id}-story-${role}-point-${pointIndex + 1}`, `• ${String(point).slice(0, 42)}${String(point).length > 42 ? "…" : ""}`, { left: left + 24, top: 444 + pointIndex * 34, width: width - 48, height: 28 }, { fontSize: 13, color: colors.muted, lineSpacing: 1.04 }));
  }
  if (hasImage) {
    addShape(slide, `${deckSlide.id}-story-image-bg`, "roundRect", { left: 850, top: 242, width: 350, height: 304 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
    await addEvidenceImages(slide, deckSlide, assetRoot, { placements: [{ left: 864, top: 256, width: 322, height: 276 }] });
  }
}

function styleNativeTable(table, values, colors, typography, profile = "default") {
  const rowCount = values.length;
  const columnCount = Math.max(1, ...values.map((row) => row.length));
  if (!rowCount || !columnCount) return;
  table.styleOptions = { headerRow: true, bandedRows: false, firstColumn: true };
  const body = table.cells.block({ row: 0, column: 0, rowCount, columnCount });
  body.assign({
    fill: colors.surface,
    textStyle: { typeface: typography.body_font, fontSize: 15, color: colors.foreground },
    borders: { bottom: { width: 1, color: colors.border } },
  });
  const restrainedHeader = profile === "blueprint";
  const editorialHeader = profile === "editorial" || profile === "consulting";
  const header = table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount });
  header.assign({
    fill: restrainedHeader ? colors.surface : editorialHeader ? colors.foreground : colors.accent,
    textStyle: {
      typeface: typography.body_font,
      fontSize: 14,
      bold: true,
      color: restrainedHeader ? colors.accent : colors.background,
    },
    borders: { bottom: { width: restrainedHeader ? 3 : 2, color: restrainedHeader ? colors.accent : colors.border } },
  });
  if (rowCount > 1) {
    const firstColumn = table.cells.block({ row: 1, column: 0, rowCount: rowCount - 1, columnCount: 1 });
    firstColumn.assign({ textStyle: { typeface: typography.body_font, fontSize: 15, bold: true, color: colors.foreground } });
  }
}

async function renderChartFocusSlide(slide, deckSlide, colors, typography, assetRoot, profile = "default") {
  const callout = elementByRole(deckSlide, "result-callout")?.data || {};
  addLayoutHeading(slide, deckSlide, colors, typography, "RESULT FOCUS", 820);
  const tableElement = deckSlide.elements.find((element) => element.kind === "table");
  const chartElement = deckSlide.elements.find((element) => element.kind === "chart");
  addShape(slide, `${deckSlide.id}-chart-bg`, "roundRect", { left: 72, top: 240, width: 732, height: 330 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  if (chartElement) {
    const data = chartData(chartElement);
    addText(slide, `${deckSlide.id}-chart-axis-label`, chartElement.data?.value_axis_label || "VALUE", { left: 110, top: 254, width: 300, height: 16 }, { fontSize: 10, bold: true, color: colors.accent });
    if (data) slide.charts.add("bar", { position: { left: 96, top: 278, width: 686, height: 260 }, categories: data.categories, series: data.series, hasLegend: data.series.length > 1, barOptions: { direction: "bar", grouping: "clustered", gapWidth: 34 }, xAxis: { visible: false, majorGridlines: null }, yAxis: { textStyle: { fill: colors.muted, fontSize: 12 }, line: { style: "solid", fill: colors.border, width: 1 } }, dataLabels: { showValue: true, position: "outEnd", textStyle: { fill: colors.foreground, fontSize: 12, bold: true } }, chartFill: colors.surface, plotAreaFill: colors.surface });
  } else if (tableElement) {
    const values = tableElement.data?.values || [];
    const rows = values.length;
    const columns = Math.max(1, ...values.map((row) => row.length));
    if (rows && columns) {
      const table = slide.tables.add({ rows, columns, left: 96, top: 270, width: 684, height: 250, values });
      styleNativeTable(table, values, colors, typography, profile);
    }
  } else addText(slide, `${deckSlide.id}-chart-empty`, "等待结构化表格或图表证据", { left: 120, top: 370, width: 620, height: 28 }, { fontSize: 20, color: colors.muted, alignment: "center" });
  addShape(slide, `${deckSlide.id}-callout-bg`, "roundRect", { left: 830, top: 240, width: 370, height: 330 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-callout-label`, callout.label || "KEY RESULT", { left: 858, top: 270, width: 300, height: 18 }, { fontSize: 12, bold: true, color: toneColor(callout.tone, colors) });
  const calloutValue = callout.value || deckSlide.primary_claim;
  const displayCalloutValue = String(calloutValue).replace(/[；;]/g, "\n").replace(/平均提升\s*/g, "");
  const calloutFontSize = displayCalloutValue.length > 48 ? 21 : displayCalloutValue.length > 32 ? 24 : 29;
  addText(slide, `${deckSlide.id}-callout-value`, displayCalloutValue, { left: 858, top: 320, width: 312, height: 140 }, { fontSize: calloutFontSize, bold: true, color: colors.foreground, lineSpacing: 1.01 });
  addText(slide, `${deckSlide.id}-callout-detail`, callout.detail || "", { left: 858, top: 464, width: 312, height: 46 }, { fontSize: 15, color: colors.muted, lineSpacing: 1.08 });
  await addEvidenceImages(slide, deckSlide, assetRoot, { placements: [{ left: 858, top: 522, width: 312, height: 40 }] });
}

function renderMatrixSlide(slide, deckSlide, colors, typography) {
  const cells = deckSlide.elements.filter((element) => element.role === "matrix-cell").slice(0, 4);
  addLayoutHeading(slide, deckSlide, colors, typography, "DECISION MATRIX");
  const positions = [{ left: 72, top: 244 }, { left: 648, top: 244 }, { left: 72, top: 408 }, { left: 648, top: 408 }];
  for (const [index, cell] of cells.entries()) {
    const position = positions[index];
    const data = cell.data || {};
    const tone = toneColor(data.tone, colors);
    addShape(slide, `${cell.id}-bg`, "rect", { ...position, width: 560, height: 146 }, colors.surface, colors.border, { lineWidth: 1 });
    addShape(slide, `${cell.id}-rule`, "rect", { left: position.left, top: position.top, width: 6, height: 146 }, tone, tone, { lineWidth: 0 });
    addText(slide, `${cell.id}-label`, data.title || "POINT", { left: position.left + 28, top: position.top + 22, width: 490, height: 16 }, { fontSize: 11, bold: true, color: tone });
    addText(slide, `${cell.id}-text`, data.text || deckSlide.primary_claim, { left: position.left + 28, top: position.top + 60, width: 490, height: 58 }, { fontSize: 24, bold: true, color: colors.foreground, lineSpacing: 1.04 });
  }
}

async function renderTimelineSlide(slide, deckSlide, colors, typography, assetRoot) {
  const nodes = deckSlide.elements.filter((element) => element.role === "timeline-node").slice(0, 4);
  addLayoutHeading(slide, deckSlide, colors, typography, "METHOD TIMELINE");
  const count = Math.max(2, nodes.length);
  const width = (1136 - (count - 1) * 18) / count;
  const y = 262;
  addLine(slide, `${deckSlide.id}-timeline-line`, { left: 110, top: y + 108, width: 1060, height: 0 }, colors.border, 2);
  for (const [index, node] of nodes.entries()) {
    const data = node.data || {};
    const x = 72 + index * (width + 18);
    const tone = toneColor(data.tone, colors);
    addShape(slide, `${node.id}-bg`, "roundRect", { left: x, top: y, width, height: 270 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
    addShape(slide, `${node.id}-dot`, "ellipse", { left: x + 24, top: y + 92, width: 24, height: 24 }, tone, colors.background, { lineWidth: 5 });
    addText(slide, `${node.id}-metric`, data.metric || String(index + 1).padStart(2, "0"), { left: x + 24, top: y + 28, width: 70, height: 18 }, { fontSize: 11, bold: true, color: colors.muted });
    addText(slide, `${node.id}-title`, data.title || "Step", { left: x + 24, top: y + 144, width: width - 48, height: 44 }, { fontSize: 24, bold: true, color: colors.foreground, lineSpacing: 1.02 });
    addText(slide, `${node.id}-body`, data.text || "", { left: x + 24, top: y + 204, width: width - 48, height: 42 }, { fontSize: 14, color: colors.muted, lineSpacing: 1.08 });
  }
  await addEvidenceImages(slide, deckSlide, assetRoot, { placements: [{ left: 1040, top: 78, width: 148, height: 90 }] });
}

async function renderEvidenceCollageSlide(slide, deckSlide, colors, typography, assetRoot) {
  const takeaway = elementByRole(deckSlide, "collage-takeaway")?.data || {};
  addLayoutHeading(slide, deckSlide, colors, typography, "EVIDENCE COLLAGE");
  const hasImages = deckSlide.elements.some((element) => element.role === "evidence-figure");
  const placements = [{ left: 72, top: 242, width: 520, height: 288 }, { left: 614, top: 242, width: 282, height: 138 }, { left: 918, top: 242, width: 282, height: 138 }];
  if (hasImages) await addEvidenceImages(slide, deckSlide, assetRoot, { placements });
  else {
    for (const [index, position] of placements.entries()) addShape(slide, `${deckSlide.id}-collage-empty-${index + 1}`, "rect", position, colors.surface, colors.border, { lineWidth: 1 });
  }
  addShape(slide, `${deckSlide.id}-collage-note-bg`, "roundRect", { left: 614, top: 402, width: 586, height: 128 }, colors.surface, colors.border, { borderRadius: "rounded-xl" });
  addText(slide, `${deckSlide.id}-collage-label`, takeaway.label || "READOUT", { left: 640, top: 430, width: 130, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-collage-value`, takeaway.value || deckSlide.primary_claim, { left: 640, top: 466, width: 520, height: 42 }, { fontSize: 19, bold: true, color: colors.foreground, lineSpacing: 1.06 });
}

function semanticContent(deckSlide) {
  return {
    title: deckSlide.content?.title || elementByRole(deckSlide, "title")?.text || deckSlide.action_title || deckSlide.primary_claim,
    lede: deckSlide.content?.lede || deckSlide.primary_claim,
    bodyPoints: Array.isArray(deckSlide.content?.body_points) ? deckSlide.content.body_points.slice(0, 4) : [],
    metrics: Array.isArray(deckSlide.content?.metrics) ? deckSlide.content.metrics.slice(0, 3) : [],
    columns: Array.isArray(deckSlide.content?.columns) ? deckSlide.content.columns.slice(0, 3) : [],
    steps: Array.isArray(deckSlide.content?.steps) ? deckSlide.content.steps.slice(0, 5) : [],
    takeaway: deckSlide.content?.takeaway || deckSlide.content?.result || deckSlide.content?.note || null,
  };
}

function renderArgumentPairSemantic(slide, deckSlide, colors, typography) {
  const content = semanticContent(deckSlide);
  const columns = content.columns.length >= 2 ? content.columns.slice(0, 2) : [
    { label: "CLAIM", headline: deckSlide.primary_claim, points: content.bodyPoints.slice(0, 2).map((point) => point.text), tone: "lime" },
    { label: "MEANING", headline: deckSlide.implication, points: (deckSlide.evidence || []).slice(0, 2).map((item) => item.interpretation), tone: "coral" },
  ];
  addText(slide, `${deckSlide.id}-kicker`, deckSlide.audience_question || "THE QUESTION", { left: 72, top: 62, width: 1000, height: 22 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-title`, content.title, { left: 72, top: 102, width: 1080, height: 112 }, { fontSize: titleFontSize(content.title, Math.max(36, typography.slide_title_px), 30), bold: true, color: colors.foreground, lineSpacing: .96 });
  const widths = [642, 474];
  const lefts = [72, 734];
  for (const [index, column] of columns.entries()) {
    const tone = toneColor(column.tone, colors);
    addShape(slide, `${deckSlide.id}-argument-${index + 1}-rule`, "rect", { left: lefts[index], top: 244, width: widths[index], height: 4 }, tone, tone, { lineWidth: 0 });
    addText(slide, `${deckSlide.id}-argument-${index + 1}-label`, column.label || `ARGUMENT ${index + 1}`, { left: lefts[index], top: 270, width: widths[index], height: 20 }, { fontSize: 12, bold: true, color: tone });
    addText(slide, `${deckSlide.id}-argument-${index + 1}-headline`, column.headline || "", { left: lefts[index], top: 314, width: widths[index] - 20, height: 94 }, { fontSize: titleFontSize(column.headline, index === 0 ? 34 : 28, 23), bold: true, color: colors.foreground, lineSpacing: 1.02 });
    (column.points || []).slice(0, 3).forEach((point, pointIndex) => {
      addText(slide, `${deckSlide.id}-argument-${index + 1}-point-${pointIndex + 1}`, `→ ${point}`, { left: lefts[index], top: 424 + pointIndex * 54, width: widths[index] - 24, height: 46 }, { fontSize: 16, color: colors.muted, lineSpacing: 1.08 });
    });
  }
  addShape(slide, `${deckSlide.id}-argument-divider`, "rect", { left: 708, top: 244, width: 1, height: 334 }, colors.border, colors.border, { lineWidth: 0 });
  addText(slide, `${deckSlide.id}-implication-label`, content.takeaway?.label || "WHAT THIS CHANGES", { left: 72, top: 606, width: 180, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-implication`, content.takeaway?.value || deckSlide.implication, { left: 268, top: 598, width: 900, height: 32 }, { fontSize: 19, bold: true, color: colors.foreground });
}

function renderCausalFlowSemantic(slide, deckSlide, colors, typography) {
  const content = semanticContent(deckSlide);
  const steps = content.steps.length
    ? content.steps.slice(0, 5)
    : (deckSlide.evidence || []).slice(0, 5).map((item, index) => ({
      metric: String(index + 1).padStart(2, "0"),
      title: item.claim_support,
      text: item.interpretation,
      tone: index === 2 ? "coral" : "lime",
    }));
  addLayoutHeading(slide, deckSlide, colors, typography, "CAUSAL FLOW", 1080);
  const titles = steps.map((step) => String(step?.title || "").toLowerCase());
  const qaFeedback = steps.length >= 5
    && titles.some((title) => /schema/.test(title))
    && titles.some((title) => /geometry/.test(title))
    && titles.some((title) => /cross/.test(title))
    && titles.some((title) => /review/.test(title))
    && titles.some((title) => /修订|渲染|render/.test(title));
  const dualOutput = steps.length >= 2
    && /html/i.test(steps.map((step) => `${step.title} ${step.text}`).join(" "))
    && /pptx/i.test(steps.map((step) => `${step.title} ${step.text}`).join(" "))
    && /双输出|两个出口|two outputs?/i.test(steps.map((step) => `${step.title} ${step.text}`).join(" "));
  if (qaFeedback) {
    const checkY = [244, 344, 444];
    for (let index = 0; index < 3; index += 1) {
      const step = steps[index];
      const tone = index === 2 ? colors.accent2 : colors.accent;
      addShape(slide, `${deckSlide.id}-qa-${index + 1}-rule`, "rect", { left: 72, top: checkY[index], width: 4, height: 78 }, tone, tone, { lineWidth: 0 });
      addText(slide, `${deckSlide.id}-qa-${index + 1}-metric`, step.metric || String(index + 1).padStart(2, "0"), { left: 92, top: checkY[index] + 4, width: 160, height: 14 }, { fontSize: 9, bold: true, color: tone });
      addText(slide, `${deckSlide.id}-qa-${index + 1}-title`, step.title, { left: 92, top: checkY[index] + 24, width: 250, height: 26 }, { fontSize: 21, bold: true, color: colors.foreground });
      addText(slide, `${deckSlide.id}-qa-${index + 1}-body`, step.text, { left: 92, top: checkY[index] + 52, width: 300, height: 28 }, { fontSize: 12, color: colors.muted });
      const sourceY = checkY[index] + 38;
      addLine(slide, `${deckSlide.id}-qa-${index + 1}-merge-a`, { left: 404, top: sourceY, width: 46, height: 0 }, colors.border, 1);
      addLine(slide, `${deckSlide.id}-qa-${index + 1}-merge-b`, { left: 450, top: Math.min(sourceY, 376), width: 0, height: Math.abs(376 - sourceY) }, colors.border, 1);
      addLine(slide, `${deckSlide.id}-qa-${index + 1}-merge-c`, { left: 450, top: 376, width: 72, height: 0 }, colors.border, 1);
    }
    const review = steps[3];
    addShape(slide, `${deckSlide.id}-qa-review`, "rect", { left: 522, top: 294, width: 250, height: 164 }, colors.surface, colors.accent, { lineWidth: 2 });
    addText(slide, `${deckSlide.id}-qa-review-label`, review.metric || "04", { left: 546, top: 316, width: 60, height: 16 }, { fontSize: 10, bold: true, color: colors.accent });
    addText(slide, `${deckSlide.id}-qa-review-title`, review.title, { left: 546, top: 352, width: 200, height: 34 }, { fontSize: 27, bold: true, color: colors.foreground });
    addText(slide, `${deckSlide.id}-qa-review-body`, review.text, { left: 546, top: 402, width: 202, height: 40 }, { fontSize: 13, color: colors.muted });
    addLine(slide, `${deckSlide.id}-qa-review-forward`, { left: 772, top: 376, width: 88, height: 0 }, colors.accent, 2);
    const revision = steps[4];
    addShape(slide, `${deckSlide.id}-qa-revision`, "rect", { left: 860, top: 294, width: 328, height: 164 }, colors.surface, colors.accent2, { lineWidth: 2 });
    addText(slide, `${deckSlide.id}-qa-revision-label`, revision.metric || "05", { left: 884, top: 316, width: 60, height: 16 }, { fontSize: 10, bold: true, color: colors.accent2 });
    addText(slide, `${deckSlide.id}-qa-revision-title`, revision.title, { left: 884, top: 350, width: 270, height: 42 }, { fontSize: 25, bold: true, color: colors.foreground });
    addText(slide, `${deckSlide.id}-qa-revision-body`, revision.text, { left: 884, top: 402, width: 270, height: 40 }, { fontSize: 13, color: colors.muted });
    addLine(slide, `${deckSlide.id}-qa-feedback-down`, { left: 1168, top: 458, width: 0, height: 80 }, colors.accent2, 1);
    addLine(slide, `${deckSlide.id}-qa-feedback-return`, { left: 244, top: 538, width: 924, height: 0 }, colors.accent2, 1);
    addText(slide, `${deckSlide.id}-qa-feedback-label`, "RENDERED OUTPUT RETURNS TO ALL CHECKS", { left: 780, top: 546, width: 390, height: 14 }, { fontSize: 9, bold: true, color: colors.accent2, alignment: "right" });
    addText(slide, `${deckSlide.id}-flow-result-label`, content.takeaway?.label || "QUALITY LOOP", { left: 72, top: 592, width: 170, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
    addText(slide, `${deckSlide.id}-flow-result`, content.takeaway?.value || deckSlide.implication, { left: 252, top: 584, width: 920, height: 42 }, { fontSize: 19, bold: true, color: colors.foreground, lineSpacing: 1.08 });
    return;
  }
  if (dualOutput) {
    const shared = steps.slice(0, -1);
    const gate = steps.at(-1);
    const positions = [{ left: 72, top: 292 }, { left: 322, top: 292 }];
    for (const [index, step] of shared.entries()) {
      const position = positions[index] || { left: 72 + index * 250, top: 292 };
      addShape(slide, `${deckSlide.id}-dual-shared-${index + 1}`, "rect", { ...position, width: 218, height: 164 }, colors.surface, colors.accent, { lineWidth: 1 });
      addText(slide, `${deckSlide.id}-dual-shared-${index + 1}-metric`, step.metric || String(index + 1).padStart(2, "0"), { left: position.left + 20, top: position.top + 18, width: 48, height: 14 }, { fontSize: 9, bold: true, color: colors.accent });
      addText(slide, `${deckSlide.id}-dual-shared-${index + 1}-title`, step.title, { left: position.left + 20, top: position.top + 54, width: 178, height: 40 }, { fontSize: 22, bold: true, color: colors.foreground });
      addText(slide, `${deckSlide.id}-dual-shared-${index + 1}-body`, step.text, { left: position.left + 20, top: position.top + 104, width: 178, height: 46 }, { fontSize: 12, color: colors.muted });
      if (index > 0) addLine(slide, `${deckSlide.id}-dual-shared-link-${index}`, { left: position.left - 32, top: position.top + 82, width: 32, height: 0 }, colors.accent, 1);
    }
    addShape(slide, `${deckSlide.id}-dual-gate`, "rect", { left: 580, top: 292, width: 218, height: 164 }, colors.surface, colors.accent, { lineWidth: 2 });
    addText(slide, `${deckSlide.id}-dual-gate-label`, gate.metric || "03", { left: 602, top: 312, width: 48, height: 14 }, { fontSize: 9, bold: true, color: colors.accent });
    addText(slide, `${deckSlide.id}-dual-gate-title`, gate.title, { left: 602, top: 346, width: 174, height: 44 }, { fontSize: 23, bold: true, color: colors.foreground });
    addText(slide, `${deckSlide.id}-dual-gate-body`, gate.text, { left: 602, top: 402, width: 174, height: 40 }, { fontSize: 12, color: colors.muted });
    addLine(slide, `${deckSlide.id}-dual-branch-trunk`, { left: 798, top: 374, width: 38, height: 0 }, colors.border, 1);
    addLine(slide, `${deckSlide.id}-dual-branch-axis`, { left: 836, top: 309, width: 0, height: 168 }, colors.border, 1);
    addLine(slide, `${deckSlide.id}-dual-to-html`, { left: 836, top: 309, width: 38, height: 0 }, colors.accent, 1);
    addLine(slide, `${deckSlide.id}-dual-to-pptx`, { left: 836, top: 477, width: 38, height: 0 }, colors.accent2, 1);
    const outputs = [
      { left: 874, top: 246, label: "HTML", title: "浏览器演示", text: "动效、现场演示与快速迭代", color: colors.accent },
      { left: 874, top: 414, label: "PPTX", title: "原生可编辑交付", text: "办公修改、协作与归档", color: colors.accent2 },
    ];
    for (const [index, output] of outputs.entries()) {
      addShape(slide, `${deckSlide.id}-dual-output-${index + 1}`, "rect", { left: output.left, top: output.top, width: 314, height: 126 }, colors.surface, output.color, { lineWidth: 2 });
      addText(slide, `${deckSlide.id}-dual-output-${index + 1}-label`, output.label, { left: output.left + 22, top: output.top + 16, width: 74, height: 16 }, { fontSize: 10, bold: true, color: output.color });
      addText(slide, `${deckSlide.id}-dual-output-${index + 1}-title`, output.title, { left: output.left + 22, top: output.top + 46, width: 268, height: 30 }, { fontSize: 23, bold: true, color: colors.foreground });
      addText(slide, `${deckSlide.id}-dual-output-${index + 1}-body`, output.text, { left: output.left + 22, top: output.top + 86, width: 268, height: 24 }, { fontSize: 12, color: colors.muted });
    }
    addLine(slide, `${deckSlide.id}-dual-result-rule`, { left: 72, top: 570, width: 1136, height: 0 }, colors.border, 1);
    addText(slide, `${deckSlide.id}-dual-result-label`, content.takeaway?.label || "SHARED SEMANTICS", { left: 72, top: 594, width: 170, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
    addText(slide, `${deckSlide.id}-dual-result`, content.takeaway?.value || deckSlide.implication, { left: 252, top: 586, width: 920, height: 36 }, { fontSize: 19, bold: true, color: colors.foreground });
    return;
  }
  const count = Math.max(2, steps.length);
  const gap = 18;
  const width = (1136 - gap * (count - 1)) / count;
  const axisY = 382;
  addLine(slide, `${deckSlide.id}-flow-axis`, { left: 96, top: axisY, width: 1088, height: 0 }, colors.border, 2);
  for (const [index, step] of steps.entries()) {
    const left = 72 + index * (width + gap);
    const tone = toneColor(step.tone, colors);
    addText(slide, `${deckSlide.id}-flow-${index + 1}-metric`, step.metric || String(index + 1).padStart(2, "0"), { left, top: 252, width, height: 18 }, { fontSize: 11, bold: true, color: tone });
    addText(slide, `${deckSlide.id}-flow-${index + 1}-title`, step.title || "", { left, top: 296, width: width - 8, height: 68 }, { fontSize: titleFontSize(step.title, 25, 19), bold: true, color: colors.foreground, lineSpacing: 1.02 });
    addShape(slide, `${deckSlide.id}-flow-${index + 1}-dot`, "ellipse", { left: left + 2, top: axisY - 10, width: 20, height: 20 }, tone, colors.background, { lineWidth: 4 });
    addText(slide, `${deckSlide.id}-flow-${index + 1}-body`, step.text || "", { left, top: 424, width: width - 8, height: 86 }, { fontSize: 15, color: colors.muted, lineSpacing: 1.12 });
  }
  addLine(slide, `${deckSlide.id}-flow-result-rule`, { left: 72, top: 562, width: 1136, height: 0 }, colors.accent, 1);
  addText(slide, `${deckSlide.id}-flow-result-label`, content.takeaway?.label || "END STATE", { left: 72, top: 588, width: 170, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-flow-result`, content.takeaway?.value || deckSlide.implication, { left: 252, top: 580, width: 920, height: 42 }, { fontSize: 19, bold: true, color: colors.foreground, lineSpacing: 1.08 });
}

function renderMechanismTriptychSemantic(slide, deckSlide, colors, typography) {
  const content = semanticContent(deckSlide);
  const mechanisms = content.columns.length >= 3 ? content.columns.slice(0, 3) : content.steps.slice(0, 3).map((step) => ({ label: step.metric, headline: step.title, points: [step.text], tone: step.tone }));
  const fallback = (deckSlide.evidence || []).slice(0, 3).map((item, index) => ({ label: `MECHANISM ${index + 1}`, headline: item.claim_support, points: [item.interpretation], tone: index === 1 ? "coral" : "lime" }));
  const rows = mechanisms.length ? mechanisms : fallback;
  addLayoutHeading(slide, deckSlide, colors, typography, "PARALLEL MECHANISMS", 1080);
  addLine(slide, `${deckSlide.id}-mechanism-axis`, { left: 112, top: 374, width: 1054, height: 0 }, colors.border, 1);
  const width = 350;
  for (const [index, item] of rows.slice(0, 3).entries()) {
    const left = 72 + index * 382;
    const tone = toneColor(item.tone, colors);
    addShape(slide, `${deckSlide.id}-mechanism-${index + 1}-rule`, "rect", { left, top: 244 + (index === 1 ? -18 : 0), width, height: 4 }, tone, tone, { lineWidth: 0 });
    addShape(slide, `${deckSlide.id}-mechanism-${index + 1}-dot`, "ellipse", { left: left + 18, top: 363, width: 22, height: 22 }, tone, colors.background, { lineWidth: 5 });
    addText(slide, `${deckSlide.id}-mechanism-${index + 1}-label`, item.label || `MECHANISM ${index + 1}`, { left, top: 276 + (index === 1 ? -18 : 0), width: 300, height: 18 }, { fontSize: 11, bold: true, color: tone });
    addText(slide, `${deckSlide.id}-mechanism-${index + 1}-headline`, item.headline || "", { left, top: 316 + (index === 1 ? -18 : 0), width, height: 76 }, { fontSize: 28, bold: true, color: colors.foreground, lineSpacing: 1.02 });
    addText(slide, `${deckSlide.id}-mechanism-${index + 1}-body`, item.points?.[0] || "", { left, top: 424, width: 330, height: 72 }, { fontSize: 17, color: colors.muted, lineSpacing: 1.18 });
  }
  addText(slide, `${deckSlide.id}-mechanism-meaning-label`, "COMBINED EFFECT", { left: 72, top: 590, width: 160, height: 18 }, { fontSize: 11, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-mechanism-meaning`, deckSlide.implication, { left: 248, top: 580, width: 930, height: 36 }, { fontSize: 20, bold: true, color: colors.foreground });
}

function renderMetricTriadSemantic(slide, deckSlide, colors, typography) {
  const content = semanticContent(deckSlide);
  const metrics = content.metrics.length ? content.metrics : (deckSlide.evidence || []).slice(0, 3).map((item, index) => ({ label: item.evidence_ref || `METRIC ${index + 1}`, value: item.claim_support, meaning: item.interpretation }));
  addLayoutHeading(slide, deckSlide, colors, typography, "THE NUMBERS TO REMEMBER", 1080);
  const width = 350;
  for (const [index, metric] of metrics.slice(0, 3).entries()) {
    const left = 72 + index * 382;
    const tone = index === 1 ? colors.accent2 : colors.accent;
    addShape(slide, `${deckSlide.id}-metric-${index + 1}-rule`, "rect", { left, top: 244, width, height: 3 }, tone, tone, { lineWidth: 0 });
    addText(slide, `${deckSlide.id}-metric-${index + 1}-label`, metric.label || `METRIC ${index + 1}`, { left, top: 270, width, height: 18 }, { fontSize: 11, bold: true, color: tone });
    addText(slide, `${deckSlide.id}-metric-${index + 1}-value`, metric.value || "", { left, top: 332, width, height: 104 }, { fontSize: 48, bold: true, color: colors.foreground, lineSpacing: .9 });
    addText(slide, `${deckSlide.id}-metric-${index + 1}-meaning`, metric.meaning || "", { left, top: 466, width: 330, height: 70 }, { fontSize: 17, color: colors.muted, lineSpacing: 1.18 });
  }
  addLine(slide, `${deckSlide.id}-metrics-bottom-rule`, { left: 72, top: 574, width: 1136, height: 0 }, colors.border, 1);
  addText(slide, `${deckSlide.id}-metrics-implication`, deckSlide.implication, { left: 72, top: 594, width: 1100, height: 34 }, { fontSize: 20, bold: true, color: colors.foreground });
}

function renderAnswerBoundarySemantic(slide, deckSlide, colors, typography) {
  const content = semanticContent(deckSlide);
  const evidenceTable = deckSlide.elements.find((element) => element.kind === "table");
  const tableValues = (evidenceTable?.data?.values || []).slice(0, 5).map((row) => (row || []).slice(0, 5));
  const points = content.bodyPoints.length
    ? content.bodyPoints
    : content.columns.length
      ? content.columns.map((column, index) => ({ label: column.label || `IMPLICATION ${index + 1}`, text: column.headline }))
      : (deckSlide.evidence || []).slice(0, 3).map((item, index) => ({ label: `IMPLICATION ${index + 1}`, text: item.interpretation }));
  const showClaim = !textIsSimilar(content.title, deckSlide.primary_claim);
  addText(slide, `${deckSlide.id}-answer-kicker`, "THE ANSWER", { left: 72, top: 72, width: 240, height: 20 }, { fontSize: 12, bold: true, color: colors.accent });
  addText(slide, `${deckSlide.id}-answer-title`, content.title, { left: 72, top: 128, width: 680, height: evidenceTable ? 116 : showClaim ? 190 : 300 }, { fontSize: titleFontSize(content.title, evidenceTable ? 38 : 48, 31), bold: true, color: colors.foreground, lineSpacing: .94 });
  if (showClaim) addText(slide, `${deckSlide.id}-answer-claim`, deckSlide.primary_claim, { left: 72, top: evidenceTable ? 254 : 344, width: 660, height: evidenceTable ? 54 : 112 }, { fontSize: titleFontSize(deckSlide.primary_claim, evidenceTable ? 17 : 22, 15), color: colors.muted, lineSpacing: 1.14 });
  if (evidenceTable && tableValues.length) {
    const table = slide.tables.add({ rows: tableValues.length, columns: tableValues[0].length, left: 72, top: 326, width: 660, height: 194, values: tableValues });
    styleNativeTable(table, tableValues, colors, { ...typography, body_font: typography.body_font }, "blueprint");
  }
  for (const [index, point] of points.slice(0, 3).entries()) {
    addText(slide, `${deckSlide.id}-answer-point-${index + 1}-label`, point.label || `POINT ${index + 1}`, { left: 790, top: 142 + index * 126, width: 170, height: 18 }, { fontSize: 10, bold: true, color: index === 2 ? colors.accent2 : colors.accent });
    addText(slide, `${deckSlide.id}-answer-point-${index + 1}`, point.text || "", { left: 790, top: 176 + index * 126, width: 390, height: 70 }, { fontSize: 19, bold: true, color: colors.foreground, lineSpacing: 1.12 });
    if (index < 2) addLine(slide, `${deckSlide.id}-answer-point-${index + 1}-rule`, { left: 790, top: 256 + index * 126, width: 390, height: 0 }, colors.border, 1);
  }
  addLine(slide, `${deckSlide.id}-boundary-rule`, { left: 72, top: 562, width: 1136, height: 0 }, colors.accent2, 2);
  addText(slide, `${deckSlide.id}-boundary-label`, content.takeaway?.label || "BOUNDARY", { left: 72, top: 590, width: 160, height: 18 }, { fontSize: 11, bold: true, color: colors.accent2 });
  const boundaryText = content.takeaway?.value || deckSlide.implication;
  addText(slide, `${deckSlide.id}-boundary`, boundaryText, { left: 250, top: 578, width: 930, height: 46 }, { fontSize: [...String(boundaryText)].length > 40 ? 16 : 19, bold: true, color: colors.foreground, lineSpacing: 1.05 });
}

function chartData(element) {
  const data = element?.data || {};
  const categories = (data.categories || []).map(String);
  const series = (data.series || []).map((item) => ({ name: String(item.name || "Paper values"), values: (item.values || []).map(Number).filter(Number.isFinite) }));
  if (!categories.length || !series.length || !series[0].values.length) return null;
  return { categories, series };
}

async function renderDataSlide(slide, deckSlide, colors, typography, assetRoot, profile = "default") {
  const title = elementByRole(deckSlide, "title")?.text || deckSlide.primary_claim;
  const isThemeReference = deckSlide.role === "theme_reference";
  addText(slide, `${deckSlide.id}-kicker`, isThemeReference ? "VISUAL CONTRACT" : "PAPER EVIDENCE", { left: 72, top: 76, width: 360, height: 22 }, { fontSize: 13, bold: true, color: colors.accent });
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
      const table = slide.tables.add({ rows, columns, left: chartElement ? 880 : 92, top: 236, width: chartElement ? 328 : isThemeReference ? 760 : 1040, height: 350, values });
      styleNativeTable(table, values, colors, typography, profile);
    }
  }
  addText(slide, `${deckSlide.id}-caption`, tableElement?.data?.caption || chartElement?.data?.table_ref || "Source table from paper", { left: 92, top: 210, width: 760, height: 16 }, { fontSize: 11, color: colors.muted });
  await addEvidenceImages(slide, deckSlide, assetRoot, isThemeReference ? { prominent: true } : { sourceStrip: true });
  if (!isThemeReference) {
    const takeaway = deckSlide.content?.takeaway;
    addLine(slide, `${deckSlide.id}-data-takeaway-rule`, { left: 92, top: 608, width: 1040, height: 0 }, colors.border, 1);
    addText(slide, `${deckSlide.id}-data-takeaway-label`, takeaway?.label || "READOUT", { left: 92, top: 626, width: 150, height: 16 }, { fontSize: 10, bold: true, color: colors.accent });
    addText(slide, `${deckSlide.id}-data-takeaway`, takeaway?.value || deckSlide.implication, { left: 254, top: 620, width: 878, height: 30 }, { fontSize: 16, bold: true, color: colors.foreground, lineSpacing: 1.06 });
  }
}

export async function renderPptx({ spec, outPath, previewDir, assetRoot: assetRootOverride = null }) {
  await ensureDir(path.dirname(outPath));
  await ensureDir(previewDir);
  const presentation = Presentation.create({ slideSize: SIZE });
  const colors = spec.theme.colors;
  const typography = spec.theme.typography;
  const profile = visualProfile(spec.theme);
  const assetRoot = assetRootOverride ? path.resolve(assetRootOverride) : path.dirname(outPath);
  const objectSummary = [];
  for (const [index, deckSlide] of spec.slides.entries()) {
    const slide = presentation.slides.add();
    commonChrome(slide, index, spec.slides.length, spec.theme, deckSlide);
    const hasDataVisual = deckSlide.elements.some((element) => element.kind === "table" || element.kind === "chart");
    if (deckSlide.composition_id === "argument-pair") renderArgumentPairSemantic(slide, deckSlide, colors, typography);
    else if (deckSlide.composition_id === "mechanism-triptych") renderMechanismTriptychSemantic(slide, deckSlide, colors, typography);
    else if (deckSlide.composition_id === "metric-triad") renderMetricTriadSemantic(slide, deckSlide, colors, typography);
    else if (deckSlide.composition_id === "answer-and-boundary") renderAnswerBoundarySemantic(slide, deckSlide, colors, typography);
    else if (deckSlide.composition_id === "image-thesis-split") await renderImageThesisSplitSemantic(slide, deckSlide, colors, typography, assetRoot, profile);
    else if (deckSlide.composition_id === "causal-flow") renderCausalFlowSemantic(slide, deckSlide, colors, typography);
    else if (deckSlide.composition_id === "chart-with-interpretation-rail") {
      const semantic = semanticContent(deckSlide);
      if (hasDataVisual) await renderChartFocusSlide(slide, deckSlide, colors, typography, assetRoot, profile);
      else if (semantic.metrics.length >= 2) renderMetricTriadSemantic(slide, deckSlide, colors, typography);
      else renderArgumentPairSemantic(slide, deckSlide, colors, typography);
    }
    else if (deckSlide.composition_id === "evidence-table") await renderDataSlide(slide, deckSlide, colors, typography, assetRoot, profile);
    else if (deckSlide.composition_id === "evidence-collage") await renderEvidenceCollageSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "hero-image") await renderHeroImageSlide(slide, deckSlide, colors, typography, assetRoot, profile);
    else if (deckSlide.layout === "metric-stage") renderMetricStageSlide(slide, deckSlide, colors, typography);
    else if (deckSlide.layout === "story-split") await renderStorySplitSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "chart-focus") await renderChartFocusSlide(slide, deckSlide, colors, typography, assetRoot, profile);
    else if (hasDataVisual) await renderDataSlide(slide, deckSlide, colors, typography, assetRoot, profile);
    else if (deckSlide.layout === "matrix") renderMatrixSlide(slide, deckSlide, colors, typography);
    else if (deckSlide.layout === "timeline") await renderTimelineSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "evidence-collage") await renderEvidenceCollageSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "title") renderTitleSlide(slide, deckSlide, colors, typography, profile);
    else if (deckSlide.layout === "pipeline") await renderPipelineSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "comparison") await renderComparisonSlide(slide, deckSlide, colors, typography, assetRoot);
    else if (deckSlide.layout === "insight") await renderInsightSlide(slide, deckSlide, colors, typography, assetRoot);
    const notes = deckSlide.speaker_notes || { talk_track: deckSlide.speaker_note || "", delivery_cue: "", source_refs: [] };
    slide.speakerNotes.textFrame.setText([
      notes.talk_track || "",
      notes.delivery_cue ? `讲述提示：${notes.delivery_cue}` : "",
      (notes.source_refs || []).length ? `[Sources] ${notes.source_refs.join(" · ")}` : "",
    ].filter(Boolean));
    slide.speakerNotes.setVisible(true);
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
