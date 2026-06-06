<!--
Smart Routing Decision:
- Input length: ~150 chars
- Detail score: 5/5 (Design Summary from explore, confirmed architecture scope)
- Multi-subsystem: false
- Decision: Design Summary found, proceed directly to artifact generation.
-->

## Why

`docLanguage` 配置字段语义模糊（暗示整个文档语言，实际仅控制自然语言散文），且各 skill 缺少显式读取 `configProjection` 的指示，导致 propose 生成的 specs 忽略项目语言设置。同时 apply 和 archive 缺少配置投影接入通道。

## What Changes

- **BREAKING**: `docLanguage` 配置字段重命名为 `proseLanguage`，同时保留旧字段名作为兼容回退
- 新增 `openspec config project --json` CLI 命令，返回归一化后的项目配置
- `generateApplyInstructions()` 增加 `configProjection` 输出
- propose skill 第 6 步显式列出 `configProjection` 为必须读取字段
- apply skill 明确读取 `configProjection` 中的 `apply.defaultIsolation`
- archive skill 改用 `openspec config project --json` 获取 git 配置

## Capabilities

### New Capabilities
- `config-project-query`: 通过 CLI 查询归一化项目配置（`openspec config project --json`）
- `config-apply-projection`: apply instructions 命令输出包含 `configProjection`

### Modified Capabilities
- `config-projection`: `docLanguage` 字段重命名为 `proseLanguage`

## Impact

- 受影响代码: `src/core/project-config.ts`, `src/core/config-projection.ts`, `src/core/init.ts`, `src/core/config-prompts.ts`, `src/core/templates/fragments/opsx-fragments.ts`, `src/commands/config.ts`, `src/core/artifact-graph/instruction-loader.ts`
- 受影响配置: `openspec/config.yaml`（字段名变更）
- 受影响 skill 文档: `.claude/skills/openspec-propose/SKILL.md`, `.claude/skills/openspec-apply-change/SKILL.md`, `.claude/skills/openspec-archive-change/SKILL.md`
- 测试需更新: `project-config` schema 测试, `config-projection` 单元测试和 PBT 测试
