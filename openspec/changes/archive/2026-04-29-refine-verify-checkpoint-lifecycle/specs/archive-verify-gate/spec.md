## MODIFIED Requirements

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
