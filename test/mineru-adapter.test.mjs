import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildEvidenceIndex } from "../src/evidence-index.mjs";
import { normalizeMinerUContent } from "../src/mineru-parser.mjs";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-ppt-mineru-"));
const jsonDir = path.join(root, "result");
const imageDir = path.join(jsonDir, "images");
const assetDir = path.join(root, "assets");
await fs.mkdir(imageDir, { recursive: true });
await fs.writeFile(path.join(imageDir, "figure.png"), Buffer.from([137, 80, 78, 71]));
await fs.writeFile(path.join(imageDir, "table.png"), Buffer.from([137, 80, 78, 71]));
await fs.writeFile(path.join(imageDir, "formula.png"), Buffer.from([137, 80, 78, 71]));
const jsonPath = path.join(jsonDir, "paper_content_list.json");
await fs.writeFile(jsonPath, "[]", "utf8");

const legacy = [
  { type: "text", text: "1 Introduction", text_level: 1, bbox: [60, 80, 900, 130], page_idx: 0 },
  { type: "text", text: "This paper introduces a structured parsing pipeline with enough detail to become a claim.", bbox: [60, 150, 900, 260], page_idx: 0 },
  { type: "image", img_path: "images/figure.png", image_caption: ["Figure 1 System overview"], bbox: [100, 300, 900, 760], page_idx: 0 },
  { type: "table", img_path: "images/table.png", table_caption: ["Table 1 Results"], table_body: "<table><tr><th>Method</th><th>Score</th></tr><tr><td>Ours</td><td>91.2</td></tr></table>", bbox: [80, 200, 920, 650], page_idx: 1 },
  { type: "equation", img_path: "images/formula.png", text: "$$L = x + y$$", bbox: [200, 700, 800, 820], page_idx: 1 },
];

const extraction = await normalizeMinerUContent({ data: legacy, jsonPath, assetDir, parserVersion: "test", backend: "pipeline" });
assert.equal(extraction.parser, "mineru");
assert.equal(extraction.page_count, 2);
assert.equal(extraction.assets.length, 3);
assert.equal(extraction.tables.length, 1);
assert.deepEqual(extraction.tables[0].values, [["Method", "Score"], ["Ours", "91.2"]]);
assert.equal(extraction.formulas.length, 1);
assert.match(extraction.formulas[0].latex, /L = x/);

const evidence = buildEvidenceIndex({ inputPath: path.join(root, "paper.pdf"), inputType: "pdf", extraction });
assert.equal(evidence.version, "0.3.0");
assert.equal(evidence.sections[0].title, "1 Introduction");
assert.equal(evidence.diagnostics.table_count, 1);
assert.equal(evidence.diagnostics.formula_count, 1);
assert.ok(evidence.pages[0].blocks.some((block) => block.type === "figure" && block.caption === "Figure 1 System overview"));

const v2 = [[
  { type: "title", content: { title_content: [{ type: "text", content: "2 Method" }], level: 1 }, bbox: [80, 90, 900, 130] },
  { type: "paragraph", content: { paragraph_content: [{ type: "text", content: "The method follows human reading order." }] }, bbox: [80, 150, 900, 260] },
]];
const v2Extraction = await normalizeMinerUContent({ data: v2, jsonPath, assetDir });
assert.equal(v2Extraction.pages[0].blocks[0].type, "title");
assert.equal(v2Extraction.pages[0].blocks[0].text, "2 Method");
assert.match(v2Extraction.pages[0].text, /human reading order/);

await fs.rm(root, { recursive: true, force: true });
console.log("mineru-adapter.test: ok");
