## MODIFIED Requirements

### Requirement: 归档时执行 feature 分支到主分支的合并

`opsx-archive-skill` SHALL 在归档流程的 sync 与 move-to-archive 完成之后，根据 `git.autoCommit` 决定是否自动提交并将 feature 分支合并回 originalBranch。合并行为受 `openspec/config.yaml` 的 `git` 配置节点约束。

#### Scenario: auto 模式默认 no-ff 合并

- **WHEN** archive 完成 sync 与 move-to-archive
- **AND** `.apply-isolation.json` 的 `originalBranch` 字段非空
- **AND** 当前 git HEAD 在 feature 分支上
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** 配置 `git.merge.strategy` 为 `no-ff`
- **THEN** archive SHALL 在 feature 分支上创建 archive commit
- **AND** SHALL 切换到 originalBranch
- **AND** SHALL 执行 `git merge --no-ff --no-commit <feature>`
- **AND** SHALL 执行 `git commit -F -`
- **AND** merge commit message SHALL 通过 stdin 传入避免 shell 元字符解释

#### Scenario: manual 模式跳过 git 自动化

- **WHEN** archive 完成 sync 与 move-to-archive
- **AND** 配置 `git.autoCommit` 为 `manual`
- **THEN** archive SHALL NOT 生成 archive commit message
- **AND** SHALL NOT 执行 `git add`
- **AND** SHALL NOT 执行 `git commit`
- **AND** SHALL NOT 执行 merge
- **AND** SHALL 保留归档后的未提交工作树供用户自行提交和合并

#### Scenario: ff-only 策略

- **WHEN** 配置 `git.autoCommit` 为 `auto`
- **AND** 配置 `git.merge.strategy` 为 `ff-only`
- **AND** feature 分支可被 fast-forward 合并
- **THEN** archive SHALL 执行 `git merge --ff-only <feature>`
- **AND** SHALL NOT 生成 merge commit message

#### Scenario: squash 策略

- **WHEN** 配置 `git.autoCommit` 为 `auto`
- **AND** 配置 `git.merge.strategy` 为 `squash`
- **THEN** archive SHALL 执行 `git merge --squash <feature>`
- **AND** SHALL 在 originalBranch 上以 `git.merge.commitMessage.convention` 生成的 message 单独 commit
- **AND** SHALL NOT 自动删除 feature 分支（squash 后 git 不视其为已合并）

### Requirement: Merge message 从 artifacts 生成

archive 在 `git.autoCommit` 为 `auto` 且 `git.merge.commitMessage.convention` 为 `openspec-merge-summary` 时，SHALL 从已归档目录下的 `proposal.md`、`design.md`、`tasks.md` 生成符合 git-commit-reasons 模板的 commit message。

#### Scenario: 完整 artifacts 生成 message

- **WHEN** 归档目录包含完整的 proposal.md、design.md、tasks.md
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** 配置 `git.merge.commitMessage.convention` 为 `openspec-merge-summary`
- **THEN** archive SHALL 生成 subject `<type>(<scope>): <中文标题>`
- **AND** body SHALL 包含 `## Why` 段（来自 proposal.md 与 design.md）
- **AND** body SHALL 包含 `## Changes` 段（来自 tasks.md 已勾选 task）
- **AND** `## Changes` 每一行 SHALL 使用 ``- `<file-path>`: <变更原因>`` 格式
- **AND** subject 长度 SHALL NOT 超过 72 字符（type/scope/标点之外的中文标题截断到 50 字符内）

#### Scenario: type 字段从 What Changes 关键动词推断

- **WHEN** `proposal.md` 的 `## What Changes` 含 "添加" 或 "新增"
- **THEN** type SHALL 为 `feat`
- **WHEN** 含 "修复"
- **THEN** type SHALL 为 `fix`
- **WHEN** 含 "重构" 或 "删除"
- **THEN** type SHALL 为 `refactor`
- **WHEN** 含 "性能" 或 "perf"
- **THEN** type SHALL 为 `perf`
- **WHEN** 以上关键词均未命中
- **THEN** type SHALL 为 `chore`

#### Scenario: scope 字段优先取 OPSX 主导 domain

- **WHEN** 归档目录存在 `opsx-delta.yaml` 且含 ADDED 或 MODIFIED capabilities
- **THEN** scope SHALL 为出现次数最多的 capability 所属 domain 的短名（去除 `dom.` 前缀）
- **WHEN** opsx-delta.yaml 不存在或无 capabilities
- **THEN** scope SHALL 为 change name 的第一个 `-` 之前的片段

### Requirement: Archive commit 在 feature 分支记录归档动作

archive 在 `git.autoCommit` 为 `auto` 且执行 merge 之前，SHALL 在 feature 分支上为 sync 写入与目录移动创建一个符合 git-commit-reasons 格式的 docs commit。

#### Scenario: 归档 commit message 使用 openspec-archive convention

- **WHEN** archive 完成 sync 与 mv 操作
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** 配置 `git.archive.commitMessage.convention` 为 `openspec-archive`
- **AND** 工作树存在归档相关变更
- **THEN** archive SHALL 执行 `git add -- <archive-dir> <synced-spec-paths> <synced-opsx-paths>`
- **AND** SHALL 执行 `git commit --only -F - -- <archive-dir> <synced-spec-paths> <synced-opsx-paths>`
- **AND** commit subject SHALL 为 `docs(<change-name>): 归档变更制品`
- **AND** body SHALL 包含 `## Why` 段
- **AND** body SHALL 包含 `## Changes` 段
- **AND** `## Changes` 每一行 SHALL 使用 ``- `<file-path>`: <变更原因>`` 格式说明该路径必须提交的原因

#### Scenario: 保留非归档 dirty changes

- **WHEN** archive 创建 archive commit
- **AND** 工作树中存在不属于 `<archive-dir>`、`<synced-spec-paths>` 或 `<synced-opsx-paths>` 的 dirty changes
- **THEN** archive SHALL NOT stage 或 commit 这些非归档路径
- **AND** archive commit SHALL 只包含显式 pathspec 中的归档相关路径

#### Scenario: 无归档相关变更时跳过 commit

- **WHEN** sync 与 mv 后工作树没有可提交的归档相关变更（即此 change 无 delta）
- **THEN** archive SHALL 跳过 archive commit 步骤
- **AND** SHALL 继续执行后续 merge 步骤

#### Scenario: Windows 上的归档路径提交

- **WHEN** 在 Windows 上 archive 创建 archive commit
- **THEN** archive SHALL 使用 Node.js path utilities 构建文件系统路径
- **AND** SHALL 传给 git 的 pathspec 使用显式路径数组
- **AND** SHALL NOT 使用 shell 字符串拼接路径或 message
