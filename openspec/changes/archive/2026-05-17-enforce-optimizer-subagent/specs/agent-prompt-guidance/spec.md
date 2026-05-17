## MODIFIED Requirements

### Requirement: 简单变更快速路径识别

三个 skill 模板（archive/verify/apply）SHALL 包含 Phase 2 强制委托指引。`VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量 SHALL 重写为强制委托语义：master agent MUST 始终 spawn optimizer subagent，由 optimizer subagent 决定是否存在优化机会。

#### Scenario: optimizer subagent 返回无优化机会

- **WHEN** Agent 进入 Phase 2 优化阶段
- **AND** optimizer subagent 分析后返回 "No optimization opportunities found"
- **THEN** master agent SHALL 调用 `openspec verify phase2 "<name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED","summary":"<optimizer结论>"}' --json`
- **AND** summary 字段 SHALL 包含 optimizer subagent 的实际结论文本

#### Scenario: master agent 不得自行判断跳过

- **WHEN** Agent 进入 Phase 2 优化阶段
- **AND** `optimization.enabled` 为 `true`
- **AND** 未传入 `--skip-optimization`
- **THEN** master agent MUST NOT 自行调用 `NO_OPTIMIZATION_NEEDED` 而不 spawn optimizer subagent
- **AND** 唯一允许跳过 optimizer subagent 的条件为 `--skip-optimization` flag 或 `optimization.enabled: false`

#### Scenario: 所有 change 类型均强制调用 optimizer

- **WHEN** Phase 1 返回 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization.enabled` 为 `true`
- **THEN** 系统 SHALL 始终 spawn optimizer subagent，无论 change 类型（包括纯删除、重命名）
- **AND** optimizer subagent 对简单 change 快速返回 "No optimization opportunities found"
