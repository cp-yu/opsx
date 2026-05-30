## Context

Apply 当前由 workflow template 驱动，master agent 负责任务拆解和协调，implementer subagent 机械执行 `.apply-steps`，reviewer/optimizer subagent 负责验证与优化判断。已有 `apply.defaultIsolation` 可以配置分支隔离默认策略，问题集中在 prompt contract 对失败路径的处理过早转为用户 pause。

## Goals / Non-Goals

**Goals:**
- apply 默认持续运行，普通失败先由 master 修复 step file、artifact 或实现方向。
- 同一 task 的同一 normalized error signature 经 master remediation 后连续失败 2 次才 pause。
- `verify seal` 失败进入同一 recovery loop。
- `apply.defaultIsolation` 继续作为分支隔离的唯一配置入口。
- implementer 输出足够稳定，master 可以判断错误是否重复。

**Non-Goals:**
- 不新增 CLI runtime 状态机或持久化数据库。
- 不新增 `apply` 配置字段。
- 不改变 reviewer / optimizer 的判断职责。
- 不允许 apply 自动扩大需求范围；需求范围变化仍应停止并回到 explore/propose。

## Decisions

1. 使用 prompt-level recovery protocol，而不是新增 runtime engine。
   - 原因：apply 行为当前由模板执行，新增 runtime 状态机会把 prompt 修正扩大成架构重写。
   - 替代方案：CLI 维护 task attempt ledger。放弃，因为当前没有真正的 apply executor。

2. error signature 由 master 归一化，不比较完整错误文本。
   - 归一化字段为 `task + cycle + step + command + failure kind`。
   - 原因：LLM 或测试输出可能改变措辞，全文比较会误判。

3. 任务超过 5 个 TDD cycles 时自动拆为多个 step file 或 bounded batches。
   - 原因：复杂度是拆解问题，不是用户决策问题。
   - 约束：每个 step file/batch 仍保持 1-5 cycles，避免 implementer 输入过大。

4. `BLOCKED` / `NEEDS_CONTEXT` 是 coordinator feedback。
   - master 应读取 implementer 的 cycle、step、command、failure kind 和 error summary，修正后重试。
   - 只有同一错误连续重复时才用户可见 pause。

5. seal failure 进入同一 recovery loop。
   - 原因：seal failure 是最终诊断，不应特殊地把 apply 立刻交还给用户。
   - master 将 seal 诊断映射回 remediation task，再按同一规则重试。

## Risks / Trade-offs

- [Risk] normalized error signature 不稳定 → Mitigation：implementer 输出结构化字段，master 使用字段组合而不是自然语言全文。
- [Risk] apply 自动修 artifact 掩盖 proposal 缺陷 → Mitigation：只允许修执行细节、测试命令、step file 和明确 `[artifact_fix]`；需求范围变化仍 pause。
- [Risk] 两次同错规则多消耗一次执行时间 → Mitigation：第二次失败提供稳定证据，pause 信息更有价值。
- [Risk] prompt-only protocol 不能被 CLI 强制执行 → Mitigation：用 template tests 锁住 contract；不伪装成 runtime guarantee。

## Migration Plan

1. 更新 apply 和 implementer template 文案。
2. 更新 4 个 delta specs。
3. 更新 template tests。
4. 运行 `openspec validate "make-apply-continuous-recovery" --type change --json`。
5. 运行相关 template tests。

Rollback 策略：恢复模板文本和 specs delta，本变更不涉及数据迁移。

## Open Questions

无。`verify seal` 失败已确认进入同一 recovery loop。
