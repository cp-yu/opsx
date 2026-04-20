# tool-invocation-references Specification

## Purpose
定义 workflow 引用在不同工具表面上的渲染规则，确保生成的指令始终使用显式注册的技能名或命令名，而不是字符串猜测。
## Requirements
### Requirement: Workflow 引用 SHALL 通过显式工具表面元数据渲染
系统 SHALL 通过共享 workflow surface 元数据渲染生成 guidance 中的用户可调用 workflow 引用，而不是把 `/opsx:*` 文本原样写入所有工具 surface。

#### Scenario: Codex 引用使用精确的受管 skill 名称
- **WHEN** 系统为 `codex` 生成 workflow skill 或基于 skill 的 getting-started guidance
- **AND** guidance 需要引用另一个已注册 workflow surface
- **THEN** 渲染结果 SHALL 使用 `$<skillDirName>` 形式
- **AND** `skillDirName` SHALL 来自共享 workflow surface manifest 的显式值
- **AND** 系统 SHALL NOT 通过 `commandSlug`、字符串拼接或后缀猜测来生成 Codex skill 名称

#### Scenario: Command-backed 工具保持各自的 command 语法
- **WHEN** 系统为支持 command generation 的工具渲染 workflow 引用
- **THEN** 渲染结果 SHALL 使用该工具对应的 command-surface 语法
- **AND** 引用的 workflow 名称 SHALL 基于该 workflow 的显式 `commandSlug`
- **AND** 工具特定格式（例如 OpenCode 的连字符语法）SHALL 继续保留

#### Scenario: 替换范围仅限已注册 workflow surface
- **WHEN** guidance 文本中同时包含 workflow 引用与普通文本
- **THEN** 系统 SHALL 仅替换能够通过共享 workflow surface manifest 显式解析的引用
- **AND** SHALL 使用显式 lookup 而不是通配符或猜测式正则来生成 skill / command 名称
- **AND** 无法解析为已注册 workflow surface 的普通文本 SHALL 保持原样
