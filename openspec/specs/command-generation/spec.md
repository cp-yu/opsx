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

系统 SHALL 定义一个 `ToolCommandAdapter` 接口用于各工具的格式化逻辑。

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandSlug: string)`: returns file path for the external command slug (relative from project root, or absolute for global-scoped tools like Codex)
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **WHEN** formatting a command for Windsurf
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.windsurf/workflows/opsx-<id>.md`

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

The system SHALL provide a registry for looking up tool adapters.

#### Scenario: Get adapter by tool ID

- **WHEN** calling `CommandAdapterRegistry.get('cursor')`
- **THEN** it SHALL return the Cursor adapter or undefined if not registered

#### Scenario: Get all adapters

- **WHEN** calling `CommandAdapterRegistry.getAll()`
- **THEN** it SHALL return array of all registered adapters

#### Scenario: Adapter not found

- **WHEN** looking up an adapter for unregistered tool
- **THEN** `CommandAdapterRegistry.get()` SHALL return undefined
- **AND** caller SHALL handle missing adapter appropriately

### Requirement: Shared command body content

The body content of commands SHALL be shared across all tools.

#### Scenario: Same instructions across tools

- **WHEN** generating the 'explore' command for Claude and Cursor
- **THEN** both SHALL use the same `body` content
- **AND** only the frontmatter and file path SHALL differ

