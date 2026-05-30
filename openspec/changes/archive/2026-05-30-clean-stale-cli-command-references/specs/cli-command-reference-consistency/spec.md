## ADDED Requirements

### Requirement: Active command references match the current CLI surface
OpenSpec SHALL keep command examples in active user-facing documentation, generated workflow templates, Agent instructions, skills, prompts, and active specs aligned with the current `openspec --help` command surface.

#### Scenario: Active surfaces do not reference removed verify flags
- **WHEN** active command references are audited
- **THEN** current user-facing documentation and generated Agent instruction surfaces SHALL NOT reference removed verify flags including `--all`, `--opsx`, `--change`, or `--check-refs`
- **AND** references to structure validation SHALL use `openspec validate ...`
- **AND** references to implementation verify gates SHALL use supported `openspec verify phase1`, `openspec verify phase2`, `openspec verify seal`, or `openspec verify status` commands

#### Scenario: Positional change commands replace removed change flags
- **WHEN** active command references describe sync or archive operations for a change
- **THEN** they SHALL use supported positional command forms such as `openspec sync <change-name>` and `openspec archive <change-name>`
- **AND** they SHALL NOT describe removed sync/archive `--change` flag forms

#### Scenario: Bootstrap validation uses bootstrap command surface
- **WHEN** active command references describe bootstrap gate validation or bootstrap-generated OPSX candidate checks
- **THEN** they SHALL use `openspec bootstrap validate` when referring to the bootstrap gate
- **AND** SHALL NOT instruct users or Agents to run removed verify `--opsx` or `--check-refs` flag forms for that purpose

### Requirement: Command-reference cleanup is source-backed
OpenSpec SHALL clean stale command references at the source that produces them, not only in generated copies, whenever a generated surface can recreate the stale text.

#### Scenario: Generated files have a template source
- **WHEN** a stale command reference appears in a generated skill, command, prompt, or Agent instruction file
- **THEN** the implementation SHALL identify whether a source template or transform emits that text
- **AND** if a source exists, update the source so regeneration does not reintroduce the stale command
- **AND** update generated copies only as needed to keep the repository consistent

#### Scenario: Historical archived artifacts are not default cleanup targets
- **WHEN** stale command references are found under `openspec/changes/archive/**`
- **THEN** they SHALL be treated as historical evidence by default
- **AND** SHALL NOT be modified unless they are used as current user-facing guidance or as a source for generated current instructions

### Requirement: Cleanup verification reports remaining stale references by class
The cleanup SHALL include a repeatable verification step that reports stale command references by active surface class before the change is considered complete.

#### Scenario: Audit after cleanup
- **WHEN** the cleanup implementation is complete
- **THEN** a repository search SHALL confirm no active surface still contains removed verify flag forms or removed sync/archive `--change` flag forms
- **AND** any remaining occurrences under archive history SHALL be reported separately from active failures
- **AND** the verification output SHALL distinguish valid `openspec verify phase1|phase2|seal|status` references from stale verify flag references
