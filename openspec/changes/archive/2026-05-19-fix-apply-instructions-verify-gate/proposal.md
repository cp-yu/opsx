## Why

`openspec instructions apply` 命令在全部 task checkbox 打勾后即返回 `state: 'all_done'` 和 "ready to be archived" 消息，未检查 verify (Phase 1→2→Seal) 是否完成。同时 `openspec list --json` 的 `status: "complete"` 字段和 Dashboard 的 "Completed Changes" 分类同样仅基于 task count 判定，形成 CLI 层面对用户/AI agent 的系统性误导。用户按指令尝试 archive 时会被 archive 命令的 verify gate 拒绝，但此时的引导信息已经是错的。

## What Changes

- **BREAKING**: `ApplyInstructions.state` 类型新增 `'needs_verify'` 和 `'needs_seal'` 两个取值
- `generateApplyInstructions` 在 `remaining === 0` 时调用 `checkFreshness` + `checkArchiveCompatibility` 进行 verify 状态判定
- `apply-change.ts` 模板对 `needs_verify` / `needs_seal` 状态无缝进入对应验证阶段，不打断
- `openspec list --json` 输出新增 `verifyStatus` 字段 (MISSING/STALE/FRESH)
- `continue-change.ts` 模板 `isComplete: true` 时移除 "or archive it" 措辞
- `view.ts` Dashboard "Completed Changes" 改名为 "Tasks Done"

## Capabilities

### New Capabilities
- `verify-aware-apply-instructions`: `instructions apply` 命令在判定 change 完成状态时集成 verify freshness 检查

### Modified Capabilities
- `artifact-workflow-status`: `list --json` 输出增加 verify 状态维度
- `apply-change-workflow`: 模板状态处理增加 `needs_verify` / `needs_seal` 分支

## Impact

- `src/commands/workflow/instructions.ts` — 核心逻辑修改
- `src/commands/workflow/shared.ts` — 类型定义修改
- `src/core/list.ts` — JSON 输出新增字段
- `src/core/view.ts` — 文案修改
- `src/core/templates/workflows/apply-change.ts` — 模板状态分支
- `src/core/templates/workflows/continue-change.ts` — 模板文案