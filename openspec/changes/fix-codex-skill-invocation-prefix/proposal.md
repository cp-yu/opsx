## Why

OpenSpec 已经把 Codex 明确定义为 skills-only 表面，但当前生成链路仍在多个地方残留 `/opsx:*` 叙事：`openspec init` / `openspec update` 的成功提示会把用户引向 slash command，而 `.codex/skills/*/SKILL.md` 内部的下一步提示也继续引用 `/opsx:apply`、`/opsx:archive` 这类不存在的入口。

这个偏差不只是文案问题。Codex 的真实入口是 `$openspec-*`，而且不少 skill 名称并不能从 workflow slug 直接猜出来，例如 `apply -> openspec-apply-change`、`archive -> openspec-archive-change`。只修补单条提示会继续制造新的漏点；需要一个统一的、基于 workflow surface 元数据的调用引用渲染层。

## What Changes

### 1. 为 workflow 引用增加工具级渲染层

引入共享的调用引用渲染逻辑，让生成文案中的 workflow 引用根据目标工具输出正确的用户可调用语法，而不是在模板里硬编码 `/opsx:*`。

### 2. 让 Codex 使用精确的 `$openspec-*` skill 名称

Codex 生成的 skills 与相关引导文案改为使用共享清单中声明的精确 `skillDirName`，例如：

- `$openspec-propose`
- `$openspec-explore`
- `$openspec-new-change`
- `$openspec-continue-change`
- `$openspec-apply-change`
- `$openspec-archive-change`

### 3. 修正 init / update 的入门与重启提示

`openspec init` 与 `openspec update` 的成功输出改为根据实际生成的 workflow surface 选择提示语法：

- command-backed 工具继续显示对应的 slash command 形式
- Codex 这类 skills-only 工具显示 `$openspec-*`
- 对 skills-only 场景不再提示 “slash commands to take effect”

### 4. 为共享引用渲染补充回归测试

补充针对 skill 文案转换、Codex 精确 skill 名称、以及 init / update 输出的回归测试，防止后续再次把 workflow slug 误当成用户可见调用名。

## Capabilities

### 新增能力

- `tool-invocation-references`: 基于共享 workflow surface 元数据渲染不同 AI 工具的用户可调用 workflow 引用，避免在 skills 与提示文案中硬编码 `/opsx:*`

### 变更能力

- `cli-init`: 初始化成功输出按目标工具展示正确的 workflow 调用语法，对 Codex 使用 `$openspec-*` skill 引导
- `cli-update`: 更新成功后的 onboarding / restart 提示按目标工具展示正确的 workflow 调用语法，对 Codex 避免 slash-command 叙事

## Impact

- `src/core/workflow-surface.ts`
- `src/core/shared/skill-generation.ts`
- `src/utils/command-references.ts`
- `src/core/init.ts`
- `src/core/update.ts`
- `src/core/templates/workflows/*.ts`
- `test/core/init*.test.ts`
- `test/core/update*.test.ts`
- `test/core/shared/*skill*`
