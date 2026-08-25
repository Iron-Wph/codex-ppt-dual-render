import { readText } from "./utils.mjs";

function cleanLine(line) {
  return line.replace(/^\s*[-*+]\s+/, "").replace(/^>\s?/, "").trim();
}

function parseMarkdown(source) {
  const lines = source.split(/\r?\n/);
  const title = lines.find((line) => /^#\s+/.test(line))?.replace(/^#\s+/, "").trim() || "Codex 双渲染演示";
  const subtitle = lines.find((line) => /^>\s+/.test(line))?.replace(/^>\s+/, "").trim() || "一份结构，两个出口";
  const sections = [];
  let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      current = { title: heading[1].trim(), bullets: [] };
      sections.push(current);
      continue;
    }
    if (current && /^[-*+]\s+/.test(line)) current.bullets.push(cleanLine(line));
  }
  return { title, subtitle, sections };
}

function findSection(sections, pattern, fallback = null) {
  return sections.find((section) => pattern.test(section.title)) || fallback;
}

function compactTitle(value, fallback) {
  const title = String(value || "").split(/[，。；：:、]/)[0].trim();
  return (title || fallback).slice(0, 28);
}

function stepsFromBullets(bullets, fallback) {
  const source = (bullets.length ? bullets : fallback).slice(0, 4);
  return source.map((item, index) => ({
    title: compactTitle(item, `Step ${index + 1}`),
    text: item,
    metric: String(index + 1).padStart(2, "0"),
    tone: index % 2 ? "coral" : "lime",
  }));
}

function paperPlan(parsed, sections) {
  const background = findSection(sections, /背景|问题/i, { bullets: [] });
  const method = findSection(sections, /方法|核心/i, { bullets: [] });
  const results = findSection(sections, /结果|实验/i, { bullets: [] });
  const findings = findSection(sections, /发现|泛化/i, { bullets: [] });
  const limits = findSection(sections, /局限|启示|结论/i, { bullets: [] });
  const methodBullets = method.bullets || [];
  const resultBullets = results.bullets || [];
  const backgroundBullets = background.bullets || [];
  const findingBullets = findings.bullets || [];
  const limitBullets = limits.bullets || [];
  const bullet = (list, index, fallback) => list[index] || fallback;
  const common = { eyebrow: null, title: null, subtitle: null, note: null, kicker: null, steps: null, result: null, columns: null, takeaway: null };
  const slide = (id, role, layout, goal, claim, content, visual_intent, evidence_refs = []) => ({
    id, role, layout, action_title: claim, slide_goal: goal, primary_claim: claim,
    evidence_refs, asset_candidates: [], visual_intent, speaker_note: claim,
    content: { ...common, ...content },
  });

  return {
    deck: {
      id: "simplevla-rl-paper",
      title: parsed.title,
      purpose: "用演示稿解释论文的方法、证据、关键发现与边界",
      audience: "机器人、具身智能与机器学习团队",
      language: "zh-CN",
      aspect_ratio: "16:9",
    },
    narrative: {
      arc: "问题—缺口—贡献—方法—证据—分析—边界",
      key_message: parsed.subtitle,
    },
    visual: { style_family: "auto", image_policy: "source-figure-first", density_profile: "balanced" },
    plan: {
      title: parsed.title,
      subtitle: parsed.subtitle,
      slides: [
        slide("slide-001", "title", "title", "建立论文问题、方法和核心结论的上下文", parsed.subtitle, { eyebrow: "PAPER / RESEARCH BRIEF", title: parsed.title, subtitle: parsed.subtitle, note: { label: "CORE CLAIM", value: compactTitle(parsed.subtitle, "从问题到证据") } }, "text_led"),
        slide("slide-002", "problem", "comparison", "说明现有 VLA 训练为什么需要新的学习信号", "示范驱动的 SFT 在数据成本、场景多样性和长时序泛化上存在瓶颈。", { title: "示范数据解决了模仿，却没有解决探索", columns: [{ label: "CURRENT PRACTICE", headline: "预训练 + SFT", points: backgroundBullets.slice(0, 3).length ? backgroundBullets.slice(0, 3) : ["依赖人工机器人轨迹", "场景覆盖受限", "未见任务容易失效"], tone: "coral" }, { label: "RESEARCH QUESTION", headline: "结果奖励能否驱动 VLA 试错？", points: ["减少对示范数量的依赖", "提升长时序任务能力", "改善未见任务泛化"], tone: "lime" }], takeaway: { label: "PROBLEM", value: bullet(backgroundBullets, 2, "需要把环境反馈引入 VLA 训练") } }, "comparison_matrix"),
        slide("slide-003", "gap", "comparison", "把研究问题转化为可检验的技术缺口", "关键缺口不是再堆更多示范，而是让 VLA 能在环境中获得可学习的结果反馈。", { title: "技术缺口：结果奖励稀疏，但探索必须可扩展", columns: [{ label: "BOTTLENECK", headline: "稀疏奖励会让梯度消失", points: ["大量轨迹可能得到同一奖励", "全成功或全失败都难以比较", "仿真到现实存在额外差距"], tone: "coral" }, { label: "DESIGN TARGET", headline: "建立可扩展的在线 RL 闭环", points: methodBullets.slice(0, 3).length ? methodBullets.slice(0, 3) : ["并行 rollout", "组相对优势", "动态混合成功与失败轨迹"], tone: "lime" }], takeaway: { label: "GAP", value: "让结果反馈真正转化为策略更新" } }, "comparison_matrix"),
        slide("slide-004", "contribution", "pipeline", "概括论文提供的系统性解决方案", "论文把交互采样、结果奖励、GRPO 和探索增强组合成一套可扩展训练系统。", { kicker: "CONTRIBUTION", title: "四个设计把稀疏结果奖励变成可学习信号", steps: [{ title: "交互采样", text: bullet(methodBullets, 0, "并行环境生成闭环轨迹"), metric: "01", tone: "lime" }, { title: "结果奖励", text: bullet(methodBullets, 1, "环境返回成功或失败"), metric: "02", tone: "coral" }, { title: "GRPO", text: bullet(methodBullets, 2, "组相对优势更新策略"), metric: "03", tone: "lime" }, { title: "探索增强", text: bullet(methodBullets, 3, "动态采样与温度调节"), metric: "04", tone: "coral" }], result: { label: "CONTRIBUTION", value: "从 SFT 模仿走向奖励驱动的试错" } }, "method_diagram"),
        slide("slide-005", "method_overview", "pipeline", "解释训练闭环的输入、反馈和更新顺序", "每轮训练都把环境交互产生的轨迹重新变成策略更新信号。", { kicker: "METHOD OVERVIEW", title: "在线 RL 把 VLA 训练连接到环境反馈", steps: [{ title: "SFT 起点", text: "先提供最低限度任务先验", metric: "01", tone: "lime" }, { title: "Rollout", text: "策略在并行环境中执行", metric: "02", tone: "coral" }, { title: "Reward", text: "记录成功/失败结果", metric: "03", tone: "lime" }, { title: "GRPO", text: "按组相对优势更新", metric: "04", tone: "coral" }], result: { label: "LOOP", value: "训练 → 交互 → 反馈 → 更新" } }, "method_diagram"),
        slide("slide-006", "method_detail", "comparison", "解释如何缓解稀疏奖励和探索不足", "动态采样、Clip-Higher 和更高 rollout 温度是并行的探索增强机制，而不是串行步骤。", { title: "探索增强来自三组并行机制", columns: [{ label: "DYNAMIC SAMPLING", headline: "保留成功与失败混合组", points: ["避免所有轨迹奖励相同", "提供可比较的组内信号", "降低梯度消失风险"], tone: "lime" }, { label: "EXPLORATION", headline: "扩大策略更新与动作多样性", points: ["Clip-Higher：1.2 → 1.28", "rollout 温度：1.0 → 1.6", "移除 KL 正则以扩大探索"], tone: "coral" }], takeaway: { label: "DESIGN PRINCIPLE", value: "并行增强探索，而不是把机制误画成线性流程" } }, "comparison_matrix"),
        slide("slide-007", "experiment_setup", "evidence", "交代实验覆盖的任务、数据和评测场景", "实验同时覆盖仿真基准、低数据设置、跨任务泛化和真实机器人迁移。", { title: "实验设计覆盖性能、数据效率与迁移", columns: [{ label: "BENCHMARKS", headline: "从仿真到双臂任务", points: ["LIBERO / LIBERO-Long", "RoboTwin 1.0 / 2.0", "真实世界四项任务"], tone: "lime" }, { label: "COMPARISONS", headline: "从 SFT 基线到真实部署", points: ["完整示范 vs 单条示范", "已见任务 vs 未见任务", "仿真训练 vs sim-to-real"], tone: "coral" }], takeaway: { label: "EVALUATION", value: bullet(resultBullets, 0, "用成功率检验方法是否真正改善任务能力") } }, "source_table"),
        slide("slide-008", "main_results", "evidence", "展示论文最重要的定量结果", "RL 同时改善了标准基准、低数据场景和真实世界成功率。", { title: "主要结果：性能、数据效率和迁移同时提升", columns: [{ label: "SIMULATION", headline: "LIBERO 91.0% → 99.1%", points: resultBullets.slice(0, 2).length ? resultBullets.slice(0, 2) : ["LIBERO-Long 86.5% → 98.5%", "单条示范 48.9% → 96.9%"], tone: "lime" }, { label: "REAL WORLD", headline: "17.5% → 38.5%", points: resultBullets.slice(2, 4).length ? resultBullets.slice(2, 4) : ["RoboTwin 2.0 38.3% → 68.8%", "超过 RDT 的 23.5%"], tone: "coral" }], takeaway: { label: "MAIN RESULT", value: "结果奖励 RL 不只是提高已见任务分数，也提升低数据和迁移能力" } }, "data_chart"),
        slide("slide-009", "analysis", "insight", "说明结果背后的新行为和泛化证据", "模型能够发现示范中没有出现的新策略，但收益依赖最低限度的初始任务能力。", { title: "分析结果：探索带来新策略，也暴露能力边界", columns: [{ label: "NEW BEHAVIOR", headline: "RL 发现示范之外的策略", points: findingBullets.slice(0, 3).length ? findingBullets.slice(0, 3) : ["出现直接推推动作", "未见任务提升约 5%–15%", "空间和物体泛化更稳定"], tone: "lime" }, { label: "LIMITATION", headline: "没有先验能力就无法启动", points: limitBullets.slice(0, 3).length ? limitBullets.slice(0, 3) : ["0 条示范时成功率仍为 0%", "稀疏奖励和 sim-to-real 仍需关注", "需要进一步验证真实部署边界"], tone: "coral" }], takeaway: { label: "TAKEAWAY", value: "从收集更多示范转向使用环境规模化试错，但不能忽略初始能力" } }, "comparison_matrix"),
      ],
    },
  };
}

export async function planFromMarkdown(inputPath) {
  const source = await readText(inputPath);
  return planFromText(source);
}

export function planFromText(source) {
  const parsed = parseMarkdown(source);
  const sections = parsed.sections;
  const isPaper = /论文|研究背景|研究问题|实验结果|SimpleVLA|arXiv|VLA/i.test(`${parsed.title}\n${sections.map((section) => section.title).join("\n")}`);
  if (isPaper) return paperPlan(parsed, sections);
  const method = sections.find((section) => /方法|核心|结构/i.test(section.title)) || sections[0] || { title: "核心方法", bullets: [] };
  const output = sections.find((section) => /输出|双|html|pptx|结果|发现|实验/i.test(section.title)) || sections[1] || { title: "双输出", bullets: [] };
  const qa = sections.find((section) => /qa|质量|闭环|检查|局限|启示|结论/i.test(section.title)) || sections[2] || { title: "QA 闭环", bullets: [] };
  const safeBullets = (list, fallback) => (list.length ? list : fallback).slice(0, 4);
  const methodBullets = safeBullets(method.bullets, ["明确受众和演讲目标", "提炼每页主张与证据", "选择与内容匹配的构图", "生成后进行逻辑和视觉复核"]);
  const outputBullets = safeBullets(output.bullets, ["React 组件化 HTML 演示", "原生可编辑 PPTX", "共享语义规格与演讲稿"]);
  const qaBullets = safeBullets(qa.bullets, ["检查叙事是否闭环", "检查证据是否支撑主张", "检查文字、溢出和视觉节奏"]);

  return {
    deck: {
      id: "codex-dual-render-mvp",
      title: parsed.title,
      purpose: "展示基于 Codex 的双渲染 PPT MVP",
      audience: "产品、设计与工程团队",
      language: "zh-CN",
      aspect_ratio: "16:9"
    },
    narrative: {
      arc: "问题—方法—双输出—质量闭环—结论",
      key_message: "同一份结构化规格，同时驱动网页演示和原生可编辑 PPTX。"
    },
    visual: { style_family: "auto", image_policy: "source-figure-first", density_profile: "balanced" },
    plan: {
      title: parsed.title,
      subtitle: parsed.subtitle,
      slides: [
        {
          id: "slide-001",
          role: "title",
          layout: "title",
          action_title: "先明确演示要改变观众的哪一个判断",
          slide_goal: "建立演示任务与核心承诺",
          primary_claim: parsed.subtitle,
          evidence_refs: [],
          table_refs: [],
          asset_candidates: [],
          visual_intent: "text_led",
          speaker_note: "先解释为什么这不是单纯的文件导出工具，而是一套从受众、叙事到双媒介表达的完整生成流程。",
          content: {
            eyebrow: "CODEX / PRESENTATION SYSTEM",
            title: parsed.title,
            subtitle: parsed.subtitle,
            note: { label: "PROMISE", value: "内容先成立，视觉再放大" }
          }
        },
        {
          id: "slide-002",
          role: "method_overview",
          layout: "pipeline",
          action_title: "先把受众、主张和证据变成一条可讲的故事",
          slide_goal: "解释演示规划如何形成",
          primary_claim: "高质量 PPT 的起点是 communication job，而不是模板。",
          evidence_refs: [],
          table_refs: [],
          asset_candidates: [],
          visual_intent: "method_diagram",
          content: {
            title: "大纲从受众问题开始，而不是从目录开始",
            kicker: "NARRATIVE ENGINE",
            steps: stepsFromBullets(methodBullets, methodBullets),
            result: { label: "OUTPUT", value: "一条可讲、可证、可收束的叙事链" }
          }
        },
        {
          id: "slide-003",
          role: "main_results",
          layout: "comparison",
          action_title: "同一语义规格可以生成两种真正互补的演示",
          slide_goal: "说明 HTML 和 PPTX 的差异化价值",
          primary_claim: "React HTML 负责沉浸式表达，PPTX 负责原生编辑与办公交付。",
          evidence_refs: [],
          table_refs: [],
          asset_candidates: [],
          visual_intent: "comparison_matrix",
          content: {
            title: "网页追求表现力，PPTX 保留编辑权",
            columns: [
              { label: "REACT / WEB", headline: "组件、动效与沉浸式舞台", points: outputBullets.slice(0, 2), tone: "lime" },
              { label: "PPTX / OFFICE", headline: "文本、图表和表格原生可编辑", points: outputBullets.slice(1, 3), tone: "coral" }
            ],
            takeaway: { label: "SHARED MODEL", value: "内容语义与演讲逻辑只维护一份" }
          }
        },
        {
          id: "slide-004",
          role: "limitations",
          layout: "insight",
          action_title: "生成之后还要证明它真的讲得通、看得清",
          slide_goal: "解释逻辑和视觉复核闭环",
          primary_claim: "质量不是一次生成的运气，而是规划—渲染—讲稿试讲—修订的闭环。",
          evidence_refs: [],
          table_refs: [],
          asset_candidates: [],
          visual_intent: "text_led",
          content: {
            title: "最后一轮不是美化，而是验证",
            columns: [
              { label: "LOGIC", headline: "开场问题必须在结尾得到回答", points: qaBullets.slice(0, 2), tone: "lime" },
              { label: "DELIVERY", headline: "另一个人也能按讲稿讲清楚", points: qaBullets.slice(1, 3), tone: "coral" }
            ],
            takeaway: { label: "DONE WHEN", value: "删掉任何一页都会损失一段必要逻辑" }
          }
        }
      ]
    }
  };
}
