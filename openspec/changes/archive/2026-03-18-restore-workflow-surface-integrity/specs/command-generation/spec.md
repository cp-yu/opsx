## MODIFIED Requirements

### Requirement: Command generator function

The system SHALL generate workflow command artifacts from a single manifest-derived projection rather than from scattered workflow-specific mappings.

#### Scenario: Shared workflow projection drives generation
- **WHEN** generating command artifacts for any supported tool
- **THEN** the command set SHALL be derived from a shared manifest projection of the selected workflows
- **AND** the same projection SHALL determine workflow IDs, command slugs, and generated artifact membership

#### Scenario: Core and expanded mode projections remain deterministic
- **WHEN** command artifacts are generated for `core` or `expanded` mode
- **THEN** the resulting command set SHALL match the selected mode exactly
- **AND** repeated generation with the same inputs SHALL converge to the same file set

#### Scenario: Standalone sync command exists only in expanded projection
- **WHEN** the selected mode is `core`
- **THEN** command generation SHALL NOT emit a standalone sync command artifact
- **AND** when the selected mode is `expanded`, command generation SHALL emit the standalone sync command artifact
