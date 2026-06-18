---
capabilities:
  - cap.cli.init
---
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
- **AND** write `openspec/config.yaml` using the current functional project config defaults
- **AND** the generated config SHALL include `optimization.enabled: true`
- **AND** the generated config SHALL include `optimization.optRetries: 2`
- **AND** the generated config SHALL include `apply.defaultIsolation: ask`
- **AND** the generated config SHALL render the apply default line as `defaultIsolation: ask  # ask / branch / worktree / none`
- **AND** the generated config SHALL include `git.merge.strategy: no-ff`
- **AND** the generated config SHALL include `git.branch.deleteAfterArchive: false`
- **AND** the generated config SHALL NOT include `git.autoCommit`
- **AND** the generated config SHALL NOT include `git.archive.commitMessage.convention`
- **AND** the generated config SHALL NOT include `git.merge.commitMessage.convention`
- **AND** the generated config SHALL NOT include `git.merge.messageFrom`

#### Scenario: Creating OpenSpec structure on Windows

- **WHEN** `openspec init` is executed on Windows
- **THEN** build the `openspec/config.yaml` path using Node.js path utilities
- **AND** write the same default YAML fields as on Unix systems

### Requirement: AI Tool Configuration

该命令 SHALL 通过可搜索的多选交互为 AI 编码助手配置 skills。OpenSpec SHALL NOT 在初始化期间生成 slash command workflow artifacts。

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
- **THEN** 为每个声明了 `skillsDir` 的已选工具在 `.<tool>/skills/` 目录下生成固定 workflow skills
- **AND** SHALL NOT 生成任何 slash command、prompt command 或 adapter-backed command 制品
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

该命令在成功后 SHALL 显示简洁的摘要，描述已创建的内容及下一步操作。

#### Scenario: 显示成功摘要

- **WHEN** 初始化成功完成
- **THEN** 显示摘要，包括：
  - OpenSpec 结构创建确认
  - 已配置的 AI 工具列表
  - 为每个工具生成的 skills
- **AND** 显示固定的 getting started 引导块，使用 skill invocation guidance 作为第一步
- **AND** SHALL NOT 将 `/opsx:*` 作为 getting started 入口
- **AND** SHALL NOT 展示 commands 或 both 作为生成制品类型

#### Scenario: Bootstrap workflow 引导

- **WHEN** `bootstrap-opsx` workflow 包含在固定工作流中且非 extend 模式时
- **THEN** 成功输出 SHALL 在 getting started 区块之后包含显式的 bootstrap 引导行

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
- **AND** proceed with skill generation
- **AND** SHALL NOT generate command artifacts

#### Scenario: Select specific tools non-interactively

- **WHEN** run with `--tools claude,cursor`
- **THEN** parse the comma-separated tool IDs
- **AND** generate skills for specified tools only
- **AND** SHALL NOT generate command artifacts

#### Scenario: Skip tool configuration non-interactively

- **WHEN** run with `--tools none`
- **THEN** create only the openspec directory structure
- **AND** skip skill generation
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

### Requirement: Tool auto-detection
The init command SHALL detect installed AI tools by scanning for their configuration directories in the project root.

#### Scenario: Detection from directories
- **WHEN** scanning for tools
- **THEN** the system SHALL check for directories matching each supported AI tool's configuration directory (e.g., `.claude/`, `.cursor/`, `.windsurf/`)
- **THEN** all tools with a matching directory SHALL be returned as detected

#### Scenario: Detection covers all supported tools
- **WHEN** scanning for tools
- **THEN** the system SHALL check for all tools defined in the supported tools configuration that have a configuration directory

#### Scenario: No tools detected
- **WHEN** no tool configuration directories exist in project root
- **THEN** the system SHALL return an empty list of detected tools

### Requirement: Init tool confirmation UX
The init command SHALL show detected tools and ask for confirmation.

#### Scenario: Confirmation prompt
- **WHEN** tools are detected in interactive mode
- **THEN** the system SHALL display: "Detected: Claude Code, Cursor"
- **THEN** the system SHALL show pre-selected checkboxes for confirmation
- **THEN** the system SHALL allow user to deselect unwanted tools

### Requirement: 固定工作流安装

该命令 SHALL 固定安装工作流 skills，无需用户配置或选择。

#### Scenario: 固定安装工作流

- **WHEN** 用户运行 `openspec init`
- **THEN** 系统 SHALL 为所选工具生成固定 workflow manifest 中声明的 skills
- **AND** 系统 SHALL NOT 接受 `--profile` 参数
- **AND** 系统 SHALL NOT 根据全局配置选择工作流

#### Scenario: 拒绝 profile 参数

- **WHEN** 用户运行 `openspec init --profile <any-value>`
- **THEN** 系统 SHALL 输出错误消息，说明 `--profile` 参数已删除且 OpenSpec 现在固定安装工作流 skills
- **AND** 退出码 SHALL 为 1

#### Scenario: 忽略全局配置中的 profile 字段

- **WHEN** 全局配置文件包含过时的 `profile` 或 `workflows` 字段
- **THEN** 系统 SHALL 忽略这些字段
- **AND** 系统 SHALL 输出警告："检测到过时配置字段：profile/workflows。运行 'openspec update' 清理。"
- **AND** 继续固定安装 5 个工作流

## Why

Manual creation of OpenSpec structure is error-prone and creates adoption friction. A standardized init command ensures:
- Consistent structure across all projects
- Proper AI instruction files are always included
- Quick onboarding for new projects
- Clear conventions from the start
