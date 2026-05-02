## Why

当 Agent（遵循模板指示）将 `.verify-result.json` 作为 evidenceFile 传入时，`computeEvidenceFingerprint` 在写入 `.verify-result.json` 前计算指纹（该文件尚不存在，落入 `skippedFiles`），写入后该文件诞生。随后 `checkFreshness` 重新计算指纹时，该文件已存在，被纳入 `entries` 参与哈希，导致指纹不匹配，返回 STALE。这是一个自指循环：验证结果文件本身的状态变化使验证结果立即过期。

## What Changes

- **修复 `computeEvidenceFingerprint`**: 在遍历 evidenceFiles 时，若文件名为 `.verify-result.json`，跳过该文件（不纳入 `entries` 参与哈希计算），放入 `skippedFiles`。这消除了自指循环，且不影响其他证据文件的指纹完整性。

## Capabilities

### New Capabilities

<!-- 无新增能力 -->

### Modified Capabilities

- `verify-freshness-engine`: 修改 `evidenceFingerprint 计算` 需求——`.verify-result.json` 文件 SHALL 被排除在指纹 entries 之外。

## Impact

- `src/core/verify/freshness.ts` — `computeEvidenceFingerprint` 函数：增加对 `.verify-result.json` 的文件名判断和跳过逻辑。
