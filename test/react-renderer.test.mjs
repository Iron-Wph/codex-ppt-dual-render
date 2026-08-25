import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { normalizePlan } from "../src/content-planner.mjs";
import { planFromText } from "../src/planner.mjs";
import { renderReactHtml } from "../src/react-html.mjs";
import { specFromPlan } from "../src/schema-writer.mjs";

const source = `# React 演示验证
> 结构化内容驱动多种页面轮廓

## 方法
- 先定义观众问题
- 再定义页面主张
- 最后绑定证据与构图

## 输出
- 网页使用组件渲染
- PPTX 使用原生对象渲染

## 检查
- 验证逻辑、可读性和讲者备注
`;

const root = await fs.mkdtemp(path.join(os.tmpdir(), "codex-ppt-react-"));
const spec = specFromPlan(normalizePlan(planFromText(source)), { themeId: "dark-frontier-tech" });
const outPath = path.join(root, "presentation.html");
const result = await renderReactHtml({ spec, outPath });
const html = await fs.readFile(result.htmlPath, "utf8");
const notes = await fs.readFile(result.notesPath, "utf8");

assert.equal(result.engine, "react-ssr");
assert.equal((html.match(/<section\s+class="slide(?:\s|")/g) || []).length, spec.slides.length);
for (const slide of spec.slides) {
  assert.match(html, new RegExp(`id="${slide.id}"`));
  assert.match(html, new RegExp(`composition-${slide.composition_id}`));
}
assert.match(html, /React SSR/i);
assert.match(html, /speaker-notes/);
assert.match(html, /notes-open|data-action="notes"/);
assert.match(html, /rel="icon" href="data:,"/);
assert.match(notes, /逐页演讲稿/);
assert.match(notes, /观众问题/);

await fs.rm(root, { recursive: true, force: true });
console.log("react-renderer.test: ok");
