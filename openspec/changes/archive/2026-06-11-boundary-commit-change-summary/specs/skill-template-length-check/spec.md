# skill-template-length-check Delta

## MODIFIED Requirements

### Requirement: 现有超标 skill 模板必须拆分或精简

实现 MUST 拆分或精简当前所有超过限制的 skill 文件，使 `getSkillTemplates(undefined, undefined)`、`getSkillTemplates(undefined, 'claude')`、`getSkillTemplates(undefined, 'codex')` 返回的每个 `SKILL.md` 文件均不超过 200 行、每个 `referenceFiles[]` 文件均不超过 500 行。拆分或精简 MUST 保留现有 contract tests 覆盖的关键行为短语，并同步刷新生成的工具 skill 文件。

#### Scenario: 超标 workflow/internal skill 被压缩或拆分

- **WHEN** 运行 `pnpm test test/skills/skill-template-length-validation.test.ts`
- **THEN** 测试通过，所有 default、claude、codex 变体的 `SKILL.md` 文件均 ≤ 200 行
- **AND** 所有 default、claude、codex 变体的 `referenceFiles[]` 文件均 ≤ 500 行

#### Scenario: 长协议拆分到共享 references home

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 各 skill 声明的长协议 MUST 物化到 `openspec/references/openspec-<name>.md`
- **AND** `openspec-apply-change` 的 Phase 2 优化协议 MUST 物化为 `openspec/references/openspec-apply-phase2-optimization.md`
- **AND** `openspec-archive-change` 的 commit message 格式说明 MUST 物化为 `openspec/references/openspec-boundary-commit-message.md`、`openspec/references/openspec-archive-commit-message.md` 与 `openspec/references/openspec-merge-summary-message.md`
- **AND** 主 `SKILL.md` MUST 保留入口、输入、边界和 reference 清单

#### Scenario: 关键契约语义仍由现有测试保护

- **WHEN** 运行 skill/template contract tests
- **THEN** apply、explore、propose、archive、reviewer、optimizer、impact-sweeper、sync 相关测试仍通过

#### Scenario: 生成的工具 skill 与模板源一致

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 生成文件中的 `SKILL.md` 与 `openspec/references/openspec-*.md` 内容与对应模板源保持一致
