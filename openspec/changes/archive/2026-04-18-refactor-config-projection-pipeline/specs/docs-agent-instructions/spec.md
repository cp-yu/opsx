## ADDED Requirements

### Requirement: Artifact-writing workflow surfaces SHALL share one config projection contract
All workflow and skill surfaces that create or rewrite OpenSpec artifacts SHALL inherit the same config projection contract, including prompt-level authoring constraints and canonical-token preservation rules.

#### Scenario: Projection contract applies across workflow surfaces
- **WHEN** a workflow or skill creates, syncs, archives, bootstraps, verifies, or onboards OpenSpec artifacts
- **THEN** the generated instructions SHALL consume the shared prompt projection contract
- **AND** the contract SHALL preserve canonical tokens such as `SHALL`, `MUST`, section headers, requirement headers, scenario headers, BDD keywords, IDs, schema keys, paths, and commands

#### Scenario: docLanguage is rendered as actionable guidance
- **WHEN** config defines `docLanguage`
- **THEN** the projection contract SHALL render it as explicit authoring guidance for natural-language prose
- **AND** SHALL NOT rely on the agent inferring behavior from a raw YAML key/value dump alone
