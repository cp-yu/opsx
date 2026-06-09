## Context

当前 Phase 2 优化流程使用 git stash 作为 checkpoint 机制。该方案在 2026-06-07 的 `split-apply-phase2-protocol` 变更中引入，目的是将完整的 Phase 2 协议从主 skill 文件提取到独立的 reference 文件中。

然而，git stash 方案存在致命缺陷：
1. **假设 stash 存在但不验证** - 文档直接执行 `git stash apply stash@{0}`，没有检查 stash 是否存在
2. **Stash 语义复杂** - `pop`/`apply`/`drop` 易混淆，`pop` 会消耗 stash
3. **回滚目标不明确** - `git reset --hard HEAD` 在 stash 消耗后会回到错误的状态

## Goals / Non-Goals

**Goals:**
- 使用 git commit 替代 git stash 作为 checkpoint 机制
- 简化回滚流程，移除 stash 存在性检查
- 保留完整优化历史作为审计日志

**Non-Goals:**
- 不改变 Phase 2 的整体流程结构
- 不改变 `openspec verify phase2` 的接口
- 不涉及 Phase 1 或 Phase 3 的 checkpoint 机制

## Decisions

### Decision 1: 使用 git commit 作为 checkpoint

使用 `git add -A && git commit -m "wip: opt-*"` 创建 checkpoint。

**理由:** Commit 持久存在，回滚语义清晰，不需要防御性检查。

**备选方案:**
- **Stash + 防御检查** - 拒绝，增加复杂度
- **Worktree isolation** - 拒绝，开销大
- **Temp branch** - 拒绝，增加分支管理复杂度

### Decision 2: 保留所有 checkpoint commits

Phase 2 完成后不删除或 squash checkpoint commits。

**理由:** 每个 commit 代表独立优化，有审计价值，便于回溯学习。

### Decision 3: Commit message 格式

使用 `wip: opt-checkpoint-r0 (baseline)` 和 `wip: opt-r${N} (${description})` 格式。

**理由:** `wip:` 前缀标识工作中的 commits，描述提供上下文。

### Decision 4: 回滚使用 git reset --hard HEAD + git clean -fd

失败时执行 `git reset --hard HEAD && git clean -fd`。

**理由:** reset 恢复已跟踪文件，clean 删除未跟踪文件，确保工作区完全干净。

## Risks / Trade-offs

**[Risk] Git history 包含多个 wip commits**
→ **Mitigation**: 明确说明这些是审计日志。用户可自行 squash。

**[Risk] git clean -fd 可能删除用户手动创建的文件**
→ **Mitigation**: Phase 2 是自动化流程，用户不应手动介入。

**[Trade-off] Commit 历史可见 vs Stash 隐藏**
→ **选择**: Commit 历史可见，优先安全性和可追溯性。

## Migration Plan

1. 更新 apply workflow 模板源和模板测试
2. 通过 `openspec update --force` 从模板源刷新 managed surface
3. 同步 `verify-optimization` 与 `apply-verify-integration` delta specs
4. 验证流程
5. Rollback 策略：恢复模板源和 delta specs
