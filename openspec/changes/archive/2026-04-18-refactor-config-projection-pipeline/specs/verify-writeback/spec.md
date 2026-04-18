## ADDED Requirements

### Requirement: Verify write-back SHALL consume runtime projection
When verify writes remediation content back to `tasks.md`, the system SHALL use runtime projection compiled from project config for natural-language prose decisions.

#### Scenario: Remediation prose follows projected language policy
- **WHEN** verify appends or refreshes `## Remediation` content
- **AND** runtime projection defines a prose-language policy
- **THEN** remediation descriptions SHALL follow that policy
- **AND** task checkboxes, section headers, requirement references, and other canonical tokens SHALL remain unchanged
