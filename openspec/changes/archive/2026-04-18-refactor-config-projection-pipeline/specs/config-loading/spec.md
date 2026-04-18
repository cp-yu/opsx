## ADDED Requirements

### Requirement: Project config SHALL expose normalized inputs for projection consumers
`openspec/config.yaml` 的已验证字段 SHALL 以稳定、可组合的形式暴露给配置投影层，使 prompt projection 与 runtime projection 共享同一份 source-of-truth 输入，而不是各自重新读取和解释原始 YAML。

#### Scenario: Valid fields become projection inputs
- **WHEN** project config contains valid `docLanguage`, `context`, or `rules`
- **THEN** config loading SHALL expose those fields as normalized projection inputs
- **AND** downstream prompt/runtime projection consumers SHALL observe the same validated values

#### Scenario: Invalid fields do not leak into projection
- **WHEN** a config field fails validation
- **THEN** config loading SHALL exclude that field from projection inputs
- **AND** projection consumers SHALL continue with remaining valid fields and default behavior
