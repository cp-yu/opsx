# specs-sync-skill Specification

## Purpose
Defines the archive-time sync contract for delta specs and OPSX state.
## Requirements
### Requirement: Archive-time sync contract

The system SHALL reconcile delta specs and OPSX delta during archive.

#### Scenario: Archive reconciles delta specs

- **WHEN** delta specs exist
- **THEN** archive SHALL reconcile them into the main specs
- **AND** SHALL preserve idempotency

### Requirement: Delta Reconciliation Logic
The agent SHALL reconcile main specs with delta specs using the delta operation headers. The reconciliation SHALL determine removal-only delta completion by explicit requirement header lookup: when every header listed under `## REMOVED Requirements` is absent from the current main spec, that removal-only delta is already applied even if unrelated requirements remain.

#### Scenario: ADDED requirements
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** the requirement does not exist in main spec
- **THEN** add the requirement to main spec

#### Scenario: ADDED requirement already exists
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** a requirement with the same name already exists in main spec
- **THEN** update the existing requirement to match the delta version

#### Scenario: MODIFIED requirements
- **WHEN** delta contains `## MODIFIED Requirements` with a requirement
- **AND** the requirement exists in main spec
- **THEN** replace the requirement in main spec with the delta version

#### Scenario: REMOVED requirements
- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** the requirement exists in main spec
- **THEN** remove the requirement from main spec

#### Scenario: REMOVED requirements already absent
- **WHEN** delta contains only `## REMOVED Requirements`
- **AND** every listed requirement header is absent from main spec
- **AND** main spec still contains unrelated requirements
- **THEN** reconciliation SHALL treat the delta as already applied
- **AND** SHALL NOT attempt to remove the missing headers again

#### Scenario: RENAMED requirements
- **WHEN** delta contains `## RENAMED Requirements` with FROM:/TO: format
- **AND** the FROM requirement exists in main spec
- **THEN** rename the requirement to the TO name

#### Scenario: New capability spec
- **WHEN** delta spec exists for a capability not in main specs
- **THEN** create new main spec file at `openspec/specs/<capability>/spec.md`

### Requirement: Skill Output
The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show applied changes
- **WHEN** reconciliation completes successfully
- **THEN** display summary of changes per capability:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed

#### Scenario: Show OPSX sync summary
- **WHEN** opsx-delta sync completes successfully
- **THEN** display summary including:
  - Number of nodes added to `project.opsx.yaml`
  - Number of relations added to `project.opsx.relations.yaml`
  - Number of nodes modified
  - Number of nodes removed

#### Scenario: No changes needed
- **WHEN** main specs already match delta specs
- **THEN** display "Specs already in sync - no changes needed"

### Requirement: OPSX_SYNC_DELTA Fragment Integration
The archive sync template SHALL import and embed the `OPSX_SYNC_DELTA` fragment from `opsx-fragments.ts` as a post-specs-sync step.

#### Scenario: Fragment wired into skill template
- **GIVEN** `OPSX_SYNC_DELTA` is defined in `opsx-fragments.ts`
- **WHEN** `getSyncSpecsSkillTemplate()` generates instructions
- **THEN** the instructions include the OPSX delta sync step after specs sync

### Requirement: Sync template SHALL consume prompt projection

The sync template SHALL consume prompt projection compiled for the archive sync surface so its instructions align with the shared config-driven authoring contract.

#### Scenario: Sync skill explains projected prose boundary

- **WHEN** the skill instructs the agent to reconcile or create specs
- **THEN** the prompt projection SHALL state how natural-language prose follows config-driven policy
- **AND** SHALL preserve canonical tokens such as `SHALL`, `MUST`, requirement headers, scenario headers, and BDD keywords

### Requirement: Sync Verify Gate

Archive sync SHALL require a fresh verify result before writing.

#### Scenario: Verify result is fresh

- **WHEN** archive sync runs with a fresh `.verify-result.json`
- **THEN** system SHALL continue sync logic

#### Scenario: Verify result is stale

- **WHEN** archive sync runs without a fresh `.verify-result.json`
- **THEN** system SHALL stop and require verify first

