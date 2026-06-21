## Why

系统从 inline-template 模型迁移到 subagent-orchestrated 模型后，`opsx-fragments.ts` 中 15 个 fragment exports 成为死代码（消费方 `verify-change.ts` 等 6 个工作流模板已被删除），多个 spec 文件引用不存在的外部 artifact（`prompts.md`、`verify-change.ts`、`continue-change` 模板、`openspec-phase2-checkpoint-protocol.md`），规格与代码事实脱节。

## What Changes

- 删除 `opsx-fragments.ts` 中 15 个无消费方的 fragment exports 及其 JSDoc
- 修正 `opsx-fragments.ts` 中 7 个 stale "Used in:" 注释，移除已删除模板的引用
- 7 个 spec 文件中 stale 引用收敛到当前实际代码位置（`reviewer.ts`、`freshness-engine`）或标记 `[REMOVED]`
- `opsx-fragments.test.ts` 删除对已移除 fragments 的测试用例

## Capabilities

### New Capabilities

<!-- 无新增能力 -->

### Modified Capabilities

- `ai-workflow-templates`: 删除 15 个死 fragment exports，修正 stale "Used in:" 注释，移除 spec 中对已删除模板的引用
- `opsx-verify-skill`: 将 `prompts.md 中的 GIT_EVIDENCE_PROTOCOL/CONFORMANCE_CHECK_RULES` 引用收敛到 `reviewer.ts` 当前判定位置
- `verify-writeback`: 将 `prompts.md` 引用收敛到 `verify CLI` 和 `freshness-engine`
- `verify-skill-reference-files`: 将不存在的 artifact 引用（`PHASE2_CHECKPOINT_PROTOCOL_REFERENCE`、`openspec-phase2-checkpoint-protocol.md`）标记为 `[REMOVED]`
- `verify-prompt-orchestration`: 将已删除的 `verify-change.ts` 引用标记为 `[REMOVED]`
- `enforce-optimizer-invocation`: 将已删除的 `verify-change.ts` 引用标记为 `[REMOVED]`
- `apply-change-workflow`: 将已删除的 `continue-change` 模板引用标记为 `[REMOVED]`

## Impact

- 受影响的代码：`src/core/templates/fragments/opsx-fragments.ts`、`test/core/templates/fragments/opsx-fragments.test.ts`
- 受影响的规格：7 个 spec 文件（路径见 Capabilities 列表）
- 无 API 变更、无破坏性变更、无新增依赖
