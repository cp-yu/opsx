## 1. New Fragments

- [x] 1.1 Add `VERIFY_COORDINATOR_ROLE` fragment to `src/core/templates/fragments/opsx-fragments.ts` — defines coordinator role with 4-role table (coordinator, reviewer, optimizer, CLI) and core constraint
- [x] 1.2 Add `VERIFY_SUBAGENT_TIMEOUT_RULES` fragment to `src/core/templates/fragments/opsx-fragments.ts` — tool-neutral timeout/waiting/polling constraints for subagent spawns

## 2. Phase 1 Prompt Changes

- [x] 2.1 Inject `VERIFY_COORDINATOR_ROLE` and mode label reference table at start of `buildVerifyIntro()` — applies to both reread and subagent execution models
- [x] 2.2 Add mode labels (`[Mode: Setup]`, `[Mode: Evidence]`, `[Mode: Writeback]`, `[Mode: Record]`) to step headers in `buildSubagentVerifyInstructions()`
- [x] 2.3 Replace prose "Spawn a clean-context reviewer subagent..." in Step 5 of `buildSubagentVerifyInstructions()` with explicit subagent delegation instructions, including `openspec-reviewer` invoke and evidence bundle fields
- [x] 2.4 Inject `VERIFY_SUBAGENT_TIMEOUT_RULES` after the reviewer subagent spawn in `buildSubagentVerifyInstructions()`
- [x] 2.5 Add mode labels (`[Mode: Setup]`, `[Mode: Evidence]`, `[Mode: Writeback]`, `[Mode: Record]`) to step headers in `buildRereadVerifyInstructions()`

## 3. Phase 2 Prompt Changes

- [x] 3.1 Add `[Mode: Checkpoint]` label and restructure checkpoint state machine from prose paragraph to table format in `buildPhase2Step()`
- [x] 3.2 Move `VERIFY_STATE_MACHINE_DIAGRAM` position to before the checkpoint state machine table
- [x] 3.3 Add `[Mode: Optimize]` label and replace prose in "Phase 2 Optimization Protocol" with explicit optimizer subagent delegation instructions, including `openspec-optimizer` invoke and failedDirections input
- [x] 3.4 Inject `VERIFY_SUBAGENT_TIMEOUT_RULES` after the optimizer subagent spawn in `buildPhase2Step()`
- [x] 3.5 Add `[Mode: Speculative Verify]` label to `buildReverifyStep()` entry and add explicit reviewer subagent delegation instructions for speculative re-verify

## 4. Tests

- [x] 4.1 Add unit tests showing verify output contains explicit reviewer/optimizer subagent delegation instructions and required input bundle fields
- [x] 4.2 Add unit tests showing verify output does not contain `Agent({`, `TaskOutput({`, or `AskUserQuestion`
- [x] 4.3 Run existing test suite (`pnpm test`) to verify no regressions — all template generation tests must pass
- [x] 4.4 Run `openspec verify --all` to validate OPSX referential integrity

## 5. Validation

- [x] 5.1 Generate verify command/skill output and manually inspect for: coordinator role present, mode labels correct, explicit subagent delegation instructions present, no tool API syntax leaked, timeout rules visible, checkpoint table formatted correctly
- [x] 5.2 Dry-run verify on a simple change to confirm agent behavior is not degraded
