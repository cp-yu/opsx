## Why

Phase 2 优化循环存在系统性缺陷：master agent 可以越权自行判断 `NO_OPTIMIZATION_NEEDED` 并跳过 optimizer subagent。实际测试中几乎所有 change 都被跳过优化，即使 Phase 1 返回了多个 WARNING。根因是 `VERIFY_SIMPLE_CHANGE_FAST_PATH` prompt fragment 给予了 master agent 自主判断权，且 CLI 无条件接受该 status，缺乏机械约束。

## What Changes

- 重写 `VERIFY_SIMPLE_CHANGE_FAST_PATH` prompt fragment，移除 master agent 的自主判断权，强制要求始终 spawn optimizer subagent
- CLI `handleOptimization()` 增加 runtime enforcement：`NO_OPTIMIZATION_NEEDED` 必须携带非空 `summary` 字段作为 subagent 实际被调用的证据
- 更新 apply 编排文本，明确 master agent 角色为 evidence collector，不得替代 optimizer 做判断
- 更新 verify-change 模板中的 Phase 2 相关文本，保持一致性

## Capabilities

### New Capabilities
- `enforce-optimizer-invocation`: 强制 optimizer subagent 调用约束——CLI 层 runtime enforcement + prompt 层协议约束，确保 Phase 2 判断权始终归属 optimizer subagent

### Modified Capabilities
- `cap.verify.optimize`: 移除 Simple Change Fast Path 的 master agent 自主判断语义，改为始终委托 optimizer subagent
- `cap.ai.agent-prompt-guidance`: 重写 `VERIFY_SIMPLE_CHANGE_FAST_PATH` fragment，从"允许跳过"改为"强制委托"

## Impact

- 文件: `src/core/templates/fragments/opsx-fragments.ts` (VERIFY_SIMPLE_CHANGE_FAST_PATH 重写)
- 文件: `src/commands/verify.ts` (handleOptimization 增加 summary 非空校验)
- 文件: `src/core/templates/workflows/apply-change.ts` (Phase 2 编排文本更新)
- 文件: `src/core/templates/workflows/verify-change.ts` (Phase 2 相关文本一致性)
- 影响所有使用 Phase 2 的 apply/verify/archive 工作流
- 每次 apply 将多一次 optimizer subagent 调用（简单 change 时 subagent 快速返回 "No optimization opportunities found"）
