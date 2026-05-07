## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

系统 SHALL 定义一个 `ToolCommandAdapter` 接口用于支持 adapter-backed command generation 的工具格式化逻辑。适配器 SHALL NOT 在内部执行 command reference 变换——该职责由共享 transform 管线统一处理。

#### Scenario: Adapter 接口结构

- **WHEN** 为受支持工具实现 command adapter
- **THEN** `ToolCommandAdapter` SHALL 要求提供：
  - `toolId`: 与 `AIToolOption.value` 匹配的字符串标识符
  - `getFilePath(commandSlug: string)`: 返回外部 command slug 对应的 command artifact 文件路径
  - `formatFile(content: CommandContent)`: 返回带 frontmatter 的完整文件内容

#### Scenario: OpenCode adapter 不执行 command reference 变换

- **WHEN** 为 OpenCode 格式化 command
- **THEN** adapter SHALL NOT 调用 `transformToHyphenCommands` 或任何 command reference 变换函数
- **AND** adapter SHALL 直接使用 `content.body` 的值进行 frontmatter 包装
- **AND** command reference 变换（`/opsx:slug` → `/opsx-slug`）SHALL 由 `builtin-transforms.ts` 中注册的 `opencode-command-refs` transform 在管线中执行

#### Scenario: Pi adapter 不执行 command reference 变换

- **WHEN** 为 Pi 格式化 command
- **THEN** adapter SHALL NOT 调用 `transformToHyphenCommands` 或任何 command reference 变换函数
- **AND** adapter SHALL 直接使用 `content.body` 的值进行 frontmatter 包装和 `$@` 注入
- **AND** command reference 变换（`/opsx:slug` → `/opsx-slug`）SHALL 由 `builtin-transforms.ts` 中注册的 `pi-command-refs` transform 在管线中执行

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
