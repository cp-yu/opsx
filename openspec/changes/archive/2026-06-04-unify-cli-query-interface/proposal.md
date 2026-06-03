## Why

当前 openspec-impact-sweeper 等 AI Agent 获取影响面时直接读取 YAML 文件，而不是通过统一的 OpenSpec CLI 查询。这导致 Agent 侧重复实现查询逻辑，CLI 没有成为稳定的数据接口，且无法保证数据访问的一致性和错误处理。

## What Changes

- 增强 `openspec list --specs --json` 输出，添加 `capabilities` 字段（从 spec frontmatter 提取）
- 新增 `openspec opsx query <node-id>` 命令，提供 OPSX 节点信息、关系和 code-map 查询接口
- **BREAKING**: 删除 `openspec spec list` 命令及其所有子命令
- 更新 impact-sweeper、propose、apply-change 模板，从直接读取 YAML 文件迁移到 CLI 查询
- 更新 shell completion registry，注册新的 opsx 命令
- 删除 `test/cli-e2e/spec-list.test.ts` 测试文件

## Capabilities

### New Capabilities
- `cli-opsx-query`: OPSX 节点查询 CLI 命令，支持查询节点信息、关系和 code-map 引用

### Modified Capabilities
- `cli-list`: 扩展 specs 模式 JSON 输出，添加 capabilities 字段
- `cli-spec`: 移除 list 子命令（breaking change）
- `ai-impact-sweeper`: 从直接读取 YAML 文件迁移到 CLI 查询接口
- `ai-workflow-templates`: 更新 propose 和 apply-change 模板中的命令引用

## Impact

**受影响模块**：
- CLI 命令层：`src/core/list.ts`、`src/commands/spec.ts`、新增 `src/commands/opsx.ts`
- CLI 路由：`src/cli/index.ts`
- 补全系统：`src/core/completions/command-registry.ts`
- AI 模板：`src/core/templates/workflows/impact-sweeper.ts`、`propose.ts`、`apply-change.ts`
- 测试文件：删除 `test/cli-e2e/spec-list.test.ts`，新增 `test/commands/opsx.test.ts`、`test/cli-e2e/opsx-query.test.ts`

**OPSX 节点**：
- `cap.cli.list`
- `cap.cli.spec`
- `cap.ai.impact-sweeper`
- `cap.ai.workflow-templates`
- 新增 `cap.cli.opsx-query`

**Breaking Changes**：
- `openspec spec list` 命令被完全移除，现有使用该命令的脚本需迁移到 `openspec list --specs`

<!-- Smart Routing Decision: Design Summary found and used -->
