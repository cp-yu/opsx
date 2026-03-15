# Tasks: Bootstrap Upgrade Modes

## Phase 1: Baseline Detection and Mode Contract

- [x] 1.1 Add bootstrap repository baseline detection for `no-spec`, `specs-only`, `formal-opsx`, and `invalid-partial-opsx`
- [x] 1.2 Extend bootstrap metadata/state types to persist baseline classification and approved user-facing mode names
- [x] 1.3 Update `bootstrap init` to reject unsupported baselines before creating `openspec/bootstrap/`
- [x] 1.4 Enforce allowed baseline-to-mode combinations and return clear errors listing valid modes
- [x] 1.5 Update `bootstrap status --json` to return structured pre-init output for supported and unsupported baselines
- [x] 1.6 Update `bootstrap instructions [phase] --json` to return pre-init guidance without generic init-first exceptions

## Phase 2: Lifecycle Coherence and Gate Safety

- [x] 2.1 Refactor validate/advance logic so successful review validation cannot poison later promote execution
- [x] 2.2 Ensure `promote -y` re-checks full gate validity before any formal OPSX writes
- [x] 2.3 Expand `review_to_promote` validation to re-assert upstream scan/map completeness
- [x] 2.4 Prevent promote from writing formal OPSX files when review state is stale or incomplete
- [x] 2.5 Ensure successful promote always cleans `openspec/bootstrap/` and never fails after durable writes due to phase conflicts

## Phase 3: Review Refresh and Derived Artifact Validity

- [x] 3.1 Introduce structured review validity or fingerprint tracking alongside human-readable review output
- [x] 3.2 Make candidate and review artifacts regenerate from current `evidence.yaml` and `domain-map/*.yaml`
- [x] 3.3 Invalidate stale review approval whenever evidence or domain-map content changes
- [x] 3.4 Implement deterministic review ordering so runtime behavior matches bootstrap guidance
- [x] 3.5 Ensure status reporting reflects stale review/candidate state instead of inferring approval from old markdown alone

## Phase 4: Mode-Specific Output and Contract Alignment

- [x] 4.1 Implement `opsx-first` runtime behavior that writes only formal OPSX outputs and no spec placeholders
- [x] 4.2 Implement `full` runtime behavior for both `no-spec` and `specs-only` baselines
- [x] 4.3 Update bootstrap workflow template to replace old mode names and document approved upgrade paths
- [x] 4.4 Update `schemas/bootstrap/schema.yaml` to match actual modes, generated artifacts, and lifecycle semantics
- [x] 4.5 Update bootstrap markdown templates so schema/template guidance matches runtime contract
- [x] 4.6 Update bootstrap docs and CLI text to explain that opsx-first users add specs incrementally later through normal change workflows

## Phase 5: Test Matrix and Regression Coverage

- [x] 5.1 Add CLI integration tests for `specs-only -> full`
- [x] 5.2 Add CLI integration tests for `no-spec -> opsx-first`
- [x] 5.3 Add CLI integration tests for `no-spec -> full`
- [x] 5.4 Add rejection tests for `formal-opsx` and `invalid-partial-opsx` baselines
- [x] 5.5 Add lifecycle regression tests for `validate -> promote -y` happy and failure paths
- [x] 5.6 Add tests for promote cleanup after success and zero-write behavior on failed promote
- [x] 5.7 Add tests for pre-init `status --json` and `instructions --json`
- [x] 5.8 Add tests for review refresh and stale approval invalidation after evidence/domain-map edits
- [x] 5.9 Add parity/property-based tests covering allowed transitions, contract consistency, and mode-specific output invariants
