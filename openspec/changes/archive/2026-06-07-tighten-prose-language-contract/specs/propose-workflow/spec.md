## ADDED Requirements

### Requirement: Propose 消费共享 artifact language contract
`$openspec-propose` workflow SHALL 在生成 proposal、specs、design 和 tasks 时消费共享 `Document Language Contract` 与 artifact instructions 中的 `configProjection.prompt.fragments`，使新写或改写的 natural-language prose 跟随 `proseLanguage`。

#### Scenario: Propose template 包含共享语言契约
- **WHEN** propose skill 或 command template 被组装
- **THEN** template SHALL 包含共享 `Document Language Contract`
- **AND** contract SHALL 指示 agent 保留 canonical tokens，同时让 artifact prose fields 跟随 `proseLanguage`

#### Scenario: Propose 不增加额外语言自检流程
- **WHEN** propose workflow 创建 artifact
- **THEN** workflow SHALL 根据 artifact instructions 和共享 language contract 撰写 artifact
- **AND** workflow SHALL NOT 要求每个 artifact 完成前执行额外 non-canonical English prose scan

