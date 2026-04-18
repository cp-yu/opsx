## ADDED Requirements

### Requirement: Bootstrap generated artifacts SHALL consume runtime projection
Bootstrap candidate specs, review artifacts, and starter artifacts SHALL consume runtime projection derived from project config so generated prose and stale detection follow the same contract as prompt-driven artifact authoring.

#### Scenario: Bootstrap candidate prose respects projected language policy
- **WHEN** bootstrap assembles candidate specs or review artifacts
- **AND** runtime projection defines a prose-language policy
- **THEN** bootstrap SHALL apply that runtime projection to generated prose fields
- **AND** SHALL preserve canonical English structure tokens and normative keywords

#### Scenario: Projection-affecting config changes invalidate bootstrap outputs
- **WHEN** an effective runtime projection field that changes generated bootstrap text is modified
- **THEN** bootstrap fingerprinting SHALL treat that as source drift
- **AND** review approval SHALL become stale until validate regenerates derived artifacts
