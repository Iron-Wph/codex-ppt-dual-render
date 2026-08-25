# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 初始化与评估温度会改变单点 SSR

- 观众问题：为什么同一任务的结果会随模型和温度变化？
- 页面主张：在 place_empty_cup 上，pi0 与 pi05 的 SFT 基线不同，OFT 在 Temp_eval=-1 与 1.6 下的 PPO/GRPO 结果也不同；部分温度结果未重跑，且 RL 结果统一取 50 step。
- 页面作用：用 place_empty_cup 的 rebuttal 结果说明初始模型、评估温度、训练步数和是否重跑会影响可见 SSR。
- 建议时长：100 秒

平均增益成立后，还要看单任务结果是否依赖评估协议。place_empty_cup 中，pi0 与 pi05 的 SFT 起点不同；OFT 在 Temp_eval=-1 与 1.6 下的 PPO、GRPO 结果也不同，部分温度结果没有重跑，RL 统一取 50 step。因此这些数字适合作为敏感性证据，而不是方法独立能力。复现时应同时报告初始化、评估温度、训练步数和重跑状态，随后转向系统运行成本。

**讲述提示：** 先读两组不同 SFT 基线，再指向温度变化，最后强调单点结果的边界。

**转场：** 性能判断之外，研究者还需要知道这套训练系统在实际运行时付出什么成本。

**来源：** p1-table-1-crop、p1-table-2-crop

