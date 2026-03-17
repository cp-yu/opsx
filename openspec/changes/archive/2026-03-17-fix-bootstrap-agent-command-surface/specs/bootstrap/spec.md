## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Bootstrap contract surfaces SHALL stay consistent
Bootstrap schema、CLI behavior、workflow templates、generated instructions 与 user-facing docs SHALL 描述同一套生命周期合同。

#### Scenario: Contract surfaces agree on supported modes
- **WHEN** the bootstrap schema, workflow template, CLI help, and bootstrap docs are inspected
- **THEN** they SHALL expose the same mode names
- **AND** they SHALL describe the same supported upgrade paths

#### Scenario: Contract surfaces agree on command surface
- **WHEN** the generated bootstrap command, bootstrap workflow template, CLI subcommand registration, and bootstrap docs are inspected
- **THEN** they SHALL present bootstrap as a CLI-backed agent workflow
- **AND** they SHALL expose the user-facing command name `/opsx:bootstrap`
- **AND** they SHALL NOT imply unsupported one-shot or extend-style bootstrap command flags
