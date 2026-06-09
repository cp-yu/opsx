## Context

当前 archive 流程把归档动作、git 提交、分支合并、branch cleanup 和 commit message 生成混在 CLI runtime 中。这个边界错误会让 CLI 在不知道真实项目变更语义的情况下生成 docs/归档类提交，实际项目变更也可能被合入同一个提交。

项目配置当前包含 `git.autoCommit`、archive/merge convention、merge strategy 和 branch cleanup。新设计保留这些配置字段，但改变消费者边界：CLI 读取配置只用于归档后提醒；agent 读取配置与 references 后决定是否继续 git 流程并生成 message。

## Goals / Non-Goals

**Goals:**
- archive CLI 只执行 verify、sync、move-to-archive。
- archive CLI 不执行任何 git 提交、合并、切分支、删分支或 message 生成。
- `git.autoCommit: auto` 表示 agent 在 CLI 归档后自动继续 git 提交流程。
- `git.autoCommit: manual` 表示用户在 CLI 归档后手动处理 git 提交流程。
- archive skill 明确 agent 的提交顺序：先真实项目变更，再 OpenSpec/docs 归档制品。
- commit message 由 agent 读取 `references/archive-commit-message.md` 与 `references/merge-summary-message.md` 后生成。

**Non-Goals:**
- 不新增 `git.autoCommit` 枚举值。
- 不让 CLI 自动拆分项目变更提交。
- 不让 CLI 输出推荐 commit message。
- 不改变 archive-time verify、sync、move-to-archive 的核心行为。

## Decisions

### Decision 1: `git.autoCommit` 表示 agent/user handoff

保留 `auto` / `manual` 两个值，避免配置迁移和兼容成本。语义调整为：
- `auto`: agent 在 archive CLI 完成后继续执行 git 流程。
- `manual`: 用户在 archive CLI 完成后手动执行 git 流程。

替代方案是新增 `agent-auto`，但这会制造旧字段兼容和迁移噪音，且用户已明确 `auto` 的含义就是 agent 自动完成。

### Decision 2: CLI 只提醒，不生成 message

archive CLI 可以读取 normalized config 来输出后续责任归属，但不能根据 references 或 artifacts 生成任何 commit message。message 生成需要 agent 阅读 references 并结合实际 diff 判断，CLI 没有足够上下文决定真实项目变更应是 `feat`、`fix`、`refactor` 还是其他类型。

### Decision 3: 移除 CLI runtime git 自动化链路

`runArchiveCommit`、`runArchiveMerge`、`resolveArchiveBranchContext`、branch cleanup 与 runtime merge message generation 不再属于 `openspec archive` 执行链路。实现阶段应删除或隔离这些路径，确保 `openspec archive` 不会调用 git 写操作。

### Decision 4: archive skill 承担 agent 后续流程

archive skill 在调用 CLI 完成归档后读取 `openspec config project --json` 的 projection。`auto` 时，agent 继续处理 git；`manual` 时，agent停止在提醒处。agent 生成 message 前必须读取 references，并按顺序提交：
1. 真实项目变更提交。
2. OpenSpec/docs 归档制品提交。

## Risks / Trade-offs

- [Risk] 旧用户依赖 CLI 自动 merge → Mitigation: 在输出中明确 archive CLI 已完成归档，后续 git 由 agent 或用户处理。
- [Risk] `git.autoCommit: auto` 名称容易被误读为 CLI 自动提交 → Mitigation: 更新 config spec、projection 文案、skill 文案和测试，固定为 agent handoff 语义。
- [Risk] 移除 CLI git 自动化后旧测试大量失效 → Mitigation: 将测试改为断言 CLI 不改 HEAD、不 stage、不 merge，只移动归档与输出 handoff。
- [Risk] Windows 路径行为回归 → Mitigation: 保留现有 `path.join()` / `path.resolve()` 的 archive move 与 sync 路径处理测试；删除 git pathspec 专属要求。
