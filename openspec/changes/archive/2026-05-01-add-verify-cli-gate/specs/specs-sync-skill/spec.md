## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Sync skill SHALL consume prompt projection

The `/opsx:sync` skill SHALL consume prompt projection compiled for the sync surface so its instructions align with CLI sync and with the shared config-driven authoring contract.

#### Scenario: Sync skill explains projected prose boundary

- **WHEN** the skill instructs the agent to reconcile or create specs
- **THEN** the prompt projection SHALL state how natural-language prose follows config-driven policy
- **AND** SHALL preserve canonical tokens such as `SHALL`, `MUST`, requirement headers, scenario headers, and BDD keywords
