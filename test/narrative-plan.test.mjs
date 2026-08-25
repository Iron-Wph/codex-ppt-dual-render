import assert from "node:assert/strict";
import { normalizePlan } from "../src/content-planner.mjs";
import { planFromText } from "../src/planner.mjs";
import { specFromPlan } from "../src/schema-writer.mjs";

const source = `# 生成式演示系统
> 一份内容模型，两个互补出口

## 核心方法
- 明确目标听众、已有认知与期望改变
- 为每页确定唯一主张和证据
- 让转场形成累积叙事

## 双输出
- React HTML 负责沉浸式演示
- PPTX 保留原生编辑能力

## 质量闭环
- 审查开场问题是否在结尾回答
- 检查核心结论是否有证据
- 按逐页演讲稿进行试讲
`;

const plan = normalizePlan(planFromText(source));
const spec = specFromPlan(plan, { themeId: "dark-frontier-tech" });

assert.match(spec.deck.communication_job, /演讲结束|应能理解|应能判断/);
assert.ok(spec.deck.audience_profile.desired_outcome);
assert.equal(spec.narrative.logic_check.opening_resolved, true);
assert.equal(spec.narrative.logic_check.core_has_evidence, true);
assert.equal(spec.narrative.logic_check.no_redundant_slides, true);

const ids = spec.slides.map((slide) => slide.id);
const priorityIds = [
  ...spec.narrative.priority_map.core,
  ...spec.narrative.priority_map.support,
  ...spec.narrative.priority_map.context,
];
assert.deepEqual([...priorityIds].sort(), [...ids].sort());
assert.equal(new Set(priorityIds).size, ids.length);
assert.equal(new Set(spec.slides.map((slide) => slide.primary_claim)).size, spec.slides.length);
assert.ok(new Set(spec.slides.map((slide) => slide.composition_id)).size >= 3);

for (const slide of spec.slides) {
  assert.ok(slide.audience_question);
  assert.ok(slide.narrative_job);
  assert.ok(slide.implication);
  assert.ok(slide.transition_out);
  assert.ok(slide.speaker_notes.talk_track.length >= 80);
  assert.ok(slide.speaker_notes.talk_track.length <= 280);
  assert.doesNotMatch(`${slide.action_title} ${slide.content.title} ${slide.content.subtitle || ""}`, /generated from|deterministic storyboard|internal visual contract/i);
}

const pipeline = plan.plan.slides.find((slide) => slide.layout === "pipeline");
pipeline.composition_id = "causal-flow";
pipeline.visual_plan = { ...pipeline.visual_plan, layout_family: "pipeline", data_strategy: "diagram" };
pipeline.content.steps = [
  { title: "Rollout", text: "采样轨迹" },
  { title: "Group", text: "组织比较组" },
  { title: "Action-level reward", text: "计算动作级奖励" },
  { title: "GRPO", text: "估计优势" },
  { title: "LoRA 更新", text: "更新策略参数" },
];
const fiveStepSpec = specFromPlan(plan, { themeId: "dark-frontier-tech" });
const compiledPipeline = fiveStepSpec.slides.find((slide) => slide.id === pipeline.id);
assert.equal(compiledPipeline.flow_model, "linear");
assert.equal(compiledPipeline.elements.filter((element) => element.role === "step").length, 5);
assert.equal(compiledPipeline.elements.find((element) => element.id.endsWith("step-3")).data.title, "Action-level reward");
assert.equal(compiledPipeline.reading_order_groups.find((group) => group.id === "ordered-steps").items.length, 5);

console.log("narrative-plan.test: ok");
