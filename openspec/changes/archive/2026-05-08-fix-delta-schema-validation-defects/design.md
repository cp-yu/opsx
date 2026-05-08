## Context

当前 `src/utils/opsx-utils.ts` 中的 OPSX delta 系统有三个关联缺陷，均位于 Zod schema 定义和 `applyOpsxDelta` 函数中。变更范围仅限于 `opsx-utils.ts` 和 `sync.ts`，不涉及跨模块架构变更。

### 当前架构

```
readOpsxDelta()                    applyOpsxDelta()
     │                                    │
     ▼                                    ▼
OpsxDeltaSchema.safeParse()        全量替换 MODIFIED 节点
     │                                    │
     ├── ADDED: DeltaCollectionSchema     ├── ADDED: push (去重)
     ├── MODIFIED: DeltaCollectionSchema  ├── MODIFIED: next[i] = domain (全量替换)
     └── REMOVED: DeltaCollectionSchema   └── REMOVED: filter by id
```

三个 section 共用同一个 `DeltaCollectionSchema`，该 schema 要求所有节点字段完整（id + type + intent + ...）。

## Goals / Non-Goals

**Goals:**
- MODIFIED section apply 逻辑从全量替换改为 shallow merge
- MODIFIED/REMOVED section 使用独立的放宽 Zod schema
- `type: z.literal(...)` 缺失字段时的错误信息可诊断
- `openspec sync` 的 Zod 错误展示格式可读

**Non-Goals:**
- 不改变 ADDED section 的 schema 或 apply 行为
- 不改变 OPSX 三文件写入逻辑
- 不引入新的校验规则或验证门禁
- 不修改 `opsx-delta.yaml` 的 YAML 格式

## Decisions

### Decision 1: MODIFIED apply 改为 shallow merge

**方案**: `next.capabilities[index] = { ...next.capabilities[index], ...capability }`

**替代方案**:
- 保持全量替换 + 要求 schema 完整性 → 拒绝，CLAUDE.md 示例明确只有 `{id, intent}`，且全量替换语义不合理
- 深度合并 (deep merge) → 拒绝，过度设计。节点字段均为标量值，无嵌套对象需要深度合并

**选择理由**: shallow merge 简洁，语义正确——MODIFIED 只更新声明的字段，其余保持不变。与 CLAUDE.md 中 MODIFIED 示例 (`{id, intent}` 不含 type) 一致。

### Decision 2: 独立的 ModifiedDeltaCollectionSchema / RemovedDeltaCollectionSchema

**方案**:
```typescript
const ModifiedNodeSchema = z.object({
  id: NodeIdSchema,
  intent: z.string().optional(),
  status: z.enum(['draft', 'active']).optional(),
});

const RemovedNodeSchema = z.object({
  id: NodeIdSchema,
});
```

**替代方案**:
- 用 `z.partial()` + `z.pick()` → 拒绝，表达能力不如显式声明
- 在 `readOpsxDelta` 中做 preprocess → 拒绝，校验逻辑分散两处

**选择理由**: 显式声明字段最清晰。每个 section 的 schema 即文档——看 schema 就知道该 section 需要哪些字段。

### Decision 3: `type` 字段错误信息优化

**方案**: 对 BaseNodeSchema 的 `type` 字段使用 `z.string().refine()` 替代 `z.literal()`，但保持 node-specific extend schema 中使用 `z.literal()`。

实际上，更简洁的方式：在 `readOpsxDelta` 的 safeParse 失败后，对 error.issues 做一次遍历，将 `z.literal()` 且值为 `undefined` 的 issue 替换 message。

**替代方案**:
- 方案 A: `z.string().refine()` — 失去 literal 类型窄化和运行时精确校验
- 方案 B: preprocess 检查 — 校验逻辑分散
- 方案 C: Zod `errorMap` — Zod v3 支持有限

**最终选择**: 混合方案。对于 MODIFIED/REMOVED 的放宽 schema，`type` 字段根本不出现，因此此问题自然消失。对于 ADDED section，保留 `z.literal()` 因为字段缺失确实意味着 schema 不完整，只需改进错误信息的可读性——在 `readOpsxDelta` 的 throw 处对 `z.literal()` invalid_value 且 actual 为 undefined 的情况做 message 改写。

### Decision 4: 错误展示格式改进

**方案**: 在 `sync.ts` 的 catch 块中，检测 Zod 错误格式并做 pretty-print，而非直接 `JSON.stringify` dump。

具体实现：将 `readOpsxDelta` 抛出的错误 message 中的 Zod issues 格式化为逐条、带路径的易读格式。

## Risks / Trade-offs

- [Risk] shallow merge 可能意外保留应被清除的字段 → Mitigation: MODIFIED 明确设为 `undefined` 的字段在 merge 时被清除（`...spread` 的 undefined 覆盖语义）
- [Risk] 放宽 schema 后用户可能误写无效字段名到 MODIFIED → Mitigation: Zod 默认 strip unknown keys 的行为不变，未知字段被静默忽略。可后续加 `z.strict()` 但本次不做
- [Trade-off] 缺陷 1 修复限于 `readOpsxDelta` 层而非 Zod schema 层 → 选择理由: 避免影响其他使用 schema 的地方（类型推断、其他校验点）