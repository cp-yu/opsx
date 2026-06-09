## Why

Phase 2 现在使用并保留 `wip: opt-*` checkpoint commits 承载实现历史，archive auto handoff 仍要求 agent 先创建“真实项目变更”提交，会在实现已提交时产生空提交或误导性提交。

## What Changes

- 将 archive auto handoff 的实现边界提交改为语义提交：`feat`、`fix`、`refactor` 等真实 Conventional Commit 类型由 change 内容决定。
- 当实现 diff 已由保留的 `wip: opt-*` commits 承载时，agent SHALL 创建 `--allow-empty` 的 semantic boundary commit，而不是伪造实现提交。
- semantic boundary commit 的 body SHALL 记录 effective implementation diff 范围和承载该 diff 的 checkpoint commits。
- OpenSpec/docs 归档制品仍作为独立 archive commit 提交。
- `openspec archive` CLI 边界不变：CLI 不创建 commit、不生成 commit message、不执行 merge 或 cleanup。

## Capabilities

### New Capabilities

### Modified Capabilities
- `opsx-archive-skill`: 调整 `git.autoCommit: auto` 下 archive skill 的 post-archive git handoff 语义，区分未提交实现变更、已由 Phase 2 checkpoint commits 承载的实现历史，以及 OpenSpec/docs 归档制品提交。

## Impact

- 影响 archive skill 模板和生成的 `openspec-archive-change` skill 文案。
- 影响 `opsx-archive-skill` 行为规约和对应模板内容测试。
- 不改变 archive CLI 的运行时行为。
