## ADDED Requirements

### Requirement: Archive skill SHALL consume prompt projection
The `/opsx:archive` skill SHALL consume prompt projection for archive-time sync guidance and artifact write-back guidance rather than relying on raw config interpretation inside the template body.

#### Scenario: Archive guidance inherits projected authoring constraints
- **WHEN** the skill explains embedded sync or remediation handling
- **THEN** it SHALL use the shared prompt projection contract for prose guidance
- **AND** SHALL preserve canonical structure and normative tokens unchanged
