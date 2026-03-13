# Design: Bootstrap Upgrade Modes

## Architecture Overview

This change upgrades bootstrap from a mostly prompt-driven flow into a baseline-aware lifecycle with deterministic state transitions.

The design keeps the existing bootstrap phases:

- `init`
- `scan`
- `map`
- `review`
- `promote`

But separates them from repository eligibility and mode selection.

## Scope Boundaries

### Supported repository baselines

1. `no-spec`
   - No `openspec/specs/`
   - No formal OPSX bundle

2. `specs-only`
   - `openspec/specs/` exists
   - No formal OPSX bundle

### Unsupported baselines

3. `formal-opsx`
   - Any formal OPSX bootstrap target already exists
   - Bootstrap must reject this baseline explicitly

4. `invalid-partial-opsx`
   - Partial or inconsistent formal OPSX files exist
   - Bootstrap must reject this baseline explicitly

## State Model

### Pre-flight classification

Before creating `openspec/bootstrap/`, bootstrap SHALL classify the repository into one baseline type.

The classification result becomes part of bootstrap metadata and must not be recomputed differently later in the same session.

Recommended metadata shape:

```yaml
phase: init
baseline_type: no-spec | specs-only | formal-opsx | invalid-partial-opsx
mode: opsx-first | full
created_at: 2026-03-13T00:00:00.000Z
source_fingerprint: <hash>
candidate_fingerprint: <hash|null>
review_fingerprint: <hash|null>
```

### Mode rules

#### `opsx-first`
Allowed only for `no-spec` baselines.

Behavior:
- Generates formal OPSX only
- Does not generate spec placeholders
- Must instruct the user to add specs incrementally through normal change workflows later

#### `full`
Allowed for:
- `no-spec`
- `specs-only`

Behavior:
- For `no-spec`, bootstrap creates both spec and OPSX starting artifacts
- For `specs-only`, bootstrap preserves current specs and adds OPSX output aligned to them

## Command Behavior

### `openspec bootstrap status --json`

For pre-init repositories, the command SHALL return structured output instead of throwing.

Example contract:

```json
{
  "initialized": false,
  "baselineType": "specs-only",
  "supported": true,
  "allowedModes": ["full"],
  "nextAction": "init",
  "reason": "Repository has specs but no formal OPSX files"
}
```

For unsupported repositories:

```json
{
  "initialized": false,
  "baselineType": "formal-opsx",
  "supported": false,
  "allowedModes": [],
  "nextAction": null,
  "reason": "Bootstrap does not support repositories with existing formal OPSX files"
}
```

### `openspec bootstrap instructions [phase] --json`

Before init, instructions must describe the valid next action based on baseline classification.
It must not fail with a generic "run init first" error for supported pre-init states.

### `openspec bootstrap validate`

Validation SHALL:
- evaluate all gates required for the current phase
- refresh derived artifacts when needed
- never advance into a state that makes a valid later `promote -y` fail

### `openspec bootstrap promote -y`

Promote SHALL:
- re-check promotion prerequisites
- write formal OPSX only after all required gates pass
- clean the bootstrap workspace on success
- never write formal files and then fail due to phase-advance conflict

## Review Model

### Problem

Current review state is inferred from markdown checkboxes, which is too weak for lifecycle safety.

### Required redesign

Introduce structured review validity in addition to the human-readable review file.

Recommended approach:
- keep `review.md` as a review surface
- add structured review state/fingerprint metadata
- invalidate review approval whenever evidence or domain maps change

### Refresh rules

`review.md` and candidate output must be derived from current inputs:
- `evidence.yaml`
- `domain-map/*.yaml`

Any input change that affects candidate content must force refresh of the derived review view and invalidate stale approval state.

## Gate Semantics

### `scan_to_map`
Must verify:
- `evidence.yaml` exists
- evidence schema is valid
- domain IDs are unique and well formed

### `map_to_review`
Must verify:
- every required domain map exists
- domain map schema is valid
- relations reference valid nodes
- code-map references satisfy the supported contract

### `review_to_promote`
Must verify:
- current review approval matches current candidate fingerprint
- all required review items are completed
- referential integrity passes
- code-map integrity passes
- upstream scan/map completeness still holds

Promotion must not rely solely on a manually edited markdown file.

## Template and Schema Contract

The following surfaces must share the same truth:
- `src/commands/bootstrap.ts`
- `src/core/templates/workflows/bootstrap-opsx.ts`
- `schemas/bootstrap/schema.yaml`
- `schemas/bootstrap/templates/*.md`
- related bootstrap documentation

They must agree on:
- supported baselines
- supported modes
- pre-init behavior
- generated artifacts
- opsx-first guidance about adding specs later
- promote behavior and cleanup semantics

## Testing Strategy

### CLI lifecycle tests

Add end-to-end coverage for:
- `specs-only -> full`
- `no-spec -> opsx-first`
- `no-spec -> full`
- reject `formal-opsx`
- reject `invalid-partial-opsx`
- pre-init `status --json`
- `validate -> promote -y`
- promote cleanup on success
- stale review invalidation after evidence/domain-map changes

### Property-based tests

Cover these system properties:
- supported transition exclusivity
- rejection of existing formal OPSX
- opsx-first output exclusivity
- full bootstrap completeness
- validate/promote coherence
- gate completeness under single-point corruption
- pre-init structured status behavior
- review refresh correctness
- contract parity across CLI/schema/templates

## Implementation Plan

1. Add repository baseline detection helpers and structured pre-init status output.
2. Replace mode semantics with approved user-facing modes and constraints.
3. Fix validate/promote phase advancement so successful validation cannot poison promotion.
4. Introduce refreshable review/candidate derivation and stale-review invalidation.
5. Update bootstrap schema, templates, and workflow text to match actual runtime behavior.
6. Add lifecycle integration tests and property/parity tests.
