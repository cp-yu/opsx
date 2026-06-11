# config-project-query Delta

## MODIFIED Requirements

### Requirement: 输出格式与 instructions 配置投影一致

`openspec config project --json` 的输出 SHALL 与 `openspec instructions <artifact> --json` 中的 `configProjection.normalized` 使用相同的 `NormalizedProjectConfig` 数据结构。

#### Scenario: 字段一致性

- **WHEN** 同一个项目中同时执行 `openspec config project --json` 和 `openspec instructions proposal --change "<name>" --json`
- **THEN** `openspec config project --json` 的顶层字段集合与 `instructions` 命令中 `configProjection.normalized` 的字段集合相同

#### Scenario: git 字段输出新结构

- **WHEN** 用户执行 `openspec config project --json`
- **THEN** 输出的 `git` 字段 SHALL 包含 `commitMessage`（含已配置的 `boundary`、`archive`、`merge` 路径，未配置的键不输出值或输出空）
- **AND** SHALL 包含 `merge.strategy`
- **AND** SHALL 包含 `branch.deleteAfterArchive`
- **AND** SHALL NOT 包含 `autoCommit`
- **AND** SHALL NOT 包含 `archive.commitMessage.convention`
- **AND** SHALL NOT 包含 `merge.commitMessage.convention`
- **AND** SHALL NOT 包含 `merge.messageFrom`
