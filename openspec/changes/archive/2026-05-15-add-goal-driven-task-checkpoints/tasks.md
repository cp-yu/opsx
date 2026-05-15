## 1. Actions

- [x] A1 Update `schemas/spec-driven/schema.yaml` tasks instruction so generated `tasks.md` uses separate `Actions` and `Checks` sections.
- [x] A2 Update `schemas/spec-driven/templates/tasks.md` to show the new Actions/Checks structure.
- [x] A3 Add conversion guidance for validation, bugfix, refactor, and trivial tasks in the tasks artifact instruction.
- [x] A4 Implement or reuse deterministic Markdown task-structure checker for Actions/Checks validation in post-propose guidance.
- [x] A5 Add or update tests for tasks instruction content, generated propose guidance, and task-structure checker behavior.
- [x] A6 Refresh generated AI artifacts through the existing update/generation path.

## 2. Checks

- [x] C1 Verify tasks instruction exposes Actions/Checks structure.
  - Covers: A1, A2
  - Command: `openspec instructions tasks --change add-goal-driven-task-checkpoints --json`
  - Expect: output requires `Actions` and `Checks`, uses `A`-prefixed action checkboxes and `C`-prefixed check checkboxes.

- [x] C2 Verify vague work is converted into executable checks.
  - Covers: A3
  - Evidence: generated tasks instruction text
  - Expect: validation work maps to invalid-input checks, bugfix work maps to regression checks, refactor work maps to before/after behavior checks, and trivial edits keep a lightweight check path.

- [x] C3 Verify propose task validation is programmatic and warning-only.
  - Covers: A4
  - Evidence: generated `$openspec-propose` skill text
  - Expect: post-propose validation checks Actions/Checks sections, A/C IDs, `Covers:` references, every action covered by at least one check, and `Command:`/`Evidence:`/`Expect:` field presence without LLM semantic judgment.

- [x] C4 Verify targeted tests cover the new prompt contract.
  - Covers: A5
  - Command: targeted artifact instruction and workflow template tests
  - Expect: tests fail before the prompt/checker changes and pass after implementation, including missing section, dangling `Covers:`, uncovered action, and missing evidence field cases.

- [x] C5 Verify generated artifacts include the new guidance without unrelated churn.
  - Covers: A6
  - Command: existing update/generation command for configured AI artifacts
  - Expect: regenerated Codex skill and related workflow artifacts contain the new post-propose guidance.

- [x] C6 Verify change artifacts remain valid.
  - Covers: A1, A2, A3, A4, A5, A6
  - Command: `openspec validate add-goal-driven-task-checkpoints --type change --json`
  - Expect: change delta specs validate without errors.
