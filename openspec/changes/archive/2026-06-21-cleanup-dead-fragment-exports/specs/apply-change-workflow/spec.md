## MODIFIED Requirements

### Requirement: apply 模板处理中间验证状态

`openspec-apply-change` 技能模板 SHALL 对 `needs_verify` 和 `needs_seal` 状态提供正确的处理分支，无缝进入对应的验证阶段。

#### Scenario: [REMOVED: continue-change 模板已删除] 不提前建议归档

- **WHEN** `openspec status --json` 返回 `isComplete: true`（artifact 全部创建完毕）
- **THEN** [REMOVED: continue-change 模板已删除] SHALL NOT 建议用户 "archive it"
- **AND** SHALL 建议用户进入 `/opsx:apply` 开始实现
