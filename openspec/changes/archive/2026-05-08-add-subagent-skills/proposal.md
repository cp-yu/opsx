## Why

当前 verify/apply/archive 在 subagent-orchestrated 模式下 spawn 的 reviewer 和 optimizer subagent 仅接收简短的内联 text fragment（`VERIFY_REVIEWER_SUBAGENT_CONTRACT` ~15行，`OPTIMIZATION_PROTOCOL_SUBAGENT` ~30行），缺少结构化的执行指导。需将它们升级为正式的内部 skill 文件（SKILL.md），在 `init` 时随 core preset 安装到各 AI 工具（Claude Code、Codex、Pi 等）的 skills 目录下，使 subagent 在干净上下文中获得完整的角色定义、输入合约、验证/优化协议和边界处理指导。

## What Changes

- 新增 `openspec-reviewer` 内部 subagent skill（Phase 1 验证审查），包含 6 模块结构化的提示词
- 新增 `openspec-optimizer` 内部 subagent skill（Phase 2 优化提案），包含优化原则和 Search/Replace 输出合约
- 内部 skill 安装管线：独立于现有 workflow surface 的 skill 生成/安装机制，`init`/`update` 时写入 `{skillsDir}/skills/openspec-reviewer/SKILL.md` 和 `openspec-optimizer/SKILL.md`
- 修改 `verify-change.ts`、`apply-change.ts`、`archive-change.ts` 模板：subagent spawn 指令从内联 fragment 改为 invoke skill 引用
- **BREAKING**: `WorkflowManifestEntry` 中 `getCommandTemplate` 改为 optional，支持 skill-only 条目

## Capabilities

### New Capabilities

- `openspec-reviewer-skill`: Phase 1 验证审查 subagent skill。定义 reviewer 的角色、输入合约、6步验证循环、严重性阈值、证据标准、三个验证维度（completeness/correctness/coherence）、OPSX 对齐检查、结构化输出 schema 和边界降级策略
- `openspec-optimizer-skill`: Phase 2 优化提案 subagent skill。定义 optimizer 的角色、输入合约、5类优化原则与禁止项、Search/Replace 块输出格式、failedDirections 避重协议和边界处理
- `internal-skill-installation`: 内部 skill 安装管线。将 `openspec-reviewer` 和 `openspec-optimizer` 作为 core preset 的一部分，`init`/`update` 时安装到各工具的 skills 目录，不生成对应的 slash command

### Modified Capabilities

- `cap.ai.workflow-templates`: verify/apply/archive 模板中 subagent spawn 步骤，从传内联 fragment 改为 invoke 对应的内部 skill
- `cap.ai.command-generation`: `WorkflowManifestEntry.getCommandTemplate` 改为 optional，命令生成时跳过 skill-only 条目

## Impact

- `src/core/templates/workflows/reviewer.ts` (新增)
- `src/core/templates/workflows/optimizer.ts` (新增)
- `src/core/templates/workflows/verify-change.ts` (修改：subagent spawn 指令)
- `src/core/templates/workflows/apply-change.ts` (修改：subagent spawn 指令)
- `src/core/templates/workflows/archive-change.ts` (修改：subagent spawn 指令)
- `src/core/templates/manifest/types.ts` (修改：`getCommandTemplate` → optional)
- `src/core/templates/manifest/registry.ts` (修改：新增 reviewer/optimizer 两个 core entry)
- `src/core/shared/skill-generation.ts` (修改：内部 skill 安装逻辑 + command 生成跳过 skill-only)
- `src/core/templates/skill-templates.ts` (修改：新增导出)
- 适配工具：Claude Code、Codex（skills-only）、Pi 及其他 22+ 工具的 skills 目录