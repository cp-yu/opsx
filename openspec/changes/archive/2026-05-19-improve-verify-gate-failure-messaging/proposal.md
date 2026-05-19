## Why

当 verify gate 失败时（因 changes 新增内容导致 evidenceFingerprint 或 gitHeadCommit 过期），当前的错误信息仅输出技术性 hash 不匹配，缺乏诊断细节和可操作的补救指引。用户看到 `evidenceFingerprint does not match` 后不知道具体哪些文件变更、也不清楚下一步是重新 verify 还是用 `--no-verify` 跳过。

## What Changes

- `formatVerifyGateFailure` 输出增强：包含变更证据文件列表、git HEAD 前后对比、以及明确的补救操作指引
- `checkFreshness` 产生更丰富的 `details`：追加文件级和 commit 级差异信息
- sync 和 archive 命令中的 verify gate 失败输出无变化（共用同一格式化函数，行为改善）

## Capabilities

### New Capabilities
<!-- None — 这是对现有错误输出的增强，无需新 capability -->
（无新增 capability）

### Modified Capabilities
- `verify-freshness-engine`: `checkFreshness` 在 STALE 判定时生成更详细的诊断细节；`formatVerifyGateFailure` 输出格式扩展为包含操作指引
- `cli-sync`: verify gate 失败时的输出行为随 `formatVerifyGateFailure` 增强而改善

## Impact

- `src/core/verify/freshness.ts`: `checkFreshness`、`formatVerifyGateFailure`、可能的 `computeEvidenceFingerprint` 调用方
- `src/commands/sync.ts`: 间接影响 — 共用格式化函数
- `src/core/archive.ts`: 间接影响 — 共用格式化函数
- 测试文件: `test/commands/verify.test.ts`、`test/commands/sync.test.ts` 需更新以匹配新输出格式