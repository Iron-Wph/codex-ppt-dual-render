import assert from "node:assert/strict";
import { buildStyleBrief, chooseTheme, listThemeIds, listThemes } from "../src/theme-presets.mjs";

const ids = listThemeIds();
assert.equal(ids.length, 10);
for (const legacy of ["graphite-lime", "paper-blue", "sunset-editorial", "signal-dark"]) assert.ok(ids.includes(legacy));
for (const added of ["academic-evidence", "scientific-plate", "engineering-blueprint", "editorial-research", "consulting-data-story", "dark-frontier-tech"]) assert.ok(ids.includes(added));

const plan = {
  deck: { id: "paper", title: "机器人强化学习论文研究", purpose: "学术汇报", audience: "研究人员" },
  narrative: { arc: "problem-method-evidence", key_message: "实验数据支持方法主张" },
};
const selected = chooseTheme(plan, "auto");
assert.equal(selected.id, "academic-evidence");
assert.ok(selected.colors.accent);
assert.ok(selected.fonts.heading.length);
const brief = buildStyleBrief(plan, selected.id);
assert.equal(brief.style_system.category, "Academic Research");
assert.equal(brief.selection.basis, "explicit_theme");
assert.ok(listThemes().every((theme) => theme.provenance?.type));
console.log("theme-catalog.test: ok");
