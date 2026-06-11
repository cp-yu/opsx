# config-loading Delta

## MODIFIED Requirements

### Requirement: 加载 git 配置节点

`openspec/config.yaml` 的项目配置加载器 SHALL 解析顶层 `git` 节点，并支持 `commitMessage.boundary`、`commitMessage.archive`、`commitMessage.merge`、`merge.strategy`、`branch.deleteAfterArchive` 字段。`commitMessage.*` 三个字段 SHALL 为可选的项目根相对 POSIX 路径，指向用户自有 commit message 模板，无默认值。

#### Scenario: 完整 git 节点

- **WHEN** config 包含：
  ```yaml
  git:
    commitMessage:
      archive: openspec/references/my-archive.md
      merge: openspec/references/my-merge.md
    merge:
      strategy: no-ff
    branch:
      deleteAfterArchive: false
  ```
- **THEN** 加载器 SHALL 返回的 ProjectConfig 中包含完整 `git` 字段
- **AND** `commitMessage.archive` 与 `commitMessage.merge` SHALL 保留配置的路径值

#### Scenario: git 节点缺失时填默认值

- **WHEN** config 不含 `git` 节点
- **THEN** 加载器 SHALL 把 `git.merge.strategy` 默认为 `no-ff`
- **AND** SHALL 把 `git.branch.deleteAfterArchive` 默认为 `false`
- **AND** `git.commitMessage` 下 SHALL NOT 出现任何默认路径值
- **AND** SHALL NOT 输出警告

#### Scenario: 部分字段缺失时混合默认值

- **WHEN** config 仅含 `git: { merge: { strategy: ff-only } }`
- **THEN** 加载器 SHALL 保留 `merge.strategy: ff-only`
- **AND** SHALL 把 `branch.deleteAfterArchive` 默认为 `false`
- **AND** `commitMessage` 下 SHALL NOT 出现任何默认路径值

#### Scenario: 陈旧 messageFrom 字段被忽略

- **WHEN** config 包含 `git.merge.messageFrom`
- **THEN** 加载器 SHALL NOT 将 `messageFrom` 暴露到 ProjectConfig

### Requirement: git 配置字段 Zod schema 校验

加载器 SHALL 通过 Zod schema 校验 `git` 节点字段类型与取值，并对非法值输出 warning 后丢弃该字段、回退默认行为。对已删除的 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.commitMessage.convention` 残留字段，加载器 SHALL 输出废弃 warning 且不将其暴露到 ProjectConfig。

#### Scenario: 残留 autoCommit 字段输出废弃 warning

- **WHEN** config 包含 `git.autoCommit: manual`
- **THEN** 加载器 SHALL 输出 warning 指明 `git.autoCommit` 已废弃、归档后 git handoff 恒为 agent 自动继续
- **AND** SHALL NOT 将 `autoCommit` 暴露到 ProjectConfig
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: 残留 convention 字段输出废弃 warning

- **WHEN** config 包含 `git.archive.commitMessage.convention` 或 `git.merge.commitMessage.convention`
- **THEN** 加载器 SHALL 输出 warning 指明 convention 字段已废弃、模板由 `openspec/references/` 与 `git.commitMessage.*` 路径覆盖决定
- **AND** SHALL NOT 将 convention 字段暴露到 ProjectConfig

#### Scenario: commitMessage 路径合法值

- **WHEN** `git.commitMessage.boundary`、`git.commitMessage.archive` 或 `git.commitMessage.merge` 为项目根相对 POSIX 路径字符串
- **THEN** schema SHALL 接受该值

#### Scenario: commitMessage 路径非法值

- **WHEN** `git.commitMessage.archive` 为绝对路径、包含 `..` 上溯、使用反斜杠分隔、或非字符串类型
- **THEN** 加载器 SHALL 输出 warning 指明该路径非法
- **AND** SHALL 丢弃该字段
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: merge.strategy 合法值

- **WHEN** `git.merge.strategy` 为 `no-ff`、`ff-only` 或 `squash`
- **THEN** schema SHALL 接受该值

#### Scenario: merge.strategy 非法值

- **WHEN** `git.merge.strategy` 为 `rebase`（不在枚举中）
- **THEN** 加载器 SHALL 输出 warning "git.merge.strategy must be one of: no-ff, ff-only, squash"
- **AND** SHALL 把 `merge.strategy` 回退为默认 `no-ff`
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: deleteAfterArchive 类型校验

- **WHEN** `git.branch.deleteAfterArchive` 为 `"true"` 字符串而非布尔
- **THEN** 加载器 SHALL 输出 warning "git.branch.deleteAfterArchive must be boolean"
- **AND** SHALL 回退为默认 `false`

### Requirement: git 配置暴露给 projection 消费者

加载器 SHALL 把 `git` 节点（含填充后的默认值）作为 normalized projection 输入暴露给 prompt projection 与 runtime projection 消费者。archive skill/agent SHALL 把 `commitMessage.*` 路径用于 commit message 模板路由，把 `merge.strategy` 与 `branch.deleteAfterArchive` 用于归档后的 git 工作流。

#### Scenario: projection 输入包含 git 节点

- **WHEN** 项目配置加载完成
- **THEN** projection 输入 SHALL 包含 `git.commitMessage.boundary`、`git.commitMessage.archive`、`git.commitMessage.merge`（未配置的键值为空）、`git.merge.strategy`、`git.branch.deleteAfterArchive`
- **AND** projection 输入 SHALL NOT 包含 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.commitMessage.convention`、`git.merge.messageFrom`
- **AND** 字段值 SHALL 与 schema 校验后的值一致

#### Scenario: archive prompt projection 投出 git 段

- **WHEN** archive surface 请求 prompt projection
- **THEN** projection SHALL 把 `git` 段渲染为 archive skill 可消费的指令片段
- **AND** SHALL 保留字段名与路径值的 canonical 形式
- **AND** SHALL 表达 `commitMessage.*` 已配置时读用户模板、未配置时读 `openspec/references/` 内置模板的路由语义

### Requirement: Materialize functional project config defaults

The project config layer SHALL expose a shared default materialization contract for disk writes so `openspec init` and `openspec update` use the same functional defaults for project configuration.

#### Scenario: Default materialization includes optimization, apply, and git

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL include `optimization.enabled: true`
- **AND** SHALL include `optimization.optRetries: 2`
- **AND** SHALL include `apply.defaultIsolation: ask`
- **AND** SHALL include `git.merge.strategy: no-ff`
- **AND** SHALL include `git.branch.deleteAfterArchive: false`
- **AND** SHALL NOT include `git.autoCommit`
- **AND** SHALL NOT include `git.archive.commitMessage.convention`
- **AND** SHALL NOT include `git.merge.commitMessage.convention`
- **AND** SHALL NOT include `git.commitMessage` 路径默认值
- **AND** SHALL NOT include `git.merge.messageFrom`

#### Scenario: Default materialization excludes non-functional optional fields

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL NOT add `docLanguage`, `context`, or `rules` without explicit user input
- **AND** SHALL NOT add `propose` policy nodes until they are confirmed as runtime-consumed project defaults

#### Scenario: Missing-only merge preserves user values

- **WHEN** materialized defaults are merged into an existing YAML config document
- **THEN** the merge SHALL add only missing mapping keys
- **AND** SHALL NOT replace existing scalar values
- **AND** SHALL NOT replace existing nested mapping values
- **AND** SHALL preserve unknown top-level and nested user fields

#### Scenario: Cross-platform config path handling

- **WHEN** default materialization reads or writes project config files
- **THEN** it SHALL build paths with Node.js path utilities
- **AND** SHALL preserve the `.yaml` preference and `.yml` fallback behavior consistently across Windows, macOS, and Linux
