# RLinf 在 RoboTwin 上：增益成立，但归因受实验契约约束｜逐页演讲稿

> By the end, embodied-AI researchers should be able to cite and reproduce RLinf’s RoboTwin result with the correct boundary because the experiments show a large cross-task train SSR gain and competitive execution times under fixed seeds, evaluation protocol, and 8-card A800 conditions, while implementation differences prevent isolating a pure RLinf algorithm effect.

- 目标听众：具身智能、机器人学习与强化学习研究者、论文评审者和实验复现者。
- 建议时长：12 分钟
- 开场问题：在固定 RoboTwin seed、评估口径和 8 卡 A800 条件下，RLinf 的提升能否归因于 RL 信号本身，还是只能归因于完整训练系统的差异？
- 收束答案：证据支持这样的结论：在固定实验契约下，RLinf 的 RL 训练带来跨 8 个任务的 train SSR 增益，并提供有竞争力的执行路径；128 个 OOD seed 只定义评估契约，当前证据未提供 OOD SSR 结果。由于精度、超参数、轨迹收集和 reward 设计并非完全同构，不能把结果表述为脱离实验契约的纯算法优越性。

## 1. RLinf 的增益成立，但归因受实验契约约束

- 观众问题：这组实验最终要让我判断什么？
- 页面主张：RLinf 的实验结论必须同时回答性能是否提升、运行是否有效率，以及提升能否被归因于 RL 信号本身。
- 页面作用：提出唯一主问题：如何在性能增益与归因边界之间做出严谨判断。
- 建议时长：65 秒

我们通常先看最终 SSR，但这组实验真正需要回答的是：增益来自 RL 信号本身，还是来自一整套训练系统？今天沿着三个问题展开：train SSR 是否跨任务提升，运行是否具有效率，以及哪些实验条件限制归因。先把实验契约锁定，再看训练机制、结果和系统成本，最后给出可复现、但不越界的结论。

**讲述提示：** 先读出标题中的“增益成立”和“归因受约束”，随后明确三个判断维度。

**转场：** 要判断增益属于什么，先必须固定实验在什么条件下发生。

**来源：** 无外部来源

## 2. 先锁定实验契约，再谈 train SSR

- 观众问题：哪些条件决定这组结果能否复现和外推？
- 页面主张：SFT 与 RL 使用同一组 1,000 个 RoboTwin 随机 seed，评估使用额外 128 个未见 seed，并统一在 8 卡 A800 平台上运行；128 个 OOD seed 是评估契约，不是当前报告的 OOD SSR 结果。
- 页面作用：合并实验契约与结果范围，明确训练 seed、OOD seed、机器人、领域随机化、GPU 条件及其复现限制。
- 建议时长：75 秒

先把比较边界锁定。SFT 与 RL 共用 1,000 个 RoboTwin 随机 seed，使用双臂 Piper；评估再加入 128 个未见 seed。这里必须区分协议与结果：128 个 OOD seed 定义了评估契约，但当前主结果表呈现的是 train SSR，并没有提供 OOD SSR 数字。背景、杂乱度、光照、桌高和语言都会变化，运行环境与 GPU 也会影响复现，所以后面的结果只在固定契约内解释。

**讲述提示：** 依次强调 1,000、128 和 8 卡三个契约指标，并明确 OOD seed 不是 OOD SSR 结果。

**转场：** 边界确定后，还要看 RLinf 如何把 rollout 轨迹转换为更新信号。

**来源：** p1-snapshot

## 3. RLinf 的训练信号来自一条完整链路

- 观众问题：RLinf 的训练信号究竟如何产生？
- 页面主张：RLinf 的配置将 128×8 的 rollout 组织为 global batch size 1024，使用 group size 8、action-level reward、token-level logprob/entropy、GRPO 和 LoRA 更新。
- 页面作用：解释 rollout、valid trajectory、action-level reward、GRPO 优势估计和 LoRA 更新之间的关系。
- 建议时长：100 秒

实验契约说明评价什么，这一页补上 RLinf 如何学习。一次更新先按 128×8 组织出 1,024 条 rollout，并以 group size 8 形成比较单元；奖励落在 action level，logprob 与 entropy 保持 token level，再用 GRPO 计算优势并更新 actor。最后通过 LoRA 和 2.0e-4 学习率限定更新方式。配置说明的是完整训练配方，下一页继续核对它与 SimpleVLA 的差异。

**讲述提示：** 沿五个节点从左到右阅读，最后停在 LoRA 更新。

**转场：** 接下来必须检查这套路径与 SimpleVLA 是否真的只差一个框架名称。

**来源：** p4-snapshot

## 4. 共享基础，但不是同构训练

- 观众问题：两套实现到底控制了哪些变量？
- 页面主张：两套方法共享 SFT 模型、train/eval seeds、模型实现和 GRPO，但在精度、rollout batch、学习率、LoRA、valid trajectory 收集和 reward 粒度上存在差异。
- 页面作用：并列呈现共同基础与关键差异，阻止把框架比较误读为纯算法消融。
- 建议时长：100 秒

这里把公平比较拆成可检查的变量。两套实现共享 SFT 模型、train/eval seeds、模型实现和 GRPO，因此有共同起点；但 RLinf 与 SimpleVLA 在精度、rollout batch、学习率和 LoRA 上不同。valid trajectory 的收集时机和 reward 粒度也不同，会改变每次更新接收到的学习信号。因此后面的结果可以作为系统级比较，但不能单独归因于某一个算法组件。

**讲述提示：** 先读共同基础，再按表格行读取差异，最后明确系统级解释边界。

**转场：** 在保留这些差异的前提下，先看 RLinf 自身的跨任务收益是否成立。

**来源：** p4-table-1-crop、p5-table-1-crop

## 5. 8/8 任务提升，平均 train SSR 显著上升

- 观众问题：RLinf 的 train SSR 增益是单个任务的偶然现象吗？
- 页面主张：8 个 RoboTwin 任务的 RLinf RL train SSR 均高于 RLinf SFT，平均 train SSR 从 24.48% 提升到 84.63%，平均提升为 60.15 个百分点。
- 页面作用：用任务级结果和平均值突出 RLinf SFT→RL 的跨任务 train SSR 提升。
- 建议时长：105 秒

在可比性边界明确后，先看 RLinf 自身是否稳定地产生 train SSR 收益。8 个 RoboTwin 任务里，RLinf RL 的 train SSR 全部高于 SFT，平均从 24.48% 升到 84.63%，提升 60.15 个百分点。任务级结果还显示，增益幅度从 18.75 到 85.94 不等，训练步数从 30 到 240。这里证明的是 train SSR 上的跨任务训练收益，不是 OOD SSR 泛化，下一页再比较两套系统。

**讲述提示：** 先强调 train SSR、24.48%→84.63% 和 8/8，再指向任务级差异与训练步数。

**转场：** 下一步把相同的 SFT→RL 变化与 SimpleVLA 并置。

**来源：** p5-table-1、p6-table-1

## 6. RLinf 的平均 train SSR 增幅高于 SimpleVLA

- 观众问题：RLinf 的 train SSR 增益是否超过 SimpleVLA？
- 页面主张：RLinf 的平均 train SSR 从 24.48% 升至 84.63%，增益为 60.15 个百分点；SimpleVLA 从 34.40% 升至 72.18%，增益为 37.78 个百分点。
- 页面作用：直接比较两套框架的 SFT→RL 平均变化，并绑定前一页的实现差异。
- 建议时长：105 秒

把两套系统的 SFT→RL 平均 train SSR 变化放在同一张表里。RLinf 从 24.48% 提升到 84.63%，增加 60.15 个百分点；SimpleVLA 从 34.40% 提升到 72.18%，增加 37.78 个百分点，所以 RLinf 的完整训练系统平均增幅更大。但这一页不是 OOD SSR 结果，也不构成单因素消融：精度、学习率、LoRA、轨迹收集和 reward 设计都不同。下一页检查敏感性。

**讲述提示：** 先读两组 train SSR 平均值和增幅，再明确“系统级比较”而非“纯算法因果”。

**转场：** 但平均数仍可能掩盖评估温度和初始模型能力造成的变化。

**来源：** p6-table-1

## 7. 初始化与评估温度会改变单点 SSR

- 观众问题：为什么同一任务的结果会随模型和温度变化？
- 页面主张：在 place_empty_cup 上，pi0 与 pi05 的 SFT 基线不同，OFT 在 Temp_eval=-1 与 1.6 下的 PPO/GRPO 结果也不同；部分温度结果未重跑，且 RL 结果统一取 50 step。
- 页面作用：用 place_empty_cup 的结果说明初始模型、评估温度、训练步数和是否重跑会影响可见 SSR。
- 建议时长：105 秒

平均 train SSR 增益成立后，还要看单任务结果是否依赖评估协议。place_empty_cup 中，pi0 与 pi05 的 SFT 起点不同；OFT 在 Temp_eval=-1 与 1.6 下的 PPO、GRPO 结果也不同，部分温度结果没有重跑，RL 统一取 50 step。因此这些数字适合作为敏感性证据，而不是方法独立能力。它们也不能替代 OOD SSR 结果。复现时应同时报告初始化、评估温度、训练步数和重跑状态，随后转向系统成本。

**讲述提示：** 先读两组不同 SFT 基线，再指向温度变化，最后强调单点结果边界。

**转场：** 性能判断之外，研究者还需要知道训练系统在实际运行时付出什么成本。

**来源：** p1-table-1-crop、p1-table-2-crop

## 8. 8 卡条件下，colocated 更有竞争力

- 观众问题：实际运行 RLinf 时，哪种并行路径更值得选？
- 页面主张：8 卡数据中，RLinf colocated 的 actor/rollout 时间为 49.15/170.34 秒，SimpleVLA 为 94.05/189.33 秒；其他 RLinf 模式呈现不同时间成本。
- 页面作用：在同一 8 卡条件下比较不同并行模式的 actor 与 rollout 时间，给出当前配置的选型判断。
- 建议时长：80 秒

这一页只回答当前 8 卡条件下应该优先考察哪种并行模式。RLinf colocated 的 actor/rollout 为 49.15/170.34 秒，低于 SimpleVLA 的 94.05/189.33 秒；同为 8 卡，disaggregated 的 rollout 达到 546.64 秒，两个 Hybrid 配置也高于 colocated。因而这里支持的是明确配置下的选型判断，不外推到不同节点规模；进入结论页后，再把效率证据与性能增益、归因边界合并起来。

**讲述提示：** 先比较 colocated 与 SimpleVLA，再指出其他 8 卡模式的成本，最后限定结论范围。

**转场：** 现在可以用性能、效率和归因边界共同回答开场问题。

**来源：** p6-table-2、p6-table-2-crop

## 9. 相信受控 train SSR 增益，保留纯算法归因边界

- 观众问题：我现在应该相信什么，又必须保留什么？
- 页面主张：在固定 RoboTwin seed、OOD 评估契约和 8 卡 A800 条件下，RLinf 的 RL 训练在 8 个任务上将平均 train SSR 从 24.48% 提升到 84.63%，并在 colocated 配置下表现出有竞争力的 actor/rollout 时间；128 个 OOD seed 不是 OOD SSR 结果，当前证据未提供 OOD SSR。
- 页面作用：直接回答开场归因问题，综合跨任务 train SSR、系统效率和实现边界，给出可引用的最终判断。
- 建议时长：110 秒

现在回到开场问题。固定 RoboTwin seed、OOD 评估契约和 8 卡 A800 后，RLinf 在 8 个任务上的平均 train SSR 从 24.48% 提升到 84.63%，colocated 下 actor 和 rollout 也具竞争力。但要明确：128 个 OOD seed 只是评估设置，当前证据没有给出 OOD SSR 结果。两边在精度、学习率、LoRA、轨迹收集和 reward 设计上并不完全一致，所以结论应归因于完整训练系统，而不是单一算法组件。

**讲述提示：** 先给出 train SSR 答案，再读效率证据，最后明确 OOD 结果缺失与系统级归因边界。

**转场：** 开场问题的答案是：受控条件下 RLinf 系统的 train SSR 更强且具有效率优势，但 OOD SSR 未由当前证据证明，纯算法归因仍需额外控制变量。

**来源：** p6-table-1、p6-table-2-crop、p4-table-1-crop

