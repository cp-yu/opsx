## ADDED Requirements

### Requirement: Bootstrap SHALL classify repository baseline before initialization
The bootstrap flow SHALL detect repository baseline before creating a bootstrap workspace and SHALL use that classification to determine whether bootstrap is supported.

#### Scenario: Specs-only repository reports supported pre-init state
- **WHEN** a repository contains `openspec/specs/`
- **AND** no formal OPSX files exist
- **AND** the user runs `openspec bootstrap status --json`
- **THEN** the command SHALL return a structured pre-init status
- **AND** `supported` SHALL be `true`
- **AND** the output SHALL identify the baseline as `specs-only`
- **AND** the output SHALL identify the allowed bootstrap mode set

#### Scenario: No-spec repository reports supported pre-init state
- **WHEN** a repository contains no specs and no formal OPSX files
- **AND** the user runs `openspec bootstrap status --json`
- **THEN** the command SHALL return a structured pre-init status
- **AND** `supported` SHALL be `true`
- **AND** the output SHALL identify the baseline as `no-spec`

#### Scenario: Repository with formal OPSX is rejected before init
- **WHEN** any formal OPSX bootstrap target already exists in the repository
- **AND** the user runs `openspec bootstrap init`
- **THEN** bootstrap SHALL fail before creating `openspec/bootstrap/`
- **AND** the error SHALL explicitly report that repositories with existing formal OPSX are out of scope for bootstrap

### Requirement: Bootstrap SHALL support only approved upgrade paths
Bootstrap SHALL allow only the approved baseline-to-mode combinations.

#### Scenario: No-spec repository initializes in opsx-first mode
- **WHEN** the repository baseline is `no-spec`
- **AND** the user runs `openspec bootstrap init --mode opsx-first`
- **THEN** bootstrap SHALL initialize successfully

#### Scenario: No-spec repository initializes in full mode
- **WHEN** the repository baseline is `no-spec`
- **AND** the user runs `openspec bootstrap init --mode full`
- **THEN** bootstrap SHALL initialize successfully

#### Scenario: Specs-only repository initializes in full mode
- **WHEN** the repository baseline is `specs-only`
- **AND** the user runs `openspec bootstrap init --mode full`
- **THEN** bootstrap SHALL initialize successfully
- **AND** existing specs SHALL remain unchanged by initialization

#### Scenario: Unsupported baseline-to-mode combination is rejected
- **WHEN** the repository baseline does not permit the requested mode
- **AND** the user runs `openspec bootstrap init --mode <mode>`
- **THEN** bootstrap SHALL fail before writing a bootstrap workspace
- **AND** the error SHALL explain the supported modes for that baseline

### Requirement: Opsx-first mode SHALL generate only formal OPSX output
In `opsx-first` mode, bootstrap SHALL generate formal OPSX files only and SHALL guide users to add specs later through normal change workflows.

#### Scenario: Opsx-first promotion writes only OPSX files
- **WHEN** a `no-spec` repository completes bootstrap in `opsx-first` mode
- **AND** the user runs `openspec bootstrap promote -y`
- **THEN** bootstrap SHALL write the formal OPSX three-file bundle
- **AND** bootstrap SHALL NOT create missing spec files or placeholder specs
- **AND** bootstrap SHALL clean `openspec/bootstrap/` on success

#### Scenario: Opsx-first instructions explain later spec creation
- **WHEN** bootstrap is initialized in `opsx-first` mode
- **AND** the user runs `openspec bootstrap instructions --json`
- **THEN** the instruction output SHALL explain that specs are added incrementally later through normal change workflows

### Requirement: Full mode SHALL produce complete bootstrap output for supported baselines
In `full` mode, bootstrap SHALL produce the complete output expected for the detected baseline.

#### Scenario: Full mode bootstraps a no-spec repository
- **WHEN** bootstrap runs in `full` mode on a `no-spec` repository
- **THEN** the resulting bootstrap workflow SHALL prepare both spec and OPSX output for promotion

#### Scenario: Full mode bootstraps a specs-only repository without mutating specs during init
- **WHEN** bootstrap runs in `full` mode on a `specs-only` repository
- **THEN** bootstrap SHALL preserve existing spec files during initialization
- **AND** later candidate output SHALL align formal OPSX with the preserved specs

### Requirement: Validate and promote SHALL be lifecycle coherent
A successful `validate` on a review-ready workspace SHALL never cause a later valid `promote -y` to fail due to phase advancement conflicts.

#### Scenario: Validate followed by promote succeeds
- **WHEN** a bootstrap workspace is in review phase
- **AND** all promotion prerequisites are satisfied
- **AND** the user runs `openspec bootstrap validate`
- **AND** the user then runs `openspec bootstrap promote -y`
- **THEN** formal OPSX files SHALL be written successfully
- **AND** the bootstrap workspace SHALL be cleaned
- **AND** the command SHALL not fail due to duplicate phase advancement

#### Scenario: Failed validation does not advance lifecycle
- **WHEN** a required promotion prerequisite is missing
- **AND** the user runs `openspec bootstrap validate`
- **THEN** bootstrap SHALL report validation failure
- **AND** bootstrap SHALL NOT advance phase

### Requirement: Promote SHALL enforce complete gate validation
Promotion SHALL re-assert complete gate validity instead of relying only on review markdown checkboxes.

#### Scenario: Hand-edited review markdown cannot bypass missing maps
- **WHEN** `review.md` has all visible checkboxes checked
- **AND** one or more required domain maps are missing or invalid
- **AND** the user runs `openspec bootstrap promote -y`
- **THEN** bootstrap SHALL fail
- **AND** formal OPSX files SHALL NOT be written

#### Scenario: Promotion fails when review approval is stale
- **WHEN** review approval was recorded for an older candidate state
- **AND** evidence or domain maps changed afterward
- **AND** the user runs `openspec bootstrap promote -y`
- **THEN** bootstrap SHALL fail
- **AND** the error SHALL require review refresh or re-approval

### Requirement: Review artifacts SHALL refresh from current inputs
`review.md` and candidate bootstrap artifacts SHALL be regenerated from current evidence and mappings whenever those inputs change.

#### Scenario: Added domain appears after refresh
- **WHEN** a new domain is added to `evidence.yaml`
- **AND** bootstrap regenerates review artifacts
- **THEN** `review.md` SHALL include that domain
- **AND** candidate output SHALL reflect it

#### Scenario: Updated mapping invalidates stale review state
- **WHEN** an existing domain map changes after review generation
- **AND** bootstrap validates or refreshes review artifacts
- **THEN** stale review approval SHALL be invalidated
- **AND** the regenerated review SHALL reflect current capability counts and confidence ordering

### Requirement: Bootstrap contract surfaces SHALL stay consistent
Bootstrap schema, CLI behavior, workflow templates, and generated instructions SHALL describe the same lifecycle contract.

#### Scenario: Contract surfaces agree on supported modes
- **WHEN** the bootstrap schema, workflow template, and CLI help are inspected
- **THEN** they SHALL expose the same mode names
- **AND** they SHALL describe the same supported upgrade paths

#### Scenario: Contract surfaces agree on opsx-first guidance
- **WHEN** the bootstrap schema, workflow template, and CLI instruction output are inspected
- **THEN** each SHALL explain that `opsx-first` creates formal OPSX now
- **AND** specs are created later through normal change workflows
