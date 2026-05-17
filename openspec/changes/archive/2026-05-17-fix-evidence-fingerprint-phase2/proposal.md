## Why

Phase 2 optimizer 修改文件后，`evidenceFingerprint` 仍保留 Phase 1 时的值。`seal` 不重算 fingerprint，导致 `/opsx:archive` 调用 `openspec verify status` 时必然得到 STALE，被迫重新执行完整 verify 合约。

## What Changes

- `handleVerification` 在 `optimization.status` 转为 `IMPROVED` 时，重算 `verificationContext.evidenceFingerprint` 再写入 `.verify-result.json`
- 确保 seal 后 `openspec verify status` 返回 FRESH，archive 无需重复验证

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `verify-freshness-engine`: Phase 2 verification PASS 路径新增 fingerprint 重算，使 fingerprint 生命周期覆盖优化后的文件状态

## Impact

- 受影响代码：`src/commands/verify.ts` — `handleVerification` 函数的 PASS 分支
- 依赖：`computeEvidenceFingerprint` 已在同文件导入，无新依赖
- 行为变更：seal 后 `verify status` 从 STALE 变为 FRESH（修复预期行为）
- 向后兼容：无 breaking change，仅修复 fingerprint 未更新的缺陷
