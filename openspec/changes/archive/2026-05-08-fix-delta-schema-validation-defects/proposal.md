## Why

OPSX delta 校验和合并逻辑存在三个关联缺陷：`z.literal()` 对缺失字段产生误导性错误信息、ADDED/MODIFIED/REMOVED 共用同一完整 NodeSchema 导致语义不匹配、以及 `applyOpsxDelta` 对 MODIFIED 做全量替换而非浅合并。用户在写出符合 CLAUDE.md 示例的 MODIFIED delta（不含 `type` 字段）时会遭遇无法诊断的校验失败。

## What Changes

- **缺陷 1 修复**: 对 `type: z.literal(...)` 缺失字段时的错误信息进行优化，明确指示"字段缺失"而非"值不匹配"
- **缺陷 2 修复**: 为 MODIFIED 和 REMOVED section 引入独立的放宽 Schema，MODIFIED 仅校验 `id` + 可变字段，REMOVED 仅校验 `id`
- **缺陷 3 修复**: `applyOpsxDelta` 的 MODIFIED 逻辑从全量替换改为 shallow merge（仅更新 delta 中声明的字段）
- 附带修复: 改进 `openspec sync` 的 Zod 错误展示格式，提升终端可读性

## Capabilities

### New Capabilities
<!-- 纯修复性变更，无新能力 -->

### Modified Capabilities
- `opsx-delta-merge`: MODIFIED section 的 apply 行为从全量替换变为 shallow merge；delta schema 对 MODIFIED/REMOVED 的校验约束放宽

## Impact

- **Affected code**: `src/utils/opsx-utils.ts` (Zod schemas + `applyOpsxDelta`), `src/commands/sync.ts` (error display), `src/core/change-sync.ts` (pass-through, no logic change needed)
- **Affected tests**: `opsx-utils` 相关测试需更新以覆盖 shallow merge 和新 schema 行为
- **Breaking changes**: 无 — 现有 ADDED section 不受影响；MODIFIED section 中原本被迫填写的 `type` 字段变为可选（向后兼容）