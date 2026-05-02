## ADDED Requirements

### Requirement: apply 作为编译步骤

系统 SHALL 在 `/opsx:apply` 工作流中集成 Phase 1 一致性验证和 Phase 2 优化循环，使 apply 输出即验证过的制品。apply 的内部阶段依次为：Phase 0（实现任务）、Phase 1（一致性验证）、Phase 2（优化循环）、Phase 3（Seal 校验）。

#### Scenario: 实现完成后自动进入 Phase 1 验证

- **WHEN** 主 agent 完成所有 tasks.md 任务的实现
- **AND** 所有任务标记为 `[x]`
- **THEN** 系统 SHALL spawn clean-context reviewer subagent 执行 Phase 1 一致性验证
- **AND** Phase 1 SHALL 检查变更的完整性、正确性和一致性
- **AND** subagent SHALL 返回 verdict: PASS | PASS_WITH_WARNINGS | FAIL_NEEDS_REMEDIATION

#### Scenario: Phase 1 失败阻断 apply

- **WHEN** Phase 1 验证返回 FAIL_NEEDS_REMEDIATION
- **THEN** 系统 SHALL 将 CRITICAL issues 写回 tasks.md
- **AND** SHALL 在 tasks.md 中生成 `## Remediation` 分类修复项（`[code_fix]` / `[artifact_fix]`）
- **AND** SHALL 回到 Phase 0 要求主 agent 修复
- **AND** 这是一个失败的 apply，未完成编译

#### Scenario: Phase 1 通过后进入 Phase 2

- **WHEN** Phase 1 返回 PASS 或 PASS_WITH_WARNINGS
- **THEN** 系统 SHALL 持久化 `.verify-result.json`
- **AND** SHALL 进入 Phase 2 优化循环，除非 `--skip-optimization` flag 或 `optimization.enabled: false` 配置跳过

#### Scenario: Phase 2 优化循环

- **WHEN** Phase 2 启动
- **THEN** 系统 SHALL 创建 git stash checkpoint（`git stash push -u -m "apply-opt-checkpoint"`）
- **AND** SHALL 按以下循环执行：
  1. **优化提案（subagent optimizer）**: 读取代码 + specs + design + `failedDirections`，输出 Search/Replace 块。若无优化机会，返回 NO_OPTIMIZATION_NEEDED
  2. **应用补丁（主 agent）**: 解析并原子应用 Search/Replace 块到工作区
  3. **再验证 Phase 1（subagent reviewer）**: 在补丁后的代码上重新执行 Phase 1 一致性验证
- **AND** 若再验证 PASS — 接受补丁，继续循环（可能发现新的优化机会）
- **AND** 若再验证 FAIL — 执行 `git reset --hard HEAD` + `git clean -fd` + `git stash apply <checkpoint>` 回滚，递增 retryCounter
- **AND** 若 retryCounter >= `config.optimization.optRetries` → 回滚到最近 PASS 点，`optimization.status = DEGRADED`
- **AND** 若 retryCounter < `config.optimization.optRetries` → 记录失败方向，回到步骤 1 使用全新策略

#### Scenario: 优化循环终局状态

- **WHEN** 优化循环终止
- **THEN** 系统 SHALL 消费 git stash checkpoint（`git stash pop <checkpoint>` 或等价操作）
- **AND** `optimization.status` SHALL 为以下终局值之一：IMPROVED | DEGRADED | NOT_NEEDED | SKIPPED

#### Scenario: Phase 3 Seal 校验

- **WHEN** Phase 2 完成（或跳过）
- **THEN** 系统 SHALL 执行 `openspec verify seal <change-name>`
- **AND** SHALL 输出 "apply 完成 — 已验证 + 已优化" 或相应状态

### Requirement: 失败方向记录

系统 SHALL 在 `.verify-result.json` 中记录已尝试但失败的优化策略，供后续优化提案 subagent 读取以避免重复。

#### Scenario: 优化提案导致验证失败时记录方向

- **WHEN** Phase 2 优化提案应用后再验证 Phase 1 返回 FAIL
- **THEN** 系统 SHALL 在 `optimization.failedDirections[]` 中追加一条自然语言摘要
- **AND** 摘要 SHALL 描述尝试的优化策略（如 "简化 auth.ts 的条件分支逻辑"）

#### Scenario: 后续优化提案读取失败方向

- **WHEN** subagent optimizer 启动优化提案
- **THEN** SHALL 读取 `.verify-result.json` 中 `optimization.failedDirections[]`
- **AND** SHALL 避免提出与已记录方向相同或相似的优化策略

### Requirement: 主 agent 和 subagent 角色分工

系统 SHALL 在 apply 工作流中严格区分编码角色和判断角色。

#### Scenario: 主 agent 仅负责编码

- **WHEN** apply 工作流执行中
- **THEN** 主 agent SHALL 负责实现 tasks.md 任务
- **AND** SHALL 负责应用 subagent optimizer 产出的 Search/Replace 补丁
- **AND** SHALL NOT 自行做出完整性/正确性/一致性判断
- **AND** SHALL NOT 自行生成优化提案

#### Scenario: subagent reviewer 仅负责判断

- **WHEN** Phase 1 验证或优化后再验证执行中
- **THEN** 系统 SHALL spawn clean-context reviewer subagent
- **AND** subagent SHALL 基于 artifacts + git evidence + 代码文件给出 verdict
- **AND** subagent SHALL NOT 修改代码或 tasks.md
- **AND** 主 agent SHALL NOT 替代 subagent 的判断

#### Scenario: subagent optimizer 仅负责提案

- **WHEN** Phase 2 优化提案执行中
- **THEN** 系统 SHALL spawn clean-context optimizer subagent
- **AND** subagent SHALL 输出 Search/Replace 块建议
- **AND** subagent SHALL NOT 直接修改代码
- **AND** 主 agent SHALL 应用补丁而非 subagent

### Requirement: 配置驱动优化控制

系统 SHALL 通过 `openspec/config.yaml` 控制优化行为。

#### Scenario: optRetries 控制重试和循环上限

- **WHEN** `optimization.enabled` 为 true
- **AND** `optimization.optRetries` 设置为 N（默认 2）
- **THEN** Phase 2 优化失败时最多重试 N 次
- **AND** optRetries 同时充当优化循环的有效上限
- **AND** 成功的优化循环（PASS 后再发现新优化点）不消耗 optRetries

#### Scenario: --skip-optimization 跳过 Phase 2

- **WHEN** 用户执行 `/opsx:apply --skip-optimization`
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** `optimization.status` 记录为 `SKIPPED`
- **AND** Phase 1 的结果保持不变
- **AND** 直接进入 Phase 3 Seal
