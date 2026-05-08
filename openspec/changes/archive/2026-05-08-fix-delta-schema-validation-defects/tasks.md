## 1. applyOpsxDelta: MODIFIED 全量替换改为 shallow merge

- [x] 1.1 将 `src/utils/opsx-utils.ts` 中 MODIFIED domains 的 apply 逻辑从 `next.domains[index] = domain` 改为 `next.domains[index] = { ...next.domains[index], ...domain }`
- [x] 1.2 将 MODIFIED capabilities 的 apply 逻辑同样改为 shallow merge
- [x] 1.3 将 MODIFIED relations 的 apply 逻辑改为 shallow merge（仅更新 metadata 字段，from/to/type 通常不变）

## 2. Delta Schema: MODIFIED/REMOVED 使用独立的放宽 Schema

- [x] 2.1 定义 `ModifiedNodeSchema`（仅 `id` 必填 + `intent`/`status` 可选）和 `RemovedNodeSchema`（仅 `id` 必填）
- [x] 2.2 定义 `ModifiedDeltaCollectionSchema` 和 `RemovedDeltaCollectionSchema`
- [x] 2.3 将 `OpsxDeltaSchema` 更新为：ADDED 使用完整 `DeltaCollectionSchema`，MODIFIED 使用 `ModifiedDeltaCollectionSchema`，REMOVED 使用 `RemovedDeltaCollectionSchema`
- [x] 2.4 更新 `OpsxDelta` TypeScript type 以匹配新 schema（MODIFIED/REMOVED 的节点类型不同）

## 3. 错误信息: z.literal() 缺失字段的可诊断错误

- [x] 3.1 在 `readOpsxDelta` 中对 `safeParse` 失败后的 Zod issues 遍历处理：对 `code: "invalid_value"` 且 `values` 为 literal 值且原始数据中对应路径的值为 `undefined` 的情况，将 message 替换为指示"字段缺失"的文本
- [x] 3.2 同样处理 `readProjectOpsxFile` 中可能产生同类误导错误的位置

## 4. Sync 命令错误展示格式

- [x] 4.1 在 `readOpsxDelta` 中将 Zod 校验错误格式化为逐条、带路径的可读字符串，替代 `result.error.message` 的直接 JSON dump
- [x] 4.2 确保错误信息包含出错的 section（ADDED/MODIFIED/REMOVED）、数组索引和字段路径

## 5. 测试

- [x] 5.1 更新或新增 `applyOpsxDelta` 的单元测试：覆盖 MODIFIED shallow merge 场景（仅写 intent、仅写 status、同时写多个字段、不存在的节点报错）
- [x] 5.2 更新或新增 Delta schema 校验测试：MODIFIED 不写 type 通过、REMOVED 仅 id 通过、ADDED 不写 type 失败
- [x] 5.3 更新或新增错误信息测试：确认 `z.literal()` 缺失字段时输出可诊断消息
- [x] 5.4 运行完整测试套件确保无回归：`pnpm test`