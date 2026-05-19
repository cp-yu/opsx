# artifact-workflow-status Specification

## Purpose
此规约记录变更 fix-apply-instructions-verify-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: list --json 输出包含 verify 状态

`openspec list --json` 命令的输出 SHALL 为每个 change 包含 `verifyStatus` 字段，指示其 verify 结果的新鲜度。

#### Scenario: verify 结果存在且新鲜

- **WHEN** change 目录中存在 `.verify-result.json`
- **AND** `checkFreshness` 返回 `FRESH`
- **THEN** JSON 输出中该 change 的 `verifyStatus` SHALL 为 `'FRESH'`

#### Scenario: verify 结果存在但过时

- **WHEN** change 目录中存在 `.verify-result.json`
- **AND** `checkFreshness` 返回 `STALE`
- **THEN** JSON 输出中该 change 的 `verifyStatus` SHALL 为 `'STALE'`

#### Scenario: verify 结果不存在

- **WHEN** change 目录中不存在 `.verify-result.json`
- **THEN** JSON 输出中该 change 的 `verifyStatus` SHALL 为 `'MISSING'`

#### Scenario: 原 status 字段不变

- **WHEN** `openspec list --json` 执行
- **THEN** 输出的 `status` 字段 SHALL 保持与原有逻辑一致（基于 task count）

