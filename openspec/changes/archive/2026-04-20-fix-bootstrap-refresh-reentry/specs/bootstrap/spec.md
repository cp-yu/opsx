## ADDED Requirements

### Requirement: Retained bootstrap workspaces SHALL expose an explicit lifecycle state

bootstrap SHALL 区分“仍在进行中的 retained workspace”和“已经完成 promote 的 retained workspace”。这种区分 SHALL 来自持久化的 workspace lifecycle state，而不是仅仅来自 `openspec/bootstrap/` 是否存在。

#### Scenario: completed retained workspace shows restart guidance

- **WHEN** `openspec/bootstrap/` exists and the workspace lifecycle state indicates the previous run already completed
- **THEN** `openspec bootstrap status` and `openspec bootstrap instructions` SHALL describe the workspace as completed
- **AND** SHALL present an explicit restart action for the next run
- **AND** SHALL NOT present the workspace as something the user should resume phase-by-phase

#### Scenario: in-progress retained workspace still resumes

- **WHEN** `openspec/bootstrap/` exists and the workspace lifecycle state indicates the run is still in progress
- **THEN** `openspec bootstrap status` SHALL continue to report the current phase and next resume action
- **AND** `openspec bootstrap instructions` SHALL continue to guide the user through the current phase
- **AND** the system SHALL NOT present restart as the default next step

### Requirement: Retained-workspace guidance SHALL stay consistent across bootstrap surfaces

bootstrap CLI help、generated instructions、workflow templates 与 user-facing docs SHALL 描述同一套 promote 后 retained workspace 行为。

#### Scenario: completed retained workspace guidance is consistent

- **WHEN** a completed retained workspace exists and the user checks bootstrap help, generated instructions, workflow templates, or bootstrap docs
- **THEN** all surfaces SHALL describe the same explicit restart path for beginning the next run
- **AND** SHALL explain that the prior workspace is retained as audit history
- **AND** SHALL NOT tell the user that deleting `openspec/bootstrap/` is the normal way to begin the next refresh run
