# template-artifact-pipeline Delta

## MODIFIED Requirements

### Requirement: Shared Artifact Sync Engine

The system SHALL provide a shared artifact sync engine used by all generation entry points. Reference files declared by skill templates SHALL be written by the shared engine to the project-level `openspec/references/` home instead of per-tool skill directories.

#### Scenario: Init and update use same engine

- **WHEN** `openspec init` or `openspec update` writes skills/commands
- **THEN** both flows SHALL use the same orchestration engine for planning, rendering, validating, and writing artifacts
- **AND** behavior differences SHALL be configuration-driven rather than separate duplicated loops

#### Scenario: Legacy upgrade path reuses engine

- **WHEN** legacy cleanup triggers artifact regeneration
- **THEN** the regeneration path SHALL use the same shared engine
- **AND** generated outputs SHALL follow the same transform and validation rules

#### Scenario: Reference files write to the shared references home

- **WHEN** the engine writes skill artifacts for any configured tool
- **THEN** `template.referenceFiles[]` SHALL be written once to `openspec/references/` as `openspec-<name>.md`
- **AND** the engine SHALL NOT write `references/` subdirectories under any tool skill directory
- **AND** ownership, naming-uniqueness, and tool-neutrality constraints SHALL follow the `references-home` specification
