# cli-artifact-workflow Specification

## MODIFIED Requirements

### Requirement: Instructions Command

The system SHALL output enriched instructions for creating an artifact, including for scaffolded changes. For the spec-driven `tasks` artifact, the generated instructions SHALL require `tasks.md` to separate implementation actions from goal-driven verification checks.

#### Scenario: Show enriched instructions

- **WHEN** user runs `openspec instructions <artifact> --change <id>`
- **THEN** the system outputs:
  - Artifact metadata (ID, output path, description)
  - Template content
  - Dependency status (done/missing)
  - Unlocked artifacts (what becomes available after completion)

#### Scenario: Instructions JSON output

- **WHEN** user runs `openspec instructions <artifact> --change <id> --json`
- **THEN** the system outputs JSON matching ArtifactInstructions interface

#### Scenario: Unknown artifact

- **WHEN** user runs `openspec instructions unknown-artifact --change <id>`
- **THEN** the system displays an error listing valid artifact IDs for the schema

#### Scenario: Artifact with unmet dependencies

- **WHEN** user requests instructions for a blocked artifact
- **THEN** the system displays instructions with a warning about missing dependencies

#### Scenario: Instructions on scaffolded change

- **WHEN** user runs `openspec instructions proposal --change <id>` on a scaffolded change
- **THEN** system outputs template and metadata for creating the proposal
- **AND** does not require any artifacts to already exist

#### Scenario: Tasks instructions require Actions and Checks sections

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent to write `tasks.md` with separate `Actions` and `Checks` sections
- **AND** `Actions` SHALL contain checkbox items for implementation work using an `A` prefix
- **AND** `Checks` SHALL contain checkbox items for executable verification work using a `C` prefix
- **AND** the instruction SHALL keep the existing `- [ ]` checkbox prefix contract intact for both sections

#### Scenario: Tasks instructions convert vague work into testable goals

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent to convert validation work into a check for invalid-input behavior
- **AND** SHALL tell the agent to convert bug fixes into a check that reproduces and proves the regression fix
- **AND** SHALL tell the agent to convert refactors into a before-and-after behavior verification check
- **AND** each check SHALL state which action IDs it covers
- **AND** every action ID SHALL be covered by at least one check

#### Scenario: Checks are executable verification items

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL tell the agent that each check is executable verification work, not explanatory prose
- **AND** each check SHALL include a command, evidence source, or observable expectation sufficient for an agent to run or inspect it

#### Scenario: Tasks instructions allow trivial fast path

- **WHEN** user runs `openspec instructions tasks --change <id> --json`
- **THEN** the returned `instruction` SHALL state that trivial edits such as typo or wording-only fixes do not require the full test-first decomposition
- **AND** SHALL still require at least one lightweight check that explains how completion will be verified
