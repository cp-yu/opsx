## Context

OpenSpec 的 active workflow surface 是 skills-only，但模板和工具适配仍混有两类引用：canonical `/opsx:<slug>` 与工具专用 `/opsx-<slug>`。当前 apply 完成提示直接写死 `/opsx-archive`，Pi transform 也复用 OpenCode 的 `/opsx-<commandSlug>`，这会让 Codex 和 Pi 生成不可直接调用的 handoff。

现有边界已经清楚：`WorkflowManifestRegistry` 提供 `workflowId`、`commandSlug` 和 `skillDirName`；`builtin-transforms.ts` 处理 skill content 的工具重写；`command-references.ts` 处理 init/update 等 guidance 引用。

## Goals / Non-Goals

**Goals:**

- 让 workflow 模板只写 canonical `/opsx:<slug>` source reference。
- 让 Codex、Claude、Pi、OpenCode 和 fallback guidance 使用同一份 manifest 元数据渲染。
- 让 apply archive-ready handoff 通过 transform 产出工具正确语法。

**Non-Goals:**

- 不重建 command generation surface。
- 不清理归档 change、历史文档或 legacy command adapter 注释。
- 不新增工具配置、外部依赖或运行时插件机制。

## Decisions

1. 模板 source reference 保持 `/opsx:<slug>`。

   理由：现有 transform pipeline 已以 `/opsx:<slug>` 作为可解析 source，继续使用它可以避免在模板里散落 `$openspec-*`、`/skill:*` 或 `/opsx-*`。apply archive-ready 文案应改回 `/opsx:archive <change-name>`，由生成流程按工具重写。

   备选方案：在 apply 模板中按工具分支输出不同文本。拒绝，因为模板没有工具上下文，也会复制 transform 逻辑。

2. Pi 使用 `/skill:<skillDirName>`，不使用 `commandSlug`。

   理由：Pi 的用户可调用 surface 是 skill invocation，用户确认的精确语法是 `/skill:<skillDirName>`。`skillDirName` 已由 manifest 显式注册，符合现有“不猜测 skill 名”的规则。

   备选方案：继续 `/opsx-<commandSlug>`。拒绝，因为这是 OpenCode command surface 语法，不适用于 Pi。

3. OpenCode 继续使用 `/opsx-<commandSlug>`。

   理由：当前问题只确认 Pi 与 Codex handoff 错误；OpenCode 的 command-backed 格式仍由现有 transform 覆盖。把 OpenCode 一并切到 skill 语法会扩大行为面。

4. `command-references.ts` 与 transform pipeline 同步 Pi 规则。

   理由：init/update guidance 和 generated skill content 都会显示 workflow invocation。只改 `builtin-transforms.ts` 会让同一工具在不同输出面出现不同调用语法。

## Risks / Trade-offs

- [Risk] Pi `/skill:<skillDirName>` 缺少公开文档证据，仅来自用户确认。→ Mitigation：把它写入 active spec 和 tests，后续语法变化只需修改同一规则。
- [Risk] OpenCode 与 Pi 从共享 hyphen transform 分叉。→ Mitigation：保留显式 transform ID 和测试，避免隐式共享。
- [Risk] `/opsx-archive` 仍可能存在于历史归档或文档。→ Mitigation：本 change 只约束 active generated workflow text，不做无关清理。

## Migration Plan

1. 更新 active specs，声明 Pi skill invocation 与 apply archive-ready 工具适配行为。
2. 更新 transform/invocation utility 与 apply template。
3. 更新针对 Codex、Claude、Pi、OpenCode、fallback 的单元测试。
4. 运行 focused Vitest 与 change validation。

Rollback 可回退本 change 的代码与 spec delta；不涉及数据迁移。
