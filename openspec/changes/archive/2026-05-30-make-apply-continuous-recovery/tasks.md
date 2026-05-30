### Task 1: Apply continuous recovery template

**Goal**: Update the apply workflow prompt so ordinary blockers enter recovery and only repeated identical task errors pause.

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- Preserve `apply.defaultIsolation` behavior and make `ask` the only interactive isolation mode.
- Auto-split tasks requiring more than 5 TDD cycles into bounded step files or batches.
- Route `BLOCKED`, `NEEDS_CONTEXT`, Phase 1 failures, and seal failures into master-led recovery.
- Pause only after same task + same normalized error signature fails twice after remediation.
- Keep user interrupt as an immediate stop condition.

#### Checks

- [x] C1 Verify continuous recovery prompt contract
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "任务拆解失败处理" / Scenario "同一错误重复失败才暂停", Scenario "错误变化继续执行"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template test asserts recovery loop and repeated normalized error signature pause rule

- [x] C2 Verify auto-split prompt contract
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "任务拆解失败处理" / Scenario "任务过于复杂"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template test asserts >5 TDD cycles are auto-split rather than paused

- [x] C3 Verify seal failure recovery prompt contract
  - Verifies: `specs/apply-verify-integration/spec.md` / Requirement "apply 作为编译步骤" / Scenario "Phase 3 Seal 失败进入 recovery loop"
  - Command: `npm test -- test/core/templates/apply-change.test.ts`
  - Expect: apply template test asserts seal failure maps to remediation and returns to recovery loop

### Task 2: Implementer structured feedback contract

**Goal**: Update the implementer skill prompt so blocker output is stable coordinator input.

**Files**:
- Modify: `src/core/templates/workflows/implementer.ts`
- Test: `test/core/templates/implementer-template.test.ts`

**Requirements**:
- Keep existing `DONE | BLOCKED | NEEDS_CONTEXT | DONE_WITH_CONCERNS` statuses.
- Add stable error signature fields for blocked and needs-context outputs.
- State that `BLOCKED` and `NEEDS_CONTEXT` are recovery feedback to master.
- Preserve the mechanical TDD execution contract.

#### Checks

- [x] C4 Verify structured blocker output
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Implementer 必须报告执行状态" / Scenario "遇到阻塞报告 BLOCKED", Scenario "需要更多上下文报告 NEEDS_CONTEXT"
  - Command: `npm test -- test/core/templates/implementer-template.test.ts`
  - Expect: implementer template test asserts task, cycle, step, command, failure kind, and error summary fields

- [x] C5 Verify statuses remain compatible
  - Verifies: `specs/apply-implementer-subagent/spec.md` / Requirement "Implementer 必须报告执行状态" / Scenario "成功完成报告 DONE", Scenario "完成但有疑虑报告 DONE_WITH_CONCERNS"
  - Command: `npm test -- test/core/templates/implementer-template.test.ts`
  - Expect: implementer template still documents all existing statuses and ordered TDD execution

### Task 3: Specs and validation alignment

**Goal**: Keep behavior specs, OPSX delta, and validation checks coherent with the new recovery model.

**Files**:
- Modify: `openspec/changes/make-apply-continuous-recovery/specs/apply-task-decomposition/spec.md`
- Modify: `openspec/changes/make-apply-continuous-recovery/specs/apply-implementer-subagent/spec.md`
- Modify: `openspec/changes/make-apply-continuous-recovery/specs/apply-branch-isolation/spec.md`
- Modify: `openspec/changes/make-apply-continuous-recovery/specs/apply-verify-integration/spec.md`
- Modify: `openspec/changes/make-apply-continuous-recovery/opsx-delta.yaml`
- Test: `openspec/changes/make-apply-continuous-recovery/tasks.md`

**Requirements**:
- Validate all delta spec requirement headers against existing main specs.
- Keep each task to 5 or fewer Requirements.
- Keep all `Verifies:` paths change-local and POSIX.
- Include cross-platform path considerations where generated step files are referenced.

#### Checks

- [x] C6 Verify change validation
  - Verifies: `specs/apply-branch-isolation/spec.md` / Requirement "Apply 必须检测当前分支" / Scenario "在 main/master 分支且配置默认隔离方式时直接执行"
  - Command: `openspec validate "make-apply-continuous-recovery" --type change --json`
  - Expect: validation passes for specs, tasks, and opsx-delta

- [x] C7 Verify task structure
  - Verifies: `specs/apply-task-decomposition/spec.md` / Requirement "任务拆解失败处理" / Scenario "任务过于复杂"
  - Command: `openspec validate "make-apply-continuous-recovery" --type change --json`
  - Expect: tasks use `### Task N:` sections with Goal, Files, Requirements, and C-prefixed Checks
