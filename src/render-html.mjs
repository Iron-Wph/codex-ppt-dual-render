import { escapeHtml, writeText } from "./utils.mjs";

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function findElement(slide, role) {
  return slide.elements.find((element) => element.role === role);
}

function renderEvidenceFigures(slide, { className = "evidence-figure", limit = 1 } = {}) {
  return slide.elements.filter((element) => element.role === "evidence-figure" && element.data?.path).slice(0, limit).map((element) => {
    const data = element.data;
    const imageClass = data.crop ? "evidence-image crop" : "evidence-image";
    return `<figure class="${escapeHtml(className)}" data-asset-ref="${escapeHtml(element.asset_ref || "")}" data-image-role="${escapeHtml(data.visual_role || "evidence")}"><img class="${imageClass}" src="${escapeHtml(data.path)}" alt="${escapeHtml(element.alt_text || data.caption || "论文证据图片")}"><figcaption>${escapeHtml(data.caption || "论文证据图片")}</figcaption></figure>`;
  }).join("");
}

function renderEvidenceFigure(slide) {
  return renderEvidenceFigures(slide);
}

function renderTitleSlide(slide) {
  const eyebrow = findElement(slide, "eyebrow")?.text || "CODEX / PRESENTATION MVP";
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const subtitle = findElement(slide, "subtitle")?.text || "";
  const note = findElement(slide, "hero-note")?.data || {};
  return `
    <div class="title-layout">
      <div class="title-copy">
        <div class="eyebrow reveal">${escapeHtml(eyebrow)}</div>
        <h1 class="display-title reveal">${escapeHtml(title)}</h1>
        <p class="title-subtitle reveal">${escapeHtml(subtitle)}</p>
      </div>
      <div class="hero-orbit reveal" aria-label="双渲染概念图">
        <div class="orbit-ring ring-a"></div>
        <div class="orbit-ring ring-b"></div>
        <div class="orbit-node node-html">HTML</div>
        <div class="orbit-node node-pptx">PPTX</div>
        <div class="orbit-core">SPEC</div>
      </div>
      <div class="hero-note reveal">
        <span>${escapeHtml(note.label || "THE CORE MOVE")}</span>
        <strong>${escapeHtml(note.value || "STRUCTURE ONCE → RENDER TWICE")}</strong>
      </div>
    </div>`;
}

function renderPipelineSlide(slide) {
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const kicker = findElement(slide, "kicker")?.text || "THE PIPELINE";
  const steps = slide.elements.filter((element) => element.role === "step");
  const result = findElement(slide, "result")?.data || {};
  const stepMarkup = steps.map((step, index) => {
    const data = step.data || {};
    return `
      <article class="pipeline-step tone-${escapeHtml(data.tone || "lime")} reveal" data-step="${index + 1}">
        <div class="step-top"><span class="step-number">${escapeHtml(data.metric || String(index + 1).padStart(2, "0"))}</span><span class="step-index">${String(index + 1).padStart(2, "0")}</span></div>
        <h3>${escapeHtml(data.title || "Step")}</h3>
        <p>${escapeHtml(data.text || "")}</p>
      </article>`;
  }).join("");
  return `
    <div class="content-layout pipeline-layout">
      <div class="slide-heading reveal"><div class="eyebrow">${escapeHtml(kicker)}</div><h2>${escapeHtml(title)}</h2></div>
      ${renderEvidenceFigure(slide)}
      <div class="pipeline-track" aria-label="流程步骤">
        <div class="pipeline-line" aria-hidden="true"></div>
        ${stepMarkup}
      </div>
      <div class="result-bar reveal"><span>${escapeHtml(result.label || "RESULT")}</span><strong>${escapeHtml(result.value || "可交付结果")}</strong><i aria-hidden="true">↗</i></div>
    </div>`;
}

function renderComparisonSlide(slide) {
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const columns = slide.elements.filter((element) => element.role === "comparison-column");
  const takeaway = findElement(slide, "takeaway")?.data || {};
  const columnMarkup = columns.map((column) => {
    const data = column.data || {};
    const points = (data.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("");
    return `
      <article class="comparison-column tone-${escapeHtml(data.tone || "lime")} reveal">
        <div class="column-label">${escapeHtml(data.label || "OUTPUT")}</div>
        <h3>${escapeHtml(data.headline || "Output")}</h3>
        <ul>${points}</ul>
        <div class="column-arrow" aria-hidden="true">↗</div>
      </article>`;
  }).join("");
  return `
    <div class="content-layout comparison-layout">
      <div class="slide-heading reveal"><div class="eyebrow">DUAL OUTPUT</div><h2>${escapeHtml(title)}</h2></div>
      ${renderEvidenceFigure(slide)}
      <div class="comparison-grid">${columnMarkup}</div>
      <div class="takeaway reveal"><span>${escapeHtml(takeaway.label || "SHARED SPEC")}</span><strong>${escapeHtml(takeaway.value || "结构只维护一份")}</strong></div>
    </div>`;
}

function renderInsightSlide(slide) {
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const blocks = slide.elements.filter((element) => element.role === "insight-block");
  const takeaway = findElement(slide, "takeaway")?.data || {};
  const hero = blocks[0]?.data || {};
  const secondary = blocks.slice(1).map((block) => {
    const data = block.data || {};
    const points = (data.points || []).map((point) => `<li>${escapeHtml(point)}</li>`).join("");
    return `<article class="insight-secondary tone-${escapeHtml(data.tone || "coral")} reveal"><div class="column-label">${escapeHtml(data.label || "BOUNDARY")}</div><h3>${escapeHtml(data.headline || "Insight")}</h3><ul>${points}</ul></article>`;
  }).join("");
  return `
    <div class="content-layout insight-layout">
      <div class="slide-heading reveal"><div class="eyebrow">INSIGHT / BOUNDARY</div><h2>${escapeHtml(title)}</h2></div>
      ${renderEvidenceFigure(slide)}
      <div class="insight-grid">
        <article class="insight-hero tone-${escapeHtml(hero.tone || "lime")} reveal"><div class="column-label">${escapeHtml(hero.label || "KEY INSIGHT")}</div><h3>${escapeHtml(hero.headline || "Insight")}</h3><p>${escapeHtml(hero.points?.[0] || slide.primary_claim)}</p></article>
        <div class="insight-stack">${secondary}</div>
      </div>
      <div class="takeaway reveal"><span>${escapeHtml(takeaway.label || "TAKEAWAY")}</span><strong>${escapeHtml(takeaway.value || "从证据中提炼可执行结论")}</strong></div>
    </div>`;
}

function renderDataSlide(slide) {
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const tables = slide.elements.filter((element) => element.kind === "table");
  const charts = slide.elements.filter((element) => element.kind === "chart");
  const tableMarkup = tables.map((element) => {
    const values = element.data?.values || [];
    const rows = values.map((row, rowIndex) => row.map((cell) => {
      const tag = rowIndex === 0 ? "th" : "td";
      return `<${tag}>${escapeHtml(cell)}</${tag}>`;
    }).join("")).map((row) => `<tr>${row}</tr>`).join("");
    return `<div class="table-card"><table aria-label="${escapeHtml(element.data?.caption || "Paper evidence table")}"><tbody>${rows}</tbody></table><div class="visual-caption">${escapeHtml(element.data?.caption || "Native editable table")}</div></div>`;
  }).join("");
  const chartMarkup = charts.map((element) => {
    const data = element.data || {};
    const categories = data.categories || [];
    const series = data.series || [];
    const values = series[0]?.values || [];
    const max = Math.max(1, ...values.map((value) => Math.abs(Number(value) || 0)));
    const bars = categories.map((category, index) => {
      const value = Number(values[index] || 0);
      const width = Math.max(3, Math.round(Math.abs(value) / max * 100));
      return `<div class="bar-row"><span>${escapeHtml(category)}</span><div class="bar-track"><i style="width:${width}%"></i></div><b>${escapeHtml(String(value))}</b></div>`;
    }).join("");
    return `<div class="chart-card"><div class="chart-label">${escapeHtml(series[0]?.name || "Paper values")}</div>${bars}</div>`;
  }).join("");
  return `
    <div class="content-layout paper-data-layout">
      <div class="slide-heading reveal"><div class="eyebrow">PAPER EVIDENCE</div><h2>${escapeHtml(title)}</h2></div>
      ${renderEvidenceFigure(slide)}
      <div class="data-visual-grid reveal">${chartMarkup}${tableMarkup}</div>
      <div class="takeaway reveal"><span>EDITABLE EVIDENCE</span><strong>原始表格进入 native table，数值结果进入 native chart</strong></div>
    </div>`;
}

function visualHeading(slide, kicker) {
  const title = findElement(slide, "title")?.text || slide.primary_claim;
  const actualKicker = findElement(slide, "kicker")?.text || kicker;
  return `<div class="slide-heading reveal"><div class="eyebrow">${escapeHtml(actualKicker)}</div><h2>${escapeHtml(title)}</h2></div>`;
}

function pointsMarkup(points = []) {
  return points.slice(0, 3).map((point) => `<li>${escapeHtml(point)}</li>`).join("");
}

function renderHeroImageSlide(slide) {
  const subtitle = findElement(slide, "subtitle")?.text || "";
  const note = findElement(slide, "hero-note")?.data || {};
  const media = renderEvidenceFigures(slide, { className: "hero-media-figure", limit: 1 }) || `<div class="hero-media-placeholder"><span>VISUAL</span><strong>${escapeHtml(slide.primary_claim)}</strong></div>`;
  return `<div class="content-layout hero-image-layout">
    <div class="hero-image-copy reveal"><div class="eyebrow">${escapeHtml(findElement(slide, "eyebrow")?.text || "RESEARCH BRIEF")}</div><h1>${escapeHtml(findElement(slide, "title")?.text || slide.primary_claim)}</h1><p>${escapeHtml(subtitle)}</p></div>
    <div class="hero-media reveal">${media}</div>
    <div class="hero-image-note reveal"><span>${escapeHtml(note.label || "CORE CLAIM")}</span><strong>${escapeHtml(note.value || slide.primary_claim)}</strong></div>
  </div>`;
}

function renderMetricStageSlide(slide) {
  const metric = findElement(slide, "metric-stage")?.data || {};
  return `<div class="content-layout metric-stage-layout">
    ${visualHeading(slide, "KEY CONTRIBUTION")}
    <div class="metric-stage-card reveal tone-${escapeHtml(metric.tone || "lime")}"><span>${escapeHtml(metric.label || "KEY MOVE")}</span><strong>${escapeHtml(metric.value || "01")}</strong><p>${escapeHtml(metric.detail || slide.primary_claim)}</p></div>
    <div class="metric-stage-orbit" aria-hidden="true"><i></i><i></i><b>+</b></div>
  </div>`;
}

function renderStorySplitSlide(slide) {
  const primary = findElement(slide, "story-primary")?.data || {};
  const support = findElement(slide, "story-support")?.data || {};
  const media = renderEvidenceFigures(slide, { className: "story-media-figure", limit: 1 });
  return `<div class="content-layout story-split-layout">
    ${visualHeading(slide, "THE STORY")}
    <div class="story-split-grid">
      <article class="story-primary reveal tone-${escapeHtml(primary.tone || "lime")}"><div class="column-label">${escapeHtml(primary.label || "CONTEXT")}</div><h3>${escapeHtml(primary.headline || slide.primary_claim)}</h3><ul>${pointsMarkup(primary.points)}</ul></article>
      <article class="story-support reveal tone-${escapeHtml(support.tone || "coral")}"><div class="column-label">${escapeHtml(support.label || "IMPLICATION")}</div><h3>${escapeHtml(support.headline || "Evidence and implication")}</h3><ul>${pointsMarkup(support.points)}</ul></article>
      <div class="story-media reveal">${media || `<div class="story-media-placeholder">${escapeHtml(slide.primary_claim)}</div>`}</div>
    </div>
  </div>`;
}

function renderChartMarkup(slide) {
  const charts = slide.elements.filter((element) => element.kind === "chart");
  return charts.map((element) => {
    const data = element.data || {};
    const categories = data.categories || [];
    const values = data.series?.[0]?.values || [];
    const max = Math.max(1, ...values.map((value) => Math.abs(Number(value) || 0)));
    const bars = categories.map((category, index) => `<div class="bar-row"><span>${escapeHtml(category)}</span><div class="bar-track"><i style="width:${Math.max(3, Math.round(Math.abs(Number(values[index]) || 0) / max * 100))}%"></i></div><b>${escapeHtml(String(values[index] ?? ""))}</b></div>`).join("");
    return `<div class="chart-card"><div class="chart-label">${escapeHtml(data.series?.[0]?.name || "Paper values")}</div>${bars}</div>`;
  }).join("");
}

function renderChartFocusSlide(slide) {
  const callout = findElement(slide, "result-callout")?.data || {};
  const tables = slide.elements.filter((element) => element.kind === "table");
  const tableMarkup = tables.map((element) => `<div class="chart-table-caption">${escapeHtml(element.data?.caption || "Native editable table")}</div>`).join("");
  const visual = renderChartMarkup(slide) || tableMarkup || `<div class="chart-empty">等待结构化表格或图表证据</div>`;
  const media = renderEvidenceFigures(slide, { className: "chart-media-figure", limit: 1 });
  return `<div class="content-layout chart-focus-layout">
    ${visualHeading(slide, "RESULT FOCUS")}
    <div class="chart-focus-grid"><div class="chart-focus-visual reveal">${visual}</div><aside class="chart-callout reveal tone-${escapeHtml(callout.tone || "lime")}"><span>${escapeHtml(callout.label || "KEY RESULT")}</span><strong>${escapeHtml(callout.value || slide.primary_claim)}</strong><p>${escapeHtml(callout.detail || "")}</p>${media}</aside></div>
  </div>`;
}

function renderMatrixSlide(slide) {
  const cells = slide.elements.filter((element) => element.role === "matrix-cell");
  return `<div class="content-layout matrix-layout">
    ${visualHeading(slide, "DECISION MATRIX")}
    <div class="matrix-grid">${cells.map((cell) => `<article class="matrix-cell reveal tone-${escapeHtml(cell.data?.tone || "lime")}"><span>${escapeHtml(cell.data?.title || "POINT")}</span><strong>${escapeHtml(cell.data?.text || slide.primary_claim)}</strong></article>`).join("")}</div>
  </div>`;
}

function renderTimelineSlide(slide) {
  const nodes = slide.elements.filter((element) => element.role === "timeline-node");
  return `<div class="content-layout timeline-layout">
    ${visualHeading(slide, "METHOD TIMELINE")}
    <div class="timeline-track">${nodes.map((node, index) => `<article class="timeline-node reveal tone-${escapeHtml(node.data?.tone || "lime")}"><span>${escapeHtml(node.data?.metric || String(index + 1).padStart(2, "0"))}</span><h3>${escapeHtml(node.data?.title || "Step")}</h3><p>${escapeHtml(node.data?.text || "")}</p></article>`).join("")}</div>
  </div>`;
}

function renderEvidenceCollageSlide(slide) {
  const takeaway = findElement(slide, "collage-takeaway")?.data || {};
  const images = renderEvidenceFigures(slide, { className: "collage-figure", limit: 3 });
  return `<div class="content-layout evidence-collage-layout">
    ${visualHeading(slide, "EVIDENCE COLLAGE")}
    <div class="collage-grid reveal">${images || `<div class="collage-empty">本页保留给关键论文证据拼贴</div>`}</div>
    <div class="collage-takeaway reveal"><span>${escapeHtml(takeaway.label || "READOUT")}</span><strong>${escapeHtml(takeaway.value || slide.primary_claim)}</strong></div>
  </div>`;
}

function renderSlide(slide, index, total) {
  let body;
  if (slide.layout === "hero-image") body = renderHeroImageSlide(slide);
  else if (slide.layout === "metric-stage") body = renderMetricStageSlide(slide);
  else if (slide.layout === "story-split") body = renderStorySplitSlide(slide);
  else if (slide.layout === "chart-focus") body = renderChartFocusSlide(slide);
  else if (slide.layout === "matrix") body = renderMatrixSlide(slide);
  else if (slide.layout === "timeline") body = renderTimelineSlide(slide);
  else if (slide.layout === "evidence-collage") body = renderEvidenceCollageSlide(slide);
  else if (slide.elements.some((element) => element.kind === "table" || element.kind === "chart")) body = renderDataSlide(slide);
  else if (slide.layout === "title") body = renderTitleSlide(slide);
  else if (slide.layout === "pipeline") body = renderPipelineSlide(slide);
  else if (slide.layout === "comparison") body = renderComparisonSlide(slide);
  else if (slide.layout === "insight") body = renderInsightSlide(slide);
  else body = `<div class="content-layout"><div class="slide-heading"><h2>${escapeHtml(slide.primary_claim)}</h2></div></div>`;
  return `<section class="slide slide-${escapeHtml(slide.layout)}" id="${escapeHtml(slide.id)}" data-slide-index="${index}" data-slide-role="${escapeHtml(slide.role || "")}" aria-labelledby="${escapeHtml(slide.id)}-label">
      <div class="slide-grid" aria-hidden="true"></div>
      <div class="slide-id">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>
      <div class="slide-surface">${body}</div>
      <span class="sr-only" id="${escapeHtml(slide.id)}-label">${escapeHtml(slide.primary_claim)}</span>
    </section>`;
}

function htmlDocument(spec) {
  const theme = spec.theme;
  const slides = spec.slides.map((slide, index) => renderSlide(slide, index, spec.slides.length)).join("\n");
  const themeJson = safeJson(theme);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(spec.deck.title)}</title>
  <style>
    :root {
      --bg: ${theme.colors.background};
      --surface: ${theme.colors.surface};
      --surface-2: ${theme.colors.surface2};
      --fg: ${theme.colors.foreground};
      --muted: ${theme.colors.muted};
      --lime: ${theme.colors.accent};
      --coral: ${theme.colors.accent2};
      --mint: ${theme.colors.accent3};
      --border: ${theme.colors.border};
      --black: ${theme.colors.black};
      --heading: ${JSON.stringify(theme.fonts.heading.join(", "))};
      --body: ${JSON.stringify(theme.fonts.body.join(", "))};
      --mono: ${JSON.stringify(theme.fonts.mono.join(", "))};
      --ease: cubic-bezier(.16,1,.3,1);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--fg); }
    body { font-family: var(--body); overflow: hidden; }
    button { font: inherit; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .deck { width: 100vw; height: 100vh; position: relative; background: var(--bg); }
    .slide { position: absolute; inset: 0; display: none; overflow: hidden; background: var(--bg); }
    .slide.is-active { display: block; }
    .slide::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 78% 20%, rgba(216,255,90,.10), transparent 30%), radial-gradient(circle at 10% 90%, rgba(255,119,87,.08), transparent 35%); pointer-events: none; }
    .slide-grid { position: absolute; inset: 0; opacity: .24; background-image: linear-gradient(rgba(241,243,233,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(241,243,233,.08) 1px, transparent 1px); background-size: 72px 72px; mask-image: linear-gradient(to bottom, rgba(0,0,0,.75), transparent 86%); pointer-events: none; }
    .slide-surface { position: relative; width: 100%; height: 100%; padding: 7.2vh 7.2vw 6vh; }
    .slide-id { position: absolute; right: 3vw; bottom: 3.3vh; color: var(--muted); font: 12px var(--mono); letter-spacing: .18em; z-index: 3; }
    .title-layout, .content-layout { position: relative; width: 100%; height: 100%; }
    .title-layout { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(330px, .98fr); grid-template-rows: 1fr auto; column-gap: 3vw; align-items: center; }
    .title-copy { align-self: center; max-width: 690px; }
    .eyebrow, .column-label, .hero-note span, .result-bar span, .takeaway span { color: var(--lime); font: 700 12px var(--mono); letter-spacing: .18em; text-transform: uppercase; }
    .eyebrow { margin-bottom: 2.4vh; }
    .display-title { max-width: 680px; margin: 0; font: 800 clamp(52px, 6.3vw, 94px)/.98 var(--heading); letter-spacing: -.065em; text-wrap: balance; }
    .title-subtitle { max-width: 500px; margin: 3.6vh 0 0; color: var(--muted); font-size: clamp(18px, 1.6vw, 25px); line-height: 1.35; }
    .hero-orbit { position: relative; width: min(38vw, 510px); aspect-ratio: 1; justify-self: center; align-self: center; }
    .orbit-ring { position: absolute; inset: 8%; border: 1px solid rgba(216,255,90,.28); border-radius: 50%; transform: rotate(-25deg); }
    .ring-b { inset: 19%; border-color: rgba(255,119,87,.26); transform: rotate(35deg) scaleX(1.42); }
    .orbit-core, .orbit-node { position: absolute; display: grid; place-items: center; border-radius: 50%; font: 700 15px var(--mono); letter-spacing: .08em; }
    .orbit-core { inset: 34%; background: var(--lime); color: var(--black); box-shadow: 0 0 80px rgba(216,255,90,.20); }
    .orbit-node { width: 90px; height: 90px; border: 1px solid var(--border); background: rgba(24,29,26,.86); color: var(--fg); }
    .node-html { top: 7%; right: 3%; color: var(--coral); }
    .node-pptx { left: 2%; bottom: 9%; color: var(--mint); }
    .hero-note { grid-column: 1 / -1; display: flex; align-items: center; gap: 18px; border-top: 1px solid var(--border); padding-top: 2.2vh; }
    .hero-note strong { font: 700 17px var(--mono); letter-spacing: .04em; }
    .slide-heading { max-width: 820px; }
    .pipeline-layout .slide-heading { max-width: 760px; }
    .evidence-figure { position: absolute; top: -1.2vh; right: 0; z-index: 2; width: 178px; height: 112px; margin: 0; padding: 7px; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 16px 36px rgba(0,0,0,.14); }
    .evidence-figure img { display: block; width: 100%; height: 78px; object-fit: cover; background: var(--surface-2); }
    .evidence-figure figcaption { overflow: hidden; margin-top: 5px; color: var(--muted); font: 9px/1.1 var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .comparison-layout:has(.evidence-figure) .evidence-figure { top: 21vh; right: 0; width: 300px; height: 250px; }
    .comparison-layout:has(.evidence-figure) .evidence-figure img { height: 216px; object-fit: contain; }
    .comparison-layout:has(.evidence-figure) .comparison-grid { width: calc(100% - 22vw); }
    .insight-layout:has(.evidence-figure) .evidence-figure { top: 21vh; right: 0; width: 300px; height: 250px; }
    .insight-layout:has(.evidence-figure) .evidence-figure img { height: 216px; object-fit: contain; }
    .insight-layout:has(.evidence-figure) .insight-grid { width: calc(100% - 22vw); grid-template-columns: minmax(0, 1fr); }
    .slide-heading h2 { margin: 0; font: 700 clamp(34px, 4vw, 56px)/1.02 var(--heading); letter-spacing: -.055em; text-wrap: balance; }
    .pipeline-layout, .comparison-layout { display: flex; flex-direction: column; justify-content: space-between; gap: 4vh; }
    .pipeline-track { position: relative; flex: 1; min-height: 260px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: center; gap: 1.2vw; }
    .pipeline-line { position: absolute; left: 7%; right: 7%; top: 50%; height: 1px; background: linear-gradient(90deg, transparent, var(--border) 10%, var(--border) 90%, transparent); }
    .pipeline-step { position: relative; min-height: 230px; padding: 22px 22px 24px; border: 1px solid var(--border); background: linear-gradient(155deg, rgba(32,39,33,.97), rgba(24,29,26,.78)); clip-path: polygon(0 0, 90% 0, 100% 12%, 100% 100%, 0 100%); transition: transform .55s var(--ease), border-color .55s var(--ease), background .55s var(--ease); }
    .pipeline-step:hover { transform: translateY(-8px); border-color: var(--lime); }
    .pipeline-step::after { content: ""; position: absolute; right: 0; top: 0; width: 26px; height: 26px; border-left: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .tone-coral .step-number, .tone-coral .column-label { color: var(--coral); }
    .tone-lime .step-number, .tone-lime .column-label { color: var(--lime); }
    .step-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7vh; }
    .step-number { font: 700 15px var(--mono); }
    .step-index { color: var(--muted); font: 12px var(--mono); letter-spacing: .12em; }
    .pipeline-step h3 { margin: 0 0 10px; font: 700 clamp(22px, 2vw, 29px) var(--heading); }
    .pipeline-step p { max-width: 190px; margin: 0; color: var(--muted); font-size: clamp(14px, 1.15vw, 17px); line-height: 1.32; }
    .result-bar, .takeaway { display: flex; align-items: center; gap: 20px; min-height: 60px; padding: 16px 20px; border: 1px solid var(--border); background: rgba(24,29,26,.8); }
    .result-bar strong, .takeaway strong { font: 700 18px var(--heading); }
    .result-bar i { margin-left: auto; color: var(--lime); font: 28px var(--heading); font-style: normal; }
    .comparison-grid { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.8vw; align-items: stretch; }
    .comparison-column { position: relative; padding: 28px 30px 34px; border: 1px solid var(--border); background: var(--surface); overflow: hidden; }
    .comparison-column::before { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: var(--lime); }
    .comparison-column.tone-coral::before { background: var(--coral); }
    .comparison-column h3 { margin: 3.7vh 0 2.2vh; min-height: 2.1em; font: 700 clamp(26px, 2.7vw, 38px) var(--heading); line-height: 1.02; letter-spacing: -.04em; }
    .comparison-column ul { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: clamp(15px, 1.2vw, 18px); line-height: 1.32; }
    .comparison-column li { position: relative; padding-left: 25px; }
    .comparison-column li::before { content: "↗"; position: absolute; left: 0; color: var(--lime); }
    .tone-coral li::before { color: var(--coral); }
    .column-arrow { position: absolute; right: 24px; bottom: 18px; color: var(--border); font: 52px var(--heading); }
    .takeaway { justify-content: flex-start; }
    .takeaway strong { max-width: 800px; }
    .insight-grid { flex: 1; display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, .88fr); gap: 1.8vw; min-height: 280px; }
    .insight-hero, .insight-secondary { position: relative; overflow: hidden; border: 1px solid var(--border); background: var(--surface); }
    .insight-hero { display: flex; flex-direction: column; justify-content: flex-end; padding: 32px; }
    .insight-hero::before { content: ""; position: absolute; inset: auto 0 0; height: 42%; background: linear-gradient(transparent, rgba(22,100,216,.15)); pointer-events: none; }
    .insight-hero h3 { position: relative; max-width: 520px; margin: 20px 0 12px; font: 800 clamp(32px, 3.4vw, 54px)/1.02 var(--heading); letter-spacing: -.05em; }
    .insight-hero p { position: relative; max-width: 600px; margin: 0; color: var(--muted); font-size: clamp(15px, 1.2vw, 18px); line-height: 1.35; }
    .insight-stack { display: grid; gap: 16px; }
    .insight-secondary { padding: 26px 28px; }
    .insight-secondary h3 { margin: 16px 0 18px; font: 700 clamp(24px, 2.2vw, 34px)/1.02 var(--heading); letter-spacing: -.04em; }
    .insight-secondary ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: 15px; line-height: 1.3; }
    .insight-secondary li { position: relative; padding-left: 22px; }
    .insight-secondary li::before { content: "↗"; position: absolute; left: 0; color: var(--coral); }
    .paper-data-layout { display: flex; flex-direction: column; gap: 3vh; }
    .paper-data-layout .slide-heading { max-width: calc(100% - 25vw); }
    .paper-data-layout .evidence-figure { top: 3vh; width: 22vw; height: 10vh; }
    .paper-data-layout .evidence-figure img { height: 6.7vh; object-fit: contain; }
    .slide[data-slide-role="theme_reference"] .paper-data-layout .slide-heading { max-width: calc(100% - 26vw); }
    .slide[data-slide-role="theme_reference"] .paper-data-layout .evidence-figure { top: 18vh; width: 22vw; height: 34vh; }
    .slide[data-slide-role="theme_reference"] .paper-data-layout .evidence-figure img { height: 29vh; object-fit: contain; }
    .slide[data-slide-role="theme_reference"] .data-visual-grid { width: calc(100% - 26vw); grid-template-columns: minmax(0, 1fr); }
    .data-visual-grid { flex: 1; min-height: 320px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .42fr); gap: 1.6vw; align-items: stretch; }
    .chart-card, .table-card { min-width: 0; overflow: hidden; border: 1px solid var(--border); background: var(--surface); padding: 24px; }
    .chart-card { display: flex; flex-direction: column; justify-content: center; gap: 15px; }
    .chart-label, .visual-caption { color: var(--lime); font: 700 12px var(--mono); letter-spacing: .12em; text-transform: uppercase; }
    .bar-row { display: grid; grid-template-columns: 105px minmax(0, 1fr) 58px; align-items: center; gap: 10px; color: var(--muted); font: 13px var(--mono); }
    .bar-row b { color: var(--fg); text-align: right; }
    .bar-track { height: 16px; background: rgba(241,243,233,.08); }
    .bar-track i { display: block; height: 100%; background: linear-gradient(90deg, var(--lime), var(--mint)); }
    .table-card { display: flex; flex-direction: column; justify-content: center; }
    .table-card table { width: 100%; border-collapse: collapse; table-layout: fixed; color: var(--fg); font-size: 12px; }
    .table-card th, .table-card td { border: 1px solid var(--border); padding: 8px 6px; overflow: hidden; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
    .table-card th { color: var(--black); background: var(--lime); font-weight: 800; }
    .table-card tr:nth-child(even) td { background: rgba(241,243,233,.04); }
    .visual-caption { margin-top: 14px; color: var(--muted); font-size: 10px; }
    .hero-image-layout { display: grid; grid-template-columns: minmax(0, .9fr) minmax(360px, 1.1fr); grid-template-rows: 1fr auto; gap: 3vh 4vw; align-items: center; }
    .hero-image-copy h1 { max-width: 620px; margin: 0; font: 800 clamp(46px, 5.5vw, 82px)/.98 var(--heading); letter-spacing: -.065em; text-wrap: balance; }
    .hero-image-copy p { max-width: 520px; margin: 3.2vh 0 0; color: var(--muted); font-size: clamp(17px, 1.55vw, 24px); line-height: 1.38; }
    .hero-media { min-height: 420px; display: grid; place-items: center; overflow: hidden; border: 1px solid var(--border); background: linear-gradient(145deg, var(--surface), var(--surface-2)); }
    .hero-media-figure, .story-media-figure, .chart-media-figure { width: 100%; height: 100%; margin: 0; padding: 12px; }
    .hero-media-figure img, .story-media-figure img, .chart-media-figure img { display: block; width: 100%; height: calc(100% - 23px); object-fit: contain; background: var(--surface-2); }
    .hero-media-figure figcaption, .story-media-figure figcaption, .chart-media-figure figcaption { margin-top: 6px; overflow: hidden; color: var(--muted); font: 10px var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .hero-media-placeholder, .story-media-placeholder, .chart-empty, .collage-empty { display: grid; place-items: center; gap: 16px; width: 100%; height: 100%; padding: 40px; color: var(--muted); text-align: center; background: repeating-linear-gradient(135deg, transparent 0 22px, rgba(216,255,90,.05) 22px 23px); }
    .hero-media-placeholder span { color: var(--lime); font: 700 12px var(--mono); letter-spacing: .2em; }
    .hero-media-placeholder strong { max-width: 360px; color: var(--fg); font: 700 clamp(24px, 2.6vw, 40px)/1.04 var(--heading); }
    .hero-image-note { grid-column: 1 / -1; display: flex; gap: 20px; align-items: center; padding-top: 2.4vh; border-top: 1px solid var(--border); }
    .hero-image-note span, .metric-stage-card span, .chart-callout span, .collage-takeaway span { color: var(--lime); font: 700 12px var(--mono); letter-spacing: .16em; }
    .hero-image-note strong { font: 700 18px var(--heading); }
    .metric-stage-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(260px, .9fr); grid-template-rows: auto 1fr; gap: 3vh 4vw; }
    .metric-stage-layout .slide-heading { grid-column: 1 / -1; }
    .metric-stage-card { position: relative; align-self: center; min-height: 330px; padding: 38px; overflow: hidden; border: 1px solid var(--border); background: linear-gradient(155deg, var(--surface), rgba(216,255,90,.08)); }
    .metric-stage-card::after { content: ""; position: absolute; right: -12%; bottom: -45%; width: 58%; aspect-ratio: 1; border: 1px solid var(--lime); border-radius: 50%; opacity: .55; }
    .metric-stage-card strong { position: relative; display: block; max-width: 760px; margin: 4vh 0 2vh; color: var(--fg); font: 800 clamp(48px, 6vw, 92px)/.9 var(--heading); letter-spacing: -.07em; }
    .metric-stage-card p { position: relative; max-width: 720px; margin: 0; color: var(--muted); font-size: clamp(16px, 1.35vw, 21px); line-height: 1.36; }
    .metric-stage-orbit { position: relative; align-self: center; justify-self: center; width: min(30vw, 340px); aspect-ratio: 1; }
    .metric-stage-orbit i { position: absolute; inset: 5%; border: 1px solid var(--lime); border-radius: 50%; transform: rotate(-25deg) scaleX(.7); }
    .metric-stage-orbit i:nth-child(2) { inset: 21%; border-color: var(--coral); transform: rotate(35deg) scaleX(1.55); }
    .metric-stage-orbit b { position: absolute; inset: 37%; display: grid; place-items: center; border-radius: 50%; background: var(--lime); color: var(--black); font: 700 44px var(--heading); }
    .story-split-layout, .chart-focus-layout, .matrix-layout, .timeline-layout, .evidence-collage-layout { display: flex; flex-direction: column; gap: 3vh; }
    .story-split-grid { display: grid; flex: 1; grid-template-columns: minmax(0, 1.05fr) minmax(230px, .72fr) minmax(240px, .76fr); gap: 1.7vw; min-height: 320px; }
    .story-primary, .story-support { padding: 30px; border: 1px solid var(--border); background: var(--surface); }
    .story-primary { display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(145deg, var(--surface), rgba(216,255,90,.08)); }
    .story-primary h3, .story-support h3 { margin: 2.8vh 0 2.4vh; font: 750 clamp(28px, 3vw, 44px)/1.02 var(--heading); letter-spacing: -.05em; }
    .story-primary ul, .story-support ul { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; color: var(--muted); font-size: clamp(14px, 1.15vw, 17px); line-height: 1.32; }
    .story-primary li, .story-support li { padding-left: 18px; position: relative; }
    .story-primary li::before, .story-support li::before { content: "•"; position: absolute; left: 0; color: var(--lime); }
    .story-support li::before { color: var(--coral); }
    .story-media { overflow: hidden; border: 1px solid var(--border); background: var(--surface-2); }
    .chart-focus-grid { display: grid; flex: 1; grid-template-columns: minmax(0, 1.3fr) minmax(280px, .7fr); gap: 1.8vw; min-height: 330px; }
    .chart-focus-visual { min-width: 0; padding: 24px; border: 1px solid var(--border); background: var(--surface); }
    .chart-focus-visual .chart-card { height: 100%; padding: 0; border: 0; background: transparent; }
    .chart-callout { display: flex; flex-direction: column; gap: 18px; padding: 28px; border: 1px solid var(--border); background: linear-gradient(160deg, var(--surface), rgba(216,255,90,.08)); }
    .chart-callout strong { font: 800 clamp(28px, 3vw, 46px)/1.02 var(--heading); letter-spacing: -.05em; }
    .chart-callout p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.35; }
    .chart-media-figure { min-height: 120px; margin-top: auto; border-top: 1px solid var(--border); padding: 12px 0 0; }
    .chart-table-caption { padding: 26px; color: var(--muted); font-size: 18px; }
    .matrix-grid { display: grid; flex: 1; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; border: 1px solid var(--border); background: var(--border); }
    .matrix-cell { display: flex; flex-direction: column; justify-content: flex-end; min-height: 180px; padding: 28px; background: var(--surface); }
    .matrix-cell span { margin-bottom: 16px; color: var(--lime); font: 700 11px var(--mono); letter-spacing: .16em; }
    .matrix-cell.tone-coral span { color: var(--coral); }
    .matrix-cell strong { max-width: 440px; font: 700 clamp(22px, 2.3vw, 34px)/1.06 var(--heading); letter-spacing: -.04em; }
    .timeline-track { position: relative; display: grid; flex: 1; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.25vw; align-items: center; }
    .timeline-track::before { content: ""; position: absolute; left: 9%; right: 9%; top: 38%; height: 1px; background: var(--border); }
    .timeline-node { position: relative; min-height: 260px; padding: 26px; border: 1px solid var(--border); background: var(--surface); }
    .timeline-node::before { content: ""; position: absolute; top: calc(38% - 10px); left: 26px; width: 20px; height: 20px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 6px var(--bg); }
    .timeline-node.tone-coral::before { background: var(--coral); }
    .timeline-node span { display: block; color: var(--muted); font: 700 12px var(--mono); letter-spacing: .14em; }
    .timeline-node h3 { margin: 88px 0 14px; font: 700 clamp(22px, 2.1vw, 31px)/1.04 var(--heading); }
    .timeline-node p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.35; }
    .collage-grid { display: grid; flex: 1; grid-template-columns: minmax(0, 1.25fr) repeat(2, minmax(190px, .75fr)); gap: 1.2vw; min-height: 310px; }
    .collage-figure { min-width: 0; margin: 0; padding: 9px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); }
    .collage-figure:first-child { grid-row: 1 / span 2; }
    .collage-figure img { display: block; width: 100%; height: calc(100% - 22px); object-fit: contain; background: var(--surface-2); }
    .collage-figure figcaption { overflow: hidden; margin-top: 5px; color: var(--muted); font: 9px var(--mono); text-overflow: ellipsis; white-space: nowrap; }
    .collage-takeaway { display: flex; gap: 20px; align-items: center; min-height: 64px; padding: 16px 20px; border: 1px solid var(--border); background: var(--surface); }
    .collage-takeaway strong { font: 700 18px var(--heading); }
    .controls { position: absolute; right: 3vw; top: 50%; z-index: 10; display: grid; gap: 10px; transform: translateY(-50%); }
    .dot { width: 9px; height: 9px; padding: 0; border: 1px solid var(--muted); border-radius: 50%; background: transparent; cursor: pointer; transition: transform .25s ease, background .25s ease, border-color .25s ease; }
    .dot.is-active { transform: scale(1.8); border-color: var(--lime); background: var(--lime); }
    .progress { position: absolute; left: 0; right: 0; bottom: 0; z-index: 11; height: 3px; background: var(--border); }
    .progress > i { display: block; width: 0; height: 100%; background: var(--lime); transition: width .45s var(--ease); }
    .hint { position: absolute; left: 3vw; bottom: 3.2vh; z-index: 3; color: var(--muted); font: 11px var(--mono); letter-spacing: .1em; text-transform: uppercase; }
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity .65s var(--ease), transform .65s var(--ease); }
    .slide.is-active .reveal { opacity: 1; transform: translateY(0); }
    .slide.is-active .reveal:nth-child(2) { transition-delay: .08s; }
    .slide.is-active .reveal:nth-child(3) { transition-delay: .16s; }
    .slide.is-active .reveal:nth-child(4) { transition-delay: .24s; }
    @media (max-width: 820px) {
      .slide-surface { padding: 8vh 8vw 8vh; }
      .title-layout { grid-template-columns: 1fr; grid-template-rows: auto auto auto; gap: 4vh; }
      .hero-orbit { width: min(48vw, 300px); justify-self: start; }
      .hero-note { grid-column: 1; }
      .display-title { font-size: clamp(48px, 12vw, 76px); }
      .pipeline-track { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .pipeline-line { display: none; }
      .pipeline-step { min-height: 150px; padding: 16px; }
      .step-top { margin-bottom: 3vh; }
      .comparison-grid { gap: 12px; }
      .comparison-column { padding: 22px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
      .reveal { opacity: 1; transform: none; }
    }
  </style>
</head>
<body>
  <main class="deck" aria-label="${escapeHtml(spec.deck.title)}">
    ${slides}
    <nav class="controls" aria-label="页面导航"></nav>
    <div class="hint">← → / SPACE TO NAVIGATE</div>
    <div class="progress" aria-hidden="true"><i></i></div>
  </main>
  <script>
    const DECK_META = ${themeJson};
    const slides = [...document.querySelectorAll('.slide')];
    const controls = document.querySelector('.controls');
    const progress = document.querySelector('.progress > i');
    let current = 0;
    let wheelLock = false;
    slides.forEach((slide, index) => {
      const button = document.createElement('button');
      button.className = 'dot';
      button.type = 'button';
      button.setAttribute('aria-label', '跳转到第 ' + (index + 1) + ' 页');
      button.addEventListener('click', () => show(index));
      controls.appendChild(button);
    });
    const dots = [...controls.children];
    function show(index, updateHash = true) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === current);
        slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
      progress.style.width = (((current + 1) / slides.length) * 100) + '%';
      if (updateHash) history.replaceState(null, '', '#' + (current + 1));
    }
    function next() { show(current + 1); }
    function prev() { show(current - 1); }
    document.addEventListener('keydown', (event) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); next(); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); prev(); }
      if (event.key === 'Home') { event.preventDefault(); show(0); }
      if (event.key === 'End') { event.preventDefault(); show(slides.length - 1); }
    });
    document.addEventListener('wheel', (event) => {
      if (wheelLock || Math.abs(event.deltaY) < 20) return;
      wheelLock = true;
      event.deltaY > 0 ? next() : prev();
      setTimeout(() => { wheelLock = false; }, 520);
    }, { passive: true });
    let touchStart = null;
    document.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', (event) => {
      if (touchStart === null) return;
      const delta = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(delta) > 45) delta < 0 ? next() : prev();
      touchStart = null;
    }, { passive: true });
    const hashIndex = Number.parseInt(location.hash.slice(1), 10);
    show(Number.isFinite(hashIndex) && hashIndex > 0 ? hashIndex - 1 : 0, false);
  </script>
</body>
</html>
`;
}

export async function renderHtml({ spec, outPath }) {
  await writeText(outPath, htmlDocument(spec));
  return { htmlPath: outPath, slideCount: spec.slides.length, warnings: [] };
}

export { htmlDocument };
