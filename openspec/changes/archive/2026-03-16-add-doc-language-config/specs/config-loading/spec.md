## MODIFIED Requirements

### Requirement: 加载 openspec/config.yaml 项目配置
系统 SHALL 读取并解析位于项目根目录下 `openspec/config.yaml` 的项目配置文件，包括用于 OpenSpec 文档自然语言正文的可选顶层字段 `docLanguage`。

#### Scenario: 配置文件包含 docLanguage
- **WHEN** `openspec/config.yaml` 包含 `docLanguage: zh-CN`
- **THEN** 系统解析并暴露 `docLanguage` 作为项目配置的一部分
- **AND** 调用方可以将其用作 OpenSpec 文档自然语言正文的默认语言

#### Scenario: docLanguage 缺失
- **WHEN** `openspec/config.yaml` 未定义 `docLanguage`
- **THEN** 系统正常加载其余有效配置字段
- **AND** 不暴露文档语言覆盖配置

#### Scenario: docLanguage 类型无效
- **WHEN** `openspec/config.yaml` 包含非字符串类型的 `docLanguage`
- **THEN** 系统为 `docLanguage` 记录 warning
- **AND** 返回的配置中不包含该无效 `docLanguage` 值
- **AND** 其他有效配置字段仍然可用
