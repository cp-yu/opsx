---
capabilities:
  - cap.config.projection
---
# config-projection Specification

## Purpose
定义项目配置编译为 prompt/runtime projections 的契约，确保所有 artifact-writing workflow surfaces 共享统一的 natural-language prose、canonical token 和 config rules 语义边界。

## Requirements

### Requirement: Projection 结构契约
PromptProjection 和 RuntimeProjection SHALL 向消费 workflow surface 暴露 normalized config、compiled fragments 和 canonical token policy。

#### Scenario: PromptProjection 包含必要字段
- **WHEN** buildConfigProjectionBundle() 被调用
- **THEN** 输出包含 normalized、prompt.fragments、prompt.compiledLines、prompt.canonicalTokenPolicy

#### Scenario: RuntimeProjection 包含运行时字段
- **WHEN** projectConfigForRuntime() 被调用
- **THEN** 输出包含 fragments、proseLanguage、preserveCanonicalTokens、forbidHardcodedEnglishBoilerplate、canonicalTokenPolicy

### Requirement: Workflow surfaces 共享统一 projection contract
所有会创建或改写 OpenSpec artifacts 的 workflow 和 skill surfaces SHALL 消费同一套 config projection contract。

#### Scenario: Projection contract 应用于所有 workflow surfaces
- **WHEN** propose、apply、sync、archive、bootstrap、verify workflow 创建 artifacts
- **THEN** 生成的 instructions 消费共享的 prompt projection contract
- **AND** contract 保留 canonical tokens（SHALL、MUST、section headers、requirement headers、scenario headers、BDD keywords、IDs、schema keys、paths、commands）

#### Scenario: Projection 语义对所有消费者保持一致
- **WHEN** 多个 surfaces 在相同 config 下为同一 artifact 消费 projection
- **THEN** projection 内容对每个消费者的语义相同
- **AND** 消费者 SHALL NOT 通过读取 raw config 字段重新解释语义

### Requirement: Prose language 字段边界定义
Config projection SHALL 明确定义哪些 artifact 字段是受 proseLanguage 约束的 natural-language prose，哪些是 canonical tokens。

#### Scenario: Prose 字段清单
- **WHEN** proseLanguage fragment 生成时
- **THEN** 它 SHALL 列出 prose 字段：task titles、check names、Requirement titles、Scenario titles、bullet descriptions、Expect/Evidence descriptions、rationale、goals、risks、summaries

#### Scenario: Canonical token 保持原文
- **WHEN** proseLanguage 被配置
- **THEN** projection SHALL 保留：template headings、normative keywords（SHALL/MUST）、BDD keywords、section headers、IDs、schema keys、relation types、paths、commands、code identifiers

#### Scenario: MODIFIED 块中的 existing Requirement titles
- **WHEN** artifact 更新现有 Requirements
- **THEN** projection SHALL 允许 existing Requirement titles 保持原文以用于 exact matching

### Requirement: 英文术语可嵌入目标语言 prose
Config projection SHALL 允许英文项目术语嵌入目标语言 prose，同时对普通句子强制目标语言。

#### Scenario: 英文术语保留在目标语言 prose 中
- **WHEN** artifact prose 包含 OpenSpec 或工程术语
- **THEN** projection 允许 artifact、workflow、proseLanguage、Requirement、Scenario、apply、propose 等术语保留英文
- **AND** 普通英文句子、task titles、check names 必须跟随 proseLanguage

#### Scenario: 混合 prose 验证
- **WHEN** proseLanguage 是 zh-CN
- **THEN** "生成 artifact 的 workflow 调用 propose" 是合法的（混合）
- **AND** 纯英文普通句子是非法的

### Requirement: Projection fragment 作用域
Config projection SHALL 将 fragments 作用域标记为 global（所有 artifacts）或 artifact-specific。

#### Scenario: Global fragments
- **WHEN** proseLanguage 或 context 被配置
- **THEN** fragment scope 是 'global'

#### Scenario: Artifact-specific fragments
- **WHEN** config.rules[artifactId] 存在
- **THEN** fragment scope 是 'artifact'，仅应用于该 artifact

### Requirement: Surface-specific projection
Config projection SHALL 根据 workflow surface 生成不同的 fragments。

#### Scenario: Archive surface 包含 git projection
- **WHEN** surface 是 'archive' 且 config.git 存在
- **THEN** projection 包含 git.merge.strategy、git.branch.deleteAfterArchive、git.commitMessage.*

#### Scenario: Apply surface 包含 isolation projection
- **WHEN** surface 是 'apply' 且 config.apply 存在
- **THEN** projection 包含 apply.defaultIsolation

### Requirement: Legacy docLanguage fallback
Config projection SHALL 将 docLanguage 作为 proseLanguage 的 legacy fallback。

#### Scenario: proseLanguage 优先级更高
- **WHEN** proseLanguage 和 docLanguage 同时存在
- **THEN** projection 使用 proseLanguage

#### Scenario: docLanguage fallback
- **WHEN** 仅 docLanguage 存在
- **THEN** projection 使用 docLanguage 作为 proseLanguage
