# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. 8 卡条件下，colocated 更有竞争力

- 观众问题：实际运行 RLinf 时，哪种并行路径更值得选？
- 页面主张：8 卡数据中，RLinf colocated 的 actor/rollout 时间为 49.15/170.34 秒，SimpleVLA 为 94.05/189.33 秒；RLinf 的 disaggregated 与 hybrid 模式则显示出不同的时间成本。
- 页面作用：比较 8 卡模式和 1/2/4 节点数据，把“更高效”拆成 actor 与 rollout/generate 两个可测指标。
- 建议时长：100 秒

性能数字受评估协议约束，效率数字也必须绑定部署配置。8 卡对比中，RLinf colocated 的 actor/rollout 为 49.15/170.34 秒，低于 SimpleVLA 的 94.05/189.33 秒；但 disaggregated 的 rollout 达到 546.64 秒，Hybrid 也有不同成本。再看 1、2、4 节点，actor 与 generate 会随模式和规模变化。因此选型应先固定节点数、模式和指标，再判断哪条路径更合适。

**讲述提示：** 先读 8 卡横向对照，再指向矩阵的模式行与节点列，最后强调没有脱离配置的单一“更快”。

**转场：** 现在可以用性能、效率和归因边界共同回答开场问题。

**来源：** p6-table-2-crop、p8-table-1-crop

