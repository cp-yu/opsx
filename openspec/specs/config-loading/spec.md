# config-loading Specification

## Purpose
Define how `openspec/config.yaml` is discovered, parsed, validated, and exposed to callers with safe fallbacks.
## Requirements
### Requirement: Load project config from openspec/config.yaml

系统 SHALL 读取并解析位于 `openspec/config.yaml` 的项目配置文件，包括 `proseLanguage` 和 `docLanguage` 字段，其中 `proseLanguage` 优先。

#### Scenario: Valid config file exists

- **WHEN** `openspec/config.yaml` 存在且包含有效 YAML 内容
- **THEN** 系统解析文件并返回 ProjectConfig 对象

#### Scenario: Config file does not exist

- **WHEN** `openspec/config.yaml` 不存在
- **THEN** 系统返回 null，不报错

#### Scenario: Config file has invalid YAML syntax

- **WHEN** `openspec/config.yaml` 包含格式错误的 YAML
- **THEN** 系统记录警告信息并返回 null

#### Scenario: Config file has valid YAML but invalid schema

- **WHEN** `openspec/config.yaml` 包含有效 YAML 但 Zod schema 验证失败
- **THEN** 系统记录带验证详情的警告信息并返回 null

#### Scenario: proseLanguage field is valid

- **WHEN** config 包含 `proseLanguage: "中文"`
- **THEN** proseLanguage 字段包含在返回的配置中

#### Scenario: docLanguage field is valid (legacy)

- **WHEN** config 包含 `docLanguage: "zh-CN"` 且不包含 `proseLanguage`
- **THEN** 系统将 `docLanguage` 值迁移到 `proseLanguage` 字段

#### Scenario: Both proseLanguage and docLanguage are present

- **WHEN** config 同时包含 `proseLanguage: "中文"` 和 `docLanguage: "zh-CN"`
- **THEN** `proseLanguage` 优先，`docLanguage` 被忽略

#### Scenario: proseLanguage field is missing

- **WHEN** config 不包含 `proseLanguage` 和 `docLanguage`
- **THEN** 返回的配置中不包含 proseLanguage 覆盖

#### Scenario: proseLanguage field is invalid type

- **WHEN** config 包含 `proseLanguage: 123`（数字而非字符串）
- **THEN** 记录警告，proseLanguage 字段不包含在返回的配置中

#### Scenario: docLanguage field is missing

- **WHEN** config 缺少 `docLanguage` 字段
- **THEN** 不记录警告，返回的配置中不包含文档语言覆盖

### Requirement: Support .yml file extension alias

The system SHALL accept both `.yaml` and `.yml` file extensions for the config file.

#### Scenario: Config file uses .yml extension
- **WHEN** `openspec/config.yml` exists and `openspec/config.yaml` does not exist
- **THEN** system reads from `openspec/config.yml`

#### Scenario: Both .yaml and .yml exist
- **WHEN** both `openspec/config.yaml` and `openspec/config.yml` exist
- **THEN** system prefers `openspec/config.yaml`

### Requirement: Use resilient field-by-field parsing

The system SHALL parse each config field independently, collecting valid fields and warning about invalid ones without rejecting the entire config.

#### Scenario: Schema field is valid
- **WHEN** config contains `schema: "spec-driven"`
- **THEN** schema field is included in returned config

#### Scenario: Schema field is missing
- **WHEN** config lacks the `schema` field
- **THEN** no warning is logged (field is optional at parse level)

#### Scenario: Schema field is empty string
- **WHEN** config contains `schema: ""`
- **THEN** warning is logged and schema field is not included in returned config

#### Scenario: Schema field is invalid type
- **WHEN** config contains `schema: 123` (number instead of string)
- **THEN** warning is logged and schema field is not included in returned config

#### Scenario: Context field is valid
- **WHEN** config contains `context: "Tech stack: TypeScript"`
- **THEN** context field is included in returned config

#### Scenario: Context field is invalid type
- **WHEN** config contains `context: 123` (number instead of string)
- **THEN** warning is logged and context field is not included in returned config

#### Scenario: docLanguage field is valid
- **WHEN** config contains `docLanguage: "zh-CN"`
- **THEN** docLanguage field is included in returned config

#### Scenario: docLanguage field is missing
- **WHEN** config lacks the `docLanguage` field
- **THEN** no warning is logged and the returned config does not include a documentation language override

#### Scenario: docLanguage field is invalid type
- **WHEN** config contains `docLanguage: 123` (number instead of string)
- **THEN** warning is logged and docLanguage field is not included in returned config

#### Scenario: Rules field has valid structure
- **WHEN** config contains `rules: { proposal: ["Rule 1"], specs: ["Rule 2"] }`
- **THEN** rules field is included in returned config with valid rules

#### Scenario: Rules field has non-array value for artifact
- **WHEN** config contains `rules: { proposal: "not an array", specs: ["Valid"] }`
- **THEN** warning is logged for proposal, but specs rules are still included in returned config

#### Scenario: Rules array contains non-string elements
- **WHEN** config contains `rules: { proposal: ["Valid rule", 123, ""] }`
- **THEN** only "Valid rule" is included, warning logged about invalid elements

#### Scenario: Mix of valid and invalid fields
- **WHEN** config contains valid schema, invalid context type, valid rules
- **THEN** config is returned with schema and rules fields, warning logged about context

### Requirement: Enforce context size limit

The system SHALL reject context fields exceeding 50KB and log a warning.

#### Scenario: Context within size limit
- **WHEN** config contains context of 1KB
- **THEN** context is included in returned config

#### Scenario: Context at size limit
- **WHEN** config contains context of exactly 50KB
- **THEN** context is included in returned config

#### Scenario: Context exceeds size limit
- **WHEN** config contains context of 51KB
- **THEN** warning is logged with size and limit, context field is not included in returned config

### Requirement: Defer artifact ID validation to instruction loading

The system SHALL NOT validate artifact IDs in rules during config load time. Validation happens during instruction loading when schema is known.

#### Scenario: Config with rules is loaded
- **WHEN** config contains `rules: { unknownartifact: [...] }`
- **THEN** config is loaded successfully without validation errors

#### Scenario: Validation happens at instruction load time
- **WHEN** instructions are loaded for any artifact and config has unknown artifact IDs in rules
- **THEN** warnings are emitted about unknown artifact IDs (see rules-injection spec for details)

### Requirement: Gracefully handle config errors without halting

The system SHALL continue operation with default values when config loading or parsing fails.

#### Scenario: Config parse failure during command execution
- **WHEN** config file has syntax errors and user runs `openspec new change`
- **THEN** command executes using default schema "spec-driven"

#### Scenario: Warning is visible to user
- **WHEN** config loading fails
- **THEN** system outputs warning message to stderr with details about the failure

### Requirement: Project config SHALL expose normalized inputs for projection consumers
`openspec/config.yaml` 的已验证字段 SHALL 以稳定、可组合的形式暴露给配置投影层，使 prompt projection 与 runtime projection 共享同一份 source-of-truth 输入，而不是各自重新读取和解释原始 YAML。

#### Scenario: Valid fields become projection inputs
- **WHEN** project config contains valid `docLanguage`, `context`, or `rules`
- **THEN** config loading SHALL expose those fields as normalized projection inputs
- **AND** downstream prompt/runtime projection consumers SHALL observe the same validated values

#### Scenario: Invalid fields do not leak into projection
- **WHEN** a config field fails validation
- **THEN** config loading SHALL exclude that field from projection inputs
- **AND** projection consumers SHALL continue with remaining valid fields and default behavior

### Requirement: 加载 git 配置节点

`openspec/config.yaml` 的项目配置加载器 SHALL 解析顶层 `git` 节点，并支持 `autoCommit`、`archive.commitMessage.convention`、`merge.strategy`、`merge.commitMessage.convention`、`branch.deleteAfterArchive` 五个字段。

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

加载器 SHALL 把 `git` 节点（含填充后的默认值）作为 normalized projection 输入暴露给 prompt projection 与 runtime projection 消费者。

#### Scenario: projection 输入包含 git 节点

- **WHEN** 项目配置加载完成
- **THEN** projection 输入 SHALL 包含完整的 `git.autoCommit`、`git.archive.commitMessage.convention`、`git.merge.strategy`、`git.merge.commitMessage.convention`、`git.branch.deleteAfterArchive` 五个字段
- **AND** projection 输入 SHALL NOT 包含 `git.merge.messageFrom`
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

### Requirement: Materialize functional project config defaults

The project config layer SHALL expose a shared default materialization contract for disk writes so `openspec init` and `openspec update` use the same functional defaults for project configuration.

#### Scenario: Default materialization includes optimization, apply, and git

- **WHEN** project config defaults are materialized for disk output
- **THEN** the materialized defaults SHALL include `optimization.enabled: true`
- **AND** SHALL include `optimization.optRetries: 2`
- **AND** SHALL include `apply.defaultIsolation: ask`
- **AND** SHALL include `git.autoCommit: auto`
- **AND** SHALL include `git.archive.commitMessage.convention: openspec-archive`
- **AND** SHALL include `git.merge.strategy: no-ff`
- **AND** SHALL include `git.merge.commitMessage.convention: openspec-merge-summary`
- **AND** SHALL include `git.branch.deleteAfterArchive: false`
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

