## MODIFIED Requirements

### Requirement: 显式的 command-generation 支持元数据

`AIToolOption` SHALL NOT expose adapter-backed command generation support as an active workflow delivery capability.

#### Scenario: Codex 声明不支持 adapter-backed commands

- **WHEN** 在 `AI_TOOLS` 中查找 `codex` 工具
- **THEN** Codex SHALL be treated the same as other tools for skills-only workflow generation
- **AND** 调用方 SHALL NOT branch on Codex command support capability

#### Scenario: 回退行为保持确定性

- **WHEN** 某个工具未声明 command-generation 支持元数据
- **THEN** 系统 SHALL use skills-only generation behavior
- **AND** SHALL NOT resolve command generation behavior through helper fallback, registry lookup, pattern matching, or historical inference
