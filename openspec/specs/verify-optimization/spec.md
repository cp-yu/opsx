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

系统 SHALL 在应用 Search/Replace 块之前创建 checkpoint，失败时自动回滚。

#### Scenario: git stash 创建 checkpoint

- **WHEN** 主 agent 准备应用 Search/Replace 块
- **THEN** 系统 SHALL 执行 `git stash push -u -m "verify-phase2-checkpoint"`
- **AND** 在 apply 前记录当前栈顶 hash 用于精准恢复
- **AND** SHALL 立即将 Phase 1 canonical baseline 恢复回工作区，同时保留该 stash 作为恢复点
- **AND** 在进程退出时输出 checkpoint 恢复信息

#### Scenario: Apply 成功且 re-verify 通过

- **WHEN** Search/Replace 块应用成功
- **AND** P1_SPECULATIVE_FENCE re-verify 返回 PASS
- **THEN** 系统 SHALL 执行 `git stash drop` 确认 checkpoint
- **AND** `optimization.status` 记录为 `IMPROVED`

#### Scenario: Apply 成功但 re-verify 失败

- **WHEN** Search/Replace 块应用成功
- **AND** P1_SPECULATIVE_FENCE re-verify 返回 FAIL
- **THEN** 系统 SHALL 丢弃 speculative edits
- **AND** SHALL 从 checkpoint 恢复完整的 Phase 1 canonical baseline
- **AND** `behaviorRetryCounter` 递增
- **AND** 如果 `behaviorRetryCounter >= 3`：进入 Degraded Pass

#### Scenario: Degraded Pass 输出

- **WHEN** `behaviorRetryCounter >= 3`
- **THEN** 系统 SHALL 输出 "Verify: Phase 1 PASS. 3 optimization attempts safely reverted."
- **AND** 输出简短总结：尝试了什么、为什么失败
- **AND** `.verify-result.json` 中 `result` 为 `PASS_WITH_WARNINGS`，`optimization.status` 为 `DEGRADED`

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

系统 SHALL 将 Phase 2 结果写入 `.verify-result.json` 的 `optimization` 对象。

#### Scenario: optimization 字段写入

- **WHEN** Phase 2 完成（无论成功或失败）
- **THEN** 系统 SHALL 在 `.verify-result.json` 写入 `optimization` 对象
- **AND** `optimization` 包含：`status`、`score`、`attempts` 数组、`baseline` 引用、`final` 结果
- **AND** 顶层 `result` 保持 `PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION` 不变

#### Scenario: optimization.status 取值

- **WHEN** Phase 2 正常完成
- **THEN** `optimization.status` SHALL 为以下值之一：`SKIPPED`、`NOT_NEEDED`、`IMPROVED`、`DEGRADED`、`ABORTED_UNSAFE`

#### Scenario: 跨平台路径处理

- **WHEN** 写入 `optimization` 对象中的文件路径
- **THEN** 系统 SHALL 使用 `path.join()` 构建所有路径
- **AND** SHALL NOT 硬编码路径分隔符
