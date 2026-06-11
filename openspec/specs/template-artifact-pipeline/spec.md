# template-artifact-pipeline Specification

## Purpose
此规约记录变更 unify-template-generation-pipeline 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Canonical Workflow Manifest

The system SHALL define a canonical workflow manifest as the single source of truth for generated skill and command artifacts.

#### Scenario: Register workflow once

- **WHEN** a workflow (for example `explore`, `ff`, or `onboard`) is added or modified
- **THEN** its canonical definition SHALL be registered once in the workflow manifest
- **AND** skill/command projections SHALL be derived from that manifest
- **AND** duplicate hand-maintained lists SHALL NOT be required

#### Scenario: Required skill metadata

- **WHEN** defining a workflow skill entry in the manifest
- **THEN** it SHALL include required metadata fields (`license`, `compatibility`, and `metadata`)
- **AND** generation SHALL use those values or explicit defaults in a consistent way for all workflows

### Requirement: Tool Profile Registry

The system SHALL define a tool profile registry that captures generation capabilities per tool.

#### Scenario: Resolve tool capabilities

- **WHEN** generating artifacts for a selected tool
- **THEN** the system SHALL resolve a tool profile that declares skill path capability, command adapter linkage, and transform set
- **AND** tools with skills support but no command adapter SHALL be handled explicitly without implicit fallback behavior

#### Scenario: Capability consistency validation

- **WHEN** running validation checks
- **THEN** the system SHALL detect mismatches between configured tools, profile definitions, and registered adapters
- **AND** fail with actionable errors in development/CI

### Requirement: Ordered Transform Pipeline

The system SHALL support ordered artifact transforms with explicit scope and phase semantics, and SHALL apply them to both skill and command generation paths through the shared artifact sync engine.

#### Scenario: Execute pre-adapter and post-adapter transforms

- **WHEN** generating an artifact
- **THEN** matching transforms SHALL execute in deterministic order based on phase and priority
- **AND** `preAdapter` transforms SHALL run before command adapter formatting
- **AND** `postAdapter` transforms SHALL run after adapter formatting

#### Scenario: Apply tool-specific rewrites declaratively

- **WHEN** a tool requires instruction rewrites (for example command reference syntax changes)
- **THEN** those rewrites SHALL be implemented as registered transforms with explicit applicability predicates
- **AND** generation entry points SHALL NOT implement ad-hoc rewrite logic

#### Scenario: Command path uses transform pipeline

- **WHEN** `writeCommands()` generates command artifacts via `ArtifactSyncEngine`
- **THEN** each command entry's body SHALL be processed through `runTransforms` with `artifactType: 'command'` before being passed to the command adapter
- **AND** the `workflowId` context SHALL be derived from the entry's `CommandContent.id` field
- **AND** command adapters SHALL NOT perform command reference transformations internally

#### Scenario: Skills path uses transform pipeline

- **WHEN** `writeSkills()` generates skill artifacts via `ArtifactSyncEngine`
- **THEN** each skill's instructions SHALL be processed through `runTransforms` with `artifactType: 'skill'`
- **AND** transforms with `scope: 'both'` or `scope: 'skill'` SHALL apply to skill content

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

### Requirement: Fidelity Guardrails

The system SHALL enforce guardrails that prevent output drift during refactors.

#### Scenario: Projection parity checks

- **WHEN** CI runs template generation tests
- **THEN** it SHALL verify manifest-derived projections remain consistent (workflows, command IDs, skill directories)
- **AND** detect missing exports or missing workflow registration

#### Scenario: Output parity checks

- **WHEN** running parity tests for representative workflow/tool combinations
- **THEN** generated artifacts SHALL remain behaviorally equivalent to approved baselines unless intentionally changed
- **AND** intentional changes SHALL be captured in explicit spec/proposal updates

