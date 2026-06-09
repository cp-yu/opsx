## Why

当前 Phase 2 优化流程文档（`.claude/skills/openspec-apply-change/references/apply-phase2-optimization.md`）使用 git stash 作为 checkpoint 机制，存在致命缺陷：假设 stash 总是存在，但没有防御性检查。当 stash 被误操作（如 `git stash pop`）消耗后，`git reset --hard HEAD` + `git stash apply` 会导致数据丢失。

## What Changes

- 将 Phase 2 checkpoint 机制从 git stash 改为 git commit
- 移除所有 stash 相关操作和防御性检查逻辑
- 简化回滚流程为 `git reset --hard HEAD` + `git clean -fd`
- 保留所有 checkpoint commits 作为优化历史审计日志

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities

- `verify-optimization`: 修改 "Checkpoint 与回滚" requirement，从 git stash 改为 git commit
- `apply-verify-integration`: 修改 apply Phase 2 checkpoint 语义和 reference 生成契约，从 git stash 改为 git commit

## Impact

- 修改 `src/core/templates/workflows/apply-change.ts` 的 apply Phase 2 模板源
- 修改 `test/core/templates/apply-change.test.ts` 覆盖 commit checkpoint 生成契约
- 修改 `openspec/specs/verify-optimization/spec.md` 的 "Checkpoint 与回滚" requirement
- 修改 `openspec/specs/apply-verify-integration/spec.md` 的 apply Phase 2 checkpoint requirement
- 可能影响正在进行的 Phase 2 优化流程（需要清理现有 stash）
- Git history 将包含 `wip: opt-*` commits，但这些是有价值的审计日志
