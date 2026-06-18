## MODIFIED Requirements

### Requirement: Archive Process

The archive operation SHALL support complete archive-time sync in core mode before moving the change to the archive, and SHALL stop after the archive move plus handoff reminder without executing git write operations. Archive-time sync SHALL preserve removal-only delta idempotency: when all headers named by a removal-only delta are already absent from the corresponding main spec, archive SHALL treat that spec delta as already synced even if the main spec still contains unrelated requirements.

#### Scenario: Core mode archives with embedded specs and OPSX sync
- **WHEN** archiving a change in `core` mode
- **AND** delta specs or `opsx-delta.yaml` are present
- **THEN** the command SHALL assess sync state before moving the change directory
- **AND** SHALL apply delta spec changes to main specs
- **AND** SHALL apply `opsx-delta` changes to project OPSX files
- **AND** SHALL only move the change directory after sync completes successfully
- **AND** SHALL NOT execute `git add`, `git commit`, `git checkout`, `git merge`, or `git branch`

#### Scenario: Embedded sync failure aborts archive
- **WHEN** archive-time sync fails validation or referential integrity checks
- **THEN** the command SHALL abort archive
- **AND** main specs SHALL remain unchanged
- **AND** project OPSX files SHALL remain unchanged
- **AND** the change directory SHALL remain in the active changes directory
- **AND** SHALL NOT execute any git write operation

#### Scenario: Embedded sync deletes a main spec emptied by removals
- **WHEN** archive-time sync applies delta removals that leave a main spec with zero requirements
- **THEN** the command SHALL delete that main spec file
- **AND** SHALL treat the deletion as a completed spec sync
- **AND** SHALL NOT fail rebuilt spec validation only because no requirements remain

#### Scenario: Removal-only delta already deleted the main spec
- **WHEN** a change delta only removes requirements
- **AND** the corresponding main spec file no longer exists because sync already deleted it
- **THEN** the archive sync gate SHALL treat that spec delta as already synced
- **AND** SHALL NOT block archive with a pending sync error

#### Scenario: Removal-only delta target headers already absent
- **WHEN** a change delta only removes requirements
- **AND** the corresponding main spec file still exists
- **AND** every requirement header named by the delta is already absent from that main spec
- **AND** the main spec still contains unrelated requirements
- **THEN** the archive sync gate SHALL treat that spec delta as already synced
- **AND** SHALL NOT block archive with a pending sync error
- **AND** archive-time sync SHALL NOT throw `REMOVED failed`
