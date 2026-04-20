## MODIFIED Requirements

### Requirement: 验证结果持久化

系统 SHALL 将 verify 结果持久化到 change 目录下的 `.verify-result.json`，供 archive 检查，并显式记录 freshness 判定所需的验证上下文。

#### Scenario: 持久化验证结果

- **WHEN** verify 完成
- **THEN** 系统 SHALL 在 `openspec/changes/<name>/` 下写入 `.verify-result.json`
- **AND** 文件包含：
  - `timestamp`（ISO 8601）
  - `result`（`PASS` / `PASS_WITH_WARNINGS` / `FAIL_NEEDS_REMEDIATION`）
  - `issues` 数组
  - `tasksFileHash`
  - `verificationContext` 对象（见下方 scenario）
- **AND** 具体持久化逻辑见 `prompts.md` 中 verify-change.ts Step 10

#### Scenario: 记录 verification context

- **WHEN** verify 写入 `.verify-result.json`
- **THEN** 系统 SHALL 在 `verificationContext` 对象中记录：
  - `contractVersion`: "1.0" (当前验证合同版本)
  - `executionMode`: 'clean-context-reviewer' 或 'current-agent-reread'
  - `evidenceFiles`: 本次验证实际审阅的文件列表（相对 POSIX 路径，已排序）
  - `evidenceFingerprint`: 基于 evidenceFiles 的路径、修改时间、大小计算的 SHA-256 hash
  - `gitHeadCommit`: 当前 HEAD commit SHA（可选，如果在 git repo 中）
  - `gitDiffSummary`: `git diff --stat` 输出摘要（可选，如果有改动）
- **AND** SHALL 使用跨平台路径处理（`path.join`, `path.resolve`）

#### Scenario: 验证结果 freshness 判定

- **WHEN** archive 读取 `.verify-result.json`
- **THEN** 系统 SHALL 判定 verify result 是否 fresh：
  - **FRESH** 当且仅当 ALL of:
    - `tasksFileHash` 匹配当前 `tasks.md` 的 hash
    - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
    - `verificationContext.contractVersion` 是 "1.0"
    - `verificationContext.gitHeadCommit` 匹配当前 HEAD（如果记录了）
    - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
  - **STALE** 当 ANY of:
    - `tasksFileHash` 不匹配
    - `evidenceFiles` 列表发生变化（文件增删）
    - `evidenceFingerprint` 不匹配
    - `gitHeadCommit` 不匹配
    - `contractVersion` 缺失或不是 "1.0"
- **AND** 具体规则见 `prompts.md` 中的 `VERIFY_FRESHNESS_RULES`

#### Scenario: 跨平台路径处理

- **WHEN** 写入或读取 `.verify-result.json`
- **THEN** 系统 SHALL 使用 `path.join()` 构建文件路径
- **AND** SHALL NOT 硬编码路径分隔符

#### Scenario: Windows 下的 evidence file 路径处理

- **WHEN** verification context 持久化 evidence file 路径
- **THEN** 系统 SHALL 使用跨平台可比较的路径表示
- **AND** archive 在比较 freshness 时 SHALL NOT 因 `\\` 与 `/` 的差异误判结果过期或新鲜
