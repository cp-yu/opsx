## Why

Codex 已经不再支持 OpenSpec 依赖的 command/prompt 安装方式，但仓库仍把它当作会生成全局 command 文件的工具处理。这导致 `init`、`update`、迁移、漂移检测、文档与测试继续维护一条已经失效的行为路径，既增加复杂度，也让用户得到错误结果。

## What Changes

- 将 Codex 的 OpenSpec 集成收敛为 skills-only，不再生成或刷新任何 Codex command/prompt 文件。
- 移除针对 Codex command 生成的适配器、注册和相关测试假设。
- 调整 `openspec init` 与 `openspec update`，使其在全局 delivery 包含 commands 时，仍能对 Codex 采用 skills-only 的有效行为，而不是继续尝试写入已废弃的 command 文件。
- 调整配置/检测/迁移逻辑，使 Codex 不再被识别为 command-backed 工具，避免长期保留死分支和错误漂移判断。
- 更新支持工具文档，明确 Codex 只使用 `.codex/skills/openspec-*/SKILL.md`。

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `command-generation`: 移除 Codex command adapter，并将 command 生成契约限定为仍然支持 command 文件的工具。
- `cli-init`: 初始化时对 Codex 仅生成 skills，并停止创建 Codex commands。
- `cli-update`: 更新时对 Codex 仅刷新 skills，并停止刷新或探测 Codex commands。
- `ai-tool-paths`: Codex 的受支持路径定义收敛为项目内 skills 路径，不再记录全局 prompt command 路径。

## Impact

- Affected code: `src/core/config.ts`, `src/core/command-generation/`, `src/core/init.ts`, `src/core/update.ts`, `src/core/profile-sync-drift.ts`, `src/core/migration.ts`, `src/core/workflow-installation.ts`
- Affected docs: `docs/supported-tools.md`, 可能涉及 `docs/cli.md`
- Affected tests: command adapter、registry、init/update、migration、profile sync 相关测试
- User impact: 选择 `codex` 的项目只会安装/更新 skills，不再产生误导性的 command 文件
