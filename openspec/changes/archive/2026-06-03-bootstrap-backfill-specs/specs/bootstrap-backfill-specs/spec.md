## ADDED Requirements

### Requirement: 命名匹配算法

Backfill Engine SHALL 提供 `matchSpecToCaps(specId: string, capIds: string[])` 函数，将 spec 目录名各段（按 `-` 分割）与 OPSX cap ID 各段（按 `.` 分割，去掉 `cap.` 前缀）对齐，返回匹配的 cap ID 列表。

#### Scenario: 精确匹配

- **WHEN** spec 名为 `cli-archive`，cap 列表包含 `cap.cli.archive`
- **THEN** SHALL 返回 `["cap.cli.archive"]`

#### Scenario: 模糊匹配（子序列）

- **WHEN** spec 名为 `change-creation`，cap 列表包含 `cap.change.create` 和 `cap.change-workflow.create`
- **THEN** SHALL 返回包含语义对齐的 cap ID（如 `cap.change.create`）

#### Scenario: 无匹配

- **WHEN** spec 名为 `explore-brainstorming`，cap 列表中无任何段对齐的 cap
- **THEN** SHALL 返回空数组

#### Scenario: 一个 spec 匹配多个 cap

- **WHEN** spec 名各段同时与多个 cap ID 段对齐
- **THEN** SHALL 返回所有匹配的 cap ID

### Requirement: Frontmatter 写入

Backfill Engine SHALL 提供 `writeSpecFrontmatter(specPath: string, capabilities: string[])` 函数，在 spec.md 文件头部插入 YAML frontmatter。

#### Scenario: 无 frontmatter 的 spec 写入

- **WHEN** spec.md 不包含 YAML frontmatter
- **THEN** SHALL 在文件头部插入 `---\ncapabilities:\n  - cap.x.y\n---\n`
- **AND** 文件原有 markdown 内容 SHALL 不变

#### Scenario: 已有 frontmatter 的 spec 跳过

- **WHEN** spec.md 已包含 YAML frontmatter（以 `---` 开头）
- **THEN** SHALL 跳过写入
- **AND** SHALL NOT 修改文件

#### Scenario: 跨平台路径处理

- **WHEN** 在 Windows 平台执行 frontmatter 写入
- **THEN** SHALL 使用 `path.join()` 构建文件路径

### Requirement: Backfill Engine 完整流程

系统 SHALL 提供 `backfillSpecs(projectRoot: string)` 函数，执行完整 backfill 流程并返回结构化结果。

#### Scenario: 正常 backfill 流程

- **WHEN** 项目有 OPSX 和多个无 frontmatter 的 specs
- **THEN** SHALL 读取 OPSX cap 列表
- **AND** SHALL 扫描所有 specs 的 frontmatter 状态
- **AND** SHALL 对无 frontmatter 的 specs 执行命名匹配
- **AND** SHALL 对匹配成功的 specs 写入 frontmatter
- **AND** SHALL 返回 `{ written: [{spec, caps}], unmatched: [specId] }`

#### Scenario: 无 OPSX 文件时

- **WHEN** `openspec/project.opsx.yaml` 不存在
- **THEN** SHALL 返回空 written 和所有 specs 为 unmatched
- **AND** SHALL NOT 抛出异常

### Requirement: CLI 子命令

系统 SHALL 注册 `openspec bootstrap backfill-specs` 子命令。

#### Scenario: 正常执行

- **WHEN** 执行 `openspec bootstrap backfill-specs`
- **THEN** SHALL 调用 Backfill Engine
- **AND** SHALL 输出已写入和未匹配的统计

#### Scenario: JSON 输出

- **WHEN** 执行 `openspec bootstrap backfill-specs --json`
- **THEN** SHALL 输出 `{ written: [...], unmatched: [...] }` JSON 结构
