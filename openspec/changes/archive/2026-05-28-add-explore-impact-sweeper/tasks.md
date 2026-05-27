## 1. Actions

- [x] A1 Add the `openspec-impact-sweeper` skill template with the agreed input contract, OPSX-first search protocol, report schema, report directory behavior, and write boundary.
- [x] A2 Register `openspec-impact-sweeper` in the existing skill generation path without adding a CLI command or changing propose/apply/verify behavior.
- [x] A3 Update `openspec-explore` instructions to invoke `openspec-impact-sweeper` for code-change concepts, unfamiliar scope-affecting terms, new concepts, and proposal readiness.
- [x] A4 Add or update template tests for sweeper skill generation, explore invocation rules, report schema text, forbidden commands, and command-generation exclusion.
- [x] A5 Add `openspec/sweeper/.gitignore` so generated sweep reports are ignored while the directory rule is tracked.
- [x] A6 Update OPSX code-map references for `cap.ai.impact-sweeper` after implementation files are known.

## 2. Checks

- [x] C1 Verify sweeper skill content contract
  - Covers: A1
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper report contract" / Scenario "Sweeper writes project report"
  - Command: `npm test -- test/core/templates/impact-sweeper-template.test.ts`
  - Expect: generated `openspec-impact-sweeper` instructions include input fields, JSON schema fields, report path-only response, and `openspec/sweeper/impact-sweep-<english-project-term-slug>.json`

- [x] C2 Verify sweeper evidence boundaries
  - Covers: A1
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper evidence collection" / Scenario "OPSX first then reverse search"
  - Command: `npm test -- test/core/templates/impact-sweeper-template.test.ts`
  - Expect: tests assert OPSX files, one-hop expansion, conditional second-hop expansion, `git ls-files`, archive exclusion, and repo-wide reverse search are present

- [x] C3 Verify sweeper forbids unsafe execution
  - Covers: A1
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper write and execution boundaries" / Scenario "No tests or git diff"
  - Command: `npm test -- test/core/templates/impact-sweeper-template.test.ts`
  - Expect: generated instructions prohibit tests, builds, installs, `git diff`, `git status`, and `git log`

- [x] C4 Verify report directory write whitelist
  - Covers: A1, A5
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper write and execution boundaries" / Scenario "Only sweeper report files are written"
  - Evidence: `openspec/sweeper/.gitignore` and sweeper template instructions
  - Expect: only `openspec/sweeper/`, missing `.gitignore`, and report JSON writes are allowed

- [x] C5 Verify explore invokes sweeper before proposal readiness
  - Covers: A3
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Explore invokes impact sweeper" / Scenario "Proposal readiness requires a sweep"
  - Command: `npm test -- test/core/templates/explore-template.test.ts`
  - Expect: explore instructions require invoking `openspec-impact-sweeper`, reading the returned JSON report, and withholding proposal readiness until scope-affecting questions are resolved

- [x] C6 Verify explore supports repeated concept sweeps
  - Covers: A3
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Explore invokes impact sweeper" / Scenario "New concept triggers another sweep"
  - Command: `npm test -- test/core/templates/explore-template.test.ts`
  - Expect: explore instructions state that each new concept is swept independently and may trigger multiple sweeper invocations in one conversation

- [x] C7 Verify skill registration does not add a command
  - Covers: A2
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Impact sweeper report contract" / Scenario "Sweeper writes project report"
  - Command: `npm test -- test/core/templates/skill-generation.test.ts test/core/command-generation.test.ts`
  - Expect: `openspec-impact-sweeper` is generated as a skill and no corresponding slash command is generated

- [x] C8 Verify change validation passes
  - Covers: A1, A2, A3, A4, A5, A6
  - Verifies: `specs/ai-workflow-templates/spec.md` / Requirement "Explore invokes impact sweeper" / Scenario "Scope-affecting uncertainty asks the user"
  - Command: `openspec validate "add-explore-impact-sweeper" --type change --json`
  - Expect: change specs, tasks structure, and OPSX delta validate successfully
