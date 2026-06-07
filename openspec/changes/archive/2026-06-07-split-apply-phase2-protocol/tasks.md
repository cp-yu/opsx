### Task 1: Split apply Phase 2 protocol into a reference file

**Goal**: Make `openspec-apply-change` expose an unambiguous apply Phase 2 optimization protocol without bloating `SKILL.md`.

**Files**:
- Modify: `src/core/templates/workflows/apply-change.ts`
- Test: `test/core/templates/apply-change.test.ts`

**Requirements**:
- Add `references/apply-phase2-optimization.md` to `getApplyChangeSkillTemplate().referenceFiles`.
- Require the main apply skill instructions to read `references/apply-phase2-optimization.md` before Phase 2.
- Preserve apply-specific stack checkpoint commands in the reference file.
- Prevent `git tag apply-opt-checkpoint-*` from appearing as a valid checkpoint instruction.

#### Checks

- [x] C1 Verify apply skill references Phase 2 protocol
  - Verifies: `specs/apply-verify-integration/spec.md` / Requirement "apply 作为编译步骤" / Scenario "apply skill 引用 Phase 2 reference"
  - Command: `pnpm test test/core/templates/apply-change.test.ts`
  - Expect: apply template test confirms `referenceFiles` contains `references/apply-phase2-optimization.md` and main instructions reference it

- [x] C2 Verify apply Phase 2 stash commands are explicit
  - Verifies: `specs/apply-verify-integration/spec.md` / Requirement "apply 作为编译步骤" / Scenario "Phase 2 reference 明确 stash checkpoint 命令"
  - Command: `pnpm test test/core/templates/apply-change.test.ts`
  - Expect: reference content contains the required `git stash` commands and excludes `git tag apply-opt-checkpoint`

### Task 2: Raise reference file line limit to 500

**Goal**: Keep `SKILL.md` compact while allowing reference files to carry complete protocols.

**Files**:
- Modify: `test/skills/skill-template-length-validation.test.ts`
- Modify: `openspec/specs/skill-template-length-check/spec.md`

**Requirements**:
- Keep generated `SKILL.md` limit at 200 lines.
- Set generated `template.referenceFiles[]` limit to 500 lines.
- Update over-limit report fixtures to include the applicable limit.
- Preserve independent per-file counting without summing a skill directory.

#### Checks

- [x] C3 Verify split line limits
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "测试验证所有生成 skill 文件行数限制" / Scenario "所有模板均未超标", "reference 文件超标时按 500 行限制报告"
  - Command: `pnpm test test/skills/skill-template-length-validation.test.ts`
  - Expect: length validation enforces `SKILL.md <= 200` and `references/*.md <= 500`

### Task 3: Refresh generated skills and parity baselines

**Goal**: Ensure generated tool artifacts match the template source after the split.

**Files**:
- Modify: `.codex/skills/openspec-apply-change/SKILL.md`
- Create: `.codex/skills/openspec-apply-change/references/apply-phase2-optimization.md`
- Modify: `.claude/skills/openspec-apply-change/SKILL.md`
- Create: `.claude/skills/openspec-apply-change/references/apply-phase2-optimization.md`
- Modify: `test/core/templates/skill-templates-parity.test.ts`

**Requirements**:
- Run `openspec update` instead of manually editing generated skill files.
- Confirm generated `SKILL.md` references `references/apply-phase2-optimization.md`.
- Confirm generated reference content matches the template source.
- Update parity hashes only for intentional template output changes.

#### Checks

- [x] C4 Verify generated apply skill reference
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "长协议拆分到 references", "生成的工具 skill 与模板源一致"
  - Command: `openspec update && pnpm test test/core/templates/skill-templates-parity.test.ts`
  - Expect: generated apply skill files include `references/apply-phase2-optimization.md` and parity tests pass

- [x] C5 Verify focused template suite
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "关键契约语义仍由现有测试保护"
  - Command: `pnpm test test/core/templates/apply-change.test.ts test/skills/skill-template-length-validation.test.ts test/core/templates/skill-templates-parity.test.ts`
  - Expect: focused template and skill validation tests pass
