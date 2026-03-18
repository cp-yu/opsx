## MODIFIED Requirements

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
