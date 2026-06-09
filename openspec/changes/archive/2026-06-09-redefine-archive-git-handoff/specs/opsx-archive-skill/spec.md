## MODIFIED Requirements

### Requirement: Archive 在 sync 完成后追加 archive commit、merge、cleanup 三步

`opsx-archive-skill` SHALL 调用 archive CLI 完成 verify、sync 与 move-to-archive；CLI 返回后，skill SHALL 根据 `git.autoCommit` 决定 agent 是否继续归档后的 git 流程。CLI 本身 SHALL NOT 执行 archive commit、merge 或 cleanup。

#### Scenario: auto 模式由 agent 继续 git 流程

- **WHEN** archive CLI 完成 sync 与 mv
- **AND** 配置 `git.autoCommit` 为 `auto`
- **THEN** archive skill SHALL 由 agent 继续处理 git 提交流程
- **AND** agent SHALL 先提交真实项目变更
- **AND** agent SHALL 再提交 OpenSpec/docs 归档制品
- **AND** agent SHALL 在生成归档制品 commit message 前读取 `references/archive-commit-message.md`

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

### Requirement: Archive 摘要扩展报告 merge 状态

archive skill 的输出 SHALL 区分 CLI 归档结果与归档后的 git handoff 状态，而不是报告 CLI 已执行的 archive commit、merge 或 branch cleanup。

#### Scenario: 摘要报告字段

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL 包含以下字段：
  - change name
  - schema
  - archive location
  - verify gate result
  - specs / OPSX sync result
  - git handoff mode（agent auto / user manual）
  - next git responsibility

#### Scenario: 不报告 CLI merge 结果

- **WHEN** archive CLI 完成归档
- **THEN** 摘要 SHALL NOT 声称 CLI 创建了 archive commit
- **AND** SHALL NOT 声称 CLI 执行了 merge
- **AND** SHALL NOT 声称 CLI 删除了 feature branch

### Requirement: Archive 通过 prompt projection 消费 git 配置

archive skill 在决定归档后的 agent/user handoff 时 SHALL 通过统一 prompt/runtime projection 消费 `git` 配置节点，而非直接读取 raw YAML 键。

#### Scenario: 配置经投影后被 archive 消费

- **WHEN** archive 需要决定归档后 git 工作由 agent 还是用户处理
- **THEN** archive SHALL 从 prompt/runtime projection 读取 `git.autoCommit`
- **AND** SHALL 从 projection 读取 `git.archive.commitMessage.convention` 与 `git.merge.commitMessage.convention` 作为 agent 后续读取 references 的上下文
- **AND** SHALL NOT 在模板正文里直接 `yaml.parse(config.yaml)`
- **AND** projection 缺失字段时 SHALL 使用默认值（`auto` / `openspec-archive` / `no-ff` / `openspec-merge-summary` / `false`）

#### Scenario: 陈旧 projection 字段不再出现

- **WHEN** archive surface 请求 prompt/runtime projection
- **THEN** projection SHALL NOT 输出 `git.merge.messageFrom`

### Requirement: Archive skill 拆分 commit message convention references

`opsx-archive-skill` SHALL 将 archive commit 与 merge summary commit 的 message convention 格式说明作为 skill reference 文件提供，并要求 agent 在归档后的 git 流程中读取。

#### Scenario: archive 制品提交读取 archive reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 OpenSpec/docs 归档制品 commit 前读取 `references/archive-commit-message.md`
- **AND** `references/archive-commit-message.md` SHALL 说明 `convention: openspec-archive` 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: merge 步骤读取 merge summary reference
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 要求 agent 在创建 merge 或 squash commit message 前读取 `references/merge-summary-message.md`
- **AND** `references/merge-summary-message.md` SHALL 说明 `convention: openspec-merge-summary` 的 subject、`## Why` 与 `## Changes` 格式

#### Scenario: 主 skill 保留流程边界
- **WHEN** 生成 `openspec-archive-change` skill
- **THEN** 主 `SKILL.md` SHALL 保留 archive 流程、verify gate、sync、CLI archive、agent/user handoff 与 references 读取步骤
- **AND** 主 `SKILL.md` SHALL NOT 内联两个 commit message convention 的完整格式说明
