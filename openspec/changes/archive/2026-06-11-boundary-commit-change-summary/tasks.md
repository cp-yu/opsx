### Task 1: boundary commit 模板与 Step 8 重写

**Goal**: 新增 boundary commit message 受管模板，archive Step 8 实现边界改为顺序语义并路由到模板。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Test: `test/skills/archive-skill-content.test.ts`

**Requirements**:
- 新增 `BOUNDARY_COMMIT_MESSAGE_REFERENCE` 常量并注册进 `referenceFiles`，物化目标 `openspec/references/openspec-boundary-commit-message.md`
- 模板定义 subject（`<type>(<scope>): <中文标题>`）、`## Why`（归档 proposal/design 来源）、`## Changes`（`git diff --name-only <base>..<head>` 为准的逐文件描述）、`Implementation: <base>..<head> (carried by <commits>)` footer 及 `git commit -F -` 规则
- Step 8 实现边界改为顺序语义：残余 diff 提交（如有）→ 无条件 `--allow-empty` boundary commit → 归档制品提交
- Step 8 删除内联的 boundary body 规则（diff 范围、checkpoint 列表、intentionally empty 说明），改为按 `git.commitMessage.boundary` 覆盖路由读模板
- 模板内容工具中立且 ≤ 500 行

#### Checks

- [x] C1 验证无条件 boundary commit 指令
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "无条件创建 semantic boundary commit", "存在未提交实现变更"
  - Command: `npx vitest run test/skills/archive-skill-content.test.ts`
  - Expect: Step 8 含顺序语义与无条件 `--allow-empty` 指令；不含 intentionally-empty 内联 prose 与条件分支文案

- [x] C2 验证 boundary 模板内容与路由
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive skill 拆分 commit message convention references" / Scenario "boundary 提交读取 boundary reference"; Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "boundary commit message 承载完整 change 总结", "boundary commit 模板路由"
  - Command: `npx vitest run test/skills/archive-skill-content.test.ts`
  - Expect: 模板含 `## Why`、`## Changes`、`Implementation:` footer 与 `git diff --name-only` 事实来源规则；SKILL.md 含 `git.commitMessage.boundary` 覆盖路由文案

- [x] C3 验证 boundary 覆盖键消费
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "boundary commit 模板路由"
  - Command: `npx vitest run test/skills/archive-skill-content.test.ts`
  - Expect: 指令明确"配置 `git.commitMessage.boundary` 读用户模板，未配置读 `openspec/references/openspec-boundary-commit-message.md`"

### Task 2: 生成产物刷新与回归

**Goal**: 物化 boundary 模板到 references home，刷新工具产物并通过回归。

**Files**:
- Create: `openspec/references/openspec-boundary-commit-message.md`（受管物化产物）
- Modify: `.claude/skills/openspec-archive-change/` 生成产物
- Modify: `.codex/skills/openspec-archive-change/` 生成产物
- Modify: `.github/skills/openspec-archive-change/` 生成产物
- Test: `test/skills/skill-template-length-validation.test.ts`

**Requirements**:
- `openspec update --force` 后 `openspec/references/openspec-boundary-commit-message.md` 物化且与模板源一致
- 三个工具目录 archive skill 文案一致
- 长度限制测试通过（SKILL.md ≤ 200 行、reference ≤ 500 行）
- 全量测试通过

#### Checks

- [x] C4 验证物化与长度限制
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "长协议拆分到共享 references home", "生成的工具 skill 与模板源一致"
  - Command: `openspec update --force && npx vitest run test/skills/skill-template-length-validation.test.ts`
  - Expect: boundary 模板物化为 `openspec/references/openspec-boundary-commit-message.md`，长度测试通过

- [x] C5 全量回归
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "agent 继续 git 流程"
  - Command: `pnpm test`
  - Expect: 全量测试通过
