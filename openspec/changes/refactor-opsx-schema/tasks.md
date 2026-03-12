# Tasks: Refactor OPSX Schema

## Patch 1: Schema + IO (opsx-utils.ts)

- [x] 1.1 Replace OPSX_PATHS and OPSX_CONFIG constants with fixed three-file paths (PROJECT_FILE, RELATIONS_FILE, CODE_MAP_FILE) and OPSX_SCHEMA_VERSION = 1. Remove SHARDED_DIR, SHARDED_META, MAX_LINES. File: `src/utils/opsx-utils.ts:13-33`
- [x] 1.2 Rewrite ProjectMetadataSchema to `id/name/intent/scope/roots`. Rewrite BaseNodeSchema: status `draft|active` only, add `progress: { phase: implementing|verifying }.optional()`, remove `code_refs` and `spec_refs`. Add CodeRefSchema with `path/line_start/line_end`. File: `src/utils/opsx-utils.ts:39-116`
- [x] 1.3 Create three disk-file schemas: ProjectOpsxFileSchema (schema_version + project + domains + capabilities), ProjectOpsxRelationsFileSchema (schema_version + relations), ProjectOpsxCodeMapFileSchema (schema_version + generated_at + nodes[{id, refs}]). Create runtime ProjectOpsxBundle type. File: `src/utils/opsx-utils.ts:118-160`
- [x] 1.4 Rewrite OpsxDeltaSchema.REMOVED from `node_ids/relation_ids` to `domains/capabilities/relations` arrays. Add schema_version to delta schema. File: `src/utils/opsx-utils.ts:130-154`
- [x] 1.5 Add legacy normalizer function: normalizeFromLegacy(raw) → converts `implemented→active`, extracts embedded code_refs to code_map, strips spec_refs, adds schema_version. Pure function, no IO. File: `src/utils/opsx-utils.ts` (new function near line 170)
- [x] 1.6 Implement three independent readers: readProjectOpsxFile(), readProjectOpsxRelations(), readProjectOpsxCodeMap(). Each does schema validation and returns typed result. Missing companion files return empty arrays. File: `src/utils/opsx-utils.ts:176-245` (replace readShardedOpsx)
- [x] 1.7 Rewrite readProjectOpsx() as bundle assembler: calls three readers, detects legacy format (no schema_version), applies normalizer if needed. Delete readShardedOpsx(). File: `src/utils/opsx-utils.ts:176-200`
- [x] 1.8 Rewrite write path: writeProjectOpsxFile(), writeProjectOpsxRelations(), writeProjectOpsxCodeMap(). Coordinator writeProjectOpsx(root, bundle) splits bundle into 3 files, writes all via tmp+rename. Delete writeSingleFileOpsx(), writeShardedOpsx(), shardByDomain(), estimateLines(). File: `src/utils/opsx-utils.ts:248-371`
- [x] 1.9 Update validateReferentialIntegrity() to work with bundle (nodes from domains+capabilities only). Add validateCodeMapIntegrity(). Delete validateSpecRefs() and all its imports. File: `src/utils/opsx-utils.ts:379-457`
- [x] 1.10 Fix hidden bug: writeProjectOpsx signature accepts `number` as 3rd param but tests pass `{ maxLines }` object. New signature: `writeProjectOpsx(root, bundle)` only. File: `src/utils/opsx-utils.ts:255`

## Patch 2: Tests

- [x] 2.1 Update unit test fixtures: all `{ name, version }` → `{ id, name, intent, scope, roots }`. All `belongs_to` → `contains`. Remove spec_refs validation tests. Add legacy normalization tests, missing companion file tests. File: `test/utils/opsx-utils.test.ts:30-321`
- [x] 2.2 Update edge-case tests: replace "large data triggers sharding" with "large data still produces fixed three files". Remove sharded test scenarios. File: `test/utils/opsx-utils.edge-cases.test.ts:37-230`
- [x] 2.3 Rewrite PBT yaml-structure: new generators for schema_version, new metadata, status draft|active, progress.phase, independent code_map. File: `test/utils/opsx-utils.pbt.yaml-structure.test.ts:17-150`
- [x] 2.4 Rewrite PBT atomic-write: from "single-file/shard no tmp" to "three-file no tmp". File: `test/utils/opsx-utils.pbt.atomic-write.test.ts:35-113`
- [x] 2.5 Rewrite PBT file-size-boundaries: from "triggers sharding" to "fixed three-file layout regardless of size". File: `test/utils/opsx-utils.pbt.file-size-boundaries.test.ts:15-175`
- [x] 2.6 Rewrite PBT merge-idempotency: read/write objects are bundles, not legacy single-file. File: `test/utils/opsx-utils.pbt.merge-idempotency.test.ts:32-129`
- [x] 2.7 Rewrite PBT referential-integrity: ID generators only produce `dom.`/`cap.`, no `inv.`. Validate across split files. File: `test/utils/opsx-utils.pbt.referential-integrity.test.ts:15-126`
- [x] 2.8 Rename PBT spec-refs-alignment to code-map-roundtrip: verify path/line_start/line_end preservation. File: `test/utils/opsx-utils.pbt.spec-refs-alignment.test.ts:12-173`
- [x] 2.9 Update integration-bootstrap: remove code_refs/spec_refs assertions from nodes, add code-map file assertions. File: `test/utils/opsx-utils.integration-bootstrap.test.ts:32-276`
- [x] 2.10 Update integration-workflow: add schema_version to all delta fixtures, REMOVED uses collection arrays, remove validateSpecRefs imports. Fix dead code at lines 99-102. File: `test/utils/opsx-utils.integration-workflow.test.ts:38-308`
- [x] 2.11 Add real-file regression test: read actual `openspec/project.opsx.yaml` from repo, assert readProjectOpsx() returns non-null bundle. File: new test file or add to integration tests

## Patch 3: Templates + Docs

- [ ] 3.1 Update OPSX_READ_CONTEXT: navigation is "domains → capabilities" for structure + "code-map.yaml" for code location + "specs/" for behavior docs. File: `src/core/templates/fragments/opsx-fragments.ts:12-17`
- [ ] 3.2 Update OPSX_GENERATE_DELTA: delta no longer includes code_refs/spec_refs. File: `src/core/templates/fragments/opsx-fragments.ts:23-30`
- [ ] 3.3 Update OPSX_VERIFY_ALIGNMENT: remove spec_refs bidirectional check, add code-map integrity check. File: `src/core/templates/fragments/opsx-fragments.ts:36-46`
- [ ] 3.4 Update OPSX_SYNC_DELTA: sync writes to three files, not single file. File: `src/core/templates/fragments/opsx-fragments.ts:52-61`
- [ ] 3.5 Update OPSX_NAVIGATION_GUIDANCE: replace L0→L1→L2 with new three-file navigation. File: `src/core/templates/fragments/opsx-fragments.ts:67-75`
- [ ] 3.6 Update OPSX_PATH_REFERENCE: add relations and code-map paths. File: `src/core/templates/fragments/opsx-fragments.ts:100-105`
- [ ] 3.7 Update workflow templates that reference OPSX: bootstrap-opsx.ts, apply-change.ts, propose.ts, ff-change.ts, verify-change.ts, archive-change.ts, explore.ts, bulk-archive-change.ts. Remove sharding references, update navigation text.
- [ ] 3.8 Update CLAUDE.md: file organization section, code references section, sharding section, validation section. Add cross-platform-paths and spec-bdd-format as rules (moved from invariants).
- [ ] 3.9 Update example opsx-delta: add schema_version, remove code_refs/spec_refs from capability nodes. File: `openspec/changes/example-opsx-workflow/opsx-delta.yaml`

## Patch 4: Repo YAML Migration

- [ ] 4.1 Migrate project.opsx.yaml: add schema_version: 1, keep project+domains+capabilities, change all `status: implemented` → `active`, strip all code_refs and spec_refs from nodes, remove entire invariants section.
- [ ] 4.2 Create project.opsx.relations.yaml: extract all relations from old file, add schema_version: 1, remove relations originating from `inv.*` nodes.
- [ ] 4.3 Create project.opsx.code-map.yaml: extract all code_refs from old capability nodes, index by node id, add schema_version: 1 and generated_at timestamp. Normalize all paths to POSIX forward slashes.
- [ ] 4.4 Move invariant rules to CLAUDE.md: add `cross-platform-paths` and `spec-bdd-format` as explicit rules in the OPSX Best Practices section.
- [ ] 4.5 Run full test suite (`pnpm test`) and verify all pass. Run `openspec validate` if available.
