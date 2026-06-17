<!-- Smart routing: Design Summary found. inputLength=from confirmed explore discussion; detailScore=5/5; multiSubsystem=false; decision=proceed using Design Summary. -->

## Why

变更 `7ce4c300 docs(skill-length-validation): 精简、拆分skills` 为满足 `skill-template-length-check` 引入的 per-file 行数限制，把 `openspec-explore` 主模板从 529 行压缩到 329 行。该变更的 commit message 明确承诺"preserving long protocols through managed reference files"，且 `skill-template-length-check` 规约也规定长协议 MUST 物化到 `openspec/references/openspec-<name>.md`。

但 `explore.ts` 精简时删除的约 200 行 superpowers 风格行为引导（Stance / What You Might Do / Handling Different Entry Points / What We Figured Out）**从未被任何 referenceFiles 承接**——`archive-change`、`apply-change`、`optimizer`、`impact-sweeper` 四个工作流都正确使用了 referenceFiles，唯独 explore 没有。结果是 explore 丢失了"如何画图、如何按入口引导、如何收束"的具体行为能力，主 instructions 只剩干瘪的清单。

注意：propose（合理去冗余）与 apply-change（`enforce-apply-strict-tdd` 明确禁止恢复委托架构）的精简均有正当理由，本次仅复原 explore。

## What Changes

- 在 `src/core/templates/workflows/explore.ts` 新增 `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE` 常量，承载 4 块纯行为引导：The Stance、What You Might Do（含 State diagram 通用 ASCII 模板）、Handling Different Entry Points（4 个行为示例）、What We Figured Out。
- 在 `getExploreSkillTemplate()` 返回对象新增 `referenceFiles` 数组项：`{ path: 'references/explore-supperpowers-style.md', content: EXPLORE_SUPPERPOWERS_STYLE_REFERENCE }`。
- 主 `instructions` 保持当前精简版不动，仅在合适位置补一行指向该 reference。
- 内容取自 `git show 64ded25f` 版本的对应章节，做最小适配：剔除与现行只读边界冲突的旧措辞（如"Want me to create a proposal?""I can create a change proposal""Updated design.md"），统一改为路由到 `$openspec-propose <change-name>`。
- **不复原**原版 auto-capture 捕获表格（已被现行"Design Summary + Future Capture Target 路由 + 禁止 auto-capture"机制取代，且 `explore-brainstorming` spec L145-170 已覆盖）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cap.ai.explore-brainstorming`: 新增 requirement，要求 `openspec-explore` 通过 `referenceFiles` 暴露 superpowers 风格行为引导（Stance / 动作空间 / 入口点处理 / 收束模板），且内容须与只读边界、sweeper 委托、Design Summary 路由机制保持一致。

## Impact

- 改 `src/core/templates/workflows/explore.ts`（新增 1 个 const + 1 条 referenceFiles 声明 + 主 instructions 1 行指向）。
- 安装时由 `sync-engine` 物化 `openspec/references/openspec-explore-supperpowers-style.md`。
- 受 `skill-template-length-check` 约束：reference 文件 ≤500 行、主 SKILL.md ≤200 行（新增 reference 不影响主文件行数）。
- `explore-template.test.ts` 现有断言针对主 instructions，主文件不动故不受影响；可新增测试断言 reference 内容存在。
- 不改 propose/apply/archive，不引入新依赖，不改变 verify CLI 数据模型。
