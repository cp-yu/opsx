# Tasks: Project OPSX Integration

## Phase 1: Programmatic Infrastructure

- [ ] 1.1 Create `src/utils/opsx-utils.ts` with path constants and basic structure
- [ ] 1.2 Define Zod schemas: `OpsxNodeSchema`, `OpsxRelationSchema`, `OpsxDeltaSchema`, `ProjectOpsxSchema`
- [ ] 1.3 Implement YAML parse/serialize functions using `yaml` library
- [ ] 1.4 Implement referential integrity validation (check all relation from/to references exist)
- [ ] 1.5 Implement spec_refs path existence validation
- [ ] 1.6 Implement atomic write with temporary file + rename pattern
- [ ] 1.7 Implement line counting and sharding logic (by domain)
- [ ] 1.8 Implement `readProjectOpsx` with transparent shard handling
- [ ] 1.9 Implement `writeProjectOpsx` with auto-sharding when exceeding max_lines
- [ ] 1.10 Add unit tests for opsx-utils.ts (target >90% coverage)

## Phase 2: Workflow Template Integration

- [ ] 2.1 Extract shared OPSX instruction fragments to reduce template duplication
- [ ] 2.2 Modify `propose.ts`: add opsx-delta generation step after specs creation
- [ ] 2.3 Modify `ff-change.ts`: add opsx-delta generation (same logic as propose)
- [ ] 2.4 Modify `sync-specs.ts`: add opsx-delta merging step with programmatic validation
- [ ] 2.5 Modify `archive-change.ts`: add opsx-delta sync check before archiving
- [ ] 2.6 Modify `bulk-archive-change.ts`: add opsx-delta sync check for all changes
- [ ] 2.7 Modify `verify-change.ts`: add OPSX alignment verification (spec_refs bidirectional, referential integrity)
- [ ] 2.8 Modify `apply-change.ts`: insert OPSX context loading protocol (L0→L1→L2 hierarchy)
- [ ] 2.9 Modify `explore.ts`: add OPSX-first navigation guidance
- [ ] 2.10 Review and update `bootstrap-opsx.ts`: ensure [DRAFT] marking and 3 checkpoint flow
- [ ] 2.11 Register bootstrap-opsx in `skill-templates.ts` and `skill-generation.ts` (if not already done)
- [ ] 2.12 Update all templates to use unified OPSX path constant from opsx-utils

## Phase 3: Property-Based Testing

- [ ] 3.1 Create PBT test suite for YAML structure preservation (3 properties)
- [ ] 3.2 Create PBT test suite for relation referential integrity (4 properties)
- [ ] 3.3 Create PBT test suite for merge idempotency (3 properties)
- [ ] 3.4 Create PBT test suite for file size boundaries (4 properties)
- [ ] 3.5 Create PBT test suite for atomic write guarantees (3 properties)
- [ ] 3.6 Create PBT test suite for spec_refs bidirectional alignment (4 properties)
- [ ] 3.7 Add integration tests for full workflow: propose → sync → verify → apply
- [ ] 3.8 Add integration tests for bootstrap workflow
- [ ] 3.9 Add edge case tests: empty delta, concurrent modifications, malformed YAML

## Phase 4: Documentation and Migration

- [ ] 4.1 Update main README with OPSX integration overview
- [ ] 4.2 Create OPSX workflow guide (how to use opsx-delta in changes)
- [ ] 4.3 Create bootstrap workflow guide with examples
- [ ] 4.4 Document PBT properties and their guarantees
- [ ] 4.5 Add migration guide for projects with old path (root project.opsx.yaml → openspec/)
- [ ] 4.6 Update CLAUDE.md or project conventions with OPSX best practices
- [ ] 4.7 Create example change demonstrating full OPSX workflow

## Phase 5: Validation and Cleanup

- [ ] 5.1 Run all tests and ensure 100% pass rate
- [ ] 5.2 Verify no template duplication (shared fragments properly used)
- [ ] 5.3 Check backward compatibility with changes lacking opsx-delta
- [ ] 5.4 Performance benchmark: YAML parse, validation, atomic write
- [ ] 5.5 Code review: ensure consistency with existing OpenSpec patterns
- [ ] 5.6 Final integration test on real project with multiple changes
