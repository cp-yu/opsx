# apply-default-isolation-config Specification

## Purpose
此规约记录变更 materialize-apply-default-isolation 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: Apply default isolation SHALL be materialized in project config defaults

The project config default materialization contract SHALL include `apply.defaultIsolation: ask` as a runtime-consumed functional default.

#### Scenario: Materialized defaults include apply default isolation

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL include `apply.defaultIsolation: ask`
- **AND** the materialized defaults SHALL preserve existing `optimization` and `git` defaults
- **AND** the materialized defaults SHALL NOT add `propose`

#### Scenario: Missing-only migration adds apply default isolation

- **WHEN** an existing `openspec/config.yaml` or `openspec/config.yml` lacks `apply.defaultIsolation`
- **AND** the user runs `openspec update`
- **THEN** the migration SHALL add `apply.defaultIsolation: ask`
- **AND** the migration SHALL preserve existing user-authored fields

#### Scenario: Missing-only migration preserves existing apply default isolation

- **WHEN** an existing project config contains `apply.defaultIsolation: worktree`
- **AND** the user runs `openspec update`
- **THEN** the migration SHALL keep `apply.defaultIsolation: worktree`
- **AND** the migration SHALL NOT replace it with `ask`

#### Scenario: Config path handling remains cross-platform

- **WHEN** default materialization reads or writes project config files on Windows, macOS, or Linux
- **THEN** it SHALL build config paths with Node.js path utilities
- **AND** it SHALL preserve the existing `.yaml` preference and `.yml` fallback behavior

