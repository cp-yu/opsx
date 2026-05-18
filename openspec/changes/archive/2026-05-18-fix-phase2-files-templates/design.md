## Context

`openspec verify phase2` 的 `OPTIMIZATION_PROPOSED` 状态要求 `--files` 参数以建立 hash baseline（`src/commands/verify.ts:265-270`）。但面向 Agent 的三处提示词模板均未包含该参数：

1. `apply-change.ts:43` — 主工作流命令模板
2. `opsx-fragments.ts:361` — `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 速查表
3. `opsx-fragments.ts:371-377` — `VERIFY_ERROR_RECOVERY_GUIDE` 缺少 `FILES_REQUIRED` 条目

唯一正确描述的位置是 `verify-change.ts:201`，但 apply 工作流不引用该模板。

## Goals / Non-Goals

**Goals:**
- 消除 agent 首次调用 `OPTIMIZATION_PROPOSED` 时必然触发 `FILES_REQUIRED` 的问题
- 保持三处模板的一致性

**Non-Goals:**
- 不修改 CLI 行为或 `verify.ts` 逻辑
- 不修改 `verify-change.ts`（已正确）

## Decisions

**D1: 在命令模板中显式包含 `--files`**

在 `apply-change.ts:43` 和 `VERIFY_CLI_JSON_SCHEMA_REFERENCE` 的 `OPTIMIZATION_PROPOSED` 行中补充 `--files "<affected-files>"`。

理由：agent 按模板逐字构造命令，缺少参数就会失败。`verify-change.ts:201` 已有正确示例，保持一致即可。

**D2: 在 Error Recovery Guide 增加 `FILES_REQUIRED` 条目**

新增一条恢复指引，指导 agent 在遇到此错误时补充 `--files` 参数。

理由：现有四条恢复条目覆盖了其他常见错误，唯独缺少这个。agent 遇到未知错误只能靠 `--help` 摸索，增加恢复时间。

## Risks / Trade-offs

- [风险] 下游已生成的 skill 文件不会自动更新 → 用户需运行 `openspec update` 重新生成
- [风险] `--files` 占位符文本可能被 agent 误解为字面值 → 使用 `"<affected-files>"` 占位符并在 apply-change 上下文中说明来源（optimizer 声明的文件列表）
