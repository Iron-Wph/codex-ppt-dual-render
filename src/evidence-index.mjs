import path from "node:path";
import { writeJson } from "./utils.mjs";

function pageBlocks(page) {
  const text = String(page.text || "").trim();
  if (!text) return [];
  return [{
    id: `p${page.page}-text`,
    type: "page_text",
    source_page: page.page,
    reading_order: 1,
    bbox: null,
    text,
    level: null,
    caption: null,
    footnote: null,
    confidence: null,
  }];
}

function normalizeBlock(block, page, index) {
  const type = String(block?.type || "text").toLowerCase();
  return {
    id: block?.id || `p${page}-block-${index + 1}`,
    type,
    source_page: Number(block?.source_page || page),
    reading_order: Number(block?.reading_order || index + 1),
    bbox: Array.isArray(block?.bbox) ? block.bbox.map(Number) : null,
    text: String(block?.text || ""),
    level: block?.level === null || block?.level === undefined ? null : Number(block.level),
    caption: block?.caption ? String(block.caption) : null,
    footnote: block?.footnote ? String(block.footnote) : null,
    confidence: block?.confidence !== null && block?.confidence !== undefined && Number.isFinite(Number(block.confidence)) ? Number(block.confidence) : null,
    asset_ref: block?.asset_ref || null,
    table_ref: block?.table_ref || null,
    sub_type: block?.sub_type || null,
  };
}

function normalizeAsset(asset) {
  const page = Number(asset.source_page || asset.page || 0);
  const index = Number(asset.index || 1);
  return {
    id: asset.id || `p${page}-image-${index}`,
    type: asset.type || "evidence_asset",
    source_page: page || null,
    index,
    bbox: Array.isArray(asset.bbox) ? asset.bbox.map(Number) : null,
    path: String(asset.path || "").replaceAll("\\", "/"),
    mime_type: asset.mime_type || asset.content_type || null,
    width: asset.width || null,
    height: asset.height || null,
    bytes: asset.bytes || null,
    snapshot: Boolean(asset.snapshot),
    crop: Boolean(asset.crop),
    table_ref: asset.table_ref || null,
    caption: asset.caption || `第 ${page} 页提取图片`,
    footnote: asset.footnote || null,
    alt_text: asset.alt_text || asset.caption || `论文第 ${page} 页图片`,
    editable_level: asset.editable_level || "image",
  };
}

function normalizeTable(table) {
  const values = Array.isArray(table.values)
    ? table.values.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : [])
    : [];
  const columns = Number(table.columns || Math.max(0, ...values.map((row) => row.length)));
  return {
    id: table.id,
    type: "evidence_table",
    source_page: Number(table.source_page || table.page || 0) || null,
    index: Number(table.index || 1),
    bbox: table.bbox || null,
    rows: Number(table.rows || values.length),
    columns,
    values,
    nonempty_ratio: Number(table.nonempty_ratio || 0),
    caption: table.caption || "Paper table or chart region",
    footnote: table.footnote || null,
    label: table.label || null,
    categories: Array.isArray(table.categories) ? table.categories.map(String) : [],
    crop_asset_id: table.crop_asset_id || null,
    editable_level: table.editable_level || "native-table",
  };
}

function normalizeFormula(formula) {
  return {
    id: formula.id,
    type: "formula",
    source_page: Number(formula.source_page || formula.page || 0) || null,
    index: Number(formula.index || 1),
    bbox: Array.isArray(formula.bbox) ? formula.bbox.map(Number) : null,
    latex: String(formula.latex || formula.text || ""),
    asset_ref: formula.asset_ref || null,
    editable_level: formula.editable_level || "latex",
  };
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function inferredSections(pages) {
  const structured = pages.flatMap((page) => page.blocks
    .filter((block) => block.type === "title" && block.text.trim())
    .map((block, index) => ({
      id: block.id || `p${page.page}-section-${index + 1}`,
      source_page: page.page,
      title: block.text.trim(),
      level: block.level || 1,
      bbox: block.bbox,
    })));
  if (structured.length) return uniqueById(structured);
  return pages.flatMap((page) => {
    const lines = page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.filter((line) => /^#{1,4}\s+/.test(line) || /^(abstract|introduction|method|experiment|result|conclusion|limitations?)/i.test(line))
      .slice(0, 8)
      .map((title, index) => ({
        id: `p${page.page}-section-${index + 1}`,
        source_page: page.page,
        title: title.replace(/^#{1,4}\s+/, ""),
        level: 1,
        bbox: null,
      }));
  });
}

function inferredClaims(pages) {
  return pages.flatMap((page) => {
    const blockClaims = page.blocks
      .filter((block) => ["text", "page_text", "list"].includes(block.type))
      .map((block) => block.text.replace(/\s+/g, " ").trim())
      .filter((text) => text.length >= 40 && !/^[-*#]/.test(text))
      .slice(0, 4)
      .map((text, index) => ({ id: `p${page.page}-claim-${index + 1}`, source_page: page.page, text }));
    if (blockClaims.length) return blockClaims;
    return page.text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 40 && !/^[-*#]/.test(line))
      .slice(0, 4)
      .map((text, index) => ({ id: `p${page.page}-claim-${index + 1}`, source_page: page.page, text }));
  });
}

export function buildEvidenceIndex({ inputPath, inputType, extraction }) {
  const pages = (extraction.pages || []).map((page, index) => {
    const pageNumber = Number(page.page || index + 1);
    const blocks = (page.blocks || pageBlocks({ ...page, page: pageNumber }))
      .map((block, blockIndex) => normalizeBlock(block, pageNumber, blockIndex))
      .sort((left, right) => left.reading_order - right.reading_order);
    return {
      page: pageNumber,
      text: String(page.text || ""),
      blocks,
    };
  });
  const assets = (extraction.assets || []).map(normalizeAsset).filter((asset) => asset.path);
  const tables = (extraction.tables || []).map(normalizeTable).filter((table) => table.values.length && table.columns);
  const formulas = (extraction.formulas || []).map(normalizeFormula).filter((formula) => formula.id && formula.latex);
  const sections = inferredSections(pages);
  const claims = inferredClaims(pages);
  const blockTypes = pages.flatMap((page) => page.blocks).reduce((counts, block) => {
    counts[block.type] = (counts[block.type] || 0) + 1;
    return counts;
  }, {});
  return {
    version: "0.3.0",
    input: { path: path.resolve(inputPath), type: inputType },
    parser: extraction.parser || "pypdf",
    parser_details: extraction.parser_details || null,
    page_count: Number(extraction.page_count || pages.length),
    character_count: [...String(extraction.text || "")].length,
    pages,
    sections,
    claims,
    assets,
    tables,
    formulas,
    diagnostics: {
      block_types: blockTypes,
      structured_block_count: pages.reduce((count, page) => count + page.blocks.length, 0),
      asset_count: assets.length,
      table_count: tables.length,
      formula_count: formulas.length,
      captioned_asset_count: assets.filter((asset) => asset.caption && !/第 \d+ 页(?:提取图片|嵌入图片)|embedded image|on page \d+|full-page evidence|cropped paper/i.test(asset.caption)).length,
    },
  };
}

export async function writeEvidenceIndex(index, outPath) {
  await writeJson(outPath, index);
  return index;
}

export function evidencePromptContext(index, maxChars = 22000) {
  if (!index) return "无 evidence index。";
  const pageDigest = index.pages.map((page) => {
    const titles = page.blocks.filter((block) => block.type === "title").map((block) => block.text).slice(0, 3).join(" / ");
    const snippet = page.text.replace(/\s+/g, " ").slice(0, 650);
    return `PAGE ${page.page}${titles ? ` [${titles}]` : ""}: ${snippet}`;
  }).join("\n");
  const assetDigest = index.assets.length
    ? index.assets.map((asset) => `${asset.id} | type=${asset.type} | page=${asset.source_page} | bbox=${JSON.stringify(asset.bbox)} | path=${asset.path} | ${asset.caption}`).join("\n")
    : "无可提取图片资产；需要使用页面截图或图表重绘。";
  const tableDigest = index.tables.length
    ? index.tables.map((table) => `${table.id} | page=${table.source_page} | ${table.rows}x${table.columns} | ${table.caption}`).join("\n")
    : "无结构化表格。";
  const formulaDigest = index.formulas.length
    ? index.formulas.map((formula) => `${formula.id} | page=${formula.source_page} | ${formula.latex.slice(0, 180)}`).join("\n")
    : "无结构化公式。";
  const sectionDigest = index.sections.map((section) => `${section.id} | page=${section.source_page} | level=${section.level || 1} | ${section.title}`).join("\n") || "未识别到明确章节标题。";
  const output = `证据索引摘要：
parser=${index.parser} version=${index.version}
diagnostics=${JSON.stringify(index.diagnostics || {})}

章节：
${sectionDigest}

图片/图表资产：
${assetDigest}

结构化表格：
${tableDigest}

公式：
${formulaDigest}

页级文本摘要：
${pageDigest}`;
  return output.slice(0, maxChars);
}

export function resolveEvidenceAssets(index, refs = []) {
  const wanted = new Set((refs || []).map((ref) => String(ref)));
  if (!index?.assets?.length) return [];
  const direct = index.assets.filter((asset) => wanted.has(asset.id));
  if (direct.length) return direct;
  const pages = [...wanted].map((ref) => Number(String(ref).match(/(?:page|p)(\d+)/i)?.[1] || 0)).filter(Boolean);
  if (!pages.length) return [];
  return index.assets.filter((asset) => pages.includes(Number(asset.source_page)));
}

export function resolveEvidenceTables(index, refs = []) {
  const wanted = new Set((refs || []).map((ref) => String(ref)));
  const tables = index?.tables || [];
  const direct = tables.filter((table) => wanted.has(table.id));
  if (direct.length) return direct;
  const pages = [...wanted].map((ref) => Number(String(ref).match(/(?:page|p)(\d+)/i)?.[1] || 0)).filter(Boolean);
  if (!pages.length) return [];
  return tables.filter((table) => pages.includes(Number(table.source_page)));
}

export function resolveEvidenceFormulas(index, refs = []) {
  const wanted = new Set((refs || []).map((ref) => String(ref)));
  return (index?.formulas || []).filter((formula) => wanted.has(formula.id));
}
