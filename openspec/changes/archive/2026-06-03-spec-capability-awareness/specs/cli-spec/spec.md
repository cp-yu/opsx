## MODIFIED Requirements

### Requirement: Spec Command

The system SHALL provide a `spec` command with subcommands for displaying, listing, and validating specifications.

#### Scenario: spec list --json 输出包含 capabilities 字段

- **WHEN** 执行 `openspec spec list --json`
- **THEN** 每个 spec 条目 SHALL 包含 `capabilities` 字段（string[]）
- **AND** 有 frontmatter 的 spec SHALL 输出其声明的 cap ID 列表
- **AND** 无 frontmatter 的 spec SHALL 输出空数组 `[]`

#### Scenario: spec list 向后兼容

- **WHEN** 执行 `openspec spec list --json`
- **THEN** SHALL 保留所有现有字段不变
- **AND** `capabilities` 为新增字段，不删改现有 JSON 结构

#### Scenario: Interactive spec selection for show

- **WHEN** executing `openspec spec show` without arguments
- **THEN** display an interactive list of available specs
- **AND** allow the user to select a spec to show
- **AND** display the selected spec content
- **AND** maintain all existing show options (--json, --requirements, --no-scenarios, -r)

#### Scenario: Non-interactive fallback keeps current behavior

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec spec show` without a spec-id
- **THEN** do not prompt interactively
- **AND** print the existing error message for missing spec-id
- **AND** set non-zero exit code
