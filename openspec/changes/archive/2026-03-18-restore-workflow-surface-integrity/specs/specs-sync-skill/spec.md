## MODIFIED Requirements

### Requirement: Specs Sync Skill
The system SHALL continue to provide an `/opsx:sync` skill in expanded mode for syncing delta specs AND opsx-delta from a change to the main specs and OPSX files.

#### Scenario: Expanded mode exposes standalone sync surface
- **WHEN** the active mode is `expanded`
- **THEN** the generated workflow surface SHALL include `/opsx:sync`
- **AND** the skill SHALL continue to reconcile delta specs and `opsx-delta` exactly as defined by the sync contract

#### Scenario: Core mode does not expose standalone sync surface
- **WHEN** the active mode is `core`
- **THEN** the generated workflow surface SHALL NOT include `/opsx:sync`
- **AND** sync behavior SHALL remain available through archive-time embedded sync instead

#### Scenario: Standalone sync and embedded archive sync are semantically aligned
- **WHEN** a change requires both spec sync and OPSX sync
- **THEN** running standalone `/opsx:sync` in expanded mode and running archive-time embedded sync in core mode SHALL produce the same resulting main specs and OPSX state
- **AND** both paths SHALL preserve idempotency and zero-side-effect failure guarantees

#### Scenario: Standalone sync remains optional in expanded mode
- **WHEN** an expanded-mode user already ran `/opsx:sync`
- **THEN** `/opsx:archive` SHALL observe that no archive-time sync writes remain
- **AND** archive SHALL proceed without requiring the standalone sync surface to run again
