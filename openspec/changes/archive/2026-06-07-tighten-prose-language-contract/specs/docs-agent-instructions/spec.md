## ADDED Requirements

### Requirement: artifact prose language contract 明确字段边界
Artifact-writing workflow surface SHALL 使用共享 config projection contract 指示 agent 将新写或改写的 natural-language prose 写成 `proseLanguage` 指定的语言，并明确 artifact 中哪些字段属于 prose。

#### Scenario: 共享 contract 定义 prose 字段
- **WHEN** workflow 或 skill surface 生成、更新或回写 OpenSpec artifact
- **THEN** generated instructions SHALL 指出 natural-language prose 包括 proposal/design body text、bullet descriptions、task titles、check names、new Requirement titles、new Scenario titles、`Expect:` descriptions、`Evidence:` descriptions、rationale、goals、risks 和 summaries
- **AND** generated instructions SHALL 指出这些 prose 字段跟随 `proseLanguage`

#### Scenario: 共享 contract 保留 canonical token
- **WHEN** workflow 或 skill surface 应用 `proseLanguage`
- **THEN** generated instructions SHALL 保留 template headings、normative keywords、BDD keywords、IDs、schema keys、relation types、paths、commands 和 code identifiers 的 canonical 形式
- **AND** generated instructions SHALL 允许 `MODIFIED Requirements` 中用于 exact matching 的 existing Requirement titles 保持原文

#### Scenario: 英文术语可嵌入目标语言 prose
- **WHEN** artifact prose 包含 OpenSpec 或工程术语
- **THEN** generated instructions SHALL 允许 `artifact`、`workflow`、`proseLanguage`、`Requirement`、`Scenario`、`apply`、`propose` 等术语保留英文
- **AND** generated instructions SHALL NOT 将普通英文句子、task titles 或 check names 仅因包含英文术语而整体保留为英文 prose

