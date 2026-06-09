### Task 1: 更新 verify-optimization spec 的 Checkpoint 与回滚 requirement

**Goal**: 修改主 spec 中的 "Checkpoint 与回滚" requirement，从 git stash 改为 git commit。

**Files**:
- Modify: `openspec/changes/fix-phase2-checkpoint-protocol/specs/verify-optimization/spec.md`
- Modify: `openspec/changes/fix-phase2-checkpoint-protocol/specs/apply-verify-integration/spec.md`

**Requirements**:
- 将第 73 行的 `git stash apply stash@{0}` 改为使用 `git reset --hard HEAD` 恢复到最近一次 commit
- 移除第 74-75 行关于 stash pop 和消费 stash 条目的描述
- 添加 baseline checkpoint 和增量 checkpoint 的创建场景
- 添加优化完成后保留 commits 的场景

#### Checks

- [x] C1 验证 spec 使用 git commit 而非 git stash
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "创建 baseline checkpoint"
  - Evidence: `openspec/changes/fix-phase2-checkpoint-protocol/specs/verify-optimization/spec.md`
  - Expect: "Checkpoint 与回滚" requirement 不包含任何 `git stash` 命令

- [x] C2 验证 spec 描述了 baseline checkpoint 创建
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "创建 baseline checkpoint"
  - Evidence: `openspec/changes/fix-phase2-checkpoint-protocol/specs/verify-optimization/spec.md`
  - Expect: 包含 "创建 baseline checkpoint" scenario，描述 `git add -A && git commit -m "wip: opt-checkpoint-r0 (baseline)"`

- [x] C3 验证 spec 描述了增量 checkpoint 创建
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "创建增量 checkpoint"
  - Evidence: `openspec/changes/fix-phase2-checkpoint-protocol/specs/verify-optimization/spec.md`
  - Expect: 包含 "创建增量 checkpoint" scenario，描述 `git commit -m "wip: opt-r${N} (${description})"`

- [x] C4 验证 spec 描述了 commit 保留策略
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "优化完成后保留 commits"
  - Evidence: `openspec/changes/fix-phase2-checkpoint-protocol/specs/verify-optimization/spec.md`
  - Expect: 包含 "优化完成后保留 commits" scenario，说明不清理 commits

### Task 2: 更新 Phase 2 reference 文件使用 git commit checkpoint

**Goal**: 将 apply workflow 模板中的 `apply-phase2-optimization.md` 从 git stash 机制改为 git commit 机制，并通过 `openspec update` 同步生成 surface。

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `test/core/templates/apply-change.test.ts`

**Requirements**:
- 将 baseline checkpoint 创建从 `git stash push -u -m "apply-opt-checkpoint-r0"` 改为 `git add -A && git commit -m "wip: opt-checkpoint-r0 (baseline)"`
- 将增量 checkpoint 创建从 `git stash push -u -m "apply-opt-checkpoint-r<N>"` 改为 `git add -A && git commit -m "wip: opt-r${N} (${description})"`
- 将失败回滚从 `git reset --hard HEAD && git clean -fd && git stash apply stash@{0}` 改为 `git reset --hard HEAD && git clean -fd`
- 移除所有 stash 清理逻辑
- 更新 guardrail 说明 checkpoint 是 git commit

#### Checks

- [x] C5 验证 reference 文件使用 commit checkpoint
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "创建 baseline checkpoint"
  - Command: `npx vitest run test/core/templates/apply-change.test.ts`
  - Evidence: `src/core/templates/workflows/apply-change.ts`
  - Expect: 文件包含 `git add -A` 和 `git commit -m "wip: opt-checkpoint-r0 (baseline)"`，不包含 `git stash push`

- [x] C6 验证回滚不使用 stash
  - Verifies: `specs/verify-optimization/spec.md` / Requirement "Checkpoint 与回滚" / Scenario "重试耗尽后安全回滚"
  - Command: `npx vitest run test/core/templates/apply-change.test.ts`
  - Evidence: `src/core/templates/workflows/apply-change.ts`
  - Expect: 回滚步骤只包含 `git reset --hard HEAD` 和 `git clean -fd`，不包含 `git stash apply`

- [x] C7 验证模板源不再生成 stash checkpoint
  - Verifies: `specs/apply-verify-integration/spec.md` / Requirement "apply 作为编译步骤" / Scenario "Phase 2 reference 明确 commit checkpoint 命令"
  - Command: `npm run build && openspec update --force && npx vitest run test/core/templates/apply-change.test.ts`
  - Expect: 模板源和测试通过；生成器不再从源模板产生 stash checkpoint 命令
