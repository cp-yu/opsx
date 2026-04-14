# opsx-verify-skill Specification

## Purpose
Define `/opsx:verify` behavior for assessing implementation completeness, correctness, and coherence against change artifacts.
## Requirements
### Requirement: Verify Skill Invocation
The system SHALL provide an `/opsx:verify` skill that validates implementation against change artifacts.

#### Scenario: Verify with change name provided
- **WHEN** agent executes `/opsx:verify <change-name>`
- **THEN** the agent verifies implementation for that specific change
- **AND** produces a verification report

#### Scenario: Verify without change name
- **WHEN** agent executes `/opsx:verify` without a change name
- **THEN** the agent prompts user to select from available changes
- **AND** shows only changes that have implementation tasks

#### Scenario: Change has no tasks
- **WHEN** selected change has no tasks.md or tasks are empty
- **THEN** the agent reports "No tasks to verify"
- **AND** suggests running `/opsx:continue` to create tasks

### Requirement: Completeness Verification
The agent SHALL verify that all required work has been completed.

#### Scenario: Task completion check
- **WHEN** verifying completeness
- **THEN** the agent reads tasks.md
- **AND** counts tasks marked `- [x]` (complete) vs `- [ ]` (incomplete)
- **AND** reports completion status with specific incomplete tasks listed

#### Scenario: Spec coverage check
- **WHEN** verifying completeness
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the agent extracts all requirements from delta specs
- **AND** searches codebase for implementation of each requirement
- **AND** reports which requirements appear to have implementation vs which are missing

#### Scenario: All tasks complete
- **WHEN** all tasks are marked complete
- **THEN** report "Tasks: N/N complete"
- **AND** mark completeness dimension as passed

#### Scenario: Incomplete tasks found
- **WHEN** some tasks are incomplete
- **THEN** report "Tasks: X/N complete"
- **AND** list each incomplete task
- **AND** mark as CRITICAL issue
- **AND** suggest: "Complete remaining tasks or mark as done if already implemented"

### Requirement: Correctness Verification
The agent SHALL verify that implementation matches the specifications.

#### Scenario: Requirement implementation mapping
- **WHEN** verifying correctness
- **THEN** for each requirement in delta specs:
  - Search codebase for implementation
  - Identify relevant files and line numbers
  - Assess whether implementation satisfies the requirement

#### Scenario: Scenario coverage check
- **WHEN** verifying correctness
- **THEN** for each scenario in delta specs:
  - Check if the scenario's conditions are handled in code
  - Check if tests exist that cover the scenario
  - Report coverage status

#### Scenario: Implementation matches spec
- **WHEN** implementation appears to satisfy a requirement
- **THEN** report which files/lines implement it
- **AND** mark requirement as covered

#### Scenario: Implementation diverges from spec
- **WHEN** implementation exists but doesn't match spec intent
- **THEN** report the divergence as WARNING
- **AND** explain what differs
- **AND** suggest: either update implementation or update spec to match reality

#### Scenario: Missing implementation
- **WHEN** no implementation found for a requirement
- **THEN** report as CRITICAL issue
- **AND** suggest: "Implement requirement X" with guidance on what's needed

### Requirement: Coherence Verification
The agent SHALL verify that implementation is sensible and follows design decisions.

#### Scenario: Design.md adherence check
- **WHEN** verifying coherence
- **AND** design.md exists for the change
- **THEN** extract key decisions from design.md
- **AND** verify implementation follows those decisions
- **AND** report any deviations

#### Scenario: No design.md
- **WHEN** verifying coherence
- **AND** no design.md exists
- **THEN** skip design adherence check
- **AND** note "No design.md to verify against"

#### Scenario: Design decision followed
- **WHEN** implementation follows a design decision
- **THEN** report as confirmed
- **AND** cite evidence from code

#### Scenario: Design decision violated
- **WHEN** implementation contradicts a design decision
- **THEN** report as WARNING
- **AND** explain the contradiction
- **AND** suggest: either update implementation or update design.md

#### Scenario: Code pattern consistency
- **WHEN** verifying coherence
- **THEN** check if new code follows existing project patterns
- **AND** flag any significant deviations as suggestions

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

### Requirement: Verify Write-back
The agent SHALL write back high-confidence CRITICAL verification failures into `tasks.md`.

#### Scenario: CRITICAL issue unmarks completed task
- **WHEN** verify finds a CRITICAL issue that maps to a task currently marked `- [x]`
- **THEN** the agent SHALL change that task entry to `- [ ]`
- **AND** SHALL explain the requirement and reason in the remediation output

#### Scenario: WARNING issue does not unmark task
- **WHEN** verify finds only WARNING or SUGGESTION issues for a completed task
- **THEN** the agent SHALL keep the task marked complete
- **AND** SHALL report the issue without mutating `tasks.md`

#### Scenario: Remediation section appended
- **WHEN** verify finds one or more fixable issues
- **THEN** the agent SHALL append or refresh a `## Remediation` section in `tasks.md`
- **AND** SHALL write each remediation item as a checkbox tagged `[code_fix]` or `[artifact_fix]`
- **AND** SHALL avoid duplicating the same remediation item across repeated runs

### Requirement: Verify Result Persistence
The agent SHALL persist verification results for downstream apply/archive flows.

#### Scenario: Verify result file written
- **WHEN** verify completes
- **THEN** the agent SHALL write `openspec/changes/<name>/.verify-result.json`
- **AND** the file SHALL include `timestamp`, `result`, `issues`, and `tasksFileHash`

#### Scenario: tasks hash captured after write-back
- **WHEN** verify writes `.verify-result.json`
- **THEN** `tasksFileHash` SHALL describe the current `tasks.md` contents after any task unmark or remediation update

#### Scenario: Cross-platform verify result path
- **WHEN** the agent reads or writes `.verify-result.json`
- **THEN** it SHALL build the path with `path.join()`
- **AND** SHALL NOT rely on hardcoded path separators

### Requirement: Flexible Artifact Handling
The agent SHALL gracefully handle changes with varying artifact completeness.

#### Scenario: Minimal change (tasks only)
- **WHEN** change has only tasks.md
- **THEN** verify task completion only
- **AND** skip spec and design checks
- **AND** note which checks were skipped

#### Scenario: Change with specs but no design
- **WHEN** change has tasks.md and delta specs but no design.md
- **THEN** verify completeness and correctness
- **AND** skip design adherence
- **AND** still check code coherence against project patterns

#### Scenario: Full change (all artifacts)
- **WHEN** change has proposal, design, specs, and tasks
- **THEN** perform all verification checks
- **AND** cross-reference artifacts for consistency

