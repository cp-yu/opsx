## ADDED Requirements

### Requirement: Instruction loader SHALL expose config projection bundles
The instruction loader SHALL compile project config into reusable projection bundles for the current workflow surface and artifact instead of exposing only raw `context` and `rules` fields.

#### Scenario: Prompt projection generated for artifact instructions
- **WHEN** artifact instructions are generated
- **THEN** the loader SHALL resolve the effective project config and compile a prompt projection for the current surface and artifact
- **AND** the compiled result SHALL preserve canonical token boundaries declared by the projection rules

#### Scenario: Projection bundle remains stable across consumers
- **WHEN** multiple workflow templates request instructions for the same surface and artifact under the same config
- **THEN** the loader SHALL return projection content with the same semantics for each consumer
- **AND** workflow templates SHALL NOT need to reinterpret raw config fields to recover those semantics
