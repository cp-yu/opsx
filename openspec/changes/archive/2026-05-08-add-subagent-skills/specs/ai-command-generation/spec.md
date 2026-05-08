## ADDED Requirements

### Requirement: WorkflowManifestEntry.getCommandTemplate 改为 optional
`WorkflowManifestEntry` 接口中 `getCommandTemplate` 字段 SHALL 从 required 改为 optional（`getCommandTemplate?: () => CommandTemplate`）。

命令生成管线（`getCommandTemplates()`、`getCommandContents()`）SHALL 过滤掉 `getCommandTemplate` 为 undefined 的 entry，仅对定义了该函数的 entry 生成命令文件。

#### Scenario: 无 getCommandTemplate 的 entry 跳过命令生成
- **WHEN** manifest registry 中存在 `getCommandTemplate` 为 undefined 的 entry
- **THEN** `getCommandTemplates()` SHALL 在过滤时排除该 entry
- **AND** SHALL NOT 抛出异常或产生 undefined 命令

#### Scenario: 现有 entry 行为不变
- **WHEN** 所有现有 manifest entry 的 `getCommandTemplate` 均被定义
- **THEN** 命令生成行为 SHALL 与修改前完全一致
- **AND** 所有现有 slash command SHALL 继续生成

### Requirement: 命令列表排除内部 skill
所有消费命令列表的组件（CLI 补全、工具检测、迁移清理）SHALL NOT 将内部 skill（`openspec-reviewer`、`openspec-optimizer`）暴露为可用命令。

命令 slug 列表 SHALL 仅包含 workflow surface 中的 command slug，MUST NOT 包含内部 skill 名称。

#### Scenario: CLI 补全不提示内部 skill
- **WHEN** 用户触发 shell 补全以查看可用 OpenSpec 命令
- **THEN** 补全列表 SHALL NOT 包含 `reviewer` 或 `optimizer`
- **AND** 仅包含面向用户的 workflow 命令

#### Scenario: 迁移清理不尝试删除内部 skill 的 command
- **WHEN** 系统在 update 后清理旧版 command 文件
- **THEN** managed command slugs 列表 SHALL NOT 包含内部 skill 名称
- **AND** SHALL NOT 尝试访问不存在的内部 skill command 文件