## MODIFIED Requirements

### Requirement: apply 作为编译步骤

系统 SHALL 在 `/opsx:apply` 工作流中集成 Phase 1 一致性验证和 Phase 2 优化循环，使 apply 输出即验证过的制品。apply 的内部阶段依次为：Phase 0（实现任务）、Phase 1（一致性验证）、Phase 2（优化循环）、Phase 3（Seal 校验）。

Phase 2 优化循环中，主 agent MUST 在 patch 应用之前调用 `phase2 --type=optimization` 记录 `affectedFileHashes`，确保 `hashFiles()` 采样的是 pre-patch 磁盘状态。每轮优化循环的严格时序为：

1. 接收 optimizer subagent 输出的 Search/Replace blocks
2. 调用 `openspec verify phase2 --type=optimization --files "..."` 记录 pre-patch hash
3. 应用 Search/Replace blocks 到磁盘
4. Spawn reviewer subagent 执行 speculative Phase 1 再验证
5. 根据验证结果调用 `phase2 --type=verification`

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
- **THEN** 系统 SHALL 创建初始 git stash checkpoint（`git stash push -u -m "apply-opt-checkpoint-r0"`），保存 Phase 1 baseline
- **AND** SHALL 按以下循环执行：
  1. **优化提案（subagent optimizer）**: 读取代码 + specs + design + `failedDirections`，输出 Search/Replace 块。若无优化机会，返回 NO_OPTIMIZATION_NEEDED
  2. **记录 optimization（主 agent）**: 调用 `phase2 --type=optimization --files "..."` 记录 pre-patch hash（此时磁盘 MUST 处于 pre-patch 状态）
  3. **应用补丁（主 agent）**: 解析并原子应用 Search/Replace 块到工作区
  4. **再验证 Phase 1（subagent reviewer）**: 在补丁后的代码上重新执行 Phase 1 一致性验证
- **AND** 若再验证 PASS — 接受补丁，递增 cycleCounter。若 cycleCounter < `config.optimization.optRetries`：执行 `git stash push -u -m "apply-opt-checkpoint-r<N>"` 将当前优化后状态推入栈顶作为新 checkpoint，旧 checkpoint 保留在栈中，然后继续循环（可能发现新的优化机会）。若 cycleCounter >= `config.optimization.optRetries`：强制终止并以 `optimization.status = IMPROVED` 进入 Phase 3
- **AND** 若再验证 FAIL — 执行 `git reset --hard HEAD` + `git clean -fd` + `git stash apply stash@{0}` 回滚到栈顶 checkpoint（最近成功状态），递增 cycleCounter，记录 `failedDirections`。checkpoint 不消费
- **AND** 若 cycleCounter >= `config.optimization.optRetries` → `optimization.status = DEGRADED`，进入 Phase 3
- **AND** 若 cycleCounter < `config.optimization.optRetries` → 回到步骤 1 使用全新策略

#### Scenario: optimization 记录在 patch 应用之前执行

- **WHEN** optimizer subagent 返回 Search/Replace blocks
- **THEN** 主 agent SHALL 先调用 `openspec verify phase2 <change-name> --type=optimization --files "<affected-files>" --input '{"status":"OPTIMIZATION_PROPOSED",...}'`
- **AND** 此时磁盘文件 SHALL 处于 pre-patch 状态（即 Phase 1 baseline 或上一轮成功优化后的状态）
- **AND** CLI 的 `hashFiles()` SHALL 采样到 pre-patch 文件内容的 SHA-256 hash
- **AND** 主 agent SHALL 在 CLI 调用成功后才应用 Search/Replace blocks

#### Scenario: verification 检测到 patch 已应用

- **WHEN** 主 agent 应用 Search/Replace blocks 后调用 `phase2 --type=verification`
- **AND** `affectedFileHashes` 记录的是 pre-patch hash
- **THEN** `findUnchangedOptimizationFiles()` SHALL 检测到当前磁盘 hash 与 `affectedFileHashes` 不同
- **AND** verification SHALL 不返回 `PATCH_NOT_APPLIED` 错误

#### Scenario: FAIL 回滚不残留错误状态

- **WHEN** reviewer 返回 FAIL 且系统执行 `git reset --hard` + `git clean -fd` + `git stash apply`
- **THEN** `.verify-result.json` SHALL 被恢复到 git stash 中保存的 Phase 1 状态
- **AND** 下一轮优化循环 SHALL 从干净的 Phase 1 baseline 开始

#### Scenario: 优化循环终局状态

- **WHEN** 优化循环终止
- **THEN** 系统 SHALL 按栈顺序 pop 所有 `apply-opt-checkpoint-*` 条目，消费全部 checkpoint
- **AND** `optimization.status` SHALL 为以下终局值之一：IMPROVED | DEGRADED | NOT_NEEDED | SKIPPED

#### Scenario: Phase 3 Seal 校验

- **WHEN** Phase 2 完成（或跳过）
- **THEN** 系统 SHALL 执行 `openspec verify seal <change-name>`
- **AND** SHALL 输出 "apply 完成 — 已验证 + 已优化" 或相应状态
