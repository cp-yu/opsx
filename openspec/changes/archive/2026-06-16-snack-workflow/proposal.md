<!-- Design Summary 已生成，输入详细度：会话包含完整架构设计、技术栈、数据流、测试策略和风险权衡，直接生成制品。 -->

## Why

当前 OpenSpec 的 5 个核心工作流（propose、explore、apply、archive、bootstrap）都是"需求 → 代码"方向，缺少"代码 → specs"的反向同步能力。在实际开发中，Agent 完成代码修改后（经过多轮对话和代码迭代），需要快速生成或更新 specs 和 OPSX 以保持文档与代码一致。现有工作流无法满足这种代码优先、快速同步的场景。

## What Changes

- 新增 `openspec-snack` skill，提供代码优先的轻量级同步工作流
- 通过 git diff 自动检测代码变更，结合 code-map 反查受影响的 capabilities
- 使用中层语义推断生成 BDD specs，结合会话上下文提升质量
- 启发式判断是否需要生成 OPSX delta（仅在架构变更时）
- 支持多次调用更新同一 change，实现迭代友好的修正路径
- 生成简化版 design.md（反向推断技术路径），不生成 tasks.md（代码已完成）
- 输出提示包含快速完成路径（`sync --no-verify` → `archive --no-verify`）和修正路径

## Capabilities

### New Capabilities

- `snack-skill`: openspec-snack skill 定义，包含 git diff 分析、code-map 反查、specs 生成、OPSX delta 启发式判断、输出提示逻辑
- `snack-skill-generation`: 将 snack 纳入 skill 生成管线，与其他 5 个核心工作流一致
- `snack-workflow-manifest`: 在 WorkflowManifestRegistry 中注册 snack 工作流

### Modified Capabilities

<!-- 无现有 capability 的 requirement 变更 -->

## Impact

**受影响代码**：
- `src/core/templates/manifest/registry.ts` - 新增 snack manifest entry
- `src/core/templates/skill-templates.ts` - 新增 `getSnackSkillTemplate` 函数
- `.claude/skills/openspec-snack/SKILL.md` - 生成的 skill 文件

**受影响 AI 工作流**：
- 用户新增调用入口：`/opsx:snack [change-name]`
- 与现有 5 个工作流平行，填补代码优先场景空白

**系统依赖**：
- 复用 `spec-driven` schema，无需新增 schema 定义
- 复用现有 CLI 命令（`openspec new change`, `openspec list`, `openspec sync`, `openspec archive`）
- 复用 OPSX 上下文加载逻辑（与 explore/propose/apply 一致）
- 无需新增 TypeScript 组件或 CLI 命令
