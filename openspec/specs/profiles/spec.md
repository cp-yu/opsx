## Purpose

Profile selection is removed. The active contract only preserves the absence of the old profile surface.
## Requirements
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
