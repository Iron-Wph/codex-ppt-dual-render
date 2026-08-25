# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. RLinf 的平均增幅高于 SimpleVLA

- 观众问题：RLinf 的 RL 增益是否超过 SimpleVLA？
- 页面主张：RLinf 的平均 SSR 从 24.48% 升至 84.63%，增益为 60.15 个百分点；SimpleVLA 从 34.40% 升至 72.18%，增益为 37.78 个百分点，因此 RLinf 的平均 RL 增幅更大。
- 页面作用：直接比较两套框架的 SFT→RL 平均变化，并把结论绑定到前一页已经标出的实现差异。
- 建议时长：100 秒

把两套系统的 SFT→RL 平均变化放在同一张表里。RLinf 从 24.48% 提升到 84.63%，增加 60.15 个百分点；SimpleVLA 从 34.40% 提升到 72.18%，增加 37.78 个百分点，所以 RLinf 的完整训练系统平均增幅更大。但这一页不构成单因素消融：精度、学习率、LoRA、轨迹收集和 reward 设计都不同。下一页继续检查初始模型与评估温度带来的敏感性。

**讲述提示：** 先读两组平均值和增幅，再明确“系统级比较”而非“纯算法因果”。

**转场：** 但平均数仍可能掩盖评估温度和初始模型能力造成的变化，因此要检查结果边界。

**来源：** p6-table-1

