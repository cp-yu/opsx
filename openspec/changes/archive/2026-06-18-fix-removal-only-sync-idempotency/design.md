## Context

当前 sync/archive 共用 `change-sync` 路径。`getPendingChangeSync()` 与 `prepareChangeSync()` 在目标 spec 存在时依赖 `isDeltaSpecAlreadyApplied()` 判断 delta 是否已经合入。该函数能识别 ADDED/MODIFIED/RENAMED 的已应用状态，但 removal-only delta 在所有目标 headers 已缺失时仍返回 false，导致重复执行进入 REMOVED 应用分支并报错。

## Goals / Non-Goals

**Goals:**
- 将 removal-only delta 的幂等状态集中定义在 `isDeltaSpecAlreadyApplied()`。
- 保持首次应用删除 requirement 与空 spec 文件删除行为不变。
- 覆盖 standalone `openspec sync` 与 archive-time sync 两条入口。

**Non-Goals:**
- 不修改 delta Markdown 格式。
- 不改变 verify gate、validation 或 OPSX delta merge 语义。
- 不新增 CLI 参数或用户交互。

## Decisions

### Decision 1: 在判定层修复 removal-only 幂等性

选择修改 `isDeltaSpecAlreadyApplied()`：当 delta 只有 `REMOVED` entries，且每个目标 header 都已从当前主 spec 缺失时，返回 true。

理由：
- `getPendingChangeSync()` 和 `prepareChangeSync()` 已经共享该 guard，修复点集中。
- 该语义表达的是 delta 的目标状态，不是某个 CLI 入口的特殊行为。
- 保留 `buildUpdatedSpec()` 的严格错误：未被 guard 判定为已应用的 existing spec，缺失 REMOVED header 仍可作为冲突暴露。

备选方案：
- 在 `change-sync.ts` 两个调用点分别加 short-circuit。该方案可行，但会复制状态判定并削弱 guard 的职责。
- 在 `buildUpdatedSpec()` REMOVED 分支忽略缺失 header。该方案会吞掉真正的未同步冲突，风险更高。

### Decision 2: 空 spec 删除继续由写入计划决定

首次 sync 后若 rebuilt spec 中没有 requirement，继续由 `shouldDeleteRebuiltSpec()` 生成 delete action。重复执行时，如果目标文件已不存在，现有 removal-only skip 继续 no-op；如果目标文件仍存在但相关 headers 已缺失，新的已应用判定 no-op。

## Risks / Trade-offs

- [Risk] removal-only delta 与目标 spec 中无关 requirements 共存时被视为已应用，可能看起来不像“整个 spec 已同步”。→ Mitigation：判定仅针对 delta 声明的删除目标；无关 requirements 不属于该 delta 的行为面。
- [Risk] 过宽地忽略 REMOVED 缺失会掩盖冲突。→ Mitigation：只改 `isDeltaSpecAlreadyApplied()` 的已应用判断，不放宽 `buildUpdatedSpec()` 的 REMOVED 错误。
- [Risk] 跨平台路径行为受测试目录拼接影响。→ Mitigation：新增测试沿用 `path.join()` 创建 change/spec 路径，不硬编码平台分隔符。
