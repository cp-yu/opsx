## MODIFIED Requirements

### Requirement: Specs Sync Skill
The system SHALL provide an `/opsx:sync` skill that syncs delta specs AND opsx-delta from a change to the main specs and OPSX files.

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

#### Scenario: OPSX delta sync idempotency
- **WHEN** agent executes `/opsx:sync` multiple times on the same change
- **THEN** OPSX files contain the same result as running once
- **AND** no duplicate nodes or relations are created

#### Scenario: OPSX referential integrity failure
- **WHEN** opsx-delta merge would produce invalid referential integrity
- **THEN** the agent aborts OPSX merge with zero side effects
- **AND** reports which references are broken

### Requirement: Skill Output
The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show OPSX sync summary
- **WHEN** opsx-delta sync completes successfully
- **THEN** display summary including:
  - Number of nodes added to `project.opsx.yaml`
  - Number of relations added to `project.opsx.relations.yaml`
  - Number of nodes modified
  - Number of nodes removed

## ADDED Requirements

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
