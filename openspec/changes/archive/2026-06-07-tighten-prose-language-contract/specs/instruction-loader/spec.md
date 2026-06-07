## ADDED Requirements

### Requirement: proseLanguage projection 描述 prose 字段
Instruction loader 暴露的 config projection bundle SHALL 通过 `proseLanguage` prompt fragment 明确新写或改写的 natural-language prose 跟随 `proseLanguage` 的值，并列出常见 artifact prose 字段。

#### Scenario: artifact instructions 包含 tightened prose guidance
- **WHEN** artifact instructions 在配置了 `proseLanguage` 的项目中生成
- **THEN** `configProjection.prompt.fragments` SHALL 包含 `proseLanguage` fragment
- **AND** compiled prompt lines SHALL 指出 task titles、check names、Requirement titles、Scenario titles、bullet descriptions、`Expect:` descriptions 和 `Evidence:` descriptions 跟随 `proseLanguage`
- **AND** compiled prompt lines SHALL 指出只有明确列出的 canonical tokens、code-like identifiers 和允许的英文术语可保持原文

#### Scenario: projection semantics 对消费者保持一致
- **WHEN** propose、continue-change、ff-change 或 apply-change surface 消费同一 artifact instruction
- **THEN** 它们 SHALL 接收相同语义的 `proseLanguage` projection
- **AND** 它们 SHALL NOT 通过读取 raw `openspec/config.yaml` 重新定义 prose/canonical 边界

