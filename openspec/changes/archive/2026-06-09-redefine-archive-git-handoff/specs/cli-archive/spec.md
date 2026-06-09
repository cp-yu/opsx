## MODIFIED Requirements

### Requirement: Archive CLI 输出 git handoff 提醒
`openspec archive` 在完成 verify、sync 与 move-to-archive 后 SHALL 读取 normalized project config 中的 `git.autoCommit`，并输出后续 git 工作的责任归属提醒。

#### Scenario: auto 模式提醒 agent 接管
- **WHEN** `openspec archive <change>` 完成归档
- **AND** normalized project config 中 `git.autoCommit` 为 `auto`
- **THEN** CLI SHALL 输出归档已完成
- **AND** SHALL 提醒后续 git 提交流程由 agent 自动继续处理
- **AND** SHALL NOT 输出任何推荐 commit message

#### Scenario: manual 模式提醒用户手动处理
- **WHEN** `openspec archive <change>` 完成归档
- **AND** normalized project config 中 `git.autoCommit` 为 `manual`
- **THEN** CLI SHALL 输出归档已完成
- **AND** SHALL 提醒后续 git 提交流程由用户手动处理
- **AND** SHALL NOT 输出任何推荐 commit message

### Requirement: Archive Process

The archive operation SHALL support complete archive-time sync in core mode before moving the change to the archive, and SHALL stop after the archive move plus handoff reminder without executing git write operations.

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

### Requirement: Archive-time sync SHALL use runtime projection
When `openspec archive` performs embedded spec sync, any generated or rebuilt artifact prose SHALL be driven by runtime projection compiled from project config, and git policy fields in that projection SHALL be used only for handoff reminders.

#### Scenario: Embedded sync creating a new main spec
- **WHEN** archive-time sync creates a main spec that does not yet exist
- **THEN** the archive command SHALL use runtime projection for generated prose
- **AND** SHALL NOT inject hardcoded English placeholder text that bypasses config policy
- **AND** SHALL NOT use `git.autoCommit` to execute git commit or merge

#### Scenario: Embedded sync updates remain projection-consistent
- **WHEN** archive-time sync updates existing main specs
- **THEN** the command SHALL preserve the same prose policy used by standalone sync
- **AND** both paths SHALL remain semantically aligned for the same input config and delta set
- **AND** SHALL NOT generate archive or merge commit messages
