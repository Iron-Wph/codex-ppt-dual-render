# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. Lock the visual language before slide generation

- 观众问题：这套演示将采用什么统一视觉语言？
- 页面主张：Every slide inherits the same visual contract.
- 页面作用：在逐页生成前固定字体、色板、图片和表格处理。
- 建议时长：20 秒

This internal page locks the typography, palette, image treatment, and editable table treatment before the presentation is generated. It is a production reference and should not appear in the audience-facing deck.

**讲述提示：** Internal only.

**转场：** 使用同一视觉合同生成所有页面。

**来源：** 无外部来源

