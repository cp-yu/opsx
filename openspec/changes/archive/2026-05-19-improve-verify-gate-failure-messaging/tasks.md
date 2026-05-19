## 1. Actions

- [x] A1 修改 `checkFreshness` 的 fingerprint 不匹配 details: 对比 `evidenceFingerprint.entries` 与重算 hash，输出变更文件列表
- [x] A2 修改 `checkFreshness` 的 git Head 不匹配 details: 输出旧 commit → 新 commit 对比
- [x] A3 重写 `formatVerifyGateFailure`: 结构化输出包含诊断区块（指纹差异、HEAD 对比）和操作建议区块
- [x] A4 更新现有测试以匹配新的 error message 格式

## 2. Checks

- [x] C1 验证 fingerprint 不匹配时输出变更文件列表
  - Covers: A1
  - Command: `pnpm test test/commands/verify.test.ts`
  - Expect: STALE 状态的 details 包含 `evidenceFingerprint mismatch — modified files:` 前缀及具体文件路径

- [x] C2 验证 git HEAD 不匹配时输出前后对比
  - Covers: A2
  - Command: `pnpm test test/commands/verify.test.ts`
  - Expect: STALE 状态的 details 包含 `gitHeadCommit changed:` 前缀及 `<old> → <new>` 格式

- [x] C3 验证 formatVerifyGateFailure 完整输出包含建议操作段落
  - Covers: A3
  - Command: `pnpm test test/commands/verify.test.ts`
  - Expect: 错误输出末尾包含 `openspec verify phase1` 和 `--no-verify` 两条操作指引

- [x] C4 验证 sync verify gate 失败输出包含操作指引
  - Covers: A3
  - Command: `pnpm test test/commands/sync.test.ts`
  - Expect: sync verify gate 失败时输出包含重新 verify 的建议命令

- [x] C5 验证 archive verify gate 失败输出使用 archive 上下文
  - Covers: A3
  - Command: `pnpm test test/core/archive.test.ts`
  - Expect: archive verify gate 失败时建议操作使用 `openspec archive` 命令

- [x] C6 验证无优化变更全流程: proposal → specs → tasks 完整性
  - Covers: A1, A2, A3, A4
  - Command: `openspec validate improve-verify-gate-failure-messaging --type change --json`
  - Expect: validation 通过，无 errors
