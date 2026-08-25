# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 8/8 任务提升，平均 SSR 显著上升

- 观众问题：RLinf 的 RL 增益是单个任务的偶然现象吗？
- 页面主张：8 个 RoboTwin 任务的 RLinf RL train SSR 均高于 RLinf SFT，平均值从 24.48% 提升到 84.63%，平均提升为 60.15 个百分点。
- 页面作用：用任务级结果和平均值突出 RLinf SFT→RL 的跨任务提升，同时保留任务间幅度与训练步数差异。
- 建议时长：100 秒

在可比性边界明确后，先看 RLinf 自身是否稳定地产生收益。8 个 RoboTwin 任务里，RLinf RL 的 train SSR 全部高于 SFT，平均从 24.48% 升到 84.63%，提升 60.15 个百分点。任务级结果还显示，增益幅度从 18.75 到 85.94 不等，训练步数从 30 到 240，因此结果强度不能脱离训练成本与配置口径。这里证明的是 RLinf 自身有效，下一页再比较两套系统。

**讲述提示：** 先强调 24.48%→84.63% 和 8/8，再指向任务级差异与训练步数。

**转场：** 下一步把相同的 SFT→RL 变化与 SimpleVLA 并置，判断系统级增益是否更大。

**来源：** p5-table-1、p6-table-1

