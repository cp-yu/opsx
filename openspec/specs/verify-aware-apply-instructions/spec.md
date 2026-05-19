# verify-aware-apply-instructions Specification

## Purpose
此规约记录变更 fix-apply-instructions-verify-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Apply 指令检查 verify 状态

`openspec instructions apply` 命令在判定 change 的 `state` 时 SHALL 集成 verify freshness 检查，而非仅依赖 task checkbox 完成度。

#### Scenario: 全部 tasks 完成但 verify 未执行

- **WHEN** `tasks.md` 中所有 checkbox 均为 `[x]`
- **AND** `.verify-result.json` 不存在于 change 目录
- **THEN** `state` SHALL 为 `'needs_verify'`
- **AND** `instruction` SHALL 包含引导执行 Phase 1 验证的文本

#### Scenario: 全部 tasks 完成且 verify 结果为 FRESH

- **WHEN** `tasks.md` 中所有 checkbox 均为 `[x]`
- **AND** `.verify-result.json` 存在且 `checkFreshness` 返回 `FRESH`
- **AND** `checkArchiveCompatibility` 返回 `{ compatible: true }`
- **THEN** `state` SHALL 为 `'all_done'`

#### Scenario: Phase1 PASS 但 Phase2 未完成

- **WHEN** `tasks.md` 中所有 checkbox 均为 `[x]`
- **AND** `.verify-result.json` 存在，`result` 为 `PASS` 或 `PASS_WITH_WARNINGS`
- **AND** `optimization.status` 为 `PENDING_VERIFICATION`
- **THEN** `state` SHALL 为 `'needs_seal'`

#### Scenario: 非 spec-driven schema 无 tracksFile

- **WHEN** schema 未配置 `apply.tracks` (即 `tracksFile` 为 null)
- **AND** required artifacts 全部存在
- **THEN** 保持现有行为，`state` 为 `'ready'`

