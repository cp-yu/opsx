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

#### Scenario: 统一 verify gate - 复用 fresh verify result

- **WHEN** agent 执行 `/opsx:archive`（无论 `core` 或 `expanded` mode）
- **AND** change 目录中存在 `.verify-result.json`
- **AND** verify result 经 freshness 判定仍然 fresh（见 verify-writeback spec）
- **AND** result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** the skill SHALL 复用该 verify result 作为 archive gate
- **AND** 在不重新执行 verify 的前提下继续剩余归档检查
- **AND** 告知用户："Fresh verify result found (${result}). Proceeding with archive..."

#### Scenario: 统一 verify gate - 缺失或 stale 时执行 full verify

- **WHEN** agent 执行 `/opsx:archive`（无论 `core` 或 `expanded` mode）
- **AND** `.verify-result.json` 缺失或经 freshness 判定为 stale
- **THEN** the skill SHALL 在归档前执行一次 full verify
- **AND** 该 full verify SHALL 使用与 `/opsx:verify` 相同的验证合同（见 opsx-verify-skill spec）
- **AND** 告知用户："No verify result found" 或 "Verify result is stale. Executing full verify before archive..."
- **AND** 仅当 verify 返回 `PASS` 或 `PASS_WITH_WARNINGS` 时才继续归档

#### Scenario: 统一 verify gate - 无 core/expanded 分支差异

- **WHEN** agent 执行 `/opsx:archive`
- **THEN** the skill SHALL 使用统一的 verify gate 逻辑
- **AND** SHALL NOT 因 `core` 或 `expanded` mode 而有不同的验证深度或门禁标准
- **AND** SHALL NOT 保留任何 lightweight inline conformance check 路径
- **AND** 具体实现见 `prompts.md` 中 archive-change.ts Step 2

#### Scenario: 验证门禁 hard-block on FAIL_NEEDS_REMEDIATION

- **WHEN** archive 读取或执行 verify 后得到 result 为 `FAIL_NEEDS_REMEDIATION`
- **THEN** the skill SHALL 强制阻断 archive（HARD-BLOCK）
- **AND** SHALL 保持该 change 继续处于 active 状态（不移动到 archive/）
- **AND** SHALL 显示 CRITICAL issues 列表
- **AND** SHALL 指示用户："Verification failed. Fix CRITICAL issues and re-run `/opsx:verify` or `/opsx:apply`"
- **AND** SHALL NOT 提供任何 skip 或 continue 选项

#### Scenario: 存在未完成任务

- **WHEN** agent 读取 `tasks.md`
- **AND** 发现未完成任务（标记为 `- [ ]`）
- **THEN** 展示 warning，说明未完成任务数量
- **AND** 提示用户确认是否继续
- **AND** 用户确认后才继续

#### Scenario: 所有任务均已完成

- **WHEN** agent 读取 `tasks.md`
- **AND** 所有任务均已完成（标记为 `- [x]`）
- **THEN** 在没有 task warning 的情况下继续

#### Scenario: 不存在 tasks 文件

- **WHEN** `tasks.md` 不存在
- **THEN** 在没有 task warning 的情况下继续

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

