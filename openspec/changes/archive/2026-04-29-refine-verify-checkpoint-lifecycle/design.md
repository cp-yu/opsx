## Context

`enhance-verify-with-optimization` 为 `/opsx:verify` 引入了 Phase 2 最优性检验，并用 `git stash push -u` 作为 checkpoint 保护带。这一方向本身没问题：它允许在存在 tracked 与 untracked 变更的情况下，把 Phase 1 canonical baseline 固定下来，再进行带回滚能力的优化尝试。

问题出在生命周期边界没有收紧。当前文档同时存在以下冲突：

- 某些失败分支先 `git stash drop`，随后又输出依赖同一 stash 的恢复指令
- `apply`、`drop`、`pop` 的职责边界没有被建模成状态机，导致“继续重试”和“终局退出”共用同一套叙述
- verify 把 `ABORTED_UNSAFE` 解释为“canonical judgment 仍保留”，archive 又在部分分支把它当作“仍可接受的结果”

这不是文案瑕疵，而是 contract 漏洞。只要状态机不闭环，任何实现都会在某个异常路径上变成“先销毁现场，再发现救援绳已经扔掉”。

## Goals / Non-Goals

**Goals:**
- 为 verify Phase 2 定义一个最小但自洽的 checkpoint 生命周期
- 明确 `git stash apply`、`git stash pop`、`git stash drop` 的职责边界
- 让 `.verify-result.json`、verify 输出与 archive 消费规则使用同一套终局语义
- 保持跨平台兼容，不引入 shell 或路径层面的平台分叉

**Non-Goals:**
- 不改变 Phase 1 canonical verification 的评分或 write-back 逻辑
- 不改变 Search/Replace block 的格式、匹配策略或预算数值
- 不新增 CLI 命令、持久化文件类型或额外 checkpoint 存储后端
- 不把该流程扩展为多 checkpoint、嵌套事务或通用恢复框架

## Decisions

### Decision 1: 用显式状态机建模 checkpoint 生命周期

**选择**: 把 checkpoint 生命周期压缩为四个状态：`CREATED`、`BASELINE_RESTORED_FOR_RETRY`、`TERMINAL_ACCEPTED`、`TERMINAL_RESTORED`。

**替代方案**: 继续使用“在每个分支里各写一段 Git 指令”的叙事方式。

**理由**: 现在的问题不是 Git 子命令不会用，而是没有先定义状态。只要先有状态机，实现和提示词都能围绕“checkpoint 是否仍然是恢复依赖”这个单一事实收敛；否则分支越多，语义越乱。

**状态转移**:
- `git stash push -u` 后进入 `CREATED`
- `git stash apply <checkpointRef>` 成功后进入 `BASELINE_RESTORED_FOR_RETRY`
- 优化被接受后执行 `git stash drop <checkpointRef>`，进入 `TERMINAL_ACCEPTED`
- 放弃优化并恢复 baseline 成功后执行 `git stash pop <checkpointRef>`，进入 `TERMINAL_RESTORED`

### Decision 2: `apply` 只用于中间恢复，`pop` 只用于终局恢复

**选择**:
- 中间回滚与继续重试路径使用 `git stash apply <checkpointRef>`
- 最终放弃优化并回到 baseline 的终局路径使用 `git stash pop <checkpointRef>`，或使用等价的“恢复成功后再 drop”序列

**替代方案**:
- 全部使用 `apply` + 手工 `drop`
- 全部使用 `pop`

**理由**: `apply` 的价值是“恢复但不消费 checkpoint”；`pop` 的价值是“恢复成功后顺手消费 checkpoint”。把两者混用到同一语义层，只会制造分支污染。中间重试阶段仍然依赖 checkpoint，不能用 `pop`；终局退出阶段不再需要 checkpoint，再手工 `apply` + `drop` 只是增加出错点。

### Decision 3: `ABORTED_UNSAFE` 表示恢复闭环失败，而不是“勉强通过”

**选择**: 将 `optimization.status = ABORTED_UNSAFE` 定义为“优化循环未能完成安全闭环”，其 canonical Phase 1 judgment 仍可用于诊断，但当前工作区结果不应被视为 archive-compatible。

**替代方案**: 继续允许 archive 在顶层 `result` 为 `PASS` 时复用 `ABORTED_UNSAFE` 结果。

**理由**: 顶层 `result` 只说明 Phase 1 某次判断通过，不说明当前磁盘状态仍然等于那次 judgment 所对应的 baseline。只要 checkpoint 恢复没闭环，就不能把 archive 建立在这份结果之上。

### Decision 4: 失败分支不得提前删除恢复依赖

**选择**: 任何仍需向用户输出手工恢复步骤的分支，都不得先执行 `git stash drop`。

**替代方案**: 在部分失败场景中先清理 stash，再提示用户按 hash 或 ref 恢复。

**理由**: 这是纯粹的工程卫生。恢复依赖还在，才有资格给恢复说明；恢复依赖已经删掉，再漂亮的提示词也只是撒谎。

### Decision 5: archive-time full verify 不是 Phase 1 简化版

**选择**: 当 archive 因 verify result 缺失或过期而重跑 full verify 时，只要 canonical Phase 1 结果达到 `PASS` / `PASS_WITH_WARNINGS` 且配置未禁用 optimization，就必须继续执行与 `/opsx:verify` 相同的 Phase 2 合同。

**替代方案**: 在 archive 中以“归档前不想引入 speculative edits”为理由，只做 Phase 1 判断，然后把 `optimization.status` 写成 `SKIPPED`。

**理由**: 这会把“same verify contract”偷换成“看起来差不多的 verify contract”。一旦允许 archive-time full verify 私自跳过可执行的 Phase 2，`SKIPPED` 就不再只表示显式禁用，而是混入执行者主观裁量，归档门禁也随之失真。

## Risks / Trade-offs

- `git stash pop` 在终局恢复时仍可能失败 → 失败时必须保留 stash entry，转入 `ABORTED_UNSAFE`，而不是再尝试“清理现场”
- archive 对 `ABORTED_UNSAFE` 改为不复用，可能让部分历史通过路径变严格 → 这是正确收紧，目的是避免在不可信工作区上归档
- archive-time full verify 被要求完整跑到 Phase 2，意味着归档前可能发生一次真实的 speculative optimization 循环 → 这是 verify 合同本来就承诺的副作用，不能在 archive 里偷偷删掉
- verify 模板、archive 模板、旧 prompt 文稿需要同时对齐 → 通过单一状态机与单一术语表减少漂移
- 仍然依赖 Git stash 这一机制 → 维持现有实现模型，避免引入新的快照存储复杂度

## Migration Plan

1. 先修改 `verify-optimization` 与 `archive-verify-gate` delta specs，固定规范语义。
2. 再收敛 `src/core/templates/workflows/verify-change.ts` 与 `archive-change.ts` 的主模板文案。
3. 最后修正历史 prompt 草稿中与主模板冲突的恢复分支描述，避免生成旧语义。
4. 为成功、单次回滚、终局放弃、恢复失败、Windows 环境提示增加覆盖。
5. 收紧 archive-time full verify 的 prompt wording，禁止把可执行的 Phase 2 降级成 `SKIPPED`。

## Open Questions

- 终局恢复是否统一要求优先展示 `git stash pop <checkpointRef>`，还是允许实现层根据冲突处理能力选择等价的 `apply` 成功后 `drop` 序列
- `ABORTED_UNSAFE` 在 CLI 输出中是否需要显式标记“not archive-compatible”，以减少用户误判
