## Context

`openspec-archive-change` skill 模板（`src/core/templates/workflows/archive-change.ts`）的 Guardrails 节包含 `"Do not downgrade the verify gate into a lightweight archive-only check"`，Step 2.5 末尾包含 `"This is the only archive gate; no mini-check or bypass exists"`。这些语句在 agent 层面禁止使用 CLI 已支持的 `--no-verify` 绕过通道。

CLI 层（`src/core/archive.ts`）已完整实现 `--no-verify` 流程：交互式二次确认 + `[AUTHORIZED]` 审计日志 + `--yes` 静默模式。`archive-verify-gate` spec 亦已定义 `--no-verify` 场景。

当前 agent guardrail 与 CLI 能力之间存在张力：CLI 提供控制权，skill 收回控制权。

## Goals / Non-Goals

**Goals:**
- agent skill 在用户显式要求时允许传递 `--no-verify` 给 CLI
- 保留"优先走标准 verify gate"的建议语义
- 不改动 CLI 代码或 verify freshness engine

**Non-Goals:**
- 不修改 CLI 的 `--no-verify` 行为（确认流程、审计日志均不变）
- 不引入新的 CLI flag 或配置项
- 不改变 verify freshness 判定规则

## Decisions

**决策：有限放行，而非完全移除禁令**

选择 A2（有条件放行）而非 A1（完全移除）：
- 删除禁令句 `"no mini-check or bypass exists"`
- Guardrails 从硬禁止改为优先建议：`"Prioritize the standard verify gate; only pass --no-verify when the user explicitly requests it"`

理由：保留 skill 对 agent 的引导（优先 verify），同时不再禁止用户在知情情况下使用 CLI 已有的绕过能力。CLI 自有二次确认作为安全网。

**替代方案（已拒绝）：**
- 完全移除禁令 → 可能引导 agent 在非用户意图下自行绕过
- 不改动 → 用户无法在合法场景下行使控制权

## Risks / Trade-offs

- 用户可能跳过 verify 导致未验证代码被归档 → CLI 二次确认 + `[AUTHORIZED]` 审计日志为此提供防护
- agent 可能在用户未明确要求时自行使用 `--no-verify` → guardrail 仍要求 `"user explicitly requests it"`
