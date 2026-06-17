## MODIFIED Requirements

### Requirement: Canonical Workflow Manifest

The system SHALL define a canonical workflow manifest as the single source of truth for generated skill artifacts.

#### Scenario: Register workflow once

- **WHEN** a workflow (for example `explore`, `apply`, or `bootstrap-opsx`) is added or modified
- **THEN** its canonical definition SHALL be registered once in the workflow manifest
- **AND** skill projections SHALL be derived from that manifest
- **AND** duplicate hand-maintained lists SHALL NOT be required

#### Scenario: Manifest 包含固定的 5 个工作流

- **WHEN** 查询 WorkflowManifestRegistry
- **THEN** manifest SHALL 包含固定 workflow entries
- **AND** manifest SHALL NOT 包含以下已删除的 entries：
  - `new`
  - `continue`
  - `ff`
  - `verify`
  - `sync`
  - `bulk-archive`
  - `onboard`

#### Scenario: modeMembership 作为标签系统

- **WHEN** 读取 workflow manifest entry 的 `modeMembership` 字段
- **THEN** 该字段 SHALL 被解释为标签列表，而非 profile 成员标识
- **AND** 系统 SHALL NOT 使用 `modeMembership` 过滤工作流
- **AND** 所有 manifest entries 均用于生成 skills

#### Scenario: 生成制品时使用全部 manifest entries

- **WHEN** 生成 skill 制品
- **THEN** 系统 SHALL 使用 manifest 中的全部 entries
- **AND** 系统 SHALL NOT 基于 `modeMembership` 值过滤 entries

### Requirement: Tool Profile Registry

The system SHALL define a tool profile registry that captures skill generation capabilities per tool.

#### Scenario: Resolve tool capabilities

- **WHEN** generating artifacts for a selected tool
- **THEN** the system SHALL resolve a tool profile that declares skill path capability and transform set
- **AND** tools with skills support SHALL be handled explicitly without command adapter fallback behavior

#### Scenario: Capability consistency validation

- **WHEN** running validation checks
- **THEN** the system SHALL detect mismatches between configured tools and profile definitions
- **AND** fail with actionable errors in development/CI

### Requirement: Ordered Transform Pipeline

The system SHALL support ordered artifact transforms with explicit scope semantics, and SHALL apply them to skill generation paths through the shared artifact sync engine.

#### Scenario: Execute pre-adapter and post-adapter transforms

- **WHEN** generating a skill artifact
- **THEN** matching skill transforms SHALL execute in deterministic order based on phase and priority
- **AND** command adapter phases SHALL NOT be required for skill artifact generation

#### Scenario: Apply tool-specific rewrites declaratively

- **WHEN** a tool requires instruction rewrites
- **THEN** those rewrites SHALL be implemented as registered transforms with explicit applicability predicates
- **AND** generation entry points SHALL NOT implement ad-hoc rewrite logic

#### Scenario: Command path uses transform pipeline

- **WHEN** workflow artifacts are generated
- **THEN** command artifact transform paths SHALL NOT run
- **AND** command adapters SHALL NOT be invoked

#### Scenario: Skills path uses transform pipeline

- **WHEN** `writeSkills()` generates skill artifacts via `ArtifactSyncEngine`
- **THEN** each skill's instructions SHALL be processed through `runTransforms` with `artifactType: 'skill'`
- **AND** transforms with `scope: 'both'` or `scope: 'skill'` SHALL apply to skill content

### Requirement: Shared Artifact Sync Engine

The system SHALL provide a shared artifact sync engine used by all skill generation entry points. Reference files declared by skill templates SHALL be written by the shared engine to the project-level `openspec/references/` home instead of per-tool skill directories.

#### Scenario: Init and update use same engine

- **WHEN** `openspec init` or `openspec update` writes skills
- **THEN** both flows SHALL use the same orchestration engine for planning, rendering, validating, and writing artifacts
- **AND** behavior differences SHALL NOT require separate duplicated loops

#### Scenario: Legacy upgrade path reuses engine

- **WHEN** legacy upgrade triggers artifact regeneration
- **THEN** the regeneration path SHALL use the same shared engine for skills
- **AND** generated outputs SHALL follow the same transform and validation rules

#### Scenario: Reference files write to the shared references home

- **WHEN** the engine writes skill artifacts for any configured tool
- **THEN** `template.referenceFiles[]` SHALL be written once to `openspec/references/` as `openspec-<name>.md`
- **AND** the engine SHALL NOT write `references/` subdirectories under any tool skill directory
- **AND** ownership, naming-uniqueness, and tool-neutrality constraints SHALL follow the `references-home` specification

### Requirement: Fidelity Guardrails

The system SHALL enforce guardrails that prevent output drift during refactors.

#### Scenario: Projection parity checks

- **WHEN** CI runs template generation tests
- **THEN** it SHALL verify manifest-derived projections remain consistent for workflows and skill directories
- **AND** detect missing exports or missing workflow registration

#### Scenario: Output parity checks

- **WHEN** running parity tests for representative workflow/tool combinations
- **THEN** generated skill artifacts SHALL remain behaviorally equivalent to approved baselines unless intentionally changed
- **AND** intentional changes SHALL be captured in explicit spec/proposal updates
