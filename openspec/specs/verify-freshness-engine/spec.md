# verify-freshness-engine Specification

## Purpose
此规约记录变更 add-verify-cli-gate 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
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

系统 SHALL 提供 `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 函数，基于证据文件的内容计算指纹。`.verify-result.json` 文件 SHALL 被排除在指纹 entries 之外，不参与哈希计算。

Phase 2 verification 通过时（`optimization.status` 转为 `IMPROVED`），系统 SHALL 在持久化 `.verify-result.json` 之前，调用 `computeEvidenceFingerprint` 重算 `verificationContext.evidenceFingerprint`，使其反映优化后的文件状态。

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

#### Scenario: Phase 2 verification PASS 后 fingerprint 更新

- **WHEN** `handleVerification` 收到 `result` 为 PASS 或 PASS_WITH_WARNINGS
- **AND** `optimization.status` 从 PENDING_VERIFICATION 转为 IMPROVED
- **THEN** 系统 SHALL 从 `current.verificationContext.evidenceFiles` 读取证据文件列表
- **AND** SHALL 调用 `computeEvidenceFingerprint(evidenceFiles, projectRoot)` 重算指纹
- **AND** SHALL 将新指纹写入 `current.verificationContext.evidenceFingerprint`
- **AND** SHALL 在上述更新完成后才调用 `writeVerifyResult`

#### Scenario: Phase 2 verification PASS 后 verify status 返回 FRESH

- **WHEN** Phase 2 verification 通过且 fingerprint 已更新
- **AND** 随后调用 `openspec verify status`
- **AND** 磁盘文件未再发生变更
- **THEN** `checkFreshness` SHALL 返回 `status: 'FRESH'`

#### Scenario: DEGRADED 路径不更新 fingerprint

- **WHEN** `handleVerification` 收到 `result` 为 FAIL_NEEDS_REMEDIATION
- **AND** 重试次数已耗尽，`optimization.status` 转为 DEGRADED
- **THEN** 系统 SHALL NOT 重算 `evidenceFingerprint`
- **AND** 原始 Phase 1 fingerprint 保持不变（因为 checkpoint 已恢复磁盘文件到 Phase 1 状态）

### Requirement: Freshness 判定

系统 SHALL 提供 `checkFreshness(changeDir, projectRoot)` 函数，判定 `.verify-result.json` 的 freshness。

当 freshness 为 STALE 时，`details` 数组 SHALL 包含：

- fingerprint 不匹配时：列出 hash 变更的证据文件及其相对路径，格式为 `evidenceFingerprint mismatch — modified files: <path1>, <path2>, ...`
- git HEAD 不匹配时：记录旧值与新值对比，格式为 `gitHeadCommit changed: <recorded> → <current>`
- 其他检查项（contractVersion、resultAcceptable）保持现有描述格式

指纹差异计算 SHALL 通过对比 `.verify-result.json` 中记录的 `evidenceFingerprint.entries` 与重新计算的文件 hash 来确定变更文件列表。

#### Scenario: FRESH 判定

- **WHEN** 调用 `checkFreshness`
- **AND** `.verify-result.json` 存在
- **AND** `evidenceFingerprint` 匹配重新计算值
- **AND** `contractVersion` 为 `"1.0"`
- **AND** `gitHeadCommit` 匹配当前 HEAD（如已记录）
- **AND** `result` 为 PASS 或 PASS_WITH_WARNINGS
- **THEN** 返回 `{ status: 'FRESH', checks: { ... } }`

`tasksFileHash` SHALL NOT 参与 FRESH 判定 — tasks.md 已在 evidenceFiles 中被 evidenceFingerprint 覆盖，且 verify 后标记完成导致其内容必然变化。

#### Scenario: STALE 因 evidenceFingerprint 不匹配

- **WHEN** 调用 `checkFreshness`
- **AND** `.verify-result.json` 存在
- **AND** 重新计算的指纹与记录的 `evidenceFingerprint` 不一致
- **THEN** `status` 为 `STALE`
- **AND** `checks.evidenceFingerprint` 为 `false`
- **AND** `details` 包含一条以 `evidenceFingerprint mismatch — modified files:` 开头的条目
- **AND** 该条目 SHALL 列出所有 hash 不一致的文件路径

#### Scenario: STALE 因 gitHeadCommit 不匹配

- **WHEN** 调用 `checkFreshness`
- **AND** 记录的 `gitHeadCommit` 与当前 HEAD 不一致
- **THEN** `status` 为 `STALE`
- **AND** `checks.gitHeadCommit` 为 `false`
- **AND** `details` 包含一条以 `gitHeadCommit changed:` 开头的条目
- **AND** 该条目 SHALL 展示 `<recorded> → <current>` 格式的对比

#### Scenario: 多处同时不匹配

- **WHEN** 调用 `checkFreshness`
- **AND** evidenceFingerprint 与 gitHeadCommit 同时不匹配
- **THEN** `details` 包含两条独立条目，分别描述指纹差异和 HEAD 差异

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

### Requirement: formatVerifyGateFailure 输出格式

系统 SHALL 提供 `formatVerifyGateFailure(freshness, archiveCompatibility?)` 函数，生成结构化的 verify gate 失败消息。

输出 SHALL 按以下结构组织：

```
✗ Verify gate failed — <简述失败原因>

  证据文件指纹不匹配:
    - <相对路径>
    - <相对路径>

  Git HEAD:
    <旧hash> → <新hash>

  建议操作:
    openspec verify phase1 <change-name>  # 重新验证
    openspec <command> <change-name> --no-verify  # 跳过门禁 (风险自负)
```

其中 `<command>` 由调用上下文决定 — sync 场景为 `openspec sync`，archive 场景为 `openspec archive`。如果 `archiveCompatibility` 指示不兼容，输出中 SHALL 包含对应的 `blockReason`。

如果没有任何指纹不匹配的文件，指纹部分 SHALL 被省略。如果 gitHeadCommit 匹配，Git HEAD 部分 SHALL 被省略。

#### Scenario: 全部信息输出

- **WHEN** 调用 `formatVerifyGateFailure` 且 fingerprint 和 HEAD 均不匹配
- **AND** `archiveCompatibility` 不兼容（blockReason = PENDING_VERIFICATION）
- **THEN** 输出 SHALL 包含指纹不匹配的文件列表
- **AND** 包含 git HEAD 前后对比
- **AND** 包含 `archiveCompatibility: PENDING_VERIFICATION`
- **AND** 末尾包含建议操作段落

#### Scenario: 部分信息省略

- **WHEN** fingerprint 未通过但 git HEAD 匹配
- **THEN** 输出省略 Git HEAD 段落

#### Scenario: archive 上下文的建议操作

- **WHEN** `formatVerifyGateFailure` 用于 archive 命令的 verify gate 失败
- **THEN** 建议操作中 SHALL 使用 `openspec archive` 而非 `openspec sync`

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

