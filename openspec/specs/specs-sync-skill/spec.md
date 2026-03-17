# specs-sync-skill Specification

## Purpose
Defines the agent skill for syncing delta specs from changes to main specs.

## Requirements

### Requirement: Specs Sync Skill
The system SHALL provide an `/opsx:sync` skill that syncs delta specs AND opsx-delta from a change to the main specs and OPSX files.

#### Scenario: Sync delta specs to main specs
- **WHEN** agent executes `/opsx:sync` with a change name
- **THEN** the agent reads delta specs from `openspec/changes/<name>/specs/`
- **AND** reads corresponding main specs from `openspec/specs/`
- **AND** reconciles main specs to match what the deltas describe

#### Scenario: Sync opsx-delta to project OPSX files
- **WHEN** agent executes `/opsx:sync` with a change name
- **AND** `openspec/changes/<name>/opsx-delta.yaml` exists
- **THEN** the agent reads the opsx-delta
- **AND** reads current `project.opsx.yaml`, `project.opsx.relations.yaml`, `project.opsx.code-map.yaml`
- **AND** applies ADDED nodes/relations to the respective files
- **AND** applies MODIFIED nodes (updates existing entries by id)
- **AND** applies REMOVED nodes (deletes from respective files)
- **AND** validates referential integrity after merge
- **AND** writes all three files atomically (temp file + rename)

#### Scenario: No opsx-delta present
- **WHEN** agent executes `/opsx:sync` with a change name
- **AND** `openspec/changes/<name>/opsx-delta.yaml` does not exist
- **THEN** the agent skips OPSX delta sync
- **AND** proceeds with specs-only sync as before

#### Scenario: Idempotent operation
- **WHEN** agent executes `/opsx:sync` multiple times on the same change
- **THEN** the result is the same as running it once
- **AND** no duplicate requirements are created
- **AND** no duplicate nodes or relations are created

#### Scenario: OPSX referential integrity failure
- **WHEN** opsx-delta merge would produce invalid referential integrity
- **THEN** the agent aborts OPSX merge with zero side effects
- **AND** reports which references are broken

#### Scenario: Change selection prompt
- **WHEN** agent executes `/opsx:sync` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows changes that have delta specs

### Requirement: Delta Reconciliation Logic
The agent SHALL reconcile main specs with delta specs using the delta operation headers.

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
The `sync-specs.ts` workflow template SHALL import and embed the `OPSX_SYNC_DELTA` fragment from `opsx-fragments.ts` as a post-specs-sync step.

#### Scenario: Fragment wired into skill template
- **GIVEN** `OPSX_SYNC_DELTA` is defined in `opsx-fragments.ts`
- **WHEN** `getSyncSpecsSkillTemplate()` generates instructions
- **THEN** the instructions include the OPSX delta sync step after specs sync

#### Scenario: Fragment wired into command template
- **GIVEN** `OPSX_SYNC_DELTA` is defined in `opsx-fragments.ts`
- **WHEN** `getOpsxSyncCommandTemplate()` generates content
- **THEN** the content includes the OPSX delta sync step after specs sync
