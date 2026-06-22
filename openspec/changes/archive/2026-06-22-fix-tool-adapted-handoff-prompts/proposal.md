## Why

explore 工作流的 Design Summary 尾部 handoff 提示在不同 AI 工具中输出相同的 `$openspec-propose` 调用语法， 且 Claude Code 缺失 transform 导致 propose 模板中 `/opsx:propose` 不经转换原样暴露。 这破坏了工具适配的设计初衷——不同工具应输出各自的 skill 调用语法（Claude Code 用 `/openspec-propose`，Codex 用 `$openspec-propose`，Pi 用 `/opsx-propose`）。

## What Changes

- explore 模板中 5 处硬编码的 `$openspec-propose`（Codex 语法）替换为规范形 `/opsx:propose`，使其进入 transform 管线
- 新增 Claude Code 的 `claude-command-refs` transform，将 `/opsx:<commandSlug>` 转换为 `/openspec-<skillDirName>`
- 在 tool-profile 注册表中为 Claude 注册 `CLAUDE_COMMAND_REFS` transform ID

## Capabilities

### New Capabilities

<!-- 无新增 capability——本次变更属于现有 transform 管线的工具扩展 -->

### Modified Capabilities

- `explore-brainstorming`: explore 模板 instructions 中的 workflow 引用从硬编码 `$openspec-propose` 改为规范形 `/opsx:propose`，经 transform 管线按工具适配渲染
- `tool-invocation-references`: 工具调用引用变换管线新增 Claude Code（`claude`）的覆盖， `/opsx:<slug>` → `/openspec-<skillDirName>`

## Impact

- `src/core/templates/workflows/explore.ts` — 5 处模板字符串修改
- `src/core/templates/transforms/builtin-transforms.ts` — 新增 Claude transform
- `src/core/templates/tool-profile/registry.ts` — 注册 transform ID + `resolveTransforms('claude')`
- `test/core/templates/explore-template.test.ts` — 断言更新
- `test/core/templates/transforms.test.ts` — 新增 + 更新 Claude 相关测试
- `test/core/templates/tool-profile.test.ts` — profile alignment 常量更新
