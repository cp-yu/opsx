# Spec: Migration

## Scenario: Legacy single-file read with fallback

Given a legacy `project.opsx.yaml` containing embedded relations and code_refs
When `readProjectOpsx()` is called
Then it extracts relations into the bundle's `relations` field
And it extracts code_refs into the bundle's `code_map` field
And it normalizes `status: implemented` to `active`
And it adds `schema_version: 1` if missing

## Scenario: Legacy REMOVED delta format normalization

Given a legacy opsx-delta.yaml with `REMOVED: { node_ids: [...] }`
When the delta is read
Then it is normalized to `REMOVED: { domains: [...], capabilities: [...] }`
And the original node_ids are mapped to their respective collection types

## Scenario: Invariants split during migration

Given the legacy file contains 7 invariant nodes
When migration runs
Then `cross-platform-paths` and `spec-bdd-format` are removed from OPSX
And `delta-isolation`, `schema-priority`, `idempotent-merge`, `atomic-opsx-write`, `opsx-referential-integrity` are preserved
And all relations from removed invariant nodes are also removed

## Scenario: Migration is idempotent

Given a file that has already been migrated
When migration runs again
Then the output is identical to the first migration
And no data is lost or duplicated

## Scenario: Cross-platform path normalization in code-map

Given code_refs extracted from legacy file on Windows
When written to `project.opsx.code-map.yaml`
Then all paths use POSIX forward slashes
And line endings are LF (not CRLF)
