## MODIFIED Requirements

### Requirement: 内嵌模板与示例
`openspec/AGENTS.md` SHALL 在 agent 进行对应编辑的位置提供完整、可直接复制使用的模板与内联示例。

#### Scenario: 提供文件模板
- **WHEN** 编写者进入 proposal 与 delta 的工作流指引部分
- **THEN** 提供与所需结构匹配的 fenced Markdown 模板（如 `## Why`、`## ADDED Requirements`、`#### Scenario:` 等）
- **AND** 为每个模板提供简短示例，展示正确的标题与 scenario bullets 用法

### Requirement: 编写 artifact 时遵守配置的文档语言
OpenSpec agent instructions SHALL 要求 agent 在生成或更新任意 OpenSpec artifact 前先读取 `openspec/config.yaml`，并在保留模板结构的前提下，将 `docLanguage` 用于自然语言正文。

#### Scenario: 已配置文档语言
- **WHEN** `openspec/config.yaml` 定义了 `docLanguage`
- **THEN** agent instructions 指导 AI 使用该语言编写 artifact 正文
- **AND** 保留模板标题、标识符和其他结构化 token 原样不变

#### Scenario: 在语言约束下填写模板内容
- **WHEN** agent 创建或更新 proposal、design、tasks 或 spec delta
- **THEN** agent 按现有模板结构填写内容，而不是发明新的布局
- **AND** 仅自然语言正文遵守 `docLanguage`
- **AND** IDs、schema keys 和协议性关键词等结构化 token 保持不变
