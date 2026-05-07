## MODIFIED Requirements

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
