## MODIFIED Requirements

### Requirement: apply 作为编译步骤

`openspec-apply-change` skill 的主 `SKILL.md` SHALL 将 Phase 2 详细协议放在 `references/apply-phase2-optimization.md`，并在主指令中要求 agent 在执行 Phase 2 前读取该 reference。该 reference SHALL 使用 git commit checkpoint 语义，明确 checkpoint 是 git commit，SHALL NOT 指示 agent 使用 `git stash` 或 `git tag apply-opt-checkpoint-*` 创建 checkpoint。

#### Scenario: Phase 2 优化循环

- **WHEN** Phase 2 启动
- **THEN** 系统 SHALL 创建初始 git commit checkpoint（`git add -A && git commit -m "wip: opt-checkpoint-r0 (baseline)"`），保存 Phase 1 baseline
- **AND** SHALL 按以下循环执行：
  1. **优化提案（subagent optimizer）**: 读取代码 + specs + design + `failedDirections`，输出 Search/Replace 块。若无优化机会，返回 NO_OPTIMIZATION_NEEDED
  2. **记录 optimization（主 agent）**: 调用 `phase2 --type=optimization --files "..."` 记录 pre-patch hash（此时磁盘 MUST 处于 pre-patch 状态）
  3. **应用补丁（主 agent）**: 解析并原子应用 Search/Replace 块到工作区
  4. **再验证 Phase 1（subagent reviewer）**: 在补丁后的代码上重新执行 Phase 1 一致性验证
- **AND** 若再验证 PASS — 接受补丁，递增 cycleCounter，执行 `git add -A && git commit -m "wip: opt-r${N} (${description})"` 将当前优化后状态保存为新 checkpoint。若 cycleCounter < `config.optimization.optRetries`：继续循环（可能发现新的优化机会）。若 cycleCounter >= `config.optimization.optRetries`：强制终止并以 `optimization.status = IMPROVED` 进入 Phase 3
- **AND** 若再验证 FAIL — 执行 `git reset --hard HEAD` + `git clean -fd` 回滚到最近一次 commit（最近成功状态），递增 cycleCounter，记录 `failedDirections`
- **AND** 若 cycleCounter >= `config.optimization.optRetries` → `optimization.status = DEGRADED`，进入 Phase 3
- **AND** 若 cycleCounter < `config.optimization.optRetries` → 回到步骤 1 使用全新策略

#### Scenario: Phase 2 reference 明确 commit checkpoint 命令

- **WHEN** 读取 `references/apply-phase2-optimization.md`
- **THEN** content SHALL 包含 `git add -A`
- **AND** content SHALL 包含 `git commit -m "wip: opt-checkpoint-r0 (baseline)"`
- **AND** content SHALL 包含 `git commit -m "wip: opt-r${N} (${description})"`
- **AND** content SHALL 包含 `git reset --hard HEAD`
- **AND** content SHALL 包含 `git clean -fd`
- **AND** content SHALL NOT 包含 `git stash push`
- **AND** content SHALL NOT 包含 `git stash apply`
- **AND** content SHALL NOT 包含 `git tag apply-opt-checkpoint`

#### Scenario: FAIL 回滚不残留错误状态

- **WHEN** reviewer 返回 FAIL 且系统执行 `git reset --hard` + `git clean -fd`
- **THEN** 工作区 SHALL 恢复到最近一次 checkpoint commit 保存的成功状态
- **AND** 下一轮优化循环 SHALL 从干净的最近成功状态开始

#### Scenario: 优化循环终局状态

- **WHEN** 优化循环终止
- **THEN** 系统 SHALL NOT 执行任何 checkpoint commit 清理操作
- **AND** 所有 `wip: opt-*` commits SHALL 保留在 git history 中
- **AND** `optimization.status` SHALL 为以下终局值之一：IMPROVED | DEGRADED | NOT_NEEDED | SKIPPED
