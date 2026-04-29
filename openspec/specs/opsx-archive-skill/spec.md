# OPSX Archive Skill Spec

## Purpose

Define the expected behavior for the `/opsx:archive` skill, including readiness checks, spec sync prompting, archive execution, and user-facing output.
## Requirements
### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives completed changes in the experimental workflow.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** agent executes `/opsx:archive` with a change name
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent moves the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **AND** displays success message with archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows only active changes (excludes archive/)

### Requirement: Artifact Completion Check

The skill SHALL check artifact completion status using the artifact graph before archiving.

#### Scenario: Incomplete artifacts warning

- **WHEN** agent checks artifact status
- **AND** one or more artifacts have status other than `done`
- **THEN** display warning listing incomplete artifacts
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All artifacts complete

- **WHEN** agent checks artifact status
- **AND** all artifacts have status `done`
- **THEN** proceed without warning

### Requirement: Task Completion Check

The skill SHALL 在归档前检查 `tasks.md` 的任务完成状态，并执行强制性的完整验证门禁。

#### Scenario: archive-time full verify 不得私自跳过可执行的 Phase 2

- **WHEN** archive 因缺失或 stale 的 `.verify-result.json` 而重新执行 full verify
- **AND** canonical Phase 1 result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `openspec/config.yaml` 未禁用 optimization
- **AND** 用户未显式请求 `--skip-optimization`
- **THEN** the skill SHALL 继续执行与 `/opsx:verify` 完全一致的 Phase 2 optimization contract
- **AND** SHALL NOT 仅因 archive-time 存在 speculative edit 风险而降级成 Phase-1-only verify
- **AND** 只有在 config 禁用或用户显式请求 `--skip-optimization` 时，`.verify-result.json` 才可记录 `optimization.status = SKIPPED`

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

### Requirement: Archive Process

The skill SHALL move the change to the archive folder with date prefix.

#### Scenario: Successful archive

- **WHEN** archiving a change
- **THEN** create `archive/` directory if it doesn't exist
- **AND** generate target name as `YYYY-MM-DD-<change-name>` using current date
- **AND** move entire change directory to archive location
- **AND** preserve `.openspec.yaml` file in archived change

#### Scenario: Archive already exists

- **WHEN** target archive directory already exists
- **THEN** fail with error message
- **AND** suggest renaming existing archive or using different date

### Requirement: Skill Output

The skill SHALL provide clear feedback about the archive operation.

#### Scenario: Archive complete with sync

- **WHEN** archive completes after syncing specs
- **THEN** display summary:
  - Specs synced (from `/opsx:sync` output)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete without sync

- **WHEN** archive completes without syncing specs
- **THEN** display summary:
  - Note that specs were not synced (if applicable)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete with warnings

- **WHEN** archive completes with incomplete artifacts or tasks
- **THEN** include note about what was incomplete
- **AND** suggest reviewing if archive was intentional

### Requirement: Archive skill SHALL consume prompt projection
The `/opsx:archive` skill SHALL consume prompt projection for archive-time sync guidance and artifact write-back guidance rather than relying on raw config interpretation inside the template body.

#### Scenario: Archive guidance inherits projected authoring constraints
- **WHEN** the skill explains embedded sync or remediation handling
- **THEN** it SHALL use the shared prompt projection contract for prose guidance
- **AND** SHALL preserve canonical structure and normative tokens unchanged

