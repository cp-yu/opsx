## MODIFIED Requirements

### Requirement: 归档前必须具备新鲜的完整验证结果

系统 SHALL 在归档任意活动 change 之前取得一份 fresh 的 full verify 结果，并通过 CLI 工具（`openspec verify status` 或等价的 freshness 检查）执行门禁校验。该结果 SHALL 包含 optimization 字段，且其终局状态必须与 verify 的 checkpoint 生命周期语义一致。

#### Scenario: Archive 通过 CLI 校验 verify gate

- **WHEN** agent 准备归档某个 change
- **AND** agent 调用 `openspec archive <change-name>`（或模板中等价的 freshness 预检查）
- **AND** CLI 校验 `.verify-result.json` FRESH + archive-compatible
- **THEN** archive SHALL 复用该 verify 结果继续执行后续归档步骤
- **AND** SHALL NOT 退回到轻量 inline conformance check

#### Scenario: Verify 结果缺失或 STALE 时由 CLI 提示

- **WHEN** agent 调用 archive 相关 CLI
- **AND** `.verify-result.json` MISSING 或 STALE
- **THEN** CLI SHALL 以 exit 1 退出并输出具体原因
- **AND** agent SHALL 向用户展示选项：先运行 verify / 强制继续 / 放弃

#### Scenario: 优化被跳过的验证结果仍然有效

- **WHEN** `optimization.status` 为 `SKIPPED`
- **AND** 跳过原因合理（config 禁用 或 用户显式 `--skip-optimization`）
- **THEN** 结果 SHALL 被视为 archive-compatible

#### Scenario: PENDING_VERIFICATION 状态不得归档复用

- **WHEN** `optimization.status` 为 `PENDING_VERIFICATION`
- **THEN** verify 结果 SHALL NOT 被视为 archive-compatible
- **AND** CLI SHALL 输出 "Phase 2 未完成验证，请先完成 speculative fence"

#### Scenario: ABORTED_UNSAFE 硬阻塞

- **WHEN** `optimization.status` 为 `ABORTED_UNSAFE`
- **THEN** 即使顶层 result 为 PASS 也不得复用
- **AND** CLI SHALL 输出恢复指示

## ADDED Requirements

### Requirement: Archive Verify + Sync Dual Gate

`openspec archive` 命令 SHALL 在执行归档前校验 verify 和 sync 状态。

#### Scenario: 双重门禁通过，继续 archive

- **WHEN** agent 执行 `openspec archive <change-name>`
- **AND** verify gate 通过（`.verify-result.json` FRESH + result PASS/PASS_WITH_WARNINGS + optimization.status 非 ABORTED_UNSAFE）
- **AND** sync 已完成（`assessChangeSyncState` 返回 `requiresSync = false`）
- **THEN** 系统 SHALL 继续执行 archive 逻辑

#### Scenario: 门禁不通过，合并询问

- **WHEN** agent 执行 `openspec archive <change-name>`
- **AND** verify gate 或 sync gate 任一不通过
- **THEN** 系统 SHALL 输出两个门禁的合并状态
- **AND** SHALL 以 exit 1 退出
- **AND** agent SHALL 向用户展示合并选项：先运行 verify+sync / 仅 sync / 强制继续 / 放弃
