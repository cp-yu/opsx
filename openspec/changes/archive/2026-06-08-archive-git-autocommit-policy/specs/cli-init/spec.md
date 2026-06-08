## MODIFIED Requirements

### Requirement: Directory Creation

The command SHALL create the OpenSpec directory structure with config file.

#### Scenario: Creating OpenSpec structure

- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```
- **AND** write `openspec/config.yaml` using the current functional project config defaults
- **AND** the generated config SHALL include `optimization.enabled: true`
- **AND** the generated config SHALL include `optimization.optRetries: 2`
- **AND** the generated config SHALL include `apply.defaultIsolation: ask`
- **AND** the generated config SHALL render the apply default line as `defaultIsolation: ask  # ask / branch / worktree / none`
- **AND** the generated config SHALL include `git.autoCommit: auto`
- **AND** the generated config SHALL include `git.archive.commitMessage.convention: openspec-archive`
- **AND** the generated config SHALL include `git.merge.strategy: no-ff`
- **AND** the generated config SHALL include `git.merge.commitMessage.convention: openspec-merge-summary`
- **AND** the generated config SHALL include `git.branch.deleteAfterArchive: false`
- **AND** the generated config SHALL NOT include `git.merge.messageFrom`

#### Scenario: Creating OpenSpec structure on Windows

- **WHEN** `openspec init` is executed on Windows
- **THEN** build the `openspec/config.yaml` path using Node.js path utilities
- **AND** write the same default YAML fields as on Unix systems
