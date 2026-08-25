# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 相信受控系统增益，保留纯算法归因边界

- 观众问题：我现在应该相信什么，又必须保留什么？
- 页面主张：在固定 RoboTwin seed、OOD 评估口径和 8 卡 A800 条件下，RLinf 的 RL 训练在 8 个任务上将平均 train SSR 从 24.48% 提升到 84.63%，并在 colocated 配置下表现出有竞争力的 actor/rollout 时间；但精度、超参数、轨迹收集和 reward 设计差异使其不能被表述为纯算法因果结论。
- 页面作用：直接回答开场归因问题，综合跨任务性能、系统效率和实现边界，给出可引用的最终判断。
- 建议时长：100 秒

现在回到开场问题。固定 RoboTwin seed、OOD 评估口径和 8 卡 A800 后，RLinf 在 8 个任务上的平均 train SSR 从 24.48% 提升到 84.63%，colocated 下 actor 和 rollout 也具竞争力。但两边在精度、学习率、LoRA、轨迹收集和 reward 设计上并不完全一致，所以结论应归因于完整训练系统，而不是单一算法组件。复现或引用时，必须同时报告这些采用条件与边界。

**讲述提示：** 先给出答案，再读性能和效率证据，最后明确“系统结论，不是纯算法因果”。

**转场：** 开场问题的答案是：受控条件下 RLinf 系统确实更强且具有效率优势，但其纯算法归因仍需额外控制变量。

**来源：** p6-table-1、p6-table-2-crop、p4-table-1-crop

