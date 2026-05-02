## Context

当前 OPSX 工作流将 `apply`（实现任务）和 `verify`（验证+优化）分离为两个独立命令。apply 完成后不保证代码质量，用户必须手动运行 verify 确认正确性。verify 的 Phase 1（一致性检查）和 Phase 2（最优性检验+优化）通过独立的 agent session 执行。

在 OPSX 语义中，apply 对应"编译"步骤——编译应该要么成功产出验证过的制品，要么失败并报告错误。当前分离违背了这一语义。

## Goals / Non-Goals

**Goals:**
- 将 verify Phase 1 + Phase 2 集成到 apply 命令中，apply 输出即验证过的制品
- Phase 1 验证和 Phase 2 优化提案均由 subagent 执行，主 agent 仅负责编码
- Phase 2 优化循环简化为：提案（subagent）→ 应用补丁（主 agent）→ 再验证 Phase 1（subagent）
- 重试预算统一为 `config.optimization.optRetries`（默认 2），同时作为循环上限
- 失败方向记录到 `.verify-result.json`，避免跨会话重复尝试
- `--skip-optimization` flag 和 `optimization.enabled` 配置继续有效

**Non-Goals:**
- 不修改 `openspec verify` CLI 的对外接口（保留为底层工具）
- 不修改 `/opsx:verify` skill（保留为 expanded 模式的逃生舱）
- 不修改 sync/archive 的 verify gate 逻辑（它们继续使用 `openspec verify status`）
- 不支持无 subagent 能力的工具（收缩设计，仅考虑 Claude Code/Codex 等有 subagent 的环境）

## Decisions

### Decision 1: apply 作为三阶段编译步骤

apply 模板重构为 Phase 0（实现）+ Phase 1（验证）+ Phase 2（优化）+ Phase 3（Seal）。实现失败即 apply 失败，不会有"实现完成但未验证"的中间态。

**替代方案**：保持 apply 和 verify 分离，仅在 apply 完成后自动触发 verify。被拒绝原因：语义不够干净，apply 在触发 verify 之前仍然有一个"不确定"的中间态。

### Decision 2: 主 agent 编码，subagent 判断

```
主 agent          → 写代码（实现任务 + 应用 Search/Replace 补丁）
subagent reviewer → 判对错（Phase 1 验证 + 优化后再验证）
subagent optimizer → 出主意（Phase 2 优化提案，只提案不动代码）
```

这避免了上下文膨胀——主 agent 不需要在实现上下文之外再加载完整的验证上下文。subagent 以 clean context 执行，判断更独立客观。

### Decision 3: Phase 2 简化为单一重试预算

当前 Phase 2 有三套独立重试预算（formatRetries=2, matchRetries=2, behaviorRetries=3）。在集成到 apply 后，由于 Search/Replace 补丁由主 agent 解析和应用，格式和匹配问题由主 agent 直接处理，不消耗重试预算。只有行为回归（优化后再验证 Phase 1 失败）才消耗 optRetries。

optRetries 同时约束失败重试次数和最大优化循环数——成功的优化循环自然终止于 subagent 返回 NO_OPTIMIZATION_NEEDED，不消耗预算。

### Decision 4: 失败方向记录为自然语言摘要

`.verify-result.json` 的 `optimization` 对象新增 `failedDirections: string[]` 字段。每次优化提案导致验证失败时，追加一条自然语言摘要（如"简化 auth.ts 的条件分支逻辑"）。opt subagent 在下一次提案前读取，避免重复已失败的策略。

### Decision 5: config.optimization.optRetries 配置项

```yaml
optimization:
  enabled: true     # 现有字段，保持不变
  optRetries: 2     # 新增字段，默认 2
```

## Risks / Trade-offs

- **apply session 变长**：Phase 0+1+2+3 在单次 agent session 中完成，对大变更可能耗时较长。缓解：subagent 承担验证和优化提案工作，主 agent 上下文保持精简。
- **Phase 2 循环可能多次触发 subagent**：每次循环都需要 spawn reviewer subagent 进行再验证。缓解：optRetries=2 限制最大失败次数，成功的循环自然终止于 NO_OPTIMIZATION_NEEDED。
- **破坏性变更**：现有依赖独立 verify 步骤的工作流需要适配。缓解：`openspec verify` CLI 和 `/opsx:verify` skill 保留不动，用户仍可手动触发。

## Open Questions

- Phase 2 优化循环是否需要一个硬性的 maxOptCycles 上限？当前设计依赖 optRetries 作为实际约束（失败才消耗），但理论上 subagent 可能持续发现新的优化点。如果在实践中出现此问题，后续可增加可配置的 maxOptCycles 字段。
