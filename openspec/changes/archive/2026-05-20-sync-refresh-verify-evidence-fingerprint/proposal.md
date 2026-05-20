## Why

归档流程中 `sync` 改写主 OPSX 文件和主规约文件后，`verify` 的 evidence fingerprint 立即失效（STALE），迫使 archive 重新执行完整 Phase 1 + Phase 2。根因是 sync 的合法输出写入与 verify 的 evidence 指纹共享了同一组文件对象 — sync 改写 `project.opsx.yaml` 和 `openspec/specs/**`，而这些文件正好在 evidence 指纹中。

## What Changes

- `applyPreparedChangeSync` 在完成所有文件写入后，自动检测 `.verify-result.json` 是否存在
- 若存在且 evidenceFingerprintEntries 中包含本次 sync 写入的文件路径，则重算这些文件的哈希并更新 evidenceFingerprint
- 仅刷新 sync 实际改写过的 evidence 文件条目，change 级 spec（`openspec/changes/<name>/specs/`）和实现代码不受影响
- 此行为在 `applyPreparedChangeSync` 内部透明生效，所有调用方（standalone `openspec sync`、archive CLI、agent 模板）自动受益

## Capabilities

### New Capabilities
- `sync-evidence-refresh`: sync 完成后自动刷新 `.verify-result.json` 中与 sync 输出重叠的 evidence 文件哈希，使 verify freshness 判决不受合法 sync 写入的影响

### Modified Capabilities
- `cli-sync`: sync 执行后新增 evidence fingerprint 刷新步骤，但不改变 sync 的核心语义（delta → 主输出）
- `verify-freshness-engine`: 新增 `refreshEvidenceFingerprintAfterSync` 工具函数，为 sync 模块提供 fingerprints 增量更新能力

## Impact

- `src/core/change-sync.ts` — `applyPreparedChangeSync` 末尾新增 re-fingerprint 步骤
- `src/core/verify/freshness.ts` — 新增 `refreshVerifyEvidenceAfterSync` 导出函数
- 调用方无需改动（archive.ts、sync.ts、agent 模板均透明受益）