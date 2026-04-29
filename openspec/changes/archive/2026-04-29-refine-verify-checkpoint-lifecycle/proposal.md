## Why

当前 `verify` Phase 2 的 checkpoint 语义虽然引入了 `git stash push -u` 作为保护带，但在恢复与清理路径上仍然不自洽：部分分支要求先 `git stash drop`，随后又输出依赖同一 stash 的恢复指令。这会把“安全回滚”降级成“碰运气恢复”。

这个问题已经不再是实现细节，而是 workflow contract 本身的缺陷。现在需要把 checkpoint 生命周期重新收敛成一套明确、可推演、可跨平台执行的状态机，保证成功路径、重试路径、放弃路径和异常退出路径的行为一致。

## What Changes

- 收紧 `verify` Phase 2 的 checkpoint 状态机：区分“保留 checkpoint 继续重试”和“最终恢复后删除 checkpoint”两类动作，明确何时使用 `git stash apply`，何时允许 `git stash pop`
- 修正 `ABORTED_UNSAFE` 及其他失败分支的恢复语义，禁止在仍需手工恢复时提前删除 stash
- 统一恢复文案与结果持久化语义，确保 `.verify-result.json`、`/opsx:verify` 输出和模板提示词表达同一套 checkpoint 生命周期
- 校正 archive 对 `optimization.status` 的消费规则，使 verify 与 archive 对 `ABORTED_UNSAFE` 的含义保持一致
- 收紧 archive-time full verify 的执行语义：当 `/opsx:verify` 合同会进入 Phase 2 时，archive 内联 full verify 不得因“避免 speculative edit”而私自降级为 Phase 1 only
- 增补覆盖 stash 生命周期与 Windows/Linux/macOS 路径约束的场景和测试任务，避免再次把危险动作写进规范

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `verify-optimization`: 调整 Phase 2 checkpoint 的创建、重试回滚、最终放弃与清理规则，消除 `apply` / `pop` / `drop` 语义冲突
- `archive-verify-gate`: 澄清 `optimization.status = ABORTED_UNSAFE` 时的归档门禁含义，确保与 verify 的 canonical result 语义一致
- `opsx-archive-skill`: 明确 archive 内联 full verify 必须在满足条件时完整执行 Phase 2，只允许在 config 禁用或显式 `--skip-optimization` 时写出 `SKIPPED`

## Impact

- Affected specs: `openspec/specs/verify-optimization/spec.md`, `openspec/specs/archive-verify-gate/spec.md`, `openspec/specs/opsx-archive-skill/spec.md`
- Affected templates: `src/core/templates/workflows/verify-change.ts`, `src/core/templates/workflows/archive-change.ts`
- Affected prompt artifacts: `openspec/changes/archive/2026-04-29-enhance-verify-with-optimization/prompt/*.md` 的同类逻辑需要对齐到新 contract
- Affected validation surface: `.verify-result.json` 中 `optimization` 的状态解释、archive 对验证结果的兼容判定、跨平台 checkpoint 恢复说明
