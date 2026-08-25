import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ensureDir } from "./utils.mjs";

const AUXILIARY_TYPES = new Set([
  "header",
  "footer",
  "page_header",
  "page_footer",
  "page_number",
  "page_aside_text",
  "aside_text",
  "page_footnote",
]);

function mineruCommand() {
  return process.env.MINERU_CLI_PATH || (process.platform === "win32" ? "mineru.exe" : "mineru");
}

function runProcess(command, args, { cwd, timeoutMs = 600_000 } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (error) => finish({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }));
    child.on("close", (code) => finish({ code, stdout, stderr }));
    timer = setTimeout(() => {
      try { child.kill(); } catch { /* already stopped */ }
      finish({ code: 124, stdout, stderr: `${stderr}\nMinerU 调用超过 ${timeoutMs}ms。` });
    }, timeoutMs);
  });
}

export async function probeMinerU() {
  const command = mineruCommand();
  const result = await runProcess(command, ["--version"], { timeoutMs: 12_000 });
  return {
    available: result.code === 0,
    command,
    version: result.code === 0 ? (result.stdout || result.stderr).trim() : null,
    error: result.code === 0 ? null : (result.stderr || `exit ${result.code}`).trim(),
  };
}

async function walkFiles(root) {
  const files = [];
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(target);
      else files.push(target);
    }
  }
  await walk(root);
  return files;
}

function findOutputFile(files, suffixes) {
  for (const suffix of suffixes) {
    const match = files.find((file) => file.toLowerCase().endsWith(suffix.toLowerCase()));
    if (match) return match;
  }
  return null;
}

function textFromSpans(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textFromSpans).filter(Boolean).join("");
  if (typeof value === "object") {
    if (typeof value.content === "string") return value.content;
    if (Array.isArray(value.children)) return textFromSpans(value.children);
    return Object.values(value).map(textFromSpans).filter(Boolean).join("");
  }
  return "";
}

function firstValue(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  }
  return null;
}

function listText(value) {
  if (Array.isArray(value)) return value.map(textFromSpans).map((item) => item.trim()).filter(Boolean);
  const text = textFromSpans(value).trim();
  return text ? [text] : [];
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function tableValuesFromMarkup(markup) {
  const source = String(markup || "").trim();
  if (!source) return [];
  if (/<table[\s>]/i.test(source)) {
    return [...source.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((rowMatch) =>
      [...rowMatch[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)]
        .map((cellMatch) => stripTags(cellMatch[1]))
    ).filter((row) => row.some(Boolean));
  }
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.includes("|"));
  if (lines.length < 2) return [];
  return lines
    .filter((line) => !/^\|?\s*:?-{3,}/.test(line))
    .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function normalizeType(rawType, rawLevel = null) {
  const type = String(rawType || "text").toLowerCase();
  if (type === "paragraph") return "text";
  if (type === "equation_interline" || type === "equation") return "formula";
  if (type === "algorithm") return "code";
  if (type === "image") return "figure";
  if (type === "chart") return "chart";
  if (type === "table") return "table";
  if (type === "title" || Number(rawLevel) > 0) return "title";
  return type;
}

function v2ToLegacyPages(data) {
  if (!Array.isArray(data) || !data.every(Array.isArray)) return null;
  return data.map((items, pageIndex) => items.map((item) => {
    const content = item?.content || {};
    const type = String(item?.type || "paragraph");
    const text = textFromSpans(firstValue(content, [
      "title_content",
      "paragraph_content",
      "math_content",
      "code_content",
      "algorithm_content",
      "list_items",
      "index_content",
    ]));
    const prefix = type === "image" ? "image" : type === "chart" ? "chart" : type === "table" ? "table" : type;
    return {
      type,
      page_idx: pageIndex,
      bbox: item?.bbox || null,
      text,
      text_level: Number(content.level || 0),
      img_path: firstValue(content, ["image_path", "img_path", "path"]),
      [`${prefix}_caption`]: listText(firstValue(content, [`${prefix}_caption`, "caption"])),
      [`${prefix}_footnote`]: listText(firstValue(content, [`${prefix}_footnote`, "footnote"])),
      table_body: firstValue(content, ["table_body", "html", "markdown", "content"]),
      sub_type: item?.sub_type || null,
      score: item?.score ?? null,
    };
  }));
}

function normalizePageGroups(data) {
  const v2 = v2ToLegacyPages(data);
  if (v2) return v2;
  if (!Array.isArray(data)) return [];
  if (data.every(Array.isArray)) return data;
  const pages = [];
  for (const item of data) {
    const pageIndex = Math.max(0, Number(item?.page_idx || 0));
    while (pages.length <= pageIndex) pages.push([]);
    pages[pageIndex].push(item);
  }
  return pages;
}

function itemText(item) {
  if (Array.isArray(item?.list_items)) return item.list_items.map(String).join("\n");
  return String(firstValue(item, ["text", "code_body", "content", "algorithm_body"]) || "").trim();
}

function visualMetadata(item, type) {
  const prefix = type === "figure" ? "image" : type;
  const caption = listText(firstValue(item, [`${prefix}_caption`, "caption"])).join(" ").trim();
  const footnote = listText(firstValue(item, [`${prefix}_footnote`, "footnote"])).join(" ").trim();
  return { caption, footnote };
}

function sourceImagePath(item, jsonDir) {
  const relative = firstValue(item, ["img_path", "image_path", "path"]);
  if (!relative) return null;
  return path.isAbsolute(String(relative)) ? String(relative) : path.resolve(jsonDir, String(relative));
}

async function copyVisualAsset({ source, assetDir, page, type, index }) {
  if (!source) return null;
  try {
    await fs.access(source);
    const extension = path.extname(source) || ".png";
    const filename = `mineru-p${String(page).padStart(3, "0")}-${type}-${String(index).padStart(2, "0")}${extension}`;
    const target = path.join(assetDir, filename);
    await fs.copyFile(source, target);
    const stat = await fs.stat(target);
    return {
      path: path.join("assets", filename).replaceAll("\\", "/"),
      bytes: stat.size,
      mime_type: extension.toLowerCase() === ".jpg" || extension.toLowerCase() === ".jpeg" ? "image/jpeg" : extension.toLowerCase() === ".svg" ? "image/svg+xml" : "image/png",
    };
  } catch {
    return null;
  }
}

export async function normalizeMinerUContent({ data, jsonPath, assetDir, parserVersion = null, backend = null }) {
  await ensureDir(assetDir);
  const pageGroups = normalizePageGroups(data);
  const pages = [];
  const assets = [];
  const tables = [];
  const formulas = [];
  const jsonDir = path.dirname(jsonPath);
  for (const [pageIndex, items] of pageGroups.entries()) {
    const page = pageIndex + 1;
    const blocks = [];
    const pageText = [];
    let visualIndex = 0;
    let tableIndex = 0;
    let formulaIndex = 0;
    for (const [readingIndex, item] of (items || []).entries()) {
      const rawType = String(item?.type || "text");
      if (AUXILIARY_TYPES.has(rawType)) continue;
      const type = normalizeType(rawType, item?.text_level);
      const text = itemText(item);
      const metadata = visualMetadata(item, type);
      const bbox = Array.isArray(item?.bbox) ? item.bbox.map(Number) : null;
      const block = {
        id: `p${page}-block-${readingIndex + 1}`,
        type,
        source_page: page,
        reading_order: readingIndex + 1,
        bbox,
        text,
        level: type === "title" ? Math.max(1, Number(item?.text_level || 1)) : null,
        caption: metadata.caption || null,
        footnote: metadata.footnote || null,
        confidence: item?.score !== null && item?.score !== undefined && Number.isFinite(Number(item.score)) ? Number(item.score) : null,
        sub_type: item?.sub_type || null,
      };
      if (["title", "text", "list", "code"].includes(type) && text) pageText.push(text);
      if (["figure", "chart", "table", "formula"].includes(type)) {
        visualIndex += 1;
        const copied = await copyVisualAsset({
          source: sourceImagePath(item, jsonDir),
          assetDir,
          page,
          type,
          index: visualIndex,
        });
        if (copied) {
          const assetId = `p${page}-${type}-${visualIndex}`;
          block.asset_ref = assetId;
          assets.push({
            id: assetId,
            type: type === "table" ? "evidence_table_crop" : type === "formula" ? "evidence_formula" : `evidence_${type}`,
            source_page: page,
            index: visualIndex,
            bbox,
            caption: metadata.caption || `${type} on page ${page}`,
            footnote: metadata.footnote || null,
            editable_level: type === "formula" ? "latex-and-image" : "image",
            crop: true,
            snapshot: false,
            ...copied,
          });
        }
      }
      if (type === "table") {
        tableIndex += 1;
        const values = tableValuesFromMarkup(firstValue(item, ["table_body", "content", "text"]));
        const columnCount = Math.max(0, ...values.map((row) => row.length));
        if (values.length && columnCount) {
          const normalizedValues = values.map((row) => row.concat(Array(Math.max(0, columnCount - row.length)).fill("")));
          const tableId = `p${page}-table-${tableIndex}`;
          const tableAsset = block.asset_ref ? assets.find((asset) => asset.id === block.asset_ref) : null;
          if (tableAsset) tableAsset.table_ref = tableId;
          tables.push({
            id: tableId,
            type: "evidence_table",
            source_page: page,
            index: tableIndex,
            bbox,
            rows: normalizedValues.length,
            columns: columnCount,
            values: normalizedValues,
            nonempty_ratio: Number((normalizedValues.flat().filter(Boolean).length / Math.max(1, normalizedValues.length * columnCount)).toFixed(3)),
            caption: metadata.caption || `Table on page ${page}`,
            footnote: metadata.footnote || null,
            crop_asset_id: block.asset_ref || null,
            editable_level: "native-table",
          });
          block.table_ref = tableId;
        }
      }
      if (type === "formula") {
        formulaIndex += 1;
        const formulaText = text || String(item?.math_content || "");
        formulas.push({
          id: `p${page}-formula-${formulaIndex}`,
          type: "formula",
          source_page: page,
          index: formulaIndex,
          bbox,
          latex: formulaText,
          asset_ref: block.asset_ref || null,
          editable_level: block.asset_ref ? "latex-and-image" : "latex",
        });
      }
      blocks.push(block);
    }
    pages.push({ page, text: pageText.join("\n\n"), blocks });
  }
  const text = pages.map((page) => `--- PAGE ${page.page} ---\n${page.text}`).join("\n\n");
  return {
    page_count: pages.length,
    text,
    pages,
    assets,
    tables,
    formulas,
    parser: "mineru",
    parser_details: {
      engine: "mineru",
      version: parserVersion,
      backend,
      source_json: jsonPath,
      structured_blocks: pages.reduce((count, page) => count + page.blocks.length, 0),
    },
  };
}

export async function parseExistingMinerUOutput(outputRoot, assetDir) {
  const files = await walkFiles(outputRoot);
  const jsonPath = findOutputFile(files, ["_content_list_v2.json", "_content_list.json"]);
  if (!jsonPath) {
    throw new Error(`MinerU 输出中未找到 *_content_list_v2.json 或 *_content_list.json：${outputRoot}`);
  }
  const data = JSON.parse(await fs.readFile(jsonPath, "utf8"));
  return normalizeMinerUContent({ data, jsonPath, assetDir });
}

export async function extractWithMinerU(pdfPath, outputDir, { backend = "hybrid-engine", effort = "medium" } = {}) {
  const probe = await probeMinerU();
  if (!probe.available) {
    throw new Error(`未检测到 MinerU CLI（${probe.command}）。请安装 MinerU，或使用 --parser auto/pymupdf。\n${probe.error || ""}`.trim());
  }
  const mineruRoot = path.join(path.resolve(outputDir), "codex", "mineru");
  const assetDir = path.join(path.resolve(outputDir), "assets");
  await fs.rm(mineruRoot, { recursive: true, force: true });
  await ensureDir(mineruRoot);
  const args = ["-p", path.resolve(pdfPath), "-o", mineruRoot, "-b", backend];
  if (backend === "hybrid-engine") args.push("--effort", effort);
  const result = await runProcess(probe.command, args, {
    cwd: path.resolve(outputDir),
    timeoutMs: Number(process.env.MINERU_TIMEOUT_MS || 1_800_000),
  });
  await fs.writeFile(path.join(mineruRoot, "mineru.log"), `${result.stdout}\n\n[stderr]\n${result.stderr}`, "utf8");
  if (result.code !== 0) {
    throw new Error(`MinerU 解析失败，退出码 ${result.code}。\n${result.stderr.slice(-3000)}`);
  }
  const extraction = await parseExistingMinerUOutput(mineruRoot, assetDir);
  return {
    ...extraction,
    parser_details: {
      ...extraction.parser_details,
      version: probe.version,
      backend,
      effort: backend === "hybrid-engine" ? effort : null,
      output_root: mineruRoot,
    },
  };
}
