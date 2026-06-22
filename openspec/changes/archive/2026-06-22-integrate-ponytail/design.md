## Context

ponytail 是一个经过基准验证的 AI agent 代码精简原则，核心是 6-rung ladder：YAGNI → stdlib → native → installed dep → one line → minimum。OpenSpec 的 explore/apply/optimizer 三个阶段各有天然的 ponytail 切入点。此设计固化了 explore 阶段共识成果中的架构决定。

## Goals / Non-Goals

**Goals:**
- explore SKILL 中融入 ponytail-lite：在方案对比和单方案讨论时提出更懒替代方案
- apply SKILL 中嵌入 ponytail-full：ladder 作为编码行为约束，仅作用于 specs 未覆盖的实现细节
- optimizer SKILL 中采纳 ponytail 标签体系：delete/stdlib/native/yagni/shrink 分类优化提案

**Non-Goals:**
- 不修改 OpenSpec CLI 代码
- 不在各阶段新增独立的 ponytail 审核步骤
- 不改变 specs 的本质——explore 的 ponytail 是辅助提问，不是规格简化引擎
- apply 和 optimizer 不挑战 specs 决定

## Decisions

### D-1: Explore 采用 B+C 混合模式

**选择**：方案对比时自然带上 ponytail 视角（B）；单方案讨论中发现过度规格化时用一行指出（C）。不新增独立步骤。

**替代方案**：
- 独立步骤（A）：机械感强，ponytail 不触发时也要走流程 → 放弃
- 仅在方案对比时触发（纯 B）：单方案讨论时 ponytail 沉默 → 覆盖面不足

### D-2: Apply 采用嵌入式行为约束

**选择**：将 6-rung ladder 原则直接写入 `openspec-apply-change/SKILL.md` 的编码指导部分，不新增审核步骤。硬约束：「ladder 仅作用于 specs 未指定的实现细节。specs 明确要求的 = 照做，不质疑」。

**替代方案**：
- 执行 + 标注（B）：保留 specs 要求的代码但加 ponytail 注释 → 与「忠实编译 specs」冲突，且 optimizer 应处理而非 apply 标记
- 挑战 specs（C）：apply 主动简化 specs 要求 → 违反第一原则

### D-3: Optimizer 采用标签复用

**选择**：在 optimizer 的 Search/Replace 输出协议中引入 ponytail 标签作为分类维度，不改变块结构本身。加约束：「不标记因 specs 要求而存在的代码」。

## Risks / Trade-offs

- [Explore B+C 依赖 agent 判断力] → SKILL.md 中给出触发性场景示例降低遗漏概率
- [Apply 边界模糊] → SKILL.md 中显式硬约束 wording
- [Optimizer 标签冲突] → 先读 output-protocol.md 确认格式，标签仅作附加分类
