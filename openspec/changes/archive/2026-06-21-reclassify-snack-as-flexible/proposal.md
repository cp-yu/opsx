## Why

`snack` 工作流当前的 `modeMembership: ['core']` 在语义上不准确。snack 是"从已有代码反向同步 spec"的过渡能力，并非 OpenSpec 主循环（propose → apply → archive）的稳定核心；把它归为 `core` 会让 `WorkflowPreset` 标签集合失去表达力。

同时 `WorkflowPreset = 'core' | 'expanded'` 中的 `'expanded'` 是 2026-06-15 `delete-expanded-profile` 变更后的死值（无任何 entry 使用），`WorkflowManifestRegistry.getWorkflowsForPreset()` 是零调用死代码 —— 两者都是当时未清理干净的尾巴。

合并这三项（类型替换、标签重分类、死代码清理）到一个 change，因为同源同质，分开反而增加 review 噪声。

**纯语义变更，运行时行为零变化**：`modeMembership` 自 `delete-expanded-profile` 起已是纯标签，安装/过滤逻辑不读取该字段；6 个工作流仍然全部被 init/update 安装。

## What Changes

- `WorkflowPreset` 类型联合从 `'core' | 'expanded'` 替换为 `'core' | 'flexible'`。
- registry 中 snack entry 的 `modeMembership` 从 `['core']` 改为 `['flexible']`。
- 删除 `WorkflowManifestRegistry.getWorkflowsForPreset()` 方法（零调用死代码）。
- 同步 registry.test.ts：把 snack 从 coreWorkflows 列表移到独立的 flexible 断言。
- 同步 snack-workflow 集成测试：期望值改为 `['flexible']`。
- 更新 `snack-workflow-manifest` spec：`modeMembership` 字面值改为 `['flexible']`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `snack-workflow-manifest`: snack 的 `modeMembership` 标签从 `core` 重分类为 `flexible`，反映其"过渡能力"语义。

## Impact

- 代码：
  - `src/core/templates/manifest/types.ts` — `WorkflowPreset` 类型联合替换
  - `src/core/templates/manifest/registry.ts` — snack 标签 + 删除 `getWorkflowsForPreset` + 清理 import
- 测试：
  - `test/core/templates/manifest/registry.test.ts` — 标签断言拆分
  - `test/integration/snack-workflow.test.ts` — 期望值更新
- 无 CLI 命令、文件格式、安装行为或用户可见语法变更。
- init/update 行为零变化：所有 6 个工作流仍被全量安装。
