# archive-verify-gate Specification

## Purpose
此规约记录变更 require-full-verify-before-archive 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 归档前必须具备新鲜的完整验证结果

系统 SHALL 在归档任意活动 change 之前取得一份 fresh 的 full verify 结果，并以该结果作为归档门禁。该结果 SHALL 包含 optimization 字段，且其终局状态必须与 verify 的 checkpoint 生命周期语义一致。

#### Scenario: 已存在新鲜且含优化数据的验证结果

- **WHEN** agent 准备归档某个 change
- **AND** change 目录中存在 `.verify-result.json`
- **AND** 该结果的 freshness 判定仍然有效
- **AND** 结果为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization` 字段存在且状态为 `SKIPPED`、`NOT_NEEDED`、`IMPROVED` 或 `DEGRADED`
- **THEN** archive SHALL 复用该 verify 结果继续执行后续归档步骤
- **AND** SHALL NOT 再退回到轻量 inline conformance check

#### Scenario: 优化被跳过的验证结果仍然有效

- **WHEN** `.verify-result.json` 的 `optimization.status` 为 `SKIPPED` 或 `NOT_NEEDED`
- **AND** 顶层 `result` 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** archive SHALL 视为可接受的验证结果
- **AND** 继续执行后续归档步骤

#### Scenario: 验证结果包含优化异常终止

- **WHEN** `.verify-result.json` 的 `optimization.status` 为 `ABORTED_UNSAFE`
- **THEN** 系统 SHALL 将该结果视为 checkpoint 生命周期未闭环
- **AND** SHALL NOT 直接复用该结果继续归档，即使顶层 `result` 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** SHALL 提示用户先完成工作区恢复或重新执行 full verify

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
  - `tasksFileHash` 匹配当前 `tasks.md`
  - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
  - `verificationContext.contractVersion` 是 "1.0"
  - `verificationContext.gitHeadCommit` 匹配当前 HEAD（如果记录了）
  - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
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

