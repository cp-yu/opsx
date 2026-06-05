## Why

当前项目生成的 skill 模板文件过长，部分超过 300 行，导致上下文效率降低。根据 Agent Skills 最佳实践，skill 文件应保持精简（推荐 < 500 行，本项目设定更严格的 200 行上限）。需要在开发阶段就能发现超标问题，而不是安装后才暴露。

## What Changes

- 新增测试：验证所有生成 skill 文件单文件不超过 200 行
- 支持模板声明 `referenceFiles`，安装时写出 `references/*.md`
- 精简当前超标的 workflow/internal skill 模板，并将 `openspec-optimizer`、`openspec-impact-sweeper`、`openspec-sync-specs` 的长协议拆到 references
- 通过 `openspec update --force` 刷新当前配置启用的 `.claude` / `.codex` / `.github` 工具产物
- 测试覆盖所有 tool 变体（default、claude、codex）
- 按 `<dirName>/<filePath>` 分组报告，清晰显示每个 skill 文件的所有变体及其行数
- 失败时提供业界参考链接（Matt Pocock 的 write-a-skill 示例）

## Capabilities

### New Capabilities

- `skill-template-length-check`: 测试 skill 模板生成内容的行数限制

### Modified Capabilities

<!-- 无现有 capability 的 requirement 变更 -->

## Impact

- 影响文件：`test/skills/` 目录新增测试文件；`src/core/templates/workflows/*.ts` 中超标 skill 模板被精简或拆分；skill 生成/安装逻辑写出 references；当前配置启用的生成工具 skill 文件同步刷新
- 影响范围：skill 模板开发流程，开发者在修改 `src/core/templates/workflows/*.ts` 时将立即得到反馈
- 依赖：使用现有的 `getSkillTemplates()` 和 `generateSkillContent()` API，并扩展 `SkillTemplate.referenceFiles`
