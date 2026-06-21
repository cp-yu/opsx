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
- **AND** 持久化逻辑由 verify CLI 工具（`openspec verify phase1 --input --json`）处理，reviewer subagent 的 writeBackPlan 通过 `reviewer.ts` Output Contract 定义

#### Scenario: 验证结果 freshness 判定

- **WHEN** archive 读取 `.verify-result.json`
- **THEN** 系统 SHALL 判定 verify result 是否 fresh：
  - **FRESH** 当且仅当 ALL of:
    - `verificationContext.evidenceFingerprint` 匹配重新计算的 fingerprint
    - `verificationContext.contractVersion` 是 "1.0"
    - `result` 是 `PASS` 或 `PASS_WITH_WARNINGS`
  - **STALE** 当 ANY of:
    - `evidenceFiles` 列表发生变化（文件增删）
    - `evidenceFingerprint` 不匹配
    - `contractVersion` 缺失或不是 "1.0"
- **AND** `gitHeadCommit` 不匹配时 SHALL 作为 warning 报告，不单独导致 STALE
- **AND** freshness 判定规则由 verify CLI freshness-engine（`src/core/verify/freshness.ts`）统一管理，Archive gate 通过 `openspec verify status --json` 判定 FRESH/STALE/MISSING
