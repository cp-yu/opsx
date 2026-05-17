## 1. Actions

- [x] A1 在 `handleVerification` PASS 路径中，`writeVerifyResult` 之前插入 `computeEvidenceFingerprint` 重算并更新 `current.verificationContext.evidenceFingerprint`
- [x] A2 为 Phase 2 verification PASS 后 fingerprint 更新行为添加单元测试

## 2. Checks

- [x] C1 验证 Phase 2 verification PASS 后 fingerprint 已更新
  - Covers: A1
  - Command: `pnpm test -- --grep "fingerprint"`
  - Expect: `handleVerification` PASS 路径写入的 `.verify-result.json` 中 `verificationContext.evidenceFingerprint` 与磁盘文件当前状态一致

- [x] C2 验证 DEGRADED 路径不更新 fingerprint
  - Covers: A1
  - Command: `pnpm test -- --grep "DEGRADED"`
  - Expect: DEGRADED 路径写入的 `.verify-result.json` 中 `verificationContext.evidenceFingerprint` 保持 Phase 1 原始值

- [x] C3 验证回归测试通过
  - Covers: A1, A2
  - Command: `pnpm test`
  - Expect: 全部测试通过，无回归

- [x] C4 验证跨平台 CI 通过
  - Covers: A1, A2
  - Command: `pnpm test`
  - Expect: Windows CI 矩阵中测试通过（`computeEvidenceFingerprint` 已有跨平台路径处理，本次修改仅调用该函数，不引入新路径操作）
