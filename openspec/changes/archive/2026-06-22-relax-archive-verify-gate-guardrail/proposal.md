## Why

`openspec-archive-change` skill 的 guardrail 包含"禁止绕过 verify gate"的硬禁令，但 CLI 层已内置 `--no-verify` 绕过通道（含用户二次确认）。用户在特定场景下（如仅 gitHeadCommit 漂移、或已完成 quality check 但 freshness engine 拒收）应有最高控制权决定是否跳过门禁。当前禁令剥夺了用户这一控制权。

## What Changes

- 删除 archive skill 模板中 `"This is the only archive gate; no mini-check or bypass exists"` 禁令句
- Guardrails 从 `"Do not downgrade the verify gate into a lightweight archive-only check"` 改为 `"Prioritize the standard verify gate; only pass --no-verify to the archive CLI when the user explicitly requests it (the CLI provides its own confirmation prompt)"`
- CLI 代码（`src/core/archive.ts`）和 verify freshness engine 不做任何改动；`--no-verify` 行为不变

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `opsx-archive-skill`: 放松 archive skill guardrail 对 `--no-verify` 的禁令，允许用户在显式要求时代理传参

## Impact

- 受影响文件：`src/core/templates/workflows/archive-change.ts`（模板源）、`.pi/skills/openspec-archive-change/SKILL.md`（生成的 skill 文件）
- 不影响 CLI 运行时行为、verify 门禁逻辑、或其他 skill/workflow 模板
- 非破坏性变更
