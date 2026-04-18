## ADDED Requirements

### Requirement: Artifact rules SHALL be projected per artifact surface
Per-artifact `rules` from project config SHALL be compiled into artifact-scoped prompt projection fragments so that every instruction consumer observes the same rule semantics for the same artifact.

#### Scenario: Matching artifact receives compiled rules
- **WHEN** config defines rules for the requested artifact ID
- **THEN** the projection pipeline SHALL emit an artifact-scoped rules fragment for that artifact
- **AND** instruction loading SHALL expose that compiled fragment without requiring workflow templates to interpret raw config

#### Scenario: Non-matching artifact receives no rules fragment
- **WHEN** config defines rules for other artifact IDs but not the requested one
- **THEN** the projection pipeline SHALL omit rules for the requested artifact
- **AND** instruction output SHALL not fabricate empty rule sections
