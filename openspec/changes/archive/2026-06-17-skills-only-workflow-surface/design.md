## Context

当前 AI integration 同时维护 skills 与 slash command delivery。`delivery` 存在于全局配置、artifact plan、init/update、profile drift、command adapter、模板和 active specs 中；verify 还按工具区分 `subagent-orchestrated` 与 `current-agent-reread`。这与“所有 workflow surface 都以 skills 承载，并假设 subagent 可用”的方向冲突。

## Goals / Non-Goals

**Goals:**

- 删除 `delivery` 作为用户配置和 artifact planning 维度。
- 让 `init` 与 `update` 只生成、刷新和维护 skills。
- 删除 active command generation delivery path。
- 所有 workflow templates 使用 subagent orchestration。
- 用户提示使用 skills 语义；缺少工具专用调用语法时使用中性文本。

**Non-Goals:**

- 不新增旧 command 文件清理逻辑。
- 不修改 archive 下的历史 specs。
- 不把 transform scope 中的 `both` 当作 delivery 概念删除。
- 不一次性补齐所有工具的精确 skill invocation 语法。

## Decisions

1. 删除 `delivery`，不做 deprecated runtime behavior。
   - 理由：保留无效配置会继续污染 planner、tests 和用户心智。
   - 备选方案：忽略旧字段并保留类型。拒绝，因为它会留下不可执行的配置面。

2. 停止维护 active command generation，不主动清理旧 command 文件。
   - 理由：用户明确选择保留旧文件，不增加 cleanup 代码。实现只需确保 OpenSpec 不再生成、刷新或把 command-only artifacts 当成配置来源。
   - 备选方案：保留 adapter 只做 legacy cleanup。拒绝，因为当前范围不要求 cleanup，且会继续保留 command-generation 依赖。

3. invocation guidance 使用中性 skills 文案作为默认。
   - 理由：不同工具的 skill 调用语法不一定一致，猜测比中性文本更危险。Codex 等已有精确 metadata 的工具可继续使用精确格式。
   - 备选方案：统一 `$openspec-*`。拒绝，因为它把 Codex 语法错误推广到其他工具。

4. verify execution model 固定为 subagent orchestration。
   - 理由：用户已经确认所有 CLI workflow 都支持 subagent，不再需要工具能力分支。
   - 备选方案：保留 lookup 但默认 subagent。拒绝，因为分支本身没有业务价值。

## Risks / Trade-offs

- 旧 command 文件残留可能误导用户 → 不主动删除，在输出和 docs 中明确 OpenSpec 只维护 skills。
- 中性 invocation 文案不如工具专用语法精确 → 优先正确性，后续可通过 metadata 增量增强。
- 删除 command-generation 会影响大量 tests → 任务按配置、生成管线、模板、docs/specs 分块，避免无边界重构。
- active specs 中存在历史 profile/delivery 残留 → 本变更只改 active specs 的当前要求，不触碰 archive。
