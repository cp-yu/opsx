# opsx-archive-skill Delta

## MODIFIED Requirements

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 调用 archive CLI 完成 verify、sync 与 move-to-archive；CLI 返回后，agent SHALL 无条件继续归档后的 git 流程。CLI 本身 SHALL NOT 执行 archive commit、merge 或 cleanup。

#### Scenario: agent 继续 git 流程

- **WHEN** archive CLI 完成 sync 与 mv
- **THEN** archive skill SHALL 由 agent 继续处理 git 提交流程
- **AND** agent SHALL 先处理实现边界，再提交 OpenSpec/docs 归档制品
- **AND** agent SHALL 在生成归档制品 commit message 前读取 `git.commitMessage.archive` 指向的用户模板，未配置时读取 `openspec/references/openspec-archive-commit-message.md`

#### Scenario: 存在未提交实现变更

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 工作区仍存在未提交的真实项目实现变更
- **THEN** agent SHALL 先创建普通 implementation commit
- **AND** 该 commit SHALL 只承载尚未提交的真实项目实现变更
- **AND** agent SHALL 再提交 OpenSpec/docs 归档制品

#### Scenario: 实现已由 Phase 2 checkpoint commits 承载

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** git history 中存在保留的 `wip: opt-*` checkpoint commits 承载本次 change 的实现 diff
- **AND** 不存在需要普通 implementation commit 承载的未提交真实项目实现变更
- **THEN** agent SHALL 创建 `--allow-empty` 的 semantic boundary commit
- **AND** semantic boundary commit 的 subject SHALL 使用 `feat`、`fix`、`refactor` 等真实语义类型，而非 `meta`
- **AND** semantic boundary commit body SHALL 记录 effective implementation diff 范围
- **AND** semantic boundary commit body SHALL 列出承载该 diff 的 `wip: opt-*` checkpoint commits
- **AND** semantic boundary commit body SHALL 明确该 commit intentionally empty
- **AND** agent SHALL 再提交 OpenSpec/docs 归档制品

#### Scenario: 非 git 仓库时只报告归档结果

- **WHEN** 项目根目录不是 git 仓库
- **THEN** archive skill SHALL 报告 archive CLI 已完成的归档结果
- **AND** SHALL NOT 尝试执行 git 提交、合并或分支清理

#### Scenario: agent 处理 merge message

- **WHEN** agent 后续 git 流程需要创建 merge 或 squash commit message
- **THEN** agent SHALL 在生成 message 前读取 `git.commitMessage.merge` 指向的用户模板，未配置时读取 `openspec/references/openspec-merge-summary-message.md`
- **AND** SHALL NOT 使用 archive CLI 输出的推荐 message

### Requirement: Archive 摘要扩展报告 merge 状态

archive skill 的输出 SHALL 区分 CLI 归档结果与归档后的 git 处理状态，而不是报告 CLI 已执行的 archive commit、merge 或 branch cleanup。

#### Scenario: 摘要报告字段

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL 包含以下字段：
  - change name
  - schema
  - archive location
  - verify gate result
  - specs / OPSX sync result
  - next git responsibility（agent 继续处理）

#### Scenario: 不报告 CLI merge 结果

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL NOT 声称 CLI 创建了 archive commit
- **AND** SHALL NOT 声称 CLI 执行了 merge
- **AND** SHALL NOT 声称 CLI 删除了 feature branch

### Requirement: Archive 通过 prompt projection 消费 git 配置

archive skill 在归档后的 git 流程中 SHALL 通过统一 prompt/runtime projection 消费 `git` 配置节点，而非直接读取 raw YAML 键。

#### Scenario: 配置经投影后被 archive 消费

- **WHEN** archive 需要决定归档后 git 流程的 commit message 模板与 merge 策略
- **THEN** archive SHALL 从 prompt/runtime projection 读取 `git.commitMessage.archive`、`git.commitMessage.merge`、`git.merge.strategy`、`git.branch.deleteAfterArchive`
- **AND** SHALL NOT 在模板正文里直接 `yaml.parse(config.yaml)`
- **AND** projection 缺失字段时 SHALL 使用默认行为（内置模板路由 / `no-ff` / `false`）

#### Scenario: 陈旧 projection 字段不再出现

- **WHEN** archive surface 请求 prompt/runtime projection
- **THEN** projection SHALL NOT 输出 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.commitMessage.convention`、`git.merge.messageFrom`

### Requirement: Archive skill 拆分 commit message convention references

`opsx-archive-skill` SHALL 将 archive commit 与 merge summary commit 的 message 格式说明作为 `openspec/references/` 下的受管 reference 文件提供，并要求 agent 在归档后的 git 流程中按 `git.commitMessage.*` 覆盖路由读取。

#### Scenario: archive 制品提交读取 archive reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 OpenSpec/docs 归档制品 commit 前读取 `git.commitMessage.archive` 指向的模板，未配置时读取 `openspec/references/openspec-archive-commit-message.md`
- **AND** `openspec/references/openspec-archive-commit-message.md` SHALL 说明归档制品 commit 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: merge 步骤读取 merge summary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 merge 或 squash commit message 前读取 `git.commitMessage.merge` 指向的模板，未配置时读取 `openspec/references/openspec-merge-summary-message.md`
- **AND** `openspec/references/openspec-merge-summary-message.md` SHALL 说明 merge summary 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: 主 skill 保留流程边界
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 保留 archive 流程、verify gate、sync、CLI archive、agent git 流程与 references 读取步骤
- **AND** 主 `SKILL.md` SHALL NOT 内联 commit message 格式的完整说明
