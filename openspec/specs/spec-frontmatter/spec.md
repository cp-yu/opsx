# spec-frontmatter Specification

## Purpose
此规约记录变更 spec-capability-awareness 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 解析 spec 文件的 YAML frontmatter

系统 SHALL 提供 `parseSpecFrontmatter(content: string)` 函数，从 spec.md 内容中提取 YAML frontmatter 并返回 `{ capabilities: string[] }`。

#### Scenario: 正常 frontmatter 解析

- **WHEN** spec 内容以 `---\ncapabilities:\n  - cap.cli.archive\n---` 开头
- **THEN** 函数 SHALL 返回 `{ capabilities: ["cap.cli.archive"] }`

#### Scenario: 多个 capabilities

- **WHEN** spec 内容的 frontmatter 包含多个 cap ID
- **THEN** 函数 SHALL 返回所有声明的 cap ID，保持声明顺序

#### Scenario: 无 frontmatter

- **WHEN** spec 内容不以 `---` 开头
- **THEN** 函数 SHALL 返回 `{ capabilities: [] }`

#### Scenario: frontmatter 无 capabilities 字段

- **WHEN** spec 内容有 `---` 分隔的 frontmatter 但不含 `capabilities` 字段
- **THEN** 函数 SHALL 返回 `{ capabilities: [] }`

#### Scenario: 畸形 YAML frontmatter

- **WHEN** frontmatter 区域内的 YAML 解析失败
- **THEN** 函数 SHALL 返回 `{ capabilities: [] }`
- **AND** SHALL NOT 抛出异常

#### Scenario: frontmatter 后的 markdown 内容不受影响

- **WHEN** spec 内容有 frontmatter 后跟 `# Title` 和 `## Requirements`
- **THEN** 函数 SHALL 仅解析 frontmatter 区域
- **AND** SHALL NOT 修改或解析 `---` 之后的 markdown 内容

### Requirement: 使用已有 yaml 库解析

系统 SHALL 使用项目已有的 `yaml` 依赖（v2.8.2）解析 frontmatter YAML，不引入新的解析依赖。

#### Scenario: YAML 解析调用

- **WHEN** 检测到 `---` 分隔的 frontmatter 区域
- **THEN** 系统 SHALL 提取两个 `---` 之间的文本并调用 `yaml.parse()` 解析

