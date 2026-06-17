---
capabilities:
  - cap.cli.update
---
# Update Command Specification

## Purpose

As a developer using OpenSpec, I want to update the OpenSpec instructions in my project when new versions are released, so that I can benefit from improvements to AI agent instructions.
## Requirements
### Requirement: Update Behavior

该命令 SHALL 根据全局配置刷新项目中的 OpenSpec skills 指令文件。

#### Scenario: 刷新现有工具制品

- **WHEN** 项目中已配置 AI 工具
- **THEN** 检测已安装的工具 skills 目录
- **AND** 为检测到的每个工具重新生成固定 workflow skills
- **AND** 使用相同的模板生成逻辑
- **AND** 显示更新摘要，列出刷新的工具
- **AND** SHALL NOT refresh slash command workflow artifacts

#### Scenario: 清理过时配置字段

- **WHEN** 全局配置包含 `profile`、`workflows` 或 `delivery` 字段
- **THEN** 自动删除这些字段
- **AND** 保存清理后的配置
- **AND** 输出警告："已移除过时配置字段：profile, workflows, delivery"
- **AND** 输出提示："现在固定安装 workflow skills"

#### Scenario: 项目配置默认值迁移

- **WHEN** 项目 `openspec/config.yaml` 缺少功能性默认值
- **THEN** 以 missing-only 方式补齐默认值
- **AND** SHALL NOT 覆盖用户已设置的值
- **AND** 删除陈旧的 `git.merge.messageFrom`, `git.autoCommit` 与 `commitMessage.convention` 节点
- **AND** 补齐新的 git 功能性默认结构

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
The update command SHALL refresh OpenSpec-managed skills in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update OpenSpec-managed skill files for configured AI tools
- **AND** avoid creating new native-tool configuration files such as slash commands or CLAUDE.md unless they are part of existing non-workflow OpenSpec behavior
- **AND** SHALL NOT refresh existing slash command workflow files

### Requirement: Core Files Always Updated
The update command SHALL always update the core OpenSpec files and display an ASCII-safe success message.

#### Scenario: Successful update
- **WHEN** the update completes successfully
- **THEN** replace `openspec/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, refresh it so it still directs contributors to `@/openspec/AGENTS.md`

### Requirement: Slash Command Updates

**Reason**: OpenSpec update no longer maintains slash command workflow artifacts.
**Migration**: Use generated workflow skills. Existing command files may remain on disk and are outside update maintenance.

### Requirement: Archive Command Argument Support

**Reason**: Archive slash command templates are no longer generated or refreshed by OpenSpec.
**Migration**: Invoke the archive workflow skill and provide the change ID through the tool's skill interaction model.

### Requirement: 工具感知的更新提示
`openspec update` SHALL 使用已刷新 workflow skills 的调用语义来展示 onboarding 与 restart guidance。

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

### Requirement: Update respects global profile config

The update command SHALL refresh the fixed workflow skill set and SHALL ignore removed global profile, workflow, and delivery settings.

#### Scenario: Update adds missing workflows from config

- **WHEN** user runs `openspec update`
- **AND** global config specifies workflows not currently installed in the project
- **THEN** the system SHALL ignore the removed workflows setting
- **AND** generate missing fixed workflow skill files
- **AND** display added skill workflows when applicable

#### Scenario: Update refreshes existing workflows

- **WHEN** user runs `openspec update`
- **AND** workflows are already installed in the project
- **THEN** the system SHALL refresh those workflow skill files with latest templates
- **AND** display refreshed workflow names when applicable

#### Scenario: Update with no changes needed

- **WHEN** user runs `openspec update`
- **AND** installed skills match the fixed workflow set
- **AND** all templates are current
- **THEN** the system SHALL display: "Already up to date."

#### Scenario: Profile or delivery drift with current templates

- **WHEN** user runs `openspec update`
- **AND** workflow templates are current for the installed skills
- **AND** global config contains removed profile, workflows, or delivery fields
- **THEN** the system SHALL treat stale config cleanup as an update-required state
- **AND** SHALL NOT add or remove command files

#### Scenario: Update summary output

- **WHEN** update completes with changes
- **THEN** the system SHALL display a summary of added or updated skills
- **AND** the system SHALL list affected tools
- **AND** the summary SHALL NOT report command files as generated, refreshed, or removed

### Requirement: Update respects delivery setting

**Reason**: The `delivery` setting is removed.
**Migration**: `openspec update` always refreshes skills and ignores stale `delivery` fields.

### Requirement: Update detects configured tools from skills or commands

The update command SHALL treat a tool as configured only when it has generated OpenSpec skill files.

#### Scenario: Commands-only installation

- **WHEN** user runs `openspec update`
- **AND** a tool has generated OpenSpec command files
- **AND** that tool has no OpenSpec skill files
- **THEN** the tool SHALL NOT be treated as configured from command files alone
- **AND** the system SHALL NOT refresh or remove those command files

### Requirement: Update detects new tool directories
The update command SHALL notify the user if new AI tool directories are detected that aren't currently configured.

#### Scenario: New tool directory detected
- **WHEN** user runs `openspec update`
- **AND** a new tool directory is detected (e.g., `.windsurf/` exists but Windsurf is not configured)
- **THEN** the system SHALL display: "Detected new tool: Windsurf. Run 'openspec init' to add it."
- **THEN** the system SHALL NOT automatically add the new tool
- **THEN** the system SHALL proceed with update for currently configured tools only

#### Scenario: Multiple new tool directories detected
- **WHEN** user runs `openspec update`
- **AND** multiple new tool directories are detected (e.g., `.github/` and `.windsurf/` exist but neither tool is configured)
- **THEN** the system SHALL display one consolidated message listing all detected tools, for example: "Detected new tools: GitHub Copilot, Windsurf. Run 'openspec init' to add them."
- **THEN** the system SHALL NOT automatically add any new tools
- **THEN** the system SHALL proceed with update for currently configured tools only

#### Scenario: No new tool directories
- **WHEN** user runs `openspec update`
- **AND** no new tool directories are detected
- **THEN** the system SHALL NOT display any tool detection message

### Requirement: Update requires an OpenSpec project
The update command SHALL only run inside an initialized OpenSpec project.

#### Scenario: Update outside a project
- **WHEN** user runs `openspec update`
- **AND** no `openspec/` directory exists in the current working directory
- **THEN** the system SHALL display: "No OpenSpec project found. Run 'openspec init' to set up."
- **THEN** the system SHALL exit with code 1

### Requirement: Extra workflows synchronized to active profile

The update command SHALL remove managed skill workflow files that are no longer part of the fixed workflow set.

#### Scenario: Deselected workflows from previous profile

- **WHEN** user runs `openspec update`
- **AND** project has managed skill workflows not in the fixed workflow set
- **THEN** the system SHALL delete those managed skill workflow files
- **AND** the system SHALL keep only workflows currently selected by the fixed manifest
- **AND** SHALL NOT delete command workflow files

#### Scenario: Delivery change with extra workflows

- **WHEN** user runs `openspec update`
- **AND** global config contains a removed `delivery` field
- **AND** project has extra managed skill workflows not in the fixed workflow set
- **THEN** the system SHALL delete only managed skill files for extra workflows
- **AND** SHALL NOT delete command files because delivery cleanup is not supported

### Requirement: Migrate project config defaults

`openspec update` SHALL migrate project configuration defaults for existing OpenSpec projects by materializing missing functional defaults in `openspec/config.yaml` or `openspec/config.yml` without overwriting user-authored values, except it SHALL remove the obsolete `git.merge.messageFrom`, `git.autoCommit`, `git.archive.commitMessage.convention`, and `git.merge.commitMessage.convention` fields.

#### Scenario: Create config when missing

- **WHEN** a project has an `openspec/` directory
- **AND** neither `openspec/config.yaml` nor `openspec/config.yml` exists
- **AND** the user runs `openspec update`
- **THEN** the command SHALL create `openspec/config.yaml`
- **AND** the created file SHALL include `schema: spec-driven`
- **AND** the created file SHALL include `optimization.enabled: true`
- **AND** the created file SHALL include `optimization.optRetries: 2`
- **AND** the created file SHALL include `apply.defaultIsolation: ask`
- **AND** the created file SHALL include `git.merge.strategy: no-ff`
- **AND** the created file SHALL include `git.branch.deleteAfterArchive: false`
- **AND** the created file SHALL NOT include `git.autoCommit`
- **AND** the created file SHALL NOT include `git.archive.commitMessage.convention`
- **AND** the created file SHALL NOT include `git.merge.commitMessage.convention`
- **AND** the created file SHALL NOT include `git.merge.messageFrom`

#### Scenario: Add missing top-level defaults

- **WHEN** `openspec/config.yaml` exists with valid YAML object content that lacks `optimization`, `apply`, and `git`
- **AND** the user runs `openspec update`
- **THEN** the command SHALL add the `optimization` default node
- **AND** the command SHALL add the `apply` default node
- **AND** the command SHALL add the `git` default node
- **AND** the command SHALL preserve existing fields such as `schema`, `docLanguage`, `context`, and `rules`
- **AND** the command SHALL preserve user-authored values outside the inserted defaults

#### Scenario: Add missing nested defaults without overwriting existing values

- **WHEN** `openspec/config.yaml` contains `optimization.enabled: false`
- **AND** contains `apply.defaultIsolation: worktree`
- **AND** contains `git.merge.strategy: squash`
- **AND** lacks `optimization.optRetries` and `git.branch.deleteAfterArchive`
- **AND** the user runs `openspec update`
- **THEN** the command SHALL keep `optimization.enabled: false`
- **AND** the command SHALL keep `apply.defaultIsolation: worktree`
- **AND** the command SHALL keep `git.merge.strategy: squash`
- **AND** the command SHALL add `optimization.optRetries: 2`
- **AND** the command SHALL add `git.branch.deleteAfterArchive: false`

#### Scenario: Remove obsolete git fields

- **WHEN** `openspec/config.yaml` contains any of `git.merge.messageFrom`, `git.autoCommit`, `git.archive.commitMessage.convention`, or `git.merge.commitMessage.convention`
- **AND** the user runs `openspec update`
- **THEN** the command SHALL remove those obsolete fields
- **AND** SHALL NOT map their values to any new field
- **AND** SHALL materialize missing new git defaults
- **AND** SHALL preserve other user-authored `git` fields including `git.commitMessage.*` path overrides

#### Scenario: Migrate config.yml alias

- **WHEN** `openspec/config.yaml` does not exist
- **AND** `openspec/config.yml` exists with valid YAML object content
- **AND** the user runs `openspec update`
- **THEN** the command SHALL migrate `openspec/config.yml`
- **AND** SHALL NOT create a second `openspec/config.yaml`

#### Scenario: Skip invalid config without blocking tool refresh

- **WHEN** `openspec/config.yaml` contains invalid YAML or a non-object YAML document
- **AND** the user runs `openspec update`
- **THEN** the command SHALL leave that config file unchanged
- **AND** the command SHALL warn that project config default migration was skipped
- **AND** the command SHALL continue with configured tool artifact refresh

#### Scenario: Migrate project config paths on Windows

- **WHEN** `openspec update` migrates `openspec/config.yaml` or `openspec/config.yml` on Windows
- **THEN** the command SHALL build config paths with Node.js path utilities
- **AND** SHALL remove obsolete git fields and add new defaults with the same behavior as Unix systems

### Requirement: 固定工作流更新

该命令 SHALL 固定更新 5 个核心工作流，无需读取 profile 配置。

#### Scenario: 固定更新 5 个工作流

- **WHEN** 用户运行 `openspec update`
- **THEN** 系统 SHALL 为所有检测到的工具固定更新以下 5 个工作流：
  - `propose`
  - `explore`
  - `apply`
  - `archive`
  - `bootstrap-opsx`
- **AND** 系统 SHALL NOT 读取全局配置中的 `profile` 或 `workflows` 字段
- **AND** 系统 SHALL 删除不在固定 5 个工作流列表中的 skill 文件

#### Scenario: 清理 expanded 工作流残留

- **WHEN** 项目中存在已废弃的 expanded 工作流 skill 文件
- **THEN** 系统 SHALL 删除以下 skill 目录：
  - `openspec-new-change`
  - `openspec-continue-change`
  - `openspec-ff-change`
  - `openspec-verify-change`
  - `openspec-sync-specs`
  - `openspec-bulk-archive-change`
  - `openspec-onboard`
- **AND** 输出清理摘要："已清理 7 个废弃工作流"

## Edge Cases

### Error Handling

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
