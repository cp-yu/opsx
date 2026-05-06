## Context

当前 OPSX 工作流将 `apply`（实现任务）和 `verify`（验证+优化）分离为两个独立命令。apply 完成后不保证代码质量，用户必须手动运行 verify 确认正确性。verify 的 Phase 1（一致性检查）和 Phase 2（最优性检验+优化）通过独立的 agent session 执行。

在 OPSX 语义中，apply 对应"编译"步骤——编译应该要么成功产出验证过的制品，要么失败并报告错误。当前分离违背了这一语义。

## Goals / Non-Goals

**Goals:**
- 将 verify Phase 1 + Phase 2 集成到 apply 命令中，apply 输出即验证过的制品
- Phase 1 验证和 Phase 2 优化提案均由 subagent 执行，主 agent 仅负责编码
- Phase 2 优化循环简化为：提案（subagent）→ 应用补丁（主 agent）→ 再验证 Phase 1（subagent）
- 重试预算统一为 `config.optimization.optRetries`（默认 2），同时作为循环上限
- 失败方向记录到 `.verify-result.json`，避免跨会话重复尝试
- `--skip-optimization` flag 和 `optimization.enabled` 配置继续有效

**Non-Goals:**
- 不修改 `openspec verify` CLI 的对外接口（保留为底层工具）
- 不移除 `/opsx:verify` skill（保留为 expanded 模式的逃生舱），但允许更新其模板指引以复用共享 verify gate 片段
- 不修改 sync/archive 的程序化 verify gate 入口语义（它们继续使用 `openspec verify status`）；archive 模板可增加 `PENDING_VERIFICATION` 恢复指引
- 不支持无 subagent 能力的工具（收缩设计，仅考虑 Claude Code/Codex 等有 subagent 的环境）

## Decisions

### Decision 1: apply 作为三阶段编译步骤

apply 模板重构为 Phase 0（实现）+ Phase 1（验证）+ Phase 2（优化）+ Phase 3（Seal）。实现失败即 apply 失败，不会有"实现完成但未验证"的中间态。

**替代方案**：保持 apply 和 verify 分离，仅在 apply 完成后自动触发 verify。被拒绝原因：语义不够干净，apply 在触发 verify 之前仍然有一个"不确定"的中间态。

### Decision 2: 主 agent 编码，subagent 判断

```
主 agent          → 写代码（实现任务 + 应用 Search/Replace 补丁）
subagent reviewer → 判对错（Phase 1 验证 + 优化后再验证）
subagent optimizer → 出主意（Phase 2 优化提案，只提案不动代码）
```

这避免了上下文膨胀——主 agent 不需要在实现上下文之外再加载完整的验证上下文。subagent 以 clean context 执行，判断更独立客观。

### Decision 3: Phase 2 简化为单一重试预算

当前 Phase 2 有三套独立重试预算（formatRetries=2, matchRetries=2, behaviorRetries=3）。在集成到 apply 后，由于 Search/Replace 补丁由主 agent 解析和应用，格式和匹配问题由主 agent 直接处理，不消耗配额。

optRetries 同时约束失败重试次数和优化循环总数——每次提案+补丁+验证循环消耗一次 optRetries 配额，无论成功或失败。达到上限后强制终止并以当前状态进入 Phase 3。subagent 返回 NO_OPTIMIZATION_NEEDED 不算一次循环，不消耗配额。

### Decision 3a: Phase 2 stash 栈式 checkpoint

Phase 2 使用 git stash 栈管理多层 checkpoint，而非单一 checkpoint。

**checkpoint 生命周期**：

```
Phase 2 启动:
  git stash push -u -m "apply-opt-checkpoint-r0" → stash@{0} = Phase 1 baseline

每轮 PASS 后（counter < optRetries，继续循环）:
  git stash push -u -m "apply-opt-checkpoint-r<N>" → 新栈顶 = 当前优化后状态
  旧 checkpoint 保留在栈中，不消费

每轮 FAIL 后:
  git reset --hard HEAD && git clean -fd
  git stash apply stash@{0} → 恢复到最近成功状态（栈顶 checkpoint）
  stash@{0} 仍在，当前轮次回滚不消费 checkpoint

Phase 2 终端（counter >= optRetries 或 NO_OPTIMIZATION_NEEDED）:
  按栈顺序 pop 所有 apply-opt-checkpoint-* 条目，消费全部 checkpoint
  终端状态 IMPROVED | DEGRADED | NOT_NEEDED
```

**关键点**：
- `git stash apply`（非 pop）用于失败回滚 — 保留 checkpoint 供后续使用
- 终端消费用 `git stash pop` — 恢复 + 清理一步完成
- 每轮 PASS 后推新 checkpoint 确保下一轮失败只回滚到最近成功状态，不丢失之前的优化成果
- `git stash list | grep "apply-opt-checkpoint"` 验证 checkpoint 完整性
- checkpoint 创建或恢复失败 → `ABORTED_UNSAFE`，保留已有 stash 条目等待手动恢复

### Decision 4: 失败方向记录为自然语言摘要

`.verify-result.json` 的 `optimization` 对象新增 `failedDirections: string[]` 字段。每次优化提案导致验证失败时，追加一条自然语言摘要（如"简化 auth.ts 的条件分支逻辑"）。opt subagent 在下一次提案前读取，避免重复已失败的策略。

### Decision 5: config.optimization.optRetries 配置项

```yaml
optimization:
  enabled: true     # 现有字段，保持不变
  optRetries: 2     # 新增字段，默认 2
```

## Risks / Trade-offs

- **apply session 变长**：Phase 0+1+2+3 在单次 agent session 中完成，对大变更可能耗时较长。缓解：subagent 承担验证和优化提案工作，主 agent 上下文保持精简。
- **Phase 2 循环可能多次触发 subagent**：每次循环都需要 spawn reviewer subagent 进行再验证。缓解：optRetries=2 限制最大循环次数（无论成功或失败），成功的循环自然终止于 NO_OPTIMIZATION_NEEDED。
- **破坏性变更**：现有依赖独立 verify 步骤的工作流需要适配。缓解：`openspec verify` CLI 和 `/opsx:verify` skill 入口保留，用户仍可手动触发；模板内容同步共享 verify gate 指引，避免 apply/verify/archive 三套说明漂移。

### Decision 6: 共享 verify gate 指引片段

当前三个 skill 模板（apply-change、verify-change、archive-change）各自内联 verify CLI 调用指令，导致：
- JSON schema 格式碎片化散布在各模板中
- 状态机流转逻辑只在代码中定义，提示词中没有可视化
- archive 模板遇到 `PENDING_VERIFICATION` 时只说 STOP，没有恢复路径
- Agent 在 CLI 返回错误时没有指引，只能试错

**方案**：提取共享指引片段到 `opsx-fragments.ts`，包含三个组件：

1. `VERIFY_STATE_MACHINE_DIAGRAM`：ASCII 状态机流程图，展示 Phase 1 → Phase 2 optimization → Phase 2 verification → 终态的完整流转
2. `VERIFY_CLI_JSON_SCHEMA_REFERENCE`：Markdown 表格，列出 phase1/phase2 所有 CLI 调用及其 `--input` JSON 格式
3. `VERIFY_ERROR_RECOVERY_GUIDE`：决策树文本，指导 Agent 在 CLI 返回各类错误时如何恢复

**替代方案**：在每个模板中各自补充指引。被拒绝原因：三处维护成本高，且 archive verify gate 独有的 PENDING_VERIFICATION 恢复路径容易遗漏。

### Decision 6a: 保持 opsx-fragments.ts 单文件

4 个新增的 verify gate 指引片段（状态机图、JSON schema 速查表、错误恢复决策树、简单变更快速路径）直接追加到现有 `src/core/templates/fragments/opsx-fragments.ts`，不拆分文件。

**理由**：
- 拆分后总数为 17 exports / ~500 lines，在单一文件中完全可管理
- 消费者导入模式无交叉：verify/archive 模板用 verify 片段，其余 6 个模板用 OPSX 通用片段。拆分后 archive-change.ts 需从两个源导入，反而增加复杂度
- 4 个新片段与现有 `VERIFY_FRESHNESS_RULES`、`VERIFY_WRITEBACK_RULES` 语义上同属"模板提示词片段"，放在同一文件符合内聚原则

**拆分信号（未来参考）**：当文件超过 20 exports 或 600 lines，且存在明确的领域边界时再拆。

### Decision 7: Archive 模板 PENDING_VERIFICATION 恢复路径

当 `openspec verify status` 报告 `optimization.status = PENDING_VERIFICATION` 时，archive 模板当前只说 STOP。新增恢复指引：

```
PENDING_VERIFICATION 且无 affectedFileHashes
  → Phase 1 刚完成，需要 Phase 2
  → 执行优化分析，若无优化空间:
    openspec verify phase2 "<name>" --type=optimization --input '{"status":"NO_OPTIMIZATION_NEEDED"}' --json
  → status 变为 NOT_NEEDED，archive 门禁通过

PENDING_VERIFICATION 且有 affectedFileHashes
  → 优化已提案，等待验证
  → 先完成验证:
    openspec verify phase2 "<name>" --type=verification --input '{"result":"PASS","issues":[]}' --json
  → status 变为 IMPROVED 或 DEGRADED，archive 门禁通过
```

## Open Questions

- Phase 2 优化循环是否需要一个硬性的 maxOptCycles 上限？→ **已决策**: 不复用独立上限。`optRetries` 同时约束失败重试次数和优化循环总数——每次提案+补丁+验证循环（无论成功或失败）消耗一次配额，达到上限后强制终止并以当前状态进入 Phase 3。NO_OPTIMIZATION_NEEDED 不算循环，不消耗配额。
