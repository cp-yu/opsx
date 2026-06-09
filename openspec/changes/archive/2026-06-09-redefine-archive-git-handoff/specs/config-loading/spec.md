## MODIFIED Requirements

### Requirement: 加载 git 配置节点

`openspec/config.yaml` 的项目配置加载器 SHALL 解析顶层 `git` 节点，并支持 `autoCommit`、`archive.commitMessage.convention`、`merge.strategy`、`merge.commitMessage.convention`、`branch.deleteAfterArchive` 五个字段。`git.autoCommit` SHALL 表示归档后的 git 工作由 agent 自动继续或由用户手动处理，而不是 archive CLI 自动提交授权。

#### Scenario: 完整 git 节点

- **WHEN** config 包含：
  ```yaml
  git:
    autoCommit: auto
    archive:
      commitMessage:
        convention: openspec-archive
    merge:
      strategy: no-ff
      commitMessage:
        convention: openspec-merge-summary
    branch:
      deleteAfterArchive: false
  ```
- **THEN** 加载器 SHALL 返回的 ProjectConfig 中包含完整 `git` 字段
- **AND** `auto` SHALL 表示 agent 在 archive CLI 完成后自动继续 git 工作

#### Scenario: git 节点缺失时填默认值

- **WHEN** config 不含 `git` 节点
- **THEN** 加载器 SHALL 把 `git.autoCommit` 默认为 `auto`
- **AND** SHALL 把 `git.archive.commitMessage.convention` 默认为 `openspec-archive`
- **AND** SHALL 把 `git.merge.strategy` 默认为 `no-ff`
- **AND** SHALL 把 `git.merge.commitMessage.convention` 默认为 `openspec-merge-summary`
- **AND** SHALL 把 `git.branch.deleteAfterArchive` 默认为 `false`
- **AND** SHALL NOT 输出警告

#### Scenario: 部分字段缺失时混合默认值

- **WHEN** config 仅含 `git: { merge: { strategy: ff-only } }`
- **THEN** 加载器 SHALL 保留 `merge.strategy: ff-only`
- **AND** SHALL 把 `git.autoCommit` 默认为 `auto`
- **AND** SHALL 把 `archive.commitMessage.convention` 默认为 `openspec-archive`
- **AND** SHALL 把 `merge.commitMessage.convention` 默认为 `openspec-merge-summary`
- **AND** SHALL 把 `branch.deleteAfterArchive` 默认为 `false`

#### Scenario: 陈旧 messageFrom 字段被忽略

- **WHEN** config 包含 `git.merge.messageFrom`
- **THEN** 加载器 SHALL NOT 将 `messageFrom` 暴露到 ProjectConfig
- **AND** SHALL 使用 `git.merge.commitMessage.convention` 的有效值或默认值

### Requirement: git 配置字段 Zod schema 校验

加载器 SHALL 通过 Zod schema 校验 `git` 节点字段类型与枚举值，并对非法值输出 warning 后丢弃该字段、回退默认值。

#### Scenario: autoCommit 合法值

- **WHEN** `git.autoCommit` 为 `auto` 或 `manual`
- **THEN** schema SHALL 接受该值
- **AND** `auto` SHALL 表示 agent 自动完成归档后的 git 工作
- **AND** `manual` SHALL 表示用户手动完成归档后的 git 工作

#### Scenario: autoCommit 非法值

- **WHEN** `git.autoCommit` 为 `archive-only`（不在枚举中）
- **THEN** 加载器 SHALL 输出 warning "git.autoCommit must be one of: auto, manual"
- **AND** SHALL 把 `git.autoCommit` 回退为默认 `auto`
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: archive commit convention 合法值

- **WHEN** `git.archive.commitMessage.convention` 为 `openspec-archive`
- **THEN** schema SHALL 接受该值

#### Scenario: merge.strategy 合法值

- **WHEN** `git.merge.strategy` 为 `no-ff`、`ff-only` 或 `squash`
- **THEN** schema SHALL 接受该值

#### Scenario: merge.strategy 非法值

- **WHEN** `git.merge.strategy` 为 `rebase`（不在枚举中）
- **THEN** 加载器 SHALL 输出 warning "git.merge.strategy must be one of: no-ff, ff-only, squash"
- **AND** SHALL 把 `merge.strategy` 回退为默认 `no-ff`
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: merge commit convention 合法值

- **WHEN** `git.merge.commitMessage.convention` 为 `openspec-merge-summary`
- **THEN** schema SHALL 接受该值

#### Scenario: deleteAfterArchive 类型校验

- **WHEN** `git.branch.deleteAfterArchive` 为 `"true"` 字符串而非布尔
- **THEN** 加载器 SHALL 输出 warning "git.branch.deleteAfterArchive must be boolean"
- **AND** SHALL 回退为默认 `false`

### Requirement: git 配置暴露给 projection 消费者

加载器 SHALL 把 `git` 节点（含填充后的默认值）作为 normalized projection 输入暴露给 prompt projection 与 runtime projection 消费者。archive CLI SHALL 只把这些字段用于 handoff 提醒；archive skill/agent SHALL 把这些字段用于归档后的 agent/user 工作流选择。

#### Scenario: projection 输入包含 git 节点

- **WHEN** 项目配置加载完成
- **THEN** projection 输入 SHALL 包含完整的 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.strategy`、`git.merge.commitMessage.convention`、`git.branch.deleteAfterArchive` 五个字段
- **AND** projection 输入 SHALL NOT 包含 `git.merge.messageFrom`
- **AND** 字段值 SHALL 与 schema 校验后的值一致

#### Scenario: archive prompt projection 投出 git 段

- **WHEN** archive surface 请求 prompt projection
- **THEN** projection SHALL 把 `git` 段渲染为 archive skill 可消费的指令片段
- **AND** SHALL 保留枚举值与字段名的 canonical 形式
- **AND** SHALL 表达 `git.autoCommit` 的 agent/user handoff 语义
