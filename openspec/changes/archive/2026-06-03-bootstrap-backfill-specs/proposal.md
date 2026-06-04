<!-- propose-routing: Design Summary found in explore conversation. Proceeding with artifact generation. -->

## Why

Change 1 (spec-capability-awareness) 建立了 spec→cap frontmatter 映射基础设施，但现有 87 个 specs 全部无 frontmatter，registry 初期近乎空转。需要批量补全机制，使 registry 立即产生实际价值。

## What Changes

- 新增 Backfill Engine，通过命名匹配自动为 specs 生成 frontmatter
- 新增 `openspec bootstrap backfill-specs` CLI 子命令
- 增强 bootstrap skill 指令，promote 后自动调用 backfill，对命名匹配无法覆盖的 specs 启动 subagent 语义匹配
- Promote 流程末尾集成 Backfill Engine 调用

## Capabilities

### New Capabilities
- `bootstrap-backfill-specs`: Backfill Engine——命名匹配算法 + frontmatter 写入 + 结构化报告输出

### Modified Capabilities
- `bootstrap`: promote 流程末尾集成 backfill 调用；bootstrap skill 指令新增 subagent 语义匹配步骤

## Impact

- **新文件**: `src/core/backfill-specs.ts`
- **修改文件**: `src/commands/bootstrap.ts`、`src/core/templates/workflows/bootstrap-opsx.ts`、`src/utils/bootstrap-utils.ts`
- **测试文件**: 新增 backfill engine 单元测试和集成测试，扩展 promote 测试
- **依赖**: 依赖 change 1 的 `spec-frontmatter.ts` 和 `spec-registry.ts`
- **无新外部依赖**
