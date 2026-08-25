import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, ensureDir, writeJson, writeText } from "./utils.mjs";
import { listThemes } from "./theme-presets.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function palette(theme) {
  return ["background", "surface", "foreground", "accent", "accent2", "accent3"]
    .map((key) => `<i title="${escapeHtml(key)}" style="background:${escapeHtml(theme.colors[key])}"></i>`)
    .join("");
}

function themeCard(theme, imagePath) {
  const colors = theme.colors;
  const tags = (theme.tags || []).slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const media = imagePath
    ? `<img src="${escapeHtml(imagePath)}" alt="${escapeHtml(`${theme.label} style reference`)}">`
    : `<div class="media-placeholder">VISUAL<br>REFERENCE</div>`;
  return `<article class="theme-card" id="${escapeHtml(theme.id)}">
    <header>
      <div><small>${escapeHtml(theme.category)}</small><h2>${escapeHtml(theme.label)}</h2></div>
      <code>${escapeHtml(theme.id)}</code>
    </header>
    <div class="mini-slide" style="
      --bg:${escapeHtml(colors.background)};
      --surface:${escapeHtml(colors.surface)};
      --surface2:${escapeHtml(colors.surface2)};
      --fg:${escapeHtml(colors.foreground)};
      --muted:${escapeHtml(colors.muted)};
      --accent:${escapeHtml(colors.accent)};
      --accent2:${escapeHtml(colors.accent2)};
      --border:${escapeHtml(colors.border)};">
      <div class="mini-copy"><b>RESEARCH / EVIDENCE</b><h3>One claim, supported visually</h3><p>${escapeHtml(theme.composition)}</p></div>
      <figure>${media}<figcaption>${escapeHtml(theme.image_treatment)}</figcaption></figure>
      <div class="mini-data">
        <div class="bars"><i style="width:84%"></i><i style="width:62%"></i><i style="width:41%"></i></div>
        <table><tbody><tr><th>Signal</th><th>Result</th></tr><tr><td>Evidence</td><td>+24%</td></tr></tbody></table>
      </div>
    </div>
    <p class="description">${escapeHtml(theme.mood)} · ${escapeHtml(theme.density)} density</p>
    <div class="tags">${tags}</div>
    <div class="palette">${palette(theme)}</div>
  </article>`;
}

export async function writeTemplateGallery(outDir) {
  const output = path.resolve(outDir);
  const assetDir = path.join(output, "assets");
  await ensureDir(assetDir);
  const themes = listThemes();
  const cards = [];
  for (const theme of themes) {
    let imagePath = null;
    if (theme.style_reference_asset) {
      const source = path.resolve(PROJECT_ROOT, theme.style_reference_asset);
      const extension = path.extname(source) || ".png";
      const filename = `${theme.id}${extension}`;
      try {
        await fs.copyFile(source, path.join(assetDir, filename));
        imagePath = `assets/${filename}`;
      } catch {
        imagePath = null;
      }
    }
    cards.push(themeCard(theme, imagePath));
  }
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PPT Template Catalog</title>
  <style>
    *{box-sizing:border-box}body{margin:0;background:#0c111b;color:#edf3ff;font:15px/1.45 "Microsoft YaHei",sans-serif}
    main{width:min(1500px,94vw);margin:auto;padding:52px 0 80px}.hero{display:flex;justify-content:space-between;gap:40px;align-items:end;margin-bottom:36px}
    h1{max-width:800px;margin:0;font-size:clamp(38px,5vw,74px);line-height:.95;letter-spacing:-.06em}.hero p{max-width:520px;margin:0;color:#9caeca}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(470px,1fr));gap:24px}.theme-card{padding:22px;border:1px solid #293853;background:#121a28}
    .theme-card header{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:16px}.theme-card small{color:#86a0c7;text-transform:uppercase;letter-spacing:.12em}
    .theme-card h2{margin:3px 0 0;font-size:25px}.theme-card code{padding:6px 9px;background:#0b111d;color:#9eb6d9;font-size:11px}
    .mini-slide{aspect-ratio:16/9;display:grid;grid-template-columns:1.04fr .96fr;grid-template-rows:1fr 118px;gap:16px;padding:28px;overflow:hidden;border:1px solid var(--border);background:var(--bg);color:var(--fg)}
    .mini-copy b{display:block;margin-bottom:20px;color:var(--accent);font-size:9px;letter-spacing:.15em}.mini-copy h3{max-width:360px;margin:0;font-size:32px;line-height:.98;letter-spacing:-.05em}.mini-copy p{max-width:360px;margin:18px 0 0;color:var(--muted);font-size:11px}
    figure{min-width:0;height:100%;margin:0;padding:8px;border:1px solid var(--border);background:var(--surface)}figure img,.media-placeholder{display:grid;place-items:center;width:100%;height:calc(100% - 20px);object-fit:cover;background:var(--surface2);color:var(--muted);font-size:11px;text-align:center}
    figcaption{overflow:hidden;margin-top:5px;color:var(--muted);font-size:8px;text-overflow:ellipsis;white-space:nowrap}.mini-data{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .bars,table{height:100%;padding:13px;border:1px solid var(--border);background:var(--surface)}.bars{display:flex;flex-direction:column;justify-content:center;gap:10px}.bars i{display:block;height:10px;background:linear-gradient(90deg,var(--accent),var(--accent2))}
    table{width:100%;border-collapse:collapse;color:var(--fg);font-size:9px}th,td{border:1px solid var(--border);padding:7px;text-align:left}th{background:var(--accent);color:var(--bg)}
    .description{margin:15px 0 10px;color:#a6b6cf}.tags{display:flex;flex-wrap:wrap;gap:6px}.tags span{padding:4px 7px;border:1px solid #31405a;color:#aebed6;font-size:11px}
    .palette{display:flex;margin-top:14px}.palette i{width:34px;height:18px;border:1px solid rgba(255,255,255,.2)}
    @media(max-width:620px){.hero{display:block}.hero p{margin-top:20px}.grid{grid-template-columns:1fr}.theme-card{padding:12px}.mini-slide{padding:16px}.mini-copy h3{font-size:22px}}
  </style>
</head>
<body><main>
  <section class="hero"><h1>Editable PPT Template Catalog</h1><p>主题不是背景图，而是颜色、字体、间距、图片处理、表格处理和布局语法的共同合同。每张预览同时检查文字、图片、数据与表格。</p></section>
  <section class="grid">${cards.join("\n")}</section>
</main></body></html>`;
  await writeText(path.join(output, "index.html"), html);
  await writeJson(path.join(output, "catalog.json"), themes);
  return {
    output,
    html: path.join(output, "index.html"),
    catalog: path.join(output, "catalog.json"),
    theme_count: themes.length,
  };
}
