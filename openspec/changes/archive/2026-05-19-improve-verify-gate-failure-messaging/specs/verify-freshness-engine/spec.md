## MODIFIED Requirements

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

## ADDED Requirements

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