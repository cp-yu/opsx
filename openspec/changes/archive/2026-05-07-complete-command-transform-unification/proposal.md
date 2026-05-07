## Why

`unify-template-generation-pipeline` 变更引入了统一的 transform 管线（`runTransforms`）、`WorkflowManifest`、`ToolProfileRegistry` 和 `ArtifactSyncEngine`，skills 生成路径已完全接入管线。但命令生成路径（`writeCommands`）未调用 `runTransforms`——command reference 变换（`/opsx:slug` → 工具特定格式）仍然在 opencode/pi 适配器内部通过硬编码的 `transformToHyphenCommands` 执行。这形成了架构分叉：builtin-transforms 已注册三条 `scope: 'both'` 的变换规则，但对命令路径实际上不生效。

## What Changes

- **sync-engine.ts**: `writeCommands()` 在调用适配器前接入 `runTransforms` 管线，对每个 entry 的 body 执行 `preAdapter` 阶段变换
- **opencode.ts 适配器**: 移除 `transformToHyphenCommands` import 和调用，适配器仅负责 frontmatter 格式化
- **pi.ts 适配器**: 移除 `transformToHyphenCommands` import 和调用，适配器仅负责 frontmatter 格式化和 `$@` 注入
- **command-references.ts**: 移除 `getWorkflowReferenceTransformer` 函数（无生产调用方，变换管线已接管其全部职责）；`transformToHyphenCommands` 保留为内部实现细节，但不再被适配器引用
- **command-references.test.ts**: 相应更新测试，将 `transformToHyphenCommands` 的核心测试迁移到 transforms 测试文件中

## Capabilities

### New Capabilities

（无新增——本次变更仅完成已存在管线的未完成部分。）

### Modified Capabilities

- `template-artifact-pipeline`: transform 管线 `scope: 'both'` 的语义现在对命令路径也实际生效，`writeCommands` 在适配器格式化前调用 `runTransforms`
- `command-generation`: opencode 和 pi 适配器不再内嵌 command reference 变换逻辑，仅负责工具特定的格式化（frontmatter + 路径）

## Impact

- **修改文件**:
  - `src/core/templates/sync-engine.ts` — `writeCommands` 函数
  - `src/core/command-generation/adapters/opencode.ts` — 移除 import 和变换调用
  - `src/core/command-generation/adapters/pi.ts` — 移除 import 和变换调用
  - `src/utils/command-references.ts` — 移除 `getWorkflowReferenceTransformer`
  - `test/utils/command-references.test.ts` — 更新测试覆盖
  - `test/core/templates/transforms.test.ts` — 新增命令路径变换测试
- **不变部分**: `builtin-transforms.ts`（三条已注册变换无需改动），`writeSkills`（已在管线中），所有其他适配器（claude, cursor, codex 等不涉及 command reference 变换）
- **用户可见行为**: 无变化，生成的命令文件内容等价
