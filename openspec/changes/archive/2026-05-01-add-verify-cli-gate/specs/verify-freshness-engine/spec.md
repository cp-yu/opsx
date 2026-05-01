# verify-freshness-engine Specification

## Purpose

定义确定性 freshness 判定引擎的行为——用 TypeScript 代码实现 `tasksFileHash`、`evidenceFingerprint` 的计算和 FRESH/STALE 判定，替代 AI 文本指令的手动计算。

## ADDED Requirements

### Requirement: tasksFileHash 计算

系统 SHALL 提供 `computeTasksFileHash(tasksPath)` 函数，计算 `tasks.md` 文件内容的 SHA-256 哈希。

#### Scenario: 正常计算

- **WHEN** 调用 `computeTasksFileHash('/path/to/tasks.md')`
- **AND** 文件存在且可读
- **THEN** 系统 SHALL 返回文件内容的 SHA-256 十六进制字符串
- **AND** 使用 `crypto.createHash('sha256')`

#### Scenario: 文件不存在

- **WHEN** 调用 `computeTasksFileHash('/path/to/missing.md')`
- **AND** 文件不存在
- **THEN** 系统 SHALL 返回 `null`

### Requirement: evidenceFingerprint 计算

系统 SHALL 提供 `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 函数，基于证据文件列表计算指纹。

#### Scenario: 正常计算

- **WHEN** 调用 `computeEvidenceFingerprint(['src/a.ts', 'src/b.ts'], projectRoot)`
- **AND** 所有文件存在
- **THEN** 系统 SHALL 对 `evidenceFiles` 按字母排序
- **AND** SHALL 对每个文件收集：标准化相对 POSIX 路径 + mtime + size
- **AND** SHALL 将所有元组拼接为字符串后计算 SHA-256
- **AND** 返回十六进制哈希字符串

#### Scenario: 跨平台路径处理

- **WHEN** 在 Windows 上调用 `computeEvidenceFingerprint` 传入 `['src\\a.ts']`
- **THEN** 系统 SHALL 使用 `path.join()`、`path.resolve()`、`path.normalize()` 处理路径
- **AND** SHALL 持久化路径为相对 POSIX 格式（正斜杠）
- **AND** SHALL NOT 硬编码路径分隔符

#### Scenario: 部分文件不存在

- **WHEN** 某个 evidenceFile 在磁盘上不存在
- **THEN** 系统 SHALL 排除该文件
- **AND** 在返回结果中标注被跳过的文件

### Requirement: Freshness 判定

系统 SHALL 提供 `checkFreshness(changeDir, projectRoot)` 函数，判定 `.verify-result.json` 的 freshness。

#### Scenario: FRESH 判定

- **WHEN** 调用 `checkFreshness`
- **AND** `.verify-result.json` 存在
- **AND** `tasksFileHash` 匹配当前 `tasks.md`
- **AND** `evidenceFingerprint` 匹配重新计算值
- **AND** `contractVersion` 为 `"1.0"`
- **AND** `gitHeadCommit` 匹配当前 HEAD（如已记录）
- **AND** `result` 为 PASS 或 PASS_WITH_WARNINGS
- **THEN** 返回 `{ status: 'FRESH', checks: { ... } }`

#### Scenario: STALE 判定

- **WHEN** 任一 freshness 条件不满足
- **THEN** 返回 `{ status: 'STALE', checks: { ... } }` 含具体失败项

#### Scenario: MISSING 判定

- **WHEN** `.verify-result.json` 不存在
- **THEN** 返回 `{ status: 'MISSING', checks: { fileExists: false, ... } }`

### Requirement: Archive Compatibility 判定

系统 SHALL 提供 `checkArchiveCompatibility(verifyResult)` 函数，判定验证结果是否可用于归档。

#### Scenario: Compatible

- **WHEN** `optimization.status` 为 SKIPPED、NOT_NEEDED、IMPROVED 或 DEGRADED
- **THEN** 返回 `{ compatible: true }`

#### Scenario: ABORTED_UNSAFE 阻塞

- **WHEN** `optimization.status` 为 ABORTED_UNSAFE
- **THEN** 返回 `{ compatible: false, blockReason: 'ABORTED_UNSAFE' }`

#### Scenario: Legacy 无 optimization 字段

- **WHEN** `.verify-result.json` 不包含 `optimization` 字段
- **THEN** 返回 `{ compatible: true }`（向后兼容）

#### Scenario: PENDING_VERIFICATION 阻塞

- **WHEN** `optimization.status` 为 PENDING_VERIFICATION
- **THEN** 返回 `{ compatible: false, blockReason: 'PENDING_VERIFICATION' }`
