## MODIFIED Requirements

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

### Requirement: Init respects global config

The init command SHALL read global config values that still exist and SHALL ignore removed workflow selection fields.

#### Scenario: User has profile preference

- **WHEN** global config contains `profile: "custom"` with custom workflows
- **THEN** init SHALL ignore the profile value
- **AND** init SHALL continue fixed workflow installation

#### Scenario: User has delivery preference

- **WHEN** global config contains `delivery: "skills"`, `delivery: "commands"`, or `delivery: "both"`
- **THEN** init SHALL ignore the delivery value
- **AND** init SHALL install skills only
- **AND** init SHALL NOT remove existing command files

#### Scenario: Override via flags

- **WHEN** user runs `openspec init --profile core`
- **THEN** the system SHALL reject the flag according to fixed workflow installation behavior

#### Scenario: Invalid profile override

- **WHEN** user runs `openspec init --profile <invalid>`
- **THEN** the system SHALL reject the flag according to fixed workflow installation behavior

### Requirement: Init preserves existing workflows

The init command SHALL NOT remove workflows that are already installed, and SHALL refresh the fixed skill workflow set.

#### Scenario: Existing custom installation

- **WHEN** user has extra workflow skills and runs `openspec init`
- **THEN** the system SHALL NOT remove extra workflow skills
- **AND** the system SHALL regenerate fixed workflow skill files, overwriting existing managed skill content with latest templates

#### Scenario: Init with different delivery setting

- **WHEN** user runs `openspec init` on existing project
- **AND** global config contains any `delivery` value
- **THEN** the system SHALL generate skills only
- **AND** the system SHALL NOT delete command files because delivery cleanup is not supported

#### Scenario: Re-init with current templates

- **WHEN** user runs `openspec init` on an existing project
- **AND** existing skill files are already on current template versions
- **THEN** the system SHALL keep the project skills-only managed surface current
- **AND** the system SHALL NOT perform command file cleanup

## REMOVED Requirements

### Requirement: Slash Command Generation SHALL derive bootstrap artifacts from explicit command slug mapping

**Reason**: OpenSpec workflow delivery is skills-only.
**Migration**: Use generated workflow skills and skill invocation guidance. Existing command files may remain on disk, but OpenSpec no longer generates or refreshes them.
