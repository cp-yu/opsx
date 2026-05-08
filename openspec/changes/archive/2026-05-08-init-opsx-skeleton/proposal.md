## Why

`openspec init` 创建了 OpenSpec 的目录骨架和 AI 工具集成，但完全不会生成 OPSX 架构文件（`project.opsx.yaml`、`project.opsx.relations.yaml`、`project.opsx.code-map.yaml`）。用户在 init 之后，`openspec/specs/` 和 `openspec/changes/` 都是空目录，OPSX 三文件也缺失——这与 CLAUDE.md 中描述的标准结构不一致。新用户不知道还需要单独运行 `/opsx:bootstrap` 来补全架构映射。

## What Changes

- `openspec init` 首次初始化时自动生成三个 OPSX 骨架文件（空 domains/capabilities/relations/code-map），仅当文件不存在时创建，刷新模式下不覆盖
- `openspec init` 成功提示中增加显式的 bootstrap 引导行，仅在 profile 包含 `bootstrap-opsx` 且非 extend 模式时显示

## Capabilities

### New Capabilities
- `init-opsx-skeleton`: `openspec init` 首次运行时生成最小化 OPSX 骨架文件，并在成功提示中引导用户运行 `/opsx:bootstrap` 完成架构映射

### Modified Capabilities
- `cli-init`: init 命令的行为变更——首次 init 额外生成 OPSX 骨架文件并输出 bootstrap 引导文案

## Impact

- `src/core/init.ts` — 新增 `writeOpsxSkeleton()` 方法；`execute()` 中调用；`displaySuccessMessage()` 新增 bootstrap 引导行
- `test/core/init.test.ts` — 新增 OPSX 骨架生成相关测试用例
