## Why

`openspec-explore` 当前的 Superpowers reference 只恢复了 stance、示例和收束模板，缺少原始 Superpowers `brainstorming` skill 的 hard gate、顺序 checklist、分段确认和设计交接纪律。这个缺口会让 agent 把 explore 当成松散讨论，而不是设计前置 workflow。

## What Changes

- 重写 `openspec-explore` 的 `explore-supperpowers-style` reference，使其以原始 Superpowers `brainstorming` skill 为行为来源。
- 将 Superpowers 的写 design doc、commit、user review、writing-plans 交接语义适配为 OpenSpec 的 conversation-only `Design Summary` 和 `openspec-propose` 路由。
- 保持主 `SKILL.md` 精简：只承载只读边界、OPSX 上下文、sweeper 委托和 propose 路由，不在主 instructions 中重建 Superpowers 行为。
- 保留 `references/explore-supperpowers-style.md` 路径以维持现有生成链兼容；正文统一使用 `Superpowers` 术语。
- 更新测试，覆盖 hard gate、原始 checklist 适配、只读映射、tool-neutral reference 内容和长度限制。

## Capabilities

### New Capabilities

### Modified Capabilities

- `explore-brainstorming`: 更新 Superpowers reference 的行为契约，从四段示例扩展为 OpenSpec-adapted Superpowers brainstorming protocol。

## Impact

- 代码：`src/core/templates/workflows/explore.ts`
- 测试：`test/core/templates/explore-template.test.ts`
- 生成产物：`openspec/references/openspec-explore-supperpowers-style.md`
- 规约：`openspec/specs/explore-brainstorming/spec.md`
