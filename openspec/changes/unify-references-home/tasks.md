### Task 1: sync-engine 迁移 reference 写入目标并增加校验

**Goal**: reference 文件单副本写入 `openspec/references/`，前缀所有权边界与生成校验生效。

**Files**:
- Modify: `src/core/templates/sync-engine.ts`
- Modify: `src/core/workflow-installation.ts`
- Test: `test/core/workflow-installation.test.ts`

**Requirements**:
- `template.referenceFiles[]` 写入 `openspec/references/openspec-<name>.md`，不再写各工具 skill 目录
- 删除 skill 目录 `references/` 的目录级 `rm -rf` 写入逻辑；update 按生成清单显式清理 skill 目录残留 `references/`
- 对 `openspec/references/` 只逐文件覆盖生成清单内 `openspec-` 前缀文件，永不触碰非前缀文件
- 写入前校验 reference 文件名全局唯一，冲突抛错
- 写入前校验 reference 内容工具中立（含 `/opsx:` 等 per-tool 语法即抛错）

#### Checks

- [ ] C1 验证 reference 物化到共享目录且 skill 目录无残留
  - Verifies: `specs/references-home/spec.md` / Requirement "内置 reference 物化到 openspec/references 目录" / Scenario "update 物化全部内置 reference", "update 清理 skill 目录残留 references"
  - Command: `npx vitest run test/core/workflow-installation.test.ts`
  - Expect: `openspec/references/openspec-*.md` 全部物化；工具 skill 目录无 `references/` 子目录

- [ ] C2 验证用户文件幸存与前缀覆盖
  - Verifies: `specs/references-home/spec.md` / Requirement "openspec 前缀作为 update 写入所有权边界" / Scenario "用户自定义模板在 update 后幸存", "用户改动的 openspec 前缀文件被覆盖"
  - Command: `npx vitest run test/core/workflow-installation.test.ts`
  - Expect: 预置的非前缀文件在 update 后原样保留；改动过的 `openspec-` 前缀文件被覆盖

- [ ] C3 验证生成校验抛错
  - Verifies: `specs/references-home/spec.md` / Requirement "reference 生成校验文件名唯一与工具中立" / Scenario "文件名冲突时生成失败", "含工具特定语法的内容生成失败"
  - Command: `npx vitest run test/core/workflow-installation.test.ts`
  - Expect: 构造冲突文件名与含 `/opsx:` 内容的模板时生成抛出可定位错误且不写入

- [ ] C4 验证共享引擎单副本写入
  - Verifies: `specs/template-artifact-pipeline/spec.md` / Requirement "Shared Artifact Sync Engine" / Scenario "Reference files write to the shared references home"
  - Command: `npx vitest run test/core/workflow-installation.test.ts`
  - Expect: 多工具配置下 reference 仅存在 `openspec/references/` 单份

### Task 2: git config schema 减法与 commitMessage 路径覆盖

**Goal**: 删除 autoCommit 与 convention enum，新增 `git.commitMessage.{boundary,archive,merge}` 可选路径并校验。

**Files**:
- Modify: `src/core/config-schema.ts`
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-projection.ts`
- Modify: `src/core/config-prompts.ts`
- Test: `test/core/config-schema.test.ts`
- Test: `test/core/project-config.test.ts`
- Test: `test/commands/config.test.ts`

**Requirements**:
- git 节点 schema 仅含 `commitMessage.{boundary,archive,merge}`（可选 POSIX 相对路径）、`merge.strategy`、`branch.deleteAfterArchive`
- 路径校验拒绝绝对路径、`..` 上溯、反斜杠，非法值 warning 后丢弃
- 残留 `git.autoCommit` 与 convention 字段输出废弃 warning 且不暴露到 ProjectConfig
- projection 输出新 git 结构，不含 autoCommit/convention/messageFrom
- 默认值物化契约不再包含 autoCommit 与 convention 节点

#### Checks

- [ ] C5 验证新 git schema 与路径校验
  - Verifies: `specs/config-loading/spec.md` / Requirement "加载 git 配置节点" / Scenario "完整 git 节点", "git 节点缺失时填默认值"; Requirement "git 配置字段 Zod schema 校验" / Scenario "commitMessage 路径合法值", "commitMessage 路径非法值"
  - Command: `npx vitest run test/core/project-config.test.ts test/core/config-schema.test.ts`
  - Expect: 合法路径被接受；绝对路径/`..`/反斜杠被 warning 丢弃；缺失时无 commitMessage 默认值

- [ ] C6 验证废弃字段 warning
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置字段 Zod schema 校验" / Scenario "残留 autoCommit 字段输出废弃 warning", "残留 convention 字段输出废弃 warning"
  - Command: `npx vitest run test/core/project-config.test.ts`
  - Expect: 残留字段触发废弃 warning 且不出现在 ProjectConfig

- [ ] C7 验证 projection 输出新结构
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置暴露给 projection 消费者" / Scenario "projection 输入包含 git 节点"; `specs/config-project-query/spec.md` / Requirement "输出格式与 instructions 配置投影一致" / Scenario "git 字段输出新结构"
  - Command: `npx vitest run test/commands/config.test.ts test/core/project-config.test.ts`
  - Expect: `openspec config project --json` 的 git 字段含 commitMessage/merge.strategy/branch，且不含 autoCommit 与 convention

### Task 3: workflow 模板与 archive skill 路径路由更新

**Goal**: 各 workflow 模板引用 `openspec/references/openspec-*.md`，archive skill 按 `git.commitMessage.*` 覆盖路由读模板且无条件继续 git 流程。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Modify: `src/core/templates/workflows/apply-change.ts`
- Modify: `src/core/templates/workflows/optimizer.ts`
- Modify: `src/core/templates/workflows/verify-change.ts`
- Modify: `src/core/templates/workflows/sync-specs.ts`
- Modify: `src/core/templates/workflows/impact-sweeper.ts`
- Test: `test/skills/archive-skill-content.test.ts`
- Test: `test/skills/skill-template-length-validation.test.ts`

**Requirements**:
- 全部模板内 reference 引用路径改为 `openspec/references/openspec-<name>.md`
- archive Step 8 删除 `git.autoCommit` auto/manual 分支与 manual 停止文案，agent 无条件继续 git 流程
- archive/merge commit message 读取指令改为覆盖路由：配置 `git.commitMessage.*` 读用户模板，未配置读内置模板
- archive 摘要字段不再包含 auto/manual handoff 模式
- 模板内容保持工具中立，不含需 per-tool 转换的语法

#### Checks

- [ ] C8 验证 archive skill 无条件 git 流程与覆盖路由
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "agent 继续 git 流程", "agent 处理 merge message"; Requirement "Archive skill 拆分 commit message convention references" / Scenario "archive 制品提交读取 archive reference", "merge 步骤读取 merge summary reference"
  - Command: `npx vitest run test/skills/archive-skill-content.test.ts`
  - Expect: 指令含覆盖路由文案与 `openspec/references/openspec-*` 路径；不含 manual 模式与 autoCommit 分支文案

- [ ] C9 验证 verify checkpoint 协议引用迁移
  - Verifies: `specs/verify-skill-reference-files/spec.md` / Requirement "verify skill 包含 Phase 2 checkpoint reference" / Scenario "referenceFiles 包含 checkpoint 协议", "主指令引用 checkpoint 协议"
  - Command: `npx vitest run test/core/templates/skill-templates-parity.test.ts`
  - Expect: verify skill 指令引用 `openspec/references/openspec-phase2-checkpoint-protocol.md`

- [ ] C10 验证长度限制与拆分路径表述
  - Verifies: `specs/skill-template-length-check/spec.md` / Requirement "现有超标 skill 模板必须拆分或精简" / Scenario "超标 workflow/internal skill 被压缩或拆分", "长协议拆分到共享 references home"
  - Command: `npx vitest run test/skills/skill-template-length-validation.test.ts`
  - Expect: SKILL.md ≤ 200 行、reference ≤ 500 行，长协议物化目标为 `openspec/references/openspec-*.md`

### Task 4: init/update 物化与迁移逻辑更新

**Goal**: init 不再写 autoCommit/convention 节点；update 迁移删除存量陈旧节点。

**Files**:
- Modify: `src/core/config-schema.ts`
- Modify: `src/commands/init.ts`
- Modify: `src/core/update.ts`
- Test: `test/core/init.test.ts`
- Test: `test/core/update.test.ts`

**Requirements**:
- init 生成的 config 含 `git.merge.strategy` 与 `git.branch.deleteAfterArchive`，不含 autoCommit 与 convention 节点
- update 迁移移除存量 `git.autoCommit`、convention 节点与 `git.merge.messageFrom`
- missing-only 合并保留用户已有值（含 `git.commitMessage.*` 路径覆盖）
- Windows 路径行为与 Unix 一致

#### Checks

- [ ] C11 验证 init 默认值
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure", "Creating OpenSpec structure on Windows"
  - Command: `npx vitest run test/core/init.test.ts`
  - Expect: 生成的 config.yaml 不含 autoCommit/convention；含 merge.strategy 与 branch.deleteAfterArchive

- [ ] C12 验证 update 迁移删除陈旧节点
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Remove obsolete git fields", "Add missing nested defaults without overwriting existing values"
  - Command: `npx vitest run test/core/update.test.ts`
  - Expect: 存量 autoCommit/convention/messageFrom 被移除；用户其他 git 字段保留

- [ ] C13 验证 archive CLI handoff 提醒
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive CLI 输出 git handoff 提醒" / Scenario "归档完成后提醒 agent 接管"
  - Command: `npx vitest run test/core/archive-branch-merge.test.ts`
  - Expect: handoff 提醒恒为 agent 接管，不读取 autoCommit

### Task 5: 生成产物刷新与全量回归

**Goal**: 刷新生成产物到新布局并通过全量测试。

**Files**:
- Modify: `.claude/skills/` 生成产物
- Modify: `.codex/skills/` 生成产物
- Modify: `.github/skills/` 生成产物
- Create: `openspec/references/`（受管 `openspec-*.md` 物化产物）
- Test: `test/core/workflow-installation.test.ts`

**Requirements**:
- `openspec update --force` 后三个工具目录 skill 与模板源一致且无 `references/` 子目录
- `openspec/references/` 物化全部受管 reference
- 全量测试通过

#### Checks

- [ ] C14 验证生成产物一致性
  - Verifies: `specs/references-home/spec.md` / Requirement "内置 reference 物化到 openspec/references 目录" / Scenario "skill 指令引用项目级路径"
  - Command: `openspec update --force && git status --short`
  - Expect: skill 目录 references 移除、`openspec/references/openspec-*.md` 物化，SKILL.md 引用项目级路径

- [ ] C15 全量回归
  - Verifies: `specs/references-home/spec.md` / Requirement "openspec 前缀作为 update 写入所有权边界" / Scenario "用户自定义模板在 update 后幸存"
  - Command: `pnpm test`
  - Expect: 全量测试通过，无 autoCommit/convention 相关残留断言失败
