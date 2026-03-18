## MODIFIED Requirements

### Requirement: Archive Process

The archive operation SHALL support complete archive-time sync in core mode before moving the change to the archive.

#### Scenario: Core mode archives with embedded specs and OPSX sync
- **WHEN** archiving a change in `core` mode
- **AND** delta specs or `opsx-delta.yaml` are present
- **THEN** the command SHALL assess sync state before moving the change directory
- **AND** SHALL apply delta spec changes to main specs
- **AND** SHALL apply `opsx-delta` changes to project OPSX files
- **AND** SHALL only move the change directory after sync completes successfully

#### Scenario: Embedded sync failure aborts archive
- **WHEN** archive-time sync fails validation or referential integrity checks
- **THEN** the command SHALL abort archive
- **AND** main specs SHALL remain unchanged
- **AND** project OPSX files SHALL remain unchanged
- **AND** the change directory SHALL remain in the active changes directory

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all archive-time sync writes and proceeds directly to archiving.

#### Scenario: Skipping all archive-time sync writes with flag
- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip main spec update operations
- **AND** skip OPSX sync operations
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating archive-time sync was skipped

#### Scenario: Archive does not depend on standalone sync surface
- **WHEN** archiving a change with delta specs and `opsx-delta.yaml`
- **AND** no standalone `/opsx:sync` surface is installed
- **THEN** the command SHALL still complete archive-time sync safely before moving the change
