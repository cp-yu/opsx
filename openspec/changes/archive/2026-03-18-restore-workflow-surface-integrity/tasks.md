## 1. Workflow mode modeling

- [x] 1.1 Introduce a single workflow surface manifest that defines workflow IDs, mode membership, skill names, skill directories, command slugs, and prompt metadata
- [x] 1.2 Define `expanded` as a first-class preset equal to `core + new/continue/ff/verify/sync/bulk-archive/onboard`
- [x] 1.3 Keep `bootstrap-opsx` outside the default expanded preset and model it as separately selectable
- [x] 1.4 Replace scattered workflow metadata lookups with manifest-derived projections in shared helpers

## 2. Config and init mode flow

- [x] 2.1 Update global config types and validation to recognize first-class core / expanded / custom profile semantics
- [x] 2.2 Update `openspec config profile` to expose the expanded preset explicitly while preserving custom workflow selection
- [x] 2.3 Preserve the existing apply-via-update behavior after config changes
- [x] 2.4 Update `openspec init` to support explicit mode-driven workflow generation for core and expanded
- [x] 2.5 Add tests covering init and config flows for core, expanded, and custom combinations

## 3. Shared install planning

- [x] 3.1 Introduce a shared planning helper that computes expected workflow artifacts from mode, workflows, delivery, and tool capability
- [x] 3.2 Refactor `init` to generate skills and commands from the shared planning result
- [x] 3.3 Refactor `update` to reconcile generated artifacts from the shared planning result
- [x] 3.4 Refactor migration and profile drift detection to consume the same planning projections
- [x] 3.5 Add invariant tests ensuring generation, detection, and cleanup use the same workflow projections

## 4. Archive embedded sync

- [x] 4.1 Introduce a shared `ChangeSyncState` assessment for delta specs and `opsx-delta`
- [x] 4.2 Update archive logic so core mode performs embedded sync for both specs and OPSX before archiving
- [x] 4.3 Ensure embedded sync failures abort archive with zero side effects
- [x] 4.4 Keep independent `sync` skill and command surfaces available in expanded mode
- [x] 4.5 Align archive CLI behavior and archive skill behavior to the same sync-state contract
- [x] 4.6 Define `--skip-specs` to skip all archive-time sync writes, including main specs and OPSX sync

## 5. Specs and documentation

- [x] 5.1 Update `cli-config` spec to define core and expanded as first-class workflow presets
- [x] 5.2 Update `cli-init` spec to define mode-driven workflow surface generation
- [x] 5.3 Update `opsx-archive-skill` spec to define embedded sync behavior in core mode
- [x] 5.4 Update `specs-sync-skill` spec to define expanded-mode standalone sync surface semantics
- [x] 5.5 Update `cli-archive` spec to cover OPSX sync behavior and skip semantics
- [x] 5.6 Update command-generation-related specs to require manifest-derived workflow projections
- [x] 5.7 Update user-facing docs so normal/core vs expanded mode, command visibility, and archive behavior stay consistent

## 6. Property-based and regression testing

- [x] 6.1 Add parity tests for workflow manifest projections across generation, detection, and cleanup
- [x] 6.2 Add idempotency tests for `init -> init`, `init -> update`, and `update -> update`
- [x] 6.3 Add archive regression tests covering delta specs only, `opsx-delta` only, both present, and validation failure
- [x] 6.4 Add tests proving core mode does not require a standalone sync surface to archive safely
- [x] 6.5 Add tests proving expanded mode still generates standalone sync skills and commands
- [x] 6.6 Add Windows CI verification tasks for command and skill artifact path assertions
