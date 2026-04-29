# verify-optimization Specification

## Purpose
此规约记录变更 enhance-verify-with-optimization 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 最优性检验执行

系统 SHALL 在 Phase 1 一致性检验通过后，自动进入 Phase 2 最优性检验，除非通过配置或 CLI flag 显式跳过。

#### Scenario: Phase 1 PASS 后自动进入 Phase 2

- **WHEN** Phase 1 返回 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `config.yaml` 中 `optimization.enabled` 为 `true`（默认）
- **AND** CLI 未传入 `--skip-optimization` flag
- **THEN** 系统 SHALL 启动 Phase 2 最优性检验
- **AND** 将当前工作区状态保存为 checkpoint

#### Scenario: --skip-optimization 跳过 Phase 2

- **WHEN** 用户执行 verify 时传入 `--skip-optimization` flag
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** `.verify-result.json` 中 `optimization.status` 记录为 `SKIPPED`
- **AND** 不影响 Phase 1 的 canonical 结果

#### Scenario: config.yaml 禁用优化

- **WHEN** `openspec/config.yaml` 中 `optimization.enabled` 为 `false`
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** 行为等同于 `--skip-optimization`

#### Scenario: Phase 1 副作用不会阻止 Phase 2

- **WHEN** Phase 1 已经写回 `tasks.md` 或 `.verify-result.json`
- **AND** 用户未传入 `--skip-optimization`
- **AND** `optimization.enabled` 不是 `false`
- **THEN** 系统 SHALL 继续进入 Phase 2
- **AND** SHALL NOT 因当前 worktree 非空而自动跳过 optimization

### Requirement: Search/Replace 块生成

系统 SHALL 由第二个 clean-context subagent 生成 Search/Replace 块，描述优化建议。

#### Scenario: Subagent 生成有效优化建议

- **WHEN** Phase 2 启动
- **THEN** 系统 SHALL spawn 第二个 clean-context subagent
- **AND** subagent 接收代码文件 + spec + design.md 作为输入
- **AND** subagent SHALL 输出 Search/Replace 块（非 unified diff）
- **AND** 每个 block 必须包含显式文件路径和 SEARCH/REPLACE 内容

#### Scenario: Subagent 未发现优化机会

- **WHEN** subagent 分析后认为代码质量已足够
- **THEN** 系统 SHALL 输出 "No optimization opportunities found"
- **AND** `.verify-result.json` 中 `optimization.status` 记录为 `NOT_NEEDED`

#### Scenario: Subagent 超时

- **WHEN** subagent 在指定时间内未返回结果
- **THEN** 系统 SHALL 终止 Phase 2
- **AND** `optimization.status` 记录为 `ABORTED_UNSAFE`
- **AND** 保留 Phase 1 canonical 结果

### Requirement: Checkpoint 与回滚

系统 SHALL 在应用 Search/Replace 块之前创建 checkpoint，并使用区分“可继续重试”和“终局退出”的生命周期规则管理该 checkpoint。

#### Scenario: git stash 创建 checkpoint

- **WHEN** 主 agent 准备应用 Search/Replace 块
- **THEN** 系统 SHALL 执行 `git stash push -u -m "verify-phase2-checkpoint"`
- **AND** SHALL 记录新建 stash 的显式引用与解析后的 hash 用于后续校验
- **AND** SHALL 立即使用 `git stash apply <checkpointRef>` 将 Phase 1 canonical baseline 恢复回工作区
- **AND** SHALL 在整个优化循环期间保留该 stash 作为唯一 checkpoint，直到进入终局结果

#### Scenario: Apply 成功且 re-verify 通过

- **WHEN** Search/Replace 块应用成功
- **AND** P1_SPECULATIVE_FENCE re-verify 返回 PASS 或 `PASS_WITH_WARNINGS`
- **THEN** 系统 SHALL 接受优化后的工作区状态作为最终结果
- **AND** SHALL 仅在确认不再需要恢复 baseline 后执行 `git stash drop <checkpointRef>`
- **AND** `optimization.status` 记录为 `IMPROVED`

#### Scenario: Apply 成功但 re-verify 失败

- **WHEN** Search/Replace 块应用成功
- **AND** P1_SPECULATIVE_FENCE re-verify 返回 FAIL
- **THEN** 系统 SHALL 丢弃 speculative edits
- **AND** SHALL 使用 `git reset --hard HEAD`、`git clean -fd`、`git stash apply <checkpointRef>` 恢复完整的 Phase 1 canonical baseline
- **AND** SHALL 保留该 checkpoint 以供后续重试继续使用
- **AND** `behaviorRetryCounter` 递增
- **AND** 如果 `behaviorRetryCounter >= 3`：进入 Degraded Pass

#### Scenario: Degraded Pass 终局恢复

- **WHEN** `behaviorRetryCounter >= 3`
- **THEN** 系统 SHALL 先丢弃 speculative edits 并恢复 Phase 1 canonical baseline
- **AND** SHALL 在终局恢复路径中消费 checkpoint：优先执行 `git stash pop <checkpointRef>`，或执行与之等价的“恢复成功后再 drop”序列
- **AND** SHALL 仅在 baseline 已确认恢复完成后删除 stash
- **AND** SHALL 输出 "Verify: Phase 1 PASS. 3 optimization attempts safely reverted."
- **AND** 输出简短总结：尝试了什么、为什么失败
- **AND** `.verify-result.json` 中 `result` 为 `PASS_WITH_WARNINGS`，`optimization.status` 为 `DEGRADED`

#### Scenario: 终局恢复失败

- **WHEN** 任一需要恢复 Phase 1 canonical baseline 的终局路径中，`git stash apply <checkpointRef>` 或 `git stash pop <checkpointRef>` 失败
- **THEN** 系统 SHALL 保留原始 stash entry，不得提前执行 `git stash drop`
- **AND** SHALL 将 `optimization.status` 记录为 `ABORTED_UNSAFE`
- **AND** SHALL 输出需要用户执行的恢复步骤
- **AND** SHALL 明确提示当前 `.verify-result.json` 的 canonical Phase 1 judgment 仍可用于诊断，但当前工作区不应被视为已安全恢复

### Requirement: 重试预算控制

系统 SHALL 使用三类独立预算控制重试次数，防止无限循环。

#### Scenario: 格式错误重试

- **WHEN** Search/Replace 块因格式/语法错误无法应用
- **THEN** `formatRetryCounter` 递增
- **AND** 如果 `formatRetryCounter < 2`：subagent 重新生成 Search/Replace 块（修正格式）
- **AND** 如果 `formatRetryCounter >= 2`：停止 Phase 2 并输出建议

#### Scenario: 匹配错误重试

- **WHEN** Search/Replace 块匹配不唯一或找不到锚点
- **THEN** `matchRetryCounter` 递增
- **AND** 如果 `matchRetryCounter < 2`：subagent 重新生成 Search/Replace 块（增加上下文锚点）
- **AND** 如果 `matchRetryCounter >= 2`：停止 Phase 2 并输出建议

#### Scenario: 行为错误重试

- **WHEN** 优化导致 P1_SPECULATIVE_FENCE re-verify 失败
- **THEN** `behaviorRetryCounter` 递增
- **AND** 如果 `behaviorRetryCounter < 3`：subagent 生成全新策略的 Search/Replace 块
- **AND** 如果 `behaviorRetryCounter >= 3`：进入 Degraded Pass

### Requirement: 优化结果持久化

系统 SHALL 将 Phase 2 结果写入 `.verify-result.json` 的 `optimization` 对象，并使终局状态与 checkpoint 生命周期一致。

#### Scenario: optimization 字段写入

- **WHEN** Phase 2 完成（无论成功或失败）
- **THEN** 系统 SHALL 在 `.verify-result.json` 写入 `optimization` 对象
- **AND** `optimization` 包含：`status`、`score`、`attempts` 数组、`baseline` 引用、`final` 结果
- **AND** 顶层 `result` 保持 `PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION` 不变

#### Scenario: optimization.status 取值

- **WHEN** Phase 2 正常完成
- **THEN** `optimization.status` SHALL 为以下值之一：`SKIPPED`、`NOT_NEEDED`、`IMPROVED`、`DEGRADED`、`ABORTED_UNSAFE`

#### Scenario: ABORTED_UNSAFE 表示恢复未闭环

- **WHEN** `optimization.status` 为 `ABORTED_UNSAFE`
- **THEN** 系统 SHALL 将其解释为“优化循环未能完成安全闭环”
- **AND** SHALL NOT 声称 checkpoint 已清理完成，除非系统已经验证工作区恢复成功
- **AND** SHALL 输出与实际 stash 生命周期一致的恢复说明

#### Scenario: 跨平台路径处理

- **WHEN** 写入 `optimization` 对象中的文件路径
- **THEN** 系统 SHALL 使用 `path.join()` 构建所有路径
- **AND** SHALL NOT 硬编码路径分隔符

#### Scenario: Windows 环境的恢复说明

- **WHEN** 系统在 Windows、Linux 或 macOS 上输出 checkpoint 恢复提示
- **THEN** 系统 SHALL 仅输出跨平台一致的 Git 命令序列与仓库相对文件路径
- **AND** SHALL NOT 依赖平台特定的路径分隔符或 shell 路径拼接习惯

### Requirement: Speculative re-verify respects verify execution model

系统 SHALL 在 Phase 2 应用 candidate Search/Replace blocks 后，按 verify execution model 执行 `P1_SPECULATIVE_FENCE`，而不是统一回落到主 agent judgment。

#### Scenario: subagent-capable 工具通过 reviewer subagent 执行 speculative fence

- **WHEN** 当前 AI 工具支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 SHALL spawn a clean-context reviewer subagent to execute speculative Phase 1 checks
- **AND** 顶层 agent SHALL NOT 自己决定 speculative `PASS`、`PASS_WITH_WARNINGS` 或 `FAIL_NEEDS_REMEDIATION`
- **AND** behavior retry budget SHALL 消费 reviewer subagent 返回的 speculative verdict

#### Scenario: reread 工具保留 current-agent speculative fence

- **WHEN** 当前 AI 工具不支持 clean-context subagent verify
- **AND** Phase 2 已应用 candidate Search/Replace blocks，准备执行 `P1_SPECULATIVE_FENCE`
- **THEN** 系统 MAY 在当前 agent 中执行 explicit reread-based speculative verification
- **AND** SHALL 保持现有 format / match / behavior retry budget 语义

