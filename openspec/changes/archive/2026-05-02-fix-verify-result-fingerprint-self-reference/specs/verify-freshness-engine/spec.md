## MODIFIED Requirements

### Requirement: evidenceFingerprint 计算

系统 SHALL 提供 `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 函数，基于证据文件列表计算指纹。`.verify-result.json` 文件 SHALL 被排除在指纹 entries 之外，不参与哈希计算。

#### Scenario: 正常计算

- **WHEN** 调用 `computeEvidenceFingerprint(['src/a.ts', 'src/b.ts'], projectRoot)`
- **AND** 所有文件存在
- **THEN** 系统 SHALL 对 `evidenceFiles` 按字母排序
- **AND** SHALL 对每个文件收集：标准化相对 POSIX 路径 + mtime + size
- **AND** SHALL 将所有元组拼接为字符串后计算 SHA-256
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
