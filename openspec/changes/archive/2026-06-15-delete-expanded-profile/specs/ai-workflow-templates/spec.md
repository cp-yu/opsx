---
capabilities:
  - cap.ai.workflow-templates
---
# AI Workflow Templates 规约变更

## ADDED Requirements

### Requirement: 固定工作流模板集合

工作流模板注册表 SHALL 包含固定的 5 个核心工作流模板定义。

#### Scenario: 注册表包含固定的 5 个工作流

- **WHEN** 查询工作流模板注册表
- **THEN** 注册表 SHALL 包含以下 5 个工作流：
  - `propose`
  - `explore`
  - `apply`
  - `archive`
  - `bootstrap-opsx`
- **AND** 注册表 SHALL NOT 包含其他工作流

#### Scenario: 已删除工作流不在注册表中

- **WHEN** 查询工作流模板注册表
- **THEN** 注册表 SHALL NOT 包含以下工作流：
  - `new`
  - `continue`
  - `ff`
  - `verify`
  - `sync`
  - `bulk-archive`
  - `onboard`
