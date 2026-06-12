## Why

<!-- smart-routing: Design Summary found, detail score 5/5, single subsystem, proceeding -->

`COMMAND_REGISTRY`（~700 行手写静态数组）与 Commander.js 命令定义是两套独立数据源，靠人工保持同步。每次新增/修改命令都可能遗漏同步，导致 shell completion 漂移。通过运行时反射 Commander.js 命令树自动派生 `CommandDefinition[]`，彻底消除双数据源问题。

## What Changes

- 新增 `introspectCommands(program)` 函数，运行时遍历 Commander.js 命令树提取命令元数据
- 新增 `POSITIONAL_TYPE_MAP`（~25 行集中式 map），补充 Commander.js 无法表达的补全类型语义
- 修改 `CompletionCommand` 构造函数，接收 `program` 实例替代静态 registry import
- 删除 `src/core/completions/command-registry.ts`（~700 行）
- 净效果：删除 ~700 行，新增 ~80 行

## Capabilities

### New Capabilities
- `cli-completion-introspect`: 从 Commander.js 命令树运行时反射生成 `CommandDefinition[]`，合并 positional type 注解，供补全生成器消费

### Modified Capabilities
- `cli-completion-registry`: 此 capability 将被 REMOVED — 手写静态 registry 被运行时反射完全取代

## Impact

- 受影响代码：`src/core/completions/`、`src/commands/completion.ts`、`src/cli/index.ts`
- 受影响测试：`test/commands/completion.test.ts`
- 无外部 API 变更（`openspec completion generate/install/uninstall` 行为不变）
- 无新依赖（纯 Commander.js public API：`.commands`、`.options`、`.registeredArguments`）
- 现有 `cli-completion-registry` spec 将标记为 REMOVED（被新 capability 取代）
