## MODIFIED Requirements

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

系统 SHALL 定义一个 `ToolCommandAdapter` 接口用于各工具的格式化逻辑。

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandSlug: string)`: returns file path for the external command slug (relative from project root, or absolute for global-scoped tools like Codex)
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter

### Requirement: Command generator function

系统 SHALL 提供 `generateCommand` 函数来组合 command content 与 adapter。

#### Scenario: Generate command file

- **WHEN** calling `generateCommand(content, adapter)`
- **THEN** it SHALL return an object with:
  - `path`: the file path from `adapter.getFilePath(content.commandSlug)`
  - `fileContent`: the formatted content from `adapter.formatFile(content)`

#### Scenario: Generate multiple commands

- **WHEN** generating all opsx commands for a tool
- **THEN** the system SHALL iterate over command contents and generate each using the tool's adapter
- **AND** workflows with custom external command slugs SHALL still preserve their internal IDs in command metadata used by higher-level workflow selection logic
