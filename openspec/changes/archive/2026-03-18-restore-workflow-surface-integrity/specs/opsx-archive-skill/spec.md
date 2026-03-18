## MODIFIED Requirements

### Requirement: Spec Sync Prompt

The skill SHALL handle sync inline during archive in core mode instead of requiring a separate `/opsx:sync` surface.

#### Scenario: Core mode archives a change with delta specs
- **WHEN** agent executes `/opsx:archive` in `core` mode
- **AND** delta specs exist
- **THEN** the skill SHALL reconcile delta specs to main specs as part of archive
- **AND** SHALL NOT require an installed separate `/opsx:sync` skill

#### Scenario: Core mode archives a change with opsx-delta
- **WHEN** agent executes `/opsx:archive` in `core` mode
- **AND** `opsx-delta.yaml` exists
- **THEN** the skill SHALL apply the OPSX delta during archive
- **AND** SHALL validate referential integrity before writing
- **AND** SHALL write updated OPSX files atomically

#### Scenario: Embedded sync failure aborts archive
- **WHEN** inline sync would fail validation or integrity checks
- **THEN** the skill SHALL abort archive
- **AND** SHALL leave main specs unchanged
- **AND** SHALL leave OPSX files unchanged
- **AND** SHALL leave the change directory in place

#### Scenario: Core mode archive summary reports embedded sync result
- **WHEN** archive completes in `core` mode
- **THEN** the summary SHALL report whether archive-time sync updated main specs and OPSX files
- **AND** SHALL distinguish successful sync from skipped sync

#### Scenario: Expanded mode archive keeps the same sync-state contract
- **WHEN** agent executes `/opsx:archive` in `expanded` mode
- **AND** delta specs or `opsx-delta.yaml` are present
- **THEN** archive SHALL still assess and execute the same embedded sync contract before moving the change
- **AND** expanded mode MAY separately expose `/opsx:sync` as an optional standalone surface
