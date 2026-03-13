# Spec: Three-File Split

## Scenario: Fixed three-file layout replaces sharding

Given the OPSX write function receives a ProjectOpsxBundle
When it writes to disk
Then exactly three files are created:
  - `openspec/project.opsx.yaml` (project + domains + capabilities)
  - `openspec/project.opsx.relations.yaml` (relations only)
  - `openspec/project.opsx.code-map.yaml` (code mappings only)
And NO `openspec/project.opsx/` directory is created
And NO `_meta.yaml` file is created

## Scenario: Main file contains no code_refs or spec_refs

Given the main `project.opsx.yaml` is written
When any capability or domain node is serialized
Then `code_refs` field is absent
And `spec_refs` field is absent

## Scenario: Relations file is independently parseable

Given `project.opsx.relations.yaml` exists
When parsed independently
Then it contains `schema_version` and `relations` array
And each relation has `from`, `type`, `to` fields
And it can be loaded without reading the main file

## Scenario: Code-map file indexes by node id

Given `project.opsx.code-map.yaml` exists
When parsed
Then it contains `schema_version`, `generated_at`, and `nodes` array
And each entry has `id` and `refs` array
And refs support `path`, `line_start`, `line_end`

## Scenario: Missing companion files default to empty

Given `project.opsx.yaml` exists
When `project.opsx.relations.yaml` does NOT exist
Then `readProjectOpsx()` returns bundle with empty `relations: []`
And when `project.opsx.code-map.yaml` does NOT exist
Then bundle has empty `code_map: []`
And NO error is raised

## Scenario: Atomic three-file write

Given a write operation for the bundle
When writing to disk
Then all three files are written via temp-file + rename
And if any single write fails, no partial state remains
And no `.tmp` files exist after successful write

## Scenario: Read-write round-trip preserves data

Given a valid ProjectOpsxBundle
When written to disk and read back
Then the resulting bundle is structurally identical
And `schema_version` is preserved in all three files

## Scenario: Referential integrity across files

Given the main file has nodes `[dom.a, cap.a.x]`
When relations file references `from: cap.a.x, to: dom.a`
Then validation passes
And when relations file references `from: cap.nonexistent`
Then validation fails with dangling reference error

## Scenario: Code-map integrity

Given the main file has node `cap.cli.init`
When code-map has entry `{ id: cap.cli.init, refs: [...] }`
Then validation passes
And when code-map has entry `{ id: cap.nonexistent, refs: [...] }`
Then validation fails with unknown node error
