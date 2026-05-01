## Why

`openspec verify` 命令的子命令（phase1、phase2、seal、status）在 shell 补全中完全缺失，因为 `COMMAND_REGISTRY` 中遗漏了 `verify` 条目。用户输入 `openspec verify <TAB>` 时无法获得子命令补全提示，只能看到帮助文本。

## What Changes

- 在 `src/core/completions/command-registry.ts` 的 `COMMAND_REGISTRY` 中添加 `verify` 命令定义，包含四个子命令 phase1、phase2、seal、status 及其各自的 flags 和 positional 参数

## Capabilities

### New Capabilities
<!-- None -- this is a bug fix, no new capabilities introduced -->

### Modified Capabilities
- `cli-completion`: 补全注册表缺少 `verify` 命令定义，导致生成的补全脚本不包含 verify 子命令补全

## Impact

- 受影响的代码：`src/core/completions/command-registry.ts`（添加 verify 命令定义）
- 受影响的文档/规约：`openspec/specs/cli-completion/spec.md`（更新命令列表以包含 verify）
- 四个 shell 的补全脚本均会受影响（bash、zsh、fish、powershell），所有生成器共享同一份 `COMMAND_REGISTRY`
