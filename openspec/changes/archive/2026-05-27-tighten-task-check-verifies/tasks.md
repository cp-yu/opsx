## 1. Actions

- [x] A1 Update `schemas/spec-driven/schema.yaml` tasks instruction to require `Verifies:` on every check and document change-local spec path semantics.
- [x] A2 Update `schemas/spec-driven/templates/tasks.md` so generated check examples include `Verifies:`.
- [x] A3 Extend `src/core/parsers/task-structure.ts` to parse and validate non-empty `Verifies:` fields.
- [x] A4 Add deterministic validation for change-local `Verifies:` spec paths, Requirement names, and Scenario names when local change specs exist.
- [x] A5 Preserve no-spec maintenance changes by downgrading `Verifies:` cross-checking to warning when no local change specs exist.
- [x] A6 Update post-propose validation guidance to include `Verifies:` structure checks without adding semantic sufficiency judgment.
- [x] A7 Add focused tests for task instructions, template output, parser behavior, invalid paths, missing spec references, missing requirement/scenario references, no-spec warning behavior, and cross-platform path rejection.

## 2. Checks

- [x] C1 tasks instruction exposes Verifies requirements
  - Covers: A1
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenarios "Tasks instructions require Verifies fields", "Verifies path remains change-local and cross-platform"
  - Command: `pnpm test test/core/artifact-graph/instruction-loader.test.ts`
  - Expect: generated tasks instructions require `Verifies:`, change-local `specs/<capability>/spec.md` paths, full Requirement names, and full Scenario names.

- [x] C2 tasks template includes Verifies
  - Covers: A2
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Tasks instructions require Verifies fields"
  - Evidence: `schemas/spec-driven/templates/tasks.md`
  - Expect: both check examples include a `Verifies:` field before executable evidence fields.

- [x] C3 missing Verifies is rejected
  - Covers: A3
  - Verifies: `specs/opsx-propose-skill/spec.md` / Requirement "Post-propose warning validation" / Scenario "Check fields are structurally validated"
  - Command: `pnpm test test/core/parsers/task-structure.test.ts`
  - Expect: checks without `Verifies:` produce a deterministic validation issue.

- [x] C4 change-local spec references are validated
  - Covers: A4
  - Verifies: `specs/opsx-propose-skill/spec.md` / Requirement "Post-propose warning validation" / Scenario "Verifies references are checked when change specs exist"
  - Command: `pnpm test test/core/parsers/task-structure.test.ts`
  - Expect: existing Requirement/Scenario references pass, while missing spec files, missing Requirements, and missing Scenarios fail.

- [x] C5 no-spec changes degrade to warning
  - Covers: A5
  - Verifies: `specs/opsx-propose-skill/spec.md` / Requirement "Post-propose warning validation" / Scenario "Missing change specs degrade Verifies cross-check to warning"
  - Command: `pnpm test test/core/parsers/task-structure.test.ts`
  - Expect: non-empty natural-language `Verifies:` passes structural validation with a warning when no local change specs exist.

- [x] C6 post-propose guidance stays warning-only
  - Covers: A6
  - Verifies: `specs/opsx-propose-skill/spec.md` / Requirement "Post-propose warning validation" / Scenarios "Programmatic task warnings remain repair-only", "Semantic suitability is deferred to verify"
  - Command: `pnpm test test/core/templates/propose-template.test.ts`
  - Expect: generated propose guidance mentions `Verifies:` structural checks while still deferring semantic suitability to verify/reviewer.

- [x] C7 invalid path forms are rejected
  - Covers: A4, A7
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Verifies path remains change-local and cross-platform"
  - Command: `pnpm test test/core/parsers/task-structure.test.ts`
  - Expect: `openspec/specs/...`, absolute paths, parent traversal, and backslash-separated paths are rejected.

- [x] C8 full verification suite remains green
  - Covers: A1, A2, A3, A4, A5, A6, A7
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenarios "Checks are executable verification items", "Tasks instructions allow trivial fast path"
  - Command: `pnpm test`
  - Expect: existing behavior remains compatible outside the new `Verifies:` structure rules.
