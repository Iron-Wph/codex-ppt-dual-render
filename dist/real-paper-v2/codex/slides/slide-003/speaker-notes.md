# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的显著 SSR 增益，并提供有竞争力的执行路径；但由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把该结果表述为脱离实验契约的纯算法优越性。

## 1. RLinf 的训练信号来自一条完整链路

- 观众问题：RLinf 的训练信号究竟如何产生？
- 页面主张：RLinf 的配置将 128×8 的 rollout 组织为 global batch size 1024，使用 group size 8、action-level reward、token-level logprob/entropy、GRPO 和 LoRA 更新。
- 页面作用：用单一有序链条解释 rollout、valid trajectory、action-level reward、GRPO 优势估计和 LoRA 更新之间的关系。
- 建议时长：100 秒

实验契约说明评价什么，这一页补上 RLinf 如何学习。一次更新先按 128×8 组织出 1,024 条 rollout，并以 group size 8 形成比较单元；奖励落在 action level，logprob 与 entropy 保持 token level，再用 GRPO 计算优势并更新 actor。最后通过 LoRA 和 2.0e-4 学习率限定更新方式。配置说明的是完整训练配方，下一页继续核对它与 SimpleVLA 的差异。

**讲述提示：** 沿五个节点从左到右阅读，最后停在 LoRA 更新，并强调这是完整路径。

**转场：** 接下来必须检查这套路径与 SimpleVLA 是否真的只差一个框架名称。

**来源：** p4-snapshot

