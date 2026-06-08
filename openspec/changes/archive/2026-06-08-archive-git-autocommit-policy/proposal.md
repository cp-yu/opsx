## Why

archive 的 git 自动化配置把 merge message 来源、archive commit 格式和是否自动提交混在一起，`git.merge.messageFrom` 命名已经无法表达真实行为。需要用更清晰的 `git.autoCommit` 与 commit message convention 结构替代旧字段，并让 archive/merge 提交统一遵循 git-commit-reasons 格式。

## What Changes

- **BREAKING** 删除 `git.merge.messageFrom` 配置，不做兼容映射。
- 新增 `git.autoCommit: auto | manual`，`auto` 自动完成 archive commit 与 merge，`manual` 只执行 verify/sync/mv 并保留未提交工作树。
- 新增 `git.archive.commitMessage.convention: openspec-archive` 与 `git.merge.commitMessage.convention: openspec-merge-summary`。
- archive commit 与 merge/squash commit 均按 git-commit-reasons 的 `## Why` / `## Changes` 模板生成，并通过 stdin 传入 `git commit -F -`。
- archive commit 只通过显式 pathspec 提交归档相关路径，保留其他 dirty changes。
- init/update/config projection/archive skill 文案改用新配置结构，并强制清理陈旧 `git.merge.messageFrom`。

## Capabilities

### New Capabilities

### Modified Capabilities
- `archive-branch-merge`: 归档 git 自动化、archive/merge commit message convention、dirty changes pathspec 边界。
- `config-loading`: 项目配置 git 节点的新字段、默认值、校验、projection 输出。
- `opsx-archive-skill`: archive workflow 指令消费新 git projection，并在 manual 模式跳过 commit/merge。
- `cli-init`: 初始化配置输出新 git 默认结构。
- `cli-update`: 更新时删除陈旧 `git.merge.messageFrom` 并补齐新 git 默认结构。
- `config-project-query`: normalized project config 输出新 git 字段。

## Impact

- Affected code: `src/core/archive.ts`, `src/core/archive/merge-message.ts`, `src/core/project-config.ts`, `src/core/config-schema.ts`, `src/core/config-projection.ts`, `src/core/config-prompts.ts`, `src/core/update.ts`, `src/core/templates/workflows/archive-change.ts`.
- Affected tests: archive branch merge, merge message generation, project config parsing/default migration, config schema key validation, init/update, archive skill content, config project output.
- Affected docs/specs: archive git behavior, config loading, init/update defaults, archive skill runtime projection.
