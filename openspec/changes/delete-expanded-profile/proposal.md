## Why

当前 profile 系统（core/expanded/custom）过度设计，expanded 模式包含 7 个额外工作流但无实际使用场景。删除 profile 配置层，固定安装 5 个核心工作流（propose, explore, apply, archive, bootstrap-opsx），为未来 CLI 编程方式让路，简化架构。

## What Changes

- **BREAKING** 删除 profile 系统（core/expanded/custom preset）
- **BREAKING** 删除全局配置中的 `profile` 和 `workflows` 字段
- **BREAKING** 删除 `openspec config profile` 命令
- **BREAKING** 删除 7 个 expanded 专属工作流：
  - `new` (openspec-new-change)
  - `continue` (openspec-continue-change)
  - `ff` (openspec-ff-change)
  - `verify` (openspec-verify-change)
  - `sync` (openspec-sync-specs)
  - `bulk-archive` (openspec-bulk-archive-change)
  - `onboard` (openspec-onboard)
- 保留 5 个工作流（固定安装）：
  - 4 个核心：propose, explore, apply, archive
  - 1 个独立：bootstrap-opsx
- `modeMembership` 从 "profile 成员标识" 转变为 "workflow 标签系统"
- `openspec init` 和 `openspec update` 固定安装 5 个工作流，无需用户选择
- 升级时自动检测并清理过时的 `profile`/`workflows` 配置字段

## Capabilities

### New Capabilities

无。本次变更为删除功能。

### Modified Capabilities

- `cli-init`: 移除 profile 参数，固定安装 5 个工作流
- `cli-update`: 移除 profile 逻辑，固定更新 5 个工作流，清理过时配置字段
- `cli-config`: 删除 `config profile` 子命令
- `global-config`: 移除 `profile` 和 `workflows` 字段
- `profiles`: 删除 profile 解析逻辑或整个文件
- `ai-workflow-templates`: 删除 7 个工作流模板文件
- `template-artifact-pipeline`: 移除 7 个工作流的 manifest entries

## Impact

**受影响代码**
- `src/core/global-config.ts` - 删除 Profile 类型和字段
- `src/core/profiles.ts` - 删除或大幅简化
- `src/commands/config.ts` - 删除 profile 子命令
- `src/core/init.ts` - 固定安装逻辑
- `src/core/update.ts` - 固定更新逻辑，配置清理
- `src/core/templates/manifest/registry.ts` - 移除 7 个 entries
- `src/core/templates/workflows/` - 删除 7 个模板文件
- `test/` - 删除相关测试文件

**受影响 API**
- `openspec config profile` 命令不再可用
- `openspec init` 不再接受 `--profile` 参数
- 全局配置 JSON 结构变更

**依赖关系**
- 无外部依赖变更
- 内部模块解耦（删除 profile 系统后依赖链简化）

**系统影响**
- 用户升级后需运行 `openspec update` 清理配置
- 已生成的 expanded 工作流 skill 文件会被自动清理
- 无数据迁移需求（无 expanded 用户）
