# CLI Init Specification

## Purpose

The `openspec init` command SHALL create a complete OpenSpec directory structure in any project, enabling immediate adoption of OpenSpec conventions with support for multiple AI coding assistants.
## Requirements
### Requirement: Progress Indicators

The command SHALL display progress indicators during initialization to provide clear feedback about each step.

#### Scenario: Displaying initialization progress

- **WHEN** executing initialization steps
- **THEN** validate environment silently in background (no output unless error)
- **AND** display progress with ora spinners:
  - Show spinner: "⠋ Creating OpenSpec structure..."
  - Then success: "✔ OpenSpec structure created"
  - Show spinner: "⠋ Configuring AI tools..."
  - Then success: "✔ AI tools configured"

### Requirement: Directory Creation

The command SHALL create the OpenSpec directory structure with config file.

#### Scenario: Creating OpenSpec structure

- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

### Requirement: AI Tool Configuration

该命令 SHALL 通过可搜索的多选交互为 AI 编码助手配置 skills 与 slash commands，同时尊重仅支持 skills 的工具。

#### Scenario: 提示选择 AI 工具

- **WHEN** 以交互模式运行
- **THEN** 显示带有 OpenSpec logo 的动画欢迎界面
- **AND** 提供展示所有可用工具的可搜索多选列表
- **AND** 用 `(configured ✓)` 标记已经配置过的工具
- **AND** 默认选中已配置工具，便于刷新
- **AND** 将已配置工具排序到列表前部
- **AND** 允许用户通过输入内容进行筛选搜索

#### Scenario: 选择要配置的工具

- **WHEN** 用户选择工具并确认
- **THEN** 为每个声明了 `skillsDir` 的已选工具在 `.<tool>/skills/` 目录下生成 skills
- **AND** 仅为仍支持 adapter-backed command generation 的已选工具生成 slash commands
- **AND** SHALL NOT 生成任何 Codex command 或 prompt 文件
- **AND** SHALL 将 Codex skills 视为 Codex 唯一生成的 workflow 承载面
- **AND** 使用默认 schema 设置创建 `openspec/config.yaml`

### Requirement: Interactive Mode
The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.
#### Scenario: Displaying interactive menu
- **WHEN** run in fresh or extend mode
- **THEN** present a looping select menu that lets users toggle tools with Space and review selections with Enter
- **AND** when Enter is pressed on a highlighted selectable tool that is not already selected, automatically add it to the selection before moving to review so the highlighted tool is configured
- **AND** label already configured tools with "(already configured)" while keeping disabled options marked "coming soon"
- **AND** change the prompt copy in extend mode to "Which AI tools would you like to add or refresh?"
- **AND** display inline instructions clarifying that Space toggles tools and Enter selects the highlighted tool before reviewing selections

### Requirement: Safety Checks
The command SHALL perform safety checks to prevent overwriting existing structures and ensure proper permissions.

#### Scenario: Detecting existing initialization
- **WHEN** the `openspec/` directory already exists
- **THEN** inform the user that OpenSpec is already initialized, skip recreating the base structure, and enter an extend mode
- **AND** continue to the AI tool selection step so additional tools can be configured
- **AND** display the existing-initialization error message only when the user declines to add any AI tools

### Requirement: Success Output

The command SHALL provide clear, actionable next steps upon successful initialization.

#### Scenario: Displaying success message

- **WHEN** initialization completes successfully
- **THEN** display categorized summary:
  - "Created: <tools>" for newly configured tools
  - "Refreshed: <tools>" for already-configured tools that were updated
  - Count of skills and commands generated
- **AND** display getting started section with:
  - `/opsx:new` - Start a new change
  - `/opsx:continue` - Create the next artifact
  - `/opsx:apply` - Implement tasks
- **AND** display links to documentation and feedback

#### Scenario: Displaying restart instruction

- **WHEN** initialization completes successfully and tools were created or refreshed
- **THEN** display instruction to restart IDE for slash commands to take effect

### Requirement: Exit Codes

The command SHALL use consistent exit codes to indicate different failure modes.

#### Scenario: Returning exit codes

- **WHEN** the command completes
- **THEN** return appropriate exit code:
  - 0: Success
  - 1: General error (including when OpenSpec directory already exists)
  - 2: Insufficient permissions (reserved for future use)
  - 3: User cancelled operation (reserved for future use)

### Requirement: Additional AI Tool Initialization
`openspec init` SHALL allow users to add configuration files for new AI coding assistants after the initial setup.

#### Scenario: Configuring an extra tool after initial setup
- **GIVEN** an `openspec/` directory already exists and at least one AI tool file is present
- **WHEN** the user runs `openspec init` and selects a different supported AI tool
- **THEN** generate that tool's configuration files with OpenSpec markers the same way as during first-time initialization
- **AND** leave existing tool configuration files unchanged except for managed sections that need refreshing
- **AND** exit with code 0 and display a success summary highlighting the newly added tool files

### Requirement: Documentation Language Capture
`openspec init` SHALL collect the documentation language for OpenSpec artifacts during interactive initialization and persist it to `openspec/config.yaml`.

#### Scenario: Setting documentation language during first-time init
- **WHEN** the user runs `openspec init` interactively in a new project and provides a documentation language value
- **THEN** the generated `openspec/config.yaml` includes that `docLanguage` value
- **AND** the value becomes the default language for OpenSpec artifact prose

#### Scenario: Updating documentation language in an existing project
- **GIVEN** an `openspec/` directory already exists
- **WHEN** the user runs `openspec init` interactively and provides a new documentation language value
- **THEN** the command updates `openspec/config.yaml` to store the new `docLanguage`
- **AND** the existing OpenSpec structure and configured tools remain unchanged

### Requirement: Success Output Enhancements
`openspec init` SHALL summarize tool actions when initialization or extend mode completes.

#### Scenario: Showing tool summary
- **WHEN** the command completes successfully
- **THEN** display a categorized summary of tools that were created, refreshed, or skipped (including already-configured skips)
- **AND** personalize the "Next steps" header using the names of the selected tools, defaulting to a generic label when none remain

### Requirement: Exit Code Adjustments
`openspec init` SHALL treat extend mode without new native tool selections as a successful refresh.

#### Scenario: Allowing empty extend runs
- **WHEN** OpenSpec is already initialized and the user selects no additional natively supported tools
- **THEN** complete successfully without requiring additional tool setup
- **AND** preserve the existing OpenSpec structure and config files
- **AND** exit with code 0

### Requirement: Non-Interactive Mode

The command SHALL support non-interactive operation through command-line options.

#### Scenario: Select all tools non-interactively

- **WHEN** run with `--tools all`
- **THEN** automatically select every available AI tool without prompting
- **AND** proceed with skill and command generation

#### Scenario: Select specific tools non-interactively

- **WHEN** run with `--tools claude,cursor`
- **THEN** parse the comma-separated tool IDs
- **AND** generate skills and commands for specified tools only

#### Scenario: Skip tool configuration non-interactively

- **WHEN** run with `--tools none`
- **THEN** create only the openspec directory structure
- **AND** skip skill and command generation
- **AND** create config only when config creation conditions are met

#### Scenario: Invalid tool specification

- **WHEN** run with `--tools invalid-tool`
- **THEN** fail with exit code 1
- **AND** display an error listing available values (`all`, `none`, and supported tool IDs)

#### Scenario: Reserved value combined with tool IDs

- **WHEN** run with `--tools all,claude` or `--tools none,cursor`
- **THEN** fail with exit code 1
- **AND** display an error explaining reserved values cannot be combined with specific tool IDs

#### Scenario: Missing --tools in non-interactive mode

- **GIVEN** prompts are unavailable in non-interactive execution
- **WHEN** user runs `openspec init` without `--tools`
- **THEN** fail with exit code 1
- **AND** instruct to use `--tools all`, `--tools none`, or explicit tool IDs

### Requirement: Generating skills for a tool SHALL preserve workflow-linked bootstrap skill identity
The command SHALL generate skill directories under `.<tool>/skills/` for workflows included in the active profile while preserving the internal workflow identity for bootstrap.

- **WHEN** a tool is selected during initialization
- **THEN** create skill directories under `.<tool>/skills/` for workflows included in the active profile
- **AND** the generated skill set SHALL include `openspec-bootstrap-opsx` when workflow `bootstrap-opsx` is selected
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Core mode excludes standalone sync surface
- **WHEN** the active mode is `core`
- **THEN** generated skills SHALL include only the workflows in the core preset
- **AND** the generated skill set SHALL NOT include `openspec-sync-specs`

#### Scenario: Expanded mode includes standalone sync surface
- **WHEN** the active mode is `expanded`
- **THEN** generated skills SHALL include the expanded workflow set
- **AND** the generated skill set SHALL include `openspec-sync-specs`

#### Scenario: Bootstrap remains separately selectable
- **WHEN** the active mode is `expanded`
- **THEN** initialization SHALL NOT generate `openspec-bootstrap-opsx` unless workflow `bootstrap-opsx` is explicitly selected

### Requirement: Slash Command Generation SHALL derive bootstrap artifacts from explicit command slug mapping

该命令 SHALL 基于显式的 workflow-to-command-slug 映射为所选 AI 工具生成 opsx slash command 文件，但仅适用于支持 adapter-backed command 制品的工具。

#### Scenario: 为 command-backed 工具生成斜杠命令

- **WHEN** 某个已选工具支持 adapter-backed command generation
- **THEN** 使用该工具的 command adapter 为当前 profile 包含的所有 workflow 创建 slash command 文件
- **AND** 当选择 `bootstrap-opsx` workflow 时，生成的命令集合 SHALL 包含 `/opsx:bootstrap`
- **AND** command 制品路径 SHALL 从显式 workflow-to-command-slug 映射推导，而不是假设 workflow ID 等于文件 basename
- **AND** 使用工具特定的路径约定，例如 Claude 的 `.claude/commands/opsx/`
- **AND** 包含工具特定的 frontmatter 格式

#### Scenario: Codex 使用 skills 而不是斜杠命令文件

- **WHEN** 在初始化过程中选择了 Codex
- **THEN** 系统 SHALL 在 `.codex/skills/` 下生成 workflow skills
- **AND** 系统 SHALL NOT 在项目内或全局 Codex prompt 目录下创建任何 command 制品
- **AND** 最终的 Codex workflow surface SHALL 仅由受管 skills 表示

#### Scenario: Bootstrap 命令路径具备跨平台安全性

- **WHEN** 在任意受支持操作系统上生成 bootstrap command 制品
- **THEN** 路径 SHALL 使用跨平台安全的路径工具构造
- **AND** 路径敏感的验证 SHALL 使用具备路径感知能力的断言，而不是硬编码分隔符

#### Scenario: Core 模式排除独立 sync 命令

- **WHEN** 初始化时选择了 command-backed 工具
- **AND** 当前 mode 为 `core`
- **THEN** 生成的 slash commands SHALL 仅包含 core preset 中的 workflows
- **AND** 生成的命令集合 SHALL NOT 包含 `/opsx:sync`

#### Scenario: Expanded 模式包含独立 sync 命令

- **WHEN** 初始化时选择了 command-backed 工具
- **AND** 当前 mode 为 `expanded`
- **THEN** 生成的 slash commands SHALL 包含 expanded workflow 集合
- **AND** 生成的命令集合 SHALL 包含 `/opsx:sync`

#### Scenario: Init 模式选择以确定性方式驱动 workflow 输出

- **WHEN** 初始化以显式 mode 选择运行
- **THEN** 最终生成的 workflow surface SHALL 与所选 mode 精确匹配
- **AND** 对同一组已选工具重复以相同 mode 初始化时，生成的制品集合 SHALL 收敛为相同结果

### Requirement: Config File Generation

The command SHALL create an OpenSpec config file with schema settings.

#### Scenario: Creating config.yaml

- **WHEN** initialization completes
- **AND** config.yaml does not exist
- **THEN** create `openspec/config.yaml` with default schema setting
- **AND** display config location in output

#### Scenario: Preserving existing config.yaml

- **WHEN** initialization runs in extend mode
- **AND** `openspec/config.yaml` already exists
- **THEN** preserve the existing config file
- **AND** display "(exists)" indicator in output

### Requirement: Experimental Command Alias

The command SHALL maintain backward compatibility with the experimental command.

#### Scenario: Running openspec experimental

- **WHEN** user runs `openspec experimental`
- **THEN** delegate to `openspec init`
- **AND** the command SHALL be hidden from help output

## Why

Manual creation of OpenSpec structure is error-prone and creates adoption friction. A standardized init command ensures:
- Consistent structure across all projects
- Proper AI instruction files are always included
- Quick onboarding for new projects
- Clear conventions from the start
