# agent-command-slugs Specification

## Purpose
Define explicit mapping between internal workflow IDs and external user-facing command slugs so generated command artifacts, migration, drift detection, and cleanup all follow the same naming contract.
## Requirements
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

### Requirement: Generating slash commands for a tool SHALL honor configured external command slugs

The system SHALL generate slash command files for all workflows included in the active mode or custom workflow selection using configured external command slugs instead of assuming workflow IDs match file basenames.

#### Scenario: Mode projection drives command artifact visibility
- **WHEN** slash commands are generated for a supported tool
- **THEN** command artifact visibility SHALL be determined by the selected mode or explicit custom workflow set
- **AND** the same manifest-derived projection SHALL be used by generation, migration, drift detection, and cleanup

#### Scenario: Expanded mode includes standalone sync command artifact
- **WHEN** the active mode is `expanded`
- **THEN** initialization SHALL generate the sync command artifact at the tool-specific path mapped from external slug `sync`

#### Scenario: Core mode excludes standalone sync command artifact
- **WHEN** the active mode is `core`
- **THEN** generated command artifacts SHALL NOT include the standalone sync command artifact
- **AND** cleanup SHALL remove previously generated managed sync command artifacts if sync is no longer selected

