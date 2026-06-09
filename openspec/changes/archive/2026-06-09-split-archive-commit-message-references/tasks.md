### Task 1: archive skill 模板拆分 references

**Goal**: 让 `openspec-archive-change` 模板提供两个 commit message convention reference 文件，并在主 skill 对应步骤要求读取。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Test: `test/skills/archive-skill-content.test.ts`

**Requirements**:
- `referenceFiles[]` 包含 `references/archive-commit-message.md` 与 `references/merge-summary-message.md`。
- 主 `SKILL.md` 在 archive commit 前读取 archive reference。
- 主 `SKILL.md` 在 merge 或 squash commit message 前读取 merge summary reference。
- 主 `SKILL.md` 不再内联两个 convention 的完整格式说明。

#### Checks

- [x] C1 Verify archive reference is exposed
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive skill 拆分 commit message convention references" / Scenario "archive commit 步骤读取 archive reference"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts`
  - Expect: archive skill content test confirms `references/archive-commit-message.md` exists and is required before archive commit.

- [x] C2 Verify merge summary reference is exposed
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive skill 拆分 commit message convention references" / Scenario "merge 步骤读取 merge summary reference"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts`
  - Expect: archive skill content test confirms `references/merge-summary-message.md` exists and is required before merge or squash commit message creation.

### Task 2: 生成 archive skill 产物

**Goal**: 刷新 `.codex` 与 `.claude` archive skill，使生成产物包含主 `SKILL.md` 和两个 `references/*.md` 文件。

**Files**:
- Modify: `.codex/skills/openspec-archive-change/SKILL.md`
- Modify: `.claude/skills/openspec-archive-change/SKILL.md`
- Create: `.codex/skills/openspec-archive-change/references/archive-commit-message.md`
- Create: `.codex/skills/openspec-archive-change/references/merge-summary-message.md`
- Create: `.claude/skills/openspec-archive-change/references/archive-commit-message.md`
- Create: `.claude/skills/openspec-archive-change/references/merge-summary-message.md`
- Test: `test/skills/archive-skill-content.test.ts`

**Requirements**:
- 生成产物与 `getArchiveChangeSkillTemplate()` 输出保持一致。
- 生成路径使用现有 `references/` 契约，不引入 `refs/`。
- `.codex` 与 `.claude` 的 archive 步骤正文保持等价。

#### Checks

- [x] C3 Verify generated archive skill parity
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive skill 拆分 commit message convention references" / Scenario "主 skill 保留流程边界"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts`
  - Expect: `.codex`、`.claude` 与模板源的 archive 步骤和 reference 内容一致。

### Task 3: reference 文件验证覆盖

**Goal**: 将 archive skill 的两个 commit message convention reference 纳入现有 reference 文件长度和一致性验证。

**Files**:
- Modify: `test/skills/skill-template-length-validation.test.ts`
- Test: `test/skills/skill-template-length-validation.test.ts`
- Test: `test/core/workflow-installation.test.ts`

**Requirements**:
- 每个新增 reference 文件按 `template.referenceFiles[]` 独立计数。
- 每个新增 reference 文件不超过 500 行。
- workflow 安装写入的 reference 路径保持 `references/` 前缀，兼容 Windows/macOS/Linux 的路径规范化。

#### Checks

- [x] C4 Verify archive references participate in length validation
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "长协议拆分到 references"
  - Command: `npm test -- test/skills/skill-template-length-validation.test.ts`
  - Expect: `openspec-archive-change` 的两个 reference 文件被按单文件限制验证。

- [x] C5 Verify reference artifact consistency
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "生成的工具 skill 与模板源一致"
  - Command: `npm test -- test/core/workflow-installation.test.ts test/skills/archive-skill-content.test.ts`
  - Expect: workflow 安装和 archive skill content 测试确认生成的 `references/*.md` 与模板源一致。
