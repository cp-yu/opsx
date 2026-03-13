# Proposal: Bootstrap Upgrade Modes

## Problem Statement

The current bootstrap flow has the right high-level direction, but its lifecycle and upgrade semantics are not safe enough to support real project adoption.

Current gaps:

1. **Phase progression conflict** — `validate` can advance review workspaces to `promote`, and a later `promote -y` can attempt to advance phase again after writing files, causing partial-success failure states.
2. **Incomplete promotion gate** — promotion currently relies too heavily on `review.md` checkbox state and does not fully re-assert upstream completeness.
3. **Broken pre-init UX** — `openspec bootstrap status --json` and `instructions` do not return structured pre-init states, which breaks first-run workflows.
4. **Stale review artifacts** — `review.md` is not refreshed when evidence or mappings change, so review state can silently drift from candidate output.
5. **Schema/template contract drift** — bootstrap schema, workflow template, CLI behavior, and generated artifact expectations are inconsistent.
6. **Missing upgrade-path semantics** — bootstrap does not yet cleanly support the required repository baselines:
   - specs-only → specs+opsx
   - no-spec → opsx-first
   - no-spec → full

Without fixing these issues, bootstrap can produce formal OPSX files while still failing the command, can promote incomplete maps, and cannot serve as a reliable upgrade entry point.

## Proposed Solution

Refactor bootstrap into a baseline-aware lifecycle with explicit mode constraints and deterministic promotion rules.

### Supported upgrade paths

This change SHALL support exactly these paths:

1. **`specs-only -> specs+opsx`**
   - Existing `openspec/specs/` content is preserved.
   - Bootstrap adds formal OPSX files.

2. **`no-spec -> opsx-first`**
   - Bootstrap generates formal OPSX files only.
   - It must explicitly instruct users to add specs incrementally later via normal change workflows.

3. **`no-spec -> full`**
   - Bootstrap generates both spec and OPSX starting structure.

### Out of scope

This change SHALL NOT support repositories that already contain formal OPSX files.
Those repositories must be rejected explicitly as out-of-scope for bootstrap.

### Core design direction

1. **Pre-flight repository classification**
   - Detect baseline before any workspace writes.
   - Return a stable baseline classification used throughout the bootstrap session.

2. **Explicit mode contract**
   - Replace ambiguous lifecycle semantics with baseline + mode rules.
   - Keep the phase machine (`init -> scan -> map -> review -> promote`) but separate it from repository upgrade eligibility.

3. **Structured lifecycle state**
   - `status --json` and `instructions --json` must return structured, machine-usable output even before initialization.
   - Review validity must no longer depend solely on markdown checkbox parsing.

4. **Safe promote behavior**
   - `validate` and `promote` must converge on one valid terminal state with no double-advance conflicts.
   - Promote must re-check the full gate set before writing formal OPSX files.

5. **Unified contract surface**
   - CLI help, workflow templates, bootstrap schema, and generated templates must describe the same modes, artifacts, and expectations.

## Benefits

1. **Safe adoption** — bootstrap becomes reliable enough for real repository upgrades.
2. **Clear product behavior** — users get deterministic support for specs-only and no-spec baselines.
3. **Better CLI ergonomics** — pre-init status and instructions become machine-readable and user-friendly.
4. **Fewer stale artifacts** — review output remains aligned with current evidence and mappings.
5. **Stronger correctness guarantees** — lifecycle regressions can be covered by CLI integration and property-based tests.

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Lifecycle refactor breaks current bootstrap flow | Add explicit end-to-end lifecycle tests for all supported baselines and modes |
| Mode semantics drift across CLI/template/schema | Add parity tests that compare lifecycle contract surfaces |
| Review refresh overwrites useful user edits | Separate derived review content from structured review state/fingerprint validation |
| Existing formal OPSX repos get ambiguous errors | Add explicit pre-flight rejection with stable JSON/text output |

## Success Criteria

- [ ] Bootstrap supports exactly the approved upgrade paths
- [ ] Existing formal OPSX repositories are rejected explicitly and safely
- [ ] `validate -> promote -y` is stable and side-effect coherent
- [ ] Pre-init `status --json` returns structured output instead of throwing
- [ ] Review artifacts refresh when evidence or domain maps change
- [ ] Schema/templates/CLI help share one consistent bootstrap contract
- [ ] CLI lifecycle and PBT coverage guard the new behavior
