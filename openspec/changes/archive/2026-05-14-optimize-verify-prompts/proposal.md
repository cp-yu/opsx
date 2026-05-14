## Why

OpenSpec verify 的 Phase 1 和 Phase 2 提示词缺乏清晰的编排者角色定义、阶段模式标签、明确的 subagent delegation 指令和超时处理规则。借鉴 CCG 命令文件的"协调者 + 模式标签 + 明确委派 + 等待规则"编排模式，以最小改动提升 verify 提示词的 agent 执行纪律。

## What Changes

- **Phase 1 提示词增加角色定义**: `buildVerifyIntro` 开头显式声明 coordinator 角色和 reviewer/optimizer/CLI 职责边界
- **Phase 1/Phase 2 增加模式标签**: 关键步骤添加 `[模式：准备]` / `[模式：证据]` / `[模式：委派审查]` / `[模式：验证]` / `[模式：写回]` / `[模式：Checkpoint]` / `[模式：优化]` / `[模式：推测验证]` / `[模式：Seal]` 等标签
- **Subagent 调用指令明确化**: 将抽象描述 "Spawn a clean-context reviewer/optimizer subagent" 改为明确要求调用 clean-context subagent、invoke `openspec-reviewer` / `openspec-optimizer` skill，并传入完整 evidence/input bundle；不写任何工具专属 API 语法
- **超时/等待规则**: 新增 `VERIFY_SUBAGENT_TIMEOUT_RULES` fragment，明确等待完整 subagent payload、轮询、禁止未经用户确认终止等规则；不绑定 `Agent({...})` / `TaskOutput({...})` 等 CLI 或工具表面方法
- **Phase 2 checkpoint 状态机分块**: 将密集的 checkpoint 状态描述从连续段落改为表格 + 模式标签的结构化呈现
- **所有提示词文本保持英文** — 不改变现有模板语言

## Capabilities

### New Capabilities

- `verify-prompt-orchestration`: Verification prompt patterns that enforce coordinator role discipline, phased mode labels, explicit subagent delegation instructions, and timeout/waiting rules across the verify workflow

### Modified Capabilities

- `ai-workflow-templates`: Verify-change template prompts restructured with coordinator role, mode labels, explicit subagent delegation instructions, and checkpoint state machine block formatting
- `openspec-reviewer-skill`: Reviewer subagent skill prompt gains timeout handling and explicit input contract expectations
- `openspec-optimizer-skill`: Optimizer subagent skill prompt gains timeout handling and explicit input contract expectations

## Impact

- `src/core/templates/workflows/verify-change.ts` — 字符串级 prompt 明确化 + Phase 2 文本分块重构
- `src/core/templates/fragments/opsx-fragments.ts` — 新增 `VERIFY_COORDINATOR_ROLE` 和 `VERIFY_SUBAGENT_TIMEOUT_RULES` fragment
- 不修改 verify CLI 交互逻辑或 JSON schema
- 不影响 archive-change、apply-change 等下游消费者
