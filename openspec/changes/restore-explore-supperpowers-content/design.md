## Context

`openspec-explore` 在 `64ded25f feat(workflow): 合并 Superpowers 能力` 时是一份 529 行的完整行为协议，包含具体姿态说明、动作空间、入口点行为示例和收束模板。`7ce4c300` 为满足 per-file 长度限制将其压缩到 329 行，承诺用 referenceFiles 承接长协议，但 explore 从未声明 referenceFiles，导致约 200 行行为引导蒸发。

机制本身已成熟：`referenceFiles` 字段定义在 `src/core/templates/types.ts`，安装时由 `sync-engine.ts` 物化到 `openspec/references/openspec-<name>.md`，`archive-change`/`apply-change`/`optimizer`/`impact-sweeper` 四个工作流均已正确使用。`skill-template-length-check` 规约明确：主 SKILL.md ≤200 行、每个 referenceFile ≤500 行，reference 内容不计入主文件额度。

## Goals / Non-Goals

**Goals:**
- 用现有 referenceFiles 标准模式恢复 explore 丢失的 superpowers 行为引导。
- 保持主 instructions 精简且与现行只读边界、sweeper 委托、Design Summary 路由机制一致。
- 不破坏 `explore-template.test.ts`、`skill-template-length-validation.test.ts` 等现有测试。

**Non-Goals:**
- 不复原 propose（合理去冗余）。
- 不复原 apply-change 的委托架构（`enforce-apply-strict-tdd` 明确禁止恢复 `openspec-implementer`/`.apply-steps`）。
- 不复原原版 auto-capture 捕获表格（已被更优的 Design Summary + Future Capture Target 路由取代）。
- 不触碰 grill-with-docs（其术语对齐能力已正确落地于 sweeper）。

## Decisions

### 决策 1：内容承载方式 — referenceFiles 而非回填主 instructions

**选择**：新增 `EXPLORE_SUPPERPOWERS_STYLE_REFERENCE` 常量 + `referenceFiles` 数组项。

**备选方案**：
- 方案 A：直接把内容塞回主 instructions。违背 `skill-template-length-check`（主 SKILL.md ≤200 行），会触发长度校验失败。
- 方案 B：referenceFiles 承接。符合 `7ce4c300` 原始承诺与 `skill-template-length-check` L78-82"长协议 MUST 物化到 references"的强制要求，且与另外四个工作流一致。

**理由**：方案 B 是唯一既满足长度限制又不丢内容的路径，且是 7ce4c300 本应兑现却遗漏的方案。

### 决策 2：内容边界 — 纯行为引导 4 块

**选择**：reference 只承载 4 块纯行为引导：The Stance、What You Might Do、Handling Different Entry Points、What We Figured Out。

**剔除项及理由**：
- `## OpenSpec Awareness` 整节：含 `${IMPACT_SWEEP_GUIDANCE}`/`${BRAINSTORMING_GUIDANCE}` 等模板插值变量，无法放进纯字符串常量；且当前精简版 instructions 的 Impact Sweeps / Brainstorming Checklist 章节已等价覆盖。
- `### When a change exists` 的捕获表格：已被 `explore-brainstorming` spec L145-170 的 Future Capture Target 机制取代，且 `explore-template.test.ts` L102-114 断言的是新版表格短语，放旧表会与之冲突。
- `## Ending Discovery` 中"Result in artifact updates: Updated design.md"：违反现行只读边界（explore 不能写文件）。

**理由**：reference 应是"how to behave / visualize"，不应重复或倒退主 instructions 的硬规则与流程机制。

### 决策 3：旧措辞适配 — 统一路由到 propose

**选择**：superpowers 版原内容中"Want me to create a proposal?"、"I can create a change proposal"、"Updated design.md with these decisions" 等表述，统一改为"调用 `$openspec-propose <change-name>`"。

**理由**：`explore-brainstorming` spec L172-201 要求 explore 主代理只读，制品写入须由 `$openspec-propose` 执行。原版措辞暗示 explore 可直接创建/更新制品，与现行规约冲突，必须适配而非原样回填。

## Risks / Trade-offs

**风险 1：reference 与主 instructions 语义重复**
- 表现：Stance / Visual 等主题在主 instructions（The Stance 简表）与 reference 都出现。
- 缓解：主 instructions 是压缩清单（6 条无展开），reference 是带理由 + 示例图的完整版；两者粒度不同，reference 为主清单的"展开版手册"。

**风险 2：复原内容含过时措辞**
- 表现：原版某些示例（如 OAuth 流程、SQLite vs Postgres）或表述与新机制不符。
- 缓解：逐行比对只读边界、sweeper 委托、Design Summary 路由，剔除/改写冲突项；保留纯示例（它们是行为演示，与机制无关）。

**权衡 1：reference 文件命名 `explore-supperpowers-style.md`**
- 选择：保留用户指定的拼写 `supperpowers`（双 p）。
- 代价：与项目内其他 `superpowers` 拼写（单 p）不一致。
- 接受理由：用户在 explore 对话中明确指定该名称作为文件名标识。

## Migration Plan

纯模板源码新增，无数据迁移。

**部署步骤**：
1. 改 `src/core/templates/workflows/explore.ts`：新增常量 + referenceFiles 声明 + 主 instructions 指向行。
2. 运行 `openspec update` 重新生成 `.claude/skills/openspec-explore/` 与 `openspec/references/openspec-explore-supperpowers-style.md`。
3. 运行 `pnpm test` 确认 explore 相关测试与长度校验通过。

**向后兼容性**：新增 referenceFile 对旧消费方透明；不读取 reference 的 agent 行为不变（主 instructions 自洽）。

**回滚策略**：移除新增常量与 referenceFiles 数组项，删除生成的 reference 文件。

## Open Questions

无。内容边界、承载方式、命名、措辞适配均已在 explore 对话中与用户确认。
