## MODIFIED Requirements

### Requirement: 语言一致性

verify 工作流中新增或修改的 prompt text SHALL 全部使用英文，与现有 template language 保持一致。

Mode label SHALL 使用英文格式 `[Mode: ...]`，例如 `[Mode: Evidence]`、`[Mode: Delegate Review]`。

Severity philosophy 表述 SHALL 从"prefer lower tier"改为"escalate when uncertain"，删除降级偏见的措辞。

#### Scenario: 删除"prefer lower tier"表述

- **WHEN** [REMOVED: verify-change.ts 已删除] 模板被渲染
- **THEN** SHALL NOT 包含 "when uncertain, prefer SUGGESTION over WARNING and WARNING over CRITICAL" 表述
- **AND** SHALL 替换为 "when uncertain, escalate to CRITICAL to enforce the 'clean slate' principle"
