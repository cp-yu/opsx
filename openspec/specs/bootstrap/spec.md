## Purpose

Define the bootstrap workflow contract: how `openspec bootstrap` CLI subcommands guide users through initializing and promoting OPSX architecture files.
## Requirements
### Requirement: Bootstrap docs and workflow templates SHALL describe only the CLI-backed five-phase flow
Bootstrap 文档、workflow templates 与生成的命令指引 SHALL 仅将 bootstrap 描述为由现有 `openspec bootstrap` CLI 子命令驱动的结构化流程。

#### Scenario: Bootstrap command guidance references real CLI subcommands
- **WHEN** a user reads generated bootstrap command content or bootstrap workflow guidance
- **THEN** the documented flow SHALL reference only these CLI subcommands:
  - `openspec bootstrap status`
  - `openspec bootstrap init`
  - `openspec bootstrap instructions`
  - `openspec bootstrap validate`
  - `openspec bootstrap promote`
- **AND** the guidance SHALL describe the lifecycle `init → scan → map → review → promote`

#### Scenario: Deprecated pseudo-command flags are removed from bootstrap docs
- **WHEN** bootstrap docs are updated for the structured CLI-backed workflow
- **THEN** they SHALL NOT describe unsupported command forms such as `/opsx:bootstrap --focus`, `/opsx:bootstrap --extend --capabilities`, `/opsx:bootstrap --extend --relations`, or `/opsx:bootstrap --refresh`
- **AND** the docs SHALL direct scoped initialization to supported CLI parameters such as `openspec bootstrap init --scope ...`

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

