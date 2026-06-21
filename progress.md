# Progress

## Status
In Progress

## Tasks
- Orphan Scout 1: Dead Fragment Exports — COMPLETE
  - Read `src/core/templates/fragments/opsx-fragments.ts` and extracted all 26 `export const` names
  - Searched each name across `src/**/*.ts`, `openspec/specs/**/*.md`, and `openspec/references/**/*.md`
  - Identified 15 dead exports never imported in any src/ .ts file outside their own definition
  - Identified 4 spec→code gaps where live specs REQUIRE imports that were never implemented
  - Report written to /tmp/orphan-scout-1-fragments.txt

- Orphan Scout 2: Stale References — COMPLETE
  - Scanned `src/core/templates/fragments/opsx-fragments.ts` for all 24 'Used in:' comments
  - Verified imports in all 5 consuming workflow files (explore.ts, propose.ts, snack.ts, apply-change.ts, archive-change.ts)
  - Confirmed all 6 deleted template files (verify-change.ts, bulk-archive-change.ts, continue-change.ts, ff-change.ts, new-change.ts, sync-specs.ts) absent from disk
  - Searched all `src/` files for references to deleted template file names
  - Searched `openspec/specs/` for stale workflow/file references
  - Report written to /tmp/orphan-scout-2-stale-refs.txt

- Orphan Scout 3: Stale Spec References & Dead Capability References — COMPLETE
  - Checked `opsx-verify-skill/spec.md` for `prompts.md` and `CONFORMANCE_CHECK_RULES` references
  - Read `archive-verify-gate/spec.md` for deleted/renamed capability references
  - Searched all `openspec/specs/*/spec.md` for `cap.` patterns (frontmatter-based)
  - Cross-referenced spec frontmatter capabilities against `openspec/project.opsx.yaml` (102 capabilities)
  - Checked `openspec/references/` files for stale workflow/fragment references
  - Report written to /tmp/orphan-scout-3-spec-refs.txt

## Files Changed
- /tmp/orphan-scout-1-fragments.txt — created
- /tmp/orphan-scout-2-stale-refs.txt — created
- /tmp/orphan-scout-3-spec-refs.txt — created

## Notes
- 15 out of 26 exported fragments in opsx-fragments.ts have NO consumer in any src/ .ts file
- 19 out of 24 'Used in:' comments are stale (claim consumers in deleted files or non-importing files)
- Only 4 'Used in:' comments (OPSX_SHARED_CONTEXT, OPSX_CLI_QUERY_CONTEXT, OPSX_POST_PROPOSE_VALIDATION, OPSX_NAVIGATION_GUIDANCE) are fully accurate
- Several spec files reference `verify-change.ts` template — these specs are stale post-deletion
- `prompts.md` referenced by 2 specs but doesn't exist as shipped artifact
- `openspec-phase2-checkpoint-protocol.md` required by spec but missing from references/
- 83/104 specs lack capability frontmatter (orphaned from SpecRegistry)
