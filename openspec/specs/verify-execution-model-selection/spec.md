# verify-execution-model-selection Specification

## Purpose
此规约记录变更 split-verify-execution-models 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Verify template selection follows execution model

系统 SHALL 使用 subagent-orchestrated verify 模板骨架，而不是按工具选择 execution model。

#### Scenario: 支持 clean-context subagent 的工具选择 subagent verify skeleton

- **WHEN** 系统生成 verify workflow skill
- **THEN** 系统 SHALL 选择专用的 subagent-orchestrated verify 模板骨架
- **AND** 该骨架中的顶层 agent SHALL 只负责输入收集、subagent orchestration、write-back 应用、checkpoint 管理与结果持久化
- **AND** 顶层模板 SHALL NOT 内嵌 completeness、correctness 或 coherence 的直接 judgment 步骤

#### Scenario: 不支持 clean-context subagent 的工具选择 reread skeleton

- **WHEN** 系统生成 verify workflow skill for any supported tool
- **THEN** 系统 SHALL NOT 选择 current-agent-reread verify 模板骨架
- **AND** 系统 SHALL 使用 subagent-orchestrated verify 模板骨架

#### Scenario: 选择逻辑使用显式 lookup

- **WHEN** 系统解析 verify 模板骨架
- **THEN** 系统 SHALL return the subagent-orchestrated execution model
- **AND** SHALL NOT 通过 tool lookup、字符串模式匹配、路径模式匹配或隐式约定推断 subagent 支持能力

### Requirement: Archive rerun reuses the same execution-model skeleton

系统 SHALL 在 archive 需要重跑 full verify 时，复用与 standalone verify 相同的 subagent-orchestrated orchestration 合同。

#### Scenario: archive 对支持 clean-context subagent 的工具复用 subagent skeleton

- **WHEN** archive 因 verify result missing 或 stale 而需要执行 full verify
- **THEN** 系统 SHALL 复用与 standalone verify 相同的 subagent-orchestrated verify 模板骨架
- **AND** SHALL NOT 维护另一套 archive-only Phase 1 review skeleton

#### Scenario: archive 对不支持 clean-context subagent 的工具复用 reread skeleton

- **WHEN** archive 因 verify result missing 或 stale 而需要执行 full verify
- **THEN** 系统 SHALL NOT 使用 current-agent-reread skeleton
- **AND** SHALL 保持与 standalone subagent-orchestrated verify 一致的 Phase 2 eligibility 语义

