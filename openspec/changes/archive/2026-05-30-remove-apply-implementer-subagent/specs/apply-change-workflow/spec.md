## ADDED Requirements

### Requirement: apply Phase 0 由 Master agent 直接执行
`openspec-apply-change` workflow SHALL make the Master agent directly implement pending `tasks.md` tasks during Phase 0. The workflow SHALL NOT generate `.apply-steps`, SHALL NOT read `.apply-steps`, and SHALL NOT dispatch `openspec-implementer` for coding execution.

#### Scenario: Master agent 直接实现 pending task
- **WHEN** `openspec instructions apply --change "<name>" --json` returns implementation work to perform
- **THEN** the apply workflow SHALL instruct the Master agent to read `tasks.md`, change-local specs, design, related project files, and tests
- **AND** the Master agent SHALL directly edit source, tests, and artifacts needed for the pending task
- **AND** the Master agent SHALL update task checkboxes and remediation checkboxes after executable evidence passes

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
