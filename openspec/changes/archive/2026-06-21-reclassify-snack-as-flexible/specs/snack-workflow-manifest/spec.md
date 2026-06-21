---
capabilities:
  - cap.ai.snack-workflow-manifest
---

## MODIFIED Requirements

### Requirement: WorkflowManifestRegistry 注册 snack

WorkflowManifestRegistry SHALL 包含 snack workflow manifest entry，与现有 5 个核心工作流平行；snack 的 `modeMembership` 标记为 `flexible`，反映其"代码反向同步过渡能力"的语义分类。标签不影响运行时安装行为（所有 6 个工作流仍被全量安装）。

#### Scenario: 注册 snack manifest entry

- **WHEN** WorkflowManifestRegistry 初始化
- **THEN** MANIFEST_ENTRIES 数组包含 snack entry：
  - `workflowId: 'snack'`
  - `modeMembership: ['flexible']`
  - `skillDirName: 'openspec-snack'`
  - `skillName: 'openspec-snack'`
  - `commandSlug: 'snack'`
  - `promptMeta.name: 'Snack sync'`
  - `promptMeta.description: 'Quick sync from code to specs'`
  - `getSkillTemplate: getSnackSkillTemplate`
  - 不提供 `getCommandTemplate`（snack 为 skill-only 工作流）
