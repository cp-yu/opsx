## ADDED Requirements

### Requirement: Context injection SHALL be compiled through config projection
Project `context` SHALL be injected into artifact instructions through the shared config projection pipeline rather than ad-hoc direct field splicing.

#### Scenario: Context becomes prompt projection content
- **WHEN** instructions are generated for any artifact and config contains `context`
- **THEN** the system SHALL compile that content into the prompt projection bundle
- **AND** instruction consumers SHALL receive the compiled context guidance without needing to re-read raw config

#### Scenario: Missing context omits the projection fragment
- **WHEN** config omits `context`
- **THEN** the config projection SHALL omit the context fragment
- **AND** instruction output SHALL continue without an injected context section
