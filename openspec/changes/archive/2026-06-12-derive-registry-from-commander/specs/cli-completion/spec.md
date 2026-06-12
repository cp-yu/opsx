## MODIFIED Requirements

### Requirement: Architecture Patterns

The completion implementation SHALL follow clean architecture principles with TypeScript best practices, supporting multiple shells through a plugin-based pattern.

#### Scenario: Shell-specific generators

- **WHEN** implementing completion generators
- **THEN** create generator classes for each shell: `ZshGenerator`, `BashGenerator`, `FishGenerator`, `PowerShellGenerator`
- **AND** implement a common `CompletionGenerator` interface with method:
  - `generate(commands: CommandDefinition[]): string` - Returns complete shell script
- **AND** each generator handles shell-specific syntax, escaping, and patterns
- **AND** all generators consume the same `CommandDefinition[]` from the introspection function

#### Scenario: Shell-specific installers

- **WHEN** implementing completion installers
- **THEN** create installer classes for each shell: `ZshInstaller`, `BashInstaller`, `FishInstaller`, `PowerShellInstaller`
- **AND** implement a common `CompletionInstaller` interface with methods:
  - `install(script: string): Promise<InstallationResult>` - Installs completion script
  - `uninstall(): Promise<{ success: boolean; message: string }>` - Removes completion
- **AND** each installer handles shell-specific paths, config files, and installation patterns

#### Scenario: Factory pattern for shell selection

- **WHEN** selecting shell-specific implementation
- **THEN** use `CompletionFactory` class with static methods:
  - `createGenerator(shell: SupportedShell): CompletionGenerator`
  - `createInstaller(shell: SupportedShell): CompletionInstaller`
- **AND** factory uses switch statements with TypeScript exhaustiveness checking
- **AND** adding new shell requires updating `SupportedShell` type and factory cases

#### Scenario: Dynamic completion providers

- **WHEN** implementing dynamic completions
- **THEN** create a `CompletionProvider` class that encapsulates project discovery logic
- **AND** implement methods:
  - `getChangeIds(): Promise<string[]>` - Discovers active change IDs
  - `getSpecIds(): Promise<string[]>` - Discovers spec IDs
  - `isOpenSpecProject(): boolean` - Checks if current directory is OpenSpec-enabled
- **AND** implement caching with 2-second TTL using class properties

#### Scenario: 命令树运行时反射

- **WHEN** 补全系统需要命令定义
- **THEN** 通过 `introspectCommands(program)` 函数从 Commander.js `Command` 实例运行时反射命令树
- **AND** 提取每个非 hidden 命令的 `name()`、`description()`、`options`、`registeredArguments` 和递归子命令
- **AND** 通过 `POSITIONAL_TYPE_MAP` 集中式常量合并 `positionalType` 注解到对应命令
- **AND** 返回 `CommandDefinition[]` 供所有 shell generators 消费
- **AND** 不存在独立的静态 `COMMAND_REGISTRY` 数组

#### Scenario: Type-safe shell detection

- **WHEN** implementing shell detection
- **THEN** define a `SupportedShell` type as literal type: `'zsh' | 'bash' | 'fish' | 'powershell'`
- **AND** implement `detectShell()` function in `src/utils/shell-detection.ts`
- **AND** return detected shell or throw error with supported shells list

### Requirement: Command Registry

`CompletionCommand` SHALL 通过构造时注入的 Commander.js `program` 实例调用 `introspectCommands()` 获取命令定义，而非依赖静态 `COMMAND_REGISTRY` 常量。

#### Scenario: 运行时反射取代静态注册表

- **WHEN** `CompletionCommand` 被实例化
- **THEN** 构造函数 SHALL 接收 Commander.js `Command` 实例作为参数
- **AND** 在 `generate`/`install` 操作中调用 `introspectCommands(program)` 获取 `CommandDefinition[]`
- **AND** 不 import 或引用 `command-registry.ts` 模块

#### Scenario: verify 命令通过反射可发现

- **WHEN** 对包含 `verify` 命令的 `program` 实例调用 `introspectCommands()`
- **THEN** 返回结果 SHALL 包含 `verify` 条目，description 为 "Programmatic verify gates for changes"
- **AND** SHALL 包含子命令: phase1, phase2, seal, status
- **AND** phase1 SHALL 包含 flags: `--input`, `--json` 且 positionalType 为 `change-id`
- **AND** phase2 SHALL 包含 flags: `--type`, `--files`, `--input`, `--json` 且 positionalType 为 `change-id`
- **AND** seal SHALL 包含 flags: `--json` 且 positionalType 为 `change-id`
- **AND** status SHALL 包含 flags: `--json` 且 positionalType 为 `change-id`
