## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

系统 SHALL 定义一个 `ToolCommandAdapter` 接口用于支持 adapter-backed command generation 的工具格式化逻辑。

#### Scenario: Adapter 接口结构

- **WHEN** 为受支持工具实现 command adapter
- **THEN** `ToolCommandAdapter` SHALL 要求提供：
  - `toolId`: 与 `AIToolOption.value` 匹配的字符串标识符
  - `getFilePath(commandSlug: string)`: 返回外部 command slug 对应的 command artifact 文件路径
  - `formatFile(content: CommandContent)`: 返回带 frontmatter 的完整文件内容

#### Scenario: Claude adapter 格式化

- **WHEN** 为 Claude Code 格式化 command
- **THEN** adapter SHALL 输出包含 `name`、`description`、`category`、`tags` 字段的 YAML frontmatter
- **AND** 文件路径 SHALL 遵循 `.claude/commands/opsx/<id>.md` 模式

#### Scenario: Cursor adapter 格式化

- **WHEN** 为 Cursor 格式化 command
- **THEN** adapter SHALL 输出 YAML frontmatter，其中 `name` 为 `/opsx-<id>`，并包含 `id`、`category`、`description` 字段
- **AND** 文件路径 SHALL 遵循 `.cursor/commands/opsx-<id>.md` 模式

#### Scenario: Windsurf adapter 格式化

- **WHEN** 为 Windsurf 格式化 command
- **THEN** adapter SHALL 输出包含 `name`、`description`、`category`、`tags` 字段的 YAML frontmatter
- **AND** 文件路径 SHALL 遵循 `.windsurf/workflows/opsx-<id>.md` 模式

#### Scenario: Codex 不暴露 adapter-backed commands

- **WHEN** 解析 Codex 的 command generation 支持能力
- **THEN** 系统 SHALL 将 Codex 视为 skills-only 的工具表面
- **AND** 系统 SHALL NOT 为 `codex` 要求 `ToolCommandAdapter` 实现

### Requirement: CommandAdapterRegistry

系统 SHALL 提供一个 registry，仅为仍支持 adapter-backed command 文件的工具查找 adapter。

#### Scenario: 按工具 ID 获取 adapter

- **WHEN** 调用 `CommandAdapterRegistry.get('cursor')`
- **THEN** 它 SHALL 返回 Cursor adapter；若未注册则返回 `undefined`

#### Scenario: 获取全部 adapters

- **WHEN** 调用 `CommandAdapterRegistry.getAll()`
- **THEN** 它 SHALL 返回包含所有已注册 adapter 的数组

#### Scenario: 未找到 adapter

- **WHEN** 为未注册工具查找 adapter
- **THEN** `CommandAdapterRegistry.get()` SHALL 返回 `undefined`
- **AND** 调用方 SHALL 正确处理 adapter 缺失的情况

#### Scenario: Codex adapter 未注册

- **WHEN** 调用 `CommandAdapterRegistry.get('codex')`
- **THEN** 它 SHALL 返回 `undefined`
- **AND** 调用方 SHALL 仅通过 skills 继续执行 Codex workflow 安装
