# List Command Specification

## Purpose

The `openspec list` command SHALL provide developers with a quick overview of all active changes in the project, showing their names and task completion status.
## Requirements
### Requirement: Command Execution
The command SHALL scan and analyze either active changes or specs based on the selected mode.

#### Scenario: Scanning for changes (default)
- **WHEN** `openspec list` is executed without flags
- **THEN** scan the `openspec/changes/` directory for change directories
- **AND** exclude the `archive/` subdirectory from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs
- **WHEN** `openspec list --specs` is executed
- **THEN** scan the `openspec/specs/` directory for capabilities
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

### Requirement: Task Counting

The command SHALL accurately count task completion status using standard markdown checkbox patterns.

#### Scenario: Counting tasks in tasks.md

- **WHEN** parsing a `tasks.md` file
- **THEN** count tasks matching these patterns:
  - Completed: Lines containing `- [x]`
  - Incomplete: Lines containing `- [ ]`
- **AND** calculate total tasks as the sum of completed and incomplete

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes
- **THEN** show a table with columns:
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

### Requirement: Flags
The command SHALL accept flags to select the noun being listed.

#### Scenario: Selecting specs
- **WHEN** `--specs` is provided
- **THEN** list specs instead of changes

#### Scenario: Selecting changes
- **WHEN** `--changes` is provided
- **THEN** list changes explicitly (same as default behavior)

### Requirement: Empty State
The command SHALL provide clear feedback when no items are present for the selected mode.

#### Scenario: Handling empty state (changes)
- **WHEN** no active changes exist (only archive/ or empty changes/)
- **THEN** display: "No active changes found."

#### Scenario: Handling empty state (specs)
- **WHEN** no specs directory exists or contains no capabilities
- **THEN** display: "No specs found."

### Requirement: Error Handling

The command SHALL gracefully handle missing files and directories with appropriate messages.

#### Scenario: Missing tasks.md file

- **WHEN** a change directory has no `tasks.md` file
- **THEN** display the change with "No tasks" status

#### Scenario: Missing changes directory

- **WHEN** `openspec/changes/` directory doesn't exist
- **THEN** display error: "No OpenSpec changes directory found. Run 'openspec init' first."
- **AND** exit with code 1

### Requirement: Sorting

The command SHALL maintain consistent ordering of changes for predictable output.

#### Scenario: Ordering changes

- **WHEN** displaying multiple changes
- **THEN** sort them in alphabetical order by change name

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

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following OpenSpec's philosophy of simplicity and clarity.