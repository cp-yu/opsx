---
capabilities:
  - cap.ai.agent-docs
---
# docs-agent-instructions Specification

## Purpose
Define authoring standards for generated agent instruction docs so templates, examples, and validation checklists are clear and copy-ready.
## Requirements
### Requirement: Quick Reference Placement
The AI instructions SHALL begin with a quick-reference section that surfaces required file structures, templates, and formatting rules before any narrative guidance.

#### Scenario: Loading templates at the top
- **WHEN** `openspec/AGENTS.md` is regenerated or updated
- **THEN** the first substantive section after the title SHALL provide copy-ready headings for `proposal.md`, `tasks.md`, spec deltas, and scenario formatting
- **AND** link each template to the corresponding workflow step for deeper reading

### Requirement: Embedded Templates and Examples
`openspec/AGENTS.md` SHALL include complete copy/paste templates and inline examples exactly where agents make corresponding edits.

#### Scenario: Providing file templates
- **WHEN** authors reach the workflow guidance for drafting proposals and deltas
- **THEN** provide fenced Markdown templates that match the required structure (`## Why`, `## ADDED Requirements`, `#### Scenario:` etc.)
- **AND** accompany each template with a brief example showing correct header usage and scenario bullets

### Requirement: Respect Configured Documentation Language
OpenSpec agent instructions SHALL require agents to read `openspec/config.yaml` before generating or updating OpenSpec artifacts and apply `docLanguage` only to natural-language prose.

#### Scenario: Documentation language is configured
- **WHEN** `openspec/config.yaml` defines `docLanguage`
- **THEN** the instructions direct the agent to write artifact prose in that language
- **AND** preserve template headings, identifiers, and other structured tokens unchanged

#### Scenario: Filling templates under language constraints
- **WHEN** an agent creates or updates a proposal, design, tasks file, or spec delta
- **THEN** the instructions direct the agent to follow the existing template structure rather than inventing a new layout
- **AND** only the natural-language prose follows `docLanguage`
- **AND** IDs, schema keys, and protocol keywords remain canonical

### Requirement: Pre-validation Checklist
`openspec/AGENTS.md` SHALL offer a concise pre-validation checklist that highlights common formatting mistakes before running `openspec validate`.

#### Scenario: Highlighting common validation failures
- **WHEN** a reader reaches the validation guidance
- **THEN** present a checklist reminding them to verify requirement headers, scenario formatting, and delta sections
- **AND** include reminders about at least `#### Scenario:` usage and descriptive requirement text before scenarios

### Requirement: Progressive Disclosure of Workflow Guidance
The documentation SHALL separate beginner essentials from advanced topics so newcomers can focus on core steps without losing access to advanced workflows.

#### Scenario: Organizing beginner and advanced sections
- **WHEN** reorganizing `openspec/AGENTS.md`
- **THEN** keep an introductory section limited to the minimum steps (scaffold, draft, validate, request review)
- **AND** move advanced topics (multi-capability changes, archiving details, tooling deep dives) into clearly labeled later sections
- **AND** provide anchor links from the quick-reference to those advanced sections

### Requirement: Behavior-First Spec Authoring Guidance
Agent instruction docs SHALL explicitly teach that specs capture WHAT-only observable behavior contracts, while implementation, refactor, and process details belong outside specs.

#### Scenario: Distinguishing spec vs implementation content
- **WHEN** `openspec/AGENTS.md` explains how to write `spec.md`
- **THEN** it SHALL instruct agents to include externally verifiable behavior, inputs/outputs, errors, and constraints
- **AND** it SHALL instruct agents to avoid internal library/framework choices, class/function-level implementation details, call paths, refactor rationale, rejected approaches, and exploration notes in specs

#### Scenario: Routing detail to the right artifact
- **WHEN** implementation, refactor, or decision detail is necessary
- **THEN** instructions SHALL direct the agent to place technical decisions, refactor rationale, rejected approaches, and implementation strategy in `design.md`
- **AND** concrete implementation steps or verification work SHALL go in `tasks.md`
- **AND** motivation and scope SHALL go in `proposal.md`
- **AND** architecture graph intent changes SHALL go in `opsx-delta.yaml`

### Requirement: Lightweight-by-Default Guidance
Agent instruction docs SHALL promote minimal ceremony and proportional rigor for spec authoring.

#### Scenario: Applying progressive rigor
- **WHEN** an agent drafts specs for routine changes
- **THEN** instructions SHALL favor concise, lightweight requirements and scenarios
- **AND** reserve deeper, fuller specification style for higher-risk changes (such as API breaks, migrations, cross-team, or security/privacy sensitive work)

#### Scenario: Time-to-clarity optimization
- **WHEN** guidance discusses drafting workflow
- **THEN** it SHALL emphasize producing the smallest spec that is still testable and reviewable

### Requirement: Artifact-writing workflow surfaces SHALL share one config projection contract
All workflow and skill surfaces that create or rewrite OpenSpec artifacts SHALL inherit the same config projection contract, including prompt-level authoring constraints and canonical-token preservation rules.

#### Scenario: Projection contract applies across workflow surfaces
- **WHEN** a workflow or skill creates, syncs, archives, bootstraps, verifies, or onboards OpenSpec artifacts
- **THEN** the generated instructions SHALL consume the shared prompt projection contract
- **AND** the contract SHALL preserve canonical tokens such as `SHALL`, `MUST`, section headers, requirement headers, scenario headers, BDD keywords, IDs, schema keys, paths, and commands

#### Scenario: docLanguage is rendered as actionable guidance
- **WHEN** config defines `docLanguage`
- **THEN** the projection contract SHALL render it as explicit authoring guidance for natural-language prose
- **AND** SHALL NOT rely on the agent inferring behavior from a raw YAML key/value dump alone

### Requirement: artifact prose language contract 明确字段边界
Artifact-writing workflow surface SHALL 使用共享 config projection contract 指示 agent 将新写或改写的 natural-language prose 写成 `proseLanguage` 指定的语言，并明确 artifact 中哪些字段属于 prose。

#### Scenario: 共享 contract 定义 prose 字段
- **WHEN** workflow 或 skill surface 生成、更新或回写 OpenSpec artifact
- **THEN** generated instructions SHALL 指出 natural-language prose 包括 proposal/design body text、bullet descriptions、task titles、check names、new Requirement titles、new Scenario titles、`Expect:` descriptions、`Evidence:` descriptions、rationale、goals、risks 和 summaries
- **AND** generated instructions SHALL 指出这些 prose 字段跟随 `proseLanguage`

#### Scenario: 共享 contract 保留 canonical token
- **WHEN** workflow 或 skill surface 应用 `proseLanguage`
- **THEN** generated instructions SHALL 保留 template headings、normative keywords、BDD keywords、IDs、schema keys、relation types、paths、commands 和 code identifiers 的 canonical 形式
- **AND** generated instructions SHALL 允许 `MODIFIED Requirements` 中用于 exact matching 的 existing Requirement titles 保持原文

#### Scenario: 英文术语可嵌入目标语言 prose
- **WHEN** artifact prose 包含 OpenSpec 或工程术语
- **THEN** generated instructions SHALL 允许 `artifact`、`workflow`、`proseLanguage`、`Requirement`、`Scenario`、`apply`、`propose` 等术语保留英文
- **AND** generated instructions SHALL NOT 将普通英文句子、task titles 或 check names 仅因包含英文术语而整体保留为英文 prose

