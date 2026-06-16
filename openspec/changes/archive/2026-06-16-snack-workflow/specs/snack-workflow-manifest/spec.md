---
capabilities:
  - cap.ai.snack-workflow-manifest
---

## ADDED Requirements

### Requirement: WorkflowManifestRegistry 注册 snack

WorkflowManifestRegistry SHALL 包含 snack workflow manifest entry，与现有 5 个核心工作流平行。

#### Scenario: 注册 snack manifest entry

- **WHEN** WorkflowManifestRegistry 初始化
- **THEN** MANIFEST_ENTRIES 数组包含 snack entry：
  - `workflowId: 'snack'`
  - `modeMembership: ['core']`
  - `skillDirName: 'openspec-snack'`
  - `skillName: 'openspec-snack'`
  - `commandSlug: 'snack'`
  - `promptMeta.name: 'Snack sync'`
  - `promptMeta.description: 'Quick sync from code to specs'`
  - `getSkillTemplate: getSnackSkillTemplate`
  - 不提供 `getCommandTemplate`（snack 为 skill-only 工作流）

### Requirement: 6 个工作流架构

系统 SHALL 支持 6 个核心工作流（propose、explore、apply、archive、bootstrap-opsx、snack），保持架构一致性。

#### Scenario: init 安装 6 个工作流

- **WHEN** 运行 `openspec init` 初始化项目
- **THEN** 安装 6 个工作流 skill：openspec-propose、openspec-explore、openspec-apply-change、openspec-archive-change、openspec-bootstrap-opsx、openspec-snack

#### Scenario: update 刷新 6 个工作流

- **WHEN** 运行 `openspec update` 刷新指令
- **THEN** 更新 6 个工作流 skill 文件，保持与 manifest registry 同步
