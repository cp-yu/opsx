## Context

Archive CLI 的边界已经收敛为 verify、sync、move-to-archive 和 handoff 提醒。归档后的 commit、merge、cleanup 属于 agent/user handoff。

Phase 2 改为 commit checkpoint 后，成功实现历史可能已经存在于 `wip: opt-checkpoint-r0 (baseline)` 和后续 `wip: opt-rN (...)` commits 中。archive auto handoff 如果继续要求“先提交真实项目变更”，会在没有未提交实现 diff 时生成误导性提交。

## Goals / Non-Goals

**Goals:**
- 明确 `git.autoCommit: auto` 下 agent 如何处理已由 Phase 2 checkpoint commits 承载的实现历史。
- 保留一个可读的 semantic boundary commit，使用 `feat`、`fix`、`refactor` 等真实语义类型记录 change 边界。
- 保持 OpenSpec/docs 归档制品提交独立。

**Non-Goals:**
- 不改变 `openspec archive` CLI 的 git 边界。
- 不清理或 squash `wip: opt-*` commits。
- 不新增配置项。

## Decisions

1. 使用 semantic boundary commit，而不是 `meta(...)` commit。
   - 理由：该提交代表 change 的产品/代码语义，应服务 git history、merge summary 和 release notes。
   - 取舍：提交可以是 `--allow-empty`，但 subject 仍必须是真实语义类型。

2. 仅在实现已由 `wip: opt-*` commits 承载且没有未提交实现 diff 时创建 empty semantic boundary commit。
   - 理由：避免伪造 implementation commit，同时保留 archive 边界。
   - 替代方案：直接跳过 E。问题是 archive 后历史缺少一个稳定语义边界。

3. semantic boundary commit body 记录 effective implementation diff。
   - 内容包括 base/head 或 diff range、承载该 diff 的 checkpoint commits，以及 intentional empty 说明。
   - 该 body 由 agent 根据 git history 和当前 HEAD 生成，不由 archive CLI 输出。

4. archive artifact commit 仍使用 `references/archive-commit-message.md`。
   - 理由：归档制品提交与实现边界提交职责不同，不能混在一个 commit message convention 中。

## Risks / Trade-offs

- [Risk] agent 误把 docs/archive diff 放进 semantic boundary commit -> Mitigation: 模板要求 semantic boundary commit 发生在 OpenSpec/docs archive commit 之前，并且 archive commit 只添加 archive/synced paths。
- [Risk] 空提交被误解为没有实现 -> Mitigation: commit body 必须写明 implementation diff 已由保留的 Phase 2 checkpoint commits 承载。
- [Risk] 非 Phase 2 路径没有 `wip: opt-*` commits -> Mitigation: 若存在未提交真实项目变更，保留正常 implementation commit 流程。

## Migration Plan

- 更新 `opsx-archive-skill` delta spec。
- 更新 archive workflow template 的 auto handoff 指令。
- 更新 archive skill content test，覆盖 `--allow-empty`、`wip: opt-*`、effective implementation diff 和独立归档制品提交。
