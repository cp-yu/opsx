# Archive Verify Gate Specification (Delta)

## MODIFIED Requirements

### Requirement: 归档前必须具备新鲜的完整验证结果

系统 SHALL 在归档任意活动 change 之前取得一份 fresh 的 full verify 结果，并以该结果作为归档门禁。该结果 SHALL 包含 optimization 字段。

#### Scenario: 已存在新鲜且含优化数据的验证结果

- **WHEN** agent 准备归档某个 change
- **AND** change 目录中存在 `.verify-result.json`
- **AND** 该结果的 freshness 判定仍然有效
- **AND** 结果为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization` 字段存在且状态不为 `ABORTED_UNSAFE`
- **THEN** archive SHALL 复用该 verify 结果继续执行后续归档步骤
- **AND** SHALL NOT 再退回到轻量 inline conformance check

#### Scenario: 优化被跳过的验证结果仍然有效

- **WHEN** `.verify-result.json` 的 `optimization.status` 为 `SKIPPED` 或 `NOT_NEEDED`
- **AND** 顶层 `result` 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** archive SHALL 视为可接受的验证结果
- **AND** 继续执行后续归档步骤

#### Scenario: 验证结果包含优化异常终止

- **WHEN** `.verify-result.json` 的 `optimization.status` 为 `ABORTED_UNSAFE`
- **AND** 优化过程因超时或内部错误终止
- **THEN** 系统 SHALL 判断是否继续归档 based on 顶层 `result`
- **AND** 如果顶层 `result` 为 `PASS`：接受（因为代码功能正确）
- **AND** 输出提示 "Optimization phase aborted, but canonical verification passed."

### Requirement: Core 保持四个 workflow surface

系统 SHALL 保持 `core` profile 的用户可见 workflow surface 仍为 `propose`、`explore`、`apply`、`archive`，即使验证结果包含 optimization 数据。

#### Scenario: Core profile 保持当前 surface 列表

- **WHEN** 项目使用 `core` profile
- **THEN** 安装的 core workflow surface SHALL 仍然只包含 `propose`、`explore`、`apply`、`archive`
- **AND** SHALL NOT 因为优化功能而新增独立 `verify` surface

### Requirement: Freshness 基于显式验证证据判定

系统 SHALL 基于显式持久化的 verification context 判定 `.verify-result.json` 是否 fresh。`optimization` 字段存在不影响 freshness 判定，但缺失时 freshness 仍可通过。

#### Scenario: Freshness 判定标准不变

- **WHEN** archive 检查 `.verify-result.json` 的 freshness
- **THEN** 系统 SHALL 判定为 FRESH 当且仅当 ALL of:
  - `tasksFileHash` 匹配当前 `tasks.md`
  - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
  - `verificationContext.contractVersion` 是 "1.0"
  - `verificationContext.gitHeadCommit` 匹配当前 HEAD（如果记录了）
  - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization` 字段存在与否不影响 FRESH/STALE 判定
