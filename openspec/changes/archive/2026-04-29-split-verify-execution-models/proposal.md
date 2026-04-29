## Why

当前 `verify` 对 Codex / Claude 的所谓“特化”只是在通用 `verify-change.ts` 前面插入 subagent protocol 片段，主模板仍然保留完整的 completeness / correctness / coherence 判断流程。这让支持 subagent 的工具在结构上仍允许当前 agent 自行完成 verify，只是被提示“先用 reviewer subagent”，无法真正隔离实现上下文对判断的污染。

`archive` 的 archive-time full verify 更弱：它没有 Codex / Claude 专用模板，只在通用模板里笼统要求“follow the tool-appropriate clean-context protocol”。结果是 `verify` 与 `archive` 声称复用同一合同，但实际没有共享同一套 subagent orchestration 骨架。

## What Changes

- 将 `verify` 模板按执行模型拆分为两类：`current-agent-reread` 与 `subagent-orchestrated`，而不是继续共用同一份主模板后只替换 protocol fragment
- 对支持 clean-context subagent 的工具（至少 Codex / Claude），改为使用独立的 `verify-change-subagent` 骨架：顶层 agent 只负责 orchestration，不再持有 Phase 1 审查语义
- 将 reviewer / optimizer 协议从“前置提示片段”提升为真正的子流程合同：Phase 1 judgment、speculative re-verify judgment 都由 reviewer subagent 执行
- 收紧 archive-time full verify：当工具支持 subagent 时，缺失或 stale 的 verify result 必须复用同一 subagent orchestration 合同，而不是在 archive 模板内保留通用的主线程 verify 语义
- 调整模板选择逻辑，让工具特化按 execution model 选择模板骨架，而不是只注入不同字符串片段
- 补充模板与选择逻辑测试，确保 subagent-capable 工具不再落回 reread-style 主模板

## Capabilities

### New Capabilities
- `verify-execution-model-selection`: 为 verify / archive 模板引入按 execution model 分型的选择语义，使 subagent-capable 工具使用独立 orchestration 模板骨架

### Modified Capabilities
- `opsx-verify-skill`: 支持 subagent 的工具必须使用 orchestration-only verify 模板，顶层 agent 不再直接执行 completeness / correctness / coherence judgment
- `opsx-archive-skill`: archive-time full verify 在支持 subagent 的工具上必须复用与 `/opsx:verify` 相同的 orchestration 合同
- `verify-optimization`: speculative re-verify 在 subagent 模式下必须继续由 reviewer subagent 执行，不能回落到主 agent judgment
- `archive-verify-gate`: 缺失或 stale verify result 时，archive 对支持 subagent 的工具必须重走同一 subagent verify orchestration

## Impact

- 受影响代码主要位于 `src/core/templates/workflows/verify-change.ts`、`src/core/templates/workflows/archive-change.ts`、`src/core/templates/workflows/.codex/verify-change.ts`、`src/core/templates/workflows/.claude/verify-change.ts`、`src/core/shared/skill-generation.ts`
- 可能新增 execution-model 专用模板模块与共享 reviewer / optimizer orchestration 片段
- 受影响规范位于 `openspec/specs/opsx-verify-skill/`、`openspec/specs/opsx-archive-skill/`、`openspec/specs/verify-optimization/`、`openspec/specs/archive-verify-gate/`
- 需要更新模板相关测试，特别是 tool-specific verify/archive 选择与 subagent-only contract 覆盖
