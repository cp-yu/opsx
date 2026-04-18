## ADDED Requirements

### Requirement: Bootstrap guidance SHALL explain projection-driven authoring rules
Bootstrap init guidance and phase instructions SHALL describe how config projection governs bootstrap prose fields while keeping canonical tokens unchanged.

#### Scenario: Map-phase guidance references projection semantics
- **WHEN** bootstrap guidance instructs users or agents to fill prose-bearing fields such as `spec.purpose`, requirement prose, scenario titles, or step text
- **THEN** the guidance SHALL explain that those fields follow the projected documentation language policy
- **AND** SHALL explain that canonical template and normative tokens remain unchanged
