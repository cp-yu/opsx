## ADDED Requirements

### Requirement: sync 后 evidence fingerprint 增量刷新函数

系统 SHALL 提供 `refreshVerifyEvidenceAfterSync(changeDir, projectRoot, syncedFiles)` 函数，在 sync 完成后增量更新 `.verify-result.json` 中的 evidence fingerprint。

`syncedFiles` 参数 SHALL 是相对于 `projectRoot` 的 POSIX 路径数组，表示本次 sync 实际写入的文件集合。

函数 SHALL 读取 `.verify-result.json`，对 `evidenceFingerprintEntries` 中路径匹配 `syncedFiles` 的条目：
- 使用 `resolveEvidencePath` + `toPosixRelative` 进行路径标准化和比较（与 `computeEvidenceFingerprint` 使用相同函数）
- 读取当前文件内容，重算 SHA-256 哈希
- 更新 entry 的 hash 值

若任何 entry 被更新，SHALL 重算整体 `evidenceFingerprint`（对所有 entries 按路径排序后 JSON.stringify → SHA-256），并写回 `.verify-result.json`。

#### Scenario: 正常刷新

- **WHEN** 调用 `refreshVerifyEvidenceAfterSync(changeDir, projectRoot, ['openspec/project.opsx.yaml'])`
- **AND** `.verify-result.json` 存在且该路径在 entries 中
- **THEN** 重算该 entry 的 hash
- **AND** 重算 overall evidenceFingerprint
- **AND** 写回 `.verify-result.json`

#### Scenario: 无匹配路径

- **WHEN** 调用 `refreshVerifyEvidenceAfterSync` 且 `syncedFiles` 中无路径匹配任何 entry
- **THEN** 不修改 `.verify-result.json`

#### Scenario: .verify-result.json 不存在

- **WHEN** 调用 `refreshVerifyEvidenceAfterSync` 且 `.verify-result.json` 不存在
- **THEN** 静默返回，不报错

#### Scenario: 跨平台路径匹配

- **WHEN** 在 Windows 上调用 `refreshVerifyEvidenceAfterSync`
- **AND** `syncedFiles` 包含 `openspec/project.opsx.yaml`
- **AND** evidence entries 中也包含 `openspec/project.opsx.yaml`
- **THEN** 路径比较 SHALL 使用 POSIX 正斜杠标准化
- **AND** SHALL 正确匹配同一文件