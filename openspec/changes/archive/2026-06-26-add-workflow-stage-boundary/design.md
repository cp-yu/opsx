# Design: add-workflow-stage-boundary

## Context

[INFERRED FROM CODE] explore 和 propose skill 由 `src/core/templates/workflows/explore.ts` 与 `src/core/templates/workflows/propose.ts` 中的 `instructions` 模板字符串生成。原 explore skill 的只读约束分散在 6 条 Hard Rules 中，缺少醒目的阶段身份声明，agent 容易越界。

## Goals / Non-Goals

**Goals**:
- 在 explore 和 propose skill 正文开头提供醒目、紧凑的阶段边界声明
- 精简 explore 的 Hard Rules，避免与新表格重复

**Non-Goals**:
- 不改变 explore 只读、propose 不实施代码的既有语义
- 不为其他 skill（apply、archive 等）增加阶段表格
- 不引入工具层面的权限强制（仍依赖 agent 遵守文档约束）

## Decisions

- **表格格式**：采用 3 行紧凑表格（Stage / Allowed / Forbidden），而非详细的 5 行表格或独立段落。理由：扫一眼即懂，占用篇幅最小。[INFERRED FROM CODE]
- **插入位置**：紧跟 instructions 正文首句，在 `## Required References` / `## Flow` 之前。理由：阶段身份是 agent 进入 skill 后最先需要确认的信息。
- **Hard Rules 精简**：explore 从 6 条减为 3 条核心规则 + 1 条 Subagent Exception 说明。被表格覆盖的只读约束条目删除，避免重复。
- **sweeper 例外保留**：impact-sweeper 子代理可写 JSON 的例外移至独立的 Subagent Exception 段落，不进表格，保持表格简洁。

## Risks / Trade-offs

- **依赖 agent 自律**：表格是文档约束，非技术强制。agent 仍可能忽略。[REVIEW NEEDED] 后续可考虑工具层 guard。
- **生效需重新生成**：源模板修改后，用户必须运行 `openspec init --tools <tool> --force` 才能在生成的 SKILL.md 中看到表格。
