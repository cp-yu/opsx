## MODIFIED Requirements

### Requirement: Task Completion Check

The skill SHALL check task completion status from tasks.md before archiving, with mode-aware verification behavior.

#### Scenario: Expanded 模式 — verify stamp 前置检查

- **WHEN** agent executes `/opsx:archive` in `expanded` mode
- **AND** `tasks.md` exists with tasks marked complete
- **THEN** the skill SHALL check for `.verify-result.json` in the change directory
- **AND** if file does not exist, SHALL prompt user: "未找到验证结果。建议先运行 `/opsx:verify`。是否继续归档？"
- **AND** if file exists but result is `FAIL_NEEDS_REMEDIATION`, SHALL hard-block archive with message: "验证未通过，存在 CRITICAL 问题。请先修复后重新运行 `/opsx:verify`。"
- **AND** if file exists but `tasksFileHash` does not match current `tasks.md` content, SHALL treat as stale and prompt user

#### Scenario: Core 模式 — inline conformance check

- **WHEN** agent executes `/opsx:archive` in `core` mode
- **AND** `tasks.md` exists with all tasks marked complete
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the skill SHALL perform inline conformance check using shared verification rules
- **AND** for each CRITICAL issue found, SHALL unmark the corresponding task in `tasks.md`
- **AND** SHALL append remediation section to `tasks.md`
- **AND** SHALL abort archive if any CRITICAL issues remain

#### Scenario: Core 模式 — 无 delta specs 时跳过 conformance check

- **WHEN** agent executes `/opsx:archive` in `core` mode
- **AND** no delta specs exist
- **THEN** the skill SHALL skip inline conformance check
- **AND** proceed with existing task completion check behavior

#### Scenario: Incomplete tasks found

- **WHEN** agent reads tasks.md
- **AND** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display warning showing count of incomplete tasks
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All tasks complete

- **WHEN** agent reads tasks.md
- **AND** all tasks are complete (marked with `- [x]`)
- **THEN** proceed without task-related warning

#### Scenario: No tasks file

- **WHEN** tasks.md does not exist
- **THEN** proceed without task-related warning
