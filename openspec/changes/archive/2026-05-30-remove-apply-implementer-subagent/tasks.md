### Task 1: Rewrite apply Phase 0 workflow

**Goal**: Update apply workflow instructions so Master agent directly implements tasks and never uses `.apply-steps` or `openspec-implementer`.

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `schemas/spec-driven/schema.yaml`
- Test: `test/core/templates/apply-change.test.ts`
- Test: `test/commands/artifact-workflow.test.ts`

**Requirements**:
- Remove implementer subagent dispatch from apply Phase 0.
- Remove `.apply-steps` generation, reading, and recovery instructions.
- Preserve Phase 1 reviewer, Phase 2 optimizer, and Phase 3 seal instructions.
- Keep `tasks.md` Checks and remediation as the task progress and recovery sources.
- Keep path-related wording cross-platform and avoid hardcoded separator assumptions.

#### Checks

- [x] C1 Verify apply Phase 0 direct execution
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "Master agent 直接实现 pending task", Scenario "apply workflow 不生成 apply-steps", Scenario "apply workflow 不 dispatch implementer"
  - Command: `npm test -- test/core/templates/apply-change.test.ts test/commands/artifact-workflow.test.ts`
  - Expect: apply instructions describe Master direct implementation and do not mention `.apply-steps`, `openspec-implementer`, implementer dispatch, or cheap coding model guidance

- [x] C2 Verify clean-context gate remains
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "clean-context verify gate 保持不变"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template still references `openspec-reviewer`, `openspec-optimizer`, `openspec verify phase1`, `openspec verify phase2`, and `openspec verify seal`

### Task 2: Remove implementer skill generation

**Goal**: Delete the `openspec-implementer` internal skill surface and update generated skill expectations.

**Files**:
- Modify: `src/core/shared/skill-generation.ts`
- Modify: `src/core/templates/skill-templates.ts`
- Modify: `src/core/templates/workflows/implementer.ts`
- Test: `test/core/shared/skill-generation.test.ts`
- Test: `test/core/templates/implementer-template.test.ts`
- Test: `test/core/workflow-installation.test.ts`

**Requirements**:
- Remove `openspec-implementer` from internal skill registration.
- Remove unused implementer template exports and template tests.
- Keep reviewer, optimizer, and impact-sweeper generation unchanged.
- Use explicit internal skill lists; do not rely on directory scanning or regex cleanup.
- Preserve cross-platform skill installation path tests using `path.join()` expectations.

#### Checks

- [x] C3 Verify implementer skill is not generated
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "内部 skill 模板注册" / Scenario "内部 skill 列表显式排除 implementer"
  - Command: `npm test -- test/core/shared/skill-generation.test.ts test/core/workflow-installation.test.ts`
  - Expect: generated internal skills exclude `openspec-implementer` and still include reviewer/optimizer/impact-sweeper as applicable

- [x] C4 Verify removed implementer template surface
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "内部 skill 模板注册" / Scenario "Update 时刷新内部 skill", Scenario "内部 skill 列表显式排除 implementer"
  - Evidence: `src/core/templates/workflows/implementer.ts`, `src/core/templates/skill-templates.ts`, `test/core/templates/implementer-template.test.ts`
  - Expect: no active template export or test expects the removed implementer status protocol

### Task 3: Align specs, OPSX, and documentation

**Goal**: Remove stale formal and user-facing references to the old apply execution model while keeping historical archive files untouched.

**Files**:
- Modify: `openspec/specs/apply-change-workflow/spec.md`
- Modify: `openspec/specs/apply-task-decomposition/spec.md`
- Modify: `openspec/specs/apply-implementer-subagent/spec.md`
- Modify: `openspec/project.opsx.yaml`
- Modify: `openspec/project.opsx.relations.yaml`
- Modify: `openspec/project.opsx.code-map.yaml`
- Modify: `README.md`
- Modify: `docs/migration-guide.md`
- Modify: `docs/commands.md`
- Modify: `docs/workflows.md`

**Requirements**:
- Archive historical references under `openspec/changes/archive/**` remain unchanged.
- Active specs and docs no longer describe `.apply-steps` or implementer subagent as apply behavior.
- OPSX removes `cap.apply.implementer-subagent` and narrows subagent orchestration to reviewer/optimizer judgment.
- Code-map refs are added or updated for affected apply capabilities where useful.
- Documentation distinguishes Master coding from clean-context reviewer/optimizer gate.

#### Checks

- [x] C5 Verify active references are cleaned
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "Master agent 必须拆解粗粒度任务为 TDD 步骤" / Scenario "拆解为可执行工作", Scenario "任务过于复杂"
  - Command: `rg -n "apply-steps|openspec-implementer|implementer subagent|cheap model|Dispatch implementer" src schemas openspec/specs README.md docs test`
  - Expect: no active references remain except removal specs, test negative assertions, or historical context explicitly scoped to this change

- [x] C6 Verify OPSX delta and specs validate
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "任务拆解失败处理" / Scenario "同一错误重复失败才暂停", Scenario "错误变化继续执行"
  - Command: `openspec validate "remove-apply-implementer-subagent" --type change --json`
  - Expect: change specs and `opsx-delta.yaml` validate without errors

### Task 4: Run build and targeted regression checks

**Goal**: Prove the generated workflow, skill generation, and TypeScript surfaces remain coherent after deletion.

**Files**:
- Test: `test/core/templates/apply-change.test.ts`
- Test: `test/core/shared/skill-generation.test.ts`
- Test: `test/commands/artifact-workflow.test.ts`
- Test: `package.json`

**Requirements**:
- Targeted tests cover removed implementer behavior and retained reviewer/optimizer behavior.
- Build passes after removing exports and imports.
- Validation uses existing commands and does not add a new test framework.
- Windows-sensitive path expectations continue to use existing cross-platform helpers.

#### Checks

- [x] C7 Verify targeted tests pass
  - Verifies: `specs/apply-change-workflow/spec.md` / Requirement "apply Phase 0 由 Master agent 直接执行" / Scenario "clean-context verify gate 保持不变"
  - Command: `npm test -- test/core/templates/apply-change.test.ts test/core/shared/skill-generation.test.ts test/commands/artifact-workflow.test.ts`
  - Expect: targeted regression tests pass

- [x] C8 Verify TypeScript build
  - Verifies: `specs/internal-skill-installation/spec.md` / Requirement "内部 skill 模板注册" / Scenario "内部 skill 列表显式排除 implementer"
  - Command: `npm run build`
  - Expect: build passes with no references to removed implementer exports
