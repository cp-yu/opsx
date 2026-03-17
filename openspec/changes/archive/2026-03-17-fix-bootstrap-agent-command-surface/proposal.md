## Why

OpenSpec 已经具备 bootstrap 的核心 CLI 能力与对应模板，但 agent command surface 仍然不一致：主命令文档未暴露 `/opsx:bootstrap`，旧文档仍描述不存在的 `--extend` / `--refresh` 类伪命令，命令生成链路则把内部 workflow ID `bootstrap-opsx` 直接当作外部命令文件名使用。结果是 bootstrap 虽然“部分存在”，却无法以一致、可发现、可验证的方式通过 agent CLI 使用。

现在需要把 bootstrap 收口为唯一的 **CLI-backed** 工作流入口：外部命令面统一为 `/opsx:bootstrap`，底层继续复用 `openspec bootstrap status|init|instructions|validate|promote`，并同步修复 generation、migration、drift detection、cleanup、文档与测试契约。

## What Changes

- 将 bootstrap 明确定义为基于现有 `openspec bootstrap ...` 子命令的 agent workflow，而不是旧式一次性 AI 命令或伪参数接口。
- 为命令生成链路引入“内部 workflow ID”与“外部 command slug”的分离模型，使 `bootstrap-opsx` 可对外暴露为 `bootstrap`，同时保持 profile/config 内部语义稳定。
- 更新命令生成、检测、迁移、drift 检查与清理逻辑，保证生成、识别、删除都基于同一套 command slug 映射。
- 删除或重写 `docs/opsx-bootstrap.md` 中陈旧的 `/opsx:bootstrap --focus`、`--extend --capabilities`、`--refresh` 等错误示例。
- 在命令主文档中正式加入 `/opsx:bootstrap`，并补齐相关测试与规格，使 bootstrap 成为受支持的 agent command surface。

## Capabilities

### New Capabilities
- `agent-command-slugs`: 为 agent commands 建立内部 workflow ID 与外部 command slug 的稳定映射，用于生成、检测、迁移和清理命令制品

### Modified Capabilities
- `bootstrap`: bootstrap 的文档与模板契约改为统一描述 CLI-backed 五阶段工作流，并移除过时伪命令叙事
- `cli-init`: `openspec init` 生成的 slash commands 需要支持 bootstrap 的外部命令名与对应制品路径
- `command-generation`: command generation contract 从“command id 直接等于文件 basename”演进为“可映射的外部 command slug”

## Impact

- `src/core/shared/skill-generation.ts`
- `src/core/shared/tool-detection.ts`
- `src/core/command-generation/types.ts`
- `src/core/command-generation/generator.ts`
- `src/core/profile-sync-drift.ts`
- `src/core/migration.ts`
- `src/core/update.ts`
- `src/core/templates/workflows/bootstrap-opsx.ts`
- `src/core/command-generation/adapters/claude.ts` 及其他受共享 slug 模型影响的 adapter
- `docs/commands.md`
- `docs/opsx-bootstrap.md`
- `docs/opsx-integration.md`
- 相关 bootstrap / cli-init / command-generation specs 与 tests
