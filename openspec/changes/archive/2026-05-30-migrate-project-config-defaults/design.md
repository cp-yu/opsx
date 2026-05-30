## Context

`readProjectConfig()` already returns normalized defaults for `git`, and `verify phase2` reads `optimization` defaults at runtime. The disk file is different: current `init` writes only `schema` plus optional `docLanguage`, while `update` only migrates global profile config and tool artifacts. That leaves older and newly initialized projects without visible functional defaults for archive merge and verify optimization policy.

The confirmed scope is narrow: materialize only `optimization` and `git`, preserve user fields, create config on update when absent, and skip invalid YAML without blocking tool refresh.

## Goals / Non-Goals

**Goals:**
- Share one canonical set of disk defaults for `optimization` and `git`.
- Make `openspec init` write those defaults for new projects.
- Make `openspec update` create or migrate project config defaults with deep missing-only semantics.
- Preserve existing `config.yaml` / `config.yml` values, comments, unknown keys, and alias preference.
- Keep path handling cross-platform through Node.js path utilities.

**Non-Goals:**
- Do not add `propose` or `apply` nodes.
- Do not add empty `docLanguage`, `context`, or `rules`.
- Do not reformat old config into a full comment template.
- Do not add a new CLI command, prompt, dependency, or general migration framework.

## Decisions

1. Centralize functional disk defaults near project config.

   Put `PROJECT_CONFIG_DEFAULTS` or an equivalent constant next to `ProjectConfigSchema`, and reuse it from config serialization and update migration. This avoids three disconnected default definitions in loading, init, and update paths.

   Alternative considered: leave defaults inline in each caller. Rejected because the exact issue is schema evolution drifting across callers.

2. Use YAML Document mutation for existing config files.

   Existing config migration should use the current `yaml` package Document API, matching the `init` docLanguage update pattern. The implementation should only add missing mapping keys, not parse to a plain object and stringify back.

   Alternative considered: generate a new YAML string from `serializeConfig()`. Rejected because it would reorder or remove user-authored structure.

3. Integrate migration early in `UpdateCommand.execute()`.

   Project config migration should run after confirming `openspec/` exists and before branches that return for "no configured tools" or "all up to date". Otherwise projects with no tool refresh need would never receive config defaults.

   Alternative considered: only migrate when artifacts are refreshed. Rejected because config schema evolution is independent of tool template freshness.

4. Treat invalid config as warning-only.

   Invalid YAML or non-object YAML should not be overwritten. The update command should warn and continue with tool artifact refresh.

   Alternative considered: fail `update`. Rejected because the requested migration should not block the primary update workflow or destroy user files.

## Risks / Trade-offs

- User comments may move when adding YAML nodes → Use Document mutation and write only when a missing field is inserted.
- Deep merge may accidentally replace explicit values → Implement missing-only behavior at each mapping level and test nested partial configs.
- Default sources may drift again → Reuse a single exported default object for init/update migration.
- `config.yml` handling may diverge from reading behavior → Preserve `.yaml` preference and `.yml` fallback explicitly.
- Warning-only invalid config may hide migration failure → Keep the warning precise and do not claim config migration succeeded.

## Migration Plan

1. Add shared functional project config defaults for `optimization` and `git`.
2. Update config serialization so new `init` output includes those defaults.
3. Add a project config defaults migration helper that creates missing config or mutates existing YAML documents.
4. Call the helper early from `UpdateCommand.execute()`.
5. Add focused tests for init output, update creation, partial nested migration, `.yml` fallback, and invalid config skip.

Rollback is straightforward: remove the update call and serializer changes. Existing user config files with materialized defaults remain valid and already match runtime defaults.

## Open Questions

None. The scope excludes `propose` and `apply` until they are confirmed as runtime-consumed project defaults.
