# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 共享基础，但不是同构训练

- 观众问题：两套实现到底控制了哪些变量？
- 页面主张：两套方法共享 SFT 模型、train/eval seeds、模型实现和 GRPO，但在精度、rollout batch、学习率、LoRA、valid trajectory 收集和 reward 粒度上存在差异。
- 页面作用：并列呈现共同基础与关键差异，提前阻止把框架比较误读为纯算法消融。
- 建议时长：100 秒

这里把公平比较拆成可检查的变量。两套实现共享 SFT 模型、train/eval seeds、模型实现和 GRPO，因此有共同起点；但 RLinf 与 SimpleVLA 在精度、rollout batch、学习率和 LoRA 上不同。更关键的是，valid trajectory 的收集时机和 reward 粒度也不同，会改变每次更新接收到的有效样本与学习信号。因此后面的结果可以作为系统级比较，但不能单独归因于某一个算法组件。

**讲述提示：** 先读共同基础，再按表格行读取六项差异，最后明确系统级解释边界。

**转场：** 在保留这些差异的前提下，先看 RLinf 自身的跨任务收益是否成立。

**来源：** p4-table-1-crop、p5-table-1-crop

