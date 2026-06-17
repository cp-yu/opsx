## Purpose

Profiles SHALL define which workflows to install, enabling a streamlined core experience for new users while allowing power users to customize their workflow selection.
## Requirements
### Requirement: Profile definitions
The system SHALL support two workflow profiles: `core` and `custom`.

#### Scenario: Core profile contents
- **WHEN** profile is set to `core`
- **THEN** the profile SHALL include workflows: `propose`, `explore`, `apply`, `archive`

#### Scenario: Custom profile contents
- **WHEN** profile is set to `custom`
- **THEN** the profile SHALL include only the workflows specified in global config `workflows` array

### Requirement: Profile defaults
The system SHALL use `core` as the default profile for new users, while preserving existing users' workflows via migration.

#### Scenario: No global config exists (new user)
- **WHEN** global config file does not exist
- **AND** no existing workflows are installed in the project
- **THEN** the system SHALL behave as if profile is `core`

#### Scenario: Global config exists but profile field absent (new user)
- **WHEN** global config file exists but does not contain a `profile` field
- **AND** no existing workflows are installed in the project
- **THEN** the system SHALL behave as if profile is `core`

#### Scenario: Profile field absent with existing workflows (existing user migration)
- **WHEN** global config does not contain a `profile` field
- **AND** the `update` command detects existing workflow files in the project
- **THEN** the system SHALL perform one-time migration (see `specs/cli-update/spec.md` for details)
- **THEN** the system SHALL set profile to `custom` with the detected workflows
- **THEN** the system SHALL NOT add or remove any workflow files during migration

### Requirement: Profile 系统已删除

系统 SHALL NOT 支持 profile 配置，profile 系统已完全删除。

#### Scenario: 无 profile 配置

- **WHEN** 系统初始化或更新工作流
- **THEN** 系统 SHALL 固定使用全部 WorkflowManifestRegistry entries
- **AND** 系统 SHALL NOT 读取或解析 profile 配置
- **AND** src/core/profiles.ts 文件 SHALL NOT 存在

#### Scenario: Profile 相关函数不存在

- **WHEN** 代码尝试导入 profile 相关函数
- **THEN** getProfileWorkflows 函数 SHALL NOT 存在
- **AND** CORE_WORKFLOWS 常量 SHALL NOT 存在
- **AND** EXPANDED_WORKFLOWS 常量 SHALL NOT 存在

