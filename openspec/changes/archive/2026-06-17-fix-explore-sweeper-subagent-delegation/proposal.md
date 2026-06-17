# 修复 explore skill 中 sweeper 子代理委托措辞

## Why

`openspec-impact-sweeper` 是一个 skill，而非注册的 agent type。原 explore skill 模板与既有 spec 均将其描述为"以 subagent 方式调用 `openspec-impact-sweeper`"，被主 agent 误解为 `subagent_type: "openspec-impact-sweeper"`，触发 harness 报错 `Agent type 'openspec-impact-sweeper' not found`，sweeper 无法被调用。

## What Changes

- 将 explore skill 模板（`src/core/templates/workflows/explore.ts`）中对 sweeper 的调度措辞，从"以 `openspec-impact-sweeper` 作为 subagent_type 调用"改为"spawn 一个子代理并指示其读取并执行 sweeper skill"。
- 同步修正 `explore-brainstorming` spec 中 "Impact sweeper 是 explore 唯一写例外" Scenario 的措辞，使其与代码一致：sweeper 经子代理执行（而非作为 subagent_type），主 explore agent 仍只读报告。
- 保留子代理隔离语义，不绑定具体 agent type；清理手动精简遗留的语病。

## Impact

- Affected capability: `cap.ai.explore-brainstorming`（主 spec: `openspec/specs/explore-brainstorming/spec.md`，已有 frontmatter）。
- 不修改 sweeper skill 自身，不动 `ai-impact-sweeper` spec（本次未改 sweeper 行为）。
- 改动文件：`src/core/templates/workflows/explore.ts`（单一源文件，构建后镜像到 `.claude`/`.codex`/`.github` 三份 `SKILL.md`）。
