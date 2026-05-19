# apply-change-workflow Specification

## Purpose
此规约记录变更 fix-apply-instructions-verify-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: apply 模板处理中间验证状态

`openspec-apply-change` 技能模板 SHALL 对 `needs_verify` 和 `needs_seal` 状态提供正确的处理分支，无缝进入对应的验证阶段。

#### Scenario: needs_verify 状态进入 Phase 1

- **WHEN** `instructions apply --json` 返回 `state: 'needs_verify'`
- **THEN** 模板 SHALL 指示 agent 进入 Phase 1 验证流程（启动 reviewer subagent）
- **AND** 不打断用户或请求用户手动触发 verify

#### Scenario: needs_seal 状态进入 Phase 2/3

- **WHEN** `instructions apply --json` 返回 `state: 'needs_seal'`
- **THEN** 模板 SHALL 指示 agent 进入 Phase 2/3 流程（optimize + seal）
- **AND** 不打断用户或请求用户手动触发

#### Scenario: continue-change 模板不提前建议归档

- **WHEN** `openspec status --json` 返回 `isComplete: true`（artifact 全部创建完毕）
- **THEN** continue-change 模板 SHALL NOT 建议用户 "archive it"
- **AND** SHALL 建议用户进入 `/opsx:apply` 开始实现

#### Scenario: view Dashboard 分类标签不声称完成

- **WHEN** Dashboard 展示 task 全部完成的 change
- **THEN** 分类标签 SHALL 显示为 "Tasks Done" 而非 "Completed Changes"

