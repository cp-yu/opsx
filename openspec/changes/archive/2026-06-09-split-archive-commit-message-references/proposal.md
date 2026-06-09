## Why

`openspec-archive-change` skill 当前把 archive commit 与 merge commit 的 message convention 说明混在主指令里，导致主流程不够聚焦，也不符合项目已有的 `references/` 拆分模式。

## What Changes

- 将 `convention: openspec-archive` 的格式说明拆到 `references/archive-commit-message.md`。
- 将 `convention: openspec-merge-summary` 的格式说明拆到 `references/merge-summary-message.md`。
- 主 `SKILL.md` 只保留执行入口与读取 reference 的要求，不改变 archive/merge message 的运行时生成逻辑。
- 更新生成产物一致性与测试，确保 `.codex`、`.claude` archive skill 同步包含两个 reference 文件。

## Capabilities

### New Capabilities

### Modified Capabilities
- `opsx-archive-skill`: archive skill SHALL 在对应步骤读取两个 commit message convention reference 文件，而不是在主 skill 内联格式细节。
- `skill-template-length-check`: skill reference 拆分契约 SHALL 覆盖 `openspec-archive-change` 的两个 commit message convention reference 文件。

## Impact

- Affected code: `src/core/templates/workflows/archive-change.ts`
- Affected generated skills: `.codex/skills/openspec-archive-change/`, `.claude/skills/openspec-archive-change/`
- Affected tests: `test/skills/archive-skill-content.test.ts`, skill reference/length validation coverage
- Not affected: `src/core/archive/merge-message.ts`
