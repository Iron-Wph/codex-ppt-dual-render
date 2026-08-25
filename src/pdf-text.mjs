import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";

const PYTHON_SCRIPT = String.raw`
import json
import os
import statistics
import sys

pdf_path = sys.argv[1]
asset_dir = sys.argv[2]
os.makedirs(asset_dir, exist_ok=True)

pages = []
assets = []
tables = []
formulas = []
parser = "pypdf"

def structured_text_blocks(page, page_number):
    raw_blocks = []
    font_sizes = []
    try:
        document_dict = page.get_text("dict")
        for block in document_dict.get("blocks", []):
            if block.get("type") != 0:
                continue
            line_texts = []
            block_sizes = []
            for line in block.get("lines", []):
                span_texts = []
                for span in line.get("spans", []):
                    value = " ".join(str(span.get("text", "")).split())
                    if value:
                        span_texts.append(value)
                    size = float(span.get("size", 0) or 0)
                    if size > 0:
                        block_sizes.append(size)
                        font_sizes.append(size)
                if span_texts:
                    line_texts.append(" ".join(span_texts))
            text = "\n".join(line_texts).strip()
            if text:
                raw_blocks.append({
                    "text": text,
                    "bbox": [float(value) for value in block.get("bbox", [0, 0, 0, 0])],
                    "max_font_size": max(block_sizes) if block_sizes else 0,
                })
    except Exception:
        return []
    body_size = statistics.median(font_sizes) if font_sizes else 10
    blocks = []
    for index, raw in enumerate(raw_blocks, start=1):
        text = raw["text"]
        size = raw["max_font_size"]
        lower = text.lower()
        block_type = "text"
        level = None
        if lower.startswith(("figure ", "fig. ", "fig ", "table ")):
            block_type = "caption"
        elif len(text) <= 220 and size >= max(13, body_size * 1.22):
            block_type = "title"
            level = 1 if size >= max(17, body_size * 1.55) else 2
        elif text.lstrip().startswith(("-", "•", "·")):
            block_type = "list"
        blocks.append({
            "id": f"p{page_number}-block-{index}",
            "type": block_type,
            "source_page": page_number,
            "reading_order": index,
            "bbox": raw["bbox"],
            "text": text,
            "level": level,
            "font_size": round(size, 2),
            "confidence": None,
        })
    return blocks

def nearest_caption(blocks, bbox):
    if not bbox:
        return ""
    x0, y0, x1, y1 = bbox
    candidates = []
    for block in blocks:
        if block.get("type") != "caption":
            continue
        bx0, by0, bx1, by1 = block.get("bbox", [0, 0, 0, 0])
        overlap = max(0, min(x1, bx1) - max(x0, bx0))
        if overlap <= 0:
            continue
        vertical_distance = min(abs(by0 - y1), abs(y0 - by1))
        candidates.append((vertical_distance, block.get("text", "")))
    candidates.sort(key=lambda item: item[0])
    return candidates[0][1] if candidates and candidates[0][0] < 90 else ""

try:
    import fitz
    parser = "pymupdf"
    document = fitz.open(pdf_path)
    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text") or ""
        blocks = structured_text_blocks(page, page_number)
        page_record = {"page": page_number, "text": text, "tables": [], "blocks": blocks}
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
                    table_bbox = [float(value) for value in table.bbox]
                    table_record = {
                        "id": table_id,
                        "type": "evidence_table",
                        "source_page": page_number,
                        "index": table_index,
                        "bbox": table_bbox,
                        "rows": len(rows),
                        "columns": column_count,
                        "values": rows,
                        "nonempty_ratio": round(nonempty / cell_count, 3),
                        "caption": nearest_caption(blocks, table_bbox) or f"Paper table region on page {page_number}",
                        "editable_level": "native-table",
                    }
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
                            "bbox": table_bbox,
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
                    page_record["blocks"].append({
                        "id": f"p{page_number}-table-block-{table_index}",
                        "type": "table",
                        "source_page": page_number,
                        "reading_order": len(page_record["blocks"]) + 1,
                        "bbox": table_bbox,
                        "text": "",
                        "caption": table_record["caption"],
                        "table_ref": table_id,
                        "asset_ref": table_record.get("crop_asset_id"),
                        "confidence": None,
                    })
        except Exception:
            pass
        page_images = page.get_images(full=True)
        try:
            drawing_count = len(page.get_drawings())
        except Exception:
            drawing_count = 0
        if page_record["tables"] or page_images or drawing_count >= 8:
            try:
                snapshot = page.get_pixmap(matrix=fitz.Matrix(1.2, 1.2), alpha=False, annots=False)
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
        seen_xrefs = set()
        for image_index, image in enumerate(page_images, start=1):
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
                image_id = f"p{page_number}-image-{image_index}"
                image_bbox = None
                try:
                    image_rects = page.get_image_rects(xref)
                    if image_rects:
                        image_bbox = [float(value) for value in image_rects[0]]
                except Exception:
                    pass
                image_caption = nearest_caption(blocks, image_bbox) or f"论文第 {page_number} 页嵌入图片 {image_index}"
                assets.append({
                    "id": image_id,
                    "type": "evidence_figure",
                    "source_page": page_number,
                    "index": image_index,
                    "bbox": image_bbox,
                    "path": os.path.join("assets", filename).replace("\\\\", "/"),
                    "mime_type": f"image/{extension}",
                    "caption": image_caption,
                    "width": extracted.get("width"),
                    "height": extracted.get("height"),
                    "bytes": len(extracted.get("image", b"")),
                })
                page_record["blocks"].append({
                    "id": f"p{page_number}-image-block-{image_index}",
                    "type": "figure",
                    "source_page": page_number,
                    "reading_order": len(page_record["blocks"]) + 1,
                    "bbox": image_bbox,
                    "text": "",
                    "caption": image_caption,
                    "asset_ref": image_id,
                    "confidence": None,
                })
            except Exception:
                continue
        pages.append(page_record)
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
    "formulas": formulas,
    "parser": parser,
    "parser_details": {
        "engine": parser,
        "structured_blocks": sum(len(page.get("blocks", [])) for page in pages),
    },
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
