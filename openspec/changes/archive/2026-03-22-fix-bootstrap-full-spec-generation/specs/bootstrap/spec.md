## MODIFIED Requirements

### Requirement: Bootstrap contract surfaces SHALL stay consistent

Bootstrap schema、CLI behavior、workflow templates、generated instructions 与 user-facing docs SHALL 描述同一套 bootstrap 生命周期与模式合同。

#### Scenario: Contract surfaces agree on supported modes
- **WHEN** 检查 bootstrap schema、workflow template、CLI help 与 bootstrap docs
- **THEN** 它们 SHALL 暴露相同的 mode names
- **AND** SHALL 描述相同的 supported upgrade paths

#### Scenario: Contract surfaces agree on raw baseline mode semantics
- **WHEN** 检查 `raw` 基线下的 bootstrap CLI help、instructions、workflow template 与 user docs
- **THEN** `full` SHALL 被描述为“生成正式 OPSX + 完整合法 specs”
- **AND** `opsx-first` SHALL 被描述为“生成正式 OPSX + README-only starter”
- **AND** 任何合同面 SHALL NOT 再把 `raw + full` 描述为仅生成 starter specs

#### Scenario: Contract surfaces agree on command surface
- **WHEN** 检查生成的 bootstrap command、bootstrap workflow template、CLI subcommand registration 与 bootstrap docs
- **THEN** 它们 SHALL 将 bootstrap 呈现为 CLI-backed agent workflow
- **AND** SHALL 暴露用户可见命令名 `/opsx:bootstrap`
- **AND** SHALL NOT 暗示任何不受支持的一次性或 extend 风格 bootstrap flags
