## MODIFIED Requirements

### Requirement: Validation SHALL provide actionable remediation steps

Validation output SHALL include specific guidance to fix each error, including expected structure, example headers, and suggested commands to verify fixes.

#### Scenario: No deltas found in change

- **WHEN** validating a change with zero parsed deltas
- **THEN** show error "No deltas found" with guidance:
  - Explain that change specs must include `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements`
  - Remind authors that files must live under `openspec/changes/{id}/specs/<capability>/spec.md`
  - Include an explicit note: "Spec delta files cannot start with titles before the operation headers"
  - Suggest running `openspec change show {id} --json --deltas-only` for debugging

#### Scenario: Missing required sections

- **WHEN** a required section is missing
- **THEN** include expected header names and a minimal skeleton:
  - For Spec: `## Purpose`, `## Requirements`
  - For Change: `## Why`, `## What Changes`
  - Provide an example snippet of the missing section with placeholder prose ready to copy
  - Mention the quick-reference section in `openspec/AGENTS.md` as the authoritative template

#### Scenario: Missing requirement descriptive text

- **WHEN** a requirement header lacks descriptive text before scenarios
- **THEN** emit an error explaining that `### Requirement:` lines must be followed by narrative text before any `#### Scenario:` headers
  - Show compliant example: "### Requirement: Foo" followed by "The system SHALL ..."
  - Suggest adding 1-2 sentences describing the normative behavior prior to listing scenarios
  - Reference the pre-validation checklist in `openspec/AGENTS.md`

#### Scenario: Section-type 与主 spec header 不一致

- **WHEN** change spec 中 MODIFIED/REMOVED/RENAMED 引用的 requirement header 在主 spec 中不存在
- **OR** change spec 中 ADDED 的 requirement header 在主 spec 中已存在
- **THEN** emit ERROR 并包含修复建议：
  - 对 MODIFIED 不存在：建议改为 `## ADDED Requirements`
  - 对 ADDED 已存在：建议改为 `## MODIFIED Requirements`
  - 对 REMOVED/RENAMED 不存在：说明目标 header 不存在于主 spec
