### Task 1: Strict TDD apply workflow

**Goal**: Update apply workflow instructions so Phase 0 requires Master-agent red/green TDD for behavior and code Checks while keeping reviewer/optimizer/seal unchanged.

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- Behavior/code Checks require test first, expected failure, minimal implementation, pass confirmation.
- Non-runtime text/artifact Checks require final evidence without artificial red failure.
- Config, schema, template, workflow template, and agent instruction template Checks default to behavior Checks.
- Apply template still excludes `.apply-steps` and `openspec-implementer`.
- Phase 1 reviewer, Phase 2 optimizer, and Phase 3 seal instructions remain intact.

#### Checks

- [x] C1 Verify strict TDD checkpoints in apply template
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "Master agent 严格 TDD 实现 pending Check"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template requires targeted test first, expected failure before implementation, minimal implementation, pass confirmation before checkbox updates

- [x] C2 Verify apply template keeps no-implementer boundary
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "apply workflow 不生成 apply-steps", Scenario "apply workflow 不 dispatch implementer", Scenario "clean-context verify gate 保持不变"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template does not contain `.apply-steps` or `openspec-implementer`, and still contains reviewer, optimizer, phase1, phase2, and seal instructions

### Task 2: Schema and instruction wording

**Goal**: Make spec-driven tasks/apply instructions align with strict Master TDD and remove contradictory direct implementation wording.

**Files**:
- Modify: `schemas/spec-driven/schema.yaml`
- Modify: `src/commands/workflow/instructions.ts`
- Test: `test/commands/artifact-workflow.test.ts`

**Requirements**:
- Tasks instruction describes coarse Tasks and executable Checks, not generated `.apply-steps`.
- Apply instruction requires strict red/green evidence for behavior/code Checks.
- Non-runtime text/artifact fast path is explicit and narrow.
- Config/schema/template changes default to behavior Checks unless proven non-runtime.
- Path wording stays POSIX for artifact fields and Node path handling for resolution.

#### Checks

- [x] C3 Verify tasks instruction removes stale TDD-cycle wording
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Tasks instructions require coarse Tasks and Checks sections", Scenario "Tasks instructions allow non-runtime text fast path"
  - Command: `npm test -- test/commands/artifact-workflow.test.ts`
  - Expect: tasks instruction no longer says apply decomposes tasks into detailed TDD cycles and includes the non-runtime text/artifact fast path

- [x] C4 Verify apply instruction requires strict TDD
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Apply instructions require strict TDD for behavior Checks"
  - Command: `npm test -- test/commands/artifact-workflow.test.ts`
  - Expect: apply instruction requires red/green evidence and does not describe unchecked direct implementation

### Task 3: Active docs specs and OPSX alignment

**Goal**: Align active formal specs, README/docs, and OPSX intents with strict Master TDD and stale residue cleanup.

**Files**:
- Modify: `openspec/specs/apply-change-workflow/spec.md`
- Modify: `openspec/specs/apply-task-decomposition/spec.md`
- Modify: `openspec/specs/cli-artifact-workflow/spec.md`
- Modify: `openspec/specs/internal-skill-installation/spec.md`
- Modify: `openspec/project.opsx.yaml`
- Modify: `openspec/project.opsx.code-map.yaml`
- Modify: `README.md`
- Modify: `docs/migration-guide.md`

**Requirements**:
- Active specs match strict Master TDD and still reject implementer dispatch.
- README/docs no longer describe implementer subagents or mechanical TDD execution.
- OPSX intents no longer say apply directly implements without strict TDD.
- Archive history remains untouched.
- Code-map refs remain POSIX project-relative paths.

#### Checks

- [x] C5 Verify active stale references are cleaned
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "Master agent 严格 TDD 实现 pending Check"
  - Command: `rg -n "directly implement each pending task|Master Agent Direct Implementation|mechanical TDD|detailed TDD cycles|cheap model|openspec-implementer|\\.apply-steps" src schemas README.md docs openspec/specs test .codex/skills .claude/skills .github/skills .claude/commands .github/prompts`
  - Expect: matches are limited to explicit negative assertions, stale cleanup requirements, or intentional no-implementer/no-apply-steps boundaries

- [x] C6 Verify change specs and OPSX delta validate
  - Verifies: `specs/cli-artifact-workflow/spec.md` / Requirement "Instructions Command" / Scenario "Verifies path remains change-local and cross-platform"
  - Command: `openspec validate "enforce-apply-strict-tdd" --type change --json`
  - Expect: change specs and `opsx-delta.yaml` validate without errors

### Task 4: Managed stale implementer cleanup

**Goal**: Ensure init/update do not generate implementer and update removes stale managed implementer skill directories by explicit name.

**Files**:
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `src/core/update.ts`
- Modify: `src/core/init.ts`
- Test: `test/core/shared/skill-generation.test.ts`
- Test: `test/core/workflow-installation.test.ts`
- Test: `test/core/profile-sync-drift.test.ts`

**Requirements**:
- Active internal skills remain reviewer, optimizer, and impact-sweeper.
- `openspec-implementer` is not generated or installed.
- Update removes stale managed `openspec-implementer` directories by explicit name.
- Cleanup does not scan arbitrary user skill directories.
- Cross-platform paths use `path.join()`.

#### Checks

- [x] C7 Verify active internal skills exclude implementer
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "Managed generated surfaces remove stale implementer residue" / Scenario "Init does not install stale implementer skill"
  - Command: `npm test -- test/core/shared/skill-generation.test.ts test/core/workflow-installation.test.ts`
  - Expect: generated internal skills exclude `openspec-implementer` and include reviewer, optimizer, and impact-sweeper

- [x] C8 Verify update removes stale managed implementer
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "Managed generated surfaces remove stale implementer residue" / Scenario "Update removes stale implementer skill by explicit name"
  - Command: `npm test -- test/core/profile-sync-drift.test.ts test/core/workflow-installation.test.ts`
  - Expect: update cleanup removes only explicitly managed stale `openspec-implementer` directories and preserves active/user skills

### Task 5: Build and generated surface verification

**Goal**: Prove the final generated workflow, skill surfaces, and TypeScript build remain coherent.

**Files**:
- Test: `package.json`
- Test: `.codex/skills/openspec-apply-change/SKILL.md`
- Test: `.claude/commands/opsx/apply.md`
- Test: `.github/prompts/opsx-apply.prompt.md`

**Requirements**:
- Generated active apply surfaces contain strict TDD checkpoints.
- Generated active surfaces do not include stale implementer skill directories.
- TypeScript build passes.
- Validation remains warning-free after artifact and OPSX updates.

#### Checks

- [x] C9 Verify targeted regression tests and build
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Checks 是任务进度源" / Scenario "完成 Check 后勾选"
  - Command: `npm test -- test/core/templates/apply-change.test.ts test/commands/artifact-workflow.test.ts test/core/shared/skill-generation.test.ts test/core/workflow-installation.test.ts test/core/profile-sync-drift.test.ts && npm run build`
  - Expect: targeted tests and build pass

- [x] C10 Verify generated apply surfaces
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "Master agent 严格 TDD 实现 pending Check", Scenario "apply workflow 不 dispatch implementer"
  - Command: `rg -n "expected failure before implementation|confirm pass before|openspec-implementer|\\.apply-steps" .codex/skills .claude/skills .github/skills .claude/commands .github/prompts`
  - Expect: generated apply surfaces include strict TDD checkpoints and contain no stale implementer skill content

## Remediation

- [x] [artifact_fix] Align active OPSX intents for `cap.cli.instructions`, `cap.ai.workflow-templates`, and `cap.apply.subagent-orchestration` with strict Master-agent TDD wording from `opsx-delta.yaml`.
