# archive-verify-gate Specification

## Purpose
此规约记录变更 require-full-verify-before-archive 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 归档前必须具备新鲜的完整验证结果
系统 SHALL 在归档任意活动 change 之前取得一份 fresh 的 full verify 结果，并以该结果作为归档门禁。

#### Scenario: 已存在新鲜的验证结果
- **WHEN** agent 准备归档某个 change
- **AND** change 目录中存在 `.verify-result.json`
- **AND** 该结果的 freshness 判定仍然有效
- **AND** 结果为 `PASS` 或 `PASS_WITH_WARNINGS`
- **THEN** archive SHALL 复用该 verify 结果继续执行后续归档步骤
- **AND** SHALL NOT 再退回到轻量 inline conformance check

#### Scenario: 验证结果缺失或过期
- **WHEN** agent 准备归档某个 change
- **AND** `.verify-result.json` 不存在或 freshness 判定失效
- **THEN** archive SHALL 在归档前先执行一次 full verify
- **AND** 只有 verify 返回 `PASS` 或 `PASS_WITH_WARNINGS` 时才可继续归档

#### Scenario: 归档前验证失败
- **WHEN** archive 触发的 full verify 返回 `FAIL_NEEDS_REMEDIATION`
- **THEN** archive SHALL 中止
- **AND** SHALL 保留 change 目录不移动
- **AND** SHALL 指示用户先处理 remediation 再重新归档

### Requirement: Core 保持四个 workflow surface
系统 SHALL 保持 `core` profile 的用户可见 workflow surface 仍为 `propose`、`explore`、`apply`、`archive`，即使归档前强制执行 full verify。

#### Scenario: Core profile 保持当前 surface 列表
- **WHEN** 项目使用 `core` profile
- **THEN** 安装的 core workflow surface SHALL 仍然只包含 `propose`、`explore`、`apply`、`archive`
- **AND** SHALL NOT 因为归档门禁而新增独立 `verify` surface

#### Scenario: Core archive 内嵌完整验证合同
- **WHEN** 项目使用 `core` profile
- **AND** agent 执行 `archive`
- **THEN** archive SHALL 在内部执行与 `/opsx:verify` 相同的 full verify 契约
- **AND** SHALL 对用户保持单一 `archive` 入口

### Requirement: Freshness 基于显式验证证据判定
系统 SHALL 基于显式持久化的 verification context 判定 `.verify-result.json` 是否 fresh，而不是仅凭”曾经跑过 verify”。

#### Scenario: Freshness 判定标准
- **WHEN** archive 检查 `.verify-result.json` 的 freshness
- **THEN** 系统 SHALL 判定为 FRESH 当且仅当 ALL of:
  - `tasksFileHash` 匹配当前 `tasks.md`
  - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
  - `verificationContext.contractVersion` 是 “1.0”
  - `verificationContext.gitHeadCommit` 匹配当前 HEAD（如果记录了）
  - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** 系统 SHALL 判定为 STALE 当 ANY of:
  - `tasksFileHash` 不匹配
  - `evidenceFiles` 列表发生变化
  - `evidenceFingerprint` 不匹配
  - `gitHeadCommit` 不匹配
  - `contractVersion` 缺失或不是 “1.0”
- **AND** 具体规则见 `prompts.md` 中的 `VERIFY_FRESHNESS_RULES`

#### Scenario: Stale verify result 触发重新验证
- **WHEN** `.verify-result.json` 经判定为 stale
- **THEN** archive SHALL 在归档前重新执行 full verify
- **AND** SHALL NOT 尝试修复或复用 stale verify result

#### Scenario: 跨平台路径处理
- **WHEN** 计算或比较 evidence file 路径和 fingerprint
- **THEN** 系统 SHALL 使用跨平台路径处理方式（`path.normalize`, `path.resolve`）
- **AND** SHALL NOT 假设路径分隔符恒为 `/`
- **AND** SHALL 使用相对 POSIX 路径存储在 `evidenceFiles` 中

