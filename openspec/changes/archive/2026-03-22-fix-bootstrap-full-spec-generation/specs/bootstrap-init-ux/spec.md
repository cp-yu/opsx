## MODIFIED Requirements

### Requirement: 模式说明必须准确反映合同
`bootstrap init` 的 mode 说明与后续指引 SHALL 与新的 `full` / `opsx-first` 合同一致：`full` 生成正式 OPSX + 完整合法 specs，`opsx-first` 生成正式 OPSX + README-only starter，`specs-based + full` 采用 preserve-only 并在冲突时 fail-fast。

#### Scenario: Raw baseline shows accurate full mode guidance
- **GIVEN** baseline 类型为 `raw`
- **WHEN** 用户在 TTY 环境查看 `full` 模式说明或读取 init instructions
- **THEN** 文案 SHALL 明确 `full` 会生成正式 OPSX 与完整合法 specs
- **AND** SHALL NOT 再把 `full` 描述为仅生成 starter specs

#### Scenario: Raw baseline shows accurate opsx-first guidance
- **GIVEN** baseline 类型为 `raw`
- **WHEN** 用户在 TTY 环境查看 `opsx-first` 模式说明或读取 init instructions
- **THEN** 文案 SHALL 明确 `opsx-first` 会生成正式 OPSX 与 README-only starter
- **AND** SHALL 明确行为 specs 需要在后续常规 change workflow 中补充

#### Scenario: Specs-based baseline shows preserve-only guidance
- **GIVEN** baseline 类型为 `specs-based`
- **WHEN** 用户读取 `full` 模式说明或 init instructions
- **THEN** 文案 SHALL 明确现有 specs 会被保留
- **AND** SHALL 明确仅补充缺失 capability 的 spec
- **AND** SHALL 明确目标路径冲突会 fail-fast
