## MODIFIED Requirements

### Requirement: Verification Report Format

The agent SHALL produce a structured, prioritized report with exit code semantics.

#### Scenario: Report summary

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
  ```

#### Scenario: Issue prioritization

- **WHEN** issues are found
- **THEN** group and display in priority order:
  1. CRITICAL - Must fix before archive (missing implementation, incomplete tasks)
  2. WARNING - Should fix (divergence from spec/design, missing tests)
  3. SUGGESTION - Nice to fix (pattern inconsistencies, minor improvements)

#### Scenario: Actionable recommendations

- **WHEN** reporting an issue
- **THEN** include specific, actionable fix recommendation
- **AND** reference relevant files and line numbers where applicable
- **AND** avoid vague suggestions like "consider reviewing"

#### Scenario: All checks pass

- **WHEN** no issues found across all dimensions
- **THEN** display: `All checks passed. Ready for archive.`
- **AND** persist result as `PASS`

#### Scenario: Critical issues found with write-back

- **WHEN** CRITICAL issues exist
- **THEN** display: `X critical issue(s) found. Fix before archiving.`
- **AND** execute write-back: unmark affected tasks in `tasks.md`
- **AND** append remediation section to `tasks.md`
- **AND** persist result as `FAIL_NEEDS_REMEDIATION`
- **AND** do NOT suggest running archive

#### Scenario: Only warnings/suggestions

- **WHEN** no CRITICAL issues but warnings exist
- **THEN** display: `No critical issues. Y warning(s) to consider. Ready for archive (with noted improvements).`
- **AND** persist result as `PASS_WITH_WARNINGS`
