## MODIFIED Requirements

### Requirement: Checkpoint 与回滚

系统 SHALL 在应用 Search/Replace 块之前创建 checkpoint，并使用区分"可继续重试"和"终局退出"的生命周期规则管理该 checkpoint。系统 SHALL 使用 git commit 而非 git stash 作为 checkpoint 机制。系统 SHALL 在优化重试次数耗尽后，丢弃当前轮的 speculative edits 并恢复到最近一次 commit（最近一次成功状态），进入 Degraded Pass 终局状态。

#### Scenario: 创建 baseline checkpoint

- **WHEN** Phase 1 验证通过，准备进入 Phase 2
- **THEN** 系统 SHALL 执行 `git add -A && git commit -m "wip: opt-checkpoint-r0 (baseline)"`

#### Scenario: 创建增量 checkpoint

- **WHEN** 优化轮次验证通过
- **THEN** 系统 SHALL 执行 `git add -A && git commit -m "wip: opt-r${N} (${description})"` 其中 N 是轮次编号

#### Scenario: 重试耗尽后安全回滚

- **WHEN** `behaviorRetryCounter >= config.optimization.optRetries`
- **THEN** 系统 SHALL 先丢弃当前轮 speculative edits：`git reset --hard HEAD` + `git clean -fd`
- **AND** 工作区 SHALL 恢复到最近一次 commit 的状态（Phase 1 baseline 或某一轮优化后的状态）
- **AND** SHALL 输出 "Verify: Phase 1 PASS. N optimization attempts safely reverted."
- **AND** SHALL 输出简短总结：尝试了什么、为什么失败

#### Scenario: 优化完成后保留 commits

- **WHEN** 所有优化轮次完成（预算耗尽或用户停止）
- **THEN** 系统 SHALL NOT 执行任何 commit 清理操作
- **AND** 所有 `wip: opt-*` commits SHALL 保留在 git history 中
