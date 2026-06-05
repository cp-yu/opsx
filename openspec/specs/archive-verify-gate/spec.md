# archive-verify-gate Specification

## Purpose
此规约记录变更 require-full-verify-before-archive 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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

### Requirement: Core 保持四个 workflow surface

系统 SHALL 保持 `core` profile 的用户可见 workflow surface 仍为 `propose`、`explore`、`apply`、`archive`，即使验证结果包含 optimization 数据。

#### Scenario: Core profile 保持当前 surface 列表

- **WHEN** 项目使用 `core` profile
- **THEN** 安装的 core workflow surface SHALL 仍然只包含 `propose`、`explore`、`apply`、`archive`
- **AND** SHALL NOT 因为优化功能而新增独立 `verify` surface

### Requirement: Freshness 基于显式验证证据判定

系统 SHALL 基于显式持久化的 verification context 判定 `.verify-result.json` 是否 fresh。`optimization` 字段存在不影响 freshness 判定，但其终局状态会影响 archive 是否可复用该结果。

#### Scenario: Freshness 判定标准不变

- **WHEN** archive 检查 `.verify-result.json` 的 freshness
- **THEN** 系统 SHALL 判定为 FRESH 当且仅当 ALL of:
  - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
  - `verificationContext.contractVersion` 是 "1.0"
  - `verificationContext.gitHeadCommit` 匹配当前 HEAD（如果记录了）
  - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `tasksFileHash` 不参与 FRESH/STALE 判定
- **AND** `optimization` 字段存在与否不影响 FRESH/STALE 判定

#### Scenario: Fresh 但 optimization 不可复用

- **WHEN** `.verify-result.json` 通过 freshness 判定
- **AND** `optimization.status` 为 `ABORTED_UNSAFE`
- **THEN** archive SHALL 仍然拒绝复用该结果
- **AND** SHALL 将其报告为“验证结果新鲜，但优化恢复状态不安全”

### Requirement: Archive reruns select verify execution model explicitly

系统 SHALL 在缺失或 stale verify result 触发 full verify rerun 时，显式选择与 `/opsx:verify` 一致的 execution model。

#### Scenario: subagent-capable 工具的 archive rerun 复用 subagent orchestration

- **WHEN** archive 检测到 `.verify-result.json` missing 或 stale
- **AND** 当前 AI 工具支持 clean-context subagent verify
- **THEN** archive SHALL 执行与 `/opsx:verify` 相同的 subagent-orchestrated full verify contract
- **AND** SHALL NOT 继续使用 archive 模板内独立描述的 current-agent review skeleton
- **AND** rerun SHALL 复用相同的 Phase 2 eligibility、checkpoint 与 speculative fence 语义

#### Scenario: reread 工具的 archive rerun 复用 reread contract

- **WHEN** archive 检测到 `.verify-result.json` missing 或 stale
- **AND** 当前 AI 工具不支持 clean-context subagent verify
- **THEN** archive SHALL 执行与 `/opsx:verify` 相同的 current-agent-reread full verify contract
- **AND** SHALL 保持现有 freshness 与 archive-compatibility gate 语义

### Requirement: Archive Verify + Sync Dual Gate

`openspec archive` 命令 SHALL 在执行归档前校验 verify 和 sync 状态。默认强制执行，`--no-verify` 标志提供显式用户授权绕过通道。

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

#### Scenario: 用户显式授权绕过门禁

- **WHEN** agent 执行 `openspec archive <change-name> --no-verify`
- **AND** 用户未同时使用 `--yes` 标志
- **THEN** 系统 SHALL 显示风险警告并要求交互式确认
- **AND** SHALL 说明绕过 verify gate 可能导致归档未验证的实现
- **WHEN** 用户拒绝确认
- **THEN** archive SHALL 取消并提示使用标准 verify gate
- **WHEN** 用户确认授权
- **THEN** 系统 SHALL 记录 `[AUTHORIZED]` 审计日志
- **AND** SHALL 跳过 verify 和 sync 门禁检查
- **AND** SHALL 继续执行 archive 逻辑

#### Scenario: --yes 模式下的 --no-verify 静默绕过

- **WHEN** agent 执行 `openspec archive <change-name> --no-verify --yes`
- **THEN** 系统 SHALL 跳过交互式确认
- **AND** SHALL 记录 `[AUTHORIZED]` 审计日志
- **AND** SHALL 直接跳过 verify 和 sync 门禁检查
