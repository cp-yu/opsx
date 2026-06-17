## Why

OpenSpec 现在同时维护 skills 与 slash command delivery，导致配置、生成管线、测试和文档持续分叉。既然所有 CLI workflow 都按支持 subagent 处理，继续保留 `delivery`、command-backed tool 判断和 reread fallback 只会制造复杂度。

## What Changes

- **BREAKING** 删除全局 `delivery` 配置语义，不再支持 `skills`、`commands`、`both` 的安装模式选择。
- **BREAKING** 将 AI workflow surface 收敛为 skills-only；`init` 与 `update` 只生成和刷新受管 skills。
- **BREAKING** 停止维护 active command-generation delivery path；旧 command 文件保留在磁盘上，但 OpenSpec 不再生成、刷新或主动清理它们。
- **BREAKING** 所有 generated workflow templates 采用 subagent orchestration，不再根据工具判断是否使用 `current-agent-reread`。
- 用户可见调用提示改为 skills 语义；没有精确调用语法 metadata 的工具使用中性 skill invocation 文案。

## Capabilities

### New Capabilities

### Modified Capabilities

- `global-config`: 删除 `delivery` 配置字段与默认值要求。
- `cli-init`: 初始化只安装 skills，不生成 slash commands，不展示 command delivery 摘要。
- `cli-update`: 更新只刷新 skills，不按 delivery 或 command-backed 工具分支。
- `ai-command-generation`: active command generation 不再是 workflow delivery 管线的一部分。
- `command-generation`: command adapter/generator 行为不再作为 active OpenSpec workflow surface 要求。
- `ai-tool-paths`: 工具路径要求收敛为 skills 路径，不再维护 command path 作为 active 生成面。
- `tool-invocation-references`: workflow 引用渲染使用 skills 语义和中性 fallback。
- `ai-workflow-templates`: 模板统一使用 subagent orchestration，不再保留 reread fallback。
- `verify-execution-model-selection`: 删除 execution model 选择分支，固定 subagent-orchestrated。
- `internal-skill-installation`: 内部 skill 仍只作为 skills 安装，不再需要与 command delivery 区分。
- `template-artifact-pipeline`: manifest 与 sync engine 只投影 skills 制品，保留 transform scope 的 `both` 局部语义。
- `profiles`: 删除仍残留的 delivery/profile 安装模式要求。

## Impact

- 影响 `src/core/global-config.ts`、`src/core/config-schema.ts`、`src/core/init.ts`、`src/core/update.ts`、`src/core/workflow-installation.ts`、`src/core/templates/sync-engine.ts`、`src/core/shared/skill-generation.ts`、`src/core/templates/manifest/`、`src/core/config.ts`、`src/utils/command-references.ts`、`src/core/templates/workflows/`。
- 影响 active specs、OPSX capability intents/code-map、相关单元测试与 init/update 集成测试。
- 不新增旧 command cleanup 代码；既有旧 command 文件保留为用户可手动处理的磁盘残留。
