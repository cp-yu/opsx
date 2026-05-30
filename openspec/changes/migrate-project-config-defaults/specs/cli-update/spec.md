## ADDED Requirements

### Requirement: Migrate project config defaults

`openspec update` SHALL migrate project configuration defaults for existing OpenSpec projects by materializing missing functional defaults in `openspec/config.yaml` or `openspec/config.yml` without overwriting user-authored values.

#### Scenario: Create config when missing

- **WHEN** a project has an `openspec/` directory
- **AND** neither `openspec/config.yaml` nor `openspec/config.yml` exists
- **AND** the user runs `openspec update`
- **THEN** the command SHALL create `openspec/config.yaml`
- **AND** the created file SHALL include `schema: spec-driven`
- **AND** the created file SHALL include `optimization.enabled: true`
- **AND** the created file SHALL include `optimization.optRetries: 2`
- **AND** the created file SHALL include `git.merge.strategy: no-ff`
- **AND** the created file SHALL include `git.merge.messageFrom: artifacts`
- **AND** the created file SHALL include `git.branch.deleteAfterArchive: false`

#### Scenario: Add missing top-level defaults

- **WHEN** `openspec/config.yaml` exists with valid YAML object content that lacks `optimization` and `git`
- **AND** the user runs `openspec update`
- **THEN** the command SHALL add the `optimization` default node
- **AND** the command SHALL add the `git` default node
- **AND** the command SHALL preserve existing fields such as `schema`, `docLanguage`, `context`, and `rules`
- **AND** the command SHALL preserve user-authored values outside the inserted defaults

#### Scenario: Add missing nested defaults without overwriting existing values

- **WHEN** `openspec/config.yaml` contains `optimization.enabled: false`
- **AND** contains `git.merge.strategy: squash`
- **AND** lacks `optimization.optRetries`, `git.merge.messageFrom`, and `git.branch.deleteAfterArchive`
- **AND** the user runs `openspec update`
- **THEN** the command SHALL keep `optimization.enabled: false`
- **AND** the command SHALL keep `git.merge.strategy: squash`
- **AND** the command SHALL add `optimization.optRetries: 2`
- **AND** the command SHALL add `git.merge.messageFrom: artifacts`
- **AND** the command SHALL add `git.branch.deleteAfterArchive: false`

#### Scenario: Migrate config.yml alias

- **WHEN** `openspec/config.yaml` does not exist
- **AND** `openspec/config.yml` exists with valid YAML object content
- **AND** the user runs `openspec update`
- **THEN** the command SHALL migrate `openspec/config.yml`
- **AND** SHALL NOT create a second `openspec/config.yaml`

#### Scenario: Skip invalid config without blocking tool refresh

- **WHEN** `openspec/config.yaml` contains invalid YAML or a non-object YAML document
- **AND** the user runs `openspec update`
- **THEN** the command SHALL leave that config file unchanged
- **AND** the command SHALL warn that project config default migration was skipped
- **AND** the command SHALL continue with configured tool artifact refresh

#### Scenario: Migrate project config paths on Windows

- **WHEN** `openspec update` runs on Windows
- **THEN** the command SHALL locate `config.yaml` and `config.yml` using Node.js path utilities
- **AND** SHALL apply the same migration rules as on Unix systems
