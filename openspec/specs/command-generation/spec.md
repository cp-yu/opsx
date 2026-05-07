# command-generation Specification

## Purpose
Define tool-agnostic command content and adapter contracts for generating tool-specific OpenSpec command files.
## Requirements
### Requirement: CommandContent interface

系统 SHALL 定义一个工具无关的 `CommandContent` 接口来表示命令数据。

#### Scenario: CommandContent structure

- **WHEN** defining a command to generate
- **THEN** `CommandContent` SHALL include:
  - `id`: internal workflow-linked identifier (e.g., 'explore', 'bootstrap-opsx')
  - `commandSlug`: external user-facing command slug used for command file generation (e.g., 'explore', 'bootstrap')
  - `name`: human-readable name (e.g., 'OpenSpec Explore')
  - `description`: brief description of command purpose
  - `category`: grouping category (e.g., 'OpenSpec')
  - `tags`: array of tag strings
  - `body`: the command instruction content

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

### Requirement: Command generator function

The system SHALL generate workflow command artifacts from a single manifest-derived projection rather than from scattered workflow-specific mappings.

#### Scenario: Shared workflow projection drives generation
- **WHEN** generating command artifacts for any supported tool
- **THEN** the command set SHALL be derived from a shared manifest projection of the selected workflows
- **AND** the same projection SHALL determine workflow IDs, command slugs, and generated artifact membership

#### Scenario: Core and expanded mode projections remain deterministic
- **WHEN** command artifacts are generated for `core` or `expanded` mode
- **THEN** the resulting command set SHALL match the selected mode exactly
- **AND** repeated generation with the same inputs SHALL converge to the same file set

#### Scenario: Standalone sync command exists only in expanded projection
- **WHEN** the selected mode is `core`
- **THEN** command generation SHALL NOT emit a standalone sync command artifact
- **AND** when the selected mode is `expanded`, command generation SHALL emit the standalone sync command artifact

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

### Requirement: Shared command body content

The body content of commands SHALL be shared across all tools.

#### Scenario: Same instructions across tools

- **WHEN** generating the 'explore' command for Claude and Cursor
- **THEN** both SHALL use the same `body` content
- **AND** only the frontmatter and file path SHALL differ
