## MODIFIED Requirements

### Requirement: 优化结果持久化

系统 SHALL 将 Phase 2 结果写入 `.verify-result.json` 的 `optimization` 对象，并使终局状态与 checkpoint 生命周期一致。Phase 2 通过 CLI 双调用机制强制执行。

#### Scenario: optimization 字段写入

- **WHEN** Phase 2 完成（无论成功或失败）
- **THEN** 系统 SHALL 在 `.verify-result.json` 写入 `optimization` 对象
- **AND** `optimization` 包含：`status`、`score`、`attempts` 数组、`baseline` 引用、`final` 结果
- **AND** 顶层 `result` 保持 `PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION` 不变

#### Scenario: optimization.status 取值

- **WHEN** Phase 2 正常完成
- **THEN** `optimization.status` SHALL 为以下值之一：`SKIPPED`、`NOT_NEEDED`、`IMPROVED`、`DEGRADED`、`ABORTED_UNSAFE`、`PENDING_VERIFICATION`
- **AND** `PENDING_VERIFICATION` SHALL 表示优化已提交但 speculative fence 尚未执行，此状态不得用于 archive 门禁

#### Scenario: Phase 2 双调用强制

- **WHEN** agent 完成 Phase 1 且结果为 PASS/PASS_WITH_WARNINGS
- **AND** `optimization.enabled` 不为 false
- **THEN** agent SHALL 调用 `openspec verify phase2 --type=optimization` 提交优化结果
- **AND** 若返回状态为 `PENDING_VERIFICATION`，agent SHALL 继续调用 `openspec verify phase2 --type=verification` 提交 speculative fence 结果
- **AND** agent SHALL NOT 在 `PENDING_VERIFICATION` 状态下直接进入 sync/archive
- **AND** CLI 工具 SHALL 拒绝 `--type=verification` 调用如果当前状态不是 `PENDING_VERIFICATION`

#### Scenario: ABORTED_UNSAFE 表示恢复未闭环

- **WHEN** `optimization.status` 为 `ABORTED_UNSAFE`
- **THEN** 系统 SHALL 将其解释为"优化循环未能完成安全闭环"
- **AND** SHALL NOT 声称 checkpoint 已清理完成，除非系统已经验证工作区恢复成功
- **AND** SHALL 输出与实际 stash 生命周期一致的恢复说明

#### Scenario: 跨平台路径处理

- **WHEN** 写入 `optimization` 对象中的文件路径
- **THEN** 系统 SHALL 使用 `path.join()` 构建所有路径
- **AND** SHALL NOT 硬编码路径分隔符

### Requirement: Speculative re-verify respects verify execution model

系统 SHALL 在 Phase 2 应用 candidate Search/Replace blocks 后，按 verify execution model 执行 `P1_SPECULATIVE_FENCE`，并通过 CLI 的 `--type=verification` 调用强制记录结果。

#### Scenario: subagent-capable 工具通过 reviewer subagent 执行 speculative fence

- **WHEN** 当前 AI 工具支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 SHALL spawn a clean-context reviewer subagent to execute speculative Phase 1 checks
- **AND** 顶层 agent SHALL NOT 自己决定 speculative `PASS`、`PASS_WITH_WARNINGS` 或 `FAIL_NEEDS_REMEDIATION`
- **AND** behavior retry budget SHALL 消费 reviewer subagent 返回的 speculative verdict
- **AND** agent SHALL 调用 `openspec verify phase2 --type=verification --input '<结果JSON>'` 记录 speculative fence 结果

#### Scenario: reread 工具保留 current-agent speculative fence

- **WHEN** 当前 AI 工具不支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 MAY 在当前 agent 中执行 explicit reread-based speculative verification
- **AND** SHALL 保持现有 format / match / behavior retry budget 语义
- **AND** agent SHALL 调用 `openspec verify phase2 --type=verification --input '<结果JSON>'` 记录结果
