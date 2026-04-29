## ADDED Requirements

### Requirement: Speculative re-verify respects verify execution model

系统 SHALL 在 Phase 2 应用 candidate Search/Replace blocks 后，按 verify execution model 执行 `P1_SPECULATIVE_FENCE`，而不是统一回落到主 agent judgment。

#### Scenario: subagent-capable 工具通过 reviewer subagent 执行 speculative fence

- **WHEN** 当前 AI 工具支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 SHALL spawn a clean-context reviewer subagent to execute speculative Phase 1 checks
- **AND** 顶层 agent SHALL NOT 自己决定 speculative `PASS`、`PASS_WITH_WARNINGS` 或 `FAIL_NEEDS_REMEDIATION`
- **AND** behavior retry budget SHALL 消费 reviewer subagent 返回的 speculative verdict

#### Scenario: reread 工具保留 current-agent speculative fence

- **WHEN** 当前 AI 工具不支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 MAY 在当前 agent 中执行 explicit reread-based speculative verification
- **AND** SHALL 保持现有 format / match / behavior retry budget 语义
