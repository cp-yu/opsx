## MODIFIED Requirements

### Requirement: Task Completion Check

The skill SHALL 在归档前检查 `tasks.md` 的任务完成状态，并执行强制性的完整验证门禁。

#### Scenario: archive-time full verify 不得私自跳过可执行的 Phase 2

- **WHEN** archive 因缺失或 stale 的 `.verify-result.json` 而重新执行 full verify
- **AND** canonical Phase 1 result 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `openspec/config.yaml` 未禁用 optimization
- **AND** 用户未显式请求 `--skip-optimization`
- **THEN** the skill SHALL 继续执行与 `/opsx:verify` 完全一致的 Phase 2 optimization contract
- **AND** SHALL NOT 仅因 archive-time 存在 speculative edit 风险而降级成 Phase-1-only verify
- **AND** 只有在 config 禁用或用户显式请求 `--skip-optimization` 时，`.verify-result.json` 才可记录 `optimization.status = SKIPPED`
