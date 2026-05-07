## MODIFIED Requirements

### Requirement: evidenceFingerprint 计算

系统 SHALL 提供 `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 函数，基于证据文件的内容计算指纹。`.verify-result.json` 文件 SHALL 被排除在指纹 entries 之外，不参与哈希计算。

#### Scenario: 正常计算

- **WHEN** 调用 `computeEvidenceFingerprint(['src/a.ts', 'src/b.ts'], projectRoot)`
- **AND** 所有文件存在
- **THEN** 系统 SHALL 对 `evidenceFiles` 按字母排序
- **AND** SHALL 对每个文件收集：标准化相对 POSIX 路径 + 文件内容 SHA-256 哈希
- **AND** SHALL 将所有 entries 通过 `JSON.stringify` 序列化后计算 SHA-256 作为整体指纹
- **AND** 返回十六进制哈希字符串

#### Scenario: 排除 .verify-result.json

- **WHEN** 调用 `computeEvidenceFingerprint` 且 evidenceFiles 包含以 `.verify-result.json` 为文件名的路径
- **THEN** 系统 SHALL 使用 `path.basename` 检测该文件
- **AND** SHALL 将该文件放入 `skippedFiles`
- **AND** SHALL NOT 将该文件纳入 `entries` 参与哈希计算
- **AND** 不影响其他 evidenceFile 的正常处理

#### Scenario: 跨平台路径处理

- **WHEN** 在 Windows 上调用 `computeEvidenceFingerprint` 传入 `['src\\a.ts']`
- **THEN** 系统 SHALL 使用 `path.join()`、`path.resolve()`、`path.normalize()` 处理路径
- **AND** SHALL 持久化路径为相对 POSIX 格式（正斜杠）
- **AND** SHALL NOT 硬编码路径分隔符

#### Scenario: 部分文件不存在

- **WHEN** 某个 evidenceFile 在磁盘上不存在
- **THEN** 系统 SHALL 排除该文件
- **AND** 在返回结果中标注被跳过的文件

#### Scenario: 内容哈希稳定性

- **WHEN** 证据文件内容未变更
- **AND** 文件 mtime 或 size 因文件系统操作（git checkout、编辑器保存）发生变化
- **THEN** 系统 SHALL 产生与之前相同的指纹哈希
- **AND** `checkFreshness` SHALL 判定为 FRESH

### Requirement: Freshness 判定

系统 SHALL 提供 `checkFreshness(changeDir, projectRoot)` 函数，判定 `.verify-result.json` 的 freshness。

#### Scenario: FRESH 判定

- **WHEN** 调用 `checkFreshness`
- **AND** `.verify-result.json` 存在
- **AND** `evidenceFingerprint` 匹配重新计算值
- **AND** `contractVersion` 为 `"1.0"`
- **AND** `gitHeadCommit` 匹配当前 HEAD（如已记录）
- **AND** `result` 为 PASS 或 PASS_WITH_WARNINGS
- **THEN** 返回 `{ status: 'FRESH', checks: { ... } }`

`tasksFileHash` SHALL NOT 参与 FRESH 判定 — tasks.md 已在 evidenceFiles 中被 evidenceFingerprint 覆盖，且 verify 后标记完成导致其内容必然变化。
