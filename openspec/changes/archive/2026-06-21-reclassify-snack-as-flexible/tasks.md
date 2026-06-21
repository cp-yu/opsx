### Task 1: 类型与 registry 源码修改

**Goal**: 把 `WorkflowPreset` 联合类型从 `'core' | 'expanded'` 替换为 `'core' | 'flexible'`，把 snack 的 modeMembership 重分类，并删除零调用的 `getWorkflowsForPreset()` 死代码。

**Files**:
- Modify: `src/core/templates/manifest/types.ts`
- Modify: `src/core/templates/manifest/registry.ts`

**Requirements**:
- `WorkflowPreset` SHALL 为 `'core' | 'flexible'` 联合类型。
- registry 中 snack entry 的 `modeMembership` SHALL 为 `['flexible']`。
- registry SHALL NOT 暴露 `getWorkflowsForPreset` 方法。
- 删除方法后未使用的 `WorkflowPreset` import SHALL 从 registry.ts 清理。

#### Checks

- [x] C1 类型替换
  - Verifies: 本任务 Requirements
  - Command: `pnpm tsc --noEmit`
  - Expect: 全仓 TS 编译通过，无 `'expanded'` 字面量残留错误

- [x] C2 snack 标签重分类
  - Verifies: `specs/snack-workflow-manifest/spec.md` / Requirement "WorkflowManifestRegistry 注册 snack" / Scenario "注册 snack manifest entry"
  - Command: `pnpm test -- test/core/templates/manifest/registry.test.ts`
  - Expect: flexible 断言通过，core 断言（4 个工作流）通过

- [x] C3 死代码清理
  - Verifies: 本任务 Requirements
  - Command: `grep -rn "getWorkflowsForPreset" src/ test/`
  - Expect: 零命中

### Task 2: 测试断言同步

**Goal**: 让测试反映新的标签分类，确保未来如果有人误把 snack 改回 core 或重新引入 `getWorkflowsForPreset`，测试能立即失败。

**Files**:
- Modify: `test/core/templates/manifest/registry.test.ts`
- Modify: `test/integration/snack-workflow.test.ts`

**Requirements**:
- registry.test.ts 的 coreWorkflows 列表 SHALL 为 `['propose', 'explore', 'apply', 'archive']`。
- registry.test.ts SHALL 包含独立断言验证 snack 的 `modeMembership` 为 `['flexible']`。
- snack-workflow.test.ts 中 snack entry 的 modeMembership 期望 SHALL 为 `['flexible']`。

#### Checks

- [x] C4 单元测试通过
  - Verifies: 本任务 Requirements
  - Command: `pnpm test -- test/core/templates/manifest/registry.test.ts`
  - Expect: 全部通过

- [x] C5 集成测试通过（行为不变回归）
  - Verifies: 本任务 Requirements + init/update 行为零变化
  - Command: `pnpm test -- test/integration/snack-workflow.test.ts`
  - Expect: modeMembership 断言为 flexible；"init installs 6 workflow skills including snack" 继续通过

### Task 3: OpenSpec 制品与全量验证

**Goal**: 创建 change 制品（proposal/design/tasks/opsx-delta/specs delta）并通过全量校验。

**Files**:
- Create: `openspec/changes/reclassify-snack-as-flexible/proposal.md`
- Create: `openspec/changes/reclassify-snack-as-flexible/design.md`
- Create: `openspec/changes/reclassify-snack-as-flexible/tasks.md`
- Create: `openspec/changes/reclassify-snack-as-flexible/opsx-delta.yaml`
- Create: `openspec/changes/reclassify-snack-as-flexible/specs/snack-workflow-manifest/spec.md`

**Requirements**:
- change 目录 SHALL 通过 `openspec validate --type change`。
- 全量测试 SHALL 通过（确认 global-config 等无关套件不受影响）。

#### Checks

- [x] C6 OpenSpec change 校验
  - Verifies: 本任务 Requirements
  - Command: `openspec validate "reclassify-snack-as-flexible" --type change --json`
  - Expect: 校验通过

- [x] C7 全量测试
  - Verifies: 整体变更安全性
  - Command: `pnpm test`
  - Expect: 全绿，特别确认 `test/core/global-config.test.ts` 第 264 行 deprecated profile 测试仍通过（与 `WorkflowPreset` 类型无关）
