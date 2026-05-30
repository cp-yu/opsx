## ADDED Requirements

### Requirement: Materialize functional project config defaults

The project config layer SHALL expose a shared default materialization contract for disk writes so `openspec init` and `openspec update` use the same functional defaults for project configuration.

#### Scenario: Default materialization includes optimization and git

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL include `optimization.enabled: true`
- **AND** SHALL include `optimization.optRetries: 2`
- **AND** SHALL include `git.merge.strategy: no-ff`
- **AND** SHALL include `git.merge.messageFrom: artifacts`
- **AND** SHALL include `git.branch.deleteAfterArchive: false`

#### Scenario: Default materialization excludes non-functional optional fields

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL NOT add `docLanguage`, `context`, or `rules` without explicit user input
- **AND** SHALL NOT add `propose` or `apply` policy nodes until they are confirmed as runtime-consumed project defaults

#### Scenario: Missing-only merge preserves user values

- **WHEN** materialized defaults are merged into an existing YAML config document
- **THEN** the merge SHALL add only missing mapping keys
- **AND** SHALL NOT replace existing scalar values
- **AND** SHALL NOT replace existing nested mapping values
- **AND** SHALL preserve unknown top-level and nested user fields

#### Scenario: Cross-platform config path handling

- **WHEN** default materialization reads or writes project config files
- **THEN** it SHALL build paths with Node.js path utilities
- **AND** SHALL preserve the `.yaml` preference and `.yml` fallback behavior consistently across Windows, macOS, and Linux
