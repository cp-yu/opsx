---
capabilities:
  - cap.ai.template-artifact-pipeline
---
# Template Artifact Pipeline 规约变更

## REMOVED Requirements

无整个 requirements 需要删除，仅修改 manifest entries。

## MODIFIED Requirements

### Requirement: Canonical Workflow Manifest

The system SHALL define a canonical workflow manifest as the single source of truth for generated skill and command artifacts.

#### Scenario: Register workflow once

- **WHEN** a workflow (for example `explore`, `apply`, or `bootstrap-opsx`) is added or modified
- **THEN** its canonical definition SHALL be registered once in the workflow manifest
- **AND** skill/command projections SHALL be derived from that manifest
- **AND** duplicate hand-maintained lists SHALL NOT be required

#### Scenario: Manifest 包含固定的 5 个工作流

- **WHEN** 查询 WorkflowManifestRegistry
- **THEN** manifest SHALL 包含以下 5 个 entries：
  - `propose` (modeMembership: ['core'])
  - `explore` (modeMembership: ['core'])
  - `apply` (modeMembership: ['core'])
  - `archive` (modeMembership: ['core'])
  - `bootstrap-opsx` (modeMembership: [])
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
- **AND** 所有 manifest entries 均用于生成制品

#### Scenario: 生成制品时使用全部 manifest entries

- **WHEN** 生成 skill 或 command 制品
- **THEN** 系统 SHALL 使用 manifest 中的全部 entries
- **AND** 系统 SHALL NOT 基于 `modeMembership` 值过滤 entries
