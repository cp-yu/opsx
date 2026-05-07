## Context

`unify-template-generation-pipeline` 变更引入了统一 transform 管线 (`runTransforms`)、`ArtifactSyncEngine`、`WorkflowManifest` 和 `ToolProfileRegistry`。skills 生成路径 (`writeSkills`) 已在 `sync-engine.ts:177` 中接入管线——在写入前调用 `runTransforms(instructions, { artifactType: 'skill' })` 执行 command reference 变换。

命令生成路径 (`writeCommands`, `sync-engine.ts:191-210`) 未调用 `runTransforms`。`builtin-transforms.ts` 注册的三条变换（`codex-command-refs`, `opencode-command-refs`, `pi-command-refs`）的 `scope` 均为 `'both'`，设计意图是覆盖 skills 和 commands 两种产出。但它们对命令路径实际不生效——opencode 和 pi 适配器通过内部硬编码的 `transformToHyphenCommands()` 直接执行变换，绕过了管线。

当前架构存在双重变换风险：如果在 `writeCommands` 中简单加入 `runTransforms` 而不移除适配器内的变换调用，会导致内容被两次变换。

## Goals / Non-Goals

**Goals:**
- 命令生成路径 (`writeCommands`) 接入 `runTransforms` 管线，使 `scope: 'both'` 语义对命令路径也实际生效
- 从 opencode/pi 适配器中移除 `transformToHyphenCommands` 调用，使适配器仅负责工具特定的格式化（frontmatter + 路径）
- 移除无生产调用方的 `getWorkflowReferenceTransformer` 函数
- 保持生成输出完全等价，不引入用户可见行为变化

**Non-Goals:**
- 不修改 `builtin-transforms.ts`（三条已注册变换无需改动）
- 不修改 `writeSkills` 路径（已在管线中）
- 不修改其他适配器（claude, cursor, codex 等不涉及 command reference 变换）
- 不引入 `postAdapter` 阶段的新变换（当前无需求）

## Decisions

### 1. 在 `writeCommands` 中使用 `entry.content.id` 作为 `workflowId`

**Decision**: 将 `CommandWriteEntry.content.id` 作为 `GenerationContext.workflowId` 传递给 `runTransforms`。

**Rationale**: `getCommandContents` 在 `skill-generation.ts:123` 中映射 `{ id, commandSlug, ... }`，其中 `id` 字段（例如 `'explore'`, `'bootstrap-opsx'`）与 `WorkflowId` 完全对应。无需引入新字段，直接使用现有数据结构即可。

### 2. 仅在 body 上执行 preAdapter 变换

**Decision**: `writeCommands` 仅对 `entry.content.body` 执行 `preAdapter` 阶段的 `runTransforms`，不对整个 `CommandContent` 执行。

**Rationale**: 
- 所有内置 transform 的 `phase` 均为 `'preAdapter'`——变换应在适配器格式化前执行
- 适配器的 `formatFile` 包装 frontmatter 和路径，这些元数据无需变换
- 不调用 `postAdapter` 因为当前无此类需求，保持最小变更

**Alternatives considered**:
- **在 `generateCommands` 内部执行变换**: 修改 `generator.ts` 会破坏其纯函数性质，且需要传递 `toolId`/`workflowId` 上下文，增加接口复杂度。拒绝。
- **在适配器 `formatFile` 外部包装**: 创建新的包装层会引入额外间接性。直接在 `writeCommands` 中变换 body 是最简单的介入点。

### 3. 从适配器中彻底移除 `transformToHyphenCommands`

**Decision**: 从 `opencode.ts:25` 和 `pi.ts:58` 中移除 `transformToHyphenCommands` 调用及 import，适配器直接使用传入的 `content.body`。

**Rationale**: 变换管线（`builtin-transforms.ts` 中的 `opencode-command-refs`、`pi-command-refs`）会在此前执行相同逻辑。保留适配器内调用会导致双重变换：`body` → 管线变换为 `/opsx-slug` → 适配器再次变换为 `/opsx-slug`（等幂，但架构冗余）。

### 4. 移除 `getWorkflowReferenceTransformer`

**Decision**: 从 `command-references.ts` 中移除 `getWorkflowReferenceTransformer` 函数。

**Rationale**: 该函数在 `src/` 中无任何生产调用方（仅 `test/core/shared/skill-generation.test.ts:367` 引用）。变换管线已接管其全部职责。`transformToHyphenCommands` 内部被 `getWorkflowReferenceTransformer` 的 pi 分支使用——移除调用方后该分支也随之移除。

**Residual**: `transformToHyphenCommands` 本身保留为 `command-references.ts` 的内部实现，继续被 `getWorkflowReferenceTransformer` 的移除路径以外的代码使用（`transformWorkflowReferences` 调用链）。`src/utils/index.ts` 中的 public export 保留，以兼容可能的外部消费者。

## Risks / Trade-offs

**Risk: 输出不一致**
适配器中移除变换而管线中未正确执行会导致生成的命令文件缺少 hyphen 变换。
→ Mitigation: 现有 parity 测试覆盖 opencode/pi 命令输出，变更后重新运行确保等价。

**Risk: `id` 字段语义假设**
`CommandContent.id` 作为 `workflowId` 的假设可能在未来被破坏。
→ Mitigation: `getCommandContents` 中的 `{ id, commandSlug, ... }` 映射已稳定，添加 inline comment 说明 `id` 即 `workflowId`。

**Trade-off: `transformToHyphenCommands` 保留为 public export**
该函数经 `src/utils/index.ts` 导出，移除可能影响外部消费者。
→ Accepted: 保守保留，标记为内部实现。`getWorkflowReferenceTransformer` 无公开导出。
