## Why

OpenSpec 的三个核心 agent 阶段（explore、apply、optimizer）目前缺少统一的代码精简纪律。ponytail 提供了经过基准验证（减少 54% 代码量、100% 安全门禁）的 6-rung ladder 原则，将其融入 OpenSpec 后可以在设计期拦截过度规格化、在实现期保持精简、在优化期系统化发现冗余。

## What Changes

- **Explore 阶段**：融入 ponytail-lite，在方案对比和单方案讨论中主动提出更懒的替代方案，于上游拦截过度规格化
- **Apply 阶段**：嵌入 ponytail-full 的 6-rung ladder 为编码行为约束——specs 要求的照做，未覆盖的实现细节走 ladder
- **Optimizer 阶段**：复用 ponytail-review 标签体系（delete/stdlib/native/yagni/shrink）对优化提案进行分类，不挑战 specs 决定

核心原则：specs 第一，ponytail 第二。仅 explore 阶段可影响 spec 内容。

## Capabilities

### Modified Capabilities

- `explore-brainstorming`: 在方案对比和分段设计确认中融入 ponytail-lite 简化意识
- `apply-task-decomposition`: 在实现 specs 未覆盖的细节时嵌入 ponytaill 6-rung ladder 编码约束
- `openspec-optimizer-skill`: 优化提案采用 ponytail 标签体系（delete/stdlib/native/yagni/shrink）分类

## Impact

- 修改 3 个 skill 文件：`openspec-explore/SKILL.md`、`openspec-apply-change/SKILL.md`、`openspec-optimizer/SKILL.md`
- 零外部依赖、零代码变更
