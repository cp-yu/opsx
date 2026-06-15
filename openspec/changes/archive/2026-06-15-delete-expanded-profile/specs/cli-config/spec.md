---
capabilities:
  - cap.cli.config
---
# CLI Config 规约变更

## REMOVED Requirements

### Requirement: Profile Configuration Flow
**Reason**: Profile 系统已删除
**Migration**: 移除 `openspec config profile` 命令。用户无需配置 profile，系统固定安装 5 个工作流。

## MODIFIED Requirements

### Requirement: Command Structure

The config command SHALL provide subcommands for all configuration operations.

#### Scenario: Available subcommands

- **WHEN** user executes `openspec config --help`
- **THEN** display available subcommands:
  - `path` - Show config file location
  - `list` - Show all current settings
  - `get <key>` - Get a specific value
  - `set <key> <value>` - Set a value
  - `unset <key>` - Remove a key (revert to default)
  - `reset` - Reset configuration to defaults
  - `edit` - Open config in editor
  - `project` - Query normalized project configuration
- **AND** SHALL NOT include `profile` subcommand
