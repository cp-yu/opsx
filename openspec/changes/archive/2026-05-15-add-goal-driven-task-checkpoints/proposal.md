## Why

`tasks.md` 目前只要求 checkbox 和“可验证”，但不会明确要求 Agent 把模糊工作转成可执行的验证目标。结果是复杂变更可能生成 `Fix bug`、`Add validation` 这类空泛任务，后续 apply/verify 只能事后补救。

## What Changes

- 增强 spec-driven `tasks` artifact 指令：生成 `tasks.md` 时要求分离 `Actions` 和 `Checks` 两段。
- `Actions` 记录要执行的实现动作，`Checks` 记录 goal-driven 产生的可执行验证项，并通过 `Covers` 关联 action。
- 为常见模糊任务给出转换规则：校验对应非法输入 check，bugfix 对应复现/回归 check，重构对应前后等价 check。
- 在 `$openspec-propose` 的 post-propose warning validation 中加入程序化 `tasks.md` 结构校验，检查 `Actions` / `Checks`、ID、`Covers` 引用和必需字段。
- 保持确定性 CLI 校验边界不变：`openspec validate`、OPSX dry-run、模板结构检查仍负责机器可判定问题，不新增阻断式语义 gate。

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-artifact-workflow`: spec-driven `tasks` 指令将要求 `Actions` / `Checks` 分段，checks 使用 checkbox 表示验证执行状态，并保留 trivial 任务豁免。
- `opsx-propose-skill`: post-propose warning validation 将增加程序化 Actions/Checks 结构校验，但保持 warning-only 和单轮修复语义。

## Impact

- `schemas/spec-driven/schema.yaml`
- `src/core/templates/workflows/propose.ts`
- `src/core/templates/fragments/opsx-fragments.ts`
- `test/core/artifact-graph/instruction-loader.test.ts` 或相关 workflow template 测试
- 生成的 AI skill/command artifacts 需要通过既有 update/generation 路径刷新
