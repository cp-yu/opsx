# Spec: verify-freshness-engine

引用主规约: `specs/verify-freshness-engine/spec.md`

## ADDED Requirements

### Requirement: Phase 2 验证通过后同步更新顶层快照

在 Phase 2 verification PASS 时，系统 SHALL 同步更新顶层 `verificationContext` 的三个时间敏感字段，确保快照自洽性。

#### Scenario: Phase 2 verification PASS 同步更新

- **GIVEN** Phase 2 optimization 已提议且文件已应用 patch
- **AND** `current.optimization.status === 'PENDING_VERIFICATION'`
- **WHEN** `handleVerification` 接收到 `input.result === 'PASS'` 或 `'PASS_WITH_WARNINGS'`
- **THEN** 系统 SHALL 调用 `computeEvidenceFingerprint(current.verificationContext.evidenceFiles, projectRoot)`
- **AND** SHALL 将返回的 `evidence.hash` 赋值给 `current.verificationContext.evidenceFingerprint`
- **AND** SHALL 将返回的 `evidence.entries` 赋值给 `current.verificationContext.evidenceFingerprintEntries`
- **AND** SHALL 调用 `await getGitHead(projectRoot)` 获取当前 HEAD
- **AND** SHALL 将获取的 commit SHA 赋值给 `current.verificationContext.gitHeadCommit`
- **AND** SHALL 将 `new Date().toISOString()` 赋值给 `current.verificationContext.timestamp`
- **AND** SHALL 在一次 `writeVerifyResult` 调用中原子性持久化所有字段

#### Scenario: baseline 快照保持不变

- **GIVEN** Phase 2 verification PASS 更新了顶层 `verificationContext`
- **WHEN** 读取 `current.optimization.baseline.verificationContext`
- **THEN** baseline 的 `gitHeadCommit` SHALL 保持为 Phase 1 时的 commit SHA
- **AND** baseline 的 `evidenceFingerprintEntries` SHALL 保持为 Phase 1 时的文件哈希
- **AND** baseline 的 `timestamp` SHALL 保持为 Phase 1 执行时刻

### Requirement: verificationContext 自洽性不变式

系统 SHALL 维护 `verificationContext` 的三字段自洽性不变式：`gitHeadCommit` 所指提交中各 `evidenceFiles` 的实际文件哈希 MUST 与 `evidenceFingerprintEntries` 记录的哈希匹配，且 `evidenceFingerprint` MUST 等于 `SHA256(JSON.stringify(evidenceFingerprintEntries))`，`timestamp` MUST 记录该快照的采样时刻。

#### Scenario: 顶层快照三字段自洽

- **GIVEN** Phase 2 verification 已完成且 `optimization.status === 'IMPROVED'`
- **WHEN** 使用 `git show <gitHeadCommit>:<evidenceFile>` 计算文件哈希
- **THEN** 计算出的哈希 SHALL 与 `evidenceFingerprintEntries` 中对应路径的 `hash` 字段匹配
- **AND** `SHA256(JSON.stringify(evidenceFingerprintEntries))` SHALL 等于 `evidenceFingerprint`
- **AND** `timestamp` SHALL 为 ISO 8601 格式且与 `gitHeadCommit` 和文件哈希对应同一快照时刻
