# Spec: cli-completion-registry

## REMOVED Requirements

### Requirement: 所有 CLI 命令必须注册到 COMMAND_REGISTRY
**Reason**: 静态 `COMMAND_REGISTRY` 被运行时反射机制 `introspectCommands` 取代。命令元数据不再需要手工维护，而是从 Commander.js 命令树自动派生。
**Migration**: 补全系统改为调用 `introspectCommands(program)` 获取 `CommandDefinition[]`，不再 import `COMMAND_REGISTRY` 常量。

### Requirement: COMMAND_REGISTRY 与 CLI 命令树保持一致
**Reason**: 该 requirement 的存在本身就是双数据源问题的补丁。运行时反射从根本上消除了"保持一致"的需求——数据源只有一个。
**Migration**: 一致性由 `introspectCommands` 的实现保证，防漏测试覆盖 `POSITIONAL_TYPE_MAP` 完整性。
