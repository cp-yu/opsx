# 2026-03-19 fix-todo-workflow-gaps 归档

以下待办已由归档变更 `openspec/changes/archive/2026-03-19-fix-todo-workflow-gaps/` 完成：

- `openspec sync` 顶层 CLI 命令
- `--skip-specs` 语义对齐为“skip all archive-time sync writes”
- `bootstrap init` 在 TTY 下提问 `full` / `opsx-first`
- bootstrap domain-map 的 invalid / missing / valid 三态建模、gate 诊断和 stale 降级
- `bootstrap` 命令面随 bootstrap 工作区动态暴露
- explore / propose / apply 三个核心工作流统一使用 OPSX shared context

说明：

- `bootstrap init` 后的 bootstrap command surface 目前仍通过后续 `openspec update` 暴露，不是 init 内即时写入
- Claude Code 的 subagent 提示增强未包含在本次变更中，仍保留在根 TODO
