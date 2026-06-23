# apply-verify-integration Specification

## Purpose
此规约记录变更 unify-apply-verify 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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
- **THEN** 系统 SHALL spawn clean-context reviewer subagent，指定 `context: "fresh"`
- **AND** subagent SHALL 基于 artifacts + git evidence + 代码文件给出 verdict
- **AND** subagent SHALL NOT 修改代码或 tasks.md
- **AND** 主 agent SHALL NOT 替代 subagent 的判断

#### Scenario: subagent optimizer 仅负责提案

- **WHEN** Phase 2 优化提案执行中
- **THEN** 系统 SHALL spawn clean-context optimizer subagent，指定 `context: "fresh"`
- **AND** subagent SHALL 输出 Search/Replace 块建议
- **AND** subagent SHALL NOT 直接修改代码
- **AND** 主 agent SHALL 应用补丁而非 subagent

### Requirement: 配置驱动优化控制

系统 SHALL 通过 `openspec/config.yaml` 控制优化行为。

#### Scenario: optRetries 控制重试和循环上限

- **WHEN** `optimization.enabled` 为 true
- **AND** `optimization.optRetries` 设置为 N（默认 2）
- **THEN** Phase 2 每次提案+补丁+验证循环（无论成功或失败）消耗一次 optRetries 配额
- **AND** optRetries 同时充当优化循环的有效上限
- **AND** subagent 返回 NO_OPTIMIZATION_NEEDED 不计入循环，不消耗配额

#### Scenario: --skip-optimization 跳过 Phase 2

- **WHEN** 用户执行 `/opsx:apply --skip-optimization`
- **THEN** 系统 SHALL 跳过 Phase 2
- **AND** `optimization.status` 记录为 `SKIPPED`
- **AND** Phase 1 的结果保持不变
- **AND** 直接进入 Phase 3 Seal

