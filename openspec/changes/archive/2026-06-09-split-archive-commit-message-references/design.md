## Context

`openspec-archive-change` 当前在主 `SKILL.md` 中同时承担归档流程和 commit message convention 说明。项目已有 `SkillTemplate.referenceFiles[]` 与 `references/` 写入机制，适合承载长协议或格式说明。

本次只整理 archive skill 的说明结构。`src/core/archive/merge-message.ts` 继续负责 `openspec-merge-summary` 的运行时生成逻辑，不在本 change 中修改。

## Goals / Non-Goals

**Goals:**
- 将 archive commit message 与 merge summary message 的格式说明拆到两个 `references/*.md` 文件。
- 让主 `SKILL.md` 保留 archive 流程、读取 reference 的时机和边界。
- 保持 `.codex` 与 `.claude` 生成产物和模板源一致。

**Non-Goals:**
- 不修改 `generateMergeMessage()`、type/scope 推断或 archive commit 的实际生成逻辑。
- 不引入新的 `refs/` 目录名。
- 不改变 `git.archive.commitMessage.convention` 或 `git.merge.commitMessage.convention` 的配置 schema。

## Decisions

### Decision 1: 使用现有 `references/` 目录

继续使用 `references/`，因为 `src/core/templates/sync-engine.ts` 已将 `SkillReferenceFile.path` 限定为 `references/` 前缀，且现有规约和测试都围绕 `references/*.md`。

替代方案是引入 `refs/`。该方案需要迁移路径校验、规约和生成产物契约，收益不足。

### Decision 2: 两个 convention 使用两个 reference 文件

使用：
- `references/archive-commit-message.md`
- `references/merge-summary-message.md`

archive commit 和 merge/squash commit 的读取时机不同，拆成两个文件能让 agent 在对应步骤读取最小上下文。

### Decision 3: 主 skill 只保留读取要求

主 `SKILL.md` 不再内联两个格式的完整说明，只在 Step 7 和 Step 8 指向对应 reference。这样保留流程可读性，也符合 skill 长度与 reference 文件独立验证的契约。

## Risks / Trade-offs

- [Risk] 生成产物没有刷新会导致模板与 `.codex`、`.claude` 文件不一致 → Mitigation: 任务中显式包含模板测试和生成产物一致性检查。
- [Risk] reference 文件路径写错会被 sync engine 拒绝或不生成 → Mitigation: 测试断言 `referenceFiles[]` 中两个路径的精确值。
- [Risk] agent 未读取 reference 就生成 commit message → Mitigation: 主 skill 在对应步骤使用 MUST 级读取要求。
