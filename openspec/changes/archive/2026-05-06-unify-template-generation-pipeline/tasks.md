## 1. Manifest Foundation

- [x] 1.1 Create canonical workflow manifest registry under `src/core/templates/`
- [x] 1.2 Define shared manifest types for workflow IDs, skill metadata, and optional command descriptors
- [x] 1.3 Migrate existing workflow registration (`getSkillTemplates`, `getCommandTemplates`, `getCommandContents`) to derive from the manifest
- [x] 1.4 Preserve existing external exports/API compatibility for `src/core/templates/skill-templates.ts`

## 2. Tool Profile Layer

- [x] 2.1 Add `ToolProfile` types and `ToolProfileRegistry`
- [x] 2.2 Map all currently supported tools to explicit profile entries
- [x] 2.3 Wire profile lookups to command adapter resolution and skills path resolution
- [x] 2.4 Replace hardcoded detection arrays (for example `SKILL_NAMES`) with manifest-derived values

## 3. Transform Pipeline

- [x] 3.1 Introduce transform interfaces (`scope`, `phase`, `priority`, `applies`, `transform`)
- [x] 3.2 Implement transform runner with deterministic ordering
- [x] 3.3 Migrate OpenCode command reference rewrite to transform pipeline
- [x] 3.4 Remove ad-hoc transform invocation from `init` and `update`

## 4. Artifact Sync Engine

- [x] 4.1 Create shared artifact sync engine for generation planning + rendering + writing
- [x] 4.2 Integrate engine into `init` flow
- [x] 4.3 Integrate engine into `update` flow
- [x] 4.4 Integrate engine into legacy-upgrade artifact generation path

## 5. Validation and Tests

- [x] 5.1 Add manifest completeness tests (metadata required fields, command IDs, dir names)
- [x] 5.2 Add tool-profile consistency tests (skillsDir support and adapter/profile alignment)
- [x] 5.3 Add transform applicability/order tests
- [x] 5.4 Expand parity tests for representative workflow/tool matrix
- [x] 5.5 Run full test suite and verify generated artifacts remain stable

## 6. Cleanup and Documentation

- [x] 6.1 Remove superseded helper code and duplicate write loops after cutover
- [x] 6.2 Update internal developer docs for template generation architecture
- [x] 6.3 Document migration guardrails for future workflow/tool additions
