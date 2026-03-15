# Proposal: Bootstrap Upgrade Modes

## Why

The bootstrap workflow was directionally correct, but its lifecycle and upgrade semantics were still loose enough to produce unsafe results.

The core failures were practical, not theoretical:

1. `validate` and `promote -y` could both advance lifecycle state, which allowed a write to succeed and the command to fail afterward.
2. Promotion trusted `review.md` too much and did not fully re-check upstream completeness before writing formal OPSX files.
3. Pre-init `status --json` and `instructions --json` did not return structured state, which made automation brittle.
4. Review artifacts could drift from current evidence or mappings because refresh rules were incomplete.
5. CLI help, templates, and schema semantics had diverged, so surfaces described different behavior.
6. Required upgrade paths were not explicit, especially for `specs-only -> specs+opsx`, `no-spec -> opsx-first`, and `no-spec -> full`.

That combination meant bootstrap was not yet a trustworthy upgrade entry point.

## What Changes

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
