## Context

当前 OPSX 工作流是线性管道：`apply → (optional) verify → archive`。`apply` 标记任务完成是 LLM 自报，`verify` 只读不写，`archive` 只做软警告。这导致 spec-code 偏移无法被系统性纠正。

核心约束：`core` 模式只有 `propose/explore/apply/archive` 四个 workflow，无独立 `verify`。`expanded` 模式有完整 11 个 workflow 包含 `verify`。

## Goals / Non-Goals

**Goals:**
- verify 能回写 tasks.md（unmark + remediation），将线性管道改造为收敛闭环
- archive 根据 profile 模式执行不同的验证策略
- 共享验证规则，避免 core/expanded 两套逻辑语义漂移

**Non-Goals:**
- 不引入新的独立 workflow（不新增 modeMembership 条目）
- 不做 sub-task 级别的 unmark（当前 `parseTasksFile` 只支持 task 级 checkbox）
- 不做运行时测试验证（仅静态代码搜索 + spec 匹配）

## Decisions

**D1: 共享验证逻辑通过 prompt fragment 实现**

在 `src/core/templates/fragments/opsx-fragments.ts` 中新增 `CONFORMANCE_CHECK_RULES` fragment。verify-change.ts 和 archive-change.ts 都引用此 fragment，确保检查规则一致。

备选方案：在 `src/core/validation/` 中新增程序化验证器。拒绝原因：当前 verify 是 prompt-driven 的 skill（LLM 执行检查），不是程序化验证。保持同一层面的抽象。

**D2: core 模式在 archive Step 3 之后插入 inline conformance check**

复用 sync 的先例——core 模式已经在 archive 中内联了 sync 逻辑（`archive-change.ts:61`）。同样模式：core 内联 conformance check，expanded 依赖独立 verify。

archive-change.ts 的 Step 3（task completion check）之后、Step 4（delta sync）之前，插入 Step 3.5：
- 读取 delta specs，对每个 requirement 搜索代码实现
- CRITICAL 不一致 → unmark task + 追加 remediation + 阻断 archive
- WARNING → 仅报告，不阻断

**D3: expanded 模式 archive 检查 verify stamp，不重做验证**

archive 读取 `.verify-result.json`，检查：
1. 文件存在性 → 不存在则 soft-prompt（建议先 verify，但允许跳过）
2. result 字段 → `FAIL_NEEDS_REMEDIATION` 则 hard-block
3. tasksFileHash → 与当前 tasks.md 不匹配则视为 stale，soft-prompt

**D4: write-back 仅对 CRITICAL 级别执行**

verify 本身也是 LLM 驱动的概率性判断。错误 unmark 比不 unmark 更糟。只对高置信度的 CRITICAL（requirement 完全缺失实现）自动回写，WARNING（实现偏离但存在）仅报告。

**D5: remediation 区分 code_fix 和 artifact_fix**

不是所有不一致都是"代码没写好"。有时是 spec/design 描述过时。remediation 清单标注类型，让后续 apply 迭代知道该改代码还是改 artifact。

**D6: apply 读取 verify 诊断信息闭合反馈回路**

apply 的 Step 4（读取上下文）增加：检测 `openspec/changes/<name>/.verify-result.json`。如果存在且 result 为 `FAIL_NEEDS_REMEDIATION`，读取 issues 数组并在 Step 5 展示摘要。Step 6 实现循环中，对被 unmark 的 task，将对应 verify issue 作为修复指导注入上下文。

这闭合了 `apply → verify → apply` 的信息回路。没有这一步，apply 只看到 `[ ]` 但不知道为什么被 unmark，会重复同样的错误。

apply 同时识别 tasks.md 中的 `## Remediation` section，将 remediation 条目视为优先修复项，区分 `[code_fix]`（改代码）和 `[artifact_fix]`（改 spec/design）。

## Risks / Trade-offs

- [verify 误判导致错误 unmark] → 仅 CRITICAL 级别自动回写；用户可手动恢复 `[x]`
- [core 模式 inline check 膨胀 archive prompt] → 通过 fragment 复用控制增量；inline check 仅在有 delta specs 时触发
- [.verify-result.json 被手动删除] → archive 视为"未验证"，soft-prompt 而非 hard-block
- [tasks.md 在 verify 后被手动编辑] → tasksFileHash 不匹配，verify 结果自动失效
