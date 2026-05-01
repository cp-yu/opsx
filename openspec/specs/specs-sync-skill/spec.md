# specs-sync-skill Specification

## Purpose
Defines the agent skill for syncing delta specs from changes to main specs.
## Requirements
### Requirement: Specs Sync Skill

The system SHALL provide an `/opsx:sync` skill and `openspec sync` CLI command for syncing delta specs AND opsx-delta from a change to the main specs and OPSX files. In core mode, the agent SHALL use `openspec sync` CLI tool instead of manual inline reconciliation.

#### Scenario: Core mode uses openspec sync CLI

- **WHEN** the active mode is `core`
- **AND** archive workflow reaches the delta sync assessment step
- **THEN** the agent SHALL call `openspec sync <change-name>` to reconcile delta specs and OPSX delta
- **AND** SHALL NOT perform manual inline spec comparison and reconciliation
- **AND** the `openspec sync` CLI SHALL check the verify gate before proceeding (see `verify-cli-gate` spec)

#### Scenario: Expanded mode exposes standalone sync surface

- **WHEN** the active mode is `expanded`
- **THEN** the generated workflow surface SHALL include `/opsx:sync`
- **AND** the skill SHALL continue to reconcile delta specs and `opsx-delta` exactly as defined by the sync contract

#### Scenario: Standalone sync and embedded archive sync are semantically aligned

- **WHEN** a change requires both spec sync and OPSX sync
- **THEN** running `openspec sync` in core mode, running `/opsx:sync` in expanded mode, and running archive-time embedded sync SHALL produce the same resulting main specs and OPSX state
- **AND** both paths SHALL preserve idempotency and zero-side-effect failure guarantees

#### Scenario: Standalone sync remains optional in expanded mode

- **WHEN** an expanded-mode user already ran `/opsx:sync`
- **THEN** `/opsx:archive` SHALL observe that no archive-time sync writes remain
- **AND** archive SHALL proceed without requiring the standalone sync surface to run again

### Requirement: Delta Reconciliation Logic
The agent SHALL reconcile main specs with delta specs using the delta operation headers.

#### Scenario: ADDED requirements
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** the requirement does not exist in main spec
- **THEN** add the requirement to main spec

#### Scenario: ADDED requirement already exists
- **WHEN** delta contains `## ADDED Requirements` with a requirement
- **AND** a requirement with the same name already exists in main spec
- **THEN** update the existing requirement to match the delta version

#### Scenario: MODIFIED requirements
- **WHEN** delta contains `## MODIFIED Requirements` with a requirement
- **AND** the requirement exists in main spec
- **THEN** replace the requirement in main spec with the delta version

#### Scenario: REMOVED requirements
- **WHEN** delta contains `## REMOVED Requirements` with a requirement name
- **AND** the requirement exists in main spec
- **THEN** remove the requirement from main spec

#### Scenario: RENAMED requirements
- **WHEN** delta contains `## RENAMED Requirements` with FROM:/TO: format
- **AND** the FROM requirement exists in main spec
- **THEN** rename the requirement to the TO name

#### Scenario: New capability spec
- **WHEN** delta spec exists for a capability not in main specs
- **THEN** create new main spec file at `openspec/specs/<capability>/spec.md`

### Requirement: Skill Output
The skill SHALL provide clear feedback on what was applied.

#### Scenario: Show applied changes
- **WHEN** reconciliation completes successfully
- **THEN** display summary of changes per capability:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed

#### Scenario: Show OPSX sync summary
- **WHEN** opsx-delta sync completes successfully
- **THEN** display summary including:
  - Number of nodes added to `project.opsx.yaml`
  - Number of relations added to `project.opsx.relations.yaml`
  - Number of nodes modified
  - Number of nodes removed

#### Scenario: No changes needed
- **WHEN** main specs already match delta specs
- **THEN** display "Specs already in sync - no changes needed"

### Requirement: OPSX_SYNC_DELTA Fragment Integration
The `sync-specs.ts` workflow template SHALL import and embed the `OPSX_SYNC_DELTA` fragment from `opsx-fragments.ts` as a post-specs-sync step.

#### Scenario: Fragment wired into skill template
- **GIVEN** `OPSX_SYNC_DELTA` is defined in `opsx-fragments.ts`
- **WHEN** `getSyncSpecsSkillTemplate()` generates instructions
- **THEN** the instructions include the OPSX delta sync step after specs sync

#### Scenario: Fragment wired into command template
- **GIVEN** `OPSX_SYNC_DELTA` is defined in `opsx-fragments.ts`
- **WHEN** `getOpsxSyncCommandTemplate()` generates content
- **THEN** the content includes the OPSX delta sync step after specs sync

### Requirement: Sync skill SHALL consume prompt projection

The `/opsx:sync` skill SHALL consume prompt projection compiled for the sync surface so its instructions align with CLI sync and with the shared config-driven authoring contract.

#### Scenario: Sync skill explains projected prose boundary

- **WHEN** the skill instructs the agent to reconcile or create specs
- **THEN** the prompt projection SHALL state how natural-language prose follows config-driven policy
- **AND** SHALL preserve canonical tokens such as `SHALL`, `MUST`, requirement headers, scenario headers, and BDD keywords

### Requirement: Sync Verify Gate

`openspec sync` 命令 SHALL 在执行同步前校验 verify 结果。

#### Scenario: Verify 通过，继续 sync

- **WHEN** agent 执行 `openspec sync <change-name>`
- **AND** `.verify-result.json` 存在且 FRESH
- **AND** `result` 为 PASS 或 PASS_WITH_WARNINGS
- **AND** `optimization.status` 不为 ABORTED_UNSAFE
- **THEN** 系统 SHALL 继续执行 sync 逻辑

#### Scenario: Verify 不通过，询问用户

- **WHEN** agent 执行 `openspec sync <change-name>`
- **AND** `.verify-result.json` 缺失、STALE 或 result 不为 PASS/PASS_WITH_WARNINGS
- **THEN** 系统 SHALL 输出详细状态（verify 结果状态 + optimization 状态）
- **AND** SHALL 以 exit 1 退出
- **AND** agent SHALL 向用户展示选项：运行 verify / 强制继续 / 放弃

