### Task 1: 项目配置结构迁移

**Goal**: 将项目配置从 `git.merge.messageFrom` 迁移为 `git.autoCommit` 与 commitMessage convention 结构。

**Files**:
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-schema.ts`
- Modify: `src/core/config-projection.ts`
- Modify: `src/core/config-prompts.ts`
- Test: `test/core/project-config.test.ts`
- Test: `test/core/config-schema.test.ts`
- Test: `test/commands/config.test.ts`

**Requirements**:
- 解析并默认填充 `git.autoCommit: auto`
- 解析并默认填充 `git.archive.commitMessage.convention: openspec-archive`
- 解析并默认填充 `git.merge.commitMessage.convention: openspec-merge-summary`
- 不再暴露 `git.merge.messageFrom`
- 保持 Windows/macOS/Linux 配置路径行为一致

#### Checks

- [x] C1 验证新 git 配置解析和默认值
  - Verifies: `specs/config-loading/spec.md` / Requirement "加载 git 配置节点" / Scenario "完整 git 节点", "git 节点缺失时填默认值", "部分字段缺失时混合默认值", "陈旧 messageFrom 字段被忽略"
  - Command: `npm test -- test/core/project-config.test.ts`
  - Expect: project config tests cover new git structure and no `messageFrom` output

- [x] C2 验证 git 配置字段校验
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置字段 Zod schema 校验" / Scenario "autoCommit 合法值", "autoCommit 非法值", "archive commit convention 合法值", "merge commit convention 合法值"
  - Command: `npm test -- test/core/config-schema.test.ts test/core/project-config.test.ts`
  - Expect: invalid enum values warn and fall back without rejecting unrelated valid fields

- [x] C3 验证 projection 和 config project 输出
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置暴露给 projection 消费者" / Scenario "projection 输入包含 git 节点", "archive prompt projection 投出 git 段"; `specs/config-project-query/spec.md` / Requirement "输出格式与 instructions 配置投影一致" / Scenario "git 字段输出新结构"
  - Command: `npm test -- test/commands/config.test.ts test/core/project-config.test.ts`
  - Expect: `configProjection.normalized.git` and `openspec config project --json` expose the same new git shape

### Task 2: Archive git 自动化行为

**Goal**: 让 archive runtime 按 `git.autoCommit` 决定是否创建 archive commit、merge 和 cleanup，并按 git-commit-reasons convention 生成提交信息。

**Files**:
- Modify: `src/core/archive.ts`
- Modify: `src/core/archive/merge-message.ts`
- Test: `test/core/archive-branch-merge.test.ts`
- Test: `test/core/archive/merge-message.test.ts`

**Requirements**:
- `manual` 模式只执行 verify/sync/mv，不生成 message、不 add、不 commit、不 merge
- `auto` 模式 archive commit 使用 `openspec-archive`
- merge/squash commit 使用 `openspec-merge-summary`
- archive commit 只提交显式 pathspec，保留其他 dirty changes
- git 命令继续使用 argv 数组和 stdin message

#### Checks

- [x] C4 验证 manual 模式只归档
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "归档时执行 feature 分支到主分支的合并" / Scenario "manual 模式跳过 git 自动化"; `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "manual 模式只归档"
  - Command: `npm test -- test/core/archive-branch-merge.test.ts`
  - Expect: manual mode archives files but leaves git history unchanged after mv/sync

- [x] C5 验证 auto 模式 archive commit 和 merge
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "归档时执行 feature 分支到主分支的合并" / Scenario "auto 模式默认 no-ff 合并", "ff-only 策略", "squash 策略"
  - Command: `npm test -- test/core/archive-branch-merge.test.ts`
  - Expect: auto mode still creates archive commit and performs configured merge strategy

- [x] C6 验证 git-commit-reasons message 格式
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Archive commit 在 feature 分支记录归档动作" / Scenario "归档 commit message 使用 openspec-archive convention"; Requirement "Merge message 从 artifacts 生成" / Scenario "完整 artifacts 生成 message", "type 字段从 What Changes 关键动词推断"
  - Command: `npm test -- test/core/archive/merge-message.test.ts test/core/archive-branch-merge.test.ts`
  - Expect: generated messages contain subject, `## Why`, `## Changes`, and file-reason lines

- [x] C7 验证 dirty changes 保留和 Windows pathspec 边界
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "Archive commit 在 feature 分支记录归档动作" / Scenario "保留非归档 dirty changes", "Windows 上的归档路径提交"
  - Command: `npm test -- test/core/archive-branch-merge.test.ts`
  - Expect: archive commit excludes unrelated dirty files and path handling remains explicit

### Task 3: Init、Update 与 workflow 模板

**Goal**: 让生成配置、配置迁移和 archive workflow 指令都使用新 git 结构并清理旧字段。

**Files**:
- Modify: `src/core/init.ts`
- Modify: `src/core/update.ts`
- Modify: `src/core/config-prompts.ts`
- Modify: `src/core/templates/workflows/archive-change.ts`
- Test: `test/core/init.test.ts`
- Test: `test/core/update.test.ts`
- Test: `test/skills/archive-skill-content.test.ts`

**Requirements**:
- init 生成新 git 默认结构
- update 删除 `git.merge.messageFrom` 并补齐新 defaults
- archive skill projection 文案读取新字段
- manual 模式的 skill 指令说明跳过 commit/merge
- 配置路径在 Windows 上使用 Node path utilities

#### Checks

- [x] C8 验证 init 默认配置
  - Verifies: `specs/cli-init/spec.md` / Requirement "Directory Creation" / Scenario "Creating OpenSpec structure", "Creating OpenSpec structure on Windows"
  - Command: `npm test -- test/core/init.test.ts`
  - Expect: generated `openspec/config.yaml` contains new git defaults and omits `messageFrom`

- [x] C9 验证 update 强制清理旧字段
  - Verifies: `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Create config when missing", "Add missing nested defaults without overwriting existing values", "Remove obsolete messageFrom", "Migrate project config paths on Windows"
  - Command: `npm test -- test/core/update.test.ts`
  - Expect: update removes `git.merge.messageFrom`, adds new defaults, and preserves other user-authored values

- [x] C10 验证 archive workflow 模板
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 通过 prompt projection 消费 git 配置" / Scenario "配置经投影后被 archive 消费", "陈旧 projection 字段不再出现"; Requirement "Archive 摘要扩展报告 merge 状态" / Scenario "摘要报告字段"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts`
  - Expect: generated archive instructions mention new git fields, manual skip behavior, and no `git.merge.messageFrom`

### Task 4: 全量验证

**Goal**: 运行项目验证，确保配置、archive runtime、workflow template 和 spec delta 同时保持一致。

**Files**:
- Test: `openspec/changes/archive-git-autocommit-policy/specs/archive-branch-merge/spec.md`
- Test: `openspec/changes/archive-git-autocommit-policy/specs/config-loading/spec.md`
- Test: `openspec/changes/archive-git-autocommit-policy/specs/opsx-archive-skill/spec.md`
- Test: `openspec/changes/archive-git-autocommit-policy/specs/cli-init/spec.md`
- Test: `openspec/changes/archive-git-autocommit-policy/specs/cli-update/spec.md`
- Test: `openspec/changes/archive-git-autocommit-policy/specs/config-project-query/spec.md`

**Requirements**:
- delta specs 可被 OpenSpec 校验
- opsx-delta referential integrity 通过
- 相关单测通过
- Windows 路径要求已有针对性测试或显式断言

#### Checks

- [x] C11 验证 change 制品结构
  - Verifies: `specs/config-loading/spec.md` / Requirement "Materialize functional project config defaults" / Scenario "Cross-platform config path handling"; `specs/archive-branch-merge/spec.md` / Requirement "跨平台 git 命令调用" / Scenario "Windows 上的 message 传入"
  - Command: `openspec validate archive-git-autocommit-policy --type change`
  - Expect: change validation passes or only reports warnings already captured in tasks

- [x] C12 运行相关测试集
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "归档时执行 feature 分支到主分支的合并" / Scenario "auto 模式默认 no-ff 合并"; `specs/cli-update/spec.md` / Requirement "Migrate project config defaults" / Scenario "Remove obsolete messageFrom"
  - Command: `npm test -- test/core/archive-branch-merge.test.ts test/core/archive/merge-message.test.ts test/core/project-config.test.ts test/core/config-schema.test.ts test/core/init.test.ts test/core/update.test.ts test/commands/config.test.ts test/skills/archive-skill-content.test.ts`
  - Expect: targeted regression suite passes
