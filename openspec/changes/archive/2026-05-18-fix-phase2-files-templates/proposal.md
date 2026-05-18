## Why

`OPTIMIZATION_PROPOSED` 状态的 `openspec verify phase2` 调用**必须**携带 `--files` 参数（CLI 用于 hash 采样 baseline），但 apply-change 工作流模板和 JSON Schema 速查表均未在命令模板中包含该参数，导致 agent 首次调用必然触发 `FILES_REQUIRED` 错误。Error Recovery Guide 也缺少对应恢复条目，agent 只能靠 `--help` 自行摸索。

## What Changes

- `apply-change.ts:43` 的 Phase 2 命令模板补充 `--files` 参数
- `opsx-fragments.ts` 的 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 表中 `OPTIMIZATION_PROPOSED` 行补充 `--files`
- `opsx-fragments.ts` 的 `VERIFY_ERROR_RECOVERY_GUIDE` 增加 `FILES_REQUIRED` 恢复条目

## Capabilities

### New Capabilities

### Modified Capabilities
- `agent-prompt-guidance`: Phase 2 CLI 调用模板和错误恢复指引补全 `--files` 参数文档

## Impact

- 受影响文件：`src/core/templates/workflows/apply-change.ts`、`src/core/templates/fragments/opsx-fragments.ts`
- 无 API 变更、无依赖变更、无 breaking change
- 下游影响：所有消费这些模板的 AI 工具生成的 skill/command 文件将在下次 `openspec update` 后获得修正
