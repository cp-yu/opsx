## MODIFIED Requirements

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 调用 archive CLI 完成 verify、sync 与 move-to-archive；CLI 返回后，skill SHALL 根据 `git.autoCommit` 决定 agent 是否继续归档后的 git 流程。CLI 本身 SHALL NOT 执行 archive commit、merge 或 cleanup。

#### Scenario: auto 模式由 agent 继续 git 流程

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `auto`
- **THEN** archive skill SHALL 由 agent 继续处理 git 提交流程
- **AND** agent SHALL 先处理实现边界，再提交 OpenSpec/docs 归档制品
- **AND** agent SHALL 在生成归档制品 commit message 前读取 `references/archive-commit-message.md`

#### Scenario: auto 模式存在未提交实现变更

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** 工作区仍存在未提交的真实项目实现变更
- **THEN** agent SHALL 先创建普通 implementation commit
- **AND** 该 commit SHALL 只承载尚未提交的真实项目实现变更
- **AND** agent SHALL 再提交 OpenSpec/docs 归档制品

#### Scenario: auto 模式实现已由 Phase 2 checkpoint commits 承载

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `auto`
- **AND** git history 中存在保留的 `wip: opt-*` checkpoint commits 承载本次 change 的实现 diff
- **AND** 不存在需要普通 implementation commit 承载的未提交真实项目实现变更
- **THEN** agent SHALL 创建 `--allow-empty` 的 semantic boundary commit
- **AND** semantic boundary commit 的 subject SHALL 使用 `feat`、`fix`、`refactor` 等真实语义类型，而非 `meta`
- **AND** semantic boundary commit body SHALL 记录 effective implementation diff 范围
- **AND** semantic boundary commit body SHALL 列出承载该 diff 的 `wip: opt-*` checkpoint commits
- **AND** semantic boundary commit body SHALL 明确该 commit intentionally empty
- **AND** agent SHALL 再提交 OpenSpec/docs 归档制品

#### Scenario: manual 模式只归档

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `manual`
- **THEN** archive skill SHALL 停止在归档完成状态
- **AND** SHALL 提醒后续 git 提交流程由用户手动处理
- **AND** SHALL NOT 生成 commit message
- **AND** SHALL NOT 执行 git commit 或 merge

#### Scenario: 非 git 仓库时只报告归档结果

- **WHEN** 项目根目录不是 git 仓库
- **THEN** archive skill SHALL 报告 archive CLI 已完成的归档结果
- **AND** SHALL NOT 尝试执行 git 提交、合并或分支清理

#### Scenario: agent 处理 merge message

- **WHEN** `git.autoCommit` 为 `auto`
- **AND** agent 后续 git 流程需要创建 merge 或 squash commit message
- **THEN** agent SHALL 在生成 message 前读取 `references/merge-summary-message.md`
- **AND** SHALL NOT 使用 archive CLI 输出的推荐 message
