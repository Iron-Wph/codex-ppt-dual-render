import path from "node:path";
import { createElement as h, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { writeText } from "./utils.mjs";

const cx = (...values) => values.filter(Boolean).join(" ");
const safeArray = (value) => Array.isArray(value) ? value : [];

function contentOf(slide) {
  return {
    eyebrow: slide.content?.eyebrow || slide.role?.replaceAll("_", " ") || "PRESENTATION",
    title: slide.content?.title || slide.action_title || slide.primary_claim,
    subtitle: slide.content?.subtitle || "",
    kicker: slide.content?.kicker || "",
    lede: slide.content?.lede || slide.primary_claim || "",
    note: slide.content?.note || null,
    bodyPoints: safeArray(slide.content?.body_points),
    metrics: safeArray(slide.content?.metrics),
    steps: safeArray(slide.content?.steps),
    result: slide.content?.result || null,
    columns: safeArray(slide.content?.columns),
    takeaway: slide.content?.takeaway || null,
  };
}

function imageElements(slide) {
  return safeArray(slide.elements).filter((item) => item.kind === "image" && item.data?.path);
}

function tableElement(slide) {
  return safeArray(slide.elements).find((item) => item.kind === "table");
}

function chartElement(slide) {
  return safeArray(slide.elements).find((item) => item.kind === "chart");
}

function SectionLabel({ children }) {
  return h("span", { className: "section-label" }, children);
}

function SlideTitle({ slide, wide = false }) {
  const content = contentOf(slide);
  return h("header", { className: cx("slide-title", wide && "is-wide") },
    h(SectionLabel, null, content.kicker || content.eyebrow),
    h("h2", null, content.title),
    content.lede && h("p", { className: "lede" }, content.lede),
  );
}

function ImageFrame({ item, className = "", index = 0 }) {
  if (!item) return h("div", { className: cx("media-frame placeholder", className) },
    h("span", null, "VISUAL EVIDENCE"),
    h("strong", null, "Awaiting a source figure"),
  );
  return h("figure", { className: cx("media-frame", className), style: { "--media-index": index } },
    h("img", { src: item.data.path.replaceAll("\\", "/"), alt: item.alt_text || item.data.caption || "Evidence image" }),
    h("figcaption", null,
      h("span", null, item.data.caption || item.alt_text || "Source figure"),
      item.source_page && h("b", null, `P.${item.source_page}`),
    ),
  );
}

function PointList({ points, evidence = [] }) {
  const source = points.length ? points : evidence.map((item, index) => ({ label: `E${index + 1}`, text: item.claim_support }));
  return h("ol", { className: "point-list" },
    ...source.slice(0, 4).map((item, index) => h("li", { key: `${item.label}-${index}` },
      h("span", null, item.label || String(index + 1).padStart(2, "0")),
      h("p", null, item.text || item),
    )),
  );
}

function CompactMetrics({ metrics }) {
  return h("div", { className: "compact-metrics" },
    ...safeArray(metrics).slice(0, 3).map((metric, index) => h("article", { key: index },
      h("span", null, metric.label || `METRIC ${index + 1}`),
      h("strong", null, metric.value || "—"),
      h("p", null, metric.meaning || ""),
    )),
  );
}

function EvidenceStrip({ slide }) {
  const evidence = safeArray(slide.evidence).slice(0, 3);
  if (!evidence.length) return null;
  return h("div", { className: "evidence-strip" },
    ...evidence.map((item, index) => h("article", { key: index },
      h("span", null, item.evidence_ref || `E${index + 1}`),
      h("strong", null, item.claim_support),
      h("p", null, item.interpretation),
    )),
  );
}

function Implication({ slide, label = "WHAT THIS CHANGES" }) {
  return h("div", { className: "implication" },
    h("span", null, label),
    h("strong", null, slide.implication || slide.primary_claim),
  );
}

function ThesisStage({ slide }) {
  const content = contentOf(slide);
  return h("div", { className: "composition thesis-stage" },
    h("div", { className: "thesis-copy" },
      h(SectionLabel, null, content.eyebrow),
      h("h1", null, content.title),
      content.subtitle && h("p", null, content.subtitle),
    ),
    h("div", { className: "thesis-mark", "aria-hidden": "true" },
      h("i", null), h("i", null), h("i", null),
      h("b", null, String(slide.content_priority || "core").toUpperCase()),
    ),
    h("div", { className: "thesis-footer" },
      h("span", null, content.note?.label || "CENTRAL TAKEAWAY"),
      h("strong", null, content.note?.value || slide.primary_claim),
    ),
  );
}

function ImageThesisSplit({ slide }) {
  const content = contentOf(slide);
  return h("div", { className: "composition image-thesis-split" },
    h("div", { className: "image-thesis-copy" },
      h(SlideTitle, { slide }),
      content.metrics.length
        ? h(CompactMetrics, { metrics: content.metrics })
        : h(PointList, { points: content.bodyPoints, evidence: slide.evidence }),
      h(Implication, { slide }),
    ),
    h(ImageFrame, { item: imageElements(slide)[0], className: "hero-evidence" }),
  );
}

function ArgumentPair({ slide }) {
  const content = contentOf(slide);
  const columns = content.columns.length ? content.columns.slice(0, 2) : [
    { label: "CLAIM", headline: slide.primary_claim, points: content.bodyPoints.slice(0, 2).map((item) => item.text) },
    { label: "MEANING", headline: slide.implication, points: safeArray(slide.evidence).slice(0, 2).map((item) => item.interpretation) },
  ];
  return h("div", { className: "composition argument-pair" },
    h(SlideTitle, { slide, wide: true }),
    h("div", { className: "argument-fields" },
      ...columns.map((column, index) => h("article", { className: cx("argument-field", index === 0 ? "is-primary" : "is-secondary"), key: index },
        h(SectionLabel, null, column.label || `ARGUMENT ${index + 1}`),
        h("h3", null, column.headline),
        h("ul", null, ...safeArray(column.points).slice(0, 4).map((point, pointIndex) => h("li", { key: pointIndex }, point))),
      )),
    ),
    h(Implication, { slide, label: content.takeaway?.label || "SYNTHESIS" }),
  );
}

function MechanismTriptych({ slide }) {
  const content = contentOf(slide);
  const mechanisms = content.columns.length >= 3
    ? content.columns.slice(0, 3)
    : content.steps.slice(0, 3).map((step) => ({ label: step.metric, headline: step.title, points: [step.text] }));
  const fallback = safeArray(slide.evidence).slice(0, 3).map((item, index) => ({ label: `MECHANISM ${index + 1}`, headline: item.claim_support, points: [item.interpretation] }));
  const rows = mechanisms.length ? mechanisms : fallback;
  return h("div", { className: "composition mechanism-triptych" },
    h(SlideTitle, { slide, wide: true }),
    h("div", { className: "mechanism-axis", "aria-hidden": "true" }, h("i", null)),
    h("div", { className: "mechanism-grid" },
      ...rows.map((item, index) => h("article", { key: index },
        h("span", null, item.label || String(index + 1).padStart(2, "0")),
        h("h3", null, item.headline || item.title),
        h("p", null, safeArray(item.points)[0] || item.text || ""),
      )),
    ),
    h(Implication, { slide }),
  );
}

function qaFeedbackFlow(steps) {
  const titles = steps.map((step) => String(step?.title || "").toLowerCase());
  return steps.length >= 5
    && titles.some((title) => /schema/.test(title))
    && titles.some((title) => /geometry/.test(title))
    && titles.some((title) => /cross/.test(title))
    && titles.some((title) => /review/.test(title))
    && titles.some((title) => /修订|渲染|render/.test(title));
}

function dualOutputFlow(steps) {
  const text = steps.map((step) => `${step?.title || ""} ${step?.text || ""}`).join(" ");
  return steps.length >= 2 && /html/i.test(text) && /pptx/i.test(text) && /双输出|两个出口|two outputs?/i.test(text);
}

function CausalFlow({ slide }) {
  const content = contentOf(slide);
  const steps = content.steps.length ? content.steps.slice(0, 5) : safeArray(slide.evidence).slice(0, 4).map((item, index) => ({
    metric: String(index + 1).padStart(2, "0"), title: item.claim_support, text: item.interpretation,
  }));
  if (qaFeedbackFlow(steps)) {
    return h("div", { className: "composition causal-flow qa-feedback-flow" },
      h(SlideTitle, { slide, wide: true }),
      h("div", { className: "qa-loop" },
        h("div", { className: "qa-checks" },
          ...steps.slice(0, 3).map((step, index) => h("article", { key: index },
            h("span", null, step.metric || String(index + 1).padStart(2, "0")),
            h("h3", null, step.title),
            h("p", null, step.text),
          )),
        ),
        h("div", { className: "qa-merge", "aria-hidden": "true" }, "→"),
        h("article", { className: "qa-review" }, h("span", null, steps[3].metric || "04"), h("h3", null, steps[3].title), h("p", null, steps[3].text)),
        h("div", { className: "qa-forward", "aria-hidden": "true" }, "→"),
        h("article", { className: "qa-revision" }, h("span", null, steps[4].metric || "05"), h("h3", null, steps[4].title), h("p", null, steps[4].text)),
        h("div", { className: "qa-return" }, h("span", null, "RENDERED OUTPUT RETURNS TO ALL CHECKS")),
      ),
      h(Implication, { slide, label: content.result?.label || "QUALITY LOOP" }),
    );
  }
  if (dualOutputFlow(steps)) {
    const sharedSteps = steps.slice(0, -1);
    const gate = steps.at(-1);
    return h("div", { className: "composition causal-flow dual-output-flow" },
      h(SlideTitle, { slide, wide: true }),
      h("div", { className: "dual-flow-stage" },
        h("div", { className: "dual-shared" },
          ...sharedSteps.map((step, index) => h("article", { key: index },
            h("span", null, step.metric || String(index + 1).padStart(2, "0")),
            h("h3", null, step.title),
            h("p", null, step.text),
          )),
        ),
        h("article", { className: "dual-gate" }, h("span", null, gate.metric || "03"), h("h3", null, gate.title), h("p", null, gate.text)),
        h("div", { className: "dual-branches" },
          h("article", null, h("span", null, "HTML"), h("h3", null, "浏览器演示"), h("p", null, "动效、现场演示与快速迭代")),
          h("article", null, h("span", null, "PPTX"), h("h3", null, "原生可编辑交付"), h("p", null, "办公修改、协作与归档")),
        ),
      ),
      h(Implication, { slide, label: content.result?.label || "SHARED SEMANTICS" }),
    );
  }
  return h("div", { className: "composition causal-flow" },
    h(SlideTitle, { slide, wide: true }),
    h("div", { className: "flow-line", "aria-hidden": "true" }),
    h("div", { className: "flow-steps" },
      ...steps.map((step, index) => h("article", { key: index },
        h("span", null, step.metric || String(index + 1).padStart(2, "0")),
        h("i", { "aria-hidden": "true" }),
        h("h3", null, step.title),
        h("p", null, step.text),
      )),
    ),
    h(Implication, { slide, label: content.result?.label || "END STATE" }),
  );
}

function MetricTriad({ slide }) {
  const content = contentOf(slide);
  const metrics = content.metrics.length ? content.metrics : safeArray(slide.evidence).slice(0, 3).map((item, index) => ({
    label: item.evidence_ref || `E${index + 1}`,
    value: item.claim_support,
    meaning: item.interpretation,
  }));
  return h("div", { className: "composition metric-triad" },
    h(SlideTitle, { slide, wide: true }),
    h("div", { className: "metric-grid" },
      ...metrics.slice(0, 3).map((metric, index) => h("article", { key: index },
        h("span", null, metric.label),
        h("strong", null, metric.value),
        h("p", null, metric.meaning),
      )),
    ),
    h(Implication, { slide }),
  );
}

function Bars({ chart, metrics = [] }) {
  const categories = safeArray(chart?.data?.categories);
  const chartSeries = safeArray(chart?.data?.series)
    .map((series) => ({ name: series?.name || "Series", values: safeArray(series?.values).map(Number) }))
    .filter((series) => series.values.length);
  if (chartSeries.length > 1 && categories.length) {
    const max = Math.max(1, ...chartSeries.flatMap((series) => series.values));
    return h("div", { className: "grouped-bar-chart", role: "img", "aria-label": chart?.data?.accessibility_summary || "Grouped data evidence chart" },
      h("div", { className: "grouped-legend" },
        ...chartSeries.slice(0, 3).map((series, index) => h("span", { className: `series-${index + 1}`, key: series.name }, series.name)),
      ),
      ...categories.slice(0, 8).map((category, categoryIndex) => h("article", { key: categoryIndex },
        h("span", null, category),
        h("div", null,
          ...chartSeries.slice(0, 3).map((series, seriesIndex) => {
            const value = Number(series.values[categoryIndex]);
            return h("i", {
              className: `series-${seriesIndex + 1}`,
              key: seriesIndex,
              style: { "--bar": `${Math.max(3, (value / max) * 100)}%` },
              title: `${series.name}: ${value}`,
            }, h("b", null, Number.isFinite(value) ? String(value) : "—"));
          }),
        ),
      )),
    );
  }
  const values = safeArray(chartSeries[0]?.values).map(Number);
  const fallback = metrics.map((item) => Number(String(item.value).replace(/[^\d.-]/g, ""))).filter(Number.isFinite);
  const series = values.length ? values : fallback;
  const labels = categories.length ? categories : metrics.map((item) => item.label);
  const max = Math.max(1, ...series);
  return h("div", { className: "bar-chart", role: "img", "aria-label": "Data evidence chart" },
    ...series.slice(0, 7).map((value, index) => h("div", { className: "bar-item", key: index },
      h("span", null, labels[index] || `M${index + 1}`),
      h("i", { style: { "--bar": `${Math.max(4, (value / max) * 100)}%`, "--delay": `${index * 80}ms` } }),
      h("strong", null, String(value)),
    )),
  );
}

function ChartRail({ slide }) {
  const content = contentOf(slide);
  const chart = chartElement(slide);
  const sourceImage = imageElements(slide)[0];
  const hasSeries = safeArray(chart?.data?.series).some((series) => safeArray(series?.values).length);
  const chartVisual = hasSeries || content.metrics.length
    ? h(Bars, { chart, metrics: content.metrics })
    : h("div", { className: "chart-fallback" },
      ...content.columns.slice(0, 2).map((column, index) => h("article", { key: index },
        h("span", null, column.label || `READ ${index + 1}`),
        h("strong", null, column.headline),
        h("ul", null, ...safeArray(column.points).slice(0, 3).map((point, pointIndex) => h("li", { key: pointIndex }, point))),
      )),
    );
  return h("div", { className: cx("composition chart-rail", sourceImage && "has-source") },
    h(SlideTitle, { slide, wide: true }),
    sourceImage && h(ImageFrame, { item: sourceImage, className: "source-thumb" }),
    h("div", { className: "chart-stage" },
      h("span", { className: "chart-axis-label" }, chart?.data?.value_axis_label || "VALUE"),
      chartVisual,
    ),
    h("div", { className: "interpretation-rail" },
      ...safeArray(slide.evidence).slice(0, 3).map((item, index) => h("article", { key: index },
        h("span", null, item.evidence_ref || `READ ${index + 1}`),
        h("strong", null, item.claim_support),
        h("p", null, item.interpretation),
      )),
      h(Implication, { slide }),
    ),
  );
}

function EvidenceTable({ slide }) {
  const values = safeArray(tableElement(slide)?.data?.values).slice(0, 8);
  const sourceImage = imageElements(slide)[0];
  return h("div", { className: cx("composition evidence-table", sourceImage && "has-source") },
    h(SlideTitle, { slide, wide: true }),
    sourceImage && h(ImageFrame, { item: sourceImage, className: "source-thumb" }),
    values.length
      ? h("div", { className: "table-stage" },
        h("table", null,
          h("thead", null, h("tr", null, ...safeArray(values[0]).slice(0, 6).map((cell, index) => h("th", { key: index }, cell)))),
          h("tbody", null, ...values.slice(1).map((row, rowIndex) => h("tr", { key: rowIndex },
            ...safeArray(row).slice(0, 6).map((cell, cellIndex) => h("td", { key: cellIndex }, cell)),
          ))),
        ),
      )
      : h(EvidenceStrip, { slide }),
    h(Implication, { slide }),
  );
}

function EvidenceCollage({ slide }) {
  const images = imageElements(slide).slice(0, 3);
  return h("div", { className: "composition evidence-collage" },
    h(SlideTitle, { slide, wide: true }),
    h("div", { className: "collage-stage" },
      ...[0, 1, 2].map((index) => h(ImageFrame, { item: images[index], index, className: index === 0 ? "is-dominant" : "", key: index })),
    ),
    h(Implication, { slide, label: contentOf(slide).takeaway?.label || "SYNTHESIS" }),
  );
}

function AnswerBoundary({ slide }) {
  const content = contentOf(slide);
  const values = safeArray(tableElement(slide)?.data?.values).slice(0, 5).map((row) => safeArray(row).slice(0, 5));
  const points = content.bodyPoints.length
    ? content.bodyPoints
    : content.columns.length
      ? content.columns.map((column, index) => ({ label: column.label || `IMPLICATION ${index + 1}`, text: column.headline }))
      : safeArray(slide.evidence).map((item, index) => ({ label: `IMPLICATION ${index + 1}`, text: item.interpretation }));
  return h("div", { className: cx("composition answer-boundary", values.length && "has-evidence-table") },
    h("div", { className: "answer-copy" },
      h(SectionLabel, null, content.eyebrow || "THE ANSWER"),
      h("h2", null, content.title),
      h("p", null, slide.primary_claim),
      values.length && h("div", { className: "answer-evidence-table" },
        h("table", null,
          h("thead", null, h("tr", null, ...values[0].map((cell, index) => h("th", { key: index }, cell)))),
          h("tbody", null, ...values.slice(1).map((row, rowIndex) => h("tr", { key: rowIndex },
            ...row.map((cell, cellIndex) => h("td", { key: cellIndex }, cell)),
          ))),
        ),
      ),
    ),
    h(PointList, { points, evidence: [] }),
    h("div", { className: "boundary" },
      h("span", null, content.takeaway?.label || "BOUNDARY"),
      h("strong", null, content.takeaway?.value || slide.implication),
    ),
  );
}

const COMPOSITIONS = {
  "thesis-stage": ThesisStage,
  "image-thesis-split": ImageThesisSplit,
  "argument-pair": ArgumentPair,
  "mechanism-triptych": MechanismTriptych,
  "causal-flow": CausalFlow,
  "metric-triad": MetricTriad,
  "chart-with-interpretation-rail": ChartRail,
  "evidence-table": EvidenceTable,
  "evidence-collage": EvidenceCollage,
  "answer-and-boundary": AnswerBoundary,
};

function SpeakerNotes({ slide }) {
  const notes = slide.speaker_notes || { talk_track: slide.speaker_note || "", delivery_cue: "", source_refs: [] };
  return h("aside", { className: "speaker-notes", "aria-hidden": "true" },
    h("span", null, `${notes.estimated_seconds || 60}s · ${slide.content_priority || "support"}`),
    h("h3", null, "Speaker notes"),
    h("p", null, notes.talk_track),
    notes.delivery_cue && h("b", null, notes.delivery_cue),
    safeArray(notes.source_refs).length > 0 && h("small", null, `[Sources] ${notes.source_refs.join(" · ")}`),
  );
}

function Slide({ slide, index, total }) {
  const Component = COMPOSITIONS[slide.composition_id] || COMPOSITIONS["argument-pair"];
  const slideId = slide.id || `slide-${String(index + 1).padStart(3, "0")}`;
  return h("section", {
    className: cx("slide", slideId, `composition-${slide.composition_id || "argument-pair"}`),
    id: slideId,
    "data-index": index,
    "data-priority": slide.content_priority || "support",
    "aria-label": `${index + 1}. ${slide.action_title || slide.primary_claim}`,
  },
    h("div", { className: "ambient", "aria-hidden": "true" }, h("i", null), h("i", null), h("i", null)),
    h("div", { className: "slide-surface" },
      h(Component, { slide }),
      h("footer", { className: "slide-footer" },
        h("span", null, slide.role?.replaceAll("_", " ") || "PRESENTATION"),
        h("b", null, `${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`),
      ),
    ),
    h(SpeakerNotes, { slide }),
  );
}

function Deck({ spec }) {
  return h(Fragment, null,
    h("main", { className: "deck", "aria-label": spec.deck.title },
      ...spec.slides.map((slide, index) => h(Slide, { slide, index, total: spec.slides.length, key: slide.id })),
    ),
    h("nav", { className: "deck-nav", "aria-label": "Slide navigation" },
      h("button", { type: "button", "data-action": "prev", "aria-label": "Previous slide" }, "←"),
      h("span", { className: "deck-counter" }, `1 / ${spec.slides.length}`),
      h("button", { type: "button", "data-action": "next", "aria-label": "Next slide" }, "→"),
      h("button", { type: "button", "data-action": "notes", "aria-label": "Toggle speaker notes" }, "N"),
    ),
    h("div", { className: "progress", "aria-hidden": "true" }, h("i", null)),
  );
}

function themeCss(theme) {
  const colors = theme.colors || {};
  const fonts = theme.fonts || {};
  return `
    :root {
      --bg:${colors.background || "#070A12"}; --surface:${colors.surface || "#111827"};
      --surface-2:${colors.surface2 || colors.surface || "#172033"}; --fg:${colors.foreground || "#F8FAFC"};
      --muted:${colors.muted || "#94A3B8"}; --accent:${colors.accent || "#74F0C7"};
      --accent-2:${colors.accent2 || "#FF6B9B"}; --border:${colors.border || "#273449"};
      --black:${colors.black || "#05070D"}; --heading:${fonts.heading || "Inter, system-ui, sans-serif"};
      --body:${fonts.body || "Inter, system-ui, sans-serif"}; --mono:${fonts.mono || "ui-monospace, monospace"};
      --ease:cubic-bezier(.2,.82,.2,1);
    }
  `;
}

const CSS = `
  *{box-sizing:border-box} html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#02040a}
  body{font-family:var(--body);color:var(--fg);text-rendering:optimizeLegibility}
  button{font:inherit}.deck{position:fixed;inset:0;display:grid;place-items:center;perspective:1600px;background:#02040a}
  .slide{position:absolute;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);overflow:hidden;opacity:0;pointer-events:none;transform:translate3d(8%,0,-120px) rotateY(-2deg);transition:opacity .45s var(--ease),transform .75s var(--ease);background:var(--bg);isolation:isolate}
  .slide.is-active{opacity:1;pointer-events:auto;transform:translate3d(0,0,0) rotateY(0)}
  .slide.is-before{transform:translate3d(-8%,0,-120px) rotateY(2deg)}
  .slide::before{content:"";position:absolute;inset:0;z-index:-3;background:radial-gradient(circle at 78% 16%,color-mix(in srgb,var(--accent) 22%,transparent),transparent 28%),radial-gradient(circle at 12% 88%,color-mix(in srgb,var(--accent-2) 13%,transparent),transparent 32%),linear-gradient(135deg,color-mix(in srgb,var(--surface) 80%,transparent),var(--bg) 58%)}
  .slide::after{content:"";position:absolute;inset:0;z-index:-2;opacity:.15;background-image:linear-gradient(color-mix(in srgb,var(--border) 55%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--border) 55%,transparent) 1px,transparent 1px);background-size:64px 64px;mask-image:linear-gradient(115deg,#000,transparent 72%)}
  .ambient{position:absolute;inset:0;z-index:-1;overflow:hidden}.ambient i{position:absolute;width:34vw;aspect-ratio:1;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:50%;filter:blur(.2px);opacity:.35;animation:orbit 18s linear infinite}
  .ambient i:nth-child(1){right:-12vw;top:-18vw}.ambient i:nth-child(2){right:8vw;top:20vh;width:18vw;border-color:color-mix(in srgb,var(--accent-2) 38%,transparent);animation-direction:reverse}.ambient i:nth-child(3){left:-15vw;bottom:-24vw;width:30vw}
  @keyframes orbit{to{transform:rotate(360deg) scale(1.06)}}.slide-surface{position:absolute;inset:0;padding:6.2vh 5.6vw 5.5vh;display:flex;flex-direction:column}.composition{flex:1;min-height:0}
  .section-label{display:block;color:var(--accent);font:700 clamp(10px,1vw,14px)/1 var(--mono);letter-spacing:.18em;text-transform:uppercase}
  .slide-title{max-width:72%;margin-bottom:3.2vh}.slide-title.is-wide{max-width:88%}.slide-title h2{margin:1.4vh 0 0;font:760 clamp(34px,4.3vw,64px)/.98 var(--heading);letter-spacing:-.055em;text-wrap:balance}
  .slide-title .lede{max-width:880px;margin:1.8vh 0 0;color:var(--muted);font-size:clamp(15px,1.4vw,20px);line-height:1.42}
  .slide-footer{display:flex;justify-content:space-between;align-items:center;margin-top:2vh;color:var(--muted);font:650 10px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase}.slide-footer b{color:var(--fg)}
  .implication{display:grid;grid-template-columns:minmax(130px,.22fr) 1fr;gap:22px;align-items:center;padding-top:2vh;border-top:1px solid var(--border)}
  .implication span{color:var(--accent);font:700 11px var(--mono);letter-spacing:.14em}.implication strong{font:650 clamp(16px,1.5vw,22px)/1.25 var(--heading)}
  .point-list{display:grid;gap:1.7vh;margin:0;padding:0;list-style:none}.point-list li{display:grid;grid-template-columns:42px 1fr;gap:14px;align-items:start;padding-top:1.3vh;border-top:1px solid var(--border)}
  .point-list span{color:var(--accent);font:700 11px var(--mono)}.point-list p{margin:0;color:var(--fg);font-size:clamp(15px,1.25vw,18px);line-height:1.38}
  .media-frame{position:relative;margin:0;overflow:hidden;background:color-mix(in srgb,var(--surface) 88%,transparent);border:1px solid var(--border);box-shadow:0 32px 90px color-mix(in srgb,var(--black) 45%,transparent)}
  .media-frame img{width:100%;height:calc(100% - 34px);display:block;object-fit:contain;background:color-mix(in srgb,var(--bg) 72%,#fff)}
  .media-frame figcaption{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 12px;color:var(--muted);font:10px var(--mono)}.media-frame figcaption span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.media-frame figcaption b{color:var(--accent)}
  .placeholder{display:grid;place-items:center;align-content:center;gap:10px;color:var(--muted);background:repeating-linear-gradient(135deg,transparent 0 28px,color-mix(in srgb,var(--accent) 5%,transparent) 28px 29px)}.placeholder span{color:var(--accent);font:11px var(--mono);letter-spacing:.2em}.placeholder strong{font:650 26px var(--heading)}
  .thesis-stage{display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:1fr auto;gap:4vw}.thesis-copy{display:flex;flex-direction:column;justify-content:center}.thesis-copy h1{max-width:760px;margin:2.5vh 0;font:800 clamp(52px,7.3vw,112px)/.88 var(--heading);letter-spacing:-.075em;text-wrap:balance}.thesis-copy p{max-width:620px;margin:0;color:var(--muted);font-size:clamp(17px,1.7vw,25px);line-height:1.4}
  .thesis-mark{position:relative;display:grid;place-items:center}.thesis-mark i{position:absolute;width:min(28vw,360px);aspect-ratio:1;border:1px solid color-mix(in srgb,var(--accent) 72%,transparent);border-radius:50%;animation:pulse 5s var(--ease) infinite}.thesis-mark i:nth-child(2){width:min(20vw,250px);border-color:var(--accent-2);animation-delay:-1.4s}.thesis-mark i:nth-child(3){width:min(11vw,140px);background:color-mix(in srgb,var(--accent) 12%,transparent);animation-delay:-2.8s}.thesis-mark b{z-index:1;font:800 12px var(--mono);letter-spacing:.16em}
  @keyframes pulse{50%{transform:scale(1.08);opacity:.5}}.thesis-footer{grid-column:1/-1;display:grid;grid-template-columns:180px 1fr;gap:28px;align-items:center;padding-top:2.2vh;border-top:1px solid var(--border)}.thesis-footer span{color:var(--accent);font:700 11px var(--mono);letter-spacing:.14em}.thesis-footer strong{font:650 clamp(17px,1.55vw,23px) var(--heading)}
  .image-thesis-split{display:grid;grid-template-columns:.96fr 1.04fr;gap:3.2vw;align-items:stretch}.image-thesis-copy{display:flex;flex-direction:column;gap:2.2vh}.image-thesis-copy .slide-title{max-width:100%;margin:0}.image-thesis-copy .point-list{margin-top:auto}.image-thesis-copy .implication{margin-top:auto}.hero-evidence{min-height:0}
  .compact-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:1vw;margin-top:auto}.compact-metrics article{min-width:0;padding:2vh 1.2vw;border-top:2px solid var(--accent);background:color-mix(in srgb,var(--surface) 72%,transparent)}.compact-metrics span{display:block;min-height:2.3em;color:var(--accent);font:700 10px/1.15 var(--mono)}.compact-metrics strong{display:block;margin:1.5vh 0;font:790 clamp(22px,2.2vw,34px)/.95 var(--heading);letter-spacing:-.04em}.compact-metrics p{margin:0;color:var(--muted);font-size:11px;line-height:1.32}
  .argument-pair{display:grid;grid-template-rows:auto 1fr auto;gap:2.4vh}.argument-fields{display:grid;grid-template-columns:1.18fr .82fr;gap:1px;background:var(--border);border:1px solid var(--border);min-height:0}.argument-field{display:flex;flex-direction:column;justify-content:flex-end;padding:3.2vh 2.5vw;background:color-mix(in srgb,var(--surface) 92%,transparent)}.argument-field.is-primary{background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 10%,var(--surface)),var(--surface))}.argument-field h3{max-width:520px;margin:2vh 0;font:740 clamp(28px,3.25vw,50px)/1 var(--heading);letter-spacing:-.05em}.argument-field ul{display:grid;gap:1vh;margin:0;padding:0;list-style:none;color:var(--muted);font-size:clamp(14px,1.15vw,17px)}.argument-field li::before{content:"↗";margin-right:10px;color:var(--accent)}
  .mechanism-triptych{position:relative;display:grid;grid-template-rows:auto 1fr auto;gap:2.5vh}.mechanism-axis{position:absolute;left:8%;right:8%;top:51%;height:1px;background:var(--border)}.mechanism-grid{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:2vw;align-items:center}.mechanism-grid article{position:relative;min-height:30vh;padding:3vh 2vw;background:color-mix(in srgb,var(--surface) 87%,transparent);border-top:3px solid var(--accent);backdrop-filter:blur(12px)}.mechanism-grid article::before{content:"";position:absolute;left:2vw;top:-11px;width:18px;height:18px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 8px var(--bg)}.mechanism-grid article:nth-child(2){transform:translateY(-2.4vh);border-color:var(--accent-2)}.mechanism-grid article:nth-child(2)::before{background:var(--accent-2)}.mechanism-grid span{font:700 11px var(--mono);color:var(--accent)}.mechanism-grid h3{margin:5.5vh 0 1.5vh;font:730 clamp(22px,2.3vw,34px)/1.04 var(--heading)}.mechanism-grid p{margin:0;color:var(--muted);font-size:15px;line-height:1.45}
  .causal-flow{display:grid;grid-template-rows:auto 1fr auto;gap:2.6vh;position:relative}.flow-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:1.3vw;align-items:center}.flow-line{position:absolute;left:6%;right:6%;top:53%;height:1px;background:linear-gradient(90deg,var(--accent),var(--accent-2))}.flow-steps article{position:relative;min-height:31vh;padding:2.5vh 1.5vw;background:color-mix(in srgb,var(--surface) 82%,transparent);border:1px solid var(--border);backdrop-filter:blur(12px)}.flow-steps span{color:var(--muted);font:700 11px var(--mono)}.flow-steps i{display:block;width:15px;height:15px;margin:5vh 0 3vh;border-radius:50%;background:var(--accent);box-shadow:0 0 0 7px var(--bg),0 0 24px var(--accent)}.flow-steps h3{margin:0 0 1.2vh;font:720 clamp(18px,1.8vw,27px)/1.05 var(--heading)}.flow-steps p{margin:0;color:var(--muted);font-size:14px;line-height:1.4}
  .qa-loop{position:relative;display:grid;grid-template-columns:1.22fr 50px .7fr 50px .8fr;gap:1vw;align-items:center;min-height:0}.qa-checks{display:grid;gap:1.2vh}.qa-checks article,.qa-review,.qa-revision{padding:1.8vh 1.5vw;border-left:3px solid var(--accent);background:color-mix(in srgb,var(--surface) 84%,transparent)}.qa-checks article:nth-child(3),.qa-revision{border-color:var(--accent-2)}.qa-loop span{color:var(--accent);font:700 10px var(--mono);letter-spacing:.12em}.qa-loop h3{margin:.8vh 0;font:720 clamp(18px,1.7vw,26px)/1 var(--heading)}.qa-loop p{margin:0;color:var(--muted);font-size:13px;line-height:1.35}.qa-merge,.qa-forward{color:var(--accent);font:700 32px var(--mono);text-align:center}.qa-return{position:absolute;left:42%;right:2%;bottom:-2.2vh;height:2.2vh;border-right:1px solid var(--accent-2);border-bottom:1px solid var(--accent-2);border-left:1px solid var(--accent-2)}.qa-return span{position:absolute;right:0;bottom:-16px;color:var(--accent-2);font-size:9px}.dual-flow-stage{display:grid;grid-template-columns:1fr .7fr 1.05fr;gap:2.2vw;align-items:center}.dual-shared{display:grid;gap:1px;background:var(--border)}.dual-shared article,.dual-gate,.dual-branches article{padding:2.5vh 1.8vw;background:var(--surface);border-top:3px solid var(--accent)}.dual-shared span,.dual-gate span,.dual-branches span{color:var(--accent);font:700 10px var(--mono);letter-spacing:.12em}.dual-shared h3,.dual-gate h3,.dual-branches h3{margin:1.2vh 0;font:720 clamp(19px,1.8vw,27px)/1.05 var(--heading)}.dual-shared p,.dual-gate p,.dual-branches p{margin:0;color:var(--muted);font-size:13px;line-height:1.36}.dual-gate{position:relative}.dual-gate::before,.dual-gate::after{content:"";position:absolute;right:-2.3vw;width:2.3vw;height:1px;background:var(--accent)}.dual-gate::before{top:34%}.dual-gate::after{top:66%}.dual-branches{display:grid;gap:1.4vh}.dual-branches article:last-child{border-color:var(--accent-2)}
  .metric-triad{display:grid;grid-template-rows:auto 1fr auto;gap:2.6vh}.metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.4vw}.metric-grid article{display:flex;flex-direction:column;justify-content:flex-end;padding:3vh 0;border-top:1px solid var(--accent);border-bottom:1px solid var(--border)}.metric-grid span{color:var(--accent);font:700 11px var(--mono);letter-spacing:.12em}.metric-grid strong{display:block;margin:auto 0 2vh;font:800 clamp(44px,5.6vw,88px)/.9 var(--heading);letter-spacing:-.075em}.metric-grid p{max-width:340px;margin:0;color:var(--muted);font-size:15px;line-height:1.42}
  .chart-rail{position:relative;display:grid;grid-template-columns:1.28fr .72fr;grid-template-rows:auto 1fr;gap:2.5vh 3vw}.chart-rail>.slide-title{grid-column:1/-1;margin:0}.chart-rail.has-source>.slide-title{max-width:68%}.source-thumb{position:absolute;right:0;top:0;width:18vw;height:12vh;z-index:2;box-shadow:none}.source-thumb img{height:calc(100% - 26px)}.source-thumb figcaption{height:26px}.chart-stage{position:relative;min-height:0;padding:4.8vh 2vw 2.4vh;border:1px solid var(--border);background:color-mix(in srgb,var(--surface) 80%,transparent)}.chart-axis-label{position:absolute;left:2vw;top:1.6vh;color:var(--accent);font:700 10px var(--mono);letter-spacing:.12em}.bar-chart{height:100%;display:flex;flex-direction:column;justify-content:center;gap:2.2vh}.bar-item{display:grid;grid-template-columns:110px 1fr 54px;gap:14px;align-items:center;color:var(--muted);font:12px var(--mono)}.bar-item i{display:block;width:var(--bar);height:22px;background:linear-gradient(90deg,var(--accent),var(--accent-2));transform-origin:left;animation:grow .9s var(--ease) both;animation-delay:var(--delay)}.bar-item strong{color:var(--fg);text-align:right}.grouped-bar-chart{height:100%;display:grid;grid-template-columns:repeat(2,1fr);gap:1.2vh 1.2vw;align-content:center}.grouped-legend{grid-column:1/-1;display:flex;gap:18px;color:var(--muted);font:700 10px var(--mono)}.grouped-legend span::before{content:"";display:inline-block;width:10px;height:10px;margin-right:6px;background:var(--accent)}.grouped-legend .series-2::before{background:var(--accent-2)}.grouped-bar-chart article{display:grid;grid-template-columns:96px 1fr;gap:8px;align-items:center;min-width:0}.grouped-bar-chart article>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font:10px var(--mono)}.grouped-bar-chart article>div{display:grid;gap:3px}.grouped-bar-chart i{position:relative;display:block;width:var(--bar);height:10px;background:var(--accent)}.grouped-bar-chart i.series-2{background:var(--accent-2)}.grouped-bar-chart i b{position:absolute;left:calc(100% + 4px);top:-2px;color:var(--fg);font:700 9px var(--mono)}@keyframes grow{from{transform:scaleX(0)}}.chart-fallback{height:100%;display:grid;grid-template-columns:1.12fr .88fr;gap:1px;background:var(--border)}.chart-fallback article{display:flex;flex-direction:column;justify-content:flex-end;padding:3vh 2vw;background:var(--surface)}.chart-fallback article:first-child{background:linear-gradient(150deg,color-mix(in srgb,var(--accent) 12%,var(--surface)),var(--surface))}.chart-fallback span{color:var(--accent);font:700 10px var(--mono);letter-spacing:.14em}.chart-fallback strong{margin:2vh 0;font:730 clamp(24px,2.6vw,40px)/1.02 var(--heading)}.chart-fallback ul{display:grid;gap:1vh;margin:0;padding:0;list-style:none;color:var(--muted);font-size:14px}.chart-fallback li::before{content:"↗";margin-right:8px;color:var(--accent)}.interpretation-rail{display:flex;flex-direction:column;gap:1px;background:var(--border);border:1px solid var(--border)}.interpretation-rail article{flex:1;padding:2.1vh 1.8vw;background:var(--surface)}.interpretation-rail article span{color:var(--accent);font:700 10px var(--mono)}.interpretation-rail article strong{display:block;margin:1vh 0;font:700 clamp(17px,1.5vw,22px)/1.15 var(--heading)}.interpretation-rail article p{margin:0;color:var(--muted);font-size:13px;line-height:1.35}.interpretation-rail .implication{padding:2vh 1.8vw;background:color-mix(in srgb,var(--accent) 8%,var(--surface));grid-template-columns:1fr}.interpretation-rail .implication strong{font-size:16px}
  .evidence-table{position:relative;display:grid;grid-template-rows:auto 1fr auto;gap:2.4vh}.evidence-table.has-source>.slide-title{max-width:68%}.table-stage{min-height:0;overflow:hidden;border-top:2px solid var(--accent)}.table-stage table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed;background:color-mix(in srgb,var(--surface) 82%,transparent)}.table-stage th,.table-stage td{padding:1.25vh 1vw;border-bottom:1px solid var(--border);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}.table-stage th{color:var(--bg);background:var(--accent);font:800 13px var(--body)}.table-stage td{font-size:clamp(12px,1.05vw,15px)}.table-stage tr:nth-child(even) td{background:color-mix(in srgb,var(--accent) 4%,transparent)}
  .evidence-collage{display:grid;grid-template-rows:auto 1fr auto;gap:2.2vh}.collage-stage{display:grid;grid-template-columns:1.35fr .65fr;grid-template-rows:1fr 1fr;gap:1.2vw;min-height:0}.collage-stage .media-frame.is-dominant{grid-row:1/3}.collage-stage .media-frame img{height:calc(100% - 30px)}
  .answer-boundary{display:grid;grid-template-columns:1.15fr .85fr;grid-template-rows:1fr auto;gap:4vw}.answer-copy{display:flex;flex-direction:column;justify-content:center}.answer-copy h2{margin:2.5vh 0;font:790 clamp(44px,6vw,90px)/.92 var(--heading);letter-spacing:-.07em}.answer-copy p{max-width:700px;margin:0;color:var(--muted);font-size:clamp(17px,1.55vw,23px);line-height:1.42}.answer-boundary>.point-list{align-self:center}.boundary{grid-column:1/-1;display:grid;grid-template-columns:180px 1fr;gap:28px;padding-top:2vh;border-top:1px solid var(--accent-2)}.boundary span{color:var(--accent-2);font:700 11px var(--mono);letter-spacing:.14em}.boundary strong{font:650 clamp(17px,1.5vw,22px) var(--heading)}
  .answer-boundary.has-evidence-table .answer-copy{justify-content:flex-start}.answer-boundary.has-evidence-table .answer-copy h2{margin:1.4vh 0;font-size:clamp(34px,4.2vw,58px)}.answer-boundary.has-evidence-table .answer-copy p{font-size:clamp(14px,1.15vw,17px);line-height:1.32}.answer-evidence-table{margin-top:1.6vh;border:1px solid var(--border);overflow:hidden}.answer-evidence-table table{width:100%;border-collapse:collapse;font-size:clamp(10px,.82vw,13px)}.answer-evidence-table th,.answer-evidence-table td{padding:.55vh .55vw;border-bottom:1px solid var(--border);text-align:left}.answer-evidence-table th{color:var(--accent);font-family:var(--mono);font-weight:700}.answer-evidence-table td{color:var(--fg)}
  .evidence-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border)}.evidence-strip article{padding:2vh 1.5vw;background:var(--surface)}.evidence-strip span{color:var(--accent);font:10px var(--mono)}.evidence-strip strong{display:block;margin:1vh 0;font:700 18px var(--heading)}.evidence-strip p{margin:0;color:var(--muted);font-size:13px}
  .speaker-notes{position:absolute;z-index:20;left:5.6vw;right:5.6vw;bottom:5.5vh;max-height:38%;overflow:auto;padding:22px 26px;opacity:0;pointer-events:none;transform:translateY(24px);transition:.3s var(--ease);background:color-mix(in srgb,var(--black) 88%,transparent);border:1px solid color-mix(in srgb,var(--accent) 45%,var(--border));box-shadow:0 30px 90px #0008;backdrop-filter:blur(22px)}body.notes-open .slide.is-active .speaker-notes{opacity:1;pointer-events:auto;transform:none}.speaker-notes>span{color:var(--accent);font:11px var(--mono)}.speaker-notes h3{margin:8px 0;font:700 20px var(--heading)}.speaker-notes p{margin:0 0 10px;line-height:1.55}.speaker-notes b{display:block;color:var(--accent-2);font-size:13px}.speaker-notes small{display:block;margin-top:10px;color:var(--muted)}
  .deck-nav{position:fixed;z-index:50;right:26px;bottom:22px;display:flex;align-items:center;gap:8px;padding:8px;background:#05070dcc;border:1px solid #ffffff20;backdrop-filter:blur(18px)}.deck-nav button{width:34px;height:34px;color:#fff;background:transparent;border:1px solid #ffffff20;cursor:pointer}.deck-nav button:hover{color:var(--black);background:var(--accent)}.deck-counter{min-width:60px;text-align:center;color:#fff;font:11px var(--mono)}.progress{position:fixed;z-index:55;left:0;right:0;bottom:0;height:3px;background:#ffffff14}.progress i{display:block;width:0;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .5s var(--ease)}
  .profile-editorial .slide::after,.profile-consulting .slide::after{opacity:.05}.profile-editorial .slide-title h2,.profile-editorial .thesis-copy h1{font-family:Georgia,"Noto Serif SC",serif}.profile-scientific .slide::after,.profile-blueprint .slide::after{opacity:.32;background-size:40px 40px}.profile-frontier .slide::before{background:radial-gradient(circle at 70% 20%,color-mix(in srgb,var(--accent) 30%,transparent),transparent 30%),radial-gradient(circle at 15% 85%,color-mix(in srgb,var(--accent-2) 23%,transparent),transparent 34%),#050812}.profile-academic .ambient,.profile-editorial .ambient{opacity:.4}
  @media(max-width:820px){.slide-surface{padding:5vh 7vw}.slide-title{max-width:100%}.image-thesis-split,.answer-boundary,.chart-rail{grid-template-columns:1fr}.image-thesis-split .hero-evidence{display:none}.argument-fields{grid-template-columns:1fr}.mechanism-grid{gap:8px}.flow-steps{grid-template-columns:repeat(2,1fr)}.flow-steps article:nth-child(n+3){display:none}.metric-grid{gap:12px}.chart-stage{display:none}.interpretation-rail{grid-column:1}.thesis-stage{grid-template-columns:1fr}.thesis-mark{display:none}}
  @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}
`;

const SCRIPT = `
  const slides=[...document.querySelectorAll('.slide')];
  const counter=document.querySelector('.deck-counter');
  const progress=document.querySelector('.progress i');
  let current=Math.max(0,Math.min(slides.length-1,(parseInt(location.hash.slice(1),10)||1)-1));
  function show(index){
    current=(index+slides.length)%slides.length;
    slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===current);slide.classList.toggle('is-before',i<current);slide.setAttribute('aria-hidden',i===current?'false':'true')});
    counter.textContent=(current+1)+' / '+slides.length;
    progress.style.width=((current+1)/slides.length*100)+'%';
    history.replaceState(null,'','#'+(current+1));
  }
  const next=()=>show(current+1),prev=()=>show(current-1);
  document.querySelector('[data-action=next]').onclick=next;
  document.querySelector('[data-action=prev]').onclick=prev;
  document.querySelector('[data-action=notes]').onclick=()=>document.body.classList.toggle('notes-open');
  window.addEventListener('hashchange',()=>{const index=(parseInt(location.hash.slice(1),10)||1)-1;if(index!==current)show(index)});
  document.addEventListener('keydown',event=>{
    if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();next()}
    if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();prev()}
    if(event.key.toLowerCase()==='n')document.body.classList.toggle('notes-open');
    if(event.key==='Home')show(0);if(event.key==='End')show(slides.length-1);
  });
  let startX=null;document.addEventListener('touchstart',e=>startX=e.changedTouches[0].clientX,{passive:true});
  document.addEventListener('touchend',e=>{if(startX===null)return;const d=e.changedTouches[0].clientX-startX;if(Math.abs(d)>50)(d<0?next:prev)();startX=null},{passive:true});
  show(current);
`;

function notesMarkdown(spec) {
  const lines = [
    `# ${spec.deck.title}｜逐页演讲稿`,
    "",
    `> ${spec.deck.communication_job || spec.narrative?.key_message || ""}`,
    "",
    `- 目标听众：${spec.deck.audience}`,
    `- 建议时长：${spec.deck.talk_duration_minutes || "—"} 分钟`,
    `- 开场问题：${spec.narrative?.opening_question || "—"}`,
    `- 收束答案：${spec.narrative?.closing_answer || "—"}`,
    "",
  ];
  for (const [index, slide] of spec.slides.entries()) {
    const notes = slide.speaker_notes || { talk_track: slide.speaker_note || "", delivery_cue: "", source_refs: [] };
    lines.push(
      `## ${index + 1}. ${slide.action_title || slide.primary_claim}`,
      "",
      `- 观众问题：${slide.audience_question || "—"}`,
      `- 页面主张：${slide.primary_claim}`,
      `- 页面作用：${slide.narrative_job || slide.slide_goal}`,
      `- 建议时长：${notes.estimated_seconds || 60} 秒`,
      "",
      notes.talk_track || "",
      "",
      `**讲述提示：** ${notes.delivery_cue || "先讲结论，再解释证据。"}`,
      "",
      `**转场：** ${slide.transition_out || "进入下一页。"}`,
      "",
      safeArray(notes.source_refs).length ? `**来源：** ${notes.source_refs.join("、")}` : "**来源：** 无外部来源",
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

export function reactHtmlDocument(spec) {
  const profile = String(spec.theme?.visual_profile || "frontier").replace(/[^a-z0-9_-]/gi, "");
  const markup = renderToStaticMarkup(h(Deck, { spec }));
  return `<!doctype html>
<html lang="${spec.deck.language || "zh-CN"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="color-scheme" content="dark light" />
  <meta name="generator" content="Codex React SSR presentation renderer" />
  <link rel="icon" href="data:," />
  <title>${String(spec.deck.title).replaceAll("<", "&lt;")}</title>
  <style>${themeCss(spec.theme || {})}${CSS}</style>
</head>
<body class="profile-${profile}">
  ${markup}
  <script>${SCRIPT}</script>
</body>
</html>`;
}

export async function renderReactHtml({ spec, outPath }) {
  const notesPath = path.join(path.dirname(outPath), "speaker-notes.md");
  await writeText(outPath, reactHtmlDocument(spec));
  await writeText(notesPath, notesMarkdown(spec));
  return { htmlPath: outPath, notesPath, slideCount: spec.slides.length, engine: "react-ssr", warnings: [] };
}
