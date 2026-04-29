# OPSX Verify Skill Specification (Delta)

## MODIFIED Requirements

### Requirement: Verification Report Format

The agent SHALL produce a structured, prioritized report with exit code semantics, now including optimization phase results.

#### Scenario: Report summary with optimization

- **WHEN** verification completes
- **THEN** display summary scorecard:
  ```text
  ## Verification Report: <change-name>

  ### Summary
  | Dimension    | Status   |
  |--------------|----------|
  | Completeness | X/Y      |
  | Correctness  | X/Y      |
  | Coherence    | Followed |
  | Optimization | <status> |
  ```
- **AND** the optimization row shows the Phase 2 outcome（`SKIPPED`、`NOT_NEEDED`、`IMPROVED`、`DEGRADED`、`ABORTED_UNSAFE`）

#### Scenario: All checks pass with optimization

- **WHEN** no issues found across all dimensions
- **AND** Phase 2 completed with `IMPROVED`
- **THEN** display: `All checks passed. Code optimized. Ready for archive.`
- **AND** persist result as `PASS`

#### Scenario: Degraded Pass with warnings

- **WHEN** Phase 2 reached `DEGRADED` after 3 failed behavior attempts
- **THEN** display: `Phase 1 PASS. 3 optimization attempts safely reverted.`
- **AND** persist result as `PASS_WITH_WARNINGS`

### Requirement: Verify Result Persistence

The agent SHALL persist verification results including optimization data for downstream apply/archive flows.

#### Scenario: Verify result file written with optimization

- **WHEN** verify completes
- **THEN** the agent SHALL write `openspec/changes/<name>/.verify-result.json`
- **AND** the file SHALL include `timestamp`、`result`、`issues`、`tasksFileHash`、`verificationContext`、**`optimization`**
- **AND** `optimization` SHALL contain `status`、`score`、`attempts`、`baseline`、`final`

#### Scenario: optimization 对象不改变顶层 result 语义

- **WHEN** Phase 1 result is `PASS` and optimization.status is `DEGRADED`
- **THEN** `.verify-result.json` 顶层 `result` SHALL be `PASS_WITH_WARNINGS`
- **AND** 详细优化状态仅在 `optimization.status` 中记录
