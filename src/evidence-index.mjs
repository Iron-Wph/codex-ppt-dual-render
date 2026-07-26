import path from "node:path";
import { writeJson } from "./utils.mjs";

function pageBlocks(page) {
  const text = String(page.text || "").trim();
  if (!text) return [];
  return [{
    id: `p${page.page}-text`,
    type: "page_text",
    source_page: page.page,
    text,
  }];
}

function normalizeAsset(asset) {
  const page = Number(asset.source_page || asset.page || 0);
  const index = Number(asset.index || 1);
  return {
    id: asset.id || `p${page}-image-${index}`,
    type: asset.type || "evidence_asset",
    source_page: page || null,
    path: String(asset.path || "").replaceAll("\\", "/"),
    mime_type: asset.mime_type || asset.content_type || null,
    width: asset.width || null,
    height: asset.height || null,
    bytes: asset.bytes || null,
    snapshot: Boolean(asset.snapshot),
    crop: Boolean(asset.crop),
    table_ref: asset.table_ref || null,
    caption: asset.caption || `第 ${page} 页提取图片`,
    alt_text: asset.alt_text || `论文第 ${page} 页图片`,
    editable_level: "image",
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
    label: table.label || null,
    categories: Array.isArray(table.categories) ? table.categories.map(String) : [],
    editable_level: "native-table",
  };
}

export function buildEvidenceIndex({ inputPath, inputType, extraction }) {
  const pages = (extraction.pages || []).map((page, index) => ({
    page: Number(page.page || index + 1),
    text: String(page.text || ""),
    blocks: page.blocks || pageBlocks(page),
  }));
  const assets = (extraction.assets || []).map(normalizeAsset).filter((asset) => asset.path);
  const tables = (extraction.tables || []).map(normalizeTable).filter((table) => table.values.length && table.columns);
  const sections = pages.flatMap((page) => {
    const lines = page.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.filter((line) => /^#{1,4}\s+/.test(line) || /^(abstract|introduction|method|experiment|result|conclusion|limitations?)/i.test(line))
      .slice(0, 8)
      .map((title, index) => ({ id: `p${page.page}-section-${index + 1}`, source_page: page.page, title: title.replace(/^#{1,4}\s+/, "") }));
  });
  const claims = pages.flatMap((page) => page.text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 40 && !/^[-*#]/.test(line))
    .slice(0, 4)
    .map((text, index) => ({ id: `p${page.page}-claim-${index + 1}`, source_page: page.page, text })));
  return {
    version: "0.2.0",
    input: { path: path.resolve(inputPath), type: inputType },
    parser: extraction.parser || "pypdf",
    page_count: Number(extraction.page_count || pages.length),
    character_count: [...String(extraction.text || "")].length,
    pages,
    sections,
    claims,
    assets,
    tables,
  };
}

export async function writeEvidenceIndex(index, outPath) {
  await writeJson(outPath, index);
  return index;
}

export function evidencePromptContext(index, maxChars = 16000) {
  if (!index) return "无 evidence index。";
  const pageDigest = index.pages.map((page) => {
    const snippet = page.text.replace(/\s+/g, " ").slice(0, 650);
    return `PAGE ${page.page}: ${snippet}`;
  }).join("\n");
  const assetDigest = index.assets.length
    ? index.assets.map((asset) => `${asset.id} | page=${asset.source_page} | path=${asset.path} | ${asset.caption}`).join("\n")
    : "无可提取嵌入图片；需要使用页面截图或图表重绘。";
  const sectionDigest = index.sections.map((section) => `${section.id} | page=${section.source_page} | ${section.title}`).join("\n") || "未识别到明确章节标题。";
  const output = `证据索引摘要：\n章节：\n${sectionDigest}\n\n图片资产：\n${assetDigest}\n\n页级文本摘要：\n${pageDigest}`;
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
