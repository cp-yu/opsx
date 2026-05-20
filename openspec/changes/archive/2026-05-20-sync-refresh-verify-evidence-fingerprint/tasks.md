## 1. Actions

- [x] A1 在 `src/core/verify/freshness.ts` 中新增 `refreshVerifyEvidenceAfterSync` 导出函数
- [x] A2 在 `src/core/change-sync.ts` 的 `applyPreparedChangeSync` 末尾调用 `refreshVerifyEvidenceAfterSync`
- [x] A3 补充 `refreshVerifyEvidenceAfterSync` 的单元测试（覆盖正常刷新、无匹配、缺失 result 等场景）
- [x] A4 验证 archive CLI 路径：带 delta 的 change 在 sync 后 `checkFreshness` 仍返回 FRESH

## 2. Checks

- [x] C1 验证 `refreshVerifyEvidenceAfterSync` 可正确刷新 sync 输出文件的哈希
  - Covers: A1, A3
  - Command: `pnpm test -- --testPathPattern="freshness"`
  - Expect: 新增测试用例全部通过

- [x] C2 验证 `applyPreparedChangeSync` 在写入 OPSX delta 后自动刷新 evidence fingerprint
  - Covers: A2, A4
  - Evidence: 手动构造带 `.verify-result.json` 和 `opsx-delta.yaml` 的 change，执行 sync 后检查 evidenceFingerprint 是否与当前文件内容一致
  - Expect: sync 后 evidenceFingerprint 反映 sync 写入的文件最新哈希，`checkFreshness` 返回 FRESH

- [x] C3 验证 change 级 spec 文件的指纹不受 sync 影响
  - Covers: A2
  - Evidence: evidence 中包含 change spec 路径，sync 执行后该 entry hash 不变
  - Expect: change 级 spec 的 hash 保持 sync 前的值

- [x] C4 验证 `.verify-result.json` 不存在时不报错
  - Covers: A2
  - Command: `openspec sync <change-without-verify-result>`
  - Expect: sync 正常完成，不输出 refresh 相关错误
