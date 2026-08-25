# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. RLinf 的增益成立，但归因受实验契约约束

- 观众问题：这组实验最终要让我判断什么？
- 页面主张：RLinf 的实验结论必须同时回答性能是否提升、运行是否有效率，以及提升能否被归因于 RL 信号本身。
- 页面作用：提出唯一主问题：如何在性能增益与归因边界之间做出严谨判断。
- 建议时长：65 秒

我们通常先看最终 SSR，但这组实验真正需要回答的是：增益来自 RL 信号本身，还是来自一整套训练系统？今天沿着三个问题展开：性能是否跨任务提升，运行是否具有效率，以及哪些实验条件限制归因。先把实验契约锁定，再看训练机制、结果和系统成本，最后给出可复现、但不越界的结论。

**讲述提示：** 先读出标题中的“增益成立”和“归因受约束”，随后明确三个判断维度。

**转场：** 要判断增益属于什么，先必须固定实验在什么条件下发生。

**来源：** 无外部来源

