## MODIFIED Requirements

### Requirement: 重试预算控制

系统 SHALL 使用单一的 `config.optimization.optRetries`（默认 2）控制 Phase 2 优化循环次数，不再使用独立的三类预算（formatRetries、matchRetries、behaviorRetries）。格式和匹配问题由 apply 主 agent 在补丁应用阶段直接处理。每次完整的提案+补丁+验证循环（无论成功或失败）消耗一次 optRetries 配额，达到上限后强制终止并进入 Phase 3。subagent 返回 NO_OPTIMIZATION_NEEDED 不构成一次循环，不消耗配额。

#### Scenario: 行为错误重试

- **WHEN** 优化导致 P1_SPECULATIVE_FENCE re-verify 失败
- **THEN** `behaviorRetryCounter` 递增
- **AND** 循环计数器递增（消耗一次 optRetries 配额）
- **AND** 如果循环计数器 < `config.optimization.optRetries`：生成全新策略的 Search/Replace 块
- **AND** 如果循环计数器 >= `config.optimization.optRetries`：进入 Degraded Pass

#### Scenario: 成功优化消耗配额

- **WHEN** 优化提案应用后 re-verify 返回 PASS
- **THEN** 循环计数器递增（消耗一次 optRetries 配额）
- **AND** 如果循环计数器 < `config.optimization.optRetries`：继续循环（可能发现新的优化机会）
- **AND** 如果循环计数器 >= `config.optimization.optRetries`：强制终止，以 IMPROVED 状态进入 Phase 3

#### Scenario: 格式和匹配问题不消耗重试预算

- **WHEN** Search/Replace 块因格式或语法问题无法应用
- **OR** Search/Replace 块匹配不唯一或找不到锚点
- **THEN** 主 agent SHALL 直接修复格式或匹配问题
- **AND** SHALL NOT 消耗 optRetries 预算
- **AND** SHALL NOT 要求 subagent optimizer 重新生成 Search/Replace 块

### Requirement: 优化结果持久化

系统 SHALL 将 Phase 2 结果写入 `.verify-result.json` 的 `optimization` 对象，并使终局状态与 checkpoint 生命周期一致。Phase 2 通过 CLI 双调用机制强制执行。系统 SHALL 在 `optimization` 对象中按需写入 `failedDirections: string[]`，记录已尝试但导致验证失败的优化策略。optRetries 消耗后，系统 SHALL NOT 在 `.verify-result.json` 中保留已超过 optRetries 的未完成重试状态。

#### Scenario: 优化失败时记录方向

- **WHEN** Phase 2 优化提案应用后 re-verify 返回 FAIL_NEEDS_REMEDIATION
- **THEN** 系统 SHALL 将优化策略的自然语言摘要追加到 `optimization.failedDirections[]`
- **AND** 摘要格式为自由文本，描述尝试的优化方向（如 "extract shared validation logic from auth.ts and user.ts"）

#### Scenario: 新优化提案避免重复方向

- **WHEN** subagent optimizer 在 Phase 2 后续循环或新会话中启动
- **THEN** SHALL 读取 `optimization.failedDirections[]`
- **AND** SHALL 避免提出与已记录方向相同或相似的优化策略
- **AND** 若所有可想到的策略均已失败，SHALL 返回 NO_OPTIMIZATION_NEEDED

#### Scenario: Degraded Pass 结果持久化

- **WHEN** Degraded Pass 终局恢复完成
- **THEN** `.verify-result.json` 中 `result` SHALL 为 `PASS_WITH_WARNINGS`
- **AND** `optimization.status` SHALL 为 `DEGRADED`
- **AND** `optimization.failedDirections[]` SHALL 保留所有已尝试的策略记录

### Requirement: Checkpoint 与回滚

系统 SHALL 在应用 Search/Replace 块之前创建 checkpoint，并使用区分“可继续重试”和“终局退出”的生命周期规则管理该 checkpoint。系统 SHALL 在优化重试次数耗尽后，丢弃当前轮的 speculative edits 并恢复到栈顶 checkpoint（最近一次成功状态），进入 Degraded Pass 终局状态。系统 SHALL NOT 在恢复失败时消费任何 checkpoint。

#### Scenario: 重试耗尽后安全回滚

- **WHEN** `behaviorRetryCounter >= config.optimization.optRetries`
- **THEN** 系统 SHALL 先丢弃当前轮 speculative edits：`git reset --hard HEAD` + `git clean -fd`
- **AND** SHALL 恢复到栈顶 checkpoint：`git stash apply stash@{0}`（最近一次成功状态，可能是 Phase 1 baseline 或某一轮优化后的状态）
- **AND** SHALL 在确认恢复成功后，按栈顺序 pop 所有 `apply-opt-checkpoint-*` 条目，消费全部 checkpoint
- **AND** SHALL 仅在 baseline 已确认恢复完成后才消费 stash 条目
- **AND** SHALL 输出 "Verify: Phase 1 PASS. N optimization attempts safely reverted."
- **AND** SHALL 输出简短总结：尝试了什么、为什么失败
