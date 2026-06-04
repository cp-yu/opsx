---
capabilities:
  - cap.cli.list
---

# cli-list Specification

## Purpose

此规约记录变更 unify-cli-query-interface 对 `openspec list` 命令的扩展。

## ADDED Requirements

### Requirement: Extracting capabilities from frontmatter

系统 SHALL 在 specs 模式下解析 spec 文件的 YAML frontmatter 并提取 capabilities 关联信息。

#### Scenario: Extracting capabilities from frontmatter
- **WHEN** parsing a `spec.md` file in specs mode
- **THEN** 系统 SHALL 使用 `parseSpecFrontmatter()` 函数提取 YAML frontmatter
- **AND** 若 frontmatter 包含 `capabilities` 数组，SHALL 提取该数组
- **AND** 若 frontmatter 不存在或无 `capabilities` 字段，SHALL 返回空数组

### Requirement: JSON output format for specs

系统 SHALL 在 specs 模式下支持 `--json` 输出，返回包含 `capabilities` 字段的结构化数据。

#### Scenario: JSON output includes capabilities field
- **WHEN** 用户执行 `openspec list --specs --json`
- **THEN** 系统 SHALL 输出 JSON 数组
- **AND** 每个数组元素 SHALL 包含以下字段：
  - `id`: spec 的目录名（字符串）
  - `title`: spec 的标题（字符串）
  - `requirementCount`: requirements 数量（数字）
  - `capabilities`: 从 frontmatter 提取的 capabilities 数组（字符串数组）

#### Scenario: Capabilities field is empty array when frontmatter missing
- **WHEN** spec 文件无 YAML frontmatter 或 frontmatter 无 `capabilities` 字段
- **THEN** JSON 输出中该 spec 的 `capabilities` 字段 SHALL 为空数组 `[]`
- **AND** MUST NOT 返回 null 或 undefined

#### Scenario: JSON structure example
- **WHEN** 执行 `openspec list --specs --json`
- **THEN** 输出结构 SHALL 符合以下示例：
  ```json
  [
    {
      "id": "cli-list",
      "title": "List Command Specification",
      "requirementCount": 7,
      "capabilities": ["cap.cli.list"]
    },
    {
      "id": "cli-spec",
      "title": "Spec Command Specification",
      "requirementCount": 5,
      "capabilities": ["cap.cli.spec"]
    }
  ]
  ```
