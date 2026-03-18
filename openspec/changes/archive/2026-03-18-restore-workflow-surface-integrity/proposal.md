## Why

OpenSpec 当前在 workflow surface 上存在结构性不一致：

- `sync` 已存在于源码注册链路，但在普通模式下不会生成独立 skill / command surface
- `/opsx:archive` 在 agent 语义上又会尝试调用独立 `sync`，导致运行时出现 `Unknown skill: openspec-sync-specs`
- 文档中存在 “expanded mode” 概念，但代码中并没有与之对齐的一等 preset
- `init`、`config profile`、`update`、migration、drift detection 对 workflow metadata 的理解分散在多个模块中，容易在 fork 修改后产生回归
- 普通模式与拓展模式的命令可见性、归档行为、生成物集合没有形成统一产品契约

这个 change 需要恢复 workflow surface integrity：让模式、生成物、归档语义、命令可见性、文档和检测逻辑使用同一套定义，并避免 fork 后继续无意破坏原始功能。

## What Changes

- 引入正式的 `expanded` 模式定义，使其成为与 `core` 并列的一等 workflow preset
- 为 workflow surface 建立单一 manifest / registry，统一派生 workflow 列表、mode membership、skill dir、skill name、command slug 与模板投影
- 让 `init`、`update`、profile sync drift detection 与 migration 共享同一套 install planning 逻辑
- 在普通模式下将 sync 能力内嵌进 archive，使 archive 自动处理 delta specs 与 `opsx-delta`，而不再依赖未安装的独立 sync skill
- 在拓展模式下保留独立 `sync` command / skill surface
- 为 `openspec init` 与 `openspec config profile` 增加明确的 normal/core 与 expanded 模式语义
- 更新相关 specs、文档与测试，使 workflow surface、命令可见性与配置行为一致

## Capabilities

### New Capabilities
- `workflow-surface-manifest`: 为 workflow surface 建立单一元数据来源，统一生成、检测、迁移与清理所需的投影
- `archive-embedded-sync`: 在普通模式下为 archive 提供内嵌的完整 sync 能力，包括 delta specs 与 `opsx-delta`

### Modified Capabilities
- `cli-init`: 初始化流程支持明确的模式选择，并按模式生成对应 workflows
- `cli-config`: profile 配置流程支持正式的 core / expanded 模式语义
- `cli-archive`: archive 命令支持在普通模式下自动完成完整同步
- `specs-sync-skill`: 独立 sync surface 仅在拓展模式下暴露，并继续覆盖 specs + OPSX sync
- `command-generation`: 所有 command artifact 由统一 manifest 与共享 planning 派生
- `agent-command-slugs`: command slug 规则继续作为唯一外部命令映射契约
- `opsx-archive-skill`: archive skill 在普通模式下不得再依赖未安装的独立 sync skill

## Impact

- `src/core/profiles.ts`
- `src/core/global-config.ts`
- `src/core/config-schema.ts`
- `src/commands/config.ts`
- `src/core/init.ts`
- `src/core/update.ts`
- `src/core/profile-sync-drift.ts`
- `src/core/migration.ts`
- `src/core/archive.ts`
- `src/core/shared/tool-detection.ts`
- `src/core/shared/skill-generation.ts`
- `src/core/templates/workflows/archive-change.ts`
- `src/core/templates/workflows/sync-specs.ts`
- 相关 `openspec/specs/*`
- 相关 docs 与 tests
