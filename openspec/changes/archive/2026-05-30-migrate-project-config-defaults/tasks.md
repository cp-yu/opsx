### Task 1: Shared project config defaults

**Goal**: Define one source of truth for functional project config defaults and use it for new init output.

**Files**:
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-prompts.ts`
- Modify: `src/core/init.ts`
- Test: `test/core/init.test.ts`

**Requirements**:
- Expose shared defaults for `optimization.enabled`, `optimization.optRetries`, and `git`.
- Keep `docLanguage`, `context`, `rules`, `propose`, and `apply` out of automatic default materialization.
- Make fresh `openspec init` write the functional defaults to `openspec/config.yaml`.
- Preserve existing explicit `docLanguage` behavior.
- Use `path.join()` or existing path utilities for config file paths.

#### Checks

- [x] C1 Verify init writes functional defaults
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure"
  - Command: `npm run test -- test/core/init.test.ts`
  - Expect: fresh init config includes `optimization.enabled`, `optimization.optRetries`, and all `git` default fields

- [x] C2 Verify disk defaults exclude non-functional optional fields
  - Verifies: `specs/config-loading/spec.md` / Requirement "Materialize functional project config defaults" / Scenario "Default materialization excludes non-functional optional fields"
  - Command: `npm run test -- test/core/init.test.ts test/core/project-config.test.ts`
  - Expect: default config generation does not add `docLanguage`, `context`, `rules`, `propose`, or `apply` unless explicitly provided

- [x] C3 Verify init path handling remains cross-platform
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure on Windows"
  - Evidence: `src/core/init.ts` and init tests use Node.js path utilities for `openspec/config.yaml`
  - Expect: no new hardcoded OS-specific path separators are introduced

### Task 2: Missing-only YAML config migration helper

**Goal**: Add a focused helper that creates or migrates project config defaults without overwriting user values.

**Files**:
- Modify: `src/core/project-config.ts`
- Test: `test/core/project-config.test.ts`

**Requirements**:
- Create `openspec/config.yaml` when neither `.yaml` nor `.yml` config exists.
- Prefer `openspec/config.yaml`; fall back to mutating `openspec/config.yml` when only `.yml` exists.
- Use YAML Document mutation for existing config files.
- Add only missing mapping keys at nested levels.
- Leave invalid YAML and non-object YAML unchanged.

#### Checks

- [x] C4 Verify missing config creation
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Create config when missing"
  - Command: `npm run test -- test/core/project-config.test.ts`
  - Expect: helper creates `openspec/config.yaml` with `schema`, `optimization`, and `git` defaults when no config file exists

- [x] C5 Verify nested missing-only merge
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Add missing nested defaults without overwriting existing values"
  - Command: `npm run test -- test/core/project-config.test.ts`
  - Expect: helper preserves `optimization.enabled: false` and `git.merge.strategy: squash` while adding only missing nested defaults

- [x] C6 Verify config.yml fallback
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Migrate config.yml alias"
  - Command: `npm run test -- test/core/project-config.test.ts`
  - Expect: helper mutates `openspec/config.yml` and does not create `openspec/config.yaml` when only `.yml` exists

- [x] C7 Verify invalid config skip
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Skip invalid config without blocking tool refresh"
  - Command: `npm run test -- test/core/project-config.test.ts`
  - Expect: helper leaves invalid or non-object config content unchanged and reports a skipped migration result

### Task 3: Update command integration

**Goal**: Run project config default migration during `openspec update` independently from tool artifact freshness.

**Files**:
- Modify: `src/core/update.ts`
- Test: `test/core/update.test.ts`

**Requirements**:
- Invoke project config migration after verifying `openspec/` exists.
- Run migration before early returns for no configured tools or up-to-date tools.
- Warn and continue when config migration is skipped due to invalid config.
- Do not create or refresh unrelated native tool files because of config migration.
- Keep existing global profile migration behavior intact.

#### Checks

- [x] C8 Verify update creates config before no-tools return
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Create config when missing"
  - Command: `npm run test -- test/core/update.test.ts`
  - Expect: `openspec update` creates `openspec/config.yaml` even when no configured tools are found

- [x] C9 Verify update preserves existing config fields
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Add missing top-level defaults"
  - Command: `npm run test -- test/core/update.test.ts`
  - Expect: update adds missing `optimization` and `git` nodes while preserving existing `schema`, `context`, `docLanguage`, and `rules`

- [x] C10 Verify invalid config does not block refresh
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Skip invalid config without blocking tool refresh"
  - Command: `npm run test -- test/core/update.test.ts`
  - Expect: update leaves invalid config unchanged and still reaches the existing tool refresh path when tools are configured

### Task 4: Cross-platform and regression verification

**Goal**: Verify config migration behavior against cross-platform path rules and existing runtime config loading behavior.

**Files**:
- Test: `test/core/project-config.test.ts`
- Test: `test/core/update.test.ts`
- Test: `test/core/init.test.ts`

**Requirements**:
- Cover path construction through existing project-root-relative test directories.
- Confirm runtime config parsing still returns the same defaults after disk materialization.
- Confirm migration does not add `propose` or `apply`.
- Keep tests focused on config behavior, not full CLI e2e.

#### Checks

- [x] C11 Verify default materialization contract
  - Verifies: `specs/config-loading/spec.md` / Requirement "Materialize functional project config defaults" / Scenario "Default materialization includes optimization and git"
  - Command: `npm run test -- test/core/project-config.test.ts test/core/init.test.ts test/core/update.test.ts`
  - Expect: materialized defaults match runtime defaults for `optimization` and `git`

- [x] C12 Verify cross-platform config path behavior
  - Verifies: `specs/config-loading/spec.md` / Requirement "Materialize functional project config defaults" / Scenario "Cross-platform config path handling"
  - Evidence: test setup and implementation construct config paths with `path.join()` / `path.resolve()`
  - Expect: tests avoid hardcoded slash-sensitive expected paths and cover `.yaml` preference with `.yml` fallback
