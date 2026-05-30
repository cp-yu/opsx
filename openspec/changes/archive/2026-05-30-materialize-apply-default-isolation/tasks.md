### Task 1: Project config default materialization

**Goal**: Add `apply.defaultIsolation: ask` to shared project config disk defaults and migration.

**Files**:
- Modify: `src/core/project-config.ts`
- Test: `test/core/project-config.test.ts`

**Requirements**:
- Include `apply.defaultIsolation: ask` in `PROJECT_CONFIG_FUNCTIONAL_DEFAULTS`.
- Materialized defaults include `apply` while still excluding `propose`, `context`, and `rules` unless explicitly supplied.
- `migrateProjectConfigDefaults()` adds missing `apply.defaultIsolation` through missing mapping parents.
- Existing `apply.defaultIsolation` values are preserved.
- Config paths keep existing `path.join()` based `.yaml` preference and `.yml` fallback.

#### Checks

- [x] C1 Verify materialized defaults include apply isolation
  - Verifies: `specs/apply-default-isolation-config/spec.md` / Requirement "Apply default isolation SHALL be materialized in project config defaults" / Scenario "Materialized defaults include apply default isolation"
  - Command: `pnpm test test/core/project-config.test.ts`
  - Expect: project config defaults include `apply.defaultIsolation: ask` and still exclude `propose`

- [x] C2 Verify missing-only migration behavior
  - Verifies: `specs/apply-default-isolation-config/spec.md` / Requirement "Apply default isolation SHALL be materialized in project config defaults" / Scenario "Missing-only migration adds apply default isolation", Scenario "Missing-only migration preserves existing apply default isolation"
  - Command: `pnpm test test/core/project-config.test.ts`
  - Expect: migration adds missing `apply.defaultIsolation` and preserves an existing `worktree` value

- [x] C3 Verify cross-platform config path behavior remains unchanged
  - Verifies: `specs/apply-default-isolation-config/spec.md` / Requirement "Apply default isolation SHALL be materialized in project config defaults" / Scenario "Config path handling remains cross-platform"
  - Command: `pnpm test test/core/project-config.test.ts`
  - Expect: `.yaml` preference and `.yml` fallback tests continue to pass without hardcoded separator assumptions

### Task 2: Config YAML rendering for init

**Goal**: Make newly generated `openspec/config.yaml` visibly document the apply isolation default and allowed values.

**Files**:
- Modify: `src/core/config-prompts.ts`
- Test: `test/core/init.test.ts`

**Requirements**:
- Render an `apply` section when materialized defaults include it.
- Render `defaultIsolation: ask  # ask / branch / worktree / none` for generated config output.
- Preserve existing `optimization` and `git` rendered defaults.
- Do not add unrelated optional sections such as `propose`, `rules`, or `context` as active values.

#### Checks

- [x] C4 Verify init writes visible apply default
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure"
  - Command: `pnpm test test/core/init.test.ts`
  - Expect: generated `openspec/config.yaml` contains `apply:` and `defaultIsolation: ask  # ask / branch / worktree / none`

- [x] C5 Verify init output keeps existing functional defaults
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure"
  - Command: `pnpm test test/core/init.test.ts`
  - Expect: generated config still contains optimization and git defaults and does not activate unrelated optional sections

### Task 3: Update migration behavior

**Goal**: Ensure `openspec update` creates or migrates project config defaults with `apply.defaultIsolation` without overwriting user configuration.

**Files**:
- Modify: `src/core/project-config.ts`
- Test: `test/core/update.test.ts`

**Requirements**:
- Missing config creation includes `apply.defaultIsolation: ask`.
- Existing config missing `apply` receives the apply default node.
- Existing `apply.defaultIsolation` is preserved.
- Invalid YAML or non-object config skip behavior remains unchanged.

#### Checks

- [x] C6 Verify update creates config with apply default
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Create config when missing"
  - Command: `pnpm test test/core/update.test.ts`
  - Expect: update-created config includes `apply.defaultIsolation: ask`

- [x] C7 Verify update preserves user-authored apply value
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Add missing nested defaults without overwriting existing values"
  - Command: `pnpm test test/core/update.test.ts`
  - Expect: update keeps `apply.defaultIsolation: worktree` while adding other missing defaults

### Task 4: Spec and validation alignment

**Goal**: Keep main specs and validation expectations aligned with the newly confirmed functional default.

**Files**:
- Modify: `openspec/specs/config-loading/spec.md`
- Modify: `openspec/specs/cli-init/spec.md`
- Modify: `openspec/specs/cli-update/spec.md`
- Test: `openspec/changes/materialize-apply-default-isolation/specs/apply-default-isolation-config/spec.md`

**Requirements**:
- Main specs identify `apply.defaultIsolation` as a materialized functional default.
- Init spec requires the visible inline allowed-values comment.
- Update spec requires missing-only migration for `apply.defaultIsolation`.
- Change-local specs validate cleanly.

#### Checks

- [x] C8 Verify change specs validate
  - Verifies: `specs/apply-default-isolation-config/spec.md` / Requirement "Apply default isolation SHALL be materialized in project config defaults" / Scenario "Materialized defaults include apply default isolation"
  - Command: `openspec validate materialize-apply-default-isolation --type change --json`
  - Expect: change validation reports no spec structure errors for `apply-default-isolation-config`, `config-loading`, `cli-init`, or `cli-update`
