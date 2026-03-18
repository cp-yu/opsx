## MODIFIED Requirements

### Requirement: Generating skills for a tool SHALL preserve workflow-linked bootstrap skill identity
The command SHALL generate skill directories under `.<tool>/skills/` for workflows included in the active profile while preserving the internal workflow identity for bootstrap.

- **WHEN** a tool is selected during initialization
- **THEN** create skill directories under `.<tool>/skills/` for workflows included in the active profile
- **AND** the generated skill set SHALL include `openspec-bootstrap-opsx` when workflow `bootstrap-opsx` is selected
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Core mode excludes standalone sync surface
- **WHEN** the active mode is `core`
- **THEN** generated skills SHALL include only the workflows in the core preset
- **AND** the generated skill set SHALL NOT include `openspec-sync-specs`

#### Scenario: Expanded mode includes standalone sync surface
- **WHEN** the active mode is `expanded`
- **THEN** generated skills SHALL include the expanded workflow set
- **AND** the generated skill set SHALL include `openspec-sync-specs`

#### Scenario: Bootstrap remains separately selectable
- **WHEN** the active mode is `expanded`
- **THEN** initialization SHALL NOT generate `openspec-bootstrap-opsx` unless workflow `bootstrap-opsx` is explicitly selected

### Requirement: Slash Command Generation SHALL derive bootstrap artifacts from explicit command slug mapping
The command SHALL generate opsx slash command files for selected AI tools using an explicit workflow-to-command-slug mapping.

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

#### Scenario: Core mode excludes standalone sync command
- **WHEN** a tool is selected during initialization
- **AND** the active mode is `core`
- **THEN** generated slash commands SHALL include only the workflows in the core preset
- **AND** the generated command set SHALL NOT include `/opsx:sync`

#### Scenario: Expanded mode includes standalone sync command
- **WHEN** a tool is selected during initialization
- **AND** the active mode is `expanded`
- **THEN** generated slash commands SHALL include the expanded workflow set
- **AND** the generated command set SHALL include `/opsx:sync`

#### Scenario: Init mode selection drives workflow output deterministically
- **WHEN** initialization runs with an explicit mode selection
- **THEN** the resulting generated workflow surface SHALL match the selected mode exactly
- **AND** repeated initialization with the same mode SHALL converge to the same generated artifact set
