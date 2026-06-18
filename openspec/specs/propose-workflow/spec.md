---
capabilities:
  - cap.ai.propose-smart-routing
  - cap.ai.workflow-templates
---
## Purpose

The propose workflow SHALL combine change creation and artifact generation into a single command, reducing friction for new users while teaching them the OpenSpec workflow through embedded guidance.
## Requirements
### Requirement: Propose workflow creation
The system SHALL provide a `propose` workflow that creates a change and generates all artifacts in one step.

#### Scenario: Basic propose invocation
- **WHEN** user invokes `/opsx:propose "add user authentication"`
- **THEN** the system SHALL create a change directory with kebab-case name
- **THEN** the system SHALL create `.openspec.yaml` in the change directory (via `openspec new change`)
- **THEN** the system SHALL generate all artifacts needed for implementation: proposal.md, design.md, specs/, tasks.md

#### Scenario: Propose with existing change name
- **WHEN** user invokes `/opsx:propose` with a name that already exists
- **THEN** the system SHALL ask if user wants to continue existing change or create new
- **THEN** if "continue": the system SHALL resume artifact generation from last completed state
- **THEN** if "create new": the system SHALL prompt for a new name
- **THEN** in non-interactive mode: the system SHALL fail with error suggesting to use a different name

### Requirement: Propose workflow onboarding UX
The `propose` workflow SHALL include explanatory output to help new users understand the process.

#### Scenario: First-time user guidance
- **WHEN** user invokes `/opsx:propose`
- **THEN** the system SHALL explain what artifacts will be created (proposal.md, design.md, specs/, tasks.md)
- **THEN** the system SHALL indicate next step (`/opsx:apply` to implement)

#### Scenario: Artifact creation progress
- **WHEN** the system creates each artifact
- **THEN** the system SHALL show progress (e.g., "✓ Created proposal.md")

### Requirement: Propose workflow creates the full planning set
The `propose` workflow SHALL create the same planning artifacts that were previously produced by scaffold-plus-generation flows.

#### Scenario: Equivalent artifact result
- **WHEN** user invokes `/opsx:propose "feature name"`
- **THEN** the result SHALL create the change directory and the planning artifacts in one step
- **THEN** the same directory structure and artifacts SHALL be created
- **THEN** console output MAY differ (propose includes onboarding explanations)

### Requirement: Propose applies spec content boundary
The `propose` workflow SHALL apply the schema-provided `Spec content boundary` when generating `specs` artifacts.

#### Scenario: Specs generation routes non-behavior content
- **WHEN** `/opsx:propose` creates the `specs` artifact
- **THEN** the prompt SHALL instruct the agent to apply the returned `Spec content boundary`
- **AND** non-behavior content SHALL be routed to `design.md`, `tasks.md`, `proposal.md`, or `opsx-delta.yaml` instead of requirements

#### Scenario: Propose does not duplicate boundary rules
- **WHEN** `/opsx:propose` references the spec content boundary
- **THEN** it SHALL rely on the boundary returned by `openspec instructions specs --change "<name>" --json`
- **AND** it SHALL NOT define a separate conflicting classification table in the propose workflow template

### Requirement: Propose 消费共享 artifact language contract
`$openspec-propose` workflow SHALL 在生成 proposal、specs、design 和 tasks 时消费共享 `Document Language Contract` 与 artifact instructions 中的 `configProjection.prompt.fragments`，使新写或改写的 natural-language prose 跟随 `proseLanguage`。

#### Scenario: Propose template 包含共享语言契约
- **WHEN** propose skill 或 command template 被组装
- **THEN** template SHALL 包含共享 `Document Language Contract`
- **AND** contract SHALL 指示 agent 保留 canonical tokens，同时让 artifact prose fields 跟随 `proseLanguage`

#### Scenario: Propose 不增加额外语言自检流程
- **WHEN** propose workflow 创建 artifact
- **THEN** workflow SHALL 根据 artifact instructions 和共享 language contract 撰写 artifact
- **AND** workflow SHALL NOT 要求每个 artifact 完成前执行额外 non-canonical English prose scan
