## 1. 命令注册表修复

- [x] 1.1 在 `src/core/completions/command-registry.ts` 的 `COMMAND_REGISTRY` 数组末尾（`bootstrap` 条目之后）添加 `verify` 命令定义，包含四个子命令 phase1、phase2、seal、status，每个子命令配置正确的 flags、positional 类型（change-id）和描述

## 2. 验证

- [x] 2.1 运行 `openspec completion generate bash` 并检查生成的脚本中包含 `verify` 及其子命令 phase1、phase2、seal、status 的补全逻辑
- [x] 2.2 运行 `openspec completion generate zsh` 并同样验证 verify 子命令补全
- [x] 2.3 运行 `pnpm test` 确保现有测试全部通过，无回归
