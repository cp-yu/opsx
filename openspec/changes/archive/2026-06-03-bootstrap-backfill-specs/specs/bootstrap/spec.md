## MODIFIED Requirements

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
  - `openspec bootstrap backfill-specs`
- **AND** the guidance SHALL describe the lifecycle `init → scan → map → review → promote`
- **AND** the guidance SHALL describe `backfill-specs` as an independent subcommand also invoked by promote

#### Scenario: Promote 末尾自动调用 backfill

- **WHEN** `openspec bootstrap promote` 成功写入 OPSX 和 specs
- **THEN** promote SHALL 自动调用 Backfill Engine
- **AND** SHALL 在 promote 输出中包含 backfill 统计（已写入数、未匹配数）

#### Scenario: Bootstrap skill 指令包含 subagent 语义匹配

- **WHEN** bootstrap skill 模板被加载
- **THEN** 指令 SHALL 描述 promote 后对 backfill 返回的 unmatched specs 启动 subagent
- **AND** subagent SHALL 读取 spec 内容和 OPSX cap intent 进行语义匹配
- **AND** 主 agent SHALL 按 subagent 结果写入 frontmatter
- **AND** 最终报告 SHALL 列出仍无匹配的 specs

#### Scenario: Deprecated pseudo-command flags are removed from bootstrap docs
- **WHEN** bootstrap docs are updated for the structured CLI-backed workflow
- **THEN** they SHALL NOT describe unsupported command forms such as `/opsx:bootstrap --focus`, `/opsx:bootstrap --extend --capabilities`, `/opsx:bootstrap --extend --relations`, or `/opsx:bootstrap --refresh`
- **AND** the docs SHALL direct scoped initialization to supported CLI parameters such as `openspec bootstrap init --scope ...`
