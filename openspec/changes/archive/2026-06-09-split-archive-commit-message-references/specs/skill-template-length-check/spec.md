## MODIFIED Requirements

### Requirement: 现有超标 skill 模板必须拆分或精简

实现 MUST 拆分或精简当前所有超过限制的 skill 文件，使 `getSkillTemplates(undefined, undefined)`、`getSkillTemplates(undefined, 'claude')`、`getSkillTemplates(undefined, 'codex')` 返回的每个 `SKILL.md` 文件均不超过 200 行、每个 `referenceFiles[]` 文件均不超过 500 行。拆分或精简 MUST 保留现有 contract tests 覆盖的关键行为短语，并同步刷新生成的工具 skill 文件。

#### Scenario: 超标 workflow/internal skill 被压缩或拆分

- **WHEN** 运行 `pnpm test test/skills/skill-template-length-validation.test.ts`
- **THEN** 测试通过，所有 default、claude、codex 变体的 `SKILL.md` 文件均 ≤ 200 行
- **AND** 所有 default、claude、codex 变体的 `referenceFiles[]` 文件均 ≤ 500 行

#### Scenario: 长协议拆分到 references

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 当前配置启用的 `openspec-optimizer`、`openspec-impact-sweeper` MUST 将长协议写入 `references/*.md`
- **AND** 当选择包含 `apply` workflow 的安装计划时，`openspec-apply-change` MUST 将 Phase 2 优化协议写入 `references/apply-phase2-optimization.md`
- **AND** 当选择包含 `sync` workflow 的安装计划时，`openspec-sync-specs` MUST 将长协议写入 `references/*.md`
- **AND** 当选择包含 `archive` workflow 的安装计划时，`openspec-archive-change` MUST 将 commit message convention 说明写入 `references/archive-commit-message.md` 与 `references/merge-summary-message.md`
- **AND** 主 `SKILL.md` MUST 保留入口、输入、边界和 reference 清单

#### Scenario: 关键契约语义仍由现有测试保护

- **WHEN** 运行 skill/template contract tests
- **THEN** apply、explore、propose、archive、reviewer、optimizer、impact-sweeper、sync 相关测试仍通过

#### Scenario: 生成的工具 skill 与模板源一致

- **WHEN** 刷新生成的 `.claude`、`.codex`、`.github` 工具产物
- **THEN** 生成文件中的 `SKILL.md` 与 `references/*.md` 内容与对应模板源保持一致
