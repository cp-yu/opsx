## ADDED Requirements

### Requirement: Archive skill 拆分 commit message convention references

`opsx-archive-skill` SHALL 将 archive commit 与 merge summary commit 的 message convention 格式说明作为 skill reference 文件提供，并在主 archive skill 中要求 agent 在对应步骤读取。

#### Scenario: archive commit 步骤读取 archive reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求在创建 archive commit 前读取 `references/archive-commit-message.md`
- **AND** `references/archive-commit-message.md` SHALL 说明 `convention: openspec-archive` 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: merge 步骤读取 merge summary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求在创建 merge 或 squash commit message 前读取 `references/merge-summary-message.md`
- **AND** `references/merge-summary-message.md` SHALL 说明 `convention: openspec-merge-summary` 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: 主 skill 保留流程边界
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 保留 archive 流程、verify gate、sync、archive commit、merge 与 cleanup 步骤
- **AND** 主 `SKILL.md` SHALL NOT 内联两个 commit message convention 的完整格式说明
