---
capabilities:
  - cap.cli.archive
---
# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following OpenSpec conventions.

## Command Syntax
```bash
openspec archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)
## Requirements
### Requirement: Change Selection

The command SHALL support both interactive and direct change selection methods.

#### Scenario: Interactive selection

- **WHEN** no change-name is provided
- **THEN** display interactive list of available changes (excluding archive/)
- **AND** allow user to select one

#### Scenario: Direct selection

- **WHEN** change-name is provided
- **THEN** use that change directly
- **AND** validate it exists

### Requirement: Task Completion Check

The command SHALL verify task completion status before archiving to prevent premature archival.

#### Scenario: Incomplete tasks found

- **WHEN** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display all incomplete tasks to the user
- **AND** prompt for confirmation to continue
- **AND** default to "No" for safety

#### Scenario: All tasks complete

- **WHEN** all tasks are complete OR no tasks.md exists
- **THEN** proceed with archiving without prompting

### Requirement: Archive Process

archive 操作 SHALL 在校验通过后将 change 目录移动到 archive 目录，并输出 git handoff 提醒。archive 不执行任何 spec 或 OPSX 写入操作。同步合并由 `openspec sync` 独立完成。

#### Scenario: 直接归档

- **WHEN** 所有 gate 通过（verify、sync、validation、task）
- **AND** change 目录存在
- **THEN** 命令 SHALL 将 change 目录移动到 archive 目录
- **AND** 目录名 SHALL 使用 `YYYY-MM-DD-<change-name>` 格式
- **AND** SHALL 输出 git handoff 提醒
- **AND** SHALL NOT 修改 main spec 文件
- **AND** SHALL NOT 修改 OPSX 主文件
- **AND** SHALL NOT 执行 `git add`、`git commit`、`git checkout`、`git merge` 或 `git branch`

#### Scenario: 已归档 change 检测

- **WHEN** 目标 archive 路径已存在
- **AND** change 目录已不在活动目录
- **THEN** 命令 SHALL 输出 git handoff 提醒后退出

#### Scenario: 归档失败不回写

- **WHEN** archive gate 校验失败
- **THEN** 命令 SHALL 终止归档
- **AND** 不执行任何文件修改
- **AND** change 目录保持原样

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing openspec/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

### Requirement: Display Output

archive 命令 SHALL 提供清晰的 gate 状态反馈。

#### Scenario: 显示 gate 状态

- **WHEN** 执行 archive
- **THEN** 依次显示每个 gate 的通过/跳过/失败状态
- **AND** 显示 task 完成状态
- **AND** 归档完成后显示最终确认消息和 git handoff 提醒

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

### Requirement: Archive CLI 输出 git handoff 提醒

`openspec archive` 在完成 verify、sync 与 move-to-archive 后 SHALL 输出后续 git 工作由 agent 自动继续的责任归属提醒，不再读取或区分任何 handoff 模式配置。

#### Scenario: 归档完成后提醒 agent 接管

- **WHEN** `openspec archive <change>` 完成归档
- **THEN** CLI SHALL 输出归档已完成
- **AND** SHALL 提醒后续 git 提交流程由 agent 自动继续处理
- **AND** SHALL NOT 输出任何推荐 commit message
- **AND** SHALL NOT 读取 `git.autoCommit` 配置

### Requirement: Sync Gate

archive 命令 SHALL 在归档前检查 change 是否存在未合并的 delta（spec + OPSX），并在存在时阻止归档。sync 检查与 verify gate 正交，`--no-sync` flag 可跳过。

#### Scenario: 存在未合并 delta 时阻止归档

- **WHEN** change 包含尚未通过 `openspec sync` 合并到 main spec 的 delta
- **AND** 未使用 `--no-sync`
- **THEN** archive 命令 SHALL 输出错误消息指明 pending delta
- **AND** SHALL 提示用户执行 `openspec sync <change-name>` 后重试
- **AND** SHALL 终止归档操作

#### Scenario: delta 已全部合并时通过检查

- **WHEN** change 的所有 delta（spec + OPSX）已通过 `openspec sync` 合并到 main spec
- **AND** 未使用 `--no-sync`
- **THEN** sync gate SHALL 通过
- **AND** archive 命令 SHALL 继续后续步骤

#### Scenario: --no-sync 跳过 sync gate

- **WHEN** 执行 `openspec archive <change> --no-sync`
- **AND** 非 `--yes` 模式
- **THEN** CLI SHALL 显示警告确认提示，说明跳过 sync 检查的风险
- **AND** 用户确认后 SHALL 跳过 sync 检查
- **AND** 继续归档

#### Scenario: --yes --no-sync 静默跳过

- **WHEN** 执行 `openspec archive <change> --no-sync --yes`
- **THEN** CLI SHALL 静默跳过 sync 检查
- **AND** 直接继续归档

#### Scenario: 仅含 removal delta 且目标 header 已不存在

- **WHEN** change delta 仅包含 REMOVED 操作
- **AND** 对应 main spec 中所有被移除的 header 已不存在
- **THEN** sync gate SHALL 将该项 delta 视为已同步
- **AND** SHALL NOT 阻止归档

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use