## Why

Archive 当前做两件事：校验 sync 状态 **+** 主动写入 main spec。后者是职责越界——archive 的语义是"归档 change 目录"，不该修改 main spec。这条副作用路径导致 sync bug 通过 `--no-verify` 传染 archive、用户不可预期 main spec 被修改、逻辑耦合增加维护成本。需要将写入职责归还给 `openspec sync`。

## What Changes

- 删除 archive-time sync 写入路径（`prepareChangeSync` + `applyPreparedChangeSync`），archive 不再主动修改 main spec 或 OPSX 文件
- sync 检查从 verify gate 中解耦为独立 `runSyncGate`，与 verify gate 完全正交
- 新增 `--no-sync` flag 控制是否跳过 sync gate，`--no-verify` 不再隐含跳过 sync 检查
- 移除 `--skip-specs` flag（其控制的行为代码已不存在）
- 将 `execute()` 平铺逻辑重构为 4 个独立 gate 方法的 pipeline：`runVerifyGate → runSyncGate → runValidationGate → runTaskGate → moveToArchive`
- 清理 `archive.ts` 中不再需要的 import（`prepareChangeSync`, `applyPreparedChangeSync`）
- 更新 archive-change workflow 模板文字，移除 "archive-time sync writes" 相关描述

## Capabilities

### New Capabilities
<!-- 本次未引入全新 capability -->

### Modified Capabilities
- `cap.cli.archive`：**BREAKING** — archive 不再执行同步写入；`--skip-specs` flag 替换为 `--no-sync`；sync 检查独立于 verify gate
- `cap.change.archive`：archive 行为变更——职责回归纯归档，同步合并由 `openspec sync` 独立完成

## Impact

- `src/core/archive.ts`：重构 `execute()` 为 pipeline，删除 archive-time sync 代码块
- `src/cli/index.ts`：`--skip-specs` → `--no-sync` 选项
- `test/core/archive.test.ts`：删除 6 个有关 archive-time sync 的测试，新增 5 个 sync gate 测试
- `src/core/templates/workflows/archive-change.ts`：更新模板文本
- `src/core/change-sync.ts`：不受影响（`prepareChangeSync` / `applyPreparedChangeSync` 仍被 sync 命令独立使用）
