# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 先锁定实验契约，再谈 SSR 增益

- 观众问题：哪些条件决定这组结果能否复现和外推？
- 页面主张：SFT 与 RL 使用同一组 1,000 个 RoboTwin 随机 seed，评估使用额外 128 个未见 seed，采用 Piper 双臂，并统一在 8 卡 A800 平台上运行。
- 页面作用：合并实验契约与泛化口径，明确训练 seed、OOD seed、机器人、领域随机化、GPU 条件及其复现限制。
- 建议时长：65 秒

先把比较边界锁定。SFT 与 RL 共用 1,000 个 RoboTwin 随机 seed，使用双臂 Piper；评估再加入 128 个未见 seed，因此 SSR 反映的是随机化场景下的泛化，而不是固定布局记忆。背景、杂乱度、光照、桌高和语言都会变化，Python、系统和 GPU 也会影响可用 seed 与初始 SSR，所以本文统一采用 8 卡 A800。后面所有数字都只能在这个实验契约内理解。

**讲述提示：** 依次强调 1,000、128 和 8 卡三个契约指标；右侧快照只作为语义证据补充，不承担唯一阅读任务。

**转场：** 边界确定后，还要看 RLinf 如何把 rollout 轨迹转换为更新信号。

**来源：** p1-snapshot

