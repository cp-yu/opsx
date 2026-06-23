## Why

OpenSpec 的 5 个 workflow skill 模板中硬编码了 `openspec/references/` 相对路径引用。Pi 系统规则要求相对路径相对于 skill 目录解析，但这些路径实际上是相对于项目根目录的。这导致 agent 读取 skill 时找不到文件。

## What Changes

- 为所有 `openspec/references/` 路径引用添加显式的 project-root 标记
- 标记形式：inline 引用使用 `project-root file` 前缀，列表引用使用 `(project-root relative)` 后缀
- 影响 5 个 workflow 模板的源码及对应的已生成 SKILL.md

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `workflow-templates` (`cap.ai.workflow-templates`): 5 个 workflow 模板中的 `openspec/references/` 路径引用新增显式 project-root 标记

## Impact

- `src/core/templates/workflows/explore.ts`: Required References 加 `project-root file` 前缀
- `src/core/templates/workflows/apply-change.ts`: Phase 2 引用加 `project-root file` 前缀
- `src/core/templates/workflows/archive-change.ts`: git handoff 的 3 处路径引用加 `project-root file` 前缀
- `src/core/templates/workflows/impact-sweeper.ts`: Required References 的 3 处加 `(project-root relative)` 后缀
- `src/core/templates/workflows/optimizer.ts`: 4 处路径引用加标记（1 处 `project-root file` + 3 处 `(project-root relative)`）
- `.pi/skills/*/SKILL.md`: 对应的 5 个已生成文件同步更新
- `test/core/templates/apply-change.test.ts`: 断言字串同步更新
