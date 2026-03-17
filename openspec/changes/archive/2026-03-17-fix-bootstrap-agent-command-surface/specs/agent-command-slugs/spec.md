## ADDED Requirements

### Requirement: Agent command generation SHALL support separate external command slugs
系统 SHALL 支持将外部 command slug 与内部 workflow ID 分离，使生成的命令制品能够暴露稳定的用户可见命令名，而不要求 profile/config 中的 workflow ID 与磁盘上的命令文件名完全一致。

#### Scenario: Bootstrap workflow generates user-facing bootstrap command
- **WHEN** the workflow ID is `bootstrap-opsx`
- **AND** command artifacts are generated for Claude Code
- **THEN** the generated command file SHALL be written to `.claude/commands/opsx/bootstrap.md`
- **AND** the generated command SHALL remain associated with workflow `bootstrap-opsx` for filtering and profile selection

#### Scenario: Command generation preserves tool-specific path rules while using external slug
- **WHEN** a tool adapter generates command files for a workflow with a custom external command slug
- **THEN** the adapter SHALL use the external command slug when computing the output file path
- **AND** the adapter SHALL preserve its existing path convention for that tool
- **AND** command body formatting SHALL remain unchanged

#### Scenario: Cross-platform command artifact paths remain path-safe
- **WHEN** command artifact paths are generated on macOS, Linux, or Windows
- **THEN** the system SHALL construct output paths using `path.join()` or `path.resolve()` rather than string concatenation
- **AND** tests that verify generated command paths SHALL use path-aware expectations rather than hardcoded separators

### Requirement: Command artifact detection SHALL resolve workflows through explicit command slug mapping
系统 SHALL 使用与生成阶段相同的显式 workflow-to-command-slug 映射来检测命令制品，从而保证 migration、drift detection 和 cleanup 保持一致。

#### Scenario: Migration detects bootstrap workflow from external bootstrap command artifact
- **WHEN** a generated bootstrap command artifact exists at the tool-specific path for slug `bootstrap`
- **THEN** installed workflow scanning SHALL infer workflow `bootstrap-opsx`
- **AND** migration SHALL preserve that workflow in custom profile state

#### Scenario: Drift detection recognizes generated bootstrap command as satisfying selected workflow
- **WHEN** workflow `bootstrap-opsx` is selected in the active profile
- **AND** the generated command artifact exists at the mapped bootstrap command path
- **THEN** profile sync checks SHALL treat the workflow as present
- **AND** the tool SHALL NOT be flagged as missing bootstrap command artifacts

#### Scenario: Deselected bootstrap workflow removes only the mapped command artifact
- **WHEN** workflow `bootstrap-opsx` is no longer selected for a tool
- **THEN** update cleanup SHALL remove the generated bootstrap command artifact using the explicit mapped path
- **AND** cleanup SHALL NOT rely on wildcard pattern matching to discover bootstrap command files

## MODIFIED Requirements

### Requirement: Generating slash commands for a tool SHALL honor configured external command slugs
The system SHALL generate slash command files for all workflows included in the active profile using configured external command slugs instead of assuming workflow IDs match file basenames.

- **WHEN** a tool is selected during initialization
- **THEN** the system SHALL generate slash command files for all workflows included in the active profile using the tool's command adapter
- **AND** each generated command SHALL use the workflow's configured external command slug when computing the output file path
- **AND** the generated command set SHALL include `/opsx:bootstrap` when workflow `bootstrap-opsx` is selected
- **AND** use tool-specific path conventions (e.g., `.claude/commands/opsx/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Core profile excludes bootstrap command by default
- **WHEN** the active profile is `core`
- **THEN** generated slash commands SHALL include only the workflows in the core profile
- **AND** bootstrap command artifacts SHALL NOT be generated unless workflow `bootstrap-opsx` is explicitly selected

#### Scenario: Custom profile includes bootstrap command
- **WHEN** the active profile includes workflow `bootstrap-opsx`
- **THEN** initialization SHALL generate the bootstrap command artifact at the tool-specific path mapped from external slug `bootstrap`
- **AND** restart guidance SHALL continue to apply to the generated command artifact like other slash commands
