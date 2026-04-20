## Why

当前 OpenSpec 在验证这件事上仍然是双轨语义：`expanded` 暴露独立 `/opsx:verify`，而 `core` 只在 `/opsx:archive` 前做轻量 inline conformance check。两者检查深度不同、触发时机不同、阻断策略也不同，结果就是“是否真的符合 change 意图”并没有成为归档前的统一硬条件。

这在实际使用里是个根本问题。实现 agent 往往带着自己的上下文偏见，容易把“我刚才就是这么做的”误当成“这就是 change 要的”。归档前需要一个干净视角的审阅环节，基于 change artifacts 与最终代码、以及 git 变更事实做独立对照，避免实现偏离意图后仍被归档固化。

## What Changes

- 将完整 `verify` 提升为所有 archive 路径的统一前置条件，不再允许 `core` 使用轻量 inline conformance check 替代 full verify
- 保持 `core` surface 仍然只有 `propose`、`explore`、`apply`、`archive` 四个 workflow，不新增独立 `verify` surface
- 调整 `/opsx:archive`：在 `core` 模式中内嵌执行完整 verify，并要求存在 fresh verify result 后才可继续归档
- 调整 `/opsx:archive`：在 `expanded` 模式中不再把缺少 verify result 视为可跳过的 soft prompt，而是要求先完成 fresh verify
- 调整 `/opsx:verify`：要求验证基于 change artifacts、最终文件内容与 git 变更证据进行对照，而不是仅做宽松的代码搜索
- 调整 `/opsx:verify`：对支持 subagent 的工具，要求使用干净上下文的 reviewer/verify agent 执行验证；不支持 subagent 的工具则在当前 agent 中按同一审阅契约执行
- 收敛验证产物合同，确保 `.verify-result.json` 能表达此次 verify 的输入依据、freshness 判定和是否由独立 reviewer agent 执行
- 修正文档叙事漂移，统一 README、workflow/commands/getting-started 等文档中关于 `core`、`verify`、`archive` 的描述

## Capabilities

### New Capabilities
- `archive-verify-gate`: 归档前强制完成 fresh full verify，并在 `core`/`expanded` 两种 surface 下共享同一归档门禁语义

### Modified Capabilities
- `opsx-archive-skill`: 归档流程从“core 轻量 inline check / expanded verify stamp”收敛为统一的 full verify gate
- `opsx-verify-skill`: 验证流程增加基于 git 变更与最终文件的审阅契约，并在支持 subagent 的工具上要求干净上下文 reviewer agent
- `verify-writeback`: 验证结果持久化合同扩展为表达 fresh verify 判定依据与审阅执行上下文

## Impact

- Affected specs:
  - `openspec/specs/opsx-archive-skill/spec.md`
  - `openspec/specs/opsx-verify-skill/spec.md`
  - `openspec/specs/verify-writeback/spec.md`
  - `openspec/specs/opsx-apply-skill/spec.md`（如需补充新的 verify result 字段消费约束）
  - `openspec/specs/archive-verify-gate/spec.md`
- Affected code:
  - `src/core/templates/workflows/archive-change.ts`
  - `src/core/templates/workflows/verify-change.ts`
  - `src/core/templates/fragments/opsx-fragments.ts`
  - `src/core/workflow-surface.ts`（仅在需要调整 profile 叙事或引用元数据时）
  - 相关 skill generation / docs generation 路径
- Affected docs:
  - `README.md`
  - `docs/getting-started.md`
  - `docs/workflows.md`
  - `docs/commands.md`
  - `docs/opsx.md`
  - `docs/supported-tools.md`
- Affected tests:
  - workflow template / skill generation tests
  - archive / verify contract tests
  - docs or snapshot tests covering core vs expanded guidance
