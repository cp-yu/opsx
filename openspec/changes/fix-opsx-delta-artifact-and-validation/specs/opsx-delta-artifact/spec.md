## ADDED Requirements

### Requirement: opsx-delta 为正式 schema artifact

`opsx-delta` SHALL 作为正式 artifact 注册在 `schemas/spec-driven/schema.yaml` 中，包含 `id`、`generates`、`template`、`instruction` 和 `requires` 字段。

#### Scenario: artifact 注册后 instructions 可用

- **WHEN** 执行 `openspec instructions opsx-delta --change "<name>" --json`
- **THEN** 返回的 JSON SHALL 包含 `template`（YAML 骨架结构）、`instruction`（格式指引）和 `outputPath`（`<change-dir>/opsx-delta.yaml`）
- **AND** `dependencies` SHALL 包含 `specs` 的状态信息

#### Scenario: artifact 不在 apply 关键路径上

- **GIVEN** `schemas/spec-driven/schema.yaml` 的 `apply.requires` 为 `[tasks]`
- **WHEN** 现有 change 缺少 `opsx-delta.yaml` 文件
- **THEN** `detectCompleted` SHALL NOT 标记 `opsx-delta` 为完成
- **AND** `formatChangeStatus` 中 `applyRequires` 仍满足（仅需 `tasks` 完成）
- **AND** apply SHALL NOT 被阻塞

#### Scenario: artifact 依赖 specs

- **WHEN** `specs` 未完成
- **THEN** `opsx-delta` artifact status SHALL 为 `blocked`
- **AND** `missingDeps` SHALL 包含 `specs`

### Requirement: opsx-delta 模板文件提供 YAML 骨架

`schemas/spec-driven/templates/opsx-delta.yaml` SHALL 包含一个最小但语法正确的 YAML 骨架，展示 `ADDED`/`MODIFIED`/`REMOVED` 作为顶层 object key。

#### Scenario: 模板被加载且可解析

- **WHEN** `loadTemplate('spec-driven', 'opsx-delta.yaml')` 被调用
- **THEN** 返回内容 SHALL 是合法的 YAML
- **AND** YAML 解析后 SHALL 为 object（非 array）
- **AND** SHALL 包含 `ADDED`、`MODIFIED`、`REMOVED` 三个顶层 key

#### Scenario: 模板结构正确引导 LLM

- **WHEN** LLM 从 `openspec instructions opsx-delta` 获取 template
- **THEN** template SHALL 展示 `ADDED.capabilities`、`ADDED.relations` 等为 YAML 数组
- **AND** SHALL 展示 `MODIFIED.capabilities` 为数组
- **AND** SHALL 展示 `REMOVED.capabilities` 为数组
- **AND** SHALL NOT 包含 Markdown 风格的 `## ADDED` 标题