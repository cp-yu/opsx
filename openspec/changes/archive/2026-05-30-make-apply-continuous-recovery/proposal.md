<!-- propose-routing: Design Summary found; inputLength=0; detailScore=5/5; multiSubsystem=false; decision=proceed-with-design-summary -->
## Why

`/opsx:apply` 现在在任务拆解、implementer 阻塞、设计疑问和 seal 失败等路径上过早 pause，导致 apply 不像可持续运行的编译步骤。需要把普通失败改成 master-led recovery，只在系统证明同一问题无法自行推进时才暂停。

## What Changes

- 将 apply 模板改为默认连续执行：普通 `BLOCKED`、`NEEDS_CONTEXT`、任务拆解过大和 seal failure 都进入 recovery loop。
- 将暂停条件收敛为：同一 task 的同一 normalized error signature 经 master remediation 后连续失败 2 次。
- 明确 implementer 的阻塞输出是给 master 的结构化反馈，不是用户可见 pause 触发器。
- 保留 `apply.defaultIsolation` 的现有配置语义：`ask | branch | worktree | none`，不新增配置字段。
- 更新 specs 和 template tests，防止 workflow prompt 回退到“遇 blocker 即 pause”。

## Capabilities

### New Capabilities

### Modified Capabilities
- `apply-task-decomposition`: 任务超过 5 个 TDD cycles 时自动拆分继续执行，而不是暂停建议拆分。
- `apply-implementer-subagent`: `BLOCKED` / `NEEDS_CONTEXT` 输出变为 master recovery 输入，并包含稳定错误签名字段。
- `apply-branch-isolation`: main/master 分支只在 `apply.defaultIsolation: ask` 时询问；配置为 `branch`、`worktree` 或 `none` 时直接执行对应策略。
- `apply-verify-integration`: Phase 1 / Phase 3 失败写回 remediation 后进入同一 recovery loop，而不是立刻 pause。

## Impact

- `src/core/templates/workflows/apply-change.ts`
- `src/core/templates/workflows/implementer.ts`
- `test/core/templates/apply-change.test.ts`
- `test/core/templates/implementer-template.test.ts`
- `openspec/specs/apply-task-decomposition/spec.md`
- `openspec/specs/apply-implementer-subagent/spec.md`
- `openspec/specs/apply-branch-isolation/spec.md`
- `openspec/specs/apply-verify-integration/spec.md`
