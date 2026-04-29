## ADDED Requirements

### Requirement: Verify template selection follows execution model
系统 SHALL 按 verify execution model 选择模板骨架，而不是继续在同一份主模板中只替换 protocol fragment。

#### Scenario: 支持 clean-context subagent 的工具选择 subagent verify skeleton
- **WHEN** 当前 AI 工具支持 clean-context subagent verify
- **THEN** 系统 SHALL 为该工具选择专用的 subagent-orchestrated verify 模板骨架
- **AND** 该骨架中的顶层 agent SHALL 只负责输入收集、subagent orchestration、write-back 应用、checkpoint 管理与结果持久化
- **AND** 顶层模板 SHALL NOT 内嵌 completeness、correctness 或 coherence 的直接 judgment 步骤

#### Scenario: 不支持 clean-context subagent 的工具选择 reread skeleton
- **WHEN** 当前 AI 工具不支持 clean-context subagent verify
- **THEN** 系统 SHALL 为该工具选择 current-agent-reread verify 模板骨架
- **AND** 该骨架 MAY 在当前 agent 中执行完整的 verify judgment

#### Scenario: 选择逻辑使用显式 lookup
- **WHEN** 系统解析某个工具应使用的 verify 模板骨架
- **THEN** 系统 SHALL 使用显式的 tool / execution-model lookup
- **AND** SHALL NOT 通过字符串模式匹配、路径模式匹配或隐式约定推断 subagent 支持能力

### Requirement: Archive rerun reuses the same execution-model skeleton
系统 SHALL 在 archive 需要重跑 full verify 时，复用与 `/opsx:verify` 相同的 execution-model-specific orchestration 合同。

#### Scenario: archive 对支持 clean-context subagent 的工具复用 subagent skeleton
- **WHEN** archive 因 verify result missing 或 stale 而需要执行 full verify
- **AND** 当前 AI 工具支持 clean-context subagent verify
- **THEN** 系统 SHALL 复用与 `/opsx:verify` 相同的 subagent-orchestrated verify 模板骨架
- **AND** SHALL NOT 维护另一套 archive-only Phase 1 review skeleton

#### Scenario: archive 对不支持 clean-context subagent 的工具复用 reread skeleton
- **WHEN** archive 因 verify result missing 或 stale 而需要执行 full verify
- **AND** 当前 AI 工具不支持 clean-context subagent verify
- **THEN** 系统 SHALL 复用与 `/opsx:verify` 相同的 current-agent-reread verify 模板骨架
- **AND** SHALL 保持与 standalone verify 一致的 Phase 2 eligibility 语义
