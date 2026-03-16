## MODIFIED Requirements

### Requirement: 扩展 AI 工具初始化
`openspec init` SHALL 允许用户在首次初始化之后继续为新的 AI 编码助手添加配置文件，同时支持项目级文档语言配置。

#### Scenario: 在初始配置后增加新的工具
- **GIVEN** 已存在 `openspec/` 目录且至少存在一个 AI 工具配置文件
- **WHEN** 用户运行 `openspec init` 并选择另一个受支持的 AI 工具
- **THEN** 命令以首次初始化相同的方式为该工具生成带有 OpenSpec markers 的配置文件
- **AND** 除需要刷新的受管区段外，保持现有工具配置文件不变
- **AND** 以 code 0 退出，并显示突出新增工具文件的成功摘要

### Requirement: 在交互式 init 中采集文档语言
`openspec init` 工作流 SHALL 在交互式初始化期间采集 OpenSpec artifact 的文档语言值，并将其持久化到 `openspec/config.yaml`。

#### Scenario: 首次 init 时设置文档语言
- **WHEN** 用户在新项目中以交互方式运行 `openspec init` 并提供文档语言值
- **THEN** 生成的 `openspec/config.yaml` 包含该 `docLanguage` 值
- **AND** 该值成为 OpenSpec 文档自然语言正文的默认语言

#### Scenario: 更新已存在项目的文档语言配置
- **GIVEN** 已存在 `openspec/` 目录
- **WHEN** 用户以交互方式运行 `openspec init` 并提供新的文档语言值
- **THEN** 命令更新 `openspec/config.yaml` 以保存新的 `docLanguage`
- **AND** 现有 OpenSpec 结构和已配置工具保持不变
