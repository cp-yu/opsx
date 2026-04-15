# Update Command Specification

## Purpose

As a developer using OpenSpec, I want to update the OpenSpec instructions in my project when new versions are released, so that I can benefit from improvements to AI agent instructions.
## Requirements
### Requirement: Update Behavior
The update command SHALL update OpenSpec instruction files to the latest templates in a team-friendly manner.

#### Scenario: Running update command
- **WHEN** a user runs `openspec update`
- **THEN** replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub (`AGENTS.md`/`CLAUDE.md`) exists, refresh it so it points to `@/openspec/AGENTS.md`

### Requirement: Prerequisites

The command SHALL require an existing OpenSpec structure before allowing updates.

#### Scenario: Checking prerequisites

- **GIVEN** the command requires an existing `openspec` directory (created by `openspec init`)
- **WHEN** the `openspec` directory does not exist
- **THEN** display error: "No OpenSpec directory found. Run 'openspec init' first."
- **AND** exit with code 1

### Requirement: File Handling
The update command SHALL handle file updates in a predictable and safe manner.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, update the managed block content so it keeps directing teammates to `@/openspec/AGENTS.md`

### Requirement: Tool-Agnostic Updates
The update command SHALL refresh OpenSpec-managed files in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update only the OpenSpec-managed sections inside existing AI tool files, leaving user-authored content untouched
- **AND** avoid creating new native-tool configuration files (slash commands, CLAUDE.md, etc.) unless they already exist

### Requirement: Core Files Always Updated
The update command SHALL always update the core OpenSpec files and display an ASCII-safe success message.

#### Scenario: Successful update
- **WHEN** the update completes successfully
- **THEN** replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, refresh it so it still directs contributors to `@/openspec/AGENTS.md`

### Requirement: Slash Command Updates

`update` 命令 SHALL 为已配置工具刷新现有的 slash command 文件而不创建新文件，同时排除受支持 OpenSpec 表面为 skills-only 的工具。

#### Scenario: 更新 Antigravity 的斜杠命令
- **WHEN** `.agent/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 刷新每个文件中由 OpenSpec 管理的部分，使 workflow 文案与其他工具保持一致，同时保留现有仅含 `description` 的 frontmatter
- **AND** 在 update 期间跳过创建任何缺失的 workflow 文件，与 Windsurf 及其他 IDE 的行为保持一致

#### Scenario: 更新 Claude Code 的斜杠命令
- **WHEN** `.claude/commands/openspec/` 中存在 `proposal.md`、`apply.md` 和 `archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 CodeBuddy Code 的斜杠命令
- **WHEN** `.codebuddy/commands/openspec/` 中存在 `proposal.md`、`apply.md` 和 `archive.md`
- **THEN** 使用共享的 CodeBuddy 模板刷新每个文件，该模板包含 `description` 与 `argument-hint` 字段的 YAML frontmatter
- **AND** 对 `argument-hint` 参数使用方括号格式，例如 `[change-id]`
- **AND** 保留 OpenSpec managed markers 之外的所有用户自定义内容

#### Scenario: 更新 Cline 的斜杠命令
- **WHEN** `.clinerules/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 包含 Cline 特有的 Markdown heading frontmatter
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Continue 的斜杠命令
- **WHEN** `.continue/prompts/` 中存在 `openspec-proposal.prompt`、`openspec-apply.prompt` 和 `openspec-archive.prompt`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Crush 的斜杠命令
- **WHEN** `.crush/commands/` 中存在 `openspec/proposal.md`、`openspec/apply.md` 和 `openspec/archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 包含带 OpenSpec category 和 tags 的 Crush 专用 frontmatter
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Cursor 的斜杠命令
- **WHEN** `.cursor/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Factory Droid 的斜杠命令
- **WHEN** `.factory/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享的 Factory 模板刷新每个文件，该模板包含 `description` 与 `argument-hint` 字段的 YAML frontmatter
- **AND** 确保模板正文保留 `$ARGUMENTS` 占位符，使用户输入继续传递给 droid
- **AND** 仅更新 OpenSpec managed markers 内的内容，不触碰未受管备注
- **AND** 在 update 期间跳过创建缺失文件

#### Scenario: 更新 OpenCode 的斜杠命令
- **WHEN** `.opencode/command/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 确保 archive command 在 frontmatter 中包含 `$ARGUMENTS` 占位符，以接收 change ID 参数

#### Scenario: 更新 Windsurf 的斜杠命令
- **WHEN** `.windsurf/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用包裹在 OpenSpec markers 中的共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 跳过创建缺失文件，因为 update 命令只刷新已经存在的文件

#### Scenario: 更新 Kilo Code 的斜杠命令
- **WHEN** `.kilocode/workflows/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用包裹在 OpenSpec markers 中的共享模板刷新每个文件
- **AND** 确保模板包含对应 workflow 阶段的指令
- **AND** 跳过创建缺失文件，因为 update 命令只刷新已经存在的文件

#### Scenario: 更新 Codex 时保持仅使用 skills
- **WHEN** 用户在配置为使用 Codex 的项目中运行 `openspec update`
- **THEN** 在 `.codex/skills/` 下存在受管 skills 时刷新它们
- **AND** SHALL NOT 刷新、创建或要求任何 Codex command 或 prompt 文件
- **AND** SHALL 将缺失的 Codex command 文件视为预期行为，而不是“跳过刷新”的条件

#### Scenario: 更新 GitHub Copilot 的斜杠命令
- **WHEN** `.github/prompts/` 中存在 `openspec-proposal.prompt.md`、`openspec-apply.prompt.md` 和 `openspec-archive.prompt.md`
- **THEN** 在保留 YAML frontmatter 的同时使用共享模板刷新每个文件
- **AND** 仅更新 markers 之间由 OpenSpec 管理的代码块
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 更新 Gemini CLI 的斜杠命令
- **WHEN** `.gemini/commands/openspec/` 中存在 `proposal.toml`、`apply.toml` 和 `archive.toml`
- **THEN** 使用共享的 proposal/apply/archive 模板刷新每个文件的正文
- **AND** 仅替换 `prompt = """` 代码块内 `<!-- OPENSPEC:START -->` 与 `<!-- OPENSPEC:END -->` markers 之间的内容，以保持 TOML 外层结构如 `description`、`prompt` 不变
- **AND** 在 update 期间跳过创建缺失的 `.toml` 文件，只刷新原本就存在的 Gemini commands

#### Scenario: 更新 iFlow CLI 的斜杠命令
- **WHEN** `.iflow/commands/` 中存在 `openspec-proposal.md`、`openspec-apply.md` 和 `openspec-archive.md`
- **THEN** 使用共享模板刷新每个文件
- **AND** 保留包含 `name`、`id`、`category`、`description` 字段的 YAML frontmatter
- **AND** 仅更新 markers 之间由 OpenSpec 管理的代码块
- **AND** 确保模板包含对应 workflow 阶段的指令

#### Scenario: 缺失斜杠命令文件
- **WHEN** 某个工具缺少 slash command 文件
- **THEN** 在 update 期间不创建新文件

### Requirement: Archive Command Argument Support
The archive slash command template SHALL support optional change ID arguments for tools that support `$ARGUMENTS` placeholder.

#### Scenario: Archive command with change ID argument
- **WHEN** a user invokes `/openspec:archive <change-id>` with a change ID
- **THEN** the template SHALL instruct the AI to validate the provided change ID against `openspec list`
- **AND** use the provided change ID for archiving if valid
- **AND** fail fast if the provided change ID doesn't match an archivable change

#### Scenario: Archive command without argument (backward compatibility)
- **WHEN** a user invokes `/openspec:archive` without providing a change ID
- **THEN** the template SHALL instruct the AI to identify the change ID from context or by running `openspec list`
- **AND** proceed with the existing behavior (maintaining backward compatibility)

#### Scenario: OpenCode archive template generation
- **WHEN** generating the OpenCode archive slash command file
- **THEN** include the `$ARGUMENTS` placeholder in the frontmatter
- **AND** wrap it in a clear structure like `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` to indicate the expected argument
- **AND** include validation steps in the template body to check if the change ID is valid

### Requirement: 工具感知的更新提示
`openspec update` SHALL 使用已刷新 workflow surface 的实际调用语法来展示 onboarding 与 restart guidance。

#### Scenario: 刷新 Codex skills 时显示精确的 skill 调用名
- **WHEN** `openspec update` 刷新或新配置了受管的 Codex workflow skills
- **THEN** 所有 getting-started 或 onboarding guidance SHALL 使用精确的受管 Codex skill 调用名，例如 `$openspec-propose`、`$openspec-new-change`、`$openspec-continue-change` 与 `$openspec-apply-change`
- **AND** 显示给用户的 Codex 引用 SHALL 使用 workflow 的 `skillDirName`，而不是 command slug
- **AND** SHALL NOT tell the user to run `/opsx:*`

#### Scenario: skills-only 重启提示避免 slash-command 文案
- **WHEN** `openspec update` 完成时仅刷新了 skills-only workflow surface
- **THEN** 所有 restart guidance SHALL 描述为刷新的 skills 或 workflow files 生效
- **AND** SHALL NOT mention slash commands taking effect

#### Scenario: command-backed onboarding 保持 command 语法
- **WHEN** `openspec update` 为 command-backed workflow surface 输出 onboarding guidance
- **THEN** 这些 guidance SHALL 对被引用的 workflow 入口继续使用该工具原本的 command 语法

## Edge Cases

### Requirement: Error Handling

The command SHALL handle edge cases gracefully.

#### Scenario: File permission errors

- **WHEN** file write fails
- **THEN** let the error bubble up naturally with file path

#### Scenario: Missing AI tool files

- **WHEN** an AI tool configuration file doesn't exist
- **THEN** skip updating that file
- **AND** do not create it

#### Scenario: Custom directory names

- **WHEN** considering custom directory names
- **THEN** not supported in this change
- **AND** the default directory name `openspec` SHALL be used

## Success Criteria

Users SHALL be able to:
- Update OpenSpec instructions with a single command
- Get the latest AI agent instructions
- See clear confirmation of the update

The update process SHALL be:
- Simple and fast (no version checking)
- Predictable (same result every time)
- Self-contained (no network required)
