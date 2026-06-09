### Task 1: 收敛 archive CLI git 边界

**Goal**: 让 `openspec archive` 只执行 verify、sync、move-to-archive 与 handoff 提醒，不执行 git 写操作。

**Files**:
- Modify: `src/core/archive.ts`
- Modify: `src/core/change-sync.ts`
- Test: `test/core/archive.test.ts`
- Test: `test/core/archive-branch-merge.test.ts`
- Test: `test/commands/sync.test.ts`

**Requirements**:
- CLI 完成归档后读取 normalized config 的 `git.autoCommit`
- CLI 在 `auto` 模式提醒 agent 接管
- CLI 在 `manual` 模式提醒用户手动处理
- CLI 不执行 git commit、merge、checkout、branch cleanup
- CLI 不生成推荐 commit message
- archive-time sync 在 delta removals 清空 main spec 时删除该 spec 文件

#### Checks

- [x] C1 Verify auto handoff reminder
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive CLI 输出 git handoff 提醒" / Scenario "auto 模式提醒 agent 接管"
  - Command: `npm test -- test/core/archive.test.ts test/core/archive-branch-merge.test.ts`
  - Expect: auto 模式归档后 HEAD 不变、无 staged changes、无 commit message 生成，输出包含 agent handoff 提醒

- [x] C2 Verify manual handoff reminder
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive CLI 输出 git handoff 提醒" / Scenario "manual 模式提醒用户手动处理"
  - Command: `npm test -- test/core/archive.test.ts test/core/archive-branch-merge.test.ts`
  - Expect: manual 模式归档后 CLI 不执行任何 git 写操作，输出包含用户手动处理提醒

- [x] C3 Verify archive process stops before git writes
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive Process" / Scenario "Core mode archives with embedded specs and OPSX sync"
  - Command: `npm test -- test/core/archive.test.ts test/core/archive-branch-merge.test.ts`
  - Expect: archive-time sync 与 move-to-archive 保持通过，测试证明不会调用 `git add`、`git commit`、`git checkout`、`git merge` 或 `git branch`

- [x] C3.1 Verify emptied main spec deletion
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive Process" / Scenario "Embedded sync deletes a main spec emptied by removals" / Scenario "Removal-only delta already deleted the main spec"
  - Command: `npm test -- test/commands/sync.test.ts test/core/archive.test.ts`
  - Expect: sync 对只剩零 requirements 的 rebuilt spec 执行删除，不因空 requirements 验证失败；archive gate 将已删除目标的 removal-only delta 视为已同步

### Task 2: 调整 archive skill handoff 流程

**Goal**: 让 archive skill 在 CLI 归档后按 `git.autoCommit` 决定 agent/user 后续责任，并把 commit message 生成交给 references。

**Files**:
- Modify: `src/core/templates/workflows/archive-change.ts`
- Test: `test/skills/archive-skill-content.test.ts`
- Test: `test/core/workflow-installation.test.ts`

**Requirements**:
- archive skill 明确 CLI 只归档
- `auto` 表示 agent 自动继续 git 流程
- `manual` 表示用户手动处理 git 流程
- agent 先提交真实项目变更，再提交 OpenSpec/docs 归档制品
- agent 生成 message 前读取 references

#### Checks

- [x] C4 Verify archive skill auto handoff flow
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步" / Scenario "auto 模式由 agent 继续 git 流程"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts`
  - Expect: skill 指令说明 CLI 归档后由 agent 继续，且提交顺序为项目变更先于 OpenSpec/docs 归档制品

- [x] C5 Verify references are agent-only message sources
  - Verifies: `specs/opsx-archive-skill/spec.md` / Requirement "Archive skill 拆分 commit message convention references" / Scenario "archive 制品提交读取 archive reference" / Scenario "merge 步骤读取 merge summary reference"
  - Command: `npm test -- test/skills/archive-skill-content.test.ts test/core/workflow-installation.test.ts`
  - Expect: generated skill 保留两个 references 文件，并要求 agent 在生成 message 前读取；主 skill 不内联完整格式

### Task 3: 固定 config projection 语义

**Goal**: 保留 `git.autoCommit` 配置结构，同时把语义更新为 agent/user handoff。

**Files**:
- Modify: `src/core/config-projection.ts`
- Modify: `src/core/project-config.ts`
- Modify: `src/core/config-schema.ts`
- Test: `test/core/project-config.test.ts`
- Test: `test/core/config-schema.test.ts`
- Test: `test/commands/config.test.ts`

**Requirements**:
- `auto` / `manual` 枚举保持不变
- projection 暴露完整 git 字段
- projection 文案表达 agent/user handoff
- 不恢复 `git.merge.messageFrom`

#### Checks

- [x] C6 Verify config loading preserves fields
  - Verifies: `specs/config-loading/spec.md` / Requirement "加载 git 配置节点" / Scenario "完整 git 节点" / Scenario "git 节点缺失时填默认值"
  - Command: `npm test -- test/core/project-config.test.ts test/core/config-schema.test.ts test/commands/config.test.ts`
  - Expect: git 字段结构和默认值保持稳定，测试断言 `auto` 表示 agent handoff

- [x] C7 Verify projection handoff wording
  - Verifies: `specs/config-loading/spec.md` / Requirement "git 配置暴露给 projection 消费者" / Scenario "archive prompt projection 投出 git 段"
  - Command: `npm test -- test/core/project-config.test.ts test/commands/config.test.ts`
  - Expect: archive projection 包含 git 字段并表达 agent/user handoff，不包含 `git.merge.messageFrom`

### Task 4: 清理旧 runtime message 生成链路

**Goal**: 移除 archive CLI 对 runtime commit/merge message generator 的依赖，确保 message 生成只发生在 agent references 流程中。

**Files**:
- Modify: `src/core/archive.ts`
- Modify: `src/core/archive/merge-message.ts`
- Test: `test/core/archive/merge-message.test.ts`
- Test: `test/core/archive-branch-merge.test.ts`

**Requirements**:
- archive CLI 不调用 merge message generator
- archive CLI 不输出推荐 message
- 如果 generator 不再被任何 runtime 使用，应删除或隔离对应测试
- 保留 references 文件作为 agent message 格式来源

#### Checks

- [x] C8 Verify CLI no longer generates messages
  - Verifies: `specs/cli-archive/spec.md` / Requirement "Archive-time sync SHALL use runtime projection" / Scenario "Embedded sync updates remain projection-consistent"
  - Command: `npm test -- test/core/archive.test.ts test/core/archive-branch-merge.test.ts test/core/archive/merge-message.test.ts`
  - Expect: archive CLI 测试不再依赖 runtime message generator，且归档输出不包含推荐 commit message

- [x] C9 Verify removed CLI merge requirements
  - Verifies: `specs/archive-branch-merge/spec.md` / Requirement "归档时执行 feature 分支到主分支的合并" / Scenario "N/A"
  - Evidence: `openspec/changes/redefine-archive-git-handoff/specs/archive-branch-merge/spec.md`
  - Expect: delta spec 明确移除 CLI 自动 commit、merge、branch cleanup 与 runtime message generation 要求
