# cli-completion-introspect Specification

## Purpose
此规约记录变更 derive-registry-from-commander 引入的行为，请在后续同步或归档前补全正式 Purpose。
## Requirements
### Requirement: 从 Commander.js 命令树反射生成 CommandDefinition 数组

系统 SHALL 提供 `introspectCommands(program: Command): CommandDefinition[]` 函数，通过遍历 Commander.js 的 `program` 实例运行时提取所有命令元数据。

#### Scenario: 提取顶层命令基本信息
- **WHEN** 调用 `introspectCommands(program)`
- **THEN** 返回的每个 `CommandDefinition` 的 `name` SHALL 等于对应 `Command` 实例的 `.name()` 返回值
- **AND** `description` SHALL 等于对应 `Command` 实例的 `.description()` 返回值

#### Scenario: 提取命令 flags
- **WHEN** 一个 Commander.js 命令注册了 `.option('--json', 'Output as JSON')`
- **THEN** 对应 `CommandDefinition.flags` 中 SHALL 包含 `{ name: 'json', description: 'Output as JSON', takesValue: false }`
- **AND** `option.negate === true` 的条目 SHALL 被排除
- **AND** `option.hidden === true` 的条目 SHALL 被排除

#### Scenario: 提取短标志
- **WHEN** 一个 Commander.js 命令注册了 `.option('-y, --yes', 'Skip confirmation')`
- **THEN** 对应 flag 条目 SHALL 包含 `short: 'y'`

#### Scenario: 提取带参数值的 flags
- **WHEN** 一个 Commander.js 命令注册了 `.option('--type <type>', 'Specify type')` 且通过 `.choices(['change', 'spec'])` 限定了值
- **THEN** 对应 flag 条目 SHALL 包含 `takesValue: true` 和 `values: ['change', 'spec']`

#### Scenario: 提取位置参数
- **WHEN** 一个 Commander.js 命令通过 `.command('validate [item-name]')` 声明了位置参数
- **THEN** 对应 `CommandDefinition.acceptsPositional` SHALL 为 `true`

#### Scenario: 递归提取子命令
- **WHEN** 一个命令（如 `config`）注册了子命令（如 `path`、`list`、`get`）
- **THEN** 对应 `CommandDefinition.subcommands` SHALL 递归包含所有子命令的 `CommandDefinition`
- **AND** 每个子命令的 flags 和 positional 信息 SHALL 被独立提取

#### Scenario: 排除 hidden 命令
- **WHEN** Commander.js 命令以 `{ hidden: true }` 选项注册（如 `experimental`、`__complete`）
- **THEN** `introspectCommands` 的返回结果 SHALL 不包含该命令

#### Scenario: 排除自动生成的 help 和 version options
- **WHEN** Commander.js 自动添加 `--help` 和 `--version` options
- **THEN** 这些 options SHALL 不出现在提取的 `flags` 数组中

### Requirement: positionalType 通过集中式 Map 注入

系统 SHALL 维护一个 `POSITIONAL_TYPE_MAP` 常量，将命令路径（如 `'archive'`、`'spec.show'`）映射到对应的 `positionalType` 值，并在 introspect 过程中合并到输出。

#### Scenario: 顶层命令的 positionalType 注入
- **WHEN** `POSITIONAL_TYPE_MAP` 包含 `{ 'archive': 'change-id' }`
- **AND** 调用 `introspectCommands(program)`
- **THEN** `archive` 命令的 `CommandDefinition.positionalType` SHALL 为 `'change-id'`

#### Scenario: 嵌套子命令的 positionalType 注入
- **WHEN** `POSITIONAL_TYPE_MAP` 包含 `{ 'spec.show': 'spec-id' }`
- **AND** 调用 `introspectCommands(program)`
- **THEN** `spec` 命令下 `show` 子命令的 `positionalType` SHALL 为 `'spec-id'`

#### Scenario: 未注册命令无 positionalType
- **WHEN** 一个命令有位置参数但未在 `POSITIONAL_TYPE_MAP` 中注册
- **THEN** 该命令的 `positionalType` SHALL 为 `undefined`

### Requirement: introspect 输出与补全脚本生成器接口兼容

`introspectCommands` 的返回值 SHALL 符合现有 `CommandDefinition[]` 类型定义，使所有 shell completion generators 无需修改即可消费。

#### Scenario: 类型兼容性
- **WHEN** `introspectCommands` 返回的数组传入 `ZshGenerator.generate()`
- **THEN** SHALL 通过 TypeScript 编译且生成有效的 Zsh 补全脚本

#### Scenario: 生成结果等价性
- **WHEN** 对完整 CLI `program` 调用 `introspectCommands` 并传入 generators
- **THEN** 生成的补全脚本 SHALL 在命令名、flags、子命令结构上与重构前等价

### Requirement: 防漏测试确保 positionalType 完整性

系统 SHALL 通过自动化测试确保所有声明了位置参数的命令都在 `POSITIONAL_TYPE_MAP` 中有对应条目。

#### Scenario: 新增带参数命令但未更新 Map 时测试失败
- **WHEN** CLI 新增了一个带位置参数的命令
- **AND** 该命令路径未在 `POSITIONAL_TYPE_MAP` 中注册
- **THEN** 防漏测试 SHALL 失败并报告缺失的命令路径

