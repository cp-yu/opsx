## Context

当前 `src/core/templates/workflows/verify-change.ts` 同时承载了两类执行模型：一类是当前 agent 自己重读证据并完成 verify judgment，另一类是支持 clean-context subagent 的工具。Codex / Claude 目前只是通过很薄的 wrapper 注入 `CLEAN_CONTEXT_VERIFY_PROTOCOL_SUBAGENT` 片段，但主模板仍保留完整的 Phase 1 审查步骤，因此顶层 agent 依然拥有完整的 completeness / correctness / coherence judgment 权力。

`archive-change.ts` 的 archive-time full verify 更弱：它没有 Codex / Claude 的专用模板，只是在 Step 2.5 中笼统要求“follow the tool-appropriate clean-context protocol”。这让 standalone `verify` 与 archive rerun 在支持 subagent 的工具上并没有真正共享同一 execution model。

## Goals / Non-Goals

**Goals:**
- 将 `verify` 模板按 execution model 拆分为 `reread` 与 `subagent-orchestrated` 两类骨架
- 让 Codex / Claude 选择独立的 subagent verify skeleton，而不是继续复用当前通用主模板
- 让 subagent verify skeleton 变成 orchestration-only：顶层 agent 只负责输入收集、subagent 调度、write-back 应用、checkpoint 管理和持久化
- 让 archive-time full verify 在支持 subagent 的工具上复用同一 subagent orchestration contract
- 保持不支持 subagent 的工具继续使用 current-agent-reread contract

**Non-Goals:**
- 不引入 provenance attestation、agent trace 或 archive provenance gate
- 不新增独立 CLI 命令族
- 不改变 Phase 2 checkpoint 生命周期的既有语义，只改变 speculative re-verify 的 execution model
- 不修改不支持 clean-context subagent 的工具行为

## Decisions

### Decision 1: 按 execution model 分模板骨架，而不是按工具复制整份大模板

将 verify 主模板拆为两类：
- `verify-change-reread`：保留现有 current-agent-reread 骨架
- `verify-change-subagent`：新的 orchestration-only 骨架

Codex / Claude 的 wrapper 只负责选择 `verify-change-subagent`，而不是各自维护一份完整大模板。这样可以避免按工具复制逻辑，同时明确区分两种执行模型。

备选方案：继续在单一 `verify-change.ts` 中通过 fragment 开关表达 subagent 差异。拒绝原因：两类模型的顶层职责不同，单模板会持续泄漏主线程 judgment 语义。

### Decision 2: subagent verify 顶层模板删除 Phase 1 judgment 语义

`verify-change-subagent` 顶层只保留：
- change 选择
- schema / contextFiles 读取
- 显式 evidence bundle 收集
- reviewer / optimizer subagent orchestration
- write-back plan 应用
- checkpoint 状态机与 Search/Replace 应用
- 结果持久化与摘要输出

以下语义从顶层移出，改由 reviewer subagent 协议负责：
- completeness judgment
- correctness judgment
- coherence judgment
- speculative fence verdict

这样可以在结构上消除“主 agent 只是被提示最好别自己 verify”的漏洞。

### Decision 3: reviewer subagent 返回结构化 assessment，副作用仍由顶层执行

clean-context reviewer subagent 负责返回结构化 Phase 1 assessment，包括：
- result
- issues
- evidence citations
- write-back plan

顶层 agent 负责：
- 校验返回 payload shape
- 按 write-back plan 修改 `tasks.md`
- 计算 `tasksFileHash`
- 组装并持久化 canonical Phase 1 payload

这样可以保持 clean-context judgment 与工作树副作用分离，避免让 reviewer subagent 直接写仓库文件。

### Decision 4: speculative fence 在 subagent 模式下也复用 reviewer subagent

Phase 2 应用 candidate Search/Replace blocks 后，`P1_SPECULATIVE_FENCE` 不再允许顶层 agent 自己重跑 Phase 1 judgment。对支持 subagent 的工具，必须再次调用 clean-context reviewer subagent 获得 speculative verdict；对不支持 subagent 的工具，保留 current-agent-reread fence。

备选方案：只有 canonical Phase 1 用 reviewer，speculative fence 由主线程执行。拒绝原因：这会把最脆弱的 PASS/FAIL gate 又交还给主线程，破坏 execution model 分离。

### Decision 5: archive-time full verify 复用 verify skeleton，不再自带另一套 review 语义

`archive` 不新增独立的 review 骨架。缺失或 stale verify result 触发的 full verify rerun，直接复用与 `/opsx:verify` 相同的 execution-model-specific contract：
- subagent-capable tool -> `verify-change-subagent`
- reread tool -> `verify-change-reread`

这样可以避免 archive 与 standalone verify 在后续演进中再次漂移。

### Decision 6: 模板选择使用显式 lookup

模板选择逻辑继续放在现有 tool-specific resolver 附近，但选择粒度从“某个工具的 wrapper”提升为“某个 execution model 的骨架”。实现上应使用显式 lookup，不引入字符串模式匹配，也不通过路径命名推断 subagent 能力。

## Risks / Trade-offs

- [模板模块数量增加] → 通过“execution model 骨架 + 工具薄 wrapper”控制重复，而不是为每个工具复制整份大模板
- [reviewer 协议与顶层 orchestration 漂移] → 将 reviewer / optimizer 协议提升为共享模块，并让 archive 直接复用 verify skeleton
- [subagent-capable tool 的失败路径更严格] → 明确 fail-closed 语义；reviewer 启动失败或 payload 无效时中止 verify，而不是偷偷降级
- [speculative fence 额外调用 reviewer 增加成本] → 接受这部分成本，以换取 execution model 一致性和更低的实现上下文污染

## Migration Plan

1. 新增 execution-model-specific verify skeleton 模块，并保留现有 reread 路径
2. 将 Codex / Claude 的 verify wrapper 改为选择新的 subagent skeleton
3. 调整 `archive` 对缺失或 stale verify result 的 rerun 逻辑，复用 verify skeleton 而不是保留 archive 内联 review 语义
4. 抽取 reviewer / optimizer 共享协议，供 standalone verify 与 archive rerun 共用
5. 更新模板选择测试、tool-specific 模板测试和 archive rerun 语义测试

## Open Questions

- 是否把“工具 -> execution model”映射提升为显式工具元数据，还是保留在 resolver helper 中由代码常量维护
- subagent skeleton 是否需要显式区分“reviewer payload 校验失败”和“reviewer 执行失败”的用户提示文本
