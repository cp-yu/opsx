## ADDED Requirements

### Requirement: Sync-created specs SHALL use runtime projection
When `openspec sync` creates or rebuilds formal specs, the command SHALL consume runtime projection so newly written prose follows config-driven policy instead of hardcoded English boilerplate.

#### Scenario: New formal spec uses projected prose policy
- **WHEN** sync creates a formal spec that does not yet exist
- **THEN** the command SHALL use runtime projection for any generated prose content
- **AND** SHALL preserve canonical headers, requirement markers, scenario markers, and normative keywords

#### Scenario: Existing formal spec update does not inject unrelated boilerplate
- **WHEN** sync updates an existing formal spec through delta reconciliation
- **THEN** the command SHALL limit generated prose to the sync contract
- **AND** SHALL NOT inject unrelated hardcoded English guidance into unaffected sections
