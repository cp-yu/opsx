### Task 1: 调整 archive auto handoff 指令

**Goal**: 让 archive skill 在 `git.autoCommit: auto` 下区分普通 implementation commit 与 empty semantic boundary commit。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `.codex/skills/openspec-archive-change/SKILL.md`

**Requirements**:
- auto handoff SHALL 先处理实现边界，再提交 OpenSpec/docs 归档制品。
- 存在未提交真实项目实现变更时 SHALL 保留普通 implementation commit 流程。
- 实现已由 `wip: opt-*` commits 承载且无未提交实现变更时 SHALL 使用 `git commit --allow-empty` 创建 semantic boundary commit。
- semantic boundary commit subject SHALL 使用 `feat`、`fix`、`refactor` 等真实语义类型，而非 `meta`。
- semantic boundary commit body SHALL 记录 effective implementation diff、checkpoint commits 和 intentionally empty 说明。

#### Checks

- [x] C1 Verify auto handoff semantic boundary 指令
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "auto 模式由 agent 继续 git 流程", "auto 模式存在未提交实现变更", "auto 模式实现已由 Phase 2 checkpoint commits 承载"
  - Evidence: `src/core/templates/workflows/archive-change.ts`
  - Expect: Step 8 不再要求无条件先提交真实项目变更，并包含 `wip: opt-*`、`--allow-empty`、semantic boundary commit、effective implementation diff、OpenSpec/docs archive artifacts 的指令。

- [x] C2 Verify 生成 skill 同步
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "auto 模式实现已由 Phase 2 checkpoint commits 承载"
  - Command: `openspec update --force`
  - Expect: `.codex/skills/openspec-archive-change/SKILL.md` 包含与模板一致的 semantic boundary commit 指令。

### Task 2: 更新测试与验证

**Goal**: 用现有 archive skill content 测试锁定新的 handoff 文案，并确认 change 制品有效。

**Files**:
- Modify: `test/skills/archive-skill-content.test.ts`
- Test: `test/skills/archive-skill-content.test.ts`

**Requirements**:
- 测试 SHALL 不再断言旧的无条件 `commit real project changes before OpenSpec/docs archive artifacts` 文案。
- 测试 SHALL 覆盖 `--allow-empty`、`wip: opt-*`、semantic boundary commit 和 effective implementation diff。
- 验证 SHALL 覆盖 archive skill 模板生成到 Codex/Claude skill 的一致性。
- change validation SHALL 作为 propose 后结构检查运行。

#### Checks

- [x] C3 Verify archive skill content 测试
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "auto 模式由 agent 继续 git 流程", "auto 模式实现已由 Phase 2 checkpoint commits 承载"
  - Command: `npx vitest run test/skills/archive-skill-content.test.ts`
  - Expect: archive skill content 测试通过，并覆盖新的 semantic boundary commit 文案。

- [x] C4 Verify change artifacts
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "auto 模式存在未提交实现变更", "auto 模式实现已由 Phase 2 checkpoint commits 承载"
  - Command: `openspec validate archive-semantic-boundary-commit --type change --json`
  - Expect: change validation 通过或仅报告与本 change 无关的既有 warning。
