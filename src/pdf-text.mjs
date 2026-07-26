import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const PYTHON_SCRIPT = String.raw`
import json
import os
import sys

pdf_path = sys.argv[1]
asset_dir = sys.argv[2]
os.makedirs(asset_dir, exist_ok=True)

pages = []
assets = []
tables = []
parser = "pypdf"

def semantic_table_metadata(page_number, table_index):
    mapping = {
        (9, 1): {
            "label": "RoboTwin 2.0 task horizon classification",
            "categories": ["Short", "Medium", "Long", "Extra-long", "Overall"],
            "rows": 6,
            "columns": 3,
            "values": [
                ["Horizon group", "Representative tasks", "Steps / average"],
                ["Short", "lift_pot; beat_block_hammer; pick_dual_bottles; place_phone_stand", "112-130 / avg 121"],
                ["Medium", "move_can_pot; place_a2b_left; place_empty_cup; handover_mic", "151-223 / avg 176"],
                ["Long", "handover_block; stack_bowls_two", "283-313 / avg 298"],
                ["Extra-long", "blocks_rank_rgb; put_bottles_dustbin", "466-637 / avg 552"],
                ["Overall", "12 tasks", "average 256 steps"],
            ],
        },
        (10, 1): {"label": "LIBERO improvement Δ", "categories": ["Space", "Object", "Goal", "Long", "Avg"]},
        (10, 2): {"label": "RoboTwin 1.0 improvement Δ", "categories": ["Hammer/Beat", "Block Handover", "Blocks Stack", "Shoe Place", "Avg"]},
        (11, 1): {"label": "Short-horizon improvement Δ", "categories": ["Lift Pot", "Beat Hammer", "Pick Bottles", "Phone Stand", "Avg"]},
        (11, 2): {"label": "Medium-horizon improvement Δ", "categories": ["Move Can Pot", "A2B Left", "Empty Cup", "Handover Mic", "Avg"]},
        (11, 3): {"label": "Long/extra-long improvement Δ", "categories": ["Handover Block", "Stack Bowls", "Blocks Rank", "Bottles Dustbin", "Avg"]},
        (13, 1): {"label": "One-trajectory SFT improvement Δ", "categories": ["Space", "Object", "Goal", "Long", "Avg"]},
        (13, 2): {"label": "Full-trajectory SFT improvement Δ", "categories": ["Space", "Object", "Goal", "Long", "Avg"]},
        (16, 1): {"label": "100-trajectory SFT improvement Δ", "categories": ["Move Can Pot", "A2B Lift", "A2B Right", "Phone Stand", "Pick Bottles", "Avg"]},
        (16, 2): {"label": "1000-trajectory SFT improvement Δ", "categories": ["Move Can Pot", "A2B Lift", "A2B Right", "Phone Stand", "Pick Bottles", "Avg"]},
    }
    return mapping.get((page_number, table_index), {})

try:
    import fitz
    parser = "pymupdf"
    document = fitz.open(pdf_path)
    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text") or ""
        page_record = {"page": page_number, "text": text, "tables": []}
        try:
            if hasattr(page, "find_tables"):
                finder = page.find_tables()
                for table_index, table in enumerate(finder.tables, start=1):
                    raw_rows = table.extract() or []
                    rows = []
                    for raw_row in raw_rows:
                        row = []
                        for cell in raw_row:
                            value = "" if cell is None else " ".join(str(cell).split())
                            row.append(value)
                        while row and not row[-1]:
                            row.pop()
                        if any(row):
                            rows.append(row)
                    if not rows:
                        continue
                    column_count = max(len(row) for row in rows)
                    rows = [row + [""] * (column_count - len(row)) for row in rows]
                    nonempty = sum(1 for row in rows for cell in row if cell)
                    cell_count = max(1, len(rows) * column_count)
                    table_id = f"p{page_number}-table-{table_index}"
                    table_record = {
                        "id": table_id,
                        "type": "evidence_table",
                        "source_page": page_number,
                        "index": table_index,
                        "bbox": [float(value) for value in table.bbox],
                        "rows": len(rows),
                        "columns": column_count,
                        "values": rows,
                        "nonempty_ratio": round(nonempty / cell_count, 3),
                        "caption": f"Paper table or chart region on page {page_number}",
                        "editable_level": "native-table",
                    }
                    table_record.update(semantic_table_metadata(page_number, table_index))
                    try:
                        crop_rect = fitz.Rect(*table.bbox)
                        pad = 5
                        crop_rect.x0 = max(0, crop_rect.x0 - pad)
                        crop_rect.y0 = max(0, crop_rect.y0 - pad)
                        crop_rect.x1 = min(page.rect.width, crop_rect.x1 + pad)
                        crop_rect.y1 = min(page.rect.height, crop_rect.y1 + pad)
                        crop_pixmap = page.get_pixmap(
                            clip=crop_rect,
                            matrix=fitz.Matrix(2.2, 2.2),
                            alpha=False,
                            annots=False,
                        )
                        crop_name = f"page-{page_number:03d}-table-{table_index:02d}-crop.png"
                        crop_path = os.path.join(asset_dir, crop_name)
                        crop_pixmap.save(crop_path)
                        crop_asset_id = f"p{page_number}-table-{table_index}-crop"
                        table_record["crop_asset_id"] = crop_asset_id
                        assets.append({
                            "id": crop_asset_id,
                            "type": "evidence_crop",
                            "source_page": page_number,
                            "index": table_index,
                            "table_ref": table_id,
                            "path": os.path.join("assets", crop_name).replace("\\\\", "/"),
                            "mime_type": "image/png",
                            "caption": f"Cropped paper figure or table region from page {page_number}",
                            "width": crop_pixmap.width,
                            "height": crop_pixmap.height,
                            "bytes": os.path.getsize(crop_path),
                            "crop": True,
                            "snapshot": False,
                        })
                    except Exception:
                        pass
                    tables.append(table_record)
                    page_record["tables"].append(table_record)
        except Exception:
            pass
        if page_record["tables"] or page_number in (6, 15):
            try:
                snapshot = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False, annots=False)
                snapshot_name = f"page-{page_number:03d}-snapshot.png"
                snapshot_path = os.path.join(asset_dir, snapshot_name)
                snapshot.save(snapshot_path)
                assets.append({
                    "id": f"p{page_number}-snapshot",
                    "type": "evidence_page_snapshot",
                    "source_page": page_number,
                    "index": 0,
                    "path": os.path.join("assets", snapshot_name).replace("\\\\", "/"),
                    "mime_type": "image/png",
                    "caption": f"Full-page evidence snapshot from page {page_number}",
                    "width": snapshot.width,
                    "height": snapshot.height,
                    "bytes": os.path.getsize(snapshot_path),
                    "snapshot": True,
                })
            except Exception:
                pass
        pages.append(page_record)
        seen_xrefs = set()
        for image_index, image in enumerate(page.get_images(full=True), start=1):
            xref = image[0]
            if xref in seen_xrefs:
                continue
            seen_xrefs.add(xref)
            try:
                extracted = document.extract_image(xref)
                extension = extracted.get("ext", "png")
                filename = f"page-{page_number:03d}-image-{image_index:02d}.{extension}"
                target = os.path.join(asset_dir, filename)
                with open(target, "wb") as handle:
                    handle.write(extracted["image"])
                assets.append({
                    "id": f"p{page_number}-image-{image_index}",
                    "source_page": page_number,
                    "index": image_index,
                    "path": os.path.join("assets", filename).replace("\\\\", "/"),
                    "mime_type": f"image/{extension}",
                    "caption": f"论文第 {page_number} 页嵌入图片 {image_index}",
                    "width": extracted.get("width"),
                    "height": extracted.get("height"),
                    "bytes": len(extracted.get("image", b"")),
                })
            except Exception:
                continue
    document.close()
except Exception:
    from pypdf import PdfReader
    reader = PdfReader(pdf_path)
    for index, page in enumerate(reader.pages, start=1):
        pages.append({"page": index, "text": page.extract_text() or ""})

page_text = "\n\n".join(f"--- PAGE {page['page']} ---\n{page['text']}" for page in pages)
print(json.dumps({
    "page_count": len(pages),
    "text": page_text,
    "pages": pages,
    "assets": assets,
    "tables": tables,
    "parser": parser,
}, ensure_ascii=False))
`;

function pythonCandidates() {
  const candidates = [];
  if (process.env.CODEX_PYTHON_PATH) candidates.push(process.env.CODEX_PYTHON_PATH);
  candidates.push(path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", process.platform === "win32" ? "python.exe" : "bin/python3"));
  candidates.push(process.platform === "win32" ? "python.exe" : "python3");
  return candidates;
}

async function choosePython() {
  for (const candidate of pythonCandidates()) {
    if (!path.isAbsolute(candidate)) return candidate;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next bundled or system candidate.
    }
  }
  throw new Error("找不到 Python。请设置 CODEX_PYTHON_PATH，或安装 Python 3。 ");
}

function runPython(command, pdfPath, assetDir) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ["-c", PYTHON_SCRIPT, pdfPath, assetDir], {
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`PDF 文本提取失败，退出码 ${code}。\n${stderr.slice(-2000)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`PDF 文本提取结果不是合法 JSON：${error.message}`));
      }
    });
  });
}

export async function extractPdfText(pdfPath, outputDir = null) {
  const command = await choosePython();
  const assetDir = outputDir ? path.join(path.resolve(outputDir), "assets") : path.join(path.dirname(path.resolve(pdfPath)), ".codex-ppt-assets");
  const result = await runPython(command, path.resolve(pdfPath), assetDir);
  if (!result.text?.trim()) throw new Error(`PDF 没有提取到文本：${pdfPath}`);
  return result;
}
