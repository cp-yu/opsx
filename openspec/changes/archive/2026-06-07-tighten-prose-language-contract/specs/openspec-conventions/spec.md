## ADDED Requirements

### Requirement: spec-driven instruction 区分结构 token 和填充 prose
Spec-driven artifact instructions SHALL 明确 parse-sensitive 结构 token 保持 canonical，agent 填充的新写或改写 prose 跟随 `proseLanguage`。

#### Scenario: specs instruction 标注 Requirement 和 Scenario title 语言
- **WHEN** agent 创建 delta spec
- **THEN** instructions SHALL 指出 `### Requirement:` 和 `#### Scenario:` 标记保持 canonical
- **AND** new Requirement titles 和 new Scenario titles SHALL 跟随 `proseLanguage`
- **AND** `MODIFIED Requirements` 中 exact matching 所需的 existing Requirement titles SHALL 保持原文

#### Scenario: tasks instruction 标注 task 和 check prose 语言
- **WHEN** agent 创建 `tasks.md`
- **THEN** instructions SHALL 指出 `### Task N:`、`Goal`、`Files`、`Requirements`、`Checks`、`Verifies:`、`Command:`、`Evidence:` 和 `Expect:` 等结构标签保持 canonical
- **AND** task titles、check names、requirements bullet prose、`Evidence:` descriptions 和 `Expect:` descriptions SHALL 跟随 `proseLanguage`

#### Scenario: examples 不改变 proseLanguage 约束
- **WHEN** schema instruction 包含英文示例
- **THEN** instructions SHALL 明确 examples 只展示结构格式
- **AND** agent SHALL NOT 将示例中的普通英文 prose 风格照搬到配置了非英文 `proseLanguage` 的 artifact 内容中

