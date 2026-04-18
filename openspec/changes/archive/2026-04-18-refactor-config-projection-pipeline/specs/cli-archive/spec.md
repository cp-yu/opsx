## ADDED Requirements

### Requirement: Archive-time sync SHALL use runtime projection
When `openspec archive` performs embedded spec sync, any generated or rebuilt artifact prose SHALL be driven by runtime projection compiled from project config.

#### Scenario: Embedded sync creating a new main spec
- **WHEN** archive-time sync creates a main spec that does not yet exist
- **THEN** the archive command SHALL use runtime projection for generated prose
- **AND** SHALL NOT inject hardcoded English placeholder text that bypasses config policy

#### Scenario: Embedded sync updates remain projection-consistent
- **WHEN** archive-time sync updates existing main specs
- **THEN** the command SHALL preserve the same prose policy used by standalone sync
- **AND** both paths SHALL remain semantically aligned for the same input config and delta set
