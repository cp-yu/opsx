## Why

当前 `/opsx:apply` 标记任务完成是"执行者自报"——LLM 自己说做完就打勾。`/opsx:verify` 虽然能检测不一致，但只读不写，无法修正 `tasks.md` 状态。这导致工作流是开环的：看似全部完成，实际可能存在 spec-code 偏移，尤其在增量修改（1→2）场景下。

OPSX 追求"编译器级"的规格-代码对应关系，但 LLM 是概率性翻译器。需要一个审阅机制将线性管道改造为可收敛的闭环迭代。

## What Changes

- 增强 `/opsx:verify`：增加 write-back 能力，对 CRITICAL 级别不一致自动取消 `tasks.md` 中对应任务的完成标记，生成 remediation 清单
- 增强 `/opsx:verify`：持久化验证结果到 `.verify-result.json`，包含时间戳、内容摘要、issue 列表
- 增强 `/opsx:archive`（expanded 模式）：将 verify 从可选提升为前置条件，检查 verify stamp 存在性和新鲜度
- 增强 `/opsx:archive`（core 模式）：内联轻量 conformance check（core 无独立 verify），发现 CRITICAL 不一致时阻断归档并 unmark tasks
- 增强 `/opsx:apply`：检测 `.verify-result.json` 存在时，读取 verify 诊断信息（CRITICAL issues + remediation 清单）作为修复指导，避免重蹈覆辙
- 抽取共享验证逻辑为 prompt fragment，确保 archive 内联检查与 verify 独立检查使用同一套规则

## Capabilities

### New Capabilities
- `verify-writeback`: 验证结果回写 tasks.md 和生成 remediation 清单的能力

### Modified Capabilities
- `opsx-verify-skill`: 增加 write-back 步骤（Step 9/10）、验证结果持久化、exit code 语义
- `opsx-archive-skill`: expanded 模式增加 verify stamp 前置检查；core 模式增加 inline conformance check
- `opsx-apply-skill`: 检测 verify 结果并注入修复上下文

## Impact

- `src/core/templates/workflows/apply-change.ts`：Step 4 增加 verify 结果读取，Step 6 注入修复上下文
- `src/core/templates/workflows/verify-change.ts`：增加 write-back 和持久化步骤
- `src/core/templates/workflows/archive-change.ts`：增加 verify 前置检查（expanded）和 inline conformance check（core）
- `src/core/templates/fragments/`：新增共享验证 prompt fragment
- `openspec/specs/opsx-verify-skill/spec.md`：增加 write-back 相关 requirement
- `openspec/specs/opsx-archive-skill/spec.md`：增加 verify gate 相关 requirement
