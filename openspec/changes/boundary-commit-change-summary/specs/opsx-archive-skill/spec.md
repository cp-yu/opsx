# opsx-archive-skill Delta

## MODIFIED Requirements

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 调用 archive CLI 完成 verify、sync 与 move-to-archive；CLI 返回后，agent SHALL 无条件继续归档后的 git 流程：先提交残余实现 diff（如有），再无条件创建 semantic boundary commit，然后提交 OpenSpec/docs 归档制品。CLI 本身 SHALL NOT 执行 archive commit、merge 或 cleanup。

#### Scenario: agent 继续 git 流程

- **WHEN** archive CLI 完成 sync 与 mv
- **THEN** archive skill SHALL 由 agent 继续处理 git 提交流程
- **AND** agent SHALL 按顺序处理：残余实现 diff 提交（如有）、semantic boundary commit、OpenSpec/docs 归档制品提交
- **AND** agent SHALL 在生成归档制品 commit message 前读取 `git.commitMessage.archive` 指向的用户模板，未配置时读取 `openspec/references/openspec-archive-commit-message.md`

#### Scenario: 存在未提交实现变更

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 工作区仍存在未提交的真实项目实现变更
- **THEN** agent SHALL 先创建普通 implementation commit
- **AND** 该 commit SHALL 只承载尚未提交的真实项目实现变更
- **AND** agent SHALL 在该 commit 之后继续创建 semantic boundary commit

#### Scenario: 无条件创建 semantic boundary commit

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 残余实现 diff 已提交或不存在
- **THEN** agent SHALL 创建 `--allow-empty` 的 semantic boundary commit
- **AND** boundary commit SHALL 发生在 OpenSpec/docs 归档制品提交之前
- **AND** boundary commit 的 subject SHALL 使用 `feat`、`fix`、`refactor` 等真实语义类型，而非 `meta`
- **AND** message SHALL 通过 `git commit -F -` 传入

#### Scenario: boundary commit message 承载完整 change 总结

- **WHEN** agent 生成 semantic boundary commit message
- **THEN** message body SHALL 包含 `## Why` 章节，内容来自归档 `proposal.md` 的业务背景与 `design.md`（存在时）的技术决策
- **AND** SHALL 包含 `## Changes` 章节，按 `git diff --name-only <base>..<head>` 的文件清单逐文件描述改动原因
- **AND** diff 清单中存在但归档制品未提及的文件 SHALL 如实列出
- **AND** SHALL 以 `Implementation: <base>..<head> (carried by <commits>)` footer 记录 effective diff 范围与承载该 diff 的 commits（含 `wip: opt-*` checkpoint commits 与刚创建的普通 implementation commit）

#### Scenario: boundary commit 模板路由

- **WHEN** agent 生成 semantic boundary commit message
- **THEN** agent SHALL 在生成前读取 `git.commitMessage.boundary` 指向的用户模板，未配置时读取 `openspec/references/openspec-boundary-commit-message.md`
- **AND** 主 `SKILL.md` SHALL NOT 内联 boundary commit body 的格式规则

#### Scenario: 非 git 仓库时只报告归档结果

- **WHEN** 项目根目录不是 git 仓库
- **THEN** archive skill SHALL 报告 archive CLI 已完成的归档结果
- **AND** SHALL NOT 尝试执行 git 提交、合并或分支清理

#### Scenario: agent 处理 merge message

- **WHEN** agent 后续 git 流程需要创建 merge 或 squash commit message
- **THEN** agent SHALL 在生成 message 前读取 `git.commitMessage.merge` 指向的用户模板，未配置时读取 `openspec/references/openspec-merge-summary-message.md`
- **AND** SHALL NOT 使用 archive CLI 输出的推荐 message

### Requirement: Archive skill 拆分 commit message convention references

`opsx-archive-skill` SHALL 将 boundary commit、archive commit 与 merge summary commit 的 message 格式说明作为 `openspec/references/` 下的受管 reference 文件提供，并要求 agent 在归档后的 git 流程中按 `git.commitMessage.*` 覆盖路由读取。

#### Scenario: boundary 提交读取 boundary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 semantic boundary commit 前读取 `git.commitMessage.boundary` 指向的模板，未配置时读取 `openspec/references/openspec-boundary-commit-message.md`
- **AND** `openspec/references/openspec-boundary-commit-message.md` SHALL 说明 boundary commit 的 subject、`## Why`、`## Changes` 与 `Implementation:` footer 格式及其信息来源

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
