## MODIFIED Requirements

### Requirement: Generating skills for a tool SHALL preserve workflow-linked bootstrap skill identity
The command SHALL generate skill directories under `.<tool>/skills/` for workflows included in the active profile while preserving the internal workflow identity for bootstrap.

- **WHEN** a tool is selected during initialization
- **THEN** create skill directories under `.<tool>/skills/` for workflows included in the active profile
- **AND** the generated skill set SHALL include `openspec-bootstrap-opsx` when workflow `bootstrap-opsx` is selected
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Custom profile includes bootstrap skill
- **WHEN** the active profile includes workflow `bootstrap-opsx`
- **THEN** initialization SHALL generate the bootstrap skill directory `openspec-bootstrap-opsx`
- **AND** the generated skill SHALL remain associated with workflow `bootstrap-opsx`

### Requirement: Slash Command Generation SHALL derive bootstrap artifacts from explicit command slug mapping
The command SHALL generate opsx slash commands for selected AI tools using an explicit workflow-to-command-slug mapping.

#### Scenario: Generating slash commands for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create slash command files for all workflows included in the active profile using the tool's command adapter
- **AND** the generated command set SHALL include `/opsx:bootstrap` when workflow `bootstrap-opsx` is selected
- **AND** command artifact paths SHALL be derived from an explicit workflow-to-command-slug mapping rather than assuming workflow ID equals file basename
- **AND** use tool-specific path conventions (e.g., `.claude/commands/opsx/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Bootstrap command path is cross-platform safe
- **WHEN** the bootstrap command artifact is generated for any supported operating system
- **THEN** the path SHALL be constructed using platform-safe path utilities
- **AND** path-sensitive verification SHALL use path-aware assertions rather than hardcoded separators
