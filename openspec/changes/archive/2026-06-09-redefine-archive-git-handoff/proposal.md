## Why

当前 archive CLI 会在归档后继续执行 git commit、merge 与 branch cleanup，导致真实项目变更可能被错误归入 docs/归档提交。`git.autoCommit` 的语义需要收敛为 agent/user handoff，而不是 CLI 自动提交授权。

## What Changes

- **BREAKING**: `openspec archive` 不再执行任何 git commit、merge、checkout 或 branch cleanup。
- `openspec archive` 仍读取 normalized project config 中的 `git.autoCommit`，但只用于输出后续责任归属提醒。
- `git.autoCommit: auto` 表示归档完成后由 agent 自动继续处理 git 提交流程。
- `git.autoCommit: manual` 表示归档完成后由用户手动处理 git 提交流程。
- commit message 不再由 archive CLI 生成；agent 在归档后读取 archive skill references 生成 message。
- archive skill 明确先提交真实项目变更，再提交 OpenSpec/docs 归档制品。

## Capabilities

### New Capabilities

### Modified Capabilities
- `cli-archive`: archive CLI 的 git 行为从自动提交/合并改为只归档并提醒 handoff。
- `archive-branch-merge`: archive 后的 commit/merge 语义从 CLI runtime 行为改为 agent 归档后职责。
- `opsx-archive-skill`: archive skill 根据 `git.autoCommit` 决定 agent 是否继续 git 流程，并读取 references 生成 message。
- `config-loading`: `git.autoCommit` 保留枚举与 projection 字段，但语义改为 agent/user handoff。

## Impact

- `src/core/archive.ts`: 移除 archive CLI 执行链路中的自动 git commit、merge、checkout、branch cleanup 与 runtime message generation。
- `src/core/archive/merge-message.ts`: 不再作为 archive CLI runtime 依赖；保留、迁移或删除由实现阶段按引用情况决定。
- `src/core/templates/workflows/archive-change.ts`: 更新 archive skill 指令，区分 CLI 归档动作与 agent 后续 git 动作。
- `src/core/config-projection.ts`、`src/core/project-config.ts`、`src/core/config-schema.ts`: 保持字段结构，调整文案/语义测试。
- `test/core/archive-branch-merge.test.ts`、`test/core/archive.test.ts`、`test/skills/archive-skill-content.test.ts`、配置相关测试：更新为新的 handoff 行为。
