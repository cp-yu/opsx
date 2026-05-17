## MODIFIED Requirements

### Requirement: 最优性检验执行

系统 SHALL 在 Phase 1 一致性检验通过后，自动进入 Phase 2 最优性检验，除非通过配置或 CLI flag 显式跳过。Phase 2 MUST 始终 spawn optimizer subagent 至少一次，master agent MUST NOT 替代 optimizer subagent 做出 "不需要优化" 的判断。

#### Scenario: Phase 1 PASS 后强制 spawn optimizer subagent

- **WHEN** Phase 1 返回 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `config.yaml` 中 `optimization.enabled` 为 `true`（默认）
- **AND** CLI 未传入 `--skip-optimization` flag
- **THEN** 系统 SHALL spawn optimizer subagent（至少一次）
- **AND** 将 Phase 1 issues 列表和 change artifacts 传入 optimizer subagent
- **AND** master agent SHALL NOT 自行判断是否需要优化

#### Scenario: --skip-optimization 跳过 Phase 2

- **WHEN** 用户执行 verify 时传入 `--skip-optimization` flag
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** `.verify-result.json` 中 `optimization.status` 记录为 `SKIPPED`
- **AND** 不影响 Phase 1 的 canonical 结果

#### Scenario: config.yaml 禁用优化

- **WHEN** `openspec/config.yaml` 中 `optimization.enabled` 为 `false`
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** 行为等同于 `--skip-optimization`

#### Scenario: Phase 1 副作用不会阻止 Phase 2

- **WHEN** Phase 1 已经写回 `tasks.md` 或 `.verify-result.json`
- **AND** 用户未传入 `--skip-optimization`
- **AND** `optimization.enabled` 不是 `false`
- **THEN** 系统 SHALL 继续进入 Phase 2
- **AND** SHALL NOT 因当前 worktree 非空而自动跳过 optimization

## ADDED Requirements

### Requirement: NO_OPTIMIZATION_NEEDED 的 CLI 校验

系统 SHALL 在 `handleOptimization()` 中对 `NO_OPTIMIZATION_NEEDED` status 执行 `summary` 字段非空校验，作为 optimizer subagent 实际被调用的 runtime enforcement。

#### Scenario: summary 非空时接受

- **WHEN** CLI 收到 `{"status":"NO_OPTIMIZATION_NEEDED","summary":"No optimization opportunities found"}`
- **AND** `summary` trim 后长度 > 0
- **THEN** CLI SHALL 接受并记录 `optimization.status` 为 `NOT_NEEDED`

#### Scenario: summary 缺失或为空时拒绝

- **WHEN** CLI 收到 `{"status":"NO_OPTIMIZATION_NEEDED"}` 且 `summary` 缺失或 trim 后为空
- **THEN** CLI SHALL 拒绝该请求
- **AND** 返回 `{ ok: false, reason: "OPTIMIZER_REQUIRED" }`
- **AND** 输出诊断: "NO_OPTIMIZATION_NEEDED requires a non-empty summary from the optimizer subagent"
- **AND** 返回 exit code 1
