# Design: explore sweeper 子代理委托措辞修复

## Context

`openspec-impact-sweeper` 以 `.claude/skills/openspec-impact-sweeper/SKILL.md` 形态存在，是 skill 而非注册 agent type。explore skill 模板与既有 `explore-brainstorming` spec 均以"subagent 方式调用 `openspec-impact-sweeper`"表述，被主 agent 误解为 `subagent_type: "openspec-impact-sweeper"`，触发 harness 报错 `Agent type 'openspec-impact-sweeper' not found`。

## Decisions

- [INFERRED FROM CODE] 保留子代理隔离语义：sweeper 仍在独立上下文执行（证据收集 + 写报告），主 explore agent 只读报告。
- [INFERRED FROM CODE] 不绑定具体 agent type，采用中性措辞"spawn 一个子代理并指示其读取并执行 sweeper skill"。
- [INFERRED FROM CODE] sweeper skill 自身（输入契约、报告 schema、写边界）未改动；`ai-impact-sweeper` spec 不受影响。
- spec 修正目标为既有 `explore-brainstorming/spec.md` 的 "Explore 主代理保持只读" Requirement，仅更新其 "Impact sweeper 是 explore 唯一写例外" Scenario 措辞，另一 Scenario 保持不变。

## Risks / Trade-offs

- [REVIEW NEEDED] 中性措辞未指定具体 `subagent_type`，不同 harness 可能 spawn 出不具备文件读取/写入能力的子代理；缓解依赖 sweeper skill 自身的 Write Boundary 与工具权限声明。

## Open Questions

无（代码已实现）。
