## ADDED Requirements

### Requirement: 加载 git 配置节点

`openspec/config.yaml` 的项目配置加载器 SHALL 解析顶层 `git` 节点，并支持 `merge.strategy`、`merge.messageFrom`、`branch.deleteAfterArchive` 三个字段。

#### Scenario: 完整 git 节点

- **WHEN** config 包含：
  ```yaml
  git:
    merge:
      strategy: no-ff
      messageFrom: artifacts
    branch:
      deleteAfterArchive: false
  ```
- **THEN** 加载器 SHALL 返回的 ProjectConfig 中包含完整 `git` 字段

#### Scenario: git 节点缺失时填默认值

- **WHEN** config 不含 `git` 节点
- **THEN** 加载器 SHALL 把 `git.merge.strategy` 默认为 `no-ff`
- **AND** SHALL 把 `git.merge.messageFrom` 默认为 `artifacts`
- **AND** SHALL 把 `git.branch.deleteAfterArchive` 默认为 `false`
- **AND** SHALL NOT 输出警告

#### Scenario: 部分字段缺失时混合默认值

- **WHEN** config 仅含 `git: { merge: { strategy: ff-only } }`
- **THEN** 加载器 SHALL 保留 `merge.strategy: ff-only`
- **AND** SHALL 把 `merge.messageFrom` 默认为 `artifacts`
- **AND** SHALL 把 `branch.deleteAfterArchive` 默认为 `false`

### Requirement: git 配置字段 Zod schema 校验

加载器 SHALL 通过 Zod schema 校验 `git` 节点字段类型与枚举值，并对非法值输出 warning 后丢弃该字段、回退默认值。

#### Scenario: merge.strategy 合法值

- **WHEN** `git.merge.strategy` 为 `no-ff`、`ff-only` 或 `squash`
- **THEN** schema SHALL 接受该值

#### Scenario: merge.strategy 非法值

- **WHEN** `git.merge.strategy` 为 `rebase`（不在枚举中）
- **THEN** 加载器 SHALL 输出警告 "git.merge.strategy must be one of: no-ff, ff-only, squash"
- **AND** SHALL 把 `merge.strategy` 回退为默认 `no-ff`
- **AND** SHALL 保留 config 中其他合法字段

#### Scenario: messageFrom 合法值

- **WHEN** `git.merge.messageFrom` 为 `artifacts` 或 `manual`
- **THEN** schema SHALL 接受该值

#### Scenario: messageFrom 非法值

- **WHEN** `git.merge.messageFrom` 为 `auto`（不在枚举中）
- **THEN** 加载器 SHALL 输出警告
- **AND** SHALL 回退为默认 `artifacts`

#### Scenario: deleteAfterArchive 类型校验

- **WHEN** `git.branch.deleteAfterArchive` 为 `"true"` 字符串而非布尔
- **THEN** 加载器 SHALL 输出警告 "git.branch.deleteAfterArchive must be boolean"
- **AND** SHALL 回退为默认 `false`

### Requirement: git 配置暴露给 projection 消费者

加载器 SHALL 把 `git` 节点（含填充后的默认值）作为 normalized projection 输入暴露给 prompt projection 与 runtime projection 消费者。

#### Scenario: projection 输入包含 git 节点

- **WHEN** 项目配置加载完成
- **THEN** projection 输入 SHALL 包含完整的 `git.merge.strategy`、`git.merge.messageFrom`、`git.branch.deleteAfterArchive` 三个字段
- **AND** 字段值 SHALL 与 schema 校验后的值一致

#### Scenario: archive prompt projection 投出 git 段

- **WHEN** archive surface 请求 prompt projection
- **THEN** projection SHALL 把 `git` 段渲染为 archive skill 可消费的指令片段
- **AND** SHALL 保留枚举值与字段名的 canonical 形式

### Requirement: 跨平台路径与默认值

加载器 SHALL 在 Windows、macOS、Linux 上对 `git` 配置节点行为一致，且 `branch.deleteAfterArchive` 不依赖任何平台特定 git 行为。

#### Scenario: Windows 上读取 git 节点

- **WHEN** 在 Windows 上加载 `openspec\config.yaml`
- **THEN** 加载器 SHALL 通过 `path.join()` 构建路径
- **AND** SHALL 与 Unix 系统返回相同结构的 `git` 配置对象
