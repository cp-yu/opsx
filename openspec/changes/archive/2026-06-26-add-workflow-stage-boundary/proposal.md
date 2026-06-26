## Why

在 explore 和 propose skills 中缺少明确的工作流阶段边界声明，导致 agent 容易越界操作（例如在 explore 阶段直接修改文件）。需要在每个 skill 开头增加紧凑的阶段边界表格，明确告知 agent 当前处于哪个阶段、允许和禁止的操作。

## What Changes

- 在 `src/core/templates/workflows/explore.ts` 的 skill instructions 开头增加 3 行 Workflow Stage 表格
- 在 `src/core/templates/workflows/propose.ts` 的 skill instructions 开头增加 3 行 Workflow Stage 表格
- 精简 explore skill 的 Hard Rules 从 6 条减为 3 条，避免与表格重复
- 表格位置：紧跟 frontmatter，在所有其他内容之前
- 表格格式：3 行紧凑表格（Stage、Allowed、Forbidden）

## Capabilities

### New Capabilities

<!-- 无新增 capability，表格属于现有 explore/propose workflow 的结构增强 -->

### Modified Capabilities

- `explore-brainstorming`：explore skill 增加 Workflow Stage 边界表格，精简 Hard Rules
- `propose-workflow`：propose skill 增加 Workflow Stage 边界表格

## Impact

- 修改了 explore 和 propose 两个 skill 模板的生成逻辑
- 生成的 `.pi/skills/openspec-explore/SKILL.md` 和 `.pi/skills/openspec-propose/SKILL.md` 将包含新的表格
- 需要用户运行 `openspec init --tools pi --force` 重新生成 skills 才能看到变化
