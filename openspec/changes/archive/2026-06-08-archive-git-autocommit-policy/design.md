## Context

现有 archive git 流程已经会在 sync/mv 后创建 archive commit，并按 `git.merge.strategy` 合并回 originalBranch。配置问题集中在 `git.merge.messageFrom`：字段名只勉强描述 merge commit message 来源，却被 workflow 文案用于影响 archive commit 和手动合并行为，语义不清。

本次设计采用破坏性清理：删除旧字段，不做兼容映射，改为 `git.autoCommit` 控制自动化程度，`git.*.commitMessage.convention` 控制提交信息规范。

## Goals / Non-Goals

**Goals:**
- 用 `git.autoCommit: auto | manual` 表达 archive git 自动化开关。
- 用 `openspec-archive` 与 `openspec-merge-summary` 两个 convention 统一到 git-commit-reasons 格式。
- 保证 archive commit 只提交归档相关 pathspec，保留用户其他 dirty changes。
- init/update/config projection/archive skill 全面移除 `git.merge.messageFrom`。

**Non-Goals:**
- 不支持自定义模板字段；未来可以在 convention 之外单独设计。
- 不让 archive 命令替用户提交实现代码变更。
- 不保留 `git.merge.messageFrom` 的兼容解析或映射。

## Decisions

### Decision 1: 用 `git.autoCommit` 管理自动化程度

`auto` 执行 archive commit、merge、branch cleanup；`manual` 只执行 verify/sync/mv，然后保留未提交工作树。这个字段直接表达用户是否让 OpenSpec 自动提交，而不是把手动行为塞进 commit message 来源。

Rejected: 使用 boolean。布尔值后续无法表达可能出现的半自动状态，也不如枚举对用户清晰。

### Decision 2: 用 commitMessage convention 替代 message source

新结构为：

```yaml
git:
  autoCommit: auto
  archive:
    commitMessage:
      convention: openspec-archive
  merge:
    strategy: no-ff
    commitMessage:
      convention: openspec-merge-summary
  branch:
    deleteAfterArchive: false
```

`openspec-archive` 和 `openspec-merge-summary` 都遵循 git-commit-reasons 的 subject、`## Why`、`## Changes` 固定结构。`openspec-archive` 用于归档制品提交；`openspec-merge-summary` 用于 no-ff/squash 的整变更摘要提交。

Rejected: 继续使用 `git.merge.messageFrom`。该字段绑定 merge，并且 `artifacts/manual` 同时混合来源与执行行为。

### Decision 3: 强制移除旧字段

`openspec update` 对有效 YAML object 执行显式路径删除，移除 `git.merge.messageFrom` 后补齐新默认值。缺失默认值仍使用现有 missing-only 写入模式；删除旧字段是本次破坏性迁移的唯一覆盖性动作。

Rejected: 兼容读取旧字段。兼容会让旧语义继续污染 projection 和 archive skill，用户仍会看到两个来源相近但含义不同的配置。

### Decision 4: 保留其他 dirty changes

archive commit 继续使用显式 pathspec：归档目录、sync 后的 specs、OPSX 文件。即使工作树存在其他 dirty changes，archive commit 也只提交这些路径。`manual` 模式不执行 `git add` 或 `git commit`，所以归档相关变更和其他 dirty changes 都留在工作树。

跨平台约束不变：所有 git 命令继续用 `spawn`/`execFile` 的 argv 数组形式，多行 commit message 通过 stdin 传入，不通过 shell 拼接。

## Risks / Trade-offs

- [Risk] 破坏性删除旧字段会影响已有配置。→ Mitigation: `openspec update` 明确清理旧字段并写入新结构，docs/specs 标注 breaking change。
- [Risk] `manual` 模式完成 mv 后留下未提交变更。→ Mitigation: CLI/skill 摘要明确说明 commit/merge skipped: manual，并提示用户自行提交/合并。
- [Risk] commit message generator 与 git-commit-reasons 模板漂移。→ Mitigation: 测试固定 `## Why` / `## Changes`、文件原因行和 stdin 提交行为。

## Migration Plan

1. 更新 config schema、project config loader、default materialization 和 key-path validation。
2. 更新 archive runtime projection 与 prompt projection。
3. 更新 archive git flow：先读取 runtime projection；`manual` 时跳过 commit/merge；`auto` 时生成 convention message 并提交显式 pathspec。
4. 更新 init/update 输出；update 删除 `git.merge.messageFrom` 后补齐新默认结构。
5. 更新 workflow template、specs 和测试。

## Open Questions

None.
