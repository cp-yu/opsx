## Context

`COMMAND_REGISTRY` 是 `src/core/completions/command-registry.ts` 中的静态数组，为四种 shell（bash、zsh、fish、powershell）的补全生成器提供命令定义数据源。当前注册表包含了 `init`、`update`、`list`、`view`、`validate`、`show`、`archive`、`completion`、`config`、`schema`、`sync`、`status`、`instructions`、`templates`、`schemas`、`new`、`bootstrap` 等命令，但遗漏了 `verify` 命令。

`verify` 命令在 `src/commands/verify.ts` 中定义，具有四个子命令：`phase1`、`phase2`、`seal`、`status`，每个子命令接受 `<change-name>` positional 参数和各自的 flags。

## Goals / Non-Goals

**Goals:**
- 在 `COMMAND_REGISTRY` 中添加 `verify` 命令定义，使其子命令在所有 shell 的补全脚本中可用

**Non-Goals:**
- 不修改任何生成器或安装器代码
- 不修改补全脚本的模板
- 不引入新的补全机制或架构变更
- 不检查或修复注册表中其他可能缺失的命令

## Decisions

### 决策 1: 直接在 COMMAND_REGISTRY 末尾追加 verify 条目

**选择**: 在 `COMMAND_REGISTRY` 数组的 `bootstrap` 条目之后追加 `verify` 命令定义。

**备选方案**:
- 按字母顺序插入 → 拒绝：会改变现有条目的位置，增加不必要的 diff 噪音
- 动态从 CLI 解析命令 → 拒绝：过度设计，当前补全系统设计就是静态注册表

**理由**: 补全注册表就是手动维护的静态数据。追加到末尾遵循了文件中其他命令的现有模式，且变更最小化。

### 决策 2: 子命令结构映射

`verify` 子命令映射到 `CommandDefinition` 结构如下：

| CLI 定义 | CommandDefinition |
|---|---|
| `verify phase1 <change-name>` | `acceptsPositional: true, positionalType: 'change-id'` |
| `verify phase2 <change-name>` | `acceptsPositional: true, positionalType: 'change-id'` |
| `verify seal <change-name>` | `acceptsPositional: true, positionalType: 'change-id'` |
| `verify status <change-name>` | `acceptsPositional: true, positionalType: 'change-id'` |

所有四个子命令的 positional 参数均为 `change-id` 类型，这与 CLI 中 `validateChangeExists()` 校验逻辑一致。

## Risks / Trade-offs

- [注册表与 CLI 定义不同步] → 这是当前补全系统的已知限制（手动维护的注册表）。`verify` 不是唯一受影响的命令——其他新增的 CLI 命令也可能缺失。本变更仅修复 `verify`。长期可考虑通过在 `registerVerifyCommand` 中自动注册的方式解决，但不在本次修复范围内。
