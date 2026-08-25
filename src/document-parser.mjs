import { extractPdfText } from "./pdf-text.mjs";
import { extractWithMinerU, probeMinerU } from "./mineru-parser.mjs";

function requestedParser(value) {
  const parser = String(value || process.env.CODEX_PDF_PARSER || "auto").toLowerCase();
  if (!["auto", "pymupdf", "mineru"].includes(parser)) {
    throw new Error(`未知 PDF parser: ${parser}。可选 auto、pymupdf、mineru。`);
  }
  return parser;
}

function extractionDiagnostics(extraction) {
  const pages = extraction.pages || [];
  const textPages = pages.filter((page) => String(page.text || "").trim().length >= 80).length;
  const scannedLikePages = Math.max(0, pages.length - textPages);
  return {
    page_count: pages.length,
    text_page_ratio: pages.length ? Number((textPages / pages.length).toFixed(3)) : 0,
    scanned_like_page_ratio: pages.length ? Number((scannedLikePages / pages.length).toFixed(3)) : 0,
    character_count: [...String(extraction.text || "")].length,
    asset_count: extraction.assets?.length || 0,
    table_count: extraction.tables?.length || 0,
    formula_count: extraction.formulas?.length || 0,
    structured_block_count: pages.reduce((count, page) => count + (page.blocks?.length || 0), 0),
  };
}

function withSelection(extraction, selection) {
  return {
    ...extraction,
    parser_details: {
      ...(extraction.parser_details || {}),
      ...selection,
      diagnostics: extractionDiagnostics(extraction),
    },
  };
}

export async function extractPdfDocument(pdfPath, outputDir, options = {}) {
  const parser = requestedParser(options.parser);
  const backend = String(options.mineruBackend || process.env.MINERU_BACKEND || "hybrid-engine");
  const effort = String(options.mineruEffort || process.env.MINERU_EFFORT || "medium");
  if (parser === "pymupdf") {
    return withSelection(await extractPdfText(pdfPath, outputDir), {
      requested: parser,
      selected: "pymupdf",
      fallback_reason: null,
    });
  }
  if (parser === "mineru") {
    return withSelection(await extractWithMinerU(pdfPath, outputDir, { backend, effort }), {
      requested: parser,
      selected: "mineru",
      fallback_reason: null,
    });
  }

  const probe = await probeMinerU();
  if (probe.available && options.preferMinerU !== false) {
    try {
      return withSelection(await extractWithMinerU(pdfPath, outputDir, { backend, effort }), {
        requested: "auto",
        selected: "mineru",
        fallback_reason: null,
      });
    } catch (error) {
      const fallback = await extractPdfText(pdfPath, outputDir);
      return withSelection(fallback, {
        requested: "auto",
        selected: "pymupdf",
        fallback_reason: `MinerU failed: ${error.message}`,
      });
    }
  }
  const fallback = await extractPdfText(pdfPath, outputDir);
  return withSelection(fallback, {
    requested: "auto",
    selected: "pymupdf",
    fallback_reason: probe.error ? `MinerU unavailable: ${probe.error}` : "MinerU unavailable",
  });
}

export { extractionDiagnostics };
