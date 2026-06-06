# config-apply-projection Specification

## Purpose
此规约记录变更 improve-config-projection 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: apply instructions 包含配置投影

`generateApplyInstructions()` 返回的 JSON SHALL 包含 `configProjection` 字段，其结构与 artifact instructions 中的 `configProjection` 相同。

#### Scenario: JSON 输出包含 configProjection

- **WHEN** 用户执行 `openspec instructions apply --change "<name>" --json`
- **THEN** 输出的 JSON 包含 `configProjection` 字段
- **AND** `configProjection.normalized` 包含 `proseLanguage`、`apply`、`git` 和 `rules` 字段
- **AND** `configProjection.prompt.fragments` 包含适用于 apply 上下文的投影片段

#### Scenario: 缺少 config.yaml 时返回最小投影

- **WHEN** 项目中不存在 `openspec/config.yaml`
- **THEN** `configProjection.normalized` 返回 `{ "rules": {} }`
- **AND** `configProjection.prompt.fragments` 为空数组
- **AND** 命令以 exit code 0 退出

### Requirement: 文本输出包含配置投影信息

`openspec instructions apply --change "<name>"` 的非 JSON 文本输出 SHALL 包含 `<config_projection>` 区块。

#### Scenario: 文本格式的配置投影

- **WHEN** 用户执行 `openspec instructions apply --change "<name>"`（不带 `--json`）
- **THEN** 输出包含 `<config_projection>` 区块
- **AND** 区块包含来自 config.yaml 的 proseLanguage 和 apply.isolation 指令

