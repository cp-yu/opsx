## ADDED Requirements

### Requirement: 归档时执行 feature 分支到主分支的合并

`opsx-archive-skill` SHALL 在归档流程的 sync 与 move-to-archive 完成之后，自动将 feature 分支按结构化 commit message 合并回 originalBranch。合并行为受 `openspec/config.yaml` 的 `git` 配置节点约束。

#### Scenario: 默认 no-ff 合并

- **WHEN** archive 完成 sync 与 move-to-archive
- **AND** `.apply-isolation.json` 的 `originalBranch` 字段非空
- **AND** 当前 git HEAD 在 feature 分支上
- **AND** 配置 `git.merge.strategy` 为 `no-ff`
- **THEN** archive SHALL 在 feature 分支上创建 archive commit
- **AND** SHALL 切换到 originalBranch
- **AND** SHALL 执行 `git merge --no-ff --no-commit <feature>`
- **AND** SHALL 执行 `git commit -F -`
- **AND** merge commit message SHALL 通过 stdin 传入避免 shell 元字符解释

#### Scenario: ff-only 策略

- **WHEN** 配置 `git.merge.strategy` 为 `ff-only`
- **AND** feature 分支可被 fast-forward 合并
- **THEN** archive SHALL 执行 `git merge --ff-only <feature>`
- **AND** SHALL NOT 生成 merge commit message

#### Scenario: squash 策略

- **WHEN** 配置 `git.merge.strategy` 为 `squash`
- **THEN** archive SHALL 执行 `git merge --squash <feature>`
- **AND** SHALL 在 originalBranch 上以生成的 message 单独 commit
- **AND** SHALL NOT 自动删除 feature 分支（squash 后 git 不视其为已合并）

### Requirement: Merge message 从 artifacts 生成

archive 在 `git.merge.messageFrom` 为 `artifacts` 时，SHALL 从已归档目录下的 `proposal.md`、`design.md`、`tasks.md` 生成符合 git-commit-reasons 模板的 commit message。

#### Scenario: 完整 artifacts 生成 message

- **WHEN** 归档目录包含完整的 proposal.md、design.md、tasks.md
- **AND** 配置 `git.merge.messageFrom` 为 `artifacts`
- **THEN** archive SHALL 生成 subject `<type>(<scope>): <中文标题>`
- **AND** body SHALL 包含 `## Why` 段（来自 proposal.md 与 design.md）
- **AND** body SHALL 包含 `## Changes` 段（来自 tasks.md 已勾选 task）
- **AND** subject 长度 SHALL NOT 超过 72 字符（type/scope/标点之外的中文标题截断到 50 字符内）

#### Scenario: type 字段从 What Changes 关键动词推断

- **WHEN** `proposal.md` 的 `## What Changes` 含 "添加" 或 "新增"
- **THEN** type SHALL 为 `feat`
- **WHEN** 含 "修复"
- **THEN** type SHALL 为 `fix`
- **WHEN** 含 "重构" 或 "删除"
- **THEN** type SHALL 为 `refactor`
- **WHEN** 以上关键词均未命中
- **THEN** type SHALL 为 `chore`

#### Scenario: scope 字段优先取 OPSX 主导 domain

- **WHEN** 归档目录存在 `opsx-delta.yaml` 且含 ADDED 或 MODIFIED capabilities
- **THEN** scope SHALL 为出现次数最多的 capability 所属 domain 的短名（去除 `dom.` 前缀）
- **WHEN** opsx-delta.yaml 不存在或无 capabilities
- **THEN** scope SHALL 为 change name 的第一个 `-` 之前的片段

#### Scenario: messageFrom 为 manual 时写草稿

- **WHEN** 配置 `git.merge.messageFrom` 为 `manual`
- **THEN** archive SHALL 把生成的 message 写入 `path.join(changeDir, '.merge-message.draft')`
- **AND** SHALL 提示用户编辑后手动执行 `git merge -F .merge-message.draft <feature>`
- **AND** SHALL NOT 自动执行 merge

### Requirement: Archive commit 在 feature 分支记录归档动作

archive 在执行 merge 之前，SHALL 在 feature 分支上为 sync 写入与目录移动创建一个 docs 风格的 commit。

#### Scenario: 归档 commit message 固定模板

- **WHEN** archive 完成 sync 与 mv 操作
- **AND** 工作树存在 staged 或 untracked 的归档相关变更
- **THEN** archive SHALL 执行 `git add -- <archive-dir> <synced-spec-paths> <synced-opsx-paths>`
- **AND** SHALL 执行 `git commit -F -` 提交 message：
  ```
  docs(<change-name>): 归档变更制品

  ## Changes
  - openspec/changes/archive/YYYY-MM-DD-<name>/: 移动 change 目录到归档区
  - openspec/specs/<capability>/spec.md: 同步 delta spec
  - openspec/project.opsx.*.yaml: 应用 OPSX delta
  ```
- **AND** archive commit message SHALL NOT 走 git-commit-reasons 生成器

#### Scenario: 无归档相关变更时跳过 commit

- **WHEN** sync 与 mv 后工作树没有可提交的变更（即此 change 无 delta）
- **THEN** archive SHALL 跳过 archive commit 步骤
- **AND** SHALL 继续执行后续 merge 步骤

### Requirement: 合并后按配置删除 feature 分支

archive 在 merge 成功之后，SHALL 根据 `git.branch.deleteAfterArchive` 决定是否删除 feature 分支。

#### Scenario: 启用删除且分支已合并

- **WHEN** 配置 `git.branch.deleteAfterArchive` 为 `true`
- **AND** `git.merge.strategy` 不是 `ff-only`（fast-forward 后历史等同，删除安全）或 git 已确认分支与 originalBranch 等价
- **AND** `git branch --merged <originalBranch>` 包含 feature 分支
- **THEN** archive SHALL 执行 `git branch -d <feature>`

#### Scenario: 启用删除但分支未合并

- **WHEN** 配置 `git.branch.deleteAfterArchive` 为 `true`
- **AND** `git branch --merged <originalBranch>` 不包含 feature 分支
- **THEN** archive SHALL NOT 删除分支
- **AND** SHALL 在归档摘要中输出 "feature 分支未通过 git 已合并校验，跳过删除"

#### Scenario: 配置为 false 时保留分支

- **WHEN** 配置 `git.branch.deleteAfterArchive` 为 `false` 或字段缺失
- **THEN** archive SHALL NOT 删除 feature 分支
- **AND** SHALL 在归档摘要中明示分支保留以及切换回原分支的状态

### Requirement: Merge 冲突时 abort 并保留前置副作用

archive 在 merge 阶段遇到冲突时，SHALL 立即 `git merge --abort`，保留已完成的 sync、mv 与 archive commit，并向用户报告恢复路径。

#### Scenario: 冲突中断 merge

- **WHEN** `git merge` 退出码非 0 且 git 报告冲突
- **THEN** archive SHALL 执行 `git merge --abort`
- **AND** SHALL 保留 feature 分支上已存在的 archive commit
- **AND** SHALL 显示：合并 originalBranch 时发生冲突；已 abort，请手动解决冲突后重跑 archive
- **AND** SHALL 不删除 feature 分支
- **AND** SHALL 不修改 `.apply-isolation.json`

#### Scenario: archive 重跑幂等

- **WHEN** archive 在 merge abort 后被再次调用
- **AND** change 目录已位于 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **THEN** archive SHALL 检测到已归档状态并跳过 sync 与 mv 步骤
- **AND** SHALL 仅执行 merge 与 cleanup 后续步骤

### Requirement: originalBranch 解析与回退

archive SHALL 优先从 `.apply-isolation.json.originalBranch` 读取目标分支名，缺失时按确定顺序回退。

#### Scenario: isolation 文件含 originalBranch

- **WHEN** `path.join(changeDir-after-mv, '.apply-isolation.json')` 存在且 `originalBranch` 非空
- **THEN** archive SHALL 使用该值作为 merge 目标分支

#### Scenario: isolation 文件缺失

- **WHEN** `.apply-isolation.json` 不存在或字段为空
- **THEN** archive SHALL 执行 `git symbolic-ref refs/remotes/origin/HEAD --short` 解析 `origin/<default>` 的 short name
- **AND** SHALL 使用解析结果作为 originalBranch

#### Scenario: 远程默认分支也无法解析

- **WHEN** `git symbolic-ref` 失败
- **THEN** archive SHALL 提示用户输入目标分支名
- **AND** 用户输入后 SHALL 写回 `.apply-isolation.json.originalBranch` 以便后续幂等

### Requirement: 跨平台 git 命令调用

archive SHALL 通过 `child_process.spawn` 数组形式执行所有 git 命令，并通过 stdin 传入多行 message。

#### Scenario: spawn 数组形式

- **WHEN** archive 执行 git 命令
- **THEN** SHALL 使用 `spawn('git', ['merge', '--no-ff', '--no-commit', branchName], { cwd: projectRoot })` 形式
- **AND** SHALL 使用 `spawn('git', ['commit', '-F', '-'], { cwd: projectRoot })` 形式传入 merge message
- **AND** SHALL NOT 使用 shell 字符串拼接传参

#### Scenario: Windows 上的 message 传入

- **WHEN** 在 Windows 上 archive 调用 `git commit -F -`
- **THEN** message 内容 SHALL 通过 stdin 写入而非命令行参数
- **AND** message 中的 `` ` ``、`$`、`(`、`)` 等字符 SHALL NOT 被 shell 解释
