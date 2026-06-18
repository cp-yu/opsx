## Why

`openspec sync` 和 archive-time sync 在 removal-only delta 已经生效后仍会误判为 pending，重复执行会进入 REMOVED 应用分支并抛出 `REMOVED failed ... not found`。这破坏了 sync/archive 的幂等性，也会阻塞已经完成同步的 archive 流程。

## What Changes

- 将 removal-only delta 的已应用状态定义为：delta 中所有 `REMOVED` requirement header 都已从主 spec 缺失。
- 保持空 spec 删除行为不变：首次同步删除最后一个 requirement 后，主 spec 文件仍应被删除。
- 保持冲突检测不变：未同步状态下，仍存在的 `REMOVED` header 继续作为待处理删除；非幂等冲突仍由应用/验证路径报告。
- 补充 `openspec sync` 与 archive-time sync 的重复执行覆盖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cli-sync`: 明确 removal-only delta 在目标 requirements 已缺失时重复 sync 为 no-op。
- `cli-archive`: 明确 archive-time sync 在目标 spec 仍存在但 removal-only delta 的目标 headers 已缺失时为 no-op。
- `specs-sync-skill`: 明确共享 delta reconciliation 的 removal-only 幂等判定。

## Impact

- 代码：`src/core/specs-apply.ts` 的 `isDeltaSpecAlreadyApplied()` 判定；必要时检查 `src/core/change-sync.ts` 的共享 sync 路径。
- 测试：`test/commands/sync.test.ts` 与 `test/core/archive.test.ts` 增加回归用例。
- 无 CLI 参数、文件格式、依赖或用户可见命令语法变更。
