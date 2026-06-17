## MODIFIED Requirements

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

### Requirement: Tool-Agnostic Updates

The update command SHALL refresh OpenSpec-managed skills in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files

- **WHEN** updating files
- **THEN** completely replace `openspec/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update OpenSpec-managed skill files for configured AI tools
- **AND** avoid creating new native-tool configuration files such as slash commands or CLAUDE.md unless they are part of existing non-workflow OpenSpec behavior
- **AND** SHALL NOT refresh existing slash command workflow files

### Requirement: 工具感知的更新提示

`openspec update` SHALL 使用已刷新 workflow skills 的调用语义来展示 onboarding 与 restart guidance。

#### Scenario: 刷新 Codex skills 时显示精确的 skill 调用名

- **WHEN** `openspec update` 刷新或新配置了受管的 Codex workflow skills
- **THEN** 所有 getting-started 或 onboarding guidance SHALL 使用精确的受管 Codex skill 调用名，例如 `$openspec-propose`、`$openspec-new-change`、`$openspec-continue-change` 与 `$openspec-apply-change`
- **AND** 显示给用户的 Codex 引用 SHALL 使用 workflow 的 `skillDirName`，而不是 command slug
- **AND** SHALL NOT tell the user to run `/opsx:*`

#### Scenario: skills-only 重启提示避免 slash-command 文案

- **WHEN** `openspec update` 完成时刷新了 workflow skills
- **THEN** 所有 restart guidance SHALL 描述为刷新的 skills 或 workflow files 生效
- **AND** SHALL NOT mention slash commands taking effect

#### Scenario: 无精确 skill 调用语法时使用中性文案

- **WHEN** `openspec update` 为没有精确 skill invocation metadata 的工具输出 onboarding guidance
- **THEN** guidance SHALL 使用中性 skill invocation 文案
- **AND** SHALL reference the explicit `skillDirName`
- **AND** SHALL NOT fall back to command syntax

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

### Requirement: Update detects configured tools from skills or commands

The update command SHALL treat a tool as configured only when it has generated OpenSpec skill files.

#### Scenario: Commands-only installation

- **WHEN** user runs `openspec update`
- **AND** a tool has generated OpenSpec command files
- **AND** that tool has no OpenSpec skill files
- **THEN** the tool SHALL NOT be treated as configured from command files alone
- **AND** the system SHALL NOT refresh or remove those command files

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

## REMOVED Requirements

### Requirement: Slash Command Updates

**Reason**: OpenSpec update no longer maintains slash command workflow artifacts.
**Migration**: Use generated workflow skills. Existing command files may remain on disk and are outside update maintenance.

### Requirement: Archive Command Argument Support

**Reason**: Archive slash command templates are no longer generated or refreshed by OpenSpec.
**Migration**: Invoke the archive workflow skill and provide the change ID through the tool's skill interaction model.

### Requirement: Update respects delivery setting

**Reason**: The `delivery` setting is removed.
**Migration**: `openspec update` always refreshes skills and ignores stale `delivery` fields.
