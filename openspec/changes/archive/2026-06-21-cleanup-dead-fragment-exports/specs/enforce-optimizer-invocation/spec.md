## MODIFIED Requirements

### Requirement: Prompt fragment 强制委托 optimizer subagent

`VERIFY_SIMPLE_CHANGE_FAST_PATH` 常量 SHALL 重写为强制委托语义，明确禁止 master agent 自行判断是否需要优化，要求始终 spawn optimizer subagent。

#### Scenario: 常量名保持不变

- **WHEN** 开发者修改 `src/core/templates/fragments/opsx-fragments.ts`
- **THEN** SHALL 保持常量名 `VERIFY_SIMPLE_CHANGE_FAST_PATH` 不变
- **AND** 现有引用点（`apply-change.ts` [REMOVED: `verify-change.ts`、`archive-change.ts` 不 import 此 fragment]）无需修改 import
