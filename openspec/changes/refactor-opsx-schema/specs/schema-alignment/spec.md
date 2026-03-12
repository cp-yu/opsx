# Spec: Schema Alignment

## Scenario: ProjectMetadataSchema matches YAML reality

Given opsx-utils.ts defines ProjectMetadataSchema
When the schema is applied to the actual project.opsx.yaml
Then it must accept `id`, `name`, `intent`, `scope`, `roots` fields
And it must NOT require `version` or `description`

## Scenario: Status enum is draft or active only

Given a node with `status` field
When the status value is validated
Then only `draft` and `active` are accepted
And `deprecated` and `implemented` are rejected at schema level

## Scenario: Progress field is independent of status

Given a node with `status: active`
When `progress: { phase: implementing }` is present
Then validation passes
And when `status: draft` has `progress` present
Then validation fails (progress requires active status)

## Scenario: Legacy status normalization during read

Given a YAML file with `status: implemented`
When `readProjectOpsx()` processes it
Then the status is normalized to `active`
And no validation error is raised

## Scenario: CodeRefSchema supports line ranges

Given a code-map entry with `line_start` and `line_end`
When the schema validates it
Then both fields are accepted as optional numbers
And the legacy `line` field is NOT supported

## Scenario: REMOVED delta uses collection arrays

Given an opsx-delta.yaml with REMOVED section
When it contains `domains: [{ id: dom.old }]` and `capabilities: [{ id: cap.old }]`
Then validation passes
And `node_ids` / `relation_ids` format is rejected

## Scenario: schema_version is required

Given any OPSX file (main, relations, code-map)
When `schema_version` is missing
Then legacy normalization adds `schema_version: 1` during read
And writer always emits `schema_version: 1`
