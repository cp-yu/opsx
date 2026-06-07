## Why

`openspec-explore` 旨在作为只读的思考 workflow，但当前 prompt 允许制品写入或把设计确认误读成写文件授权。需要收紧边界，避免 explore 在用户确认方案后越界修改源码、测试或 OpenSpec 制品。

## What Changes

- 明确 explore workflow 中 main explore agent 只能读取、调查、澄清、比较并生成只存在于对话中的 `Design Summary`。
- 明确 `openspec-impact-sweeper` 是 explore 内部唯一写例外，且只能写 `openspec/sweeper/*.json` 报告。
- 将 active-change insight 文案从直接捕获制品改为 future capture target 分类，并把制品生成责任交给 `$openspec-propose <change-name>` 或合适的非-explore workflow。
- 增加模板测试的正向断言，覆盖 read-only 边界、用户确认不是写入授权、sweeper JSON 写例外和 future capture target 语义。
- 不刷新 checked-in/generated skill surface；后续由 `openspec update` 处理。

## Capabilities

### New Capabilities

### Modified Capabilities

- `explore-brainstorming`: 收紧 explore brainstorming 和 active-change capture 边界，要求 main explore agent read-only，并将用户设计确认限定为方向确认。
- `ai-workflow-templates`: 明确 explore 调用 impact-sweeper 时的写入例外属于 subagent JSON report，不赋予 main explore agent 或 command template 制品写入权限。

## Impact

- 受影响代码：`src/core/templates/workflows/explore.ts`
- 受影响测试：`test/core/templates/explore-template.test.ts`
- 受影响规约：`openspec/specs/explore-brainstorming/spec.md`, `openspec/specs/ai-workflow-templates/spec.md`
- 不在范围内：刷新 `.codex/skills/openspec-explore/SKILL.md`、同步 generated command/skill surface、修改 explore prompt template 以外的实现代码
