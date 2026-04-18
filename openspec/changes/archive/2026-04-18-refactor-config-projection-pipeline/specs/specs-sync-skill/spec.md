## ADDED Requirements

### Requirement: Sync skill SHALL consume prompt projection
The `/opsx:sync` skill SHALL consume prompt projection compiled for the sync surface so its instructions align with CLI sync and with the shared config-driven authoring contract.

#### Scenario: Sync skill explains projected prose boundary
- **WHEN** the skill instructs the agent to reconcile or create specs
- **THEN** the prompt projection SHALL state how natural-language prose follows config-driven policy
- **AND** SHALL preserve canonical tokens such as `SHALL`, `MUST`, requirement headers, scenario headers, and BDD keywords
