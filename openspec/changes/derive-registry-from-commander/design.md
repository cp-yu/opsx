## Context

当前 CLI 补全系统维护两套独立数据源：

1. `src/cli/index.ts` — Commander.js 命令树，是 CLI 行为的唯一权威源
2. `src/core/completions/command-registry.ts` — ~700 行手写静态数组，仅服务 shell completion 生成

两者信息 90%+ 重叠，靠人工保持同步。每次新增/修改命令都必须同步更新两处，遗漏导致补全缺失。

Commander.js v14 的 `Command` 对象暴露了足够的 public API（`.commands`、`.options`、`.registeredArguments`、`.name()`、`.description()`）来完整反射命令树结构。

## Goals / Non-Goals

**Goals:**
- 消除 `COMMAND_REGISTRY` 静态文件，从 Commander.js 命令树运行时反射生成 `CommandDefinition[]`
- 保持生成的 shell 补全脚本与重构前语义等价
- 通过集中式 `POSITIONAL_TYPE_MAP` 管理 Commander.js 无法表达的补全语义

**Non-Goals:**
- 不改变 `CommandDefinition` / `FlagDefinition` 接口定义
- 不修改补全脚本 generators 的实现逻辑
- 不改变 `CompletionProvider` 的动态补全数据获取方式
- 不引入新的外部依赖

## Decisions

### Decision 1: 运行时反射 vs 构建时 codegen

**选择**：运行时反射

**备选方案**：
- 构建时 codegen：在 build 阶段生成静态 registry 文件
- 构建时反射缺点：增加构建步骤，仍存在"构建后又改了命令但没重新 codegen"的漂移窗口

**理由**：`openspec completion generate` 执行时，Commander.js 命令树已经在同一进程中完全构建。运行时反射零额外成本，且彻底消除 drift 可能性。

### Decision 2: positionalType 注解方式

**选择**：集中式常量 Map（`POSITIONAL_TYPE_MAP`）

**备选方案**：
- 在 Commander.js 定义处用 `(arg as any).__completionType` hack — 脆弱，依赖内部实现
- 参数名约定自动推断 — 无法表达 `change-or-spec-id` 复合类型，模糊匹配易误判

**理由**：~25 行的显式 map 语义明确，配合防漏测试确保新命令不会被遗忘。维护负担极低。

### Decision 3: program 实例传递方式

**选择**：构造时注入 — `new CompletionCommand(program)`

**备选方案**：
- 模块导出 program 再 import — 产生循环依赖（`cli/index.ts` ↔ `commands/completion.ts`）

**理由**：`CompletionCommand` 的 action handler 在 `src/cli/index.ts` 中注册，此时 `program` 已可用。构造时注入无循环引用风险。

### Decision 4: negate options 处理

Commander.js 对 `--no-validate` 会创建两个 Option 对象：一个 `--validate`（negate=false）和一个 `--no-validate`（negate=true）。

**选择**：introspect 时过滤 `option.negate === true` 的条目，只保留用户实际输入的 `--no-xxx` 形式。从 `option.long` 提取 flag name 时保留完整的 `no-validate` 字符串。

**理由**：补全脚本应展示用户实际键入的 flag 名。Commander.js 的 negate option 是内部表示，不应暴露为独立补全项。

### Decision 5: hidden commands 过滤

**选择**：introspect 时跳过 `(cmd as any)._hidden === true` 的命令（如 `experimental`、`__complete`）。

**理由**：hidden commands 是内部命令或已废弃别名，不应出现在补全列表。Commander.js 的 `_hidden` 虽然以下划线前缀命名，但在 v14 中是稳定的内部标记，且 `Help.visibleCommands()` 也依赖同一字段。

## Risks / Trade-offs

| 风险 | 缓解 |
|------|------|
| Commander.js 升级改变 `.commands`/`.options` 结构 | 这些是 public API（在 `.d.ts` 中定义），跨 major version 保持稳定；snapshot 回归测试兜底 |
| `_hidden` 字段不在公开类型中 | v14 的 `Help.visibleCommands()` 依赖同一机制；如未来版本暴露 public `hidden` 属性则迁移成本极低 |
| 忘记为新的位置参数命令添加 `POSITIONAL_TYPE_MAP` 条目 | 防漏测试断言所有 `acceptsPositional` 命令都有 map 条目，CI 自动报错 |
| `program` 传入时命令树未完全构建 | completion 命令注册在所有其他命令之后，introspect 时加断言 `commands.length > 0` |

## Migration Plan

1. 新建 `introspect.ts` 和 `positional-types.ts`
2. 修改 `CompletionCommand` 构造函数接收 `program`
3. 修改 `src/cli/index.ts` 传入 `program`
4. 运行 snapshot 测试确认补全脚本输出等价
5. 删除 `command-registry.ts`
6. 更新 `cli-completion-registry` spec 标记为 REMOVED（被 introspect 机制取代）
