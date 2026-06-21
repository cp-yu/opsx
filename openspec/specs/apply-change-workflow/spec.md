# apply-change-workflow Specification

## Purpose
此规约记录变更 fix-apply-instructions-verify-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: apply 模板处理中间验证状态

`openspec-apply-change` 技能模板 SHALL 对 `needs_verify` 和 `needs_seal` 状态提供正确的处理分支，无缝进入对应的验证阶段。

#### Scenario: needs_verify 状态进入 Phase 1

- **WHEN** `instructions apply --json` 返回 `state: 'needs_verify'`
- **THEN** 模板 SHALL 指示 agent 进入 Phase 1 验证流程（启动 reviewer subagent）
- **AND** 不打断用户或请求用户手动触发 verify

#### Scenario: needs_seal 状态进入 Phase 2/3

- **WHEN** `instructions apply --json` 返回 `state: 'needs_seal'`
- **THEN** 模板 SHALL 指示 agent 进入 Phase 2/3 流程（optimize + seal）
- **AND** 不打断用户或请求用户手动触发

#### Scenario: view Dashboard 分类标签不声称完成

- **WHEN** Dashboard 展示 task 全部完成的 change
- **THEN** 分类标签 SHALL 显示为 "Tasks Done" 而非 "Completed Changes"

### Requirement: apply Phase 0 由 Master agent 直接执行
`openspec-apply-change` workflow SHALL make the Master agent execute pending `tasks.md` Checks through strict TDD during Phase 0. The workflow SHALL NOT generate `.apply-steps`, SHALL NOT read `.apply-steps`, and SHALL NOT dispatch `openspec-implementer` for coding execution.

#### Scenario: Master agent 串行执行任务
- **WHEN** `openspec instructions apply --change "<name>" --json` returns multiple pending tasks
- **THEN** the apply workflow SHALL instruct the Master agent to execute tasks sequentially
- **AND** the Master agent SHALL complete the current task's all Checks before proceeding to the next task
- **AND** the Master agent SHALL NOT process multiple tasks in parallel

#### Scenario: Master agent 严格 TDD 实现 pending Check
- **WHEN** `openspec instructions apply --change "<name>" --json` returns implementation work to perform
- **THEN** the apply workflow SHALL instruct the Master agent to read `tasks.md`, change-local specs, design, related project files, and tests
- **AND** for each behavior or code Check, the Master agent SHALL add or update the targeted test before implementation
- **AND** the Master agent SHALL run the declared Check command or equivalent targeted command and confirm the expected failure before implementation
- **AND** the Master agent SHALL make the minimal implementation needed for that Check
- **AND** the Master agent SHALL rerun the same or equivalent Check command and confirm pass before updating task or remediation checkboxes

#### Scenario: 非运行时文本制品不伪造 red failure
- **WHEN** a pending Check only changes non-runtime text or non-runtime artifacts
- **THEN** the apply workflow SHALL NOT require an artificial failing test
- **AND** the Master agent SHALL run the declared verification command or inspect the declared `Evidence:` / `Expect:` fields
- **AND** the Master agent SHALL update task or remediation checkboxes only after final evidence passes

#### Scenario: config schema template 默认按行为变更处理
- **WHEN** a pending Check changes config, schema, generated templates, workflow templates, or agent instruction templates
- **THEN** the apply workflow SHALL classify the Check as a behavior or code Check by default
- **AND** the apply workflow SHALL allow non-runtime text handling only when the Check explicitly establishes that the edited content has no runtime or generated-surface consumer

#### Scenario: apply workflow 不生成 apply-steps
- **WHEN** the apply workflow enters Phase 0 implementation
- **THEN** it SHALL NOT create files under `openspec/changes/<change-name>/.apply-steps/`
- **AND** it SHALL NOT use `.apply-steps` as a recovery or dispatch input
- **AND** any implementation planning SHALL remain in the current Master agent context or in `tasks.md` remediation entries

#### Scenario: apply workflow 不 dispatch implementer
- **WHEN** a pending task is ready for implementation
- **THEN** the apply workflow SHALL NOT spawn an implementer subagent
- **AND** it SHALL NOT instruct any subagent to invoke `openspec-implementer`
- **AND** it SHALL NOT request a cheap model for coding execution

#### Scenario: clean-context verify gate 保持不变
- **WHEN** all Phase 0 implementation and remediation work is complete
- **THEN** the apply workflow SHALL continue to spawn `openspec-reviewer` for Phase 1
- **AND** SHALL continue to spawn `openspec-optimizer` for Phase 2 when optimization is enabled
- **AND** the Master agent SHALL NOT replace reviewer or optimizer judgment
